import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// General American pronunciations, copied exactly from the MIT-licensed
// open-dict-data/ipa-dict snapshot. Attribution and upstream licenses are in data/.
const MAX_DICTIONARY_BYTES = 4 * 1024 * 1024;
const MAX_DICTIONARY_ENTRIES = 150_000;
const MAX_IPA_LENGTH = 160;
let dictionary: Promise<ReadonlyMap<string, string> | null> | undefined;

export function normalizePronunciationWord(value: string): string {
  const word = value.trim().normalize('NFC').replace(/’/g, "'").toLowerCase();
  return word.length <= 80 && /^[a-z]+(?:['-][a-z]+)*$/.test(word) ? word : '';
}

async function loadDictionary(): Promise<ReadonlyMap<string, string>> {
  const filename = path.join(process.cwd(), 'lib/reader/data/en_US.txt');
  const metadata = await stat(filename);
  if (!metadata.isFile() || metadata.size > MAX_DICTIONARY_BYTES) throw new Error('Unexpected IPA dictionary size');
  const buffer = await readFile(filename);
  if (buffer.byteLength > MAX_DICTIONARY_BYTES) throw new Error('IPA dictionary exceeds size limit');
  const entries = new Map<string, string>();
  let lines = 0;
  for (const line of buffer.toString('utf8').split('\n')) {
    if (!line.trim()) continue;
    if (++lines > MAX_DICTIONARY_ENTRIES) throw new Error('IPA dictionary exceeds entry limit');
    const separator = line.indexOf('\t');
    if (separator < 1) continue;
    const word = normalizePronunciationWord(line.slice(0, separator));
    const ipa = line.slice(separator + 1).trim();
    // Keep the recorded variants intact, rather than truncating or constructing
    // phonetics for unlisted words. These limits also match saved vocabulary.
    if (!word || ipa.length > MAX_IPA_LENGTH || !/^\/[^<>\u0000-\u001f\u007f]+\/$/.test(ipa)) continue;
    if (!entries.has(word)) entries.set(word, ipa);
  }
  if (entries.size < 100_000) throw new Error('IPA dictionary is incomplete');
  return entries;
}

/** Exact normalized-word lookup only: no stemming or generated pronunciation. */
export async function bundledEnglishIPA(value: string): Promise<string> {
  const word = normalizePronunciationWord(value);
  if (!word) return '';
  dictionary ??= loadDictionary().catch(() => {
    // A missing packaged file must not prevent text translation. The online
    // dictionary remains available as a fallback; log no file contents or paths.
    console.warn('[Lowf IPA] bundled dictionary is unavailable');
    return null;
  });
  const entries = await dictionary;
  return entries?.get(word) || '';
}
