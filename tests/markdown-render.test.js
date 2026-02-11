const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
test('markdown renders headings and lists without raw tokens', async () => {
  const ReactMarkdown = (await import('react-markdown')).default;
  const remarkGfm = (await import('remark-gfm')).default;
  const markdown = [
    '## Quick answer',
    '',
    'Short answer here.',
    '',
    '## TL;DR',
    '- First point',
    '- Second point',
    '',
    '## When to seek care',
    '- Urgent now',
    '- Routine'
  ].join('\n');

  const html = renderToStaticMarkup(
    React.createElement(ReactMarkdown, { remarkPlugins: [remarkGfm] }, markdown)
  );

  assert.ok(html.includes('<h2>Quick answer</h2>'));
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<li>First point</li>'));
  assert.ok(!html.includes('## '));
});
