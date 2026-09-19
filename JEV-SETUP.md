# TypeSafe Jev on Vercel — first integration

This release adds an optional **Suggested next step · TypeSafe Jev** panel to the field notebook. It sends only the current note, component, section and AI review text to a server-side TypeSafe Choice request. It does not upload the photo to TypeSafe, change findings, browse websites, identify equipment from labels, or retrieve manufacturer documentation. Those equipment-research stages remain future work; this is the decision-layer foundation, not a completed equipment intelligence feature.

## Configure

In the Vercel project connected to this repository, add these environment variables for Production (and Preview only if needed):

- `TYPESAFE_API_KEY`: your TypeSafe API key, stored as a Secret.
- `APEX_JEV_ACCESS_TOKEN`: a separate random secret of at least 32 characters. Generate it with a password manager. Give this **access code**, not the TypeSafe key, to authorized inspectors.
- Optional `TYPESAFE_MODEL`: defaults to `jev-latest`.

Redeploy after saving. Open the deployed HTTPS site, expand Suggested next step, and enter the APEX access code. No key belongs in GitHub, HTML, screenshots or chat. The UI keeps the access code in memory only. Static `python -m http.server` preview cannot run Vercel functions; use the deployed site or `vercel dev` for integration testing.

## Security and limitations

The endpoint rejects calls without the access code and refuses to start without both secrets. It accepts only bounded inspection text and a fixed server-owned question; callers cannot choose URLs, prompts or tools. No external writes or browser actions are executed. Responses never include the provider key or raw upstream errors. Rotate the access code if shared unintentionally.

The access code is a minimal shared-team gate, not individual user authentication. Apply Vercel firewall rate limiting and TypeSafe spending controls before wider rollout. The built-in 10 requests/minute/IP throttle is per server instance and is not a deployment-wide quota. It does not replace authentication, spending controls or firewall rules.

Suggestions require choice probability and confidence of at least 0.7, otherwise display uncertainty. These are initial product thresholds, not field-validated accuracy guarantees. Suggestions remain separate from observations; Jev failure never blocks the inspection workflow.

## Verification and next phase

Automated tests use mocked TypeSafe responses; a real credentialed test is still required after configuration. Check a missing-key response, unauthorized access, then an authorized note request. Equipment work next requires vision label extraction, a sourced retrieval service, match verification and explicit acceptance into the report. No browser automation service has been provisioned.

Official request schema: https://docs.typesafe.ai/introduction/quickstart.md
