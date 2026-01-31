import { state }	from './state/state.js';
import { colors }	from './state/colors.js';
import * as cnv		from './canvas/canvas.js';
import * as render	from './canvas/render.js';

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

export function clamp(min, expression, max) {
	return Math.max(Math.min(expression, max), min);
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


// Do complicated stuff to shorten string if too long
export function truncateString(ctx, string, maxWidth, font = state.font.default, fontSize = state.font.size.default, scaleX = 1) {
	const scaledWidth = (s) => render.getTextWidth(ctx, s, font, fontSize) * scaleX;

	// Draw nothing if just ellipses don't fit
	if (scaledWidth('…') > maxWidth) {
		return '';
	}

	if (scaledWidth(string) <= maxWidth) {
		return string;
	}

	let maxLen = string.length;

	while (
		maxLen > 0 &&
		scaledWidth(string.substring(0, maxLen) + '…') > maxWidth
	) {
		maxLen--;
	}

	// Trim trailing space before ellipsis
	if (string.substring(maxLen - 1, maxLen) === ' ') {
		return string.substring(0, maxLen - 1) + '…';
	}

	return string.substring(0, maxLen) + '…';
}

// truncateString 2: Trunc Harder (Now with added squishing)
export function advancedTruncateString(ctx, string, maxWidth, {
	minScaleX = 1, maxScaleX = 1,
	minScaleY = 1, maxScaleY = 1,
	maxHeight = null,
	paddingX = 0,
	font = state.font.default, fontSize = state.font.size.default } = {}
) {
	// Vertical
	if (maxHeight === null) { maxHeight = fontSize; }
	const verticalOverflow = maxHeight / fontSize;
	const scaleY = Math.min(maxScaleY, Math.max(minScaleY, verticalOverflow));
	const scaledFontSize = fontSize * scaleY;

	// Horizontal
	const availableWidth = maxWidth - paddingX * 2;
	const stringWidth = render.getTextWidth(ctx, string, font, scaledFontSize);

	// Expand up to 1, squish down to limit
	const horizontalOverflow = availableWidth / stringWidth;
	const scaleX = Math.min(maxScaleX, Math.max(minScaleX, horizontalOverflow));

	// Truncate if still too wide
	let outputString = string;
	if (scaleX === minScaleX && stringWidth * scaleX > availableWidth) {
		outputString = truncateString(ctx, string, availableWidth, font, scaledFontSize, scaleX);
	}

	// Return necessary values
	return {
		string: outputString,
		font,
		fontSize: scaledFontSize,
		scaleX
	};
}