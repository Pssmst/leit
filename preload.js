const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    // expose safe APIs here later
});