import test from 'node:test';
import assert from 'node:assert/strict';
import { blocks, findConflict, holdExpiry, propertyToday, validateDates, validateGuest } from '../../lib/reservations/rules.ts';
import { writeReservation, removeReservation } from '../../lib/reservations/store.ts';
import { rateLimit } from '../../lib/reservations/rate-limit.ts';
import { notifyOwner } from '../../lib/reservations/notify.ts';

// Models Sanity's atomic, revision-checked commits and independent document reads.
// Deliberately does not expose fetch: overlap checks cannot depend on GROQ freshness.
function fakeClient(initial = {}) {
  let docs = structuredClone({ reservationRegistry: { _id: 'reservationRegistry', _rev: '1', entries: [] }, ...initial });
  let rev = 1;
  const copy = value => value && structuredClone(value);
  const conflict = () => { throw Object.assign(new Error('Revision conflict'), { statusCode: 409 }); };
  function transaction() {
    const ops = [];
    const tx = {
      patch(id, callback) {
        const op = { kind: 'patch', id, set: {} };
        const patch = { ifRevisionId(r) { op.revision = r; return patch; }, set(fields) { op.set = fields; return patch; } };
        callback(patch); ops.push(op); return tx;
      },
      create(doc) { ops.push({ kind: 'create', doc }); return tx; },
      delete(id) { ops.push({ kind: 'delete', id }); return tx; },
      async commit() {
        const next = copy(docs);
        for (const op of ops) {
          if (op.kind === 'create') {
            if (next[op.doc._id]) conflict();
            next[op.doc._id] = { ...copy(op.doc), _rev: String(++rev) };
          } else if (op.kind === 'delete') delete next[op.id];
          else {
            if (!next[op.id] || (op.revision && next[op.id]._rev !== op.revision)) conflict();
            next[op.id] = { ...next[op.id], ...copy(op.set), _rev: String(++rev) };
          }
        }
        docs = next;
      },
    };
    return tx;
  }
  const client = {
    async getDocument(id) { return copy(docs[id]); },
    async createIfNotExists(doc) { docs[doc._id] ??= { ...copy(doc), _rev: String(++rev) }; },
    transaction,
    patch(id) {
      let revision; let fields;
      const patch = { ifRevisionId(r) { revision = r; return patch; }, set(f) { fields = f; return patch; }, commit() {
        return transaction().patch(id, p => revision ? p.ifRevisionId(revision).set(fields) : p.set(fields)).commit();
      } };
      return patch;
    },
  };
  return client;
}
const booking = (id, overrides = {}) => ({
  _id: id, _type: 'booking', unit: { _type: 'reference', _ref: 'unit1' }, startDate: '2027-01-01', endDate: '2027-01-10',
  status: 'confirmed', source: 'manual', note: '', guest: { name: 'Test', email: 'test@example.com', phone: '' }, ...overrides,
});

test('two simultaneous overlapping writes cannot both succeed', async () => {
  const client = fakeClient();
  const results = await Promise.allSettled([writeReservation(client, booking('a')), writeReservation(client, booking('b'))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.match(results.find(r => r.status === 'rejected').reason.message, /Dates conflict/);
  assert.equal((await client.getDocument('reservationRegistry')).entries.length, 1);
});

test('whole-property closure competes with bookings in any apartment', async () => {
  const client = fakeClient();
  const results = await Promise.allSettled([writeReservation(client, booking('closure', { unit: undefined })), writeReservation(client, booking('room'))]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
});

test('different units can book the same dates', async () => {
  const client = fakeClient();
  await Promise.all([writeReservation(client, booking('a')), writeReservation(client, booking('b', { unit: { _type: 'reference', _ref: 'unit2' } }))]);
  assert.equal((await client.getDocument('reservationRegistry')).entries.length, 2);
});

test('date edits and changing a room into a closure check conflicts', async () => {
  const client = fakeClient();
  await writeReservation(client, booking('a'));
  const b = await writeReservation(client, booking('b', { startDate: '2027-02-01', endDate: '2027-02-10' }));
  await assert.rejects(writeReservation(client, booking('b'), b._rev), /Dates conflict/);
  const c = await writeReservation(client, booking('c', { unit: { _type: 'reference', _ref: 'unit2' } }));
  await assert.rejects(writeReservation(client, booking('c', { unit: undefined }), c._rev), /Dates conflict/);
  assert.equal((await client.getDocument('b')).startDate, '2027-02-01');
});

test('expired holds release dates and cannot be extended into another booking', async () => {
  const client = fakeClient();
  const hold = await writeReservation(client, booking('expired', { status: 'held', holdExpiresAt: '2020-01-01T00:00:00Z' }));
  await writeReservation(client, booking('new'));
  await assert.rejects(writeReservation(client, booking('expired', { status: 'held', holdExpiresAt: '2099-01-01T00:00:00Z' }), hold._rev), /Dates conflict/);
});

test('identical concurrent retries create one booking; changed details fail', async () => {
  const client = fakeClient();
  const doc = booking('same', { requestHash: 'payload' });
  const results = await Promise.all([writeReservation(client, doc), writeReservation(client, doc)]);
  assert.equal(results[0]._id, results[1]._id);
  assert.equal((await client.getDocument('reservationRegistry')).entries.length, 1);
  await assert.rejects(writeReservation(client, { ...doc, requestHash: 'changed' }), /different details/);
});

test('stale admin updates and deletion cannot overwrite newer edits', async () => {
  const client = fakeClient();
  const a = await writeReservation(client, booking('a'));
  const next = await writeReservation(client, booking('a', { note: 'new' }), a._rev);
  await assert.rejects(writeReservation(client, booking('a'), a._rev), /changed/);
  await assert.rejects(removeReservation(client, 'a', a._rev), /changed/);
  await removeReservation(client, 'a', next._rev);
  await writeReservation(client, booking('replacement'));
});

test('missing registry fails closed', async () => {
  await assert.rejects(writeReservation(fakeClient({ reservationRegistry: undefined }), booking('a')), /setup is incomplete/);
});

test('expiry boundary, duration and preserving an existing expiry', () => {
  const now = Date.parse('2026-09-15T12:00:00Z');
  assert.equal(holdExpiry('held', undefined, undefined, now), '2026-09-16T12:00:00.000Z');
  assert.equal(holdExpiry('held', '2026-09-17T12:00:00Z', undefined, now), '2026-09-17T12:00:00Z');
  assert.throws(() => holdExpiry('held', undefined, 169, now));
  assert.throws(() => holdExpiry('held', '2020-01-01', undefined, now), /expired/);
  assert.equal(blocks({ status: 'held', holdExpiresAt: new Date(now).toISOString() }, now), false);
});

test('real dates, local today, opening and stay limit are enforced', () => {
  const now = new Date('2026-09-16T02:00:00Z');
  assert.equal(propertyToday(now), '2026-09-15');
  validateDates('2026-09-15', '2026-09-16', { now });
  for (const [start, end] of [['2026-02-30', '2026-03-02'], ['2026-09-15', '2026-09-15'], ['2026-09-14', '2026-09-17'], ['2026-09-15', '2028-01-01']]) {
    assert.throws(() => validateDates(start, end, { now }));
  }
  assert.throws(() => validateDates('2026-09-15', '2026-09-17', { now, opening: '2026-09-16' }), /opens/);
});

test('guest contacts and lengths are validated; closures may omit contacts', () => {
  validateGuest({}, false);
  validateGuest({ name: 'Guest', phone: '+1 809 555 1234' }, true);
  for (const guest of [{}, { name: 'Guest' }, { name: 'Guest', email: 'bad' }, { name: 'Guest', phone: 'abc123' }, { name: 'x'.repeat(121), email: 'a@b.com' }]) {
    assert.throws(() => validateGuest(guest, true));
  }
});

test('inclusive checkout remains blocked', () => {
  const a = { _key: 'a', unitId: 'u', status: 'confirmed', start: '2027-01-01', end: '2027-01-10' };
  assert.equal(findConflict([a], { ...a, _key: 'b', start: '2027-01-10', end: '2027-01-12' }), a);
});

test('shared rate limiter enforces the limit under concurrency', async () => {
  process.env.BOOKING_RATE_LIMIT_SECRET = 'test-secret-that-is-at-least-32-characters';
  const client = fakeClient();
  const results = await Promise.allSettled(Array.from({ length: 6 }, () => rateLimit(client, 'test-ip', 3, 60_000)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 3);
});

test('notification failure preserves booking and records failure; retry uses stable key', async () => {
  const client = fakeClient({ a: booking('a', { _rev: '1', notificationStatus: 'pending' }) });
  process.env.RESEND_API_KEY = 'test'; process.env.BOOKING_NOTIFY_EMAIL = 'owner@example.com'; process.env.BOOKING_EMAIL_FROM = 'sender@example.com';
  const original = globalThis.fetch;
  const originalError = console.error;
  const keys = [];
  try {
    console.error = () => {};
    globalThis.fetch = async (_url, options) => { keys.push(options.headers['Idempotency-Key']); return { ok: keys.length > 1, status: 503 }; };
    await notifyOwner(client, await client.getDocument('a'));
    assert.equal((await client.getDocument('a')).notificationStatus, 'failed');
    await notifyOwner(client, await client.getDocument('a'));
    assert.equal((await client.getDocument('a')).notificationStatus, 'sent');
    assert.equal(keys[0], keys[1]);
    await notifyOwner(client, await client.getDocument('a'));
    assert.equal(keys.length, 2);
  } finally { globalThis.fetch = original; console.error = originalError; }
});


test('deleting a public booking cannot let an old retry recreate it', async () => {
  const client = fakeClient();
  const doc = booking('public', { requestHash: 'payload' });
  const saved = await writeReservation(client, doc);
  await removeReservation(client, saved._id, saved._rev);
  await assert.rejects(writeReservation(client, doc), /already been processed/);
  assert.equal(await client.getDocument('public'), undefined);
});
