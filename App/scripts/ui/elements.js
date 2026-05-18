// Main
export const infoDiv				= document.getElementById('info');
export const timelineDiv			= document.getElementById('timeline');
export const timelineLeftDiv		= document.getElementById('timeline-left');
export const bigCoverWrapper		= document.getElementById('big-cover-wrapper');
export const bigCover				= document.getElementById('big-cover');
export const bigCoverOverlay		= document.getElementById('big-cover-overlay');
export const editButton				= document.getElementById('button-edit');

// Overlay
export const overlay = document.getElementById('loading-overlay');
export const bar = document.getElementById('loading-bar');
export const status = document.getElementById('loading-status');

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

// Meta
export const contextMenu			= document.getElementById('context-menu');

// New element function
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
		contentEditable = null,
		placeholder = null,
		type = null,
		value = null,
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
	if (contentEditable != null) element.contentEditable = contentEditable;
	if (placeholder != null) element.setAttribute('placeholder', placeholder);
	if (type != null) element.type = type;
	if (value != null) element.value = value;

	// Render text as HTML (if provided)
	if (text != null) element.innerHTML = text;

	// Classes (of the form ["abc", ...] or "abc")
	if (Array.isArray(classes) && classes.length !== 0) {
		for (const cls of classes) {
			element.classList.add(cls);
		}
	}
	else if (typeof classes === 'string' && classes !== "") {
		element.classList.add(classes);
	}

	// Prevent weird orange outline from appearing on input tags
	if (tag === 'input' || tag === 'button' || contentEditable) {
		element.style = "outline: none";
	}

	// Append to parent
	const parentElement = parent === "body" ? document.body : document.getElementById(parent);

	if (!parentElement) {
		console.error(`newElement: no parent element with id:"${parent}"`);
		return;
	}
	parentElement.appendChild(element);
}