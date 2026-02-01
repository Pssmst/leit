const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            contextIsolation: true
            // preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile(path.join(__dirname, 'App', 'index.html'));
}

app.whenReady().then(() => {
    createWindow();

    globalShortcut.register('F12', () => {
        if (win) {
            win.webContents.toggleDevTools();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
