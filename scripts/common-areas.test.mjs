import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAreaCaptions } from '../lib/common-area-captions.ts';
import { UploadGeneration } from '../lib/upload-generation.ts';
import { extractDoc, rebuildDoc } from './i18n/lib.mjs';

const photos = [
  { _key: 'pool-photo', label: 'Pool', title: 'Swim', alt: 'Blue pool', asset: { _ref: 'image-pool' }, kind: 'pool' },
  { _key: 'gym-photo', label: 'Gym', title: 'Exercise', alt: 'Weights', asset: { _ref: 'image-gym' }, kind: 'gym' },
];
const captions = [
  { _key: 'pool-photo', label: 'Piscina', title: 'Nada', alt: 'Piscina azul' },
  { _key: 'gym-photo', label: 'Gimnasio', title: 'Entrena', alt: 'Pesas' },
];

test('reordering and removing photos preserve the right translated captions', () => {
  assert.deepEqual(mergeAreaCaptions([...photos].reverse(), captions).map(p => p.label), ['Gimnasio', 'Piscina']);
  assert.equal(mergeAreaCaptions([photos[1]], captions)[0].title, 'Entrena');
  assert.deepEqual(photos.map(p => p.label), ['Pool', 'Gym']);
});

test('cleared, new, and unkeyed captions fall back to English without shifting neighbours', () => {
  const result = mergeAreaCaptions(photos, [{ _key: 'pool-photo', label: '', title: ' ', alt: '' }]);
  assert.equal(result[0].label, 'Pool');
  assert.equal(result[0].alt, 'Blue pool');
  assert.equal(result[1].label, 'Gym');
  assert.equal(mergeAreaCaptions(photos, [{ label: 'Wrong photo' }])[0].label, 'Pool');
});

test('translated content cannot change a photo, category, or stable key', () => {
  const result = mergeAreaCaptions(photos, [{ ...captions[0], asset: { _ref: 'wrong' }, kind: 'gym' }]);
  assert.equal(result[0].asset._ref, 'image-pool');
  assert.equal(result[0].kind, 'pool');
  assert.equal(result[0]._key, 'pool-photo');
});

test('translation script round trip and public display use the same photo keys', () => {
  const source = { commonAreas: photos };
  assert.equal(extractDoc('siteSettings', source)['commonAreas.pool-photo.title'], 'Swim');
  const row = rebuildDoc('siteSettings', source, { 'commonAreas.pool-photo.label': 'Piscina', 'commonAreas.gym-photo.label': 'Gimnasio' }, 'es', { sourceHash: 'test', machine: false });
  const result = mergeAreaCaptions([...photos].reverse(), row.commonAreas);
  assert.deepEqual(result.map(p => p.label), ['Gimnasio', 'Piscina']);
  assert.deepEqual(result.map(p => p._key), ['gym-photo', 'pool-photo']);
});

test('discard invalidates a delayed upload before its result can apply', async () => {
  const uploads = new UploadGeneration();
  const run = uploads.begin();
  let complete;
  const pending = new Promise(resolve => { complete = resolve; });
  let applied = false;
  const task = pending.then(() => { if (uploads.accepts(run)) applied = true; });
  uploads.cancel();
  complete();
  await task;
  assert.equal(applied, false);
  assert.equal(uploads.accepts(uploads.begin()), true);
});

test('an older completion cannot replace a newer upload or clear its busy state', () => {
  const uploads = new UploadGeneration();
  const oldRun = uploads.begin();
  const newRun = uploads.begin();
  assert.equal(uploads.accepts(oldRun), false);
  assert.equal(uploads.accepts(newRun), true);
});
