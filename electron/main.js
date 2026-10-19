
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

// // Semver safe comparison helper (strips any 'v' prefixes)
// function isNewerVersion(remote, local) {
//   const clean = (v) => (v || '').replace(/^v/, '').trim();
//   const rParts = clean(remote).split('.').map(Number);
//   const lParts = clean(local).split('.').map(Number);
//   for (let i = 0; i < 3; i++) {
//     const r = rParts[i] || 0;
//     const l = lParts[i] || 0;
//     if (r > l) return true;
//     if (r < l) return false;
//   }
//   return false;
// }

// // Tracks whether the app was newly updated on this startup
// function checkAndRecordAppUpdate() {
//   const versionFile = path.join(app.getPath('userData'), 'app-version.json');
//   const currentVersion = app.getVersion();
//   let wasUpdated = false;

//   try {
//     if (fs.existsSync(versionFile)) {
//       const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
//       if (data.version && isNewerVersion(currentVersion, data.version)) {
//         wasUpdated = true;
//       }
//     }
//     fs.writeFileSync(versionFile, JSON.stringify({ version: currentVersion }), 'utf8');
//   } catch (err) {
//     console.error('Failed to read/write app-version.json:', err);
//   }

//   return wasUpdated;
// }

// app.whenReady().then(() => {
//   const wasAppJustUpdated = checkAndRecordAppUpdate();

//   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
//     const responseHeaders = { ...details.responseHeaders };
//     if (responseHeaders['Content-Type'] || responseHeaders['content-type']) {
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

//     // If application was updated silently on last restart, inform renderer to show toast
//     if (wasAppJustUpdated) {
//       mainWindow.webContents.once('did-finish-load', () => {
//         mainWindow.webContents.send('app-updated-toast', { version: app.getVersion() });
//       });
//     }
//   }

//   // --- SILENT CHROME-STYLE BACKGROUND AUTO-UPDATER ---
//   if (app.isPackaged) {
//     let updateDownloaded = false;

//     autoUpdater.autoDownload = false;
//     // Turn this OFF to prevent NSIS from popping up its interactive installer on exit!
//     autoUpdater.autoInstallOnAppQuit = false;

//     autoUpdater.on('update-available', (info) => {
//       const currentVersion = app.getVersion();
//       console.log(`[AutoUpdater] Current: ${currentVersion} | Available: ${info.version}`);

//       // Strict semver check to eliminate loop downloads
//       if (!isNewerVersion(info.version, currentVersion)) {
//         console.log('[AutoUpdater] Remote version is not newer. Ignoring.');
//         return;
//       }

//       console.log(`[AutoUpdater] Downloading v${info.version} silently in background...`);
//       autoUpdater.downloadUpdate().catch((err) => {
//         console.error('[AutoUpdater] Download failed:', err);
//       });
//     });

//     autoUpdater.on('update-not-available', () => {
//       console.log('[AutoUpdater] Kestric is up to date.');
//     });

//     autoUpdater.on('error', (err) => {
//       console.warn('[AutoUpdater] Error:', err ? err.message : err);
//     });

//     autoUpdater.on('update-downloaded', (info) => {
//       console.log(`[AutoUpdater] v${info.version} ready. Will apply silently on app close.`);
//       updateDownloaded = true;
//     });

//     // When the user actually closes Kestric, silently apply the update with zero UI
//     app.on('before-quit', (e) => {
//       if (updateDownloaded) {
//         // quitAndInstall(isSilent = true, isForceRunAfter = false)
//         // isSilent: true suppresses all NSIS wizard dialogs / "please wait" windows
//         // isForceRunAfter: false ensures it doesn't spontaneously launch back up if the user intentionally closed it
//         autoUpdater.quitAndInstall(true, false);
//       }
//     });

//     // Initial check after 10s
//     setTimeout(() => {
//       autoUpdater.checkForUpdates().catch(() => {});
//     }, 10000);

//     // Recheck every 30 minutes
//     setInterval(() => {
//       autoUpdater.checkForUpdates().catch(() => {});
//     }, 30 * 60 * 1000);
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
// Prevent blink from setting automation flags
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

// Semver safe comparison helper (strips any 'v' prefixes)
function isNewerVersion(remote, local) {
  const clean = (v) => (v || '').replace(/^v/, '').trim();
  const rParts = clean(remote).split('.').map(Number);
  const lParts = clean(local).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

// Tracks whether the app was newly updated on this startup
function checkAndRecordAppUpdate() {
  const versionFile = path.join(app.getPath('userData'), 'app-version.json');
  const currentVersion = app.getVersion();
  let wasUpdated = false;

  try {
    if (fs.existsSync(versionFile)) {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      if (data.version && isNewerVersion(currentVersion, data.version)) {
        wasUpdated = true;
      }
    }
    fs.writeFileSync(versionFile, JSON.stringify({ version: currentVersion }), 'utf8');
  } catch (err) {
    console.error('Failed to read/write app-version.json:', err);
  }

  return wasUpdated;
}

// Generate clean, modern Chrome User-Agent without any "Electron" traces
function getCleanUserAgent() {
  const chromeVersion = process.versions.chrome;
  if (process.platform === 'win32') {
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  } else if (process.platform === 'darwin') {
    return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  }
  return `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
}

app.whenReady().then(() => {
  const wasAppJustUpdated = checkAndRecordAppUpdate();
  const cleanUA = getCleanUserAgent();
  const chromeMajor = process.versions.chrome.split('.')[0];
  const platformName = process.platform === 'win32' ? '"Windows"' : process.platform === 'darwin' ? '"macOS"' : '"Linux"';

  // 1. Set global user agent on default session
  session.defaultSession.setUserAgent(cleanUA);

  // 2. Strip "Electron" traces from Client Hints & Request Headers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };

    requestHeaders['User-Agent'] = cleanUA;
    requestHeaders['sec-ch-ua'] = `"Chromium";v="${chromeMajor}", "Google Chrome";v="${chromeMajor}", "Not-A.Brand";v="99"`;
    requestHeaders['sec-ch-ua-mobile'] = '?0';
    requestHeaders['sec-ch-ua-platform'] = platformName;

    callback({ requestHeaders });
  });

  // 3. Prevent nosniff from breaking Cloudflare Turnstile / Captcha challenge scripts
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    const url = details.url.toLowerCase();

    const isCloudflare =
      url.includes('challenges.cloudflare.com') ||
      url.includes('/cdn-cgi/challenge-platform/') ||
      url.includes('turnstile') ||
      url.includes('recaptcha') ||
      url.includes('hcaptcha');

    // Only apply nosniff to normal requests; exempt anti-bot challenge scripts
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

    if (wasAppJustUpdated) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.send('app-updated-toast', { version: app.getVersion() });
      });
    }
  }

  // --- SILENT BACKGROUND AUTO-UPDATER ---
  if (app.isPackaged) {
    let updateDownloaded = false;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      const currentVersion = app.getVersion();
      console.log(`[AutoUpdater] Current: ${currentVersion} | Available: ${info.version}`);

      if (!isNewerVersion(info.version, currentVersion)) {
        console.log('[AutoUpdater] Remote version is not newer. Ignoring.');
        return;
      }

      console.log(`[AutoUpdater] Downloading v${info.version} silently in background...`);
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('[AutoUpdater] Download failed:', err);
      });
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[AutoUpdater] Kestric is up to date.');
    });

    autoUpdater.on('error', (err) => {
      console.warn('[AutoUpdater] Error:', err ? err.message : err);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[AutoUpdater] v${info.version} ready. Will apply silently on app close.`);
      updateDownloaded = true;
    });

    app.on('before-quit', (e) => {
      if (updateDownloaded) {
        // Silent install without opening installer wizard
        autoUpdater.quitAndInstall(true, false);
      }
    });

    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 10000);

    setInterval(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 30 * 60 * 1000);
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