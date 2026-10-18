

// // main.js
// const { app, BrowserWindow, session } = require('electron');
// const { autoUpdater } = require('electron-updater');

// // 1. HIGH-PERFORMANCE, STABLE CHROMIUM FLAGS
// app.enableSandbox();
// app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// // Prevent GPU crashes from killing window rendering
// app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

// // Enable smooth hardware acceleration without compositor lockups
// app.commandLine.appendSwitch('enable-accelerated-video-decode');
// app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// // Linux PipeWire screen capture only
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

// app.whenReady().then(() => {
//   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
//     const responseHeaders = { ...details.responseHeaders };
    
//     // Only apply nosniff if content-type is present
//     if (responseHeaders['Content-Type'] || responseHeaders['content-type']) {
//       responseHeaders['X-Content-Type-Options'] = ['nosniff'];
//     }
    
//     callback({ responseHeaders });
//   });

//   registerIpcHandlers();
  
//   // Connect Security Manager to Tab Manager
//   securityManager.setTabManager(tabManager);

//   // Setup security for defaultSession
//   securityManager.setupSessionSecurity(session.defaultSession, () => {
//     return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
//   });

//   // CREATE WINDOW AND PASS IT TO DOWNLOAD MANAGER:
//   const win = createMainWindow();
//   const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
  
//   if (mainWindow) {
//     downloadManager.setMainWindow(mainWindow);
//   }

//   // --- SILENT BACKGROUND AUTO-UPDATER ---
//   if (app.isPackaged) {
//     autoUpdater.autoDownload = true;
//     // Don't leave half-installed state when app closes:
//     autoUpdater.autoInstallOnAppQuit = false;

//     // Check immediately on startup
//     autoUpdater.checkForUpdates();

//     // Check periodically every 15 minutes silently
//     setInterval(() => {
//       autoUpdater.checkForUpdates();
//     }, 15 * 60 * 1000);
//   }

//   // When update is ready: silently install and immediately restart smoothly
//   autoUpdater.on('update-downloaded', () => {
//     console.log('Update ready. Silently restarting into new version...');
//     // (isSilent = true, isForceRunAfter = true)
//     autoUpdater.quitAndInstall(true, true);
//   });
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
const { app, BrowserWindow, session } = require('electron');
const { autoUpdater } = require('electron-updater');

// 1. HIGH-PERFORMANCE, STABLE CHROMIUM FLAGS
app.enableSandbox();
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Prevent GPU crashes from killing window rendering
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

// Enable smooth hardware acceleration without compositor lockups
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// Linux PipeWire screen capture only
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

app.whenReady().then(() => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    // Only apply nosniff if content-type is present
    if (responseHeaders['Content-Type'] || responseHeaders['content-type']) {
      responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    }
    
    callback({ responseHeaders });
  });

  registerIpcHandlers();
  
  // Connect Security Manager to Tab Manager
  securityManager.setTabManager(tabManager);

  // Setup security for defaultSession
  securityManager.setupSessionSecurity(session.defaultSession, () => {
    return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
  });

  // CREATE WINDOW AND PASS IT TO DOWNLOAD MANAGER:
  const win = createMainWindow();
  const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
  
  if (mainWindow) {
    downloadManager.setMainWindow(mainWindow);
  }

  // --- STABLE SILENT BACKGROUND AUTO-UPDATER ---
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    // Logging helpers
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking updates. Current version:', app.getVersion());
    });

    autoUpdater.on('update-available', (info) => {
      console.log(`📦 Update available: ${info.version} (Current: ${app.getVersion()})`);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('✅ Browser is on the latest version.');
    });

    autoUpdater.on('error', (err) => {
      console.warn('⚠️ Auto-updater notice:', err ? err.message : err);
    });

    // Guard against repeated restart loops
    let isUpdating = false;

    autoUpdater.on('update-downloaded', (info) => {
      // 1. IF VERSION MATCHES CURRENT APP, DO NOT REINSTALL
      if (info && info.version === app.getVersion()) {
        console.log('ℹ️ Already running version', info.version, '- ignoring reinstall.');
        return;
      }

      // 2. Prevent multi-triggering
      if (!isUpdating) {
        isUpdating = true;
        console.log(`🚀 Update ${info.version} downloaded. Applying silently in 3 seconds...`);
        
        setTimeout(() => {
          // (isSilent = true, isForceRunAfter = true)
          autoUpdater.quitAndInstall(true, true);
        }, 3000);
      }
    });

    // Wait 6 seconds after opening the browser before checking
    // (Prevents startup UI freezes or loop restarts)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 6000);

    // Check periodically every 30 minutes in background
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