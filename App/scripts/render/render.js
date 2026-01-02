import { state } from '../state/state.js';
import { colors } from '../state/colors.js';


export function getTextWidth(ctx, text, font = state.font.default, fontSize = state.font.size.default) {
	ctx.font = fontSize + "px " + font;
	const lines = text.split("\n");
	let maxWidth = 0;
	for (let i = 0; i < lines.length; i++) {
		const { width } = ctx.measureText(lines[i]);
		if (width > maxWidth) maxWidth = width;
	}
	return maxWidth;
}


export function drawText(
	ctx, text, {
		x = 0,
		y = 0,
		font = state.font.default,
		fontSize = state.font.size.default,
		color = colors.default,
		scaleX = 1,
		scaleY = 1,
		alpha = 1,
		verticalSpacing = state.font.verticalSpacing,
		weight = 'normal',
		outlineColor = colors.transparent,
		outlineWidth = 0,
	} = {}
) {
	ctx.save();
	ctx.globalAlpha = alpha;
	ctx.translate(x, y);
	ctx.scale(scaleX, scaleY);

	const fontWeight = weight;
	ctx.font = `${fontWeight} ${fontSize}px ${font}`;
	ctx.textBaseline = "top";
	ctx.fillStyle = color;

	// Only set stroke if outline requested
	if (outlineWidth > 0) {
		ctx.strokeStyle = outlineColor;
		ctx.lineWidth = Math.max(0, outlineWidth);
		ctx.lineJoin = 'round';
	} else {
		ctx.lineWidth = 0;
		ctx.strokeStyle = colors.transparent;
	}

	const lines = text.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const lineY = i * fontSize * verticalSpacing;
		const line = lines[i];

		// Reassign font in loop only if I change font per line
		ctx.font = `${fontWeight} ${fontSize}px ${font}`;

		if (outlineWidth > 0 && ctx.lineWidth > 0) ctx.strokeText(line, 0, lineY);
		ctx.fillText(line, 0, lineY);
	}
	ctx.restore();
}



export function drawLine(ctx, x1, y1, x2, y2, color = colors.default, lineWidth = 1) {
	ctx.strokeStyle = color;
	ctx.lineWidth = lineWidth;
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(x2, y2);
	ctx.stroke();
	ctx.strokeStyle = colors.default;
}

export function drawRect(
	ctx, x, y, width, height, color, {
		shadow = false,
	} = {}
) {
	let shadowColor = 'rgba(0, 0, 0, 0.5)';
	let shadowBlur = 10;
	let shadowOffsetX = 0;
	let shadowOffsetY = 4;
	let inner = false;

	let top = true;
	let right = true;
	let bottom = true;
	let left = true;

	// Allow shorthand: shadow can be an object with options
	if (typeof shadow === 'object' && shadow !== null) {
		shadowColor = shadow.shadowColor ?? shadowColor;
		shadowBlur = shadow.shadowBlur ?? shadowBlur;
		shadowOffsetX = shadow.shadowOffsetX ?? shadowOffsetX;
		shadowOffsetY = shadow.shadowOffsetY ?? shadowOffsetY;
		inner = shadow.inner ?? inner;

		top = shadow.top ?? top;
		right = shadow.right ?? right;
		bottom = shadow.bottom ?? bottom;
		left = shadow.left ?? left;
		
		shadow = true;
	}

	// Helper: convert a color string (hex, rgb(), rgba()) to an rgba(...) string with alpha 0
	function transparentize(col) {
		col = (col || '').trim();
		if (col.startsWith('rgba')) {
			// replace last value with 0
			return col.replace(/rgba\(([^,]+),([^,]+),([^,]+),([^\)]+)\)/, 'rgba($1,$2,$3,0)');
		}
		if (col.startsWith('rgb(')) {
			const m = col.match(/rgb\(([^,]+),([^,]+),([^\)]+)\)/);
			if (m) return `rgba(${m[1]},${m[2]},${m[3]},0)`;
		}
		if (col[0] === '#') {
			// simple hex to rgba conversion (supports #rgb and #rrggbb)
			let hex = col.slice(1);
			if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
			const r = parseInt(hex.slice(0,2), 16);
			const g = parseInt(hex.slice(2,4), 16);
			const b = parseInt(hex.slice(4,6), 16);
			return `rgba(${r},${g},${b},0)`;
		}
		// fallback
		return 'rgba(0,0,0,0)';
	}

	// OUTER shadow simple path (save/restore so it doesn't leak)
	if (shadow && !inner) {
		ctx.save();
		ctx.shadowColor = shadowColor;
		ctx.shadowBlur = shadowBlur;
		ctx.shadowOffsetX = shadowOffsetX;
		ctx.shadowOffsetY = shadowOffsetY;

		ctx.fillStyle = color;
		ctx.fillRect(x, y, width, height);

		ctx.restore();
		return;
	}

	// INNER shadow using inside gradients (no offscreen canvas) — more reliable and fast
	if (shadow && inner) {
		ctx.save();

		// draw base fill first
		ctx.fillStyle = color;
		ctx.fillRect(x, y, width, height);

		// clip to rect so gradients stay inside
		ctx.beginPath();
		ctx.rect(x, y, width, height);
		ctx.clip();

		// prepare gradient edge colors
		const innerTransparent = transparentize(shadowColor);

		if (shadowBlur > 0) {

			// Top gradient
			if (top) {
				const gTop = ctx.createLinearGradient(0, y, 0, y + shadowBlur);
				gTop.addColorStop(0, shadowColor);
				gTop.addColorStop(1, innerTransparent);
				ctx.fillStyle = gTop;
				ctx.fillRect(x, y, width, shadowBlur);
			}

			// Bottom gradient
			if (bottom) {
				const gBot = ctx.createLinearGradient(0, y + height, 0, y + height - shadowBlur);
				gBot.addColorStop(0, shadowColor);
				gBot.addColorStop(1, innerTransparent);
				ctx.fillStyle = gBot;
				ctx.fillRect(x, y + height - shadowBlur, width, shadowBlur);
			}

			// Left gradient
			if (left) {
				const gLeft = ctx.createLinearGradient(x, 0, x + shadowBlur, 0);
				gLeft.addColorStop(0, shadowColor);
				gLeft.addColorStop(1, innerTransparent);
				ctx.fillStyle = gLeft;
				ctx.fillRect(x, y, shadowBlur, height);
			}

			// Right gradient
			if (right) {
				const gRight = ctx.createLinearGradient(x + width, 0, x + width - shadowBlur, 0);
				gRight.addColorStop(0, shadowColor);
				gRight.addColorStop(1, innerTransparent);
				ctx.fillStyle = gRight;
				ctx.fillRect(x + width - shadowBlur, y, shadowBlur, height);
			}
		}

		ctx.restore();
		return;
	}

	// NO SHADOW path
	ctx.save();
	ctx.fillStyle = color;
	ctx.fillRect(x, y, width, height);

	ctx.restore();
}


export function drawBorder(ctx, x, y, width, height, color = colors.default, lineWidth = 1) {
	ctx.strokeStyle = color;
	ctx.lineWidth = lineWidth;
	ctx.strokeRect(x, y, width, height);
	ctx.strokeStyle = colors.default;
}


export function drawImage(ctx, img, { x = 0, y = 0, scale = 1, xScale = 1, yScale = 1, forcedWidth = null, forcedHeight = null, fillStyle = null } = {}) {
	const drawW = (forcedWidth === null ? (img?.width || 0) : forcedWidth) * scale * xScale;
	const drawH = (forcedHeight === null ? (img?.height || 0) : forcedHeight) * scale * yScale;

	ctx.imageSmoothingEnabled = false;

	ctx.drawImage(img, x, y, drawW, drawH);

	if (fillStyle != null) {
		ctx.fillStyle = fillStyle;
		ctx.fillRect(x, y, drawW, drawH);
	}
}

export function drawCircle(
	ctx, x, y, radius, color = colors.default, {
		strokeColor = null,
		lineWidth = 1,
		fill = true,
		startAngle = 0,
		endAngle = Math.PI * 2,
		anticlockwise = false,
	} = {}
) {
	ctx.save();

	ctx.beginPath();
	ctx.arc(x, y, radius, startAngle, endAngle, anticlockwise);

	if (fill) {
		ctx.fillStyle = color;
		ctx.fill();
	}

	if (strokeColor) {
		ctx.strokeStyle = strokeColor;
		ctx.lineWidth = lineWidth;
		ctx.stroke();
		ctx.strokeStyle = colors.default; // reset to default for consistency
	}

	ctx.restore();
}