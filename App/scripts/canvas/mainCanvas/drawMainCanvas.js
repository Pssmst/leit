import { state }			from '../../state/state.js';
import { colors }			from '../../state/colors.js';
import { layout }			from '../../state/layout/layout.js';

import * as init			from '../../init.js';
import * as HTML			from '../../ui/elements.js';
import * as cnv				from '../canvas.js';
import * as helpers			from '../../helpers.js';
import * as motifRegistry	from '../../motif.js';
import * as aud				from '../../audio/audio.js';
import * as render			from '../render.js';
import * as textures		from '../../ui/textures.js';
import * as songUI			from '../../ui/song.js';
import * as debug			from './debug.js';
import * as discography		from '../../discography.js';

function drawAddSongContainer(x, y, albumObj, discID, type = "square") {
	const pos = state.pos.mainCanvas;

	const sideLen = layout.mainCanvas.album.forcedDimension * layout.mainCanvas.album.scale;
	const plusPadding = sideLen * .18;
	const borderOffset = layout.mainCanvas.album.outlineOffset;

	const circleX = x + sideLen / 2;
	const circleY = y + sideLen / 2;
	const radius = sideLen / 2 * 1.15;

	const color = (HTML.bigCoverOverlay.classList.contains('active') ? colors.transparent : colors.albumText);
	
	// Draw container
	if (type === "circle") {
		render.drawCircle(cnv.ctx, x + sideLen / 2, y + sideLen / 2, radius, colors.edit.newSong);
	}
	else {
		render.drawRect(cnv.ctx, x, y, sideLen, sideLen, colors.edit.newSong);
	}
	// Draw plus
	render.drawLine(cnv.ctx, x + plusPadding, y + sideLen / 2, x + sideLen - plusPadding, y + sideLen / 2, colors.edit.newSongPlus, sideLen * .075);
	render.drawLine(cnv.ctx, x + sideLen / 2, y + plusPadding, x + sideLen / 2, y + sideLen - plusPadding, colors.edit.newSongPlus, sideLen * .075);

	// If hovering over addSongContainer
	if (
		(type === "circle") 
			? Math.sqrt((pos.x - circleX)**2 + (pos.y - circleY)**2) <= radius
			: (pos.x >= x) && (pos.x <= x + sideLen) && (pos.y >= y) && (pos.y <= y + sideLen)
	) {
		cnv.canvas.style.cursor = 'pointer';
		state.hovering.addSongContainer = true;
		
		if (type === "circle") {
			render.drawCircleBorder(cnv.ctx, circleX, circleY, radius + borderOffset, color, 2);
		}
		else {
			render.drawBorder(cnv.ctx, x - borderOffset, y - borderOffset, sideLen + borderOffset * 2, sideLen + borderOffset * 2, color, 2);
		}

		// Set parent album to current album name
		if (albumObj && !state.edit.placingSong) {
			state.edit.parentAlbumFileName = albumObj.fileName;
		}
		// Set parent album to new album name, based on defaultAlbumName
		else {
			// Use the base default name without any trailing digits to avoid repeatedly appending numbers (which caused names like "Name0", "Name00", ...)
			const baseDefaultName = ("Album").replace(/\d+$/, '');

			let duplicateDefaultNames = true;
			let newDefaultName = '';
			let i = 1;

			while (duplicateDefaultNames) {
				duplicateDefaultNames = false;
				newDefaultName = `${baseDefaultName} ${i}`;

				// Check for any instance of the newDefaultName in albums
				for (const album of discography.albums) {
					if (album.fileName === newDefaultName) {
						duplicateDefaultNames = true;
						break;
					}
				}
				i++;
			}
			if (!state.edit.placingSong) {
				state.edit.parentAlbumFileName = newDefaultName;
				state.edit.parentDiscID = 1;
			}
		}
		if (!state.edit.placingSong) state.edit.parentDiscID = discID;
	}
}

export function drawMainCanvas() {
	cnv.ctx.clearRect(0, 0, cnv.canvas.width, cnv.canvas.height);
	debug.calculateFPS();
	
	///////  ALBUMS  ////////////////////////////////////////////////////

	let yOffset = 40;
	let xOffset = 0;

	// Center plus at middle of screen
	if (discography.albums.length === 0) {
		state.dragging.pos.x = (window.innerWidth / 2) - yOffset;
		state.dragging.pos.y = (window.innerHeight / 2) - 80;
		//render.drawLine(cnv.ctx, window.innerWidth/2, 0, window.innerWidth/2, window.innerHeight);
		//render.drawLine(cnv.ctx, 0, window.innerHeight/2, window.innerWidth, window.innerHeight/2);
	}

	const yIncrement = layout.mainCanvas.album.actualDimension + layout.mainCanvas.album.yGap;
	state.hovering.addSongContainer = false;
	state.hovering.songContainer = false;

	// For rendering loaded songs
	let audioCachePathList = [];
	for (const [bufferKey, bufferValue] of aud.audioCache) {
		audioCachePathList.push(bufferKey);
	}

	for (const album of discography.albums) {
		// Draw title
		render.drawText(cnv.ctx, album.fileName, {
			x: state.dragging.pos.x,
			y: yOffset + state.dragging.pos.y - state.font.size.default * 4.2,
			fontSize: state.font.size.default * 1.8,
			color: colors.albumText,
		});

		for (const disc of album.discs) {
			xOffset = 0;

			for (const song of disc.songs) {
				if (!song) return;

				// New image object rather than song.cover
				const imgObject = textures.get(song.cover);
				
				// Assign song position for hitbox detection
				song.x = xOffset + state.dragging.pos.x;
				song.y = yOffset + state.dragging.pos.y;
				const forcedDim = layout.mainCanvas.album.forcedDimension;
				const currentScale = layout.mainCanvas.album.scale;

				// Use forced width, otherwise fallback to natural image width
				song.projectedWidth = (forcedDim !== null) 
					? layout.mainCanvas.album.actualDimension 
					: (imgObject.width * currentScale);

				// Draw song border based on whether it's being hovered, pressed, or currently playing
				let borderColor = null;
				if (state.hovering.mainCanvas && song === state.hoveredSong) {
					borderColor = state.pressedSong ? colors.song.border.pressed : colors.song.border.hovered;
				}
				// Overrides hover/press
				if (song === state.selectedSong) {
					borderColor = colors.song.border.selected;
				}

				if (borderColor) {
					render.drawBorder(
						cnv.ctx,
						song.x - layout.mainCanvas.album.outlineOffset,
						song.y - layout.mainCanvas.album.outlineOffset,
						song.projectedWidth + 2 * layout.mainCanvas.album.outlineOffset,
						song.projectedWidth + 2 * layout.mainCanvas.album.outlineOffset,
						borderColor, 2
					);
				}

				// Draw album cover
				render.drawImage(cnv.ctx, imgObject, {
					x: song.x,
					y: song.y,
					scale: currentScale,
					forcedWidth: forcedDim,
					forcedHeight: forcedDim,
				});

				// Draw little "loaded" indicators on songs to indicate loaded status
				if (state.debug.visuals.audio) {
					if (audioCachePathList.includes(song.path)) {
						render.drawCircle(
							cnv.ctx,
							song.x + layout.mainCanvas.album.actualDimension / 10,
							song.y + layout.mainCanvas.album.actualDimension / 10,
							layout.mainCanvas.album.actualDimension / 8,
							colors.debug.loadedAudio.loaded,
							{ strokeColor: colors.debug.loadedAudio.border }
						);
					}
					else {
						render.drawCircle(
							cnv.ctx,
							song.x + layout.mainCanvas.album.actualDimension / 10,
							song.y + layout.mainCanvas.album.actualDimension / 10,
							layout.mainCanvas.album.actualDimension / 8,
							colors.debug.loadedAudio.unloaded,
							{ strokeColor: colors.debug.loadedAudio.border}
						);
					}
				}
				
				let nameStr = helpers.truncateString(cnv.ctx, song.name, song.projectedWidth);
				render.drawText(cnv.ctx, nameStr, {
					x: song.x + (song.projectedWidth - render.getTextWidth(cnv.ctx, nameStr)) / 2,
					y: song.y - state.font.size.default * 1.4 
				});

				xOffset += (song.projectedWidth + layout.mainCanvas.album.xGap);
			}

			// Draw addSongContainer at end of current disc
			if (state.edit.editMode) drawAddSongContainer(xOffset + state.dragging.pos.x, yOffset + state.dragging.pos.y, album, disc.id);
			yOffset += yIncrement;
		}

		// Draw addSongContainer at bottom of album
		if (state.edit.editMode) {
			drawAddSongContainer(state.dragging.pos.x, yOffset + state.dragging.pos.y, album, album.discs.length + 1);
			yOffset += yIncrement;
		}
		yOffset += yIncrement;
	}

	// Draw addSongContainer at bottom of discography to add a new album (circle-shaped)
	if (state.edit.editMode) drawAddSongContainer(state.dragging.pos.x, yOffset + state.dragging.pos.y, null, 1, "circle");
	if (discography.albums.length > 0) {
		yOffset += yIncrement;
	}

	///////  TIMELINE  ////////////////////////////////////////////////////

	// Render HTML.spinner and line
	if (state.selectedSong != null) {
		const lineRect = HTML.line.getBoundingClientRect();
		state.audio.elapsed = Math.min(aud.getPlaybackTime(), state.selectedSong.duration); // Ask audio module what the current playback time is (respects pause)

		// Load next song if the HTML.spinner is at least 1/4 of the way through the song
		if (state.settings.canPreloadSongs && state.audio.elapsed >= 5 || state.audio.elapsed >= state.selectedSong.duration / 4) {
			const loadedSongPrev = songUI.getNextSong(state.selectedSong, -1, 0);
			const loadedSongNext = songUI.getNextSong(state.selectedSong, 1, 0);

			if (loadedSongPrev) {
				aud.loadAudio(loadedSongPrev.path);
			}
			if (loadedSongNext) {
				aud.loadAudio(loadedSongNext.path);
			}
		}

		let elapsedDivText;
		let remainingDivText;

		// Compute the percentage that the HTML.spinner resides on
		if (state.dragging.timelineSpinner) {
			state.audio.elapsedPercent = helpers.clamp(
				0,
				(state.pos.mainCanvas.x - lineRect.left) / lineRect.width,
				1
			);

			state.audio.elapsedPercentInTime = state.selectedSong.duration * state.audio.elapsedPercent;

			elapsedDivText = helpers.secondsToTimestamp(state.audio.elapsedPercentInTime);
			remainingDivText = `-` + helpers.secondsToTimestamp(state.selectedSong.duration - state.audio.elapsedPercentInTime);
		}
		else {
			state.audio.elapsedPercent = helpers.clamp(
				0,
				state.audio.elapsed / state.selectedSong.duration,
				1
			);

			elapsedDivText = helpers.secondsToTimestamp(state.audio.elapsed);
			remainingDivText = `-` + helpers.secondsToTimestamp(state.selectedSong.duration - state.audio.elapsed);
		}

		if (state.loading) {
			elapsedDivText = '0:00';
			remainingDivText = '-0:00';
			state.audio.elapsedPercent = 0;
		}

		HTML.elapsedDiv.textContent = elapsedDivText;
		HTML.remainingDiv.textContent = remainingDivText;
		
		// Compute HTML.spinner position along the timeline
		let xPos = (state.loading && !state.dragging.timelineSpinner ? 0 : state.audio.elapsedPercent * lineRect.width) - HTML.spinner.offsetWidth / 2;

		HTML.spinner.style.left = `${xPos}px`;
		document.documentElement.style.setProperty('--color-line-gradient', `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${state.audio.elapsedPercent*100}%, var(--color-line-unplayed) ${state.audio.elapsedPercent*100}%, var(--color-line-unplayed) 100%)`);

		///////  VOLUME LINE  ////////////////////////////////////////////////////

		if (state.dragging.volumeSpinner && state.selectedSong && !state.loading) {
			aud.setVolume(state.audio.volume);
		}

		// Render volume HTML.spinner and line
		const volumeLineRect = HTML.volumeLine.getBoundingClientRect();

		// Compute the percentage that the volume HTML.spinner resides on
		if (state.dragging.volumeSpinner) {
			state.audio.volume = helpers.clamp(
				0,
				(state.pos.mainCanvas.x - volumeLineRect.left) / volumeLineRect.width,
				1
			);
		}

		// Indicate volume through icon
		HTML.volumeIndicatorButton.classList.remove('fa-volume-mute', 'fa-volume-off', 'fa-volume-low', 'fa-volume-high');
		if (state.audio.volume === 1) {
			HTML.volumeIndicatorButton.classList.add('fa-volume-high');
		}
		else if (state.audio.volume > 0) {
			HTML.volumeIndicatorButton.classList.add('fa-volume-low');
		}
		else {
			HTML.volumeIndicatorButton.classList.add('fa-volume-mute');
		}
		
		const volumeXPos = state.audio.volume * volumeLineRect.width - HTML.spinner.offsetWidth / 2; // Compute HTML.spinner position along the timeline
		HTML.volumeSpinner.style.left = `${volumeXPos}px`;
		HTML.volumeLine.style.backgroundImage = `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${state.audio.volume*100}%, var(--color-line-unplayed) ${state.audio.volume*100}%, var(--color-line-unplayed) 100%)`;

		///  CHECKS

		if (state.audio.elapsed === state.selectedSong.duration) {
			if (state.audio.looping) {
				aud.setElapsed(0);
			}
			else {
				songUI.playNextSong(state.selectedSong, 1, state.audio.shuffle);
			}
		}
	}

	///////  SONG STRUCTURE (Includes structureString)  ////////////////////////////////////////////////////

	if (!state.selectedSong || state.loading) {
		state.debug.structureString = `\nN/A`;
	}

	// If structure exists
	else {
		if (state.selectedSong.structure && state.selectedSong.structure.length > 0) {
			
			// Last index i such that state.structure.startTimesOfEachStruct[i] <= state.audio.elapsed
			let currentStructIndex = 0;
			while (currentStructIndex + 1 < state.structure.startTimesOfEachStruct.length && state.audio.elapsed >= state.structure.startTimesOfEachStruct[currentStructIndex + 1]) {
				currentStructIndex++;
			}

			state.structure.currentStructInfo = state.selectedSong.structure[currentStructIndex][1];
			
			// Get resources to update state.font script variables using the current struct
			state.structure.durations = songUI.getStructDurations(state.structure.currentStructInfo);

			// Get state.audio.elapsed info for the current structure entry
			const currentStructElapsed = Math.max(0, state.audio.elapsed - state.structure.startTimesOfEachStruct[currentStructIndex]);
			const currentStructMeasuresElapsed = Math.floor(currentStructElapsed / state.structure.durations.durationOfMeasure);

			// Set state.font script variables
			state.structure.timeWithinMeasure = currentStructElapsed % state.structure.durations.durationOfMeasure;
			state.structure.currentMeasure = state.selectedSong.structure[currentStructIndex][0] + currentStructMeasuresElapsed;
			state.structure.currentBeat = Math.floor(state.structure.timeWithinMeasure / state.structure.durations.durationOfBeat) + 1;

			// Sum full spans between each consecutive struct to get the total number of measures up to the last struct
			let countMeasures = 0;
			for (let i = 0; i < state.selectedSong.structure.length - 1; i++) {
				const thisMeasure = state.selectedSong.structure[i][0];
				const nextMeasure = state.selectedSong.structure[i+1][0];
				const span = nextMeasure - thisMeasure;
				countMeasures += Math.max(0, span);
			}

			// Determine how many measures there are after the last struct begins
			const lastStructIndex = state.selectedSong.structure.length - 1;
			const lastStructMeasureDuration = songUI.getStructDurations(state.selectedSong.structure[lastStructIndex][1]).durationOfMeasure;

			// How many full measures since the last struct started
			const secondsFromLastStructToSongEnd = Math.max(0, state.selectedSong.duration - (state.structure.startTimesOfEachStruct[lastStructIndex] || 0));
			const fullMeasuresSinceStructStart = Math.floor(secondsFromLastStructToSongEnd / lastStructMeasureDuration);
			
			const startTimeOfLastMeasure = (state.structure.startTimesOfEachStruct[lastStructIndex] || 0) + (fullMeasuresSinceStructStart * lastStructMeasureDuration);
			const lastMeasureDuration = state.selectedSong.duration - startTimeOfLastMeasure;

			// If the last measure's length in seconds is less than THIS fraction of seconds of a whole measure, don't include it
			const totalMeasureFraction = 0.1;
			let lastStructTotalMeasures = Math.max(0, fullMeasuresSinceStructStart+1);
			if (lastMeasureDuration < lastStructMeasureDuration * totalMeasureFraction) {
				lastStructTotalMeasures--;
			}

			// Set total number of measures
			state.selectedSong.totalMeasures = countMeasures + lastStructTotalMeasures;

			// Write debug info
			state.debug.structureString = `\nMEASURE: ${state.structure.currentMeasure} of ${state.selectedSong.totalMeasures}\nBEAT: ${state.structure.currentBeat}\nBPM: ${state.structure.currentStructInfo.bpm}\nTIME SIGNATURE: ${state.structure.durations.timeSignature.numerator}/${state.structure.durations.timeSignature.denominator}`;
			//state.debug.structureString += `\nLength of true last measure: ${lastMeasureDuration.toFixed(3)}s (${(lastMeasureDuration / lastStructMeasureDuration * 100).toFixed(3)}% < ${totalMeasureFraction * 100}%)`;
		}
		else {
			state.debug.structureString = `\nN/A`;
		}
	}

	///////  DEBUG  ////////////////////////////////////////////////////

	debug.renderDebug();
	state.debug.frame++;
}