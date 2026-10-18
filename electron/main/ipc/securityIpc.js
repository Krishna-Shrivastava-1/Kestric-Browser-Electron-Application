// src/main/ipc/securityIpc.js
const { ipcMain } = require('electron');
const securityManager = require('../securityManager');
const tabManager = require('../tabManager');

function registerSecurityIpc() {
  securityManager.setTabManager(tabManager);

  ipcMain.handle('security:toggle-site-details', async (_event, tabId) => {
    if (securityManager.popupWindow && !securityManager.popupWindow.isDestroyed() && securityManager.popupWindow.isVisible()) {
      securityManager.closePopup();
      return false;
    }

    const targetId = tabId || tabManager?.activeTabId;
    const view = tabManager?.getTab(targetId);
    const wc = view?.webContents || view;
    if (!wc || wc.isDestroyed()) return false;

    const urlString = wc.getURL();
    try {
      const parsed = new URL(urlString);
      const details = {
        url: urlString,
        origin: parsed.origin,
        hostname: parsed.hostname,
        protocol: parsed.protocol,
        isSecure: parsed.protocol === 'https:',
        certificate: securityManager.certStore.get(parsed.hostname) || null,
        permissions: securityManager.getSitePermissions(parsed.origin),
      };
      securityManager.showNativeSiteDetails(details);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerSecurityIpc };