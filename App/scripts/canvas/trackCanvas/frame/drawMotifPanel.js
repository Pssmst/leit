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
    let height = 0;

    for (const motifData of motifParam) {
        const motif = motifRegistry.getMotif(motifData[2], init.motifs);

        if (motifData[1] === 0 ||
            (state.trackCanvas.frame.motifPanel.compressMotifs && drawnMotifs.includes(motif.name))
        ) continue;

        drawnMotifs.push(motif.name);

        const motifHeight = state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset * 3;

        height += motifHeight;
    }
    return height;
}

export function drawMotifPanel() {
	state.hovering.motifPanel.self = (
		state.pos.trackCanvas.x >= layout.trackCanvas.frame.timeline.left
		&& state.pos.trackCanvas.x <= layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.motifPanel.width
		&& state.pos.trackCanvas.y >= layout.trackCanvas.frame.timeline.top
		&& state.pos.trackCanvas.y <= layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.timeline.height
	);
	
	// Calculate scrollbar distances and limits
    const ttPanelAllMotifsHeight = calculateMotifPanelHeight(state.selectedSong.motifs);
    
    const totalRenderedHeight = ttPanelAllMotifsHeight + layout.trackCanvas.frame.motifPanel.motifOffset;
    const ttPanelOverflowHeight = totalRenderedHeight - layout.trackCanvas.frame.motifPanel.height;

    const ttPanelScrollbarFGHeight = totalRenderedHeight > 0 
        ? Math.min(layout.trackCanvas.frame.motifPanel.height * (layout.trackCanvas.frame.motifPanel.height / totalRenderedHeight), layout.trackCanvas.frame.motifPanel.height) 
        : layout.trackCanvas.frame.motifPanel.height;

    state.trackCanvas.frame.motifPanel.scrollbarNeeded = ttPanelScrollbarFGHeight < layout.trackCanvas.frame.motifPanel.height;

    // Clamp scroll offset
    layout.trackCanvas.frame.motifPanel.scrollOffset = (
        state.trackCanvas.frame.motifPanel.scrollbarNeeded
        ? helpers.clamp(
            -ttPanelOverflowHeight, 
            layout.trackCanvas.frame.motifPanel.scrollOffset, 
            0)
        : 0
    );

    // Calculate scrollbar position
    const ttPanelScrollbarEmptyHeight = layout.trackCanvas.frame.motifPanel.height - ttPanelScrollbarFGHeight;
    
    let scrollRatio = 0;
    if (ttPanelOverflowHeight > 0) {
        scrollRatio = -layout.trackCanvas.frame.motifPanel.scrollOffset / ttPanelOverflowHeight;
    }

    const ttPanelScrollbarTop = layout.trackCanvas.frame.timeline.top + scrollRatio * ttPanelScrollbarEmptyHeight;

	// Draw scrollbar
	if (state.trackCanvas.frame.motifPanel.scrollbarNeeded) {

		// Scrollbar bg
		render.drawRect(
			cnv.trackCtx,
			layout.trackCanvas.frame.motifPanel.scrollbar.left,
			layout.trackCanvas.frame.timeline.top,
			layout.trackCanvas.frame.motifPanel.scrollbar.width,
			layout.trackCanvas.frame.motifPanel.height,
			colors.trackCanvas.motifPanel.scrollbar.bg
		);

		// Hover detection
		state.hovering.motifPanel.scrollbar = (
			state.pos.trackCanvas.x >= layout.trackCanvas.frame.motifPanel.scrollbar.left &&
			state.pos.trackCanvas.x <= layout.trackCanvas.frame.motifPanel.scrollbar.left + layout.trackCanvas.frame.motifPanel.scrollbar.width &&
			state.pos.trackCanvas.y >= ttPanelScrollbarTop &&
			state.pos.trackCanvas.y <= ttPanelScrollbarTop + ttPanelScrollbarFGHeight
		);

		// Scrollbar fg
		render.drawRect(
			cnv.trackCtx,
			layout.trackCanvas.frame.motifPanel.scrollbar.left,
			ttPanelScrollbarTop,
			layout.trackCanvas.frame.motifPanel.scrollbar.width,
			ttPanelScrollbarFGHeight,
			colors.trackCanvas.motifPanel.scrollbar.fg
		);
	}


	///   DRAW MOTIF BOXES   ////////////////////

	let motifY = layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.motifPanel.motifOffset;
	const compressMotifs = state.trackCanvas.frame.motifPanel.compressMotifs;
	let motifIndex = 0;
	let drawnMotifs = [];

	for (const motifData of state.selectedSong.motifs) {
		let motif = motifRegistry.getMotif(motifData[2], init.motifs);

		// Skip this iteration if this motif is already included in drawnMotifs (ignore if compressedMotifs is enabled)
		if (motifData[1] === 0 || (compressMotifs && drawnMotifs.includes(motif.name))) continue;

		drawnMotifs.push(motif.name);

		motif.panelX = layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.motifPanel.motifOffset;
		motif.panelY = motifY + layout.trackCanvas.frame.motifPanel.scrollOffset;
		motif.width = layout.trackCanvas.frame.motifPanel.motifBox.width - (state.trackCanvas.frame.motifPanel.scrollbarNeeded ? layout.trackCanvas.frame.motifPanel.scrollbar.width : 0);
		motif.height = state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset*2;
		
		if (
            motif.panelX != null &&
            state.pos.trackCanvas.x >= motif.panelX &&
            state.pos.trackCanvas.x <= motif.panelX + motif.width &&
            state.pos.trackCanvas.y >= motif.panelY &&
            state.pos.trackCanvas.y <= motif.panelY + motif.height
        ) {
            state.hovering.motif.obj = motif;
			state.hovering.motif.flag = true;
			state.hovering.motif.index = motifIndex;
        }

		///   RENDER MOTIF   ////////////////////

		if ((compressMotifs && motif === state.hovering.motif.obj) || (!compressMotifs && motifIndex === state.hovering.motif.index)) {
			cnv.trackCanvas.style.cursor = 'pointer';
			
			render.drawRect(
				cnv.trackCtx,
				motif.panelX,
				motif.panelY,
				motif.width,
				motif.height,
				motif.colors.color, {
					shadow: {
						inner: true,
						shadowColor: motif.colors.highlight,
						shadowBlur: motif.height,
						left: false, right: false, top: false
					}
				}
			);
			render.drawBorder(
				cnv.trackCtx,
				motif.panelX,
				motif.panelY,
				motif.width,
				motif.height,
				motif.colors.highlight
			);
		}
		else {
			render.drawRect(
				cnv.trackCtx,
				motif.panelX,
				motif.panelY,
				motif.width,
				motif.height,
				motif.colors.color, {
					shadow: {
						inner: false,
						shadowColor: colors.trackCanvas.timeline.shadow,
						shadowBlur: 4
					}
				}
			);
		}

		///   LABEL   ////////////////////////////////////////////////////

		const advancedTruncatedString = helpers.advancedTruncateString(
			cnv.trackCtx, motif.name, motif.width, {
				minScaleX: 0.8,
				minScaleY: 0.5,
				maxHeight: motif.height,
				font: state.font.default,
				fontSize: state.font.size.default,
				paddingX: 6,
			}
		);
		
		render.drawText(cnv.trackCtx, advancedTruncatedString.string + (state.debug.visuals[5] ? motifIndex : ''), {
			fontSize: advancedTruncatedString.fontSize,
			x: motif.panelX + layout.trackCanvas.frame.motifPanel.motifOffset,
			y: motif.panelY + layout.trackCanvas.frame.motifPanel.motifOffset,
			color: motif.colors.text,
			scaleX: advancedTruncatedString.scaleX,
		});
		
		motifY += state.font.size.default + layout.trackCanvas.frame.motifPanel.motifOffset * 3;
		motifIndex++;
	}

	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.left,
		0,
		layout.trackCanvas.frame.width,
		layout.trackCanvas.frame.timeline.top,
		colors.trackCanvas.timeline.bg
	);

	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.left,
		layout.trackCanvas.frame.timeline.bottom,
		layout.trackCanvas.frame.width,
		layout.trackCanvas.height - layout.trackCanvas.frame.timeline.bottom,
		colors.trackCanvas.timeline.bg
	);
}