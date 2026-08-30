import { state }			from '../../../state/state.js';
import { colors }			from '../../../state/colors.js';
import { layout }			from '../../../state/layout/layout.js';

import { drawMotifPanel }	from './drawMotifPanel.js';
import { drawTimeline }		from './drawTimeline.js';

import * as init			from '../../../init.js';
import * as cnv				from '../../canvas.js';
import * as motifRegistry	from '../../../motif.js';
import * as render			from '../../render.js';


export function drawFrame() {
	// Frame background
	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.left,
		0,
		layout.trackCanvas.frame.width,
		layout.trackCanvas.height,
		colors.trackCanvas.timeline.bg
	);

	// Motif panel bg
	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.timeline.left,
		layout.trackCanvas.frame.timeline.top,
		layout.trackCanvas.frame.motifPanel.width,
		layout.trackCanvas.frame.timeline.height,
		colors.trackCanvas.motifPanel.bg
	);

	// Timeline bg (no padding)
	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.timeline.playerX,
		layout.trackCanvas.frame.timeline.top,
		layout.trackCanvas.frame.timeline.width,
		layout.trackCanvas.frame.timeline.height,
		colors.trackCanvas.timeline.inner
	);

	// Measure bar bg (at the top)
	render.drawRect(
		cnv.trackCtx,
		layout.trackCanvas.frame.timeline.playerX,
		layout.trackCanvas.frame.timeline.top,
		layout.trackCanvas.frame.timeline.width,
		layout.trackCanvas.frame.timeline.measureBar.height,
		colors.trackCanvas.timeline.measureBar.bg, 
		{
			shadow: {
				inner: true,
				shadowColor: colors.trackCanvas.timeline.measureBar.shadow,
				shadowBlur: 3,
				left: false, right: false
			}
		}
	);

	// Measure bar border
	render.drawBorder(
		cnv.trackCtx,
		layout.trackCanvas.frame.timeline.playerX,
		layout.trackCanvas.frame.timeline.top,
		layout.trackCanvas.frame.timeline.width,
		layout.trackCanvas.frame.timeline.measureBar.height,
		colors.trackCanvas.timeline.measureBar.bg
	);

	// Frame components
	drawMotifPanel();
	drawTimeline();

	// Reset motif hovering stuff
	if (!state.hovering.motif.flag) {
		state.hovering.motif.obj = null;
		state.hovering.motif.index = null;
	}
}