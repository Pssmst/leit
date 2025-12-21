export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
canvas.addEventListener('contextmenu', e => e.preventDefault());

export const trackCanvas = document.getElementById('track-canvas');
export const trackCtx = trackCanvas.getContext('2d');
trackCanvas.addEventListener('contextmenu', e => e.preventDefault());

/**
 * Resize a canvas to match its CSS layout size multiplied by devicePixelRatio,
 * and set the context transform so 1 unit = 1 CSS pixel.
 *
 * @param {HTMLCanvasElement} c
 * @param {CanvasRenderingContext2D} g
 * @param {number|null} cssWidth  - if null, will read from getBoundingClientRect().width
 * @param {number|null} cssHeight - if null, will read from getBoundingClientRect().height
 */
export function setupCanvasForDPR(c, g, cssWidth = null, cssHeight = null) {
    if (!c || !g) return;

    // If caller didn't provide explicit CSS size, read bounding rect
    if (cssWidth === null || cssHeight === null) {
        const rect = c.getBoundingClientRect();
        cssWidth = Math.max(1, Math.floor(rect.width));
        cssHeight = Math.max(1, Math.floor(rect.height));
    }
    else {
        cssWidth = Math.max(1, Math.floor(cssWidth));
        cssHeight = Math.max(1, Math.floor(cssHeight));
    }

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const backingWidth = Math.floor(cssWidth * dpr);
    const backingHeight = Math.floor(cssHeight * dpr);

    // Only update if sizes changed to avoid unnecessary reflows
    if (c.width !== backingWidth || c.height !== backingHeight) {
        c.width = backingWidth;
        c.height = backingHeight;
    }

    // Ensure the element visually keeps the CSS pixel size
    c.style.width = cssWidth + 'px';
    c.style.height = cssHeight + 'px';

    // Reset transform so 1 unit in drawing = 1 CSS pixel
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    g.imageSmoothingEnabled = false;
}

export function fitCanvasToParent(canvas, ctx) {
    if (!canvas || !ctx || !canvas.parentElement) return;

    // Use parentElement.clientWidth/clientHeight (inner box excluding scrollbar/borders)
    const cssW = Math.max(1, Math.floor(canvas.parentElement.clientWidth));
    const cssH = Math.max(1, Math.floor(canvas.parentElement.clientHeight));

    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const backingW = Math.floor(cssW * dpr);
    const backingH = Math.floor(cssH * dpr);

    // Only update backing store if it actually changed (avoid forced reflows)
    if (canvas.width !== backingW || canvas.height !== backingH) {
        canvas.width = backingW;
        canvas.height = backingH;
    }

    // Ensure the element visually keeps the CSS pixel size
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    // Reset transform so 1 unit in drawing = 1 CSS pixel
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
}

export function fitTrackCanvas() {
    fitCanvasToParent(trackCanvas, trackCtx);
}

export function resizeCanvases() {
    setupCanvasForDPR(canvas, ctx, window.innerWidth, window.innerHeight);
    fitTrackCanvas();
}

// Initial sizing (call now so canvases are set up on load)
resizeCanvases();

// Keep canvases sized when window resizes
window.addEventListener('resize', () => {
    resizeCanvases();
});

//////////  PROGRAM CONSTANTS  ///////////////////////////////////////

export const font = "Arial";
export const fontTimeSignature = "Bravura";
export const fontDebug = "Jetbrains Mono";
export const fontSize = 14;
export const fontSizeTimeSignature = 22;
export const verticalSpacing = 1.2;

//////////  AUDIO  ////////////////////////////////////////

export const audioContext = window.audioContext || new (window.AudioContext || window.webkitAudioContext)();
window.audioContext = audioContext;

//////////  FUNCTIONS  ////////////////////////////////////////

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


//////////  TEXTURES  ///////////////////////////////////////

export const textures = {
    cover_unknown:                  `../App/assets/textures/covers/unknown.png`,
    cover_StuffNThings_1:           `../App/assets/textures/covers/StuffNThings_1.png`,
    cover_StuffNThings_2:           `../App/assets/textures/covers/StuffNThings_2.png`,
    cover_TDCC_1:                   `../App/assets/textures/covers/TDCC_1.png`,
    cover_TDCC_2:                   `../App/assets/textures/covers/TDCC_2.png`,
    cover_TDCC_3A:                  `../App/assets/textures/covers/TDCC_3A.png`,
    cover_TDCC_3B:                  `../App/assets/textures/covers/TDCC_3B.png`,
    cover_TDCC_4:                   `../App/assets/textures/covers/TDCC_4.png`,
    cover_TDCC_FX:                  `../App/assets/textures/covers/TDCC_FX.png`,
    cover_TheChowderCollection:     `../App/assets/textures/covers/TheChowderCollection.png`,
    cover_TheChowderCollection_X:   `../App/assets/textures/covers/TheChowderCollection_X.png`,

    cover_Cosmo:                    `../App/assets/textures/covers/Cosmo.png`,
    cover_TSA_2024:                 `../App/assets/textures/covers/TSA_2024.png`,
    cover_TSA_2025:                 `../App/assets/textures/covers/TSA_2025.png`,

    daw_GarageBand:                 `../App/assets/textures/daws/GarageBand.png`,
    daw_FL_Studio:                  `../App/assets/textures/daws/FL_Studio.png`,

    // Unknown covers

    cover_Patrick:                  `../App/assets/textures/covers/Additional Covers/Patrick.png`,
    cover_Fluffy_Rex:               `../App/assets/textures/covers/Additional Covers/Fluffy Rex.png`,
    cover_Puzzle_Music:             `../App/assets/textures/covers/Additional Covers/Puzzle Music.jpg`,
    cover_Fluffy_Dandruff:          `../App/assets/textures/covers/Additional Covers/Fluffy Dandruff.jpg`,
    cover_Rock_Bottom:              `../App/assets/textures/covers/Additional Covers/Rock Bottom.jpg`,
    cover_Oddball:                  `../App/assets/textures/covers/Additional Covers/Oddball.jpg`,
    cover_Cringe_Fight_Reflection:  `../App/assets/textures/covers/Additional Covers/Cringe Fight - Reflection.jpg`,
    cover_Insomnia:                 `../App/assets/textures/covers/Additional Covers/Insomnia.jpg`,
    cover_Escaping_the_Temple:      `../App/assets/textures/covers/Additional Covers/Escaping the Temple.jpg`,
    cover_Cringe_Fight_Ruins:       `../App/assets/textures/covers/Additional Covers/Cringe Fight - Ruins.jpg`,
    cover_Groove:                   `../App/assets/textures/covers/Additional Covers/Groove.jpg`,
    cover_Cringes_Theme:            `../App/assets/textures/covers/Additional Covers/Cringe's Theme.jpg`,
    cover_Old_Friend:               `../App/assets/textures/covers/Additional Covers/Old Friend.jpg`,
    cover_Trekking:                 `../App/assets/textures/covers/Additional Covers/Trekking.jpg`,
    cover_Utopia:                   `../App/assets/textures/covers/Additional Covers/Utopia.jpg`,
    cover_Now_or_Never:             `../App/assets/textures/covers/Additional Covers/Now or Never.jpg`,
    cover_Fortnite_Sans_Battle:     `../App/assets/textures/covers/Additional Covers/Fortnite Sans Battle.jpg`,
    cover_Campire_and_Moonjump:     `../App/assets/textures/covers/Additional Covers/Campfire & Moonjump.jpg`,
    cover_CFS_Legacy:               `../App/assets/textures/covers/Additional Covers/CFS - Legacy.jpg`,
    cover_Cringe_Fight_Summit:      `../App/assets/textures/covers/Additional Covers/Cringe Fight - Summit.jpg`,
    cover_Beyond:                   `../App/assets/textures/covers/Additional Covers/Beyond.jpg`,
    cover_Attack_on_Big_Rock:       `../App/assets/textures/covers/Additional Covers/Attack on Big Rock.jpg`,
    cover_Tesotrix_Dreamling_Fight: `../App/assets/textures/covers/Additional Covers/Tesotrix (Dreamling Fight).jpg`,
    cover_Seborrhea:                `../App/assets/textures/covers/Additional Covers/Seborrhea.jpg`,
    cover_Ghost_Huntin:             `../App/assets/textures/covers/Additional Covers/Ghost Huntin'.jpg`,
    cover_Clueless:                 `../App/assets/textures/covers/Additional Covers/Clueless.jpg`,
    cover_Scopoclaustria:           `../App/assets/textures/covers/Additional Covers/Scopoclaustria.jpg`,
    cover_Culture_Shock:            `../App/assets/textures/covers/Additional Covers/Culture Shock.jpg`,
    cover_Metal:                    `../App/assets/textures/covers/Additional Covers/Metal.jpg`,
    cover_Maybe_Jazz:               `../App/assets/textures/covers/Additional Covers/Maybe Jazz.jpg`,
    cover_Secret_Theme:             `../App/assets/textures/covers/Additional Covers/Secret Theme.jpg`,
    cover_Seven_Eight:              `../App/assets/textures/covers/Additional Covers/Seven Eight.jpg`,
    cover_Cringe_Dance_Off:         `../App/assets/textures/covers/Additional Covers/Cringe Dance-Off.jpg`,
    cover_Sansflower:               `../App/assets/textures/covers/Additional Covers/Sansflower.jpg`,
    cover_Dog_Lobby_Music:          `../App/assets/textures/covers/Additional Covers/Dog Lobby Music.jpg`,
    cover_FINALE:                   `../App/assets/textures/covers/Additional Covers/FINALE.jpg`,
    cover_Hate:                     `../App/assets/textures/covers/Additional Covers/Hate.jpg`,
    cover_Resolve:                  `../App/assets/textures/covers/Additional Covers/Resolve.jpg`,
    cover_THE_SLOP_THEME:           `../App/assets/textures/covers/Additional Covers/THE SLOP THEME.jpg`,
    cover_A_Battle_is_Afoot:        `../App/assets/textures/covers/Additional Covers/A Battle is Afoot!.jpg`,
    cover_Whirlwind_Warfare:        `../App/assets/textures/covers/Additional Covers/Whirlwind Warfare.jpg`,
    cover_Cringe_Bingers:           `../App/assets/textures/covers/Additional Covers/Cringe-Bingers.jpg`,
    cover_Furious_Haze:             `../App/assets/textures/covers/Additional Covers/Furious Haze.jpg`,
    cover_Gilbert:                  `../App/assets/textures/covers/Additional Covers/Gilbert.jpg`,
    cover_Commence:                 `../App/assets/textures/covers/Additional Covers/Commence.jpg`,
    cover_Old_TDCC_Disc_1:          `../App/assets/textures/covers/Additional Covers/Old TDCC Disc 1.jpg`,
    cover_Cosmos_80s_Funk:          `../App/assets/textures/covers/Additional Covers/Cosmo's 80s Funk.jpg`,
    cover_Core:                     `../App/assets/textures/covers/Additional Covers/Core.jpg`,
    cover_W_Rizz:                   `../App/assets/textures/covers/Additional Covers/W Rizz.jpg`,
    cover_Old_Chowder_Collection:   `../App/assets/textures/covers/Additional Covers/Old Chowder Collection.jpg`,
    cover_Long_Overdue:             `../App/assets/textures/covers/Additional Covers/Long Overdue.jpg`,
    cover_Old_TDCC_Disc_3b:         `../App/assets/textures/covers/Additional Covers/Old TDCC Disc 3b.jpg`,
    cover_Sunspots:                 `../App/assets/textures/covers/Additional Covers/Sunspots.jpg`,
};

export const T = {};

export function preloadTextures() {
    const promises = Object.keys(textures).map(name => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => { T[name] = img; resolve(img); };
            img.onerror = () => { 
                // still store the Image (or handle error)
                T[name] = img;
                resolve(img);
            };
            img.src = textures[name];
        });
    });
    return Promise.all(promises);
}