export function HSVtoRGB(h, s, v) {
	s /= 100;
	v /= 100;
	const c = v * s;
	const x = c * (1 - Math.abs((h / 60) % 2 - 1));
	const m = v - c;
	let r, g, b;
	if (h < 60) [r, g, b] = [c, x, 0];
	else if (h < 120) [r, g, b] = [x, c, 0];
	else if (h < 180) [r, g, b] = [0, c, x];
	else if (h < 240) [r, g, b] = [0, x, c];
	else if (h < 300) [r, g, b] = [x, 0, c];
	else			  [r, g, b] = [c, 0, x];
	return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Get dominant colors of an image
export async function getColorsFromImage(src, opts = {}) {
	const cfg = {
		maxSize: opts.maxSize || 300,		// Shrink large images for speed
		colorBits: opts.colorBits || 4,		// Quantization bits per channel
		sampleStep: opts.sampleStep || 1,	// Sample every Nth pixel
		count: opts.count || 2
	};

	// load image
	const img = new Image();

	// Allow cross-origin images if server sends CORS headers
	img.crossOrigin = 'anonymous';
	const loadPromise = new Promise((res, rej) => {
		img.onload = () => res();
		img.onerror = (e) => rej(new Error('Failed to load image: ' + src));
	});
	img.src = src;
	await loadPromise;

	// Draw to offscreen canvas
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	const sw = img.naturalWidth || img.width;
	const sh = img.naturalHeight || img.height;
	const scale = Math.min(1, cfg.maxSize / Math.max(sw, sh));
	const w = Math.max(1, Math.round(sw * scale));
	const h = Math.max(1, Math.round(sh * scale));
	canvas.width = w;
	canvas.height = h;
	ctx.drawImage(img, 0, 0, w, h);

	const data = ctx.getImageData(0, 0, w, h).data;
	const shift = 8 - cfg.colorBits;
	const buckets = new Map();
	let total = 0;

	for (let y = 0; y < h; y += cfg.sampleStep) {
		for (let x = 0; x < w; x += cfg.sampleStep) {
			const i = (y * w + x) * 4;
			const a = data[i + 3];
			if (a === 0) continue; // Ignore fully transparent
			const r = data[i] >> shift;
			const g = data[i + 1] >> shift;
			const b = data[i + 2] >> shift;
			const key = (r << (cfg.colorBits * 2)) | (g << cfg.colorBits) | b;
			buckets.set(key, (buckets.get(key) || 0) + 1);
			total++;
		}
	}

	if (total === 0) return [];

	const items = Array.from(buckets.entries()).map(([key, count]) => {
		const mask = (1 << cfg.colorBits) - 1;
		const b = key & mask;
		const g = (key >> cfg.colorBits) & mask;
		const r = (key >> (cfg.colorBits * 2)) & mask;
		return { r, g, b, count };
	}).sort((a, b) => b.count - a.count);

	function bucketToFull(v) {
		const maxBucket = (1 << cfg.colorBits) - 1;
		return Math.round((v + 0.5) * 255 / (maxBucket + 1));
	}
	function colorDist(a, b) {
		return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
	}
	function compToHex(c) {
		const s = c.toString(16);
		return s.length === 1 ? '0' + s : s;
	}
	function rgbToHex(r, g, b) {
		return '#' + compToHex(r) + compToHex(g) + compToHex(b);
	}
	// Perceived luminance (sRGB, Rec. 709 weights)
	function brightnessOf(r, g, b) {
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	}

	const top = [];
	const chosen = [];
	for (let i = 0; i < items.length && top.length < cfg.count; i++) {
		const it = items[i];
		const fr = bucketToFull(it.r);
		const fg = bucketToFull(it.g);
		const fb = bucketToFull(it.b);

		// Skip if near-duplicate of already chosen
		if (chosen.some(c => colorDist(c, { r: fr, g: fg, b: fb }) < 30)) continue;
		chosen.push({ r: fr, g: fg, b: fb });

		const bness = brightnessOf(fr, fg, fb);
		top.push({
			rgb: [fr, fg, fb],
			hex: rgbToHex(fr, fg, fb),
			percent: (it.count / total) * 100,
			brightness: bness
		});
	}

	// SORT THE TOP COLORS BY BRIGHTNESS (brightest first)
	top.sort((b,a) => b.brightness - a.brightness);
	return top;
}

// Gets the luminance of a color (percieved brightness)
export function getLuminance(r, g, b) {
	let a = [r, g, b].map(v => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

// Gets the contrast of a color (percieved)
export function getContrast(rgb1, rgb2) {
	const L1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
	const L2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
	const lighter = Math.max(L1, L2);
	const darker  = Math.min(L1, L2);
	return (lighter + 0.05) / (darker + 0.05);
}

