# TypeSafe Jev on Vercel — first integration

The optional **Suggested next step · TypeSafe Jev** panel first reads any selected photo with the configured photo AI, including readable manufacturer, model and serial fields. It shows that reading separately for checking against the photo, then sends the written reading, note, component and section to a server-side TypeSafe Choice request. The photo is sent to the photo AI, not TypeSafe. This does not change findings, browse websites or retrieve manufacturer documentation. A valid photo-analysis API key is needed in addition to the Jev configuration below.

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

Automated tests use mocked provider responses; a real credentialed test is still required after configuration. Check a missing-key response, unauthorized access, then an authorized photo request. Equipment work next requires a sourced retrieval service, match verification and explicit acceptance into the report. No browser automation service has been provisioned.

Official request schema: https://docs.typesafe.ai/introduction/quickstart.md
