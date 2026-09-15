import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDoc, rebuildDoc, sourceHash } from './lib.mjs';

const unit = {
  name: '201', priceUsd: 889,
  space: [{ _key: 'room', key: 'Kitchen', title: 'Full', desc: 'Equipped kitchen' }],
  tour: [
    { _key: 'a', stopId: 'kitchen', name: 'Kitchen', panorama: 'asset-a', links: [{ to: 'bedroom', yaw: '20deg' }] },
    { _key: 'b', stopId: 'bedroom', name: 'Bedroom', panorama: 'asset-b' },
  ],
};

test('extracts room labels without exposing prices or panorama configuration', () => {
  assert.deepEqual(extractDoc('unit', unit), {
    'space.room.key': 'Kitchen', 'space.room.title': 'Full', 'space.room.desc': 'Equipped kitchen',
    'tour.a.name': 'Kitchen', 'tour.b.name': 'Bedroom',
  });
  const changedMedia = { ...unit, priceUsd: 950, tour: unit.tour.map(s => ({ ...s, panorama: 'replacement' })) };
  assert.equal(sourceHash(extractDoc('unit', unit)), sourceHash(extractDoc('unit', changedMedia)));
  assert.notEqual(sourceHash(extractDoc('unit', unit)), sourceHash(extractDoc('unit', { ...unit, tour: [{ ...unit.tour[0], name: 'Dining room' }] })));
});

test('tour translations follow stable keys after reordering and store labels only', () => {
  const before = structuredClone(unit);
  const row = rebuildDoc('unit', { ...unit, tour: [...unit.tour].reverse() }, {
    'space.room.key': 'Cocina', 'tour.a.name': 'Cocina', 'tour.b.name': 'Dormitorio',
  }, 'es', { sourceHash: 'hash', sourceRev: 'rev', machine: false });
  assert.deepEqual(row.tour, [{ _key: 'b', name: 'Dormitorio' }, { _key: 'a', name: 'Cocina' }]);
  assert.equal(row.space[0].key, 'Cocina');
  assert.equal(row.space[0].title, 'Full');
  assert.equal(row.priceUsd, undefined);
  assert.deepEqual(unit, before);
});
