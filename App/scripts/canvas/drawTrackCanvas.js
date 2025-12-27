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

export function drawTrackCanvas() {
    if (!cnv.trackCtx || !cnv.trackCanvas) return;

    // Use CSS pixel size (drawing coordinates are in CSS pixels because state.font.setTransform was used)
    const rect = cnv.trackCanvas.getBoundingClientRect();
    const canvasWidth = Math.max(1, Math.floor(rect.width));
    const canvasHeight = Math.max(1, Math.floor(rect.height));

    // Clear the visible drawing area (in CSS pixels)
    cnv.trackCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!state.selectedSong || !aud.analyser || state.loading) return;
    const waveform = aud.getWaveformFloat32();
    if (!waveform || waveform.length === 0) return;

    // Layout
    const waveformStartX = 0;
    const waveformWidth = canvasHeight * .75;
    const waveformHeight = canvasHeight;
    const waveformCenterY = waveformHeight / 2;

    const trackPrimaryColor = '#2fff2f';

    // Background box (subtle)
    render.drawRect(cnv.trackCtx, waveformStartX, 0, waveformWidth, waveformHeight, 'black');

    // Gradient aligned to the waveform box (CSS pixels)
    const grad = cnv.trackCtx.createLinearGradient(0, 0, 0, waveformHeight);
    grad.addColorStop(0,  helpers.hexToRGBA(trackPrimaryColor, .3));
    grad.addColorStop(.5, helpers.hexToRGBA(trackPrimaryColor, .2));
    grad.addColorStop(1,  helpers.hexToRGBA(trackPrimaryColor, .1));

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
            cnv.trackCtx.moveTo(px, y);
        } else {
            cnv.trackCtx.lineTo(px, y);
        }
    }

    // Build the closed path (top curve left->right, bottom curve right->left)
    cnv.trackCtx.beginPath();
    for (let px = waveformStartX; px < waveformWidth; px++) {
        iterateWaveformPixels(true, px);
    }
    for (let px = waveformStartX + waveformWidth - 1; px >= waveformStartX; px--) {
        iterateWaveformPixels(false, px);
    }
    cnv.trackCtx.closePath();

    // Fill & stroke
    cnv.trackCtx.save();
    cnv.trackCtx.fillStyle = grad;
    cnv.trackCtx.fill();

    cnv.trackCtx.lineWidth = 1.0;
    cnv.trackCtx.lineJoin = 'round';
    cnv.trackCtx.lineCap = 'round';
    cnv.trackCtx.strokeStyle = helpers.hexToRGBA(trackPrimaryColor, 0.95);
    cnv.trackCtx.stroke();
    cnv.trackCtx.restore();

    // Draw the debug info on the waveform
    render.drawText(cnv.trackCtx, state.debug.structureString, { font: state.font.debug, x: 5, y: -state.font.size.default + 5, color: trackPrimaryColor, verticalSpacing: 1 });


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
    const ttMeasureBarHeight_TimeSig = state.font.size.timeSignature * 1.35;
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

    const measureNumberTextY = ttPadding + (ttMeasureBarHeight_Number - state.font.size.default) / 2;

    ///  DRAW TRACK TIMELINE  ///////////////////////////////////////////////////

    // Background
    render.drawRect(cnv.trackCtx, ttStartX, 0, ttWidth, canvasHeight, color_timelineBackground);

    // Inner timeline (no padding)
    render.drawRect(cnv.trackCtx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttInnerHeight, color_innerTimeline);

    // Measure bar (at the top)
    render.drawRect(cnv.trackCtx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttMeasureBarHeight_Total, color_measureBar, {
        shadow: { inner: true, shadowColor: color_shadow_measureBar, shadowBlur: 3, left: false, right: false }
    });
    render.drawBorder(cnv.trackCtx, ttPlayerStartX, ttInnerStartY, ttInnerWidth, ttMeasureBarHeight_Total, color_measureBar);

    // Draw track motif panel
    render.drawRect(cnv.trackCtx, ttInnerStartX, ttInnerStartY, ttPanelWidth, ttInnerHeight, color_innerTimeline);


    ///  DRAW MOTIF PANEL SCROLLBAR

    const color_panelScrollbarBG = 'hsla(200, 9%, 13%, 1.00)';
    const color_ttPanelScrollbarFG = 'hsla(200, 7%, 45%, 1.00)';
    
    function calculateMotifPanelHeight(motifParam) {
        let drawnMotifs = [];
        let motifY = ttInnerStartY + motifOffset;

        for (const motifData of motifParam) {
            const motif = motifRegistry.getMotif(motifData[2], init.motifs);

            // Skip if the motif is empty OR if compressing duplicates and it's already drawn
            if (motifData[1] === 0 || (state.trackTimeline.motifPanel.compressMotifs && drawnMotifs.includes(motif.name))) continue;

            drawnMotifs.push(motif.name);

            const motifHeight = state.font.size.default + motifOffset*2;
            motifY += motifHeight + motifOffset*1; // spacing
        }

        return motifY;
    }

    const ttPanelAllMotifsHeight = calculateMotifPanelHeight(state.selectedSong.motifs);
    const ttPanelOverflowHeight = (ttPanelAllMotifsHeight - ttPanelHeight - motifOffset*2);
    const ttPanelScrollbarFGHeight = Math.min(ttPanelHeight * (ttPanelHeight / ttPanelAllMotifsHeight), ttPanelHeight);
    const ttPanelScrollbarEmptyHeight = ttPanelHeight - ttPanelScrollbarFGHeight;
    state.trackTimeline.motifPanel.scrollbarNeeded = ttPanelScrollbarFGHeight < ttPanelHeight;

    // Constrict scroll to motifs
    state.trackTimeline.motifPanel.scrollOffset = (state.trackTimeline.motifPanel.scrollbarNeeded ? (Math.max(Math.min(state.trackTimeline.motifPanel.scrollOffset, 0), -ttPanelAllMotifsHeight + ttPanelHeight + motifOffset*2)) : 0);
    
    const ttPanelScrollbarStartY = ttPadding + ttPanelScrollbarEmptyHeight * (-state.trackTimeline.motifPanel.scrollOffset / ttPanelOverflowHeight);

    if (state.trackTimeline.motifPanel.scrollbarNeeded) {
        state.hovering.motifPanel.scrollbar =  (state.pos.trackCanvas.x > ttPanelScrollbarStartX)
                                            && (state.pos.trackCanvas.x < ttPanelScrollbarStartX + ttPanelScrollbarWidth)
                                            && (state.pos.trackCanvas.y > ttPanelScrollbarStartY)
                                            && (state.pos.trackCanvas.y < ttPanelScrollbarStartY + ttPanelScrollbarFGHeight);

        // Scrollbar bg
        render.drawRect(cnv.trackCtx, ttPanelScrollbarStartX, ttInnerStartY, ttPanelScrollbarWidth, ttPanelHeight, color_panelScrollbarBG);
        // Scrollbar fg
        render.drawRect(cnv.trackCtx, ttPanelScrollbarStartX, ttPanelScrollbarStartY, ttPanelScrollbarWidth, ttPanelScrollbarFGHeight, color_ttPanelScrollbarFG);
    }

    ///  DRAW MOTIF BOXES

    state.hovering.motifPanel.self = false;
    state.hovering.motifPanel.motif = false;
    cnv.trackCanvas.style.cursor = 'auto';

    let drawnMotifs = [];

    for (const motifData of state.selectedSong.motifs) {
        let motif = motifRegistry.getMotif(motifData[2], init.motifs);

        // Skip this iteration if this motif is already included in drawnMotifs (ignore if compressedMotifs is enabled)
        if (motifData[1] === 0 || (state.trackTimeline.motifPanel.compressMotifs && drawnMotifs.includes(motif.name))) continue;

        drawnMotifs.push(motif.name);

        motif.panelX = ttInnerStartX + motifOffset;
        motif.panelY = motifY + state.trackTimeline.motifPanel.scrollOffset;
        motif.width = motifBoxWidth - (state.trackTimeline.motifPanel.scrollbarNeeded ? ttPanelScrollbarWidth : 0);
        motif.height = state.font.size.default + motifOffset*2;

        // Redefine mouse collision
        state.hovering.motifPanel.self = (state.pos.trackCanvas.x > ttInnerStartX && state.pos.trackCanvas.x < ttInnerStartX + ttPanelWidth && state.pos.trackCanvas.y > ttInnerStartY && state.pos.trackCanvas.y < ttInnerStartY + ttInnerHeight);
        state.hovering.motifPanel.motif = state.hovering.motifPanel.self && (state.pos.trackCanvas.x > motif.panelX && state.pos.trackCanvas.x < motif.panelX + motif.width && state.pos.trackCanvas.y > motif.panelY && state.pos.trackCanvas.y < motif.panelY + motif.height);
        
        if (state.hovering.motifPanel.motif) {
            cnv.trackCanvas.style.cursor = 'pointer';
            render.drawRect(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color, {
                shadow: { inner: true, shadowColor: motif.color_highlight, shadowBlur: motif.height, left: false, right: false, top: false }
            });
            render.drawBorder(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color_highlight);
        }
        else {
            render.drawRect(cnv.trackCtx, motif.panelX, motif.panelY, motif.width, motif.height, motif.color, {
                shadow: { inner: false, shadowColor: color_shadow_timelineBackground, shadowBlur: 4 }
            });
        }

        const motifDisplayName = helpers.truncateString(motif.name, motif.width);
        render.drawText(cnv.trackCtx, motifDisplayName, { x: motif.panelX + motifOffset, y: motif.panelY + motifOffset, fontSize: state.font.size.default, color: motif.color_text });
        
        motifY += state.font.size.default + motifOffset*3;
    }
    render.drawRect(cnv.trackCtx, ttStartX, 0, ttWidth, ttInnerStartY, color_timelineBackground);
    render.drawRect(cnv.trackCtx, ttStartX, ttInnerEndY, ttWidth, canvasHeight - ttInnerEndY, color_timelineBackground);


    ///  DRAW THE ACTUAL TRACK TIMELINE (REAL)  /////////////////////////////////////////////////////////////////////////////////////

    // Returns struct info for a given measure
    // If a struct entry doesn't have certain fields (bpm, timeSignature), they're inherited from the most recent prior entry that specified them
    function getStructInfoFromMeasure(measure) {
        if (!state.selectedSong || !state.selectedSong.structure || state.selectedSong.structure.length === 0) return { bpm: 120, timeSignature: [4,4] };

        // Start with an empty resolved object
        const resolved = {};

        // Iterate through each struct entry in order; apply fields when we pass their start measure
        for (let i = 0; i < state.selectedSong.structure.length; i++) {
            const entry = state.selectedSong.structure[i];
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
        beatLine:      { minSpacing: 6 },
        timeSig:       { minSpacing: 4, centered: false }
    };

    // Reset overlap state each state.debug.frame
    let overlapState = { lastRight: { measureNumber: -Infinity, measureLine: -Infinity, timeSig: -Infinity } };

    // Check if an object can be drawn
    function canDraw(kind, x, width = 0) {
        const cfg = drawConfig[kind] || { minSpacing: 6 };
        const centered = cfg.centered;

        const leftX = centered ? (x - (width / 2)) : x;
        const rightX = leftX + width;

        const requiredLeft = overlapState.lastRight[kind] + (cfg.minSpacing || 0);

        // Draw debug hitboxes5
        if (state.debug.visuals[4]) {
            switch (kind) {
                
                case "measureNumber":
                    render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], measureNumberTextY, cfg.minSpacing || 0, state.font.size.default, 'red');
                    render.drawBorder(cnv.trackCtx, leftX, measureNumberTextY, rightX-leftX, state.font.size.default, 'white');
                    break;
                
                case "timeSig":
                    render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], ttTimeSigStartY, cfg.minSpacing || 0, state.font.size.timeSignature * 1.5, 'red');
                    render.drawBorder(cnv.trackCtx, leftX, ttTimeSigStartY, rightX-leftX, state.font.size.timeSignature * 1.5, 'white');
                    break;
                
                case "measureLine":
                    render.drawBorder(cnv.trackCtx, overlapState.lastRight[kind], ttMeasureBarEndY, cfg.minSpacing || 0, ttInnerHeight - ttMeasureBarHeight_Total, 'red');
                    render.drawLine(cnv.trackCtx, overlapState.lastRight[kind], ttMeasureBarEndY, overlapState.lastRight[kind], ttInnerEndY, 'white');
                    break;
            }
        }

        if (leftX >= requiredLeft) {
            overlapState.lastRight[kind] = rightX;
            return true;
        }
        return false;
    }

    // Compute beatWidth so all beats fit exactly inside the inner timeline
    let beatUnitCount = 0;
    for (let measure = 1; measure <= state.selectedSong.totalMeasures; measure++) {
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
    for (let measure = 1; measure <= state.selectedSong.totalMeasures; measure++) {

        // Set playing line offset
        if (measure === state.structure.currentMeasure) playingLineOffset = ttCurrentDrawnX;

        // Get thisStructInfo (resolved)
        thisStructInfo = getStructInfoFromMeasure(measure);

        ///  MEASURE NUMBER  //////////////////////////////////////////////////////////////////
        
        const measureText = `${measure}`;
        const rawTextWidth = render.getTextWidth(cnv.trackCtx, measureText);
        const measureScaleX = drawConfig.measureNumber.scaleX;
        const drawTextWidth = rawTextWidth * measureScaleX; // If render.getTextWidth already accounts for scale, remove the * measureScaleX

        if (canDraw('measureNumber', ttCurrentDrawnX, drawTextWidth)) {
            render.drawText(cnv.trackCtx, measureText, { x: ttCurrentDrawnX, y: measureNumberTextY, scaleX: measureScaleX, color: '#ffffff' });
        }

        ///  MEASURE LINE  //////////////////////////////////////////////////////////////////

        if (canDraw('measureLine', ttCurrentDrawnX, 1)) {
            render.drawLine(cnv.trackCtx, ttCurrentDrawnX, ttMeasureBarEndY, ttCurrentDrawnX, canvasHeight - ttPadding, color_measureVerticalLine, 1);
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
            const glyphWidthEst = render.getTextWidth(cnv.trackCtx, `${glyph1}\n${glyph2}`, state.font.timeSignature) * 1.6;
            if (canDraw('timeSig', ttCurrentDrawnX, glyphWidthEst)) {
                render.drawText(cnv.trackCtx, `${glyph1}\n${glyph2}`, { font: state.font.timeSignature, fontSize: state.font.size.timeSignature, x: ttCurrentDrawnX, y: ttTimeSigStartY, verticalSpacing: .55 });
            }
        }

        ///  BEAT LINES  //////////////////////////////////////////////////////////////////

        let relativeBeatWidth = beatWidth * 4 / thisStructInfo.timeSignature[1];
        let ttFakeCurrentDrawnX = ttCurrentDrawnX;

        // Only draw beat lines if they won't be too dense (per-measure decision)
        if (relativeBeatWidth >= drawConfig.beatLine.minSpacing) {
            for (let beat = 1; beat <= thisStructInfo.timeSignature[0]; beat++) {
                ttFakeCurrentDrawnX += relativeBeatWidth;
                render.drawLine(cnv.trackCtx, ttFakeCurrentDrawnX, ttMeasureBarEndY, ttFakeCurrentDrawnX, canvasHeight - ttPadding, color_beatVerticalLine, 1);
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
        for (let m_ = 1; m_ < M; m_++) {
            const struct = getStructInfoFromMeasure(m_);
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
    if (state.selectedSong.motifs.length > 0 && state.selectedSong.motifs[0][2] != '') {

        for (const tcMotifData of state.selectedSong.motifs) {

            // Motif object reference
            const motifObj = motifRegistry.getMotif(tcMotifData[2], init.motifs);

            // Assign Y only the first time this motif is seen
            if (!ttMotifYMap.has(motifObj)) {
                ttMotifYMap.set(motifObj, ttMotifY);
                ttMotifY += state.trackTimeline.motifPanel.motifHeight;
            }

            const y = ttMotifYMap.get(motifObj);

            const startMeasure = tcMotifData[0];
            const endMeasure = tcMotifData[1];

            const startX = measureToX(startMeasure);
            const endX = measureToX(endMeasure);
            const ttMotifWidth = endX - startX;

            // Draw the motif block
            render.drawRect(cnv.trackCtx, startX, y, ttMotifWidth, state.trackTimeline.motifPanel.motifHeight, motifObj.color);

            // Draw the label
            const tcMotifDataDisplayName = helpers.truncateString(tcMotifData[2], ttMotifWidth - 2);
            render.drawText(cnv.trackCtx, tcMotifDataDisplayName, { x: startX + 2, y: y + (state.trackTimeline.motifPanel.motifHeight - state.font.size.default) / 2, fontSize: state.font.size.default, color: motifObj.color_text });
        }
    }

    // Set measureWidth for the current measure (used for playing line calculation)
    state.structure.currentStructInfo = getStructInfoFromMeasure(state.structure.currentMeasure);
    let currentRelativeBeatWidth = beatWidth * 4 / state.structure.currentStructInfo.timeSignature[1];
    for (let beat = 1; beat <= state.structure.currentStructInfo.timeSignature[0]; beat++) {
        measureWidth += currentRelativeBeatWidth;
    }

    // Draw playing line
    let timelineCurrentX = playingLineOffset + (state.structure.timeWithinMeasure / state.structure.durations.durationOfMeasure * measureWidth);
    render.drawLine(cnv.trackCtx, timelineCurrentX, ttPadding, timelineCurrentX, canvasHeight - ttPadding, trackPrimaryColor, 1);
}