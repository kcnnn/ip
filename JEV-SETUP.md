# Jev integration audit and setup

## Audit (APEX base `3059dc3`)

| Existing area | Functional behavior | Configuration / gap |
| --- | --- | --- |
| `jev-assistant.js` + `api/jev-next-step.js` | Photo-context/text → authenticated TypeSafe Choice → bounded next-step suggestion, tentative confidence display | Requires TypeSafe key and inspector access token. No browser actions or document retrieval. A stale “research not connected” suggestion has been corrected. |
| `jev-photo-context.js` | Existing photo AI extracts manufacturer/model/serial and limitations; clearly attributes the AI reading | Requires existing photo-provider setup. Reading is fallible and needs inspector confirmation. |
| `equipment-research.js` | Claude native web search, real citation validation, continuation handling, model relevance filtering, candidate selection | Requires Claude key and web-search availability. Existing provider configuration stores the photo/Claude key client-side; this change preserves that architecture and introduces no new browser-visible provider keys. |
| `inspection-field.js`, review and claim notes | Explicit acceptance, photo-revision association, persisted sources/timestamps, report/PDF/text integration | Reused by the new provider; no parallel approval or reporting system. |
| Browser automation | Previously absent: no Python worker, browser lifecycle, service auth, domain policy or browser-derived evidence verification | Added in this branch; requires separate Chrome/Python infrastructure and credentials. Fixture integration and real Chrome smoke tests do not replace credentialed release verification. |

Review of the official [Jev Agent implementation](https://github.com/browser-use/jev-ultrafast/blob/1231850a0bf1a0c0341fe408ef1668dbbfdfac46/jev_ultrafast/agent.py): synchronous context-managed `Agent(url, goal)` and `run()` generator; `done`/`blocked` states; no built-in equipment extractor, manufacturer allowlist or independent specification verifier. Its Browser Harness normally shares a Chrome profile. The new worker supplies disposable Chrome/Harness instances, a restrictive proxy, bounded runtime and independent page evidence checks. It does not run the upstream demo server.

See [worker/README.md](worker/README.md) for configuration, exact limits, deployment files, test commands and the outstanding live release check.


## Equipment research

Use **Identify & research equipment** in the field notebook. Select a label photo, check/correct the extracted manufacturer/model/serial, then select **Find manufacturer information**. This uses the existing Claude photo-analysis connection plus its native `web_search_20250305` tool (maximum four searches). No additional TypeSafe code is needed for this direct search path. Web search must be allowed in the Claude API organization; API failures are shown without fake fallback research.

Only manufacturer/model are sent in the research request. The photo stays in the vision request; the serial, property address and claim notes are not included in the research request. Responses without real search-result blocks and native citations cannot be accepted as findings. Partial responses also fail closed. Manufacturer-authored sources and explicit model/suffix matching are requested, but citations alone do not prove the match: findings remain candidates until the inspector opens sources and confirms the match. No equipment age is inferred from serials.

Choose the individual cited findings to include and confirm the model match, then **Add selected details to report**. Accepted research is saved separately from dictated notes and condition/damage fields, linked to the selected photo revision, and included in the inspection review/PDF and text-only claim notes with sources and timestamps. Nothing is automatically accepted. A new photo does not inherit another photo's accepted equipment research.

Provider keys retain the app's existing configuration. Claude web search remains the default. The equipment panel also offers **Jev browser** through a separately configured Python worker; see [worker setup and deployment](worker/README.md). The **Advanced · Jev next-step suggestion** remains a separate optional decision-support feature. The browser worker is implemented but not deployed. Permit research, carrier portals and code-compliance determination remain out of scope.

Verification: `tests/equipment-research.browser.cjs` covers synthetic label extraction, search payload, no serial in research, native citations, explicit acceptance, report and text output, reload preservation, no-source failure, URL validation and mobile width. These are mocked provider tests; live search availability and source quality require testing with the configured account after deployment.

Official web-search API: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool

Research now continues `pause_turn` responses with preserved assistant/tool state. A `max_tokens` response retries the current request once with a larger budget (8,000 → 16,000); truncated output is not accepted. Maximum four API requests per click, four searches per request, and a three-minute overall timeout. Continuations/retries may incur additional provider charges. Progress messages distinguish continuation from failure. Tests: `tests/research-continuation.browser.cjs`.

## Optional Jev decision support

The optional **Advanced · Jev next-step suggestion** panel first reads any selected photo with the configured photo AI, including readable manufacturer, model and serial fields. It shows that reading separately for checking against the photo, then sends the written reading, note, component and section to a server-side TypeSafe Choice request. The photo is sent to the photo AI, not TypeSafe. This advanced panel does not change findings or retrieve documentation; use the equipment workflow above for that. A valid photo-analysis API key is needed in addition to the Jev configuration below.

## Configure

In the Vercel project connected to this repository, add these environment variables for Production (and Preview only if needed):

- `TYPESAFE_API_KEY`: your TypeSafe API key, stored as a Secret.
- `APEX_JEV_ACCESS_TOKEN`: a separate random secret of at least 32 characters. Generate it with a password manager. Give this **access code**, not the TypeSafe key, to authorized inspectors.
- Optional `TYPESAFE_MODEL`: defaults to `jev-latest`.

Redeploy after saving. Open the deployed HTTPS site, expand Suggested next step, and enter the APEX access code. No key belongs in GitHub, HTML, screenshots or chat. The UI keeps the access code in memory only. Static `python -m http.server` preview cannot run Vercel functions; use the deployed site or `vercel dev` for integration testing.

## Security and limitations

The endpoint rejects calls without the access code and refuses to start without both secrets. It accepts only bounded inspection text and a fixed server-owned question; callers cannot choose URLs, prompts or tools. No external writes or browser actions are executed. Responses never include the provider key or raw upstream errors. Rotate the access code if shared unintentionally.

The access code is a minimal shared-team gate, not individual user authentication. Apply Vercel firewall rate limiting and TypeSafe spending controls before wider rollout. The built-in 10 requests/minute/IP throttle is per server instance and is not a deployment-wide quota. It does not replace authentication, spending controls or firewall rules.

Suggestions with choice probability or confidence below 0.7 are labeled tentative rather than silently replaced with a generic failure. These are initial product thresholds, not field-validated accuracy guarantees. An explicit uncertain choice asks for more context. Suggestions remain separate from observations; Jev failure never blocks the inspection workflow.

## Verification and next phase

Automated tests use mocked provider responses; a real credentialed test is still required after configuration. Check a missing-key response, unauthorized access, then an authorized photo request. The separate equipment workflow now handles cited retrieval and acceptance. The optional browser implementation and its separate service credentials are documented in [worker/README.md](worker/README.md). No browser automation infrastructure has been provisioned or live-qualified.

Official request schema: https://docs.typesafe.ai/introduction/quickstart.md
