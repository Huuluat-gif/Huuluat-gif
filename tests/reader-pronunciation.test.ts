import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { bundledEnglishIPA, normalizePronunciationWord } from '../lib/reader/pronunciation';

test('bundled pronunciations preserve the source transcription and multiple variants', async () => {
  assert.equal(await bundledEnglishIPA('book'), '/ˈbʊk/');
  assert.equal(await bundledEnglishIPA('library'), '/ˈɫaɪbɹɛˌɹi/');
  assert.equal(await bundledEnglishIPA('read'), '/ˈɹɛd/, /ˈɹid/');
  assert.equal(await bundledEnglishIPA('hello'), '/həˈɫoʊ/, /hɛˈɫoʊ/');
});

test('lookup normalizes case and apostrophes but never constructs an unlisted pronunciation', async () => {
  assert.equal(normalizePronunciationWord(' BOOK '), 'book');
  assert.equal(await bundledEnglishIPA('BOOK'), await bundledEnglishIPA('book'));
  assert.equal(await bundledEnglishIPA('CAN’T'), '/ˈkænt/');
  assert.equal(await bundledEnglishIPA('well-known'), '/ˈwɛɫˈnoʊn/');
  for (const value of ['unlistedword', 'lowffixtureword', '../book', '<book>', 'a book', 'livré', 'a'.repeat(81)]) {
    assert.equal(await bundledEnglishIPA(value), '');
  }
});

test('dictionary matches the pinned licensed upstream artifact and includes license notices', async () => {
  const data = await readFile('lib/reader/data/en_US.txt');
  assert.equal(data.byteLength, 3_180_267);
  assert.equal(createHash('sha256').update(data).digest('hex'), '2af6f154a5c363275f052d1f85acedef38ed185ca9745aa4314be77f6b70de67');
  const [ipaLicense, upstreamLicense, provenance] = await Promise.all([
    readFile('lib/reader/data/IPA-DICT-LICENSE.txt', 'utf8'),
    readFile('lib/reader/data/CMUDICT-IPA-LICENSE.txt', 'utf8'),
    readFile('lib/reader/data/README.md', 'utf8'),
  ]);
  assert.match(ipaLicense, /Copyright \(c\) 2016 dohliam/);
  assert.match(upstreamLicense, /Copyright \(c\) 2016 Lingliang Zhang/);
  assert.match(ipaLicense, /permission notice shall be included/);
  assert.match(provenance, /972cd67dd5f96bc5660e28070cde26e3928abcd7/);
});
