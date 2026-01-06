import { state }	from '../../state.js';
import { layout }	from '../layout.js';

export function computeTrackLayout(canvasWidth, canvasHeight) {

	// Track Canvas

	layout.trackCanvas.width	= canvasWidth;
	layout.trackCanvas.height	= canvasHeight;

	// Waveform

	layout.trackCanvas.waveform.width	= layout.trackCanvas.height * .75;
	layout.trackCanvas.waveform.height	= layout.trackCanvas.height;
	layout.trackCanvas.waveform.centerY	= layout.trackCanvas.waveform.height / 2;

	// Frame

	layout.trackCanvas.frame.left	= layout.trackCanvas.waveform.left + layout.trackCanvas.waveform.width;
	layout.trackCanvas.frame.right	= layout.trackCanvas.width;

	layout.trackCanvas.frame.width	= layout.trackCanvas.frame.right - layout.trackCanvas.frame.left;
	
	// Timeline

	layout.trackCanvas.frame.timeline.left		= layout.trackCanvas.frame.left + layout.trackCanvas.frame.padding;
	layout.trackCanvas.frame.timeline.right		= layout.trackCanvas.frame.right - layout.trackCanvas.frame.padding;
	layout.trackCanvas.frame.timeline.top		= layout.trackCanvas.frame.padding;
	layout.trackCanvas.frame.timeline.bottom	= layout.trackCanvas.height - layout.trackCanvas.frame.padding;
	
	layout.trackCanvas.frame.timeline.width		= layout.trackCanvas.frame.timeline.right - layout.trackCanvas.frame.timeline.playerX;
	layout.trackCanvas.frame.timeline.height	= layout.trackCanvas.frame.timeline.bottom - layout.trackCanvas.frame.timeline.top;
	
	// Measure Bar

	layout.trackCanvas.frame.timeline.measureBar.timeSig.height	= state.font.size.timeSignature * 1.35;
	layout.trackCanvas.frame.timeline.measureBar.timeSig.top	= layout.trackCanvas.frame.padding + 15;

	layout.trackCanvas.frame.timeline.measureBar.number.top		= layout.trackCanvas.frame.padding + (layout.trackCanvas.frame.timeline.measureBar.number.height - state.font.size.default) / 2;

	layout.trackCanvas.frame.timeline.measureBar.height			= layout.trackCanvas.frame.timeline.measureBar.number.height + layout.trackCanvas.frame.timeline.measureBar.timeSig.height;
	layout.trackCanvas.frame.timeline.measureBar.bottom			= layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.timeline.measureBar.height;
	
	// Player

	layout.trackCanvas.frame.timeline.playerX = layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.padding + layout.trackCanvas.frame.motifPanel.width
	
	// Motif Panel

	layout.trackCanvas.frame.motifPanel.right			= layout.trackCanvas.frame.timeline.left + layout.trackCanvas.frame.motifPanel.width;
	layout.trackCanvas.frame.motifPanel.height			= layout.trackCanvas.frame.timeline.bottom - layout.trackCanvas.frame.timeline.top;

	layout.trackCanvas.frame.motifPanel.scrollbar.left	= layout.trackCanvas.frame.motifPanel.right - layout.trackCanvas.frame.motifPanel.scrollbar.width;
	layout.trackCanvas.frame.motifPanel.motifBox.width	= layout.trackCanvas.frame.motifPanel.width - layout.trackCanvas.frame.motifPanel.motifOffset * 2;
	layout.trackCanvas.frame.motifPanel.motifY			= layout.trackCanvas.frame.timeline.top + layout.trackCanvas.frame.motifPanel.motifOffset;
}
