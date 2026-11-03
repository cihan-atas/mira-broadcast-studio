/**
 * Mobile Legends & Kick Profesyonel Yayın Overlay Ayarları (Kız Yayıncı Teması)
 */
window.OVERLAY_CONFIG = {
  // Yayıncı Bilgileri
  streamerName: "MİRA",
  kickChannel: "cihanatas",
  currentRank: "MYTHIC GLORY", // MLBB Rütbesi: Epic, Legend, Mythic, Mythic Glory, Mythic Immortal
  chatWidgetUrl: "https://botrix.live/widgets/chat/?bid=gLZkQNzbXESRyieK6e3y4A&theme=default&messageSound=0&messageDirection=up&platformIcon=false&bots=false&emojis=true&hideCommands=false&hideMessages=true&hideMessagesSeconds=15&widgetSize=21&streamTogether=true&cheer=true&pointsReward=false&animation=popIn&showTimestamp=false&shadowThickness=1&twitch=true&youtube=true&kick=true&trovo=false",
  
  // -------------------------------------------------------------
  // SESLİ OKUMA (TTS) AYARLARI
  // -------------------------------------------------------------
  tts: {
    enabled: true,           // TTS sesli okuma aktif mi?
    readAllChat: false,      // false: Sadece bağış/abone mesajlarını oku. true: Gelen TÜM chat mesajlarını sesli oku
    readDonations: true,     // Bağış/Destek mesajlarını seslendir
    readAlerts: true,        // Yeni takipçi / abone geldiğinde seslendir ("Yeni takipçi: Kerem!")
    volume: 1.0,             // 0.0 ile 1.0 arası ses seviyesi
    rate: 1.05,              // Okuma hızı (1.0 normal, 1.05 akıcı)
    pitch: 1.15              // Ses tonu (1.15 daha tatlı ve canlı ton)
  },

  // -------------------------------------------------------------
  // ESPOR & CELESTIAL SES EFEKTLERİ (SFX)
  // -------------------------------------------------------------
  soundFX: {
    enabled: true,           // Web Audio sihirli bildirim sesleri
    volume: 0.85
  },

  // -------------------------------------------------------------
  // HEDEF ÇUBUĞU (GOAL BAR)
  // -------------------------------------------------------------
  goal: {
    enabled: true,
    title: "TAKİPÇİ HEDEFİ",
    current: 1,
    target: 50,
    unit: "" // örn: "₺", "Sub", ""
  },

  // -------------------------------------------------------------
  // SON YAYIN OLAYLARI (BAŞLANGIÇ DEĞERLERİ)
  // -------------------------------------------------------------
  recentEvents: {
    follower: { label: "SON TAKİP", name: "-" },
    sub: { label: "SON ABONE", name: "-" },
    donation: { label: "SON DESTEK", name: "-" }
  },

  // -------------------------------------------------------------
  // SOSYAL MEDYA HESAPLARI (Alt bantta sırayla döner)
  // -------------------------------------------------------------
  socials: [
    { platform: "kick", name: "kick.com/cihanatas", icon: "kick" },
    { platform: "tiktok", name: "@miralive", icon: "tiktok" },
    { platform: "youtube", name: "Mira MLBB", icon: "youtube" }
  ],

  // -------------------------------------------------------------
  // OYUN İÇİ WEBCAM YERLEŞİMİ (MLBB İÇİN SOL ALT ÖNERİLİR)
  // -------------------------------------------------------------
  webcamPosition: "bottom-left" // Sol alt (MLBB minimap ve yetenek butonlarını kapatmaz)
};

// =============================================================
// AUTO-FIT 16:9 SCALER (YENİ SEKME / TARAYICI ÖNİZLEME UYUMU)
// =============================================================
(function () {
  'use strict';
  function applyAutoFit() {
    // If inside an iframe (like the control panel preview monitor), let parent handle it
    if (window.self !== window.top) return;

    const target = document.querySelector('.scene-wrapper') ||
                   document.querySelector('.scene-layout') ||
                   document.querySelector('.overlay-canvas');
    if (!target) return;

    const w = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const h = window.innerHeight || document.documentElement.clientHeight || screen.height;

    if (w === 1920 && h === 1080) {
      target.style.transform = 'none';
      return;
    }

    if (document.documentElement) {
      document.documentElement.style.setProperty('background-color', '#07090e', 'important');
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
    }
    if (document.body) {
      document.body.style.setProperty('background-color', '#07090e', 'important');
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    }

    const scale = Math.min(w / 1920, h / 1080);
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'center center';
    target.style.flexShrink = '0';
  }

  window.addEventListener('resize', applyAutoFit);
  window.addEventListener('orientationchange', () => {
    setTimeout(applyAutoFit, 100);
    setTimeout(applyAutoFit, 300);
  });
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(applyAutoFit, 100);
      setTimeout(applyAutoFit, 300);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAutoFit);
  } else {
    applyAutoFit();
  }
  window.addEventListener('load', applyAutoFit);
  setTimeout(applyAutoFit, 60);
  setTimeout(applyAutoFit, 200);

  // =============================================================
  // KULLANICI GALERİSİ SAHNE ÖZELLEŞTİRME MOTORU (?uid= / ?tpl=)
  // =============================================================
  function applySceneGalleryOverrides(item) {
    if (!item || !item.config) return;
    const cfg = item.config;

    if (cfg.primaryColor) {
      document.documentElement.style.setProperty('--primary-color', cfg.primaryColor);
      document.documentElement.style.setProperty('--pink-neon', cfg.primaryColor);
    }
    if (cfg.secondaryColor) {
      document.documentElement.style.setProperty('--secondary-color', cfg.secondaryColor);
      document.documentElement.style.setProperty('--purple-glow', cfg.secondaryColor);
    }

    if (cfg.title) {
      const titleEl = document.querySelector('.scene-title') || document.querySelector('.chatting-header-title');
      if (titleEl) titleEl.textContent = cfg.title;
    }
    if (cfg.subtitleText) {
      const subEl = document.querySelector('.scene-subtitle') || document.querySelector('.chatting-header-sub');
      if (subEl) subEl.textContent = cfg.subtitleText;
    }

    const socialEls = document.querySelectorAll('.scene-social-item span:last-child, .scene-social-item span');
    if (socialEls.length >= 1 && cfg.kickHandle) {
      const kEl = document.querySelector('.bind-kick-channel');
      if (kEl) kEl.textContent = cfg.kickHandle;
    }

    const toggleEl = (sel, show) => {
      const el = document.querySelector(sel);
      if (el && show !== undefined) el.style.display = show ? '' : 'none';
    };
    toggleEl('.scene-chat-col', cfg.showChat);
    toggleEl('.scene-music-ticker', cfg.showMusic);
    toggleEl('.scene-socials', cfg.showSocial);
  }

  function initSceneGalleryCustomization() {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get('uid') || params.get('tpl');
    if (itemId) {
      fetch(`/api/gallery/item/${encodeURIComponent(itemId)}`)
        .then(r => r.json())
        .then(d => {
          if (d && d.item) applySceneGalleryOverrides(d.item);
        })
        .catch(() => {});
    }

    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'USER_ITEM_UPDATED' && e.data.item) {
        if (!itemId || itemId === e.data.item.id) {
          applySceneGalleryOverrides(e.data.item);
        }
      }
    });
    try {
      const bus = new BroadcastChannel('kick_stream_bus');
      bus.onmessage = (e) => {
        if (e.data && e.data.type === 'USER_ITEM_UPDATED' && e.data.item) {
          if (!itemId || itemId === e.data.item.id) {
            applySceneGalleryOverrides(e.data.item);
          }
        }
      };
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSceneGalleryCustomization();
      if (!window.__MIRA_INTERACTIVE_EDITOR_LOADED__) {
        const s = document.createElement('script');
        s.src = '/shared/js/interactive-editor.js';
        document.body.appendChild(s);
      }
    });
  } else {
    initSceneGalleryCustomization();
    if (!window.__MIRA_INTERACTIVE_EDITOR_LOADED__) {
      const s = document.createElement('script');
      s.src = '/shared/js/interactive-editor.js';
      document.body.appendChild(s);
    }
  }
})();

