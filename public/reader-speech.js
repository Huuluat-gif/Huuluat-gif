/* Lowf expressive reading voices — 6 curated book-reading personas with
   novelty-voice filtering, sentence/paragraph breathing pauses, live paragraph
   highlighting and gentle background-music ducking. */
(() => {
  'use strict';
  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const panels = new Set();
  const instances = new WeakMap();

  const PERSONAS = [
    {
      id: 'ha-my',
      name: 'Hà My',
      badge: 'Nữ · Truyền cảm',
      style: 'Dịu dàng, ấm áp · hợp tản văn & chữa lành',
      gender: 'female',
      pitch: 1.04,
      rateMul: 0.95,
      pauseMul: 1.18,
      volume: 1,
      regions: ['vi-vn', 'en-us', 'en-gb'],
      hints: ['hoaimy', 'hoai my', 'linh', 'aria', 'samantha', 'ava', 'allison'],
      sampleVi: 'Giữa một ngày nhiều tiếng động, mời bạn chậm lại đôi chút cùng những trang sách ấm.',
      sampleEn: 'Take a quiet breath, turn the page, and let a gentle story unfold.'
    },
    {
      id: 'minh-khoi',
      name: 'Minh Khôi',
      badge: 'Nam · Trầm ấm',
      style: 'Điềm tĩnh, sâu sắc · hợp sách kinh tế & tư duy',
      gender: 'male',
      pitch: 0.87,
      rateMul: 0.97,
      pauseMul: 1.1,
      volume: 1,
      regions: ['vi-vn', 'en-us', 'en-gb'],
      hints: ['namminh', 'nam minh', 'christopher', 'guy', 'alex', 'daniel', 'an'],
      sampleVi: 'Mỗi thói quen nhỏ được lặp lại kiên nhẫn đều mở ra một hành trình vững vàng.',
      sampleEn: 'Clear thinking begins when we pause long enough to ask the right question.'
    },
    {
      id: 'thanh-truc',
      name: 'Thanh Trúc',
      badge: 'Nữ · Kể chuyện',
      style: 'Trong trẻo, giàu nhịp điệu · hợp truyện ngắn & tiểu thuyết',
      gender: 'female',
      pitch: 1.09,
      rateMul: 0.99,
      pauseMul: 1.12,
      volume: 1,
      regions: ['vi-vn', 'en-gb', 'en-us'],
      hints: ['jenny', 'sonia', 'karen', 'serena', 'ava', 'hoaimy', 'linh'],
      sampleVi: 'Ngoài khung cửa sổ, cơn mưa đầu mùa vừa chạm nhẹ lên những tán lá xanh.',
      sampleEn: 'Beyond the garden gate, a new adventure was waiting in the morning light.'
    },
    {
      id: 'hoang-quan',
      name: 'Hoàng Quân',
      badge: 'Nam · Cổ điển',
      style: 'Trầm lắng, giàu chiều sâu · hợp văn học kinh điển',
      gender: 'male',
      pitch: 0.82,
      rateMul: 0.92,
      pauseMul: 1.24,
      volume: 1,
      regions: ['vi-vn', 'en-gb', 'en-us'],
      hints: ['daniel', 'ryan', 'oliver', 'george', 'thomas', 'namminh', 'an'],
      sampleVi: 'Có những cuốn sách đi qua nhiều năm tháng mà từng lời vẫn nguyên vẹn sức nặng.',
      sampleEn: 'It is a truth universally acknowledged that a timeless book stays with us forever.'
    },
    {
      id: 'an-nhien',
      name: 'An Nhiên',
      badge: 'Nữ · Đọc đêm',
      style: 'Nhẹ khẽ, thư thái · hợp nghe sách trước giờ ngủ',
      gender: 'female',
      pitch: 0.96,
      rateMul: 0.88,
      pauseMul: 1.32,
      volume: 0.9,
      regions: ['vi-vn', 'en-au', 'en-us'],
      hints: ['hoaimy', 'linh', 'moira', 'karen', 'tessa', 'samantha'],
      sampleVi: 'Hãy thả lỏng đôi vai, lắng nghe nhịp thở và để tâm trí nghỉ ngơi bên trang viết.',
      sampleEn: 'Let the evening grow still, one soft sentence and one peaceful page at a time.'
    },
    {
      id: 'nam-phong',
      name: 'Nam Phong',
      badge: 'Nam · Rõ chữ',
      style: 'Mạch lạc, dứt khoát · hợp bài viết & nghiên cứu',
      gender: 'male',
      pitch: 0.94,
      rateMul: 1.03,
      pauseMul: 0.95,
      volume: 1,
      regions: ['vi-vn', 'en-us', 'en-gb'],
      hints: ['namminh', 'eric', 'roger', 'davis', 'alex', 'oliver', 'google uk english male'],
      sampleVi: 'Đọc chủ động là vừa nắm bắt ý chính, vừa đối chiếu với trải nghiệm của chính mình.',
      sampleEn: 'Active reading turns information into lasting insight and practical wisdom.'
    }
  ];

  // Filter out novelty, joke and robotic formant voices shipped on macOS/desktop OSes.
  const NOVELTY_VOICES = /\b(albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|organ|pipe organ|princess|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|espeak|eloquence|eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley)\b/i;

  let voices = [];
  let generation = 0;
  let current = null;
  let pauseTimer = null;
  let status = 'idle';
  let previewingId = '';
  let chunks = [];
  let index = 0;
  let settings = null;
  let activeElement = null;
  let message = supported
    ? 'Chọn một trong 6 giọng đọc truyền cảm rồi bấm Nghe chương này.'
    : 'Trình duyệt này chưa hỗ trợ đọc thành tiếng. Hãy mở bằng Chrome, Edge hoặc Safari.';

  let prefs = { persona: 'ha-my', rate: 1, voiceURI: '', duckAmbient: true };
  try {
    const saved = JSON.parse(localStorage.getItem('lowf.reader.speech') || '{}');
    if (PERSONAS.some(p => p.id === saved.persona)) prefs.persona = saved.persona;
    else if (saved.gender === 'male') prefs.persona = 'minh-khoi';
    if (Number.isFinite(saved.rate)) prefs.rate = Math.max(0.75, Math.min(1.45, Number(saved.rate)));
    if (typeof saved.voiceURI === 'string') prefs.voiceURI = saved.voiceURI;
    if (typeof saved.duckAmbient === 'boolean') prefs.duckAmbient = saved.duckAmbient;
  } catch {}

  const persist = () => {
    try { localStorage.setItem('lowf.reader.speech', JSON.stringify(prefs)); } catch {}
  };

  const lang = value =>
    typeof value === 'string' && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value) ? value : 'vi-VN';
  const base = value => lang(value).toLowerCase().split('-')[0];
  const plain = value => String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  const personaById = id => PERSONAS.find(p => p.id === id) || PERSONAS[0];

  function normalizedName(voice) {
    return String(voice?.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function isCleanVoice(voice) {
    if (!voice || typeof voice.name !== 'string' || typeof voice.lang !== 'string') return false;
    return !NOVELTY_VOICES.test(normalizedName(voice));
  }

  function genderOf(voice) {
    const name = normalizedName(voice);
    if (/\bfemale\b|\bnu\b/.test(name)) return 'female';
    if (/\bmale\b|\bnam\b/.test(name)) return 'male';
    if (/\b(hoai\s?my|linh|samantha|ava|allison|susan|zira|hazel|aria|jenny|sonia|libby|michelle|ana|karen|moira|victoria|tessa|fiona|serena|veena|martha|nicky|mai|lan|thao)\b/.test(name)) {
      return 'female';
    }
    if (/\b(nam\s?minh|david|mark|george|guy|christopher|ryan|eric|davis|tony|roger|alex|daniel|thomas|oliver|rishi|aaron|arthur|gordon|minh|quang|hung)\b/.test(name)) {
      return 'male';
    }
    if (/^an(?: \(.*\))?$/.test(name)) return 'male';
    return 'unknown';
  }

  function qualityScore(voice, persona, targetLang) {
    const name = normalizedName(voice);
    const vLang = String(voice.lang || '').toLowerCase().replace('_', '-');
    const targetBase = base(targetLang);
    let score = 0;
    if (base(vLang) === targetBase) score += 100;
    else return -1;

    if (/\b(natural|neural)\b/.test(name)) score += 65;
    else if (/\b(premium|enhanced|siri)\b/.test(name)) score += 48;
    else if (/\b(online|google)\b/.test(name)) score += 32;
    else if (voice.localService) score += 18;

    const vGender = genderOf(voice);
    if (persona) {
      if (vGender === persona.gender) score += 42;
      else if (vGender === 'unknown') score += 8;
      else score -= 18;

      const hintIdx = persona.hints.findIndex(h => name.includes(h));
      if (hintIdx >= 0) score += 38 - hintIdx * 3;

      const regIdx = persona.regions.indexOf(vLang);
      if (regIdx >= 0) score += 20 - regIdx * 4;
    } else if (vLang === lang(targetLang).toLowerCase()) {
      score += 16;
    }
    if (voice.default) score += 6;
    return score;
  }

  function cleanLanguageVoices(language) {
    const clean = voices.filter(isCleanVoice);
    const matching = clean.filter(v => base(v.lang) === base(language));
    return matching.sort((a, b) => qualityScore(b, null, language) - qualityScore(a, null, language) || a.name.localeCompare(b.name));
  }

  function chooseVoice(language, persona) {
    const clean = voices.filter(isCleanVoice);
    if (prefs.voiceURI) {
      const manual = clean.find(v => v.voiceURI === prefs.voiceURI && base(v.lang) === base(language));
      if (manual) return manual;
    }
    const ranked = clean
      .map(v => ({ voice: v, score: qualityScore(v, persona, language) }))
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.voice.name.localeCompare(b.voice.name));

    if (ranked.length) {
      // Spread distinct personas across distinct top voices when multiple same-gender voices exist.
      const sameGender = ranked.filter(r => genderOf(r.voice) === persona.gender);
      if (sameGender.length > 1) {
        const personaGroup = PERSONAS.filter(p => p.gender === persona.gender);
        const slot = Math.max(0, personaGroup.findIndex(p => p.id === persona.id));
        const candidate = sameGender[Math.min(slot, sameGender.length - 1)];
        if (candidate && ranked[0].score - candidate.score <= 28) return candidate.voice;
      }
      return ranked[0].voice;
    }
    return clean.find(v => v.default) || clean[0] || voices[0] || null;
  }

  function clearHighlight() {
    if (activeElement) {
      activeElement.classList.remove('reader-speaking-active');
      activeElement = null;
    }
    document.querySelectorAll('#readerBody .reader-speaking-active').forEach(el => el.classList.remove('reader-speaking-active'));
  }

  function highlightChunk(chunk) {
    if (!chunk || !chunk.element || !chunk.element.isConnected) {
      clearHighlight();
      return;
    }
    if (activeElement === chunk.element) return;
    clearHighlight();
    activeElement = chunk.element;
    activeElement.classList.add('reader-speaking-active');
    try {
      const scrollHost = document.getElementById('readerScroll');
      if (scrollHost) {
        const hostRect = scrollHost.getBoundingClientRect();
        const elRect = activeElement.getBoundingClientRect();
        if (elRect.top < hostRect.top + 48 || elRect.bottom > hostRect.bottom - 64) {
          activeElement.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'center'
          });
        }
      }
    } catch {}
  }

  function segmentSentences(text, language) {
    const normalized = plain(text).replace(/\r\n?/g, '\n');
    if (!normalized) return [];
    let raw;
    try {
      raw = [...new Intl.Segmenter(lang(language), { granularity: 'sentence' }).segment(normalized)].map(s => s.segment);
    } catch {
      raw = normalized.match(/[^.!?。！？\n]+[.!?。！？…]*/gu) || [normalized];
    }
    const output = [];
    for (const sentence of raw) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      if (trimmed.length <= 190) {
        output.push(trimmed);
        continue;
      }
      // Split long literary sentences gently on clauses (, ; : —) before hard word wrap.
      const clauses = trimmed.split(/(?<=[,;:\u2014\u2013])\s+/u);
      let line = '';
      for (const clause of clauses) {
        for (const word of clause.split(/\s+/u)) {
          if (!word) continue;
          if (line && line.length + word.length + 1 > 185) {
            output.push(line);
            line = '';
          }
          line += (line ? ' ' : '') + word;
        }
      }
      if (line) output.push(line);
    }
    return output;
  }

  function buildChunks(context) {
    const readerBody = document.getElementById('readerBody');
    const readerOpen = document.getElementById('reader')?.open;
    const result = [];

    if (readerOpen && readerBody && !readerBody.hidden && context.type === 'chapters') {
      const blocks = [...readerBody.querySelectorAll('h2, p')];
      for (const el of blocks) {
        const text = plain(el.textContent);
        if (!text) continue;
        const isHeading = el.tagName === 'H2';
        const parts = segmentSentences(text, context.language);
        parts.forEach((part, idx) => {
          result.push({
            text: part,
            element: el,
            isHeading,
            isParagraphEnd: idx === parts.length - 1
          });
        });
      }
      if (result.length) return result;
    }

    const paragraphs = plain(context.text).split(/\n{2,}/u);
    paragraphs.forEach((para, pIdx) => {
      const parts = segmentSentences(para, context.language);
      parts.forEach((part, idx) => {
        result.push({
          text: part,
          element: null,
          isHeading: pIdx === 0 && parts.length === 1 && part.length < 100,
          isParagraphEnd: idx === parts.length - 1
        });
      });
    });
    return result;
  }

  function naturalPauseMs(chunk, persona) {
    if (!chunk) return 0;
    const t = chunk.text.trim();
    let ms = 180;
    if (chunk.isHeading) ms = 520;
    else if (chunk.isParagraphEnd) ms = 390;
    else if (/[…]$|\.\.\.$/.test(t)) ms = 310;
    else if (/[?!？！]$/.test(t)) ms = 270;
    else if (/[;:]$/u.test(t)) ms = 150;
    return Math.round(ms * (persona?.pauseMul || 1));
  }

  function contextFor(panel) {
    let context = {};
    try { context = panel.getContext() || {}; } catch {}
    const rawLang = plain(context.language) || 'vi';
    const fullLang = rawLang === 'en' ? 'en-US' : rawLang === 'vi' ? 'vi-VN' : lang(rawLang);
    return {
      text: plain(context.text),
      language: fullLang,
      type: context.type || '',
      title: plain(context.title)
    };
  }

  function announce() {
    for (const panel of panels) {
      const activePersona = personaById(prefs.persona);
      panel.play.textContent =
        status === 'paused' ? 'Tiếp tục nghe' : status === 'playing' && !previewingId ? 'Tạm dừng' : `Nghe giọng ${activePersona.name}`;
      panel.play.setAttribute('aria-label', panel.play.textContent);
      panel.stop.disabled = !supported || status === 'idle';
      panel.status.textContent = message;
      panel.progress.textContent =
        chunks.length && status !== 'idle' && !previewingId ? `Câu ${Math.min(index + 1, chunks.length)} / ${chunks.length}` : '';

      panel.container.querySelectorAll('[data-speech-persona]').forEach(card => {
        const selected = card.dataset.speechPersona === prefs.persona;
        card.classList.toggle('active', selected);
        card.setAttribute('aria-pressed', String(selected));
      });
      panel.container.querySelectorAll('[data-speech-preview]').forEach(btn => {
        const isThis = previewingId === btn.dataset.speechPreview && status === 'playing';
        btn.textContent = isThis ? 'Đang thử…' : 'Nghe thử';
        btn.classList.toggle('is-playing', isThis);
      });
    }
    window.dispatchEvent(
      new CustomEvent('lowf:speech-state', {
        detail: { status, index, total: chunks.length, duckAmbient: prefs.duckAmbient }
      })
    );
  }

  function stop({ quiet = false } = {}) {
    generation++;
    clearTimeout(pauseTimer);
    pauseTimer = null;
    current = null;
    chunks = [];
    index = 0;
    settings = null;
    previewingId = '';
    status = 'idle';
    clearHighlight();
    if (supported) {
      try { synth.cancel(); } catch {}
    }
    if (!quiet) message = supported ? 'Đã dừng giọng đọc.' : 'Trình duyệt này chưa hỗ trợ đọc thành tiếng.';
    announce();
  }

  function finish(token) {
    if (token !== generation) return;
    clearTimeout(pauseTimer);
    current = null;
    previewingId = '';
    status = 'idle';
    clearHighlight();
    message = settings?.isSample ? 'Đã phát xong câu nghe thử. Bấm Nghe chương này để đọc toàn trang.' : 'Đã đọc trọn vẹn nội dung chương này.';
    chunks = [];
    index = 0;
    settings = null;
    announce();
  }

  function speakNext(token) {
    if (token !== generation || status !== 'playing') return;
    if (index >= chunks.length) {
      finish(token);
      return;
    }
    const chunk = chunks[index];
    const persona = settings.persona;
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = settings.language;

    // Subtle expressive contour for headings, questions and contemplative endings.
    let rate = settings.rate * (persona?.rateMul || 1);
    let pitch = persona?.pitch || 1;
    if (chunk.isHeading) {
      rate *= 0.93;
      pitch = Math.max(0.75, pitch - 0.02);
    } else if (/\?$/.test(chunk.text)) {
      pitch = Math.min(1.25, pitch + 0.03);
    } else if (/[…]$|\.\.\.$/.test(chunk.text)) {
      rate *= 0.95;
    }
    utterance.rate = Math.max(0.65, Math.min(1.6, Number(rate.toFixed(2))));
    utterance.pitch = Math.max(0.7, Math.min(1.3, Number(pitch.toFixed(2))));
    utterance.volume = persona?.volume ?? 1;
    if (settings.voice) utterance.voice = settings.voice;

    current = utterance;
    if (!settings.isSample) highlightChunk(chunk);

    utterance.onend = () => {
      if (token !== generation || current !== utterance) return;
      current = null;
      const delay = settings.isSample ? 0 : naturalPauseMs(chunk, persona);
      index++;
      announce();
      if (status === 'playing') {
        if (delay > 0 && index < chunks.length) {
          pauseTimer = setTimeout(() => speakNext(token), delay);
        } else {
          speakNext(token);
        }
      }
    };

    utterance.onerror = event => {
      if (token !== generation || current !== utterance) return;
      const code = event.error;
      if (code === 'interrupted' || code === 'canceled') return;
      stop({ quiet: true });
      message =
        code === 'not-allowed'
          ? 'Trình duyệt cần thao tác chạm trực tiếp để phát âm thanh. Hãy bấm Nghe một lần nữa.'
          : code === 'language-unavailable' || code === 'voice-unavailable'
            ? 'Thiết bị chưa cài gói giọng cho ngôn ngữ này. Bạn có thể đổi giọng trong mục Nâng cao.'
            : code === 'network'
              ? 'Giọng đọc trực tuyến cần kết nối mạng ổn định. Hãy kiểm tra mạng hoặc thử lại.'
              : 'Chưa phát được giọng đọc trên thiết bị này. Hãy thử một giọng khác bên trên.';
      announce();
    };

    try {
      synth.speak(utterance);
    } catch {
      stop({ quiet: true });
      message = 'Không mở được bộ đọc của trình duyệt. Hãy thử tải lại trang.';
      announce();
    }
  }

  function startChunks(nextChunks, language, persona, { isSample = false } = {}) {
    if (!supported) {
      announce();
      return false;
    }
    if (!nextChunks.length) {
      message = 'Chưa có văn bản để đọc. Với PDF dạng ảnh quét, hãy chọn sách chữ hoặc PDF có lớp văn bản.';
      announce();
      return false;
    }
    stop({ quiet: true });
    const voice = chooseVoice(language, persona);
    chunks = nextChunks;
    index = 0;
    previewingId = isSample ? persona.id : '';
    settings = {
      language: voice?.lang || lang(language),
      voice,
      persona,
      rate: prefs.rate,
      isSample
    };
    status = 'playing';
    const voiceNote = voice ? ` (${voice.name.replace(/\s*Online \(Natural\).*/i, ' Neural')})` : '';
    message = isSample
      ? `Đang nghe thử giọng ${persona.name}${voiceNote}…`
      : `Đang đọc truyền cảm cùng ${persona.name}${voiceNote}.`;
    announce();
    speakNext(generation);
    return true;
  }

  function previewPersona(personaId, panel) {
    const persona = personaById(personaId);
    prefs.persona = persona.id;
    persist();
    if (previewingId === persona.id && status === 'playing') {
      stop();
      return;
    }
    const context = contextFor(panel);
    const isEn = base(context.language) === 'en';
    const sampleText = isEn ? persona.sampleEn : persona.sampleVi;
    startChunks([{ text: sampleText, element: null, isHeading: false, isParagraphEnd: true }], isEn ? 'en-US' : 'vi-VN', persona, { isSample: true });
  }

  function toggle(panel) {
    if (status === 'playing' && !previewingId) {
      status = 'paused';
      clearTimeout(pauseTimer);
      try { synth.pause(); } catch {}
      message = 'Đã tạm dừng. Bấm Tiếp tục nghe để đọc nối tiếp câu đang dở.';
      announce();
      return;
    }
    if (status === 'paused') {
      status = 'playing';
      message = `Đang tiếp tục đọc cùng ${personaById(prefs.persona).name}.`;
      try { synth.resume(); } catch {}
      announce();
      if (!current) speakNext(generation);
      return;
    }
    const context = contextFor(panel);
    const built = buildChunks(context);
    startChunks(built, context.language, personaById(prefs.persona), { isSample: false });
  }

  function availability(language) {
    if (!supported) return message;
    const local = cleanLanguageVoices(language);
    const langLabel = base(language) === 'en' ? 'tiếng Anh' : base(language) === 'vi' ? 'tiếng Việt' : language;
    if (!voices.length) return 'Trình duyệt đang tải giọng đọc tự nhiên trên thiết bị…';
    if (!local.length) return `Thiết bị chưa có sẵn giọng ${langLabel}; hệ thống sẽ dùng giọng gần nhất. Bạn có thể mở bằng Edge hoặc Safari để có giọng Neural tự nhiên.`;
    const hasNeural = local.some(v => /\b(natural|neural|premium|enhanced|siri|online)\b/i.test(v.name));
    return hasNeural
      ? `Đã kết nối giọng đọc tự nhiên (${langLabel}) · ngắt nghỉ theo câu & tô sáng đoạn đang đọc.`
      : `Đã lọc giọng đọc rõ ràng cho ${langLabel} · tự động ngắt nhịp truyền cảm theo dấu câu.`;
  }

  function updateVoices() {
    if (!supported) return;
    try {
      voices = synth
        .getVoices()
        .filter(v => v && typeof v.name === 'string' && typeof v.lang === 'string')
        .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
    } catch {
      voices = [];
    }
    for (const panel of panels) renderVoices(panel);
  }

  function renderVoices(panel) {
    const context = contextFor(panel);
    const select = panel.voices;
    const matching = cleanLanguageVoices(context.language);
    select.replaceChildren();
    const auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Tự động phối hợp theo giọng đọc đã chọn (Khuyên dùng)';
    select.append(auto);
    for (const voice of matching) {
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} · ${voice.lang}`;
      select.append(option);
    }
    if (prefs.voiceURI && !matching.some(v => v.voiceURI === prefs.voiceURI)) {
      prefs.voiceURI = '';
    }
    select.value = prefs.voiceURI;
    select.disabled = !supported || matching.length === 0;
    panel.help.textContent = availability(context.language);
  }

  function mount(container, getContext) {
    if (!container || typeof getContext !== 'function') {
      throw new TypeError('Speech panel needs a container and context getter.');
    }
    for (const previous of [...panels]) {
      if (!previous.container.isConnected) previous.controls.destroy();
    }
    const existing = instances.get(container);
    if (existing) {
      existing.getContext = getContext;
      existing.controls.refresh();
      return existing.controls;
    }

    const cardsHTML = PERSONAS.map(
      p => `<div class="speech-persona-row">
        <button type="button" class="speech-persona ${p.id === prefs.persona ? 'active' : ''}" data-speech-persona="${p.id}" aria-pressed="${p.id === prefs.persona}">
          <span class="speech-persona-top"><strong>${p.name}</strong><em>${p.badge}</em></span>
          <small>${p.style}</small>
        </button>
        <button type="button" class="speech-preview-btn" data-speech-preview="${p.id}" aria-label="Nghe thử giọng ${p.name}">Nghe thử</button>
      </div>`
    ).join('');

    container.innerHTML = `<div class="speech-panel">
      <div class="speech-personas" role="group" aria-label="6 giọng đọc sách tuyển chọn">${cardsHTML}</div>
      <div class="speech-controls">
        <label class="speech-field">
          <span>Nhịp đọc <output data-speech="rate-label">${prefs.rate}×</output></span>
          <input data-speech="rate" type="range" min="0.75" max="1.45" step="0.05" value="${prefs.rate}" aria-label="Tốc độ đọc thành tiếng">
        </label>
        <label class="speech-duck-toggle">
          <input type="checkbox" data-speech="duck" ${prefs.duckAmbient ? 'checked' : ''}>
          <span>Giữ nhạc nền / tiếng mưa dịu nhỏ (18%) khi nghe sách</span>
        </label>
      </div>
      <div class="speech-actions">
        <button type="button" class="reader-primary" data-speech="play">Nghe giọng ${personaById(prefs.persona).name}</button>
        <button type="button" data-speech="stop">Dừng</button>
        <span class="speech-progress" data-speech="progress"></span>
      </div>
      <p class="speech-status" data-speech="status" role="status" aria-live="polite"></p>
      <p class="speech-help" data-speech="help"></p>
      <details class="speech-advanced">
        <summary>Tùy chọn giọng hệ thống trên máy</summary>
        <label class="speech-field" style="margin-top:10px">
          <span>Giọng gốc của trình duyệt (đã lọc giọng máy)</span>
          <select data-speech="voice"></select>
        </label>
      </details>
    </div>`;

    const q = name => container.querySelector(`[data-speech="${name}"]`);
    const panel = {
      container,
      getContext,
      voices: q('voice'),
      rate: q('rate'),
      rateLabel: q('rate-label'),
      duck: q('duck'),
      play: q('play'),
      stop: q('stop'),
      status: q('status'),
      progress: q('progress'),
      help: q('help')
    };

    panel.play.disabled = !supported;
    panel.rate.disabled = !supported;

    const onClick = event => {
      const personaBtn = event.target.closest('[data-speech-persona]');
      if (personaBtn) {
        prefs.persona = personaBtn.dataset.speechPersona;
        prefs.voiceURI = '';
        persist();
        renderVoices(panel);
        if (status === 'playing' && !previewingId) {
          const currentIndex = index;
          const context = contextFor(panel);
          const built = buildChunks(context);
          if (built.length) {
            stop({ quiet: true });
            const persona = personaById(prefs.persona);
            const voice = chooseVoice(context.language, persona);
            chunks = built;
            index = Math.min(currentIndex, built.length - 1);
            settings = { language: voice?.lang || context.language, voice, persona, rate: prefs.rate, isSample: false };
            status = 'playing';
            message = `Đã chuyển sang giọng ${persona.name}.`;
            announce();
            speakNext(generation);
            return;
          }
        }
        announce();
        return;
      }
      const previewBtn = event.target.closest('[data-speech-preview]');
      if (previewBtn) {
        previewPersona(previewBtn.dataset.speechPreview, panel);
      }
    };
    const onVoice = () => {
      prefs.voiceURI = panel.voices.value;
      persist();
      renderVoices(panel);
    };
    const onRate = () => {
      prefs.rate = Number(panel.rate.value);
      if (settings) settings.rate = prefs.rate;
      panel.rateLabel.textContent = prefs.rate + '×';
      persist();
    };
    const onDuck = () => {
      prefs.duckAmbient = panel.duck.checked;
      persist();
      announce();
    };
    const onPlay = () => toggle(panel);
    const onStop = () => stop();

    container.addEventListener('click', onClick);
    panel.voices.addEventListener('change', onVoice);
    panel.rate.addEventListener('input', onRate);
    panel.duck.addEventListener('change', onDuck);
    panel.play.addEventListener('click', onPlay);
    panel.stop.addEventListener('click', onStop);

    panel.controls = {
      refresh() {
        renderVoices(panel);
        announce();
      },
      destroy() {
        panels.delete(panel);
        instances.delete(container);
        container.removeEventListener('click', onClick);
        panel.voices.removeEventListener('change', onVoice);
        panel.rate.removeEventListener('input', onRate);
        panel.duck.removeEventListener('change', onDuck);
        panel.play.removeEventListener('click', onPlay);
        panel.stop.removeEventListener('click', onStop);
        if (!panels.size) stop({ quiet: true });
      }
    };

    panels.add(panel);
    instances.set(container, panel);
    updateVoices();
    renderVoices(panel);
    announce();
    return panel.controls;
  }

  if (supported) {
    synth.addEventListener?.('voiceschanged', updateVoices);
    updateVoices();
  }

  window.LowfSpeech = {
    mount,
    stop: () => stop(),
    speakWord(text, language = 'en') {
      const targetLang = language === 'en' ? 'en-US' : language === 'vi' ? 'vi-VN' : lang(language);
      const persona = personaById(prefs.persona);
      return startChunks(
        [{ text: plain(text).slice(0, 500), element: null, isHeading: false, isParagraphEnd: true }],
        targetLang,
        persona,
        { isSample: true }
      );
    }
  };
  window.addEventListener('pagehide', () => stop({ quiet: true }));
})();
