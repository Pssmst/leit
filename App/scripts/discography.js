import { state }			from './state/state.js';
import { layout }			from './state/layout/layout.js';
import * as textures		from './ui/textures.js';
import * as colorHandle		from './ui/colorHandling.js';
import * as motifRegistry	from './motif.js';
import * as cnv				from './canvas/canvas.js';
import * as aud				from './audio/audio.js';
import * as HTML			from './ui/elements.js';

export class Song {
	constructor(fileName, data = {}) {
		// Included in .leit file metadata
		this.name = data.name || fileName;
		this.alternateNames = data.alternateNames || [];
		this.date = data.date || "";
		this.daw = data.daw || "";
		this.shortDescription = data.shortDescription || "";
		this.longDescription = data.longDescription || "";
		this.duration = null;
		this.structure = data.structure || [];
		this.motifs = data.motifs || [];
		this.colors = null;
	//	this.internalAudio (ignore)
	//	this.internalCover (ignore)

		// NOT included in .leit file metadata
		this.path = data.path || null; // Path to .leit
		this.cover = data.cover || null;
		this.parentAlbumFileName = null;
		this.id = { disc: null, album: null, parentDisc: null, parentAlbum: null };
		this.x = null;
		this.y = null;
	}

	update() {
		// If we have a .leit path, we derive the cover from it automatically
		if (this.path && this.path.endsWith('.leit')) {
			// If the song has a cover inside, the protocol handles "?type=cover"
			if (!this.cover || this.cover.includes('unknown.png')) {
				this.cover = `${this.path}?type=cover`;
			}
		}
		// Legacy fallback
		else if (!this.path) {
			this.path = `../App/assets/Music/${this.parentAlbumFileName}/${this.fileName}.wav`;
			this.cover = null;
		}
	}
	async constructColors(count) {
		this.colors = await colorHandle.getColorsFromImage(textures.get(this.cover).src, {
			maxSize: 512,
			quantizeBits: 8,
			count: count,
		});
		colorHandle.constructInfoGradient(this);
	}
}

export class Disc {
	/**
	 * @param {String} cover - Path of cover file; a SONG cover can overwrite a DISC cover
	 * @param {Array} songs - Each song is an object, too
	 */
	constructor(cover, songs) {
		this.cover = cover;
		this.songs = songs;
		this.album = null;
		this.id = null;
	}

	update(album) {
		this.parentAlbumFileName = album.fileName;

		// Iterate songs
		let i = 1;
		for (const song of this.songs) {
			song.parentAlbumFileName = this.parentAlbumFileName;
			song.id.parentDisc = this.id;
			song.id.disc = i;

			// Cover transfer
			if (song.cover === null) {
				song.cover = this.cover;
			}
			i++;
		}
	}
}

export class Album {
	/**
	 * @param {String} fileName - File name of album
	 * @param {String} cover - Path of cover file; a DISK cover can overwrite an ALBUM cover
	 * @param {2D Array} discs - Elements of discs each contain arrays of songs
	 */
	constructor(fileName, cover, discs) {
		this.fileName = fileName;
		this.cover = cover || './assets/textures/covers/unknown.png';
		this.discs = discs;
		this.id = null;
	}

	update() {
		// Iterate discs
		let i = 1;
		for (const disc of this.discs) {
			disc.parentAlbumFileName = this.fileName;
			disc.id = i;

			// Cover transfer
			if (disc.cover === null) {
				disc.cover = this.cover;
			}
			i++;
		}
	}
}

/////  GET  /////////////////////////////////////////////////////////////////////////

// Gets the parent album OBJECT of a song
export function getAlbum(albumName) {
	for (const album of albums) {
		if (album.fileName === albumName) return album;
	}
	return null;
}

// Gets the parent disc OBJECT of a song
export function getDisc(albumName, id) {
	const album = getAlbum(albumName);
	if (!album) return null;
	// Cast id to Number to ensure it matches the integer assigned in update()
	return album.discs.find(disc => disc.id == id) || null;
}


/////  CONSTRUCTING THE DISCOGRAPHY  /////////////////////////////////////////////////////////////////////////

export const albums = [];
export const songsDict = {};
export let motifs;

export async function constructDiscographyFromJSON(jsonPath) {
	try {
		const response = await fetch(jsonPath);
		if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
		const jsonData = await response.json();

		// Clear existing data before rebuilding
		albums.length = 0;
		for (let key in songsDict) delete songsDict[key];

		// Process albums asynchronously
		for (const albumData of jsonData.discography) {
			let discs = [];
			for (const discData of albumData.discs) {
				let songs = [];
				for (const leitFilePath of discData.songs) {
					if (!leitFilePath) continue;

					try {
						// Encode the path to prevent the space/apostrophe crash!
						const encodedPath = leitFilePath.split('://').map((p, i) => 
							i === 0 ? p : encodeURI(p)
						).join('://');

						// Fetch the metadata from inside the .leit file
						const metaResponse = await fetch(`${encodedPath}?type=metadata`);
						if (!metaResponse.ok) throw new Error(`Failed to fetch metadata for ${leitFilePath}`);
						
						// Create song
						const metadata = await metaResponse.json();
						metadata.path = leitFilePath;
						const fileName = leitFilePath.split('/').pop().replace('.leit', '');
						songs.push(new Song(fileName, metadata));
					}
					catch (metaErr) {
						console.error(`Skipping ${leitFilePath} due to error:`, metaErr);
					}
				}
				if (discData) discs.push(new Disc(discData.cover, songs));
			}
			if (albumData) albums.push(new Album(albumData.fileName, albumData.cover, discs));
		}
		
		// Update all
		let albumID = 1;
		for (const album of albums) {
			album.update();
			let songID = 1;
			for (const disc of album.discs) {
				disc.update(album);
				for (const song of disc.songs) {
					song.update();
					song.id.album = songID;
					song.id.parentAlbum = albumID;
					songID++;

					// Sort and validate structure
					if (song.structure && song.structure.length > 0) {
						song.structure.sort((a,b) => a[0] - b[0]);
						for (let i = 0; i < song.structure.length; i++) {
							let currentStruct = song.structure[i][1];
							if (!currentStruct.bpm)			 currentStruct.bpm		   = (i === 0 ? null : song.structure[i-1][1].bpm);
							if (!currentStruct.timeSignature)   currentStruct.timeSignature = (i === 0 ? [null,null] : song.structure[i-1][1].timeSignature);
							if (!currentStruct.keySignature)	currentStruct.keySignature  = (i === 0 ? '' : song.structure[i-1][1].keySignature);
						}
					}
					songsDict[song.path] = song;
				}
			}
			album.numOfSongs = songID - 1;
			album.id = albumID;
			albumID++;
		}

		// Motif Registry
		motifs = motifRegistry.buildMotifsFromSongs(Object.values(songsDict));
		motifRegistry.scrambleMotifColors(motifs);
	}
	catch (err) {
		console.error('Discography Error:', err);
	}
}


export async function addSong(pathsToAdd) {
	// If user canceled the picker, pathsToAdd will be null. Just exit.
	if (!pathsToAdd) return;

	// Ensure it's an array (handles both single and multiple file imports safely)
	const pathsArray = Array.isArray(pathsToAdd) ? pathsToAdd : [pathsToAdd];
	if (pathsArray.length === 0) return;

	const currentJsonFile = `${state.edit.parentDiscographyFileName}.json`;
	const currentJsonPath = `./assets/discographies/${currentJsonFile}`;

	try {
		const response = await fetch(currentJsonPath);
		const data = await response.json();

		// Add / find album
		let targetAlbum = data.discography.find(a => a.fileName === state.edit.parentAlbumFileName);
		if (!targetAlbum) {
			targetAlbum = { fileName: state.edit.parentAlbumFileName, cover: null, discs: [] };
			data.discography.push(targetAlbum);
		}

		// Add / find disc
		if (!targetAlbum.discs[state.edit.parentDiscID - 1]) {
			targetAlbum.discs[state.edit.parentDiscID - 1] = { cover: null, songs: [] };
		}

		// Add ALL selected leitFilePaths to the songs array using the spread operator (...)
		targetAlbum.discs[state.edit.parentDiscID - 1].songs.push(...pathsArray);
		
		const saveResult = await window.electron.saveDiscography(currentJsonFile, data);
		if (saveResult.success) {
			albums.length = 0;
			Object.keys(songsDict).forEach(key => delete songsDict[key]);
			constructDiscographyFromJSON(currentJsonPath);
		}
	}
	catch (err) {
		console.error('Failed to add song:', err);
	}
}

// Resets the current JSON file to a blank state and refreshes the UI
export async function resetDiscography() {
	const currentJsonFile = `${state.edit.parentDiscographyFileName}.json` || 'discography.json';
	const currentJsonPath = `./assets/discographies/${currentJsonFile}`;

	state.dragging.pos.x = 0;
	state.dragging.pos.y = 0;

	// Confirm with the user
	const confirmed = confirm(`Are you sure you want to reset this discography?\nAll data will be removed from the current json and data folder.`);
	if (!confirmed) return;

	const empty = { discography: [] };

	// Stop current song and clear audio cache
	aud.stopCurrentSource();
	aud.audioCache.clear();

	// Close infodiv and clear its contents
	HTML.infoDiv.innerHTML = '';
	HTML.timelineLeftDiv.innerHTML = '';

	// Clear all .leit files
	try {
		const saveResult = await window.electron.saveDiscography(currentJsonFile, empty);

		if (saveResult.success) {
			albums.length = 0;
			for (let song in songsDict) { delete songsDict[song]; }

			try {
				await window.electron.clearData(state.edit.parentDiscographyFileName);
			}
			catch (dataErr) {
				console.error('Failed to clear data:', dataErr);
			}
			// Overwrite discography
			constructDiscographyFromJSON(currentJsonPath);
		}
	}
	catch (err) {
		console.error("Failed to reset discography:", err);
	}
}