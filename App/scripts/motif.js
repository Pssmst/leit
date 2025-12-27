import * as helpers from './helpers.js';

export class Motif {
    constructor(name,
        {
            occurrences = {},
            origin = null,
            color = `#ffffff`,
        } = {}
    ) {
        this.name = name;
        this.occurrences = occurrences;
        this.rawHSV = null;
        this.origin = origin;
        this.color = color;
        this.color_text = null;
        this.color_highlight = null;
    }
}


export function buildMotifsFromSongs(songs) {
    const motifs = [];

    function getMotif(name) {
        return motifs.find(m => m.name === name);
    }

    for (const song of songs) {
        for (const [start, end, name] of song.motifs) {
            if (!name) continue;

            let motif = getMotif(name);
            if (!motif) {
                motif = new Motif(name);
                motifs.push(motif);
            }

            motif.occurrences[song.name] ??= [];
            motif.occurrences[song.name].push([start, end]);
        }
    }

    return motifs;
}


export function getMotif(name, motifs) {
    for (const motif of motifs) {
        if (motif.name === name) {
            return motif;
        }
    }
}


export function scrambleMotifColors(motifs) {
    for (const motif of motifs) {
        let hue = helpers.randInt(0, 360);
        let sat = helpers.randInt(20, 100);
        let val = helpers.randInt(50, 100);

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
        const [r, g, b] = helpers.convertColor('hsv', 'rgb', [hue, sat, val]);

        motif.color = `rgb(${r}, ${g}, ${b})`;

        // Create color for highlighted motifs (in motif panel)
        const motifBoxLighterGradient = helpers.convertColor('hsv', 'rgb', [ motif.rawHSV.h + 15, motif.rawHSV.s, Math.min(motif.rawHSV.v*1.5, 255) ]);

        if (isCopyright) {
            motif.color_highlight = `rgba(156, 162, 170, 1)`
        }
        else {
            motif.color_highlight = `rgb(${motifBoxLighterGradient[0]},${motifBoxLighterGradient[1]},${motifBoxLighterGradient[2]})`;
        }

        // Sees if the name needs to be inverted (darker)
        // Goes off 'percieved' colors
        const bgRGB = helpers.convertColor('hsv', 'rgb', [motif.rawHSV.h, motif.rawHSV.s, motif.rawHSV.v]);
        const cw = helpers.getContrast(bgRGB, [255, 255, 255]);
        const cb = helpers.getContrast(bgRGB, [0, 0, 0]) * .3; // Weighted bc I prefer having white text
    
        // Pick whichever has better contrast
        const color_raw_motifBoxTextDark = helpers.convertColor('hsv', 'rgb', [ motif.rawHSV.h, motif.rawHSV.s, motif.rawHSV.v*.2 ]);
        motif.color_text = (cw >= cb ? 'white' : `rgb(${color_raw_motifBoxTextDark[0]},${color_raw_motifBoxTextDark[1]},${color_raw_motifBoxTextDark[2]})`);
    }
}