import { z } from 'zod';
import { HttpError } from '@/lib/api';
import { bundledEnglishIPA, normalizePronunciationWord } from './pronunciation';

export const translationLanguages = ['en', 'fr', 'de', 'es', 'it', 'pt', 'ja', 'ko', 'zh', 'ru', 'vi'] as const;
const language = z.enum(translationLanguages);
export const translationQuerySchema = z.object({
  text: z.string().trim().min(1, 'Hãy chọn từ hoặc đoạn cần dịch.').refine(value => Array.from(value).length <= 500, 'Hãy chọn đoạn ngắn tối đa 500 ký tự.').refine(value => new TextEncoder().encode(value).length <= 500, 'Đoạn đã chọn vượt giới hạn dịch 500 byte. Hãy chọn ít từ hơn.'),
  source: language.default('en'),
  target: language.default('vi'),
}).strict().refine(value => value.source !== value.target, { message: 'Hãy chọn hai ngôn ngữ khác nhau.', path: ['target'] });
export type TranslationQuery = z.infer<typeof translationQuerySchema>;
export type TranslationResult = {
  text: string;
  translation: string;
  ipa: string;
  sourceLang: TranslationQuery['source'];
  targetLang: TranslationQuery['target'];
  provider: 'MyMemory';
  warnings: string[];
};

/** Provider strings remain plain text. Clients must still use textContent or escaping. */
export function plainProviderText(value: unknown, maximum = 4000): string {
  if (typeof value !== 'string') return '';
  let result = value.slice(0, 20000);
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  for (let pass = 0; pass < 3; pass++) {
    result = result.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi, (whole, name: string) => {
      const key = name.toLowerCase();
      if (!key.startsWith('#')) return entities[key] ?? whole;
      const code = key.startsWith('#x') ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    });
  }
  return result.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

async function jsonFromFixedProvider(url: URL, fetcher: typeof fetch): Promise<{ response: Response; body: unknown }> {
  const response = await fetcher(url, { signal: AbortSignal.timeout(8000), cache: 'no-store', redirect: 'error', headers: { Accept: 'application/json' } });
  // Both fixed providers return small JSON documents. Bound the response before parsing.
  if (Number(response.headers.get('content-length') || 0) > 256 * 1024) throw new Error('Provider response too large');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty provider response');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    bytes += next.value.byteLength;
    if (bytes > 256 * 1024) { await reader.cancel(); throw new Error('Provider response too large'); }
    chunks.push(next.value);
  }
  const merged = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  let body: unknown;
  try { body = JSON.parse(new TextDecoder().decode(merged)); } catch { body = null; }
  return { response, body };
}

function object(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null; }

function hasPlaceholderMarkup(value: unknown): boolean {
  return typeof value === 'string' && /(?:<|&lt;)\s*\/?\s*(?:ex|ph|x)\b/i.test(value.slice(0, 20000));
}
function hasCorruptTranslation(value: string): boolean {
  return /#(?:[0-9]+|x[0-9a-f]+);|\ufffd/i.test(value);
}
function comparableSegment(value: string): string {
  return plainProviderText(value).normalize('NFC').toLowerCase().replace(/[\p{P}\s]+$/u, '').trim();
}
/** Recover only visibly corrupted output, using a close, complete translation
 * memory entry for the same source text. Never replace a normal base response. */
function cleanMatchingAlternative(matches: unknown, source: string): string {
  if (!Array.isArray(matches)) return '';
  const expected = comparableSegment(source);
  if (!expected) return '';
  for (const value of matches.slice(0, 20)) {
    const candidate = object(value);
    if (!candidate || typeof candidate.segment !== 'string' || typeof candidate.translation !== 'string') continue;
    const quality = Number(candidate.quality), match = Number(candidate.match);
    if (!Number.isFinite(quality) || quality < 70 || quality > 100 || !Number.isFinite(match) || match < 0.9 || match > 1) continue;
    if (candidate.segment.length > 2000 || candidate.translation.length > 4000) continue;
    if (hasPlaceholderMarkup(candidate.segment) || hasPlaceholderMarkup(candidate.translation)) continue;
    if (comparableSegment(candidate.segment) !== expected) continue;
    const translated = plainProviderText(candidate.translation);
    if (translated && !hasCorruptTranslation(translated)) return translated;
  }
  return '';
}

async function translateFromMyMemory(query: TranslationQuery, fetcher: typeof fetch): Promise<string> {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', query.text);
  url.searchParams.set('langpair', `${query.source}|${query.target}`);
  let upstream: { response: Response; body: unknown };
  try { upstream = await jsonFromFixedProvider(url, fetcher); }
  catch { throw new HttpError(502, 'Chưa kết nối được dịch vụ dịch. Vui lòng thử lại sau.', 'TRANSLATION_UNAVAILABLE'); }
  const payload = object(upstream.body), details = plainProviderText(payload?.responseDetails);
  const status = Number(payload?.responseStatus);
  const rawTranslation = object(payload?.responseData)?.translatedText;
  let translated = plainProviderText(rawTranslation);
  const quota = upstream.response.status === 429 || status === 429 || /quota|daily limit|used all|available free translations/i.test(`${details} ${translated}`);
  if (quota) throw new HttpError(429, 'Dịch vụ dịch miễn phí đã hết lượt tạm thời. Hãy thử lại sau.', 'TRANSLATION_QUOTA');
  if (!upstream.response.ok || status !== 200 || !translated) throw new HttpError(502, 'Dịch vụ chưa trả về bản dịch hợp lệ. Hãy thử đoạn ngắn hơn hoặc thử lại sau.', 'TRANSLATION_UNAVAILABLE');
  if (hasCorruptTranslation(translated) || hasPlaceholderMarkup(rawTranslation)) {
    translated = cleanMatchingAlternative(payload?.matches, query.text);
    if (!translated) throw new HttpError(502, 'Dịch vụ trả về bản dịch lỗi định dạng. Hãy thử lại sau.', 'TRANSLATION_UNAVAILABLE');
  }
  return translated;
}

async function englishIPA(word: string, fetcher: typeof fetch): Promise<string> {
  const bundled = await bundledEnglishIPA(word);
  if (bundled) return bundled;
  const normalized = normalizePronunciationWord(word);
  if (!normalized) return '';
  const url = new URL(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalized)}`);
  try {
    const { response, body } = await jsonFromFixedProvider(url, fetcher);
    if (!response.ok || !Array.isArray(body)) return '';
    for (const item of body.slice(0, 12)) {
      const entry = object(item); if (!entry) continue;
      const direct = plainProviderText(entry.phonetic, 161);
      if (direct && direct.length <= 160) return direct;
      if (Array.isArray(entry.phonetics)) for (const variant of entry.phonetics.slice(0, 12)) {
        const ipa = plainProviderText(object(variant)?.text, 161);
        if (ipa && ipa.length <= 160) return ipa;
      }
    }
  } catch { /* Translation can succeed when phonetics are unavailable. */ }
  return '';
}

export async function lookupTranslation(input: unknown, fetcher: typeof fetch = fetch): Promise<TranslationResult> {
  const query = translationQuerySchema.parse(input);
  const singleEnglishWord = query.source === 'en' && /^[a-z]+(?:['’-][a-z]+)*$/i.test(query.text) && query.text.length <= 80;
  const [translation, ipa] = await Promise.all([translateFromMyMemory(query, fetcher), singleEnglishWord ? englishIPA(query.text, fetcher) : Promise.resolve('')]);
  const warnings: string[] = [];
  if (singleEnglishWord && !ipa) warnings.push('Chưa tìm thấy IPA của từ này trong từ điển.');
  if (!singleEnglishWord) warnings.push('IPA hiện hỗ trợ tra một từ tiếng Anh mỗi lần.');
  return { text: query.text, translation, ipa, sourceLang: query.source, targetLang: query.target, provider: 'MyMemory', warnings };
}
