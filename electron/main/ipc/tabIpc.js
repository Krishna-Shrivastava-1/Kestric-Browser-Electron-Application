// src/main/ipc/tabIpc.js
const { ipcMain } = require('electron');
const tabManager = require('../tabManager');

function registerTabIpc() {
  ipcMain.handle('tab:create', (_event, payload) => {
    const id = typeof payload === 'object' && payload?.id ? payload.id : payload;
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid tab ID.');
    return tabManager.createTab(id);
  });

  ipcMain.handle('tab:switch', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.switchTab(id);
  });

  ipcMain.handle('tab:navigate', async (_event, payload) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid navigate payload.');
    const { id, url } = payload;
    if (typeof id !== 'string' || typeof url !== 'string') throw new Error('Invalid parameters for navigation.');
    return tabManager.navigateTab(id, url);
  });

  ipcMain.handle('tab:clear', (_event, payload) => {
    const targetId = typeof payload === 'object' && payload?.id ? payload.id : payload;
    if (typeof targetId !== 'string') return false;
    return tabManager.clearTab(targetId);
  });

  ipcMain.handle('tab:back', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.goBack(id);
  });
  ipcMain.handle('tab:setSecurityOffset', (_event, offset) => {
    if (typeof tabManager.setSecurityOffset === 'function') {
      tabManager.setSecurityOffset(offset);
    }
    return true;
  });
  ipcMain.handle('tab:forward', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.goForward(id);
  });

  ipcMain.handle('tab:reload', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.reload(id);
  });

  ipcMain.handle('tab:close', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.closeTab(id);
  });

  ipcMain.handle('tab:toggleMute', (_event, id) => {
    if (typeof id !== 'string') return false;
    return tabManager.toggleMute(id);
  });

  ipcMain.handle('tab:togglePiP', () => {
    return tabManager.triggerActiveTabPiP();
  });

  // RESTORED: Prevents the unhandled invocation error
ipcMain.handle('tab:setOverlay', async (_event, isOpen) => {
  return await tabManager.setOverlayVisible(isOpen);
});
}

module.exports = { registerTabIpc };













// // src/main/ipc/tabIpc.js
// const { ipcMain } = require('electron');
// const tabManager = require('../tabManager');

// function registerTabIpc() {
//   ipcMain.handle('tab:create', (_event, { id }) => tabManager.createTab(id));
//   ipcMain.handle('tab:switch', (_event, id) => tabManager.switchTab(id));
//   ipcMain.handle('tab:navigate', (_event, { id, url }) => tabManager.navigateTab(id, url));
// ipcMain.handle('tab:clear', (_event, id) => {
//   // Handles either string id or { id }
//   const targetId = typeof id === 'object' && id?.id ? id.id : id;
//   return tabManager.clearTab(targetId);
// });
//   ipcMain.handle('tab:back', (_event, id) => tabManager.goBack(id));
//   ipcMain.handle('tab:forward', (_event, id) => tabManager.goForward(id));
//   ipcMain.handle('tab:reload', (_event, id) => tabManager.reload(id));
//   ipcMain.handle('tab:close', (_event, id) => tabManager.closeTab(id));
//   ipcMain.handle('tab:toggleMute', (_event, id) => tabManager.toggleMute(id));
//   ipcMain.handle('tab:togglePiP', () => tabManager.triggerActiveTabPiP());

//   ipcMain.handle('tab:setOverlay', (_event, isOpen) => {
//     tabManager.setOverlayVisible(isOpen);
//     return true;
//   });
// }

// module.exports = { registerTabIpc };