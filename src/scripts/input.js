import { state }			from './state/state.js';
import { layout }			from './state/layout/layout.js';

import * as HTML			from './ui/elements.js';
import * as cnv				from './canvas/canvas.js';
import * as helpers			from './helpers.js';
import * as motifRegistry	from './motif.js';
import * as aud				from './audio/audio.js';
import * as render			from './canvas/render.js';
import * as textures		from './ui/textures.js';
import * as init			from './init.js';
import * as songUI			from './ui/song.js';
import * as discography		from './discography.js';
import * as debug			from './canvas/mainCanvas/debug.js';

// Return mouse position in canvas CSS-pixel coordinates
function toCanvasCoords(event) {
	const canvasRect = cnv.canvas.getBoundingClientRect();
	state.pos.mainCanvas.x = event.clientX - canvasRect.left;
	state.pos.mainCanvas.y = event.clientY - canvasRect.top;

	const trackCanvasRect = cnv.trackCanvas.getBoundingClientRect();
	state.pos.trackCanvas.x = event.clientX - trackCanvasRect.left;
	state.pos.trackCanvas.y = event.clientY - trackCanvasRect.top;
}

function pause() {
	aud.pauseMusic();
	HTML.playButton.style.display = "inline-grid";
	HTML.pauseButton.style.display = "none";
}

function play() {
	aud.resumeMusic();
	HTML.pauseButton.style.display = "inline-grid";
	HTML.playButton.style.display = "none";
}

// Checks if cursor is within canvas bounds (in CSS pixels) but not over info/timeline
function determineCursorInCanvas() {
	const canvasRect = cnv.canvas.getBoundingClientRect();
	const infoRect = HTML.infoDiv.getBoundingClientRect();
	const timelineRect = HTML.timelineDiv.getBoundingClientRect();
	const editButtonRect = HTML.editButton.getBoundingClientRect();

	// Convert the canvas-local CSS point to page coordinates for overlap tests
	const pageX = canvasRect.left + state.pos.mainCanvas.x;
	const pageY = canvasRect.top + state.pos.mainCanvas.y;

	const off = layout.infoDiv.leftHitboxWidth/2;

	const in_canvas =		(pageX >= canvasRect.left		&& pageX <= canvasRect.right	 && pageY >= canvasRect.top		&& pageY <= canvasRect.bottom);
	const in_info =			(pageX >= infoRect.left - off	&& pageX <= infoRect.right		 && pageY >= infoRect.top		&& pageY <= infoRect.bottom);
	const in_timeline =		(pageX >= timelineRect.left 	&& pageX <= timelineRect.right	 && pageY >= timelineRect.top	&& pageY <= timelineRect.bottom);
	const in_editButton =	(pageX >= editButtonRect.left	&& pageX <= editButtonRect.right && pageY >= editButtonRect.top	&& pageY <= editButtonRect.bottom);

	return in_canvas && !in_info && !in_timeline && !in_editButton && !HTML.bigCoverOverlay.classList.contains('active');
}

// Checks if cursor is within a song box's hitbox
function getSongInCollidedHitbox() {
	// Iterate through dictionary values
	for (const song of Object.values(discography.songsDict)) {
		const w = song.projectedWidth;
		const h = song.projectedHeight || w;
		if (state.pos.mainCanvas.x >= song.x && state.pos.mainCanvas.x <= song.x + w && state.pos.mainCanvas.y >= song.y && state.pos.mainCanvas.y <= song.y + h) {
			return song;
		}
	}
	return null;
}

async function toggleEditMode() {
	const longDescription = document.getElementById('data-contents-longDescription');
	if (state.edit.editMode) {
		state.edit.editMode = false;
		HTML.editButton.classList.remove('activated');
		document.body.classList.remove('edit-mode');

		if (!state.firstLoad) {
			longDescription.contentEditable = 'false';
			songUI.saveSongEdits(state.selectedSong);
		}
	}
	else {
		state.edit.editMode = true;
		HTML.editButton.classList.add('activated');
		document.body.classList.add('edit-mode');

		if (!state.firstLoad) {
			longDescription.contentEditable = 'true';
		}
	}
	if (!state.firstLoad) {
		await songUI.buildSongUI(state.selectedSong);
	}
}

// Trigger the Electron file picker
async function triggerFilePicker() {
	state.edit.placingSong = true;
	const leitFilePath = await window.electron.pickFile(state.edit.parentDiscographyFileName);
	
	if (leitFilePath) {
		discography.addSong(leitFilePath);
	}
	state.edit.placingSong = false;
}


export function registerInput() {
	window.addEventListener("keydown", async event => {
		const target = event.target;
		state.debug.lastKeyPressed = event.code; // Update last key code

		// Check if the target is an input or contenteditable
		if (target.closest('[contenteditable="true"], [contenteditable=""], input, textarea')) return;

		// Iterate through debug options and apply input checks
		for (const d of debug.DEBUG_ORDER) {
			if (event.code === d.hotkey) {
				state.debug.visuals[d.key] = !state.debug.visuals[d.key];
			}
		}

		switch (event.code) {
			// Pause
			case "Space":
				if (aud.isPlaybackPaused()) play();
				else pause();
				break;

			// Forward and backward in song
			case "ArrowLeft":
				aud.setElapsed(state.audio.elapsed - 3);
				break;
			case "ArrowRight":
				aud.setElapsed(state.audio.elapsed + 3);
				break;

			case "ArrowUp":
				debug.handleTerminalScroll('ArrowUp');
				break;
			case "ArrowDown":
				debug.handleTerminalScroll('ArrowDown');
				break;

			// Previous and next song
			case "KeyA":
				songUI.playNextSong(state.selectedSong, -1, state.audio.shuffle);
				break;
			case "KeyD":
				songUI.playNextSong(state.selectedSong, 1, state.audio.shuffle);
				break;

			// Scramble motif colors 
			case "KeyZ":
				motifRegistry.scrambleMotifColors(discography.motifs);
				break;
			// Compress motifs 
			case "KeyC":
				state.trackCanvas.frame.motifPanel.compressMotifs = !state.trackCanvas.frame.motifPanel.compressMotifs;
				break;
			// Change motif height in track timeline (not panel) 
			case "Minus":
				layout.trackCanvas.frame.timeline.motifHeight--;
				break;
			case "Equal":
				layout.trackCanvas.frame.timeline.motifHeight++;
				break;
			
			// Edit mode
			case "KeyE":
				toggleEditMode();
				break;

			// Delete discography
			case "Delete":
				discography.resetDiscography();
				break;
			
			// Download discography data
			case "Backquote":
				function exportDiscography() {
					const data = {
						discography: discography.albums
					};

					const json = JSON.stringify(data);
					const blob = new Blob([json], { type: "application/json" });

					const url = URL.createObjectURL(blob);
					const a = document.createElement("a");
					a.href = url;
					a.download = "discography.json";
					a.click();

					URL.revokeObjectURL(url);
				}

				exportDiscography();
				break;
		}
	});

	document.querySelectorAll('button').forEach(btn => {
		btn.addEventListener('keydown', (e) => {
			e.preventDefault();
		});
	});

	window.addEventListener('wheel', event => {
		// Vertical canvas scroll
		if (state.hovering.debug) {
			debug.handleTerminalScroll(event.deltaY.toFixed(0) > 0 ? 'ArrowDown' : 'ArrowUp');
		}
		else if (state.hovering.mainCanvas && discography.albums.length > 0) { 
			state.dragging.pos.y -= (event.deltaY / 2).toFixed(0);
		}
		// Motif panel scroll
		if (state.hovering.motifPanel.self && state.trackCanvas.frame.motifPanel.scrollbarNeeded) {
			layout.trackCanvas.frame.motifPanel.scrollOffset -= (event.deltaY / 4).toFixed(0);
		}
	});

	window.addEventListener('mousemove', event => {
		toCanvasCoords(event);

		// Move the camera if dragging
		if (state.dragging.mainCanvas && discography.albums.length > 0) {
			state.dragging.pos.x = state.dragging.pos.initialX + state.pos.mainCanvas.x - state.pos.mainCanvas.clickX;
			state.dragging.pos.y = state.dragging.pos.initialY + state.pos.mainCanvas.y - state.pos.mainCanvas.clickY;
		}

		state.hovering.debug = state.pos.mainCanvas.y < (Math.min(state.debug.terminalTotalLines, debug.getTerminalVisibleLines()) + 1) * state.font.size.default;

		state.hovering.mainCanvas = determineCursorInCanvas();

		// Check hitbox
		const newHovered = getSongInCollidedHitbox();
		cnv.canvas.style.cursor = (newHovered || state.hovering.addSongContainer) ? 'pointer' : 'auto';

		const enteringSong = (
			newHovered &&
			!(state.hoveredSong === newHovered ||
			(state.hoveredSong && newHovered && state.hoveredSong.path === newHovered.path))
		);

		if (enteringSong) {
			songUI.loadSongWithThresholdCheck(newHovered);
		}

		state.hoveredSong = newHovered;

		// HTML.infoDiv changes width on left-side

		const infoDivRect = HTML.infoDiv.getBoundingClientRect();
		const x = event.clientX - infoDivRect.left;

		state.hovering.infoDivLeftHitbox = (x >= -layout.infoDiv.leftHitboxWidth / 2 && x <= layout.infoDiv.leftHitboxWidth / 2);
		
		if (state.hovering.infoDivLeftHitbox || state.dragging.infoDiv) {
			document.body.style.cursor = 'col-resize';
			cnv.canvas.style.cursor = 'col-resize';

			if (!HTML.infoDiv.classList.contains('resizable')) {
				HTML.infoDiv.classList.add('resizable');
			}
		}
		else {
			document.body.style.cursor = 'auto';
			HTML.infoDiv.classList.remove('resizable');
		}

		// INFO DIV DRAGGING

		if (state.dragging.infoDiv) {
			const w = window.innerWidth - event.clientX - layout.infoDiv.paddingHorizontal * 2;
			const collapseX = window.innerWidth - layout.infoDiv.collapseWidth;

			// Collapse info panel
			if (event.clientX >= collapseX) {
				layout.infoDiv.width = layout.infoDiv.minWidth;
				HTML.infoDiv.classList.remove('active');
			}
			// Set info panel width
			else {
				layout.infoDiv.width = helpers.clamp(layout.infoDiv.minWidth, w, layout.infoDiv.maxWidth);
				HTML.infoDiv.classList.add('active');
			}

			document.documentElement.style.setProperty("--value-info-width", `${layout.infoDiv.width}px`);
			cnv.fitTrackCanvas();
		}

		// SONG DRAGGING IN EDIT MODE

		if (state.dragging.song && state.edit.editMode) {
			const disc = discography.getDisc(state.dragging.song.parentAlbumFileName, state.dragging.song.id.parentDisc);
			if (disc) {
				const song = state.dragging.song;
				const songWidth = layout.mainCanvas.album.actualDimension;
				const xGap = layout.mainCanvas.album.xGap;
				const itemWidth = songWidth + xGap;

				// Calculate which position the song should be at based on x position
				const relativeX = state.pos.mainCanvas.x - state.dragging.pos.x - layout.mainCanvas.album.forcedDimension;
				let newIndex = Math.round(relativeX / itemWidth);
				newIndex = Math.max(0, Math.min(newIndex, disc.songs.length - 1));

				const currentIndex = disc.songs.indexOf(song);
				if (currentIndex !== -1 && currentIndex !== newIndex) {
					// Reorder in the array
					disc.songs.splice(currentIndex, 1);
					disc.songs.splice(newIndex, 0, song);
				}
			}
		}
	});

	window.addEventListener('mousedown', event => {
		// Canvas coordinates
		toCanvasCoords(event); 
		state.pos.mainCanvas.clickX = state.pos.mainCanvas.x;
		state.pos.mainCanvas.clickY = state.pos.mainCanvas.y;

		// trackCanvas coordinates
		toCanvasCoords(event);
		state.pos.trackCanvas.clickX = state.pos.trackCanvas.x;
		state.pos.trackCanvas.clickY = state.pos.trackCanvas.y;

		// HTML.infoDiv coordinates (CSS pixels relative to HTML.infoDiv)
		const infoDivRect = HTML.infoDiv.getBoundingClientRect();
		const xInInfoDiv = event.clientX - infoDivRect.left;

		state.hovering.infoDivLeftHitbox = (xInInfoDiv >= -layout.infoDiv.leftHitboxWidth/2 && xInInfoDiv <= layout.infoDiv.leftHitboxWidth/2);

		// Left click
		if (event.button === 0) {
			// Start dragging info panel
			if (state.hovering.infoDivLeftHitbox) {
				event.preventDefault(); 
				state.dragging.infoDiv = true;
			} 
			// Canvas selection
			else if (state.hovering.mainCanvas && !state.edit.placingSong) {
				if (state.hovering.addSongContainer && !state.edit.placingSong) {
					triggerFilePicker();
				}
				else if (state.hoveredSong !== null) {
					// Record the pressed song for selection
					state.pressedSong = state.hoveredSong;

					// In edit mode: also prepare to drag the song
					if (state.edit.editMode) {
						state.dragging.song = state.hoveredSong;
						const disc = discography.getDisc(state.hoveredSong.parentAlbumFileName, state.hoveredSong.id.parentDisc);
						if (disc) {
							state.dragging.songStartIndex = disc.songs.indexOf(state.hoveredSong);
						}
					}
				}
				else {
					// Empty space; drag the canvas
					state.dragging.mainCanvas = true;
					state.dragging.pos.initialX = state.dragging.pos.x;
					state.dragging.pos.initialY = state.dragging.pos.y;
				}
			}
		}
	});

	window.addEventListener('mouseup', event => {
		if (event.button === 0) {
			state.dragging.mainCanvas = false;
			state.dragging.infoDiv = false;

			// Finalize song dragging in edit mode
			let songWasMoved = false;
			if (state.dragging.song && state.edit.editMode) {
				const song = state.dragging.song;
				const newIndex = discography.getDisc(song.parentAlbumFileName, song.id.parentDisc).songs.indexOf(song);
				if (newIndex !== -1 && newIndex !== state.dragging.songStartIndex) {
					// Song was reordered, save changes
					songWasMoved = true;
					discography.reorderSongInDisc(song, newIndex);
				}
				state.dragging.song = null;
				state.dragging.songStartIndex = null;
			}

			if (state.dragging.timelineSpinner && state.selectedSong && !state.loading) {
				aud.setElapsed(state.audio.elapsedPercentInTime);
				state.dragging.timelineSpinner = false;
			}
			if (state.dragging.volumeSpinner && state.selectedSong && !state.loading) {
				state.audio.lastManualVolume = state.audio.volume;
				state.dragging.volumeSpinner = false;
			}

			// Play song on mouseup (only if not moved during drag)
			if (!songWasMoved &&
				state.hovering.mainCanvas && state.pressedSong !== null && state.hoveredSong !== null
				&& (!state.edit.editMode || state.pressedSong === state.hoveredSong)
				&& !state.edit.placingSong
			) {
				// Save edits on the current selected song before doing anything
				if (state.edit.editMode) songUI.saveSongEdits(state.selectedSong);

				// If in edit mode, don't do the selection-storage thing
				if (!state.edit.editMode) state.selectedSong = state.hoveredSong;
				else state.selectedSong = state.pressedSong;
				songUI.playSong(state.selectedSong);
			}

			state.pressedSong = null;
		}
	});

	// BIG COVER EVENT LISTENERS

	HTML.bigCoverWrapper.addEventListener('mousemove', (e) => {
		const maxTilt = 5;

		const rect = HTML.bigCover.getBoundingClientRect();
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		
		const rotateY = -(e.clientX - (rect.left + centerX)) / centerX * maxTilt;
		const rotateX =  (e.clientY - (rect.top  + centerY)) / centerY * maxTilt;

		HTML.bigCover.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
		HTML.bigCover.classList.remove('inactive');
	});

	HTML.bigCoverWrapper.addEventListener('mouseleave', () => {
		HTML.bigCover.style.transform = ``;
		HTML.bigCover.classList.add('inactive');
	});

	// TIMELINE EVENT LISTENERS

	// When clicking on timeline
	HTML.lineContainer.addEventListener('mousedown', event => {
		if (event.button === 0) {
			state.dragging.timelineSpinner = true;
		}
	});

	HTML.shuffleButton.addEventListener('click', () => {
		state.audio.shuffle = (state.audio.shuffle + 1) % 3; // Cycle through state.audio.shuffle modes (0, 1, 2)

		// Remove all state.audio.shuffle-enabled classes first
		HTML.shuffleButton.classList.remove('enabled-1', 'enabled-2', 'enabled');

		if (state.audio.shuffle === 1) {
			HTML.shuffleButton.classList.add('enabled-1');
			HTML.shuffleButton.classList.add('enabled');
		}
		else if (state.audio.shuffle === 2) {
			HTML.shuffleButton.classList.add('enabled-2');
			HTML.shuffleButton.classList.add('enabled');
		}
	});

	HTML.backwardButton.addEventListener('click', () => songUI.playNextSong(state.selectedSong, -1, state.audio.shuffle));
	HTML.forwardButton.addEventListener('click', () => songUI.playNextSong(state.selectedSong, 1, state.audio.shuffle));

	HTML.pauseButton.addEventListener('click', () => pause() );
	HTML.playButton.addEventListener('click', () => play() );

	HTML.loopButton.addEventListener('click', () => {
		if (HTML.loopButton.classList.contains('enabled')) {
			HTML.loopButton.classList.remove('enabled');
			state.audio.looping = false;
		}
		else {
			HTML.loopButton.classList.add('enabled');
			state.audio.looping = true;
		}
		aud.setLoop(state.audio.looping);
	});

	// VOLUME EVENT LISTENERS

	// Opens the track below the timeline
	HTML.openTrackButton.addEventListener('click', () => {
		if (HTML.timelineDiv.classList.contains('opened-track')) {
			HTML.timelineDiv.classList.remove('opened-track');
			HTML.openTrackButton.classList.remove('enabled');
		}
		else {
			HTML.timelineDiv.classList.add('opened-track');
			HTML.openTrackButton.classList.add('enabled');

			// Wait until layout has been applied and then fit the canvas.
			// requestAnimationFrame ensures the DOM has updated layout.
			requestAnimationFrame(() => cnv.fitTrackCanvas());
		}
	});

	// When clicking volume line
	HTML.volumeLineContainer.addEventListener('mousedown', event => {
		if (event.button === 0) {
			event.preventDefault();
			state.dragging.volumeSpinner = true;
		}
	});
	
	// That thing when you click on the audio indicator and it mutes
	HTML.volumeIndicatorButton.addEventListener('click', () => {
		if (state.audio.volume === 0 && state.audio.lastManualVolume > 0) {
			state.audio.volume = state.audio.lastManualVolume;
		} else {
			state.audio.volume = 0;
		}
		aud.setVolume(state.audio.volume);
	});

	// EDIT EVENT LISTENERS

	HTML.editButton.addEventListener('click', () => {
		toggleEditMode();
	});
}