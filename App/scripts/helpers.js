import { state }	from './state/state.js';
import * as cnv	 from './canvas/canvas.js';
import * as r	   from './canvas/render.js';

// Coverts seconds to "##:##:##"
export function secondsToTimestamp(time) {
	const leadingZeroFormatter = new Intl.NumberFormat(undefined, { minimumIntegerDigits: 2 });
	const seconds = Math.floor(time % 60);
	const minutes = Math.floor(time / 60) % 60;
	const hours = Math.floor(time / 3600);
	if (hours === 0) {
		return `${minutes}:${leadingZeroFormatter.format(seconds)}`;
	} else {
		return `${hours}:${leadingZeroFormatter.format(minutes)}:${leadingZeroFormatter.format(seconds)}`;
	}
}

// Gets a random integer between min and max, inclusive
export function randInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Coverts "##:##:##" to seconds
export function timestampToSeconds(timeStr) {
	if (!timeStr) return 0;
	const parts = timeStr.split(":").map(p => p.trim());
	const nums = parts.map(n => parseInt(n, 10) || 0);

	let seconds = 0;
	if (nums.length === 3) {
		seconds = nums[0] * 3600 + nums[1] * 60 + nums[2]; // hh:mm:ss
	}
	else if (nums.length === 2) {
		seconds = nums[0] * 60 + nums[1]; // mm:ss
	}
	else if (nums.length === 1) {
		seconds = nums[0]; // ss
	}
	return seconds;
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

export function hexToRGBA(hex, alpha = 1) {
	// Remove leading # if present
	hex = hex.replace(/^#/, "");

	// Trim hex if too long (VSCode can mess me up sometimes so I added this)
	if (hex.length > 6) {
		hex = hex.substring(0, 6);
	}
	// Expand shorthand format
	if (hex.length === 3) {
		hex = hex.split("").map(ch => ch + ch).join("");
	}
	// Throw error if still wrong somehow
	if (hex.length !== 6) {
		throw new Error(`Invalid hex color: ${hex}`);
	}

	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);

	return `rgba(${r},${g},${b},${alpha})`;
}


// MASTER color converter
// Supports rgb, hsv, hsl
export function convertColor(fromType, toType, values) {
	fromType = fromType.toLowerCase();
	toType = toType.toLowerCase();

	if (fromType === toType) return [...values];

	// RGB <-> HSL
	function rgbToHsl(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h, s, l = (max + min) / 2;

		if (max === min) {
			h = s = 0;
		} else {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h *= 60;
		}
		return [h, s * 100, l * 100];
	}

	function hslToRgb(h, s, l) {
		s /= 100;
		l /= 100;
		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs((h / 60) % 2 - 1));
		const m = l - c / 2;
		let r, g, b;
		if (h < 60)[r, g, b] = [c, x, 0];
		else if (h < 120)[r, g, b] = [x, c, 0];
		else if (h < 180)[r, g, b] = [0, c, x];
		else if (h < 240)[r, g, b] = [0, x, c];
		else if (h < 300)[r, g, b] = [x, 0, c];
		else [r, g, b] = [c, 0, x];
		return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
	}

	// RGB <-> HSV
	function rgbToHsv(r, g, b) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		const d = max - min;
		let h, s = max === 0 ? 0 : d / max,
			v = max;
		if (max === min) h = 0;
		else {
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h *= 60;
		}
		return [h, s * 100, v * 100];
	}

	function hsvToRgb(h, s, v) {
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

	// Bridging conversions
	function hsvToHsl(h, s, v) {
		s /= 100;
		v /= 100;
		const l = v * (1 - s / 2);
		const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
		return [h, sl * 100, l * 100];
	}

	function hslToHsv(h, s, l) {
		s /= 100;
		l /= 100;
		const v = l + s * Math.min(l, 1 - l);
		const sv = v === 0 ? 0 : 2 * (1 - l / v);
		return [h, sv * 100, v * 100];
	}

	// Conversion matrix
	const converters = {
		rgb: {
			hsl: rgbToHsl,
			hsv: rgbToHsv
		},
		hsl: {
			rgb: hslToRgb,
			hsv: hslToHsv
		},
		hsv: {
			rgb: hsvToRgb,
			hsl: hsvToHsl
		}
	};

	const fn = converters[fromType]?.[toType];
	if (!fn) throw new Error(`Unsupported conversion: ${fromType} -> ${toType}`);

	return fn(...values).map(v => +v.toFixed(2));
}


export function getLuminance(r, g, b) {
	let a = [r, g, b].map(v => {
		v /= 255;
		return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}


export function getContrast(rgb1, rgb2) {
	const L1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
	const L2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
	const lighter = Math.max(L1, L2);
	const darker  = Math.min(L1, L2);
	return (lighter + 0.05) / (darker + 0.05);
}


// Do complicated stuff to shorten string if too long
export function truncateString(string, maxWidth) {
	const stringWidth = r.getTextWidth(cnv.ctx, string);

	if (stringWidth > maxWidth) {
		let maxLen = string.length;
		while (maxLen > 0 && r.getTextWidth(cnv.ctx, string.substring(0, maxLen) + '…') > maxWidth) {
			maxLen--;
		}
		// If there's a space between the name and the ...
		if (string.substring(maxLen-1, maxLen) === ' ') { 
			string = string.substring(0, maxLen-1) + '…';
		} else {
			string = string.substring(0, maxLen) + '…';
		}
	}
	return string;
}