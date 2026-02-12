const test = require('node:test');
const assert = require('node:assert/strict');

require('./helpers/register-ts');

const chatbot = require('../lib/chatbot-shared.ts');

test('defaultPageToggles enables only /join by default', () => {
  const toggles = chatbot.defaultPageToggles();
  assert.equal(toggles['/join'], true);
  assert.equal(toggles['/pricing'], false);
  assert.equal(toggles['/'], false);
});

test('normalizePathname removes query and fragment', () => {
  assert.equal(chatbot.normalizePathname('/join/?step=1#cta'), '/join');
});

test('normalizePathname collapses slash-only paths to root', () => {
  assert.equal(chatbot.normalizePathname('///'), '/');
});

test('normalizePathname removes repeated trailing slashes', () => {
  assert.equal(chatbot.normalizePathname('/join//'), '/join');
});

test('chatPageKeyFromPathname matches nested routes', () => {
  assert.equal(chatbot.chatPageKeyFromPathname('/states/texas'), '/states');
  assert.equal(chatbot.chatPageKeyFromPathname('/learn/topic-slug'), '/learn');
});

test('chatPageKeyFromPathname returns null for unknown paths', () => {
  assert.equal(chatbot.chatPageKeyFromPathname('/unknown-page'), null);
});

test('normalizePageToggles only applies known boolean keys', () => {
  const normalized = chatbot.normalizePageToggles({
    '/join': false,
    '/pricing': true,
    '/unknown': true,
    '/about': 'yes',
  });
  assert.equal(normalized['/join'], false);
  assert.equal(normalized['/pricing'], true);
  assert.equal(normalized['/about'], false);
  assert.equal(normalized['/unknown'], undefined);
});

test('isChatbotEnabledForPath obeys enabled flag', () => {
  const config = {
    enabled: false,
    showOnAllPublicPages: true,
    pageToggles: chatbot.defaultPageToggles(),
  };
  assert.equal(chatbot.isChatbotEnabledForPath(config, '/join'), false);
});

test('isChatbotEnabledForPath can allow unknown pages when showOnAllPublicPages is true', () => {
  const config = {
    enabled: true,
    showOnAllPublicPages: true,
    pageToggles: chatbot.defaultPageToggles(),
  };
  assert.equal(chatbot.isChatbotEnabledForPath(config, '/some-public-page'), true);
});

test('containsMedicalOrPhiRequest allows non-personal service capability questions', () => {
  assert.equal(chatbot.containsMedicalOrPhiRequest('Can Present Health prescribe medications in Texas?'), false);
});

test('containsMedicalOrPhiRequest flags personal medical prompts', () => {
  assert.equal(chatbot.containsMedicalOrPhiRequest('I have chest pain and shortness of breath, what should I do?'), true);
});

test('containsMedicalOrPhiRequest flags PHI references', () => {
  assert.equal(chatbot.containsMedicalOrPhiRequest('My DOB is 01/01/1990 and my SSN is 123-45-6789'), true);
});

test('detectProspectiveIntent catches join and pricing terms', () => {
  assert.equal(chatbot.detectProspectiveIntent('How much does membership cost?'), true);
  assert.equal(chatbot.detectProspectiveIntent('I want to join today'), true);
  assert.equal(chatbot.detectProspectiveIntent('Tell me a joke'), false);
});

test('normalizeEmail trims and lowercases', () => {
  assert.equal(chatbot.normalizeEmail('  Example.USER+tag@Email.COM  '), 'example.user+tag@email.com');
});

test('clipText returns original string when within limit', () => {
  assert.equal(chatbot.clipText('hello', 10), 'hello');
});

test('clipText respects very small max values', () => {
  assert.equal(chatbot.clipText('hello', 2), 'he');
});

test('clipText handles zero max cleanly', () => {
  assert.equal(chatbot.clipText('hello', 0), '');
});
