
// // main.js
// const { app, BrowserWindow, session } = require('electron');

// // 1. HARDEN CHROMIUM SANDBOX & PROCESS ISOLATION
// app.enableSandbox();
// app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
// app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
// app.commandLine.appendSwitch('disable-direct-composition-video-overlays');
// // Performance flags (Keep PiP active safely)
// app.commandLine.appendSwitch('disable-background-timer-throttling');
// app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// app.commandLine.appendSwitch('disable-renderer-backgrounding');

// // Prevent WebRTC IP address leaks across VPNs
// app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'default_public_interface_only');

// // Crash diagnostics
// app.on('child-process-gone', (_e, d) => console.error('[child-process-gone]', d.type, d.reason));
// app.on('render-process-gone', (_e, _wc, d) => console.error('[render-process-gone]', d.reason));

// const { createMainWindow } = require('./main/windowManager');
// const { registerWindowIpc } = require('./main/ipc/windowIpc');
// const { registerTabIpc } = require('./main/ipc/tabIpc');
// const { registerSearchIpc } = require('./main/ipc/searchIpc');
// const { registerPwaIpc } = require('./main/ipc/pwaIpc');

// function registerIpcHandlers() {
//   registerWindowIpc();
//   registerTabIpc();
//   registerSearchIpc();
//   registerPwaIpc();
// }
// app.on('gpu-process-gone', (_e, d) => {
//   console.error('[gpu-process-gone]', d.type, d.reason, d.exitCode);
// });

// // Add this at the top of main.js with your other switches
// app.commandLine.appendSwitch('unhandled-rejections', 'strict');

// // Define the bypass strings at the top of main.js if not already imported

// const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

// app.whenReady().then(() => {
//   const browserSession = session.fromPartition('persist:browser_session');

//   browserSession.webRequest.onBeforeSendHeaders(
//     { urls: ['https://accounts.google.com/*'] },
//     (details, callback) => {
//       const h = { ...details.requestHeaders };
//       h['User-Agent'] = FIREFOX_UA;
//       // Firefox doesn't send client hints
//       for (const k of Object.keys(h)) {
//         if (k.toLowerCase().startsWith('sec-ch-')) delete h[k];
//       }
//       callback({ cancel: false, requestHeaders: h });
//     }
//   );

//   registerIpcHandlers();
//   createMainWindow();
// });
// //older verison
// // app.whenReady().then(() => {
// //   // Global Web Request Hardening
// //   session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
// //     // Prevent MIME-sniffing exploits
// //     const responseHeaders = { ...details.responseHeaders };
// //     responseHeaders['X-Content-Type-Options'] = ['nosniff'];
// //     callback({ responseHeaders });
// //   });

// //   registerIpcHandlers();
// //   createMainWindow();
// // });

// app.on('activate', () => {
//   if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
// });

// app.on('window-all-closed', () => {
//   if (process.platform !== 'darwin') app.quit();
// });












// main.js
const { app, BrowserWindow, session } = require('electron');

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

// ---> 1. ADD THIS IMPORT:
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
    responseHeaders['X-Content-Type-Options'] = ['nosniff'];
    callback({ responseHeaders });
  });

  registerIpcHandlers();
  
  // Connect Security Manager to Tab Manager
  securityManager.setTabManager(tabManager);

  // Setup security for defaultSession
  securityManager.setupSessionSecurity(session.defaultSession, () => {
    return typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0];
  });

  // ---> 2. CREATE WINDOW AND PASS IT TO DOWNLOAD MANAGER:
  const win = createMainWindow();
  const mainWindow = win || (typeof getMainWindow === 'function' ? getMainWindow() : BrowserWindow.getAllWindows()[0]);
  if (mainWindow) {
    downloadManager.setMainWindow(mainWindow);
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