// src/main/contextMenu.js
const { Menu, clipboard } = require('electron');

function buildContextMenu(webContents, params, options = {}) {
  const { onOpenLinkInNewTab } = options;
  const template = [];

  // 1. Media (Video / Audio)
  if (params.mediaType === 'video' || params.mediaType === 'audio') {
    if (params.mediaType === 'video') {
      template.push({
        label: 'Picture in Picture',
        click: () => {
          webContents.executeJavaScript(`
            (() => {
              const video = document.elementFromPoint(${params.x}, ${params.y}) || document.querySelector('video');
              if (video && video instanceof HTMLVideoElement) {
                if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
                else video.requestPictureInPicture().catch(() => {});
              }
            })()
          `, true).catch(() => {});
        },
      });
    }

    if (params.srcURL) {
      template.push({
        label: 'Save Media As...',
        click: () => webContents.downloadURL(params.srcURL),
      });
      template.push({
        label: 'Copy Media Address',
        click: () => clipboard.writeText(params.srcURL),
      });
    }
    template.push({ type: 'separator' });
  }

  // 2. Links
  if (params.linkURL) {
    template.push(
      {
        label: 'Open Link in New Tab',
        click: () => onOpenLinkInNewTab && onOpenLinkInNewTab(params.linkURL),
      },
      {
        label: 'Save Link As...',
        click: () => webContents.downloadURL(params.linkURL),
      },
      {
        label: 'Copy Link Address',
        click: () => clipboard.writeText(params.linkURL),
      },
      { type: 'separator' }
    );
  }

  // 3. Images (Save Image As, Copy Image, Copy Address)
  if (params.hasImageContents && params.srcURL) {
    template.push(
      {
        label: 'Save Image As...',
        click: () => {
          // Triggers Electron's download pipeline -> downloadManager -> Safari ring animation
          webContents.downloadURL(params.srcURL);
        },
      },
      {
        label: 'Copy Image',
        click: () => {
          // Copies raw image bitmap to system clipboard (pasteable into chats, editors, etc.)
          webContents.copyImageAt(params.x, params.y);
        },
      },
      {
        label: 'Copy Image Address',
        click: () => clipboard.writeText(params.srcURL),
      },
      {
        label: 'Open Image in New Tab',
        click: () => onOpenLinkInNewTab && onOpenLinkInNewTab(params.srcURL),
      },
      { type: 'separator' }
    );
  }

  // 4. Text Selection
  if (params.selectionText) {
    const rawSnippet = params.selectionText.trim();
    const cleanLabel = rawSnippet.length > 25 ? `${rawSnippet.slice(0, 25)}...` : rawSnippet;

    template.push(
      { label: 'Copy', role: 'copy' },
      {
        label: `Search for "${cleanLabel}"`,
        click: () => {
          if (onOpenLinkInNewTab) {
            onOpenLinkInNewTab(`https://duckduckgo.com/?q=${encodeURIComponent(rawSnippet)}`);
          }
        },
      },
      { type: 'separator' }
    );
  }

  // 5. Input Context
  if (params.isEditable) {
    template.push(
      { label: 'Undo', role: 'undo' },
      { label: 'Redo', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { type: 'separator' }
    );
  }

  // 6. Navigation
  if (!params.linkURL && !params.isEditable && params.mediaType !== 'video' && !params.hasImageContents) {
    if (webContents.navigationHistory.canGoBack()) {
      template.push({ label: 'Back', click: () => webContents.navigationHistory.goBack() });
    }
    if (webContents.navigationHistory.canGoForward()) {
      template.push({ label: 'Forward', click: () => webContents.navigationHistory.goForward() });
    }
    template.push({ label: 'Reload', click: () => webContents.reload() });
    template.push({ type: 'separator' });
  }

  // 7. Developer Tools
  template.push({
    label: 'Inspect Element',
    click: () => {
      webContents.inspectElement(params.x, params.y);
      if (!webContents.isDevToolsOpened()) {
        webContents.openDevTools({ mode: 'detach' });
      }
    },
  });

  const menu = Menu.buildFromTemplate(template);
  menu.popup();
}

module.exports = { buildContextMenu };