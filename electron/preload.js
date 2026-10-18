// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('browserAPI', {
  // Navigation & Tabs
  search: (query, offset = 0) => ipcRenderer.invoke('search:query', { query, offset }),
  createTab: (id) => ipcRenderer.invoke('tab:create', { id }),
  switchTab: (id) => ipcRenderer.invoke('tab:switch', id),
  navigate: (id, url) => ipcRenderer.invoke('tab:navigate', { id, url }),
  clearTab: (id) => ipcRenderer.invoke('tab:clear', id),
  closeTab: (id) => ipcRenderer.invoke('tab:close', id),
  goBack: (id) => ipcRenderer.invoke('tab:back', id),
  goForward: (id) => ipcRenderer.invoke('tab:forward', id),
  reload: (id) => ipcRenderer.invoke('tab:reload', id),
  toggleMute: (id) => ipcRenderer.invoke('tab:toggleMute', id),
  setOverlay: (isOpen) => ipcRenderer.invoke('tab:setOverlay', isOpen),
   onOverlaySnapshot: (callback) => {
    const handler = (_event, dataUrl) => callback(dataUrl);
    ipcRenderer.on('tab:overlay-snapshot', handler);
    return () => ipcRenderer.removeListener('tab:overlay-snapshot', handler);
  },
  // Downloads API
   // Downloads API
  toggleDownloadsPopup: (bounds) => ipcRenderer.invoke('downloads:toggle-popup', bounds),
  closeDownloadsPopup: () => ipcRenderer.invoke('downloads:close-popup'),
  getDownloads: () => ipcRenderer.invoke('downloads:get-all'),
  pauseDownload: (id) => ipcRenderer.invoke('downloads:pause', id),
  resumeDownload: (id) => ipcRenderer.invoke('downloads:resume', id),
  cancelDownload: (id) => ipcRenderer.invoke('downloads:cancel', id),
  openDownload: (id) => ipcRenderer.invoke('downloads:open-file', id),
  showDownloadInFolder: (id) => ipcRenderer.invoke('downloads:show-in-folder', id),
  removeDownload: (id) => ipcRenderer.invoke('downloads:remove', id),
  clearDownloads: () => ipcRenderer.invoke('downloads:clear'),
  startDrag: (id) => ipcRenderer.send('downloads:start-drag', id),
  onDownloadsUpdated: (callback) => {
    const handler = (_event, items) => callback(items);
    ipcRenderer.on('downloads:updated', handler);
    return () => ipcRenderer.removeListener('downloads:updated', handler);
  },
 
  // Picture in Picture
  togglePiP: () => ipcRenderer.invoke('tab:togglePiP'),

  // Security Native Bubble
  toggleSiteDetails: (tabId) => ipcRenderer.invoke('security:toggle-site-details', tabId),

  // PWA Features
  installPwa: (manifest) => ipcRenderer.invoke('pwa:install', manifest),
  uninstallPwa: (appId) => ipcRenderer.invoke('pwa:uninstall', appId),
  launchPwa: (appId) => ipcRenderer.invoke('pwa:launch', appId),
  listPwas: () => ipcRenderer.invoke('pwa:list'),

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Fullscreen Exit
  exitFullscreen: () => ipcRenderer.send('tab:exit-fullscreen-request'),
  onFullscreenChange: (callback) => {
    const handler = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-change', handler);
    return () => ipcRenderer.removeListener('window:fullscreen-change', handler);
  },

  // Event Listeners
  onNewTabRequested: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('tab:requested-new', handler);
    return () => ipcRenderer.removeListener('tab:requested-new', handler);
  },
  onTabUpdated: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('tab:updated', handler);
    return () => ipcRenderer.removeListener('tab:updated', handler);
  },
  onMaximized: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('window:isMaximized', handler);
    return () => ipcRenderer.removeListener('window:isMaximized', handler);
  },
});