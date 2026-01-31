import { state }			from './state/state.js';
import { layout }			from './state/layout/layout.js';

import * as HTML			from './ui/elements.js';
import * as cnv				from './canvas/canvas.js';
import * as helpers			from './helpers.js';
import * as motifRegistry	from './motif.js';
import * as aud				from './audio/audio.js';
import * as render			from './canvas/render.js';
import * as textures		from './ui/textures.js';
import * as init			from './init.js';
import * as discography		from './discography.js';

import { drawMainCanvas }	from './canvas/mainCanvas/drawMainCanvas.js';
import { drawTrackCanvas }	from './canvas/trackCanvas/drawTrackCanvas.js';

import { registerInput }	from './input.js';

async function main() {
	// Wait for images to be ready
	await textures.preloadTextures();

	init.initMain();

	///////  ANIMATION LOOP  ////////////////////////////////////////////////////

	function animate() {
		drawMainCanvas();
		drawTrackCanvas();
		requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);

	registerInput();
}

main();