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

    const w = window.innerWidth;
    const h = window.innerHeight;

    if (w === 1920 && h === 1080) {
      target.style.transform = 'none';
      return;
    }

    if (document.documentElement) {
      document.documentElement.style.backgroundColor = '#07090e';
    }
    const scale = Math.min(w / 1920, h / 1080);
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'center center';
    target.style.flexShrink = '0';
  }

  window.addEventListener('resize', applyAutoFit);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAutoFit);
  } else {
    applyAutoFit();
  }
  window.addEventListener('load', applyAutoFit);
  setTimeout(applyAutoFit, 60);
  setTimeout(applyAutoFit, 200);
})();

