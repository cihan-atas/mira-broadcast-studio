const { app, BrowserWindow, Tray, Menu, nativeImage, shell, clipboard } = require('electron');
const path = require('path');
const http = require('http');
const { fork } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let isQuitting = false;

function isServerAlreadyRunning(callback) {
  const req = http.get('http://127.0.0.1:8080/api/lan-ip', (res) => {
    callback(true);
  });
  req.on('error', () => {
    callback(false);
  });
  req.setTimeout(1000, () => {
    req.destroy();
    callback(false);
  });
}

function checkServerReady(callback, attempts = 0) {
  const req = http.get('http://127.0.0.1:8080/api/lan-ip', (res) => {
    callback(true);
  });
  req.on('error', () => {
    if (attempts < 30) {
      setTimeout(() => checkServerReady(callback, attempts + 1), 250);
    } else {
      callback(false);
    }
  });
}

function ensureServer(callback) {
  isServerAlreadyRunning((running) => {
    if (running) {
      console.log('[APP] Port 8080 halihazırda çalışıyor, mevcut sunucu kullanılacak.');
      return callback();
    }
    console.log('[APP] Arka plan sunucu işlemi başlatılıyor...');
    serverProcess = fork(path.join(__dirname, 'server.js'), [], {
      silent: false,
      env: { ...process.env, PORT: '8080' }
    });
    serverProcess.on('error', (err) => console.error('[APP Server Error]', err));
    checkServerReady(callback);
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const appIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'MİRA BROADCAST STUDIO - Professional Stream Deck',
    backgroundColor: '#08090e',
    icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  checkServerReady(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('http://localhost:8080/');
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 22, height: 22 });

  tray = new Tray(trayIcon);
  tray.setToolTip('MİRA BROADCAST STUDIO');

  const contextMenu = Menu.buildFromTemplate([
    { label: '⚡ MİRA STUDIO PRO v4.2', enabled: false },
    { type: 'separator' },
    {
      label: '🪟 Stüdyoyu Aç / Göster',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: '🌐 Tarayıcıda Aç (localhost:8080)',
      click: () => shell.openExternal('http://localhost:8080/')
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
        if (mainWindow) mainWindow.show();
      }
    },
    { type: 'separator' },
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
    if (mainWindow) {
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

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
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
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('before-quit', () => {
    isQuitting = true;
    if (serverProcess) {
      try { serverProcess.kill(); } catch (e) {}
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin' && isQuitting) {
      app.quit();
    }
  });
}
