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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

