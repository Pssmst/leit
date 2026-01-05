import { state }				from '../../state/state.js';
import * as cnv					from '../canvas.js';

import { computeTrackLayout }	from '../../state/layout/trackCanvas/computeTrackLayout.js';

import { drawWaveform }			from './drawWaveform.js';
import { drawFrame }			from './frame/drawFrame.js';


export function drawTrackCanvas() {
	if (!cnv.trackCtx || !cnv.trackCanvas || !state.selectedSong || state.loading) return;

	// Use CSS pixel size (drawing coordinates are in CSS pixels because state.font.setTransform was used)
	const rect = cnv.trackCanvas.getBoundingClientRect();
	const canvasWidth = Math.max(1, Math.floor(rect.width));
	const canvasHeight = Math.max(1, Math.floor(rect.height));

	// Clear the visible drawing area (in CSS pixels)
	cnv.trackCtx.clearRect(0, 0, canvasWidth, canvasHeight);

	computeTrackLayout(canvasWidth, canvasHeight);

	drawWaveform();
	drawFrame();
}