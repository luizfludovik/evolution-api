import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRichLinkPreview } from '../src/api/utils/richLinkPreview';

// 1 x 1 PNG: sufficient to verify input policy without a network request.
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/2n8AAAAASUVORK5CYII=';
const url = 'https://meli.la/Example01';
const text = 'Oferta de hoje!\n' + url;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    url,
    title: 'Oferta de teste',
    description: 'Produto com desconto',
    thumbnailBase64: png,
    ...overrides,
  } as any;
}

test('accepts a bounded PNG thumbnail and approved affiliate link', () => {
  const result = validateRichLinkPreview(payload(), text);
  assert.equal(result.url, url);
  assert.equal(result.title, 'Oferta de teste');
  assert.ok(Buffer.isBuffer(result.thumbnail));
});

for (const link of [
  'http://meli.la/Example01',
  'https://meli.la.evil.invalid/offer',
  'https://127.0.0.1/offer',
  'https://user:password@meli.la/offer',
  'https://meli.la:444/offer',
  'https://localhost/offer',
]) {
  test('rejects forbidden affiliate URL: ' + link, () => {
    assert.throws(() => validateRichLinkPreview(payload({ url: link }), text));
  });
}

test('requires affiliate URL to appear in the message', () => {
  assert.throws(() => validateRichLinkPreview(payload(), 'Mensagem sem link'));
});

test('rejects overlarge thumbnail before decoding', () => {
  assert.throws(() => validateRichLinkPreview(payload({ thumbnailBase64: 'A'.repeat(1_400_000) }), text));
});

test('rejects non-image base64', () => {
  assert.throws(() => validateRichLinkPreview(payload({ thumbnailBase64: Buffer.from('not an image').toString('base64') }), text));
});

test('rejects empty or overlong title', () => {
  assert.throws(() => validateRichLinkPreview(payload({ title: '' }), text));
  assert.throws(() => validateRichLinkPreview(payload({ title: 'X'.repeat(181) }), text));
});

test('rejects unbounded description', () => {
  assert.throws(() => validateRichLinkPreview(payload({ description: 'Y'.repeat(321) }), text));
});
