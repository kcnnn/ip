// Keep a readable measurement tied to an explicit value and unit.
const GutterMeasurement = {
    readingInstructions: `Interpret the physical tape placement, not its orientation on the screen.
   - A tape appearing vertical or diagonal in a photo can span the gutter opening from the roof-side edge to the outer lip. Do not require it to appear horizontal in the image or require an overhead photograph.
   - Locate the tape hook, its contact point, the rear gutter edge and the outer lip. A hooked zero end can establish the starting point even if the printed zero is covered by the hook. If the hook is on an offset roof/shingle edge, account for that offset or state the uncertainty; do not assume it equals the gutter edge.
   - Read the inch graduations at the actual gutter edges. Tape labels such as "35 FT" describe total tape length, NOT the unit of each numbered graduation. Determine units from the scale; do not call consecutive inch marks feet.
   - Use the relevant lip/edge intersection, not the furthest visible tape number, shadow, or tape housing. Subtract start from end when the starting point is not zero.
   - Separate the observed tape width from nominal gutter sizing. Do not round an ambiguous reading to a common size or force a 5-inch result. If endpoints and units support a reading, report it even when the tape is vertical in the picture.
   - If genuinely uncertain, describe the specific unclear endpoint or scale detail. Do not claim an endpoint is missing solely because the tape is vertical or its zero numeral is hidden by its hook.`,
    unavailable() {
        return {
            overallQuality: 'needs_improvement', confidence: null,
            measurementReadable: false, gutterSize: null,
            issues: [], recommendations: [], shouldRetake: false
        };
    },
    normalize(result) {
        if (!result || typeof result !== 'object' || Array.isArray(result)) return this.unavailable();
        const raw = typeof result.gutterSize === 'string' ? result.gutterSize.trim() : '';
        // Accept explicit decimal or fractional measurements, not guesses or prose.
        const match = raw.match(/^(\d+(?:\.\d+)?(?:\s+\d+\/\d+)?|\d+\/\d+)\s*(inches|inch|in\.?|["″]|mm|millimeters|millimetres|cm|centimeters|centimetres)$/i);
        const positive = match && match[1].split(/\s+/).every(part => {
            const [n, d = '1'] = part.split('/');
            return Number(d) > 0 && Number(n) / Number(d) > 0;
        });
        const explicitlyUnreadable = result.measurementReadable === false ||
            /^(false|no)$/i.test(String(result.measurementReadable).trim());
        const readable = Boolean(positive && !explicitlyUnreadable && !result.apiError);
        const unit = match && (/^(inches|inch|in\.?|["″])$/i.test(match[2]) ? 'inches' : /^m/i.test(match[2]) ? 'mm' : 'cm');
        return {
            ...result,
            measurementReadable: readable,
            gutterSize: readable ? `${match[1]} ${unit}` : null
        };
    },
    parse(text) {
        try {
            const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
            return this.normalize(JSON.parse(fenced ? fenced[1] : text));
        } catch {
            return this.unavailable();
        }
    }
};
if (typeof module !== 'undefined') module.exports = GutterMeasurement;
