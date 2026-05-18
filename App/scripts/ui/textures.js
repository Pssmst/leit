const cache = {};
const pending = new Set(); // Prevents loading the same image twice at once

// Load this ONE image immediately at startup
export const fallback = new Image();
fallback.src = './assets/textures/covers/unknown.png'; // Adjust path if needed

function toUrl(path) {
	if (!path) return path;
	// If it's media://, send it as is
	if (path.startsWith('media://')) return path; 
	return path;
}

/**
 * Request a texture by its file path.
 * Returns the fallback image immediately if the real one isn't ready.
 */
export function get(path) {
	// If something goes wrong, display the default texture
	if (!path) return fallback;
	// If path already exists
	if (cache[path]) return cache[path];
	// If path is currently loading
	if (pending.has(path)) return fallback;

	// If path is needed
	pending.add(path);
	
	// Create new image
	const img = new Image();
	img.onload = () => {
		cache[path] = img;
		pending.delete(path);
	};

	// Check for errors
	img.onerror = () => {
		cache[path] = fallback;
		pending.delete(path);
	};

	img.src = toUrl(path);

	// If something goes wrong, display the default texture
	return fallback;
}

export function bust(path) {
	delete cache[path];
	pending.delete(path);
}

export function waitForLoad(path) {
	return new Promise((resolve) => {
		// Already cached and loaded
		if (cache[path] && cache[path] !== fallback) {
			resolve(cache[path]);
			return;
		}
		// Poll until the cache entry is filled
		const interval = setInterval(() => {
			if (cache[path] && cache[path] !== fallback) {
				clearInterval(interval);
				resolve(cache[path]);
			}
		}, 50);
	});
}

// DAW textures (these obviously don't change)
export const daws = {
	'Ableton':		'./assets/textures/daws/Ableton.jpg',
	'Bandlab':		'./assets/textures/daws/Bandlab.png',
	'GarageBand':	'./assets/textures/daws/GarageBand.png',
	'FL Studio':	'./assets/textures/daws/FL Studio.png',
	'Logic Pro':	'./assets/textures/daws/Logic Pro.png',
};
Object.values(daws).forEach(src => get(src));