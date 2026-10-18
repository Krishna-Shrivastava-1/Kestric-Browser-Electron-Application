
// // src/main/adBlocker.js
// const { ElectronBlocker } = require('@ghostery/adblocker-electron');
// const fetch = require('cross-fetch');
// const path = require('path');
// const fs = require('fs');
// const { app } = require('electron');

// let blockerInstance = null;

// async function setupAdBlocker(targetSession) {
//   if (!targetSession) return;

//   // Electron < 31 Polyfill
//   if (typeof targetSession.registerPreloadScript !== 'function') {
//     targetSession.registerPreloadScript = () => ({
//       unregister: () => {},
//     });
//   }

//   try {
//     if (!blockerInstance) {
//       const cachePath = path.join(app.getPath('userData'), 'adblocker-cache.bin');
//       if (fs.existsSync(cachePath)) {
//         const buffer = await fs.promises.readFile(cachePath);
//         blockerInstance = await ElectronBlocker.deserialize(buffer);
//       } else {
//         blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
//         const serialized = blockerInstance.serialize();
//         await fs.promises.writeFile(cachePath, serialized).catch(() => {});
//       }
//     }

//     blockerInstance.enableBlockingInSession(targetSession);
//     console.log('🛡️ AdBlocker engine running');
//   } catch (error) {
//     console.error('Failed to initialize AdBlocker:', error);
//   }
// }

// module.exports = { setupAdBlocker };









// src/main/adBlocker.js (or electron/main/adBlocker.js)
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let blockerInstance = null;

async function setupAdBlocker(targetSession) {
  if (!targetSession) return;

  if (typeof targetSession.registerPreloadScript !== 'function') {
    targetSession.registerPreloadScript = () => ({
      unregister: () => {},
    });
  }

  try {
    if (!blockerInstance) {
      const cachePath = path.join(app.getPath('userData'), 'adblocker-cache.bin');

      if (fs.existsSync(cachePath)) {
        try {
          const buffer = await fs.promises.readFile(cachePath);
          blockerInstance = await ElectronBlocker.deserialize(buffer);
        } catch {
          blockerInstance = null;
        }
      }

      if (!blockerInstance) {
        blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
        try {
          const serialized = blockerInstance.serialize();
          await fs.promises.writeFile(cachePath, serialized);
        } catch {}
      }
    }

    blockerInstance.enableBlockingInSession(targetSession);
    console.log('🛡️ AdBlocker engine running');
  } catch (error) {
    console.error('Failed to initialize AdBlocker:', error);
  }
}

module.exports = { setupAdBlocker };