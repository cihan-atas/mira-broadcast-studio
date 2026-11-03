const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

let PORT = process.env.PORT || 8080;
const eventQueue = [];
let currentSongTitle = "♪ MLBB Arena - Necrokeep Lo-Fi Chill Beats";

// ==========================================
// 0.1 LAN IP Yardımcısı (Mobil Kumanda İçin)
// ==========================================
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('172.')) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ==========================================
// 0.2 OBS WebSocket 5.0 Otomatik Entegrasyonu
// ==========================================
let OBSWebSocket = null;
try {
  OBSWebSocket = require('obs-websocket-js').OBSWebSocket;
} catch (e) {}

let obsWsClient = null;
let obsWsConnected = false;
let obsCurrentScene = null;

const OBS_SCENE_MAP = {
  'vexana': '🎮 3 - Oyun (Vexana)',
  'zetian': '🎮 3 - Oyun (Zetian)',
  'nana': '🎮 3 - Oyun (Nana)',
  'carmilla': '🎮 3 - Oyun (Carmilla)',
  'atlas': '🎮 3 - Oyun (Atlas)',
  '1-yayin-basliyor.html': '⏳ 1 - Yayin Basliyor',
  '2-sohbet.html': '💬 2 - Sohbet & Giris',
  'oyun-pc.html': '🎮 3 - Oyun (PC - Sade)',
  '3-mola.html': '☕ 4 - Mola (BRB)',
  '4-yayin-bitti.html': '🎬 5 - Yayin Bitti'
};

function connectObsWebSocket() {
  if (!OBSWebSocket || obsWsConnected) return;
  const client = new OBSWebSocket();
  client.connect('ws://127.0.0.1:4455')
    .then(() => {
      obsWsClient = client;
      obsWsConnected = true;
      console.log('[OBS WS] OBS Studio WebSocket bağlantısı kuruldu (Port: 4455)');
      return client.call('GetCurrentProgramScene');
    })
    .then(data => {
      obsCurrentScene = data.currentProgramSceneName;
    })
    .catch(() => {
      obsWsClient = null;
      obsWsConnected = false;
    });

  client.on('ConnectionClosed', () => {
    obsWsConnected = false;
    obsWsClient = null;
  });

  client.on('CurrentProgramSceneChanged', data => {
    obsCurrentScene = data.sceneName;
  });
}

setInterval(() => {
  if (!obsWsConnected) connectObsWebSocket();
}, 5000);
connectObsWebSocket();

function setObsScene(targetScene, callback) {
  if (!obsWsConnected || !obsWsClient) {
    return callback(new Error('OBS WebSocket bağlı değil'));
  }
  obsWsClient.call('SetCurrentProgramScene', { sceneName: targetScene })
    .then(() => {
      obsCurrentScene = targetScene;
      callback(null, targetScene);
    })
    .catch(err => callback(err));
}

let TikTokLiveConnection = null;
try {
  const tklib = require('tiktok-live-connector');
  TikTokLiveConnection = tklib.TikTokLiveConnection;
} catch (e) {}

let activeTiktokConn = null;
let activeTiktokStatus = { connected: false, username: null, error: null };

function handleTiktokConnect(username, callback) {
  if (!TikTokLiveConnection) {
    activeTiktokStatus = { connected: false, username, error: 'tiktok-live-connector yuklu degil' };
    return callback(new Error('TikTokLiveConnection not available'));
  }

  if (activeTiktokConn) {
    try { activeTiktokConn.disconnect(); } catch (e) {}
    activeTiktokConn = null;
  }

  const cleanUser = username.replace(/^@/, '').trim();
  const conn = new TikTokLiveConnection(cleanUser, {
    processInitialData: false,
    enableExtendedGiftInfo: true
  });

  conn.connect().then(state => {
    activeTiktokStatus = { connected: true, username: cleanUser, roomId: state.roomId, error: null };
    console.log(`[TIKTOK LIVE] @${cleanUser} canli yayinina baglandi! Room ID: ${state.roomId}`);
    eventQueue.push({
      type: 'LIVE_ALERT',
      alertType: 'follower',
      payload: { username: `@${cleanUser} Canlı Bağlandı!` },
      time: Date.now()
    });
    callback(null, state);
  }).catch(err => {
    activeTiktokStatus = { connected: false, username: cleanUser, error: err.message };
    console.error(`[TIKTOK LIVE] @${cleanUser} baglanti hatasi:`, err.message);
    callback(err);
  });

  conn.on('follow', data => {
    console.log(`[TIKTOK LIVE] Yeni Takipci: ${data.uniqueId}`);
    eventQueue.push({
      type: 'LIVE_ALERT',
      alertType: 'follower',
      payload: { username: data.uniqueId },
      time: Date.now()
    });
  });

  conn.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    const giftName = data.giftName || 'Hediye';
    const count = data.repeatCount || 1;
    const diamonds = (data.diamondCount || 1) * count;
    console.log(`[TIKTOK LIVE] Hediye: ${data.uniqueId} -> ${giftName} x${count}`);
    eventQueue.push({
      type: 'LIVE_ALERT',
      alertType: 'gift',
      payload: {
        username: data.uniqueId,
        giftName: `${giftName} (x${count})`,
        amount: `${diamonds} 💎`,
        diamonds: diamonds
      },
      time: Date.now()
    });
  });

  conn.on('chat', data => {
    eventQueue.push({
      type: 'TEST_CHAT',
      username: data.uniqueId,
      content: data.comment,
      badge: 'sub',
      time: Date.now()
    });
  });

  conn.on('disconnected', () => {
    activeTiktokStatus = { connected: false, username: cleanUser, error: 'Yayın sona erdi veya bağlantı koptu' };
  });

  activeTiktokConn = conn;
}

// ==========================================
// 0.3 ANA GALERİ ŞABLON KATALOĞU & KULLANICI GALERİSİ YÖNETİMİ
// ==========================================
const USER_GALLERY_PATH = path.join(__dirname, 'user-gallery.json');

const APP_GALLERY_CATALOG = [
  // --- 1. ŞAMPİYON SAHNE PAKETLERİ (HERO OVERLAYS) ---
  {
    id: 'tpl_hero_vexana',
    category: 'hero',
    name: 'Vexana — Necrokeep Sovereign',
    subtitle: 'Gotik Mor & Zümrüt Ruh Temalı 16:9 Tam Sahne Paketi',
    icon: '💀',
    badge: 'BÜYÜCÜ • MID LANE',
    previewImg: 'kick/vexana/assets/images/avatar.jpg',
    basePath: '{platform}/vexana/in-game.html',
    obsKey: 'vexana',
    config: {
      heroKey: 'vexana',
      title: 'VEXANA',
      streamerName: 'MİRA',
      roleBadge: 'BÜYÜCÜ (MAGE)',
      laneBadge: 'MID LANE',
      subtitleText: 'Necrokeep Sovereign',
      quote: '"Şafak Vadisi\'nde dirilen ruhlar kaderinizi mühürleyecek!"',
      primaryColor: '#a855f7',
      secondaryColor: '#10b981',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      showTopBar: true,
      showWebcam: true,
      showChat: true,
      showShowcase: true,
      showSocial: true,
      showMusic: true,
      showSkills: true,
      showParticles: true
    }
  },
  {
    id: 'tpl_hero_zetian',
    category: 'hero',
    name: 'Zetian — Celestial Empress',
    subtitle: 'İmparatoriçe Altın & Kızıl Anka Temalı 16:9 Tam Sahne Paketi',
    icon: '👑',
    badge: 'BÜYÜCÜ • IMPERIAL MID',
    previewImg: 'kick/zetian/assets/images/avatar.jpg',
    basePath: '{platform}/zetian/in-game.html',
    obsKey: 'zetian',
    config: {
      heroKey: 'zetian',
      title: 'ZETIAN',
      streamerName: 'MİRA',
      roleBadge: 'BURST MAGE',
      laneBadge: 'IMPERIAL MID',
      subtitleText: 'Celestial Empress',
      quote: '"Göklerin iradesi ve Anka\'nın ateşi önünde diz çökün!"',
      primaryColor: '#ffd700',
      secondaryColor: '#ef4444',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      showTopBar: true,
      showWebcam: true,
      showChat: true,
      showShowcase: true,
      showSocial: true,
      showMusic: true,
      showSkills: true,
      showParticles: true
    }
  },
  {
    id: 'tpl_hero_nana',
    category: 'hero',
    name: 'Nana — Sweet Leonin Mage',
    subtitle: 'Pastel Pembe & Gökyüzü Mavisi Molina Temalı 16:9 Tam Sahne Paketi',
    icon: '🐾',
    badge: 'BÜYÜCÜ / DESTEK',
    previewImg: 'kick/nana/assets/images/avatar.jpg',
    basePath: '{platform}/nana/in-game.html',
    obsKey: 'nana',
    config: {
      heroKey: 'nana',
      title: 'NANA',
      streamerName: 'MİRA',
      roleBadge: 'MAGE / SUPPORT',
      laneBadge: 'ROAM / MID',
      subtitleText: 'Sweet Leonin Spirit',
      quote: '"Molina seni yakalarsa sevimli bir پامuk şekere dönüşürsün!"',
      primaryColor: '#ff85a2',
      secondaryColor: '#60a5fa',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      showTopBar: true,
      showWebcam: true,
      showChat: true,
      showShowcase: true,
      showSocial: true,
      showMusic: true,
      showSkills: true,
      showParticles: true
    }
  },
  {
    id: 'tpl_hero_carmilla',
    category: 'hero',
    name: 'Carmilla — Shadow of Twilight',
    subtitle: 'Kan Kırmızısı & Gümüş Gotik Gül Temalı 16:9 Tam Sahne Paketi',
    icon: '🩸',
    badge: 'TANK / DESTEK • ROAM',
    previewImg: 'kick/carmilla/assets/images/avatar.jpg',
    basePath: '{platform}/carmilla/in-game.html',
    obsKey: 'carmilla',
    config: {
      heroKey: 'carmilla',
      title: 'CARMILLA',
      streamerName: 'MİRA',
      roleBadge: 'TANK / SUPPORT',
      laneBadge: 'ROAMER',
      subtitleText: 'Shadow of Twilight',
      quote: '"Kan Bağı kurulduğunda kaderimiz ve acımız bir olur!"',
      primaryColor: '#e11d48',
      secondaryColor: '#94a3b8',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      showTopBar: true,
      showWebcam: true,
      showChat: true,
      showShowcase: true,
      showSocial: true,
      showMusic: true,
      showSkills: true,
      showParticles: true
    }
  },
  {
    id: 'tpl_hero_atlas',
    category: 'hero',
    name: 'Atlas — Ocean Gladiator',
    subtitle: 'Okyanus Turkuazı & Derin Deniz Neon Temalı 16:9 Tam Sahne Paketi',
    icon: '⚓',
    badge: 'TANK • INITIATÖR',
    previewImg: 'kick/atlas/assets/images/avatar.jpg',
    basePath: '{platform}/atlas/in-game.html',
    obsKey: 'atlas',
    config: {
      heroKey: 'atlas',
      title: 'ATLAS',
      streamerName: 'MİRA',
      roleBadge: 'TANK / INITIATOR',
      laneBadge: 'ABYSSAL ROAM',
      subtitleText: 'Ocean Gladiator',
      quote: '"Derin okyanusun zincirlerinden kimse kaçamaz!"',
      primaryColor: '#00f5d4',
      secondaryColor: '#38bdf8',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      showTopBar: true,
      showWebcam: true,
      showChat: true,
      showShowcase: true,
      showSocial: true,
      showMusic: true,
      showSkills: true,
      showParticles: true
    }
  },

  // --- 2. YAYIN AKIŞ SAHNELERİ (STREAM SCENES) ---
  {
    id: 'tpl_scene_starting',
    category: 'scene',
    name: 'Yayın Başlıyor + Canlı Chat',
    subtitle: '5 Dakikalık Geri Sayım Sayacı, Müzik Ticker ve Sağda Canlı Sohbet Paneli',
    icon: '⏳',
    badge: 'BAŞLANGIÇ SAHNESİ',
    basePath: '{platform}/sahneler/1-yayin-basliyor.html',
    obsKey: '1-yayin-basliyor.html',
    config: {
      sceneKey: 'starting',
      title: 'YAYIN BAŞLIYOR',
      subtitleText: 'ŞAFAK VADİSİ\'NE İNİŞ İÇİN HAZIRLANIN...',
      countdownMinutes: 5,
      primaryColor: '#ff69b4',
      secondaryColor: '#a855f7',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      showChat: true,
      showMusic: true,
      showSocial: true
    }
  },
  {
    id: 'tpl_scene_chatting',
    category: 'scene',
    name: 'Just Chatting (Tam Ekran Kamera + Chat)',
    subtitle: 'Geniş Kamera Çerçevesi, Sosyal Medya Barı ve Yan Canlı Sohbet Paneli',
    icon: '💬',
    badge: 'SOHBET SAHNESİ',
    basePath: '{platform}/sahneler/2-sohbet.html',
    obsKey: '2-sohbet.html',
    config: {
      sceneKey: 'chatting',
      title: 'CANLI SOHBET & ISINMA',
      subtitleText: 'MİRA • MYTHIC GLORY STREAM',
      primaryColor: '#ff69b4',
      secondaryColor: '#a855f7',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      showWebcam: true,
      showChat: true,
      showSocial: true
    }
  },
  {
    id: 'tpl_scene_brb',
    category: 'scene',
    name: 'Kısa Mola (BRB) + Canlı Chat',
    subtitle: 'Yayın Sırasında Kısa Mola Kartı, Durum Rozeti ve Canlı Sohbet Akışı',
    icon: '☕',
    badge: 'MOLA SAHNESİ',
    basePath: '{platform}/sahneler/3-mola.html',
    obsKey: '3-mola.html',
    config: {
      sceneKey: 'brb',
      title: 'KISA BİR MOLA',
      subtitleText: 'HEMEN DÖNÜYORUM • AYRILMAYIN!',
      primaryColor: '#ff69b4',
      secondaryColor: '#10b981',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      showChat: true,
      showMusic: true,
      showSocial: true
    }
  },
  {
    id: 'tpl_scene_ending',
    category: 'scene',
    name: 'Yayın Bitti (Ending) + Canlı Chat',
    subtitle: 'Yayın Sonu Teşekkür Kartı, Sosyal Medya Hesapları ve Sohbet Paneli',
    icon: '🎬',
    badge: 'KAPANIŞ SAHNESİ',
    basePath: '{platform}/sahneler/4-yayin-bitti.html',
    obsKey: '4-yayin-bitti.html',
    config: {
      sceneKey: 'ending',
      title: 'YAYIN SONA ERDİ',
      subtitleText: 'İZLEDİĞİNİZ VE DESTEK OLDUĞUNUZ İÇİN TEŞEKKÜRLER! 💖',
      primaryColor: '#ff69b4',
      secondaryColor: '#ffd700',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      showChat: true,
      showSocial: true
    }
  },
  {
    id: 'tpl_scene_pc',
    category: 'scene',
    name: 'PC Oyun Sahnesi (Minimalist)',
    subtitle: 'Tam Ekran PC & Emülatör Oyunları İçin Minimalist Üst Bar ve Kamera',
    icon: '🖥️',
    badge: 'PC / GENEL OYUN',
    basePath: '{platform}/sahneler/oyun-pc.html',
    obsKey: 'oyun-pc.html',
    config: {
      sceneKey: 'pc',
      title: 'MİRA LIVE',
      subtitleText: 'PRO GAMING STREAM',
      primaryColor: '#ff69b4',
      secondaryColor: '#53fc18',
      showWebcam: true,
      showTopBar: true,
      showGoal: true
    }
  },

  // --- 3. MODÜLER KARTLAR & WIDGET'LAR (STANDALONE CARDS) ---
  {
    id: 'tpl_card_showcase',
    category: 'card',
    name: 'Hero & Yayıncı Vitrin Kartı',
    subtitle: 'Portre Görseli, Rol Rozetleri ve Özel Söz İçeren Şeffaf OBS Kartı',
    icon: '🃏',
    badge: 'MODÜLER KART',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'showcase',
      title: 'VEXANA',
      streamerName: 'MİRA',
      subtitleText: 'Necrokeep Sovereign',
      roleBadge: 'BÜYÜCÜ (MAGE)',
      laneBadge: 'MID LANE',
      quote: '"Şafak Vadisi\'nde dirilen ruhlar kaderinizi mühürleyecek!"',
      avatarUrl: 'kick/vexana/assets/images/portrait.jpg',
      primaryColor: '#a855f7',
      secondaryColor: '#10b981',
      cardPosition: 'center'
    }
  },
  {
    id: 'tpl_card_webcam',
    category: 'card',
    name: 'Neon Kamera Çerçevesi (Webcam)',
    subtitle: 'Kulak/Taç Süslemeli, Yayıncı İsim ve Rütbe Etiketli Bağımsız Kamera Çerçevesi',
    icon: '📷',
    badge: 'WEBCAM WIDGET',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'webcam',
      title: 'MİRA CAM',
      streamerName: 'MİRA LIVE',
      subtitleText: 'MYTHIC GLORY',
      primaryColor: '#a855f7',
      secondaryColor: '#ffd700',
      cardPosition: 'bottom-left'
    }
  },
  {
    id: 'tpl_card_social',
    category: 'card',
    name: 'Sosyal Medya & Topluluk Kartı',
    subtitle: 'Kick, TikTok ve YouTube Hesaplarını Gösteren Kompakt Neon Kart',
    icon: '🌐',
    badge: 'SOSYAL KART',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'social',
      title: 'SOSYAL MEDYA & TOPLULUK',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      primaryColor: '#a855f7',
      secondaryColor: '#53fc18',
      cardPosition: 'center'
    }
  },
  {
    id: 'tpl_card_skills',
    category: 'card',
    name: '4\'lü Skill & Yetenek Rehberi Kartı',
    subtitle: 'Pasif, Skill 1, Skill 2 ve Ulti Açıklamalarını Gösteren Geniş Bilgi Masası',
    icon: '⚡',
    badge: 'YETENEK REHBERİ',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'skills',
      title: 'ŞAMPİYON YETENEK REHBERİ',
      subtitleText: 'ŞAFAK VADİSİ COMBAT',
      skillPassiveTitle: 'Çürüyen Büyü (Pasif)',
      skillPassiveDesc: 'Düşmanlara lanet uygular, katledilen birimler patlayarak büyü hasarı verir.',
      skill1Title: 'Ölümcül Pençe (Skill 1)',
      skill1Desc: 'Hayalet pençesi fırlatır ve isabet alan hedefi korkutur (CC).',
      skill2Title: 'Lanetli Patlama (Skill 2)',
      skill2Desc: 'Hedef alana gölge büyüsü mühürler ve devasa alan hasarı vurur.',
      skillUltiTitle: 'Ölümsüz Muhafız (Ulti)',
      skillUltiDesc: 'Devasa muhafız çağırarak rakipleri havaya savurur ve 15 sn savaşır.',
      primaryColor: '#a855f7',
      secondaryColor: '#ffd700',
      cardPosition: 'bottom-center'
    }
  },
  {
    id: 'tpl_card_music',
    category: 'card',
    name: 'Now Playing & Ses Dalgası Kartı',
    subtitle: 'Tuna / Spotify Canlı Şarkı Adı ve 16 Çubuklu Dinamik Ekolayzer Kartı',
    icon: '🎵',
    badge: 'MÜZİK WIDGET',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'music',
      title: 'ŞU AN ÇALAN (NOW PLAYING)',
      subtitleText: '48kHz HD Stereo • Canlı Yayın Fon Müziği',
      primaryColor: '#a855f7',
      secondaryColor: '#10b981',
      cardPosition: 'bottom-left'
    }
  },
  {
    id: 'tpl_card_goal',
    category: 'card',
    name: 'Canlı Takipçi & Bağış Hedef Barı',
    subtitle: 'Otomatik Dolum Efektli ve Yüzde Göstergeli Şeffaf Hedef Çubuğu',
    icon: '🎯',
    badge: 'HEDEF WIDGET',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'goal',
      title: 'TAKİPÇİ HEDEFİ',
      goalCurrent: 154,
      goalTarget: 200,
      primaryColor: '#a855f7',
      secondaryColor: '#10b981',
      cardPosition: 'top-right'
    }
  },

  // --- 4. CANLI ALERT & BİLDİRİM ŞABLONLARI (ALERTS) ---
  {
    id: 'tpl_alert_follower',
    category: 'alert',
    name: 'Yeni Takipçi Alert Şablonu',
    subtitle: 'Takipçi Geldiğinde Ses Efektli ve Neon Parlamalı Kutlama Kartı',
    icon: '💜',
    badge: 'TAKİPÇİ ALERTİ',
    basePath: 'custom-overlay.html',
    config: {
      alertType: 'follower',
      headerTag: 'YENİ TAKİPÇİ!',
      sampleUser: 'SelinGamer',
      subTitle: 'Ailemize Hoş Geldin!',
      message: 'Şafak Vadisi\'ne katıldığın için teşekkürler!',
      soundType: 'follower',
      durationSec: 5,
      primaryColor: '#a855f7',
      secondaryColor: '#10b981'
    }
  },
  {
    id: 'tpl_alert_sub',
    category: 'alert',
    name: 'Yeni Abone (VIP Sub) Alert Şablonu',
    subtitle: 'Kick/TikTok Aboneliğinde Çalan Fanfar Sesli Özel Bildirim',
    icon: '🌟',
    badge: 'ABONE ALERTİ',
    basePath: 'custom-overlay.html',
    config: {
      alertType: 'sub',
      headerTag: 'YENİ VIP ABONE!',
      sampleUser: 'NecroLord',
      subTitle: '1. Ay VIP Aboneliği Başlattı!',
      message: 'Harika yayınlar, tam destek!',
      soundType: 'sub',
      durationSec: 5,
      primaryColor: '#53fc18',
      secondaryColor: '#ffd700'
    }
  },
  {
    id: 'tpl_alert_donation',
    category: 'alert',
    name: 'Bağış & Destek Alert Şablonu',
    subtitle: 'Bağış Geldiğinde Tutar ve İzleyici Mesajını Gösteren Altın Bildirim',
    icon: '💎',
    badge: 'BAĞIŞ ALERTİ',
    basePath: 'custom-overlay.html',
    config: {
      alertType: 'donation',
      headerTag: 'BAĞIŞ / DESTEK!',
      sampleUser: 'MiraFan_01',
      amountText: '250 ₺',
      subTitle: '250 ₺ Bağış Yaptı!',
      message: 'Vexana komboların efsane, başarılar!',
      soundType: 'donation',
      durationSec: 6,
      primaryColor: '#ffd700',
      secondaryColor: '#ef4444'
    }
  },
  {
    id: 'tpl_alert_gift',
    category: 'alert',
    name: 'TikTok Hediye Alert Şablonu',
    subtitle: 'TikTok Canlı Yayınında Gül, Aslan veya Elmas Geldiğinde Çıkan Özel Alert',
    icon: '🌹',
    badge: 'TIKTOK HEDİYE',
    basePath: 'custom-overlay.html',
    config: {
      alertType: 'gift',
      headerTag: 'TIKTOK HEDİYESİ!',
      sampleUser: 'Elif_MLBB',
      giftName: 'Gül Kutusu (x25)',
      subTitle: 'Gül Kutusu (x25) Gönderdi! 🌹',
      message: 'TikTok Live üzerinden hediye gönderdi!',
      soundType: 'donation',
      durationSec: 5,
      primaryColor: '#00f2fe',
      secondaryColor: '#ff0050'
    }
  }
];

function loadUserGallery() {
  if (!fs.existsSync(USER_GALLERY_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(USER_GALLERY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveUserGallery(items) {
  try {
    fs.writeFileSync(USER_GALLERY_PATH, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[GALLERY] Kaydetme hatasi:', e.message);
    return false;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;

  // Geriye dönük uyumluluk: /vexana/... -> /kick/vexana/...
  const legacyMatch = pathname.match(/^\/(vexana|zetian|nana|carmilla|atlas)(\/.*)?$/);
  if (legacyMatch) {
    const hero = legacyMatch[1];
    const subpath = legacyMatch[2] || '/in-game.html';
    res.writeHead(302, { 'Location': `/kick/${hero}${subpath}` });
    return res.end();
  }

  // Geriye dönük uyumluluk: /scenes/... -> /kick/sahneler/...
  const sceneMatch = pathname.match(/^\/scenes\/(.*)$/);
  if (sceneMatch) {
    const map = {
      '1-starting-soon.html': '/kick/sahneler/1-yayin-basliyor.html',
      '2-just-chatting.html': '/kick/sahneler/2-sohbet.html',
      '4-brb.html': '/kick/sahneler/3-mola.html',
      '5-ending.html': '/kick/sahneler/4-yayin-bitti.html'
    };
    const target = map[sceneMatch[1]] || '/kick/sahneler/1-yayin-basliyor.html';
    res.writeHead(302, { 'Location': target });
    return res.end();
  }

  // 1. API: Test Alert Al
  if (pathname === '/api/test-alert' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const eventItem = { ...data, time: Date.now() };
        eventQueue.push(eventItem);
        if (eventQueue.length > 60) eventQueue.shift();

        if (data.type === 'SET_CHAT_WIDGET') {
          const widgetTxtPath = path.join(__dirname, 'chat-widget.txt');
          try { fs.writeFileSync(widgetTxtPath, (data.url || '').trim(), 'utf-8'); } catch(e){}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2. API: Polling Olayları
  if (pathname === '/api/poll' && req.method === 'GET') {
    const since = parseInt(parsedUrl.searchParams.get('since') || '0', 10);
    const matching = eventQueue.filter(ev => ev.time > since);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ events: matching }));
  }

  // 2.2 API: TikTok Canlı Bağlantısı
  if (pathname === '/api/tiktok/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.username) throw new Error('Kullanıcı adı belirtilmedi');
        handleTiktokConnect(data.username, (err, state) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, username: data.username, roomId: state ? state.roomId : null }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/tiktok/disconnect' && req.method === 'POST') {
    if (activeTiktokConn) {
      try { activeTiktokConn.disconnect(); } catch (e) {}
      activeTiktokConn = null;
    }
    activeTiktokStatus = { connected: false, username: null, error: null };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true }));
  }

  if (pathname === '/api/tiktok/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(activeTiktokStatus));
  }

  // 2.3 API: TikFinity / BotRix / Genel Webhook Alıcısı
  if (pathname === '/api/webhook' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const eventType = (data.event || data.type || '').toLowerCase();
        let alertType = 'follower';
        let alertPayload = { username: data.user || data.username || data.nickname || 'İzleyici' };

        if (eventType.includes('gift') || eventType.includes('donation') || eventType.includes('tip')) {
          alertType = 'gift';
          alertPayload.giftName = data.gift || data.giftName || data.name || 'Hediye';
          alertPayload.amount = data.amount || `${data.diamonds || 100} 💎`;
          alertPayload.diamonds = data.diamonds || 100;
        } else if (eventType.includes('sub')) {
          alertType = 'sub';
          alertPayload.months = data.months || 1;
        }

        eventQueue.push({
          type: 'LIVE_ALERT',
          alertType: alertType,
          payload: alertPayload,
          time: Date.now()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.4 API: Kick Kanal Bilgisi Proxy (CORS engelsiz chatroom ID çözümü)
  if (pathname === '/api/kick/channel' && req.method === 'GET') {
    const slug = (parsedUrl.searchParams.get('slug') || 'zeuslive').replace(/[^a-zA-Z0-9_-]/g, '');
    const options = {
      hostname: 'kick.com',
      path: `/api/v2/channels/${encodeURIComponent(slug)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    });
    proxyReq.end();
    return;
  }

  // 2.1 API: Müzik / Now Playing Al & Güncelle (Spotify / Snip / Tuna entegrasyonu)
  if (pathname === '/api/now-playing') {
    const txtPath = path.join(__dirname, 'now-playing.txt');
    if (req.method === 'GET') {
      if (fs.existsSync(txtPath)) {
        try {
          const content = fs.readFileSync(txtPath, 'utf-8').trim();
          if (content) currentSongTitle = content;
        } catch (e) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ title: currentSongTitle }));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.title) {
            currentSongTitle = data.title;
            try { fs.writeFileSync(txtPath, currentSongTitle, 'utf-8'); } catch(e){}
            eventQueue.push({ type: 'UPDATE_SONG', title: currentSongTitle, time: Date.now() });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, title: currentSongTitle }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.5 API: Chat Widget URL Al & Güncelle (BotRix / TikFinity kalıcılığı)
  if (pathname === '/api/chat-widget') {
    const widgetTxtPath = path.join(__dirname, 'chat-widget.txt');
    if (req.method === 'GET') {
      let widgetUrl = '';
      if (fs.existsSync(widgetTxtPath)) {
        try { widgetUrl = fs.readFileSync(widgetTxtPath, 'utf-8').trim(); } catch (e) {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ url: widgetUrl }));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const newUrl = (data.url || '').trim();
          try { fs.writeFileSync(widgetTxtPath, newUrl, 'utf-8'); } catch(e){}
          eventQueue.push({ type: 'SET_CHAT_WIDGET', url: newUrl, time: Date.now() });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: newUrl }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.6 API: Yerel Ağ LAN IP (Mobil Kumanda / Tablet Stream Deck)
  if (pathname === '/api/lan-ip' && req.method === 'GET') {
    const lanIp = getLocalNetworkIp();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ip: lanIp,
      port: PORT,
      mobileUrl: `http://${lanIp}:${PORT}/`
    }));
  }

  // 2.7 API: OBS WebSocket Durumu
  if (pathname === '/api/obs/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      connected: obsWsConnected,
      currentScene: obsCurrentScene
    }));
  }

  // 2.8 API: OBS Sahnesi Değiştir (Otomatik Sahne Geçişi)
  if (pathname === '/api/obs/set-scene' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const target = OBS_SCENE_MAP[data.sceneKey] || data.sceneName || data.scene;
        if (!target) throw new Error('Geçersiz sahne');

        if (!obsWsConnected) {
          return res.end(JSON.stringify({
            success: false,
            obsConnected: false,
            message: 'OBS WebSocket şu anda bağlı değil (OBS açık mı?)',
            requestedScene: target
          }));
        }

        setObsScene(target, (err, current) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, obsConnected: true, scene: current }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // 2.9 API: ANA GALERİ & KULLANICI GALERİSİ (CRUD)
  // ==========================================
  // Ana Galeri (Uygulama Şablon Kataloğu)
  if (pathname === '/api/gallery/catalog' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ items: APP_GALLERY_CATALOG }));
  }

  // Kullanıcının Kendi Galerisi (Liste)
  if (pathname === '/api/gallery/user' && req.method === 'GET') {
    const items = loadUserGallery();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ items }));
  }

  // Tekil Öğe Getir (Hem kullanıcı galerisi hem ana galeri şablonu destekler)
  if (pathname.startsWith('/api/gallery/item/') && req.method === 'GET') {
    const itemId = decodeURIComponent(pathname.replace('/api/gallery/item/', '')).trim();
    const userItems = loadUserGallery();
    let found = userItems.find(x => x.id === itemId);
    if (!found) {
      found = APP_GALLERY_CATALOG.find(x => x.id === itemId);
    }
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Öğe bulunamadı' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ item: found }));
  }

  // Kullanıcının Galerisine Yeni Öğe Kaydet (Ana Galeriden veya Boş Tuvalden)
  if (pathname === '/api/gallery/user' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const userItems = loadUserGallery();

        let newItem = null;
        if (data.templateId) {
          const tpl = APP_GALLERY_CATALOG.find(t => t.id === data.templateId);
          if (!tpl) throw new Error('Şablon bulunamadı');
          const uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          newItem = {
            id: uid,
            templateId: tpl.id,
            category: tpl.category,
            name: data.customName || tpl.name,
            subtitle: data.customSubtitle || tpl.subtitle,
            icon: data.icon || tpl.icon,
            badge: data.badge || tpl.badge,
            previewImg: tpl.previewImg || null,
            basePath: tpl.basePath,
            obsKey: tpl.obsKey || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            config: JSON.parse(JSON.stringify({ ...tpl.config, ...(data.config || {}) }))
          };
        } else {
          // Boş Tuval (Blank Canvas) veya Özel Oluşturulan Öğe
          const uid = 'canvas_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          newItem = {
            id: uid,
            templateId: 'blank_canvas',
            category: data.category || 'canvas',
            name: data.name || 'Özel Tasarım Sahne',
            subtitle: data.subtitle || 'Boş Tuval ile Sıfırdan Oluşturuldu',
            icon: data.icon || '🎨',
            badge: data.badge || 'ÖZEL TUVAL',
            previewImg: null,
            basePath: 'custom-overlay.html',
            obsKey: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            config: data.config || {}
          };
        }

        userItems.push(newItem);
        saveUserGallery(userItems);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: newItem, items: userItems }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Kullanıcının Galerisindeki Öğeyi Düzenle / Güncelle
  if (pathname.startsWith('/api/gallery/user/') && req.method === 'PUT') {
    const itemId = decodeURIComponent(pathname.replace('/api/gallery/user/', '')).trim();
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const userItems = loadUserGallery();
        const idx = userItems.findIndex(x => x.id === itemId);
        if (idx === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Öğe bulunamadı' }));
        }

        const current = userItems[idx];
        const updatedItem = {
          ...current,
          name: updates.name !== undefined ? updates.name : current.name,
          subtitle: updates.subtitle !== undefined ? updates.subtitle : current.subtitle,
          icon: updates.icon !== undefined ? updates.icon : current.icon,
          badge: updates.badge !== undefined ? updates.badge : current.badge,
          updatedAt: Date.now(),
          config: {
            ...(current.config || {}),
            ...(updates.config || {})
          }
        };

        userItems[idx] = updatedItem;
        saveUserGallery(userItems);

        // Canlı yayındaki ve önizlemedeki sahnelere anında bildir
        eventQueue.push({
          type: 'USER_ITEM_UPDATED',
          itemId: updatedItem.id,
          item: updatedItem,
          time: Date.now()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: updatedItem, items: userItems }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Kullanıcının Galerisinden Öğe Sil
  if (pathname.startsWith('/api/gallery/user/') && req.method === 'DELETE') {
    const itemId = decodeURIComponent(pathname.replace('/api/gallery/user/', '')).trim();
    const userItems = loadUserGallery();
    const filtered = userItems.filter(x => x.id !== itemId);
    saveUserGallery(filtered);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, items: filtered }));
  }

  // 3. Statik Dosyalar
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`Dosya bulunamadı: ${pathname}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[INFO] Port ${PORT} meşgul. Mevcut çalışan sunucu aktif kalacak.`);
  } else {
    console.error('Sunucu hatası:', err);
  }
});

function startServer(portToTry) {
  server.listen(portToTry, '0.0.0.0', () => {
    console.log('======================================================');
    console.log(` 🌸 MLBB 5-HERO KONSEPT YAYIN SUNUCUSU (PORT: ${portToTry})`);
    console.log(` 🎛️ Kontrol Masası:  http://localhost:${portToTry}`);
    console.log(' --- 🟢 KICK YAYIN SAHNELERİ ---');
    console.log(` 💀 Vexana (Kick):   http://localhost:${portToTry}/kick/vexana/in-game.html`);
    console.log(` 👑 Zetian (Kick):   http://localhost:${portToTry}/kick/zetian/in-game.html`);
    console.log(` 🐾 Nana (Kick):     http://localhost:${portToTry}/kick/nana/in-game.html`);
    console.log(` 🩸 Carmilla (Kick): http://localhost:${portToTry}/kick/carmilla/in-game.html`);
    console.log(` ⚓ Atlas (Kick):    http://localhost:${portToTry}/kick/atlas/in-game.html`);
    console.log(' --- 📱 TIKTOK LIVE SAHNELERİ ---');
    console.log(` 💀 Vexana (TikTok): http://localhost:${portToTry}/tiktok/vexana/in-game.html`);
    console.log(` 👑 Zetian (TikTok): http://localhost:${portToTry}/tiktok/zetian/in-game.html`);
    console.log(` 🐾 Nana (TikTok):   http://localhost:${portToTry}/tiktok/nana/in-game.html`);
    console.log(` 🩸 Carmilla (TikTok): http://localhost:${portToTry}/tiktok/carmilla/in-game.html`);
    console.log(` ⚓ Atlas (TikTok):  http://localhost:${portToTry}/tiktok/atlas/in-game.html`);
    console.log('======================================================\n');
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = { server, startServer, getLocalNetworkIp, OBS_SCENE_MAP };

