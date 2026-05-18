const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
	pickFile: (discographyName) => ipcRenderer.invoke('pickFile', discographyName),
	saveDiscography: (fileName, data) => ipcRenderer.invoke('saveDiscography', fileName, data),
	clearData: (discographyName) => ipcRenderer.invoke('clearData', discographyName),
	onImportProgress: (callback) => ipcRenderer.on('onImportProgress', (event, data) => callback(data)),
	updateSongMetadata: (mediaUrl, updatedFields) => ipcRenderer.invoke('updateSongMetadata', mediaUrl, updatedFields),
	pickCoverImage: () => ipcRenderer.invoke('pickCoverImage'),
	updateSongCover: (leitPath, imagePath) => ipcRenderer.invoke('updateSongCover', leitPath, imagePath),
});