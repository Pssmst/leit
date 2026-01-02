import { state }				from '../../state/state.js';
import { colors }				from '../../state/colors.js';

import * as init				from '../../init.js';
import * as HTML				from '../../state/elements.js';
import * as cnv					from '../canvas.js';
import * as helpers				from '../../helpers.js';
import * as motifRegistry		from '../../motif.js';
import * as aud					from '../../audio/audio.js';
import * as render				from '../../render/render.js';
import * as textures			from '../../render/textures.js';
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


	// DEBUG 4: Audio variables
	
	let audioCacheString = '';

	// Iterate through audioCache and log fake IDs of format AlbumID.SongID to look cool in the debug menu
	if (state.debug.visuals[3]) {
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
	drawDebug(3,
		`\nAudioCache (${aud.MAX_CACHE_SIZE}): [${audioCacheString}`
		+ `\nLast AudioCache Update Attempt: ${aud.timeSinceLastCacheUpdateAttempt.toFixed(2)} seconds ago (Threshold: ${aud.cacheUpdateThreshold}s)`
		+ `\nElapsed Time: ${state.audio.elapsed.toFixed(2)} seconds`
		+ `\nVolume: ${state.audio.volume}`,
		colors.debug.visual4
	);

	// DEBUG 5: Hitboxes

	drawDebug(4, '\nShow hitboxes activated', colors.debug.visual5);
}