// // tabPreload.js
// const { webFrame, ipcRenderer } = require('electron');

// // 1. MINIMAL STEALTH (main world; the isolated-world version never reached the page)
// // --disable-blink-features=AutomationControlled already hides navigator.webdriver.
// // This is only a fallback. The fake plugins array and fake window.chrome are removed
// // because they make detection easier, not harder.
// webFrame
//   .executeJavaScript(`(() => {
//     try {
//       Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
//     } catch (e) {}
//   })();`)
//   .catch(() => {});

// // 2. YOUTUBE-ONLY AD SCRUBBER (main world)
// const adEngineSource = `
// (function() {
//   if (window.__zenith_ad_engine_installed) return;
//   window.__zenith_ad_engine_installed = true;

//   function stripAds(obj) {
//     if (!obj || typeof obj !== 'object') return obj;
//     try {
//       delete obj.adPlacements;
//       delete obj.adSlots;
//       delete obj.playerAds;
//       if (obj.streamingData && obj.streamingData.adBreaks) {
//         delete obj.streamingData.adBreaks;
//       }
//       if (obj.playbackTracking) {
//         delete obj.playbackTracking.videostatsPlaybackUrl;
//         delete obj.playbackTracking.videostatsDelayplayUrl;
//         delete obj.playbackTracking.videostatsWatchtimeUrl;
//       }
//     } catch (e) {}
//     return obj;
//   }

//   let rawPlayerResponse = window.ytInitialPlayerResponse;
//   Object.defineProperty(window, 'ytInitialPlayerResponse', {
//     get: () => rawPlayerResponse,
//     set: (val) => { rawPlayerResponse = stripAds(val); },
//     configurable: true,
//     enumerable: true
//   });

//   const origFetch = window.fetch;
//   window.fetch = async function(...args) {
//     const response = await origFetch.apply(this, args);
//     try {
//       const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
//       if (url.includes('/youtubei/v1/player') || url.includes('/get_video_info')) {
//         const clone = response.clone();
//         const json = await clone.json();
//         const cleaned = stripAds(json);
//         return new Response(JSON.stringify(cleaned), {
//           status: response.status,
//           statusText: response.statusText,
//           headers: response.headers
//         });
//       }
//     } catch (e) {}
//     return response;
//   };

//   // Event-driven instead of a 100ms interval
//   function tick() {
//     const dialog = document.querySelector(
//       'tp-yt-paper-dialog:has(#feedback), ytd-popup-container:has(ytd-enforcement-message-view-model)');
//     if (dialog) dialog.remove();

//     const skip = document.querySelector(
//       '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button');
//     if (skip) { skip.click(); return; }

//     const video = document.querySelector('video');
//     if (document.querySelector('.ad-showing, .ad-interrupting') &&
//         video && Number.isFinite(video.duration)) {
//       video.muted = true;
//       video.currentTime = video.duration - 0.1;
//     }
//   }

//   let pending = false;
//   const schedule = () => {
//     if (pending) return;
//     pending = true;
//     setTimeout(() => { pending = false; tick(); }, 50);
//   };

//   function start() {
//     new MutationObserver(schedule).observe(document.documentElement, {
//       subtree: true,
//       childList: true,
//       attributes: true,
//       attributeFilter: ['class'],
//     });
//     schedule();
//   }

//   if (document.documentElement) start();
//   else document.addEventListener('DOMContentLoaded', start, { once: true });
// })();
// `;

// if (location.hostname === 'youtube.com' || location.hostname.endsWith('.youtube.com')) {
//   webFrame.executeJavaScript(adEngineSource).catch(() => {});
// }

// // 3. TOP-CENTER FULLSCREEN EXIT PILL
// (function setupFullscreenUI() {
//   let hostEl = null;
//   let shadowRoot = null;
//   let pillEl = null;
//   let hideTimer = null;

//   function removeUI() {
//     if (hostEl) {
//       hostEl.remove();
//       hostEl = null;
//       shadowRoot = null;
//       pillEl = null;
//     }
//     clearTimeout(hideTimer);
//   }

//   function showPill() {
//     if (!pillEl) return;
//     pillEl.style.opacity = '1';
//     pillEl.style.transform = 'translate(-50%, 0)';
//     clearTimeout(hideTimer);
//     hideTimer = setTimeout(() => {
//       if (pillEl) {
//         pillEl.style.opacity = '0';
//         pillEl.style.transform = 'translate(-50%, -45px)';
//       }
//     }, 2500);
//   }

//   function createUI(target) {
//     removeUI();

//     hostEl = document.createElement('div');
//     hostEl.id = 'zenith-fullscreen-overlay-host';
//     hostEl.style.cssText = `
//       position: fixed !important;
//       top: 0 !important;
//       left: 0 !important;
//       width: 100vw !important;
//       height: 0 !important;
//       z-index: 2147483647 !important;
//       overflow: visible !important;
//       pointer-events: none !important;
//     `;

//     shadowRoot = hostEl.attachShadow({ mode: 'open' });

//     pillEl = document.createElement('div');
//     pillEl.innerHTML = `
//       <div style="display:flex;align-items:center;gap:8px;">
//         <span>Exit Fullscreen</span>
//         <span style="display:flex;align-items:center;justify-content:center;width:17px;height:17px;background:rgba(255,255,255,0.2);border-radius:50%;font-size:11px;font-weight:bold;">✕</span>
//       </div>
//     `;

//     pillEl.style.cssText = `
//       position: fixed;
//       top: 15px;
//       left: 50%;
//       transform: translate(-50%, -45px);
//       background: rgba(18, 18, 22, 0.94);
//       color: #ffffff;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//       font-size: 13px;
//       font-weight: 500;
//       padding: 7px 18px;
//       border-radius: 20px;
//       border: 1px solid rgba(255, 255, 255, 0.28);
//       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
//       cursor: pointer;
//       user-select: none;
//       opacity: 0;
//       pointer-events: auto;
//       transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, background 0.15s;
//     `;

//     pillEl.onmouseenter = () => {
//       pillEl.style.background = 'rgba(38, 38, 48, 1)';
//       pillEl.style.borderColor = 'rgba(255, 255, 255, 0.55)';
//     };

//     pillEl.onmouseleave = () => {
//       pillEl.style.background = 'rgba(18, 18, 22, 0.94)';
//       pillEl.style.borderColor = 'rgba(255, 255, 255, 0.28)';
//     };

//     pillEl.onclick = (e) => {
//       e.stopPropagation();
//       e.preventDefault();
//       ipcRenderer.send('tab:exit-fullscreen-request');
//       if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
//       else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
//     };

//     shadowRoot.appendChild(pillEl);

//     // <video> rejects DOM children, so attach to its parent instead
//     if (target instanceof HTMLVideoElement) {
//       (target.parentElement || document.body || document.documentElement).appendChild(hostEl);
//     } else {
//       target.appendChild(hostEl);
//     }

//     setTimeout(showPill, 150);
//   }

//   window.addEventListener(
//     'mousemove',
//     (e) => {
//       const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
//       if (!isFullscreen) return;
//       if (e.clientY <= 60) showPill();
//     },
//     { capture: true, passive: true }
//   );

//   document.addEventListener('fullscreenchange', () => {
//     const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
//     if (fsElement) createUI(fsElement);
//     else removeUI();
//   });
// })();







// // tabPreload.js
// const { webFrame, ipcRenderer } = require('electron');

// // 1. CLEAN STEALTH
// try {
//   if (!window.chrome) window.chrome = {};
//   if (!window.chrome.runtime) window.chrome.runtime = {};
// } catch (e) {}

// // 2. INSTANT YOUTUBE AD SKIPPER (THROTTLED & GPU-SAFE)
// const youtubeAdEngine = `
// (function() {
//   if (window.__zenith_yt_engine) return;
//   window.__zenith_yt_engine = true;

//   let wasAdActive = false;
//   let userMutedState = false;
//   let lastSeekTime = 0;

//   function tick() {
//     const player = document.querySelector('#movie_player, .html5-video-player');
//     const video = document.querySelector('video');
//     if (!player || !video) return;

//     const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

//     if (isAdShowing) {
//       if (!wasAdActive) {
//         wasAdActive = true;
//         userMutedState = video.muted;
//       }

//       video.muted = true;
//       video.playbackRate = 16.0;

//       // Throttle seek to once every 600ms so the hardware GPU decoder never crashes
//       const now = Date.now();
//       if (now - lastSeekTime > 600 && Number.isFinite(video.duration) && video.duration > 0) {
//         lastSeekTime = now;
//         video.currentTime = video.duration;
//       }

//       const skipBtn = document.querySelector(
//         '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button, button.ytp-ad-skip-button-modern'
//       );
//       if (skipBtn) {
//         skipBtn.click();
//       }
//     } else if (wasAdActive) {
//       wasAdActive = false;
//       video.playbackRate = 1.0;
//       video.muted = userMutedState;
//     }

//     const dialog = document.querySelector(
//       'tp-yt-paper-dialog:has(#feedback), ytd-popup-container:has(ytd-enforcement-message-view-model)'
//     );
//     if (dialog) {
//       dialog.remove();
//       if (video.paused) video.play();
//     }
//   }

//   setInterval(tick, 100);
// })();
// `;

// function injectYouTubeEngine() {
//   const host = location.hostname;
//   if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
//     webFrame.executeJavaScript(youtubeAdEngine).catch(() => {});
//   }
// }

// injectYouTubeEngine();
// window.addEventListener('DOMContentLoaded', injectYouTubeEngine);

// // 3. FULLSCREEN EXIT UI
// (function setupFullscreenUI() {
//   let hostEl = null;
//   let shadowRoot = null;
//   let pillEl = null;
//   let hideTimer = null;

//   function removeUI() {
//     if (hostEl) {
//       hostEl.remove();
//       hostEl = null;
//       shadowRoot = null;
//       pillEl = null;
//     }
//     clearTimeout(hideTimer);
//   }

//   function showPill() {
//     if (!pillEl) return;
//     pillEl.style.opacity = '1';
//     pillEl.style.transform = 'translate(-50%, 0)';
//     clearTimeout(hideTimer);
//     hideTimer = setTimeout(() => {
//       if (pillEl) {
//         pillEl.style.opacity = '0';
//         pillEl.style.transform = 'translate(-50%, -45px)';
//       }
//     }, 2500);
//   }

//   function createUI(target) {
//     removeUI();

//     hostEl = document.createElement('div');
//     hostEl.id = 'zenith-fullscreen-overlay-host';
//     hostEl.style.cssText = `
//       position: fixed !important;
//       top: 0 !important;
//       left: 0 !important;
//       width: 100vw !important;
//       height: 0 !important;
//       z-index: 2147483647 !important;
//       overflow: visible !important;
//       pointer-events: none !important;
//     `;

//     shadowRoot = hostEl.attachShadow({ mode: 'open' });

//     pillEl = document.createElement('div');
//     pillEl.innerHTML = `
//       <div style="display:flex;align-items:center;gap:8px;">
//         <span>Exit Fullscreen</span>
//         <span style="display:flex;align-items:center;justify-content:center;width:17px;height:17px;background:rgba(255,255,255,0.2);border-radius:50%;font-size:11px;font-weight:bold;">✕</span>
//       </div>
//     `;

//     pillEl.style.cssText = `
//       position: fixed;
//       top: 15px;
//       left: 50%;
//       transform: translate(-50%, -45px);
//       background: rgba(18, 18, 22, 0.94);
//       color: #ffffff;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//       font-size: 13px;
//       font-weight: 500;
//       padding: 7px 18px;
//       border-radius: 20px;
//       border: 1px solid rgba(255, 255, 255, 0.28);
//       box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
//       cursor: pointer;
//       user-select: none;
//       opacity: 0;
//       pointer-events: auto;
//       transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, background 0.15s;
//     `;

//     pillEl.onclick = (e) => {
//       e.stopPropagation();
//       e.preventDefault();
//       ipcRenderer.send('tab:exit-fullscreen-request');
//       if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
//       else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
//     };

//     shadowRoot.appendChild(pillEl);

//     if (target instanceof HTMLVideoElement) {
//       (target.parentElement || document.body || document.documentElement).appendChild(hostEl);
//     } else {
//       target.appendChild(hostEl);
//     }

//     setTimeout(showPill, 150);
//   }

//   window.addEventListener(
//     'mousemove',
//     (e) => {
//       const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
//       if (!isFullscreen) return;
//       if (e.clientY <= 60) showPill();
//     },
//     { capture: true, passive: true }
//   );

//   document.addEventListener('fullscreenchange', () => {
//     const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
//     if (fsElement) createUI(fsElement);
//     else removeUI();
//   });
// })();


















// tabPreload.js
const { webFrame, ipcRenderer } = require('electron');

// 1. CLEAN STEALTH
try {
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) window.chrome.runtime = {};
} catch (e) {}
// Add at the very beginning of tabPreload.js
try {
  window.__zenith_active_streams = [];
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function(...args) {
      const stream = await origGUM(...args);
      if (window.__zenith_active_streams) {
        window.__zenith_active_streams.push(stream);
      }
      return stream;
    };
  }
} catch (e) {}
// 2. ULTRA-LIGHTWEIGHT YOUTUBE AD ENGINE (Zero Scroll Overhead)
const youtubeAdEngine = `
(function() {
  if (window.__zenith_yt_engine) return;
  window.__zenith_yt_engine = true;

  let wasAdActive = false;
  let userMutedState = false;
  let lastSeekTime = 0;

  function tick() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    const video = document.querySelector('video');
    if (!player || !video) return;

    // Strict ad check (O(1) classList lookup)
    const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

    if (isAdShowing) {
      if (!wasAdActive) {
        wasAdActive = true;
        userMutedState = video.muted;
      }

      video.muted = true;
      video.playbackRate = 16.0;

      // Throttle seek to once every 600ms
      const now = Date.now();
      if (now - lastSeekTime > 600 && Number.isFinite(video.duration) && video.duration > 0) {
        lastSeekTime = now;
        video.currentTime = video.duration;
      }

      // Fast selector for skip button
      const skipBtn = document.querySelector(
        '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button'
      );
      if (skipBtn) {
        skipBtn.click();
      }
    } else if (wasAdActive) {
      wasAdActive = false;
      video.playbackRate = 1.0;
      video.muted = userMutedState;
    }

    // Zero-lag modal check: target custom element directly (No expensive :has() queries)
    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      const dialog = enforcement.closest('tp-yt-paper-dialog, ytd-popup-container') || enforcement;
      dialog.remove();
      if (video.paused) video.play();
    }
  }

  // 150ms interval gives smooth response without CPU burden
  setInterval(tick, 150);
})();
`;

function injectYouTubeEngine() {
  const host = location.hostname;
  if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
    webFrame.executeJavaScript(youtubeAdEngine).catch(() => {});
  }
}

injectYouTubeEngine();
window.addEventListener('DOMContentLoaded', injectYouTubeEngine);

// 3. FULLSCREEN EXIT UI
(function setupFullscreenUI() {
  let hostEl = null;
  let shadowRoot = null;
  let pillEl = null;
  let hideTimer = null;

  function removeUI() {
    if (hostEl) {
      hostEl.remove();
      hostEl = null;
      shadowRoot = null;
      pillEl = null;
    }
    clearTimeout(hideTimer);
  }

  function showPill() {
    if (!pillEl) return;
    pillEl.style.opacity = '1';
    pillEl.style.transform = 'translate(-50%, 0)';
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (pillEl) {
        pillEl.style.opacity = '0';
        pillEl.style.transform = 'translate(-50%, -45px)';
      }
    }, 2500);
  }

  function createUI(target) {
    removeUI();

    hostEl = document.createElement('div');
    hostEl.id = 'zenith-fullscreen-overlay-host';
    hostEl.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 0 !important;
      z-index: 2147483647 !important;
      overflow: visible !important;
      pointer-events: none !important;
    `;

    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    pillEl = document.createElement('div');
    pillEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <span>Exit Fullscreen</span>
        <span style="display:flex;align-items:center;justify-content:center;width:17px;height:17px;background:rgba(255,255,255,0.2);border-radius:50%;font-size:11px;font-weight:bold;">✕</span>
      </div>
    `;

    pillEl.style.cssText = `
      position: fixed;
      top: 15px;
      left: 50%;
      transform: translate(-50%, -45px);
      background: rgba(18, 18, 22, 0.94);
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      padding: 7px 18px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.28);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
      cursor: pointer;
      user-select: none;
      opacity: 0;
      pointer-events: auto;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, background 0.15s;
    `;

    pillEl.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      ipcRenderer.send('tab:exit-fullscreen-request');
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    };

    shadowRoot.appendChild(pillEl);

    if (target instanceof HTMLVideoElement) {
      (target.parentElement || document.body || document.documentElement).appendChild(hostEl);
    } else {
      target.appendChild(hostEl);
    }

    setTimeout(showPill, 150);
  }

  window.addEventListener(
    'mousemove',
    (e) => {
      const isFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen) return;
      if (e.clientY <= 60) showPill();
    },
    { capture: true, passive: true }
  );

  document.addEventListener('fullscreenchange', () => {
    const fsElement = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsElement) createUI(fsElement);
    else removeUI();
  });
})();