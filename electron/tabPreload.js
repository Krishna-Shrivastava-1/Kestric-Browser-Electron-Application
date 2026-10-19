
// // tabPreload.js
// const { webFrame, ipcRenderer } = require('electron');

// // 1. CLEAN STEALTH
// try {
//   if (!window.chrome) window.chrome = {};
//   if (!window.chrome.runtime) window.chrome.runtime = {};
// } catch (e) {}
// // Add at the very beginning of tabPreload.js
// try {
//   window.__kestric_active_streams = [];
//   if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
//     const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
//     navigator.mediaDevices.getUserMedia = async function(...args) {
//       const stream = await origGUM(...args);
//       if (window.__kestric_active_streams) {
//         window.__kestric_active_streams.push(stream);
//       }
//       return stream;
//     };
//   }
// } catch (e) {}
// // 2. ULTRA-LIGHTWEIGHT YOUTUBE AD ENGINE (Zero Scroll Overhead)
// const youtubeAdEngine = `
// (function() {
//   if (window.__kestric_yt_engine) return;
//   window.__kestric_yt_engine = true;

//   let wasAdActive = false;
//   let userMutedState = false;
//   let lastSeekTime = 0;

//   function tick() {
//     const player = document.querySelector('#movie_player, .html5-video-player');
//     const video = document.querySelector('video');
//     if (!player || !video) return;

//     // Strict ad check (O(1) classList lookup)
//     const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

//     if (isAdShowing) {
//       if (!wasAdActive) {
//         wasAdActive = true;
//         userMutedState = video.muted;
//       }

//       video.muted = true;
//       video.playbackRate = 16.0;

//       // Throttle seek to once every 600ms
//       const now = Date.now();
//       if (now - lastSeekTime > 600 && Number.isFinite(video.duration) && video.duration > 0) {
//         lastSeekTime = now;
//         video.currentTime = video.duration;
//       }

//       // Fast selector for skip button
//       const skipBtn = document.querySelector(
//         '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-overlay-close-button'
//       );
//       if (skipBtn) {
//         skipBtn.click();
//       }
//     } else if (wasAdActive) {
//       wasAdActive = false;
//       video.playbackRate = 1.0;
//       video.muted = userMutedState;
//     }

//     // Zero-lag modal check: target custom element directly (No expensive :has() queries)
//     const enforcement = document.querySelector('ytd-enforcement-message-view-model');
//     if (enforcement) {
//       const dialog = enforcement.closest('tp-yt-paper-dialog, ytd-popup-container') || enforcement;
//       dialog.remove();
//       if (video.paused) video.play();
//     }
//   }

//   // 150ms interval gives smooth response without CPU burden
//   setInterval(tick, 150);
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
//     hostEl.id = 'kestric-fullscreen-overlay-host';
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

// 1. CLOUDFLARE TURNSTILE & ANTI-BOT STEALTH INJECTION
// This runs in the actual page DOM context (Main World) so Cloudflare sees a real browser
const stealthScript = `
(function() {
  try {
    // 1. Remove navigator.webdriver
    const proto = Object.getPrototypeOf(navigator);
    delete proto.webdriver;
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
      configurable: true,
      enumerable: false
    });

    // 2. Mock chrome runtime object
    if (!window.chrome) {
      window.chrome = {};
    }
    if (!window.chrome.runtime) {
      window.chrome.runtime = {
        PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
        PlatformArch: { ARM: 'arm', X86_32: 'x86-32', X86_64: 'x86-64' }
      };
    }

    // 3. Mock Chrome PDF Viewer plugins (real Chrome never has empty plugins)
    if (navigator.plugins.length === 0) {
      const mockPlugins = [
        { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
        { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }
      ];
      Object.defineProperty(navigator, 'plugins', {
        get: () => mockPlugins,
        configurable: true
      });
    }

    // 4. Ensure standard languages
    if (!navigator.languages || navigator.languages.length === 0) {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        configurable: true
      });
    }

    // 5. Fix permissions query for notifications
    if (navigator.permissions && navigator.permissions.query) {
      const origQuery = navigator.permissions.query;
      navigator.permissions.query = (parameters) =>
        parameters.name === 'notifications'
          ? Promise.resolve({ state: Notification.permission })
          : origQuery(parameters);
    }
  } catch (e) {}
})();
`;

// Execute immediately in the top frame and all subframes (where Turnstile lives)
webFrame.executeJavaScript(stealthScript).catch(() => {});

// Active stream tracker
try {
  window.__kestric_active_streams = [];
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function(...args) {
      const stream = await origGUM(...args);
      if (window.__kestric_active_streams) {
        window.__kestric_active_streams.push(stream);
      }
      return stream;
    };
  }
} catch (e) {}

// 2. ULTRA-LIGHTWEIGHT YOUTUBE AD ENGINE (Zero Scroll Overhead)
const youtubeAdEngine = `
(function() {
  if (window.__kestric_yt_engine) return;
  window.__kestric_yt_engine = true;

  let wasAdActive = false;
  let userMutedState = false;
  let lastSeekTime = 0;

  function tick() {
    const player = document.querySelector('#movie_player, .html5-video-player');
    const video = document.querySelector('video');
    if (!player || !video) return;

    const isAdShowing = player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting');

    if (isAdShowing) {
      if (!wasAdActive) {
        wasAdActive = true;
        userMutedState = video.muted;
      }

      video.muted = true;
      video.playbackRate = 16.0;

      const now = Date.now();
      if (now - lastSeekTime > 600 && Number.isFinite(video.duration) && video.duration > 0) {
        lastSeekTime = now;
        video.currentTime = video.duration;
      }

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

    const enforcement = document.querySelector('ytd-enforcement-message-view-model');
    if (enforcement) {
      const dialog = enforcement.closest('tp-yt-paper-dialog, ytd-popup-container') || enforcement;
      dialog.remove();
      if (video.paused) video.play();
    }
  }

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
    hostEl.id = 'kestric-fullscreen-overlay-host';
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