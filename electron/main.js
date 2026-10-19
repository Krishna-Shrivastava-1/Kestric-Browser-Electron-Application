
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

// Semver strict comparison helper (strips any 'v' prefixes)
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

// Purges any cached installer files across all possible AppData locations
function purgeAllUpdaterCaches() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const possibleDirs = [
    path.join(localAppData, 'Kestric-updater'),
    path.join(localAppData, 'kestric-updater'),
    path.join(app.getPath('userData'), '../Kestric-updater'),
    path.join(app.getPath('userData'), '../kestric-updater'),
  ];

  possibleDirs.forEach((dir) => {
    try {
      if (fs.existsSync(dir)) {
        console.log('[AutoUpdater] Purging installer cache:', dir);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (_) {}
  });
}

// Tracks whether the app was just updated to trigger the Chrome toast in page.js
let appWasJustUpdated = false;

function checkAppUpdateStatus() {
  const versionFile = path.join(app.getPath('userData'), 'app-version.json');
  const currentVersion = app.getVersion();

  try {
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      if (data.version && isNewerVersion(currentVersion, data.version)) {
        appWasJustUpdated = true;
      }
    }
    fs.writeFileSync(versionFile, JSON.stringify({ version: currentVersion }), 'utf8');
  } catch (err) {
    console.error('[VersionCheck] Error:', err);
  }
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

// Updater state tracking
let isUpdateDownloaded = false;
let downloadedTargetVersion = null;
let isQuittingForUpdate = false;

app.whenReady().then(() => {
  // 1. Check if we just launched after a legitimate update
  checkAppUpdateStatus();

  // 2. If app is already updated, purge old disk cache so it NEVER reinstalls
  if (appWasJustUpdated) {
    purgeAllUpdaterCaches();
  }

  // 3. Register IPC handler for page.js
  ipcMain.handle('check-was-updated', () => {
    const result = appWasJustUpdated;
    appWasJustUpdated = false; // Only show once per update
    return { wasUpdated: result, version: app.getVersion() };
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

  // --- 100% SILENT CHROME-STYLE BACKGROUND AUTO-UPDATER ---
  if (app.isPackaged) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      const currentVersion = app.getVersion();
      console.log(`[AutoUpdater] Current: ${currentVersion} | Available: ${info.version}`);

      // STRICT CHECK: Remote MUST be higher than current version
      if (!isNewerVersion(info.version, currentVersion)) {
        console.log('[AutoUpdater] Remote version is not newer. Purging cache and ignoring.');
        purgeAllUpdaterCaches();
        return;
      }

      console.log(`[AutoUpdater] Downloading update v${info.version} in background...`);
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('[AutoUpdater] Download error:', err);
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] Kestric is up to date.');
      purgeAllUpdaterCaches();
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater] Error:', err ? err.message : err);
    });

    // CRITICAL FIX: Verify version before accepting downloaded update!
    autoUpdater.on('update-downloaded', (info) => {
      const currentVersion = app.getVersion();
      console.log(`[AutoUpdater] update-downloaded triggered with version: ${info.version}`);

      // If the cached download is NOT newer than what we are already running, PURGE IT!
      if (!isNewerVersion(info.version, currentVersion)) {
        console.log('[AutoUpdater] Cached update is NOT newer. Purging disk cache to prevent install loop.');
        purgeAllUpdaterCaches();
        isUpdateDownloaded = false;
        downloadedTargetVersion = null;
        return;
      }

      console.log(`[AutoUpdater] Valid update v${info.version} ready. Will install silently on next exit.`);
      isUpdateDownloaded = true;
      downloadedTargetVersion = info.version;
    });

    // Check 20 seconds after opening
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 20000);

    // Recheck every 30 minutes
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 30 * 60 * 1000);
  }
});

// SILENT INSTALL ON NATURAL EXIT ONLY
app.on('before-quit', (e) => {
  const currentVersion = app.getVersion();
  const shouldInstall = isUpdateDownloaded && 
                        downloadedTargetVersion && 
                        isNewerVersion(downloadedTargetVersion, currentVersion);

  if (shouldInstall && !isQuittingForUpdate) {
    isQuittingForUpdate = true;
    e.preventDefault(); // Stop default quit to close processes and release file locks first

    console.log('[AutoUpdater] Closing all windows to release file locks...');
    BrowserWindow.getAllWindows().forEach((w) => {
      try {
        w.removeAllListeners('close');
        w.destroy();
      } catch (_) {}
    });

    // 800ms grace period so Windows releases Kestric.exe file lock,
    // ensuring NSIS runs 100% silently without "Please wait" dialog
    setTimeout(() => {
      console.log('[AutoUpdater] Executing silent install...');
      // isSilent: true (suppresses all dialogs), isForceRunAfter: false (doesn't force open immediately)
      autoUpdater.quitAndInstall(true, false);

      setTimeout(() => {
        app.exit(0);
      }, 1000);
    }, 800);
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createMainWindow();
    const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
    if (mainWindow) downloadManager.setMainWindow(mainWindow);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});