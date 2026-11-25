/* Lowf v3.0 — Interactive 3D Tilt, Live Audio Equalizer & Lowf Plus Mode Experience */
(() => {
  'use strict';

  const PLUS_KEY = 'lowf.plusPreview';
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const isTouch = window.matchMedia('(hover: none)').matches;

  function isPlusPreviewOn() {
    try { return localStorage.getItem(PLUS_KEY) === '1'; } catch { return false; }
  }

  function applyPlusMode(enabled) {
    document.documentElement.dataset.plus = enabled ? 'on' : 'off';
    const btn = document.getElementById('plusSwitcher');
    if (btn) {
      btn.setAttribute('aria-pressed', String(enabled));
      const label = btn.querySelector('[data-plus-label]');
      if (label) label.textContent = enabled ? 'Chế độ Plus đang bật' : 'Thử chế độ Plus';
    }
    const planToggle = document.getElementById('plusPlanPreviewBtn');
    if (planToggle) {
      planToggle.textContent = enabled ? 'Đang bật chế độ Plus ✨ (Tắt xem thử)' : 'Xem thử chế độ Plus ✨';
    }
  }

  function togglePlusPreview() {
    const next = !isPlusPreviewOn();
    try { localStorage.setItem(PLUS_KEY, next ? '1' : '0'); } catch {}
    applyPlusMode(next);
  }

  /* 1. Inject Sidebar "Chế độ Plus" Switcher */
  function ensureSidebarPlusSwitcher() {
    const themeRow = document.querySelector('.sidebar-bottom .theme-row');
    if (!themeRow || document.getElementById('plusSwitcher')) return;
    const btn = document.createElement('button');
    btn.id = 'plusSwitcher';
    btn.type = 'button';
    btn.className = 'plus-switcher';
    btn.innerHTML = `<span data-plus-label>Thử chế độ Plus</span><span class="plus-pill">PLUS ✨</span>`;
    btn.addEventListener('click', togglePlusPreview);
    themeRow.parentNode.insertBefore(btn, themeRow);
    applyPlusMode(isPlusPreviewOn());
  }

  /* 2. Enhance Plans Page with Distinct Lowf Plus Showcase Card */
  function enhancePlansView() {
    const grid = document.querySelector('#main .plans-grid');
    if (!grid || grid.querySelector('.plan-plus')) return;
    const plusCard = document.createElement('section');
    plusCard.className = 'plan plan-plus';
    const on = isPlusPreviewOn();
    plusCard.innerHTML = `
      <div class="eyebrow">TRẢI NGHIỆM NÂNG CAO · LOWF PLUS</div>
      <h2>Lowf Plus ✨</h2>
      <div class="plan-price">49.000đ<small> / tháng</small></div>
      <p class="small-note">Giao diện Aurora Tech riêng biệt, mở khóa toàn bộ kho sách thành viên, âm thanh tập trung nâng cao và huy hiệu độc giả Plus.</p>
      <ul>
        <li>Giao diện chế độ Plus Aurora (Indigo × Mint × Gold) độc quyền</li>
        <li>Mở khóa toàn bộ Ebook & Audio thành viên không giới hạn</li>
        <li>Ghi chú, Highlight, dịch thuật kèm IPA & lưu sổ từ vựng không giới hạn</li>
        <li>Huy hiệu Lowf Plus nổi bật trên Bảng xếp hạng & Cộng đồng</li>
      </ul>
      <div class="plan-plus-actions">
        <button type="button" id="plusPlanPreviewBtn" class="button button-primary">${on ? 'Đang bật chế độ Plus ✨ (Tắt xem thử)' : 'Xem thử chế độ Plus ✨'}</button>
      </div>
      <p class="small-note" style="margin-top:10px">Bạn có thể bật thử giao diện Plus ngay bây giờ. Thanh toán nâng cấp thật sẽ mở khi VNPAY hoàn tất kích hoạt.</p>
    `;
    plusCard.querySelector('#plusPlanPreviewBtn')?.addEventListener('click', togglePlusPreview);
    grid.appendChild(plusCard);
  }

  /* 3. Inject Live Equalizer Bars into Floating Player */
  function ensurePlayerEqualizer() {
    const info = document.querySelector('#player .player-info');
    if (!info || info.querySelector('.lowf-eq')) return;
    const eq = document.createElement('span');
    eq.className = 'lowf-eq';
    eq.setAttribute('aria-hidden', 'true');
    eq.innerHTML = '<i></i><i></i><i></i><i></i>';
    info.appendChild(eq);
  }

  function syncEqualizer() {
    const eq = document.querySelector('#player .lowf-eq');
    if (!eq) return;
    const audio = document.getElementById('audio');
    const ambientPlaying = !!(window.BookMedia && window.BookMedia.playing);
    const audioPlaying = !!(audio && !audio.paused && !audio.ended && audio.src);
    eq.classList.toggle('is-playing', ambientPlaying || audioPlaying);
  }

  /* 4. Smooth 60fps 3D Tilt on Desktop Cards (Hero Image, Bento Cards, Plus Card) */
  function attach3DTilt() {
    if (isTouch || prefersReduced.matches) return;
    const targets = document.querySelectorAll('.hero-custom, .bento-card, .plan-plus');
    targets.forEach((el) => {
      if (el.dataset.tiltBound === '1') return;
      el.dataset.tiltBound = '1';
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          const rx = (-y * 7).toFixed(2);
          const ry = (x * 8).toFixed(2);
          el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translate3d(0, -4px, 0)`;
        });
      });
      el.addEventListener('pointerleave', () => {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = '';
      });
    });
  }

  /* Observe main view swaps & audio state */
  function init() {
    applyPlusMode(isPlusPreviewOn());
    ensureSidebarPlusSwitcher();
    ensurePlayerEqualizer();
    enhancePlansView();
    attach3DTilt();
    syncEqualizer();

    const main = document.getElementById('main');
    if (main) {
      new MutationObserver(() => {
        enhancePlansView();
        attach3DTilt();
      }).observe(main, { childList: true, subtree: false });
    }

    const audio = document.getElementById('audio');
    if (audio) {
      ['play', 'pause', 'ended'].forEach((ev) => audio.addEventListener(ev, syncEqualizer));
    }
    document.addEventListener('click', () => setTimeout(syncEqualizer, 120), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
