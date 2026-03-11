const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const memory = require('../lib/ads/optimization-memory.ts');

test('summarizeExperimentMemory extracts useful winning and caution themes', () => {
  const summary = memory.summarizeExperimentMemory([
    {
      createdAt: '2026-02-01T00:00:00.000Z',
      status: 'DEPLOYED',
      googleCampaignId: 'google-1',
      rsaHeadlines: ['Text Your Care Team', '$99 Monthly Care', 'No Waiting Rooms'],
      rsaDescriptions: ['Message a clinician fast without the usual waiting room hassle.'],
      metrics: { impressions: 4200, clicks: 252, conversions: 28, cost: 560, ctr: 0.06, cvr: 0.1111, cpa: 20 },
    },
    {
      createdAt: '2026-02-12T00:00:00.000Z',
      status: 'DEPLOYED',
      googleCampaignId: 'google-2',
      rsaHeadlines: ['Direct Access, $99', 'Message Your Doctor', 'Care Without Waiting'],
      rsaDescriptions: ['Transparent monthly pricing with direct messaging-first care.'],
      metrics: { impressions: 3100, clicks: 155, conversions: 15, cost: 330, ctr: 0.05, cvr: 0.0968, cpa: 22 },
    },
    {
      createdAt: '2026-02-20T00:00:00.000Z',
      status: 'DEPLOYED',
      metaCampaignId: 'meta-1',
      rsaHeadlines: ['Virtual Primary Care', 'Online Doctor Visits', 'Video Care Option'],
      rsaDescriptions: ['A virtual visit option for adults who want online care.'],
      metrics: { impressions: 5000, clicks: 50, conversions: 0, cost: 240, ctr: 0.01, cvr: 0, cpa: null },
    },
  ]);

  assert.ok(summary);
  assert.equal(summary.testedRuns, 3);
  assert.ok(summary.winningThemes.includes('messaging-first access'));
  assert.ok(summary.winningThemes.includes('transparent monthly pricing'));
  assert.ok(summary.cautionThemes.includes('virtual convenience'));
  assert.equal(summary.topPerformerSummaries.length, 2);
  assert.equal(summary.underperformerSummaries.length, 1);
  assert.match(summary.promptText, /Best-performing runs:/);
  assert.match(summary.promptText, /Underperforming runs:/);
});

test('summarizeExperimentMemory ignores runs without live data or enough signal', () => {
  const summary = memory.summarizeExperimentMemory([
    {
      createdAt: '2026-03-01T00:00:00.000Z',
      status: 'READY_FOR_REVIEW',
      rsaHeadlines: ['Draft headline'],
      rsaDescriptions: ['Draft description'],
      metrics: { impressions: 40, clicks: 2, conversions: 0, cost: 2 },
    },
  ]);

  assert.equal(summary, null);
});
