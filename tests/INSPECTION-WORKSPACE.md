# Inspection workspace verification

Run a localhost server from the project root (`python3 -m http.server 8000 --bind 127.0.0.1`).
With Playwright installed or exposed through `NODE_PATH`, run:

```
node tests/inspection-workspace.browser.cjs
node --test tests/gutter-measurement.test.js
node --test tests/observation-extraction.test.js
node tests/dictation-first.browser.cjs
```

The browser suite launches installed Chrome using a fresh, isolated context. It blocks non-local requests and uses generated image data and a mock speech-recognition implementation; it never reads a real API key or submits a property photo.

Coverage: arbitrary photo-step entry, structured note creation/editing, contradictory damage-choice clearing, draft persistence across pages/reloads, dictation append/stop, original-photo persistence, concurrent save isolation, duplicate accessory types, interview drafts/real counts, original-photo review, print visibility, mobile overflow and local storage failure reporting.

Manual acceptance on an HTTPS deployment:

- Allow the microphone, dictate a note, stop, correct its text, save and reopen it.
- Deny microphone access and confirm typing still works.
- Repeat on the inspectors' actual phones; browser speech-recognition availability varies. The service may send audio to the browser provider. See [MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
- Capture a photo, leave the section and return. Verify its full original reopens, not just its thumbnail.
- Print the review and check that selected observations, locations, measurements, linked photos and section-review statuses match the saved record.

Scope: this is a single current inspection saved on one browser/device, not cloud synchronization. Existing v1 metadata is retained; legacy thumbnails cannot reconstruct missing originals. Notes JSON export includes metadata/thumbnails, not originals or API credentials. Inspector selections generate deterministic narrative text, not a new AI assessment. Photo-analysis providers, credentials, prompts and model accuracy were not changed in this pass. The interview now opens the evidence-based printable review instead of the older generated-report flow.

Dictation-first update: stopping dictation now requests structured suggestions from the existing configured AI provider. Typed notes use the Fill fields button. Requests contain the transcript and allowed fields, not property photos or the entire inspection record. The transcript is retained, unspecified fields stay empty, and a completed observation still requires explicit Save. Existing manual selections require confirmation before replacement. Multiple distinct observations are flagged for splitting rather than mixing their facts. Unit tests validate source evidence and field types; the browser suite mocks speech and AI, checks stale-response protection and missing-key recovery. Live speech recognition and model accuracy must still be checked on the inspectors' devices.
