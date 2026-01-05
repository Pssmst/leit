// Main
export const infoDiv				= document.getElementById('info');
export const timelineDiv			= document.getElementById('timeline');
export const timelineLeftDiv		= document.getElementById('timeline-left');
export const bigCoverWrapper		= document.getElementById('big-cover-wrapper');
export const bigCover				= document.getElementById('big-cover');
export const bigCoverOverlay		= document.getElementById('big-cover-overlay');

// Timeline
export const lineContainer			= document.getElementById('line-container');
export const line					= document.getElementById('line');
export const spinner				= document.getElementById('spinner');
export const shuffleButton			= document.getElementById('button-shuffle');
export const backwardButton			= document.getElementById('button-backward');
export const pauseButton			= document.getElementById('button-pause');
export const playButton				= document.getElementById('button-play');
export const forwardButton			= document.getElementById('button-forward');
export const loopButton				= document.getElementById('button-loop');
export const elapsedDiv				= document.getElementById('elapsed');
export const remainingDiv			= document.getElementById('remaining');

// Volume
export const openTrackButton		= document.getElementById('button-open-track');
export const volumeIndicatorButton	= document.getElementById('button-volume-indicator');
export const volumeLineContainer	= document.getElementById('volume-line-container');
export const volumeLine				= document.getElementById('volume-line');
export const volumeSpinner			= document.getElementById('volume-spinner');


export function newElement(
	tag, parent, {
		text = null,
		id = null,
		classes = null,
		href = null,
		src = null,
		width = null,
		height = null,
		display = null,
	} = {}
) {
	const element = document.createElement(tag);
	// Basic attributes
	if (id != null) element.id = id;
	if (href != null) element.href = href;
	if (src != null) element.src = src;
	if (width != null) element.width = width;
	if (height != null) element.height = height;
	if (display != null) element.style.display = display;

	// CSS classes
	if (classes != null) {
		for (const cls of classes) {
			element.classList.add(cls);
		}
	}

	// Render text as HTML (if provided)
	if (text != null) element.innerHTML = text;

	// Append to parent
	const parentElement = parent === "body" ? document.body : document.getElementById(parent);

	if (!parentElement) {
		console.error(`newElement: no parent element with id="${parent}"`);
		return;
	}
	parentElement.appendChild(element);
}