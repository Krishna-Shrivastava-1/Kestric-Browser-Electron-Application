
// // main.js
// const { app, BrowserWindow, session } = require('electron');

// // 1. CHROMIUM FLAGS
// app.enableSandbox();
// app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
// app.commandLine.appendSwitch('disable-direct-composition-video-overlays');

// // Keep PiP/Meet video running in background
// app.commandLine.appendSwitch('disable-background-timer-throttling');
// app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// app.commandLine.appendSwitch('disable-renderer-backgrounding');
// app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
// app.commandLine.appendSwitch('use-fake-ui-for-media-stream', 'false');
// app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// // 2. CRASH DIAGNOSTICS
// app.on('child-process-gone', (_e, d) =>
//   console.error('[child-process-gone]', d.type, d.reason, d.exitCode));
// app.on('render-process-gone', (_e, _wc, d) =>
//   console.error('[render-process-gone]', d.reason));

// const { createMainWindow, getMainWindow } = require('./main/windowManager');
// const { registerWindowIpc } = require('./main/ipc/windowIpc');
// const { registerTabIpc } = require('./main/ipc/tabIpc');
// const { registerSearchIpc } = require('./main/ipc/searchIpc');
// const { registerPwaIpc } = require('./main/ipc/pwaIpc');
// const { registerSecurityIpc } = require('./main/ipc/securityIpc');
// const securityManager = require('./main/securityManager');
// const tabManager = require('./main/tabManager');

// // ---> 1. ADD THIS IMPORT:
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
//     responseHeaders['X-Content-Type-Options'] = ['nosniff'];
//     callback({ responseHeaders });
//   });

//   registerIpcHandlers();
  
//   // Connect Security Manager to Tab Manager
//   securityManager.setTabManager(tabManager);

//   // Setup security for defaultSession
//   securityManager.setupSessionSecurity(session.defaultSession, () => {
//     return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
//   });

//   // ---> 2. CREATE WINDOW AND PASS IT TO DOWNLOAD MANAGER:
//   const win = createMainWindow();
//   const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
//   if (mainWindow) {
//     downloadManager.setMainWindow(mainWindow);
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
const { app, BrowserWindow, session } = require('electron');
const { autoUpdater } = require('electron-updater');

// 1. CHROMIUM FLAGS
app.enableSandbox();
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.commandLine.appendSwitch('disable-direct-composition-video-overlays');

// Keep PiP/Meet video running in background
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream', 'false');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// 2. CRASH DIAGNOSTICS
app.on('child-process-gone', (_e, d) =>
  console.error('[child-process-gone]', d.type, d.reason, d.exitCode));
app.on('render-process-gone', (_e, _wc, d) =>
  console.error('[render-process-gone]', d.reason));

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

    // Open DevTools in packaged build temporarily if you need to debug CSS/network errors:
    // mainWindow.webContents.openDevTools();
  }

  // --- BACKGROUND SILENT AUTO-UPDATER ---
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    // Check immediately on startup
    autoUpdater.checkForUpdates();

    // Check periodically every 15 minutes silently in the background
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 15 * 60 * 1000);
  }

  // Restart into update only on user quit, or prompt before install
  autoUpdater.on('update-downloaded', () => {
    // Note: quitAndInstall(false, true) will restart smoothly
    autoUpdater.quitAndInstall(false, true);
  });
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