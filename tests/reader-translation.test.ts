import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError } from '../lib/api';
import { lookupTranslation, plainProviderText, translationQuerySchema } from '../lib/reader/translation';

function mockFetch(handler: (url: URL, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return (async (input, init) => handler(new URL(String(input)), init)) as typeof fetch;
}
const translation = (text: string) => Response.json({ responseStatus: 200, responseData: { translatedText: text } });

test('dictionary fallback uses fixed providers, bounded timeouts and exact language/input', async () => {
  const hosts: string[] = [];
  const result = await lookupTranslation({ text: 'lowffixtureword', source: 'en', target: 'vi' }, mockFetch((url, init) => {
    hosts.push(url.hostname); assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store'); assert.ok(init?.signal);
    if (url.hostname === 'api.mymemory.translated.net') { assert.equal(url.searchParams.get('q'), 'lowffixtureword'); assert.equal(url.searchParams.get('langpair'), 'en|vi'); return translation('bản dịch thử'); }
    assert.equal(url.pathname, '/api/v2/entries/en/lowffixtureword'); return Response.json([{ phonetics: [{ text: '/loʊf/' }] }]);
  }));
  assert.equal(result.translation, 'bản dịch thử'); assert.equal(result.ipa, '/loʊf/'); assert.deepEqual(result.warnings, []);
  assert.deepEqual(hosts.sort(), ['api.dictionaryapi.dev', 'api.mymemory.translated.net']);
});

test('common English words return bundled IPA when the online dictionary is unreachable', async () => {
  const hosts: string[] = [];
  const result = await lookupTranslation({ text: 'book', source: 'en', target: 'vi' }, mockFetch(url => {
    hosts.push(url.hostname);
    if (url.hostname !== 'api.mymemory.translated.net') throw new Error('Dictionary upstream unreachable');
    return translation('sách');
  }));
  assert.equal(result.translation, 'sách');
  assert.equal(result.ipa, '/ˈbʊk/');
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(hosts, ['api.mymemory.translated.net']);
});

test('dictionary absence never invents IPA or prevents translation', async () => {
  const result = await lookupTranslation({ text: 'unlistedword', source: 'en', target: 'vi' }, mockFetch(url => url.hostname.includes('dictionaryapi') ? Response.json({ title: 'No Definitions Found' }, { status: 404 }) : translation('bản dịch')));
  assert.equal(result.ipa, ''); assert.equal(result.translation, 'bản dịch'); assert.equal(result.warnings.length, 1);
});

test('an unknown word and unavailable online dictionary leave IPA empty without blocking translation', async () => {
  const result = await lookupTranslation({ text: 'unlistedword', source: 'en', target: 'vi' }, mockFetch(url => {
    if (url.hostname.includes('dictionaryapi')) throw new Error('Unreachable');
    return translation('bản dịch');
  }));
  assert.equal(result.translation, 'bản dịch');
  assert.equal(result.ipa, '');
  assert.match(result.warnings[0], /Chưa tìm thấy IPA/);
});

test('corrupted curiosity output recovers only the complete high-quality matching source entry', async () => {
  const result = await lookupTranslation({ text: 'curiosity', source: 'en', target: 'vi' }, mockFetch(() => Response.json({
    responseStatus: 200,
    responseData: { translatedText: '- Ch#7881; m#7897;t t#7915;, t#236;nh y#234;u.', match: 0.97 },
    matches: [
      { segment: 'Curiosity.', translation: '- Ch#7881; m#7897;t t#7915;, t#236;nh y#234;u.', quality: '0', match: 0.97 },
      { segment: 'Curiosity<ex id="_1"/>', translation: 'Sự tò<ex id="_1"/>', quality: 74, match: 0.96 },
      { segment: 'Curiosity. ', translation: 'Sự tò mò. ', quality: '74', match: 0.96 },
    ],
  })));
  assert.equal(result.translation, 'Sự tò mò.');
  assert.ok(result.ipa);
});

test('corrupt translations reject unrelated, low-quality, low-match or placeholder alternatives', async () => {
  const matches = [
    { segment: 'A different book', translation: 'một sách khác', quality: 100, match: 1 },
    { segment: 'a book', translation: 'chất lượng thấp', quality: 69, match: 1 },
    { segment: 'A book!', translation: 'khớp thấp', quality: 100, match: 0.89 },
    { segment: 'a book', translation: 'sách<ph id="x"/>', quality: 100, match: 1 },
    { segment: 'a book', translation: 'sách&lt;x id="1"/&gt;', quality: 100, match: 1 },
    { segment: 'a book', translation: 's#225;ch', quality: 100, match: 1 },
  ];
  await assert.rejects(lookupTranslation({ text: 'a book', source: 'en', target: 'vi' }, mockFetch(() => Response.json({
    responseStatus: 200, responseData: { translatedText: 's#225;ch' }, matches,
  }))), (error: unknown) => error instanceof HttpError && error.status === 502 && error.code === 'TRANSLATION_UNAVAILABLE');
});

test('clean base translations remain unchanged even when matching alternatives exist', async () => {
  const result = await lookupTranslation({ text: 'a book', source: 'en', target: 'vi' }, mockFetch(() => Response.json({
    responseStatus: 200, responseData: { translatedText: 'một quyển s&#225;ch' },
    matches: [{ segment: 'A book.', translation: 'một cuốn sách', quality: 100, match: 1 }],
  })));
  assert.equal(result.translation, 'một quyển sách');
});

test('phrases and non-English text do not make phonetic dictionary requests', async () => {
  for (const input of [{ text: 'a book', source: 'en' }, { text: 'livre', source: 'fr' }]) {
    let requests = 0;
    const result = await lookupTranslation({ ...input, target: 'vi' }, mockFetch(url => { requests++; assert.equal(url.hostname, 'api.mymemory.translated.net'); return translation('sách'); }));
    assert.equal(requests, 1); assert.equal(result.ipa, ''); assert.match(result.warnings[0], /một từ tiếng Anh/);
  }
});

test('provider quota errors are surfaced, not saved as successful translations', async () => {
  for (const response of [
    () => Response.json({ responseStatus: 429, responseDetails: 'Quota exceeded' }, { status: 200 }),
    () => Response.json({ responseStatus: 200, responseData: { translatedText: 'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY' } }),
    () => new Response('Too many requests', { status: 429 }),
  ]) await assert.rejects(lookupTranslation({ text: 'a book', source: 'en', target: 'vi' }, mockFetch(response)), (error: unknown) => error instanceof HttpError && error.status === 429 && error.code === 'TRANSLATION_QUOTA');
});

test('HTTP/provider errors and oversized provider bodies fail safely', async () => {
  for (const response of [
    () => Response.json({ responseStatus: 403, responseDetails: 'Denied' }, { status: 403 }),
    () => Response.json({ responseStatus: 200, responseData: {} }),
    () => new Response('x'.repeat(256 * 1024 + 1)),
  ]) await assert.rejects(lookupTranslation({ text: 'a book', source: 'en', target: 'vi' }, mockFetch(response)), (error: unknown) => error instanceof HttpError && error.status === 502);
});

test('external HTML/entities are converted to bounded plain text', () => {
  assert.equal(plainProviderText('&lt;script&gt;alert(1)&lt;/script&gt;&lt;b&gt;sách&lt;/b&gt; &amp; vở'), 'sách & vở');
  assert.equal(plainProviderText('&#x1f600; &#99999999999; &quot;hello&quot;'), '😀 "hello"');
  assert.equal(plainProviderText('x'.repeat(10000), 100).length, 100);
});

test('invalid languages, same-language requests and oversized selections fail before network access', async () => {
  for (const input of [
    { text: 'hello', source: 'https://evil.invalid', target: 'vi' },
    { text: 'hello', source: 'en', target: 'en' },
    { text: 'a'.repeat(501), source: 'en', target: 'vi' },
    { text: 'á'.repeat(251), source: 'vi', target: 'en' },
  ]) assert.equal(translationQuerySchema.safeParse(input).success, false);
  assert.equal(translationQuerySchema.safeParse({ text: 'a'.repeat(500), source: 'en', target: 'vi' }).success, true);
});
