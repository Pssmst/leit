import { state }		from './state/state.js';
import { colors }		from './state/colors.js';

import * as helpers		from './helpers.js';
import * as colorHandle	from './ui/colorHandling.js';

export class Motif {
	constructor(name,
		{
			occurrences = {},
			origin = null,
			color = colors.default,
		} = {}
	) {
		this.name = name;
		this.occurrences = occurrences;
		this.origin = origin;
		this.hovering = false;

		this.colors = {
			color: color,
			highlight: null,
			text: null,
		};
	}
}


export function buildMotifsFromSongs(songs) {
	const motifs = [];

	function get(name) {
		return motifs.find(m => m.name === name);
	}

	for (const song of songs) {
		for (const [start, end, name] of song.motifs) {
			if (!name) continue;

			let motif = get(name);
			if (!motif) {
				motif = new Motif(name);
				motifs.push(motif);
			}

			motif.occurrences[song.name] ??= [];
			motif.occurrences[song.name].push([start, end]);
		}
	}

	return motifs;
}


export function getMotif(name, motifs) {
	for (const motif of motifs) {
		if (motif.name === name) {
			return motif;
		}
	}
}

export const minHue = 0;
export const maxHue = 360;

export const minSat = 30;
export const maxSat = 100;

export const minVal = 30;
export const maxVal = 100;

function createHighlightHSV(h, s, v, intensity = 0.5) {
    const vn = v / 100;
    const sn = s / 100;

    // Simplified version of the Photopic Vision curve
    // Cyan (180) and Yellow (60) get higher weights.
    const rad = (h * Math.PI) / 180;
    const perceptualWeight = 0.7 + 0.3 * Math.cos(rad - (60 * Math.PI / 180));

    // Uses intensity to close the gap toward 100% Value
    const vBoost = (1 - vn) * intensity;
    const vOut = Math.min(1, vn + vBoost + (0.1 * intensity));

    // If a color is already bright (high vn) or naturally sensitive (perceptualWeight), drop saturation to make it "look" brighter
    const sCrush = sn * intensity * (vn * perceptualWeight);
    const sOut = Math.max(0, sn - sCrush);

    // Shifts slightly toward "light" (Yellow/White)
    const hShift = 40 * intensity * (h > 60 && h < 240 ? -1 : 1);
    const hOut = (h + hShift + 360) % 360;

    return [
        Math.round(hOut),
        Math.round(sOut * 100),
        Math.round(vOut * 100)
    ];
}

export function createMotifColors(hue, sat, val) {
	// Base color
	const [r, g, b] = colorHandle.HSVtoRGB(hue, sat, val);
	const color = `rgb(${r}, ${g}, ${b})`;

	// Incredibly bright highlight
	const highlightHSV = createHighlightHSV(hue, sat, val);

	const highlightRGB = colorHandle.HSVtoRGB(highlightHSV[0], highlightHSV[1], highlightHSV[2]);
	const highlight = `rgb(${highlightRGB[0]},${highlightRGB[1]},${highlightRGB[2]})`;

	// Text color (contrast-based)
	const bgRGB = [r, g, b];
	const cw = colorHandle.getContrast(bgRGB, [255, 255, 255]);
	const cb = colorHandle.getContrast(bgRGB, [0, 0, 0]) * 0.3;

	const darkTextRGB = colorHandle.HSVtoRGB(hue, sat, val * 0.2);

	const text = (cw >= cb ? colors.white : `rgb(${darkTextRGB[0]},${darkTextRGB[1]},${darkTextRGB[2]})`);

	return {
		color,
		highlight,
		text
	};
}

export function scrambleMotifColors(motifs) {
	for (const motif of motifs) {
		const isCopyright = motif.name.startsWith('©');

		// Check for copyrighted motif
		if (isCopyright) {
			motif.colors.color = colors.motifs.plagiarismBg;
			motif.colors.text = colors.motifs.plagiarismText;
			motif.colors.highlight = colors.motifs.plagiarismHighlight;
		}
		else {
			// Generate random color
			let hue = helpers.randInt(minHue, maxHue);
			let sat = helpers.randInt(minSat, maxSat);
			let val = helpers.randInt(minVal, maxVal);

			// Generate colors via the shared function
			const colorsOut = createMotifColors(hue, sat, val);

			// Assign colors
			motif.colors.color = colorsOut.color;
			motif.colors.text = colorsOut.text;
			motif.colors.highlight = colorsOut.highlight;
		}
	}
}

export function clearMotifLayout(motifs) {
	for (const motif of motifs) {
		motif.panelX = null;
		motif.panelY = null;
		motif.width = null;
		motif.height = null;

		motif.timelineX = null;
		motif.timelineY = null;
		motif.timelineWidth = null;
		motif.timelineHeight = null;
	}
}