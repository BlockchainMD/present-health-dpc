const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const schema = require('../lib/schema.ts');

test('coerceFaqs keeps only complete question/answer pairs', () => {
  const result = schema.coerceFaqs([
    { question: ' Q1 ', answer: ' A1 ' },
    { question: 'Q2', answer: '' },
    { question: '', answer: 'A3' },
    null,
    5,
  ]);
  assert.deepEqual(result, [{ question: 'Q1', answer: 'A1' }]);
});

test('buildBreadcrumbSchema returns null for root', () => {
  assert.equal(schema.buildBreadcrumbSchema('/'), null);
});

test('buildBreadcrumbSchema builds expected hierarchy', () => {
  const block = schema.buildBreadcrumbSchema('/states/texas', {
    '/states': 'States',
    '/states/texas': 'Texas',
  });
  assert.equal(block['@type'], 'BreadcrumbList');
  assert.equal(block.itemListElement.length, 3);
  assert.equal(block.itemListElement[1].name, 'States');
  assert.equal(block.itemListElement[2].name, 'Texas');
});

test('buildBreadcrumbSchema strips query and fragment from pathname', () => {
  const block = schema.buildBreadcrumbSchema('/learn/hsa-guide?ref=ad#faq', {
    '/learn': 'Learn',
    '/learn/hsa-guide': 'HSA Guide',
  });
  assert.equal(block.itemListElement[2].name, 'HSA Guide');
  assert.ok(String(block.itemListElement[2].item).endsWith('/learn/hsa-guide'));
});

test('buildPricingSchemas returns membership, single-visit, employer, and breadcrumb blocks', () => {
  const blocks = schema.buildPricingSchemas();
  assert.equal(blocks.length, 4);
  const types = schema.schemaTypeList(blocks);
  assert.ok(types.includes('Product'));
  assert.ok(types.includes('BreadcrumbList'));
});

test('schemaTypeList deduplicates and trims string and array @type values', () => {
  const types = schema.schemaTypeList([
    { '@type': ' Product ' },
    { '@type': ['FAQPage', ' Product ', '  '] },
    { '@type': '' },
  ]);
  assert.deepEqual(types.sort(), ['FAQPage', 'Product']);
});

test('validateSchemaBlockBasics reports missing @context and @type', () => {
  const issues = schema.validateSchemaBlockBasics([
    { '@context': 'https://schema.org', '@type': 'Article' },
    { '@type': 'FAQPage' },
    { '@context': 'https://schema.org' },
  ]);

  assert.ok(issues.some((x) => x.includes('Block #2 is missing @context')));
  assert.ok(issues.some((x) => x.includes('Block #3 is missing @type')));
});

test('validateSchemaBlockBasics flags @type arrays that only contain blanks', () => {
  const issues = schema.validateSchemaBlockBasics([
    { '@context': 'https://schema.org', '@type': ['   ', ''] },
  ]);
  assert.ok(issues.some((x) => x.includes('missing @type')));
});

test('buildStateSchemas includes FAQPage when FAQs are present', () => {
  const blocks = schema.buildStateSchemas({
    name: 'Texas',
    slug: 'texas',
    telehealthRegulationsSummary: 'Summary text',
    faqs: [{ question: 'Q?', answer: 'A.' }],
  });

  const types = schema.schemaTypeList(blocks);
  assert.ok(types.includes('MedicalClinic'));
  assert.ok(types.includes('FAQPage'));
  assert.ok(types.includes('BreadcrumbList'));
});

test('buildLearnHubSchemas emits collection + breadcrumb blocks', () => {
  const blocks = schema.buildLearnHubSchemas();
  assert.equal(blocks.length, 2);
  const types = schema.schemaTypeList(blocks);
  assert.ok(types.includes('CollectionPage'));
  assert.ok(types.includes('BreadcrumbList'));
});
