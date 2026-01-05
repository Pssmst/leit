import * as init from '../init.js';
import { state } from '../state/state.js';

export const MAX_CACHE_SIZE = 16;
export const audioCache = new Map();		// path -> Promise<AudioBuffer>

// Playback state to support pause/resume/seek
export let currentSource = null;
export let currentGainNode = null;
export const activeGainNodes = new Set();   // Keep track of all live gain nodes
export let playRequestId = 0;			   // Keep track of the most recent playMusic call
export let currentBuffer = null;
export let currentPath = null;
export let startedAt = 0;				   // init.audioContext.currentTime when playback started (adjusted for offset)
export let pausedAt = 0;					// Seconds into the track when paused
export let isPaused = false;

export let lastVolume = state.audio.lastManualVolume;
export let lastLoop = false;

// AUDIO CACHE CLOCK

let startTime = null;
export let timeSinceLastCacheUpdateAttempt = 0;
export const cacheUpdateThreshold = .2;

export function resetClock() {
	clearInterval();

	startTime = Date.now();
	setInterval(() => {
		timeSinceLastCacheUpdateAttempt = ((Date.now() - startTime) / 1000);
	}, 1);
}

////  ANALYSER  ////////////////////////////////////////////////////////////////////

// Single analyser reused for the AudioContext
export let analyser = null;
export let analyserFftSize = 4096;  // tune (COSTS MORE CPU) 1024..32768
export let analyserSmoothing = 0.6; // 0..1, larger = smoother between frames

function ensureAnalyser() {
	if (!init.audioContext) return null;
	if (!analyser) {
		analyser = init.audioContext.createAnalyser();
		analyser.fftSize = analyserFftSize;
		analyser.smoothingTimeConstant = analyserSmoothing;
	}
	return analyser;
}

// Helper to return typed array of waveform samples (Float32 between -1..1)
export function getWaveformFloat32(targetArray = null) {
	if (!analyser) return null;
	const bufferLen = analyser.fftSize;
	if (!targetArray || !(targetArray instanceof Float32Array) || targetArray.length !== bufferLen) {
		targetArray = new Float32Array(bufferLen);
	}
	analyser.getFloatTimeDomainData(targetArray);
	return targetArray;
}

////  AUDIO CONTEXT  ////////////////////////////////////////////////////////////////////

// Ensure audio context is running (unlocked by user gesture on some browsers)
async function ensureAudioContextIsRunning() {
	if (init.audioContext && init.audioContext.state === 'suspended') {
		try {
			await init.audioContext.resume();
		} catch (error) {
			console.warn('Failed to resume init.audioContext', error);
		}
	}
}

// Safely stop & disconnect current source (if any)
function stopCurrentSource() {
	if (!currentSource) return;
	try { currentSource.stop(); } catch (e) {}
	try { currentSource.disconnect(); } catch (e) {}

	// Also disconnect gain node if present
	if (currentGainNode) {
		try { currentGainNode.disconnect(); } catch (e) {}
		activeGainNodes.delete(currentGainNode);
		currentGainNode = null;
	}

	// Also disconnect any other tracked gain nodes just in case
	for (const g of Array.from(activeGainNodes)) {
		try { g.disconnect(); } catch (e) {}
		activeGainNodes.delete(g);
	}

	// Do not null analyser here (we reuse it), but disconnect it
	if (analyser) {
		try { analyser.disconnect(); } catch (e) {}
	}
	currentSource = null;
}


/**
 * Create a BufferSource -> (analyser) -> Gain -> destination chain and start it at `offset` seconds
 * Returns the created source and sets `startedAt`
 */
function createAndStartSource(buffer, offset = 0, { volume = 0.5, loop = false } = {}) {
	const source = init.audioContext.createBufferSource();
	source.buffer = buffer;
	source.loop = loop;

	const gainNode = init.audioContext.createGain();
	gainNode.gain.value = volume;

	// Track it
	activeGainNodes.add(gainNode);

	// Ensure analyser exists
	const aNode = ensureAnalyser();

	// Build chain: source -> analyser -> gain -> destination
	if (aNode) {
		try {
			source.connect(aNode);
			aNode.connect(gainNode);
		} catch (e) {
			// If connecting fails, connect source directly to gain
			try { source.connect(gainNode); } catch (err) {}
		}
	} else {
		source.connect(gainNode);
	}

	// Connect gain to destination
	try {
		gainNode.connect(init.audioContext.destination);
	} catch (e) {
		console.warn('Failed to connect gain to destination', e);
	}

	startedAt = init.audioContext.currentTime - offset;
	source.start(0, offset);

	currentSource = source;
	currentGainNode = gainNode; // Still keep this convenience pointer

	source.onended = () => {
		// Remove references for this source/gain when it finishes
		if (!loop && currentSource === source) {
			currentSource = null;
			currentGainNode = null;
		}
		// Make sure the gainNode is no longer tracked if it's still in the set
		try { gainNode.disconnect(); } catch (e) {}
		activeGainNodes.delete(gainNode);
	};

	// Remember last volume/loop for resume
	lastVolume = volume;
	lastLoop = loop;

	return source;
}

/**
 * Load & decode an audio file (cached). Returns Promise<AudioBuffer>
 * Caches the Promise so multiple loads share the same request/decoding
 */
export function loadAudio(path) {
	if (audioCache.has(path)) return audioCache.get(path);
	resetClock();

	const p = (async () => {
		const resp = await fetch(path);
		const arrayBuffer = await resp.arrayBuffer();

		// decodeAudioData can be promise-based or callback-based across browsers
		try {
			return await init.audioContext.decodeAudioData(arrayBuffer.slice(0));
		} catch (err) {
			return await new Promise((resolve, reject) => {
				init.audioContext.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
			});
		}
	})();

	audioCache.set(path, p);

	if (audioCache.size > MAX_CACHE_SIZE) {
		// Delete oldest entry
		audioCache.delete(audioCache.keys().next().value);
	}

	return p;
}

/**
 * Play a track from `start` seconds (default 0)
 * Returns { startedAt, duration }
 */
export async function playMusic(path, volume = 0, loop = false, start = 0) {
	const requestId = ++playRequestId;
	await ensureAudioContextIsRunning();

	// Stop previous playback
	stopCurrentSource();
	try {
		const audioBuffer = await loadAudio(path);
		const duration = audioBuffer.duration;

		// Abort if a newer playMusic call started
		if (requestId !== playRequestId) {
			console.warn('Aborting outdated playMusic call');
			return { startedAt: null, duration: null };
		}

		currentBuffer = audioBuffer;
		currentPath = path;

		createAndStartSource(audioBuffer, start, { volume, loop });
		isPaused = false;
		pausedAt = 0;

		return { startedAt, duration };
	}
	catch (err) {
		console.error('Sound load/play error:', err);
		throw err;
	}
}

/**
 * Pause playback and remember position. No-op if already paused or nothing playing.
 * Returns the paused position (seconds) or null.
 */
export function pauseMusic() {
	if (!currentSource || isPaused) return null;
	pausedAt = init.audioContext.currentTime - startedAt;
	stopCurrentSource();
	isPaused = true;
	return pausedAt;
}

export function setVolume(volume) {
	if (!currentGainNode) return null;
	currentGainNode.gain.value = volume;
	lastVolume = volume;
}

export function setLoop(loop) {
	if (!currentSource) return null;
	currentSource.loop = loop;
	lastLoop = loop;
}

/**
 * Resume playback. If playback was not paused, this is a no-op.
 * Optional volume/loop override; defaults to previous values.
 */
export async function resumeMusic(volume, loop) {
	if (!isPaused || !currentBuffer) return null;

	await ensureAudioContextIsRunning();

	const v = (typeof volume === 'number') ? volume : lastVolume;
	const l = (typeof loop === 'boolean') ? loop : lastLoop;

	createAndStartSource(currentBuffer, pausedAt, { volume: v, loop: l });
	isPaused = false;
	pausedAt = 0;

	return { startedAt };
}

// Stop playback and reset playback state.
export function stopMusic() {
	stopCurrentSource();
	pausedAt = 0;
	isPaused = false;
	currentBuffer = null;
	currentPath = null;
}

// Return current playback time in seconds (respects paused state).
export function getPlaybackTime() {
	if (!currentBuffer) return 0;
	return isPaused ? pausedAt : (init.audioContext.currentTime - startedAt);
}

// Return whether playback is currently paused.
export function isPlaybackPaused() {
	return isPaused;
}

/**
 * Seek to `seconds` into the current track.
 * If `playImmediately` is true the track will start playing from that time.
 * If false, the playback position is updated but playback stays paused/stopped.
 * Returns { soughtTo, startedAt?, duration } or null on failure.
 */
export async function setPlaybackTime(seconds, playImmediately = true, { volume = undefined, loop = undefined } = {}) {
	// Make sure there's a buffer (try to load if there's a known path)
	if (!currentBuffer) {
		if (!currentPath) return null;
		currentBuffer = await loadAudio(currentPath);
	}

	const duration = currentBuffer.duration;
	const s = Math.max(0, Math.min(seconds, duration)); // Clamp to 0-duration

	if (playImmediately) {
		await ensureAudioContextIsRunning();

		stopCurrentSource();

		const v = (typeof volume === 'number') ? volume : lastVolume;
		const l = (typeof loop === 'boolean') ? loop : lastLoop;

		createAndStartSource(currentBuffer, s, { volume: v, loop: l });
		isPaused = false;
		pausedAt = 0;
		return { soughtTo: s, startedAt, duration: duration };
	}

	// Update paused position without starting
	stopCurrentSource();
	pausedAt = s;
	isPaused = true;
	// Keep startedAt coherent for future resume
	startedAt = init.audioContext.currentTime - pausedAt;

	return { soughtTo: s, duration: duration };
}
