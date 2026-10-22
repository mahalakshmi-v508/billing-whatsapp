const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Ensure only one instance of the desktop application runs at a time
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
const isDev = !app.isPackaged || process.env.ELECTRON_IS_DEV === '1';

// Setup Auto-Updater configuration and logger
autoUpdater.logger = {
  info: (msg) => console.log('[AutoUpdater info]', msg),
  warn: (msg) => console.warn('[AutoUpdater warn]', msg),
  error: (msg) => console.error('[AutoUpdater error]', msg),
};

// CRITICAL BILLING SAFETY:
// Do not automatically install on quit or force restart without user confirmation.
// Active invoices and billing sessions must NEVER be interrupted.
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = false;

function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

function setupAutoUpdater() {
  if (isDev) {
    console.log('[AutoUpdater] Development mode detected. Automatic update checks are disabled.');
    return;
  }

  // Allow optional custom update feed override from environment
  if (process.env.UPDATE_FEED_URL) {
    try {
      autoUpdater.setFeedURL(process.env.UPDATE_FEED_URL);
      console.log(`[AutoUpdater] Custom feed URL configured: ${process.env.UPDATE_FEED_URL}`);
    } catch (err) {
      console.error('[AutoUpdater] Failed to set custom feed URL:', err.message);
    }
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for application updates...');
    sendToWindow('updater:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendToWindow('updater:status', {
      status: 'available',
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Application is up to date:', info ? info.version : app.getVersion());
    sendToWindow('updater:status', {
      status: 'not-available',
      version: app.getVersion(),
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendToWindow('updater:progress', {
      percent: Math.floor(progressObj.percent || 0),
      transferred: progressObj.transferred,
      total: progressObj.total,
      bytesPerSecond: progressObj.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded successfully:', info.version);
    sendToWindow('updater:status', {
      status: 'downloaded',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });

    // Display non-blocking notification dialog allowing user to choose when to restart
    if (mainWindow && !mainWindow.isDestroyed()) {
      dialog
        .showMessageBox(mainWindow, {
          type: 'info',
          title: 'Update Ready to Install',
          message: `Cashio Smart Billing v${info.version} has been downloaded and is ready to install.`,
          detail:
            'You can restart now to apply the update immediately, or choose Later to finish your current billing and invoices.',
          buttons: ['Restart and Install Now', 'Later (Finish Billing First)'],
          defaultId: 1, // Default to 'Later' to protect active bills
          cancelId: 1,
        })
        .then((result) => {
          if (result.response === 0) {
            console.log('[AutoUpdater] User selected Restart and Install Now.');
            autoUpdater.quitAndInstall(false, true);
          } else {
            console.log('[AutoUpdater] User postponed update to finish billing work.');
          }
        })
        .catch((err) => {
          console.error('[AutoUpdater] Dialog error:', err.message);
        });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Update error:', err ? err.message : 'Unknown error');
    sendToWindow('updater:status', {
      status: 'error',
      message: err ? err.message : 'Update check encountered a network or release issue.',
    });
  });

  // Schedule an initial update check 5 seconds after startup to ensure app is ready
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.warn('[AutoUpdater] Initial update check notice:', err.message);
    });
  }, 5000);
}

function createWindow() {
  const iconPath =
    process.platform === 'win32'
      ? path.join(__dirname, '..', 'build', 'icon.ico')
      : path.join(__dirname, '..', 'build', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Cashio - Billing & Analytics',
    icon: iconPath,
    show: false, // Don't show until ready to prevent white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external link openings safely (open in default system browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  // Protect against unintended in-app navigation to external websites
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isDev && (url.startsWith('http://127.0.0.1:5173') || url.startsWith('http://localhost:5173'))) {
      return;
    }
    if (url !== mainWindow.webContents.getURL() && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // In development mode, load Vite dev server; in production, load built HTML bundle
  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';
    console.log(`[Electron Main] Loading development server: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl).catch((err) => {
      console.error('[Electron Main] Failed to load dev server:', err.message);
    });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log(`[Electron Main] Loading production bundle: ${indexPath}`);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[Electron Main] Failed to load production bundle:', err.message);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single instance lock handler: if another instance tries to launch, focus current window
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Setup IPC handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('updater:check-for-updates', async () => {
  if (isDev) {
    return {
      status: 'dev-mode',
      message: 'Automatic updates are disabled in development mode.',
    };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      status: 'success',
      updateInfo: result ? result.updateInfo : null,
    };
  } catch (err) {
    return {
      status: 'error',
      message: err.message,
    };
  }
});

ipcMain.handle('updater:restart-and-install', () => {
  console.log('[AutoUpdater] restartAndInstall invoked via IPC');
  autoUpdater.quitAndInstall(false, true);
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
