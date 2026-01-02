export const state = {
	loading: false,
	hoveredSong: null,
	selectedSong: null,

	album: {
		forcedDimension: 32,
		scale: 2.5,
		actualDimension: null,
		xGap: null,
		yGap: null,
		outlineOffset: null,
	},

	pos: {
		canvas: {
			x: null,
			y: null,
			clickX: null,
			clickY: null,
		},
		
		trackCanvas: {
			x: null,
			y: null,
			clickX: null,
			clickY: null,
		},
	},

	dragging: {
		canvas: false,
		infoDiv: false,
		timelineSpinner: false,
		volumeSpinner: false,

		pos: {
			x: null,
			y: null,
			startX: null,
			startY: null,
		},
	},

	hovering: {
		canvas: false,
		infoDivLeftHitbox: false,
		debug: false,

		motifPanel: {
			self: false,
			motif: false,
			scrollbar: false,
		},
	},

	audio: {
		volume: .5,
		lastManualVolume: null,
		shuffle: 0,
		looping: false,

		elapsed: 0,
		elapsedPercent: 0,
		elapsedPercentInTime: 0,
	},

	infoDiv: {
		width: null,
		paddingHorizontal: null,
	},
	
	structure: {
		startTimesOfEachStruct: null,
		timeWithinMeasure: null,

		currentStructInfo: null,
		currentMeasure: null,
		currentBeat: null,

		durations: {
			timeSignature: {
				numerator: null,
				denominator: null,
			},
			durationOfBeat: null,
			durationOfMeasure: null,
		},
	},

	trackTimeline: {
		zoom: 1,

		motifPanel: {
			motifHeight: 20,
			compressMotifs: true,
			scrollbarNeeded: false,
			scrollOffset: 0,
		},
	},

	font: {
		default: 'Arial',
		timeSignature: 'Bravura',
		debug: 'Jetbrains Mono',

		size: {
			default: 14,
			timeSignature: 22,
		},
		verticalSpacing: 1.2,
	},

	debug: {
		frame: 0,
		fps: 0,

		debugLines: 0,
		offsetDebugLines: 0,

		visuals: [true, false, false, false, false],
		structureString: '',
		lastKeyPressed: null,
	}
};