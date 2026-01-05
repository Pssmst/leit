export const canvas = document.getElementById('main-canvas');
export const ctx = canvas.getContext('2d');
canvas.addEventListener('contextmenu', e => e.preventDefault());

export const trackCanvas = document.getElementById('track-canvas');
export const trackCtx = trackCanvas.getContext('2d');
trackCanvas.addEventListener('contextmenu', e => e.preventDefault());

/**
 * Resize a canvas to match its CSS layout size multiplied by devicePixelRatio,
 * and set the context transform so 1 unit = 1 CSS pixel.
 *
 * @param {HTMLCanvasElement} c
 * @param {CanvasRenderingContext2D} g
 * @param {number|null} cssWidth  - if null, will read from getBoundingClientRect().width
 * @param {number|null} cssHeight - if null, will read from getBoundingClientRect().height
 */
function setupCanvasForDPR(c, g, cssWidth = null, cssHeight = null) {
	if (!c || !g) return;

	// If caller didn't provide explicit CSS size, read bounding rect
	if (cssWidth === null || cssHeight === null) {
		const rect = c.getBoundingClientRect();
		cssWidth = Math.max(1, Math.floor(rect.width));
		cssHeight = Math.max(1, Math.floor(rect.height));
	}
	else {
		cssWidth = Math.max(1, Math.floor(cssWidth));
		cssHeight = Math.max(1, Math.floor(cssHeight));
	}

	const dpr = Math.max(1, window.devicePixelRatio || 1);

	const backingWidth = Math.floor(cssWidth * dpr);
	const backingHeight = Math.floor(cssHeight * dpr);

	// Only update if sizes changed to avoid unnecessary reflows
	if (c.width !== backingWidth || c.height !== backingHeight) {
		c.width = backingWidth;
		c.height = backingHeight;
	}

	// Ensure the element visually keeps the CSS pixel size
	c.style.width = cssWidth + 'px';
	c.style.height = cssHeight + 'px';

	// Reset transform so 1 unit in drawing = 1 CSS pixel
	g.setTransform(dpr, 0, 0, dpr, 0, 0);

	g.imageSmoothingEnabled = false;
}

function fitCanvasToParent(canvas, ctx) {
	if (!canvas || !ctx || !canvas.parentElement) return;

	// Use parentElement.clientWidth/clientHeight (inner box excluding scrollbar/borders)
	const cssW = Math.max(1, Math.floor(canvas.parentElement.clientWidth));
	const cssH = Math.max(1, Math.floor(canvas.parentElement.clientHeight));

	const dpr = Math.max(1, window.devicePixelRatio || 1);

	const backingW = Math.floor(cssW * dpr);
	const backingH = Math.floor(cssH * dpr);

	// Only update backing store if it actually changed (avoid forced reflows)
	if (canvas.width !== backingW || canvas.height !== backingH) {
		canvas.width = backingW;
		canvas.height = backingH;
	}

	// Ensure the element visually keeps the CSS pixel size
	canvas.style.width = cssW + 'px';
	canvas.style.height = cssH + 'px';

	// Reset transform so 1 unit in drawing = 1 CSS pixel
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.imageSmoothingEnabled = false;
}

export function fitTrackCanvas() {
	fitCanvasToParent(trackCanvas, trackCtx);
}

export function resizeCanvases() {
	setupCanvasForDPR(canvas, ctx, window.innerWidth, window.innerHeight);
	fitTrackCanvas();
}

// Keep canvases sized when window resizes
window.addEventListener('resize', () => {
	resizeCanvases();
});