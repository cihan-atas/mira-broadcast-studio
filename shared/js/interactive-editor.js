/**
 * ============================================================================
 * MİRA BROADCAST STUDIO — INTERACTIVE DRAG, RESIZE & CARD EDITOR ENGINE (v5.0)
 * - Tüm sahne, hero, kart ve boş tuval öğelerini sürükle-bırak (Drag & Drop) yapar
 * - 8 yönlü tutamaç ile yeniden boyutlandırma (Resize) sağlar
 * - Herhangi bir karta tıklandığında hemen yanında "Kart Düzenleme Kartı" açar:
 *   * Kart içindeki tüm yazıları anlık düzenleme
 *   * Yazı rengi, başlık rengi, yazı fontu (8 profesyonel font) ve yazı boyutu
 *   * Kart çerçeve rengi, arka plan rengi/saydamlığı ve köşe yuvarlaklığı
 *   * X, Y, Genişlik, Yükseklik, Katman (Z-Index) ve Gizleme kontrolleri
 * ============================================================================
 */
(function () {
  'use strict';

  if (window.__MIRA_INTERACTIVE_EDITOR_LOADED__) return;
  window.__MIRA_INTERACTIVE_EDITOR_LOADED__ = true;

  const params = new URLSearchParams(window.location.search);
  let isEditMode = params.get('edit') === '1';
  let currentItemId = params.get('uid') || params.get('id') || params.get('tpl') || null;
  let currentItemData = null;
  let widgetOverrides = {}; // { [widgetId]: { x, y, w, h, fontFamily, fontScale, textColor, subTextColor, borderColor, bgColor, bgOpacity, borderRadius, zIndex, hidden, texts: {} } }
  let selectedWidgetEl = null;
  let selectedWidgetId = null;

  // Zengin Google Font Ailelerini Yükle
  const FONT_LIST = [
    { label: 'Plus Jakarta Sans (Modern)', value: "'Plus Jakarta Sans', sans-serif" },
    { label: 'Orbitron (Siber Espor)', value: "'Orbitron', sans-serif" },
    { label: 'Cinzel Decorative (Gotik Kraliyet)', value: "'Cinzel Decorative', serif" },
    { label: 'Rajdhani (Keskin Oyun)', value: "'Rajdhani', sans-serif" },
    { label: 'Bebas Neue (Büyük Başlık)', value: "'Bebas Neue', sans-serif" },
    { label: 'Montserrat (Temiz Stüdyo)', value: "'Montserrat', sans-serif" },
    { label: 'Playfair Display (Zarif Serif)', value: "'Playfair Display', serif" },
    { label: 'JetBrains Mono (Kod / Teknik)', value: "'JetBrains Mono', monospace" }
  ];

  function injectFontsAndEditorStyles() {
    if (!document.getElementById('mira-editor-google-fonts')) {
      const link = document.createElement('link');
      link.id = 'mira-editor-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel+Decorative:wght@700;900&family=JetBrains+Mono:wght@500;700;800&family=Montserrat:wght@500;700;800;900&family=Orbitron:wght@600;700;800;900&family=Playfair+Display:ital,wght@0,700;1,600&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Rajdhani:wght@600;700&display=swap';
      document.head.appendChild(link);
    }

    if (document.getElementById('mira-interactive-editor-css')) return;
    const style = document.createElement('style');
    style.id = 'mira-interactive-editor-css';
    style.textContent = `
      /* Edit Modu Seçilebilir Kartlar */
      body.mira-edit-mode [data-mira-widget] {
        cursor: grab !important;
        transition: box-shadow 0.15s ease, outline 0.15s ease !important;
      }
      body.mira-edit-mode [data-mira-widget]:hover {
        outline: 2px dashed rgba(168, 85, 247, 0.85) !important;
        outline-offset: 3px !important;
      }
      body.mira-edit-mode [data-mira-widget].mira-widget-selected {
        outline: 2.5px solid #53fc18 !important;
        outline-offset: 4px !important;
        box-shadow: 0 0 35px rgba(83, 252, 24, 0.35) !important;
        z-index: 80 !important;
      }
      body.mira-edit-mode [data-mira-widget]:active {
        cursor: grabbing !important;
      }

      /* Seçili Kart Üst Bilgi Etiketi */
      .mira-selection-box {
        position: absolute;
        pointer-events: none;
        z-index: 9990;
        border: 2px solid #53fc18;
        box-shadow: 0 0 20px rgba(83, 252, 24, 0.25);
        display: none;
      }
      body.mira-edit-mode .mira-selection-box.active {
        display: block;
      }
      .mira-selection-tag {
        position: absolute;
        top: -32px;
        left: 0;
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 12px;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 8px;
        white-space: nowrap;
        box-shadow: 0 6px 16px rgba(0,0,0,0.5);
        pointer-events: auto;
        cursor: grab;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* 8 Yönlü Boyutlandırma Tutamaçları (Resize Handles) */
      .mira-resize-handle {
        position: absolute;
        width: 14px;
        height: 14px;
        background: #53fc18;
        border: 2px solid #07090e;
        border-radius: 4px;
        pointer-events: auto;
        box-shadow: 0 0 10px rgba(83, 252, 24, 0.8);
        transition: transform 0.12s ease;
      }
      .mira-resize-handle:hover {
        transform: scale(1.35);
        background: #fff;
      }
      .mira-resize-handle.nw { top: -7px; left: -7px; cursor: nwse-resize; }
      .mira-resize-handle.n  { top: -7px; left: calc(50% - 7px); cursor: ns-resize; }
      .mira-resize-handle.ne { top: -7px; right: -7px; cursor: nesw-resize; }
      .mira-resize-handle.e  { top: calc(50% - 7px); right: -7px; cursor: ew-resize; }
      .mira-resize-handle.se { bottom: -7px; right: -7px; cursor: nwse-resize; }
      .mira-resize-handle.s  { bottom: -7px; left: calc(50% - 7px); cursor: ns-resize; }
      .mira-resize-handle.sw { bottom: -7px; left: -7px; cursor: nesw-resize; }
      .mira-resize-handle.w  { top: calc(50% - 7px); left: -7px; cursor: ew-resize; }

      /* Hizalama Kılavuz Çizgileri (Snap Guides) */
      .mira-snap-guide-x, .mira-snap-guide-y {
        position: absolute;
        pointer-events: none;
        z-index: 9985;
        display: none;
      }
      .mira-snap-guide-x {
        top: 0; bottom: 0; width: 2px;
        background: rgba(83, 252, 24, 0.75);
        box-shadow: 0 0 12px #53fc18;
      }
      .mira-snap-guide-y {
        left: 0; right: 0; height: 2px;
        background: rgba(83, 252, 24, 0.75);
        box-shadow: 0 0 12px #53fc18;
      }

      /* Üst Düzenleme Modu Araç Çubuğu (Canvas Top Pill) */
      .mira-canvas-toolbar {
        position: absolute;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9995;
        background: rgba(11, 14, 23, 0.95);
        border: 2px solid #a855f7;
        border-radius: 999px;
        padding: 8px 20px;
        display: none;
        align-items: center;
        gap: 12px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.8), 0 0 25px rgba(168, 85, 247, 0.45);
        font-family: 'Plus Jakarta Sans', sans-serif;
        backdrop-filter: blur(16px);
      }
      body.mira-edit-mode .mira-canvas-toolbar {
        display: flex;
      }
      .mira-tb-badge {
        font-size: 12.5px;
        font-weight: 800;
        color: #e9d5ff;
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .mira-tb-btn {
        padding: 6px 13px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.07);
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.18s;
      }
      .mira-tb-btn:hover {
        background: rgba(168, 85, 247, 0.3);
        border-color: #a855f7;
      }
      .mira-tb-btn.save {
        background: linear-gradient(135deg, #10b981, #059669);
        border-color: #10b981;
      }
      .mira-tb-btn.save:hover {
        filter: brightness(1.15);
      }

      /* =========================================================
         KARTA TIKLAYINCA AÇILAN "KARTI DÜZENLEME KARTI" (POPOVER)
         ========================================================= */
      .mira-card-inspector {
        position: absolute;
        top: 90px;
        right: 40px;
        width: 410px;
        max-height: 920px;
        z-index: 9999;
        background: rgba(11, 14, 24, 0.97);
        border: 2px solid #a855f7;
        border-radius: 22px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(168, 85, 247, 0.45);
        backdrop-filter: blur(24px);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #f8fafc;
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: miraInspectorPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes miraInspectorPop {
        from { opacity: 0; transform: scale(0.94) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      body.mira-edit-mode .mira-card-inspector.open {
        display: flex;
      }

      .mira-insp-header {
        padding: 15px 18px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(16, 185, 129, 0.15));
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      }
      .mira-insp-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 13.5px;
        font-weight: 800;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mira-insp-close {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.06);
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
      }
      .mira-insp-close:hover {
        background: #ef4444;
        border-color: #ef4444;
      }

      .mira-insp-body {
        padding: 16px 18px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 760px;
      }
      .mira-insp-body::-webkit-scrollbar {
        width: 6px;
      }
      .mira-insp-body::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.4);
        border-radius: 99px;
      }

      .mira-insp-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .mira-insp-sec-title {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #c084fc;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .mira-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mira-field label {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
      }
      .mira-input, .mira-select {
        width: 100%;
        background: rgba(7, 9, 16, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 9px;
        padding: 8px 11px;
        color: #fff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 12.5px;
        font-weight: 600;
        outline: none;
      }
      .mira-input:focus, .mira-select:focus {
        border-color: #a855f7;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
      }
      .mira-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .mira-row-4 {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      .mira-color-wrap {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mira-color-picker {
        width: 34px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
      }
      .mira-range-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mira-range-wrap input[type="range"] {
        flex: 1;
        accent-color: #a855f7;
        cursor: pointer;
      }
      .mira-range-val {
        font-size: 11.5px;
        font-weight: 800;
        color: #e2e8f0;
        min-width: 44px;
        text-align: right;
      }

      .mira-insp-footer {
        padding: 12px 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(8, 10, 18, 0.95);
        display: flex;
        gap: 8px;
      }
      .mira-btn {
        flex: 1;
        padding: 9px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: #fff;
        font-size: 12px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.15s;
      }
      .mira-btn:hover {
        background: rgba(255,255,255,0.14);
      }
      .mira-btn.primary {
        background: linear-gradient(135deg, #7c3aed, #9333ea);
        border-color: #a855f7;
      }
      .mira-btn.success {
        background: linear-gradient(135deg, #10b981, #059669);
        border-color: #10b981;
      }
      .mira-btn.danger:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: #ef4444;
        color: #fca5a5;
      }
    `;
    document.head.appendChild(style);
  }

  // Bilinen Kart & Modül Haritası (Her sahne tipini otomatik tanır)
  const KNOWN_WIDGET_SELECTORS = [
    { id: 'topbar',     label: '📊 Üst HUD Barı',           sel: '.top-hero-bar, .custom-top-bar' },
    { id: 'gameframe',  label: '🎮 16:9 Oyun Çerçevesi',    sel: '.game-viewport-container, .custom-game-frame' },
    { id: 'showcase',   label: '🃏 Vitrin Kartı',           sel: '.hero-showcase-card, [data-widget-id="showcase"]' },
    { id: 'social',     label: '🌐 Sosyal Medya Kartı',     sel: '.hero-social-card, [data-widget-id="social"]' },
    { id: 'webcam',     label: '📷 Kamera Çerçevesi',       sel: '.hero-webcam-bottom-left, [data-widget-id="webcam"]' },
    { id: 'chat',       label: '💬 Canlı Sohbet Paneli',    sel: '.hero-chat-panel, [data-widget-id="chat"], .scene-chat-col' },
    { id: 'music',      label: '🎵 Müzik & Ekolayzer Kartı', sel: '.deck-audio-card, [data-widget-id="music"]' },
    { id: 'skills',     label: '⚡ 4\'lü Skill Rehberi',    sel: '.deck-skills-card, [data-widget-id="skills"]' },
    { id: 'goal',       label: '🎯 Canlı Hedef Kartı',      sel: '[data-widget-id="goal"]' },
    { id: 'customcard', label: '📌 Özel Duyuru Kartı',      sel: '[data-widget-id="customcard"]' },
    { id: 'scenecard',  label: '📺 Ana Sahne Kartı',        sel: '.scene-card, .chatting-cam-frame' },
    { id: 'alertcard',  label: '⚡ Alert Bildirim Kartı',   sel: '.custom-alert-box, .hero-alert-card' }
  ];

  function getCanvasRoot() {
    return document.querySelector('.overlay-canvas') ||
           document.querySelector('.scene-wrapper') ||
           document.body;
  }

  // Tuvalin mevcut CSS scale değerini hesapla (fare hareketlerinin 1:1 oturması için)
  function getCanvasScale() {
    const root = getCanvasRoot();
    if (!root) return 1;
    const rect = root.getBoundingClientRect();
    if (rect.width > 0) {
      return rect.width / 1920;
    }
    return 1;
  }

  // Sayfadaki kartları keşfet ve `data-mira-widget` ata
  function discoverWidgets() {
    KNOWN_WIDGET_SELECTORS.forEach(def => {
      const el = document.querySelector(def.sel);
      if (el) {
        el.setAttribute('data-mira-widget', def.id);
        el.setAttribute('data-mira-label', def.label);
      }
    });
    // Ekstra kullanıcı kartları
    document.querySelectorAll('[data-widget-id]').forEach(el => {
      const wid = el.getAttribute('data-widget-id');
      if (!el.getAttribute('data-mira-widget')) {
        el.setAttribute('data-mira-widget', wid);
        el.setAttribute('data-mira-label', el.getAttribute('data-widget-label') || '📌 Özel Kart');
      }
    });
  }

  // Kartın içindeki düzenlenebilir metin düğümlerini bul
  function getEditableTextElements(widgetEl) {
    if (!widgetEl) return [];
    const candidates = widgetEl.querySelectorAll(
      'h1, h2, h3, p, .hero-showcase-header-tag, .hero-showcase-name, .hero-showcase-title, .hero-role-pill, .hero-lane-pill, .hero-showcase-quote, ' +
      '.mod-showcase-tag, .mod-showcase-title, .mod-showcase-sub, .mod-badge-pill, .mod-showcase-quote, ' +
      '.mod-card-header span, .mod-webcam-header span, .mod-webcam-footer span, .mod-social-item span, ' +
      '.mod-song-title, .mod-skill-name, .mod-skill-desc, .mod-custom-body, ' +
      '.brand-name, .brand-sub, .hero-brand-username, .hero-brand-subtag, .hero-goal-title-badge, ' +
      '.social-user-tag, .hero-cam-top-badge span:last-child, .hero-cam-username, .hero-cam-rank-tag, ' +
      '.deck-title-badge span, .audio-track-title, .audio-track-sub, .skill-name-title, .skill-desc-text, ' +
      '.scene-title, .scene-subtitle, .custom-alert-tag, .custom-alert-user, .custom-alert-sub, .custom-alert-msg'
    );

    const results = [];
    const seen = new Set();
    candidates.forEach((el, idx) => {
      if (seen.has(el)) return;
      // İçinde başka candidate barındıran kapsayıcıları atla
      if (el.querySelector('h1, h2, h3, .social-user-tag, .mod-skill-name')) return;
      const txt = (el.textContent || '').trim();
      if (!txt && !el.getAttribute('data-mira-text-idx')) return;
      seen.add(el);
      const key = el.getAttribute('data-mira-text-idx') || `txt_${idx}`;
      el.setAttribute('data-mira-text-idx', key);
      results.push({ key, el, text: txt });
    });
    return results;
  }

  function rgbToHex(rgbStr, fallback = '#a855f7') {
    if (!rgbStr) return fallback;
    if (rgbStr.startsWith('#')) return rgbStr.slice(0, 7);
    const m = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return fallback;
    const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  function hexToRgba(hex, alpha = 0.9) {
    const clean = (hex || '#0d0f18').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Bir karta kaydedilmiş konum, boyut, renk, font ve metin özelleştirmelerini uygula
  function applyWidgetOverride(widgetEl, wid, ov) {
    if (!widgetEl || !ov) return;

    if (ov.hidden !== undefined) {
      widgetEl.style.display = ov.hidden ? 'none' : '';
    }

    // Eğer kart `.center-bottom-deck` gibi flex/grid içindeyse ve sürüklendiyse mutlak konuma geçir
    if (ov.x !== undefined || ov.y !== undefined) {
      const root = getCanvasRoot();
      if (widgetEl.parentElement && widgetEl.parentElement !== root && widgetEl.parentElement.id !== 'dynamic-stage') {
        if (widgetEl.parentElement.classList.contains('pos-slot')) {
          widgetEl = widgetEl.parentElement;
        } else if (root) {
          root.appendChild(widgetEl);
        }
      }
      widgetEl.style.position = 'absolute';
      widgetEl.style.margin = '0';
      widgetEl.style.right = 'auto';
      widgetEl.style.bottom = 'auto';
      widgetEl.style.transform = 'none';
      if (ov.x !== undefined) widgetEl.style.left = `${Math.round(ov.x)}px`;
      if (ov.y !== undefined) widgetEl.style.top = `${Math.round(ov.y)}px`;
    }

    if (ov.w !== undefined && ov.w > 40) {
      widgetEl.style.width = `${Math.round(ov.w)}px`;
      const innerCard = widgetEl.querySelector('.mod-card, .hero-webcam-frame, .scene-card');
      if (innerCard && widgetEl.classList.contains('pos-slot')) {
        innerCard.style.width = '100%';
      }
    }
    if (ov.h !== undefined && ov.h > 30) {
      widgetEl.style.height = `${Math.round(ov.h)}px`;
      const innerCard = widgetEl.querySelector('.mod-card, .hero-webcam-frame, .scene-card');
      if (innerCard && widgetEl.classList.contains('pos-slot')) {
        innerCard.style.height = '100%';
      }
    }

    const styleTarget = (widgetEl.classList.contains('pos-slot') && widgetEl.firstElementChild)
      ? widgetEl.firstElementChild
      : widgetEl;

    if (ov.zIndex !== undefined) {
      widgetEl.style.zIndex = ov.zIndex;
    }
    if (ov.fontFamily) {
      styleTarget.style.setProperty('font-family', ov.fontFamily, 'important');
      styleTarget.querySelectorAll('h1, h2, h3, span, p, div').forEach(ch => {
        ch.style.fontFamily = ov.fontFamily;
      });
    }
    if (ov.fontScale && ov.fontScale !== 100) {
      styleTarget.style.zoom = `${ov.fontScale}%`;
    } else if (ov.fontScale === 100) {
      styleTarget.style.zoom = '';
    }

    if (ov.textColor) {
      styleTarget.style.color = ov.textColor;
      styleTarget.querySelectorAll('h1, h2, h3, .hero-showcase-name, .mod-showcase-title, .scene-title, .brand-name, .hero-brand-username, .mod-song-title, .custom-alert-user').forEach(el => {
        el.style.setProperty('color', ov.textColor, 'important');
      });
    }
    if (ov.subTextColor) {
      styleTarget.querySelectorAll('p, .hero-showcase-title, .hero-showcase-quote, .mod-showcase-sub, .mod-showcase-quote, .mod-skill-desc, .mod-custom-body, .scene-subtitle, .social-user-tag').forEach(el => {
        el.style.setProperty('color', ov.subTextColor, 'important');
      });
    }
    if (ov.borderColor) {
      styleTarget.style.setProperty('border-color', ov.borderColor, 'important');
      styleTarget.style.setProperty('box-shadow', `0 14px 36px rgba(0,0,0,0.65), 0 0 24px ${ov.borderColor}88`, 'important');
    }
    if (ov.bgColor !== undefined || ov.bgOpacity !== undefined) {
      const col = ov.bgColor || '#0d0f18';
      const op = ov.bgOpacity !== undefined ? (ov.bgOpacity / 100) : 0.9;
      styleTarget.style.setProperty('background', hexToRgba(col, op), 'important');
    }
    if (ov.borderRadius !== undefined) {
      styleTarget.style.setProperty('border-radius', `${ov.borderRadius}px`, 'important');
    }

    // Metin içeriklerini uygula
    if (ov.texts && typeof ov.texts === 'object') {
      const textItems = getEditableTextElements(widgetEl);
      textItems.forEach(tItem => {
        if (ov.texts[tItem.key] !== undefined) {
          tItem.el.textContent = ov.texts[tItem.key];
        }
      });
    }
  }

  function applyAllWidgetOverrides(widgetsMap) {
    if (!widgetsMap || typeof widgetsMap !== 'object') return;
    widgetOverrides = JSON.parse(JSON.stringify(widgetsMap));
    discoverWidgets();

    // Kullanıcı sonradan ekstra özel kart eklediyse onları da oluştur
    if (widgetOverrides.__extraCards && Array.isArray(widgetOverrides.__extraCards)) {
      const root = document.getElementById('dynamic-stage') || getCanvasRoot();
      widgetOverrides.__extraCards.forEach(cDef => {
        if (!document.querySelector(`[data-mira-widget="${cDef.id}"]`)) {
          const div = document.createElement('div');
          div.className = 'pos-slot pos-center';
          div.setAttribute('data-widget-id', cDef.id);
          div.setAttribute('data-mira-widget', cDef.id);
          div.setAttribute('data-mira-label', cDef.label || '📌 Özel Metin Kartı');
          div.innerHTML = `
            <div class="mod-card mod-custom-card" style="background: rgba(13,15,24,0.92); border: 2px solid #a855f7; border-radius: 18px; padding: 18px; width: 340px;">
              <div class="mod-card-header" style="font-family:'Orbitron',sans-serif; font-size:12px; font-weight:800; color:#a855f7; margin-bottom:8px;">
                <span>${cDef.title || '📌 ÖZEL KART BAŞLIĞI'}</span>
              </div>
              <div class="mod-custom-body" style="font-size:13.5px; color:#e2e8f0; line-height:1.5;">
                ${cDef.body || 'Bu karta tıklayarak yazısını, fontunu, rengini ve boyutunu değiştirebilirsiniz.'}
              </div>
            </div>
          `;
          root.appendChild(div);
        }
      });
    }

    document.querySelectorAll('[data-mira-widget]').forEach(el => {
      const wid = el.getAttribute('data-mira-widget');
      if (widgetOverrides[wid]) {
        applyWidgetOverride(el, wid, widgetOverrides[wid]);
      }
    });
    updateSelectionBox();
  }

  // Seçim Çerçevesi, Tutamaçlar ve Kart Düzenleme Kartı UI Oluşturumu
  let selectionBoxEl = null;
  let selectionTagEl = null;
  let snapXEl = null;
  let snapYEl = null;
  let inspectorEl = null;
  let toolbarEl = null;

  function ensureEditorUI() {
    injectFontsAndEditorStyles();
    const root = getCanvasRoot();
    if (!root) return;

    if (!toolbarEl) {
      toolbarEl = document.createElement('div');
      toolbarEl.className = 'mira-canvas-toolbar';
      toolbarEl.innerHTML = `
        <span class="mira-tb-badge">✨ <strong>ETKİLEŞİMLİ TUVAL:</strong> Karta Tıkla = Düzenle • Sürükle = Taşı • Köşeden Çek = Boyutlandır</span>
        <button type="button" class="mira-tb-btn" id="mira-tb-add-card">➕ Yeni Kart Ekle</button>
        <button type="button" class="mira-tb-btn save" id="mira-tb-save-all">💾 Tasarımı Kaydet</button>
      `;
      root.appendChild(toolbarEl);

      toolbarEl.querySelector('#mira-tb-add-card').addEventListener('click', (e) => {
        e.stopPropagation();
        addNewCustomCardOnCanvas();
      });
      toolbarEl.querySelector('#mira-tb-save-all').addEventListener('click', (e) => {
        e.stopPropagation();
        persistOverridesToServer(true);
      });
    }

    if (!snapXEl) {
      snapXEl = document.createElement('div');
      snapXEl.className = 'mira-snap-guide-x';
      snapYEl = document.createElement('div');
      snapYEl.className = 'mira-snap-guide-y';
      root.appendChild(snapXEl);
      root.appendChild(snapYEl);
    }

    if (!selectionBoxEl) {
      selectionBoxEl = document.createElement('div');
      selectionBoxEl.className = 'mira-selection-box';
      selectionBoxEl.innerHTML = `
        <div class="mira-selection-tag" id="mira-selection-tag">🃏 Kart Seçildi</div>
        <div class="mira-resize-handle nw" data-dir="nw"></div>
        <div class="mira-resize-handle n"  data-dir="n"></div>
        <div class="mira-resize-handle ne" data-dir="ne"></div>
        <div class="mira-resize-handle e"  data-dir="e"></div>
        <div class="mira-resize-handle se" data-dir="se"></div>
        <div class="mira-resize-handle s"  data-dir="s"></div>
        <div class="mira-resize-handle sw" data-dir="sw"></div>
        <div class="mira-resize-handle w"  data-dir="w"></div>
      `;
      root.appendChild(selectionBoxEl);
      selectionTagEl = selectionBoxEl.querySelector('#mira-selection-tag');

      // Resize tutamaçlarını dinle
      selectionBoxEl.querySelectorAll('.mira-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          e.preventDefault();
          startResizeWidget(e, handle.getAttribute('data-dir'));
        });
      });
    }

    if (!inspectorEl) {
      inspectorEl = document.createElement('div');
      inspectorEl.className = 'mira-card-inspector';
      inspectorEl.id = 'mira-card-inspector';
      inspectorEl.addEventListener('mousedown', (e) => e.stopPropagation());
      inspectorEl.addEventListener('click', (e) => e.stopPropagation());
      root.appendChild(inspectorEl);
    }
  }

  // Kartın 1920x1080 tuval içindeki yerel koordinatlarını hesapla
  function getWidgetCanvasRect(el) {
    const root = getCanvasRoot();
    const scale = getCanvasScale();
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return {
      x: (elRect.left - rootRect.left) / scale,
      y: (elRect.top - rootRect.top) / scale,
      w: elRect.width / scale,
      h: elRect.height / scale
    };
  }

  function updateSelectionBox() {
    if (!selectionBoxEl) return;
    if (!isEditMode || !selectedWidgetEl || selectedWidgetEl.style.display === 'none') {
      selectionBoxEl.classList.remove('active');
      return;
    }
    const r = getWidgetCanvasRect(selectedWidgetEl);
    selectionBoxEl.classList.add('active');
    selectionBoxEl.style.left = `${Math.round(r.x)}px`;
    selectionBoxEl.style.top = `${Math.round(r.y)}px`;
    selectionBoxEl.style.width = `${Math.round(r.w)}px`;
    selectionBoxEl.style.height = `${Math.round(r.h)}px`;

    const label = selectedWidgetEl.getAttribute('data-mira-label') || 'Kart';
    if (selectionTagEl) {
      selectionTagEl.textContent = `${label} (${Math.round(r.w)}×${Math.round(r.h)})`;
    }
  }

  // Karta Tıklayınca Açılan "Kartı Düzenleme Kartı" (Inspector) İçeriğini Oluştur
  function openCardInspectorForWidget(widgetEl) {
    ensureEditorUI();
    if (!widgetEl || !inspectorEl) return;

    const wid = widgetEl.getAttribute('data-mira-widget');
    const label = widgetEl.getAttribute('data-mira-label') || 'Kart';
    const ov = widgetOverrides[wid] || (widgetOverrides[wid] = {});
    const rect = getWidgetCanvasRect(widgetEl);

    const styleTarget = (widgetEl.classList.contains('pos-slot') && widgetEl.firstElementChild)
      ? widgetEl.firstElementChild
      : widgetEl;
    const comp = window.getComputedStyle(styleTarget);

    const curTextColor = ov.textColor || rgbToHex(comp.color, '#ffffff');
    const curSubColor = ov.subTextColor || '#cbd5e1';
    const curBorderColor = ov.borderColor || rgbToHex(comp.borderColor, '#a855f7');
    const curBgColor = ov.bgColor || '#0d0f18';
    const curBgOpacity = ov.bgOpacity !== undefined ? ov.bgOpacity : 90;
    const curRadius = ov.borderRadius !== undefined ? ov.borderRadius : (parseInt(comp.borderRadius, 10) || 18);
    const curFontScale = ov.fontScale || 100;
    const curFontFamily = ov.fontFamily || FONT_LIST[0].value;

    const editableTexts = getEditableTextElements(widgetEl);

    const textInputsHtml = editableTexts.length > 0
      ? editableTexts.map((item, i) => `
          <div class="mira-field">
            <label>Metin #${i + 1}</label>
            <input type="text" class="mira-input mira-live-text-input" data-text-key="${item.key}" value="${String(item.text).replace(/"/g, '&quot;')}">
          </div>
        `).join('')
      : `<div style="font-size:11.5px; color:#94a3b8;">Bu modülde düzenlenebilir alt metin bulunmuyor.</div>`;

    const fontOptionsHtml = FONT_LIST.map(f => `
      <option value="${f.value.replace(/"/g, '&quot;')}" ${curFontFamily.includes(f.label.split(' ')[0]) ? 'selected' : ''}>${f.label}</option>
    `).join('');

    inspectorEl.innerHTML = `
      <div class="mira-insp-header" id="mira-insp-drag-handle">
        <div class="mira-insp-title">
          <span>✏️</span>
          <span>${label} Düzenle</span>
        </div>
        <button type="button" class="mira-insp-close" id="mira-insp-close-btn">✕</button>
      </div>

      <div class="mira-insp-body">
        <!-- 1. KARTTAKİ YAZILAR -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">📝 KARTTAKİ YAZILAR (ANLIK DEĞİŞİR)</div>
          ${textInputsHtml}
        </div>

        <!-- 2. YAZI FONTU, BOYUTU VE YAZI RENKLERİ -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">🔤 YAZI FONTU, BOYUTU VE RENKLERİ</div>

          <div class="mira-field">
            <label>Yazı Fontu (Font Family)</label>
            <select class="mira-select" id="mira-insp-font">
              ${fontOptionsHtml}
            </select>
          </div>

          <div class="mira-field">
            <label>Yazı Boyutu Ölçeği (%)</label>
            <div class="mira-range-wrap">
              <input type="range" id="mira-insp-fontscale" min="70" max="160" step="5" value="${curFontScale}">
              <span class="mira-range-val" id="mira-insp-fontscale-val">${curFontScale}%</span>
            </div>
          </div>

          <div class="mira-row-2">
            <div class="mira-field">
              <label>Ana Yazı / Başlık Rengi</label>
              <div class="mira-color-wrap">
                <input type="color" class="mira-color-picker" id="mira-insp-textcolor" value="${curTextColor}">
                <input type="text" class="mira-input" id="mira-insp-textcolor-txt" value="${curTextColor}">
              </div>
            </div>
            <div class="mira-field">
              <label>Alt Yazı / Açıklama Rengi</label>
              <div class="mira-color-wrap">
                <input type="color" class="mira-color-picker" id="mira-insp-subcolor" value="${curSubColor}">
                <input type="text" class="mira-input" id="mira-insp-subcolor-txt" value="${curSubColor}">
              </div>
            </div>
          </div>
        </div>

        <!-- 3. KART ÇERÇEVE VE ARKA PLAN STİLİ -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">🎨 KART ÇERÇEVE & ARKA PLAN TASARIMI</div>

          <div class="mira-row-2">
            <div class="mira-field">
              <label>Çerçeve & Neon Rengi</label>
              <div class="mira-color-wrap">
                <input type="color" class="mira-color-picker" id="mira-insp-bordercolor" value="${curBorderColor}">
                <input type="text" class="mira-input" id="mira-insp-bordercolor-txt" value="${curBorderColor}">
              </div>
            </div>
            <div class="mira-field">
              <label>Arka Plan Rengi</label>
              <div class="mira-color-wrap">
                <input type="color" class="mira-color-picker" id="mira-insp-bgcolor" value="${curBgColor}">
                <input type="text" class="mira-input" id="mira-insp-bgcolor-txt" value="${curBgColor}">
              </div>
            </div>
          </div>

          <div class="mira-field">
            <label>Arka Plan Opaklığı / Saydamlık (%)</label>
            <div class="mira-range-wrap">
              <input type="range" id="mira-insp-bgopacity" min="0" max="100" step="5" value="${curBgOpacity}">
              <span class="mira-range-val" id="mira-insp-bgopacity-val">${curBgOpacity}%</span>
            </div>
          </div>

          <div class="mira-field">
            <label>Köşe Yuvarlaklığı (Border Radius)</label>
            <div class="mira-range-wrap">
              <input type="range" id="mira-insp-radius" min="0" max="44" step="2" value="${curRadius}">
              <span class="mira-range-val" id="mira-insp-radius-val">${curRadius}px</span>
            </div>
          </div>
        </div>

        <!-- 4. KONUM (X, Y) VE BOYUT (W, H) -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">📐 KONUM & BOYUT (PİKSEL)</div>
          <div class="mira-row-4">
            <div class="mira-field">
              <label>Sol (X)</label>
              <input type="number" class="mira-input" id="mira-insp-x" value="${Math.round(rect.x)}">
            </div>
            <div class="mira-field">
              <label>Üst (Y)</label>
              <input type="number" class="mira-input" id="mira-insp-y" value="${Math.round(rect.y)}">
            </div>
            <div class="mira-field">
              <label>Genişlik</label>
              <input type="number" class="mira-input" id="mira-insp-w" value="${Math.round(rect.w)}">
            </div>
            <div class="mira-field">
              <label>Yükseklik</label>
              <input type="number" class="mira-input" id="mira-insp-h" value="${Math.round(rect.h)}">
            </div>
          </div>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <button type="button" class="mira-btn" id="mira-insp-front">⬆️ Öne Getir</button>
            <button type="button" class="mira-btn" id="mira-insp-back">⬇️ Arkaya Gönder</button>
            <button type="button" class="mira-btn" id="mira-insp-reset">🔄 Sıfırla</button>
            <button type="button" class="mira-btn danger" id="mira-insp-hide">👁️‍🗨️ Gizle</button>
          </div>
        </div>
      </div>

      <div class="mira-insp-footer">
        <button type="button" class="mira-btn success" id="mira-insp-save-btn">💾 DEĞİŞİKLİKLERİ KAYDET</button>
      </div>
    `;

    // Kart Düzenleme Kartını seçilen kartın yanına (ekrandan taşmayacak şekilde) konumlandır
    let popX = rect.x + rect.w + 24;
    if (popX + 420 > 1900) {
      popX = Math.max(24, rect.x - 434);
    }
    let popY = Math.max(68, Math.min(1080 - 880, rect.y));
    inspectorEl.style.left = `${Math.round(popX)}px`;
    inspectorEl.style.top = `${Math.round(popY)}px`;
    inspectorEl.style.right = 'auto';
    inspectorEl.classList.add('open');

    // Event Listener'ları Bağla
    inspectorEl.querySelector('#mira-insp-close-btn').addEventListener('click', () => {
      inspectorEl.classList.remove('open');
    });

    // Inspector başlığından sürükleme
    initInspectorHeaderDrag(inspectorEl.querySelector('#mira-insp-drag-handle'));

    // 1. Metin Değişiklikleri
    inspectorEl.querySelectorAll('.mira-live-text-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const tKey = inp.getAttribute('data-text-key');
        if (!ov.texts) ov.texts = {};
        ov.texts[tKey] = inp.value;
        const targetTxtEl = widgetEl.querySelector(`[data-mira-text-idx="${tKey}"]`);
        if (targetTxtEl) targetTxtEl.textContent = inp.value;
        notifyParentOfLiveChange();
      });
    });

    // 2. Font & Renk Değişiklikleri
    const fontSel = inspectorEl.querySelector('#mira-insp-font');
    fontSel.addEventListener('change', () => {
      ov.fontFamily = fontSel.value;
      applyWidgetOverride(widgetEl, wid, ov);
      updateSelectionBox();
      notifyParentOfLiveChange();
    });

    const fontScaleInp = inspectorEl.querySelector('#mira-insp-fontscale');
    const fontScaleVal = inspectorEl.querySelector('#mira-insp-fontscale-val');
    fontScaleInp.addEventListener('input', () => {
      ov.fontScale = parseInt(fontScaleInp.value, 10);
      fontScaleVal.textContent = `${ov.fontScale}%`;
      applyWidgetOverride(widgetEl, wid, ov);
      updateSelectionBox();
      notifyParentOfLiveChange();
    });

    const bindColorPair = (pickerSel, txtSel, propName) => {
      const picker = inspectorEl.querySelector(pickerSel);
      const txt = inspectorEl.querySelector(txtSel);
      picker.addEventListener('input', () => {
        txt.value = picker.value;
        ov[propName] = picker.value;
        applyWidgetOverride(widgetEl, wid, ov);
        notifyParentOfLiveChange();
      });
      txt.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(txt.value.trim())) {
          picker.value = txt.value.trim();
          ov[propName] = txt.value.trim();
          applyWidgetOverride(widgetEl, wid, ov);
          notifyParentOfLiveChange();
        }
      });
    };

    bindColorPair('#mira-insp-textcolor', '#mira-insp-textcolor-txt', 'textColor');
    bindColorPair('#mira-insp-subcolor', '#mira-insp-subcolor-txt', 'subTextColor');
    bindColorPair('#mira-insp-bordercolor', '#mira-insp-bordercolor-txt', 'borderColor');
    bindColorPair('#mira-insp-bgcolor', '#mira-insp-bgcolor-txt', 'bgColor');

    const opInp = inspectorEl.querySelector('#mira-insp-bgopacity');
    const opVal = inspectorEl.querySelector('#mira-insp-bgopacity-val');
    opInp.addEventListener('input', () => {
      ov.bgOpacity = parseInt(opInp.value, 10);
      opVal.textContent = `${ov.bgOpacity}%`;
      applyWidgetOverride(widgetEl, wid, ov);
      notifyParentOfLiveChange();
    });

    const radInp = inspectorEl.querySelector('#mira-insp-radius');
    const radVal = inspectorEl.querySelector('#mira-insp-radius-val');
    radInp.addEventListener('input', () => {
      ov.borderRadius = parseInt(radInp.value, 10);
      radVal.textContent = `${ov.borderRadius}px`;
      applyWidgetOverride(widgetEl, wid, ov);
      notifyParentOfLiveChange();
    });

    // 4. X, Y, W, H Sayısal Girişler
    ['x', 'y', 'w', 'h'].forEach(axis => {
      const numInp = inspectorEl.querySelector(`#mira-insp-${axis}`);
      numInp.addEventListener('input', () => {
        ov[axis] = parseInt(numInp.value, 10) || 0;
        applyWidgetOverride(widgetEl, wid, ov);
        updateSelectionBox();
        notifyParentOfLiveChange();
      });
    });

    inspectorEl.querySelector('#mira-insp-front').addEventListener('click', () => {
      ov.zIndex = (parseInt(ov.zIndex || 20, 10)) + 5;
      applyWidgetOverride(widgetEl, wid, ov);
      notifyParentOfLiveChange();
    });
    inspectorEl.querySelector('#mira-insp-back').addEventListener('click', () => {
      ov.zIndex = Math.max(2, (parseInt(ov.zIndex || 20, 10)) - 5);
      applyWidgetOverride(widgetEl, wid, ov);
      notifyParentOfLiveChange();
    });
    inspectorEl.querySelector('#mira-insp-reset').addEventListener('click', () => {
      delete widgetOverrides[wid];
      widgetEl.removeAttribute('style');
      updateSelectionBox();
      openCardInspectorForWidget(widgetEl);
      notifyParentOfLiveChange();
    });
    inspectorEl.querySelector('#mira-insp-hide').addEventListener('click', () => {
      ov.hidden = true;
      applyWidgetOverride(widgetEl, wid, ov);
      inspectorEl.classList.remove('open');
      selectionBoxEl.classList.remove('active');
      notifyParentOfLiveChange();
    });

    inspectorEl.querySelector('#mira-insp-save-btn').addEventListener('click', () => {
      persistOverridesToServer(true);
    });
  }

  function syncInspectorNumbersLive(r) {
    if (!inspectorEl || !inspectorEl.classList.contains('open')) return;
    const xInp = inspectorEl.querySelector('#mira-insp-x');
    const yInp = inspectorEl.querySelector('#mira-insp-y');
    const wInp = inspectorEl.querySelector('#mira-insp-w');
    const hInp = inspectorEl.querySelector('#mira-insp-h');
    if (xInp) xInp.value = Math.round(r.x);
    if (yInp) yInp.value = Math.round(r.y);
    if (wInp) wInp.value = Math.round(r.w);
    if (hInp) hInp.value = Math.round(r.h);
  }

  // Inspector Kartını Başlığından Sürükleme
  function initInspectorHeaderDrag(handleEl) {
    if (!handleEl) return;
    handleEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      e.preventDefault();
      const scale = getCanvasScale();
      const startX = e.clientX;
      const startY = e.clientY;
      const origLeft = parseFloat(inspectorEl.style.left) || 1400;
      const origTop = parseFloat(inspectorEl.style.top) || 90;

      function onMove(ev) {
        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;
        inspectorEl.style.left = `${Math.max(10, Math.min(1500, origLeft + dx))}px`;
        inspectorEl.style.top = `${Math.max(10, Math.min(900, origTop + dy))}px`;
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  // Kart Sürükle-Bırak (Drag & Drop)
  function startDragWidget(e, widgetEl) {
    const wid = widgetEl.getAttribute('data-mira-widget');
    const ov = widgetOverrides[wid] || (widgetOverrides[wid] = {});
    const scale = getCanvasScale();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = getWidgetCanvasRect(widgetEl);
    let moved = false;

    function onMouseMove(ev) {
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;

      let newX = startRect.x + dx;
      let newY = startRect.y + dy;

      // Merkez Hizalama Mıknatısı (Snap to Center)
      const centerX = newX + startRect.w / 2;
      const centerY = newY + startRect.h / 2;
      if (Math.abs(centerX - 960) < 12) {
        newX = 960 - startRect.w / 2;
        if (snapXEl) { snapXEl.style.left = '960px'; snapXEl.style.display = 'block'; }
      } else if (snapXEl) {
        snapXEl.style.display = 'none';
      }

      if (Math.abs(centerY - 540) < 12) {
        newY = 540 - startRect.h / 2;
        if (snapYEl) { snapYEl.style.top = '540px'; snapYEl.style.display = 'block'; }
      } else if (snapYEl) {
        snapYEl.style.display = 'none';
      }

      ov.x = Math.round(newX);
      ov.y = Math.round(newY);
      if (ov.w === undefined) ov.w = Math.round(startRect.w);
      if (ov.h === undefined) ov.h = Math.round(startRect.h);

      applyWidgetOverride(widgetEl, wid, ov);
      updateSelectionBox();
      syncInspectorNumbersLive({ x: ov.x, y: ov.y, w: ov.w, h: ov.h });
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (snapXEl) snapXEl.style.display = 'none';
      if (snapYEl) snapYEl.style.display = 'none';
      if (moved) {
        notifyParentOfLiveChange();
      }
      openCardInspectorForWidget(widgetEl);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Kart Yeniden Boyutlandırma (8 Yönlü Resize)
  function startResizeWidget(e, dir) {
    if (!selectedWidgetEl) return;
    const widgetEl = selectedWidgetEl;
    const wid = widgetEl.getAttribute('data-mira-widget');
    const ov = widgetOverrides[wid] || (widgetOverrides[wid] = {});
    const scale = getCanvasScale();
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startRect = getWidgetCanvasRect(widgetEl);

    function onMouseMove(ev) {
      const dx = (ev.clientX - startMouseX) / scale;
      const dy = (ev.clientY - startMouseY) / scale;

      let newX = startRect.x;
      let newY = startRect.y;
      let newW = startRect.w;
      let newH = startRect.h;

      if (dir.includes('e')) newW = Math.max(90, startRect.w + dx);
      if (dir.includes('s')) newH = Math.max(50, startRect.h + dy);
      if (dir.includes('w')) {
        const possibleW = startRect.w - dx;
        if (possibleW >= 90) {
          newW = possibleW;
          newX = startRect.x + dx;
        }
      }
      if (dir.includes('n')) {
        const possibleH = startRect.h - dy;
        if (possibleH >= 50) {
          newH = possibleH;
          newY = startRect.y + dy;
        }
      }

      ov.x = Math.round(newX);
      ov.y = Math.round(newY);
      ov.w = Math.round(newW);
      ov.h = Math.round(newH);

      applyWidgetOverride(widgetEl, wid, ov);
      updateSelectionBox();
      syncInspectorNumbersLive({ x: ov.x, y: ov.y, w: ov.w, h: ov.h });
    }

    function onMouseUp() {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      notifyParentOfLiveChange();
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Tuvale Yeni Özel Kart Ekle
  function addNewCustomCardOnCanvas() {
    if (!widgetOverrides.__extraCards) widgetOverrides.__extraCards = [];
    const newId = 'custom_card_' + Date.now().toString(36);
    const cardDef = {
      id: newId,
      label: '📌 Özel Kart #' + (widgetOverrides.__extraCards.length + 1),
      title: 'ÖZEL KART BAŞLIĞI',
      body: 'Bu karta tıklayarak yazısını, fontunu, rengini ve boyutunu değiştirebilirsiniz.'
    };
    widgetOverrides.__extraCards.push(cardDef);
    widgetOverrides[newId] = {
      x: 780,
      y: 420,
      w: 360,
      h: 150
    };
    applyAllWidgetOverrides(widgetOverrides);
    const newEl = document.querySelector(`[data-mira-widget="${newId}"]`);
    if (newEl) {
      selectWidget(newEl);
      openCardInspectorForWidget(newEl);
    }
    notifyParentOfLiveChange();
  }

  function selectWidget(widgetEl) {
    document.querySelectorAll('[data-mira-widget]').forEach(el => el.classList.remove('mira-widget-selected'));
    selectedWidgetEl = widgetEl;
    selectedWidgetId = widgetEl ? widgetEl.getAttribute('data-mira-widget') : null;
    if (widgetEl) {
      widgetEl.classList.add('mira-widget-selected');
    }
    updateSelectionBox();
  }

  // Üst pencereye (Studio index.html) anlık bildirim gönder
  function notifyParentOfLiveChange() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'MIRA_WIDGET_OVERRIDES_CHANGED',
        itemId: currentItemId,
        widgets: widgetOverrides
      }, '*');
    }
  }

  // Sunucuya (`user-gallery.json`) kaydet
  function persistOverridesToServer(showFeedback = false) {
    notifyParentOfLiveChange();
    if (!currentItemId || currentItemId === 'preview_canvas' || currentItemId.startsWith('tpl_')) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'MIRA_REQUEST_SAVE_BUILDER',
          widgets: widgetOverrides
        }, '*');
      }
      return;
    }

    fetch(`/api/gallery/item/${encodeURIComponent(currentItemId)}`)
      .then(r => r.json())
      .then(d => {
        const existingCfg = (d && d.item && d.item.config) ? d.item.config : {};
        return fetch(`/api/gallery/user/${encodeURIComponent(currentItemId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              ...existingCfg,
              widgets: widgetOverrides
            }
          })
        });
      })
      .then(r => r.json())
      .then(() => {
        if (showFeedback && toolbarEl) {
          const saveBtn = toolbarEl.querySelector('#mira-tb-save-all');
          if (saveBtn) {
            const old = saveBtn.textContent;
            saveBtn.textContent = '✓ KAYDEDİLDİ!';
            setTimeout(() => (saveBtn.textContent = old), 1800);
          }
        }
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'MIRA_GALLERY_SAVED_OK', itemId: currentItemId }, '*');
        }
      })
      .catch(() => {});
  }

  function autoSelectDefaultWidget() {
    if (!isEditMode) return;
    discoverWidgets();
    if (selectedWidgetEl && document.body.contains(selectedWidgetEl)) {
      updateSelectionBox();
      openCardInspectorForWidget(selectedWidgetEl);
      return;
    }
    const prioritySelectors = [
      '[data-mira-widget="showcase"]',
      '[data-mira-widget="scenecard"]',
      '[data-mira-widget="customcard"]',
      '[data-mira-widget="alertcard"]',
      '[data-mira-widget="music"]',
      '[data-mira-widget]'
    ];
    let preferred = null;
    for (const sel of prioritySelectors) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none') {
        preferred = el;
        break;
      }
    }
    if (preferred) {
      selectWidget(preferred);
      openCardInspectorForWidget(preferred);
    }
  }

  function setEditMode(enabled) {
    isEditMode = !!enabled;
    ensureEditorUI();
    discoverWidgets();
    document.body.classList.toggle('mira-edit-mode', isEditMode);
    if (!isEditMode) {
      selectWidget(null);
      if (inspectorEl) inspectorEl.classList.remove('open');
    } else {
      setTimeout(autoSelectDefaultWidget, 80);
    }
  }

  // Fare Tıklama & Sürükleme Dinleyicisi
  function initCanvasInteractions() {
    document.addEventListener('mousedown', (e) => {
      if (!isEditMode) return;
      if (e.target.closest('.mira-card-inspector') || e.target.closest('.mira-canvas-toolbar') || e.target.closest('.mira-resize-handle')) {
        return;
      }

      discoverWidgets();
      const widgetEl = e.target.closest('[data-mira-widget]');
      if (widgetEl) {
        e.preventDefault();
        e.stopPropagation();
        selectWidget(widgetEl);
        startDragWidget(e, widgetEl);
      } else {
        selectWidget(null);
        if (inspectorEl) inspectorEl.classList.remove('open');
      }
    }, true);
  }

  // Başlangıçta Kayıtlı Öğenin `config.widgets` Verisini Yükle
  function loadSavedWidgetOverrides() {
    discoverWidgets();
    if (!currentItemId || currentItemId === 'preview_canvas') return;
    fetch(`/api/gallery/item/${encodeURIComponent(currentItemId)}`)
      .then(r => r.json())
      .then(d => {
        if (d && d.item) {
          currentItemData = d.item;
          if (d.item.config && d.item.config.widgets) {
            applyAllWidgetOverrides(d.item.config.widgets);
          }
        }
      })
      .catch(() => {});
  }

  // Mesaj Dinleyicisi (Studio'dan gelen Edit Modu ve Güncelleme komutları)
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'SET_INTERACTIVE_EDIT_MODE') {
      if (msg.itemId) currentItemId = msg.itemId;
      setEditMode(msg.enabled);
    } else if (msg.type === 'USER_ITEM_UPDATED' && msg.item) {
      if (!currentItemId || currentItemId === msg.item.id) {
        if (msg.item.config && msg.item.config.widgets) {
          applyAllWidgetOverrides(msg.item.config.widgets);
        }
      }
    } else if (msg.type === 'PREVIEW_CUSTOM_CONFIG' && msg.item) {
      setTimeout(() => {
        discoverWidgets();
        if (msg.item.config && msg.item.config.widgets) {
          applyAllWidgetOverrides(msg.item.config.widgets);
        }
        if (isEditMode) {
          autoSelectDefaultWidget();
        }
      }, 60);
    } else if (msg.type === 'ADD_NEW_CARD_ON_CANVAS') {
      setEditMode(true);
      addNewCustomCardOnCanvas();
    }
  });

  function init() {
    ensureEditorUI();
    discoverWidgets();
    initCanvasInteractions();
    loadSavedWidgetOverrides();
    if (isEditMode) {
      setEditMode(true);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 120));
  } else {
    setTimeout(init, 120);
  }
})();
