// src/main/pwaManager.js
const { BrowserWindow, app } = require('electron');
const path = require('path');
const fs = require('fs');

class PwaManager {
  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'pwa-apps.json');
    this.installedApps = this.loadInstalledApps();
    this.runningWindows = new Map(); // id -> BrowserWindow
  }

  loadInstalledApps() {
    try {
      if (fs.existsSync(this.storagePath)) {
        return JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
      }
    } catch (e) {
      console.error('Failed to parse installed PWAs registry:', e);
    }
    return {};
  }

  saveInstalledApps() {
    try {
      fs.writeFileSync(this.storagePath, JSON.stringify(this.installedApps, null, 2));
    } catch (e) {
      console.error('Failed to save installed PWAs registry:', e);
    }
  }

  getInstalledApps() {
    return Object.values(this.installedApps);
  }

  async installApp(manifestData) {
    if (!manifestData || !manifestData.startUrl) {
      throw new Error('Invalid manifest data.');
    }

    const appId = Buffer.from(manifestData.startUrl).toString('base64url');
    this.installedApps[appId] = {
      id: appId,
      name: manifestData.name || manifestData.shortName || 'Web App',
      startUrl: manifestData.startUrl,
      icon: manifestData.icon || null,
      themeColor: manifestData.themeColor || '#121216',
      installedAt: Date.now(),
    };

    this.saveInstalledApps();
    this.launchApp(appId);
    return this.installedApps[appId];
  }

  uninstallApp(appId) {
    if (this.runningWindows.has(appId)) {
      this.runningWindows.get(appId).close();
      this.runningWindows.delete(appId);
    }
    delete this.installedApps[appId];
    this.saveInstalledApps();
    return true;
  }

  launchApp(appId) {
    const pwa = this.installedApps[appId];
    if (!pwa) return null;

    if (this.runningWindows.has(appId)) {
      const existing = this.runningWindows.get(appId);
      if (!existing.isDestroyed()) {
        existing.focus();
        return existing;
      }
    }

    const pwaWin = new BrowserWindow({
      width: 1024,
      height: 768,
      minWidth: 400,
      minHeight: 300,
      title: pwa.name,
      backgroundColor: pwa.themeColor || '#121216',
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    pwaWin.loadURL(pwa.startUrl);

    this.runningWindows.set(appId, pwaWin);

    pwaWin.on('closed', () => {
      this.runningWindows.delete(appId);
    });

    return pwaWin;
  }
}

module.exports = new PwaManager();