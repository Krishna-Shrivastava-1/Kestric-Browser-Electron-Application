const { ipcMain } = require('electron');
const { executeSearch } = require('../searchService');

function registerSearchIpc() {
  ipcMain.handle('search:query', (_event, payload = {}) => {
    const query = typeof payload === 'string' ? payload : payload.query;
    const offset = typeof payload === 'object' ? payload.offset : 0;
    return executeSearch(query, offset);
  });
}

module.exports = { registerSearchIpc };