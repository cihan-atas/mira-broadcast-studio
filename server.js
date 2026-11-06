const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Yazılabilir kullanıcı verisi dizini (kurulu uygulamada __dirname salt-okunur olabilir: asar / Program Files)
const DATA_DIR = process.env.MIRA_DATA_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}

let PORT = process.env.PORT || 8080;
const eventQueue = [];
let currentSongTitle = "♪ MLBB Arena - Necrokeep Lo-Fi Chill Beats";
let currentSongArtist = "MİRA Broadcast Studio";
let currentSongProgress = 45; // Saniye cinsinden
let currentSongDuration = 210; // Saniye cinsinden (3:30)
let currentSongStatus = "playing";
let currentSongCover = "";
let currentSongLastUpdate = Date.now();

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
// 0.2 OBS WebSocket 5.0 Otomatik Entegrasyonu & Universal WebSocket Client
// ==========================================
const WebSocketClient = (typeof WebSocket !== 'undefined' ? WebSocket : null) || (() => {
  try { return require('ws'); } catch (e) { return null; }
})();

let OBSWebSocket = null;
try {
  OBSWebSocket = require('obs-websocket-js').OBSWebSocket;
} catch (e) {}

let obsWsClient = null;
let obsWsConnected = false;
let obsWsConnecting = false;
let obsCurrentScene = null;
let obsWsPort = 4455;
let obsWsPassword = '';
let obsNativeConfigInfo = { found: false, serverEnabled: true, authRequired: false, port: 4455, hasPassword: false };

function getObsWebSocketConfigPaths() {
  const home = os.homedir();
  const paths = [];
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    paths.push(path.join(appData, 'obs-studio', 'plugin_config', 'obs-websocket', 'config.json'));
  } else if (process.platform === 'darwin') {
    paths.push(path.join(home, 'Library', 'Application Support', 'obs-studio', 'plugin_config', 'obs-websocket', 'config.json'));
  } else {
    paths.push(path.join(home, '.config', 'obs-studio', 'plugin_config', 'obs-websocket', 'config.json'));
    paths.push(path.join(home, '.var', 'app', 'com.obsproject.Studio', 'config', 'obs-studio', 'plugin_config', 'obs-websocket', 'config.json'));
    paths.push(path.join(home, 'snap', 'obs-studio', 'current', '.config', 'obs-studio', 'plugin_config', 'obs-websocket', 'config.json'));
  }
  return paths;
}

function readAndAutoEnableObsNativeConfig() {
  const cfgPaths = getObsWebSocketConfigPaths();
  for (const p of cfgPaths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const wasEnabled = parsed.server_enabled !== false;
          // Eğer OBS WebSocket sunucusu kapalıysa config dosyasında otomatik etkinleştir (OBS açıldığında hazır olsun)
          if (parsed.server_enabled === false) {
            try {
              parsed.server_enabled = true;
              parsed.alerts_enabled = false;
              fs.writeFileSync(p, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch (e) {}
          }
          obsNativeConfigInfo = {
            found: true,
            configPath: p,
            serverEnabled: wasEnabled,
            authRequired: !!parsed.auth_required,
            port: parseInt(parsed.server_port, 10) || 4455,
            password: parsed.server_password || '',
            hasPassword: !!(parsed.auth_required && parsed.server_password)
          };
          return obsNativeConfigInfo;
        }
      }
    } catch (e) {}
  }
  return obsNativeConfigInfo;
}

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

async function ensureObsDesktopAudioHealthy() {
  if (!obsWsClient || !obsWsConnected) return;
  try {
    const special = await obsWsClient.call('GetSpecialInputs').catch(() => ({}));
    const candidates = [
      special.desktop1,
      special.desktop2,
      'Desktop Audio',
      'Masaüstü Sesi',
      'Masaüstü Ses'
    ].filter(Boolean);
    for (const name of [...new Set(candidates)]) {
      try {
        const muteInfo = await obsWsClient.call('GetInputMute', { inputName: name }).catch(() => null);
        if (muteInfo && muteInfo.inputMuted) {
          await obsWsClient.call('SetInputMute', { inputName: name, inputMuted: false }).catch(() => {});
        }
        const volInfo = await obsWsClient.call('GetInputVolume', { inputName: name }).catch(() => null);
        if (volInfo && typeof volInfo.inputVolumeMul === 'number') {
          if (!obsIsDucked) {
            if (obsSavedMusicVolumeInitialized && typeof obsSavedMusicVolume === 'number') {
              // Kullanıcı daha önce bir ses seviyesi ayarladıysa onu koru ve uygula
              await obsWsClient.call('SetInputVolume', { inputName: name, inputVolumeMul: obsSavedMusicVolume }).catch(() => {});
            } else {
              // Kullanıcı henüz bir seviye seçmediyse OBS'in mevcut seviyesini benimse
              obsSavedMusicVolume = volInfo.inputVolumeMul;
              obsSavedMusicVolumeInitialized = true;
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
}

async function connectObsWebSocket(port = obsWsPort, password = obsWsPassword) {
  if (!OBSWebSocket) return false;
  if (obsWsConnected && obsWsClient) return true;
  if (obsWsConnecting) return false;
  obsWsConnecting = true;

  try {
    const nativeCfg = readAndAutoEnableObsNativeConfig();
    const targetPort = parseInt(port || (studioStats?.obs?.port) || nativeCfg.port || 4455, 10) || 4455;
    const userPass = (password !== undefined && password !== '') ? password : (studioStats?.obs?.password || '');
    const nativePass = nativeCfg.password || '';

    obsWsPort = targetPort;
    if (userPass) obsWsPassword = userPass;
    else if (nativePass) obsWsPassword = nativePass;

    // Denenecek (host, şifre) kombinasyonları — hem IPv4 (127.0.0.1) hem IPv6/localhost hem otomatik OBS şifresi
    const passCandidates = [...new Set([userPass, nativePass, ''].filter(v => v !== undefined))];
    const hostCandidates = ['127.0.0.1', 'localhost'];

    for (const host of hostCandidates) {
      for (const pass of passCandidates) {
        const client = new OBSWebSocket();
        const url = `ws://${host}:${targetPort}`;
        try {
          await client.connect(url, pass || undefined);
          obsWsClient = client;
          obsWsConnected = true;
          obsWsPassword = pass || '';
          obsNativeConfigInfo.serverEnabled = true;
          console.log(`[OBS WS] OBS Studio WebSocket bağlantısı kuruldu (${url})`);

          client.on('ConnectionClosed', () => {
            obsWsConnected = false;
            obsWsClient = null;
          });

          client.on('CurrentProgramSceneChanged', data => {
            obsCurrentScene = data.sceneName;
          });

          try {
            const sceneData = await client.call('GetCurrentProgramScene');
            obsCurrentScene = sceneData.currentProgramSceneName;
          } catch (e) {}

          ensureObsDesktopAudioHealthy();
          obsWsConnecting = false;
          return true;
        } catch (err) {
          try { client.disconnect(); } catch (e) {}
        }
      }
    }
  } catch (e) {}

  obsWsClient = null;
  obsWsConnected = false;
  obsWsConnecting = false;
  return false;
}

setInterval(() => {
  if (!obsWsConnected) connectObsWebSocket();
}, 4000);
setTimeout(() => connectObsWebSocket(), 300);

// ========================================================
// 0.2 TUNA (OBS 1608) VE SPOTIFY CANLI ARKA PLAN SENKRONİZASYONU
// ========================================================
let isTunaOnline = false;
let tunaPort = 1608;
let lastKnownFileContent = '';

function pollTunaBackground() {
  const reqTuna = http.get({
    hostname: '127.0.0.1',
    port: tunaPort,
    path: '/',
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'MiraBroadcastStudio/1.1'
    }
  }, (tRes) => {
    let tBody = '';
    tRes.on('data', chunk => tBody += chunk);
    tRes.on('end', () => {
      try {
        const parsed = JSON.parse(tBody);
        if (parsed && (parsed.title || parsed.song)) {
          isTunaOnline = true;
          const rawTitle = (parsed.title || parsed.song || '').trim();
          const rawArtist = Array.isArray(parsed.artists) ? parsed.artists.join(', ') : (parsed.artist || '').trim();

          const rawDurMs = typeof parsed.duration === 'number' ? parsed.duration : (parsed.duration_ms || 0);
          const rawProgMs = typeof parsed.progress === 'number' ? parsed.progress : (parsed.progress_ms || 0);

          const durSec = rawDurMs > 0 ? (rawDurMs > 1000 ? Math.floor(rawDurMs / 1000) : rawDurMs) : 210;
          const progSec = rawProgMs >= 0 ? (rawProgMs > 1000 ? Math.floor(rawProgMs / 1000) : rawProgMs) : 0;
          const status = parsed.status || (rawProgMs > 0 ? 'playing' : 'paused');

          const formattedTitle = rawArtist ? `♪ ${rawArtist} - ${rawTitle}` : `♪ ${rawTitle}`;
          const titleChanged = (currentSongTitle !== formattedTitle);

          currentSongTitle = formattedTitle;
          currentSongArtist = rawArtist || 'Spotify Canlı';
          currentSongCover = (parsed.cover_path || parsed.cover_url || '').trim();
          currentSongDuration = durSec;
          currentSongProgress = progSec;
          currentSongStatus = status;
          currentSongLastUpdate = Date.now();

          // now-playing.txt senkronu
          const txtPath = path.join(DATA_DIR, 'now-playing.txt');
          try {
            const curTxt = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf-8').trim() : '';
            if (curTxt !== formattedTitle) {
              fs.writeFileSync(txtPath, formattedTitle, 'utf-8');
            }
          } catch(e) {}

          // OBS Metin kaynağını otomatik güncelle
          if (titleChanged && obsWsClient && obsWsConnected) {
            setObsTextSource('Now Playing', currentSongTitle);
          }

          // Canlı event yayını
          eventQueue.push({
            type: 'UPDATE_SONG',
            title: currentSongTitle,
            artist: currentSongArtist,
            coverUrl: currentSongCover || '/api/tuna/cover',
            progress: currentSongProgress,
            duration: currentSongDuration,
            status: currentSongStatus,
            source: 'tuna',
            time: Date.now()
          });
        }
      } catch (e) {
        checkNowPlayingFileFallback();
      }
    });
  });

  reqTuna.on('error', () => {
    isTunaOnline = false;
    checkNowPlayingFileFallback();
  });

  reqTuna.setTimeout(1200, () => {
    reqTuna.destroy();
  });
}

function checkNowPlayingFileFallback() {
  const home = os.homedir();
  const candidateFiles = [
    path.join(DATA_DIR, 'now-playing.txt'),
    path.join(__dirname, 'now-playing.txt'),
    path.join(home, 'Desktop', 'now-playing.txt'),
    path.join(home, 'Documents', 'now-playing.txt'),
    path.join(home, 'Desktop', 'song.txt')
  ];
  for (const txtPath of candidateFiles) {
    if (fs.existsSync(txtPath)) {
      try {
        const content = fs.readFileSync(txtPath, 'utf-8').trim();
        if (content && content !== lastKnownFileContent && !content.includes('MLBB Arena - Lo-Fi')) {
          lastKnownFileContent = content;
          currentSongTitle = content.startsWith('♪') ? content : `♪ ${content}`;
          currentSongProgress = 0;
          currentSongLastUpdate = Date.now();
          currentSongStatus = 'playing';

          eventQueue.push({
            type: 'UPDATE_SONG',
            title: currentSongTitle,
            artist: currentSongArtist,
            progress: 0,
            duration: currentSongDuration || 210,
            status: 'playing',
            source: 'file',
            time: Date.now()
          });

          if (obsWsClient && obsWsConnected) {
            setObsTextSource('Now Playing', currentSongTitle);
          }
          break;
        }
      } catch(e) {}
    }
  }
}

setInterval(pollTunaBackground, 1500);
pollTunaBackground();

// ========================================================
// 0.3 CANLI YAYIN HEDEF & İSTATİSTİK (STREAM STATS & GOALS)
// ========================================================
const streamStatsFile = path.join(DATA_DIR, 'stream-stats.json');
let studioStats = {
  streamer: {
    username: '',
    kickSlug: ''
  },
  obs: {
    port: 4455,
    password: ''
  },
  goal: {
    title: 'TAKİPÇİ HEDEFİ',
    current: 1,
    target: 50,
    type: 'follower',
    autoSyncKick: true
  },
  recent: {
    follower: '-',
    sub: '-',
    donation: '-',
    gift: '-'
  },
  session: {
    followers: 0,
    subs: 0,
    kicks: 0,
    gifts: 0,
    startedAt: Date.now()
  }
};

function loadStreamStats() {
  try {
    if (fs.existsSync(streamStatsFile)) {
      const raw = fs.readFileSync(streamStatsFile, 'utf-8');
      const parsed = JSON.parse(raw);
      studioStats = {
        streamer: { ...studioStats.streamer, ...(parsed.streamer || {}) },
        obs: { ...studioStats.obs, ...(parsed.obs || {}) },
        goal: { ...studioStats.goal, ...(parsed.goal || {}) },
        recent: { ...studioStats.recent, ...(parsed.recent || {}) },
        session: { ...studioStats.session, ...(parsed.session || {}) }
      };
      if (studioStats.streamer && studioStats.streamer.kickSlug) {
        const curName = (studioStats.streamer.username || '').trim();
        if (!curName || curName === 'Yayıncı' || curName === 'MİRA') {
          studioStats.streamer.username = studioStats.streamer.kickSlug;
        }
      }
      if (studioStats.obs && studioStats.obs.port) {
        obsWsPort = studioStats.obs.port;
      }
      if (studioStats.obs && studioStats.obs.password !== undefined) {
        obsWsPassword = studioStats.obs.password;
      }
    }
  } catch(e) {}
}

function saveStreamStats() {
  try {
    fs.writeFileSync(streamStatsFile, JSON.stringify(studioStats, null, 2), 'utf-8');
  } catch(e) {}
}

loadStreamStats();

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

function setObsTextSource(sourceName, text, callback) {
  if (!obsWsConnected || !obsWsClient) {
    if (callback) callback(new Error('OBS WebSocket bağlı değil'));
    return;
  }
  const targets = [sourceName, 'Now Playing', 'Müzik Başlığı', 'Music Title', 'NowPlaying', 'Şu An Çalan', 'Calan Sarki', 'Müzik'].filter(Boolean);
  let updated = false;
  let remaining = targets.length;

  targets.forEach(target => {
    obsWsClient.call('SetInputSettings', {
      inputName: target,
      inputSettings: { text: text }
    }).then(() => {
      updated = true;
    }).catch(() => {})
    .finally(() => {
      remaining--;
      if (remaining === 0 && callback) {
        callback(null, { success: updated });
      }
    });
  });
}

let obsSavedMusicVolume = 1.0;
let obsSavedMusicVolumeInitialized = false;
let obsIsDucked = false;
let obsDuckingRefCount = 0;
let obsUnduckTimer = null;

function parseCount(val) {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = parseInt(val.replace(/[^0-9-]/g, ''), 10);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

// Windows & Linux Çoklu Dil + GetSpecialInputs Destekli OBS Ses Ayarlama Yardımcısı
async function getObsAudioCandidateNames(inputName) {
  const candidates = [inputName];
  if (obsWsClient && obsWsConnected) {
    try {
      const special = await obsWsClient.call('GetSpecialInputs').catch(() => ({}));
      if (!inputName || inputName === 'Desktop Audio' || inputName.toLowerCase().includes('masaüstü')) {
        if (special.desktop1) candidates.unshift(special.desktop1);
        if (special.desktop2) candidates.push(special.desktop2);
      }
      if (inputName === 'Mic/Aux' && special.mic1) {
        candidates.unshift(special.mic1);
      }
    } catch (e) {}
  }
  if (!inputName || inputName === 'Desktop Audio') {
    candidates.push('Desktop Audio', 'Masaüstü Sesi', 'Masaüstü Ses', 'DesktopAudio', 'Müzik', 'Spotify', 'Tuna');
  }
  return [...new Set(candidates.filter(Boolean))];
}

async function callObsSetInputVolume(inputName, volumeMul) {
  if (!obsWsClient) throw new Error('OBS WebSocket bağlı değil');
  const uniqueCandidates = await getObsAudioCandidateNames(inputName);
  let lastErr = null;
  for (const name of uniqueCandidates) {
    try {
      await obsWsClient.call('SetInputMute', { inputName: name, inputMuted: volumeMul <= 0.001 }).catch(() => {});
      await obsWsClient.call('SetInputVolume', { inputName: name, inputVolumeMul: volumeMul });
      return name;
    } catch(err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('OBS ses kaynağı bulunamadı');
}

async function callObsGetInputVolume(inputName) {
  if (!obsWsClient) throw new Error('OBS WebSocket bağlı değil');
  const uniqueCandidates = await getObsAudioCandidateNames(inputName);
  for (const name of uniqueCandidates) {
    try {
      const vol = await obsWsClient.call('GetInputVolume', { inputName: name });
      if (vol && typeof vol.inputVolumeMul === 'number') {
        return { name, volumeMul: vol.inputVolumeMul };
      }
    } catch(err) {}
  }
  return { name: inputName || 'Desktop Audio', volumeMul: obsSavedMusicVolume || 1.0 };
}

function getObsAudioInputs(callback) {
  if (!obsWsConnected || !obsWsClient) {
    return callback(new Error('OBS WebSocket bağlı değil'));
  }
  Promise.all([
    obsWsClient.call('GetInputList').catch(() => ({ inputs: [] })),
    obsWsClient.call('GetSpecialInputs').catch(() => ({}))
  ])
    .then(async ([data, special]) => {
      const inputs = data.inputs || [];
      const seenNames = new Set();
      const candidateItems = [];

      // Önce OBS Global Ses Cihazlarını (Masaüstü Ses, Mikrofon) ekle
      ['desktop1', 'desktop2', 'mic1', 'mic2'].forEach(k => {
        if (special && special[k] && !seenNames.has(special[k])) {
          seenNames.add(special[k]);
          candidateItems.push({ inputName: special[k], inputKind: k });
        }
      });

      for (const inp of inputs) {
        if (inp && inp.inputName && !seenNames.has(inp.inputName)) {
          seenNames.add(inp.inputName);
          candidateItems.push(inp);
        }
      }

      const audioInputs = [];
      for (const inp of candidateItems) {
        try {
          const vol = await obsWsClient.call('GetInputVolume', { inputName: inp.inputName });
          audioInputs.push({
            name: inp.inputName,
            kind: inp.inputKind,
            volumeMul: vol.inputVolumeMul,
            volumeDb: vol.inputVolumeDb
          });
        } catch(e) {}
      }
      if (!obsIsDucked && !obsSavedMusicVolumeInitialized && audioInputs.length > 0) {
        const primary = audioInputs.find(a => ['Desktop Audio', 'Masaüstü Sesi', 'Masaüstü Ses', 'Müzik', 'Spotify'].includes(a.name)) || audioInputs[0];
        if (primary && typeof primary.volumeMul === 'number') {
          obsSavedMusicVolume = primary.volumeMul;
          obsSavedMusicVolumeInitialized = true;
        }
      }
      callback(null, audioInputs);
    })
    .catch(err => callback(err));
}

function setObsAudioVolume(inputName, volumeMul, callback) {
  if (!obsWsConnected || !obsWsClient) {
    if (callback) callback(new Error('OBS WebSocket bağlı değil'));
    return;
  }
  const rawVal = parseFloat(volumeMul);
  const mul = Math.max(0, Math.min(2.0, isNaN(rawVal) ? 1.0 : rawVal));
  obsSavedMusicVolume = mul;
  obsSavedMusicVolumeInitialized = true;
  const targetApplyMul = obsIsDucked ? (mul * 0.25) : mul;
  callObsSetInputVolume(inputName || 'Desktop Audio', targetApplyMul)
    .then((matchedName) => {
      if (callback) callback(null, { inputName: matchedName, volumeMul: mul });
    })
    .catch(err => {
      if (callback) callback(err);
    });
}

async function setObsDucking(duck, inputName = 'Desktop Audio', callback) {
  if (!obsWsConnected || !obsWsClient) {
    if (callback) callback(new Error('OBS WebSocket bağlı değil'));
    return;
  }
  try {
    if (duck) {
      if (obsUnduckTimer) {
        clearTimeout(obsUnduckTimer);
        obsUnduckTimer = null;
      }
      if (!obsIsDucked) {
        // Eğer kullanıcı henüz özel bir ses belirlemediyse, anlık OBS seviyesini referans al
        if (!obsSavedMusicVolumeInitialized) {
          try {
            const current = await callObsGetInputVolume(inputName);
            if (current && typeof current.volumeMul === 'number') {
              obsSavedMusicVolume = current.volumeMul;
              obsSavedMusicVolumeInitialized = true;
            }
          } catch(e) {}
        }
        obsIsDucked = true;
      }
      const normalVol = (typeof obsSavedMusicVolume === 'number' && !isNaN(obsSavedMusicVolume)) ? obsSavedMusicVolume : 1.0;
      // Müziği kullanıcının ayarladığı seviyenin %25'ine düşür (asla %100'e zıplatma!)
      const duckedVolume = Math.min(normalVol, normalVol * 0.25);
      const matchedName = await callObsSetInputVolume(inputName || 'Desktop Audio', duckedVolume);
      if (callback) callback(null, { ducked: true, volume: duckedVolume, normalVolume: normalVol, inputName: matchedName });
    } else {
      if (obsUnduckTimer) clearTimeout(obsUnduckTimer);
      obsUnduckTimer = setTimeout(async () => {
        obsUnduckTimer = null;
        obsIsDucked = false;
        // Kullanıcının ayarladığı tam seviyeye geri dön (asla 1.0 zorlaması yapma)
        const restoreVolume = (typeof obsSavedMusicVolume === 'number' && !isNaN(obsSavedMusicVolume)) ? obsSavedMusicVolume : 1.0;
        try {
          const matchedName = await callObsSetInputVolume(inputName || 'Desktop Audio', restoreVolume);
          if (callback) callback(null, { ducked: false, volume: restoreVolume, inputName: matchedName });
        } catch (e) {
          if (callback) callback(e);
        }
      }, 220);
    }
  } catch(err) {
    if (callback) callback(err);
  }
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
    const user = data.uniqueId || data.nickname || 'Yeni Takipçi';
    console.log(`[TIKTOK LIVE] Yeni Takipci: ${user}`);
    studioStats.recent.follower = user;
    studioStats.session.followers = (studioStats.session.followers || 0) + 1;
    if (studioStats.goal.type === 'follower') {
      studioStats.goal.current = (studioStats.goal.current || 0) + 1;
      eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
    }
    eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
    saveStreamStats();

    eventQueue.push({
      type: 'LIVE_ALERT',
      alertType: 'follower',
      payload: { username: user },
      time: Date.now()
    });
  });

  conn.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    const giftName = data.giftName || 'Hediye';
    const count = data.repeatCount || 1;
    const diamonds = (data.diamondCount || 1) * count;
    console.log(`[TIKTOK LIVE] Hediye: ${data.uniqueId} -> ${giftName} x${count}`);
    studioStats.recent.gift = `${data.uniqueId} (${giftName} x${count})`;
    studioStats.session.gifts = (studioStats.session.gifts || 0) + count;
    if (diamonds > 0) {
      studioStats.session.kicks = (studioStats.session.kicks || 0) + diamonds;
      studioStats.recent.donation = `${data.uniqueId} (${diamonds} 💎)`;
    }
    if (studioStats.goal.type === 'gift') {
      studioStats.goal.current = (studioStats.goal.current || 0) + count;
      eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
    }
    eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
    saveStreamStats();

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
// 0.4 KICK CANLI YAYIN & SOHBET KÖPRÜSÜ (PUSHER REALTIME ENGINE)
// ==========================================
let kickPusherWs = null;
let kickPingInterval = null;
let kickFollowerPollInterval = null;
let kickReconnectTimeout = null;
const knownKickFollowerUsers = new Set();
const recentChatUserFollowerChecked = new Map();
let lastKickChatSender = null;
let activeKickStatus = {
  connected: false,
  slug: '',
  chatroomId: null,
  channelId: null,
  followersCount: 0,
  lastMessageAt: null,
  error: null
};

function emitKickFollowerAlert(followerUsername, updatedCount = null) {
  const cleanName = (followerUsername || 'Yeni Takipçi').trim();
  const normKey = cleanName.toLowerCase();
  if (cleanName !== 'Yeni Takipçi') {
    if (knownKickFollowerUsers.has(normKey)) return;
    knownKickFollowerUsers.add(normKey);
  }

  if (typeof updatedCount === 'number' && !isNaN(updatedCount)) {
    activeKickStatus.followersCount = updatedCount;
  } else {
    activeKickStatus.followersCount = (parseCount(activeKickStatus.followersCount) || 0) + 1;
  }

  studioStats.recent.follower = cleanName;
  studioStats.session.followers = (studioStats.session.followers || 0) + 1;
  if (studioStats.goal.type === 'follower') {
    if (typeof updatedCount === 'number' && !isNaN(updatedCount)) {
      studioStats.goal.current = updatedCount;
    } else {
      studioStats.goal.current = (parseCount(studioStats.goal.current) || 0) + 1;
    }
    eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
  }
  eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
  saveStreamStats();

  const alertItem = {
    id: 'alert_follow_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type: 'LIVE_ALERT',
    alertType: 'follower',
    payload: {
      username: cleanName,
      followersCount: activeKickStatus.followersCount
    },
    time: Date.now()
  };
  eventQueue.push(alertItem);
  if (eventQueue.length > 80) eventQueue.shift();
  console.log(`[KICK TAKİPÇİ] ${cleanName} kanalı takip etti! (Toplam: ${activeKickStatus.followersCount})`);
}

function checkKickUserFollowStatus(slug, username) {
  if (!slug || !username) return Promise.resolve(null);
  const normUser = username.trim().toLowerCase();
  if (!normUser || normUser === slug.toLowerCase()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const options = {
      hostname: 'kick.com',
      path: `/api/v2/channels/${encodeURIComponent(slug)}/users/${encodeURIComponent(username.trim())}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            return resolve(parsed);
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function normalizeKickToken(raw) {
  let t = String(raw || '').replace(/^Bearer\s+/i, '').trim();
  if (!t) return '';
  try {
    if (t.includes('%')) t = decodeURIComponent(t);
  } catch (e) {}
  return t.replace(/^["']|["']$/g, '').trim();
}

const recentDirectSentKickMsgs = [];

function recordDirectSentKickMsg(content) {
  const clean = String(content || '').trim();
  if (!clean) return;
  const now = Date.now();
  recentDirectSentKickMsgs.push({ content: clean.toLowerCase(), time: now });
  while (recentDirectSentKickMsgs.length > 30) {
    recentDirectSentKickMsgs.shift();
  }
}

function isRecentDirectSentKickMsg(content) {
  const clean = String(content || '').trim().toLowerCase();
  if (!clean) return false;
  const now = Date.now();
  return recentDirectSentKickMsgs.some(m => m.content === clean && (now - m.time) < 15000);
}

function sendKickChatMessageDirect(chatroomId, content, token) {
  return new Promise((resolve) => {
    if (!chatroomId || !content || !token) {
      return resolve({ sent: false, reason: 'missing_params' });
    }
    const cleanToken = normalizeKickToken(token);
    if (!cleanToken) return resolve({ sent: false, reason: 'empty_token' });

    const cleanContent = String(content).trim();
    recordDirectSentKickMsg(cleanContent);

    const postBody = JSON.stringify({
      content: cleanContent,
      type: 'message'
    });

    const options = {
      hostname: 'kick.com',
      path: `/api/v2/messages/send/${encodeURIComponent(chatroomId)}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Cookie': `session_token=${encodeURIComponent(cleanToken)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'Content-Length': Buffer.byteLength(postBody),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin': 'https://kick.com',
        'Referer': `https://kick.com/${encodeURIComponent(activeKickStatus.slug || '')}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ sent: true, statusCode: res.statusCode });
        } else {
          resolve({ sent: false, statusCode: res.statusCode, error: data.substring(0, 200) });
        }
      });
    });
    req.on('error', (err) => resolve({ sent: false, error: err.message }));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve({ sent: false, error: 'timeout' });
    });
    req.write(postBody);
    req.end();
  });
}

function stopKickPusherBridge(clearStats = false) {
  if (kickReconnectTimeout) {
    clearTimeout(kickReconnectTimeout);
    kickReconnectTimeout = null;
  }
  if (kickPingInterval) {
    clearInterval(kickPingInterval);
    kickPingInterval = null;
  }
  if (kickFollowerPollInterval) {
    clearInterval(kickFollowerPollInterval);
    kickFollowerPollInterval = null;
  }
  if (kickPusherWs) {
    try {
      kickPusherWs.onclose = null;
      kickPusherWs.onerror = null;
      kickPusherWs.close();
    } catch (e) {}
    kickPusherWs = null;
  }
  activeKickStatus = {
    connected: false,
    slug: clearStats ? '' : activeKickStatus.slug,
    chatroomId: null,
    channelId: null,
    followersCount: clearStats ? 0 : activeKickStatus.followersCount,
    lastMessageAt: null,
    error: null
  };
  if (clearStats) {
    if (studioStats.streamer) {
      studioStats.streamer.kickSlug = '';
      studioStats.streamer.username = '';
    }
    saveStreamStats();
  }
}

const seenKickInternalEventIds = new Set();

function fetchKickInternalChannelEvents(slug, token) {
  return new Promise((resolve) => {
    const cleanSlug = (slug || activeKickStatus.slug || (studioStats.streamer && studioStats.streamer.kickSlug) || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
    const cleanToken = normalizeKickToken(token || (studioStats.streamer && studioStats.streamer.kickToken) || '');
    if (!cleanSlug || !cleanToken) return resolve(null);

    const options = {
      hostname: 'kick.com',
      path: `/api/internal/v1/channels/${encodeURIComponent(cleanSlug)}/events`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Cookie': `session_token=${encodeURIComponent(cleanToken)}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': `https://kick.com/${encodeURIComponent(cleanSlug)}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            const events = parsed?.data?.events || parsed?.events || [];
            if (Array.isArray(events)) return resolve(events);
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(6000, () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function authenticateKickPusherPrivateChannel(socketId, channelName, token) {
  return new Promise((resolve) => {
    const cleanToken = normalizeKickToken(token || (studioStats.streamer && studioStats.streamer.kickToken) || '');
    if (!socketId || !channelName || !cleanToken) return resolve(null);

    const postBody = JSON.stringify({
      socket_id: socketId,
      channel_name: channelName
    });

    const options = {
      hostname: 'kick.com',
      path: '/broadcasting/auth',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Cookie': `session_token=${encodeURIComponent(cleanToken)}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postBody),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const parsed = JSON.parse(data);
            if (parsed && parsed.auth) return resolve(parsed.auth);
          }
        } catch (e) {}
        resolve(null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => {
      req.destroy();
      resolve(null);
    });
    req.write(postBody);
    req.end();
  });
}

async function syncKickInternalEvents(slug, isInitial = false) {
  const events = await fetchKickInternalChannelEvents(slug);
  if (!Array.isArray(events) || events.length === 0) return null;

  const followerEvents = events.filter(ev => ev && (ev.event_type === 'FollowerAdded' || ev.event_type === 'Follow'));
  if (followerEvents.length === 0) return null;

  const latestFollow = followerEvents[0];
  const latestUser = latestFollow?.event_data?.user?.username || latestFollow?.event_data?.follower?.username || latestFollow?.event_data?.username || null;
  const latestCount = parseCount(latestFollow?.event_data?.followers_count ?? latestFollow?.event_data?.followersCount);

  if (isInitial) {
    followerEvents.forEach(ev => {
      const evId = ev?.event_data?.id || `${ev.actor_id}_${ev.created_at}`;
      if (evId) seenKickInternalEventIds.add(evId);
      const uName = ev?.event_data?.user?.username || ev?.event_data?.username;
      if (uName) knownKickFollowerUsers.add(uName.toLowerCase());
    });
    // Eğer son takipçi alanında "-" veya "Yeni Takipçi" yazıyorsa gerçek son takipçi adıyla güncelle!
    if (latestUser && (!studioStats.recent.follower || studioStats.recent.follower === '-' || studioStats.recent.follower === 'Yeni Takipçi')) {
      studioStats.recent.follower = latestUser;
      saveStreamStats();
      eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
    }
    return latestUser;
  }

  let triggeredUser = null;
  // Eskiden yeniye doğru kontrol et
  for (let i = followerEvents.length - 1; i >= 0; i--) {
    const ev = followerEvents[i];
    const evId = ev?.event_data?.id || `${ev.actor_id}_${ev.created_at}`;
    const uName = ev?.event_data?.user?.username || ev?.event_data?.follower?.username || ev?.event_data?.username;
    const fCount = parseCount(ev?.event_data?.followers_count ?? ev?.event_data?.followersCount);
    const createdAtMs = ev?.created_at ? new Date(ev.created_at).getTime() : Date.now();
    const isRecent = !isNaN(createdAtMs) ? (Date.now() - createdAtMs) <= 10 * 60 * 1000 : true;

    if (evId && !seenKickInternalEventIds.has(evId)) {
      seenKickInternalEventIds.add(evId);
      if (uName && isRecent && !knownKickFollowerUsers.has(uName.toLowerCase())) {
        triggeredUser = uName;
        emitKickFollowerAlert(uName, fCount);
      }
    }
  }

  return triggeredUser || latestUser;
}

function fetchKickChannelInfo(slug) {
  return new Promise((resolve, reject) => {
    const cleanSlug = (slug || activeKickStatus.slug || (studioStats.streamer && studioStats.streamer.kickSlug) || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
    if (!cleanSlug) return reject(new Error('Kanal adı belirtilmedi'));
    const options = {
      hostname: 'kick.com',
      path: `/api/v2/channels/${encodeURIComponent(cleanSlug)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 404) {
            return reject(new Error(`Kick üzerinde "${cleanSlug}" adında bir kanal bulunamadı (404). Lütfen kullanıcı adınızı kontrol edin.`));
          }
          if (res.statusCode >= 400) {
            return reject(new Error(`Kick sunucusu yanıt vermedi (HTTP ${res.statusCode}). Lütfen daha sonra tekrar deneyin.`));
          }
          const parsed = JSON.parse(data);
          if (!parsed || parsed.error || (!parsed.chatroom && !parsed.id)) {
            return reject(new Error(parsed?.message || `"${cleanSlug}" kanalı bulunamadı veya verisi geçersiz.`));
          }
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Kick kanal verisi okunamadı: ${e.message}`));
        }
      });
    });
    req.on('error', (err) => reject(new Error(`Kick bağlantı hatası: ${err.message}`)));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Kick API zaman aşımı (İnternet bağlantınızı kontrol edin)'));
    });
    req.end();
  });
}

function startKickPusherBridge(slug, prefetchedData = null) {
  stopKickPusherBridge(false);

  const targetSlug = (slug || activeKickStatus.slug || (studioStats.streamer && studioStats.streamer.kickSlug) || '').trim();
  if (!targetSlug) {
    console.log('[Kick Pusher] Kanal adı girilmedi, bağlantı başlatılmadı.');
    return;
  }
  activeKickStatus.slug = targetSlug;
  activeKickStatus.error = null;

  const connectWs = (chatroomId, channelId) => {
    if (!WebSocketClient) {
      activeKickStatus.connected = false;
      activeKickStatus.error = 'WebSocket istemcisi bulunamadı';
      console.error('[KICK BRIDGE] WebSocket istemcisi bulunamadı (ws paketi eksik)');
      return;
    }

    const pusherKey = '34bf7a0ff419a2a775b9';
    const wsUrl = `wss://ws-us2.pusher.com/app/${pusherKey}?protocol=7&client=js&version=7.4.0&flash=false`;
    const ws = new WebSocketClient(wsUrl);
    kickPusherWs = ws;
    const wsOpenState = WebSocketClient.OPEN !== undefined ? WebSocketClient.OPEN : 1;

    ws.onopen = () => {
      activeKickStatus.connected = true;
      activeKickStatus.error = null;
      console.log(`[KICK BRIDGE] Kick Pusher WebSocket bağlandı! Kanal: ${targetSlug} (Canlı Dinleniyor - Chatroom: ${chatroomId})`);

      // Subscriptions
      if (chatroomId) {
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: `chatrooms.${chatroomId}.v2` }
        }));
      }
      if (channelId) {
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: `channel.${channelId}` }
        }));
        ws.send(JSON.stringify({
          event: 'pusher:subscribe',
          data: { auth: '', channel: `channel_${channelId}` }
        }));
      }

      // Keepalive ping (her 25 saniyede bir)
      kickPingInterval = setInterval(() => {
        if (ws.readyState === wsOpenState) {
          ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const rawPacket = typeof event.data === 'string' ? event.data : event.data?.toString();
        const packet = JSON.parse(rawPacket);
        if (packet.event === 'pusher:ping') {
          if (ws.readyState === wsOpenState) {
            ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
          }
          return;
        }
        if (packet.event === 'pusher:pong') return;

        // Pusher bağlantı kurulduğunda private kanal aboneliğini de (token varsa) yetkilendir
        if (packet.event === 'pusher:connection_established' && channelId) {
          try {
            const connData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
            const socketId = connData?.socket_id;
            const curToken = studioStats?.streamer?.kickToken;
            if (socketId && curToken) {
              ['private-channel_' + channelId, 'private-channel.' + channelId].forEach(privCh => {
                authenticateKickPusherPrivateChannel(socketId, privCh, curToken).then(authSig => {
                  if (authSig && ws.readyState === wsOpenState) {
                    ws.send(JSON.stringify({
                      event: 'pusher:subscribe',
                      data: { auth: authSig, channel: privCh }
                    }));
                  }
                }).catch(() => {});
              });
            }
          } catch (e) {}
          return;
        }

        // Canlı Sohbet Mesajı
        if (packet.event === 'App\\Events\\ChatMessageEvent') {
          const chatData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
          const sender = chatData.sender?.username || 'Kickİzleyici';
          const content = chatData.content || '';
          const badges = chatData.sender?.identity?.badges || chatData.sender?.badges || [];
          const isStreamer = badges.some(b => b.type === 'broadcaster' || b.type === 'streamer') || (sender.toLowerCase() === activeKickStatus.slug.toLowerCase());
          if (isRecentDirectSentKickMsg(content)) {
            // MİRA üzerinden doğrudan gönderilen yayıncı mesajının Pusher yankısını mükerrer ekleme
            return;
          }
          const isMod = badges.some(b => b.type === 'moderator');
          const isSub = badges.some(b => b.type === 'subscriber');
          const badge = isStreamer ? 'streamer' : (isMod ? 'mod' : (isSub ? 'sub' : 'kick'));
          const color = chatData.sender?.identity?.color || '#00f5a0';

          const chatItem = {
            id: chatData.id || ('kick_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
            type: 'CHAT_MESSAGE',
            platform: 'kick',
            username: sender,
            content: content,
            badge: badge,
            isStreamer: isStreamer,
            color: color,
            time: Date.now()
          };

          eventQueue.push(chatItem);
          if (eventQueue.length > 80) eventQueue.shift();
          activeKickStatus.lastMessageAt = Date.now();
          console.log(`[KICK CHAT] [${badge.toUpperCase()}] ${sender}: ${content}`);

          if (!isStreamer && sender && sender !== 'Kickİzleyici') {
            lastKickChatSender = sender;
            const normSender = sender.toLowerCase();
            const lastChecked = recentChatUserFollowerChecked.get(normSender) || 0;
            if (!knownKickFollowerUsers.has(normSender) && (Date.now() - lastChecked) > 30000) {
              recentChatUserFollowerChecked.set(normSender, Date.now());
              checkKickUserFollowStatus(targetSlug, sender).then(userData => {
                if (userData && userData.following_since) {
                  const followTime = new Date(userData.following_since).getTime();
                  if (!isNaN(followTime)) {
                    const ageMs = Date.now() - followTime;
                    // Son 15 dakika içinde takip etmişse ve henüz bildirim atılmadıysa canlı bildirimi tetikle!
                    if (ageMs >= -60000 && ageMs <= 15 * 60 * 1000) {
                      fetchKickChannelInfo(targetSlug).then(chInfo => {
                        const cNum = parseCount(chInfo?.followers_count ?? chInfo?.followersCount);
                        emitKickFollowerAlert(userData.username || sender, cNum);
                      }).catch(() => {
                        emitKickFollowerAlert(userData.username || sender, null);
                      });
                    } else {
                      knownKickFollowerUsers.add(normSender);
                    }
                  }
                }
              }).catch(() => {});
            }
          }
        }
        // Canlı Takipçi Güncellemesi (Kick Pusher FollowersUpdated veya FollowerAdded)
        else if (packet.event === 'App\\Events\\FollowersUpdated' || packet.event === 'FollowerAdded' || packet.event === 'App\\Events\\FollowerAdded') {
          const evData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
          const isFollow = evData.followed !== false;
          const updatedCount = parseCount(evData.followersCount ?? evData.followers_count);
          if (updatedCount !== null) activeKickStatus.followersCount = updatedCount;

          if (isFollow) {
            const directName = evData.username || evData.follower?.username || evData.user?.username || evData.follower_username || '';
            if (directName && directName !== 'Yeni Takipçi') {
              emitKickFollowerAlert(directName, updatedCount);
            } else {
              // Pusher paketinde kullanıcı adı yoksa Kick Internal Events API'den gerçek kullanıcı adını çek!
              syncKickInternalEvents(targetSlug, false).then(resolvedUser => {
                if (!resolvedUser) {
                  emitKickFollowerAlert('Yeni Takipçi', updatedCount);
                }
              }).catch(() => emitKickFollowerAlert('Yeni Takipçi', updatedCount));
            }
          } else {
            if (studioStats.goal.type === 'follower' && updatedCount !== null) {
              studioStats.goal.current = updatedCount;
              eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
              saveStreamStats();
            }
            console.log(`[KICK TAKİP BİLGİSİ] Takip durumu güncellendi (Toplam: ${activeKickStatus.followersCount})`);
          }
        }
        // Canlı Abonelik Olayı
        else if (packet.event === 'App\\Events\\SubscriptionEvent') {
          const sData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
          const subUser = sData.username || sData.sender?.username || sData.user?.username || 'Abonemiz';
          const months = sData.months || 1;

          studioStats.recent.sub = `${subUser} (${months}. Ay)`;
          studioStats.session.subs = (studioStats.session.subs || 0) + 1;
          if (studioStats.goal.type === 'sub') {
            studioStats.goal.current = (studioStats.goal.current || 0) + 1;
            eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
          }
          eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
          saveStreamStats();

          const alertItem = {
            type: 'LIVE_ALERT',
            alertType: 'sub',
            payload: {
              username: subUser,
              months: months
            },
            time: Date.now()
          };
          eventQueue.push(alertItem);
          if (eventQueue.length > 80) eventQueue.shift();
          console.log(`[KICK ABONE] ${subUser} kanala abone oldu (${months}. ay)!`);
        }
        // Canlı Hediye Abonelik Olayı (Topluluğa Dağıtılan Hediye Sub)
        else if (packet.event === 'App\\Events\\GiftedSubscriptionsEvent') {
          const gData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
          const gifter = gData.gifter_username || gData.username || gData.sender?.username || 'Destekçi';
          const count = gData.gifted_usernames?.length || gData.count || 5;

          studioStats.recent.gift = `${gifter} (${count}x Hediye)`;
          studioStats.recent.sub = `${gifter} (Hediye Dağıttı)`;
          studioStats.session.gifts = (studioStats.session.gifts || 0) + count;
          studioStats.session.subs = (studioStats.session.subs || 0) + count;
          if (studioStats.goal.type === 'gift' || studioStats.goal.type === 'sub') {
            studioStats.goal.current = (studioStats.goal.current || 0) + count;
            eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
          }
          eventQueue.push({ type: 'UPDATE_STATS', stats: studioStats.recent, session: studioStats.session, time: Date.now() });
          saveStreamStats();

          const alertItem = {
            type: 'LIVE_ALERT',
            alertType: 'gift',
            payload: {
              username: gifter,
              giftName: `${count}x Hediye Abonelik`,
              gift: `${count}x`
            },
            time: Date.now()
          };
          eventQueue.push(alertItem);
          if (eventQueue.length > 80) eventQueue.shift();
          console.log(`[KICK HEDİYE SUB] ${gifter} ${count} adet hediye abonelik dağıttı!`);
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      activeKickStatus.connected = false;
      if (kickPingInterval) clearInterval(kickPingInterval);
      if (activeKickStatus.slug) {
        console.log(`[KICK BRIDGE] Bağlantı koptu, 5 saniye sonra yeniden bağlanılıyor...`);
        kickReconnectTimeout = setTimeout(() => {
          if (activeKickStatus.slug) startKickPusherBridge(activeKickStatus.slug);
        }, 5000);
      }
    };

    ws.onerror = (err) => {
      activeKickStatus.connected = false;
      activeKickStatus.error = (err && err.message) || 'Pusher WS error';
    };
  };

  const handleChannelData = (channelData) => {
    const chatroomId = channelData?.chatroom?.id;
    const channelId = channelData?.id;
    const fCount = parseCount(channelData?.followers_count ?? channelData?.followersCount) ?? 0;

    activeKickStatus.chatroomId = chatroomId;
    activeKickStatus.channelId = channelId;
    activeKickStatus.followersCount = fCount;
    activeKickStatus.error = null;

    if (studioStats.goal.type === 'follower' && studioStats.goal.autoSyncKick !== false) {
      studioStats.goal.current = fCount;
      saveStreamStats();
    }

    console.log(`[KICK BRIDGE] Kanal aktif: ${targetSlug} (Chatroom ID: ${chatroomId}, Channel ID: ${channelId}, Takipçi: ${fCount})`);
    connectWs(chatroomId, channelId);

    // İlk açılışta mevcut takipçi olaylarını senkronize et (gerçek son takipçi ismini HUD'a yükler)
    syncKickInternalEvents(targetSlug, true).catch(() => {});

    if (kickFollowerPollInterval) clearInterval(kickFollowerPollInterval);
    kickFollowerPollInterval = setInterval(async () => {
      if (!activeKickStatus.slug) return;
      // 1. Önce Kick Internal Events API ile yeni takipçi varsa gerçek kullanıcı adıyla yakala
      await syncKickInternalEvents(activeKickStatus.slug, false).catch(() => {});

      // 2. Kanal takipçi sayısını kontrol et
      fetchKickChannelInfo(activeKickStatus.slug)
        .then(async (latestData) => {
          const newCount = parseCount(latestData?.followers_count ?? latestData?.followersCount);
          if (newCount === null) return;
          const prevCount = parseCount(activeKickStatus.followersCount) ?? 0;
          if (newCount > prevCount) {
            // Sayı arttı ama henüz emit edilmediyse önce Internal Events API'yi tekrar sorgula
            const resolvedFromInternal = await syncKickInternalEvents(activeKickStatus.slug, false).catch(() => null);
            if (parseCount(activeKickStatus.followersCount) >= newCount) {
              return; // syncKickInternalEvents zaten gerçek kullanıcı adıyla alert gönderdi!
            }
            // Son sohbet eden kullanıcıyı kontrol et
            const candidateUser = lastKickChatSender;
            if (candidateUser && !knownKickFollowerUsers.has(candidateUser.toLowerCase())) {
              checkKickUserFollowStatus(activeKickStatus.slug, candidateUser)
                .then(uInfo => {
                  if (uInfo && uInfo.following_since) {
                    const fTime = new Date(uInfo.following_since).getTime();
                    if (!isNaN(fTime) && (Date.now() - fTime) <= 15 * 60 * 1000) {
                      emitKickFollowerAlert(uInfo.username || candidateUser, newCount);
                      return;
                    }
                  }
                  emitKickFollowerAlert(resolvedFromInternal || 'Yeni Takipçi', newCount);
                })
                .catch(() => emitKickFollowerAlert(resolvedFromInternal || 'Yeni Takipçi', newCount));
            } else {
              emitKickFollowerAlert(resolvedFromInternal || 'Yeni Takipçi', newCount);
            }
          } else if (newCount !== prevCount) {
            activeKickStatus.followersCount = newCount;
            if (studioStats.goal.type === 'follower' && studioStats.goal.autoSyncKick !== false) {
              studioStats.goal.current = newCount;
              eventQueue.push({ type: 'UPDATE_GOAL', goal: studioStats.goal, time: Date.now() });
              saveStreamStats();
            }
          }
        })
        .catch(() => {});
    }, 12000);
  };

  if (prefetchedData && prefetchedData.chatroom && prefetchedData.chatroom.id) {
    handleChannelData(prefetchedData);
    return;
  }

  fetchKickChannelInfo(targetSlug)
    .then(handleChannelData)
    .catch(err => {
      console.error(`[KICK BRIDGE] Kanal bilgisi alınamadı (${targetSlug}):`, err.message);
      activeKickStatus.connected = false;
      activeKickStatus.error = err.message;

      const is404 = err.message && (err.message.includes('404') || err.message.includes('bulunamadı'));
      if (!is404) {
        // Yalnızca geçici ağ veya sunucu hatalarında yeniden dene
        kickReconnectTimeout = setTimeout(() => {
          if (activeKickStatus.slug === targetSlug) {
            startKickPusherBridge(targetSlug);
          }
        }, 10000);
      } else {
        console.warn(`[KICK BRIDGE] "${targetSlug}" kanalı Kick'te bulunamadığından yeniden bağlanma durduruldu.`);
      }
    });
}

// Sunucu başlatıldığında kaydedilmiş Kick kanalına otomatik bağlan
loadStreamStats();
const defaultKickSlug = (studioStats.streamer && studioStats.streamer.kickSlug) || '';
if (!studioStats.streamer) studioStats.streamer = { username: '', kickSlug: '' };
if (defaultKickSlug) {
  startKickPusherBridge(defaultKickSlug);
} else {
  console.log('[Kick Pusher] Kayıtlı kanal bulunamadı. Lütfen uygulamadan kanal ayarlarını yapın.');
}

// ==========================================
// 0.3 ANA GALERİ ŞABLON KATALOĞU & KULLANICI GALERİSİ YÖNETİMİ
// ==========================================
const USER_GALLERY_PATH = path.join(DATA_DIR, 'user-gallery.json');

const APP_GALLERY_CATALOG = [
  // --- 1. ŞAMPİYON SAHNE PAKETLERİ (HERO OVERLAYS) ---
  {
    id: 'tpl_hero_vexana',
    category: 'hero',
    name: 'Vexana — Tam Sahne Paketi (Bütün Set)',
    subtitle: 'Gotik Mor & Zümrüt Ruh Temalı 16:9 Bütünleşik Tam Sahne Paketi',
    icon: '💀',
    badge: 'BÜTÜN PAKET • VEXANA',
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
      avatarUrl: 'kick/vexana/assets/images/avatar.jpg',
      showGameFrame: true,
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
    name: 'Zetian — Tam Sahne Paketi (Bütün Set)',
    subtitle: 'İmparatoriçe Altın & Kızıl Anka Temalı 16:9 Bütünleşik Tam Sahne Paketi',
    icon: '👑',
    badge: 'BÜTÜN PAKET • ZETIAN',
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
      avatarUrl: 'kick/zetian/assets/images/avatar.jpg',
      showGameFrame: true,
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
    name: 'Nana — Tam Sahne Paketi (Bütün Set)',
    subtitle: 'Pastel Pembe & Gökyüzü Mavisi Molina Temalı 16:9 Bütünleşik Tam Sahne Paketi',
    icon: '🐾',
    badge: 'BÜTÜN PAKET • NANA',
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
      quote: '"Molina seni yakalarsa sevimli bir pamuk şekere dönüşürsün!"',
      primaryColor: '#ff85a2',
      secondaryColor: '#60a5fa',
      kickHandle: 'kick.com/mira',
      tiktokHandle: '@mira_mlbb',
      youtubeHandle: '@mira.gaming',
      goalTitle: 'TAKİPÇİ HEDEFİ',
      goalTarget: 200,
      avatarUrl: 'kick/nana/assets/images/avatar.jpg',
      showGameFrame: true,
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
    name: 'Carmilla — Tam Sahne Paketi (Bütün Set)',
    subtitle: 'Kan Kırmızısı & Gümüş Gotik Gül Temalı 16:9 Bütünleşik Tam Sahne Paketi',
    icon: '🩸',
    badge: 'BÜTÜN PAKET • CARMILLA',
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
      avatarUrl: 'kick/carmilla/assets/images/avatar.jpg',
      showGameFrame: true,
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
    name: 'Atlas — Tam Sahne Paketi (Bütün Set)',
    subtitle: 'Okyanus Turkuazı & Derin Deniz Neon Temalı 16:9 Bütünleşik Tam Sahne Paketi',
    icon: '⚓',
    badge: 'BÜTÜN PAKET • ATLAS',
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
      avatarUrl: 'kick/atlas/assets/images/avatar.jpg',
      showGameFrame: true,
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

// --- 5. KAHRAMAN ŞABLONLARININ PARÇA PARÇA (MODÜLER KART) HALLERİ ---
const HERO_PIECE_DEFINITIONS = [
  {
    key: 'vexana',
    heroName: 'Vexana',
    heroSub: 'Necrokeep Sovereign',
    icon: '💀',
    roleBadge: 'BÜYÜCÜ (MAGE)',
    laneBadge: 'MID LANE',
    quote: '"Şafak Vadisi\'nde dirilen ruhlar kaderinizi mühürleyecek!"',
    avatarUrl: 'kick/vexana/assets/images/portrait.jpg',
    thumbUrl: 'kick/vexana/assets/images/avatar.jpg',
    primaryColor: '#a855f7',
    secondaryColor: '#10b981',
    skills: {
      passiveTitle: 'Çürüyen Büyü (Pasif)',
      passiveDesc: 'Hedeflere gölge mührü bırakır; katledilen rakipler patlar.',
      s1Title: 'Ölümcül Pençe (1. Yetenek)',
      s1Desc: 'Hayalet pençe fırlatarak ilk hedefi korkutur ve durdurur.',
      s2Title: 'Lanetli Patlama (2. Yetenek)',
      s2Desc: 'Seçilen alanı yavaşlatır ve yüksek büyü hasarı patlatır.',
      ultiTitle: 'Ölümsüz Muhafız (Ulti)',
      ultiDesc: 'Savaş alanına dev Ölümsüz Şövalye çağırarak düşmanları savurur.'
    }
  },
  {
    key: 'zetian',
    heroName: 'Zetian',
    heroSub: 'Celestial Empress',
    icon: '👑',
    roleBadge: 'BURST MAGE',
    laneBadge: 'IMPERIAL MID',
    quote: '"Göklerin iradesi ve Anka\'nın ateşi önünde diz çökün!"',
    avatarUrl: 'kick/zetian/assets/images/portrait.jpg',
    thumbUrl: 'kick/zetian/assets/images/avatar.jpg',
    primaryColor: '#ffd700',
    secondaryColor: '#ef4444',
    skills: {
      passiveTitle: 'İmparatoriçe Mührü (Pasif)',
      passiveDesc: 'Yetenek isabetleri Anka kalkanı ve büyü nüfuzu kazandırır.',
      s1Title: 'Anka Dalgaları (1. Yetenek)',
      s1Desc: 'Üçlü altın ateş dalgası göndererek rakipleri geri iter.',
      s2Title: 'Kraliyet Ruh Çağrısı (2. Yetenek)',
      s2Desc: 'Hedef bölgeye Anka Ruhu indirerek büyü direncini kırar.',
      ultiTitle: 'Göklerin Gazabı (Ulti)',
      ultiDesc: 'Tüm haritadaki düşmanları ortaya çıkarıp göksel yıldırım indirir.'
    }
  },
  {
    key: 'nana',
    heroName: 'Nana',
    heroSub: 'Sweet Leonin Mage',
    icon: '🐾',
    roleBadge: 'MAGE / SUPPORT',
    laneBadge: 'ROAM / MID',
    quote: '"Molina seni yakalarsa sevimli bir pamuk şekere dönüşürsün!"',
    avatarUrl: 'kick/nana/assets/images/portrait.jpg',
    thumbUrl: 'kick/nana/assets/images/avatar.jpg',
    primaryColor: '#ff85a2',
    secondaryColor: '#60a5fa',
    skills: {
      passiveTitle: 'Molina\'nın Armağanı (Pasif)',
      passiveDesc: 'Ölümcül hasardan kaçıp 2 saniye dokunulmaz hız kazanır.',
      s1Title: 'Büyülü Bumerang (1. Yetenek)',
      s1Desc: 'Gidip dönen yıldız bumerangı ile rakipleri yavaşlatır.',
      s2Title: 'Molina Öpücüğü (2. Yetenek)',
      s2Desc: 'Rakipleri kovalayıp sevimli руha dönüştüren Molina fırlatır.',
      ultiTitle: 'Molina Saldırısı (Ulti)',
      ultiDesc: 'Geniş alana 3 dev Molina pençesi indirerek sersemletir.'
    }
  },
  {
    key: 'carmilla',
    heroName: 'Carmilla',
    heroSub: 'Shadow of Twilight',
    icon: '🩸',
    roleBadge: 'TANK / SUPPORT',
    laneBadge: 'ROAMER',
    quote: '"Kan Bağı kurulduğunda kaderimiz ve acımız bir olur!"',
    avatarUrl: 'kick/carmilla/assets/images/portrait.jpg',
    thumbUrl: 'kick/carmilla/assets/images/avatar.jpg',
    primaryColor: '#e11d48',
    secondaryColor: '#94a3b8',
    skills: {
      passiveTitle: 'Vampir Anlaşması (Pasif)',
      passiveDesc: 'Hasar verdiği rakiplerin fiziksel ve büyü savunmasını çalar.',
      s1Title: 'Kızıl Çiçek (1. Yetenek)',
      s1Desc: 'Etrafında dönen 2 kan çiçeği ile can yeniler ve yavaşlatır.',
      s2Title: 'Kan Banyosu (2. Yetenek)',
      s2Desc: 'Hız kazanıp hedef düşmanı kızıl enerjiyle sersemletir.',
      ultiTitle: 'Kan Лaneti (Ulti)',
      ultiDesc: 'Rakipleri birbirine bağlar; birine vuran hasar ve CC hepsine geçer.'
    }
  },
  {
    key: 'atlas',
    heroName: 'Atlas',
    heroSub: 'Ocean Gladiator',
    icon: '⚓',
    roleBadge: 'TANK / INITIATOR',
    laneBadge: 'ABYSSAL ROAM',
    quote: '"Derin okyanusun zincirlerinden kimse kaçamaz!"',
    avatarUrl: 'kick/atlas/assets/images/portrait.jpg',
    thumbUrl: 'kick/atlas/assets/images/avatar.jpg',
    primaryColor: '#00f5d4',
    secondaryColor: '#38bdf8',
    skills: {
      passiveTitle: 'Dondurucu Nefes (Pasif)',
      passiveDesc: 'Yetenek kullanınca etrafında buz alanı oluşturup rakipleri dondurur.',
      s1Title: 'Yıkım (1. Yetenek)',
      s1Desc: 'Zeminini yumruklayarak 3 ardışık okyanus şok dalgası yayar.',
      s2Title: 'Mükemmel Eşleşme (2. Yetenek)',
      s2Desc: 'Zırhından ayrılıp hızla ileri atılır; birleşirken sersemletir.',
      ultiTitle: 'Ölümcül Zincirler (Ulti)',
      ultiDesc: 'Etraftaki tüm rakipleri zincirleyip seçtiği noktaya fırlatır.'
    }
  }
];

const PIECE_CARD_TYPES = [
  {
    suffix: 'showcase',
    cardType: 'showcase',
    cardPos: 'top-left',
    pieceIcon: '🃏',
    typeLabel: 'Vitrin Kartı',
    badgeLabel: '🃏 VİTRİN KARTI',
    getSub: (h) => `${h.heroName} portresi, rol/koridor rozeti ve repliğini içeren vitrin kartı.`
  },
  {
    suffix: 'webcam',
    cardType: 'webcam',
    cardPos: 'bottom-left',
    pieceIcon: '📷',
    typeLabel: 'Kamera Kartı',
    badgeLabel: '📷 KAMERA KARTI',
    getSub: (h) => `${h.heroName} neon temalı, canlı durum ve rütbe etiketli kamera kartı.`
  },
  {
    suffix: 'skills',
    cardType: 'skills',
    cardPos: 'bottom-center',
    pieceIcon: '⚡',
    typeLabel: '4\'lü Skill Kartı',
    badgeLabel: '⚡ SKILL KARTI',
    getSub: (h) => `${h.heroName} Pasif, 1. Yetenek, 2. Yetenek ve Ulti açıklamalarını içeren skill kartı.`
  },
  {
    suffix: 'topbar',
    cardType: 'topbar',
    cardPos: 'top-center',
    pieceIcon: '📊',
    typeLabel: 'Üst Yayın Barı Kartı',
    badgeLabel: '📊 ÜST BAR KARTI',
    getSub: (h) => `${h.heroName} temalı yayıncı logosu, son takipçi/abone/destek ve canlı saat kartı.`
  },
  {
    suffix: 'gameframe',
    cardType: 'gameframe',
    cardPos: 'center',
    pieceIcon: '🎮',
    typeLabel: 'Oyun Çerçevesi Kartı',
    badgeLabel: '🎮 OYUN ÇERÇEVESİ',
    getSub: (h) => `${h.heroName} neon parlama efektli 16:9 ana oyun yakalama çerçevesi kartı.`
  },
  {
    suffix: 'music',
    cardType: 'music',
    cardPos: 'bottom-center',
    pieceIcon: '🎵',
    typeLabel: 'Müzik & Ekolayzer Kartı',
    badgeLabel: '🎵 MÜZİK KARTI',
    getSub: (h) => `${h.heroName} renk paletli 16 çubuklu ses dalgası ve çalan şarkı kartı.`
  },
  {
    suffix: 'social',
    cardType: 'social',
    cardPos: 'middle-left',
    pieceIcon: '🌐',
    typeLabel: 'Sosyal Medya Kartı',
    badgeLabel: '🌐 SOSYAL MEDYA KARTI',
    getSub: (h) => `${h.heroName} temalı Kick, TikTok ve YouTube sosyal medya adres kartı.`
  },
  {
    suffix: 'chat',
    cardType: 'chat',
    cardPos: 'top-right',
    pieceIcon: '💬',
    typeLabel: 'Canlı Sohbet Kartı',
    badgeLabel: '💬 SOHBET KARTI',
    getSub: (h) => `${h.heroName} neon cam tasarımlı dikey canlı sohbet (Chat) kartı.`
  }
];

PIECE_CARD_TYPES.forEach(p => {
  HERO_PIECE_DEFINITIONS.forEach(h => {
    APP_GALLERY_CATALOG.push({
      id: `tpl_piece_${h.key}_${p.suffix}`,
      category: 'card',
      heroPiece: h.key,
      name: `${p.typeLabel} — ${h.heroName}`,
      subtitle: p.getSub(h),
      icon: p.pieceIcon,
      badge: p.badgeLabel,
      previewImg: h.thumbUrl,
      basePath: 'custom-overlay.html',
      config: {
        heroKey: h.key,
        cardType: p.cardType,
        cardPosition: p.cardPos,
        title: h.heroName.toUpperCase(),
        streamerName: 'MİRA',
        subtitleText: h.heroSub,
        roleBadge: h.roleBadge,
        laneBadge: h.laneBadge,
        quote: h.quote,
        avatarUrl: h.avatarUrl,
        primaryColor: h.primaryColor,
        secondaryColor: h.secondaryColor,
        kickHandle: 'kick.com/mira',
        tiktokHandle: '@mira_mlbb',
        youtubeHandle: '@mira.gaming',
        skillPassiveTitle: h.skills.passiveTitle,
        skillPassiveDesc: h.skills.passiveDesc,
        skill1Title: h.skills.s1Title,
        skill1Desc: h.skills.s1Desc,
        skill2Title: h.skills.s2Title,
        skill2Desc: h.skills.s2Desc,
        skillUltiTitle: h.skills.ultiTitle,
        skillUltiDesc: h.skills.ultiDesc
      }
    });
  });
});

APP_GALLERY_CATALOG.push({
  id: 'tpl_card_image_widget',
  category: 'card',
  cardType: 'image',
  name: 'Özel Resim / GIF / Logo Kartı (StreamElements Görsel Katmanı)',
  subtitle: 'PC\'den yüklediğiniz veya kütüphaneden seçtiğiniz resim, GIF, logo veya çerçeveyi tuvalde istediğiniz yere koyun',
  icon: '🖼️',
  badge: 'RESİM / GIF KARTI • GENEL',
  previewImg: 'assets/icon.png',
  basePath: 'custom-overlay.html',
  config: {
    cardType: 'image',
    cardPosition: 'top-left',
    title: 'ÖZEL GÖRSEL KATMANI',
    imageUrl: '/kick/vexana/assets/images/portrait.jpg',
    imageFit: 'cover',
    primaryColor: '#a855f7',
    secondaryColor: '#10b981'
  }
});

// --- 5. HAZIR ARKA PLANLAR (BACKGROUND TEMPLATES) ---
const READY_BACKGROUNDS = [
  {
    id: 'tpl_bg_vexana',
    category: 'background',
    cardType: 'background',
    name: 'Vexana — Necrokeep Ruh Vadisi Arka Planı',
    subtitle: 'Gotik Mor & Zümrüt Sis Efektli 1920×1080 Tam Ekran Sahne Arka Planı',
    icon: '🌌',
    badge: 'ARKA PLAN • VEXANA',
    previewImg: 'kick/vexana/assets/images/portrait.jpg',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '/kick/vexana/assets/images/portrait.jpg',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 45,
      bgBlur: 2,
      primaryColor: '#a855f7',
      secondaryColor: '#10b981',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_zetian',
    category: 'background',
    cardType: 'background',
    name: 'Zetian — İmparatorluk Altın Anka Arka Planı',
    subtitle: 'Altın & Kızıl Anka Atmosferli 1920×1080 Tam Ekran Sahne Arka Planı',
    icon: '🌌',
    badge: 'ARKA PLAN • ZETIAN',
    previewImg: 'kick/zetian/assets/images/portrait.jpg',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '/kick/zetian/assets/images/portrait.jpg',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 45,
      bgBlur: 2,
      primaryColor: '#ffd700',
      secondaryColor: '#ef4444',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_nana',
    category: 'background',
    cardType: 'background',
    name: 'Nana — Molina Pastel Rüya Ormanı Arka Planı',
    subtitle: 'Pastel Pembe & Mavi Parıltılı 1920×1080 Tam Ekran Sahne Arka Planı',
    icon: '🌌',
    badge: 'ARKA PLAN • NANA',
    previewImg: 'kick/nana/assets/images/portrait.jpg',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '/kick/nana/assets/images/portrait.jpg',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 40,
      bgBlur: 2,
      primaryColor: '#ff85a2',
      secondaryColor: '#60a5fa',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_carmilla',
    category: 'background',
    cardType: 'background',
    name: 'Carmilla — Gotik Kanlı Ay Şatosu Arka Planı',
    subtitle: 'Kızıl Gül & Gümüş Gotik Atmosferli 1920×1080 Tam Ekran Sahne Arka Planı',
    icon: '🌌',
    badge: 'ARKA PLAN • CARMILLA',
    previewImg: 'kick/carmilla/assets/images/portrait.jpg',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '/kick/carmilla/assets/images/portrait.jpg',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 45,
      bgBlur: 2,
      primaryColor: '#e11d48',
      secondaryColor: '#cbd5e1',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_atlas',
    category: 'background',
    cardType: 'background',
    name: 'Atlas — Abis Okyanus Derinliği Arka Planı',
    subtitle: 'Derin Okyanus Turkuazı & Kehribar Parçacıklı 1920×1080 Sahne Arka Planı',
    icon: '🌌',
    badge: 'ARKA PLAN • ATLAS',
    previewImg: 'kick/atlas/assets/images/portrait.jpg',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '/kick/atlas/assets/images/portrait.jpg',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 45,
      bgBlur: 2,
      primaryColor: '#06b6d4',
      secondaryColor: '#f59e0b',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_cybergrid',
    category: 'background',
    cardType: 'background',
    name: 'Siber Izgara (CyberGrid Neon Arena) Arka Planı',
    subtitle: 'E-Spor Turnuva & FPS/MOBA Yayınları İçin Hareketli Siber Izgara Arka Plan',
    icon: '🕸️',
    badge: 'ARKA PLAN • CYBERGRID',
    previewImg: 'assets/icon.png',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'cybergrid',
      bgImage: '',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 20,
      bgBlur: 0,
      primaryColor: '#a855f7',
      secondaryColor: '#06b6d4',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_nebula',
    category: 'background',
    cardType: 'background',
    name: 'Kozmik Nebula (Uzay Bulutsusu) Arka Planı',
    subtitle: 'Derin Uzay Mor & Zümrüt Gradyan Parçacıklı 1920×1080 Sahne Arka Planı',
    icon: '✨',
    badge: 'ARKA PLAN • NEBULA',
    previewImg: 'assets/icon.png',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'nebula',
      bgImage: '',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 20,
      bgBlur: 0,
      primaryColor: '#8b5cf6',
      secondaryColor: '#10b981',
      showParticles: true
    }
  },
  {
    id: 'tpl_bg_darkglass',
    category: 'background',
    cardType: 'background',
    name: 'Koyu Stüdyo Camı (Dark Glass OLED) Arka Planı',
    subtitle: 'Sohbet (Just Chatting) ve Gece Yayınları İçin Lüks Mat Siyah Cam Arka Plan',
    icon: '🌑',
    badge: 'ARKA PLAN • DARK GLASS',
    previewImg: 'assets/icon.png',
    basePath: 'custom-overlay.html',
    config: {
      cardType: 'background',
      bgStyle: 'darkglass',
      bgImage: '',
      bgFit: 'cover',
      bgOpacity: 100,
      bgDim: 30,
      bgBlur: 0,
      primaryColor: '#3b82f6',
      secondaryColor: '#ec4899',
      showParticles: false
    }
  }
];
READY_BACKGROUNDS.forEach(b => APP_GALLERY_CATALOG.push(b));

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (e) {}
}

const BUILTIN_MEDIA_ASSETS = [
  { id: 'builtin_vexana_portrait', name: '💀 Vexana HD Portre / Arka Plan', url: '/kick/vexana/assets/images/portrait.jpg', category: 'builtin', hero: 'vexana' },
  { id: 'builtin_vexana_avatar', name: '💀 Vexana Avatar', url: '/kick/vexana/assets/images/avatar.jpg', category: 'builtin', hero: 'vexana' },
  { id: 'builtin_zetian_portrait', name: '👑 Zetian HD Portre / Arka Plan', url: '/kick/zetian/assets/images/portrait.jpg', category: 'builtin', hero: 'zetian' },
  { id: 'builtin_zetian_avatar', name: '👑 Zetian Avatar', url: '/kick/zetian/assets/images/avatar.jpg', category: 'builtin', hero: 'zetian' },
  { id: 'builtin_nana_portrait', name: '🐾 Nana HD Portre / Arka Plan', url: '/kick/nana/assets/images/portrait.jpg', category: 'builtin', hero: 'nana' },
  { id: 'builtin_nana_avatar', name: '🐾 Nana Avatar', url: '/kick/nana/assets/images/avatar.jpg', category: 'builtin', hero: 'nana' },
  { id: 'builtin_carmilla_portrait', name: '🩸 Carmilla HD Portre / Arka Plan', url: '/kick/carmilla/assets/images/portrait.jpg', category: 'builtin', hero: 'carmilla' },
  { id: 'builtin_carmilla_avatar', name: '🩸 Carmilla Avatar', url: '/kick/carmilla/assets/images/avatar.jpg', category: 'builtin', hero: 'carmilla' },
  { id: 'builtin_atlas_portrait', name: '⚓ Atlas HD Portre / Arka Plan', url: '/kick/atlas/assets/images/portrait.jpg', category: 'builtin', hero: 'atlas' },
  { id: 'builtin_atlas_avatar', name: '⚓ Atlas Avatar', url: '/kick/atlas/assets/images/avatar.jpg', category: 'builtin', hero: 'atlas' },
  { id: 'builtin_mira_logo', name: '🌸 Mira Studio Resmi Logo', url: '/assets/icon.png', category: 'builtin', hero: 'all' }
];

function listMediaLibrary() {
  const uploaded = [];
  if (fs.existsSync(UPLOADS_DIR)) {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      files.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
          let mtime = 0;
          try { mtime = fs.statSync(path.join(UPLOADS_DIR, file)).mtimeMs; } catch (e) {}
          uploaded.push({
            id: 'up_' + file,
            filename: file,
            name: file.replace(/^\d+_/, ''),
            url: '/uploads/' + encodeURIComponent(file),
            category: 'upload',
            createdAt: mtime
          });
        }
      });
      uploaded.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {}
  }
  return { uploaded, builtin: BUILTIN_MEDIA_ASSETS, items: [...uploaded, ...BUILTIN_MEDIA_ASSETS] };
}

function loadUserGallery() {
  if (!fs.existsSync(USER_GALLERY_PATH)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(USER_GALLERY_PATH, 'utf-8'));
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

// ==========================================
// 0.4 AKTİF YAYIN SAHNELERİ & OBS ENTEGRASYON YÖNETİMİ
// ==========================================
const ACTIVE_SCENES_PATH = path.join(DATA_DIR, 'active-scenes.json');

// Sahnelerim varsayılan olarak %100 boş (temiz) başlar, kullanıcı kendi seçer
const DEFAULT_ACTIVE_SCENES = [];

function loadActiveScenes() {
  if (!fs.existsSync(ACTIVE_SCENES_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(ACTIVE_SCENES_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return [];
}

function saveActiveScenes(items) {
  try {
    fs.writeFileSync(ACTIVE_SCENES_PATH, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[SCENES] Kaydetme hatasi:', e.message);
    return false;
  }
}

// Çapraz Platform OBS Kaynak Tipleri (Linux & Windows Eşitliği)
const IS_WINDOWS = process.platform === 'win32';
const OBS_CAMERA_KIND = IS_WINDOWS ? 'dshow_input' : 'v4l2_input';
const OBS_GAME_KIND = IS_WINDOWS ? 'game_capture' : 'xcomposite_input';
const OBS_DISPLAY_KIND = IS_WINDOWS ? 'monitor_capture' : 'pipewire-screen-capture';
const OBS_WINDOW_KIND = IS_WINDOWS ? 'window_capture' : 'xcomposite_input';
const OBS_AUDIO_IN_KIND = IS_WINDOWS ? 'wasapi_input_capture' : 'pulse_input_capture';
const OBS_AUDIO_OUT_KIND = IS_WINDOWS ? 'wasapi_output_capture' : 'pulse_output_capture';
const OBS_IMAGE_KIND = 'image_source';
const OBS_MEDIA_KIND = 'ffmpeg_source';

async function getObsAvailableInputs() {
  if (!obsWsConnected || !obsWsClient) {
    return { connected: false, scenes: [], inputs: [], cameras: [], gameCaptures: [], audio: [], displays: [], windows: [] };
  }
  try {
    const [sceneRes, inputRes] = await Promise.all([
      obsWsClient.call('GetSceneList').catch(() => ({ scenes: [] })),
      obsWsClient.call('GetInputList').catch(() => ({ inputs: [] }))
    ]);

    const scenes = (sceneRes.scenes || []).map(s => (typeof s === 'string' ? s : (s.sceneName || s.name)));
    const inputs = inputRes.inputs || [];

    const cameras = inputs.filter(i => {
      const k = (i.inputKind || i.unversionedInputKind || '').toLowerCase();
      const n = (i.inputName || '').toLowerCase();
      return k.includes('dshow') || k.includes('v4l2') || k.includes('camera') || k.includes('video') || n.includes('cam') || n.includes('kamera');
    }).map(i => ({ name: i.inputName, kind: i.inputKind }));

    const gameCaptures = inputs.filter(i => {
      const k = (i.inputKind || i.unversionedInputKind || '').toLowerCase();
      const n = (i.inputName || '').toLowerCase();
      return k.includes('game') || k.includes('window') || k.includes('monitor') || k.includes('display') || k.includes('screen') || k.includes('pipewire') || k.includes('xcomposite') || n.includes('oyun') || n.includes('ekran');
    }).map(i => ({ name: i.inputName, kind: i.inputKind }));

    const audio = inputs.filter(i => {
      const k = (i.inputKind || i.unversionedInputKind || '').toLowerCase();
      const n = (i.inputName || '').toLowerCase();
      return k.includes('audio') || k.includes('wasapi') || k.includes('pulse') || k.includes('alsa') || n.includes('mic') || n.includes('ses');
    }).map(i => ({ name: i.inputName, kind: i.inputKind }));

    const displays = inputs.filter(i => {
      const k = (i.inputKind || i.unversionedInputKind || '').toLowerCase();
      return k.includes('monitor') || k.includes('display') || k.includes('screen') || k.includes('pipewire');
    }).map(i => ({ name: i.inputName, kind: i.inputKind }));

    const windows = inputs.filter(i => {
      const k = (i.inputKind || i.unversionedInputKind || '').toLowerCase();
      return k.includes('window') || k.includes('xcomposite');
    }).map(i => ({ name: i.inputName, kind: i.inputKind }));

    return { connected: true, scenes, inputs: inputs.map(i => i.inputName), cameras, gameCaptures, audio, displays, windows };
  } catch (err) {
    return { connected: false, error: err.message, scenes: [], inputs: [], cameras: [], gameCaptures: [], audio: [], displays: [], windows: [] };
  }
}

async function syncScenesToObs(scenesToSync) {
  if (!obsWsConnected || !obsWsClient) {
    await connectObsWebSocket();
  }
  if (!obsWsConnected || !obsWsClient) {
    const hint = (obsNativeConfigInfo && obsNativeConfigInfo.found && !obsNativeConfigInfo.serverEnabled)
      ? 'OBS üst menüsünden "Araçlar -> WebSocket Sunucu Ayarları -> WebSocket sunucusunu etkinleştir" kutucuğunu işaretleyip Uygula deyin (veya OBS\'i yeniden başlatın).'
      : 'OBS Studio\'nun açık olduğundan ve "Araçlar -> WebSocket Sunucu Ayarları" bölümünde sunucunun etkin olduğundan emin olun.';
    throw new Error(`OBS WebSocket şu anda bağlı değil (Port: ${obsWsPort}). ${hint}`);
  }

  const results = [];
  let existingSceneNames = [];
  let allObsInputs = [];
  try {
    const [listRes, inputsRes] = await Promise.all([
      obsWsClient.call('GetSceneList'),
      obsWsClient.call('GetInputList').catch(() => ({ inputs: [] }))
    ]);
    existingSceneNames = (listRes.scenes || []).map(s => (typeof s === 'string' ? s : (s.sceneName || s.name)));
    allObsInputs = (inputsRes.inputs || []).map(i => i.inputName);
  } catch (err) {
    throw new Error('OBS sahne listesi alınamadı: ' + err.message);
  }

  for (const sc of scenesToSync) {
    const sceneName = (sc.obsSceneName || sc.name || 'MİRA Sahnesi').trim();
    const createdLayers = [];

    // 1. Sahne yoksa oluştur
    if (!existingSceneNames.includes(sceneName)) {
      try {
        await obsWsClient.call('CreateScene', { sceneName });
        existingSceneNames.push(sceneName);
      } catch (err) {
        if (!err.message || (!err.message.includes('already exists') && !err.message.includes('ResourceAlreadyExists'))) {
          results.push({ sceneName, success: false, error: err.message });
          continue;
        }
      }
    }

    // Sahnedeki mevcut kaynakları kontrol et
    let sceneItems = [];
    try {
      const itemsRes = await obsWsClient.call('GetSceneItemList', { sceneName });
      sceneItems = itemsRes.sceneItems || [];
    } catch (e) {}

    // 2. MİRA Şeffaf Tarayıcı Katmanı (1080p 60 FPS Browser Source)
    // StreamElements / BotRix standardı: Kamera ve oyun yakalama OBS'te yönetilir, MİRA şeffaf HUD olarak üstte durur.
    // shutdown: true -> Aktif olmayan sahneler arka planda çalışıp sesi 2-3 kez okumasın!
    // reroute_audio: false -> Ses doğrudan Masaüstü Sesine temiz iletilsin, OBS monitör kapalıyken sessiz kalmasın!
    const browserCfg = (sc.sources && sc.sources.browser) || {};
    const browserSourceName = (browserCfg.name || sc.obsSourceName || `MİRA Overlay - ${sc.name || sceneName}`).trim();
    const url = (browserCfg.url || sc.targetUrl || `http://127.0.0.1:${PORT}/custom-overlay.html?id=${sc.id}`).trim();
    const width = parseInt(browserCfg.width || sc.width, 10) || 1920;
    const height = parseInt(browserCfg.height || sc.height, 10) || 1080;
    const fps = parseInt(browserCfg.fps || sc.fps, 10) || 60;
    const obsBrowserCss = [
      'body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }',
      '#chat-messages iframe ~ .hero-chat-entry, #chat-messages.has-widget-iframe .hero-chat-entry { display: none !important; }',
      '@keyframes miraChatFadeOut { 0%, 85% { opacity: 1; max-height: 200px; transform: translateY(0); } 100% { opacity: 0; max-height: 0; margin-top: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; border-width: 0; transform: translateY(-6px); pointer-events: none; overflow: hidden; } }',
      '.hero-chat-entry, .mod-chat-msg, .large-chat-entry, .deluxe-chat-entry { animation: miraChatFadeOut 15s ease forwards !important; }'
    ].join('\n');

    const existingInScene = sceneItems.find(it => it.sourceName === browserSourceName);
    if (existingInScene) {
      try {
        await obsWsClient.call('SetInputSettings', {
          inputName: browserSourceName,
          inputSettings: { url, width, height, fps, css: obsBrowserCss, restart_when_active: true, shutdown: true, reroute_audio: false }
        });
        createdLayers.push(`🌐 ${browserSourceName} (1080p Güncellendi)`);
      } catch(e){}
    } else {
      if (allObsInputs.includes(browserSourceName)) {
        try {
          await obsWsClient.call('CreateSceneItem', { sceneName, sourceName: browserSourceName });
          await obsWsClient.call('SetInputSettings', {
            inputName: browserSourceName,
            inputSettings: { url, width, height, fps, css: obsBrowserCss, restart_when_active: true, shutdown: true, reroute_audio: false }
          });
          createdLayers.push(`🌐 ${browserSourceName} (Sahneye Eklendi)`);
        } catch(e){}
      } else {
        try {
          await obsWsClient.call('CreateInput', {
            sceneName,
            inputName: browserSourceName,
            inputKind: 'browser_source',
            inputSettings: { url, width, height, fps, css: obsBrowserCss, restart_when_active: true, shutdown: true, reroute_audio: false },
            sceneItemEnabled: true
          });
          allObsInputs.push(browserSourceName);
          createdLayers.push(`🌐 ${browserSourceName} (1080p60 Şeffaf Katman Oluşturuldu)`);
        } catch(e){}
      }
    }

    results.push({
      sceneName,
      layers: createdLayers,
      success: true
    });
  }

  return results;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
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
          const widgetTxtPath = path.join(DATA_DIR, 'chat-widget.txt');
          try { fs.writeFileSync(widgetTxtPath, (data.url || '').trim(), 'utf-8'); } catch(e){}
        }

        if (data.type === 'UPDATE_GOAL' && data.goal) {
          studioStats.goal = { ...studioStats.goal, ...data.goal };
          saveStreamStats();
        }
        if (data.type === 'UPDATE_STATS' && data.stats) {
          studioStats.recent = { ...studioStats.recent, ...data.stats };
          saveStreamStats();
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
    const slug = (parsedUrl.searchParams.get('slug') || activeKickStatus.slug || (studioStats.streamer && studioStats.streamer.kickSlug) || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!slug) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ followers_count: 0, followersCount: 0 }));
    }
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
      if (!res.headersSent) {
        res.writeHead(proxyRes.statusCode || 200, { 'Content-Type': 'application/json' });
      }
      proxyRes.on('error', () => {
        if (!res.writableEnded) res.end();
      });
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      } else if (!res.writableEnded) {
        res.end();
      }
    });
    proxyReq.end();
    return;
  }

  // 2.41 API: Kick Canlı Durumu
  if (pathname === '/api/kick/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ...activeKickStatus,
      streamerUsername: studioStats.streamer?.username || activeKickStatus.slug || 'Yayıncı'
    }));
  }

  // 2.42 API: Kick Kanalını Doğrula, Bağla & Pusher Başlat
  if (pathname === '/api/kick/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const cleanSlug = (d.slug || d.kickSlug || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
        if (!cleanSlug) throw new Error('Geçerli bir Kick kanal adı giriniz (Örn: gamer_deniz)');

        fetchKickChannelInfo(cleanSlug)
          .then(channelData => {
            if (!studioStats.streamer) studioStats.streamer = {};
            studioStats.streamer.kickSlug = cleanSlug;
            studioStats.streamer.username = (d.username || cleanSlug).trim();
            if (d.kickToken !== undefined) {
              studioStats.streamer.kickToken = normalizeKickToken(d.kickToken);
            }
            saveStreamStats();

            startKickPusherBridge(cleanSlug, channelData);

            eventQueue.push({
              type: 'UPDATE_STREAMER',
              streamer: studioStats.streamer,
              time: Date.now()
            });

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              slug: cleanSlug,
              followersCount: parseCount(channelData.followers_count ?? channelData.followersCount) ?? 0,
              streamer: studioStats.streamer,
              status: activeKickStatus
            }));
          })
          .catch(err => {
            console.error(`[KICK CONNECT] "${cleanSlug}" doğrulanamadı:`, err.message);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: err.message || `Kick üzerinde "${cleanSlug}" adında bir kanal bulunamadı.`
            }));
          });
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 2.421 API: Kick Bağlantısını Kes / Hesabı Kaldır (Veri Silmeden Temizle)
  if (pathname === '/api/kick/disconnect' && req.method === 'POST') {
    stopKickPusherBridge(true);
    eventQueue.push({
      type: 'UPDATE_STREAMER',
      streamer: studioStats.streamer,
      time: Date.now()
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Kick hesabı bağlantısı başarıyla kaldırıldı',
      streamer: studioStats.streamer,
      status: activeKickStatus
    }));
  }

  // 2.422 API: Kick Yeniden Bağlan / Kanal Değiştir
  if (pathname === '/api/kick/reconnect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const slug = (d.slug || activeKickStatus.slug || studioStats.streamer?.kickSlug || '').trim();
        if (slug) startKickPusherBridge(slug);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, status: activeKickStatus }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.422 API: Yayıncı Ayarları (GET / POST)
  if (pathname === '/api/streamer/config') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        streamer: studioStats.streamer || { username: '', kickSlug: '' },
        kickStatus: activeKickStatus,
        obs: { port: obsWsPort, connected: obsWsConnected, currentScene: obsCurrentScene }
      }));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const d = JSON.parse(body || '{}');
          if (!studioStats.streamer) studioStats.streamer = {};
          if (d.username !== undefined) studioStats.streamer.username = d.username;
          if (d.kickToken !== undefined) {
            studioStats.streamer.kickToken = normalizeKickToken(d.kickToken);
            if (activeKickStatus.slug) {
              syncKickInternalEvents(activeKickStatus.slug, true).catch(() => {});
            }
          }
          if (d.kickSlug !== undefined) {
            const clean = d.kickSlug.replace(/[^a-zA-Z0-9_-]/g, '').trim();
            studioStats.streamer.kickSlug = clean;
            if (clean && (!studioStats.streamer.username || studioStats.streamer.username === 'Yayıncı' || studioStats.streamer.username === 'MİRA')) {
              studioStats.streamer.username = clean;
            }
            if (clean && clean !== activeKickStatus.slug) {
              startKickPusherBridge(clean);
            } else if (!clean) {
              if (kickPusherWs) { try { kickPusherWs.close(); } catch(e){} kickPusherWs = null; }
              activeKickStatus = {
                connected: false,
                slug: '',
                chatroomId: null,
                channelId: null,
                followersCount: 0,
                lastMessageAt: null,
                error: null
              };
            }
          }
          saveStreamStats();
          eventQueue.push({ type: 'UPDATE_STREAMER', streamer: studioStats.streamer, time: Date.now() });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, streamer: studioStats.streamer }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.425 API: Canlı Sohbeti Temizle (MİRA + OBS Overlay)
  if (pathname === '/api/clear-chat' && req.method === 'POST') {
    for (let i = eventQueue.length - 1; i >= 0; i--) {
      if (eventQueue[i].type === 'CHAT_MESSAGE' || eventQueue[i].type === 'TEST_CHAT') {
        eventQueue.splice(i, 1);
      }
    }
    const clearItem = {
      id: 'clear_' + Date.now(),
      type: 'CLEAR_CHAT',
      time: Date.now()
    };
    eventQueue.push(clearItem);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, item: clearItem }));
  }

  // 2.43 API: Canlı Chat Mesajı Gönder (Yayıncı Mesajı)
  if (pathname === '/api/chat-message' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        if (d.type === 'CLEAR_CHAT') {
          for (let i = eventQueue.length - 1; i >= 0; i--) {
            if (eventQueue[i].type === 'CHAT_MESSAGE' || eventQueue[i].type === 'TEST_CHAT') {
              eventQueue.splice(i, 1);
            }
          }
          const clearItem = { id: 'clear_' + Date.now(), type: 'CLEAR_CHAT', time: Date.now() };
          eventQueue.push(clearItem);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, item: clearItem }));
        }
        const resolvedStreamerName = (d.username && d.username !== 'Yayıncı' && d.username !== 'MİRA')
          ? d.username
          : ((studioStats.streamer?.username && studioStats.streamer.username !== 'Yayıncı') ? studioStats.streamer.username : (activeKickStatus.slug || studioStats.streamer?.kickSlug || d.username || 'Yayıncı'));
        const item = {
          id: d.id || ('msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
          senderSession: d.senderSession,
          type: 'CHAT_MESSAGE',
          platform: d.platform || 'kick',
          username: resolvedStreamerName,
          content: d.content || '',
          badge: d.badge || 'streamer',
          isStreamer: d.isStreamer !== undefined ? d.isStreamer : true,
          color: d.color || '#f59e0b',
          time: Date.now()
        };
        if (item.isStreamer && item.content) {
          recordDirectSentKickMsg(item.content);
        }
        eventQueue.push(item);
        if (eventQueue.length > 80) eventQueue.shift();

        const kickToken = (d.kickToken || studioStats.streamer?.kickToken || '').trim();
        const chatroomId = activeKickStatus.chatroomId;
        if (kickToken && chatroomId && item.content) {
          sendKickChatMessageDirect(chatroomId, item.content, kickToken)
            .then(kickRes => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, item, kickSent: !!kickRes.sent, kickResult: kickRes }));
            })
            .catch(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, item, kickSent: false }));
            });
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item, kickSent: false, reason: kickToken ? 'no_chatroom' : 'no_token' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.44 API: OBS Ses Kaynakları Listesi
  if (pathname === '/api/obs/audio-sources' && req.method === 'GET') {
    getObsAudioInputs((err, sources) => {
      if (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, sources: [
          { name: 'Desktop Audio', kind: 'pulse_output_capture', volumeMul: obsSavedMusicVolume }
        ], error: err.message, savedVolume: obsSavedMusicVolume, isDucked: obsIsDucked }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, sources, savedVolume: obsSavedMusicVolume, isDucked: obsIsDucked }));
    });
    return;
  }

  // 2.45 API: OBS Müzik / Arka Plan Ses Seviyesi Ayarla
  if (pathname === '/api/obs/volume' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const inputName = d.inputName || 'Desktop Audio';
        const volumeMul = d.volumeMul !== undefined ? d.volumeMul : (d.volume !== undefined ? d.volume : 1.0);
        setObsAudioVolume(inputName, volumeMul, (err, result) => {
          if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, ...result }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.46 API: OBS Ses Kısma (Audio Ducking - TTS Konuşurken Müziği Otomatik Kıs)
  if (pathname === '/api/obs/ducking' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const duck = d.duck !== undefined ? !!d.duck : (d.enabled !== undefined ? !!d.enabled : false);
        const inputName = d.inputName || 'Desktop Audio';
        setObsDucking(duck, inputName, (err, result) => {
          if (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: false, error: err.message }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, ...result }));
        });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.1 API: Müzik / Now Playing Al & Güncelle (Spotify / Snip / Tuna entegrasyonu)
  if (pathname === '/api/now-playing') {
    const txtPath = path.join(DATA_DIR, 'now-playing.txt');
    if (req.method === 'GET') {
      let elapsed = currentSongProgress;
      if (!isTunaOnline && currentSongStatus === 'playing') {
        const diffSec = Math.floor((Date.now() - currentSongLastUpdate) / 1000);
        elapsed = Math.min(currentSongDuration || 210, currentSongProgress + diffSec);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        title: currentSongTitle,
        artist: currentSongArtist,
        coverUrl: currentSongCover || '/api/tuna/cover',
        progress: elapsed,
        duration: currentSongDuration,
        status: currentSongStatus,
        isTuna: isTunaOnline,
        obsConnected: obsWsConnected,
        filePath: txtPath
      }));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.title !== undefined) currentSongTitle = data.title;
          if (data.artist !== undefined) currentSongArtist = data.artist;
          if (data.coverUrl !== undefined) currentSongCover = data.coverUrl;
          if (data.progress !== undefined) currentSongProgress = Number(data.progress);
          if (data.duration !== undefined) currentSongDuration = Number(data.duration);
          if (data.status !== undefined) currentSongStatus = data.status;
          currentSongLastUpdate = Date.now();

          try { fs.writeFileSync(txtPath, currentSongTitle, 'utf-8'); } catch(e){}
          eventQueue.push({
            type: 'UPDATE_SONG',
            title: currentSongTitle,
            artist: currentSongArtist,
            coverUrl: currentSongCover || '/api/tuna/cover',
            progress: currentSongProgress,
            duration: currentSongDuration,
            status: currentSongStatus,
            source: data.source || 'mira',
            time: Date.now()
          });

          // OBS WebSocket üzerinden metin kaynağını otomatik güncelle
          if (obsWsClient && obsWsConnected) {
            setObsTextSource(data.obsSourceName || 'Now Playing', currentSongTitle);
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            title: currentSongTitle,
            artist: currentSongArtist,
            coverUrl: currentSongCover || '/api/tuna/cover',
            progress: currentSongProgress,
            duration: currentSongDuration,
            obsConnected: obsWsConnected
          }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.1b API: Tuna / Spotify Albüm Kapağı Proxy
  if (pathname === '/api/tuna/cover' && (req.method === 'GET' || req.method === 'HEAD')) {
    const reqCover = http.get(`http://127.0.0.1:${tunaPort}/cover.png`, (cRes) => {
      if (cRes.statusCode === 200) {
        res.writeHead(200, {
          'Content-Type': cRes.headers['content-type'] || 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        });
        return cRes.pipe(res);
      }
      fallbackCover();
    });
    reqCover.on('error', () => fallbackCover());
    reqCover.setTimeout(1200, () => {
      reqCover.destroy();
      fallbackCover();
    });

    function fallbackCover() {
      if (currentSongCover && currentSongCover.startsWith('http')) {
        res.writeHead(302, { 'Location': currentSongCover });
        return res.end();
      }
      const iconPath = path.join(__dirname, 'assets', 'icon.png');
      if (fs.existsSync(iconPath)) {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
        return fs.createReadStream(iconPath).pipe(res);
      }
      res.writeHead(404);
      res.end();
    }
    return;
  }

  // 2.15 API: Tuna Web Sunucusu Kontrolü & Canlı Şarkı Çekme
  if (pathname === '/api/tuna/check' && req.method === 'GET') {
    const port = parsedUrl.searchParams.get('port') || '1608';
    const reqTuna = http.get(`http://127.0.0.1:${port}/`, (tRes) => {
      let tBody = '';
      tRes.on('data', chunk => tBody += chunk);
      tRes.on('end', () => {
        try {
          const parsed = JSON.parse(tBody);
          if (parsed && (parsed.title || parsed.song)) {
            const tTitle = parsed.title || parsed.song;
            const tArtist = Array.isArray(parsed.artists) ? parsed.artists.join(', ') : (parsed.artist || '');
            const tDur = parsed.duration ? Math.floor(parsed.duration / 1000) : (parsed.duration_ms ? Math.floor(parsed.duration_ms / 1000) : currentSongDuration);
            const tProg = parsed.progress ? Math.floor(parsed.progress / 1000) : (parsed.progress_ms ? Math.floor(parsed.progress_ms / 1000) : 0);
            if (tTitle) currentSongTitle = tTitle;
            if (tArtist) currentSongArtist = tArtist;
            if (tDur) currentSongDuration = tDur;
            currentSongProgress = tProg;
            currentSongLastUpdate = Date.now();
            currentSongStatus = parsed.status || 'playing';
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ active: true, port, data: parsed }));
        } catch(e) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ active: true, port, raw: tBody.trim() }));
        }
      });
    });
    reqTuna.on('error', (err) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ active: false, port, error: err.message }));
    });
    reqTuna.setTimeout(1200, () => {
      reqTuna.destroy();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ active: false, port, error: 'Zaman aşımı' }));
    });
    return;
  }

  // 2.16 API: TTS (Sesli Okuma) Ayarları Kalıcılığı & Senkronizasyon
  if (pathname === '/api/tts/config') {
    const ttsConfigPath = path.join(DATA_DIR, 'tts-config.json');
    if (req.method === 'GET') {
      try {
        if (fs.existsSync(ttsConfigPath)) {
          const raw = fs.readFileSync(ttsConfigPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(raw);
        }
      } catch(e) {}
      const defaultTts = {
        ttsAlertsEnabled: true,
        ttsChatEnabled: false,
        outputMode: 'studio',
        volume: 1.0,
        rate: 1.0,
        pitch: 1.0,
        voiceName: 'mira_natural_tr',
        voiceLang: 'tr-TR',
        chatFormat: '{user} diyor ki: {message}',
        readStreamerSelf: false,
        filterBotCommands: true,
        filterUrls: true,
        maxChatLength: 100,
        alertTemplates: {
          follower: '{user} aramıza katıldı, hoş geldin!',
          sub: 'Teşekkürler {user}, {months}. ayında abone oldu!',
          gift: '{user}, topluluğa {gift} hediye abonelik dağıttı!',
          donation: '{user}, {amount} destek gönderdi: {message}',
          kicks: '{user}, {amount} gönderdi: {message}',
          raid: '{user}, {count} izleyiciyle baskın yaptı!'
        }
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(defaultTts));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          fs.writeFileSync(ttsConfigPath, JSON.stringify(data, null, 2), 'utf-8');
          eventQueue.push({
            type: 'UPDATE_TTS_CONFIG',
            config: data,
            time: Date.now()
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, config: data }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.16B API: Canlı Yayın Hedef & İstatistik (Stream Stats & Goals)
  if (pathname === '/api/stream-stats') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(studioStats));
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.goal) {
            studioStats.goal = { ...studioStats.goal, ...data.goal };
            eventQueue.push({
              type: 'UPDATE_GOAL',
              goal: studioStats.goal,
              time: Date.now()
            });
          }
          if (data.recent) {
            studioStats.recent = { ...studioStats.recent, ...data.recent };
            eventQueue.push({
              type: 'UPDATE_STATS',
              stats: studioStats.recent,
              time: Date.now()
            });
          }
          if (data.session) {
            studioStats.session = { ...studioStats.session, ...data.session };
          }
          if (data.resetSession) {
            studioStats.session = {
              followers: 0,
              subs: 0,
              kicks: 0,
              gifts: 0,
              startedAt: Date.now()
            };
          }
          saveStreamStats();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, stats: studioStats }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // 2.17 API: TTS Ses Akışı (OBS, Linux ve Windows'ta %100 Çalışan Doğal Türkçe Ses + Global Tekil Ses Kilidi)
  if (pathname === '/api/tts/audio' && req.method === 'GET') {
    let text = (parsedUrl.searchParams.get('text') || '').trim();
    const lang = (parsedUrl.searchParams.get('lang') || 'tr').toLowerCase();
    const pitch = Math.max(0.5, Math.min(2.0, parseFloat(parsedUrl.searchParams.get('pitch') || '1.0') || 1.0));
    const rate = Math.max(0.5, Math.min(2.0, parseFloat(parsedUrl.searchParams.get('rate') || '1.0') || 1.0));
    const isForceTest = parsedUrl.searchParams.get('force') === '1';

    if (!text) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Text parametresi gerekli' }));
    }

    if (text.length > 250) {
      text = text.substring(0, 250);
    }

    // Sunucu Tabanlı Global Tekil TTS Kilidi (Hem MİRA Studio hem OBS Browser Source açıkken 2-3 kez okumayı %100 engeller)
    if (!global._recentServerTtsClaims) global._recentServerTtsClaims = new Map();
    const nowMs = Date.now();
    for (const [k, exp] of global._recentServerTtsClaims.entries()) {
      if (exp <= nowMs) global._recentServerTtsClaims.delete(k);
    }
    const normDedupeKey = text
      .toLowerCase()
      .replace(/^[^:]{1,35}:\s*/, '')
      .replace(/\bdiyor ki\b/g, '')
      .replace(/[^a-z0-9\u00c0-\u024f]/gi, '')
      .slice(0, 80) || text.toLowerCase();

    if (!isForceTest && normDedupeKey) {
      const existingExp = global._recentServerTtsClaims.get(normDedupeKey);
      if (existingExp && existingExp > nowMs) {
        // İkinci/üçüncü pencere aynı mesajı okumak istediğinde 44-byte sessiz WAV döndür (hata vermez, 2. kez ses çıkarmaz)
        const silentWav = Buffer.from(
          'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
          'base64'
        );
        res.writeHead(200, {
          'Content-Type': 'audio/wav',
          'Content-Length': silentWav.length,
          'Cache-Control': 'no-store'
        });
        return res.end(silentWav);
      }
      global._recentServerTtsClaims.set(normDedupeKey, nowMs + 5500);
    }

    const ttsCacheDir = path.join(DATA_DIR, 'tts_cache');
    try {
      if (!fs.existsSync(ttsCacheDir)) {
        fs.mkdirSync(ttsCacheDir, { recursive: true });
      }
    } catch(e) {}

    const textHash = crypto.createHash('md5').update(`${lang}_${text}`).digest('hex');
    const baseFilePath = path.join(ttsCacheDir, `base_${textHash}.mp3`);

    const pitchStr = pitch.toFixed(2);
    const rateStr = rate.toFixed(2);
    const isTransformed = Math.abs(pitch - 1.0) >= 0.03 || Math.abs(rate - 1.0) >= 0.03;
    const finalHash = crypto.createHash('md5').update(`v3studio_${lang}_p${pitchStr}_r${rateStr}_${text}`).digest('hex');
    const finalFilePath = path.join(ttsCacheDir, `boost_${finalHash}.mp3`);

    let audioResponseSent = false;
    const serveFinalAudio = (filePath) => {
      if (audioResponseSent || res.headersSent) return;
      audioResponseSent = true;
      try {
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stat.size,
          'Cache-Control': 'no-store'
        });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ses dosyası okunamadı' }));
        }
      }
    };

    // 1. Nihai yükseltilmiş ses önbellekte var mı?
    if (fs.existsSync(finalFilePath)) {
      return serveFinalAudio(finalFilePath);
    }

    // 2. Base sesi elde et (varsa kullan, yoksa Google'dan indir) ve FFmpeg ile ses gücünü (compressor + +9dB boost) yükselt
    const applyTransformAndServe = (inputMp3) => {
      let settled = false;
      const finishTransform = (useBoosted) => {
        if (settled) return;
        settled = true;
        if (useBoosted && fs.existsSync(finalFilePath)) {
          serveFinalAudio(finalFilePath);
        } else {
          serveFinalAudio(inputMp3);
        }
      };

      // Stüdyo Yayını Ses İşleme Zinciri: 80Hz Low-cut, 250Hz kutu sesini alma, 3.2kHz vokal varlığı (+3.5dB Presence), 7.5kHz parlaklık ve transparan broadcast kompresör
      const boostChain = 'highpass=f=80,equalizer=f=250:t=q:w=1.5:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=3.5,treble=g=1.5:f=7500,acompressor=threshold=-14dB:ratio=2.5:attack=12:release=75:makeup=5dB,volume=1.6,alimiter=limit=0.96:level=false';
      const afFilter = isTransformed
        ? `rubberband=pitch=${pitchStr}:tempo=${rateStr},${boostChain}`
        : boostChain;

      try {
        const ffmpeg = spawn('ffmpeg', [
          '-y',
          '-i', inputMp3,
          '-af', afFilter,
          finalFilePath
        ], { windowsHide: true });

        ffmpeg.on('close', (code) => {
          finishTransform(code === 0);
        });

        ffmpeg.on('error', () => {
          finishTransform(false);
        });
      } catch (e) {
        finishTransform(false);
      }
    };

    if (fs.existsSync(baseFilePath)) {
      return applyTransformAndServe(baseFilePath);
    }

    const serveEspeakFallback = () => {
      if (process.platform === 'win32') {
        // Windows: PowerShell System.Speech ile geçici WAV üret veya 503 döndür
        const winWavPath = path.join(ttsCacheDir, `win_${textHash}.wav`);
        const safeText = text.replace(/'/g, "''").replace(/[\r\n]+/g, ' ');
        const psScript = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('${winWavPath.replace(/'/g, "''")}'); $s.Speak('${safeText}'); $s.Dispose()`;
        const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { windowsHide: true });
        ps.on('close', (code) => {
          if (code === 0 && fs.existsSync(winWavPath)) {
            try {
              const stat = fs.statSync(winWavPath);
              res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': stat.size });
              return fs.createReadStream(winWavPath).pipe(res);
            } catch (e) {}
          }
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'TTS çevrimdışı' }));
          }
        });
        ps.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'TTS çevrimdışı' }));
          }
        });
        return;
      }
      try {
        const espeak = spawn('espeak', ['-v', lang === 'tr' ? 'tr' : 'en', text, '--stdout'], { windowsHide: true });
        let chunks = [];
        espeak.stdout.on('data', d => chunks.push(d));
        espeak.on('close', (code) => {
          const buf = Buffer.concat(chunks);
          if (code === 0 && buf.length > 44 && !res.headersSent) {
            res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': buf.length });
            res.end(buf);
          } else if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'TTS ses sentezi başarısız' }));
          }
        });
        espeak.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'TTS ses sentezi başarısız' }));
          }
        });
      } catch(e) {
        if (!res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'TTS ses sentezi başarısız' }));
        }
      }
    };

    // Google Translate TTS'ten ham sesi indir (2 deneme + yüksek zaman aşımı ile espeak'e gereksiz düşmeyi önle)
    const fetchGoogleTts = (attempt = 1) => {
      const clientParam = attempt === 1 ? 'tw-ob' : 'gtx';
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=${clientParam}`;
      const ttsReq = https.get(googleTtsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'audio/mpeg, audio/*; q=0.9, */*; q=0.1'
        }
      }, (googleRes) => {
        if (googleRes.statusCode === 200) {
          const fileStream = fs.createWriteStream(baseFilePath);
          googleRes.pipe(fileStream);
          fileStream.on('finish', () => {
            applyTransformAndServe(baseFilePath);
          });
          fileStream.on('error', () => {
            if (attempt < 2) fetchGoogleTts(attempt + 1);
            else serveEspeakFallback();
          });
        } else {
          googleRes.resume();
          if (attempt < 2) fetchGoogleTts(attempt + 1);
          else serveEspeakFallback();
        }
      });

      ttsReq.on('error', () => {
        if (attempt < 2) fetchGoogleTts(attempt + 1);
        else serveEspeakFallback();
      });
      ttsReq.setTimeout(7000, () => {
        ttsReq.destroy();
        if (attempt < 2) fetchGoogleTts(attempt + 1);
        else serveEspeakFallback();
      });
    };

    fetchGoogleTts(1);
    return;
  }

  // 2.5 API: Chat Widget URL Al & Güncelle (BotRix / TikFinity kalıcılığı)
  if (pathname === '/api/chat-widget') {
    const widgetTxtPath = path.join(DATA_DIR, 'chat-widget.txt');
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
      port: obsWsPort,
      hasPassword: !!obsWsPassword,
      currentScene: obsCurrentScene,
      nativeConfig: obsNativeConfigInfo
    }));
  }

  // 2.71 API: OBS WebSocket Bağlan / Ayarları Güncelle
  if (pathname === '/api/obs/connect' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const d = JSON.parse(body || '{}');
        const port = parseInt(d.port || 4455, 10) || 4455;
        const password = d.password !== undefined ? d.password : obsWsPassword;

        if (!studioStats.obs) studioStats.obs = {};
        studioStats.obs.port = port;
        if (d.password !== undefined && d.password !== '') {
          studioStats.obs.password = password;
        }
        saveStreamStats();

        if (obsWsClient) {
          try { obsWsClient.disconnect(); } catch(e){}
          obsWsClient = null;
          obsWsConnected = false;
        }

        await connectObsWebSocket(port, password);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          connected: obsWsConnected,
          port: obsWsPort,
          currentScene: obsCurrentScene,
          nativeConfig: obsNativeConfigInfo
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.8 API: OBS Sahnesi Değiştir (Otomatik Sahne Geçişi)
  if (pathname === '/api/obs/set-scene' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const target = OBS_SCENE_MAP[data.sceneKey] || data.sceneName || data.scene;
        if (!target) throw new Error('Geçersiz sahne');

        if (!obsWsConnected) {
          await connectObsWebSocket();
        }
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

  // 2.81 API: OBS Mevcut Girdileri (Kamera, Oyun, Ekran, Ses, Sahneler)
  if (pathname === '/api/obs/inputs' && req.method === 'GET') {
    getObsAvailableInputs().then(data => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, connected: false }));
    });
    return;
  }

  // 2.811 API: OBS Pull Devre Dışı Bırakıldı (Yalnızca Push / Aktarım Kullanılır)
  if (pathname === '/api/obs/pull-scenes' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: false,
      message: 'OBS Pull özelliği kullanıcı isteğiyle kaldırıldı. Yalnızca MİRA -> OBS Push aktarımı kullanılmaktadır.'
    }));
  }

  // 2.82 API: Aktif Yayın Sahneleri Listesi (GET)
  if (pathname === '/api/scenes' && req.method === 'GET') {
    const scenes = loadActiveScenes();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      scenes,
      obsConnected: obsWsConnected,
      obsPort: obsWsPort
    }));
  }

  // 2.83 API: Aktif Yayın Sahnesi Ekle (POST)
  if (pathname === '/api/scenes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const d = JSON.parse(body || '{}');
        const scenes = loadActiveScenes();
        const newId = d.id || ('sc_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4));
        const newScene = {
          id: newId,
          name: (d.name || 'Yeni Sahne').trim(),
          obsSceneName: (d.obsSceneName || d.name || 'MİRA - Yeni Sahne').trim(),
          obsSourceName: (d.obsSourceName || `MİRA Overlay - ${d.name || 'Sahne'}`).trim(),
          targetUrl: (d.targetUrl || `http://127.0.0.1:${PORT}/custom-overlay.html?id=${newId}`).trim(),
          category: d.category || 'custom',
          icon: d.icon || '🎬',
          badge: d.badge || 'ÖZEL',
          description: d.description || '',
          sources: d.sources || {
            browser: { enabled: true, name: (d.obsSourceName || `MİRA Overlay - ${d.name || 'Sahne'}`).trim() },
            camera: { enabled: !!d.enableCamera, name: d.cameraSourceName || 'Kamera' },
            game: { enabled: !!d.enableGame, name: d.gameSourceName || 'Oyun Yakalama' }
          },
          width: parseInt(d.width, 10) || 1920,
          height: parseInt(d.height, 10) || 1080,
          fps: parseInt(d.fps, 10) || 60,
          galleryId: d.galleryId || null,
          order: scenes.length + 1
        };
        scenes.push(newScene);
        saveActiveScenes(scenes);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, scene: newScene, scenes }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.84 API: Aktif Sahneyi Düzenle (PUT)
  if (pathname.startsWith('/api/scenes/') && req.method === 'PUT') {
    const scId = decodeURIComponent(pathname.replace('/api/scenes/', '')).trim();
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body || '{}');
        const scenes = loadActiveScenes();
        const idx = scenes.findIndex(s => s.id === scId);
        if (idx === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Sahne bulunamadı' }));
        }
        scenes[idx] = { ...scenes[idx], ...updates, id: scId };
        saveActiveScenes(scenes);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, scene: scenes[idx], scenes }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 2.85 API: Aktif Sahneyi Listeden Çıkar (DELETE)
  if (pathname.startsWith('/api/scenes/') && req.method === 'DELETE') {
    const scId = decodeURIComponent(pathname.replace('/api/scenes/', '')).trim();
    const scenes = loadActiveScenes();
    const filtered = scenes.filter(s => s.id !== scId);
    saveActiveScenes(filtered);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, scenes: filtered }));
  }

  // 2.86 API: Aktif Sahneleri Sıfırla (POST)
  if (pathname === '/api/scenes/reset' && req.method === 'POST') {
    saveActiveScenes(DEFAULT_ACTIVE_SCENES);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, scenes: DEFAULT_ACTIVE_SCENES }));
  }

  // 2.87 API: TEK TIKLA OBS'E AKTAR (Tüm Aktif Sahneleri OBS'te Otomatik Oluştur)
  if (pathname === '/api/obs/sync-scenes' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const d = JSON.parse(body || '{}');
        const scenes = loadActiveScenes();
        const targets = Array.isArray(d.sceneIds) && d.sceneIds.length > 0
          ? scenes.filter(s => d.sceneIds.includes(s.id))
          : scenes;

        if (targets.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Aktarılacak aktif sahne bulunamadı' }));
        }

        const results = await syncScenesToObs(targets);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          results,
          total: results.length,
          syncedCount: results.filter(r => r.success).length,
          obsConnected: obsWsConnected
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, obsConnected: obsWsConnected }));
      }
    });
    return;
  }

  // 2.88 API: Tek Bir Sahneyi OBS'e Aktar
  if (pathname === '/api/obs/sync-single-scene' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const d = JSON.parse(body || '{}');
        const scenes = loadActiveScenes();
        const sc = scenes.find(s => s.id === d.sceneId);
        if (!sc) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Sahne bulunamadı' }));
        }

        const results = await syncScenesToObs([sc]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          result: results[0] || null,
          obsConnected: obsWsConnected
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, obsConnected: obsWsConnected }));
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
          // Boş Tuval (Blank Canvas) veya Özel Tasarım Atölyesi'nde Oluşturulan Öğe (Kart / Arka Plan / Alert / Sahne)
          const cat = data.category || 'canvas';
          const prefix = cat === 'card' ? 'custom_card_' : (cat === 'background' ? 'custom_bg_' : (cat === 'alert' ? 'custom_alert_' : 'canvas_'));
          const uid = prefix + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const cfg = data.config || {};
          newItem = {
            id: uid,
            templateId: data.customTemplateType || 'blank_canvas',
            category: cat,
            cardType: data.cardType || cfg.cardType || (cat === 'background' ? 'background' : null),
            isCustomDesigned: !!data.isCustomDesigned,
            name: data.name || 'Özel Tasarım Öğe',
            subtitle: data.subtitle || 'Özel Tasarım Atölyesi ile Sıfırdan Oluşturuldu',
            icon: data.icon || (cat === 'background' ? '🌌' : (cat === 'card' ? '🃏' : (cat === 'alert' ? '⚡' : '🎨'))),
            badge: data.badge || (cat === 'background' ? 'ÖZEL ARKA PLAN' : (cat === 'card' ? 'ÖZEL TASARIM KART' : (cat === 'alert' ? 'ÖZEL ALERT' : 'ÖZEL TUVAL'))),
            previewImg: data.previewImg || cfg.bgImage || cfg.imageUrl || cfg.avatarUrl || null,
            basePath: 'custom-overlay.html',
            obsKey: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            config: cfg
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
          previewImg: updates.previewImg !== undefined ? updates.previewImg : current.previewImg,
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

  // ==========================================
  // 2.95 API: ŞABLON İÇE & DIŞA AKTARMA (IMPORT / EXPORT .mira) + GÖRSEL PAKETLEME
  // ==========================================
  // Yardımcı: Yerel dosya yolunu (örn. /uploads/...) Base64 Data URL'e çevirir
  function getLocalAssetAsDataUrl(assetUrl) {
    if (!assetUrl || typeof assetUrl !== 'string') return null;
    if (assetUrl.startsWith('data:image/')) return assetUrl;
    let diskPath = null;
    const cleanUrl = assetUrl.split('?')[0];
    if (cleanUrl.startsWith('/uploads/') || cleanUrl.startsWith('uploads/')) {
      const filename = path.basename(decodeURIComponent(cleanUrl));
      diskPath = path.join(UPLOADS_DIR, filename);
    }
    if (diskPath && fs.existsSync(diskPath)) {
      try {
        const ext = path.extname(diskPath).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.gif') mime = 'image/gif';
        else if (ext === '.webp') mime = 'image/webp';
        else if (ext === '.svg') mime = 'image/svg+xml';
        const b64 = fs.readFileSync(diskPath).toString('base64');
        return `data:${mime};base64,${b64}`;
      } catch (e) {
        console.error('[AssetPacker Error]', e.message);
      }
    }
    return null;
  }

  // Şablon(lar) içindeki tüm özel /uploads/ resimlerini toplayıp pakete gömer
  function bundleAssetsForTemplates(templatesList) {
    const assetsMap = {};
    function scanObject(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const k of Object.keys(obj)) {
        const val = obj[k];
        if (typeof val === 'string') {
          if (val.startsWith('/uploads/') || val.startsWith('uploads/')) {
            if (!assetsMap[val]) {
              const dataUrl = getLocalAssetAsDataUrl(val);
              if (dataUrl) assetsMap[val] = dataUrl;
            }
          }
        } else if (typeof val === 'object') {
          scanObject(val);
        }
      }
    }
    for (const tpl of templatesList) {
      scanObject(tpl);
    }
    return assetsMap;
  }

  // İçe aktarılan paketteki gömülü resimleri kullanıcının yerel UPLOADS_DIR dizinine yazar ve URL'leri günceller
  function unpackAndRestoreAssets(template, assetsMap) {
    if (!template) return template;
    let tplStr = JSON.stringify(template);
    if (assetsMap && typeof assetsMap === 'object') {
      for (const [origUrl, dataUrl] of Object.entries(assetsMap)) {
        if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue;
        try {
          const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
          if (!match) continue;
          const mime = match[1].toLowerCase();
          const base64Data = match[2];
          let ext = '.png';
          if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
          else if (mime.includes('gif')) ext = '.gif';
          else if (mime.includes('webp')) ext = '.webp';
          else if (mime.includes('svg')) ext = '.svg';

          const baseClean = path.basename(origUrl).replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'asset';
          const newFilename = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${baseClean}${ext}`;
          const destPath = path.join(UPLOADS_DIR, newFilename);
          fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));

          const newUrl = `/uploads/${encodeURIComponent(newFilename)}`;
          tplStr = tplStr.split(origUrl).join(newUrl);
          const noSlash = origUrl.startsWith('/') ? origUrl.substring(1) : '/' + origUrl;
          tplStr = tplStr.split(noSlash).join(newUrl);
        } catch (err) {
          console.error('[AssetUnpacker Error]', err.message);
        }
      }
    }
    return JSON.parse(tplStr);
  }

  // Tüm Galeriyi .mira Paketi Olarak Dışa Aktar (Export All - Tüm görseller paketlenir)
  if (pathname === '/api/gallery/export-all' && req.method === 'GET') {
    const items = loadUserGallery();
    const assets = bundleAssetsForTemplates(items);
    const pkg = {
      mira_version: '1.0',
      type: 'full_gallery_backup',
      exportedAt: Date.now(),
      platform: 'cross_platform',
      count: items.length,
      templates: items,
      assets: assets
    };
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `mira-gallery-backup-${dateStr}.mira`;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    return res.end(JSON.stringify(pkg, null, 2));
  }

  // Tekil Tasarımı .mira Paketi Olarak Dışa Aktar (Export Single - Görseller paketlenir)
  if (pathname.startsWith('/api/gallery/export/') && req.method === 'GET') {
    const itemId = decodeURIComponent(pathname.replace('/api/gallery/export/', '')).trim();
    const userItems = loadUserGallery();
    let found = userItems.find(x => x.id === itemId);
    if (!found) {
      found = APP_GALLERY_CATALOG.find(x => x.id === itemId);
    }
    if (!found) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Öğe bulunamadı' }));
    }

    const assets = bundleAssetsForTemplates([found]);
    const pkg = {
      mira_version: '1.0',
      type: 'single_template',
      exportedAt: Date.now(),
      platform: 'cross_platform',
      template: found,
      assets: assets
    };
    const safeName = (found.name || 'template').replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_').toLowerCase();
    const filename = `${safeName}.mira`;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`
    });
    return res.end(JSON.stringify(pkg, null, 2));
  }

  // Dışarıdan .mira / .json Şablon İçe Aktar (Import - Görseller çözülüp yerel ortama çıkartılır)
  if (pathname === '/api/gallery/import' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const userItems = loadUserGallery();
        const importedItems = [];
        const globalAssets = payload.assets || {};

        // Hem tekil şablon hem çoklu paket desteği
        let rawTemplates = [];
        if (payload.templates && Array.isArray(payload.templates)) {
          rawTemplates = payload.templates;
        } else if (payload.template && typeof payload.template === 'object') {
          rawTemplates = [payload.template];
        } else if (Array.isArray(payload)) {
          rawTemplates = payload;
        } else if (payload.name && (payload.category || payload.config)) {
          rawTemplates = [payload];
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Geçersiz veya tanınmayan MİRA şablon dosyası formatı.' }));
        }

        for (let tpl of rawTemplates) {
          if (!tpl || typeof tpl !== 'object') continue;
          // Gömülü resim paketini kullanıcının yerel diskine çıkart ve şablon içi linkleri güncelle
          tpl = unpackAndRestoreAssets(tpl, { ...globalAssets, ...(tpl.assets || {}) });
          const freshId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const newItem = {
            id: freshId,
            templateId: tpl.templateId || 'imported_template',
            category: tpl.category || 'canvas',
            cardType: tpl.cardType || null,
            name: (tpl.name ? `${tpl.name} (İçe Aktarıldı)` : 'İçe Aktarılan Şablon').trim(),
            subtitle: tpl.subtitle || 'Dışarıdan .mira paketi ile içe aktarıldı',
            icon: tpl.icon || '📦',
            badge: '📥 İÇE AKTARILDI',
            previewImg: tpl.previewImg || null,
            basePath: tpl.basePath || 'custom-overlay.html',
            obsKey: tpl.obsKey || null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            config: tpl.config ? JSON.parse(JSON.stringify(tpl.config)) : {}
          };
          userItems.push(newItem);
          importedItems.push(newItem);
        }

        if (importedItems.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Dosya içinde geçerli bir şablon bulunamadı.' }));
        }

        saveUserGallery(userItems);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          importedCount: importedItems.length,
          importedItems,
          items: userItems
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Şablon dosyası işlenirken hata: ' + err.message }));
      }
    });
    return;
  }

  // ==========================================
  // 2.10 API: MEDYA & RESİM KÜTÜPHANESİ (StreamElements Tarzı Asset Manager)
  // ==========================================
  if (pathname === '/api/media/list' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(listMediaLibrary()));
  }

  if (pathname === '/api/media/upload' && req.method === 'POST') {
    const chunks = [];
    let totalBytes = 0;
    req.on('data', chunk => {
      totalBytes += chunk.length;
      if (totalBytes <= 30 * 1024 * 1024) {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8');
        const data = JSON.parse(body);
        const rawDataUrl = (data.dataUrl || '').trim();
        const match = rawDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
        if (!match) {
          throw new Error('Geçersiz görsel formatı (PNG, JPG, GIF, WEBP, SVG desteklenir)');
        }
        const mime = match[1].toLowerCase();
        const base64Data = match[2];
        let ext = '.png';
        if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
        else if (mime.includes('gif')) ext = '.gif';
        else if (mime.includes('webp')) ext = '.webp';
        else if (mime.includes('svg')) ext = '.svg';

        const cleanBase = String(data.name || 'resim')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 40) || 'resim';
        const filename = `${Date.now()}_${cleanBase}${ext}`;
        const destPath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(destPath, Buffer.from(base64Data, 'base64'));

        const lib = listMediaLibrary();
        const uploadedItem = {
          id: 'up_' + filename,
          filename,
          name: cleanBase + ext,
          url: '/uploads/' + encodeURIComponent(filename),
          category: 'upload'
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: uploadedItem, ...lib }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/api/media/') && req.method === 'DELETE') {
    const filename = path.basename(decodeURIComponent(pathname.replace('/api/media/', '')).trim());
    const targetPath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch (e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, ...listMediaLibrary() }));
  }

  // 3. Statik Dosyalar
  const safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
  const filePath = safePath.replace(/\\/g, '/').startsWith('/uploads/')
    ? path.join(UPLOADS_DIR, path.basename(safePath))
    : path.join(__dirname, safePath);

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

