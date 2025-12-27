import { state }                        from './state/appState.js';
import * as HTML                        from './state/elements.js';
import * as cnv                         from './canvas/canvas.js';
import * as helpers                     from './helpers.js';
import * as motifRegistry               from './motif.js';
import * as aud                         from './audio/audio.js';
import * as render                      from './render/render.js';
import * as textures                    from './render/textures.js';
import * as init                        from './init.js';
import * as discography                 from './discography.js';

import { drawMainCanvas }               from './canvas/drawMainCanvas.js';
import { drawTrackCanvas }              from './canvas/drawTrackCanvas.js';

async function main() {
    // Wait for images to be ready
    await textures.preloadTextures();

    init.initMain();

    ///////  ANIMATION LOOP  ////////////////////////////////////////////////////

    function animate() {
        drawMainCanvas();
        drawTrackCanvas();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);


    ///////  REGISTER KEYPRESSES  ////////////////////////////////////////////////////

    // Return mouse position in canvas CSS-pixel coordinates
    function toCanvasCoords(event) {
        const canvasRect = cnv.canvas.getBoundingClientRect();
        state.pos.canvas.x = event.clientX - canvasRect.left;
        state.pos.canvas.y = event.clientY - canvasRect.top;

        const trackCanvasRect = cnv.trackCanvas.getBoundingClientRect();
        state.pos.trackCanvas.x = event.clientX - trackCanvasRect.left;
        state.pos.trackCanvas.y = event.clientY - trackCanvasRect.top;
    }

    function pause() {
        aud.pauseMusic();
        HTML.playButton.style.display = "inline-grid";
        HTML.pauseButton.style.display = "none";
    }

    function play() {
        aud.resumeMusic();
        HTML.pauseButton.style.display = "inline-grid";
        HTML.playButton.style.display = "none";
    }

    async function setElapsed(newTime) {
        if (!state.loading) {
            // If currently playing, keep playing after seek; if paused, keep paused
            const playImmediately = !aud.isPlaybackPaused();
            await aud.setPlaybackTime(newTime, playImmediately);
        }
    }

    function setPanelWidth(n) {
        if (n < (cnv.canvas.width / 3) - (init.css_infoPaddingHorizontal * 2) && n > 228) {
            init.css_infoWidth = n;
            document.documentElement.style.setProperty("--value-info-width", `${init.css_infoWidth}px`);
        }
    }

    window.addEventListener("keydown", async event => {
        state.debug.lastKeyPressed = event.code; // Update last key code

        switch (event.code) {
            // Debug keys
            case "Digit1":
                state.debug.visuals[0] = !state.debug.visuals[0];
                break;
            case "Digit2":
                state.debug.visuals[1] = !state.debug.visuals[1];
                break;
            case "Digit3":
                state.debug.visuals[2] = !state.debug.visuals[2];
                break;
            case "Digit4":
                state.debug.visuals[3] = !state.debug.visuals[3];
                break;
            case "Digit5":
                state.debug.visuals[4] = !state.debug.visuals[4];
                break;
            
            // Pause
            case "Space":
                if (aud.isPlaybackPaused()) play();
                else pause();
                break;

            // Forward and backward in song
            case "ArrowLeft":
                setElapsed(state.audio.elapsed - 3);
                break;
            case "ArrowRight":
                setElapsed(state.audio.elapsed + 3);
                break;

            // Previous and next song
            case "KeyA":
                init.playNextSong(state.selectedSong, -1, state.audio.shuffle);
                break;
            case "KeyD":
                init.playNextSong(state.selectedSong, 1, state.audio.shuffle);
                break;

            // Scramble motif colors 
            case "KeyZ":
                motifRegistry.scrambleMotifColors(init.motifs);
                break;
            
            // Compress motifs 
            case "KeyC":
                state.trackTimeline.motifPanel.compressMotifs = !state.trackTimeline.motifPanel.compressMotifs;
                break;
            
            // Change motif height in track timeline (not panel) 
            case "Minus":
                state.trackTimeline.motifPanel.motifHeight--;
                break;
            case "Equal":
                state.trackTimeline.motifPanel.motifHeight++;
                break;
        }
    });

    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('keydown', (e) => {
            e.preventDefault();
        });
    });

    window.addEventListener('wheel', event => {
        if (state.hovering.canvas) { 
            state.dragging.pos.y -= (event.deltaY / 2).toFixed(0);
        }
        if (state.hovering.motifPanel.self && state.trackTimeline.motifPanel.scrollbarNeeded) {
            state.trackTimeline.motifPanel.scrollOffset -= (event.deltaY / 4).toFixed(0);
        }
    });

    window.addEventListener('mousemove', event => {
        toCanvasCoords(event);

        // Move the camera if dragging
        if (state.dragging.canvas) {
            state.dragging.pos.x = state.dragging.pos.startX + state.pos.canvas.x - state.pos.canvas.clickX;
            state.dragging.pos.y = state.dragging.pos.startY + state.pos.canvas.y - state.pos.canvas.clickY;
        }

        state.hovering.canvas = init.determineCursorInCanvas();

        // Check hitbox
        const newHovered = init.getSongInCollidedHitbox();
        cnv.canvas.style.cursor = newHovered ? 'pointer' : 'auto';

        // Are we entering a different song? (only treat as "enter" when newHovered exists and is different)
        const enteringSong = (
            newHovered &&
            !(state.hoveredSong === newHovered ||
            (state.hoveredSong && newHovered && state.hoveredSong.songPath === newHovered.songPath))
        );

        if (enteringSong) {
            init.loadSongWithThresholdCheck(newHovered);
        }
        state.hoveredSong = newHovered; // Update state.hoveredSong for next state.debug.frame

        // HTML.infoDiv changes width on left-side

        const infoDivRect = HTML.infoDiv.getBoundingClientRect();
        const x = event.clientX - infoDivRect.left;

        state.hovering.infoDivLeftHitbox = (x >= -init.infoDivLeftHitboxWidth / 2 && x <= init.infoDivLeftHitboxWidth / 2);
        
        if (state.hovering.infoDivLeftHitbox || state.dragging.infoDiv) {
            document.body.style.cursor = 'col-resize';
            cnv.canvas.style.cursor = 'col-resize';

            if (!HTML.infoDiv.classList.contains('resizable')) {
                HTML.infoDiv.classList.add('resizable');
            }
        }
        else {
            document.body.style.cursor = 'auto';
            HTML.infoDiv.classList.remove('resizable');
        }

        if (state.dragging.infoDiv) {
            setPanelWidth(infoDivRect.right - event.clientX - init.css_infoPaddingHorizontal * 2);
            cnv.fitTrackCanvas();
        }
    });

    window.addEventListener('mousedown', event => {
        // Canvas coordinates
        toCanvasCoords(event); 
        state.pos.canvas.clickX = state.pos.canvas.x;
        state.pos.canvas.clickY = state.pos.canvas.y;

        // trackCanvas coordinates
        toCanvasCoords(event);
        state.pos.trackCanvas.clickX = state.pos.trackCanvas.x;
        state.pos.trackCanvas.clickY = state.pos.trackCanvas.y;

        // HTML.infoDiv coordinates (CSS pixels relative to HTML.infoDiv)
        const infoDivRect = HTML.infoDiv.getBoundingClientRect();
        const xInInfoDiv = event.clientX - infoDivRect.left;

        state.hovering.infoDivLeftHitbox = (xInInfoDiv >= -init.infoDivLeftHitboxWidth/2 && xInInfoDiv <= init.infoDivLeftHitboxWidth/2);

        if (event.button === 0) {
            if (state.hovering.infoDivLeftHitbox) {
                event.preventDefault();
                state.dragging.infoDiv = true;
            } 
            else if (state.hovering.canvas && !HTML.bigCoverOverlay.classList.contains('active')) {
                if (state.hoveredSong === null) {
                    state.dragging.canvas = true;
                    state.dragging.pos.startX = state.dragging.pos.x;
                    state.dragging.pos.startY = state.dragging.pos.y;
                }
                else {
                    state.selectedSong = state.hoveredSong;
                    init.initSong(state.selectedSong);
                }
            }
            else if (state.hovering.motifPanel.scrollbar) {

            }
        }
    });

    window.addEventListener('mouseup', event => {
        // Release the drag
        if (event.button === 0) {
            state.dragging.canvas = false;
            state.dragging.infoDiv = false;

            // Only applies if user is currently dragging the HTML.spinner of the timeline (so they can release anywhere on the window)
            if (state.dragging.timelineSpinner && state.selectedSong && !state.loading) {
                setElapsed(state.audio.elapsedPercentInTime);
                state.dragging.timelineSpinner = false;
            }

            if (state.dragging.volumeSpinner && state.selectedSong && !state.loading) {
                state.audio.lastManualVolume = state.audio.volume;
                state.dragging.volumeSpinner = false;
            }
        }
    });

    // BIG COVER EVENT LISTENERS

    HTML.bigCoverWrapper.addEventListener('mousemove', (e) => {
        const maxTilt = 5;

        const rect = HTML.bigCover.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = -(e.clientX - (rect.left + centerX)) / centerX * maxTilt;
        const rotateX =  (e.clientY - (rect.top  + centerY)) / centerY * maxTilt;

        HTML.bigCover.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        HTML.bigCover.classList.remove('inactive');
    });

    HTML.bigCoverWrapper.addEventListener('mouseleave', () => {
        HTML.bigCover.style.transform = ``;
        HTML.bigCover.classList.add('inactive');
    });

    // TIMELINE EVENT LISTENERS

    // When clicking on timeline
    HTML.lineContainer.addEventListener('mousedown', event => {
        if (event.button === 0) {
            state.dragging.timelineSpinner = true;
        }
    });

    HTML.shuffleButton.addEventListener('click', () => {
        state.audio.shuffle = (state.audio.shuffle + 1) % 3; // Cycle through state.audio.shuffle modes (0, 1, 2)

        // Remove all state.audio.shuffle-enabled classes first
        HTML.shuffleButton.classList.remove('enabled-1', 'enabled-2', 'enabled');

        if (state.audio.shuffle === 1) {
            HTML.shuffleButton.classList.add('enabled-1');
            HTML.shuffleButton.classList.add('enabled');
        }
        else if (state.audio.shuffle === 2) {
            HTML.shuffleButton.classList.add('enabled-2');
            HTML.shuffleButton.classList.add('enabled');
        }
    });

    HTML.backwardButton.addEventListener('click', () => init.playNextSong(state.selectedSong, -1, state.audio.shuffle));
    HTML.forwardButton.addEventListener('click', () => init.playNextSong(state.selectedSong, 1, state.audio.shuffle));

    HTML.pauseButton.addEventListener('click', () => pause() );
    HTML.playButton.addEventListener('click', () => play() );

    HTML.loopButton.addEventListener('click', () => {
        if (HTML.loopButton.classList.contains('enabled')) {
            HTML.loopButton.classList.remove('enabled');
            state.audio.looping = false;
        }
        else {
            HTML.loopButton.classList.add('enabled');
            state.audio.looping = true;
        }
        aud.setLoop(state.audio.looping);
    });

    // VOLUME EVENT LISTENERS

    // Opens the track below the timeline
    HTML.openTrackButton.addEventListener('click', () => {
        if (HTML.timelineDiv.classList.contains('opened-track')) {
            HTML.timelineDiv.classList.remove('opened-track');
            HTML.openTrackButton.classList.remove('enabled');
        }
        else {
            HTML.timelineDiv.classList.add('opened-track');
            HTML.openTrackButton.classList.add('enabled');

            // Wait until layout has been applied and then fit the canvas.
            // requestAnimationFrame ensures the DOM has updated layout.
            requestAnimationFrame(() => cnv.fitTrackCanvas());
        }
    });

    // When clicking volume line
    HTML.volumeLineContainer.addEventListener('mousedown', event => {
        if (event.button === 0) {
            event.preventDefault();
            state.dragging.volumeSpinner = true;
        }
    });
    
    // That thing when you click on the audio indicator and it mutes
    HTML.volumeIndicatorButton.addEventListener('click', () => {
        if (state.audio.volume === 0 && state.audio.lastManualVolume > 0) {
            state.audio.volume = state.audio.lastManualVolume;
        } else {
            state.audio.volume = 0;
        }
        aud.setVolume(state.audio.volume);
    })
}

main();