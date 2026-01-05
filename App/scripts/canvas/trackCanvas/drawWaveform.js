import { state }				from '../../state/state.js';
import { colors }				from '../../state/colors.js';
import { layout }				from '../../state/layout/layout.js';

import * as init				from '../../init.js';
import * as HTML				from '../../ui/elements.js';
import * as cnv					from '../canvas.js';
import * as helpers				from '../../helpers.js';
import * as motifRegistry		from '../../motif.js';
import * as aud					from '../../audio/audio.js';
import * as render				from '../render.js';
import * as textures			from '../../ui/textures.js';
import * as discography			from '../../discography.js';

export function drawWaveform() {
	if (!aud.analyser) return;
	const waveform = aud.getWaveformFloat32();
	if (!waveform || waveform.length === 0) return;

	// Background box (subtle)
	render.drawRect(cnv.trackCtx, layout.trackCanvas.waveform.left, 0, layout.trackCanvas.waveform.width, layout.trackCanvas.waveform.height, colors.trackCanvas.waveform.bg);

	// Gradient aligned to the waveform box (CSS pixels)
	const grad = cnv.trackCtx.createLinearGradient(0, 0, 0, layout.trackCanvas.waveform.height);
	grad.addColorStop( 0, colors.trackCanvas.waveform.gradient[0]);
	grad.addColorStop(.5, colors.trackCanvas.waveform.gradient[1]);
	grad.addColorStop( 1, colors.trackCanvas.waveform.gradient[2]);

	// Waveform drawing params
	const samples = waveform.length;
	const amplitude = 0.98;
	const verticalScale = (layout.trackCanvas.waveform.height / 2) * amplitude;

	function iterateWaveformPixels(top, px) {
		const startSample = Math.floor((px * samples) / layout.trackCanvas.waveform.width);
		const endSample = Math.min(samples, Math.floor(((px + 1) * samples) / layout.trackCanvas.waveform.width));

		let sum = 0, count = 0;
		for (let s = startSample; s < endSample; s++) {
			sum += waveform[s];
			count++;
		}

		const avg = count ? (sum / count) : 0;
		const y = (top ? layout.trackCanvas.waveform.centerY + (avg * verticalScale) : layout.trackCanvas.waveform.centerY - (avg * verticalScale));
		
		if (px === 0) {
			cnv.trackCtx.moveTo(px, y);
		} else {
			cnv.trackCtx.lineTo(px, y);
		}
	}

	// Build the closed path (top curve left->right, bottom curve right->left)
	cnv.trackCtx.beginPath();
	for (let px = layout.trackCanvas.waveform.left; px < layout.trackCanvas.waveform.width; px++) {
		iterateWaveformPixels(true, px);
	}
	for (let px = layout.trackCanvas.waveform.left + layout.trackCanvas.waveform.width - 1; px >= layout.trackCanvas.waveform.left; px--) {
		iterateWaveformPixels(false, px);
	}
	cnv.trackCtx.closePath();

	// Fill & stroke
	cnv.trackCtx.save();
	cnv.trackCtx.fillStyle = grad;
	cnv.trackCtx.fill();

	cnv.trackCtx.lineWidth = 1.0;
	cnv.trackCtx.lineJoin = 'round';
	cnv.trackCtx.lineCap = 'round';
	cnv.trackCtx.strokeStyle = colors.trackCanvas.primary;
	cnv.trackCtx.stroke();
	cnv.trackCtx.restore();

	// Draw the debug info on the waveform
	render.drawText(cnv.trackCtx, state.debug.structureString, { font: state.font.debug, x: 5, y: -state.font.size.default + 5, color: colors.trackCanvas.primary, verticalSpacing: 1 });
}