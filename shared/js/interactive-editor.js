/**
 * ============================================================================
 * MİRA BROADCAST STUDIO — INTERACTIVE DRAG, RESIZE & CARD EDITOR ENGINE (v5.5)
 * - Tüm sahne, hero, kart ve boş tuval öğelerini sürükle-bırak (Drag & Drop) yapar
 * - 8 yönlü tutamaç ile yeniden boyutlandırma (Resize) sağlar
 * - "➕ Yeni Kart Ekle" Modalı:
 *   * 🗂️ Kendi Galerimden Kart Seçip Tuvale Ekleme
 *   * 🏪 Ana Mağazadan Keşfedip -> Kendi Galerime Kaydedip -> Galerimden Seçme
 *   * ✏️ Özel Metin / Duyuru Kartı Oluşturma
 * - Gelişmiş Renk Paleti & Renk Kodu Üretici (HEX + RGB Kod Alma & Tek Tıkla Uygulama)
 * - Seçili Kart veya Tüm Kartlar İçin Ayrı Ayrı Sıfırlama Merkezi:
 *   * 📍 Konumu Default'a Çek (Seçili / Tümü)
 *   * 📐 Boyutu Sıfırla (Seçili / Tümü)
 *   * 🎨 Tasarımı & Renkleri Sıfırla (Seçili / Tümü)
 *   * 🔄 Tamamen Default'a Çek (Seçili / Tümü)
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
  let widgetOverrides = {};
  let selectedWidgetEl = null;
  let selectedWidgetId = null;
  let activePaletteTarget = 'borderColor'; // 'borderColor' | 'textColor' | 'subTextColor' | 'bgColor' | 'allTheme'
  let lastLabColor = '#a855f7';

  // Zengin Google Font Aileleri
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

  // 12'li Lüks Yayıncı & MLBB Renk Paleti
  const COLOR_PALETTE = [
    { hex: '#a855f7', name: 'Ametist Mor' },
    { hex: '#10b981', name: 'Zümrüt Yeşil' },
    { hex: '#f59e0b', name: 'İmparatorluk Altın' },
    { hex: '#ec4899', name: 'Şeker Pembe' },
    { hex: '#e11d48', name: 'Vampir Kızıl' },
    { hex: '#06b6d4', name: 'Okyanus Turkuaz' },
    { hex: '#53fc18', name: 'Kick Yeşili' },
    { hex: '#3b82f6', name: 'Siber Mavi' },
    { hex: '#8b5cf6', name: 'Kraliyet Moru' },
    { hex: '#f43f5e', name: 'Neon Mercan' },
    { hex: '#ffffff', name: 'Saf Beyaz' },
    { hex: '#0d0f18', name: 'Gece Siyahı' }
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
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9995;
        background: rgba(11, 14, 23, 0.96);
        border: 2px solid #a855f7;
        border-radius: 999px;
        padding: 7px 16px;
        display: none;
        align-items: center;
        gap: 8px;
        box-shadow: 0 16px 40px rgba(0,0,0,0.85), 0 0 25px rgba(168, 85, 247, 0.45);
        font-family: 'Plus Jakarta Sans', sans-serif;
        backdrop-filter: blur(16px);
        white-space: nowrap;
      }
      body.mira-edit-mode .mira-canvas-toolbar {
        display: flex;
      }
      .mira-tb-badge {
        font-size: 11.5px;
        font-weight: 800;
        color: #e9d5ff;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-right: 4px;
      }
      .mira-tb-btn {
        padding: 6px 11px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.07);
        color: #fff;
        font-size: 11.5px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.16s;
      }
      .mira-tb-btn:hover {
        background: rgba(168, 85, 247, 0.32);
        border-color: #a855f7;
      }
      .mira-tb-btn.accent {
        background: linear-gradient(135deg, #7c3aed, #9333ea);
        border-color: #a855f7;
      }
      .mira-tb-btn.save {
        background: linear-gradient(135deg, #10b981, #059669);
        border-color: #10b981;
      }
      .mira-tb-btn.warn:hover {
        background: rgba(245, 158, 11, 0.28);
        border-color: #f59e0b;
        color: #fde68a;
      }

      /* =========================================================
         KARTA TIKLAYINCA AÇILAN "KARTI DÜZENLEME KARTI" (POPOVER)
         ========================================================= */
      .mira-card-inspector {
        position: absolute;
        top: 76px;
        right: 40px;
        width: 430px;
        max-height: 960px;
        z-index: 9998;
        background: rgba(11, 14, 24, 0.97);
        border: 2px solid #a855f7;
        border-radius: 22px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.92), 0 0 40px rgba(168, 85, 247, 0.45);
        backdrop-filter: blur(24px);
        font-family: 'Plus Jakarta Sans', sans-serif;
        color: #f8fafc;
        display: none;
        flex-direction: column;
        overflow: hidden;
        animation: miraInspectorPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes miraInspectorPop {
        from { opacity: 0; transform: scale(0.95) translateY(8px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
      body.mira-edit-mode .mira-card-inspector.open {
        display: flex;
      }

      .mira-insp-header {
        padding: 13px 16px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(16, 185, 129, 0.16));
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      }
      .mira-insp-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 13px;
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
        padding: 13px 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 11px;
        max-height: 820px;
      }
      .mira-insp-body::-webkit-scrollbar {
        width: 6px;
      }
      .mira-insp-body::-webkit-scrollbar-thumb {
        background: rgba(168, 85, 247, 0.45);
        border-radius: 99px;
      }

      .mira-insp-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 11px 13px;
        display: flex;
        flex-direction: column;
        gap: 9px;
      }
      .mira-insp-sec-title {
        font-size: 10.5px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.7px;
        color: #c084fc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .mira-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mira-field label {
        font-size: 10.5px;
        font-weight: 700;
        color: #94a3b8;
      }
      .mira-input, .mira-select {
        width: 100%;
        background: rgba(7, 9, 16, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 8px;
        padding: 7px 10px;
        color: #fff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 12px;
        font-weight: 600;
        outline: none;
        box-sizing: border-box;
      }
      .mira-input:focus, .mira-select:focus {
        border-color: #a855f7;
        box-shadow: 0 0 10px rgba(168, 85, 247, 0.35);
      }
      .mira-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
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
        width: 32px;
        height: 30px;
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
        font-size: 11px;
        font-weight: 800;
        color: #e2e8f0;
        min-width: 42px;
        text-align: right;
      }

      /* Renk Paleti & Renk Kodu Üretici (Color Lab) */
      .mira-color-lab-box {
        background: rgba(124, 58, 237, 0.09);
        border: 1px solid rgba(168, 85, 247, 0.3);
        border-radius: 11px;
        padding: 9px 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .mira-lab-top {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mira-lab-big-picker {
        width: 42px;
        height: 38px;
        border: 2px solid rgba(255,255,255,0.25);
        border-radius: 9px;
        background: transparent;
        cursor: pointer;
        padding: 0;
        flex-shrink: 0;
      }
      .mira-lab-codes {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .mira-lab-code-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mira-lab-rgb {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10.5px;
        color: #cbd5e1;
        background: rgba(0,0,0,0.45);
        padding: 3px 7px;
        border-radius: 6px;
      }
      .mira-Target-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .mira-target-pill {
        flex: 1;
        min-width: 72px;
        padding: 5px 6px;
        border-radius: 7px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: #cbd5e1;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
        text-align: center;
        transition: all 0.14s;
      }
      .mira-target-pill:hover {
        background: rgba(168, 85, 247, 0.22);
        color: #fff;
      }
      .mira-target-pill.active {
        background: linear-gradient(135deg, #7c3aed, #9333ea);
        border-color: #c084fc;
        color: #fff;
      }
      .mira-palette-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 6px;
      }
      .mira-swatch-btn {
        height: 26px;
        border-radius: 7px;
        border: 2px solid rgba(255,255,255,0.2);
        cursor: pointer;
        transition: transform 0.12s, border-color 0.12s;
        position: relative;
      }
      .mira-swatch-btn:hover {
        transform: scale(1.12);
        border-color: #fff;
        z-index: 2;
      }

      /* Sıfırlama Grid Butonları */
      .mira-reset-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      .mira-mini-btn {
        padding: 7px 8px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.13);
        background: rgba(255,255,255,0.05);
        color: #e2e8f0;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.14s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
      }
      .mira-mini-btn:hover {
        background: rgba(168, 85, 247, 0.25);
        border-color: #a855f7;
        color: #fff;
      }
      .mira-mini-btn.warn:hover {
        background: rgba(245, 158, 11, 0.25);
        border-color: #f59e0b;
        color: #fde68a;
      }
      .mira-mini-btn.danger:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: #ef4444;
        color: #fca5a5;
      }

      .mira-insp-footer {
        padding: 11px 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(8, 10, 18, 0.96);
        display: flex;
        gap: 8px;
      }
      .mira-btn {
        flex: 1;
        padding: 9px 11px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: #fff;
        font-size: 11.5px;
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

      /* =========================================================
         "➕ TUVALE KART EKLE" MODALI (KENDİ GALERİM & ANA MAĞAZA)
         ========================================================= */
      .mira-add-modal-backdrop {
        position: absolute;
        inset: 0;
        z-index: 99999;
        background: rgba(5, 7, 13, 0.82);
        backdrop-filter: blur(14px);
        display: none;
        align-items: center;
        justify-content: center;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      body.mira-edit-mode .mira-add-modal-backdrop.open {
        display: flex;
      }
      .mira-add-modal {
        width: 920px;
        max-height: 820px;
        background: rgba(12, 15, 26, 0.98);
        border: 2px solid #a855f7;
        border-radius: 24px;
        box-shadow: 0 35px 90px rgba(0,0,0,0.92), 0 0 45px rgba(168, 85, 247, 0.4);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: #f8fafc;
      }
      .mira-add-modal-head {
        padding: 18px 24px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(16, 185, 129, 0.14));
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .mira-add-modal-head h3 {
        margin: 0;
        font-family: 'Orbitron', sans-serif;
        font-size: 16px;
        font-weight: 900;
        color: #fff;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .mira-add-tabs {
        display: flex;
        gap: 10px;
        padding: 14px 24px;
        background: rgba(7, 9, 16, 0.85);
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .mira-add-tab {
        padding: 10px 18px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.04);
        color: #cbd5e1;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.16s;
      }
      .mira-add-tab:hover {
        background: rgba(168, 85, 247, 0.2);
        color: #fff;
      }
      .mira-add-tab.active {
        background: linear-gradient(135deg, #7c3aed, #9333ea);
        border-color: #c084fc;
        color: #fff;
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);
      }
      .mira-add-body {
        padding: 20px 24px;
        overflow-y: auto;
        max-height: 600px;
      }
      .mira-add-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .mira-picker-card {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 12px;
        transition: all 0.16s;
      }
      .mira-picker-card:hover {
        border-color: #a855f7;
        background: rgba(168, 85, 247, 0.08);
        transform: translateY(-2px);
      }
      .mira-picker-top {
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      .mira-picker-icon {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        background: rgba(168, 85, 247, 0.18);
        border: 1px solid rgba(168, 85, 247, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .mira-picker-info h4 {
        margin: 0 0 4px 0;
        font-size: 14.5px;
        font-weight: 800;
        color: #fff;
      }
      .mira-picker-info p {
        margin: 0;
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.4;
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

  function getCanvasScale() {
    const root = getCanvasRoot();
    if (!root) return 1;
    const rect = root.getBoundingClientRect();
    if (rect.width > 0) {
      return rect.width / 1920;
    }
    return 1;
  }

  // Kartın ilk (default) DOM ebeveynini ve metinlerini kaydet (Default'a sıfırlama için)
  function rememberOriginalState(el) {
    if (!el) return;
    const target = (el.parentElement && el.parentElement.classList.contains('pos-slot')) ? el.parentElement : el;
    if (!target.__miraOrigRecorded) {
      target.__miraOrigRecorded = true;
      target.__miraOrigParent = target.parentElement;
      target.__miraOrigNextSibling = target.nextElementSibling;
      target.__miraOrigStyle = target.getAttribute('style') || '';
    }
    if (!el.__miraOrigRecorded) {
      el.__miraOrigRecorded = true;
      el.__miraOrigParent = el.parentElement;
      el.__miraOrigNextSibling = el.nextElementSibling;
      el.__miraOrigStyle = el.getAttribute('style') || '';
    }
    getEditableTextElements(el); // Orijinal metinleri data-mira-orig-text olarak kaydeder
  }

  function discoverWidgets() {
    KNOWN_WIDGET_SELECTORS.forEach(def => {
      const el = document.querySelector(def.sel);
      if (el) {
        el.setAttribute('data-mira-widget', def.id);
        el.setAttribute('data-mira-label', def.label);
        rememberOriginalState(el);
      }
    });
    document.querySelectorAll('[data-widget-id]').forEach(el => {
      const wid = el.getAttribute('data-widget-id');
      if (!el.getAttribute('data-mira-widget')) {
        el.setAttribute('data-mira-widget', wid);
        el.setAttribute('data-mira-label', el.getAttribute('data-widget-label') || '📌 Özel Kart');
      }
      rememberOriginalState(el);
    });
  }

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
      if (el.querySelector('h1, h2, h3, .social-user-tag, .mod-skill-name')) return;
      const txt = (el.textContent || '').trim();
      if (!txt && !el.getAttribute('data-mira-text-idx')) return;
      seen.add(el);
      const key = el.getAttribute('data-mira-text-idx') || `txt_${idx}`;
      el.setAttribute('data-mira-text-idx', key);
      if (el.getAttribute('data-mira-orig-text') === null) {
        el.setAttribute('data-mira-orig-text', txt);
      }
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

  function hexToRgbString(hex) {
    const clean = (hex || '#a855f7').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16) || 0;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgba(hex, alpha = 0.9) {
    const clean = (hex || '#0d0f18').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16) || 0;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function getLayoutTarget(widgetEl) {
    if (!widgetEl) return null;
    if (widgetEl.parentElement && widgetEl.parentElement.classList.contains('pos-slot')) {
      return widgetEl.parentElement;
    }
    return widgetEl;
  }

  function getStyleTarget(widgetEl) {
    if (!widgetEl) return null;
    if (widgetEl.classList.contains('pos-slot') && widgetEl.firstElementChild) {
      return widgetEl.firstElementChild;
    }
    return widgetEl;
  }

  // Bir karta kaydedilmiş konum, boyut, renk, font ve metin özelleştirmelerini uygula
  function applyWidgetOverride(widgetEl, wid, ov) {
    if (!widgetEl || !ov) return;
    rememberOriginalState(widgetEl);

    let layoutEl = getLayoutTarget(widgetEl);
    const styleTarget = getStyleTarget(widgetEl);

    if (ov.hidden !== undefined) {
      layoutEl.style.display = ov.hidden ? 'none' : '';
      widgetEl.style.display = ov.hidden ? 'none' : '';
    }

    if (ov.x !== undefined || ov.y !== undefined) {
      const root = getCanvasRoot();
      if (layoutEl.parentElement && layoutEl.parentElement !== root && layoutEl.parentElement.id !== 'dynamic-stage') {
        if (root) root.appendChild(layoutEl);
      }
      layoutEl.style.position = 'absolute';
      layoutEl.style.margin = '0';
      layoutEl.style.right = 'auto';
      layoutEl.style.bottom = 'auto';
      layoutEl.style.transform = 'none';
      if (ov.x !== undefined) layoutEl.style.left = `${Math.round(ov.x)}px`;
      if (ov.y !== undefined) layoutEl.style.top = `${Math.round(ov.y)}px`;
    }

    if (ov.w !== undefined && ov.w > 40) {
      layoutEl.style.width = `${Math.round(ov.w)}px`;
      if (styleTarget !== layoutEl) styleTarget.style.width = '100%';
      const innerCard = layoutEl.querySelector('.mod-card, .hero-webcam-frame, .scene-card');
      if (innerCard) innerCard.style.width = '100%';
    }
    if (ov.h !== undefined && ov.h > 30) {
      layoutEl.style.height = `${Math.round(ov.h)}px`;
      if (styleTarget !== layoutEl) styleTarget.style.height = '100%';
      const innerCard = layoutEl.querySelector('.mod-card, .hero-webcam-frame, .scene-card');
      if (innerCard) innerCard.style.height = '100%';
    }

    if (ov.zIndex !== undefined) {
      layoutEl.style.zIndex = ov.zIndex;
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

    if (ov.texts && typeof ov.texts === 'object') {
      const textItems = getEditableTextElements(widgetEl);
      textItems.forEach(tItem => {
        if (ov.texts[tItem.key] !== undefined) {
          tItem.el.textContent = ov.texts[tItem.key];
        }
      });
    }
  }

  // ============================================================================
  // SIFIRLAMA & DEFAULT'A ÇEKME FONKSİYONLARI (KONUM / BOYUT / TASARIM / TÜMÜ)
  // ============================================================================
  function resetWidgetPosition(widgetEl, wid) {
    if (!widgetEl) return;
    const ov = widgetOverrides[wid];
    if (ov) {
      delete ov.x;
      delete ov.y;
      delete ov.zIndex;
    }
    const layoutEl = getLayoutTarget(widgetEl);
    if (layoutEl) {
      layoutEl.style.left = '';
      layoutEl.style.top = '';
      layoutEl.style.right = '';
      layoutEl.style.bottom = '';
      layoutEl.style.position = '';
      layoutEl.style.margin = '';
      layoutEl.style.transform = '';
      layoutEl.style.zIndex = '';
      if (layoutEl.__miraOrigParent && layoutEl.parentElement !== layoutEl.__miraOrigParent) {
        if (layoutEl.__miraOrigNextSibling && layoutEl.__miraOrigNextSibling.parentElement === layoutEl.__miraOrigParent) {
          layoutEl.__miraOrigParent.insertBefore(layoutEl, layoutEl.__miraOrigNextSibling);
        } else {
          layoutEl.__miraOrigParent.appendChild(layoutEl);
        }
      }
    }
    // Eğer ekstra eklenen bir kartsa merkeze çek
    if (wid && wid.startsWith('custom_card_') && ov) {
      ov.x = 780;
      ov.y = 420;
      applyWidgetOverride(widgetEl, wid, ov);
    }
  }

  function resetWidgetSize(widgetEl, wid) {
    if (!widgetEl) return;
    const ov = widgetOverrides[wid];
    if (ov) {
      delete ov.w;
      delete ov.h;
      delete ov.fontScale;
    }
    const layoutEl = getLayoutTarget(widgetEl);
    const styleTarget = getStyleTarget(widgetEl);
    if (layoutEl) {
      layoutEl.style.width = '';
      layoutEl.style.height = '';
      const innerCard = layoutEl.querySelector('.mod-card, .hero-webcam-frame, .scene-card');
      if (innerCard) {
        innerCard.style.width = '';
        innerCard.style.height = '';
      }
    }
    if (styleTarget) {
      styleTarget.style.width = '';
      styleTarget.style.height = '';
      styleTarget.style.zoom = '';
    }
  }

  function resetWidgetDesign(widgetEl, wid) {
    if (!widgetEl) return;
    const ov = widgetOverrides[wid];
    if (ov) {
      delete ov.fontFamily;
      delete ov.textColor;
      delete ov.subTextColor;
      delete ov.borderColor;
      delete ov.bgColor;
      delete ov.bgOpacity;
      delete ov.borderRadius;
    }
    const styleTarget = getStyleTarget(widgetEl);
    if (styleTarget) {
      styleTarget.style.fontFamily = '';
      styleTarget.style.color = '';
      styleTarget.style.borderColor = '';
      styleTarget.style.boxShadow = '';
      styleTarget.style.background = '';
      styleTarget.style.borderRadius = '';
      styleTarget.querySelectorAll('[style]').forEach(ch => {
        ch.style.fontFamily = '';
        ch.style.color = '';
      });
    }
  }

  function resetWidgetTexts(widgetEl, wid) {
    if (!widgetEl) return;
    const ov = widgetOverrides[wid];
    if (ov) delete ov.texts;
    widgetEl.querySelectorAll('[data-mira-orig-text]').forEach(el => {
      el.textContent = el.getAttribute('data-mira-orig-text');
    });
  }

  function resetWidgetCompletely(widgetEl, wid) {
    if (!widgetEl) return;
    resetWidgetPosition(widgetEl, wid);
    resetWidgetSize(widgetEl, wid);
    resetWidgetDesign(widgetEl, wid);
    resetWidgetTexts(widgetEl, wid);
    const layoutEl = getLayoutTarget(widgetEl);
    if (layoutEl) layoutEl.style.display = '';
    widgetEl.style.display = '';
    delete widgetOverrides[wid];
  }

  function executeResetScope(mode, scope) {
    discoverWidgets();
    if (scope === 'selected') {
      if (!selectedWidgetEl || !selectedWidgetId) return;
      if (mode === 'position') resetWidgetPosition(selectedWidgetEl, selectedWidgetId);
      else if (mode === 'size') resetWidgetSize(selectedWidgetEl, selectedWidgetId);
      else if (mode === 'design') resetWidgetDesign(selectedWidgetEl, selectedWidgetId);
      else if (mode === 'all') resetWidgetCompletely(selectedWidgetEl, selectedWidgetId);
    } else if (scope === 'all') {
      document.querySelectorAll('[data-mira-widget]').forEach(el => {
        const wid = el.getAttribute('data-mira-widget');
        if (mode === 'position') resetWidgetPosition(el, wid);
        else if (mode === 'size') resetWidgetSize(el, wid);
        else if (mode === 'design') resetWidgetDesign(el, wid);
        else if (mode === 'all') {
          if (wid && wid.startsWith('custom_card_')) {
            const lEl = getLayoutTarget(el);
            if (lEl) lEl.remove();
          } else {
            resetWidgetCompletely(el, wid);
          }
        }
      });
      if (mode === 'all') {
        widgetOverrides = {};
      }
    }
    updateSelectionBox();
    if (selectedWidgetEl && document.body.contains(selectedWidgetEl)) {
      openCardInspectorForWidget(selectedWidgetEl);
    }
    notifyParentOfLiveChange();
  }

  // Galeriden veya Özel Olarak Eklenen Kartların & Kahraman Parçalarının Zengin HTML Üreticisi
  function buildExtraCardInnerHtml(cDef) {
    const accent = cDef.accent || '#a855f7';
    const secondary = cDef.secondary || '#10b981';
    const streamer = cDef.streamerName || 'MİRA LIVE';
    const title = cDef.title || 'MİRA ÖZEL KART';
    const sub = cDef.subtitle || 'Mythic Glory Streamer';
    const cType = cDef.cardType || 'custom';

    if (cType === 'showcase') {
      const roleBadge = cDef.roleBadge || 'PRO STREAMER';
      const laneBadge = cDef.laneBadge || 'KICK & TIKTOK';
      const quote = cDef.quote || `"${title}"`;
      return `
        <div class="mod-card mod-showcase-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 18px; width: 325px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div style="display:flex; align-items:center; gap:14px;">
            <img src="${cDef.avatar || '/kick/vexana/img-hero.png'}" style="width:68px; height:68px; border-radius:14px; object-fit:cover; border:2px solid ${accent}; box-shadow:0 0 14px ${accent}66;" onerror="this.style.display='none'">
            <div>
              <div class="mod-showcase-tag" style="font-size:10px; font-weight:800; color:${secondary}; letter-spacing:1.2px;">★ KAHRAMAN & YAYINCI VİTRİNİ</div>
              <div class="mod-showcase-title" style="font-family:'Orbitron',sans-serif; font-size:19px; font-weight:900; color:#fff;">${title}</div>
              <div class="mod-showcase-sub" style="font-size:12px; color:#cbd5e1;">${sub}</div>
              <div style="display:flex; gap:6px; margin-top:6px;">
                <span class="mod-badge-pill" style="padding:2px 8px; border-radius:99px; font-size:9.5px; font-weight:800; background:${accent}28; border:1px solid ${accent}; color:#fff;">${roleBadge}</span>
                <span class="mod-badge-pill" style="padding:2px 8px; border-radius:99px; font-size:9.5px; font-weight:800; background:${secondary}22; border:1px solid ${secondary}; color:${secondary};">${laneBadge}</span>
              </div>
            </div>
          </div>
          <div class="mod-showcase-quote" style="margin-top:11px; font-size:11.5px; font-style:italic; color:#e2e8f0; border-left:3px solid ${accent}; padding-left:10px;">
            ${quote}
          </div>
        </div>
      `;
    }

    if (cType === 'webcam') {
      return `
        <div class="mod-card mod-webcam-card" style="background: rgba(13,15,24,0.88); border: 2px solid ${accent}; border-radius: 18px; padding: 14px; width: 315px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-webcam-header" style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:${accent}; margin-bottom:8px;">
            <span>📷 ${title || streamer}</span>
            <span style="color:${secondary};">● LIVE CAM</span>
          </div>
          <div style="height:168px; border:1px dashed rgba(255,255,255,0.22); border-radius:12px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#94a3b8; font-size:12px;">
            <strong style="color:#fff;">OBS KAMERA ALANI</strong>
            <span>Video Yakalama Aygıtı (16:9)</span>
          </div>
          <div class="mod-webcam-footer" style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; margin-top:8px; color:#e2e8f0;">
            <span>${streamer}</span>
            <span style="color:${secondary};">${cDef.roleBadge || sub}</span>
          </div>
        </div>
      `;
    }

    if (cType === 'social') {
      const s = cDef.socials || { kick: 'kick.com/mira', tiktok: '@mira_mlbb', instagram: '@mira.gaming' };
      return `
        <div class="mod-card mod-social-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 16px; width: 315px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-card-header" style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:${accent}; margin-bottom:10px;">
            <span>🌐 ${title || streamer} SOSYAL</span>
            <span style="color:${secondary};">● AKTİF</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:7px;">
            <div class="mod-social-item" style="background:rgba(255,255,255,0.04); padding:7px 11px; border-radius:9px; font-size:12px; font-weight:700; color:#fff;">🟢 <span>${s.kick || 'kick.com/mira'}</span></div>
            <div class="mod-social-item" style="background:rgba(255,255,255,0.04); padding:7px 11px; border-radius:9px; font-size:12px; font-weight:700; color:#fff;">📱 <span>${s.tiktok || '@mira_mlbb'}</span></div>
            <div class="mod-social-item" style="background:rgba(255,255,255,0.04); padding:7px 11px; border-radius:9px; font-size:12px; font-weight:700; color:#fff;">📸 <span>${s.instagram || '@mira.gaming'}</span></div>
          </div>
        </div>
      `;
    }

    if (cType === 'music') {
      return `
        <div class="mod-card mod-music-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 15px 18px; width: 350px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-card-header" style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:${accent}; margin-bottom:8px;">
            <span>🎵 ${streamer} SOUNDTRACK</span>
            <span style="color:${secondary};">CANLI SES</span>
          </div>
          <div class="mod-song-title" style="font-size:13.5px; font-weight:800; color:#fff;">♪ ${title || 'MLBB Arena - Lo-Fi Chill Beats'}</div>
        </div>
      `;
    }

    if (cType === 'goal') {
      return `
        <div class="mod-card mod-goal-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 15px 18px; width: 340px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-card-header" style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:800; color:#fff; margin-bottom:8px;">
            <span>🎯 ${cDef.goalTitle || 'TAKİPÇİ HEDEFİ'}</span>
            <span style="color:${secondary};">${cDef.goalCurrent || 120} / ${cDef.goalTarget || 500}</span>
          </div>
          <div style="height:10px; background:rgba(255,255,255,0.08); border-radius:99px; overflow:hidden;">
            <div style="width:45%; height:100%; background:linear-gradient(90deg, ${accent}, ${secondary});"></div>
          </div>
        </div>
      `;
    }

    if (cType === 'skills') {
      const sPTitle = cDef.skillPassiveTitle || 'Pasif Yetenek';
      const sPDesc  = cDef.skillPassiveDesc  || 'Temel kahraman pasifi ve güçlendirme';
      const s1Title = cDef.skill1Title || '1. Yetenek (Q)';
      const s1Desc  = cDef.skill1Desc  || 'Alan hasarı ve kitle kontrolü';
      const s2Title = cDef.skill2Title || '2. Yetenek (W)';
      const s2Desc  = cDef.skill2Desc  || 'Yavaşlatma ve alan patlaması';
      const sUTitle = cDef.skillUltiTitle || 'Ulti (R)';
      const sUDesc  = cDef.skillUltiDesc  || 'Takım savaşını başlatan nihai güç';
      return `
        <div class="mod-card mod-skills-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 14px 16px; width: 480px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-card-header" style="display:flex; justify-content:space-between; font-size:11px; font-weight:800; color:${accent}; margin-bottom:8px;">
            <span>⚡ ${title}</span>
            <span style="color:${secondary};">${cDef.roleBadge || 'MLBB REHBER'}</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:rgba(255,255,255,0.04); padding:7px 9px; border-radius:8px; border-left:2px solid ${accent};">
              <div class="mod-skill-name" style="font-size:11.5px; font-weight:800; color:#fff;">${sPTitle}</div>
              <div class="mod-skill-desc" style="font-size:10.5px; color:#94a3b8;">${sPDesc}</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:7px 9px; border-radius:8px; border-left:2px solid ${accent};">
              <div class="mod-skill-name" style="font-size:11.5px; font-weight:800; color:#fff;">${s1Title}</div>
              <div class="mod-skill-desc" style="font-size:10.5px; color:#94a3b8;">${s1Desc}</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:7px 9px; border-radius:8px; border-left:2px solid ${accent};">
              <div class="mod-skill-name" style="font-size:11.5px; font-weight:800; color:#fff;">${s2Title}</div>
              <div class="mod-skill-desc" style="font-size:10.5px; color:#94a3b8;">${s2Desc}</div>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:7px 9px; border-radius:8px; border-left:2px solid ${secondary};">
              <div class="mod-skill-name" style="font-size:11.5px; font-weight:800; color:#fff;">${sUTitle}</div>
              <div class="mod-skill-desc" style="font-size:10.5px; color:#94a3b8;">${sUDesc}</div>
            </div>
          </div>
        </div>
      `;
    }

    if (cType === 'topbar') {
      return `
        <div class="mod-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 16px; padding: 12px 24px; width: 1280px; display:flex; align-items:center; justify-content:space-between; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${secondary}; box-shadow:0 0 10px ${secondary};"></span>
            <span class="brand-name" style="font-family:'Orbitron',sans-serif; font-size:17px; font-weight:900; color:#fff;">${streamer}</span>
            <span class="brand-sub" style="font-size:11px; font-weight:800; color:${accent}; padding:3px 9px; border-radius:99px; background:${accent}22;">${title}</span>
          </div>
          <div style="display:flex; gap:14px; font-size:11.5px; font-weight:800; color:#e2e8f0;">
            <span>💜 SON TAKİP: <strong style="color:#fff;">SelinGamer</strong></span>
            <span>🌟 SON ABONE: <strong style="color:#fff;">NecroLord</strong></span>
            <span>💎 SON DESTEK: <strong style="color:${secondary};">MiraFan (100₺)</strong></span>
          </div>
          <div style="font-family:'Orbitron',sans-serif; font-size:13px; font-weight:900; color:${accent};">CANLI YAYIN</div>
        </div>
      `;
    }

    if (cType === 'gameframe') {
      return `
        <div class="mod-card" style="background: rgba(8,10,16,0.45); border: 2.5px solid ${accent}; border-radius: 22px; width: 1120px; height: 640px; display:flex; flex-direction:column; overflow:hidden; box-shadow: 0 18px 50px rgba(0,0,0,0.75), 0 0 28px ${accent}55;">
          <div style="padding:10px 18px; background:rgba(13,15,24,0.92); border-bottom:1px solid ${accent}66; display:flex; justify-content:space-between; font-family:'Orbitron',sans-serif; font-size:11.5px; font-weight:900; color:#fff;">
            <span>🎮 ${title} • 16:9 OYUN EKRANI</span>
            <span style="color:${secondary};">1080P 60FPS</span>
          </div>
          <div style="flex:1; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.45); font-size:13px; font-weight:700;">
            16:9 OBS OYUN YAKALAMA ÇERÇEVESİ (${title})
          </div>
        </div>
      `;
    }

    if (cType === 'chat') {
      return `
        <div class="mod-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 16px; width: 325px; height: 420px; display:flex; flex-direction:column; justify-content:space-between; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
          <div class="mod-card-header" style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:800; color:${accent}; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
            <span>💬 ${title || 'CANLI SOHBET'}</span>
            <span style="color:${secondary};">● KICK & TIKTOK</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px; margin:12px 0; flex:1; justify-content:flex-end;">
            <div style="background:rgba(255,255,255,0.04); padding:8px 11px; border-radius:10px; font-size:12px; color:#e2e8f0;"><strong style="color:${accent};">SelinGamer:</strong> Harika sahne olmuş! 🔥</div>
            <div style="background:rgba(255,255,255,0.04); padding:8px 11px; border-radius:10px; font-size:12px; color:#e2e8f0;"><strong style="color:${secondary};">MLBB_King:</strong> Mythic Glory serisi başlasın!</div>
          </div>
        </div>
      `;
    }

    if (cType === 'alert') {
      return `
        <div class="mod-card mod-custom-card" style="background: rgba(13,15,24,0.95); border: 2px solid ${accent}; border-radius: 20px; padding: 18px 22px; width: 380px; text-align:center; box-shadow: 0 14px 36px rgba(0,0,0,0.75), 0 0 28px ${accent}77;">
          <div class="mod-showcase-tag" style="font-size:11px; font-weight:800; color:${secondary}; letter-spacing:1.5px;">⚡ ${title}</div>
          <div class="mod-showcase-title" style="font-family:'Orbitron',sans-serif; font-size:20px; font-weight:900; color:#fff; margin:6px 0;">${streamer}</div>
          <div class="mod-custom-body" style="font-size:12.5px; color:#cbd5e1;">${sub}</div>
        </div>
      `;
    }

    return `
      <div class="mod-card mod-custom-card" style="background: rgba(13,15,24,0.92); border: 2px solid ${accent}; border-radius: 18px; padding: 18px; width: 340px; box-shadow: 0 14px 36px rgba(0,0,0,0.65), 0 0 22px ${accent}55;">
        <div class="mod-card-header" style="font-family:'Orbitron',sans-serif; font-size:12px; font-weight:800; color:${accent}; margin-bottom:8px;">
          <span>${title}</span>
        </div>
        <div class="mod-custom-body" style="font-size:13.5px; color:#e2e8f0; line-height:1.5;">
          ${cDef.body || sub || 'Bu karta tıklayarak yazısını, fontunu, rengini ve boyutunu değiştirebilirsiniz.'}
        </div>
      </div>
    `;
  }

  function applyAllWidgetOverrides(widgetsMap) {
    if (!widgetsMap || typeof widgetsMap !== 'object') return;
    widgetOverrides = JSON.parse(JSON.stringify(widgetsMap));
    discoverWidgets();

    if (widgetOverrides.__extraCards && Array.isArray(widgetOverrides.__extraCards) && widgetOverrides.__extraCards.length > 0) {
      const emptyGuide = document.getElementById('mira-empty-canvas-guide');
      if (emptyGuide) emptyGuide.remove();
      const root = document.getElementById('dynamic-stage') || getCanvasRoot();
      widgetOverrides.__extraCards.forEach(cDef => {
        if (!document.querySelector(`[data-mira-widget="${cDef.id}"]`)) {
          const div = document.createElement('div');
          div.className = 'pos-slot pos-center';
          div.setAttribute('data-widget-id', cDef.id);
          div.setAttribute('data-mira-widget', cDef.id);
          div.setAttribute('data-mira-label', cDef.label || '📌 Özel Kart');
          div.innerHTML = buildExtraCardInnerHtml(cDef);
          root.appendChild(div);
          rememberOriginalState(div);
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

  // Seçim Çerçevesi, Tutamaçlar, Kart Düzenleme Kartı ve Kart Ekleme Modalı UI
  let selectionBoxEl = null;
  let selectionTagEl = null;
  let snapXEl = null;
  let snapYEl = null;
  let inspectorEl = null;
  let toolbarEl = null;
  let addCardModalBackdropEl = null;

  function ensureEditorUI() {
    injectFontsAndEditorStyles();
    const root = getCanvasRoot();
    if (!root) return;

    if (!toolbarEl) {
      toolbarEl = document.createElement('div');
      toolbarEl.className = 'mira-canvas-toolbar';
      toolbarEl.innerHTML = `
        <span class="mira-tb-badge">✨ <strong>ETKİLEŞİMLİ TUVAL:</strong> Tıkla = Düzenle • Sürükle = Taşı</span>
        <button type="button" class="mira-tb-btn accent" id="mira-tb-add-card">➕ Yeni Kart Ekle (Galerim / Mağaza)</button>
        <button type="button" class="mira-tb-btn warn" id="mira-tb-reset-pos" title="Tüm kartların konumlarını varsayılan yerlerine çeker">📍 Konumları Default'a Çek</button>
        <button type="button" class="mira-tb-btn warn" id="mira-tb-reset-size" title="Tüm kartların boyutlarını varsayılana sıfırlar">📐 Boyutları Sıfırla</button>
        <button type="button" class="mira-tb-btn warn" id="mira-tb-reset-design" title="Tüm kartların renk/font tasarımlarını varsayılana sıfırlar">🎨 Tasarımı Sıfırla</button>
        <button type="button" class="mira-tb-btn warn" id="mira-tb-reset-all" title="Tüm tuvali tamamen ilk haline döndürür">🔄 Tümünü Sıfırla</button>
        <button type="button" class="mira-tb-btn save" id="mira-tb-save-all">💾 Tasarımı Kaydet</button>
      `;
      root.appendChild(toolbarEl);

      toolbarEl.querySelector('#mira-tb-add-card').addEventListener('click', (e) => {
        e.stopPropagation();
        openAddCardModal('user');
      });
      toolbarEl.querySelector('#mira-tb-reset-pos').addEventListener('click', (e) => {
        e.stopPropagation();
        executeResetScope('position', 'all');
      });
      toolbarEl.querySelector('#mira-tb-reset-size').addEventListener('click', (e) => {
        e.stopPropagation();
        executeResetScope('size', 'all');
      });
      toolbarEl.querySelector('#mira-tb-reset-design').addEventListener('click', (e) => {
        e.stopPropagation();
        executeResetScope('design', 'all');
      });
      toolbarEl.querySelector('#mira-tb-reset-all').addEventListener('click', (e) => {
        e.stopPropagation();
        executeResetScope('all', 'all');
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

    if (!addCardModalBackdropEl) {
      addCardModalBackdropEl = document.createElement('div');
      addCardModalBackdropEl.className = 'mira-add-modal-backdrop';
      addCardModalBackdropEl.id = 'mira-add-card-modal';
      addCardModalBackdropEl.addEventListener('mousedown', (e) => e.stopPropagation());
      addCardModalBackdropEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target === addCardModalBackdropEl) {
          addCardModalBackdropEl.classList.remove('open');
        }
      });
      root.appendChild(addCardModalBackdropEl);
    }
  }

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

  // ============================================================================
  // "➕ TUVALE KART EKLE" MODALI (KENDİ GALERİMDEN SEÇ VEYA ANA MAĞAZADAN KEŞFET)
  // ============================================================================
  function openAddCardModal(activeTab = 'user') {
    ensureEditorUI();
    if (!addCardModalBackdropEl) return;
    addCardModalBackdropEl.classList.add('open');

    Promise.all([
      fetch('/api/gallery/user').then(r => r.json()).catch(() => ({ items: [] })),
      fetch('/api/gallery/catalog').then(r => r.json()).catch(() => ({ items: [] }))
    ]).then(([userData, catData]) => {
      const userItems = (userData && userData.items) ? userData.items : [];
      const rawCatalog = (catData && (catData.items || catData.catalog)) ? (catData.items || catData.catalog) : [];
      const catalogItems = rawCatalog.filter(
        t => t.category === 'card' || t.category === 'alert'
      );

      renderAddCardModalContent(activeTab, userItems, catalogItems);
    });
  }

  let currentStoreSubFilter = 'all';

  function renderAddCardModalContent(activeTab, userItems, catalogItems) {
    if (!addCardModalBackdropEl) return;

    const userCardItems = userItems;
    const savedTplIds = new Set(userItems.map(u => u.templateId));

    let bodyHtml = '';

    if (activeTab === 'user') {
      if (userCardItems.length === 0) {
        bodyHtml = `
          <div style="text-align:center; padding:36px 20px; background:rgba(168,85,247,0.06); border:1px dashed rgba(168,85,247,0.4); border-radius:18px;">
            <div style="font-size:40px; margin-bottom:10px;">🗂️</div>
            <h4 style="margin:0 0 8px 0; font-size:17px; color:#fff;">Kendi Galerinizde Henüz Kayıtlı Kart Yok</h4>
            <p style="margin:0 auto 18px auto; max-width:520px; font-size:13px; color:#cbd5e1; line-height:1.5;">
              Önce <strong>🏪 Ana Mağazadan Keşfet</strong> sekmesine geçerek beğendiğiniz Kahraman Parçalarını veya Kartları kendi galerinize kaydedin, ardından buradan tuvalinize tek tek ekleyin!
            </p>
            <button type="button" class="mira-btn primary" id="mira-go-store-tab-btn" style="max-width:340px; padding:12px 20px; font-size:13px;">
              🏪 Ana Mağazadan Kahraman Parçası & Kart Keşfet
            </button>
          </div>
        `;
      } else {
        const cardsGrid = userCardItems.map(item => {
          const cfg = item.config || {};
          const acc = cfg.primaryColor || cfg.accent || '#a855f7';
          return `
            <div class="mira-picker-card">
              <div class="mira-picker-top">
                <div class="mira-picker-icon" style="border-color:${acc}; background:${acc}22;">${item.icon || '🃏'}</div>
                <div class="mira-picker-info">
                  <h4>${item.name}</h4>
                  <p>${item.subtitle || item.description || cfg.title || 'Kişisel galerinizdeki özelleştirilebilir kart.'}</p>
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <span style="font-size:11px; font-weight:800; color:${acc};">● Kendi Galerimde Kayıtlı</span>
                <button type="button" class="mira-btn success mira-pick-user-card-btn" data-uid="${item.id}" style="flex:0 0 auto; padding:8px 16px;">
                  ➕ Tuvale Ekle
                </button>
              </div>
            </div>
          `;
        }).join('');

        bodyHtml = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.28); padding:10px 16px; border-radius:12px;">
            <span style="font-size:12.5px; color:#d1fae5;">
              💡 <strong>Kendi Galerim:</strong> Aşağıdaki kayıtlı kart veya kahraman parçalarınızdan istediğinizi seçip bomboş tuvale tek tek ekleyebilirsiniz.
            </span>
            <button type="button" class="mira-btn primary" id="mira-go-store-tab-btn" style="flex:0 0 auto; padding:7px 14px;">
              🏪 Mağazadan Parça Keşfet
            </button>
          </div>
          <div class="mira-add-grid">${cardsGrid}</div>
        `;
      }
    } else if (activeTab === 'store') {
      const filteredCatalog = catalogItems.filter(tpl => {
        if (currentStoreSubFilter === 'all') return true;
        if (currentStoreSubFilter === 'pieces') return !!tpl.heroPiece;
        if (currentStoreSubFilter === 'general') return !tpl.heroPiece;
        return tpl.heroPiece === currentStoreSubFilter;
      });

      const filterBarHtml = `
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'all' ? 'active' : ''}" data-sf="all" style="${currentStoreSubFilter === 'all' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">🌟 Tümü (${catalogItems.length})</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'pieces' ? 'active' : ''}" data-sf="pieces" style="${currentStoreSubFilter === 'pieces' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">🧩 Tüm Kahraman Parçaları (40)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'vexana' ? 'active' : ''}" data-sf="vexana" style="${currentStoreSubFilter === 'vexana' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">💀 Vexana (8)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'zetian' ? 'active' : ''}" data-sf="zetian" style="${currentStoreSubFilter === 'zetian' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">👑 Zetian (8)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'nana' ? 'active' : ''}" data-sf="nana" style="${currentStoreSubFilter === 'nana' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">🐾 Nana (8)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'carmilla' ? 'active' : ''}" data-sf="carmilla" style="${currentStoreSubFilter === 'carmilla' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">🩸 Carmilla (8)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'atlas' ? 'active' : ''}" data-sf="atlas" style="${currentStoreSubFilter === 'atlas' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">⚓ Atlas (8)</button>
          <button type="button" class="mira-mini-btn store-sub-filter ${currentStoreSubFilter === 'general' ? 'active' : ''}" data-sf="general" style="${currentStoreSubFilter === 'general' ? 'background:#7c3aed; border-color:#c084fc; color:#fff;' : ''}">🃏 Genel Kart & Alert (10)</button>
        </div>
      `;

      const storeGrid = filteredCatalog.map(tpl => {
        const cfg = tpl.config || {};
        const acc = cfg.primaryColor || cfg.accent || '#a855f7';
        const isSaved = savedTplIds.has(tpl.id);
        return `
          <div class="mira-picker-card">
            <div class="mira-picker-top">
              <div class="mira-picker-icon" style="border-color:${acc}; background:${acc}22;">${tpl.icon || '🃏'}</div>
              <div class="mira-picker-info">
                <h4>${tpl.name}</h4>
                <p>${tpl.subtitle || tpl.description || ''}</p>
              </div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
              <span style="font-size:10.5px; font-weight:800; color:${isSaved ? '#10b981' : '#c084fc'};">
                ${isSaved ? '✓ Galerinizde Kayıtlı' : (tpl.badge || '🏪 Mağaza Parçası')}
              </span>
              <div style="display:flex; gap:6px;">
                <button type="button" class="mira-btn primary mira-save-tpl-to-gallery-btn" data-tpl="${tpl.id}" style="flex:0 0 auto; padding:7px 11px; font-size:11px;">
                  📥 Galerime Kaydet
                </button>
                <button type="button" class="mira-btn success mira-direct-add-tpl-btn" data-tpl="${tpl.id}" style="flex:0 0 auto; padding:7px 11px; font-size:11px;">
                  ➕ Direkt Tuvale Ekle
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      bodyHtml = `
        <div style="margin-bottom:12px; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.3); padding:10px 16px; border-radius:12px; font-size:12.5px; color:#e9d5ff;">
          🧩 <strong>Kahraman Parçaları & Kart Mağazası:</strong> Kahramanların vitrin, kamera, skill, üst bar, oyun çerçevesi, müzik ve sohbet parçalarını tek tek <strong>"📥 Galerime Kaydet"</strong> veya <strong>"➕ Direkt Tuvale Ekle"</strong> ile boş tuvalinize dizebilirsiniz!
        </div>
        ${filterBarHtml}
        <div class="mira-add-grid">${storeGrid}</div>
      `;
    } else if (activeTab === 'custom') {
      bodyHtml = `
        <div style="max-width:540px; margin:0 auto; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:14px;">
          <h4 style="margin:0; font-size:15px; color:#fff;">✏️ Sıfırdan Özel Metin / Duyuru Kartı Oluştur</h4>
          <div class="mira-field">
            <label>Kart Başlığı</label>
            <input type="text" class="mira-input" id="mira-new-custom-title" value="📌 ÖZEL DUYURU KARTI">
          </div>
          <div class="mira-field">
            <label>Kart İçerik Yazısı</label>
            <input type="text" class="mira-input" id="mira-new-custom-body" value="Turnuva saat 21:00'de başlıyor! Takip etmeyi unutmayın.">
          </div>
          <button type="button" class="mira-btn success" id="mira-create-custom-card-btn" style="padding:11px;">
            ➕ Özel Kartı Tuvale Ekle
          </button>
        </div>
      `;
    }

    addCardModalBackdropEl.innerHTML = `
      <div class="mira-add-modal">
        <div class="mira-add-modal-head">
          <h3><span>➕</span> <span>Tuvale Tek Tek Kart & Kahraman Parçası Ekle</span></h3>
          <button type="button" class="mira-insp-close" id="mira-add-modal-close">✕</button>
        </div>
        <div class="mira-add-tabs">
          <button type="button" class="mira-add-tab ${activeTab === 'user' ? 'active' : ''}" data-tab="user">
            🗂️ 1. Kendi Galerimden Seç (${userCardItems.length})
          </button>
          <button type="button" class="mira-add-tab ${activeTab === 'store' ? 'active' : ''}" data-tab="store">
            🏪 2. Mağaza & Kahraman Parçaları (${catalogItems.length})
          </button>
          <button type="button" class="mira-add-tab ${activeTab === 'custom' ? 'active' : ''}" data-tab="custom">
            ✏️ 3. Sıfırdan Özel Yazı Kartı
          </button>
        </div>
        <div class="mira-add-body">
          ${bodyHtml}
        </div>
      </div>
    `;

    addCardModalBackdropEl.querySelector('#mira-add-modal-close').addEventListener('click', () => {
      addCardModalBackdropEl.classList.remove('open');
    });

    addCardModalBackdropEl.querySelectorAll('.mira-add-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        renderAddCardModalContent(tabBtn.getAttribute('data-tab'), userItems, catalogItems);
      });
    });

    addCardModalBackdropEl.querySelectorAll('.store-sub-filter').forEach(fBtn => {
      fBtn.addEventListener('click', () => {
        currentStoreSubFilter = fBtn.getAttribute('data-sf') || 'all';
        renderAddCardModalContent('store', userItems, catalogItems);
      });
    });

    const goStoreBtn = addCardModalBackdropEl.querySelector('#mira-go-store-tab-btn');
    if (goStoreBtn) {
      goStoreBtn.addEventListener('click', () => {
        renderAddCardModalContent('store', userItems, catalogItems);
      });
    }

    addCardModalBackdropEl.querySelectorAll('.mira-switch-to-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderAddCardModalContent('user', userItems, catalogItems);
      });
    });

    // 1. Kendi Galerimden Seçip Tuvale Ekle
    addCardModalBackdropEl.querySelectorAll('.mira-pick-user-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.getAttribute('data-uid');
        const picked = userItems.find(u => u.id === uid);
        if (picked) {
          addGalleryItemCardToCanvas(picked);
          addCardModalBackdropEl.classList.remove('open');
        }
      });
    });

    // 2. Ana Mağazadan Kendi Galerime Kaydet
    addCardModalBackdropEl.querySelectorAll('.mira-save-tpl-to-gallery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tplId = btn.getAttribute('data-tpl');
        btn.textContent = '⏳ Kaydediliyor...';
        fetch('/api/gallery/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: tplId })
        })
          .then(r => r.json())
          .then(() => {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'MIRA_GALLERY_SAVED_OK' }, '*');
            }
            openAddCardModal('user');
          });
      });
    });

    // 2B. Ana Mağazadan Hem Galerime Kaydet Hem Direkt Tuvale Ekle
    addCardModalBackdropEl.querySelectorAll('.mira-direct-add-tpl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tplId = btn.getAttribute('data-tpl');
        const tplObj = catalogItems.find(t => t.id === tplId);
        if (tplObj) {
          fetch('/api/gallery/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: tplId })
          }).then(() => {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: 'MIRA_GALLERY_SAVED_OK' }, '*');
            }
          }).catch(() => {});
          addGalleryItemCardToCanvas(tplObj);
          addCardModalBackdropEl.classList.remove('open');
        }
      });
    });

    // 3. Özel Yazı Kartı Oluştur
    const createCustomBtn = addCardModalBackdropEl.querySelector('#mira-create-custom-card-btn');
    if (createCustomBtn) {
      createCustomBtn.addEventListener('click', () => {
        const tVal = addCardModalBackdropEl.querySelector('#mira-new-custom-title').value.trim() || '📌 ÖZEL KART';
        const bVal = addCardModalBackdropEl.querySelector('#mira-new-custom-body').value.trim() || 'Kart açıklaması';
        addNewCustomCardOnCanvas({ title: tVal, body: bVal, cardType: 'custom' });
        addCardModalBackdropEl.classList.remove('open');
      });
    }
  }

  function addGalleryItemCardToCanvas(galleryItem) {
    if (!galleryItem) return;
    const cfg = galleryItem.config || {};
    let cType = cfg.cardType || 'custom';
    if (galleryItem.category === 'alert') cType = 'alert';
    else if (!cfg.cardType && galleryItem.category === 'hero') cType = 'showcase';

    addNewCustomCardOnCanvas({
      label: `${galleryItem.icon || '🃏'} ${galleryItem.name}`,
      cardType: cType,
      title: cfg.title || cfg.headerTag || galleryItem.name,
      subtitle: cfg.subtitleText || cfg.subTitle || galleryItem.subtitle || galleryItem.description || 'Mythic Glory Streamer',
      streamerName: cfg.streamerName || 'MİRA',
      roleBadge: cfg.roleBadge,
      laneBadge: cfg.laneBadge,
      quote: cfg.quote,
      accent: cfg.primaryColor || cfg.accent || '#a855f7',
      secondary: cfg.secondaryColor || cfg.secondary || '#10b981',
      avatar: cfg.avatarUrl || galleryItem.previewImg || '/kick/vexana/img-hero.png',
      socials: cfg.socials || { kick: cfg.kickHandle, tiktok: cfg.tiktokHandle, instagram: cfg.youtubeHandle },
      goalTitle: cfg.goalTitle,
      goalCurrent: cfg.goalCurrent,
      goalTarget: cfg.goalTarget,
      skillPassiveTitle: cfg.skillPassiveTitle,
      skillPassiveDesc: cfg.skillPassiveDesc,
      skill1Title: cfg.skill1Title,
      skill1Desc: cfg.skill1Desc,
      skill2Title: cfg.skill2Title,
      skill2Desc: cfg.skill2Desc,
      skillUltiTitle: cfg.skillUltiTitle,
      skillUltiDesc: cfg.skillUltiDesc
    });
  }

  function addNewCustomCardOnCanvas(customOpts = {}) {
    if (!widgetOverrides.__extraCards) widgetOverrides.__extraCards = [];
    const count = widgetOverrides.__extraCards.length + 1;
    const newId = 'custom_card_' + Date.now().toString(36);
    const cType = customOpts.cardType || 'custom';
    const cardDef = {
      id: newId,
      label: customOpts.label || ('📌 Özel Kart #' + count),
      cardType: cType,
      title: customOpts.title || 'ÖZEL KART BAŞLIĞI',
      subtitle: customOpts.subtitle || 'Mythic Glory Streamer',
      body: customOpts.body || customOpts.subtitle || 'Bu karta tıklayarak yazısını, fontunu, rengini ve boyutunu değiştirebilirsiniz.',
      streamerName: customOpts.streamerName || 'MİRA',
      roleBadge: customOpts.roleBadge,
      laneBadge: customOpts.laneBadge,
      quote: customOpts.quote,
      accent: customOpts.accent || '#a855f7',
      secondary: customOpts.secondary || '#10b981',
      avatar: customOpts.avatar || '/kick/vexana/img-hero.png',
      socials: customOpts.socials,
      goalTitle: customOpts.goalTitle,
      goalCurrent: customOpts.goalCurrent,
      goalTarget: customOpts.goalTarget,
      skillPassiveTitle: customOpts.skillPassiveTitle,
      skillPassiveDesc: customOpts.skillPassiveDesc,
      skill1Title: customOpts.skill1Title,
      skill1Desc: customOpts.skill1Desc,
      skill2Title: customOpts.skill2Title,
      skill2Desc: customOpts.skill2Desc,
      skillUltiTitle: customOpts.skillUltiTitle,
      skillUltiDesc: customOpts.skillUltiDesc
    };
    widgetOverrides.__extraCards.push(cardDef);

    // Kart tipine göre 1920x1080 tuval üzerinde akıllı varsayılan yerleşim koordinatı
    const defaultPosByType = {
      topbar:    { x: 320, y: 18 },
      gameframe: { x: 380, y: 100 },
      showcase:  { x: 28,  y: 100 },
      social:    { x: 28,  y: 410 },
      webcam:    { x: 28,  y: 720 },
      chat:      { x: 1555, y: 100 },
      music:     { x: 420, y: 830 },
      skills:    { x: 840, y: 800 },
      goal:      { x: 1540, y: 830 },
      alert:     { x: 760, y: 380 }
    };
    const basePos = defaultPosByType[cType] || { x: 740 + ((count % 4) * 28), y: 380 + ((count % 4) * 28) };

    widgetOverrides[newId] = {
      x: basePos.x,
      y: basePos.y
    };
    applyAllWidgetOverrides(widgetOverrides);
    const newEl = document.querySelector(`[data-mira-widget="${newId}"]`);
    if (newEl) {
      selectWidget(newEl);
      openCardInspectorForWidget(newEl);
    }
    notifyParentOfLiveChange();
  }

  // ============================================================================
  // KARTA TIKLAYINCA AÇILAN "KARTI DÜZENLEME KARTI" (INSPECTOR)
  // ============================================================================
  function openCardInspectorForWidget(widgetEl) {
    ensureEditorUI();
    if (!widgetEl || !inspectorEl) return;

    const wid = widgetEl.getAttribute('data-mira-widget');
    const label = widgetEl.getAttribute('data-mira-label') || 'Kart';
    const ov = widgetOverrides[wid] || (widgetOverrides[wid] = {});
    const rect = getWidgetCanvasRect(widgetEl);

    const styleTarget = getStyleTarget(widgetEl);
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
      : `<div style="font-size:11px; color:#94a3b8;">Bu modülde düzenlenebilir alt metin bulunmuyor.</div>`;

    const fontOptionsHtml = FONT_LIST.map(f => `
      <option value="${f.value.replace(/"/g, '&quot;')}" ${curFontFamily.includes(f.label.split(' ')[0]) ? 'selected' : ''}>${f.label}</option>
    `).join('');

    const paletteSwatchesHtml = COLOR_PALETTE.map(p => `
      <button type="button" class="mira-swatch-btn" data-hex="${p.hex}" title="${p.name} (${p.hex})" style="background:${p.hex};"></button>
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
          <div class="mira-insp-sec-title">
            <span>📝 KARTTAKİ YAZILAR (ANLIK DEĞİŞİR)</span>
          </div>
          ${textInputsHtml}
        </div>

        <!-- 2. RENK PALETİ & RENK KODU ÜRETİCİ (LABORATUVAR) -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">
            <span>🎨 RENK PALETİ & RENK KODU ÜRETİCİ</span>
          </div>

          <!-- Tekil Renk Ayarla & Kodu Al Kutusu -->
          <div class="mira-color-lab-box">
            <div style="font-size:10.5px; font-weight:800; color:#e9d5ff;">
              🧪 Rengi Ayarla → Sana Renk Kodunu Versin (Veya Direkt Uygula):
            </div>
            <div class="mira-lab-top">
              <input type="color" class="mira-lab-big-picker" id="mira-lab-picker" value="${lastLabColor}">
              <div class="mira-lab-codes">
                <div class="mira-lab-code-row">
                  <input type="text" class="mira-input" id="mira-lab-hex-out" value="${lastLabColor}" style="font-family:'JetBrains Mono',monospace; font-weight:800; width:96px; padding:5px 8px;">
                  <span class="mira-lab-rgb" id="mira-lab-rgb-out">${hexToRgbString(lastLabColor)}</span>
                  <button type="button" class="mira-mini-btn" id="mira-lab-copy-btn" style="padding:5px 9px;">📋 Kodu Kopyala</button>
                </div>
              </div>
            </div>
            <div class="mira-Target-pills">
              <button type="button" class="mira-target-pill ${activePaletteTarget === 'borderColor' ? 'active' : ''}" data-target="borderColor">🟣 Çerçeveye Ver</button>
              <button type="button" class="mira-target-pill ${activePaletteTarget === 'textColor' ? 'active' : ''}" data-target="textColor">🔤 Başlığa Ver</button>
              <button type="button" class="mira-target-pill ${activePaletteTarget === 'subTextColor' ? 'active' : ''}" data-target="subTextColor">📝 Alt Yazıya Ver</button>
              <button type="button" class="mira-target-pill ${activePaletteTarget === 'bgColor' ? 'active' : ''}" data-target="bgColor">🖼️ Arka Plana Ver</button>
              <button type="button" class="mira-target-pill ${activePaletteTarget === 'allTheme' ? 'active' : ''}" data-target="allTheme">⚡ Tüm Karta Ver</button>
            </div>
            <div class="mira-palette-grid">
              ${paletteSwatchesHtml}
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
        </div>

        <!-- 3. YAZI FONTU, BOYUTU VE ÇERÇEVE AYARLARI -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">🔤 YAZI FONTU, BOYUTU & ÇERÇEVE</div>

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
              <label>Arka Plan Opaklığı (%)</label>
              <div class="mira-range-wrap">
                <input type="range" id="mira-insp-bgopacity" min="0" max="100" step="5" value="${curBgOpacity}">
                <span class="mira-range-val" id="mira-insp-bgopacity-val">${curBgOpacity}%</span>
              </div>
            </div>
            <div class="mira-field">
              <label>Köşe Yuvarlaklığı (px)</label>
              <div class="mira-range-wrap">
                <input type="range" id="mira-insp-radius" min="0" max="44" step="2" value="${curRadius}">
                <span class="mira-range-val" id="mira-insp-radius-val">${curRadius}px</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. KONUM (X, Y) VE BOYUT (W, H) -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">📐 KONUM, BOYUT & KATMAN</div>
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
          <div style="display:flex; gap:6px;">
            <button type="button" class="mira-mini-btn" id="mira-insp-front" style="flex:1;">⬆️ Öne Getir</button>
            <button type="button" class="mira-mini-btn" id="mira-insp-back" style="flex:1;">⬇️ Arkaya Gönder</button>
            <button type="button" class="mira-mini-btn danger" id="mira-insp-hide" style="flex:1;">👁️‍🗨️ Kartı Gizle</button>
          </div>
        </div>

        <!-- 5. SIFIRLAMA & DEFAULT'A ÇEKME MERKEZİ (SEÇİLİ KART VEYA TÜM KARTLAR) -->
        <div class="mira-insp-section">
          <div class="mira-insp-sec-title">🛠️ HIZLI SIFIRLAMA & DEFAULT'A ÇEKME MERKEZİ</div>

          <div style="font-size:10.5px; font-weight:700; color:#94a3b8;">🎯 Sadece Seçili Kart (${label}):</div>
          <div class="mira-reset-grid">
            <button type="button" class="mira-mini-btn warn" id="mira-rst-sel-pos">📍 Konumu Default'a Çek</button>
            <button type="button" class="mira-mini-btn warn" id="mira-rst-sel-size">📐 Boyutu Sıfırla</button>
            <button type="button" class="mira-mini-btn warn" id="mira-rst-sel-design">🎨 Tasarımı Sıfırla</button>
            <button type="button" class="mira-mini-btn danger" id="mira-rst-sel-all">🔄 Seçili Kartı Sıfırla</button>
          </div>

          <div style="font-size:10.5px; font-weight:700; color:#94a3b8; margin-top:4px;">🌐 Tuvaldeki Tüm Kartlar:</div>
          <div class="mira-reset-grid">
            <button type="button" class="mira-mini-btn warn" id="mira-rst-all-pos">📍 Tüm Konumları Default'a Çek</button>
            <button type="button" class="mira-mini-btn warn" id="mira-rst-all-size">📐 Tüm Boyutları Sıfırla</button>
            <button type="button" class="mira-mini-btn warn" id="mira-rst-all-design">🎨 Tüm Tasarımı Sıfırla</button>
            <button type="button" class="mira-mini-btn danger" id="mira-rst-all-all">🔄 Tüm Tuvali Sıfırla</button>
          </div>
        </div>
      </div>

      <div class="mira-insp-footer">
        <button type="button" class="mira-btn primary" id="mira-insp-add-card-btn">➕ Kart Ekle</button>
        <button type="button" class="mira-btn success" id="mira-insp-save-btn">💾 DEĞİŞİKLİKLERİ KAYDET</button>
      </div>
    `;

    // Kart Düzenleme Kartını seçilen kartın yanına konumlandır
    let popX = rect.x + rect.w + 24;
    if (popX + 440 > 1900) {
      popX = Math.max(24, rect.x - 450);
    }
    let popY = Math.max(64, Math.min(1080 - 960, rect.y));
    inspectorEl.style.left = `${Math.round(popX)}px`;
    inspectorEl.style.top = `${Math.round(popY)}px`;
    inspectorEl.style.right = 'auto';
    inspectorEl.classList.add('open');

    // Event Listener'ları Bağla
    inspectorEl.querySelector('#mira-insp-close-btn').addEventListener('click', () => {
      inspectorEl.classList.remove('open');
    });

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

    // 2. Renk Laboratuvarı (Rengi Ayarla -> Sana Kodunu Versin & Hedefe Uygula)
    const labPicker = inspectorEl.querySelector('#mira-lab-picker');
    const labHexOut = inspectorEl.querySelector('#mira-lab-hex-out');
    const labRgbOut = inspectorEl.querySelector('#mira-lab-rgb-out');
    const labCopyBtn = inspectorEl.querySelector('#mira-lab-copy-btn');

    const applyColorToTarget = (hexColor, targetKey) => {
      lastLabColor = hexColor;
      labPicker.value = hexColor;
      labHexOut.value = hexColor;
      labRgbOut.textContent = hexToRgbString(hexColor);

      if (targetKey === 'allTheme') {
        ov.borderColor = hexColor;
        ov.textColor = '#ffffff';
        ov.subTextColor = hexColor;
        syncColorInputsInInspector();
      } else if (targetKey) {
        ov[targetKey] = hexColor;
        syncColorInputsInInspector();
      }
      applyWidgetOverride(widgetEl, wid, ov);
      notifyParentOfLiveChange();
    };

    const syncColorInputsInInspector = () => {
      if (ov.textColor) {
        inspectorEl.querySelector('#mira-insp-textcolor').value = ov.textColor;
        inspectorEl.querySelector('#mira-insp-textcolor-txt').value = ov.textColor;
      }
      if (ov.subTextColor) {
        inspectorEl.querySelector('#mira-insp-subcolor').value = ov.subTextColor;
        inspectorEl.querySelector('#mira-insp-subcolor-txt').value = ov.subTextColor;
      }
      if (ov.borderColor) {
        inspectorEl.querySelector('#mira-insp-bordercolor').value = ov.borderColor;
        inspectorEl.querySelector('#mira-insp-bordercolor-txt').value = ov.borderColor;
      }
      if (ov.bgColor) {
        inspectorEl.querySelector('#mira-insp-bgcolor').value = ov.bgColor;
        inspectorEl.querySelector('#mira-insp-bgcolor-txt').value = ov.bgColor;
      }
    };

    labPicker.addEventListener('input', () => {
      const hex = labPicker.value;
      lastLabColor = hex;
      labHexOut.value = hex;
      labRgbOut.textContent = hexToRgbString(hex);
      applyColorToTarget(hex, activePaletteTarget);
    });

    labHexOut.addEventListener('input', () => {
      const val = labHexOut.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        applyColorToTarget(val, activePaletteTarget);
      }
    });

    labCopyBtn.addEventListener('click', () => {
      const code = labHexOut.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).catch(() => {});
      }
      labCopyBtn.textContent = `✓ ${code} Kopyalandı!`;
      setTimeout(() => (labCopyBtn.textContent = '📋 Kodu Kopyala'), 1600);
    });

    inspectorEl.querySelectorAll('.mira-target-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        inspectorEl.querySelectorAll('.mira-target-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activePaletteTarget = pill.getAttribute('data-target');
        applyColorToTarget(labHexOut.value, activePaletteTarget);
      });
    });

    inspectorEl.querySelectorAll('.mira-swatch-btn').forEach(sw => {
      sw.addEventListener('click', () => {
        const hex = sw.getAttribute('data-hex');
        applyColorToTarget(hex, activePaletteTarget);
      });
    });

    // 3. Font & Renk Değişiklikleri
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
        lastLabColor = picker.value;
        labPicker.value = picker.value;
        labHexOut.value = picker.value;
        labRgbOut.textContent = hexToRgbString(picker.value);
        applyWidgetOverride(widgetEl, wid, ov);
        notifyParentOfLiveChange();
      });
      txt.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(txt.value.trim())) {
          const cleanHex = txt.value.trim();
          picker.value = cleanHex;
          ov[propName] = cleanHex;
          lastLabColor = cleanHex;
          labPicker.value = cleanHex;
          labHexOut.value = cleanHex;
          labRgbOut.textContent = hexToRgbString(cleanHex);
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
    inspectorEl.querySelector('#mira-insp-hide').addEventListener('click', () => {
      ov.hidden = true;
      applyWidgetOverride(widgetEl, wid, ov);
      inspectorEl.classList.remove('open');
      selectionBoxEl.classList.remove('active');
      notifyParentOfLiveChange();
    });

    // 5. Sıfırlama & Default'a Çekme Butonları (Seçili Kart & Tüm Kartlar)
    inspectorEl.querySelector('#mira-rst-sel-pos').addEventListener('click', () => executeResetScope('position', 'selected'));
    inspectorEl.querySelector('#mira-rst-sel-size').addEventListener('click', () => executeResetScope('size', 'selected'));
    inspectorEl.querySelector('#mira-rst-sel-design').addEventListener('click', () => executeResetScope('design', 'selected'));
    inspectorEl.querySelector('#mira-rst-sel-all').addEventListener('click', () => executeResetScope('all', 'selected'));

    inspectorEl.querySelector('#mira-rst-all-pos').addEventListener('click', () => executeResetScope('position', 'all'));
    inspectorEl.querySelector('#mira-rst-all-size').addEventListener('click', () => executeResetScope('size', 'all'));
    inspectorEl.querySelector('#mira-rst-all-design').addEventListener('click', () => executeResetScope('design', 'all'));
    inspectorEl.querySelector('#mira-rst-all-all').addEventListener('click', () => executeResetScope('all', 'all'));

    inspectorEl.querySelector('#mira-insp-add-card-btn').addEventListener('click', () => {
      openAddCardModal('user');
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
        inspectorEl.style.left = `${Math.max(10, Math.min(1480, origLeft + dx))}px`;
        inspectorEl.style.top = `${Math.max(10, Math.min(880, origTop + dy))}px`;
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

  function selectWidget(widgetEl) {
    document.querySelectorAll('[data-mira-widget]').forEach(el => el.classList.remove('mira-widget-selected'));
    selectedWidgetEl = widgetEl;
    selectedWidgetId = widgetEl ? widgetEl.getAttribute('data-mira-widget') : null;
    if (widgetEl) {
      widgetEl.classList.add('mira-widget-selected');
    }
    updateSelectionBox();
  }

  function notifyParentOfLiveChange() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'MIRA_WIDGET_OVERRIDES_CHANGED',
        itemId: currentItemId,
        widgets: widgetOverrides
      }, '*');
    }
  }

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
      if (addCardModalBackdropEl) addCardModalBackdropEl.classList.remove('open');
    } else {
      setTimeout(autoSelectDefaultWidget, 80);
    }
  }

  function initCanvasInteractions() {
    document.addEventListener('mousedown', (e) => {
      if (!isEditMode) return;
      if (
        e.target.closest('.mira-card-inspector') ||
        e.target.closest('.mira-canvas-toolbar') ||
        e.target.closest('.mira-resize-handle') ||
        e.target.closest('.mira-add-modal-backdrop')
      ) {
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
      openAddCardModal(msg.tab || 'user');
    } else if (msg.type === 'MIRA_RESET_CANVAS') {
      setEditMode(true);
      executeResetScope(msg.mode || 'all', msg.scope || 'all');
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
