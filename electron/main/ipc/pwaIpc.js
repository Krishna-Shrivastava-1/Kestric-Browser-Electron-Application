// // src/main/ipc/pwaIpc.js
// const { ipcMain } = require('electron');
// const pwaManager = require('../pwaManager');

// function registerPwaIpc() {
//   ipcMain.handle('pwa:list', () => pwaManager.getInstalledApps());
//   ipcMain.handle('pwa:install', (_event, manifest) => pwaManager.installApp(manifest));
//   ipcMain.handle('pwa:uninstall', (_event, appId) => pwaManager.uninstallApp(appId));
//   ipcMain.handle('pwa:launch', (_event, appId) => {
//     pwaManager.launchApp(appId);
//     return true;
//   });
// }

// module.exports = { registerPwaIpc };













// src/main/ipc/pwaIpc.js
const { ipcMain } = require('electron');
const pwaManager = require('../pwaManager');
const { isSafeWebUrl } = require('../utils/url');

function registerPwaIpc() {
  ipcMain.handle('pwa:install', (_event, manifest) => {
    // Validate manifest startUrl
    if (!manifest || !isSafeWebUrl(manifest.startUrl)) {
      throw new Error('Cannot install PWA: startUrl must be a valid HTTP/HTTPS address.');
    }
    return pwaManager.installApp(manifest);
  });

  ipcMain.handle('pwa:launch', (_event, appId) => {
    if (typeof appId !== 'string') throw new Error('Invalid app ID.');
    return pwaManager.launchApp(appId);
  });
}

module.exports = { registerPwaIpc };