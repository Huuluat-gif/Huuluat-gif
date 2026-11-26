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
  function metadata(record) { return { id: record.id, name: record.name, size: record.size, added: record.added }; }
  async function savePDF(file) {
    if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Vui lòng chọn một tệp PDF.');
    if (!file.size || file.size > MAX_PDF_BYTES) throw new Error('Chọn tệp PDF có dung lượng từ 1 byte đến 30 MB.');
    if (file.type && file.type !== 'application/pdf' && file.type !== 'application/octet-stream') throw new Error('Tệp này không phải PDF. Hãy chọn tệp có đuôi .pdf.');
    const header = new TextDecoder('latin1').decode(await file.slice(0, 1024).arrayBuffer());
    if (!header.includes('%PDF-')) throw new Error('Tệp không có định dạng PDF hợp lệ.');
    const record = {
      id: 'pdf-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
      name: String(file.name || 'Sách của tôi.pdf').slice(0, 240),
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
  const remoteSources = new Map();
  function renderRemotePDF(id, title, canvas, page = 1, textLayer = null) {
    const key='remote:'+id;
    remoteSources.set(key,{name:title,url:'/api/assets/'+encodeURIComponent(id)});
    return renderPDF(key,canvas,page,textLayer);
  }
  async function renderPDF(id, canvas, page = 1, textLayer = null) {
    if (!canvas || typeof canvas.getContext !== 'function') throw new Error('Không tìm thấy vùng hiển thị PDF.');
    const epoch = ++renderEpoch;
    if (renderTask) {
      const oldTask = renderTask; renderTask = null;
      try { oldTask.cancel(); await oldTask.promise; } catch (_) {}
    }
    if (epoch !== renderEpoch) throw cancelled();
    try {
      if (!pdfCache || pdfCache.id !== id) {
        releaseCache(pdfCache);
        const cache = { id, task: null, promise: null, name: '' }; pdfCache = cache;
        cache.promise = (async () => {
          const [library, record] = await Promise.all([loadPDFJS(), remoteSources.has(id)?Promise.resolve(remoteSources.get(id)):getPDF(id)]);
          if (pdfCache !== cache) throw cancelled();
          cache.name = record.name;
          const buffer = record.url ? null : await record.blob.arrayBuffer();
          if (pdfCache !== cache) throw cancelled();
          cache.task = library.getDocument({
            ...(record.url ? {url:record.url,withCredentials:false} : {data:new Uint8Array(buffer)}), isEvalSupported: false,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
            cMapPacked: true, disableAutoFetch: true, disableStream: true
          });
          return cache.task.promise;
        })();
      }
      const cache = pdfCache;
      const documentPDF = await cache.promise;
      if (epoch !== renderEpoch) throw cancelled();
      const pageNumber = Math.min(documentPDF.numPages, Math.max(1, Math.floor(Number(page) || 1)));
      const pdfPage = await documentPDF.getPage(pageNumber);
      if (epoch !== renderEpoch) throw cancelled();
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
      const cssWidth = Math.max(200, Math.min(900, parentWidth || window.innerWidth - 32));
      const pixelWidth = Math.min(1400, Math.round(cssWidth * Math.min(window.devicePixelRatio || 1, 1.5)));
      const viewport = pdfPage.getViewport({ scale: Math.min(pixelWidth / baseViewport.width, 1400 / baseViewport.height) });
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      canvas.style.width = '100%'; canvas.style.maxWidth = cssWidth + 'px'; canvas.style.height = 'auto';
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Trình duyệt không thể vẽ trang PDF.');
      const task = documentPDF.numPages && pdfPage.render({ canvasContext: context, viewport, background: 'rgb(255,255,255)' });
      renderTask = task;
      await task.promise;
      if (renderTask === task) renderTask = null;
      if (epoch !== renderEpoch) throw cancelled();
      let text = '';
      if (textLayer) {
        try {
          const content = await pdfPage.getTextContent();
          if (epoch !== renderEpoch) throw cancelled();
          text = content.items.map(item => item.str || '').join(' ');
          // Render off-DOM so a late previous page can never replace the active page.
          const detached = document.createElement('div');
          const cssViewport = pdfPage.getViewport({scale: cssWidth / baseViewport.width});
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
          canvas.parentElement.style.width = cssWidth + 'px';
        } catch (error) {
          if (epoch !== renderEpoch || error.name === 'AbortError') throw cancelled();
          textLayer.replaceChildren();
          // Scanned or unsupported text layers still retain the rendered PDF and pen tools.
        }
      }
      return { page: pageNumber, pages: documentPDF.numPages, title: cache.name, text };
    } catch (error) {
      if (epoch !== renderEpoch || error.name === 'RenderingCancelledException' || error.name === 'AbortError') throw cancelled();
      releaseCache(pdfCache); pdfCache = null;
      if (error.name === 'PasswordException') throw new Error('PDF này có mật khẩu. Hãy tải bản đã mở khóa để đọc tại đây.');
      if (error.name === 'InvalidPDFException') throw new Error('PDF bị lỗi hoặc không được hỗ trợ. Hãy kiểm tra tệp gốc.');
      if (/worker|fetch|network/i.test(error.message || '')) throw new Error('Không tải được trình đọc PDF. Hãy kiểm tra Internet; tệp của bạn vẫn được lưu trên thiết bị.');
      throw error;
    }
  }
  window.addEventListener('pagehide', () => { pause(); cancelPDF(); });
  window.BookMedia = Object.freeze({
    play, pause, chime, setVolume, savePDF, listPDFs, deletePDF, renderPDF, renderRemotePDF, cancelPDF, exportPDF,
    get playing() { return isPlaying; }, get mode() { return currentMode; },
    get volume() { return volume; }, maxPDFBytes: MAX_PDF_BYTES
  });
})();
