// src/main/tabManager.js
const { WebContentsView, session, app, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { CHROME_HEIGHT } = require('./config');
const { normalizeUrl } = require('./utils/url');
const { setupAdBlocker } = require('./adBlocker');
const { buildContextMenu } = require('./contextMenu');
const securityManager = require('./securityManager');
const downloadManager = require('./downloadManager');

const CHROME_MAJOR = process.versions.chrome.split('.')[0];
const CHROME_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_MAJOR}.0.0.0 Safari/537.36`;
const AUTH_HOSTS = [
  'accounts.google.com',
  'appleid.apple.com',
  'github.com',
  'login.microsoftonline.com',
  'www.facebook.com',
];

async function applyChromeIdentity(wc) {
  if (!wc || wc.isDestroyed()) return;
  try {
    if (!wc.debugger.isAttached()) wc.debugger.attach('1.3');
    const major = process.versions.chrome.split('.')[0];
    const full = process.versions.chrome;
    await wc.debugger.sendCommand('Emulation.setUserAgentOverride', {
      userAgent: CHROME_USER_AGENT,
      platform: 'Win32',
      userAgentMetadata: {
        brands: [
          { brand: 'Chromium', version: major },
          { brand: 'Google Chrome', version: major },
          { brand: 'Not_A Brand', version: '24' },
        ],
        fullVersionList: [
          { brand: 'Chromium', version: full },
          { brand: 'Google Chrome', version: full },
          { brand: 'Not_A Brand', version: '24.0.0.0' },
        ],
        platform: 'Windows',
        platformVersion: '10.0.0',
        architecture: 'x86',
        model: '',
        mobile: false,
        bitness: '64',
      },
    });
  } catch (e) {
    console.warn('applyChromeIdentity failed:', e.message);
  }
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

const GOOGLE_AUTH_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';

function resolveTabPreloadPath() {
  const candidates = [
    path.join(__dirname, '../../tabPreload.js'),
    path.join(__dirname, '../tabPreload.js'),
    path.join(__dirname, 'tabPreload.js'),
    path.join(app.getAppPath(), 'tabPreload.js'),
    path.join(process.cwd(), 'tabPreload.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(app.getAppPath(), 'tabPreload.js');
}

function isSafeWebUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isGoogleAuthUrl(url) {
  return typeof url === 'string' && (url.includes('accounts.google.com') || url.includes('accounts.youtube.com'));
}

const YOUTUBE_AD_CSS = `
  ytd-ad-slot-renderer,
  ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
  ytd-in-feed-ad-layout-renderer,
  ytd-banner-promo-renderer,
  ytd-promoted-sparkles-web-renderer,
  ytd-compact-promoted-video-renderer,
  ytd-display-ad-renderer,
  #player-ads,
  .video-ads,
  .ytp-ad-module,
  .ytp-ad-overlay-container,
  .ytp-ad-message-container,
  ytd-promoted-video-renderer,
  #masthead-ad,
  tp-yt-paper-dialog:has(#feedback),
  .ytd-popup-container:has(ytd-enforcement-message-view-model) {
    display: none !important;
  }
`;

class TabManager {
  constructor() {
    this.tabViews = new Map();
    this.tabManifests = new Map();
    this.activeTabId = null;
    this.mainWindow = null;
    this.browserSession = null;
    this.isSessionConfigured = false;
    this.isHtmlFullscreen = false;
    this.overlayOpen = false;
    this.refreshTimer = null;
    this.committedTabs = new Set();
  }

  ensureSession() {
    if (this.browserSession && this.isSessionConfigured) {
      return this.browserSession;
    }

    this.browserSession = session.fromPartition('persist:browser_session');
    this.browserSession.setUserAgent(CHROME_USER_AGENT);

    securityManager.setTabManager(this);
    securityManager.setupSessionSecurity(this.browserSession, () => this.mainWindow);
    downloadManager.setupSession(this.browserSession);
    setupAdBlocker(this.browserSession).catch(() => {});

    this.isSessionConfigured = true;
    return this.browserSession;
  }

  setMainWindow(window) {
    this.mainWindow = window;
    if (!window) return;

    downloadManager.setMainWindow(window);
    if (this.browserSession) {
      securityManager.setupSessionSecurity(this.browserSession, () => this.mainWindow);
    }

    const refresh = () => {
      this.updateBounds();
      this.forceRepaint();
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.updateBounds();
        this.forceRepaint();
      }, 120);
    };

    window.on('resize', () => this.updateBounds());
    window.on('maximize', refresh);
    window.on('unmaximize', refresh);
    window.on('restore', refresh);
    window.on('show', refresh);
    window.on('enter-full-screen', refresh);

    window.on('minimize', () => {
      securityManager.closePopup();
      if (this.isHtmlFullscreen) {
        this.isHtmlFullscreen = false;
        this.exitActiveTabFullscreen();
        window.webContents.send('window:fullscreen-change', false);
      }
    });

    window.on('leave-full-screen', () => {
      if (this.isHtmlFullscreen) {
        this.isHtmlFullscreen = false;
        this.exitActiveTabFullscreen();
        window.webContents.send('window:fullscreen-change', false);
      }
      this.updateBounds();
      this.forceRepaint(true);
      clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.updateBounds();
        this.forceRepaint();
      }, 120);
    });

    window.on('move', () => {
      securityManager.closePopup();
    });
  }

  getTab(id) {
    if (!id) return null;
    const view = this.tabViews.get(id);
    if (!view || !view.webContents || view.webContents.isDestroyed()) return null;
    return view;
  }

  // Robust check: works on initial loads, search engine queries, and in-page SPA navigations
  hasPage(id, view) {
    if (!view || !view.webContents || view.webContents.isDestroyed()) return false;
    const url = view.webContents.getURL();
    return Boolean(url && url !== 'about:blank' && !url.startsWith('chrome://'));
  }

  applyVisibility() {
    for (const [id, view] of this.tabViews) {
      if (!view?.webContents || view.webContents.isDestroyed()) continue;
      const show = id === this.activeTabId && this.hasPage(id, view);
      view.setVisible(show);
    }
  }

  async checkPwaManifest(id, view) {
    if (!this.hasPage(id, view) || !view || view.webContents.isDestroyed()) return;

    try {
      const manifest = await view.webContents.executeJavaScript(`
        (async () => {
          try {
            const manifestLink = document.querySelector('link[rel="manifest"]');
            const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            const favicon = document.querySelector('link[rel*="icon"]');

            let bestIcon = appleIcon ? appleIcon.href : (favicon ? favicon.href : null);
            let appName = document.title || 'Web App';
            let startUrl = window.location.href;

            if (manifestLink && manifestLink.href) {
              const res = await fetch(manifestLink.href);
              const data = await res.json();
              if (data.name || data.short_name) {
                appName = data.name || data.short_name;
              }
              if (data.icons && data.icons.length > 0) {
                const relativeIcon = data.icons[data.icons.length - 1].src;
                bestIcon = new URL(relativeIcon, manifestLink.href).href;
              }
              if (data.start_url) {
                startUrl = new URL(data.start_url, window.location.origin).href;
              }
            }

            if (manifestLink || (appleIcon && startUrl.startsWith('https://'))) {
              return { name: appName, startUrl: startUrl, icon: bestIcon };
            }
          } catch (e) {}
          return null;
        })()
      `, true);

      const existing = this.tabManifests.get(id);
      const isDifferent = JSON.stringify(existing) !== JSON.stringify(manifest);

      if (isDifferent) {
        if (manifest) this.tabManifests.set(id, manifest);
        else this.tabManifests.delete(id);
        this.sendTabUpdate(id, { pwaManifest: manifest || null });
      }
    } catch {}
  }

  sendTabUpdate(id, viewOrPatch) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    if (viewOrPatch && !viewOrPatch.webContents) {
      this.mainWindow.webContents.send('tab:updated', {
        id,
        ...viewOrPatch,
      });
      return;
    }

    const view = viewOrPatch;
    if (!view || !view.webContents || view.webContents.isDestroyed()) return;

    this.mainWindow.webContents.send('tab:updated', {
      id,
      url: view.webContents.getURL(),
      title: view.webContents.getTitle() || 'New Tab',
      isLoading: view.webContents.isLoading(),
      canGoBack: view.webContents.navigationHistory.canGoBack(),
      canGoForward: view.webContents.navigationHistory.canGoForward(),
      isAudible: view.webContents.isCurrentlyAudible(),
      isMuted: view.webContents.isAudioMuted(),
      pwaManifest: this.tabManifests.get(id) || null,
    });
  }

  updateBounds() {
    const win = this.mainWindow;
    if (!win || win.isDestroyed() || win.isMinimized()) return;
    const view = this.getTab(this.activeTabId);
    if (!view) return;

    const [w, h] = win.getContentSize();
    if (w <= 0 || h <= 0) return;

    const top = this.isHtmlFullscreen ? 0 : CHROME_HEIGHT;
    view.setBounds({ x: 0, y: top, width: w, height: Math.max(1, h - top) });
  }

  // Flicker-free overlay transition: snapshot painted before hiding view
  setOverlayVisible(isOpen) {
    // No-op: tabs stay running and live without freezing
    this.overlayOpen = Boolean(isOpen);
  }

  forceRepaint() {
    const win = this.mainWindow;
    if (!win || win.isDestroyed() || win.isMinimized()) return;

    win.webContents.invalidate();
    const view = this.getTab(this.activeTabId);
    if (view && !view.webContents.isDestroyed()) {
      view.webContents.invalidate();
    }
  }

  createTab(id) {
    if (!id || typeof id !== 'string') throw new Error('Valid Tab ID required.');
    if (this.getTab(id)) return true;
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      throw new Error('Main window is not available.');
    }

    const tabSession = this.ensureSession();
    const tabPreloadPath = resolveTabPreloadPath();

    const view = new WebContentsView({
      webPreferences: {
        session: tabSession,
        preload: tabPreloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        nodeIntegrationInWorker: false,
        nodeIntegrationInSubFrames: false,
        sandbox: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        javascript: true,
        spellcheck: true,
        enableWebSQL: false,
      },
    });

    this.tabViews.set(id, view);
    applyChromeIdentity(view.webContents);
    this.mainWindow.contentView.addChildView(view);
    view.setVisible(false);

    view.webContents.on('will-attach-web-view', (event) => {
      event.preventDefault();
    });

    view.webContents.on('will-navigate', (event, targetUrl) => {
      if (!isSafeWebUrl(targetUrl)) {
        event.preventDefault();
        return;
      }

      securityManager.closePopup();

      if (isGoogleAuthUrl(targetUrl)) {
        view.webContents.setUserAgent(GOOGLE_AUTH_USER_AGENT);
      } else {
        view.webContents.setUserAgent(CHROME_USER_AGENT);
      }
    });

    view.webContents.on('will-frame-navigate', (event) => {
      if (event.isMainFrame && !isSafeWebUrl(event.url)) {
        event.preventDefault();
      }
    });

    let syncQueued = false;
    const sync = () => {
      if (syncQueued) return;
      syncQueued = true;
      setTimeout(() => {
        syncQueued = false;
        this.sendTabUpdate(id, view);
      }, 16);
    };

    view.webContents.on('did-start-navigation', sync);
    view.webContents.on('did-navigate', sync);
    view.webContents.on('did-navigate-in-page', sync);
    view.webContents.on('did-stop-loading', sync);

    let pwaTimer = null;
    view.webContents.on('did-finish-load', () => {
      clearTimeout(pwaTimer);
      pwaTimer = setTimeout(() => this.checkPwaManifest(id, view), 1500);
    });

    const markReady = () => this.sendTabUpdate(id, { ready: true });
    view.webContents.on('dom-ready', markReady);
    view.webContents.on('did-fail-load', (_e, code, _desc, _url, isMainFrame) => {
      if (isMainFrame && code !== -3) markReady();
    });

    view.webContents.on('page-title-updated', sync);
    view.webContents.on('media-started-playing', sync);
    view.webContents.on('media-paused', sync);
    view.webContents.on('did-start-loading', () => {
      this.sendTabUpdate(id, view);
    });

    const reveal = () => {
      this.committedTabs.add(id);
      this.applyVisibility();
      if (id === this.activeTabId) this.updateBounds();
    };

    view.webContents.on('did-navigate', reveal);
    view.webContents.on('did-navigate-in-page', reveal);

    view.webContents.on('enter-html-full-screen', () => {
      securityManager.closePopup();
      this.isHtmlFullscreen = true;
      const win = this.mainWindow;
      if (win && !win.isDestroyed() && !win.isFullScreen()) win.setFullScreen(true);
      this.updateBounds();
      win?.webContents?.send('window:fullscreen-change', true);
    });

    view.webContents.on('leave-html-full-screen', () => {
      this.isHtmlFullscreen = false;
      const win = this.mainWindow;
      this.updateBounds();
      if (win && !win.isDestroyed() && win.isFullScreen()) win.setFullScreen(false);
      win?.webContents?.send('window:fullscreen-change', false);
    });

    const applyCSS = () => {
      const url = view.webContents.getURL() || '';
      if (url.includes('youtube.com')) {
        view.webContents.insertCSS(YOUTUBE_AD_CSS).catch(() => {});
      }
    };

    view.webContents.on('dom-ready', applyCSS);
    view.webContents.on('did-finish-load', applyCSS);

    view.webContents.on('context-menu', (_event, params) => {
      buildContextMenu(view.webContents, params, {
        onOpenLinkInNewTab: (url) => {
          if (isSafeWebUrl(url)) {
            this.mainWindow?.webContents?.send('tab:requested-new', { url });
          }
        },
      });
    });

    let nextWindowIsPip = false;

    view.webContents.on('did-create-window', (childWindow) => {
      applyChromeIdentity(childWindow.webContents);

      if (!nextWindowIsPip) return;
      nextWindowIsPip = false;

      childWindow.setAlwaysOnTop(true, 'screen-saver');
      childWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      childWindow.setPosition(width - 400, height - 300);
      childWindow.setBackgroundColor('#121217');
    });

    view.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
      const pageUrl = view.webContents.getURL();

      const isMeetPage = pageUrl.includes('meet.google.com');
      const isDocumentPip =
        isMeetPage &&
        (features.includes('documentPictureInPicture') ||
          frameName === 'documentPictureInPicture' ||
          url === 'about:blank');

      if (isDocumentPip) {
        nextWindowIsPip = true;
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 380,
            height: 280,
            minWidth: 240,
            minHeight: 160,
            alwaysOnTop: true,
            frame: false,
            autoHideMenuBar: true,
            roundedCorners: true,
            hasShadow: true,
            focusable: true,
            show: true,
            webPreferences: {
              session: tabSession,
              nodeIntegration: false,
              contextIsolation: false,
              sandbox: false,
              webSecurity: true,
            },
          },
        };
      }

      if (url !== 'about:blank' && !isSafeWebUrl(url)) {
        return { action: 'deny' };
      }

      const isAuthPopup = AUTH_HOSTS.includes(safeHost(url));
      const isPopup =
        isAuthPopup ||
        features.includes('width=') ||
        features.includes('height=') ||
        url.includes('/login') ||
        url.includes('/auth');

      if (isPopup) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            parent: this.mainWindow,
            modal: false,
            autoHideMenuBar: true,
            width: 500,
            height: 650,
            webPreferences: {
              session: tabSession,
              contextIsolation: true,
              nodeIntegration: false,
              sandbox: true,
              webSecurity: true,
            },
          },
        };
      }

      if (isSafeWebUrl(url)) {
        this.mainWindow?.webContents?.send('tab:requested-new', { url });
      }
      return { action: 'deny' };
    });

    return true;
  }

  exitActiveTabFullscreen() {
    const view = this.getTab(this.activeTabId);
    if (!view) return;

    view.webContents
      .executeJavaScript(`
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (exit) exit.call(document).catch(() => {});
        }
      `, true)
      .catch(() => {});
  }

  async triggerActiveTabPiP() {
    const view = this.getTab(this.activeTabId);
    if (!view || !view.webContents || view.webContents.isDestroyed()) return false;

    try {
      return await view.webContents.executeJavaScript(`
        (async () => {
          if (window.documentPictureInPicture && window.documentPictureInPicture.window) {
            window.documentPictureInPicture.window.close();
            return { success: true, mode: 'doc-pip-closed' };
          }

          const meetPipBtn = document.querySelector('[aria-label*="Picture-in-picture"], [data-tooltip*="picture-in-picture"]');
          if (meetPipBtn) {
            meetPipBtn.click();
            return { success: true, mode: 'meet-native' };
          }

          function getTargetVideo() {
            let videos = Array.from(document.querySelectorAll('video'));
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              if (el.shadowRoot) {
                videos = videos.concat(Array.from(el.shadowRoot.querySelectorAll('video')));
              }
            }
            return videos.find(v => !v.paused && v.readyState > 1) || videos[0] || null;
          }

          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
            return { success: true, mode: 'video-pip-exited' };
          }

          const video = getTargetVideo();
          if (video) {
            if (video.disablePictureInPicture) video.disablePictureInPicture = false;
            await video.requestPictureInPicture();
            return { success: true, mode: 'video-pip-entered' };
          }

          return { success: false, error: 'NO_PIP_AVAILABLE' };
        })()
      `, true);
    } catch (err) {
      console.warn('PiP Trigger failed:', err.message);
      return { success: false, error: err.message };
    }
  }

  clearTab(id) {
    const win = this.mainWindow;
    if (!win || win.isDestroyed()) return false;

    securityManager.closePopup();

    const wasActive = this.activeTabId === id;
    const old = this.tabViews.get(id);

    if (old) {
      try {
        win.contentView.removeChildView(old);
      } catch {}
      this.tabViews.delete(id);
      this.tabManifests.delete(id);
      this.committedTabs.delete(id);

      if (!old.webContents.isDestroyed()) {
        try {
          old.webContents.stop();
        } catch {}
      }
    }

    this.createTab(id);

    if (wasActive) {
      this.activeTabId = id;
      this.applyVisibility();
      this.updateBounds();
    }
    return true;
  }

  async navigateTab(id, url) {
    const view = this.getTab(id);
    if (!view) throw new Error(`Tab "${id}" does not exist.`);

    securityManager.closePopup();

    try {
      const sanitized = normalizeUrl(url);
      const ua = isGoogleAuthUrl(sanitized) ? GOOGLE_AUTH_USER_AGENT : CHROME_USER_AGENT;
      view.webContents.setUserAgent(ua);

      await view.webContents.loadURL(sanitized, { userAgent: ua });
      return { success: true };
    } catch (error) {
      if (error.code === 'ERR_ABORTED') return { success: true };
      console.warn(`Navigation error on ${url}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  toggleMute(id) {
    const view = this.getTab(id);
    if (!view) return false;
    const isMuted = view.webContents.isAudioMuted();
    view.webContents.setAudioMuted(!isMuted);
    this.sendTabUpdate(id, view);
    return !isMuted;
  }

  switchTab(id) {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return false;

    securityManager.closePopup();

    this.activeTabId = id || null;
    this.applyVisibility();
    if (!this.activeTabId) return true;

    const next = this.getTab(this.activeTabId);
    if (!next) return false;

    this.updateBounds();
    this.sendTabUpdate(this.activeTabId, next);
    return true;
  }

  goBack(id) {
    securityManager.closePopup();
    const view = this.getTab(id);
    if (view && view.webContents.navigationHistory.canGoBack()) {
      view.webContents.navigationHistory.goBack();
      return true;
    }
    return false;
  }

  goForward(id) {
    securityManager.closePopup();
    const view = this.getTab(id);
    if (view && view.webContents.navigationHistory.canGoForward()) {
      view.webContents.navigationHistory.goForward();
      return true;
    }
    return false;
  }

  reload(id) {
    securityManager.closePopup();
    const view = this.getTab(id);
    if (view) {
      view.webContents.reload();
      return true;
    }
    return false;
  }

  closeTab(id) {
    securityManager.closePopup();
    const view = this.tabViews.get(id);
    if (!view) return false;

    try { this.mainWindow?.contentView.removeChildView(view); } catch {}
    this.tabViews.delete(id);
    this.tabManifests.delete(id);
    this.committedTabs.delete(id); 
    if (!view.webContents.isDestroyed()) view.webContents.close();

    if (this.activeTabId === id) {
      this.activeTabId = null;
      this.applyVisibility();
    }
    return true;
  }

  clear() {
    securityManager.closePopup();
    clearTimeout(this.refreshTimer);
    this.tabViews.forEach((view) => {
      try { this.mainWindow?.contentView.removeChildView(view); } catch {}
      if (!view.webContents.isDestroyed()) view.webContents.close();
    });
    this.tabViews.clear();
    this.tabManifests.clear();
    this.committedTabs.clear(); 
    this.activeTabId = null;
    this.isHtmlFullscreen = false;
    this.overlayOpen = false;
  }
}

const tabManager = new TabManager();

ipcMain.on('tab:exit-fullscreen-request', () => {
  tabManager.exitActiveTabFullscreen();
});

module.exports = tabManager;