import { state }			from './state/state.js';
import { colors }			from './state/colors.js';
import { layout }			from './state/layout/layout.js';

import * as HTML			from './ui/elements.js';
import * as cnv				from './canvas/canvas.js';
import * as discography		from './discography.js';

// Initialize audioContext
export const audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();

export function initMain() {
	// Initialize canvas sizes
	cnv.resizeCanvases();

	// Initialize audio
	window.audioContext = audioContext;

	// Initialize discography
	const jsonPath = `../App/assets/discographies/${state.edit.parentDiscographyFileName}.json`;
	discography.constructDiscographyFromJSON(jsonPath);

	// Initialize import progress
	window.electron.onImportProgress((data) => {
		if (data.current === 1) {
			HTML.overlay.style.display = 'flex';
			HTML.bar.style.transition = 'none';
			HTML.bar.style.width = '0%';
			HTML.bar.offsetHeight;
			HTML.bar.style.transition = 'width 0.2s ease';
		}
		
		HTML.status.innerText = (data.total === 1) ? `${data.status}` : `${data.status} (${data.current}/${data.total})`;
		
		const percentage = (data.current / data.total) * 100;
		HTML.bar.offsetHeight;
		HTML.bar.style.width = `${percentage}%`;

		if (data.current === data.total && data.total > 0) {
			setTimeout(() => { HTML.overlay.style.display = 'none'; }, 1000);
		}
	});

	// Set album states
	layout.mainCanvas.album.actualDimension = layout.mainCanvas.album.forcedDimension * layout.mainCanvas.album.scale;
	layout.mainCanvas.album.xGap = layout.mainCanvas.album.forcedDimension * .4;
	layout.mainCanvas.album.yGap = state.font.size.default * 2;
	layout.mainCanvas.album.outlineOffset = layout.mainCanvas.album.forcedDimension / 8;

	// Set audio states
	state.audio.lastManualVolume = state.audio.volume;

	// Set value of root variable `--value-scrollbar-width` in style.css
	const scrollbarWidth = HTML.infoDiv.offsetWidth - HTML.infoDiv.clientWidth;
	document.documentElement.style.setProperty("--value-scrollbar-width", scrollbarWidth + "px");

	// Get values of root variables `--value-info-width` and `--value-info-padding-horizontal` from style.css
	layout.infoDiv.width = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-width').trim());
	layout.infoDiv.paddingHorizontal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-padding-horizontal').trim());
}