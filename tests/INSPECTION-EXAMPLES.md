# Inspection-example checks

The fixture manifest captures recurring user-reported cases: water-heater/HVAC reference labels, mechanical damage explicitly not hail, a five-inch gutter, a chalk 10+ tally, and an overview with no damage assessment. Expected values concern the inspector's words; they are not independent diagnoses of photos.

Offline browser tests mock provider responses and verify app behavior, not model accuracy. `live-inspection-examples.cjs` separately checks actual vision/organization responses against these cases.

To run a live check, place appropriate private photos in a directory outside Git using the filenames in `fixtures/inspection-examples.json`. Set `APEX_EVAL_PHOTO_DIR` and `APEX_EVAL_API_KEY` through your local environment, start the local site on port 8000, and run `node tests/live-inspection-examples.cjs --live` with Playwright available. The explicit live run sends those photos to Claude and consumes API usage. No key, photo, transcript output or response is logged or saved by the runner; it reports only case IDs and failed checks. It never changes an actual inspection record.

These checks do not certify factual equipment matching, visual measurements or damage causes. Review the actual photo and AI response when investigating a failing case. No live run is claimed without credentials and the matching private photo set.
