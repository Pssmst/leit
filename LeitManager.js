const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

class LeitManager {
	// Creates a leit file using data from an audio file
	static async packageNewSong(audioFilePath, discographyName) {
		// Import and parse metadata
		const mm = await import('music-metadata');
		const metadata = await mm.parseFile(audioFilePath);
		const { common, format } = metadata;

		// Extract song data
		const rawSongName = common.title || path.basename(audioFilePath, path.extname(audioFilePath));
		const date = common.year ? common.year.toString() : new Date().toISOString().split('T')[0];
		const duration = format.duration;

		// Extract cover art
		let coverBuffer = null;
		let coverExt = 'jpg';
		if (common.picture && common.picture.length > 0) {
			coverBuffer = common.picture[0].data;
			coverExt = common.picture[0].format === 'image/png' ? 'png' : 'jpg';
		}

		// Set up internal files for the ZIP
		const audioExt = path.extname(audioFilePath).toLowerCase();
		const internalAudioName = `audio${audioExt}`;
		const internalCoverName = coverBuffer ? `cover.${coverExt}` : null;

		// Generate the metadata.json object
		const internalMetadata = {
			name: rawSongName,
			alternateNames: null,
			date: date,
			daw: null,
			shortDescription: null,
			longDescription: null,
			duration: duration,
			structure: null,
			motifs: null,
			internalAudio: internalAudioName,
			internalCover: internalCoverName
		};

		// Filter everything out for a safe name
		const safeFileName = rawSongName
			.normalize("NFKD")						// Normalize unicode
			.replace(/[<>:"/\\|?*\x00-\x1F]/g, '')	// Remove invalid Windows chars
			.replace(/\s+/g, ' ')					// Collapse whitespace
			.trim()
			.replace(/[. ]+$/, '');					// No trailing dot or space
		
		// Prevent the name from being something Windows doesn't allow
		const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
		let finalBaseName = safeFileName || 'untitled';
		if (reserved.test(finalBaseName)) {
			finalBaseName = `_${finalBaseName}`;
		}
		const leitFileName = `${finalBaseName}.leit`;

		// Prepare the destination folder
		const dataFolder = path.join(__dirname, 'src', 'assets', 'data', discographyName);
		if (!fs.existsSync(dataFolder)) {
			fs.mkdirSync(dataFolder, { recursive: true });
		}

		// Build the ZIP
		const zip = new AdmZip();
		
		// Add audio
		zip.addLocalFile(audioFilePath, "", internalAudioName);
		
		// Add cover
		if (coverBuffer) {
			zip.addFile(internalCoverName, coverBuffer);
		}
		
		// Add metadata
		zip.addFile("metadata.json", Buffer.from(JSON.stringify(internalMetadata, null, 4), "utf8"));

		// Save to disk
		const finalPath = path.join(dataFolder, leitFileName);
		zip.writeZip(finalPath);

		return {
			leitFileName: leitFileName,
			fullPath: finalPath
		};
	}

	static updateMetadata(leitFilePath, updatedFields) {
		try {
			const zip = new AdmZip(leitFilePath);
			
			// Get the existing metadata so we don't lose internal references
			const metadataEntry = zip.getEntry("metadata.json");
			if (!metadataEntry) throw new Error("metadata.json not found in bundle");

			const existingMetadata = JSON.parse(metadataEntry.getData().toString('utf8'));

			// Merge existing data with new fields
			const newMetadata = {
				...existingMetadata,
				...updatedFields
			};

			// Add the updated file back to the ZIP (overwrites the old one)
			zip.addFile("metadata.json", Buffer.from(JSON.stringify(newMetadata, null, 4), "utf8"));

			// Save the ZIP back to the original path
			zip.writeZip(leitFilePath);
			
			return { success: true, metadata: newMetadata };
		}
		catch (err) {
			console.error("Metadata Update Error:", err);
			return { success: false, error: err.message };
		}
	}

	static updateSongCover(leitPath, newImagePath) {
		try {
			const zip = new AdmZip(leitPath);

			const existingCover = zip.getEntries().find(e => e.entryName.startsWith('cover'));
			if (existingCover) zip.deleteFile(existingCover.entryName);

			const ext = path.extname(newImagePath).slice(1).toLowerCase() || 'jpg';
			const imageBuffer = fs.readFileSync(newImagePath);
			const newCoverName = `cover.${ext}`;
			zip.addFile(newCoverName, imageBuffer);

			// Keep metadata.internalCover in sync
			const metadataEntry = zip.getEntry('metadata.json');
			if (metadataEntry) {
				const meta = JSON.parse(metadataEntry.getData().toString('utf8'));
				meta.internalCover = newCoverName;
				zip.addFile('metadata.json', Buffer.from(JSON.stringify(meta, null, 4), 'utf8'));
			}

			zip.writeZip(leitPath);
			return { success: true };
		}
		catch (err) {
			console.error('updateSongCover error:', err);
			return { success: false, error: err.message };
		}
	}
}
module.exports = LeitManager;