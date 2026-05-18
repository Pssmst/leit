const { app, Menu, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const LeitManager = require('./LeitManager');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

let win;

function createWindow() {
	win = new BrowserWindow({
		width: 1280,
		height: 720,
		minWidth: 250,
		minHeight: 190,
		icon: path.join(__dirname, 'App', 'assets', 'textures', 'icon.png'),
		webPreferences: {
			contextIsolation: true,
			preload: path.join(__dirname, 'preload.js')
		}
	});

	win.loadFile(path.join(__dirname, 'App', 'index.html'));

	// Handle F5 and F12 without a menu
	win.webContents.on('before-input-event', (event, input) => {
		if (input.type === 'keyDown') {
			if (input.key === 'F5') {
				win.webContents.reload();
				event.preventDefault();
			} else if (input.key === 'F12') {
				win.webContents.toggleDevTools();
				event.preventDefault();
			}
		}
	});

	// Custom dev theme
	win.webContents.on('devtools-opened', () => { const css = ` :root { --source-code-font-family: consolas !important; --source-code-font-size: 12px; --monospace-font-family: consolas !important; --monospace-font-size: 12px; --default-font-family: system-ui, sans-serif; --default-font-size: 12px; } .theme-with-dark-background { --sys-color-base: var(--ref-palette-secondary25); } body { --default-font-family: system-ui,sans-serif; } `; win.webContents.devToolsWebContents.executeJavaScript(` const overriddenStyle = document.createElement('style'); overriddenStyle.innerHTML = '${css.replaceAll('\n', ' ')}'; document.body.append(overriddenStyle); document.querySelectorAll('.platform-windows').forEach(el => el.classList.remove('platform-windows')); addStyleToAutoComplete(); const observer = new MutationObserver((mutationList, observer) => { for (const mutation of mutationList) { if (mutation.type === 'childList') { for (let i = 0; i < mutation.addedNodes.length; i++) { const item = mutation.addedNodes[i]; if (item.classList.contains('editor-tooltip-host')) { addStyleToAutoComplete(); } } } } }); observer.observe(document.body, {childList: true}); function addStyleToAutoComplete() { document.querySelectorAll('.editor-tooltip-host').forEach(element => { if (element.shadowRoot.querySelectorAll('[data-key="overridden-dev-tools-font"]').length === 0) { const overriddenStyle = document.createElement('style'); overriddenStyle.setAttribute('data-key', 'overridden-dev-tools-font'); overriddenStyle.innerHTML = '.cm-tooltip-autocomplete ul[role=listbox] {font-family: consolas !important;}'; element.shadowRoot.append(overriddenStyle); } }); } `); });
}

// Register the scheme before the app is ready
protocol.registerSchemesAsPrivileged([
	{ 
		scheme: 'media', 
		privileges: { 
			standard: true,			// Treat it like http/https
			secure: true,			// Allow it to work with secure APIs
			supportFetchAPI: true,	// Enables the use of fetch()
			bypassCSP: true,		// Allows it to bypass Content Security Policy
			stream: true			// Vfital for audio/video streaming
		} 
	}
]);

app.whenReady().then(() => {
	protocol.handle('media', async (request) => {
		try {
			// Correctly decode the path (handles spaces/apostrophes)
			const requestUrl = new URL(request.url);
			const decodedPath = decodeURIComponent(requestUrl.pathname).replace(/^\//, '');
			
			// Build the absolute path to the .leit file
			const leitFilePath = path.join(__dirname, 'App', 'assets', 'data', decodedPath);

			// If the file doesn't exist, don't try to open it
			if (!fs.existsSync(leitFilePath)) {
				console.error(`[Protocol] File not found: ${leitFilePath}`);
				return new Response("Not Found", { status: 404 });
			}

			// Open the .leit file as a ZIP
			const zip = new AdmZip(leitFilePath);
			
			// Determine if we want the 'cover' or 'audio' based on query params
			const type = requestUrl.searchParams.get('type') || 'audio';
			
			// Find the correct internal file based on 'type'
			const targetEntry = zip.getEntries().find(entry => {
				if (type === 'cover') return entry.entryName.startsWith('cover');
				if (type === 'metadata') return entry.entryName === 'metadata.json';
				return entry.entryName.startsWith('audio');
			});

			if (!targetEntry) {
				return new Response("Internal file missing in bundle", { status: 404 });
			}

			const buffer = targetEntry.getData();
			
			// Map correct MIME types
			let mimeType = 'audio/mpeg';
			if (type === 'cover') mimeType = 'image/jpeg';
			if (type === 'metadata') mimeType = 'application/json';

			return new Response(buffer, {
				status: 200,
				headers: {
					'Content-Type': mimeType,
					'Content-Length': buffer.length.toString(),
					'Access-Control-Allow-Origin': '*' // Crucial for fetch
				}
			});

		} catch (err) {
			console.error("CRITICAL PROTOCOL ERROR:", err);
			return new Response(err.message, { status: 500 });
		}
	});

	// For music file data
	ipcMain.handle('pickFile', async (event, discographyName) => {
		const result = await dialog.showOpenDialog(win, {
			properties: ['openFile', 'multiSelections'],
			filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] }]
		});

		if (result.canceled || result.filePaths.length === 0) return null;

		const totalFiles = result.filePaths.length;

		win.webContents.send('onImportProgress', { 
			current: 0, total: totalFiles, status: 'Reading track numbers...' 
		});

		// Read track numbers from metadata before sorting
		const mm = await import('music-metadata');
		const filesWithTrackNums = await Promise.all(result.filePaths.map(async (filePath) => {
			try {
				const metadata = await mm.parseFile(filePath, { duration: false });
				const track = metadata.common.track?.no ?? Infinity; // no track number → sort to end
				return { filePath, track };
			} catch {
				return { filePath, track: Infinity };
			}
		}));

		// Sort by track number ascending
		filesWithTrackNums.sort((a, b) => a.track - b.track);

		const importedPaths = [];
		for (let i = 0; i < filesWithTrackNums.length; i++) {
			const { filePath } = filesWithTrackNums[i];
			const fileName = path.basename(filePath);

			win.webContents.send('onImportProgress', { 
				current: i + 1, total: totalFiles, status: `Importing ${fileName}` 
			});

			try {
				const bundle = await LeitManager.packageNewSong(filePath, discographyName);
				importedPaths.push(`media://data/${discographyName}/${bundle.leitFileName}`);
			} catch (err) {
				console.error(`Failed to package ${fileName}:`, err);
			}
		}
		return importedPaths;
	});

	// Allows app to write to a SPECIFIC json file
	ipcMain.handle('saveDiscography', async (event, fileName, data) => {
		try {
			// Ensure the filename ends with .json
			const safeName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
			
			// Construct the full path using the filename passed from the UI
			const jsonPath = path.join(__dirname, 'App', 'assets', 'discographies', safeName);
			
			fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4), 'utf-8');
			return { success: true };
		}
		catch (err) {
			console.error("Save Error:", err);
			return { success: false, error: err.message };
		}
	});

	// Clears all data from assets for the current discography
	ipcMain.handle('clearData', async (_event, discographyName) => {
		try {
			const coversDir = path.join(__dirname, 'App', 'assets', 'data', discographyName);
			if (!fs.existsSync(coversDir)) {
				return { success: true, deleted: 0 };
			}

			const files = fs.readdirSync(coversDir);
			let deleted = 0;

			for (const file of files) {
				const fullPath = path.join(coversDir, file);
				let stat;
				try { stat = fs.statSync(fullPath); } catch (e) { continue; }
				if (stat.isDirectory()) continue;
				try { fs.unlinkSync(fullPath); deleted++; } catch (err) { console.error('[clearData] Failed to delete', fullPath, err); }
			}

			// Delete the folder itself
			try { fs.rmdirSync(coversDir); } catch (err) { console.error('[clearData] Failed to delete directory', coversDir, err); }
			return { success: true, deleted };
		}
		catch (err) {
			console.error("clearCovers Error:", err);
			return { success: false, error: err.message };
		}
	});


	ipcMain.handle('updateSongMetadata', async (event, mediaUrl, updatedFields) => {
		try {
			// Convert media://data/my_song.leit -> C:/.../App/assets/data/my_song.leit
			const relativePath = mediaUrl.replace('media://data/', '');
			const fullPath = path.join(__dirname, 'App', 'assets', 'data', decodeURIComponent(relativePath));

			if (!fs.existsSync(fullPath)) {
				throw new Error(`File not found: ${fullPath}`);
			}

			return await LeitManager.updateMetadata(fullPath, updatedFields);
		}
		catch (err) {
			return { success: false, error: err.message };
		}
	});


	ipcMain.handle('pickCoverImage', async () => {
		const result = await dialog.showOpenDialog(win, {
			properties: ['openFile'],
			filters: [{ name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
		});
		if (result.canceled || result.filePaths.length === 0) return null;
		return result.filePaths[0];
	});


	ipcMain.handle('updateSongCover', async (event, mediaUrl, imagePath) => {
		try {
			const relativePath = mediaUrl
				.replace('media://data/', '')
				.split('?')[0]; // strip any query params
			const fullPath = path.join(__dirname, 'App', 'assets', 'data', decodeURIComponent(relativePath));

			if (!fs.existsSync(fullPath)) throw new Error(`File not found: ${fullPath}`);

			return await LeitManager.updateSongCover(fullPath, imagePath);
		} catch (err) {
			return { success: false, error: err.message };
		}
	});

	createWindow();
	Menu.setApplicationMenu(null);
});