import { state }				from '../../state/state.js';
import { colors }				from '../../state/colors.js';
import { layout }				from '../../state/layout/layout.js';

import * as init				from '../../init.js';
import * as HTML				from '../../ui/elements.js';
import * as cnv					from '../canvas.js';
import * as helpers				from '../../helpers.js';
import * as motifRegistry		from '../../motif.js';
import * as colorHandle			from '../../ui/colorHandling.js';
import * as aud					from '../../audio/audio.js';
import * as render				from '../render.js';
import * as textures			from '../../ui/textures.js';
import * as discography			from '../../discography.js';


export function calculateFPS() {
	if (!window._lastFpsTime) window._lastFpsTime = performance.now();
	if (!window._lastFpsFrame) window._lastFpsFrame = state.debug.frame;
	const now = performance.now();
	if (now - window._lastFpsTime > 500) {
		state.debug.fps = ((state.debug.frame - window._lastFpsFrame) / ((now - window._lastFpsTime) / 1000)).toFixed(0);
		window._lastFpsTime = now;
		window._lastFpsFrame = state.debug.frame;
		window._lastFpsValue = state.debug.fps;
	} else {
		state.debug.fps = window._lastFpsValue || "0";
	}
}


function drawDebug(debugID, debugText, color) {
	if (!state.debug.visuals[debugID]) return;

	const lineCount = debugText.split('\n').length;
	render.drawRect(cnv.ctx, 0, state.font.size.default * state.debug.debugLines, cnv.canvas.width, state.font.size.default * lineCount, 'rgba(0, 0, 0, 0.8)');
	render.drawText(cnv.ctx, debugText, { font: state.font.debug, y: state.font.size.default * state.debug.debugLines, color: color, verticalSpacing: 1 });

	state.debug.debugLines += lineCount; // Advance the shared counter
}


export function renderDebug() {
	state.debug.debugLines = 0;

	// DEBUG 1: Frames per second & last key pressed

	drawDebug(0, `FPS: ${state.debug.fps} | KEY: ${state.debug.lastKeyPressed}`, colors.debug.visual1);


	// DEBUG 2: States
	
	drawDebug(1, JSON.stringify(state, null, 4), colors.debug.visual2);

	
	// DEBUG 3: Colors

	drawDebug(2, JSON.stringify(colors, null, 4), colors.debug.visual3);


	// DEBUG 4: Layout

	drawDebug(3, JSON.stringify(layout, null, 4), colors.debug.visual4);


	// DEBUG 5: Audio variables
	
	let audioCacheString = '';

	// Iterate through audioCache and log fake IDs of format AlbumID.SongID to look cool in the debug menu
	if (state.debug.visuals[4]) {
		let i = 0;
		for (const [bufferKey, bufferValue] of aud.audioCache) {
			const bufferSong = init.songsDict[bufferKey];
			for (const album of discography.albums) {
				if (album.name === bufferSong.album) {
					audioCacheString += ` ${album.id}'${String(bufferSong.id[0]).padStart(2, '0')} ${i === aud.MAX_CACHE_SIZE-1 ? ']' : '🡐'}`;
				}
			}
			i++;
		}
	}
	drawDebug(4,
		`\nAudioCache (${aud.MAX_CACHE_SIZE}): [${audioCacheString}`
		+ `\nLast AudioCache Update Attempt: ${aud.timeSinceLastCacheUpdateAttempt.toFixed(2)} seconds ago (Threshold: ${aud.cacheUpdateThreshold}s)`
		+ `\nElapsed Time: ${state.audio.elapsed.toFixed(2)} seconds`
		+ `\nVolume: ${state.audio.volume}`,
		colors.debug.visual5
	);

	// DEBUG 6: Hitboxes

	drawDebug(5, '\nShow hitboxes activated', colors.debug.visual6);

	// DEBUG 7: Motif Colors

	const rows = 30;
	const cols = 30;

	drawDebug(6, `\nGrid of possible motif colors:\n${rows} rows, ${cols} cols\nhue: ${motifRegistry.minHue} to ${motifRegistry.maxHue}\nsat: ${motifRegistry.minSat}% to ${motifRegistry.maxSat}%\nval: ${motifRegistry.minVal}% to ${motifRegistry.maxVal}%`, colors.debug.visual7);

	if (state.debug.visuals[6]) {
		const yOffset = state.debug.debugLines * state.font.size.default + 20;
		const boxLength = 20;
		const boxSpacing = 1;
		let hovering = false;

		// Draw a grid of motifs colors from hsv
		for (let i = 0; i < rows; i++) {
			// clamp to motifRegistry.maxHue etc
			for (let j = 0; j < cols; j++) {
				if (
					state.pos.mainCanvas.x >= j*boxLength &&
					state.pos.mainCanvas.x <= j*boxLength + boxLength - boxSpacing &&
					state.pos.mainCanvas.y >= i*boxLength + yOffset &&
					state.pos.mainCanvas.y <= i*boxLength + yOffset + boxLength - boxSpacing
				) {
					hovering = true;
				}
				const hue = Math.floor((i / rows) * (motifRegistry.maxHue - motifRegistry.minHue) + motifRegistry.minHue);
				const sat = Math.floor((j / cols) * (motifRegistry.maxSat - motifRegistry.minSat) + motifRegistry.minSat);
				const val = Math.floor((j / cols) * (motifRegistry.maxVal - motifRegistry.minVal) + motifRegistry.minVal);

				const { color, highlight, text } = motifRegistry.createMotifColors(hue, sat, val);

				const x = j * boxLength;
				const y = i * boxLength + yOffset;
				const width = boxLength - boxSpacing;
				const height = boxLength - boxSpacing;

				if (hovering) {
					cnv.trackCanvas.style.cursor = 'pointer';
					
					render.drawRect(cnv.ctx, x, y, width, height,
						color, {
							shadow: {
								inner: true,
								shadowColor: highlight,
								shadowBlur: height,
								left: false, right: false, top: false
							}
						}
					);
					render.drawBorder(cnv.ctx, x, y, width, height, highlight);

					hovering = false;
				}
				else {
					render.drawRect(cnv.ctx, x, y, width, height,
						color, {
							shadow: {
								inner: false,
								shadowColor: colors.trackCanvas.timeline.shadow,
								shadowBlur: 4
							}
						}
					);
				}
			}
		}
	}
}