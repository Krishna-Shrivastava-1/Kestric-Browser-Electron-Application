
// // src/main/adBlocker.js (or electron/main/adBlocker.js)
// const { ElectronBlocker } = require('@ghostery/adblocker-electron');
// const fetch = require('cross-fetch');
// const path = require('path');
// const fs = require('fs');
// const { app } = require('electron');

// let blockerInstance = null;

// async function setupAdBlocker(targetSession) {
//   if (!targetSession) return;

//   if (typeof targetSession.registerPreloadScript !== 'function') {
//     targetSession.registerPreloadScript = () => ({
//       unregister: () => {},
//     });
//   }

//   try {
//     if (!blockerInstance) {
//       const cachePath = path.join(app.getPath('userData'), 'adblocker-cache.bin');

//       if (fs.existsSync(cachePath)) {
//         try {
//           const buffer = await fs.promises.readFile(cachePath);
//           blockerInstance = await ElectronBlocker.deserialize(buffer);
//         } catch {
//           blockerInstance = null;
//         }
//       }

//       if (!blockerInstance) {
//         blockerInstance = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
//         try {
//           const serialized = blockerInstance.serialize();
//           await fs.promises.writeFile(cachePath, serialized);
//         } catch {}
//       }
//     }

//     blockerInstance.enableBlockingInSession(targetSession);
//     console.log('🛡️ AdBlocker engine running');
//   } catch (error) {
//     console.error('Failed to initialize AdBlocker:', error);
//   }
// }

// module.exports = { setupAdBlocker };






// electron/main/adBlocker.js
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const fetch = require('cross-fetch');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let blockerInstance = null;

async function setupAdBlocker(targetSession) {
  if (!targetSession) return;

  // Polyfill for electron versions without registerPreloadScript
  if (typeof targetSession.registerPreloadScript !== 'function') {
    targetSession.registerPreloadScript = () => ({
      unregister: () => {},
    });
  }

  try {
    if (!blockerInstance) {
      const cachePath = path.join(app.getPath('userData'), 'adblocker-full-cache.bin');

      // 1. Try reading cached engine
      if (fs.existsSync(cachePath)) {
        try {
          const buffer = await fs.promises.readFile(cachePath);
          blockerInstance = await ElectronBlocker.deserialize(buffer);
        } catch {
          blockerInstance = null;
        }
      }

      // 2. If not cached, load FULL engine (includes YouTube scriptlets & cosmetic blockers)
      if (!blockerInstance) {
        blockerInstance = await ElectronBlocker.fromPrebuiltFull(fetch, {
          loadNetworkFilters: true,
        });

        try {
          const serialized = blockerInstance.serialize();
          await fs.promises.writeFile(cachePath, serialized);
        } catch (e) {
          console.warn('Could not cache adblocker engine:', e.message);
        }
      }
    }

    // Enable the engine in the target session
    blockerInstance.enableBlockingInSession(targetSession);

    // 3. BRAVE-STYLE YOUTUBE INSTANT SKIP SCRIPT
    // Automatically clicks "Skip Ad" and speeds ad video duration to 0s
    injectFastAdSkipper(targetSession);

    console.log('🛡️ High-Speed AdBlocker engine running');
  } catch (error) {
    console.error('Failed to initialize AdBlocker:', error);
  }
}

/**
 * Injects a lightweight script into web pages to auto-skip and fast-forward
 * video ads before the 5-second countdown can even render.
 */
function injectFastAdSkipper(session) {
  const skipScript = `
    (function() {
      if (window.__adSkipperInitialized) return;
      window.__adSkipperInitialized = true;

      function skipVideoAds() {
        // Fast-forward video ad to the end instantly
        const video = document.querySelector('video');
        const adElement = document.querySelector('.ad-showing, .ad-interrupting');
        
        if (video && adElement) {
          video.muted = true;
          video.playbackRate = 16.0;
          if (isFinite(video.duration)) {
            video.currentTime = video.duration;
          }
        }

        // Auto-click any "Skip" buttons the moment they appear in the DOM
        const skipButtons = document.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .videoAdUiSkipButton'
        );
        skipButtons.forEach(btn => btn && btn.click());
      }

      setInterval(skipVideoAds, 100);
    })();
  `;

  // Apply script on any video navigation (YouTube, Twitch, Dailymotion, etc.)
  session.webRequest.onHeadersReceived({ urls: ['*://*.youtube.com/*'] }, (details, callback) => {
    callback({ responseHeaders: details.responseHeaders });
  });

  // Inject into pages as soon as DOM loads
  session.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', () => {
      const url = contents.getURL();
      if (url.includes('youtube.com')) {
        contents.executeJavaScript(skipScript).catch(() => {});
      }
    });
  });
}

module.exports = { setupAdBlocker };