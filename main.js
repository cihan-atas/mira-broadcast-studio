const { app, BrowserWindow, Tray, Menu, nativeImage, shell, clipboard, dialog } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { fork, exec } = require('child_process');

let mainWindow = null;
let previewWindow = null;
let floatingChatWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;
let isCreatingWindow = false;
let serverCheckDone = false;

function getAppIcon() {
  const icoPath = path.join(__dirname, 'assets', 'icon.ico');
  const pngPath = path.join(__dirname, 'assets', 'icon.png');
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  return nativeImage.createFromPath(pngPath);
}

function isServerAlreadyRunning(callback) {
  let called = false;
  const finish = (result) => {
    if (called) return;
    called = true;
    callback(result);
  };

  const req = http.get('http://127.0.0.1:8080/api/lan-ip', (res) => {
    res.resume();
    finish(true);
  });
  req.on('error', () => {
    finish(false);
  });
  req.setTimeout(800, () => {
    req.destroy();
    finish(false);
  });
}

function checkServerReady(callback, attempts = 0) {
  let called = false;
  const finish = (result) => {
    if (called) return;
    called = true;
    callback(result);
  };

  const req = http.get('http://127.0.0.1:8080/api/lan-ip', (res) => {
    res.resume();
    finish(true);
  });
  req.on('error', () => {
    if (attempts < 30) {
      setTimeout(() => checkServerReady(callback, attempts + 1), 200);
    } else {
      finish(false);
    }
  });
  req.setTimeout(800, () => {
    req.destroy();
    if (attempts < 30) {
      setTimeout(() => checkServerReady(callback, attempts + 1), 200);
    } else {
      finish(false);
    }
  });
}

function ensureServer(callback) {
  if (serverCheckDone) return;
  serverCheckDone = true;

  isServerAlreadyRunning((running) => {
    if (running) {
      console.log('[APP] Port 8080 halihazırda çalışıyor, mevcut sunucu kullanılacak.');
      return callback();
    }
    console.log('[APP] Arka plan sunucu işlemi başlatılıyor...');
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      silent: false,
      env: { ...process.env, PORT: '8080', ELECTRON_RUN_AS_NODE: '1', MIRA_DATA_DIR: app.getPath('userData') }
    });
    serverProcess.on('error', (err) => console.error('[APP Server Error]', err));
    checkServerReady(callback);
  });
}

function openFloatingChatWindow(url) {
  if (floatingChatWindow && !floatingChatWindow.isDestroyed()) {
    if (floatingChatWindow.isMinimized()) floatingChatWindow.restore();
    floatingChatWindow.show();
    floatingChatWindow.focus();
    return;
  }

  const appIcon = getAppIcon();

  floatingChatWindow = new BrowserWindow({
    width: 440,
    height: 720,
    minWidth: 320,
    minHeight: 380,
    title: 'MİRA STUDIO — Her Zaman Üstte Canlı Sohbet Konsolu',
    backgroundColor: '#0a0d16',
    alwaysOnTop: true,
    transparent: false,
    frame: true,
    autoHideMenuBar: true,
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  try {
    floatingChatWindow.setAlwaysOnTop(true, 'screen-saver');
  } catch (e) {
    floatingChatWindow.setAlwaysOnTop(true);
  }

  floatingChatWindow.loadURL(url || 'http://localhost:8080/floating-chat.html');

  floatingChatWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  floatingChatWindow.on('closed', () => {
    floatingChatWindow = null;
  });
}

function openPreviewWindow(url) {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.loadURL(url);
    if (previewWindow.isMinimized()) previewWindow.restore();
    previewWindow.show();
    previewWindow.focus();
    return;
  }

  const appIcon = getAppIcon();

  previewWindow = new BrowserWindow({
    width: 1280,
    height: 750,
    minWidth: 480,
    minHeight: 270,
    title: 'MİRA STUDIO - Canlı Sahne Önizleme',
    backgroundColor: '#07090e',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  previewWindow.loadURL(url);

  previewWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  previewWindow.on('closed', () => {
    previewWindow = null;
  });
}

function createWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  if (isCreatingWindow) return;
  isCreatingWindow = true;

  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 380,
    minHeight: 480,
    title: 'MİRA BROADCAST STUDIO - Professional Stream Deck',
    backgroundColor: '#08090e',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Stüdyo içi sahneler & Yeni Sekme tıklandığında tarayıcıya atmak yerine stüdyo içi özel önizleme penceresinde aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('floating-chat')) {
      openFloatingChatWindow(url);
      return { action: 'deny' };
    }
    if (url.includes('localhost:8080') || url.includes('127.0.0.1:8080')) {
      openPreviewWindow(url);
      return { action: 'deny' };
    }
    // Dış web bağlantıları harici varsayılan tarayıcıda açılsın
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Arayüzdeki "Kaldır" düğmesi mira-action://uninstall adresine gider
  mainWindow.webContents.on('will-navigate', (e, navUrl) => {
    if (navUrl.startsWith('mira-action://')) {
      e.preventDefault();
      if (navUrl === 'mira-action://uninstall') uninstallApp();
    }
  });

  mainWindow.loadURL('http://localhost:8080/');

  mainWindow.on('close', () => {
    isQuitting = true;
    if (previewWindow && !previewWindow.isDestroyed()) {
      try { previewWindow.close(); } catch (e) {}
    }
    app.quit();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    isCreatingWindow = false;
  });

  isCreatingWindow = false;
}

function createTray() {
  if (tray) return;

  const trayIcon = getAppIcon().resize({ width: 22, height: 22 });

  tray = new Tray(trayIcon);
  tray.setToolTip('MİRA BROADCAST STUDIO');

  const contextMenu = Menu.buildFromTemplate([
    { label: '⚡ MİRA STUDIO PRO v4.2', enabled: false },
    { type: 'separator' },
    {
      label: '🪟 Stüdyoyu Aç / Göster',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '📺 Canlı Sahne Önizleme Penceresi',
      click: () => openPreviewWindow('http://localhost:8080/kick/vexana/in-game.html')
    },
    {
      label: '💬 Canlı Sohbet Konsolu (Her Zaman Üstte)',
      click: () => openFloatingChatWindow('http://localhost:8080/floating-chat.html')
    },
    {
      label: '📱 Mobil Kumanda Linkini Kopyala',
      click: () => {
        http.get('http://127.0.0.1:8080/api/lan-ip', (res) => {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => {
            try {
              const d = JSON.parse(b);
              if (d.mobileUrl) clipboard.writeText(d.mobileUrl);
            } catch(e){}
          });
        });
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
      }
    },
    { type: 'separator' },
    { label: '🗑️ Uygulamayı Kaldır (Uninstall)', click: () => uninstallApp() },
    {
      label: '🛑 Tamamen Kapat ve Çık',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

function uninstallApp() {
  const res = dialog.showMessageBoxSync({
    type: 'warning',
    buttons: ['İptal', 'Kaldır', 'Kaldır + Verilerimi de Sil'],
    defaultId: 0,
    cancelId: 0,
    title: 'MİRA Broadcast Studio — Kaldır',
    message: 'Uygulama kaldırılsın mı?',
    detail: 'Galeri, TTS ve yayın ayarları kullanıcı veri klasöründe tutulur. "Verilerimi de Sil" seçeneği bunları da siler.'
  });
  if (res === 0) return;
  const wipeData = res === 2;
  const dataDir = app.getPath('userData');
  const exeDir = path.dirname(process.execPath);

  isQuitting = true;
  killServerProcess();

  const wipe = () => { if (wipeData) { try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch (e) {} } };

  try {
    if (process.platform === 'win32') {
      const un = fs.existsSync(exeDir) ? fs.readdirSync(exeDir).find(f => /^uninstall.*\.exe$/i.test(f)) : null;
      if (un) {
        // Kaldırıcı (NSIS) başlatılır; veri silme için ayrıca cmd ile gecikmeli temizlik
        if (wipeData) exec(`cmd /c ping 127.0.0.1 -n 8 >nul & rmdir /s /q "${dataDir}"`, { windowsHide: true });
        require('child_process').spawn(path.join(exeDir, un), [], { detached: true, stdio: 'ignore' }).unref();
      } else {
        dialog.showMessageBoxSync({ type: 'info', message: 'Kaldırıcı bulunamadı (portable sürüm).', detail: 'Uygulama klasörünü elle silebilirsin.' + (wipeData ? ' Kullanıcı verisi silindi.' : '') });
        wipe();
      }
    } else if (process.env.APPIMAGE) {
      wipe();
      try { fs.unlinkSync(process.env.APPIMAGE); } catch (e) {}
    } else {
      wipe();
      exec('pkexec apt-get remove -y mira-broadcast-studio || pkexec dpkg -r mira-broadcast-studio');
    }
  } catch (e) {
    console.error('[APP] Kaldırma hatası:', e);
  }
  app.quit();
}

function killServerProcess() {
  if (floatingChatWindow && !floatingChatWindow.isDestroyed()) {
    try { floatingChatWindow.destroy(); } catch (e) {}
    floatingChatWindow = null;
  }
  if (previewWindow && !previewWindow.isDestroyed()) {
    try { previewWindow.destroy(); } catch (e) {}
    previewWindow = null;
  }
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        exec(`taskkill /pid ${serverProcess.pid} /T /F`, () => {});
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch (e) {}
    serverProcess = null;
  }
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ensureServer(() => {
      createWindow();
      createTray();
    });

    app.on('activate', () => {
      if (!mainWindow && !isCreatingWindow) {
        createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    killServerProcess();
  });

  app.on('window-all-closed', () => {
    isQuitting = true;
    killServerProcess();
    app.quit();
  });
}
