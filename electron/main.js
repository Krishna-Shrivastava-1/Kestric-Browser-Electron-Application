
// // main.js
// const { app, BrowserWindow, session, ipcMain } = require('electron');
// const { autoUpdater } = require('electron-updater');
// const path = require('path');
// const fs = require('fs');

// // 1. HIGH-PERFORMANCE, STABLE CHROMIUM FLAGS
// app.enableSandbox();
// app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
// app.commandLine.appendSwitch('enable-accelerated-video-decode');
// app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// if (process.platform === 'linux') {
//   app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
// }

// // 2. DIAGNOSTICS & ERROR HANDLING
// app.on('child-process-gone', (_e, d) =>
//   console.error('[child-process-gone]', d.type, d.reason, d.exitCode));

// app.on('render-process-gone', (_e, _wc, d) =>
//   console.error('[render-process-gone]', d.reason));

// app.on('gpu-process-gone', (_e, d) => {
//   console.error('[gpu-process-gone] Recovering from graphics issue:', d.details);
// });

// const { createMainWindow, getMainWindow } = require('./main/windowManager');
// const { registerWindowIpc } = require('./main/ipc/windowIpc');
// const { registerTabIpc } = require('./main/ipc/tabIpc');
// const { registerSearchIpc } = require('./main/ipc/searchIpc');
// const { registerPwaIpc } = require('./main/ipc/pwaIpc');
// const { registerSecurityIpc } = require('./main/ipc/securityIpc');
// const securityManager = require('./main/securityManager');
// const tabManager = require('./main/tabManager');
// const downloadManager = require('./main/downloadManager');

// function registerIpcHandlers() {
//   registerWindowIpc();
//   registerTabIpc();
//   registerSearchIpc();
//   registerPwaIpc();
//   registerSecurityIpc();
// }

// // Semver safe comparison helper
// function isNewerVersion(remote, local) {
//   if (!remote || !local) return false;
//   const clean = (v) => v.replace(/^v/, '').trim();
//   const rParts = clean(remote).split('.').map((n) => parseInt(n, 10) || 0);
//   const lParts = clean(local).split('.').map((n) => parseInt(n, 10) || 0);
//   for (let i = 0; i < 3; i++) {
//     const r = rParts[i] || 0;
//     const l = lParts[i] || 0;
//     if (r > l) return true;
//     if (r < l) return false;
//   }
//   return false;
// }

// // Purges stuck pending installers from AppData that trigger infinite loops
// function purgeStaleUpdaterCache() {
//   try {
//     const localAppData = process.env.LOCALAPPDATA || '';
//     if (localAppData) {
//       const pendingDir = path.join(localAppData, 'kestric-updater', 'pending');
//       if (fs.existsSync(pendingDir)) {
//         console.log('[AutoUpdater] Purging stuck pending updater cache:', pendingDir);
//         fs.rmSync(pendingDir, { recursive: true, force: true });
//       }
//     }
//   } catch (err) {
//     console.warn('[AutoUpdater] Failed to purge pending cache:', err.message);
//   }
// }

// // Tracks whether the app was just updated to trigger the Chrome toast
// let appWasJustUpdated = false;

// function checkAppUpdateStatus() {
//   const versionFile = path.join(app.getPath('userData'), 'app-version.json');
//   const currentVersion = app.getVersion();

//   try {
//     if (fs.existsSync(versionFile)) {
//       const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
//       if (data.version && isNewerVersion(currentVersion, data.version)) {
//         appWasJustUpdated = true;
//       }
//     }
//     fs.writeFileSync(versionFile, JSON.stringify({ version: currentVersion }), 'utf8');
//   } catch (err) {
//     console.error('[VersionCheck] Error:', err);
//   }
// }

// function getCleanUserAgent() {
//   const chromeVersion = process.versions.chrome;
//   if (process.platform === 'win32') {
//     return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
//   } else if (process.platform === 'darwin') {
//     return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
//   }
//   return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
// }

// // Flags to prevent recursive install loops
// let isUpdateDownloaded = false;
// let isQuittingForUpdate = false;

// app.whenReady().then(() => {
//   // 1. Wipe any leftover/corrupt update files that cause constant reinstalling
//   purgeStaleUpdaterCache();

//   // 2. Check if this is the first launch after a successful update
//   checkAppUpdateStatus();

//   // 3. Register IPC handler for page.js to query update status
//   ipcMain.handle('check-was-updated', () => {
//     const result = appWasJustUpdated;
//     appWasJustUpdated = false; // Show only once
//     return { wasUpdated: result, version: app.getVersion() };
//   });

//   const cleanUA = getCleanUserAgent();
//   const chromeMajor = process.versions.chrome.split('.')[0];
//   const platformName = process.platform === 'win32' ? '"Windows"' : process.platform === 'darwin' ? '"macOS"' : '"Linux"';

//   session.defaultSession.setUserAgent(cleanUA);

//   session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
//     const requestHeaders = { ...details.requestHeaders };
//     requestHeaders['User-Agent'] = cleanUA;
//     requestHeaders['sec-ch-ua'] = `"Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}", "Not-A.Brand";v="99"`;
//     requestHeaders['sec-ch-ua-mobile'] = '?0';
//     requestHeaders['sec-ch-ua-platform'] = platformName;
//     callback({ requestHeaders });
//   });

//   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
//     const responseHeaders = { ...details.responseHeaders };
//     const url = details.url.toLowerCase();

//     const isCloudflare =
//       url.includes('challenges.cloudflare.com') ||
//       url.includes('/cdn-cgi/challenge-platform/') ||
//       url.includes('turnstile') ||
//       url.includes('recaptcha') ||
//       url.includes('hcaptcha');

//     if (!isCloudflare && (responseHeaders['Content-Type'] || responseHeaders['content-type'])) {
//       responseHeaders['X-Content-Type-Options'] = ['nosniff'];
//     }

//     callback({ responseHeaders });
//   });

//   registerIpcHandlers();
  
//   securityManager.setTabManager(tabManager);
//   securityManager.setupSessionSecurity(session.defaultSession, () => {
//     return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
//   });

//   const win = createMainWindow();
//   const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
  
//   if (mainWindow) {
//     downloadManager.setMainWindow(mainWindow);
//   }

//   // --- 100% SILENT CHROME-STYLE BACKGROUND AUTO-UPDATER ---
//   if (app.isPackaged) {
//     autoUpdater.autoDownload = false;
//     autoUpdater.autoInstallOnAppQuit = false;

//     autoUpdater.on('update-available', (info) => {
//       const currentVersion = app.getVersion();
//       console.log(`[AutoUpdater] Current: ${currentVersion} | Available: ${info.version}`);

//       // Strict semver check: Never download if the remote version is equal or lower
//       if (!isNewerVersion(info.version, currentVersion)) {
//         console.log('[AutoUpdater] Remote version is not newer. Ignoring.');
//         purgeStaleUpdaterCache();
//         return;
//       }

//       console.log(`[AutoUpdater] Downloading update v${info.version} silently in background...`);
//       autoUpdater.downloadUpdate().catch((err) => {
//         console.error('[AutoUpdater] Download error:', err);
//       });
//     });

//     autoUpdater.on('update-not-available', () => {
//       console.log('[AutoUpdater] App is up to date.');
//     });

//     autoUpdater.on('error', (err) => {
//       console.warn('[AutoUpdater] Error:', err ? err.message : err);
//     });

//     autoUpdater.on('update-downloaded', (info) => {
//       console.log(`[AutoUpdater] Update v${info.version} downloaded silently.`);
//       isUpdateDownloaded = true;
//     });

//     // Check 15 seconds after opening
//     setTimeout(() => {
//       autoUpdater.checkForUpdates().catch(() => {});
//     }, 15000);

//     // Recheck every 30 minutes
//     setInterval(() => {
//       autoUpdater.checkForUpdates().catch(() => {});
//     }, 30 * 60 * 1000);
//   }
// });

// // SILENT INSTALL ON QUIT: Release file locks before NSIS executes
// app.on('before-quit', (e) => {
//   if (isUpdateDownloaded && !isQuittingForUpdate) {
//     isQuittingForUpdate = true;
//     e.preventDefault(); // Stop immediate exit to destroy windows & unlock files

//     console.log('[AutoUpdater] Destroying windows to release file locks on Kestric.exe...');
//     BrowserWindow.getAllWindows().forEach((w) => {
//       try {
//         w.removeAllListeners('close');
//         w.destroy();
//       } catch (_) {}
//     });

//     // 800ms grace period for Windows kernel to release locks on binaries
//     setTimeout(() => {
//       console.log('[AutoUpdater] Running silent background install...');
//       autoUpdater.quitAndInstall(true, false);

//       // Force terminate after spawn to ensure no zombie processes linger
//       setTimeout(() => {
//         app.exit(0);
//       }, 1200);
//     }, 800);
//   }
// });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) {
//     const win = createMainWindow();
//     const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
//     if (mainWindow) downloadManager.setMainWindow(mainWindow);
//   }
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit();
// });











// main.js
const { app, BrowserWindow, session, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// 1. HIGH-PERFORMANCE, STABLE CHROMIUM FLAGS
app.enableSandbox();
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

// 2. DIAGNOSTICS & ERROR HANDLING
app.on('child-process-gone', (_e, d) =>
  console.error('[child-process-gone]', d.type, d.reason, d.exitCode));

app.on('render-process-gone', (_e, _wc, d) =>
  console.error('[render-process-gone]', d.reason));

app.on('gpu-process-gone', (_e, d) => {
  console.error('[gpu-process-gone] Recovering from graphics issue:', d.details);
});

const { createMainWindow, getMainWindow } = require('./main/windowManager');
const { registerWindowIpc } = require('./main/ipc/windowIpc');
const { registerTabIpc } = require('./main/ipc/tabIpc');
const { registerSearchIpc } = require('./main/ipc/searchIpc');
const { registerPwaIpc } = require('./main/ipc/pwaIpc');
const { registerSecurityIpc } = require('./main/ipc/securityIpc');
const securityManager = require('./main/securityManager');
const tabManager = require('./main/tabManager');
const downloadManager = require('./main/downloadManager');

function registerIpcHandlers() {
  registerWindowIpc();
  registerTabIpc();
  registerSearchIpc();
  registerPwaIpc();
  registerSecurityIpc();
}

// --- PERMANENT, PROTECTED SYSTEM UPDATE STATE ---
const STATE_FILE = path.join(app.getPath('userData'), '.kestric-system-update.json');

// Make file hidden on Windows so users cannot see or modify it in File Explorer
function protectFile(filePath) {
  if (process.platform === 'win32') {
    exec(`attrib +h "${filePath}"`, () => {});
  }
}

// Strict semver comparator
function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  const clean = (v) => String(v).replace(/^v/, '').trim();
  const rParts = clean(remote).split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = clean(local).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

function readUpdateState() {
  const currentVer = app.getVersion();
  const fallback = {
    installedVersion: currentVer,
    pendingUpdateVersion: null,
    justUpdated: false,
  };

  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return { ...fallback, ...data };
    }
  } catch (err) {
    console.warn('[State] Initializing new system state file.');
  }

  writeUpdateState(fallback);
  return fallback;
}

function writeUpdateState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    protectFile(STATE_FILE);
  } catch (err) {
    console.error('[State] Failed to persist state:', err);
  }
}

// Wipe any leftover installer temp files to prevent infinite loops
function purgeAllUpdaterCaches() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const folders = [
    path.join(localAppData, 'Kestric-updater'),
    path.join(localAppData, 'kestric-updater'),
    path.join(app.getPath('userData'), '../Kestric-updater'),
    path.join(app.getPath('userData'), '../kestric-updater'),
  ];

  folders.forEach((dir) => {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (_) {}
  });
}

// State Verification on Launch
let updateState = readUpdateState();
const currentVersion = app.getVersion();

if (isNewerVersion(currentVersion, updateState.installedVersion)) {
  // App was legitimately updated! Flag it for the toast
  updateState.justUpdated = true;
  updateState.installedVersion = currentVersion;
  updateState.pendingUpdateVersion = null;
  writeUpdateState(updateState);
  purgeAllUpdaterCaches();
} else {
  // Always keep installedVersion synced with the compiled package.json
  updateState.installedVersion = currentVersion;
  if (updateState.pendingUpdateVersion && !isNewerVersion(updateState.pendingUpdateVersion, currentVersion)) {
    updateState.pendingUpdateVersion = null;
    purgeAllUpdaterCaches();
  }
  writeUpdateState(updateState);
}

function getCleanUserAgent() {
  const chromeVersion = process.versions.chrome;
  if (process.platform === 'win32') {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else if (process.platform === 'darwin') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

// Guard flags: ONLY allow quit if the user deliberately closed all windows
let isUserClosingApp = false;
let isApplyingSilentUpdate = false;

app.whenReady().then(() => {
  // 1. IPC Handler: Next.js page.js checks this on mount to show the toast
  ipcMain.handle('check-was-updated', () => {
    const showToast = updateState.justUpdated;
    if (showToast) {
      updateState.justUpdated = false;
      writeUpdateState(updateState);
    }
    return { wasUpdated: showToast, version: currentVersion };
  });

  const cleanUA = getCleanUserAgent();
  const chromeMajor = process.versions.chrome.split('.')[0];
  const platformName = process.platform === 'win32' ? '"Windows"' : process.platform === 'darwin' ? '"macOS"' : '"Linux"';

  session.defaultSession.setUserAgent(cleanUA);

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    requestHeaders['User-Agent'] = cleanUA;
    requestHeaders['sec-ch-ua'] = `"Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}", "Not-A.Brand";v="99"`;
    requestHeaders['sec-ch-ua-mobile'] = '?0';
    requestHeaders['sec-ch-ua-platform'] = platformName;
    callback({ requestHeaders });
  });

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const url = details.url.toLowerCase();

    const isCloudflare =
      url.includes('challenges.cloudflare.com') ||
      url.includes('/cdn-cgi/challenge-platform/') ||
      url.includes('turnstile') ||
      url.includes('recaptcha') ||
      url.includes('hcaptcha');

    if (!isCloudflare && (responseHeaders['Content-Type'] || responseHeaders['content-type'])) {
      responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    }

    callback({ responseHeaders });
  });

  registerIpcHandlers();
  
  securityManager.setTabManager(tabManager);
  securityManager.setupSessionSecurity(session.defaultSession, () => {
    return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
  });

  const win = createMainWindow();
  const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
  
  if (mainWindow) {
    downloadManager.setMainWindow(mainWindow);
  }

  // --- SILENT BACKGROUND AUTO-UPDATER ENGINE ---
  if (app.isPackaged) {
    // Strictly disable automatic closures and prompts
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      console.log(`[AutoUpdater] Current: ${currentVersion} | GitHub Release: ${info.version}`);

      // NEVER download if GitHub release is not strictly newer than package.json
      if (!isNewerVersion(info.version, currentVersion)) {
        console.log('[AutoUpdater] App is already up to date. Purging cache.');
        purgeAllUpdaterCaches();
        updateState.pendingUpdateVersion = null;
        writeUpdateState(updateState);
        return;
      }

      console.log(`[AutoUpdater] Downloading update v${info.version} silently in background...`);
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('[AutoUpdater] Download failed:', err);
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] App is up to date.');
      purgeAllUpdaterCaches();
      updateState.pendingUpdateVersion = null;
      writeUpdateState(updateState);
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater] Error:', err ? err.message : err);
    });

    // When downloaded: record to protected JSON file, NEVER close the window!
    autoUpdater.on('update-downloaded', (info) => {
      if (isNewerVersion(info.version, currentVersion)) {
        console.log(`[AutoUpdater] v${info.version} is verified. Waiting for natural user exit.`);
        updateState.pendingUpdateVersion = info.version;
        writeUpdateState(updateState);
      } else {
        purgeAllUpdaterCaches();
        updateState.pendingUpdateVersion = null;
        writeUpdateState(updateState);
      }
    });

    // Check 25 seconds after launch (will NEVER kill the browser)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 25000);

    // Recheck every 30 minutes
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 30 * 60 * 1000);
  }
});

// User clicked 'X' on the browser window
app.on('window-all-closed', () => {
  isUserClosingApp = true;
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Guarded Quit: Only executes silent update when USER actually closes the app
app.on('before-quit', (e) => {
  // If something tries to close the app while the user is still browsing, BLOCK IT!
  if (!isUserClosingApp && BrowserWindow.getAllWindows().length > 0) {
    console.warn('[AutoUpdater] Blocked premature shutdown attempt while user is browsing.');
    e.preventDefault();
    return;
  }

  const state = readUpdateState();
  const hasValidUpdate = state.pendingUpdateVersion && 
                         isNewerVersion(state.pendingUpdateVersion, app.getVersion());

  if (hasValidUpdate && !isApplyingSilentUpdate) {
    isApplyingSilentUpdate = true;
    e.preventDefault(); // Pause quit to destroy windows & unlock Kestric.exe

    console.log('[AutoUpdater] Applying silent update in background...');
    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.removeAllListeners('close');
        w.destroy();
      } catch (_) {}
    });

    // 800ms grace period for Windows to release file locks
    setTimeout(() => {
      // isSilent: true (no wizard UI), isForceRunAfter: false (do not relaunch immediately)
      autoUpdater.quitAndInstall(true, false);

      setTimeout(() => {
        app.exit(0);
      }, 1000);
    }, 800);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    isUserClosingApp = false;
    const win = createMainWindow();
    const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
    if (mainWindow) downloadManager.setMainWindow(mainWindow);
  }
});