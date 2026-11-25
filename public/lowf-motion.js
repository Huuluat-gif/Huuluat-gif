/* ==========================================================================
   LOWF v4.5 — 120FPS SPRING-PHYSICS EXHIBITION ENGINE
   - Damped rAF Spring Parallax on 7-Book 3D Hero Stage (auto-sleeps at rest)
   - Custom 120fps Quintic-Ease Carousel Glide + Desktop Grab-to-Drag
   - Staggered Domino Cascade Reveal via IntersectionObserver (zero scroll jank)
   - Zero-reflow IntersectionObserver Sticky Dot Navigation Rail
   ========================================================================== */
(() => {
  'use strict';

  const PLUS_KEY = 'lowf.plusPreview';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isTouch = window.matchMedia('(hover: none)').matches;
  let cachedBootstrap = null;
  let bootstrapLoading = false;

  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Custom 120fps Quintic Ease-Out Scroll Helper */
  const scrollAnimations = new WeakMap();
  function smoothScrollAxis(targetEl, prop, deltaOrTarget, { absolute = false, duration = 560 } = {}) {
    if (prefersReduced.matches) {
      if (targetEl === window) window.scrollTo(0, absolute ? deltaOrTarget : window.scrollY + deltaOrTarget);
      else targetEl[prop] = absolute ? deltaOrTarget : targetEl[prop] + deltaOrTarget;
      return;
    }
    const prevId = scrollAnimations.get(targetEl);
    if (prevId) cancelAnimationFrame(prevId);

    const start = targetEl === window ? window.scrollY : targetEl[prop];
    const end = absolute ? deltaOrTarget : start + deltaOrTarget;
    const dist = end - start;
    if (Math.abs(dist) < 1) return;

    const t0 = performance.now();
    function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 5); // quintic ease-out
      const val = start + dist * ease;
      if (targetEl === window) window.scrollTo(0, val);
      else targetEl[prop] = val;
      if (p < 1) {
        scrollAnimations.set(targetEl, requestAnimationFrame(step));
      } else {
        scrollAnimations.delete(targetEl);
      }
    }
    scrollAnimations.set(targetEl, requestAnimationFrame(step));
  }

  function smoothScrollToElement(el) {
    if (!el) return;
    const headerOffset = 72;
    const targetY = Math.max(0, window.scrollY + el.getBoundingClientRect().top - headerOffset);
    smoothScrollAxis(window, 'scrollY', targetY, { absolute: true, duration: 640 });
  }

  function isPlusOn() {
    try { return localStorage.getItem(PLUS_KEY) === '1'; } catch { return false; }
  }

  function applyPlusMode(enabled) {
    document.documentElement.dataset.plus = enabled ? 'on' : 'off';
    const topBtn = document.getElementById('topPlusBtn');
    if (topBtn) {
      topBtn.setAttribute('aria-pressed', String(enabled));
      topBtn.innerHTML = `<span>${enabled ? 'PLUS: BẬT ✨' : 'PLUS ✨'}</span>`;
    }
    const planBtn = document.getElementById('plusPlanPreviewBtn');
    if (planBtn) {
      planBtn.textContent = enabled ? 'Đang bật chế độ Plus ✨ (Tắt xem thử)' : 'Bật thử chế độ Lowf Plus ✨';
    }
    const heroKicker = document.querySelector('.exh-hero-kicker');
    if (heroKicker) {
      heroKicker.textContent = enabled
        ? 'ẤN BẢN ĐẶC BIỆT · LOWF PLUS COLLECTOR'
        : 'TỦ SÁCH ĐIỆN TỬ & KHÔNG GIAN ĐỌC';
    }
  }

  function togglePlusMode() {
    const next = !isPlusOn();
    try { localStorage.setItem(PLUS_KEY, next ? '1' : '0'); } catch {}
    applyPlusMode(next);
  }

  function ensureBootstrapData() {
    if (cachedBootstrap || bootstrapLoading) return;
    bootstrapLoading = true;
    fetch('/api/bootstrap', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          cachedBootstrap = data;
          enhanceCurrentView();
        }
      })
      .catch(() => {})
      .finally(() => { bootstrapLoading = false; });
  }

  function coverOf(b) {
    if (!b) return '';
    if (b.coverAssetId) return '/api/assets/' + encodeURIComponent(b.coverAssetId);
    return typeof b.cover === 'string' ? b.cover : '';
  }

  /* 1. Slide-out Drawer Controls */
  function setupDrawer() {
    const toggle = document.getElementById('drawerToggle');
    const backdrop = document.getElementById('drawerBackdrop');
    if (!toggle || toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    const close = () => {
      document.documentElement.classList.remove('drawer-open');
      if (backdrop) backdrop.hidden = true;
    };
    const open = () => {
      document.documentElement.classList.add('drawer-open');
      if (backdrop) backdrop.hidden = false;
    };

    toggle.addEventListener('click', () => {
      if (document.documentElement.classList.contains('drawer-open')) close();
      else open();
    });
    backdrop?.addEventListener('click', close);
    document.querySelector('.sidebar')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  /* 2. Sync Active Top Exhibition Nav Link */
  function currentView() {
    const activeSidebar = document.querySelector('.sidebar .nav-item.active[data-view]');
    if (activeSidebar?.dataset.view) return activeSidebar.dataset.view;
    return new URLSearchParams(location.search).get('view') || 'dashboard';
  }
  function syncTopNav() {
    const view = currentView();
    document.querySelectorAll('.exh-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    const dotRail = document.getElementById('lowfDotRail');
    if (dotRail) dotRail.hidden = view !== 'dashboard';
  }

  /* 3. Damped Spring 120fps Parallax on the 7-Book 3D Hero Stage */
  function attachHeroSpringParallax(hero, fan, watermark) {
    if (isTouch || prefersReduced.matches) return;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let rafId = 0;

    function tick() {
      curX += (targetX - curX) * 0.085;
      curY += (targetY - curY) * 0.085;

      const ry = (curX * 6.5).toFixed(3);
      const rx = (-curY * 3.2).toFixed(3);
      fan.style.transform = `rotateY(${ry}deg) rotateX(${rx}deg) translate3d(${(curX * -8).toFixed(2)}px, ${(curY * -4).toFixed(2)}px, 0)`;

      if (watermark) {
        watermark.style.transform = `translate3d(${(curX * 14).toFixed(2)}px, ${(curY * 10).toFixed(2)}px, 0)`;
      }

      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    }

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      targetX = (e.clientX - r.left) / r.width - 0.5;
      targetY = (e.clientY - r.top) / r.height - 0.5;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) rafId = requestAnimationFrame(tick);
    }, { passive: true });
  }

  function enhanceDashboardHero() {
    const hero = document.querySelector('#main .hero');
    if (!hero || hero.dataset.exhEnhanced === '1') return;
    const books = cachedBootstrap?.books || [];
    if (!books.length) return;

    hero.dataset.exhEnhanced = '1';
    hero.classList.add('has-3d-fan');
    hero.id = 'exh-sec-hero';

    let wm = null;
    const customImg = hero.querySelector('.hero-custom');
    const heroSrc = customImg?.getAttribute('src') || '';
    if (heroSrc) {
      wm = document.createElement('img');
      wm.className = 'hero-bg-watermark';
      wm.src = heroSrc;
      wm.alt = '';
      hero.prepend(wm);
    }

    const h2 = hero.querySelector('h2');
    if (h2 && !hero.querySelector('.exh-hero-kicker')) {
      const kicker = document.createElement('span');
      kicker.className = 'exh-hero-kicker';
      kicker.textContent = isPlusOn()
        ? 'ẤN BẢN ĐẶC BIỆT · LOWF PLUS COLLECTOR'
        : 'TỦ SÁCH ĐIỆN TỬ & KHÔNG GIAN ĐỌC';
      h2.parentNode.insertBefore(kicker, h2);
    }

    const fanBooks = [];
    const pickOrder = [5, 3, 1, 0, 2, 4, 6];
    for (const idx of pickOrder) {
      if (books[idx]) fanBooks.push(books[idx]);
    }
    /* Center book rises first (delay 0), flanking pairs ripple outward symmetrically! */
    const poses = [
      { fry: '26deg',  fz: '-55px', fy: '22px', fs: '0.84', idx: 1, delay: 3 },
      { fry: '18deg',  fz: '-25px', fy: '12px', fs: '0.91', idx: 2, delay: 2 },
      { fry: '10deg',  fz: '10px',  fy: '5px',  fs: '0.97', idx: 3, delay: 1 },
      { fry: '0deg',   fz: '55px',  fy: '0px',  fs: '1.08', idx: 5, delay: 0 },
      { fry: '-10deg', fz: '10px',  fy: '5px',  fs: '0.97', idx: 3, delay: 1 },
      { fry: '-18deg', fz: '-25px', fy: '12px', fs: '0.91', idx: 2, delay: 2 },
      { fry: '-26deg', fz: '-55px', fy: '22px', fs: '0.84', idx: 1, delay: 3 },
    ];

    const stage = document.createElement('div');
    stage.className = 'lowf-hero-fan-stage';
    const fan = document.createElement('div');
    fan.className = 'lowf-hero-fan';
    fan.innerHTML = fanBooks
      .map((b, i) => {
        const p = poses[i] || poses[3];
        return `<button type="button" class="fan-book" data-action="read" data-id="${esc(b.id)}" aria-label="Đọc ${esc(b.title)}" style="--fry:${p.fry};--fz:${p.fz};--fy:${p.fy};--fs:${p.fs};--fz-idx:${p.idx};--fan-delay:${p.delay}"><img src="${esc(coverOf(b))}" alt="${esc(b.title)}" decoding="async"><span class="fan-book-tip">${esc(b.title)}</span></button>`;
      })
      .join('');
    stage.appendChild(fan);
    hero.appendChild(stage);

    attachHeroSpringParallax(hero, fan, wm);

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'lowf-scroll-pill';
    pill.setAttribute('aria-label', 'Cuộn xuống kệ sách');
    pill.innerHTML = '⌄';
    pill.addEventListener('click', () => {
      const target = document.getElementById('exh-sec-books') || document.getElementById('bookShelf');
      smoothScrollToElement(target);
    });
    hero.appendChild(pill);
  }

  /* 4. Smooth Grab-to-Drag + Momentum on Horizontal Book Shelves */
  function attachSmoothShelfDrag(shelfEl) {
    if (!shelfEl || isTouch || shelfEl.dataset.dragBound === '1') return;
    shelfEl.dataset.dragBound = '1';
    let down = false, startX = 0, startScroll = 0, moved = false, vel = 0, lastX = 0, lastT = 0, momentumId = 0;

    shelfEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      down = true;
      moved = false;
      startX = lastX = e.pageX;
      lastT = performance.now();
      startScroll = shelfEl.scrollLeft;
      vel = 0;
      if (momentumId) cancelAnimationFrame(momentumId);
      const prev = scrollAnimations.get(shelfEl);
      if (prev) cancelAnimationFrame(prev);
    });

    window.addEventListener('mousemove', (e) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 5) {
        moved = true;
        shelfEl.classList.add('is-dragging');
      }
      const now = performance.now();
      const dt = Math.max(1, now - lastT);
      vel = (lastX - e.pageX) / dt;
      lastX = e.pageX;
      lastT = now;
      shelfEl.scrollLeft = startScroll - dx;
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      if (!down) return;
      down = false;
      shelfEl.classList.remove('is-dragging');
      if (Math.abs(vel) > 0.15 && !prefersReduced.matches) {
        let v = vel * 16;
        function coast() {
          shelfEl.scrollLeft += v;
          v *= 0.93;
          if (Math.abs(v) > 0.4) momentumId = requestAnimationFrame(coast);
        }
        momentumId = requestAnimationFrame(coast);
      }
    });

    shelfEl.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
  }

  function tagStaggerCards(container) {
    if (!container) return;
    const cards = container.querySelectorAll('.book-card, .exh-tile');
    cards.forEach((c, i) => {
      c.classList.add('stagger-card');
      c.style.setProperty('--stagger-i', String(Math.min(i, 7)));
    });
  }

  function enhanceDashboardSections() {
    const main = document.getElementById('main');
    const shelf = document.getElementById('bookShelf');
    if (!main || !shelf) return;

    const booksSec = shelf.closest('.dashboard-section') || shelf.parentElement;
    if (booksSec) {
      booksSec.id = 'exh-sec-books';
      booksSec.classList.add('is-revealed');
    }
    tagStaggerCards(shelf);
    attachSmoothShelfDrag(shelf);

    if (!shelf.parentElement.classList.contains('exh-shelf-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'exh-shelf-wrap';
      shelf.parentNode.insertBefore(wrap, shelf);
      wrap.appendChild(shelf);

      const step = () => Math.round(shelf.clientWidth * 0.78);
      const prev = document.createElement('button');
      prev.type = 'button';
      prev.className = 'exh-carousel-arrow prev';
      prev.setAttribute('aria-label', 'Sách trước');
      prev.innerHTML = '‹';
      prev.addEventListener('click', () => smoothScrollAxis(shelf, 'scrollLeft', -step()));

      const next = document.createElement('button');
      next.type = 'button';
      next.className = 'exh-carousel-arrow next';
      next.setAttribute('aria-label', 'Sách tiếp');
      next.innerHTML = '›';
      next.addEventListener('click', () => smoothScrollAxis(shelf, 'scrollLeft', step()));

      wrap.append(prev, next);

      const footer = document.createElement('div');
      footer.className = 'exh-section-footer';
      footer.innerHTML = `<button type="button" class="exh-pill-cta" data-action="nav" data-view="library">Xem tất cả tủ sách →</button>`;
      wrap.after(footer);
    }

    const books = cachedBootstrap?.books || [];
    const classics = books.filter((b) => /^[A-Za-z]/.test(b.title || '') && b.category === 'vanhocqt');
    if (classics.length && !document.getElementById('exh-sec-classics')) {
      const sec2 = document.createElement('section');
      sec2.id = 'exh-sec-classics';
      sec2.className = 'dashboard-section exh-reveal';
      sec2.innerHTML = `
        <div class="section-heading">
          <h2>Tủ sách Kinh điển Thế giới</h2>
          <p>Ấn bản tiếng Anh nguyên tác tích hợp tra nghĩa & phiên âm IPA một chạm</p>
        </div>
        <div class="exh-shelf-wrap">
          <button type="button" class="exh-carousel-arrow prev" aria-label="Trước">‹</button>
          <div class="book-shelf" id="classicsShelf">
            ${classics
              .map(
                (b) => `
              <article class="book-card">
                <div class="book-cover">
                  <img src="${esc(coverOf(b))}" alt="Bìa ${esc(b.title)}" width="300" height="420" loading="lazy" decoding="async">
                  <button class="cover-target" data-action="read" data-id="${esc(b.id)}" aria-label="Đọc ${esc(b.title)}"></button>
                  <span class="format-tag">Kinh điển · IPA</span>
                </div>
                <h3 title="${esc(b.title)}">${esc(b.title)}</h3>
                <p class="author">${esc(b.author)}</p>
                <div class="book-meta">Đọc miễn phí · Tích hợp từ điển</div>
                <button class="button button-soft" data-action="read" data-id="${esc(b.id)}">Đọc ngay</button>
              </article>`
              )
              .join('')}
          </div>
          <button type="button" class="exh-carousel-arrow next" aria-label="Tiếp">›</button>
        </div>
        <div class="exh-section-footer">
          <button type="button" class="exh-pill-cta" data-action="nav" data-view="library">Khám phá toàn bộ ${books.length} tác phẩm →</button>
        </div>
      `;
      const cs = sec2.querySelector('#classicsShelf');
      tagStaggerCards(cs);
      attachSmoothShelfDrag(cs);
      const step2 = () => Math.round((cs?.clientWidth || 640) * 0.78);
      sec2.querySelector('.prev')?.addEventListener('click', () => cs && smoothScrollAxis(cs, 'scrollLeft', -step2()));
      sec2.querySelector('.next')?.addEventListener('click', () => cs && smoothScrollAxis(cs, 'scrollLeft', step2()));
      booksSec?.after(sec2);
    }

    if (cachedBootstrap && !document.getElementById('exh-sec-gallery')) {
      const heroAsset = cachedBootstrap?.settings?.hero?.imageAssetId || cachedBootstrap?.settings?.heroImageAssetId;
      const featuredImg = heroAsset ? `/api/assets/${encodeURIComponent(heroAsset)}` : coverOf(books[0]);
      const trackCount = cachedBootstrap?.tracks?.length || 8;
      const videoCount = cachedBootstrap?.videos?.length || 1;

      const gallery = document.createElement('section');
      gallery.id = 'exh-sec-gallery';
      gallery.className = 'exh-gallery-section exh-reveal';
      gallery.innerHTML = `
        <div class="section-heading">
          <h2>Không gian Đọc & Đa phương tiện</h2>
          <p>Âm nhạc tập trung, góc video tư liệu và công cụ học tập cá nhân hóa</p>
        </div>
        <div class="exh-gallery-wrap">
          <button type="button" class="exh-gallery-featured" data-action="nav" data-view="studio">
            ${featuredImg ? `<img src="${esc(featuredImg)}" alt="Không gian đọc Lowf" loading="lazy" decoding="async">` : ''}
            <div class="exh-gallery-caption">
              <small>KHÔNG GIAN TRẢI NGHIỆM LOWF</small>
              <h3>Giữa bộn bề, mở một trang sách & lắng nghe giai điệu dịu êm.</h3>
              <p>Bấm để bước vào Phòng tập trung Ambient & Piano →</p>
            </div>
          </button>
          <div class="exh-gallery-grid">
            <button type="button" class="exh-tile" data-action="nav" data-view="studio">
              <span class="exh-tile-icon">♫</span>
              <div>
                <strong>Phòng Nhạc & Tiếng Mưa</strong>
                <span>${trackCount} bản Piano cổ điển & 3 âm thanh Ambient tạo trực tiếp</span>
              </div>
            </button>
            <button type="button" class="exh-tile" data-action="nav" data-view="video">
              <span class="exh-tile-icon">▶</span>
              <div>
                <strong>Góc Video Tư Liệu</strong>
                <span>${videoCount} video đang phát hành · Không gian thư giãn trực quan</span>
              </div>
            </button>
            <button type="button" class="exh-tile" data-action="reader-vocabulary">
              <span class="exh-tile-icon">文</span>
              <div>
                <strong>Từ Điển IPA & Dịch Nhanh</strong>
                <span>Hơn 125.000 mục phiên âm IPA Mỹ & sổ lưu từ vựng cá nhân</span>
              </div>
            </button>
            <button type="button" class="exh-tile" data-action="nav" data-view="plans">
              <span class="exh-tile-icon">✦</span>
              <div>
                <strong>Ấn Bản Lowf Plus ✨</strong>
                <span>Giao diện Đỏ Hoàng Gia & Vàng Kim độc quyền cho thành viên</span>
              </div>
            </button>
          </div>
        </div>
      `;
      tagStaggerCards(gallery);
      main.appendChild(gallery);
    }

    bindDotObserver();
  }

  /* 5. Zero-Reflow IntersectionObserver Sticky Dot Rail */
  let dotObserver = null;
  const dotTargets = [
    { target: '#exh-sec-hero', label: 'Giới thiệu & Sân khấu 3D' },
    { target: '#exh-sec-books', label: 'Tủ sách tuyển chọn' },
    { target: '#exh-sec-classics', label: 'Kinh điển Thế giới' },
    { target: '#exh-sec-gallery', label: 'Không gian Đa phương tiện' },
    { target: '#rightPanel', label: 'Tiến độ & Bảng xếp hạng' },
  ];

  function ensureStickyDotRail() {
    if (document.getElementById('lowfDotRail')) return;
    const rail = document.createElement('nav');
    rail.id = 'lowfDotRail';
    rail.className = 'lowf-dot-rail';
    rail.setAttribute('aria-label', 'Điều hướng nhanh trang chủ');
    rail.innerHTML = dotTargets
      .map(
        (it, i) =>
          `<button type="button" class="lowf-dot ${i === 0 ? 'active' : ''}" data-target="${it.target}" aria-label="${it.label}"><span class="lowf-dot-tip">${it.label}</span></button>`
      )
      .join('');

    rail.addEventListener('click', (e) => {
      const btn = e.target.closest('.lowf-dot');
      if (!btn) return;
      smoothScrollToElement(document.querySelector(btn.dataset.target));
    });
    document.body.appendChild(rail);
  }

  function bindDotObserver() {
    const rail = document.getElementById('lowfDotRail');
    if (!rail) return;
    if (dotObserver) dotObserver.disconnect();
    const dots = rail.querySelectorAll('.lowf-dot');
    dotObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const idx = dotTargets.findIndex((it) => en.target.matches(it.target));
            if (idx >= 0) dots.forEach((d, i) => d.classList.toggle('active', i === idx));
          }
        });
      },
      { rootMargin: '-32% 0px -48% 0px', threshold: 0 }
    );
    dotTargets.forEach((it) => {
      const el = document.querySelector(it.target);
      if (el) dotObserver.observe(el);
    });
  }

  /* 6. Plans View Lowf Plus Collector Card */
  function enhancePlansView() {
    const grid = document.querySelector('#main .plans-grid');
    if (!grid || grid.querySelector('.plan-plus')) return;
    const on = isPlusOn();
    const card = document.createElement('section');
    card.className = 'plan plan-plus';
    card.innerHTML = `
      <div class="eyebrow">ẤN BẢN ĐẶC BIỆT · LOWF PLUS COLLECTOR</div>
      <h2>Lowf Plus ✨</h2>
      <div class="plan-price">49.000đ<small> / tháng</small></div>
      <p class="small-note">Mở khóa giao diện Triển lãm Đỏ Hoàng Gia & Vàng Kim (Royal Crimson & Gold), sách cạnh mạ vàng 3D và đặc quyền đọc toàn bộ ấn phẩm thành viên.</p>
      <ul>
        <li>Giao diện Hoàng Gia Đỏ Sơn Mài × Vàng Kim & cạnh sách 3D mạ vàng</li>
        <li>Đọc không giới hạn toàn bộ Ebook, PDF & bản thu âm thành viên</li>
        <li>Ghi chú, bút highlight, dịch nhanh & tra từ điển IPA không giới hạn</li>
        <li>Huy hiệu độc giả Plus nổi bật trên Cộng đồng & Bảng xếp hạng</li>
      </ul>
      <div style="margin-top:18px">
        <button type="button" id="plusPlanPreviewBtn" class="button button-primary">${on ? 'Đang bật chế độ Plus ✨ (Tắt xem thử)' : 'Bật thử chế độ Lowf Plus ✨'}</button>
      </div>
      <p class="small-note" style="margin-top:10px">Bạn có thể trải nghiệm ngay giao diện Plus. Cổng thanh toán VNPAY sẽ mở khi hoàn tất cấu hình người bán.</p>
    `;
    card.querySelector('#plusPlanPreviewBtn')?.addEventListener('click', togglePlusMode);
    grid.appendChild(card);
  }

  /* 7. Staggered Scroll-Reveal Observer & Equalizer */
  let revealIO = null;
  function observeReveals() {
    const els = document.querySelectorAll('.exh-reveal:not(.is-visible)');
    if (!els.length) return;
    if (!revealIO) {
      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add('is-visible', 'is-revealed');
              revealIO.unobserve(en.target);
            }
          });
        },
        { threshold: 0.1 }
      );
    }
    els.forEach((el) => revealIO.observe(el));
  }

  function ensureEqualizer() {
    const info = document.querySelector('#player .player-info');
    if (info && !info.querySelector('.lowf-eq')) {
      const eq = document.createElement('span');
      eq.className = 'lowf-eq';
      eq.innerHTML = '<i></i><i></i><i></i><i></i>';
      info.appendChild(eq);
    }
    const eq = document.querySelector('#player .lowf-eq');
    if (!eq) return;
    const audio = document.getElementById('audio');
    const playing = !!(window.BookMedia?.playing || (audio && !audio.paused && !audio.ended && audio.src));
    eq.classList.toggle('is-playing', playing);
  }

  function enhanceCurrentView() {
    ensureBootstrapData();
    syncTopNav();
    const view = currentView();
    if (view === 'dashboard') {
      enhanceDashboardHero();
      enhanceDashboardSections();
    } else if (view === 'plans') {
      enhancePlansView();
    }
    observeReveals();
    applyPlusMode(isPlusOn());
  }

  function init() {
    setupDrawer();
    ensureStickyDotRail();
    document.getElementById('topPlusBtn')?.addEventListener('click', togglePlusMode);
    applyPlusMode(isPlusOn());
    enhanceCurrentView();
    ensureEqualizer();

    const main = document.getElementById('main');
    if (main) {
      new MutationObserver(() => {
        requestAnimationFrame(enhanceCurrentView);
      }).observe(main, { childList: true });
    }
    window.addEventListener('popstate', () => requestAnimationFrame(enhanceCurrentView));
    document.addEventListener('click', () => setTimeout(() => { syncTopNav(); ensureEqualizer(); }, 60), true);

    const audio = document.getElementById('audio');
    if (audio) ['play', 'pause', 'ended'].forEach((ev) => audio.addEventListener(ev, ensureEqualizer));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
