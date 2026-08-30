import { state }			from '../state/state.js';
import { colors }			from '../state/colors.js';
import { layout }			from '../state/layout/layout.js';

import * as HTML			from './elements.js';
import * as cnv				from '../canvas/canvas.js';
import * as helpers			from '../helpers.js';
import * as colorHandle		from './colorHandling.js';
import * as motifRegistry	from '../motif.js';
import * as aud				from '../audio/audio.js';
import * as render			from '../canvas/render.js';
import * as textures		from './textures.js';
import * as discography		from '../discography.js';

// Load audio only if the time threshold allows
// This is my fix for crazy lag when rapidly moving between multiple songs
export function loadSongWithThresholdCheck(song) {
	if (!state.settings.canPreloadSongs) return;
	aud.resetClock();
	
	if (aud.timeSinceLastCacheUpdateAttempt === 0 || aud.timeSinceLastCacheUpdateAttempt >= aud.cacheUpdateThreshold) {
		aud.loadAudio(song.path);
		return true;
	}
	return false;
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


export async function saveSongEdits(song) {
	const shortDescription = document.getElementById('info-shortDescription')
	const longDescription = document.getElementById('data-contents-longDescription');
	const datePicker = document.getElementById('date-picker');

	const updatedFields = {
		shortDescription: shortDescription.textContent,
		longDescription: longDescription.innerHTML.replace(/\u200B/g, ''),
		date: datePicker.value,
	};

	const result = await window.electron.updateSongMetadata(song.path, updatedFields);

	// Handle Result
	if (result.success) {
		// Sync local state so the app doesn't need to reload to see changes
		Object.assign(song, updatedFields);
	}
	else {
		alert("Failed to save: " + result.error);
	}
}

// GETS the next song "in queue," customized by each state.audio.shuffle mode
export function getNextSong(currentSong, direction) {
	if (state.loading) return;

	let nextDisc;
	let nextAlbum;
	let nextSong;

	const currentAlbum = discography.getAlbum(currentSong.parentAlbumFileName);
	const disc = discography.getDisc(currentSong.parentAlbumFileName, currentSong.id.parentDisc);

	// Next consecutive song
	if (disc && state.audio.shuffle === 0) {
		const directionIsForwards = direction > 0;

		// If song is NOT last in disc
		if (directionIsForwards ? (currentSong.id.disc - 1 < disc.songs.length - 1) : (currentSong.id.disc - 1 > 0)) {
			nextSong = disc.songs[currentSong.id.disc - 1 + direction];
		}
		// If song IS last in disc
		else {
			nextDisc = currentAlbum.discs[currentSong.id.parentDisc - 1 + (directionIsForwards ? 1 : -1)];
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
						nextSong = nextAlbum.discs[nextAlbum.discs.length-1].songs[nextAlbum.discs[nextAlbum.discs.length-1].songs.length-1];
					}
				}
			}
			else {
				nextSong = nextDisc.songs[directionIsForwards ? 0 : nextDisc.songs.length-1];
			}
		}
	}

	// Random song in album
	else if (state.audio.shuffle === 1) {
		nextDisc = currentAlbum.discs[helpers.randInt(0, currentAlbum.discs.length-1)];
		nextSong = nextDisc.songs[helpers.randInt(0, nextDisc.songs.length-1)];
		aud.loadAudio(nextSong.path);
	}

	// TODO: Random song in discography
	else if (state.audio.shuffle === 2) {

	}

	return nextSong;
}

// PLAYS the next song "in queue," customized by each suffle mode
export function playNextSong(currentSong, direction) {
	if (state.loading) return;
	saveSongEdits(state.selectedSong);
	state.selectedSong = getNextSong(currentSong, direction, state.audio.shuffle);
	playSong(state.selectedSong);
}

// Builds the UI for a song that is currently playing
export async function buildSongUI(song) {
	HTML.infoDiv.innerHTML = '';
	HTML.timelineLeftDiv.innerHTML = '';

	// Cover
	const imgObject = textures.get(song.cover);
	HTML.newElement('div', 'info', { id: 'info-cover' });
	HTML.newElement('img', 'info-cover', { id: 'info-cover-img', classes: 'cover', src: imgObject.src, display: 'block' });
	HTML.newElement('button', 'info-cover', { classes: 'plus-sign', text: '+' });
	const infoCover = document.getElementById('info-cover-img');

	// Handle gradient colors
	if (!song.colors) {
		await song.constructColors(state.settings.howManyColorsToGetFromCover);
	}
	else {
		colorHandle.constructInfoGradient(song);
	}

	// Initialize big cover
	infoCover.addEventListener('click', (e) => {
		if (e.target.classList.contains('plus-sign')) return;
		HTML.bigCover.src = infoCover.src;
		HTML.bigCoverWrapper.classList.add('active');
		HTML.bigCoverOverlay.classList.add('active');
	});

	// Plus sign; only active in edit mode
	const plusSign = infoCover.parentElement.querySelector('.plus-sign');
	if (plusSign) {
		plusSign.addEventListener('click', async (e) => {
			e.stopPropagation();
			if (!state.edit.editMode) return;

			const filePath = await window.electron.pickCoverImage();
			if (!filePath) return;

			const result = await window.electron.updateSongCover(song.path, filePath);
			
			if (result.success) {
				textures.bust(song.cover);
				const newSrc = `${song.path}?type=cover&bust=${Date.now()}`;
				song.cover = newSrc;
				song.colors = null; // force recompute

				textures.get(newSrc); // kick off the load
				await textures.waitForLoad(newSrc); // wait for it to finish

				infoCover.src = newSrc;
				await song.constructColors(state.settings.howManyColorsToGetFromCover);
			}
			else {
				alert('Failed to update cover: ' + result.error);
			}
		});
	}

	// Hide when clicking the big cover
	HTML.bigCover.addEventListener('click', () => {
		HTML.bigCoverWrapper.classList.remove('active');
		HTML.bigCoverOverlay.classList.remove('active');
	});
	// Hide when clicking outside the big cover
	HTML.bigCoverOverlay.addEventListener('click', () => {
		HTML.bigCoverWrapper.classList.remove('active');
		HTML.bigCoverOverlay.classList.remove('active');
	});

	// Name and short description
	HTML.newElement('div', 'info', { id: 'info-title', classes: 'info-highlight' });
	HTML.newElement('h2', 'info-title', { id: 'info-header', text: song.name });
	if (state.edit.editMode || song.shortDescription != "") {
		HTML.newElement('p', 'info-title', {
			id: 'info-shortDescription',
			contentEditable: state.edit.editMode,
			placeholder: `Type subtitle here...`,
			text: song.shortDescription
		});
	}


	///  DATA  ///////////////////////////////////////////////////////////////

	HTML.newElement('div', 'info', { id: 'data-container', classes: ['info-highlight', 'dark'] });
	HTML.newElement('div', 'data-container', { id: 'data-menu' });
	HTML.newElement('div', 'data-container', { id: 'data-contents' });
	
	// Long description
	HTML.newElement('button', 'data-menu', { id: 'data-menu-longDescription', classes: 'data-menu-item', text: 'Description' });
	HTML.newElement('div', 'data-contents', {
		id: 'data-contents-longDescription',
		classes: 'data-contents-item',
		contentEditable: state.edit.editMode,
		placeholder: `Type description here...`,
		text: song.longDescription
	});

	///  entities (timestamps and links)  ///

	const longDescription = document.getElementById('data-contents-longDescription');

	// Highlight on input
	longDescription.addEventListener('input', () => {
		highlightEntities();
	});

	// Intercept paste to handle links immediately
	longDescription.addEventListener('paste', (e) => {
		e.preventDefault();
		const text = (e.originalEvent || e).clipboardData.getData('text/plain');
		
		const selection = window.getSelection();
		if (!selection.rangeCount) return;
		
		// Insert the plain text and trigger highlight
		const range = selection.getRangeAt(0);
		range.deleteContents();
		range.insertNode(document.createTextNode(text));
		
		// Move cursor to the end of the pasted text
		selection.collapseToEnd();
		highlightEntities();
	});

	longDescription.addEventListener('click', (e) => {
		if (e.target.classList.contains('time')) {
			// Parse "MM:SS" or "HH:MM:SS" into total seconds
			const parts = e.target.textContent.split(':').reverse();
			let seconds = 0;
			if (parts[0]) seconds += parseInt(parts[0], 10);		// Seconds
			if (parts[1]) seconds += parseInt(parts[1], 10) * 60;   // Minutes
			if (parts[2]) seconds += parseInt(parts[2], 10) * 3600; // Hours

			aud.setElapsed(seconds);
		}
	});

	highlightEntities();

	///  more  ///

	HTML.newElement('button', 'data-menu', { id: 'data-menu-details', classes: 'data-menu-item', text: "Details" });
	HTML.newElement('div', 'data-contents', { id: 'data-contents-details', classes: 'data-contents-item' });

	if (song.daw) {
		HTML.newElement('p', 'data-contents-details', { text: `DAW: ${song.daw}` });
	}

	// Date
	const dateYMD = song.date.split('-').map(Number);
	HTML.newElement('span', 'data-contents-details', { text: `Date created: ${state.edit.editMode ? '' : `${dateYMD[1]}/${dateYMD[2]}/${dateYMD[0]}`}` });
	if (state.edit.editMode) HTML.newElement('input', 'data-contents-details', { type: `date`, value: `${song.date}`, id: `date-picker`, class: 'data-contents-item' });
	const datePicker = document.getElementById('date-picker');
	document.querySelector('body').addEventListener('paste', (e) => {
		if (document.activeElement !== datePicker) return;
		const value = e.clipboardData.getData('text');
		// Convert MM/DD/YYYY or DD/MM/YYYY to YYYY-MM-DD format
		const parts = value.split('/');
		if (parts.length === 3) {
			const [first, second, third] = parts;
			// Assume MM/DD/YYYY format
			datePicker.value = `${third}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`;
		} else {
			datePicker.value = value;
		}
	});

	if (song.alternateNames.length > 0) {
		HTML.newElement('p', 'data-contents-details', { text: `Alternative names: ${song.alternateNames}` });
	}

	// Hide all contents at first
	document.querySelectorAll('.data-contents-item').forEach(content => {
		content.style.display = 'none';
	});

	// Select all buttons in the data menu
	const dataButtons = document.querySelectorAll('.data-menu-item');

	function showDataContents(button) {
		const contentId = button.id.replace('data-menu-', 'data-contents-');
		const contentDiv = document.getElementById(contentId);
		if (contentDiv) contentDiv.style.display = 'block';
	}

	// Initial data show
	if (dataButtons.length > 0) {
		dataButtons[state.edit.dataIndex].classList.add('selected');
		showDataContents(dataButtons[state.edit.dataIndex]);
	}
	
	// Re-hide all content and display current content
	dataButtons.forEach((button, i) => {
		button.addEventListener('click', () => {
			dataButtons.forEach(b => b.classList.remove('selected')); // Remove 'selected' from all buttons
			button.classList.add('selected'); // Add 'selected' to the clicked button
			state.edit.dataIndex = i;

			document.querySelectorAll('.data-contents-item').forEach(content => {
				content.style.display = 'none';
			});
			showDataContents(button);
		});
	});

	///  TIMELINE ELEMENTS  /////////////////////////////////

	// Timeline 1 (Cover) and Timeline 2
	HTML.newElement('img', 'timeline-left', { id: 'timeline-left-1', classes: 'cover', src: imgObject.src, display: 'block' });
	HTML.newElement('div', 'timeline-left', { id: 'timeline-left-2' });

	// Name
	HTML.newElement('p', 'timeline-left-2', { id: 'timeline-left-title', text: song.name });

	// Album
	HTML.newElement('div', 'timeline-left-2', { id: 'album' });
	HTML.newElement('i', 'album', { classes: ['fa-solid', 'fa-music', 'timeline-left-icon'] });
	HTML.newElement('p', 'album', { text: `${song.parentAlbumFileName} (#${song.id.album})` });

	// Disc
	if (discography.getAlbum(song.parentAlbumFileName).discs.length > 1) { // Has more than 1 disc
		HTML.newElement('div', 'timeline-left-2', { id: 'disc' });
		HTML.newElement('i', 'disc', { classes: ['fa-solid', 'fa-compact-disc', 'timeline-left-icon'] });
		HTML.newElement('p', 'disc', { text: `Disc ${song.id.parentDisc}` });
	}

	// Calendar
	if (song.date) {
		HTML.newElement('div', 'timeline-left-2', { id: 'date' });
		HTML.newElement('i', 'date', { classes: ['fa-regular', 'fa-calendar', 'timeline-left-icon'] });
		const dateYMD = song.date.split('-').map(Number);
		HTML.newElement('p', 'date', { text: `Released ${dateYMD[1]}/${dateYMD[2]}/${dateYMD[0]}` });
	}
}

// Called when user begins a song
export async function playSong(song) {
	state.loading = true;

	// Update infoDiv
	HTML.infoDiv.innerHTML = '';
	HTML.infoDiv.classList.add('loading');
	if (state.firstLoad) HTML.infoDiv.classList.add('active');

	// Update timelineDiv
	HTML.timelineLeftDiv.innerHTML = '';
	HTML.timelineDiv.classList.add('loading', 'active');

	HTML.pauseButton.style.display = "inline-grid";
	HTML.playButton.style.display = "none";

	layout.trackCanvas.frame.motifPanel.scrollOffset = 0;

	motifRegistry.clearMotifLayout(discography.motifs);

	try {
		// playMusic returns { startedAt, duration } or { startedAt: null, duration: null } if aborted
		const res = await aud.playMusic(song.path, state.audio.volume, state.audio.looping);
		const { duration, startedAt } = res || {};
		if (!duration) return;

		song.duration = duration;
		song.startedAt = startedAt;

		await buildSongUI(song);
	}
	catch (error) {
		console.error('playSong error:', error);
	}
	finally {
		HTML.infoDiv.classList.remove('loading');
		HTML.timelineDiv.classList.remove('loading');
		state.loading = false;

		if (song.structure && song.structure.length > 0) {
			// Compute start seconds for each entry
			state.structure.startTimesOfEachStruct = computeStructureStartSeconds(song.structure);
		}
		else {
			state.structure.startTimesOfEachStruct = [];
		}
	}
	state.firstLoad = false;
}

// Detect and create timestamps and links in the description
function highlightEntities() {
	const container = document.getElementById('data-contents-longDescription');
	if (!container || !state.edit.editMode) return;

	// SAVE CARET POSITION
	const selection = window.getSelection();
	let offset = 0;
	if (selection.rangeCount > 0) {
		const range = selection.getRangeAt(0);
		const preCaretRange = range.cloneRange();
		preCaretRange.selectNodeContents(container);
		preCaretRange.setEnd(range.endContainer, range.endOffset);
		offset = preCaretRange.toString().length;
	}

	const timeRegex = /\b\d{1,2}:\d{2}(?::\d{2})?\b/;
	const linkRegex = /https?:\/\/[^\s]+/;
	// Combined regex: Group 1 is Time, Group 2 is Link
	const combinedRegex = new RegExp(`(${timeRegex.source})|(${linkRegex.source})`, 'g');
	
	let hasChanged = false;

	// Find text nodes not already inside a highlight tag
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
		acceptNode: (node) => {
			const parent = node.parentNode;
			const isInside = parent.classList.contains('time') || parent.classList.contains('non-time');
			return isInside ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
		}
	}, false);

	const nodesToProcess = [];
	let node;
	while (node = walker.nextNode()) {
		if (node.textContent.match(combinedRegex)) nodesToProcess.push(node);
	}

	nodesToProcess.forEach(textNode => {
		const fragment = document.createDocumentFragment();
		const text = textNode.textContent;
		let lastIndex = 0;
		let match;

		while ((match = combinedRegex.exec(text)) !== null) {
			hasChanged = true;
			const [fullMatch, timeMatch, linkMatch] = match;

			// Add text before the match
			if (match.index > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
			}

			if (timeMatch) {
				const span = document.createElement('span');
				span.className = 'time';
				span.contentEditable = "false"; 
				span.textContent = timeMatch;
				fragment.appendChild(span);
			}
			else if (linkMatch) {
				const a = document.createElement('a');
				a.className = 'non-time';
				a.href = linkMatch;
				a.target = "_blank"; // Open in new tab
				a.contentEditable = "false"; 
				a.textContent = linkMatch;
				fragment.appendChild(a);
			}

			// Keeps the cursor on the right side of the entity after finishing typing it out
			fragment.appendChild(document.createTextNode("\u200B")); 
			lastIndex = combinedRegex.lastIndex;
		}

		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}
		textNode.parentNode.replaceChild(fragment, textNode);
	});

	if (hasChanged) {
		restoreCaretPosition(container, offset);
		attachTimestampListeners();
	}
}

function restoreCaretPosition(container, offset) {
	const selection = window.getSelection();
	const range = document.createRange();
	let currentOffset = 0;

	const traverse = (node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			const nextOffset = currentOffset + node.length;
			if (offset <= nextOffset) {
				range.setStart(node, offset - currentOffset);
				range.collapse(true);
				return true;
			}
			currentOffset = nextOffset;
		} else {
			// Treat both .time and .non-time as atomic blocks
			if (node.classList && (node.classList.contains('time') || node.classList.contains('non-time'))) {
				currentOffset += node.textContent.length;
			} else {
				for (let child of node.childNodes) {
					if (traverse(child)) return true;
				}
			}
		}
		return false;
	};

	traverse(container);
	selection.removeAllRanges();
	selection.addRange(range);
}