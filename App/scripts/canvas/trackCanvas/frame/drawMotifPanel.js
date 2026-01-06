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

function calculateMotifPanelHeight(motifParam) {
	let drawnMotifs = [];
	let motifY = layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.motifPanel.motifOffset;

	for (const motifData of motifParam) {
		const motif = motifRegistry.getMotif(motifData[2], init.motifs);

		// Skip if the motif is empty OR if compressing duplicates and it's already drawn
		if (motifData[1] === 0 || (state.trackCanvas.frame.motifPanel.compressMotifs && drawnMotifs.includes(motif.name))) continue;

		drawnMotifs.push(motif.name);

		const motifHeight = state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset * 2;
		motifY += motifHeight + layout.trackCanvas.frame.motifPanel.motifOffset;
	}

	return motifY;
}

export function drawMotifPanel() {
	const ttPanelAllMotifsHeight = calculateMotifPanelHeight(state.selectedSong.motifs);
	const ttPanelOverflowHeight = (ttPanelAllMotifsHeight - layout.trackCanvas.frame.motifPanel.height - layout.trackCanvas.frame.motifPanel.motifOffset * 2);
	const ttPanelScrollbarFGHeight = Math.min(layout.trackCanvas.frame.motifPanel.height * (layout.trackCanvas.frame.motifPanel.height / ttPanelAllMotifsHeight), layout.trackCanvas.frame.motifPanel.height);
	const ttPanelScrollbarEmptyHeight = layout.trackCanvas.frame.motifPanel.height - ttPanelScrollbarFGHeight;
	state.trackCanvas.frame.motifPanel.scrollbarNeeded = ttPanelScrollbarFGHeight < layout.trackCanvas.frame.motifPanel.height;

	// Constrict scroll to motifs
	layout.trackCanvas.frame.motifPanel.scrollOffset = (state.trackCanvas.frame.motifPanel.scrollbarNeeded ? (Math.max(Math.min(layout.trackCanvas.frame.motifPanel.scrollOffset, 0), -ttPanelAllMotifsHeight + layout.trackCanvas.frame.motifPanel.height + layout.trackCanvas.frame.motifPanel.motifOffset*2)) : 0);
	
	const ttPanelScrollbarTop = layout.trackCanvas.frame.padding + ttPanelScrollbarEmptyHeight * (-layout.trackCanvas.frame.motifPanel.scrollOffset / ttPanelOverflowHeight);

	if (state.trackCanvas.frame.motifPanel.scrollbarNeeded) {
		state.hovering.motifPanel.scrollbar =  (state.pos.trackCanvas.x > layout.trackCanvas.frame.motifPanel.scrollbar.left)
											&& (state.pos.trackCanvas.x < layout.trackCanvas.frame.motifPanel.scrollbar.left + layout.trackCanvas.frame.motifPanel.scrollbar.width)
											&& (state.pos.trackCanvas.y > ttPanelScrollbarTop)
											&& (state.pos.trackCanvas.y < ttPanelScrollbarTop + ttPanelScrollbarFGHeight);

		// Scrollbar bg
		render.drawRect(cnv.trackCtx, layout.trackCanvas.frame.motifPanel.scrollbar.left, layout.trackCanvas.frame.timeline.top, layout.trackCanvas.frame.motifPanel.scrollbar.width, layout.trackCanvas.frame.motifPanel.height, colors.trackCanvas.motifPanel.scrollbar.bg);
		// Scrollbar fg
		render.drawRect(cnv.trackCtx, layout.trackCanvas.frame.motifPanel.scrollbar.left, ttPanelScrollbarTop, layout.trackCanvas.frame.motifPanel.scrollbar.width, ttPanelScrollbarFGHeight, colors.trackCanvas.motifPanel.scrollbar.fg);
	}

	///  DRAW MOTIF BOXES

	state.hovering.motifPanel.self = false;
	state.hovering.motifPanel.motif = false;
	cnv.trackCanvas.style.cursor = 'auto';

	let drawnMotifs = [];

	for (const motifData of state.selectedSong.motifs) {
		let motif = motifRegistry.getMotif(motifData[2], init.motifs);

		// Skip this iteration if this motif is already included in drawnMotifs (ignore if compressedMotifs is enabled)
		if (motifData[1] === 0 || (state.trackCanvas.frame.motifPanel.compressMotifs && drawnMotifs.includes(motif.name))) continue;

		drawnMotifs.push(motif.name);

		motif.panelX = layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.motifPanel.motifOffset;
		motif.panelY = layout.trackCanvas.frame.motifPanel.motifY + layout.trackCanvas.frame.motifPanel.scrollOffset;
		motif.width = layout.trackCanvas.frame.motifPanel.motifBox.width - (state.trackCanvas.frame.motifPanel.scrollbarNeeded ? layout.trackCanvas.frame.motifPanel.scrollbar.width : 0);
		motif.height = state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset*2;

		// Redefine mouse collision
		state.hovering.motifPanel.self = (state.pos.trackCanvas.x > layout.trackCanvas.frame.timeline.left && state.pos.trackCanvas.x < layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.motifPanel.width && state.pos.trackCanvas.y > layout.trackCanvas.frame.timeline.top && state.pos.trackCanvas.y < layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.timeline.height);
		state.hovering.motifPanel.motif = state.hovering.motifPanel.self && (state.pos.trackCanvas.x > motif.panelX && state.pos.trackCanvas.x < motif.panelX + motif.width && state.pos.trackCanvas.y > motif.panelY && state.pos.trackCanvas.y < motif.panelY + motif.height);
		
		if (state.hovering.motifPanel.motif) {
			cnv.trackCanvas.style.cursor = 'pointer';
			render.drawRect(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.colors.color, {
				shadow: { inner: true, shadowColor: motif.colors.highlight, shadowBlur: motif.height, left: false, right: false, top: false }
			});
			render.drawBorder(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.colors.highlight);
		}
		else {
			render.drawRect(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.colors.color, {
				shadow: { inner: false, shadowColor: colors.trackCanvas.timeline.shadow, shadowBlur: 4 }
			});
		}

		const advancedTruncatedString = helpers.advancedTruncateString(
			cnv.trackCtx,
			motif.name,
			motif.width,
			{
				minScaleX: 0.6,
				minScaleY: 0.5,
				maxHeight: motif.height,
				font: state.font.default,
				fontSize: state.font.size.default,
				paddingX: 6,
			}

		);
		
		render.drawText(cnv.trackCtx, advancedTruncatedString.string, {
			fontSize: advancedTruncatedString.fontSize,
			x: motif.panelX + layout.trackCanvas.frame.motifPanel.motifOffset,
			y: motif.panelY + layout.trackCanvas.frame.motifPanel.motifOffset,
			color: motif.colors.text,
			scaleX: advancedTruncatedString.scaleX,
		});
		
		layout.trackCanvas.frame.motifPanel.motifY += state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset*3;
	}
	render.drawRect(cnv.trackCtx, layout.trackCanvas.frame.left, 0, layout.trackCanvas.frame.width, layout.trackCanvas.frame.timeline.top, colors.trackCanvas.timeline.bg);
	render.drawRect(cnv.trackCtx, layout.trackCanvas.frame.left, layout.trackCanvas.frame.timeline.bottom, layout.trackCanvas.frame.width, layout.trackCanvas.height - layout.trackCanvas.frame.timeline.bottom, colors.trackCanvas.timeline.bg);
}