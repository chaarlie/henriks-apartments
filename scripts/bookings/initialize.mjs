import { createClient } from '@sanity/client';
import { REGISTRY_ID, validDate, findConflict } from '../../lib/reservations/rules.ts';

async function main() {
// Deploy the protected app and disable old deployments/Studio writers first.
// New booking actions fail closed until this transaction has completed.
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false, perspective: 'raw',
});
if (await client.getDocument(REGISTRY_ID)) {
  console.log('Reservation registry already exists. No changes made.');
  process.exit(0);
}
const ids = await client.fetch('*[_type == "booking"]._id');
if (ids.some(id => id.startsWith('drafts.') || id.startsWith('versions.'))) {
  throw new Error('Resolve booking drafts/releases before initialization. No changes made.');
}
const bookings = ids.length ? (await client.getDocuments(ids)).filter(Boolean) : [];
const now = Date.now();
const defaultExpiry = new Date(now + 86_400_000).toISOString();
const entries = bookings.map(b => {
  if (!validDate(b.startDate) || !validDate(b.endDate) || b.endDate <= b.startDate || !['held', 'confirmed', 'cancelled'].includes(b.status)) {
    throw new Error(`Fix dates/status on ${b._id} before initialization.`);
  }
  return {
    _key: b._id, unitId: b.unit?._ref || null, start: b.startDate, end: b.endDate, status: b.status,
    ...(b.status === 'held' ? { holdExpiresAt: b.holdExpiresAt || defaultExpiry } : {}),
  };
});
for (const row of entries) {
  const clash = findConflict(entries, row, now);
  if (clash) throw new Error(`Existing overlap: ${row._key} and ${clash._key}. Resolve before initialization.`);
}
console.log(`${entries.length} bookings checked. ${bookings.filter(b => b.status === 'held' && !b.holdExpiresAt).length} legacy holds will receive a 24-hour expiry.`);
if (!process.argv.includes('--apply')) {
  console.log('Read-only check passed. After retiring old booking writers, rerun with --apply to initialize.');
  process.exit(0);
}
let tx = client.transaction().create({ _id: REGISTRY_ID, _type: 'reservationRegistry', entries });
for (const b of bookings) {
  tx = tx.patch(b._id, p => p.ifRevisionId(b._rev).set({
    reservationManaged: true,
    ...(b.status === 'held' ? { holdExpiresAt: b.holdExpiresAt || defaultExpiry } : {}),
  }));
}
await tx.commit({ visibility: 'sync' });
console.log('Reservation protection initialized. Existing bookings preserved.');

}
main().catch(error => { console.error(error instanceof Error ? error.message : "Initialization failed."); process.exitCode = 1; });
