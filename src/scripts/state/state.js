export const state = {
	loading: false,
	firstLoad: true,
	
	edit: {
		editMode: false,
		placingSong: false,
		dataIndex: 0,
		
		parentDiscographyFileName: "base",
		parentAlbumFileName: null,
		parentDiscID: null,
	},
	
	hoveredSong: null,
	pressedSong: null,
	selectedSong: null,

	pos: {
		mainCanvas: {
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
		mainCanvas: false,
		infoDiv: false,
		timelineSpinner: false,
		volumeSpinner: false,
		didMove: null,
		songCandidate: null,
		song: null,
		songStartIndex: null,

		pos: {
			x: null,
			y: null,
			initialX: null,
			initialY: null,
		},
	},

	hovering: {
		mainCanvas: false,
		infoDivLeftHitbox: false,
		debug: false,
		addSongContainer: false,

		motif: {
			index: null,
			obj: null,
			flag: false,
		},

		motifPanel: {
			self: false,
			scrollbar: false,
		},

		timeline: {
			self: false,
		},
	},

	audio: {
		volume: 0,
		lastManualVolume: null,
		shuffle: 0,
		looping: false,

		elapsed: 0,
		elapsedPercent: 0,
		elapsedPercentInTime: 0,
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

	mainCanvas: null,

	trackCanvas: {
		showWaveform: true,

		frame: {
			motifPanel: {
				compressMotifs: true,
				scrollbarNeeded: false,
			},
			timeline: {
				zoom: 1,
			},
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
		lastKeyPressed: null,
		structureString: '',

		terminalScrollOffset: 0,
		terminalTotalLines: 0,

		needsToScroll: null,

		visuals: {
			fps: true,
			states: false,
			colors: false,
			layout: false,
			audio: false,
			showHitboxes: false,
			motifPalette: false,
		},
	},

	settings: {
		howManyColorsToGetFromCover: 4,
		canPreloadSongs: true,
	}
};