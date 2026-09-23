# Inspection-example checks

## Release gate for photo-review changes

Run `node tests/photo-release-check.test.cjs` for the offline gate tests. This tests the gate, NOT photo accuracy.

The private live manifest must cover categories `normal-joints`, `manual-lift`, `real-crack`, `mechanical-not-hail`, `label`, and `uncertain-photo`. The template includes these categories; replace placeholders with inspector-verified private examples. The inspector should review the original image and full response against each rubric, including false positives, missed real damage, invented identifiers, and overstated certainty. A failed response remains a failure—do not change reference answers to make it pass.

After a fresh live run, create a private review JSON outside Git:

```json
{
  "reportHash": "SHA256_OF_THE_EXACT_RESULTS_JSON_FILE",
  "reviewer": "Reviewer name",
  "reviewedAt": "2026-09-21",
  "decisions": [
    {"id": "normal-shingle-joints", "verdict": "pass", "notes": "Specific observations supporting this decision; include limitations."}
  ]
}
```

Use `shasum -a 256 /private/path/results.json` for the report hash. Include a decision for EVERY case; use `fail` or `needs_review` when appropriate. Never pre-fill a pass without reviewing the actual response and photo.

Run `node tests/photo-release-check.cjs /private/path/results.json /private/path/review.json` before releasing photo-review changes. Exit 0 means the sampled suite has complete coverage, no automated failures, all cases explicitly reviewed, and matching current source hashes. Exit 1 blocks the check. Missing photos, missing decisions and old reports cannot pass. This is a manual release check, not an automatic Git push hook or a statistical accuracy certification. Private responses, photos, manifests and reviewer notes must not be committed. Older reports lacking category/source hashes need a new live run.

The fixture manifest captures recurring user-reported cases: water-heater/HVAC reference labels, mechanical damage explicitly not hail, a five-inch gutter, a chalk 10+ tally, and an overview with no damage assessment. Expected values concern the inspector's words; they are not independent diagnoses of photos.

Offline browser tests mock provider responses and verify app behavior, not model accuracy. `live-inspection-examples.cjs` separately checks actual vision/organization responses against these cases.

To run a live check, place appropriate private photos in a directory outside Git using the filenames in `fixtures/inspection-examples.json`. Set `APEX_EVAL_PHOTO_DIR` and `APEX_EVAL_API_KEY` through your local environment, start the local site on port 8000, and run `node tests/live-inspection-examples.cjs --live` with Playwright available. The explicit live run sends those photos to Claude and consumes API usage. No key, photo, transcript output or response is logged or saved by the runner; it reports only case IDs and failed checks. It never changes an actual inspection record.

These checks do not certify factual equipment matching, visual measurements or damage causes. Review the actual photo and AI response when investigating a failing case. No live run is claimed without credentials and the matching private photo set.

## Blind real-photo checks
For three-stage brittle tests, use an after-release primary photo and two comparisons labeled `before` and `during`. Keep older before/after cases as backward-compatibility checks. Confirm which image actually shows release; do not relabel a historical lifted view as released or infer a missing phase.

Before releasing photo-review changes, run the private suite and review every REVIEW_REQUIRED result against its source photos. Use `fixtures/photo-accuracy.template.json` as a checklist: blind measurement, normal joints, manual test lift, a verified real-crack negative control, and exact label reading. Replace PRIVATE paths and label answers outside Git. Do not mark the suite complete when a case/photo is missing. A mock test verifies wiring, not vision accuracy.

Paired cases accept `brittlePhase`, `purpose`, and `comparisons: [{phase: "before", photo: "/private/path.png"}]`. The application receives labeled images, not expected answers. `expectedFields` and `forbiddenDamageTypes` are scored after the response; these structured checks do not substitute for visual review. Reports include image hashes and the extractor hash so regressions can be traced to a specific input and prompt version. Compare reports for the same image hashes; retain failures and human review notes privately.

`actual-photo-accuracy.cjs` accepts a private `APEX_EVAL_MANIFEST` outside Git. Each entry has an id, absolute photo path and kind (`label`, `accessory`, or `observation`). Label entries can have exact `expected` identifier fields; observation entries need a neutral note and section. Optional `reviewCriteria` describe a human review rubric. Expected answers and criteria are never sent to the model. The runner uses the application's actual label reader, accessory reader or observation extractor with its real component taxonomy.

The older gutter fixture above checks preservation of a dictated measurement, not the ability to read that measurement from a photo. For actual vision tests, do not put the expected measurement into the note. Free-form measurements, material judgments and product identification always return REVIEW_REQUIRED until compared with the photo; they do not pass based on a keyword. Label comparisons yield OCR_PASS only for the explicitly listed identifiers.

Run `bash tests/run-photo-accuracy.sh /absolute/path/to/private-manifest.json` for a hidden API-key prompt. The key stays in the process environment and is not written to disk. Keep the local site running on port 8000. Reports, including private model responses and image hashes, are written to a new protected temporary directory outside Git. Never commit the report, photos or private manifest. The runner makes one call per photo, does not save observations, and supports `--preflight` for file checks without API calls. A single run is a regression sample, not a statistical accuracy rate.
