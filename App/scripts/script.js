import * as global from './global.js';
import * as r from './render.js';
import * as a from './audio.js';
import * as h from './helpers.js';
import * as discography from './discography.js';

async function main() {
    await global.preloadTextures(); // Wait for images to be ready
    discography.updateEverything();
    console.log(discography.albums);

    // Construct dictionary of all songs (no nested iterations needed for simple song reference calls)
    let songsDict = {};
    for (const album of discography.albums) {
        for (const disc of album.discs) {
            for (const song of disc.songs) {
                songsDict[song.songPath] = song;
            }
        }
    }

    // Construct motifs array
    let motifs = [];

    for (const song of Object.values(songsDict)) {

        for (const songMotif of song.motifs) {
            const songMotifName = songMotif[2];
            if (!songMotifName) continue;

            let found = false;

            for (const storedMotif of motifs) {
                if (songMotifName === storedMotif.name) {
                    if (!storedMotif.occurrences[song.name]) {
                        storedMotif.occurrences[song.name] = [];
                    }
                    storedMotif.occurrences[song.name].push([songMotif[0], songMotif[1]]);
                    found = true;
                    break;
                }
            }

            if (!found) {
                const m = new discography.Motif(songMotifName);
                // add the first occurrence from the original song right away
                m.occurrences[song.name] = [[songMotif[0], songMotif[1]]];
                motifs.push(m);
            }
        }
    }

    function scrambleMotifColors() {
        for (const motif of motifs) {
            let hue = h.randInt(0, 360);
            let sat = h.randInt(20, 100);
            let val = h.randInt(50, 100);

            const isCopyright = motif.name.substring(0,1) === '©';

            // Make motif black if plagiarism
            if (isCopyright) {
                hue = 0;
                sat = 0;
                val = 0;
            }

            // Keep raw HSV for your logic/UI
            motif.rawHSV = { h: hue, s: sat, v: val };

            // Convert and set a browser-safe CSS color string
            const [r, g, b] = h.convertColor('hsv', 'rgb', [hue, sat, val]);

            motif.color = `rgb(${r}, ${g}, ${b})`;

            // Create color for highlighted motifs (in motif panel)
            const motifBoxLighterGradient = h.convertColor('hsv', 'rgb', [ motif.rawHSV.h + 15, motif.rawHSV.s, Math.min(motif.rawHSV.v*1.5, 255) ]);

            if (isCopyright) {
                motif.color_highlight = `rgba(156, 162, 170, 1)`
            }
            else {
                motif.color_highlight = `rgb(${motifBoxLighterGradient[0]},${motifBoxLighterGradient[1]},${motifBoxLighterGradient[2]})`;
            }

            // Sees if the name needs to be inverted (darker)
            // Goes off 'percieved' colors
            const bgRGB = h.convertColor('hsv', 'rgb', [motif.rawHSV.h, motif.rawHSV.s, motif.rawHSV.v]);
            const cw = h.getContrast(bgRGB, [255, 255, 255]);
            const cb = h.getContrast(bgRGB, [0, 0, 0]) * .3; // Weighted bc I prefer having white text
        
            // Pick whichever has better contrast
            const color_raw_motifBoxTextDark = h.convertColor('hsv', 'rgb', [ motif.rawHSV.h, motif.rawHSV.s, motif.rawHSV.v*.2 ]);
            motif.color_text = (cw >= cb ? 'white' : `rgb(${color_raw_motifBoxTextDark[0]},${color_raw_motifBoxTextDark[1]},${color_raw_motifBoxTextDark[2]})`);
        }
    }
    scrambleMotifColors();

    function getMotif(name) {
        for (const motif of motifs) {
            if (motif.name === name) {
                return motif;
            }
        }
    }


    // Main variables

    const infoDiv = document.getElementById('info');
    const timelineDiv = document.getElementById('timeline');
    const timelineLeftDiv = document.getElementById('timeline-left');
    const bigCoverWrapper = document.getElementById('big-cover-wrapper');
    const bigCover = document.getElementById('big-cover');
    const bigCoverOverlay = document.getElementById('big-cover-overlay');
    
    const CSSinfoPaddingHorizontal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-padding-horizontal').trim());
    let CSSinfoWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--value-info-width').trim());

    const albumScale = 2.5;
    const albumForcedDimension = 32;
    const albumActualDimension = albumForcedDimension * albumScale;
    const albumXGap = albumForcedDimension * .4;
    const albumYGap = global.fontSize * 2;
    const albumOutlineOffset = albumForcedDimension / 8; // In pixels

    let loading = false;
    let hoveredSong;
    let selectedSong;

    let volumePercent = 0.5;
    let shuffle = 0;
    let isLooping = false;
    let loadedSurroundingSongs = false;

    const infoDivLeftHitboxWidth = 10;
    let in_infoDivLeftHitbox = false;
    let draggingInfoDiv = false;


    // Song variables

    let startTimesOfEachStruct;
    let currentStructInfo;

    let durations;
    let timeWithinMeasure;
    let currentMeasure;
    let currentBeat;


    // Track variables

    let ttZoom = 1;
    let ttMotifHeight = 20;
    let ttPanelScrollbarNeeded = false;
    let ttPanelScrollOffset = 0;
    let compressMotifs = true;


    // Mouse variables

    let pos;                            /* Contains
                                            x: Current x position of the mouse (canvas coords)
                                            y: Current x position of the mouse (canvas coords)
                                        */

    let clickX = 0, clickY = 0;         // Last position of mouse click (canvas coords)
    let dragX = 0, dragY = 0;           // Current accumulated pan offset
    let startDragX = 0, startDragY = 0; // Pan offset at drag start
    let draggingCanvas = false;
    let in_canvas = false;

    let tcPos;                          // Mouse pos (trackCanvas coords)
    let tcClickX = 0, tcClickY = 0;     // Last position of mouse click (trackCanvas coords)

    let in_motifPanel = false;
    let in_motifBox = false;
    let in_ttPanelScrollbarFG = false;


    // Timeline variables

    let elapsed;
    let elapsedPercent;
    let elapsedPercentInTime;
    let draggingSpinner = false;

    const lineContainer = document.getElementById('line-container');
    const line = document.getElementById('line');
    const spinner = document.getElementById('spinner');
    const spinnerSize = spinner.offsetWidth;

    const shuffleButton = document.getElementById('button-shuffle');
    const backwardButton = document.getElementById('button-backward');
    const pauseButton = document.getElementById("button-pause");
    const playButton = document.getElementById("button-play");
    const forwardButton = document.getElementById('button-forward');
    const loopButton = document.getElementById('button-loop');

    const elapsedDiv = document.getElementById('elapsed');
    const remainingDiv = document.getElementById('remaining');


    // Volume variables

    let lastManualVolume = volumePercent;
    let draggingVolumeSpinner = false;

    const openTrackButton = document.getElementById('button-open-track');
    const volumeIndicator = document.getElementById('volume-indicator');

    const volumeLineContainer = document.getElementById('volume-line-container');
    const volumeLine = document.getElementById('volume-line');
    const volumeSpinner = document.getElementById('volume-spinner');
    

    // Debug variables

    let frame = 0;
    let structureString = '';
    let debug = [true, false, false, false, false];

    const scrollbarWidth = infoDiv.offsetWidth - infoDiv.clientWidth;
    document.documentElement.style.setProperty("--value-scrollbar-width", scrollbarWidth + "px");

    ///  FUNCTIONS  //////////////////////////////////////////////////////////////////////////////////

    // Load audio only if the time threshold allows
    // This is my fix for crazy lag when rapidly hovering over multiple songs
    function loadSongWithThresholdCheck(song) {
        a.resetClock();

        if (a.timeSinceLastCacheUpdateAttempt === 0 || a.timeSinceLastCacheUpdateAttempt >= a.cacheUpdateThreshold) {
            a.loadAudio(song.songPath);
            return true;
        }
        return false;
    }

    // Gets the parent album OBJECT of a song
    function getAlbum(albumName) {
        for (const album of discography.albums) {
            if (album.name === albumName) return album;
        }
        return null;
    }

    // Gets the parent disc OBJECT of a song
    function getDisc(albumName, id) {
        for (const disc of getAlbum(albumName).discs) {
            if (disc.id === id) return disc;
        }
        return null;
    }
    // Checks if cursor is within canvas bounds (in CSS pixels) but not over info/timeline
    function determineCursorInCanvas() {
        if (!pos) return false; // protect if pos hasn't been set yet

        const canvasRect = global.canvas.getBoundingClientRect();
        const infoRect = infoDiv.getBoundingClientRect();
        const timelineRect = timelineDiv.getBoundingClientRect();

        // Is the point inside the canvas (CSS pixels)?
        const in_canvas = (pos.x >= 0 && pos.x <= canvasRect.width && pos.y >= 0 && pos.y <= canvasRect.height);
        if (!in_canvas) return false;

        // Convert the canvas-local CSS point to page coordinates for overlap tests
        const pageX = canvasRect.left + pos.x;
        const pageY = canvasRect.top + pos.y;

        const in_info = (pageX >= infoRect.left && pageX <= infoRect.right && pageY >= infoRect.top && pageY <= infoRect.bottom);
        const in_timeline = (pageX >= timelineRect.left && pageX <= timelineRect.right && pageY >= timelineRect.top && pageY <= timelineRect.bottom);

        return !in_info && !in_timeline;
    }

    // Checks if cursor is within a song box's hitbox
    function getSongInCollidedHitbox() {
        // Iterate through dictionary values
        for (const song of Object.values(songsDict)) {
            const w = song.cover.projectedWidth;
            const h = song.cover.projectedHeight || w;
            if (pos.x >= song.x && pos.x <= song.x + w && pos.y >= song.y && pos.y <= song.y + h) {
                return song;
            }
        }
        return null;
    }

    // Clears right and bottom UI
    function clearUI() {
        infoDiv.innerHTML = '';
        timelineLeftDiv.innerHTML = '';
    }

    // Returns durations for a structure info object
    function getStructDurations(info) {
        const bpmVal = info.bpm || 120;
        const [num, den] = (info.timeSignature || [4,4]).map(n => n || 4);
        const durationOfBeat = (60 / bpmVal ) * (4 / den); // e.g. den=16 -> sixteenth note
        const durationOfMeasure = durationOfBeat * num;
        return { numerator: num, denominator: den, durationOfBeat, durationOfMeasure };
    }

    // Precompute absolute start seconds for each structure entry
    function computeStructureStartSeconds(structure) {
        if (!Array.isArray(structure) || structure.length === 0) return [];

        const startSeconds = new Array(structure.length).fill(0);
        startSeconds[0] = 0;

        for (let i = 0; i < structure.length - 1; i++) {
            const thisStruct = structure[i];
            const nextStruct = structure[i+1];
            const measureSpan = (nextStruct[0]-1) - (thisStruct[0]-1);
            // How many seconds elapse for this entry before the next entry begins
            startSeconds[i+1] = startSeconds[i] + (measureSpan * getStructDurations(thisStruct[1]).durationOfMeasure);
        }
        return startSeconds;
    }

    
    // GETS the next song "in queue," customized by each shuffle mode
    function getNextSong(currentSong, direction, shuffle=0) {
        if (loading) return;

        let nextDisc;
        let nextAlbum;
        let nextSong;

        const currentAlbum = getAlbum(currentSong.album);

        // Next consecutive song
        if (shuffle === 0) {
            const disc = getDisc(currentSong.album, currentSong.discID);
            const directionIsForwards = direction > 0;

            // If song is NOT last in disc
            if (directionIsForwards ? (currentSong.id[1]-1 < disc.songs.length-1) : (currentSong.id[1]-1 > 0)) {
                nextSong = disc.songs[currentSong.id[1]-1 + direction];
            }
            // If song IS last in disc
            else {
                nextDisc = currentAlbum.discs[currentSong.discID-1 + (directionIsForwards ? 1 : -1)];
                if (nextDisc  === undefined) {
                    let nextAlbum;
                    if (directionIsForwards) {
                        nextAlbum = discography.albums[currentAlbum.id];
                        if (nextAlbum === undefined) {
                            return;
                        }
                        else {
                            nextSong = nextAlbum.discs[0].songs[0];
                        }
                    }
                    else {
                        nextAlbum = discography.albums[currentAlbum.id - 2];
                        if (nextAlbum === undefined) {
                            nextSong = currentSong;
                        }
                        else {
                            // This code looks so dumb loll
                            nextSong = nextAlbum.discs[nextAlbum.discs.length-1].songs[nextAlbum.discs[nextAlbum.discs.length-1].songs.length-1];
                        }
                    }
                }
                else {
                    nextSong = nextDisc.songs[directionIsForwards ? 0 : nextDisc .songs.length-1];
                }
            }
        }

        // Random song in album
        else if (shuffle === 1) {
            nextDisc = currentAlbum.discs[h.randInt(0, currentAlbum.discs.length-1)];
            nextSong = nextDisc.songs[h.randInt(0, nextDisc.songs.length-1)];
            a.loadAudio(nextSong.songPath);
        }

        // TODO: Random song in discography
        else if (shuffle === 2) {

        }

        return nextSong;
    }

    // PLAYS the next song "in queue," customized by each suffle mode
    function playNextSong(currentSong, direction, shuffle=0) {
        if (loading) return;
        selectedSong = getNextSong(currentSong, direction, shuffle);
        initSong(selectedSong);
    }

    // Called when user begins a song
    async function initSong(song) {
        clearUI();

        loading = true;
        infoDiv.classList.add('loading', 'active');
        timelineDiv.classList.add('loading', 'active');

        pauseButton.style.display = "inline-grid";
        playButton.style.display = "none";

        loadedSurroundingSongs = false;
        ttPanelScrollOffset = 0;

        try {
            const res = await a.playMusic(song.songPath, volumePercent, isLooping);
            // playMusic returns { startedAt, duration } or { startedAt: null, duration: null } if aborted
            const { duration, startedAt } = res || {};

            // If aborted (another playMusic started), don't build the UI
            if (!duration) return;

            // Normal success path: update song state and create the UI
            song.duration = duration;
            song.startedAt = startedAt;

            // CREATE INFO ELEMENTS DYNAMICALLY /////////////////////////////////

            // Cover
            global.newElement('img', 'info', { id: 'info-cover', classes: ['cover'], src: song.cover.src, display: 'block' });
            const infoCover = document.getElementById('info-cover');

            // Log the top 2 colors for this cover
            try {
                const topColors = await h.getTopColorsFromSrc(song.cover.src, { maxSize: 200, colorBits: 4, count: 3 });
                song.colors = topColors;

                // CONSTRUCT GRADIENT
                let highlightBackgroundGradientText = `linear-gradient(145deg`;
                for (let i = 0; i < topColors.length; i++) {
                    // That percentage math at the end is weird
                    highlightBackgroundGradientText += `, rgb(${topColors[i].rgb}) ${i / topColors.length * topColors.length / (topColors.length-1) * 100}%`;
                }
                highlightBackgroundGradientText += ')';

                document.documentElement.style.setProperty('--color-highlight-gradient', highlightBackgroundGradientText);

            } catch (error) {
                console.warn('Could not compute top colors for', song.cover.src, error);
            }
            
            infoCover.addEventListener('click', () => {
                bigCover.src = infoCover.src;
                bigCoverWrapper.classList.add('active');
                bigCoverOverlay.classList.add('active');
            });

            // Hide on click outside
            bigCoverOverlay.addEventListener('click', () => {
                bigCoverWrapper.classList.remove('active');
                bigCoverOverlay.classList.remove('active');
            });

            // Hide when clicking the big cover itself
            bigCover.addEventListener('click', () => {
                bigCoverWrapper.classList.remove('active');
                bigCoverOverlay.classList.remove('active');
            });

            // Name and short description
            global.newElement('div', 'info', { id: 'info-title', classes: ['info-highlight'] });
            global.newElement('h2', 'info-title', { id: 'info-header', text: song.preferredName });
            if (song.shortDescription != ``) global.newElement('p', 'info-title', { id: 'info-shortDescription', text: song.shortDescription });


            ///  DETAILS  ////////////////////////

            let detailMenu = {
                longDescription: {
                    exists: song.longDescription.length > 0,
                },
                motifs: {
                    exists: song.motifs.length > 0,
                },
                details: {
                    exists: song.daw != null || song.date != ``,
                },
            };

            if (detailMenu.longDescription.exists || detailMenu.motifs.exists || detailMenu.details.exists) {
                global.newElement('div', 'info', { id: 'detail-container', classes: ['info-highlight', 'dark'] });
                global.newElement('div', 'detail-container', { id: 'detail-menu' });
                global.newElement('div', 'detail-container', { id: 'detail-contents' });
            }
            
            // Long description
            if (detailMenu.longDescription.exists) {
                global.newElement('button', 'detail-menu', { id: 'detail-menu-longDescription', classes: ['detail-menu-item'], text: (detailMenu.motifs.exists ? 'Desc' : 'Description') });
                global.newElement('div', 'detail-contents', { id: 'detail-contents-longDescription', classes: ['detail-contents-item'] });
                detailMenu.longDescription.button = document.getElementById('detail-menu-longDescription');

                // Add the `time` class only to links that are NOT marked with the `non-time` class
                for (const paragraph of song.longDescription.split('\n')) {
                    const p = document.createElement('p');
                    p.innerHTML = paragraph;

                    p.querySelectorAll('a').forEach(a => {
                        if (!a.closest('.non-time')) {
                            a.classList.add('time');
                        }
                        else {
                            a.target = "_blank";
                        }
                    });
                    document.getElementById('detail-contents-longDescription').appendChild(p);
                }

                const timestampsInDescription = document.querySelectorAll('.time');

                timestampsInDescription.forEach(timestamp => {
                    timestamp.addEventListener('click', () => {
                        setElapsed(h.timestampToSeconds(timestamp.textContent));

                        // Remove the class if it’s already there
                        spinner.classList.remove("timestamped");
                        line.classList.remove("timestamped");

                        // Force a reflow/repaint so the browser notices the re-addition
                        // Reading offsetWidth (or similar) flushes the style changes
                        void spinner.offsetWidth;
                        void line.offsetWidth;

                        // Re-add the class to restart the animation
                        spinner.classList.add("timestamped");
                        line.classList.add("timestamped");
                    });
                });
            }

            // Motifs
            if (detailMenu.motifs.exists) {
                global.newElement('button', 'detail-menu', { id: 'detail-menu-motifs', classes: ['detail-menu-item'], text: "Motifs" });
                global.newElement('div', 'detail-contents', { id: 'detail-contents-motifs', classes: ['detail-contents-item'] });
                detailMenu.motifs.button = document.getElementById('detail-menu-motifs');

                for (const motif of song.motifs) {
                    const p = document.createElement('p');
                    p.innerHTML = `${motif[2]} from measure ${motif[0]} to ${motif[1]}`;
                    document.getElementById('detail-contents-motifs').appendChild(p);
                }
            }

            // Details
            global.newElement('button', 'detail-menu', { id: 'detail-menu-details', classes: ['detail-menu-item'], text: "Details" });
            global.newElement('div', 'detail-contents', { id: 'detail-contents-details', classes: ['detail-contents-item'] });
            detailMenu.details.button = document.getElementById('detail-menu-details');

            if (song.daw) {
                global.newElement('p', 'detail-contents-details', { text: `DAW: ${song.daw}` })
            }
            if (song.date) {
                global.newElement('p', 'detail-contents-details', { text: `Date created: ${song.date}` })
            }
            if (song.alternativeNames.length > 0) {
                global.newElement('p', 'detail-contents-details', { text: `Alternative names: ${song.alternativeNames}` })
            }

            // Hide all contents at first
            document.querySelectorAll('.detail-contents-item').forEach(content => {
                content.style.display = 'none';
            });

            // Select all buttons in the detail menu
            const detailButtons = document.querySelectorAll('.detail-menu-item');

            detailButtons.forEach(button => {
                button.addEventListener('click', () => {
                    detailButtons.forEach(b => b.classList.remove('selected')); // Remove 'selected' from all buttons
                    button.classList.add('selected'); // Add 'selected' to the clicked button

                    // Re-hide all content
                    document.querySelectorAll('.detail-contents-item').forEach(content => {
                        content.style.display = 'none';
                    });

                    // Show content
                    const contentId = button.id.replace('detail-menu-', 'detail-contents-');
                    const contentDiv = document.getElementById(contentId);
                    if (contentDiv) contentDiv.style.display = 'block';
                });
            });

            for (const key in detailMenu) {
                const menuItem = detailMenu[key];
                if (menuItem.exists) {
                    menuItem.button.classList.add('selected');

                    // Also show its content by default
                    const contentId = menuItem.button.id.replace('detail-menu-', 'detail-contents-');
                    const contentDiv = document.getElementById(contentId);
                    if (contentDiv) contentDiv.style.display = 'block';
                    break;
                }
            }

            // CREATE BOTTOM ELEMENTS DYNAMICALLY /////////////////////////////////

            // Timeline 1 (Cover) and Timeline 2
            global.newElement('img', 'timeline-left', { id: 'timeline-left-1', classes: ['cover'], src: song.cover.src, display: 'block' });
            global.newElement('div', 'timeline-left', { id: 'timeline-left-2' });

            // Name
            global.newElement('p', 'timeline-left-2', { id: 'timeline-left-title', text: song.preferredName });

            // Album
            global.newElement('div', 'timeline-left-2', { id: 'album' });
            global.newElement('i', 'album', { classes: ['fa-solid', 'fa-music', 'timeline-left-icon'] });
            global.newElement('p', 'album', { text: `${song.album} (#${song.id[0]})` });

            // Disc
            if (getAlbum(song.album).discs.length > 1) { // Has more than 1 disc
                global.newElement('div', 'timeline-left-2', { id: 'disc' });
                global.newElement('i', 'disc', { classes: ['fa-solid', 'fa-compact-disc', 'timeline-left-icon'] });
                global.newElement('p', 'disc', { text: `Disc ${song.discID}` });
            }

            // Calendar
            if (song.date) {
                global.newElement('div', 'timeline-left-2', { id: 'date' });
                global.newElement('i', 'date', { classes: ['fa-regular', 'fa-calendar', 'timeline-left-icon'] });
                global.newElement('p', 'date', { text: `Released ${song.date}` });
            }
        }
        catch (error) {
            console.error('initSong error:', error);
        }
        finally {
            infoDiv.classList.remove('loading');
            timelineDiv.classList.remove('loading');
            loading = false;

            if (song.structure && song.structure.length > 0) {
                // Compute absolute start seconds for each entry
                startTimesOfEachStruct = computeStructureStartSeconds(song.structure);
            }
            else {
                startTimesOfEachStruct = [];
            }
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    //   PRIMARY DRAWING FUNCTION
    ///////////////////////////////////////////////////////////////////////////////////////

    function draw() {
        global.ctx.clearRect(0, 0, global.canvas.width, global.canvas.height);

        // Calculate FPS
        if (!window._lastFpsTime) window._lastFpsTime = performance.now();
        if (!window._lastFpsFrame) window._lastFpsFrame = frame;
        let currentFPS = 0;
        const now = performance.now();
        if (now - window._lastFpsTime > 500) {
            currentFPS = ((frame - window._lastFpsFrame) / ((now - window._lastFpsTime) / 1000)).toFixed(0);
            window._lastFpsTime = now;
            window._lastFpsFrame = frame;
            window._lastFpsValue = currentFPS;
        } else {
            currentFPS = window._lastFpsValue || "0";
        }

        ///////  DRAWING  ////////////////////////////////////////////////////

        let yOffset = 40;
        let xOffset;

        // For rendering loaded songs
        let audioCachePathList = [];
        for (const [bufferKey, bufferValue] of a.audioCache) {
            audioCachePathList.push(bufferKey);
        }

        // Draw things for each song

        for (const album of discography.albums) {
            for (const disc of album.discs) {
                xOffset = 20;
                for (const song of disc.songs) {

                    // Assign song position for hitbox detection
                    song.x = xOffset + dragX;
                    song.y = yOffset + dragY;

                    // Use forced width if you pass one (you do), otherwise fallback to image natural width
                    song.cover.projectedWidth = (albumForcedDimension !== null)
                        ? albumActualDimension
                        : ((song.cover && song.cover.width) ? song.cover.width * albumScale : 0);

                    // Draw white border if that song is selected
                    if ((song === hoveredSong && in_canvas) || song === selectedSong) {
                        r.drawRect(
                            global.ctx,
                            song.x - albumOutlineOffset, song.y - albumOutlineOffset,
                            song.cover.projectedWidth + 2*albumOutlineOffset, song.cover.projectedWidth + 2*albumOutlineOffset,
                            (song === selectedSong ? '#fff' : (bigCoverOverlay.classList.contains('active') ? 'transparent' : '#ccc'))
                        );
                        r.drawRect(
                            global.ctx,
                            song.x - albumOutlineOffset/2, song.y - albumOutlineOffset/2,
                            song.cover.projectedWidth + albumOutlineOffset, song.cover.projectedWidth + albumOutlineOffset,
                            '#000'
                        );
                    }

                    // Draw album cover
                    r.drawImage(global.ctx, song.cover, {
                        x: song.x,
                        y: song.y,
                        scale: albumScale,
                        forcedWidth: albumForcedDimension,
                        forcedHeight: albumForcedDimension,
                        //fillStyle: (song === selectedSong || selectedSong === undefined ? null : 'rgba(0, 0, 0, 0.4)')
                    });

                    // Draw little "loaded" indicators on songs to indicate loaded status
                    // Iterate through audiocache and songsDict
                    if (debug[1]) {
                        if (audioCachePathList.includes(song.songPath)) {
                            r.drawCircle(global.ctx, song.x + albumActualDimension / 10, song.y + albumActualDimension / 10, albumActualDimension / 8, '#77ff00', { strokeColor: 'black'});
                        }
                        else {
                            r.drawCircle(global.ctx, song.x + albumActualDimension / 10, song.y + albumActualDimension / 10, albumActualDimension / 8, 'red', { strokeColor: 'black'});
                        }
                    }
                    
                    let nameStr = h.truncateString(song.preferredName, song.cover.projectedWidth);

                    r.drawText(global.ctx, nameStr, { x: xOffset + dragX + (song.cover.projectedWidth - r.getTextWidth(global.ctx, nameStr)) / 2, y: yOffset + dragY - global.fontSize * 1.4 });
                    xOffset += (song.cover.projectedWidth + albumXGap);
                }
                yOffset += albumActualDimension + albumYGap;
            }
            yOffset += albumActualDimension + albumYGap;
        }

        ///////  TIMELINE  ////////////////////////////////////////////////////

        // Render spinner and line
        if (selectedSong != null) {
            const lineRect = line.getBoundingClientRect();
            elapsed = Math.min(a.getPlaybackTime(), selectedSong.duration); // Ask audio module what the current playback time is (respects pause)

            // Load next song if the spinner is at least 1/4 of the way through the song
            if (!loadedSurroundingSongs && elapsed >= selectedSong.duration / 4) {
                loadedSurroundingSongs = true;
                const loadedSongPrev = getNextSong(selectedSong, -1, 0);
                const loadedSongNext = getNextSong(selectedSong, 1, 0);

                if (loadedSongPrev) {
                    a.loadAudio(loadedSongPrev.songPath);
                }
                if (loadedSongNext) {
                    a.loadAudio(loadedSongNext.songPath);
                }
            }

            let elapsedDivText;
            let remainingDivText;

            // Compute the percentage that the spinner resides on
            if (draggingSpinner) {
                elapsedPercent = Math.max(Math.min((pos.x - lineRect.left) / lineRect.width, 1), 0);
                elapsedPercentInTime = selectedSong.duration * elapsedPercent;

                elapsedDivText = h.secondsToTimestamp(elapsedPercentInTime);
                remainingDivText = `-` + h.secondsToTimestamp(selectedSong.duration - elapsedPercentInTime);
            }
            else {
                elapsedPercent = Math.max(Math.min(elapsed / selectedSong.duration, 1), 0);

                elapsedDivText = h.secondsToTimestamp(elapsed);
                remainingDivText = `-` + h.secondsToTimestamp(selectedSong.duration - elapsed);
            }

            if (loading) {
                elapsedDivText = '0:00';
                remainingDivText = '-0:00';
                elapsedPercent = 0;
            }

            elapsedDiv.textContent = elapsedDivText;
            remainingDiv.textContent = remainingDivText;
            
            // Compute spinner position along the timeline
            let xPos = (loading && !draggingSpinner ? 0 : elapsedPercent * lineRect.width) - spinnerSize / 2;

            spinner.style.left = `${xPos}px`;
            document.documentElement.style.setProperty('--color-line-gradient', `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${elapsedPercent*100}%, var(--color-line-unplayed) ${elapsedPercent*100}%, var(--color-line-unplayed) 100%)`);

            ///////  VOLUME LINE  ////////////////////////////////////////////////////

            if (draggingVolumeSpinner && selectedSong && !loading) {
                a.setVolume(volumePercent);
            }

            // Render volume spinner and line
            const volumeLineRect = volumeLine.getBoundingClientRect();

            // Compute the percentage that the volume spinner resides on
            if (draggingVolumeSpinner) {
                volumePercent = Math.max(Math.min((pos.x - volumeLineRect.left) / volumeLineRect.width, 1), 0);
            }

            // Indicate volume through icon
            volumeIndicator.classList.remove('fa-volume-mute', 'fa-volume-off', 'fa-volume-low', 'fa-volume-high');
            if (volumePercent === 1) {
                volumeIndicator.classList.add('fa-volume-high');
            }
            else if (volumePercent > 0) {
                volumeIndicator.classList.add('fa-volume-low');
            }
            else {
                volumeIndicator.classList.add('fa-volume-mute');
            }
            
            const volumeXPos = volumePercent * volumeLineRect.width - spinnerSize / 2; // Compute spinner position along the timeline
            volumeSpinner.style.left = `${volumeXPos}px`;
            volumeLine.style.backgroundImage = `linear-gradient(to right, var(--color-line-played) 0%, var(--color-line-played) ${volumePercent*100}%, var(--color-line-unplayed) ${volumePercent*100}%, var(--color-line-unplayed) 100%)`;

            ///  CHECKS

            if (elapsed === selectedSong.duration) {
                if (isLooping) {
                    setElapsed(0);
                }
                else {
                    playNextSong(selectedSong, 1, shuffle);
                }
            }
        }

        ///////  DEBUG  ////////////////////////////////////////////////////

        let debugLines = 0;

        function drawDebug(debugID, debugText, color='white') {
            if (!debug[debugID]) return;

            const lineCount = debugText.split('\n').length;
            r.drawRect(global.ctx, 0, global.fontSize * debugLines, global.canvas.width, global.fontSize * lineCount, 'rgba(0, 0, 0, 0.8)');
            r.drawText(global.ctx, debugText, { font: global.fontDebug, y: global.fontSize * debugLines, color: color, verticalSpacing: 1 });

            debugLines += lineCount; // advance the shared counter
        }

        drawDebug(0, `FPS: ${currentFPS} | KEY: ${lastDebugKey}`);

        let audioCacheString = '';

        // Iterate through audioCache and log fake IDs of format AlbumID.SongID to look cool in the debug menu haha
        if (debug[1]) {
            let i = 0;
            for (const [bufferKey, bufferValue] of a.audioCache) {
                const bufferSong = songsDict[bufferKey];
                for (const album of discography.albums) {
                    if (album.name === bufferSong.album) {
                        audioCacheString += ` ${album.id}'${String(bufferSong.id[0]).padStart(2, '0')} ${i === a.MAX_CACHE_SIZE-1 ? ']' : '🡐'}`;
                    }
                }
                i++;
            }
        }

        drawDebug(1,
            `\nAudioCache (${a.MAX_CACHE_SIZE}): [${audioCacheString}`
            + `\nLast AudioCache Update Attempt: ${a.timeSinceLastCacheUpdateAttempt.toFixed(2)} seconds ago (Threshold: ${a.cacheUpdateThreshold}s)`
            + `\nLoaded Surrounding Songs: ${loadedSurroundingSongs}`
            + `\nVolume: ${volumePercent}`,
            '#77ff00'
        );

        ///////  SONG STRUCTURE (INCLUDES DEBUG)  ////////////////////////////////////////////////////

        if (!selectedSong || loading) {
            structureString = `\nN/A`;
        }

        // If structure exists
        else {
            if (selectedSong.structure && selectedSong.structure.length > 0) {
                
                // Last index i such that startTimesOfEachStruct[i] <= elapsed
                let currentStructIndex = 0;
                while (currentStructIndex + 1 < startTimesOfEachStruct.length && elapsed >= startTimesOfEachStruct[currentStructIndex + 1]) {
                    currentStructIndex++;
                }

                currentStructInfo = selectedSong.structure[currentStructIndex][1];
                
                // Get resources to update global script variables using the current struct
                durations = getStructDurations(currentStructInfo);

                // Get elapsed info for the current structure entry
                const currentStructElapsed = Math.max(0, elapsed - startTimesOfEachStruct[currentStructIndex]);
                const currentStructMeasuresElapsed = Math.floor(currentStructElapsed / durations.durationOfMeasure);

                // Set global script variables
                timeWithinMeasure = currentStructElapsed % durations.durationOfMeasure;
                currentMeasure = selectedSong.structure[currentStructIndex][0] + currentStructMeasuresElapsed;
                currentBeat = Math.floor(timeWithinMeasure / durations.durationOfBeat) + 1;

                // Sum full spans between each consecutive struct to get the total number of measures up to the last struct
                let countMeasures = 0;
                for (let i = 0; i < selectedSong.structure.length - 1; i++) {
                    const thisMeasure = selectedSong.structure[i][0];
                    const nextMeasure = selectedSong.structure[i+1][0];
                    const span = nextMeasure - thisMeasure;
                    countMeasures += Math.max(0, span);
                }

                // Determine how many measures there are after the last struct begins
                const lastStructIndex = selectedSong.structure.length - 1;
                const lastStructMeasureDuration = getStructDurations(selectedSong.structure[lastStructIndex][1]).durationOfMeasure;

                // How many full measures since the last struct started
                const secondsFromLastStructToSongEnd = Math.max(0, selectedSong.duration - (startTimesOfEachStruct[lastStructIndex] || 0));
                const fullMeasuresSinceStructStart = Math.floor(secondsFromLastStructToSongEnd / lastStructMeasureDuration);
                
                const startTimeOfLastMeasure = (startTimesOfEachStruct[lastStructIndex] || 0) + (fullMeasuresSinceStructStart * lastStructMeasureDuration);
                const lastMeasureDuration = selectedSong.duration - startTimeOfLastMeasure;

                // If the last measure's length in seconds is less than THIS fraction of seconds of a whole measure, don't include it
                const totalMeasureFraction = 0.1;
                let lastStructTotalMeasures = Math.max(0, fullMeasuresSinceStructStart+1);
                if (lastMeasureDuration < lastStructMeasureDuration * totalMeasureFraction) {
                    lastStructTotalMeasures--;
                }

                // Set total number of measures
                selectedSong.totalMeasures = countMeasures + lastStructTotalMeasures;

                // Write debug info
                structureString = `\nMEASURE: ${currentMeasure} of ${selectedSong.totalMeasures}\nBEAT: ${currentBeat}\nBPM: ${currentStructInfo.bpm}\nTIME SIGNATURE: ${durations.numerator}/${durations.denominator}`;
                //structureString += `\nLength of true last measure: ${lastMeasureDuration.toFixed(3)}s (${(lastMeasureDuration / lastStructMeasureDuration * 100).toFixed(3)}% < ${totalMeasureFraction * 100}%)`;
            }
            else {
                structureString = `\nN/A`;
            }
        }
        drawDebug(2, structureString, "#ffff00");

        // Draw debug 3

        if (debug[3]) {

            r.drawRect(global.ctx, 0, global.fontSize * debugLines, global.canvas.width, global.fontSize, 'rgba(0, 0, 0, 0.8)');
            debugLines++;

            for (const motif of motifs) {

                // String-ception
                let motifText = `${Object.keys(motif.occurrences).length} occ. - ${(`hsv(${motif.rawHSV.h},${motif.rawHSV.s}%,${motif.rawHSV.v}%)`).padEnd(18, " ")}- ${motif.name}`;

                r.drawRect(global.ctx, 0, global.fontSize * debugLines, global.canvas.width, global.fontSize, 'rgba(0, 0, 0, 0.8)');
                r.drawText(global.ctx, motifText, { font: global.fontDebug, y: global.fontSize * debugLines, color: motif.color, verticalSpacing: 1 });     
                debugLines++;
            }
        }

        frame++;
    }


    ///////////////////////////////////////////////////////////////////////////////////////
    //   SECONDARY DRAWING FUNCTION
    ///////////////////////////////////////////////////////////////////////////////////////

    function drawTrack() {
        const ctx = global.trackCtx;
        const canvas = global.trackCanvas;
        if (!ctx || !canvas) return;

        // Use CSS pixel sizes (drawing coordinates are in CSS pixels because global.setTransform was used)
        const rect = canvas.getBoundingClientRect();
        const canvasWidth = Math.max(1, Math.floor(rect.width));
        const canvasHeight = Math.max(1, Math.floor(rect.height));

        // Clear the visible drawing area (in CSS pixels)
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        if (!selectedSong || !a.analyser || loading) return;
        const waveform = a.getWaveformFloat32();
        if (!waveform || waveform.length === 0) return;

        // Layout
        const waveformStartX = 0;
        const waveformWidth = canvasHeight * .75;
        const waveformHeight = canvasHeight;
        const waveformCenterY = waveformHeight / 2;

        const trackPrimaryColor = '#2fff2f';

        // Background box (subtle)
        r.drawRect(ctx, waveformStartX, 0, waveformWidth, waveformHeight, 'black');

        // Gradient aligned to the waveform box (CSS pixels)
        const grad = ctx.createLinearGradient(0, 0, 0, waveformHeight);
        grad.addColorStop(0,  h.hexToRGBA(trackPrimaryColor, .3));
        grad.addColorStop(.5, h.hexToRGBA(trackPrimaryColor, .2));
        grad.addColorStop(1,  h.hexToRGBA(trackPrimaryColor, .1));

        // Waveform drawing params
        const samples = waveform.length;
        const amplitude = 0.98;
        const verticalScale = (waveformHeight / 2) * amplitude;

        function iterateWaveformPixels(top, px) {
            const startSample = Math.floor((px * samples) / waveformWidth);
            const endSample = Math.min(samples, Math.floor(((px + 1) * samples) / waveformWidth));

            let sum = 0, count = 0;
            for (let s = startSample; s < endSample; s++) {
                sum += waveform[s];
                count++;
            }

            const avg = count ? (sum / count) : 0;
            const y = (top ? waveformCenterY + (avg * verticalScale) : waveformCenterY - (avg * verticalScale));
            
            if (px === 0) {
                ctx.moveTo(px, y);
            } else {
                ctx.lineTo(px, y);
            }
        }

        // Build the closed path (top curve left->right, bottom curve right->left)
        ctx.beginPath();
        for (let px = waveformStartX; px < waveformWidth; px++) {
            iterateWaveformPixels(true, px);
        }
        for (let px = waveformStartX + waveformWidth - 1; px >= waveformStartX; px--) {
            iterateWaveformPixels(false, px);
        }
        ctx.closePath();

        // Fill & stroke
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.lineWidth = 1.0;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = h.hexToRGBA(trackPrimaryColor, 0.95);
        ctx.stroke();
        ctx.restore();

        // Draw the debug info on the waveform
        r.drawText(ctx, structureString, { font: global.fontDebug, x: 5, y: -global.fontSize + 5, color: trackPrimaryColor, verticalSpacing: 1 });


        ///  TIMELINE VARIABLES  ///////////////////////////////////////////////////

        const color_timelineBackground = '#41494eff';
        const color_shadow_timelineBackground = 'rgba(0, 0, 0, 0.2)';
        
        const color_innerTimeline = '#2b393fff';

        const color_measureBar = '#14171bff';
        const color_shadow_measureBar = 'rgba(66, 89, 105, 0.4)';

        const color_measureVerticalLine = '#07090aff';
        const color_beatVerticalLine = '#1b232bff';

        // Customize start and end x values for the outer and inner track timelines (tt)

        const ttPadding = 10;
        const ttMeasureBarHeight_Number = 20;
        const ttMeasureBarHeight_TimeSig = global.fontSizeTimeSignature * 1.35;
        const ttMeasureBarHeight_Total = ttMeasureBarHeight_Number + ttMeasureBarHeight_TimeSig;
        const ttMeasureBarEndY = ttPadding + ttMeasureBarHeight_Total;

        const motifOffset = 5;
        const ttPanelWidth = 170;
        const ttPanelScrollbarWidth = 12; // Fits into panel; does not add width to panel

        const ttTimeSigStartY = ttPadding + 15;
        
        // Calculate outer and inner x values and widths of the track timelines automatically

        const ttStartX = waveformStartX + waveformWidth;
        const ttEndX = canvasWidth;

        const ttInnerStartX = ttStartX + ttPadding;
        const ttPlayerStartX = ttInnerStartX + ttPadding + ttPanelWidth
        const ttInnerEndX = ttEndX - ttPadding;
        const ttInnerStartY = ttPadding;
        const ttInnerEndY = canvasHeight - ttPadding;

        const ttWidth = ttEndX - ttStartX;
        const ttInnerWidth = ttInnerEndX - ttPlayerStartX;
        const ttInnerHeight = ttInnerEndY - ttInnerStartY;

        const ttPanelEndX = ttInnerStartX + ttPanelWidth;
        const ttPanelScrollbarStartX = ttPanelEndX - ttPanelScrollbarWidth;
        const ttPanelHeight = ttInnerEndY - ttInnerStartY;
        const motifBoxWidth = ttPanelWidth - motifOffset*2;
        let motifY = ttInnerStartY + motifOffset;

        ///  DRAW TRACK TIMELINE  ///////////////////////////////////////////////////

        // Background
        r.drawRect(ctx, ttStartX, 0, ttWidth, canvasHeight, color_timelineBackground);

        // Inner timeline (no padding)
        r.drawRect(ctx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttInnerHeight, color_innerTimeline);

        // Measure bar (at the top)
        r.drawRect(ctx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttMeasureBarHeight_Total, color_measureBar, {
            shadow: { inner: true, shadowColor: color_shadow_measureBar, shadowBlur: 3, left: false, right: false }
        });
        r.drawBorder(ctx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttMeasureBarHeight_Total, color_measureBar);

        // Draw track motif panel
        r.drawRect(ctx, ttInnerStartX, ttInnerStartY, ttPanelWidth, ttInnerHeight, color_innerTimeline);


        ///  DRAW MOTIF PANEL SCROLLBAR

        const color_panelScrollbarBG = 'hsla(200, 9%, 13%, 1.00)';
        const color_ttPanelScrollbarFG = 'hsla(200, 7%, 45%, 1.00)';
        
        function calculateMotifPanelHeight(motifs) {
            let drawnMotifs = [];
            let motifY = ttInnerStartY + motifOffset;

            for (const motifData of motifs) {
                const motif = getMotif(motifData[2]);

                // Skip if the motif is empty OR if compressing duplicates and it's already drawn
                if (motifData[1] === 0 || (compressMotifs && drawnMotifs.includes(motif.name))) continue;

                drawnMotifs.push(motif.name);

                const motifHeight = global.fontSize + motifOffset*2;
                motifY += motifHeight + motifOffset*1; // spacing
            }

            return motifY;
        }

        const ttPanelAllMotifsHeight = calculateMotifPanelHeight(selectedSong.motifs);
        const ttPanelOverflowHeight = (ttPanelAllMotifsHeight - ttPanelHeight - motifOffset*2);
        const ttPanelScrollbarFGHeight = Math.min(ttPanelHeight * (ttPanelHeight / ttPanelAllMotifsHeight), ttPanelHeight);
        const ttPanelScrollbarEmptyHeight = ttPanelHeight - ttPanelScrollbarFGHeight;
        ttPanelScrollbarNeeded = ttPanelScrollbarFGHeight < ttPanelHeight;

        // Constrict scroll to motifs
        ttPanelScrollOffset = (ttPanelScrollbarNeeded ? (Math.max(Math.min(ttPanelScrollOffset, 0), -ttPanelAllMotifsHeight + ttPanelHeight + motifOffset*2)) : 0);
        
        const ttPanelScrollbarStartY = ttPadding + ttPanelScrollbarEmptyHeight * (-ttPanelScrollOffset / ttPanelOverflowHeight);

        if (ttPanelScrollbarNeeded) {
            in_ttPanelScrollbarFG =   (tcPos.x > ttPanelScrollbarStartX)
                                && (tcPos.x < ttPanelScrollbarStartX + ttPanelScrollbarWidth)
                                && (tcPos.y > ttPanelScrollbarStartY)
                                && (tcPos.y < ttPanelScrollbarStartY + ttPanelScrollbarFGHeight);

            // Scrollbar bg
            r.drawRect(ctx, ttPanelScrollbarStartX, ttInnerStartY, ttPanelScrollbarWidth, ttPanelHeight, color_panelScrollbarBG);
            // Scrollbar fg
            r.drawRect(ctx, ttPanelScrollbarStartX, ttPanelScrollbarStartY, ttPanelScrollbarWidth, ttPanelScrollbarFGHeight, color_ttPanelScrollbarFG);
        }

        ///  DRAW MOTIF BOXES

        in_motifPanel = false;
        in_motifBox = false;
        global.trackCanvas.style.cursor = 'auto';

        let drawnMotifs = [];

        for (const motifData of selectedSong.motifs) {
            let motif = getMotif(motifData[2]);

            // Skip this iteration if this motif is already included in drawnMotifs (ignore if compressedMotifs is enabled)
            if (motifData[1] === 0 || (compressMotifs && drawnMotifs.includes(motif.name))) continue;

            drawnMotifs.push(motif.name);

            motif.panelX = ttInnerStartX + motifOffset;
            motif.panelY = motifY + ttPanelScrollOffset;
            motif.width = motifBoxWidth - (ttPanelScrollbarNeeded ? ttPanelScrollbarWidth : 0);
            motif.height = global.fontSize + motifOffset*2;

            // Redefine mouse collision
            in_motifPanel = (tcPos.x > ttInnerStartX && tcPos.x < ttInnerStartX + ttPanelWidth && tcPos.y > ttInnerStartY && tcPos.y < ttInnerStartY + ttInnerHeight);
            in_motifBox = in_motifPanel && (tcPos.x > motif.panelX && tcPos.x < motif.panelX + motif.width && tcPos.y > motif.panelY && tcPos.y < motif.panelY + motif.height);
            
            if (in_motifBox) {
                global.trackCanvas.style.cursor = 'pointer';
                r.drawRect(ctx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color, {
                    shadow: { inner: true, shadowColor: motif.color_highlight, shadowBlur: motif.height, left: false, right: false, top: false }
                });
                r.drawBorder(ctx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color_highlight);
            }
            else {
                r.drawRect(ctx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color, {
                    shadow: { inner: false, shadowColor: color_shadow_timelineBackground, shadowBlur: 4 }
                });
            }

            const motifDisplayName = h.truncateString(motif.name, motif.width);
            r.drawText(ctx, motifDisplayName, { x: motif.panelX + motifOffset, y: motif.panelY + motifOffset, fontSize: global.fontSize, color: motif.color_text });
            
            motifY += global.fontSize + motifOffset*3;
        }
        r.drawRect(ctx, ttStartX, 0, ttWidth, ttInnerStartY, color_timelineBackground);
        r.drawRect(ctx, ttStartX, ttInnerEndY, ttWidth, canvasHeight - ttInnerEndY, color_timelineBackground);


        ///  DRAW THE ACTUAL TRACK TIMELINE (REAL)  /////////////////////////////////////////////////////////////////////////////////////

        // Returns struct info for a given measure
        // If a struct entry doesn't have certain fields (bpm, timeSignature), they're inherited from the most recent prior entry that specified them
        function getStructInfoFromMeasure(measure) {
            if (!selectedSong || !selectedSong.structure || selectedSong.structure.length === 0) return { bpm: 120, timeSignature: [4,4] };

            // Start with an empty resolved object
            const resolved = {};

            // Iterate through each struct entry in order; apply fields when we pass their start measure
            for (let i = 0; i < selectedSong.structure.length; i++) {
                const entry = selectedSong.structure[i];
                const start = entry[0];
                const info = entry[1] || {};

                if (measure >= start) {
                    Object.keys(info).forEach(k => { resolved[k] = info[k]; });
                } else {
                    break; // Future entry
                }
            }

            // Apply sensible defaults if missing
            if (!resolved.timeSignature || !Array.isArray(resolved.timeSignature)) resolved.timeSignature = [4,4];
            if (typeof resolved.bpm !== 'number') resolved.bpm = resolved.bpm || 120;

            return resolved;
        }

        /* Config for canDraw function for each tt feature
            minSpacing: Space the right of a feature's hitbox that prevents the next object from rendering
            scaleX: Visual scale put on feature
            cenetered: Boolean determining whether to measure an object's hitbox from its center (true) or left side (false)
        */
        const drawConfig = {
            measureNumber: { minSpacing: 6, scaleX: 0.9, centered: false },
            measureLine:   { minSpacing: 8 },
            beatLine:      { minSpacing: 4 },
            timeSig:       { minSpacing: 4, centered: false }
        };

        // Reset overlap state each frame
        let overlapState = { lastRight: { measureNumber: -Infinity, measureLine: -Infinity, beatLine: -Infinity, timeSig: -Infinity } };

        // Check if an object can be drawn
        function canDraw(kind, x, width = 0) {
            const cfg = drawConfig[kind] || { minSpacing: 6 };
            const centered = cfg.centered;

            const leftX = centered ? (x - (width / 2)) : x;
            const rightX = leftX + width;

            const requiredLeft = overlapState.lastRight[kind] + (cfg.minSpacing || 0);

            if (debug[4] && kind === 'timeSig') {
                r.drawBorder(ctx, overlapState.lastRight[kind], ttTimeSigStartY, cfg.minSpacing || 0, global.fontSizeTimeSignature*2, 'red');
                r.drawBorder(ctx, leftX, ttTimeSigStartY, rightX-leftX, global.fontSizeTimeSignature*2);
            }

            if (leftX >= requiredLeft) {
                overlapState.lastRight[kind] = rightX;
                return true;
            }
            return false;
        }

        // Compute beatWidth so all beats fit exactly inside the inner timeline
        let beatUnitCount = 0;
        for (let measure = 1; measure <= selectedSong.totalMeasures; measure++) {
            const struct = getStructInfoFromMeasure(measure);
            beatUnitCount += struct.timeSignature[0] * (4 / struct.timeSignature[1]);
        }
        let beatWidth = 5;
        if (beatUnitCount > 0) {
            beatWidth = ttInnerWidth / beatUnitCount;
        }

        // Start off ttCurrentDrawnX at the beginning of the innerTimeline
        let ttCurrentDrawnX = ttPlayerStartX;
        let measureWidth = 0;
        let playingLineOffset = 0;
        let thisStructInfo;

        // Iterate through every measure
        for (let measure = 1; measure <= selectedSong.totalMeasures; measure++) {

            // Set playing line offset
            if (measure === currentMeasure) playingLineOffset = ttCurrentDrawnX;

            // Get thisStructInfo (resolved)
            thisStructInfo = getStructInfoFromMeasure(measure);

            ///  MEASURE NUMBER  //////////////////////////////////////////////////////////////////
            
            const measureText = `${measure}`;
            const rawTextWidth = r.getTextWidth(ctx, measureText);
            const measureScaleX = drawConfig.measureNumber.scaleX;
            const drawTextWidth = rawTextWidth * measureScaleX; // If r.getTextWidth already accounts for scale, remove the * measureScaleX

            if (canDraw('measureNumber', ttCurrentDrawnX, drawTextWidth)) {
                r.drawText(ctx, measureText, { x: ttCurrentDrawnX, y: ttPadding + (ttMeasureBarHeight_Number - global.fontSize) / 2, scaleX: measureScaleX, color: '#ffffff' });
            }

            ///  MEASURE LINE  //////////////////////////////////////////////////////////////////

            if (canDraw('measureLine', ttCurrentDrawnX, 1)) {
                r.drawLine(ctx, ttCurrentDrawnX, ttMeasureBarEndY, ttCurrentDrawnX, canvasHeight - ttPadding, color_measureVerticalLine, 1);
            }

            ///  TIME SIGNATURE  //////////////////////////////////////////////////////////////////
            
            const prevStruct = (measure === 1) ? null : getStructInfoFromMeasure(measure - 1);
            const prevSig = prevStruct ? prevStruct.timeSignature.join(',') : null;
            const thisSig = thisStructInfo.timeSignature ? thisStructInfo.timeSignature.join(',') : null;

            if (measure === 1 || thisSig !== prevSig) {
                const numSig = String(thisStructInfo.timeSignature[0]);
                const denSig = String(thisStructInfo.timeSignature[1]);

                const timeSignatureGlyphs = { 0: 0xE080, 1: 0xE081, 2: 0xE082, 3: 0xE083, 4: 0xE084, 5: 0xE085, 6: 0xE086, 7: 0xE087, 8: 0xE088, 9: 0xE089 };

                let glyph1 = '';
                let glyph2 = '';

                for (const char of numSig) { glyph1 += String.fromCodePoint(timeSignatureGlyphs[char]); }
                for (const char of denSig) { glyph2 += String.fromCodePoint(timeSignatureGlyphs[char]); }

                // Estimate glyph width (rough): fontSize * numberOfDigits
                const glyphWidthEst = r.getTextWidth(ctx, `${glyph1}\n${glyph2}`, global.fontTimeSignature) * 1.6;
                if (canDraw('timeSig', ttCurrentDrawnX, glyphWidthEst)) {
                    r.drawText(ctx, `${glyph1}\n${glyph2}`, { font: global.fontTimeSignature, fontSize: global.fontSizeTimeSignature, x: ttCurrentDrawnX, y: ttTimeSigStartY, verticalSpacing: .55 });
                }
            }

            ///  BEAT LINES  //////////////////////////////////////////////////////////////////

            let relativeBeatWidth = beatWidth * 4 / thisStructInfo.timeSignature[1];
            const minBeatSpacing = 6; // Minimum pixels between beats to render
            let ttFakeCurrentDrawnX = ttCurrentDrawnX;

            // Only draw beat lines if they won't be too dense (per-measure decision)
            if (relativeBeatWidth >= minBeatSpacing) {
                for (let beat = 1; beat <= thisStructInfo.timeSignature[0]; beat++) {
                    ttFakeCurrentDrawnX += relativeBeatWidth;
                    r.drawLine(ctx, ttFakeCurrentDrawnX, ttMeasureBarEndY, ttFakeCurrentDrawnX, canvasHeight - ttPadding, color_beatVerticalLine, 1);
                }
            } else {
                // Still advance ttFakeCurrentDrawnX properly, but skip drawing individual beats
                ttFakeCurrentDrawnX += relativeBeatWidth * thisStructInfo.timeSignature[0];
            }

            ///  INCREMENT  //////////////////////////////////////////////////////////////////////

            ttCurrentDrawnX = ttFakeCurrentDrawnX;

        }

        ///  MOTIFS  //////////////////////////////////////////////////////////////////

        function measureToX(targetMeasure) {
            const x = ttPlayerStartX;

            const M = Math.floor(targetMeasure);
            const f = targetMeasure % 1;  // fractional part, e.g. 0.75

            let beatAccumulator = 0;

            // Sum all *complete* measures before M
            for (let m = 1; m < M; m++) {
                const struct = getStructInfoFromMeasure(m);
                const beats = struct.timeSignature[0] * (4 / struct.timeSignature[1]);
                beatAccumulator += beats;
            }

            // Add fractional beats inside measure M
            if (f > 0) {
                const struct = getStructInfoFromMeasure(M);
                const beatsInMeasure = struct.timeSignature[0] * (4 / struct.timeSignature[1]);

                const fractionalBeats = f * beatsInMeasure;
                beatAccumulator += fractionalBeats;
            }

            return x + beatAccumulator * beatWidth;
        }

        let ttMotifY = ttMeasureBarEndY;
        const ttMotifYMap = new Map();  // motifObject -> y value

        // Ensure it's not a placeholder
        if (selectedSong.motifs.length > 0 && selectedSong.motifs[0][2] != '') {

            for (const tcMotif of selectedSong.motifs) {

                // Motif object reference
                const motifObj = getMotif(tcMotif[2]);

                // Assign Y only the first time this motif is seen
                if (!ttMotifYMap.has(motifObj)) {
                    ttMotifYMap.set(motifObj, ttMotifY);
                    ttMotifY += ttMotifHeight;
                }

                const y = ttMotifYMap.get(motifObj);

                const startMeasure = tcMotif[0];
                const endMeasure = tcMotif[1];

                const startX = measureToX(startMeasure);
                const endX = measureToX(endMeasure);
                const ttMotifWidth = endX - startX;

                // Draw the motif block
                r.drawRect(ctx, startX, y, ttMotifWidth, ttMotifHeight, motifObj.color);

                // Draw the label
                const tcMotifDisplayName = h.truncateString(tcMotif[2], ttMotifWidth - 2);
                r.drawText(ctx, tcMotifDisplayName, { x: startX + 2, y: y + (ttMotifHeight - global.fontSize) / 2, fontSize: global.fontSize, color: motifObj.color_text });
            }
        }

        // Set measureWidth for the current measure (used for playing line calculation)
        let currentStructInfo = getStructInfoFromMeasure(currentMeasure);
        let currentRelativeBeatWidth = beatWidth * 4 / currentStructInfo.timeSignature[1];
        for (let beat = 1; beat <= currentStructInfo.timeSignature[0]; beat++) {
            measureWidth += currentRelativeBeatWidth;
        }

        // Draw playing line
        let timelineCurrentX = playingLineOffset + (timeWithinMeasure / durations.durationOfMeasure * measureWidth);
        r.drawLine(ctx, timelineCurrentX, ttPadding, timelineCurrentX, canvasHeight - ttPadding, trackPrimaryColor, 1);
    }

    // Single animation loop
    function animate() {
        draw();
        drawTrack();
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);


    ///////  REGISTER KEYPRESSES  ////////////////////////////////////////////////////

    let lastDebugKey; // Store last key code

    // Return mouse position in canvas CSS-pixel coordinates
    function toCanvasCoords(event, canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }

    function pause() {
        a.pauseMusic();
        playButton.style.display = "inline-grid";
        pauseButton.style.display = "none";
    }

    function play() {
        a.resumeMusic();
        pauseButton.style.display = "inline-grid";
        playButton.style.display = "none";
    }

    async function setElapsed(newTime) {
        if (!loading) {
            // If currently playing, keep playing after seek; if paused, keep paused
            const playImmediately = !a.isPlaybackPaused();
            await a.setPlaybackTime(newTime, playImmediately);
        }
    }

    function setPanelWidth(n) {
        if (n < (global.canvas.width / 3) - (CSSinfoPaddingHorizontal * 2) && n > 228) {
            CSSinfoWidth = n;
            document.documentElement.style.setProperty("--value-info-width", `${CSSinfoWidth}px`);
        }
    }

    window.addEventListener("keydown", async event => {
        lastDebugKey = event.code; // Update last key code

        switch (event.code) {
            // Debug keys
            case "Digit1":
                debug[0] = !debug[0];
                break;
            case "Digit2":
                debug[1] = !debug[1];
                break;
            case "Digit3":
                debug[2] = !debug[2];
                break;
            case "Digit4":
                debug[3] = !debug[3];
                break;
            case "Digit5":
                debug[4] = !debug[4];
                break;
            
            // Pause
            case "Space":
                if (a.isPlaybackPaused()) play();
                else pause();
                break;

            // Forward and backward in song
            case "ArrowLeft":
                setElapsed(elapsed - 3);
                break;
            case "ArrowRight":
                setElapsed(elapsed + 3);
                break;

            // Previous and next song
            case "KeyA":
                playNextSong(selectedSong, -1, shuffle);
                break;
            case "KeyD":
                playNextSong(selectedSong, 1, shuffle);
                break;

            // Scramble motif colors 
            case "KeyZ":
                scrambleMotifColors();
                break;
            
            // Compress motifs 
            case "KeyC":
                compressMotifs = !compressMotifs;
                break;
            
            // Change motif height in track timeline (not panel) 
            case "Minus":
                ttMotifHeight--;
                break;
            case "Equal":
                ttMotifHeight++;
                break;
        }
    });

    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('keydown', (e) => {
            e.preventDefault();
        });
    });

    window.addEventListener('wheel', event => {
        if (in_canvas) { 
            dragY -= (event.deltaY / 2).toFixed(0);
        }
        if (in_motifPanel && ttPanelScrollbarNeeded) {
            ttPanelScrollOffset -= (event.deltaY / 4).toFixed(0);
        }
    });

    window.addEventListener('mousemove', event => {
        pos = toCanvasCoords(event, global.canvas);
        const dx = pos.x - clickX;
        const dy = pos.y - clickY;
        tcPos = toCanvasCoords(event, global.trackCanvas);

        in_canvas = determineCursorInCanvas();

        // Move the camera if dragging
        if (draggingCanvas) {
            dragX = startDragX + dx;
            dragY = startDragY + dy;
        }

        // Check hitbox
        const newHovered = getSongInCollidedHitbox();
        global.canvas.style.cursor = newHovered ? 'pointer' : 'auto';

        // Are we entering a different song? (only treat as "enter" when newHovered exists and is different)
        const enteringSong = (
            newHovered &&
            !(hoveredSong === newHovered ||
            (hoveredSong && newHovered && hoveredSong.songPath === newHovered.songPath))
        );

        if (enteringSong) {
            loadSongWithThresholdCheck(newHovered);
        }
        hoveredSong = newHovered; // Update hoveredSong for next frame

        // InfoDiv changes width on left-side

        const infoDivRect = infoDiv.getBoundingClientRect();
        const x = event.clientX - infoDivRect.left;

        in_infoDivLeftHitbox = (x >= -infoDivLeftHitboxWidth / 2 && x <= infoDivLeftHitboxWidth / 2);
        
        if (in_infoDivLeftHitbox || draggingInfoDiv) {
            document.body.style.cursor = 'col-resize';
            global.canvas.style.cursor = 'col-resize';

            if (!infoDiv.classList.contains('resizable')) {
                infoDiv.classList.add('resizable');
            }
        }
        else {
            document.body.style.cursor = 'auto';
            infoDiv.classList.remove('resizable');
        }

        if (draggingInfoDiv) {
            setPanelWidth(infoDivRect.right - event.clientX - CSSinfoPaddingHorizontal * 2);
            global.fitTrackCanvas();
        }
    });

    window.addEventListener('mousedown', event => {
        // Canvas coordinates
        pos = toCanvasCoords(event, global.canvas); 
        clickX = pos.x;
        clickY = pos.y;

        // trackCanvas coordinates
        tcPos = toCanvasCoords(event, global.trackCanvas);
        tcClickX = tcPos.x;
        tcClickY = tcPos.y;

        // InfoDiv coordinates (CSS pixels relative to infoDiv)
        const infoDivRect = infoDiv.getBoundingClientRect();
        const xInInfoDiv = event.clientX - infoDivRect.left;

        const in_infoDivLeftHitbox = (xInInfoDiv >= -infoDivLeftHitboxWidth/2 && xInInfoDiv <= infoDivLeftHitboxWidth/2);

        if (event.button === 0) {
            if (in_infoDivLeftHitbox) {
                event.preventDefault();
                draggingInfoDiv = true;
            } 
            else if (in_canvas && !bigCoverOverlay.classList.contains('active')) {
                if (hoveredSong === null) {
                    draggingCanvas = true;
                    startDragX = dragX;
                    startDragY = dragY;
                }
                else {
                    selectedSong = hoveredSong;
                    initSong(selectedSong);
                }
            }
            else if (in_ttPanelScrollbarFG) {

            }
        }
    });

    window.addEventListener('mouseup', event => {
        // Release the drag
        if (event.button === 0) {
            draggingCanvas = false;
            draggingInfoDiv = false;

            // Only applies if user is currently dragging the spinner of the timeline (so they can release anywhere on the window)
            if (draggingSpinner && selectedSong && !loading) {
                setElapsed(elapsedPercentInTime);
                draggingSpinner = false;
            }

            if (draggingVolumeSpinner && selectedSong && !loading) {
                lastManualVolume = volumePercent;
                draggingVolumeSpinner = false;
            }
        }
    });

    // BIG COVER EVENT LISTENERS

    bigCoverWrapper.addEventListener('mousemove', (e) => {
        const maxTilt = 5;

        const rect = bigCover.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateY = -(e.clientX - (rect.left + centerX)) / centerX * maxTilt;
        const rotateX =  (e.clientY - (rect.top  + centerY)) / centerY * maxTilt;

        bigCover.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        bigCover.classList.remove('inactive');
    });

    bigCoverWrapper.addEventListener('mouseleave', () => {
        bigCover.style.transform = ``;
        bigCover.classList.add('inactive');
    });

    // TIMELINE EVENT LISTENERS

    // When clicking on timeline
    lineContainer.addEventListener('mousedown', event => {
        if (event.button === 0) {
            draggingSpinner = true;
        }
    });

    shuffleButton.addEventListener('click', () => {
        shuffle = (shuffle + 1) % 3; // Cycle through shuffle modes (0, 1, 2)

        // Remove all shuffle-enabled classes first
        shuffleButton.classList.remove('enabled-1', 'enabled-2', 'enabled');

        if (shuffle === 1) {
            shuffleButton.classList.add('enabled-1');
            shuffleButton.classList.add('enabled');
        }
        else if (shuffle === 2) {
            shuffleButton.classList.add('enabled-2');
            shuffleButton.classList.add('enabled');
        }
    });

    backwardButton.addEventListener('click', () => playNextSong(selectedSong, -1, shuffle));
    forwardButton.addEventListener('click', () => playNextSong(selectedSong, 1, shuffle));

    pauseButton.addEventListener('click', () => pause() );
    playButton.addEventListener('click', () => play() );

    loopButton.addEventListener('click', () => {
        if (loopButton.classList.contains('enabled')) {
            loopButton.classList.remove('enabled');
            isLooping = false;
        }
        else {
            loopButton.classList.add('enabled');
            isLooping = true;
        }
        a.setLoop(isLooping);
    });

    // VOLUME EVENT LISTENERS

    // Opens the track below the timeline
    openTrackButton.addEventListener('click', () => {
        if (timelineDiv.classList.contains('opened-track')) {
            timelineDiv.classList.remove('opened-track');
            openTrackButton.classList.remove('enabled');
        }
        else {
            timelineDiv.classList.add('opened-track');
            openTrackButton.classList.add('enabled');

            // Wait until layout has been applied and then fit the canvas.
            // requestAnimationFrame ensures the DOM has updated layout.
            requestAnimationFrame(() => global.fitTrackCanvas());
        }
    });

    // When clicking volume line
    volumeLineContainer.addEventListener('mousedown', event => {
        if (event.button === 0) {
            event.preventDefault();
            draggingVolumeSpinner = true;
        }
    });
    
    // That thing when you click on the audio indicator and it mutes
    volumeIndicator.addEventListener('click', () => {
        if (volumePercent === 0 && lastManualVolume > 0) {
            volumePercent = lastManualVolume;
        } else {
            volumePercent = 0;
        }
        a.setVolume(volumePercent);
    })
}

main();