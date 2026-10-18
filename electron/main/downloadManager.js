
// // src/main/downloadManager.js
// const { ipcMain, shell, session, app, nativeImage, BrowserWindow } = require('electron');
// const path = require('path');
// const fs = require('fs');

// const DRAG_ICON = nativeImage.createFromDataURL(
//   'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVRYR+3QQREAAAzCQNq/9GoKvpEBt5NkyZcvv4ACFKAABShAAQpQgAL2Fjg+bAEx92vYAAAAAElFTkSuQmCC'
// );

// function getValidExtension(filename, mimeType, url) {
//   let ext = path.extname(filename || '').toLowerCase().split('?')[0];
//   if (ext && ext.length <= 5 && !['.htm', '.html', '.php', '.asp', '.bin', ''].includes(ext)) {
//     return ext;
//   }

//   const mime = (mimeType || '').toLowerCase();
//   if (mime.includes('video/mp4')) return '.mp4';
//   if (mime.includes('video/webm')) return '.webm';
//   if (mime.includes('video/quicktime')) return '.mov';
//   if (mime.includes('video/x-matroska')) return '.mkv';
//   if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return '.mp3';
//   if (mime.includes('audio/wav')) return '.wav';
//   if (mime.includes('audio/webm') || mime.includes('audio/ogg')) return '.ogg';
//   if (mime.includes('image/png')) return '.png';
//   if (mime.includes('image/jpeg')) return '.jpg';
//   if (mime.includes('image/webp')) return '.webp';
//   if (mime.includes('image/gif')) return '.gif';
//   if (mime.includes('application/pdf')) return '.pdf';
//   if (mime.includes('application/zip')) return '.zip';

//   try {
//     const parsedUrl = new URL(url);
//     const pathnameExt = path.extname(parsedUrl.pathname).toLowerCase();
//     if (pathnameExt && pathnameExt.length <= 5) return pathnameExt;
//   } catch (e) {}

//   return '.mp4';
// }

// function sanitizeFilename(name) {
//   return (name || 'download').replace(/[/\\?%*:|"<>]/g, '_').trim();
// }

// function resolvePreloadPath() {
//   const candidates = [
//     path.join(__dirname, '../preload.js'),
//     path.join(__dirname, '../../preload.js'),
//     path.join(__dirname, 'preload.js'),
//     path.join(app.getAppPath(), 'preload.js'),
//     path.join(app.getAppPath(), 'src/preload.js'),
//     path.join(process.cwd(), 'preload.js'),
//   ];
//   return candidates.find(p => fs.existsSync(p)) || path.join(app.getAppPath(), 'preload.js');
// }

// const POPUP_HTML_CONTENT = `<!DOCTYPE html>
// <html>
// <head>
//   <meta charset="utf-8">
//   <style>
//     :root {
//       --bg: rgba(18, 19, 26, 0.88);
//       --card-border: rgba(255, 255, 255, 0.12);
//       --item-bg: rgba(255, 255, 255, 0.03);
//       --item-hover: rgba(255, 255, 255, 0.07);
//       --text-main: #f4f4f5;
//       --text-muted: #9496a1;
//       --accent: #3b82f6;
//       --success: #10b981;
//       --warning: #f59e0b;
//       --danger: #ef4444;
//     }

//     * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif; }
    
//     body {
//       background: transparent;
//       padding: 10px;
//       width: 100vw;
//       height: 100vh;
//       overflow: hidden;
//     }

//     .card {
//       background: var(--bg);
//       backdrop-filter: blur(40px) saturate(190%);
//       -webkit-backdrop-filter: blur(40px) saturate(190%);
//       border: 1px solid var(--card-border);
//       border-radius: 18px;
//       box-shadow: 0 24px 48px -8px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.06);
//       display: flex;
//       flex-direction: column;
//       height: 100%;
//       overflow: hidden;
//       animation: popIn 0.14s cubic-bezier(0.16, 1, 0.3, 1) forwards;
//     }

//     @keyframes popIn {
//       from { opacity: 0; transform: scale(0.97) translateY(-4px); }
//       to { opacity: 1; transform: scale(1) translateY(0); }
//     }

//     .header {
//       display: flex;
//       align-items: center;
//       justify-content: space-between;
//       // padding: 13px 18px;
//       border-bottom: 1px solid rgba(255, 255, 255, 0.07);
//       background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
//     }

//     .title {
//       font-size: 13px;
//       font-weight: 600;
//       color: var(--text-main);
//       letter-spacing: -0.01em;
//     }

//     .clear-btn {
//       background: none;
//       border: none;
//       font-size: 11.5px;
//       font-weight: 500;
//       color: var(--text-muted);
//       cursor: pointer;
//       transition: color 0.15s;
//     }
//     .clear-btn:hover { color: #fff; }

//     .list {
//       flex: 1;
//       overflow-y: auto;
//       padding: 8px 10px;
//       display: flex;
//       flex-direction: column;
//       gap: 6px;
//     }
//     .list::-webkit-scrollbar { width: 4px; }
//     .list::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 4px; }

//     .empty {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       justify-content: center;
//       height: 100%;
//       color: var(--text-muted);
//       font-size: 12px;
//       gap: 10px;
//     }

//     .item {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//       padding: 10px 12px;
//       border-radius: 12px;
//       background: var(--item-bg);
//       border: 1px solid rgba(255, 255, 255, 0.04);
//       transition: all 0.15s ease;
//     }
//     .item:hover {
//       background: var(--item-hover);
//       border-color: rgba(255, 255, 255, 0.08);
//       transform: translateY(-0.5px);
//     }

//     .icon-box {
//       width: 38px;
//       height: 38px;
//       border-radius: 10px;
//       background: rgba(255, 255, 255, 0.04);
//       border: 1px solid rgba(255, 255, 255, 0.08);
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       flex-shrink: 0;
//     }

//     .info { flex: 1; min-width: 0; }
    
//     .filename {
//       font-size: 12.5px;
//       font-weight: 500;
//       color: var(--text-main);
//       white-space: nowrap;
//       overflow: hidden;
//       text-overflow: ellipsis;
//       cursor: pointer;
//       letter-spacing: -0.01em;
//     }
//     .filename:hover { text-decoration: underline; }

//     .status {
//       font-size: 11px;
//       color: var(--text-muted);
//       margin-top: 3px;
//       display: flex;
//       align-items: center;
//       gap: 6px;
//       white-space: nowrap;
//       overflow: hidden;
//       text-overflow: ellipsis;
//     }
//     .status.done { color: var(--success); font-weight: 500; }
//     .status.paused { color: var(--warning); font-weight: 500; }
//     .status.failed { color: var(--danger); font-weight: 500; }

//     .badge {
//       font-size: 10px;
//       font-weight: 600;
//       background: rgba(59, 130, 246, 0.15);
//       color: #60a5fa;
//       padding: 1px 6px;
//       border-radius: 4px;
//       border: 1px solid rgba(59, 130, 246, 0.25);
//     }

//     .progress-track {
//       width: 100%;
//       height: 5px;
//       background: rgba(255, 255, 255, 0.09);
//       border-radius: 99px;
//       margin-top: 6px;
//       overflow: hidden;
//       position: relative;
//     }

//     .progress-fill {
//       height: 100%;
//       background: linear-gradient(90deg, #2563eb, #60a5fa);
//       box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
//       border-radius: 99px;
//       transition: width 0.15s ease-out;
//     }
//     .progress-fill.paused {
//       background: linear-gradient(90deg, #d97706, #fbbf24);
//       box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
//     }
//     .progress-fill.indeterminate {
//       width: 35% !important;
//       animation: indeterminateSlide 1.3s infinite ease-in-out;
//     }
//     @keyframes indeterminateSlide {
//       0% { transform: translateX(-100%); }
//       100% { transform: translateX(380%); }
//     }

//     .actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    
//     .action-btn {
//       background: none;
//       border: none;
//       color: var(--text-muted);
//       padding: 6px;
//       border-radius: 8px;
//       cursor: pointer;
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       transition: all 0.15s ease;
//     }
//     .action-btn:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
//     .action-btn.danger:hover { color: var(--danger); background: rgba(239, 68, 68, 0.15); }
//   </style>
// </head>
// <body>
//   <div class="card">
//     <div class="header">
//       <span class="title">Downloads</span>
//       <button class="clear-btn" data-action="clear">Clear list</button>
//     </div>
//     <div class="list" id="downloadsList"></div>
//   </div>

//   <script>
//     function getApi() { return window.browserAPI; }

//     function formatBytes(bytes) {
//       if (!bytes || bytes <= 0) return '0 B';
//       const k = 1024;
//       const sizes = ['B', 'KB', 'MB', 'GB'];
//       const i = Math.floor(Math.log(bytes) / Math.log(k));
//       return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
//     }

//     function render(items) {
//       const list = document.getElementById('downloadsList');
//       if (!items || items.length === 0) {
//         list.innerHTML = '<div class="empty"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M19 12l-7 7-7-7"/></svg><span>No recent downloads</span></div>';
//         return;
//       }

//       list.innerHTML = items.map(item => {
//         const isProgressing = item.state === 'progressing';
//         const isPaused = item.state === 'paused';
//         const isCompleted = item.state === 'completed';
//         const isFailed = item.state === 'cancelled' || item.state === 'interrupted';
//         const isDeleted = isCompleted && item.fileMissing;

//         let statusText = '';
//         let showBar = isProgressing || isPaused;
//         let percent = Math.round((item.progress || 0) * 100);
//         let isIndeterminate = showBar && (!item.totalBytes || item.totalBytes <= 0);

//         if (isCompleted && !isDeleted) {
//           statusText = '<span class="status done">✓ Complete • ' + formatBytes(item.totalBytes) + '</span>';
//         } else if (isDeleted) {
//           statusText = '<span class="status failed">File removed from disk</span>';
//         } else if (isProgressing) {
//           if (isIndeterminate) {
//             statusText = '<span class="status">' + formatBytes(item.receivedBytes) + ' • ' + (item.speed || 'Downloading...') + '</span>';
//           } else {
//             statusText = '<span class="status"><span class="badge">' + percent + '%</span> ' + formatBytes(item.receivedBytes) + ' of ' + formatBytes(item.totalBytes) + ' • ' + (item.speed || '0 KB/s') + '</span>';
//           }
//         } else if (isPaused) {
//           statusText = '<span class="status paused">Paused • ' + formatBytes(item.receivedBytes) + (item.totalBytes > 0 ? ' of ' + formatBytes(item.totalBytes) : '') + '</span>';
//         } else if (isFailed) {
//           statusText = '<span class="status failed">Cancelled</span>';
//         }

//         const iconColor = isCompleted ? '#10b981' : isPaused ? '#f59e0b' : '#3b82f6';

//         return '<div class="item" draggable="' + (isCompleted && !isDeleted) + '" data-id="' + item.id + '">' +
//           '<div class="icon-box">' +
//             '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="' + iconColor + '" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' +
//           '</div>' +
//           '<div class="info">' +
//             '<div class="filename" data-action="open" data-id="' + item.id + '" title="' + item.filename + '">' + item.filename + '</div>' +
//             statusText +
//             (showBar ? '<div class="progress-track"><div class="progress-fill ' + (isPaused ? 'paused ' : '') + (isIndeterminate ? 'indeterminate' : '') + '" style="width:' + (isIndeterminate ? '35' : Math.max(3, percent)) + '%"></div></div>' : '') +
//           '</div>' +
//           '<div class="actions">' +
//             (isProgressing ? '<button class="action-btn" title="Pause" data-action="pause" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>' : '') +
//             (isPaused ? '<button class="action-btn" title="Resume" data-action="resume" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' : '') +
//             (showBar ? '<button class="action-btn danger" title="Cancel" data-action="cancel" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : '') +
//             (isCompleted && !isDeleted ? '<button class="action-btn" title="Open Folder" data-action="folder" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>' : '') +
//             '<button class="action-btn danger" title="Remove" data-action="remove" data-id="' + item.id + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
//           '</div>' +
//         '</div>';
//       }).join('');
//     }

//     document.addEventListener('click', (e) => {
//       const target = e.target.closest('[data-action]');
//       if (!target) return;
//       e.stopPropagation();

//       const action = target.dataset.action;
//       const id = target.dataset.id;
//       const api = getApi();
//       if (!api) return;

//       if (action === 'pause') api.pauseDownload(id);
//       else if (action === 'resume') api.resumeDownload(id);
//       else if (action === 'cancel') api.cancelDownload(id);
//       else if (action === 'open') api.openDownload(id);
//       else if (action === 'folder') api.showDownloadInFolder(id);
//       else if (action === 'remove') api.removeDownload(id);
//       else if (action === 'clear') api.clearDownloads();
//     });

//     document.addEventListener('dragstart', (e) => {
//       const itemEl = e.target.closest('.item[draggable="true"]');
//       if (itemEl && itemEl.dataset.id) {
//         e.preventDefault();
//         getApi()?.startDrag?.(itemEl.dataset.id);
//       }
//     });

//     window.addEventListener('keydown', (e) => {
//       if (e.key === 'Escape') getApi()?.closeDownloadsPopup?.();
//     });

//     getApi()?.getDownloads?.().then(render);
//     getApi()?.onDownloadsUpdated?.((items) => render(items));
//   </script>
// </body>
// </html>`;

// class DownloadManager {
//   constructor() {
//     this.downloads = new Map();
//     this.mainWindow = null;
//     this.popupWindow = null;
//     this.hookedSessions = new WeakSet();
//     this.popupFilePath = null;

//     this.initPopupFile();
//     this.registerIpc();
//     this.initDefaultSessions();
//   }

//   initPopupFile() {
//     try {
//       this.popupFilePath = path.join(app.getPath('userData'), 'downloads-popup.html');
//       fs.writeFileSync(this.popupFilePath, POPUP_HTML_CONTENT, 'utf8');
//     } catch (e) {
//       console.warn('initPopupFile:', e.message);
//     }
//   }

//   setMainWindow(win) {
//     this.mainWindow = win;
//     // Pre-create the popup window immediately so opening it is instantaneous (0ms)
//     this.ensurePopupWindow();
//   }

//   initDefaultSessions() {
//     app.whenReady().then(() => {
//       if (session.defaultSession) {
//         this.setupSession(session.defaultSession);
//       }
//       app.on('session-created', (newSession) => {
//         this.setupSession(newSession);
//       });
//     });
//   }

//   // Pre-warms the popup in the background so there is ZERO delay when opening
//   ensurePopupWindow() {
//     if (this.popupWindow && !this.popupWindow.isDestroyed()) return;
//     if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

//     this.popupWindow = new BrowserWindow({
//       width: 380,
//       height: 440,
//       parent: this.mainWindow,
//       frame: false,
//       transparent: true,
//       hasShadow: true,
//       resizable: false,
//       skipTaskbar: true,
//       alwaysOnTop: true,
//       show: false,
//       backgroundColor: '#00000000',
//       backgroundMaterial: 'acrylic', // Native Windows 11 Acrylic Blur
//       vibrancy: 'popover',          // Native macOS Glass Blur
//       webPreferences: {
//         preload: resolvePreloadPath(),
//         contextIsolation: true,
//         nodeIntegration: false,
//       },
//     });

//     if (this.popupFilePath && fs.existsSync(this.popupFilePath)) {
//       this.popupWindow.loadFile(this.popupFilePath);
//     }

//     this.popupWindow.on('blur', () => {
//       this.closePopup();
//     });
//   }

//   closePopup() {
//     if (this.popupWindow && !this.popupWindow.isDestroyed() && this.popupWindow.isVisible()) {
//       this.popupWindow.hide();
//     }
//   }

//   // 0ms instant reveal & reposition
//   showPopup(anchorBounds) {
//     this.ensurePopupWindow();
//     if (!this.popupWindow || this.popupWindow.isDestroyed()) return;

//     if (this.popupWindow.isVisible()) {
//       this.popupWindow.hide();
//       return;
//     }

//     const [winX, winY] = this.mainWindow.getPosition();
//     const popupWidth = 380;
//     const x = Math.round(winX + (anchorBounds?.x || 0) + (anchorBounds?.width || 0) - popupWidth);
//     const y = Math.round(winY + (anchorBounds?.y || 0) + (anchorBounds?.height || 0) + 4);

//     this.popupWindow.setPosition(x, y, false);
//     this.popupWindow.show();
//     this.popupWindow.focus();

//     // Instantly sync the newest downloads list
//     this.broadcast();
//   }

//   syncDiskPresence() {
//     for (const [, entry] of this.downloads) {
//       if (entry.info.state === 'completed') {
//         const exists = Boolean(entry.info.savePath && fs.existsSync(entry.info.savePath));
//         entry.info.fileMissing = !exists;
//       }
//     }
//   }

//   setupSession(browserSession) {
//     if (!browserSession || this.hookedSessions.has(browserSession)) return;
//     this.hookedSessions.add(browserSession);

//     browserSession.on('will-download', (_event, item) => {
//       const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
//       const rawFilename = item.getFilename() || '';
//       const mime = item.getMimeType() || '';
//       const url = item.getURL() || '';

//       const ext = getValidExtension(rawFilename, mime, url);
//       let baseName = sanitizeFilename(path.basename(rawFilename, path.extname(rawFilename || '')));
//       if (!baseName || baseName === '_') baseName = `video_${Date.now()}`;
//       let finalFilename = `${baseName}${ext}`;

//       const downloadsDir = app.getPath('downloads');
//       if (!fs.existsSync(downloadsDir)) {
//         fs.mkdirSync(downloadsDir, { recursive: true });
//       }

//       let finalPath = path.join(downloadsDir, finalFilename);
//       let counter = 1;

//       while (fs.existsSync(finalPath)) {
//         finalPath = path.join(downloadsDir, `${baseName} (${counter})${ext}`);
//         counter++;
//       }

//       item.setSavePath(finalPath);

//       const totalBytes = item.getTotalBytes() || 0;
//       const startTime = Date.now();
//       let lastBytes = 0;
//       let lastTime = startTime;
//       let speed = '0 KB/s';

//       const downloadInfo = {
//         id,
//         filename: path.basename(finalPath),
//         totalBytes,
//         receivedBytes: 0,
//         progress: 0,
//         speed: '0 KB/s',
//         state: 'progressing',
//         savePath: finalPath,
//         fileMissing: false,
//         startTime,
//       };

//       this.downloads.set(id, { item, info: downloadInfo });
//       this.broadcast();

//       let lastUpdate = 0;

//       item.on('updated', (_evt, state) => {
//         const now = Date.now();
//         const received = item.getReceivedBytes();

//         if (now - lastTime >= 400) {
//           const bytesDiff = received - lastBytes;
//           const timeDiff = (now - lastTime) / 1000;
//           const bytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;

//           if (bytesPerSec > 1024 * 1024) {
//             speed = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
//           } else {
//             speed = `${Math.round(bytesPerSec / 1024)} KB/s`;
//           }

//           lastBytes = received;
//           lastTime = now;
//         }

//         downloadInfo.receivedBytes = received;
//         const total = item.getTotalBytes();
//         if (total && total > 0) downloadInfo.totalBytes = total;

//         downloadInfo.progress = downloadInfo.totalBytes > 0 
//           ? downloadInfo.receivedBytes / downloadInfo.totalBytes 
//           : 0;
//         downloadInfo.speed = speed;
//         downloadInfo.state = state === 'paused' ? 'paused' : 'progressing';

//         const updatedPath = item.getSavePath();
//         if (updatedPath) downloadInfo.savePath = updatedPath;

//         if (now - lastUpdate > 80) {
//           lastUpdate = now;
//           this.broadcast();
//         }
//       });

//       item.once('done', (_evt, state) => {
//         downloadInfo.state = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted';
//         downloadInfo.progress = state === 'completed' ? 1 : downloadInfo.progress;
        
//         const finalResolvedPath = item.getSavePath() || finalPath;
//         downloadInfo.savePath = finalResolvedPath;

//         if (state === 'completed' && fs.existsSync(finalResolvedPath)) {
//           try {
//             const stats = fs.statSync(finalResolvedPath);
//             downloadInfo.totalBytes = stats.size;
//             downloadInfo.receivedBytes = stats.size;
//             downloadInfo.fileMissing = false;
//           } catch (e) {}
//         }

//         this.broadcast();
//       });
//     });
//   }

//   broadcast() {
//     this.syncDiskPresence();
//     const items = Array.from(this.downloads.values()).map(d => ({ ...d.info }));

//     if (this.mainWindow && !this.mainWindow.isDestroyed()) {
//       this.mainWindow.webContents.send('downloads:updated', items);
//     }
//     if (this.popupWindow && !this.popupWindow.isDestroyed() && this.popupWindow.isVisible()) {
//       this.popupWindow.webContents.send('downloads:updated', items);
//     }
//   }

//   registerIpc() {
//     ipcMain.handle('downloads:toggle-popup', (_e, bounds) => {
//       this.showPopup(bounds);
//       return true;
//     });

//     ipcMain.handle('downloads:close-popup', () => {
//       this.closePopup();
//       return true;
//     });

//     ipcMain.handle('downloads:get-all', () => {
//       this.syncDiskPresence();
//       return Array.from(this.downloads.values()).map(d => ({ ...d.info }));
//     });

//     ipcMain.handle('downloads:pause', (_e, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.item) {
//         try {
//           if (!entry.item.isPaused()) entry.item.pause();
//         } catch (e) {}
//         entry.info.state = 'paused';
//         this.broadcast();
//       }
//       return true;
//     });

//     ipcMain.handle('downloads:resume', (_e, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.item) {
//         try {
//           if (entry.item.canResume()) entry.item.resume();
//         } catch (e) {}
//         entry.info.state = 'progressing';
//         this.broadcast();
//       }
//       return true;
//     });

//     ipcMain.handle('downloads:cancel', (_e, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.item) {
//         try { entry.item.cancel(); } catch (e) {}
//         entry.info.state = 'cancelled';
//         this.broadcast();
//       }
//       return true;
//     });

//     ipcMain.handle('downloads:open-file', async (_e, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
//         const error = await shell.openPath(entry.info.savePath);
//         if (error) {
//           shell.openExternal(`file://${entry.info.savePath}`);
//         }
//         return true;
//       } else if (entry) {
//         entry.info.fileMissing = true;
//         this.broadcast();
//       }
//       return false;
//     });

//     ipcMain.handle('downloads:show-in-folder', (_e, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
//         shell.showItemInFolder(entry.info.savePath);
//       } else if (entry) {
//         entry.info.fileMissing = true;
//         this.broadcast();
//       }
//       return true;
//     });

//     ipcMain.on('downloads:start-drag', (event, id) => {
//       const entry = this.downloads.get(id);
//       if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
//         event.sender.startDrag({
//           file: path.normalize(entry.info.savePath),
//           icon: DRAG_ICON,
//         });
//       }
//     });

//     ipcMain.handle('downloads:remove', (_e, id) => {
//       this.downloads.delete(id);
//       this.broadcast();
//       return true;
//     });

//     ipcMain.handle('downloads:clear', () => {
//       for (const [id, entry] of this.downloads) {
//         if (['completed', 'cancelled', 'interrupted'].includes(entry.info.state)) {
//           this.downloads.delete(id);
//         }
//       }
//       this.broadcast();
//       return true;
//     });
//   }
// }

// module.exports = new DownloadManager();



















// src/main/downloadManager.js
const { ipcMain, shell, session, app, nativeImage, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const DRAG_ICON = nativeImage.createFromDataURL(
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVRYR+3QQREAAAzCQNq/9GoKvpEBt5NkyZcvv4ACFKAABShAAQpQgAL2Fjg+bAEx92vYAAAAAElFTkSuQmCC'
);

function getValidExtension(filename, mimeType, url) {
  let ext = path.extname(filename || '').toLowerCase().split('?')[0];
  if (ext && ext.length <= 5 && !['.htm', '.html', '.php', '.asp', '.bin', ''].includes(ext)) {
    return ext;
  }

  const mime = (mimeType || '').toLowerCase();
  if (mime.includes('video/mp4')) return '.mp4';
  if (mime.includes('video/webm')) return '.webm';
  if (mime.includes('video/quicktime')) return '.mov';
  if (mime.includes('video/x-matroska')) return '.mkv';
  if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) return '.mp3';
  if (mime.includes('audio/wav')) return '.wav';
  if (mime.includes('audio/webm') || mime.includes('audio/ogg')) return '.ogg';
  if (mime.includes('image/png')) return '.png';
  if (mime.includes('image/jpeg')) return '.jpg';
  if (mime.includes('image/webp')) return '.webp';
  if (mime.includes('image/gif')) return '.gif';
  if (mime.includes('application/pdf')) return '.pdf';
  if (mime.includes('application/zip')) return '.zip';

  try {
    const parsedUrl = new URL(url);
    const pathnameExt = path.extname(parsedUrl.pathname).toLowerCase();
    if (pathnameExt && pathnameExt.length <= 5) return pathnameExt;
  } catch (e) {}

  return '.mp4';
}

function sanitizeFilename(name) {
  return (name || 'download').replace(/[/\\?%*:|"<>]/g, '_').trim();
}

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, '../preload.js'),
    path.join(__dirname, '../../preload.js'),
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'preload.js'),
    path.join(app.getAppPath(), 'src/preload.js'),
    path.join(process.cwd(), 'preload.js'),
  ];
  return candidates.find(p => fs.existsSync(p)) || path.join(app.getAppPath(), 'preload.js');
}

const POPUP_HTML_CONTENT = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    :root {
      /* Apple macOS Sonoma Translucent Glass Palette */
      --glass-surface: rgba(22, 24, 34, 0.45);
      --glass-border: rgba(255, 255, 255, 0.16);
      --glass-bevel: inset 0 1px 1px 0 rgba(255, 255, 255, 0.28);
      --item-surface: rgba(255, 255, 255, 0.05);
      --item-border: rgba(255, 255, 255, 0.08);
      --item-hover: rgba(255, 255, 255, 0.11);
      --item-hover-border: rgba(255, 255, 255, 0.18);
      --text-primary: #ffffff;
      --text-secondary: rgba(235, 235, 245, 0.65);
      --accent: #0a84ff;
      --accent-glow: rgba(10, 132, 255, 0.45);
      --success: #30d158;
      --warning: #ffd60a;
      --danger: #ff453a;
    }

    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
      user-select: none; 
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
        border-radius: 14px;
    }
    
    html, body {
      background: transparent !important;
      width: 100%;
      height: 100%;
      overflow: hidden;
        border-radius: 14px;
    }

    .card {
      background: var(--glass-surface);
      backdrop-filter: blur(45px) saturate(210%);
      -webkit-backdrop-filter: blur(45px) saturate(210%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-bevel), 0 20px 48px rgba(0, 0, 0, 0.55);
      border-radius: 14px;
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
      animation: macOpen 0.16s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes macOpen {
      from { opacity: 0; transform: scale(0.985); }
      to { opacity: 1; transform: scale(1); }
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.09);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.01) 100%);
      flex-shrink: 0;
        border-radius: 14px;
    }

    .title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .clear-btn {
      background: none;
      border: none;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 3px 8px;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .clear-btn:hover { 
      color: #ffffff; 
      background: rgba(255, 255, 255, 0.12); 
    }

    .list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .list::-webkit-scrollbar { width: 5px; }
    .list::-webkit-scrollbar-thumb { 
      background: rgba(255, 255, 255, 0.22); 
      border-radius: 10px; 
    }
    .list::-webkit-scrollbar-thumb:hover { 
      background: rgba(255, 255, 255, 0.35); 
    }

    .empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 42px 16px;
      color: var(--text-secondary);
      font-size: 12.5px;
      gap: 10px;
        border-radius: 14px;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--item-surface);
      border: 1px solid var(--item-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      transition: all 0.15s ease;
    }
    .item:hover {
      background: var(--item-hover);
      border-color: var(--item-hover-border);
      transform: translateY(-0.5px);
    }

    .icon-box {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .info { flex: 1; min-width: 0; }
    
    .filename {
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
      letter-spacing: -0.01em;
    }
    .filename:hover { text-decoration: underline; }

    .status {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status.done { color: var(--success); font-weight: 500; }
    .status.paused { color: var(--warning); font-weight: 500; }
    .status.failed { color: var(--danger); font-weight: 500; }

    .badge {
      font-size: 9.5px;
      font-weight: 600;
      background: rgba(10, 132, 255, 0.22);
      color: #70baff;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid rgba(10, 132, 255, 0.35);
    }

    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.14);
      border-radius: 99px;
      margin-top: 6px;
      overflow: hidden;
      position: relative;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0a84ff, #5ac8fa);
      box-shadow: 0 0 10px var(--accent-glow);
      border-radius: 99px;
      transition: width 0.15s ease-out;
    }
    .progress-fill.paused {
      background: linear-gradient(90deg, #ff9f0a, #ffd60a);
      box-shadow: 0 0 8px rgba(255, 159, 10, 0.4);
    }
    .progress-fill.indeterminate {
      width: 35% !important;
      animation: indeterminateSlide 1.3s infinite ease-in-out;
    }
    @keyframes indeterminateSlide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(380%); }
    }

    .actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    
    .action-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      padding: 6px;
      border-radius: 7px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .action-btn:hover { 
      background: rgba(255, 255, 255, 0.16); 
      color: #ffffff; 
    }
    .action-btn.danger:hover { 
      color: var(--danger); 
      background: rgba(255, 69, 58, 0.2); 
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="title">Downloads</span>
      <button class="clear-btn" data-action="clear">Clear list</button>
    </div>
    <div class="list" id="downloadsList"></div>
  </div>

  <script>
    function getApi() { return window.browserAPI; }

    function formatBytes(bytes) {
      if (!bytes || bytes <= 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }

    function render(items) {
      const list = document.getElementById('downloadsList');
      if (!items || items.length === 0) {
        list.innerHTML = '<div class="empty"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M19 12l-7 7-7-7"/></svg><span>No recent downloads</span></div>';
        return;
      }

      list.innerHTML = items.map(item => {
        const isProgressing = item.state === 'progressing';
        const isPaused = item.state === 'paused';
        const isCompleted = item.state === 'completed';
        const isFailed = item.state === 'cancelled' || item.state === 'interrupted';
        const isDeleted = isCompleted && item.fileMissing;

        let statusText = '';
        let showBar = isProgressing || isPaused;
        let percent = Math.round((item.progress || 0) * 100);
        let isIndeterminate = showBar && (!item.totalBytes || item.totalBytes <= 0);

        if (isCompleted && !isDeleted) {
          statusText = '<span class="status done">✓ Complete • ' + formatBytes(item.totalBytes) + '</span>';
        } else if (isDeleted) {
          statusText = '<span class="status failed">File removed from disk</span>';
        } else if (isProgressing) {
          if (isIndeterminate) {
            statusText = '<span class="status">' + formatBytes(item.receivedBytes) + ' • ' + (item.speed || 'Downloading...') + '</span>';
          } else {
            statusText = '<span class="status"><span class="badge">' + percent + '%</span> ' + formatBytes(item.receivedBytes) + ' of ' + formatBytes(item.totalBytes) + ' • ' + (item.speed || '0 KB/s') + '</span>';
          }
        } else if (isPaused) {
          statusText = '<span class="status paused">Paused • ' + formatBytes(item.receivedBytes) + (item.totalBytes > 0 ? ' of ' + formatBytes(item.totalBytes) : '') + '</span>';
        } else if (isFailed) {
          statusText = '<span class="status failed">Cancelled</span>';
        }

        const iconColor = isCompleted ? '#30d158' : isPaused ? '#ffd60a' : '#0a84ff';

        return '<div class="item" draggable="' + (isCompleted && !isDeleted) + '" data-id="' + item.id + '">' +
          '<div class="icon-box">' +
            '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="' + iconColor + '" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>' +
          '</div>' +
          '<div class="info">' +
            '<div class="filename" data-action="open" data-id="' + item.id + '" title="' + item.filename + '">' + item.filename + '</div>' +
            statusText +
            (showBar ? '<div class="progress-track"><div class="progress-fill ' + (isPaused ? 'paused ' : '') + (isIndeterminate ? 'indeterminate' : '') + '" style="width:' + (isIndeterminate ? '35' : Math.max(3, percent)) + '%"></div></div>' : '') +
          '</div>' +
          '<div class="actions">' +
            (isProgressing ? '<button class="action-btn" title="Pause" data-action="pause" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>' : '') +
            (isPaused ? '<button class="action-btn" title="Resume" data-action="resume" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg></button>' : '') +
            (showBar ? '<button class="action-btn danger" title="Cancel" data-action="cancel" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' : '') +
            (isCompleted && !isDeleted ? '<button class="action-btn" title="Open Folder" data-action="folder" data-id="' + item.id + '"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></button>' : '') +
            '<button class="action-btn danger" title="Remove" data-action="remove" data-id="' + item.id + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      e.stopPropagation();

      const action = target.dataset.action;
      const id = target.dataset.id;
      const api = getApi();
      if (!api) return;

      if (action === 'pause') api.pauseDownload(id);
      else if (action === 'resume') api.resumeDownload(id);
      else if (action === 'cancel') api.cancelDownload(id);
      else if (action === 'open') api.openDownload(id);
      else if (action === 'folder') api.showDownloadInFolder(id);
      else if (action === 'remove') api.removeDownload(id);
      else if (action === 'clear') api.clearDownloads();
    });

    document.addEventListener('dragstart', (e) => {
      const itemEl = e.target.closest('.item[draggable="true"]');
      if (itemEl && itemEl.dataset.id) {
        e.preventDefault();
        getApi()?.startDrag?.(itemEl.dataset.id);
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') getApi()?.closeDownloadsPopup?.();
    });

    getApi()?.getDownloads?.().then(render);
    getApi()?.onDownloadsUpdated?.((items) => render(items));
  </script>
</body>
</html>`;

class DownloadManager {
  constructor() {
    this.downloads = new Map();
    this.mainWindow = null;
    this.popupWindow = null;
    this.hookedSessions = new WeakSet();
    this.popupFilePath = null;

    this.initPopupFile();
    this.registerIpc();
    this.initDefaultSessions();
  }

  initPopupFile() {
    try {
      this.popupFilePath = path.join(app.getPath('userData'), 'downloads-popup.html');
      fs.writeFileSync(this.popupFilePath, POPUP_HTML_CONTENT, 'utf8');
    } catch (e) {
      console.warn('initPopupFile:', e.message);
    }
  }

  setMainWindow(win) {
    this.mainWindow = win;
    this.ensurePopupWindow();
  }

  initDefaultSessions() {
    app.whenReady().then(() => {
      if (session.defaultSession) {
        this.setupSession(session.defaultSession);
      }
      app.on('session-created', (newSession) => {
        this.setupSession(newSession);
      });
    });
  }

  getCalculatedHeight() {
    const count = this.downloads.size;
    if (count === 0) return 175; // Increased roomy empty state
    // Header (~48px) + padding (~18px) + each item (~70px) + gap
    const needed = 48 + 18 + (count * 74);
    return Math.min(520, Math.max(175, needed));
  }

  updatePopupHeight() {
    if (!this.popupWindow || this.popupWindow.isDestroyed()) return;

    if (this.popupWindow.isVisible()) {
      this.popupWindow.webContents.executeJavaScript(
        'document.querySelector(".card") ? document.querySelector(".card").scrollHeight : 0'
      ).then(h => {
        if (!h || this.popupWindow.isDestroyed()) return;
        const target = Math.min(520, Math.max(175, h));
        const [w, curH] = this.popupWindow.getSize();
        if (Math.abs(curH - target) > 2) {
          this.popupWindow.setSize(w, target, false);
        }
      }).catch(() => {});
    } else {
      const target = this.getCalculatedHeight();
      const [w] = this.popupWindow.getSize();
      this.popupWindow.setSize(w, target, false);
    }
  }

  ensurePopupWindow() {
    if (this.popupWindow && !this.popupWindow.isDestroyed()) return;
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const isMac = process.platform === 'darwin';
    const isWin = process.platform === 'win32';

    this.popupWindow = new BrowserWindow({
      width: 380,
      height: this.getCalculatedHeight(),
      parent: this.mainWindow,
      frame: false,
      transparent: true,
      hasShadow: isMac,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      backgroundColor: '#00000000',
      vibrancy: isMac ? 'popover' : undefined,
      visualEffectState: 'active',
      backgroundMaterial: isWin ? 'acrylic' : undefined,
      webPreferences: {
        preload: resolvePreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    if (this.popupFilePath && fs.existsSync(this.popupFilePath)) {
      this.popupWindow.loadFile(this.popupFilePath);
    }

    this.popupWindow.on('blur', () => {
      this.closePopup();
    });
  }

  closePopup() {
    if (this.popupWindow && !this.popupWindow.isDestroyed() && this.popupWindow.isVisible()) {
      this.popupWindow.hide();
    }
  }

  showPopup(anchorBounds) {
    this.ensurePopupWindow();
    if (!this.popupWindow || this.popupWindow.isDestroyed()) return;

    if (this.popupWindow.isVisible()) {
      this.popupWindow.hide();
      return;
    }

    const popupWidth = 380;
    const initialHeight = this.getCalculatedHeight();
    this.popupWindow.setSize(popupWidth, initialHeight, false);

    const [winX, winY] = this.mainWindow.getPosition();
    const x = Math.round(winX + (anchorBounds?.x || 0) + (anchorBounds?.width || 0) - popupWidth);
    const y = Math.round(winY + (anchorBounds?.y || 0) + (anchorBounds?.height || 0) + 4);

    this.popupWindow.setPosition(x, y, false);
    this.popupWindow.show();
    this.popupWindow.focus();

    this.broadcast();
    setTimeout(() => this.updatePopupHeight(), 40);
  }

  syncDiskPresence() {
    for (const [, entry] of this.downloads) {
      if (entry.info.state === 'completed') {
        const exists = Boolean(entry.info.savePath && fs.existsSync(entry.info.savePath));
        entry.info.fileMissing = !exists;
      }
    }
  }

  setupSession(browserSession) {
    if (!browserSession || this.hookedSessions.has(browserSession)) return;
    this.hookedSessions.add(browserSession);

    browserSession.on('will-download', (_event, item) => {
      const id = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const rawFilename = item.getFilename() || '';
      const mime = item.getMimeType() || '';
      const url = item.getURL() || '';

      const ext = getValidExtension(rawFilename, mime, url);
      let baseName = sanitizeFilename(path.basename(rawFilename, path.extname(rawFilename || '')));
      if (!baseName || baseName === '_') baseName = `video_${Date.now()}`;
      let finalFilename = `${baseName}${ext}`;

      const downloadsDir = app.getPath('downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }

      let finalPath = path.join(downloadsDir, finalFilename);
      let counter = 1;

      while (fs.existsSync(finalPath)) {
        finalPath = path.join(downloadsDir, `${baseName} (${counter})${ext}`);
        counter++;
      }

      item.setSavePath(finalPath);

      const totalBytes = item.getTotalBytes() || 0;
      const startTime = Date.now();
      let lastBytes = 0;
      let lastTime = startTime;
      let speed = '0 KB/s';

      const downloadInfo = {
        id,
        filename: path.basename(finalPath),
        totalBytes,
        receivedBytes: 0,
        progress: 0,
        speed: '0 KB/s',
        state: 'progressing',
        savePath: finalPath,
        fileMissing: false,
        startTime,
      };

      this.downloads.set(id, { item, info: downloadInfo });
      this.broadcast();
      this.updatePopupHeight();

      let lastUpdate = 0;

      item.on('updated', (_evt, state) => {
        const now = Date.now();
        const received = item.getReceivedBytes();

        if (now - lastTime >= 400) {
          const bytesDiff = received - lastBytes;
          const timeDiff = (now - lastTime) / 1000;
          const bytesPerSec = timeDiff > 0 ? bytesDiff / timeDiff : 0;

          if (bytesPerSec > 1024 * 1024) {
            speed = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
          } else {
            speed = `${Math.round(bytesPerSec / 1024)} KB/s`;
          }

          lastBytes = received;
          lastTime = now;
        }

        downloadInfo.receivedBytes = received;
        const total = item.getTotalBytes();
        if (total && total > 0) downloadInfo.totalBytes = total;

        downloadInfo.progress = downloadInfo.totalBytes > 0 
          ? downloadInfo.receivedBytes / downloadInfo.totalBytes 
          : 0;
        downloadInfo.speed = speed;
        downloadInfo.state = state === 'paused' ? 'paused' : 'progressing';

        const updatedPath = item.getSavePath();
        if (updatedPath) downloadInfo.savePath = updatedPath;

        if (now - lastUpdate > 80) {
          lastUpdate = now;
          this.broadcast();
        }
      });

      item.once('done', (_evt, state) => {
        downloadInfo.state = state === 'completed' ? 'completed' : state === 'cancelled' ? 'cancelled' : 'interrupted';
        downloadInfo.progress = state === 'completed' ? 1 : downloadInfo.progress;
        
        const finalResolvedPath = item.getSavePath() || finalPath;
        downloadInfo.savePath = finalResolvedPath;

        if (state === 'completed' && fs.existsSync(finalResolvedPath)) {
          try {
            const stats = fs.statSync(finalResolvedPath);
            downloadInfo.totalBytes = stats.size;
            downloadInfo.receivedBytes = stats.size;
            downloadInfo.fileMissing = false;
          } catch (e) {}
        }

        this.broadcast();
      });
    });
  }

  broadcast() {
    this.syncDiskPresence();
    const items = Array.from(this.downloads.values()).map(d => ({ ...d.info }));

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('downloads:updated', items);
    }
    if (this.popupWindow && !this.popupWindow.isDestroyed() && this.popupWindow.isVisible()) {
      this.popupWindow.webContents.send('downloads:updated', items);
      setTimeout(() => this.updatePopupHeight(), 30);
    }
  }

  registerIpc() {
    ipcMain.handle('downloads:toggle-popup', (_e, bounds) => {
      this.showPopup(bounds);
      return true;
    });

    ipcMain.handle('downloads:close-popup', () => {
      this.closePopup();
      return true;
    });

    ipcMain.handle('downloads:get-all', () => {
      this.syncDiskPresence();
      return Array.from(this.downloads.values()).map(d => ({ ...d.info }));
    });

    ipcMain.handle('downloads:pause', (_e, id) => {
      const entry = this.downloads.get(id);
      if (entry?.item) {
        try {
          if (!entry.item.isPaused()) entry.item.pause();
        } catch (e) {}
        entry.info.state = 'paused';
        this.broadcast();
      }
      return true;
    });

    ipcMain.handle('downloads:resume', (_e, id) => {
      const entry = this.downloads.get(id);
      if (entry?.item) {
        try {
          if (entry.item.canResume()) entry.item.resume();
        } catch (e) {}
        entry.info.state = 'progressing';
        this.broadcast();
      }
      return true;
    });

    ipcMain.handle('downloads:cancel', (_e, id) => {
      const entry = this.downloads.get(id);
      if (entry?.item) {
        try { entry.item.cancel(); } catch (e) {}
        entry.info.state = 'cancelled';
        this.broadcast();
      }
      return true;
    });

    ipcMain.handle('downloads:open-file', async (_e, id) => {
      const entry = this.downloads.get(id);
      if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
        const error = await shell.openPath(entry.info.savePath);
        if (error) {
          shell.openExternal(`file://${entry.info.savePath}`);
        }
        return true;
      } else if (entry) {
        entry.info.fileMissing = true;
        this.broadcast();
      }
      return false;
    });

    ipcMain.handle('downloads:show-in-folder', (_e, id) => {
      const entry = this.downloads.get(id);
      if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
        shell.showItemInFolder(entry.info.savePath);
      } else if (entry) {
        entry.info.fileMissing = true;
        this.broadcast();
      }
      return true;
    });

    ipcMain.on('downloads:start-drag', (event, id) => {
      const entry = this.downloads.get(id);
      if (entry?.info?.savePath && fs.existsSync(entry.info.savePath)) {
        event.sender.startDrag({
          file: path.normalize(entry.info.savePath),
          icon: DRAG_ICON,
        });
      }
    });

    ipcMain.handle('downloads:remove', (_e, id) => {
      this.downloads.delete(id);
      this.broadcast();
      this.updatePopupHeight();
      return true;
    });

    ipcMain.handle('downloads:clear', () => {
      for (const [id, entry] of this.downloads) {
        if (['completed', 'cancelled', 'interrupted'].includes(entry.info.state)) {
          this.downloads.delete(id);
        }
      }
      this.broadcast();
      this.updatePopupHeight();
      return true;
    });
  }
}

module.exports = new DownloadManager();