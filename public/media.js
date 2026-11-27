/* Lowf media: original synthesized ambient audio and private, on-device PDF storage.
   PDF.js 3.11.174 is fetched only when the first PDF is opened. */
(() => {
  'use strict';
  const MAX_PDF_BYTES = 30 * 1024 * 1024;
  const PDF_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  let audioContext = null, master = null, audioTimer = null;
  let isPlaying = false, currentMode = 'rain', volume = 0.35, audioEpoch = 0;
  const audioNodes = new Set();

  function track(node, source = false) {
    audioNodes.add(node);
    if (source) node.onended = () => { audioNodes.delete(node); try { node.disconnect(); } catch (_) {} };
    return node;
  }
  function cleanupAudio() {
    if (audioTimer) clearInterval(audioTimer);
    audioTimer = null;
    for (const node of audioNodes) {
      try { if (typeof node.stop === 'function') node.stop(); } catch (_) {}
      try { node.disconnect(); } catch (_) {}
    }
    audioNodes.clear();
  }
  function makeNoise(seconds = 3) {
    const length = Math.round(audioContext.sampleRate * seconds);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      previous = (previous + Math.random() * 0.035 - 0.0175) / 1.018;
      data[i] = previous * 4;
    }
    return buffer;
  }
  function noiseLayer(level = 0.35, filterType = 'lowpass', freq = 2600, q = 0.7) {
    const noise = track(audioContext.createBufferSource(), true);
    noise.buffer = makeNoise(4); noise.loop = true;
    const filter = track(audioContext.createBiquadFilter());
    filter.type = filterType; filter.frequency.value = freq; filter.Q.value = q;
    const gain = track(audioContext.createGain()); gain.gain.value = level;
    noise.connect(filter); filter.connect(gain); gain.connect(master); noise.start();
    return { filter, gain };
  }
  function rainLayer(level = 0.45) { noiseLayer(level, 'lowpass', 3000, 0.7); }
  function note(frequency, time, duration = 2.4, loudness = 0.11, type = 'sine') {
    const oscillator = track(audioContext.createOscillator(), true);
    const gain = track(audioContext.createGain());
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(loudness, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(gain); gain.connect(master);
    oscillator.onended = () => {
      audioNodes.delete(oscillator); audioNodes.delete(gain);
      try { oscillator.disconnect(); gain.disconnect(); } catch (_) {}
    };
    oscillator.start(time); oscillator.stop(time + duration + 0.06);
  }
  function kick(time, level = 0.12) {
    const osc = track(audioContext.createOscillator(), true);
    const gain = track(audioContext.createGain());
    osc.frequency.setValueAtTime(102, time); osc.frequency.exponentialRampToValueAtTime(42, time + 0.18);
    gain.gain.setValueAtTime(level, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);
    osc.connect(gain); gain.connect(master);
    osc.onended = () => { audioNodes.delete(osc); audioNodes.delete(gain); try { osc.disconnect(); gain.disconnect(); } catch (_) {} };
    osc.start(time); osc.stop(time + 0.28);
  }
  function hihat(time, level = 0.025) {
    const src = track(audioContext.createBufferSource(), true);
    src.buffer = makeNoise(0.06);
    const hp = track(audioContext.createBiquadFilter());
    hp.type = 'highpass'; hp.frequency.value = 6200;
    const gain = track(audioContext.createGain());
    gain.gain.setValueAtTime(level, time); gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    src.connect(hp); hp.connect(gain); gain.connect(master);
    src.start(time);
  }
  const SOUND_PROFILES = {
    rain: { pureRain: true },
    piano: { step: 0.72, wave: 'sine', dur: 2.8, vol: 0.10, chords: [[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]], pattern: [0,1,2,1,0,2,1,2] },
    lofi: { step: 0.46, wave: 'triangle', dur: 1.15, vol: 0.09, rain: 0.08, beat: true, chords: [[261.63,329.63,392,493.88],[220,261.63,329.63,392],[174.61,220,261.63,329.63],[196,246.94,293.66,349.23]], pattern: [0,1,2,3,1,2,0,3] },
    hanoi_rain: { step: 0.52, wave: 'triangle', dur: 1.6, vol: 0.085, rain: 0.22, beat: true, chords: [[220,261.63,329.63,392],[174.61,220,261.63,329.63],[146.83,174.61,220,261.63],[164.81,196,246.94,293.66]], pattern: [0,2,1,3,0,1,2,3] },
    dalat_pine: { step: 0.85, wave: 'sine', dur: 3.1, vol: 0.09, noise: [0.16,'bandpass',720,1.2], chords: [[196,246.94,293.66,392],[164.81,196,246.94,329.63],[130.81,164.81,196,261.63],[146.83,196,220,293.66]], pattern: [0,1,2,3,2,1,0,2] },
    tokyo_night: { step: 0.42, wave: 'triangle', dur: 1.0, vol: 0.085, rain: 0.12, beat: true, hat: true, chords: [[233.08,293.66,349.23,440],[196,233.08,293.66,349.23],[155.56,196,233.08,293.66],[174.61,220,261.63,329.63]], pattern: [0,3,1,2,0,2,3,1] },
    cafe_jazz: { step: 0.50, wave: 'sine', dur: 1.35, vol: 0.095, noise: [0.06,'bandpass',1200,0.8], beat: true, hat: true, chords: [[261.63,329.63,392,493.88],[293.66,349.23,440,523.25],[196,246.94,293.66,392],[220,261.63,329.63,440]], pattern: [0,1,3,2,1,0,2,3] },
    ocean_sunset: { step: 0.92, wave: 'sine', dur: 3.6, vol: 0.09, noise: [0.22,'lowpass',950,0.6], chords: [[261.63,329.63,392,523.25],[246.94,293.66,392,493.88],[220,261.63,329.63,440],[174.61,220,261.63,349.23]], pattern: [0,1,2,3,2,1,3,0] },
    fireplace: { step: 0.95, wave: 'triangle', dur: 3.4, vol: 0.075, noise: [0.20,'bandpass',420,0.9], chords: [[146.83,220,293.66],[130.81,196,261.63],[110,164.81,220],[123.47,196,246.94]], pattern: [0,1,2,1,0,2,1,0] },
    kyoto_zen: { step: 0.88, wave: 'sine', dur: 3.2, vol: 0.095, noise: [0.07,'highpass',2200,0.7], chords: [[293.66,329.63,440,587.33],[261.63,293.66,392,523.25],[220,261.63,329.63,440],[246.94,293.66,392,493.88]], pattern: [0,2,3,1,2,0,3,2] },
    starlight: { step: 1.05, wave: 'sine', dur: 4.2, vol: 0.08, chords: [[196,293.66,392,493.88],[174.61,261.63,349.23,440],[146.83,220,293.66,392],[164.81,246.94,329.63,440]], pattern: [0,2,1,3,0,3,2,1] },
    alpha_focus: { step: 0.78, wave: 'sine', dur: 2.6, vol: 0.085, noise: [0.09,'lowpass',1100,0.7], chords: [[220,277.18,329.63,440],[196,246.94,293.66,392],[164.81,207.65,246.94,329.63],[174.61,220,261.63,349.23]], pattern: [0,1,2,3,0,1,2,3] },
    saigon_morning: { step: 0.44, wave: 'sine', dur: 1.25, vol: 0.095, beat: true, hat: true, chords: [[293.66,369.99,440,587.33],[246.94,293.66,369.99,493.88],[196,246.94,293.66,392],[220,277.18,329.63,440]], pattern: [0,2,1,3,2,1,3,0] }
  };
  async function play(mode = 'rain') {
    const profile = SOUND_PROFILES[mode];
    if (!profile) throw new Error('Âm thanh này chưa có. Hãy chọn một giai điệu trong thư viện.');
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) throw new Error('Trình duyệt này chưa hỗ trợ âm thanh. Hãy thử Chrome hoặc Safari mới hơn.');
    const request = ++audioEpoch;
    cleanupAudio(); isPlaying = false;
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new Audio({ latencyHint: 'playback' });
      master = audioContext.createGain(); master.connect(audioContext.destination);
    }
    await audioContext.resume();
    if (request !== audioEpoch) return;
    if (audioContext.state !== 'running') throw new Error('Chạm nút phát một lần nữa để cho phép âm thanh.');
    master.gain.setValueAtTime(volume, audioContext.currentTime);
    currentMode = mode; isPlaying = true;
    if (profile.pureRain) { rainLayer(); return; }
    if (profile.rain) rainLayer(profile.rain);
    if (profile.noise) noiseLayer(...profile.noise);
    const { chords, pattern, step: stepLength, wave, dur, vol, beat, hat } = profile;
    let step = 0, nextTime = audioContext.currentTime + 0.06;
    const schedule = () => {
      if (!isPlaying || request !== audioEpoch || audioContext.state !== 'running') return;
      if (nextTime < audioContext.currentTime - 0.2) nextTime = audioContext.currentTime + 0.03;
      while (nextTime < audioContext.currentTime + 0.32) {
        const chord = chords[Math.floor(step / 8) % chords.length];
        const melody = chord[pattern[step % pattern.length] % chord.length];
        note(melody * (step % 4 === 3 ? 2 : 1), nextTime, dur, vol, wave);
        if (step % 8 === 0) note(chord[0] / 2, nextTime, dur * 1.4, vol * 0.8, 'sine');
        if (beat && step % 2 === 0) kick(nextTime, 0.11);
        if (hat && step % 2 === 1) hihat(nextTime, 0.022);
        nextTime += stepLength; step++;
      }
    };
    schedule(); audioTimer = setInterval(schedule, 200);
  }
  async function chime() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      const ctx = audioContext && audioContext.state !== 'closed' ? audioContext : new Audio();
      await ctx.resume();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + idx * 0.18);
        g.gain.exponentialRampToValueAtTime(0.14, now + idx * 0.18 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.18 + 1.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(now + idx * 0.18); o.stop(now + idx * 0.18 + 1.35);
      });
    } catch (_) {}
  }
  function pause() {
    audioEpoch++; isPlaying = false; cleanupAudio();
    if (audioContext && audioContext.state === 'running') audioContext.suspend().catch(() => {});
  }
  function setVolume(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    volume = Math.min(1, Math.max(0, parsed));
    if (master && audioContext) master.gain.setTargetAtTime(volume, audioContext.currentTime, 0.03);
  }

  let dbPromise = null;
  function openDB() {
    if (!window.indexedDB) return Promise.reject(new Error('Trình duyệt không hỗ trợ lưu PDF. Hãy dùng cửa sổ trình duyệt thông thường.'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try { request = indexedDB.open('la-private-library', 1); }
      catch (_) { reject(new Error('Không thể mở bộ nhớ PDF. Hãy cho phép lưu dữ liệu trang web.')); return; }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      request.onerror = () => reject(new Error('Không thể truy cập bộ nhớ PDF. Hãy kiểm tra quyền lưu trữ của trình duyệt.'));
      request.onblocked = () => reject(new Error('Hãy đóng tab Lowf khác rồi thử lưu PDF lại.'));
    }).catch(error => { dbPromise = null; throw error; });
    return dbPromise;
  }
  async function transaction(mode, operation) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      let result, request, tx;
      try {
        tx = db.transaction('files', mode);
        request = operation(tx.objectStore('files'));
        if (request) request.onsuccess = () => { result = request.result; };
      } catch (_) { reject(new Error('Không thể thao tác với tệp PDF. Hãy tải lại trang và thử lại.')); return; }
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error(tx.error && tx.error.name === 'QuotaExceededError' ? 'Bộ nhớ trình duyệt đã đầy. Hãy xóa bớt PDF hoặc giải phóng dung lượng.' : 'Không thể lưu hoặc đọc tệp PDF trong trình duyệt.'));
    });
  }
  function metadata(record) { return { id: record.id, name: record.name, size: record.size, added: record.added, kind: record.kind || 'pdf', chapterCount: Array.isArray(record.chapters) ? record.chapters.length : 0 }; }
  function cleanParagraphs(rawText) {
    const normalized = String(rawText || '')
      .replace(/\r\n?/g, '\n')
      .replace(/-\n(?=[a-zà-ỹ])/gi, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n');
    const blocks = normalized.split(/\n\s*\n/).map(b => b.replace(/\s+/g, ' ').trim()).filter(b => b.length > 1 && !/^(?:trang\s*)?\d{1,4}$/i.test(b));
    return blocks.length ? blocks : ['Nội dung đang được chuẩn hóa.'];
  }
  function splitTextIntoChapters(rawText, fallbackTitle = 'Chương 1') {
    const clean = String(rawText || '').replace(/\r\n?/g, '\n').trim();
    if (!clean) return [{ title: fallbackTitle, paragraphs: ['Chưa có nội dung văn bản.'] }];
    const headingRe = /^(?:#{1,3}\s+|(?:chương|phần|chapter|part)\s+\d+[^\n]*)/gim;
    const matches = [...clean.matchAll(headingRe)];
    if (matches.length >= 2) {
      const chapters = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : clean.length;
        const block = clean.slice(start, end).trim();
        const lines = block.split('\n');
        const title = lines.shift().replace(/^#+\s*/, '').trim().slice(0, 140) || `Chương ${i + 1}`;
        const paragraphs = cleanParagraphs(lines.join('\n'));
        if (paragraphs.length) chapters.push({ title, paragraphs });
      }
      if (chapters.length) return chapters;
    }
    const allParas = cleanParagraphs(clean);
    const chapters = [];
    const perChapter = 18;
    for (let i = 0; i < allParas.length; i += perChapter) {
      chapters.push({
        title: allParas.length > perChapter ? `${fallbackTitle} · Phần ${Math.floor(i / perChapter) + 1}` : fallbackTitle,
        paragraphs: allParas.slice(i, i + perChapter)
      });
    }
    return chapters;
  }
  async function inflateRawBytes(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Trình duyệt hiện tại chưa hỗ trợ giải nén EPUB tự động.');
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes); writer.close();
    const out = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(out);
  }
  async function extractEpubEntries(buffer) {
    const u8 = new Uint8Array(buffer), dv = new DataView(buffer);
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Tệp EPUB không đúng cấu trúc nén ZIP.');
    const cdOffset = dv.getUint32(eocd + 16, true), cdCount = dv.getUint16(eocd + 10, true);
    const entries = new Map();
    const td = new TextDecoder('utf-8');
    let p = cdOffset;
    for (let i = 0; i < cdCount && p + 46 <= u8.length; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true);
      const compSize = dv.getUint32(p + 20, true);
      const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
      const localOff = dv.getUint32(p + 42, true);
      const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
      p += 46 + nameLen + extraLen + commentLen;
      if (/\.(?:xhtml|html|htm|opf|ncx)$/i.test(name)) {
        const lhName = dv.getUint16(localOff + 26, true), lhExtra = dv.getUint16(localOff + 28, true);
        const dataStart = localOff + 30 + lhName + lhExtra;
        const slice = u8.subarray(dataStart, dataStart + compSize);
        let raw = slice;
        if (method === 8) raw = await inflateRawBytes(slice);
        else if (method !== 0) continue;
        entries.set(name, td.decode(raw));
      }
    }
    return entries;
  }
  async function parseEbookFile(file) {
    const name = String(file.name || 'Ebook').replace(/\.(?:epub|txt|md|pdf)$/i, '').trim() || 'Sách mới';
    const lower = String(file.name || '').toLowerCase();
    if (lower.endsWith('.txt') || lower.endsWith('.md') || file.type === 'text/plain' || file.type === 'text/markdown') {
      const txt = await file.text();
      return { kind: 'ebook', title: name, chapters: splitTextIntoChapters(txt, name) };
    }
    if (lower.endsWith('.epub') || file.type === 'application/epub+zip') {
      const entries = await extractEpubEntries(await file.arrayBuffer());
      const opfKey = [...entries.keys()].find(k => /\.opf$/i.test(k));
      let orderedKeys = [...entries.keys()].filter(k => /\.(?:xhtml|html|htm)$/i.test(k)).sort();
      if (opfKey) {
        const opf = entries.get(opfKey) || '';
        const baseDir = opfKey.includes('/') ? opfKey.slice(0, opfKey.lastIndexOf('/') + 1) : '';
        const idMap = {};
        for (const m of opf.matchAll(/<item[^>]+id=["']([^"']+)["'][^>]+href=["']([^"']+)["']/gi)) idMap[m[1]] = decodeURIComponent(baseDir + m[2]);
        for (const m of opf.matchAll(/<item[^>]+href=["']([^"']+)["'][^>]+id=["']([^"']+)["']/gi)) idMap[m[2]] = decodeURIComponent(baseDir + m[1]);
        const spine = [...opf.matchAll(/<itemref[^>]+idref=["']([^"']+)["']/gi)].map(m => idMap[m[1]]).filter(k => k && entries.has(k));
        if (spine.length) orderedKeys = spine;
      }
      const parser = new DOMParser();
      const chapters = [];
      for (const k of orderedKeys) {
        const doc = parser.parseFromString(entries.get(k) || '', 'text/html');
        doc.querySelectorAll('script,style,nav').forEach(el => el.remove());
        const h = doc.querySelector('h1,h2,h3,title')?.textContent?.trim();
        const pEls = [...doc.querySelectorAll('p,div,blockquote,li')].filter(el => !el.querySelector('p,div')).map(el => el.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 1);
        const paras = pEls.length ? pEls : cleanParagraphs(doc.body?.textContent || '');
        if (paras.length && paras.join('').length > 25) {
          chapters.push({ title: (h && h.length < 120 ? h : `Chương ${chapters.length + 1}`), paragraphs: paras });
        }
      }
      if (!chapters.length) throw new Error('Không trích xuất được chữ từ tệp EPUB này.');
      return { kind: 'ebook', title: name, chapters: chapters.slice(0, 300) };
    }
    if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
      const library = await loadPDFJS();
      const doc = await library.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true }).promise;
      const maxPages = Math.min(doc.numPages, 120);
      let fullText = '', textPages = 0;
      for (let i = 1; i <= maxPages; i++) {
        const pg = await doc.getPage(i);
        const content = await pg.getTextContent();
        const pageStr = content.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : ' ')).join('');
        if (pageStr.trim().length > 30) textPages++;
        fullText += '\n\n' + pageStr;
      }
      doc.destroy?.();
      if (textPages === 0 || fullText.trim().length < 80) {
        return { kind: 'scan-pdf', title: name, pages: doc.numPages, chapters: [] };
      }
      return { kind: 'text-pdf', title: name, pages: doc.numPages, chapters: splitTextIntoChapters(fullText, name) };
    }
    throw new Error('Hỗ trợ tự động tối ưu tệp .pdf, .epub, .txt và .md.');
  }
  async function savePDF(file) {
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Vui lòng chọn một tệp sách.');
    if (!file.size || file.size > MAX_PDF_BYTES) throw new Error('Chọn tệp sách có dung lượng từ 1 byte đến 30 MB.');
    const lower = String(file.name || '').toLowerCase();
    const isEbookText = lower.endsWith('.epub') || lower.endsWith('.txt') || lower.endsWith('.md') || file.type === 'application/epub+zip' || file.type === 'text/plain' || file.type === 'text/markdown';
    if (isEbookText) {
      const parsed = await parseEbookFile(file);
      const record = {
        id: 'ebk-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
        name: parsed.title.slice(0, 240),
        kind: 'ebook',
        chapters: parsed.chapters,
        size: file.size, added: new Date().toISOString(), blob: file
      };
      await transaction('readwrite', store => store.put(record));
      return metadata(record);
    }
    if (file.type && file.type !== 'application/pdf' && file.type !== 'application/octet-stream') throw new Error('Hãy chọn tệp .pdf, .epub, .txt hoặc .md.');
    const header = new TextDecoder('latin1').decode(await file.slice(0, 1024).arrayBuffer());
    if (!header.includes('%PDF-')) throw new Error('Tệp không có định dạng PDF hợp lệ.');
    const record = {
      id: 'pdf-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
      name: String(file.name || 'Sách của tôi.pdf').slice(0, 240),
      kind: 'pdf',
      size: file.size, added: new Date().toISOString(), blob: file
    };
    await transaction('readwrite', store => store.put(record));
    return metadata(record);
  }
  async function listPDFs() {
    // Cursor reads metadata only into the returned array; file blobs remain in IndexedDB.
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const result = [], tx = db.transaction('files', 'readonly');
      const request = tx.objectStore('files').openCursor();
      request.onsuccess = () => { const cursor = request.result; if (cursor) { result.push(metadata(cursor.value)); cursor.continue(); } };
      tx.oncomplete = () => resolve(result.sort((a, b) => b.added.localeCompare(a.added)));
      tx.onerror = () => reject(new Error('Không thể đọc kệ PDF của bạn.'));
    });
  }
  async function getPDF(id) {
    const record = await transaction('readonly', store => store.get(id));
    if (!record || !record.blob) throw new Error('Không tìm thấy PDF. Tệp có thể đã bị xóa hoặc được lưu trong trình duyệt khác.');
    return record;
  }
  async function deletePDF(id) {
    if (pdfCache && pdfCache.id === id) cancelPDF();
    await transaction('readwrite', store => store.delete(id));
  }
  async function exportPDF(id) {
    const record = await getPDF(id);
    const url = URL.createObjectURL(record.blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = record.name;
    anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  let pdfLibraryPromise = null, pdfCache = null, renderTask = null, renderEpoch = 0;
  function loadPDFJS() {
    if (window.pdfjsLib) { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL; return Promise.resolve(window.pdfjsLib); }
    if (pdfLibraryPromise) return pdfLibraryPromise;
    pdfLibraryPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = PDF_JS_URL; script.async = true; script.crossOrigin = 'anonymous';
      const timer = setTimeout(fail, 18000);
      function fail() {
        clearTimeout(timer); script.remove();
        reject(new Error('Cần kết nối Internet để tải trình đọc PDF lần đầu. Bạn vẫn có thể tải tệp gốc để đọc bằng ứng dụng khác.'));
      }
      script.onerror = fail;
      script.onload = () => {
        clearTimeout(timer);
        if (!window.pdfjsLib) { fail(); return; }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        resolve(window.pdfjsLib);
      };
      document.head.appendChild(script);
    }).catch(error => { pdfLibraryPromise = null; throw error; });
    return pdfLibraryPromise;
  }
  function cancelled() { const error = new Error('Đã hủy tải trang PDF.'); error.name = 'AbortError'; return error; }
  function releaseCache(cache) {
    if (cache && cache.task) { try { const pending = cache.task.destroy(); if (pending && pending.catch) pending.catch(() => {}); } catch (_) {} }
  }
  function cancelPDF() {
    renderEpoch++;
    if (renderTask) { try { renderTask.cancel(); } catch (_) {} renderTask = null; }
    releaseCache(pdfCache); pdfCache = null;
  }
  function enhanceScanCanvas(canvas, context, trimMargins = true) {
    try {
      const width = canvas.width, height = canvas.height;
      const imgData = context.getImageData(0, 0, width, height);
      const d = imgData.data;
      // 1. Adaptive paper-white calibration + automatic cover/photo detection
      const hist = new Uint32Array(256);
      const step = Math.max(1, Math.floor((width * height) / 60000));
      let samples = 0, colorful = 0, midtones = 0;
      for (let p = 0; p < width * height; p += step) {
        const idx = p * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        const lum = (r * 77 + g * 150 + b * 29) >> 8;
        hist[lum]++; samples++;
        if (Math.max(r, g, b) - Math.min(r, g, b) > 30) colorful++;
        if (lum > 45 && lum < 195) midtones++;
      }
      // Preserve rich color covers, illustrations, and photo pages without harsh B&W thresholding
      const isPhotoOrCover = (colorful / Math.max(1, samples) > 0.16) || (midtones / Math.max(1, samples) > 0.36);
      if (isPhotoOrCover) return null;

      let acc = 0, p90 = 230;
      for (let v = 0; v < 256; v++) {
        acc += hist[v];
        if (acc >= samples * 0.88) { p90 = v; break; }
      }
      const whiteCut = Math.max(176, Math.min(234, p90 - 12));
      const darkCut = Math.max(60, whiteCut - 72);
      const rowHit = trimMargins && width >= 160 && height >= 160 ? new Uint32Array(height) : null;
      const colHit = rowHit ? new Uint32Array(width) : null;
      // 2. Clean gray scan noise -> pure white (blends seamlessly into any Lowf paper tone), sharpen ink & measure exact ink bounds in 1 exact pass
      for (let y = 0; y < height; y++) {
        const rowOff = y * width * 4;
        for (let x = 0; x < width; x++) {
          const i = rowOff + x * 4;
          const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
          if (lum >= whiteCut) {
            d[i] = 255; d[i + 1] = 255; d[i + 2] = 255;
          } else {
            if (rowHit && lum < whiteCut - 12) { rowHit[y]++; colHit[x]++; }
            if (lum <= darkCut) {
              d[i] = (d[i] * 0.78) | 0;
              d[i + 1] = (d[i + 1] * 0.78) | 0;
              d[i + 2] = (d[i + 2] * 0.78) | 0;
            } else {
              const t = (lum - darkCut) / Math.max(1, whiteCut - darkCut);
              const s = t * t * (3 - 2 * t);
              const target = Math.round(darkCut * 0.78 + s * (255 - darkCut * 0.78));
              const ratio = target / Math.max(1, lum);
              d[i] = Math.min(255, (d[i] * ratio) | 0);
              d[i + 1] = Math.min(255, (d[i + 1] * ratio) | 0);
              d[i + 2] = Math.min(255, (d[i + 2] * ratio) | 0);
            }
          }
        }
      }
      context.putImageData(imgData, 0, 0);
      if (!rowHit) return null;
      // 3. Exact 1-pixel-accurate safe auto-trim of empty outer scan borders (never clips any character or page number!)
      const minInk = 2;
      let top = 0, bottom = height - 1, left = 0, right = width - 1;
      while (top < height - 1 && rowHit[top] < minInk) top++;
      while (bottom > top && rowHit[bottom] < minInk) bottom--;
      while (left < width - 1 && colHit[left] < minInk) left++;
      while (right > left && colHit[right] < minInk) right--;
      const contentW = right - left + 1, contentH = bottom - top + 1;
      if (contentW < width * 0.35 || contentH < height * 0.25) return null;
      const padX = Math.max(18, Math.round(contentW * 0.065));
      const padY = Math.max(18, Math.round(contentH * 0.055));
      const cx = Math.max(0, left - padX), cy = Math.max(0, top - padY);
      const cw = Math.min(width - cx, contentW + padX * 2), ch = Math.min(height - cy, contentH + padY * 2);
      const savedRatio = 1 - (cw * ch) / (width * height);
      if (savedRatio < 0.06 || savedRatio > 0.65) return null;
      const tmp = document.createElement('canvas');
      tmp.width = cw; tmp.height = ch;
      const tctx = tmp.getContext('2d', { alpha: false });
      if (!tctx) return null;
      tctx.fillStyle = '#ffffff'; tctx.fillRect(0, 0, cw, ch);
      tctx.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);
      canvas.width = cw; canvas.height = ch;
      const nctx = canvas.getContext('2d', { alpha: false });
      nctx.drawImage(tmp, 0, 0);
      return { width: cw, height: ch, trimmed: true };
    } catch (_) {
      return null;
    }
  }
  function findPdfEofOffsets(u8) {
    const offs = [];
    const n = u8.length;
    for (let i = 0; i <= n - 5; i++) {
      if (u8[i] === 37 && u8[i + 1] === 37 && u8[i + 2] === 69 && u8[i + 3] === 79 && u8[i + 4] === 70) {
        let end = i + 5;
        if (end < n && u8[end] === 13) end++;
        if (end < n && u8[end] === 10) end++;
        offs.push(end);
      }
    }
    return offs;
  }
  function normalizePdfGenerationsInPlace(u8) {
    // Byte-offset-preserving repair: sets generation 1..9 -> 0 in xref entries, obj headers, and R refs
    // without shifting a single byte offset in the entire PDF!
    const out = new Uint8Array(u8);
    const n = out.length;
    const isDigit = c => c >= 48 && c <= 57;
    const isSpace = c => c === 32 || c === 9 || c === 10 || c === 13;
    for (let i = 0; i < n - 18; i++) {
      // Match 20-byte xref entry: "dddddddddd 0000[1-9] n"
      if (out[i + 10] === 32 && out[i + 11] === 48 && out[i + 12] === 48 && out[i + 13] === 48 && out[i + 14] === 48 && out[i + 15] >= 49 && out[i + 15] <= 57 && out[i + 16] === 32 && out[i + 17] === 110) {
        let ok = true;
        for (let k = 0; k < 10; k++) { if (!isDigit(out[i + k])) { ok = false; break; } }
        if (ok) { out[i + 15] = 48; i += 17; continue; }
      }
      // Match "<digits> [1-9] obj" or "<digits> [1-9] R"
      if (out[i] >= 49 && out[i] <= 57 && i > 1 && isSpace(out[i - 1]) && isDigit(out[i - 2]) && isSpace(out[i + 1])) {
        const isObj = i + 4 < n && out[i + 2] === 111 && out[i + 3] === 98 && out[i + 4] === 106;
        const isRef = i + 2 < n && out[i + 2] === 82 && (i + 3 >= n || isSpace(out[i + 3]) || out[i + 3] === 47 || out[i + 3] === 62 || out[i + 3] === 93);
        if (isObj || isRef) out[i] = 48;
      }
    }
    return out;
  }
  function repairCorruptPdfBytes(rawBytes, level = 1) {
    const u8 = rawBytes instanceof Uint8Array ? rawBytes : new Uint8Array(rawBytes);
    if (level === 1) {
      // Layer 1: Clean original revision before a broken incremental watermark update (common in VN scanned ebooks)
      const eofs = findPdfEofOffsets(u8);
      if (eofs.length >= 2) {
        const prevEnd = eofs[eofs.length - 2];
        if (prevEnd > u8.length * 0.25) return u8.slice(0, prevEnd);
      }
    }
    // Layer 2: Universal byte-exact XRef generation normalizer
    return normalizePdfGenerationsInPlace(u8);
  }
  function isRepairablePdfError(err) {
    const msg = String(err?.message || err || '');
    return /Inconsistent generation|XRef|Invalid XRef|FormatError|Bad FCHECK/i.test(msg);
  }
  const remoteSources = new Map();
  function renderRemotePDF(id, title, canvas, page = 1, textLayer = null, options = {}) {
    const key='remote:'+id;
    remoteSources.set(key,{name:title,url:'/api/assets/'+encodeURIComponent(id)});
    return renderPDF(key,canvas,page,textLayer,options);
  }
  function computeAvailableBox(canvas) {
    const scroller = canvas.closest('.reader-scroll');
    const zen = !!document.querySelector('#reader.reader-zen-mode');
    const isMobile = window.innerWidth < 768;
    const padX = isMobile ? 20 : (zen ? 48 : 132);
    const padY = isMobile ? 22 : (zen ? 54 : 36);
    const rawW = scroller && scroller.clientWidth > 120 ? scroller.clientWidth : window.innerWidth;
    const rawH = scroller && scroller.clientHeight > 120 ? scroller.clientHeight : Math.max(360, window.innerHeight - (zen ? 64 : 215));
    return { availW: Math.max(240, rawW - padX), availH: Math.max(280, rawH - padY) };
  }
  async function renderSinglePdfPage(pdfPage, canvas, targetW, targetH, textLayer, options, epoch, isSpread) {
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 2.5);
    const pixelScale = Math.min((targetW * dpr) / baseViewport.width, 2400 / baseViewport.width, 3000 / baseViewport.height);
    const viewport = pdfPage.getViewport({ scale: Math.max(1.2, pixelScale) });
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!context) throw new Error('Trình duyệt không thể vẽ trang PDF.');
    const task = pdfPage.render({ canvasContext: context, viewport, background: 'rgb(255,255,255)' });
    renderTask = task;
    await task.promise;
    if (renderTask === task) renderTask = null;
    if (epoch !== renderEpoch) throw cancelled();
    let text = '', paragraphs = [];
    try {
      const content = await pdfPage.getTextContent();
      if (epoch !== renderEpoch) throw cancelled();
      const rawJoined = content.items.map(item => (item.str || '') + (item.hasEOL ? '\n' : ' ')).join('');
      text = rawJoined.replace(/\s+/g, ' ').trim();
      paragraphs = cleanParagraphs(rawJoined);
      if (textLayer) {
        textLayer.replaceChildren();
        if (text.length >= 28 && !isSpread) {
          const detached = document.createElement('div');
          const cssViewport = pdfPage.getViewport({ scale: targetW / baseViewport.width });
          detached.style.setProperty('--scale-factor', String(cssViewport.scale));
          const textTask = window.pdfjsLib.renderTextLayer({
            textContentSource: content, container: detached, viewport: cssViewport, textDivs: []
          });
          await textTask.promise;
          if (epoch !== renderEpoch) throw cancelled();
          textLayer.replaceChildren(...detached.childNodes);
          textLayer.style.width = cssViewport.width + 'px';
          textLayer.style.height = cssViewport.height + 'px';
          textLayer.style.setProperty('--scale-factor', String(cssViewport.scale));
          textLayer.dataset.renderWidth = String(cssViewport.width);
        }
      }
    } catch (error) {
      if (epoch !== renderEpoch || error.name === 'AbortError') throw cancelled();
      if (textLayer) textLayer.replaceChildren();
    }
    const isScan = text.length < 28;
    let trimmed = false;
    if (options.enhanceScan !== false && (isScan || options.forceEnhance)) {
      const res = enhanceScanCanvas(canvas, context, options.trimMargins !== false && isScan);
      if (res && res.trimmed) trimmed = true;
    }
    // Fit final (possibly trimmed) canvas cleanly into the target box without ANY cropping!
    const aspect = canvas.width / Math.max(1, canvas.height);
    let finalW = targetW, finalH = Math.round(targetW / aspect);
    if (options.fitMode !== 'width' && finalH > targetH) {
      finalH = targetH;
      finalW = Math.round(targetH * aspect);
    }
    canvas.style.setProperty('width', finalW + 'px', 'important');
    canvas.style.setProperty('height', finalH + 'px', 'important');
    canvas.style.setProperty('max-width', 'none', 'important');
    return { text, paragraphs, isScan, trimmed, cssWidth: finalW, cssHeight: finalH };
  }
  async function loadPdfCache(id, repairLevel = 0) {
    releaseCache(pdfCache);
    const cache = { id, task: null, promise: null, name: '', repairLevel }; pdfCache = cache;
    cache.promise = (async () => {
      const [library, record] = await Promise.all([loadPDFJS(), remoteSources.has(id) ? Promise.resolve(remoteSources.get(id)) : getPDF(id)]);
      if (pdfCache !== cache) throw cancelled();
      cache.name = record.name;
      let docOpts;
      if (repairLevel > 0) {
        const rawBuf = record.url
          ? await fetch(record.url, { credentials: 'same-origin' }).then(r => { if (!r.ok) throw new Error('Không tải được tệp PDF gốc để sửa lỗi XRef.'); return r.arrayBuffer(); })
          : await record.blob.arrayBuffer();
        if (pdfCache !== cache) throw cancelled();
        docOpts = { data: repairCorruptPdfBytes(rawBuf, repairLevel) };
      } else {
        const buffer = record.url ? null : await record.blob.arrayBuffer();
        if (pdfCache !== cache) throw cancelled();
        docOpts = record.url ? { url: record.url, withCredentials: false } : { data: new Uint8Array(buffer) };
      }
      cache.task = library.getDocument({
        ...docOpts, isEvalSupported: false,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
        cMapPacked: true,
        disableAutoFetch: true,
        disableStream: false,
        disableRange: false,
        rangeChunkSize: 262144
      });
      return cache.task.promise;
    })();
    return cache;
  }
  async function renderPDF(id, canvas, page = 1, textLayer = null, options = {}) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('Không tìm thấy vùng hiển thị PDF.');
    const epoch = ++renderEpoch;
    if (renderTask) {
      const oldTask = renderTask; renderTask = null;
      try { oldTask.cancel(); await oldTask.promise; } catch (_) {}
    }
    if (epoch !== renderEpoch) throw cancelled();
    let repairLevel = (pdfCache && pdfCache.id === id) ? (pdfCache.repairLevel || 0) : 0;
    while (true) {
      try {
        if (!pdfCache || pdfCache.id !== id || (pdfCache.repairLevel || 0) !== repairLevel) {
          await loadPdfCache(id, repairLevel);
        }
        const cache = pdfCache;
        const documentPDF = await cache.promise;
        if (epoch !== renderEpoch) throw cancelled();
        const pageNumber = Math.min(documentPDF.numPages, Math.max(1, Math.floor(Number(page) || 1)));
        const fitMode = ['page', 'spread', 'width'].includes(options.fitMode) ? options.fitMode : 'page';
        const zoom = Math.max(0.7, Math.min(2.0, Number(options.zoom) || 1));
        const { availW, availH } = computeAvailableBox(canvas);
        const canSpread = fitMode === 'spread' && options.canvas2 && window.innerWidth >= 920 && pageNumber < documentPDF.numPages;

        const pdfPage1 = await documentPDF.getPage(pageNumber);
        if (epoch !== renderEpoch) throw cancelled();
        const vp1 = pdfPage1.getViewport({ scale: 1 });

        let secondRendered = false;
        let combinedText = '', combinedParas = [], isScan = false, anyTrimmed = false;

        if (canSpread) {
          const pdfPage2 = await documentPDF.getPage(pageNumber + 1);
          if (epoch !== renderEpoch) throw cancelled();
          const vp2 = pdfPage2.getViewport({ scale: 1 });
          const spineW = 18;
          const maxPerPageW = Math.max(200, Math.floor((availW - spineW) / 2));
          const fitScale = Math.min((availW - spineW) / (vp1.width + vp2.width), availH / Math.max(vp1.height, vp2.height));
          const w1 = Math.round(vp1.width * fitScale * zoom);
          const w2 = Math.round(vp2.width * fitScale * zoom);
          const r1 = await renderSinglePdfPage(pdfPage1, canvas, Math.min(maxPerPageW * zoom, w1), Math.round(availH * zoom), textLayer, { ...options, fitMode: 'spread' }, epoch, true);
          const r2 = await renderSinglePdfPage(pdfPage2, options.canvas2, Math.min(maxPerPageW * zoom, w2), Math.round(availH * zoom), null, { ...options, fitMode: 'spread' }, epoch, true);
          const matchH = Math.min(r1.cssHeight, r2.cssHeight);
          if (matchH > 120) {
            canvas.style.setProperty('height', matchH + 'px', 'important');
            canvas.style.setProperty('width', Math.round(matchH * (canvas.width / Math.max(1, canvas.height))) + 'px', 'important');
            options.canvas2.style.setProperty('height', matchH + 'px', 'important');
            options.canvas2.style.setProperty('width', Math.round(matchH * (options.canvas2.width / Math.max(1, options.canvas2.height))) + 'px', 'important');
          }
          secondRendered = true;
          combinedText = [r1.text, r2.text].filter(Boolean).join('\n\n');
          combinedParas = [...r1.paragraphs, ...r2.paragraphs];
          isScan = r1.isScan && r2.isScan;
          anyTrimmed = r1.trimmed || r2.trimmed;
        } else {
          let targetW, targetH;
          if (fitMode === 'width') {
            targetW = Math.max(260, Math.min(980, Math.round(availW * zoom)));
            targetH = Math.round(targetW * (vp1.height / Math.max(1, vp1.width)));
          } else {
            const fitScale = Math.min(availW / vp1.width, availH / vp1.height);
            targetW = Math.max(220, Math.round(vp1.width * fitScale * zoom));
            targetH = Math.max(260, Math.round(vp1.height * fitScale * zoom));
          }
          const r1 = await renderSinglePdfPage(pdfPage1, canvas, targetW, targetH, textLayer, { ...options, fitMode }, epoch, false);
          combinedText = r1.text;
          combinedParas = r1.paragraphs;
          isScan = r1.isScan;
          anyTrimmed = r1.trimmed;
        }

        if (canvas.parentElement) canvas.parentElement.style.width = '';
        if (canvas.closest('.pdf-page-stage')) canvas.closest('.pdf-page-stage').style.width = '';

        const nextP = pageNumber + (secondRendered ? 2 : 1);
        if (nextP <= documentPDF.numPages) documentPDF.getPage(nextP).catch(() => {});
        if (secondRendered && nextP + 1 <= documentPDF.numPages) documentPDF.getPage(nextP + 1).catch(() => {});

        return {
          page: pageNumber,
          pageEnd: secondRendered ? pageNumber + 1 : pageNumber,
          pageStep: secondRendered ? 2 : 1,
          pages: documentPDF.numPages,
          title: cache.name,
          text: combinedText,
          paragraphs: combinedParas,
          isScan,
          trimmed: anyTrimmed,
          spread: secondRendered,
          repaired: repairLevel > 0
        };
      } catch (error) {
        if (epoch !== renderEpoch || error.name === 'RenderingCancelledException' || error.name === 'AbortError') throw cancelled();
        if (isRepairablePdfError(error) && repairLevel < 2) {
          repairLevel++;
          releaseCache(pdfCache); pdfCache = null;
          continue;
        }
        releaseCache(pdfCache); pdfCache = null;
        if (error.name === 'PasswordException') throw new Error('PDF này có mật khẩu. Hãy tải bản đã mở khóa để đọc tại đây.');
        if (error.name === 'InvalidPDFException') throw new Error('PDF bị lỗi hoặc không được hỗ trợ. Hãy kiểm tra tệp gốc.');
        if (/worker|fetch|network/i.test(error.message || '')) throw new Error('Không tải được trình đọc PDF. Hãy kiểm tra Internet; tệp của bạn vẫn được lưu trên thiết bị.');
        throw error;
      }
    }
  }
  window.addEventListener('pagehide', () => { pause(); cancelPDF(); });
  window.BookMedia = Object.freeze({
    play, pause, chime, setVolume, savePDF, listPDFs, getPDF, deletePDF, renderPDF, renderRemotePDF, cancelPDF, exportPDF, parseEbookFile, cleanParagraphs,
    get playing() { return isPlaying; }, get mode() { return currentMode; },
    get volume() { return volume; }, maxPDFBytes: MAX_PDF_BYTES
  });
})();
