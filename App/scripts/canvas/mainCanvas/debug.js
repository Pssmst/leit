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

///////////////////////////////////////////////////////////////////////////////////////////

export const DEBUG_ORDER = [
	{ key: 'fps',			color: colors.debug.visuals.fps,			hotkey: "Digit1" },
	{ key: 'audio',			color: colors.debug.visuals.audio,			hotkey: "Digit2" },
	{ key: 'showHitboxes',	color: colors.debug.visuals.showHitboxes,	hotkey: "Digit3" },
	{ key: 'motifPalette',	color: colors.debug.visuals.motifPalette,	hotkey: "Digit4" },

	{ key: 'states',		color: colors.debug.visuals.states,			hotkey: "Digit8" },
	{ key: 'colors',		color: colors.debug.visuals.colors,			hotkey: "Digit9" },
	{ key: 'layout',		color: colors.debug.visuals.layout,			hotkey: "Digit0" },
];

///////////////////////////////////////////////////////////////////////////////////////////

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

///////////////////////////////////////////////////////////////////////////////////////////

const TOKEN = {
	NUMBER: 'number',
	BOOL: 'bool',
	STRING: 'string',
	COLOR:  'color',
	OTHER:  'other',
};

// Matches rgb(...), rgba(...), hsl(...), hsla(...), #hex
const COLOR_REGEX = /^(rgba?\s*\([^)]+\)|hsla?\s*\([^)]+\)|#[0-9a-fA-F]{3,8})/;

function tokenizeLine(line) {
	const tokens = [];
	let i = 0;

	while (i < line.length) {
		// Number
		const numMatch = line.slice(i).match(/^-?\d+(\.\d+)?([eE][+-]?\d+)?/);
		if (numMatch && (i === 0 || /[\s:,\[]/.test(line[i - 1]))) {
			tokens.push({ text: numMatch[0], type: TOKEN.NUMBER });
			i += numMatch[0].length;
			continue;
		}

		// Keyword literals (true, false, null, undefined)
		const kwMatch = line.slice(i).match(/^(true|false|null|undefined)/);
		if (kwMatch && (i === 0 || /[\s:,\[]/.test(line[i - 1]))) {
			tokens.push({ text: kwMatch[0], type: TOKEN.BOOL });
			i += kwMatch[0].length;
			continue;
		}

		// Quoted string value
		if (line[i] === '"') {
			let j = i + 1;
			while (j < line.length && !(line[j] === '"' && line[j - 1] !== '\\')) j++;
			const raw = line.slice(i, j + 1);
			const inner = line.slice(i + 1, j);

			const colorMatch = inner.match(COLOR_REGEX);
			if (colorMatch) {
				// No opening quote pushed
				tokens.push({ text: colorMatch[0], type: TOKEN.COLOR, colorValue: colorMatch[0] });
				const remainder = inner.slice(colorMatch[0].length);
				if (remainder) tokens.push({ text: remainder, type: TOKEN.STRING });
				// No closing quote pushed
			} else {
				tokens.push({ text: raw, type: TOKEN.STRING });
			}

			i = j + 1;
			continue;
		}

		// Everything else
		tokens.push({ text: line[i], type: TOKEN.OTHER });
		i++;
	}

	return tokens;
}


// `baseColor` is the section color used for non-token characters
function tokenizeJSON(obj, baseColor) {
	const raw = JSON.stringify(obj, null, 4);
	return raw.split('\n').map(line => ({
		tokens: tokenizeLine(line),
		baseColor,
	}));
}

// Tokenized line renderer
const colorBoxSize = 10; // in pixels

function drawTokenizedLine(ctx, tokenizedLine, x, y) {
	ctx.font = `normal ${state.font.size.default}px ${state.font.debug}`;
	ctx.textBaseline = 'top';

	let cursorX = x;

	for (const token of tokenizedLine.tokens) {
		let fillColor = colors.debug.tokens.other;

		switch (token.type) {
			case TOKEN.NUMBER: fillColor = colors.debug.tokens.number; break;
			case TOKEN.BOOL:   fillColor = colors.debug.tokens.bool;   break;
			case TOKEN.STRING: fillColor = colors.debug.tokens.string; break;
			case TOKEN.COLOR:  fillColor = colors.debug.tokens.color;  break;
			default:		   fillColor = token.baseColor ?? tokenizedLine.baseColor ?? colors.debug.tokens.other; break;
		}

		if (token.type === TOKEN.COLOR && token.colorValue) {
			cursorX += ctx.measureText('"').width;

			const colorBoxY = y + 1;
			ctx.fillStyle = token.colorValue;
			ctx.fillRect(cursorX, colorBoxY, colorBoxSize, colorBoxSize);
			ctx.strokeStyle = colors.white;
			ctx.lineWidth = 0.5;
			ctx.strokeRect(cursorX, colorBoxY, colorBoxSize, colorBoxSize);
			cursorX += colorBoxSize + 3;
		}

		ctx.fillStyle = fillColor;
		ctx.fillText(token.text, cursorX, y);
		cursorX += ctx.measureText(token.text).width;
	}
}

///////////////////////////////////////////////////////////////////////////////////////////

const terminalLines = [];

function pushTokenizedLines(tokenizedLines) {
	for (const line of tokenizedLines) {
		terminalLines.push(line);
	}
}

function pushTerminalLines(text, color) {
	for (const line of text.split('\n')) {
		terminalLines.push({ text: line, color });
	}
}

export function getTerminalVisibleLines() {
	const reservedRows = state.debug.visuals.fps ? 1 : 0;
	return Math.floor((cnv.canvas.height * 0.75) / state.font.size.default) - reservedRows;
}

export function handleTerminalScroll(key) {
	const anyActive = Object.values(state.debug.visuals).some(Boolean);
	if (!anyActive) return;

	const visibleLines = getTerminalVisibleLines();
	const bodyLength   = state.debug.visuals.fps ? state.debug.terminalTotalLines - 1 : state.debug.terminalTotalLines;
	const maxScroll	= Math.max(0, bodyLength - visibleLines);

	if (key === 'ArrowUp') {
		state.debug.terminalScrollOffset = Math.max(0, state.debug.terminalScrollOffset - 1);
	} else if (key === 'ArrowDown') {
		state.debug.terminalScrollOffset = Math.min(maxScroll, state.debug.terminalScrollOffset + 1);
	}
}

export function renderDebug() {
	const anyActive = Object.values(state.debug.visuals).some(Boolean);
	if (!anyActive) {
		state.debug.terminalScrollOffset = 0;
		return;
	}

	// Clear buffer each frame
	terminalLines.length = 0;

	// FPS & last key
	if (state.debug.visuals.fps) {
		terminalLines.push({
			text: `FPS:${state.debug.fps} / KEY:${state.debug.lastKeyPressed} / `,
			color: colors.debug.visuals.fps
		});

		// Remove the last line and re-push it with the colored indicators appended
		const baseLine = terminalLines.pop();
		terminalLines.push({
			tokens: [
				// Re-emit the plain prefix as a single OTHER token
				{ text: baseLine.text, type: TOKEN.OTHER },
				// One token per visual indicator
				...DEBUG_ORDER.map(({ key, color }) => ({
					text:	  state.debug.visuals[key] ? '#' : '–',
					type:	  TOKEN.OTHER,
					baseColor: color,
				})),
			],
			baseColor: colors.debug.visuals.fps,
		});
	}

	// Audio
	if (state.debug.visuals.audio) {
		let audioCacheString = '';
		let i = 0;
		for (const [bufferKey] of aud.audioCache) {
			const bufferSong = discography.songsDict[bufferKey];
			if (bufferSong) {
				const albumId  = String(bufferSong.id.parentAlbum).padStart(2, '0');
				const songId   = String(bufferSong.id.album).padStart(2, '0');
				const isLast   = i === aud.MAX_CACHE_SIZE - 1;
				audioCacheString += `\n  ${("0" + (i+1)).slice(-2)}: ${albumId}'${songId} - ${bufferSong.name}`;
			}
			i++;
		}

		pushTerminalLines(
			`\nAudioCache (${aud.audioCache.size}/${aud.MAX_CACHE_SIZE}): [${audioCacheString}\n]`
			+ `\nLast Cache Update: ${aud.timeSinceLastCacheUpdateAttempt.toFixed(3)}s ago (Threshold: ${aud.cacheUpdateThreshold}s)`
			+ `\nElapsed Time: ${state.audio.elapsed.toFixed(2)}s`
			+ `\nVolume: ${state.audio.volume}`,
			colors.debug.visuals.audio
		);
	}

	// Show hitboxes
	if (state.debug.visuals.showHitboxes) {
		pushTerminalLines('\nShow hitboxes activated', colors.debug.visuals.showHitboxes);
	}

	// Motif palette
	if (state.debug.visuals.motifPalette) {
		const rows = 30;
		const cols = 30;
		pushTerminalLines(
			`\nGrid of possible motif colors:\n${rows} rows, ${cols} cols`
			+ `\nhue: ${motifRegistry.minHue} to ${motifRegistry.maxHue}`
			+ `\nsat: ${motifRegistry.minSat}% to ${motifRegistry.maxSat}%`
			+ `\nval: ${motifRegistry.minVal}% to ${motifRegistry.maxVal}%`,
			colors.debug.visuals.motifPalette
		);
	}

	// State
	if (state.debug.visuals.states) {
		terminalLines.push({ text: '', color: colors.debug.visuals.state }); // blank spacer
		pushTokenizedLines(tokenizeJSON(state, colors.debug.visuals.state));
	}

	// Colors
	if (state.debug.visuals.colors) {
		terminalLines.push({ text: '', color: colors.debug.visuals.colors });
		pushTokenizedLines(tokenizeJSON(colors, colors.debug.visuals.colors));
	}

	// Layout
	if (state.debug.visuals.layout) {
		terminalLines.push({ text: '', color: colors.debug.visuals.layout });
		pushTokenizedLines(tokenizeJSON(layout, colors.debug.visuals.layout));
	}

	///////////////////////

	// Update total for scroll clamping
	state.debug.terminalTotalLines = terminalLines.length;

	const bodyLength   = state.debug.visuals.fps ? terminalLines.length - 1 : terminalLines.length;
	const visibleLines = getTerminalVisibleLines();
	const maxScroll	= Math.max(0, bodyLength - visibleLines);
	state.debug.terminalScrollOffset = Math.min(state.debug.terminalScrollOffset, maxScroll);

	drawTerminal();

	// Motif grid draws after
	if (state.debug.visuals.motifPalette) {
		drawMotifGrid();
	}
}

function drawTerminal() {
	const lineHeight   = state.font.size.default;
	const pinned	   = state.debug.visuals.fps ? terminalLines[0] : null;
	const bodyLines	= state.debug.visuals.fps ? terminalLines.slice(1) : terminalLines;

	const maxLines	 = Math.floor((cnv.canvas.height * 0.75) / lineHeight);
	const reservedRows = pinned ? 1 : 0;
	const visibleBody  = Math.min(maxLines - reservedRows, bodyLines.length);

	const start		= state.debug.terminalScrollOffset;
	const end		  = Math.min(bodyLines.length, start + visibleBody);
	const slice		= bodyLines.slice(start, end);

	const hasAbove	 = start > 0;
	const hasBelow	 = end < bodyLines.length;

	state.debug.needsToScroll = hasAbove || hasBelow;

	// Measure indent width for body lines when scroll indicators are present
	cnv.ctx.font = `normal ${state.font.size.default}px ${state.font.debug}`;
	const bodyXOffset = state.debug.needsToScroll ? cnv.ctx.measureText('  ').width : 0;

	const totalRows = reservedRows + slice.length;
	render.drawRect(cnv.ctx, 0, 0, cnv.canvas.width, totalRows * lineHeight, 'rgba(0, 0, 0, 0.8)');

	// Pinned line; always x: 0, never offset
	if (pinned) {
		if (pinned.tokens) {
			drawTokenizedLine(cnv.ctx, pinned, 0, 0);
		} else {
			render.drawText(cnv.ctx, pinned.text, {
				font: state.font.debug, y: 0, color: pinned.color, verticalSpacing: 1,
			});
		}
	}

	// Scrollable body; offset when indicators are active
	for (let i = 0; i < slice.length; i++) {
		const line = slice[i];
		const y	= (reservedRows + i) * lineHeight;

		if (line.tokens) {
			drawTokenizedLine(cnv.ctx, line, bodyXOffset, y);
		} else {
			render.drawText(cnv.ctx, line.text, {
				font: state.font.debug, x: bodyXOffset, y, color: line.color, verticalSpacing: 1,
			});
		}
	}

	// Scroll indicators
	const indicatorColor = colors.debug.scrollIndicator;

	if (hasAbove) {
		render.drawText(cnv.ctx, `↑${start}`.split('').join('\n'), {
			font: state.font.debug, y: reservedRows * lineHeight, color: indicatorColor, verticalSpacing: 1,
		});
	}

	if (hasBelow) {
		const remaining = bodyLines.length - end;
		const belowStr  = `${remaining}↓`;
		render.drawText(cnv.ctx, belowStr.split('').join('\n'), {
			font: state.font.debug, y: (reservedRows + slice.length - belowStr.length) * lineHeight, color: indicatorColor, verticalSpacing: 1,
		});
	}
}

function drawMotifGrid() {
	const rows	  = 30;
	const cols	  = 30;
	const yOffset   = state.debug.terminalTotalLines * state.font.size.default + 20;
	const boxLength = 20;
	const boxSpacing = 1;

	for (let i = 0; i < rows; i++) {
		for (let j = 0; j < cols; j++) {
			const hovering =
				state.pos.mainCanvas.x >= j * boxLength &&
				state.pos.mainCanvas.x <= j * boxLength + boxLength - boxSpacing &&
				state.pos.mainCanvas.y >= i * boxLength + yOffset &&
				state.pos.mainCanvas.y <= i * boxLength + yOffset + boxLength - boxSpacing;

			const hue = Math.floor((i / rows) * (motifRegistry.maxHue - motifRegistry.minHue) + motifRegistry.minHue);
			const sat = Math.floor((j / cols) * (motifRegistry.maxSat - motifRegistry.minSat) + motifRegistry.minSat);
			const val = Math.floor((j / cols) * (motifRegistry.maxVal - motifRegistry.minVal) + motifRegistry.minVal);

			const { color, highlight } = motifRegistry.createMotifColors(hue, sat, val);
			const x = j * boxLength;
			const y = i * boxLength + yOffset;
			const w = boxLength - boxSpacing;
			const h = boxLength - boxSpacing;

			if (hovering) {
				cnv.trackCanvas.style.cursor = 'pointer';
				render.drawRect(cnv.ctx, x, y, w, h, color, {
					shadow: { inner: true, shadowColor: highlight, shadowBlur: h, left: false, right: false, top: false }
				});
				render.drawBorder(cnv.ctx, x, y, w, h, highlight);
			} else {
				render.drawRect(cnv.ctx, x, y, w, h, color, {
					shadow: { inner: false, shadowColor: colors.trackCanvas.timeline.shadow, shadowBlur: 4 }
				});
			}
		}
	}
}