const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const {
  stateFromNameOrCode,
  stateDisplayName,
  stateCode,
  stateSlug,
} = require('../lib/us-states.ts');

test('stateFromNameOrCode finds by uppercase code', () => {
  const state = stateFromNameOrCode('TX');
  assert.equal(state?.name, 'Texas');
  assert.equal(state?.slug, 'texas');
});

test('stateFromNameOrCode finds by lowercase code with whitespace', () => {
  const state = stateFromNameOrCode('  nc  ');
  assert.equal(state?.name, 'North Carolina');
});

test('stateFromNameOrCode finds by state name case-insensitively', () => {
  const state = stateFromNameOrCode('rhode island');
  assert.equal(state?.code, 'RI');
});

test('stateFromNameOrCode finds by slug-like value', () => {
  const state = stateFromNameOrCode('new-hampshire');
  assert.equal(state?.code, 'NH');
});

test('stateFromNameOrCode accepts punctuation around 2-letter code', () => {
  const state = stateFromNameOrCode('TX.');
  assert.equal(state?.name, 'Texas');
});

test('stateFromNameOrCode accepts underscore-separated state names', () => {
  const state = stateFromNameOrCode('North_Carolina');
  assert.equal(state?.code, 'NC');
});

test('stateDisplayName returns canonical state name when known', () => {
  assert.equal(stateDisplayName('wa'), 'Washington');
});

test('stateDisplayName returns trimmed original value when unknown', () => {
  assert.equal(stateDisplayName('  Atlantis  '), 'Atlantis');
});

test('stateCode returns null for unknown values', () => {
  assert.equal(stateCode('Atlantis'), null);
});

test('stateSlug returns canonical slug or slugified fallback', () => {
  assert.equal(stateSlug('MN'), 'minnesota');
  assert.equal(stateSlug('Mystery Place'), 'mystery-place');
});
