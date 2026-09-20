# Equipment research and optional TypeSafe Jev

## Equipment research

Use **Identify & research equipment** in the field notebook. Select a label photo, check/correct the extracted manufacturer/model/serial, then select **Find manufacturer information**. This uses the existing Claude photo-analysis connection plus its native `web_search_20250305` tool (maximum four searches). No additional TypeSafe code is needed for this direct search path. Web search must be allowed in the Claude API organization; API failures are shown without fake fallback research.

Only manufacturer/model are sent in the research request. The photo stays in the vision request; the serial, property address and claim notes are not included in the research request. Responses without real search-result blocks and native citations cannot be accepted as findings. Partial responses also fail closed. Manufacturer-authored sources and explicit model/suffix matching are requested, but citations alone do not prove the match: findings remain candidates until the inspector opens sources and confirms the match. No equipment age is inferred from serials.

Choose the individual cited findings to include and confirm the model match, then **Add selected details to report**. Accepted research is saved separately from dictated notes and condition/damage fields, linked to the selected photo revision, and included in the inspection review/PDF and text-only claim notes with sources and timestamps. Nothing is automatically accepted. A new photo does not inherit another photo's accepted equipment research.

Provider keys retain the app's existing configuration. Research uses Claude's web search directly, not a Jev browser worker; Jev is optional under **Advanced · Jev next-step suggestion**. No browser worker, permit research, carrier portal integration, or code-compliance determination is deployed.

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

Automated tests use mocked provider responses; a real credentialed test is still required after configuration. Check a missing-key response, unauthorized access, then an authorized photo request. The separate equipment workflow now handles cited retrieval and acceptance. No browser automation service has been provisioned.

Official request schema: https://docs.typesafe.ai/introduction/quickstart.md
