import * as textures		from './ui/textures.js';
import * as init			from './init.js';
import { drawMainCanvas }	from './canvas/mainCanvas/drawMainCanvas.js';
import { drawTrackCanvas }	from './canvas/trackCanvas/drawTrackCanvas.js';
import { registerInput }	from './input.js';
import './ui/contextMenu.js';

async function main() {
	init.initMain();

	function animate() {
		drawMainCanvas();
		drawTrackCanvas();
		requestAnimationFrame(animate);
	}
	requestAnimationFrame(animate);
	registerInput();
}
main();