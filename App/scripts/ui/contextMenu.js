import * as HTML from './elements.js';

document.addEventListener('contextmenu', (event) => {
	event.preventDefault();

	HTML.contextMenu.style.top = `${event.pageY}px`;
	HTML.contextMenu.style.left = `${event.pageX}px`;
	HTML.contextMenu.style.display = 'block';
});

document.addEventListener('click', () => {
	HTML.contextMenu.style.display = 'none';
});
