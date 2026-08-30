export const colors = {
	white:					'hsla(0, 0%, 100%, 1.00)',
	transparent:			'hsla(0, 0%, 100%, 0)',

	albumText:				'hsl(0, 0%, 49%)',

	edit: {
		newSong:			'hsl(0, 0%, 15%)',
		newSongPlus:		'hsl(0, 0%, 40%)',
	},

	song: {
		border: {
			selected:		'hsla(0, 0%, 100%, 1.00)',
			pressed:		'hsl(0, 0%, 70%)',
			hovered:		'hsla(0, 0%, 50%, 1.00)',
		},
	},

	motifs: {
		plagiarismBg:		'rgb(0, 0, 0)',
		plagiarismText:		'hsla(0, 0%, 100%, 1.00)',
		plagiarismHighlight:'hsla(200, 7%, 45%, 1.00)',
	},

	trackCanvas: {
		primary:			'hsla(120, 100%, 60%, 1.00)',

		waveform: {
			gradient: [
							'hsla(120, 100%, 60%, 0.3)',
							'hsla(120, 100%, 60%, 0.2)',
							'hsla(120, 100%, 60%, 0.1)',
			],
			bg:				'hsla(0, 0%, 0%, 1.00)',
		},

		motifPanel: {
			bg: 			'hsla(198, 19%, 21%, 1.00)',
			
			scrollbar: {
				fg:			'hsla(200, 7%, 45%, 1.00)',
				bg:			'hsla(200, 9%, 13%, 1.00)',
			},
		},

		timeline: {
			bg:				'hsla(203, 9%, 28%, 1.00)',
			inner:			'hsla(198, 19%, 21%, 1.00)',
			shadow:			'hsla(0, 0%, 0%, 0.20)',

			measureBar: {
				text:		'hsla(0, 0%, 100%, 1.00)',
				shadow:		'hsla(206, 23%, 34%, 0.40)',
				bg:			'hsla(214, 15%, 9%, 1.00)',
			},

			lines: {
				measure:	'hsla(0, 0%, 0%, 1.00)',
				beat:		'hsla(200, 9%, 13%, 1.00)',
			},
		},
	},

	debug: {
		bg:					'hsla(0, 0%, 0%, 0.80)',
		default:			'#ffffff',
		scrollIndicator:	'rgba(255, 255, 255, 0.5)',

		visuals: {
			fps:			'#ffffff',
			audio:			'hsla(92, 100%, 50%, 1.00)',
			showHitboxes:	'hsla(60, 100%, 50%, 1.00)',
			motifPalette:	'rgb(97, 210, 255)',
			states:			'#ffffff',
			colors:			'#ffffff',
			layout:			'#ffffff',
		},

		loadedAudio: {
			border:			'hsla(0, 0%, 0%, 1.00)',
			unloaded:		'hsla(0, 100%, 50%, 1.00)',
			loaded:			'hsla(120, 100%, 50%, 1.00)',
		},

		tokens: {
			number:			'#c765ff',
			bool:			'#75b1f7',
			string:			'#76ec61',
			color:			'#e4e4e4',
			other:			'#c0c0c0',
		},

		hitboxes: {
			self:			'hsla(0, 0%, 100%, 1.00)',
			unallowed:		'hsla(0, 100%, 50%, 1.00)',
			text:			'hsla(60, 100%, 50%, 1.00)',
		}
	},
};