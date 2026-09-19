// Keep a readable measurement tied to an explicit value and unit.
const GutterMeasurement = {
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
