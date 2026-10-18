// // src/main/windowManager.js
// const { BrowserWindow, Menu, app } = require('electron');
// const path = require('path');
// const fs = require('fs');
// const { WINDOW_DEFAULTS, DEV_SERVER_URL } = require('./config');
// const tabManager = require('./tabManager');

// let mainWindow = null;

// function resolvePreloadPath() {
//   const candidates = [
//     path.join(__dirname, '../preload.js'),
//     path.join(__dirname, 'preload.js'),
//     path.join(app.getAppPath(), 'preload.js'),
//     path.join(process.cwd(), 'preload.js'),
//   ];

//   for (const candidate of candidates) {
//     if (fs.existsSync(candidate)) return candidate;
//   }
//   return path.join(app.getAppPath(), 'preload.js');
// }

// function createMainWindow() {
//   Menu.setApplicationMenu(null);

//   mainWindow = new BrowserWindow({
//     ...WINDOW_DEFAULTS,
//     frame: false,
//     transparent: false,          // force off, even if WINDOW_DEFAULTS sets it
//     backgroundColor: '#121216',  // match your UI's background color
//     show: false,                 // show only after first paint
//     webPreferences: {
//       preload: resolvePreloadPath(),
//       contextIsolation: true,
//       nodeIntegration: false,
//       sandbox: true,
//     },
//   });

//   mainWindow.once('ready-to-show', () => mainWindow?.show());

//   tabManager.setMainWindow(mainWindow);

//   if (app.isPackaged) {
//     mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'index.html')); // adjust to your build output
//   } else {
//     mainWindow.loadURL(DEV_SERVER_URL);
//   }

//   mainWindow.on('maximize', () => mainWindow?.webContents?.send('window:isMaximized', true));
//   mainWindow.on('unmaximize', () => mainWindow?.webContents?.send('window:isMaximized', false));

//   mainWindow.on('closed', () => {
//     tabManager.clear();
//     tabManager.setMainWindow(null);
//     mainWindow = null;
//   });

//   return mainWindow;
// }

// function getMainWindow() {
//   return mainWindow;
// }

// module.exports = { createMainWindow, getMainWindow };



// src/main/windowManager.js
const { BrowserWindow, Menu, app } = require('electron');
const path = require('path');
const fs = require('fs');
const { WINDOW_DEFAULTS, DEV_SERVER_URL } = require('./config');
const tabManager = require('./tabManager');

let mainWindow = null;

function resolvePreloadPath() {
  const candidates = [
    path.join(__dirname, '../preload.js'),
    path.join(__dirname, 'preload.js'),
    path.join(app.getAppPath(), 'preload.js'),
    path.join(process.cwd(), 'preload.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(app.getAppPath(), 'preload.js');
}

function createMainWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    ...WINDOW_DEFAULTS,
    frame: false,
    transparent: false,          // force off, even if WINDOW_DEFAULTS sets it
    backgroundColor: '#121216',  // match your UI's background color
    show: false,                 // show only after first paint
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  tabManager.setMainWindow(mainWindow);

  if (app.isPackaged) {
    // Points to the exported Next.js HTML build
    mainWindow.loadFile(path.join(app.getAppPath(), 'frontend', 'out', 'index.html'));
  } else {
    mainWindow.loadURL(DEV_SERVER_URL);
  }

  mainWindow.on('maximize', () => mainWindow?.webContents?.send('window:isMaximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents?.send('window:isMaximized', false));

  mainWindow.on('closed', () => {
    tabManager.clear();
    tabManager.setMainWindow(null);
    mainWindow = null;
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

module.exports = { createMainWindow, getMainWindow };