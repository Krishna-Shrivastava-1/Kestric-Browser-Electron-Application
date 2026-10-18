// src/main/securityManager.js
const { BrowserWindow, systemPreferences } = require('electron');

const HARD_DENIED_PERMISSIONS = new Set([
  'display-capture',
  'usb',
  'serial',
  'hid',
  'bluetooth',
  'midiSysex',
  'pointerLock',
  'idle-detection',
  'speaker-selection',
  'keyboard-lock',
]);

class SecurityManager {
  constructor() {
    this.permissionStore = new Map(); // origin -> { camera?: bool, microphone?: bool, notifications?: bool, geolocation?: bool }
    this.certStore = new Map();       // hostname -> cert details
    this.pendingRequests = new Map(); // requestId -> { callback, webContents, origin, permission, mediaTypes }
    this.tabManager = null;
    this.popupWindow = null;
    this.getMainWindow = null;
  }

  setTabManager(tm) {
    this.tabManager = tm;
  }

  getOrigin(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    try {
      const parsed = new URL(rawUrl);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        return parsed.origin;
      }
      return null;
    } catch {
      return null;
    }
  }

  getHostname(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      return new URL(rawUrl).hostname;
    } catch {
      return '';
    }
  }

  normalizePermission(permission, details = {}) {
    if (permission === 'camera') return 'camera';
    if (permission === 'microphone') return 'microphone';
    if (permission === 'media') {
      const types = details.mediaTypes || [];
      const hasVideo = types.includes('video') || types.includes('camera');
      const hasAudio = types.includes('audio') || types.includes('microphone');
      if (hasVideo && !hasAudio) return 'camera';
      if (hasAudio && !hasVideo) return 'microphone';
      return 'media';
    }
    return permission;
  }

  getSavedPermission(origin, permission, details = {}) {
    if (!origin || !this.permissionStore.has(origin)) return undefined;
    const store = this.permissionStore.get(origin);
    const key = this.normalizePermission(permission, details);

    if (key === 'media') {
      const cam = store['camera'];
      const mic = store['microphone'];
      if (cam === false || mic === false) return false;
      if (cam === true && mic === true) return true;
      return store['media'];
    }

    if (key === 'camera') return store['camera'] ?? store['media'];
    if (key === 'microphone') return store['microphone'] ?? store['media'];

    return store[key];
  }

  setSavedPermission(origin, permission, allowed) {
    if (!origin) return;
    if (!this.permissionStore.has(origin)) {
      this.permissionStore.set(origin, {});
    }
    const store = this.permissionStore.get(origin);

    if (allowed === null || allowed === undefined) {
      if (permission === 'media') {
        delete store['camera'];
        delete store['microphone'];
        delete store['media'];
      } else {
        delete store[permission];
      }
    } else {
      const boolVal = Boolean(allowed);
      if (permission === 'media') {
        store['camera'] = boolVal;
        store['microphone'] = boolVal;
        store['media'] = boolVal;
      } else if (permission === 'camera') {
        store['camera'] = boolVal;
      } else if (permission === 'microphone') {
        store['microphone'] = boolVal;
      } else {
        store[permission] = boolVal;
      }
    }

    // Stop active hardware streams if blocked
    if (allowed === false && (permission === 'microphone' || permission === 'camera' || permission === 'media')) {
      this.enforceRevocation(origin, permission);
    }
  }

  enforceRevocation(origin, permission) {
    if (!this.tabManager?.tabViews) return;
    for (const [, view] of this.tabManager.tabViews) {
      const wc = view?.webContents || view;
      if (!wc || wc.isDestroyed()) continue;
      const tabOrigin = this.getOrigin(wc.getURL());
      if (tabOrigin === origin) {
        wc.executeJavaScript(`
          (() => {
            try {
              const isAudio = '${permission}' === 'microphone' || '${permission}' === 'media';
              const isVideo = '${permission}' === 'camera' || '${permission}' === 'media';
              if (window.__zenith_active_streams) {
                window.__zenith_active_streams.forEach(stream => {
                  stream.getTracks().forEach(track => {
                    if ((track.kind === 'audio' && isAudio) || (track.kind === 'video' && isVideo)) {
                      track.stop();
                      track.enabled = false;
                    }
                  });
                });
              }
            } catch (e) {}
          })()
        `, true).catch(() => {});
      }
    }
  }

  getSitePermissions(origin) {
    if (!origin || !this.permissionStore.has(origin)) return {};
    return { ...this.permissionStore.get(origin) };
  }

  async checkSystemAccess(mediaTypes = []) {
    try {
      if (process.platform === 'darwin') {
        if (mediaTypes.includes('audio') || mediaTypes.includes('microphone')) {
          const micStatus = systemPreferences.getMediaAccessStatus('microphone');
          if (micStatus !== 'granted') {
            await systemPreferences.askForMediaAccess('microphone');
          }
        }
        if (mediaTypes.includes('video') || mediaTypes.includes('camera')) {
          const camStatus = systemPreferences.getMediaAccessStatus('camera');
          if (camStatus !== 'granted') {
            await systemPreferences.askForMediaAccess('camera');
          }
        }
      }
    } catch (e) {
      console.warn('[Security] OS media access check:', e.message);
    }
  }

  async respondPermission(requestId, allowed, remember = true) {
    if (!requestId) return false;
    const item = this.pendingRequests.get(requestId);
    if (!item) return false;

    const { callback, webContents, origin, permission, mediaTypes } = item;
    this.pendingRequests.delete(requestId);

    const boolVal = Boolean(allowed);

    if (boolVal) {
      await this.checkSystemAccess(mediaTypes);
    }

    if (remember) {
      const hasVideo = mediaTypes.includes('video') || mediaTypes.includes('camera') || permission === 'camera';
      const hasAudio = mediaTypes.includes('audio') || mediaTypes.includes('microphone') || permission === 'microphone';

      if (hasVideo && hasAudio) {
        this.setSavedPermission(origin, 'camera', boolVal);
        this.setSavedPermission(origin, 'microphone', boolVal);
        this.setSavedPermission(origin, 'media', boolVal);
      } else if (hasVideo) {
        this.setSavedPermission(origin, 'camera', boolVal);
      } else if (hasAudio) {
        this.setSavedPermission(origin, 'microphone', boolVal);
      } else {
        this.setSavedPermission(origin, permission, boolVal);
      }
    }

    try {
      callback(boolVal);
    } catch (err) {
      console.warn('[Security] Chromium callback failed:', err.message);
    }

    this.closePopup();

    if (webContents && !webContents.isDestroyed()) {
      webContents.focus();
    }

    return true;
  }

  closePopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.destroy();
      this.popupWindow = null;
    }
    // Cleanly cancel any unanswered pending requests so Chromium doesn't hang
    for (const [, item] of this.pendingRequests) {
      try { item.callback(false); } catch {}
    }
    this.pendingRequests.clear();
  }

  handleActionUrl(rawUrl) {
    try {
      const url = new URL(rawUrl);
      if (url.protocol !== 'zenith-action:') return;

      const action = url.hostname || url.pathname.replace(/^\/\//, '');

      if (action === 'respond') {
        const requestId = url.searchParams.get('requestId');
        const allowed = url.searchParams.get('allowed') === 'true';
        this.respondPermission(requestId, allowed, true);
      } else if (action === 'update-perm') {
        const origin = url.searchParams.get('origin');
        const permission = url.searchParams.get('permission');
        const val = url.searchParams.get('value');
        const parsedVal = val === 'ask' ? null : val === 'allow';

        this.setSavedPermission(origin, permission, parsedVal);

        if (parsedVal === false && this.tabManager?.activeTabId) {
          const activeTab = this.tabManager.getTab(this.tabManager.activeTabId);
          const wc = activeTab?.webContents || activeTab;
          if (wc && !wc.isDestroyed() && this.getOrigin(wc.getURL()) === origin) {
            wc.reload();
          }
        }
      } else if (action === 'reset') {
        const origin = url.searchParams.get('origin');
        this.permissionStore.delete(origin);
        this.closePopup();

        if (this.tabManager?.activeTabId) {
          const activeTab = this.tabManager.getTab(this.tabManager.activeTabId);
          const wc = activeTab?.webContents || activeTab;
          if (wc && !wc.isDestroyed() && this.getOrigin(wc.getURL()) === origin) {
            wc.reload();
          }
        }
      }
    } catch (e) {
      console.error('[Security] Action handler error:', e);
    }
  }

  openNativeBubble(htmlContent, width = 340, height = 150) {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) {
      this.popupWindow.destroy();
      this.popupWindow = null;
    }

    const mainWin = this.getMainWindow ? this.getMainWindow() : null;
    if (!mainWin || mainWin.isDestroyed()) return;

    const [mainX, mainY] = mainWin.getPosition();

    this.popupWindow = new BrowserWindow({
      width,
      height,
      x: mainX + 46,
      y: mainY + 74,
      frame: false,
      resizable: false,
      movable: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      parent: mainWin,
      focusable: true,
      hasShadow: true,
      backgroundColor: '#00000000',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    // Intercept action links directly (avoids require('electron') sandbox crashes)
    this.popupWindow.webContents.on('will-navigate', (event, navUrl) => {
      event.preventDefault();
      this.handleActionUrl(navUrl);
    });

    this.popupWindow.on('blur', () => {
      // Small timeout so button click navigations fire before destruction
      setTimeout(() => this.closePopup(), 120);
    });

    this.popupWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    this.popupWindow.show();
  }

  showNativePrompt(requestId, origin, permission, mediaTypes) {
    let host = origin;
    try { host = new URL(origin).hostname; } catch {}

    const hasVideo = mediaTypes.includes('video') || mediaTypes.includes('camera') || permission === 'camera';
    const hasAudio = mediaTypes.includes('audio') || mediaTypes.includes('microphone') || permission === 'microphone';

    let actionText = 'use your media devices';
    if (hasVideo && hasAudio) actionText = 'use your camera and microphone';
    else if (hasVideo) actionText = 'use your camera';
    else if (hasAudio) actionText = 'use your microphone';
    else if (permission === 'notifications') actionText = 'show notifications';
    else if (permission === 'geolocation') actionText = 'access your location';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: transparent; padding: 8px; overflow: hidden; }
          .bubble {
            background: #1e1e24;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 12px;
            padding: 16px 18px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.7);
            color: #f1f5f9;
          }
          .title { font-size: 13.5px; font-weight: 600; color: #ffffff; margin-bottom: 4px; }
          .desc { font-size: 12.5px; color: #94a3b8; line-height: 1.4; margin-bottom: 16px; }
          .actions { display: flex; justify-content: flex-end; gap: 8px; }
          button {
            border: none;
            outline: none;
            padding: 7px 16px;
            font-size: 12px;
            font-weight: 500;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .btn-block { background: rgba(255, 255, 255, 0.08); color: #cbd5e1; }
          .btn-block:hover { background: rgba(255, 255, 255, 0.15); color: #ffffff; }
          .btn-allow { background: #2563eb; color: #ffffff; }
          .btn-allow:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="bubble">
          <div class="title">${host}</div>
          <div class="desc">wants to <b>${actionText}</b></div>
          <div class="actions">
            <button class="btn-block" onclick="sendAction(false)">Block</button>
            <button class="btn-allow" onclick="sendAction(true)">Allow</button>
          </div>
        </div>
        <script>
          function sendAction(allowed) {
            window.location.href = 'zenith-action://respond?requestId=' + encodeURIComponent('${requestId}') + '&allowed=' + allowed;
          }
        </script>
      </body>
      </html>
    `;

    this.openNativeBubble(html, 340, 140);
  }

  showNativeSiteDetails(details) {
    const isSecure = details.isSecure;
    const permissions = details.permissions || {};
    const origin = details.origin;
    const certSubject = details.certificate?.subjectName || details.hostname;

    const renderSelect = (id, currentVal) => `
      <div class="row">
        <span class="label">${id.charAt(0).toUpperCase() + id.slice(1)}</span>
        <select onchange="updatePerm('${id}', this.value)">
          <option value="ask" ${currentVal === undefined ? 'selected' : ''}>Ask (default)</option>
          <option value="allow" ${currentVal === true ? 'selected' : ''}>Allow</option>
          <option value="block" ${currentVal === false ? 'selected' : ''}>Block</option>
        </select>
      </div>
    `;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          body { background: transparent; padding: 8px; overflow: hidden; }
          .bubble {
            background: #18181c;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 14px 16px;
            box-shadow: 0 16px 40px rgba(0,0,0,0.7);
            color: #e2e8f0;
          }
          .header { border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 10px; }
          .host { font-size: 13px; font-weight: 600; color: #fff; }
          .status { font-size: 11px; color: ${isSecure ? '#10b981' : '#f59e0b'}; margin-top: 2px; }
          .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin: 10px 0 6px 0; font-weight: 600; }
          .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; font-size: 12px; }
          select {
            background: #25252d;
            border: 1px solid rgba(255,255,255,0.14);
            color: #eee;
            font-size: 11px;
            border-radius: 4px;
            padding: 3px 6px;
            outline: none;
            cursor: pointer;
          }
          select:focus { border-color: #3b82f6; }
          .footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 10px; font-size: 11px; }
          .btn-reset { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
          .btn-reset:hover { color: #fff; }
        </style>
      </head>
      <body>
        <div class="bubble">
          <div class="header">
            <div class="host">${details.hostname}</div>
            <div class="status">${isSecure ? '🔒 Connection is secure' : '⚠️ Connection is not secure'}</div>
          </div>
          <div class="section-title">Permissions</div>
          ${renderSelect('microphone', permissions['microphone'])}
          ${renderSelect('camera', permissions['camera'])}
          ${renderSelect('notifications', permissions['notifications'])}
          ${renderSelect('geolocation', permissions['geolocation'])}
          <div class="footer">
            <span style="color:#64748b; font-size:10px;">${isSecure ? 'Issued to ' + certSubject : 'Insecure'}</span>
            <button class="btn-reset" onclick="resetAll()">Reset permissions</button>
          </div>
        </div>
        <script>
          function updatePerm(permission, val) {
            window.location.href = 'zenith-action://update-perm?origin=' + encodeURIComponent('${origin}') + '&permission=' + encodeURIComponent(permission) + '&value=' + encodeURIComponent(val);
          }
          function resetAll() {
            window.location.href = 'zenith-action://reset?origin=' + encodeURIComponent('${origin}');
          }
        </script>
      </body>
      </html>
    `;

    this.openNativeBubble(html, 320, 255);
  }

  setupSessionSecurity(browserSession, getMainWindow) {
    if (!browserSession) return;
    this.getMainWindow = getMainWindow;

    // 1. Capture TLS/SSL Certificates
    browserSession.setCertificateVerifyProc((request, callback) => {
      const { hostname, certificate, errorCode } = request;
      if (certificate && hostname) {
        this.certStore.set(hostname, {
          subjectName: certificate.subjectName || hostname,
          issuerName: certificate.issuerName || 'Secure CA',
          validStart: certificate.validStart,
          validExpiry: certificate.validExpiry,
          fingerprint: certificate.fingerprint,
          serialNumber: certificate.serialNumber,
          isSecure: errorCode === 0,
        });
      }
      callback(errorCode);
    });

    // 2. Allow media devices to be enumerated by WebRTC
    browserSession.setDevicePermissionHandler(() => true);

    // 3. Primary Permission Request Handler
    browserSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      const mainWin = this.getMainWindow ? this.getMainWindow() : null;

      if (!webContents || webContents.isDestroyed?.()) {
        return callback(false);
      }

      if (mainWin && !mainWin.isDestroyed() && webContents.id === mainWin.webContents?.id) {
        return callback(true);
      }

      const mainUrl = webContents.getURL?.() || '';
      const requestUrl = details?.requestingUrl || mainUrl;
      const origin = this.getOrigin(mainUrl) || this.getOrigin(requestUrl);

      if (!origin || !origin.startsWith('https://')) {
        return callback(false);
      }

      if (HARD_DENIED_PERMISSIONS.has(permission)) {
        return callback(false);
      }

      if (['fullscreen', 'clipboard-sanitized-write', 'mediaKeySystem'].includes(permission)) {
        return callback(true);
      }

      // If user previously allowed or blocked, answer immediately
      const saved = this.getSavedPermission(origin, permission, details);
      if (typeof saved === 'boolean') {
        if (saved) {
          this.checkSystemAccess(details?.mediaTypes || []);
        }
        return callback(saved);
      }

      // Check active tab
      if (this.tabManager?.activeTabId) {
        const activeTab = this.tabManager.getTab(this.tabManager.activeTabId);
        const activeWc = activeTab?.webContents || activeTab;
        if (activeWc && activeWc.id !== webContents.id) {
          return callback(false);
        }
      }

      const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      let mediaTypes = details?.mediaTypes || [];

      if (permission === 'media' && mediaTypes.length === 0) {
        mediaTypes = ['audio', 'video'];
      } else if (permission === 'camera') {
        mediaTypes = ['video'];
      } else if (permission === 'microphone') {
        mediaTypes = ['audio'];
      }

      this.pendingRequests.set(requestId, { callback, webContents, origin, permission, mediaTypes });
      this.showNativePrompt(requestId, origin, permission, mediaTypes);
    });

    // 4. Synchronous Permission Check Handler
    browserSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      if (!webContents || webContents.isDestroyed?.()) {
        return false;
      }

      const mainWin = this.getMainWindow ? this.getMainWindow() : null;
      if (mainWin && !mainWin.isDestroyed() && webContents.id === mainWin.webContents?.id) {
        return true;
      }

      const mainUrl = webContents.getURL?.() || '';
      const origin = this.getOrigin(mainUrl) || this.getOrigin(requestingOrigin);
      if (!origin || !origin.startsWith('https://')) return false;

      const saved = this.getSavedPermission(origin, permission, details || {});

      // ONLY return true if explicitly allowed.
      // If blocked, return false.
      if (saved === true) return true;
      if (saved === false) return false;

      // DO NOT return false here if undefined!
      // Returning false makes Google Meet believe it is permanently blocked.
      // Returning true allows Meet to proceed to getUserMedia where setPermissionRequestHandler prompts.
      return true;
    });
  }
}

module.exports = new SecurityManager();