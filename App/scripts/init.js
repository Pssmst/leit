import { state }			from './state/state.js';
import { colors }			from './state/colors.js';
import { layout }			from './state/layout/layout.js';

import * as HTML			from './ui/elements.js';
import * as cnv				from './canvas/canvas.js';
import * as helpers			from './helpers.js';
import * as colorHandle		from './ui/colorHandling.js';
import * as motifRegistry	from './motif.js';
import * as aud				from './audio/audio.js';
import * as render			from './canvas/render.js';
import * as textures		from './ui/textures.js';
import * as discography		from './discography.js';

// Init variables to be set in the initMain function
export let songsDict = {};
export let motifs;

// Initializing width of the HTML.infoDiv's left hitbox (area around the left edge that the mouse needs to hover over to resize the HTML.infoDiv)
export const infoDivLeftHitboxWidth = 10;

// Initialize audioContext
export const audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();


export function initMain() {
	// Prepare discography data
	discography.updateEverything();
	console.log(discography.albums);

	// Construct dictionary of all songs (no nested iterations needed for simple song reference calls)
	for (const album of discography.albums) {
		for (const disc of album.discs) {
			for (const song of disc.songs) {
				songsDict[song.songPath] = song;
			}
		}
	}

	// Build all motifs and initialize colors
	motifs = motifRegistry.buildMotifsFromSongs(Object.values(songsDict));
	motifRegistry.scrambleMotifColors(motifs);

	// Initialize canvas sizes
	cnv.resizeCanvases();

	// Initialize 
	window.audioContext = audioContext;

	// Setting album states
	layout.mainCanvas.album.actualDimension = layout.mainCanvas.album.forcedDimension * layout.mainCanvas.album.scale;
	layout.mainCanvas.album.xGap = layout.mainCanvas.album.forcedDimension * .4;
	layout.mainCanvas.album.yGap = state.font.size.default * 2;
	layout.mainCanvas.album.outlineOffset = layout.mainCanvas.album.forcedDimension / 8;

	// Setting audio states
	state.audio.lastManualVolume = state.audio.volume;

	// Setting value of root variable `--value-scrollbar-width` in style.css
	const scrollbarWidth = HTML.infoDiv.offsetWidth - HTML.infoDiv.clientWidth;
	document.documentElement.style.setProperty("--value-scrollbar-width", scrollbarWidth + "px");

	// Gett values of root variables `--value-info-width` and `--value-info-padding-horizontal` from style.css
	layout.infoDiv.width = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-width').trim());
	layout.infoDiv.paddingHorizontal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-padding-horizontal').trim());
}




///  FUNCTIONS  //////////////////////////////////////////////////////////////////////////////////


// Load audio only if the time threshold allows
// This is my fix for crazy lag when rapidly hovering over multiple songs
export function loadSongWithThresholdCheck(song) {
	aud.resetClock();

	if (aud.timeSinceLastCacheUpdateAttempt === 0 || aud.timeSinceLastCacheUpdateAttempt >= aud.cacheUpdateThreshold) {
		aud.loadAudio(song.songPath);
		return true;
	}
	return false;
}

// Gets the parent album OBJECT of a song
export function getAlbum(albumName) {
	for (const album of discography.albums) {
		if (album.name === albumName) return album;
	}
	return null;
}

// Gets the parent disc OBJECT of a song
export function getDisc(albumName, id) {
	for (const disc of getAlbum(albumName).discs) {
		if (disc.id === id) return disc;
	}
	return null;
}

// Checks if cursor is within canvas bounds (in CSS pixels) but not over info/timeline
export function determineCursorInCanvas() {
	const canvasRect = cnv.canvas.getBoundingClientRect();
	const infoRect = HTML.infoDiv.getBoundingClientRect();
	const timelineRect = HTML.timelineDiv.getBoundingClientRect();

	// Is the point inside the canvas (CSS pixels)?
	state.hovering.mainCanvas = (state.pos.mainCanvas.x >= 0 && state.pos.mainCanvas.x <= canvasRect.width && state.pos.mainCanvas.y >= 0 && state.pos.mainCanvas.y <= canvasRect.height);
	if (!state.hovering.mainCanvas) return false;

	// Convert the canvas-local CSS point to page coordinates for overlap tests
	const pageX = canvasRect.left + state.pos.mainCanvas.x;
	const pageY = canvasRect.top + state.pos.mainCanvas.y;

	const in_info = (pageX >= infoRect.left && pageX <= infoRect.right && pageY >= infoRect.top && pageY <= infoRect.bottom);
	const in_timeline = (pageX >= timelineRect.left && pageX <= timelineRect.right && pageY >= timelineRect.top && pageY <= timelineRect.bottom);

	return !in_info && !in_timeline;
}

// Checks if cursor is within a song box's hitbox
export function getSongInCollidedHitbox() {
	// Iterate through dictionary values
	for (const song of Object.values(songsDict)) {
		const w = song.cover.projectedWidth;
		const h = song.cover.projectedHeight || w;
		if (state.pos.mainCanvas.x >= song.x && state.pos.mainCanvas.x <= song.x + w && state.pos.mainCanvas.y >= song.y && state.pos.mainCanvas.y <= song.y + h) {
			return song;
		}
	}
	return null;
}

// Clears right and bottom UI
export function clearUI() {
	HTML.infoDiv.innerHTML = '';
	HTML.timelineLeftDiv.innerHTML = '';
}

// Returns durations for a structure info object
export function getStructDurations(info) {
	const bpmVal = info.bpm || 120;
	const [num, den] = (info.timeSignature || [4,4]).map(n => n || 4);
	const durationOfBeat = (60 / bpmVal ) * (4 / den);

	return {
		timeSignature: {
			numerator: num,
			denominator: den,
		},
		durationOfBeat,
		durationOfMeasure: durationOfBeat * num,
	};
}

// Precompute absolute start seconds for each structure entry
export function computeStructureStartSeconds(structure) {
	if (!Array.isArray(structure) || structure.length === 0) return [];

	const startSeconds = new Array(structure.length).fill(0);
	startSeconds[0] = 0;

	for (let i = 0; i < structure.length - 1; i++) {
		const thisStruct = structure[i];
		const nextStruct = structure[i+1];
		const measureSpan = (nextStruct[0]-1) - (thisStruct[0]-1);
		// How many seconds elapse for this entry before the next entry begins
		startSeconds[i+1] = startSeconds[i] + (measureSpan * getStructDurations(thisStruct[1]).durationOfMeasure);
	}
	return startSeconds;
}


// GETS the next song "in queue," customized by each state.audio.shuffle mode
export function getNextSong(currentSong, direction) {
	if (state.loading) return;

	let nextDisc;
	let nextAlbum;
	let nextSong;

	const currentAlbum = getAlbum(currentSong.album);

	// Next consecutive song
	if (state.audio.shuffle === 0) {
		const disc = getDisc(currentSong.album, currentSong.discID);
		const directionIsForwards = direction > 0;

		// If song is NOT last in disc
		if (directionIsForwards ? (currentSong.id[1]-1 < disc.songs.length-1) : (currentSong.id[1]-1 > 0)) {
			nextSong = disc.songs[currentSong.id[1]-1 + direction];
		}
		// If song IS last in disc
		else {
			nextDisc = currentAlbum.discs[currentSong.discID-1 + (directionIsForwards ? 1 : -1)];
			if (nextDisc  === undefined) {
				let nextAlbum;
				if (directionIsForwards) {
					nextAlbum = discography.albums[currentAlbum.id];
					if (nextAlbum === undefined) {
						return;
					}
					else {
						nextSong = nextAlbum.discs[0].songs[0];
					}
				}
				else {
					nextAlbum = discography.albums[currentAlbum.id - 2];
					if (nextAlbum === undefined) {
						nextSong = currentSong;
					}
					else {
						// This code looks so dumb loll
						nextSong = nextAlbum.discs[nextAlbum.discs.length-1].songs[nextAlbum.discs[nextAlbum.discs.length-1].songs.length-1];
					}
				}
			}
			else {
				nextSong = nextDisc.songs[directionIsForwards ? 0 : nextDisc .songs.length-1];
			}
		}
	}

	// Random song in album
	else if (state.audio.shuffle === 1) {
		nextDisc = currentAlbum.discs[helpers.randInt(0, currentAlbum.discs.length-1)];
		nextSong = nextDisc.songs[helpers.randInt(0, nextDisc.songs.length-1)];
		aud.loadAudio(nextSong.songPath);
	}

	// TODO: Random song in discography
	else if (state.audio.shuffle === 2) {

	}

	return nextSong;
}

// PLAYS the next song "in queue," customized by each suffle mode
export function playNextSong(currentSong, direction) {
	if (state.loading) return;
	state.selectedSong = getNextSong(currentSong, direction, state.audio.shuffle);
	initSong(state.selectedSong);
}



// Called when user begins a song
export async function initSong(song) {
	clearUI();

	state.loading = true;
	HTML.infoDiv.classList.add('loading', 'active');
	HTML.timelineDiv.classList.add('loading', 'active');

	HTML.pauseButton.style.display = "inline-grid";
	HTML.playButton.style.display = "none";

	layout.trackCanvas.frame.motifPanel.scrollOffset = 0;

	motifRegistry.clearMotifLayout(motifs);

	try {
		const res = await aud.playMusic(song.songPath, state.audio.volume, state.audio.looping);
		// playMusic returns { startedAt, duration } or { startedAt: null, duration: null } if aborted
		const { duration, startedAt } = res || {};

		// If aborted (another playMusic started), don't build the UI
		if (!duration) return;

		// Normal success path: update song state and create the UI
		song.duration = duration;
		song.startedAt = startedAt;

		// CREATE INFO ELEMENTS DYNAMICALLY /////////////////////////////////

		// Cover
		HTML.newElement('img', 'info', { id: 'info-cover', classes: ['cover'], src: song.cover.src, display: 'block' });
		const infoCover = document.getElementById('info-cover');

		// Log the top 2 colors for this cover
		try {
			const topColors = await colorHandle.getColorsFromImage(song.cover.src, { maxSize: 200, colorBits: 4, count: 3 });
			song.colors = topColors;

			// CONSTRUCT GRADIENT
			let highlightBackgroundGradientText = `linear-gradient(145deg`;
			for (let i = 0; i < topColors.length; i++) {
				// That percentage math at the end is weird
				highlightBackgroundGradientText += `, rgb(${topColors[i].rgb}) ${i / topColors.length * topColors.length / (topColors.length-1) * 100}%`;
			}
			highlightBackgroundGradientText += ')';

			document.documentElement.style.setProperty('--color-highlight-gradient', highlightBackgroundGradientText);

		} catch (error) {
			console.warn('Could not compute top colors for', song.cover.src, error);
		}
		
		infoCover.addEventListener('click', () => {
			HTML.bigCover.src = infoCover.src;
			HTML.bigCoverWrapper.classList.add('active');
			HTML.bigCoverOverlay.classList.add('active');
		});

		// Hide on click outside
		HTML.bigCoverOverlay.addEventListener('click', () => {
			HTML.bigCoverWrapper.classList.remove('active');
			HTML.bigCoverOverlay.classList.remove('active');
		});

		// Hide when clicking the big cover itself
		HTML.bigCover.addEventListener('click', () => {
			HTML.bigCoverWrapper.classList.remove('active');
			HTML.bigCoverOverlay.classList.remove('active');
		});

		// Name and short description
		HTML.newElement('div', 'info', { id: 'info-title', classes: ['info-highlight'] });
		HTML.newElement('h2', 'info-title', { id: 'info-header', text: song.preferredName });
		if (song.shortDescription != ``) HTML.newElement('p', 'info-title', { id: 'info-shortDescription', text: song.shortDescription });


		///  DETAILS  ////////////////////////

		let detailMenu = {
			longDescription: {
				exists: song.longDescription.length > 0,
			},
			motifs: {
				exists: song.motifs.length > 0,
			},
			details: {
				exists: song.daw != null || song.date != ``,
			},
		};

		if (detailMenu.longDescription.exists || detailMenu.motifs.exists || detailMenu.details.exists) {
			HTML.newElement('div', 'info', { id: 'detail-container', classes: ['info-highlight', 'dark'] });
			HTML.newElement('div', 'detail-container', { id: 'detail-menu' });
			HTML.newElement('div', 'detail-container', { id: 'detail-contents' });
		}
		
		// Long description
		if (detailMenu.longDescription.exists) {
			HTML.newElement('button', 'detail-menu', { id: 'detail-menu-longDescription', classes: ['detail-menu-item'], text: (detailMenu.motifs.exists ? 'Desc' : 'Description') });
			HTML.newElement('div', 'detail-contents', { id: 'detail-contents-longDescription', classes: ['detail-contents-item'] });
			detailMenu.longDescription.button = document.getElementById('detail-menu-longDescription');

			// Add the `time` class only to links that are NOT marked with the `non-time` class
			for (const paragraph of song.longDescription.split('\n')) {
				const p = document.createElement('p');
				p.innerHTML = paragraph;

				p.querySelectorAll('a').forEach(a => {
					if (!a.closest('.non-time')) {
						a.classList.add('time');
					}
					else {
						a.target = "_blank";
					}
				});
				document.getElementById('detail-contents-longDescription').appendChild(p);
			}

			const timestampsInDescription = document.querySelectorAll('.time');

			timestampsInDescription.forEach(timestamp => {
				timestamp.addEventListener('click', () => {
					aud.setElapsed(helpers.timestampToSeconds(timestamp.textContent));

					// Remove the class if it’s already there
					HTML.spinner.classList.remove("timestamped");
					HTML.line.classList.remove("timestamped");

					// Force a reflow/repaint so the browser notices the re-addition
					// Reading offsetWidth (or similar) flushes the style changes
					void HTML.spinner.offsetWidth;
					void HTML.line.offsetWidth;

					// Re-add the class to restart the animation
					HTML.spinner.classList.add("timestamped");
					HTML.line.classList.add("timestamped");
				});
			});
		}

		// Motifs
		if (detailMenu.motifs.exists) {
			HTML.newElement('button', 'detail-menu', { id: 'detail-menu-motifs', classes: ['detail-menu-item'], text: "Motifs" });
			HTML.newElement('div', 'detail-contents', { id: 'detail-contents-motifs', classes: ['detail-contents-item'] });
			detailMenu.motifs.button = document.getElementById('detail-menu-motifs');

			for (const motif of song.motifs) {
				const p = document.createElement('p');
				p.innerHTML = `${motif[2]} from measure ${motif[0]} to ${motif[1]}`;
				document.getElementById('detail-contents-motifs').appendChild(p);
			}
		}

		// Details
		HTML.newElement('button', 'detail-menu', { id: 'detail-menu-details', classes: ['detail-menu-item'], text: "Details" });
		HTML.newElement('div', 'detail-contents', { id: 'detail-contents-details', classes: ['detail-contents-item'] });
		detailMenu.details.button = document.getElementById('detail-menu-details');

		if (song.daw) {
			HTML.newElement('p', 'detail-contents-details', { text: `DAW: ${song.daw}` })
		}
		if (song.date) {
			HTML.newElement('p', 'detail-contents-details', { text: `Date created: ${song.date}` })
		}
		if (song.alternativeNames.length > 0) {
			HTML.newElement('p', 'detail-contents-details', { text: `Alternative names: ${song.alternativeNames}` })
		}

		// Hide all contents at first
		document.querySelectorAll('.detail-contents-item').forEach(content => {
			content.style.display = 'none';
		});

		// Select all buttons in the detail menu
		const detailButtons = document.querySelectorAll('.detail-menu-item');

		detailButtons.forEach(button => {
			button.addEventListener('click', () => {
				detailButtons.forEach(b => b.classList.remove('selected')); // Remove 'selected' from all buttons
				button.classList.add('selected'); // Add 'selected' to the clicked button

				// Re-hide all content
				document.querySelectorAll('.detail-contents-item').forEach(content => {
					content.style.display = 'none';
				});

				// Show content
				const contentId = button.id.replace('detail-menu-', 'detail-contents-');
				const contentDiv = document.getElementById(contentId);
				if (contentDiv) contentDiv.style.display = 'block';
			});
		});

		for (const key in detailMenu) {
			const menuItem = detailMenu[key];
			if (menuItem.exists) {
				menuItem.button.classList.add('selected');

				// Also show its content by default
				const contentId = menuItem.button.id.replace('detail-menu-', 'detail-contents-');
				const contentDiv = document.getElementById(contentId);
				if (contentDiv) contentDiv.style.display = 'block';
				break;
			}
		}

		// CREATE BOTTOM ELEMENTS DYNAMICALLY /////////////////////////////////

		// Timeline 1 (Cover) and Timeline 2
		HTML.newElement('img', 'timeline-left', { id: 'timeline-left-1', classes: ['cover'], src: song.cover.src, display: 'block' });
		HTML.newElement('div', 'timeline-left', { id: 'timeline-left-2' });

		// Name
		HTML.newElement('p', 'timeline-left-2', { id: 'timeline-left-title', text: song.preferredName });

		// Album
		HTML.newElement('div', 'timeline-left-2', { id: 'album' });
		HTML.newElement('i', 'album', { classes: ['fa-solid', 'fa-music', 'timeline-left-icon'] });
		HTML.newElement('p', 'album', { text: `${song.album} (#${song.id[0]})` });

		// Disc
		if (getAlbum(song.album).discs.length > 1) { // Has more than 1 disc
			HTML.newElement('div', 'timeline-left-2', { id: 'disc' });
			HTML.newElement('i', 'disc', { classes: ['fa-solid', 'fa-compact-disc', 'timeline-left-icon'] });
			HTML.newElement('p', 'disc', { text: `Disc ${song.discID}` });
		}

		// Calendar
		if (song.date) {
			HTML.newElement('div', 'timeline-left-2', { id: 'date' });
			HTML.newElement('i', 'date', { classes: ['fa-regular', 'fa-calendar', 'timeline-left-icon'] });
			HTML.newElement('p', 'date', { text: `Released ${song.date}` });
		}
	}
	catch (error) {
		console.error('initSong error:', error);
	}
	finally {
		HTML.infoDiv.classList.remove('loading');
		HTML.timelineDiv.classList.remove('loading');
		state.loading = false;

		if (song.structure && song.structure.length > 0) {
			// Compute absolute start seconds for each entry
			state.structure.startTimesOfEachStruct = computeStructureStartSeconds(song.structure);
		}
		else {
			state.structure.startTimesOfEachStruct = [];
		}
	}
}