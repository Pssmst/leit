import { state }				from '../../../state/state.js';
import { colors }				from '../../../state/colors.js';
import { layout }				from '../../../state/layout/layout.js';

import * as init				from '../../../init.js';
import * as HTML				from '../../../ui/elements.js';
import * as cnv					from '../../canvas.js';
import * as helpers				from '../../../helpers.js';
import * as motifRegistry		from '../../../motif.js';
import * as aud					from '../../../audio/audio.js';
import * as render				from '../../render.js';
import * as textures			from '../../../ui/textures.js';
import * as discography			from '../../../discography.js';

// Returns struct info for a given measure
// If a struct entry doesn't have certain fields (bpm, timeSignature), they're inherited from the most recent prior entry that specified them
function getStructInfoFromMeasure(measure) {
	if (!state.selectedSong || !state.selectedSong.structure || state.selectedSong.structure.length === 0) return { bpm: 120, timeSignature: [4,4] };

	// Start with an empty resolved object
	const resolved = {};

	// Iterate through each struct entry in order; apply fields when we pass their start measure
	for (let i = 0; i < state.selectedSong.structure.length; i++) {
		const entry = state.selectedSong.structure[i];
		const start = entry[0];
		const info = entry[1] || {};

		if (measure >= start) {
			Object.keys(info).forEach(k => { resolved[k] = info[k]; });
		} else {
			break; // Future entry
		}
	}

	// Apply sensible defaults if missing
	if (!resolved.timeSignature || !Array.isArray(resolved.timeSignature)) resolved.timeSignature = [4,4];
	if (typeof resolved.bpm !== 'number') resolved.bpm = resolved.bpm || 120;

	return resolved;
}

export function drawTimeline() {
	/* Config for canDraw function for each tt feature
		minSpacing: Space the right of a feature's hitbox that prevents the next object from rendering
		scaleX: Visual scale put on feature
		cenetered: Boolean determining whether to measure an object's hitbox from its center (true) or left side (false)
	*/
	const drawConfig = {
		measureNumber: { minSpacing: 6, scaleX: 0.9, centered: false },
		measureLine:   { minSpacing: 8 },
		beatLine:	  { minSpacing: 6 },
		timeSig:	   { minSpacing: 4, centered: false }
	};

	// Reset overlap state each state.debug.frame
	let overlapState = { lastRight: { measureNumber: -Infinity, measureLine: -Infinity, timeSig: -Infinity } };

	// Check if an object can be drawn
	function canDraw(kind, x, width = 0) {
		const cfg = drawConfig[kind] || { minSpacing: 6 };
		const centered = cfg.centered;

		const leftX = centered ? (x - (width / 2)) : x;
		const rightX = leftX + width;

		const requiredLeft = overlapState.lastRight[kind] + (cfg.minSpacing || 0);

		// Draw debug hitboxes5
		if (state.debug.visuals[5]) {
			switch (kind) {
				
				case "measureNumber":
					render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], layout.trackCanvas.frame.timeline.measureBar.number.top, cfg.minSpacing || 0, state.font.size.default, colors.debug.hitboxes.unallowed);
					render.drawBorder(cnv.trackCtx, leftX, layout.trackCanvas.frame.timeline.measureBar.number.top, rightX-leftX, state.font.size.default, colors.debug.hitboxes.self);
					break;
				
				case "timeSig":
					render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], layout.trackCanvas.frame.timeline.measureBar.timeSig.top, cfg.minSpacing || 0, state.font.size.timeSignature * 1.5, colors.debug.hitboxes.unallowed);
					render.drawBorder(cnv.trackCtx, leftX, layout.trackCanvas.frame.timeline.measureBar.timeSig.top, rightX-leftX, state.font.size.timeSignature * 1.5, colors.debug.hitboxes.self);
					break;
				
				case "measureLine":
					render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], layout.trackCanvas.frame.timeline.measureBar.bottom, cfg.minSpacing || 0, layout.trackCanvas.frame.timeline.height - layout.trackCanvas.frame.timeline.measureBar.height, colors.debug.hitboxes.unallowed);
					render.drawLine(cnv.trackCtx, overlapState.lastRight[kind], layout.trackCanvas.frame.timeline.measureBar.bottom, overlapState.lastRight[kind], layout.trackCanvas.frame.timeline.bottom, colors.debug.hitboxes.self);
					break;
			}
		}

		if (leftX >= requiredLeft) {
			overlapState.lastRight[kind] = rightX;
			return true;
		}
		return false;
	}

	// Compute beatWidth so all beats fit exactly inside the inner timeline
	let beatUnitCount = 0;
	for (let measure = 1; measure <= state.selectedSong.totalMeasures; measure++) {
		const struct = getStructInfoFromMeasure(measure);
		beatUnitCount += struct.timeSignature[0] * (4 / struct.timeSignature[1]);
	}
	let beatWidth = 5;
	if (beatUnitCount > 0) {
		beatWidth = layout.trackCanvas.frame.timeline.width / beatUnitCount;
	}

	// Start off ttCurrentDrawnX at the beginning of the innerTimeline
	let ttCurrentDrawnX = layout.trackCanvas.frame.timeline.playerX;
	let measureWidth = 0;
	let playingLineOffset = 0;
	let thisStructInfo;

	// Iterate through every measure
	for (let measure = 1; measure <= state.selectedSong.totalMeasures; measure++) {

		// Set playing line offset
		if (measure === state.structure.currentMeasure) playingLineOffset = ttCurrentDrawnX;

		// Get thisStructInfo (resolved)
		thisStructInfo = getStructInfoFromMeasure(measure);

		///  MEASURE NUMBER  //////////////////////////////////////////////////////////////////
		
		const measureText = `${measure}`;
		const labelWidth = render.getTextWidth(cnv.trackCtx, measureText);
		const measureScaleX = drawConfig.measureNumber.scaleX;
		const drawTextWidth = labelWidth * measureScaleX; // If render.getTextWidth already accounts for scale, remove the * measureScaleX

		if (canDraw('measureNumber', ttCurrentDrawnX, drawTextWidth)) {
			render.drawText(cnv.trackCtx, measureText, { x: ttCurrentDrawnX, y: layout.trackCanvas.frame.timeline.measureBar.number.top, scaleX: measureScaleX, color: colors.trackCanvas.timeline.text });
		}

		///  MEASURE LINE  //////////////////////////////////////////////////////////////////

		if (canDraw('measureLine', ttCurrentDrawnX, 1)) {
			render.drawLine(cnv.trackCtx, ttCurrentDrawnX, layout.trackCanvas.frame.timeline.measureBar.bottom, ttCurrentDrawnX, layout.trackCanvas.height - layout.trackCanvas.frame.padding, colors.trackCanvas.timeline.lines.measure, 1);
		}

		///  TIME SIGNATURE  //////////////////////////////////////////////////////////////////
		
		const prevStruct = (measure === 1) ? null : getStructInfoFromMeasure(measure - 1);
		const prevSig = prevStruct ? prevStruct.timeSignature.join(',') : null;
		const thisSig = thisStructInfo.timeSignature ? thisStructInfo.timeSignature.join(',') : null;

		if (measure === 1 || thisSig !== prevSig) {
			const numSig = String(thisStructInfo.timeSignature[0]);
			const denSig = String(thisStructInfo.timeSignature[1]);

			const timeSignatureGlyphs = { 0: 0xE080, 1: 0xE081, 2: 0xE082, 3: 0xE083, 4: 0xE084, 5: 0xE085, 6: 0xE086, 7: 0xE087, 8: 0xE088, 9: 0xE089 };

			let glyph1 = '';
			let glyph2 = '';

			for (const char of numSig) { glyph1 += String.fromCodePoint(timeSignatureGlyphs[char]); }
			for (const char of denSig) { glyph2 += String.fromCodePoint(timeSignatureGlyphs[char]); }

			// Estimate glyph width (rough): fontSize * numberOfDigits
			const glyphWidthEst = render.getTextWidth(cnv.trackCtx, `${glyph1}\n${glyph2}`, state.font.timeSignature) * 1.6;
			if (canDraw('timeSig', ttCurrentDrawnX, glyphWidthEst)) {
				render.drawText(cnv.trackCtx, `${glyph1}\n${glyph2}`, { font: state.font.timeSignature, fontSize: state.font.size.timeSignature, x: ttCurrentDrawnX, y: layout.trackCanvas.frame.timeline.measureBar.timeSig.top, verticalSpacing: .55, color: colors.trackCanvas.timeline.text });
			}
		}

		///  BEAT LINES  //////////////////////////////////////////////////////////////////

		let relativeBeatWidth = beatWidth * 4 / thisStructInfo.timeSignature[1];
		let ttFakeCurrentDrawnX = ttCurrentDrawnX;

		// Only draw beat lines if they won't be too dense (per-measure decision)
		if (relativeBeatWidth >= drawConfig.beatLine.minSpacing) {
			for (let beat = 1; beat <= thisStructInfo.timeSignature[0]; beat++) {
				ttFakeCurrentDrawnX += relativeBeatWidth;
				render.drawLine(cnv.trackCtx, ttFakeCurrentDrawnX, layout.trackCanvas.frame.timeline.measureBar.bottom, ttFakeCurrentDrawnX, layout.trackCanvas.height - layout.trackCanvas.frame.padding, colors.trackCanvas.timeline.lines.beat, 1);
			}
		} else {
			// Still advance ttFakeCurrentDrawnX properly, but skip drawing individual beats
			ttFakeCurrentDrawnX += relativeBeatWidth * thisStructInfo.timeSignature[0];
		}

		///  INCREMENT  //////////////////////////////////////////////////////////////////////

		ttCurrentDrawnX = ttFakeCurrentDrawnX;
	}

	///  MOTIFS  //////////////////////////////////////////////////////////////////

	function measureToX(targetMeasure) {
		const x = layout.trackCanvas.frame.timeline.playerX;

		const M = Math.floor(targetMeasure);
		const f = targetMeasure % 1;  // fractional part, e.g. 0.75

		let beatAccumulator = 0;

		// Sum all *complete* measures before M
		for (let m_ = 1; m_ < M; m_++) {
			const struct = getStructInfoFromMeasure(m_);
			const beats = struct.timeSignature[0] * (4 / struct.timeSignature[1]);
			beatAccumulator += beats;
		}

		// Add fractional beats inside measure M
		if (f > 0) {
			const struct = getStructInfoFromMeasure(M);
			const beatsInMeasure = struct.timeSignature[0] * (4 / struct.timeSignature[1]);

			const fractionalBeats = f * beatsInMeasure;
			beatAccumulator += fractionalBeats;
		}

		return x + beatAccumulator * beatWidth;
	}

	let ttMotifY = layout.trackCanvas.frame.timeline.measureBar.bottom;
	const ttMotifYMap = new Map();  // motifObject -> y value

	// Ensure it's not a placeholder
	if (state.selectedSong.motifs.length > 0 && state.selectedSong.motifs[0][2] != '') {

		for (const tcMotifData of state.selectedSong.motifs) {

			// Motif object reference
			const motifObj = motifRegistry.getMotif(tcMotifData[2], init.motifs);

			// Assign Y only the first time this motif is seen
			if (!ttMotifYMap.has(motifObj)) {
				ttMotifYMap.set(motifObj, ttMotifY);
				ttMotifY += layout.trackCanvas.frame.timeline.motifHeight;
			}

			const y = ttMotifYMap.get(motifObj);

			const startMeasure = tcMotifData[0];
			const endMeasure = tcMotifData[1];

			const left = measureToX(startMeasure);
			const right = measureToX(endMeasure);
			const ttMotifWidth = right - left;


			///   RENDER MOTIF BOX (Highlight on hover)   ////////////////////

			if (state.pos.trackCanvas.x >= left && state.pos.trackCanvas.x <= right && state.pos.trackCanvas.y >= y && state.pos.trackCanvas.y <= y + layout.trackCanvas.frame.timeline.motifHeight) {
				cnv.trackCanvas.style.cursor = 'pointer';
				render.drawRect(cnv.trackCtx, left, y, ttMotifWidth, layout.trackCanvas.frame.timeline.motifHeight, motifObj.colors.color, {
					shadow: { inner: true, shadowColor: motifObj.colors.highlight, shadowBlur: layout.trackCanvas.frame.timeline.motifHeight, left: false, right: false, top: false }
				});
				render.drawBorder(cnv.trackCtx, left+1, y+1, ttMotifWidth-2, layout.trackCanvas.frame.timeline.motifHeight-2, motifObj.colors.highlight);
			}
			else {
				render.drawRect(cnv.trackCtx, left, y, ttMotifWidth, layout.trackCanvas.frame.timeline.motifHeight, motifObj.colors.color);
			}

			///   LABEL   ////////////////////////////////////////////////////

			const advancedTruncatedString = helpers.advancedTruncateString(
				cnv.trackCtx,
				tcMotifData[2],
				ttMotifWidth,
				{
					minScaleX: 0.6,
					minScaleY: 0.5,
					maxHeight: layout.trackCanvas.frame.timeline.motifHeight,
					font: state.font.default,
					fontSize: state.font.size.default,
					paddingX: 4,
				}

			);

			render.drawText(cnv.trackCtx, advancedTruncatedString.string, {
				fontSize: advancedTruncatedString.fontSize,
				x: left + 2,
				y: y + (layout.trackCanvas.frame.timeline.motifHeight - advancedTruncatedString.fontSize) / 2,
				color: motifObj.colors.text,
				scaleX: advancedTruncatedString.scaleX,
			});
		}
	}

	// Set measureWidth for the current measure (used for playing line calculation)
	state.structure.currentStructInfo = getStructInfoFromMeasure(state.structure.currentMeasure);
	let currentRelativeBeatWidth = beatWidth * 4 / state.structure.currentStructInfo.timeSignature[1];
	for (let beat = 1; beat <= state.structure.currentStructInfo.timeSignature[0]; beat++) {
		measureWidth += currentRelativeBeatWidth;
	}

	// Draw playing line
	let timelineCurrentX = playingLineOffset + (state.structure.timeWithinMeasure / state.structure.durations.durationOfMeasure * measureWidth);
	render.drawLine(cnv.trackCtx, timelineCurrentX, layout.trackCanvas.frame.padding, timelineCurrentX, layout.trackCanvas.height - layout.trackCanvas.frame.padding, colors.trackCanvas.primary, 1);
}