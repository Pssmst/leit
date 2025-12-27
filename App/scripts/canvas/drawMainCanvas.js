import { state }                        from '../state/appState.js';
import * as init                        from '../init.js';
import * as HTML                        from '../state/elements.js';
import * as cnv                         from '../canvas/canvas.js';
import * as helpers                     from '../helpers.js';
import * as motifRegistry               from '../motif.js';
import * as aud                         from '../audio/audio.js';
import * as render                      from '../render/render.js';
import * as textures                    from '../render/textures.js';
import * as discography                 from '../discography.js';

export function drawMainCanvas() {
    cnv.ctx.clearRect(0, 0, cnv.canvas.width, cnv.canvas.height);

    // Calculate FPS
    if (!window._lastFpsTime) window._lastFpsTime = performance.now();
    if (!window._lastFpsFrame) window._lastFpsFrame = state.debug.frame;
    let currentFPS = 0;
    const now = performance.now();
    if (now - window._lastFpsTime > 500) {
        currentFPS = ((state.debug.frame - window._lastFpsFrame) / ((now - window._lastFpsTime) / 1000)).toFixed(0);
        window._lastFpsTime = now;
        window._lastFpsFrame = state.debug.frame;
        window._lastFpsValue = currentFPS;
    } else {
        currentFPS = window._lastFpsValue || "0";
    }

    ///////  ALBUMS  ////////////////////////////////////////////////////

    let yOffset = 40;
    let xOffset;

    // For rendering loaded songs
    let audioCachePathList = [];
    for (const [bufferKey, bufferValue] of aud.audioCache) {
        audioCachePathList.push(bufferKey);
    }

    // Draw things for each song

    for (const album of discography.albums) {
        for (const disc of album.discs) {
            xOffset = 20;
            for (const song of disc.songs) {

                // Assign song position for hitbox detection
                song.x = xOffset + state.dragging.pos.x;
                song.y = yOffset + state.dragging.pos.y;
                
                // Use forced width, otherwise fallback to natural image width
                song.cover.projectedWidth =
                    (state.album.forcedDimension !== null)
                        ? state.album.actualDimension
                    : (song.cover && song.cover.width)
                        ? song.cover.width * state.album.scale
                    : 0;

                // Draw white border if that song is selected
                if ((song === state.hoveredSong && state.hovering.canvas) || song === state.selectedSong) {
                    render.drawRect(
                        cnv.ctx,
                        song.x - state.album.outlineOffset, song.y - state.album.outlineOffset,
                        song.cover.projectedWidth + 2*state.album.outlineOffset, song.cover.projectedWidth + 2*state.album.outlineOffset,
                        (song === state.selectedSong ? '#fff' : (HTML.bigCoverOverlay.classList.contains('active') ? 'transparent' : '#ccc'))
                    );
                    render.drawRect(
                        cnv.ctx,
                        song.x - state.album.outlineOffset/2, song.y - state.album.outlineOffset/2,
                        song.cover.projectedWidth + state.album.outlineOffset, song.cover.projectedWidth + state.album.outlineOffset,
                        '#000'
                    );
                }

                // Draw album cover
                render.drawImage(cnv.ctx, song.cover, {
                    x: song.x,
                    y: song.y,
                    scale: state.album.scale,
                    forcedWidth: state.album.forcedDimension,
                    forcedHeight: state.album.forcedDimension,
                    //fillStyle: (song === state.selectedSong || state.selectedSong === undefined ? null : 'rgba(0, 0, 0, 0.4)')
                });

                // Draw little "loaded" indicators on songs to indicate loaded status
                // Iterate through audiocache and songsDict
                if (state.debug.visuals[1]) {
                    if (audioCachePathList.includes(song.songPath)) {
                        render.drawCircle(cnv.ctx, song.x + state.album.actualDimension / 10, song.y + state.album.actualDimension / 10, state.album.actualDimension / 8, '#77ff00', { strokeColor: 'black'});
                    }
                    else {
                        render.drawCircle(cnv.ctx, song.x + state.album.actualDimension / 10, song.y + state.album.actualDimension / 10, state.album.actualDimension / 8, 'red', { strokeColor: 'black'});
                    }
                }
                
                let nameStr = helpers.truncateString(song.preferredName, song.cover.projectedWidth);

                render.drawText(cnv.ctx, nameStr, { x: xOffset + state.dragging.pos.x + (song.cover.projectedWidth - render.getTextWidth(cnv.ctx, nameStr)) / 2, y: yOffset + state.dragging.pos.y - state.font.size.default * 1.4 });
                xOffset += (song.cover.projectedWidth + state.album.xGap);
            }
            yOffset += state.album.actualDimension + state.album.yGap;
        }
        yOffset += state.album.actualDimension + state.album.yGap;
    }

    ///////  TIMELINE  ////////////////////////////////////////////////////

    // Render HTML.spinner and line
    if (state.selectedSong != null) {
        const lineRect = HTML.line.getBoundingClientRect();
        state.audio.elapsed = Math.min(aud.getPlaybackTime(), state.selectedSong.duration); // Ask audio module what the current playback time is (respects pause)

        // Load next song if the HTML.spinner is at least 1/4 of the way through the song
        if (!state.audio.loadedSurroundingSongs && state.audio.elapsed >= state.selectedSong.duration / 4) {
            state.audio.loadedSurroundingSongs = true;
            const loadedSongPrev = init.getNextSong(state.selectedSong, -1, 0);
            const loadedSongNext = init.getNextSong(state.selectedSong, 1, 0);

            if (loadedSongPrev) {
                aud.loadAudio(loadedSongPrev.songPath);
            }
            if (loadedSongNext) {
                aud.loadAudio(loadedSongNext.songPath);
            }
        }

        let elapsedDivText;
        let remainingDivText;

        // Compute the percentage that the HTML.spinner resides on
        if (state.dragging.timelineSpinner) {
            state.audio.elapsedPercent = Math.max(Math.min((state.pos.canvas.x - lineRect.left) / lineRect.width, 1), 0);
            state.audio.elapsedPercentInTime = state.selectedSong.duration * state.audio.elapsedPercent;

            elapsedDivText = helpers.secondsToTimestamp(state.audio.elapsedPercentInTime);
            remainingDivText = `-` + helpers.secondsToTimestamp(state.selectedSong.duration - state.audio.elapsedPercentInTime);
        }
        else {
            state.audio.elapsedPercent = Math.max(Math.min(state.audio.elapsed / state.selectedSong.duration, 1), 0);

            elapsedDivText = helpers.secondsToTimestamp(state.audio.elapsed);
            remainingDivText = `-` + helpers.secondsToTimestamp(state.selectedSong.duration - state.audio.elapsed);
        }

        if (state.loading) {
            elapsedDivText = '0:00';
            remainingDivText = '-0:00';
            state.audio.elapsedPercent = 0;
        }

        HTML.elapsedDiv.textContent = elapsedDivText;
        HTML.remainingDiv.textContent = remainingDivText;
        
        // Compute HTML.spinner position along the timeline
        let xPos = (state.loading && !state.dragging.timelineSpinner ? 0 : state.audio.elapsedPercent * lineRect.width) - HTML.spinner.offsetWidth / 2;

        HTML.spinner.style.left = `${xPos}px`;
        document.documentElement.style.setProperty('--color-line-gradient', `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${state.audio.elapsedPercent*100}%, var(--color-line-unplayed) ${state.audio.elapsedPercent*100}%, var(--color-line-unplayed) 100%)`);

        ///////  VOLUME LINE  ////////////////////////////////////////////////////

        if (state.dragging.volumeSpinner && state.selectedSong && !state.loading) {
            aud.setVolume(state.audio.volume);
        }

        // Render volume HTML.spinner and line
        const volumeLineRect = HTML.volumeLine.getBoundingClientRect();

        // Compute the percentage that the volume HTML.spinner resides on
        if (state.dragging.volumeSpinner) {
            state.audio.volume = Math.max(Math.min((state.pos.canvas.x - volumeLineRect.left) / volumeLineRect.width, 1), 0);
        }

        // Indicate volume through icon
        HTML.volumeIndicatorButton.classList.remove('fa-volume-mute', 'fa-volume-off', 'fa-volume-low', 'fa-volume-high');
        if (state.audio.volume === 1) {
            HTML.volumeIndicatorButton.classList.add('fa-volume-high');
        }
        else if (state.audio.volume > 0) {
            HTML.volumeIndicatorButton.classList.add('fa-volume-low');
        }
        else {
            HTML.volumeIndicatorButton.classList.add('fa-volume-mute');
        }
        
        const volumeXPos = state.audio.volume * volumeLineRect.width - HTML.spinner.offsetWidth / 2; // Compute HTML.spinner position along the timeline
        HTML.volumeSpinner.style.left = `${volumeXPos}px`;
        HTML.volumeLine.style.backgroundImage = `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${state.audio.volume*100}%, var(--color-line-unplayed) ${state.audio.volume*100}%, var(--color-line-unplayed) 100%)`;

        ///  CHECKS

        if (state.audio.elapsed === state.selectedSong.duration) {
            if (state.audio.looping) {
                setElapsed(0);
            }
            else {
                init.playNextSong(state.selectedSong, 1, state.audio.shuffle);
            }
        }
    }

    ///////  DEBUG  ////////////////////////////////////////////////////

    let debugLines = 0;

    function drawDebug(debugID, debugText, color='white') {
        if (!state.debug.visuals[debugID]) return;

        const lineCount = debugText.split('\n').length;
        render.drawRect(cnv.ctx, 0, state.font.size.default * debugLines, cnv.canvas.width, state.font.size.default * lineCount, 'rgba(0, 0, 0, 0.8)');
        render.drawText(cnv.ctx, debugText, { font: state.font.debug, y: state.font.size.default * debugLines, color: color, verticalSpacing: 1 });

        debugLines += lineCount; // advance the shared counter
    }

    drawDebug(0, `FPS: ${currentFPS} | KEY: ${state.debug.lastKeyPressed}`);

    let audioCacheString = '';

    // Iterate through audioCache and log fake IDs of format AlbumID.SongID to look cool in the debug menu haha
    if (state.debug.visuals[1]) {
        let i = 0;
        for (const [bufferKey, bufferValue] of aud.audioCache) {
            const bufferSong = init.songsDict[bufferKey];
            for (const album of discography.albums) {
                if (album.name === bufferSong.album) {
                    audioCacheString += ` ${album.id}'${String(bufferSong.id[0]).padStart(2, '0')} ${i === aud.MAX_CACHE_SIZE-1 ? ']' : '🡐'}`;
                }
            }
            i++;
        }
    }

    drawDebug(1,
        `\nAudioCache (${aud.MAX_CACHE_SIZE}): [${audioCacheString}`
        + `\nLast AudioCache Update Attempt: ${aud.timeSinceLastCacheUpdateAttempt.toFixed(2)} seconds ago (Threshold: ${aud.cacheUpdateThreshold}s)`
        + `\nLoaded Surrounding Songs: ${state.audio.loadedSurroundingSongs}`
        + `\nVolume: ${state.audio.volume}`,
        '#77ff00'
    );

    ///////  SONG STRUCTURE (INCLUDES DEBUG)  ////////////////////////////////////////////////////

    if (!state.selectedSong || state.loading) {
        state.debug.structureString = `\nN/A`;
    }

    // If structure exists
    else {
        if (state.selectedSong.structure && state.selectedSong.structure.length > 0) {
            
            // Last index i such that state.structure.startTimesOfEachStruct[i] <= state.audio.elapsed
            let currentStructIndex = 0;
            while (currentStructIndex + 1 < state.structure.startTimesOfEachStruct.length && state.audio.elapsed >= state.structure.startTimesOfEachStruct[currentStructIndex + 1]) {
                currentStructIndex++;
            }

            state.structure.currentStructInfo = state.selectedSong.structure[currentStructIndex][1];
            
            // Get resources to update state.font script variables using the current struct
            state.structure.durations = init.getStructDurations(state.structure.currentStructInfo);

            // Get state.audio.elapsed info for the current structure entry
            const currentStructElapsed = Math.max(0, state.audio.elapsed - state.structure.startTimesOfEachStruct[currentStructIndex]);
            const currentStructMeasuresElapsed = Math.floor(currentStructElapsed / state.structure.durations.durationOfMeasure);

            // Set state.font script variables
            state.structure.timeWithinMeasure = currentStructElapsed % state.structure.durations.durationOfMeasure;
            state.structure.currentMeasure = state.selectedSong.structure[currentStructIndex][0] + currentStructMeasuresElapsed;
            state.structure.currentBeat = Math.floor(state.structure.timeWithinMeasure / state.structure.durations.durationOfBeat) + 1;

            // Sum full spans between each consecutive struct to get the total number of measures up to the last struct
            let countMeasures = 0;
            for (let i = 0; i < state.selectedSong.structure.length - 1; i++) {
                const thisMeasure = state.selectedSong.structure[i][0];
                const nextMeasure = state.selectedSong.structure[i+1][0];
                const span = nextMeasure - thisMeasure;
                countMeasures += Math.max(0, span);
            }

            // Determine how many measures there are after the last struct begins
            const lastStructIndex = state.selectedSong.structure.length - 1;
            const lastStructMeasureDuration = init.getStructDurations(state.selectedSong.structure[lastStructIndex][1]).durationOfMeasure;

            // How many full measures since the last struct started
            const secondsFromLastStructToSongEnd = Math.max(0, state.selectedSong.duration - (state.structure.startTimesOfEachStruct[lastStructIndex] || 0));
            const fullMeasuresSinceStructStart = Math.floor(secondsFromLastStructToSongEnd / lastStructMeasureDuration);
            
            const startTimeOfLastMeasure = (state.structure.startTimesOfEachStruct[lastStructIndex] || 0) + (fullMeasuresSinceStructStart * lastStructMeasureDuration);
            const lastMeasureDuration = state.selectedSong.duration - startTimeOfLastMeasure;

            // If the last measure's length in seconds is less than THIS fraction of seconds of a whole measure, don't include it
            const totalMeasureFraction = 0.1;
            let lastStructTotalMeasures = Math.max(0, fullMeasuresSinceStructStart+1);
            if (lastMeasureDuration < lastStructMeasureDuration * totalMeasureFraction) {
                lastStructTotalMeasures--;
            }

            // Set total number of measures
            state.selectedSong.totalMeasures = countMeasures + lastStructTotalMeasures;

            // Write debug info
            state.debug.structureString = `\nMEASURE: ${state.structure.currentMeasure} of ${state.selectedSong.totalMeasures}\nBEAT: ${state.structure.currentBeat}\nBPM: ${state.structure.currentStructInfo.bpm}\nTIME SIGNATURE: ${state.structure.durations.timeSignature.numerator}/${state.structure.durations.timeSignature.denominator}`;
            //state.debug.structureString += `\nLength of true last measure: ${lastMeasureDuration.toFixed(3)}s (${(lastMeasureDuration / lastStructMeasureDuration * 100).toFixed(3)}% < ${totalMeasureFraction * 100}%)`;
        }
        else {
            state.debug.structureString = `\nN/A`;
        }
    }
    drawDebug(2, state.debug.structureString, "#ffff00");

    // Draw debug 3

    if (state.debug.visuals[3]) {

        render.drawRect(cnv.ctx, 0, state.font.size.default * debugLines, cnv.canvas.width, state.font.size.default, 'rgba(0, 0, 0, 0.8)');
        debugLines++;

        for (const motif of init.motifs) {

            // String-ception
            let motifText = `${Object.keys(motif.occurrences).length} occ. - ${(`hsv(${motif.rawHSV.h},${motif.rawHSV.s}%,${motif.rawHSV.v}%)`).padEnd(18, " ")}- ${motif.name}`;

            render.drawRect(cnv.ctx, 0, state.font.size.default * debugLines, cnv.canvas.width, state.font.size.default, 'rgba(0, 0, 0, 0.8)');
            render.drawText(cnv.ctx, motifText, { font: state.font.debug, y: state.font.size.default * debugLines, color: motif.color, verticalSpacing: 1 });     
            debugLines++;
        }
    }

    state.debug.frame++;
}