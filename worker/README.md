# APEX Jev browser worker

Status: implemented on `codex/jev-browser-worker`; not deployed. The HTTP/UI integration is tested with fixture evidence. The official Agent API is tested against a real disposable Chrome with deterministic decisions. A credentialed manufacturer lookup remains a required release check; these tests do not establish live model reliability.

## Architecture and scope

`Equipment panel → POST /api/jev-equipment → HTTPS /v1/equipment → Python jev_ultrafast.Agent → dedicated Chrome → manufacturer documentation → quoted candidates → existing inspector approval → existing report`

Claude web search remains the default. The new method requires both manufacturer and exact model plus an explicit label confirmation. Only those identifiers and `confirmed: true` leave APEX. The existing photo AI still reads the label. Serial number, photos, notes, address and claim data never enter the browser worker request. No findings are saved until the inspector selects them and confirms the source/model match. Photo-revision checks and report generation are reused.

The official dependency is pinned to [Jev revision 1231850](https://github.com/browser-use/jev-ultrafast/tree/1231850a0bf1a0c0341fe408ef1668dbbfdfac46). `task.py` uses `with Agent(start_url, goal)` and iterates `agent.run()`. Jev navigates and searches the manufacturer's website. After `done`, a fixed read-only DOM expression reads the actual URL, visible text and specification rows. Independent checks require an approved source host, an exact model token (not a longer suffix), and numeric specification excerpts. No model-generated answer is treated as proof.

This MVP supports readable HTML paragraphs, lists, tables and definition lists on administrator-configured manufacturer sites. It intentionally has no generic search engine, arbitrary URL input, PDF parsing, CAPTCHA bypass, logins or document downloads. PDF-only pages, unsupported layouts, unknown brands, missing exact models, blocked navigation and timeouts yield no findings. A page can cover several models: excerpts explicitly remain candidates until the inspector verifies which row applies. This is provenance verification, not automated engineering validation. Use the existing Claude path or manual review for unsupported cases; switching providers is explicit and never incurs a silent second paid request.

## Local development

Requirements: macOS or Linux, Python 3.12+, Node 22+, Git, `uv`, and installed Chrome with its sandbox enabled. No Docker/root/`--no-sandbox` requirement. The worker is a long-running service, not a Vercel Python function.

From the repository:

```sh
cd worker
uv venv .venv --python 3.12
uv pip sync --python .venv/bin/python requirements.lock
cp manufacturers.example.json /tmp/apex-manufacturers.json
cp env.example /tmp/apex-jev-worker.env
chmod 600 /tmp/apex-jev-worker.env
```

Edit that env file with real TypeSafe and text-model keys, a random service secret, the absolute manufacturer configuration path and Chrome path. On macOS use `JEV_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'`. The text-model settings shown are the upstream defaults, not an endorsement or availability guarantee. Ensure both accounts have API access and billing. Generate each access secret independently using a password manager or `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`.

Load a trusted, shell-compatible env file and start from `worker/`:

```sh
set -a
. /tmp/apex-jev-worker.env
set +a
.venv/bin/python -m jev_worker.server
```

Start APEX with `vercel dev` from the repository root. Set these **server-only** environment variables for the Vercel function:

- `APEX_JEV_ACCESS_TOKEN`: the existing 32+ character inspector access code; kept in page memory only.
- `JEV_WORKER_TOKEN`: the different 32+ character service secret matching the Python worker. Never give this to inspectors.
- `JEV_WORKER_URL=http://127.0.0.1:8787/v1/equipment` for local development only. Production requires HTTPS.

Do not put populated env files in a directory served by `python -m http.server`; that server can expose dotfiles. `.vercelignore` excludes worker sources, tests and env files from the Vercel upload. No provider key, service token, CDP URL or browser control route is returned to the client. Static preview cannot execute the API function.

In the equipment panel, read a label, correct both identifiers, select **Jev browser**, enter the inspector access code and check the label confirmation. Search, open sources, select individual excerpts and confirm the match before adding to the report. Claude research and Advanced Jev suggestions remain independently usable.

## Manufacturer configuration

The JSON maps case-insensitive manufacturer names to a starting HTTPS page, exact allowed network hosts, and the subset allowed as cited source hosts. The Rheem entry is a seed, not a live-qualified compatibility claim. Add verified manufacturer aliases as separate keys. Add necessary static/CDN hosts to `hosts`, but only manufacturer-authored documentation hosts to `source_hosts`. Do not add wildcards, general search engines, user-content sites or broad hosting domains. A narrow allowlist may break some manufacturer pages; test and approve additions rather than expanding it automatically.

Every hostname must resolve exclusively to public IPs. The proxy revalidates DNS on each connection and connects to the exact validated address, rejecting loopback, private networks, metadata addresses and DNS rebinding to private IPs. Redirects to unapproved hosts cannot connect. The source URL is checked again after navigation. URLs/goals/host rules cannot be supplied by an inspector request.

## Limits, isolation and cancellation

One job per worker, minimum 30 seconds between starts, at most 24 Agent ticks, 90 seconds in the Agent subprocess, up to 25 seconds for Chrome/Harness startup, and short cleanup waits. The bridge aborts after 125 seconds; Vercel is configured for 150 seconds. UI cancellation discards the result immediately; it does not stop an already running remote job, which finishes or expires within its budget. Do not retry automatically. A second job receives 429 while the first owns the lock.

Each request launches its own headless Chrome, empty temporary profile, loopback-only ephemeral debugging port, private Browser Harness socket and loopback HTTPS proxy. Chrome gets no model/service credentials. All browser HTTP(S) traffic is forced through the exact-host proxy, with loopback bypass, QUIC and non-proxied WebRTC disabled. Chrome/Harness are terminated and temporary state removed on success, failure or Agent timeout. Source text/URLs go to the model providers during navigation; no raw model traces or screenshots are retained.

The proxy is a network destination boundary, not a semantic read-only guarantee: an allowed website can contain forms or scripts. The goal forbids external writes, and the browser has no account sessions. Deploy only on a dedicated unprivileged host/container with no personal browser, mounted inspection data or unrelated credentials. Retain Chrome's sandbox; apply host egress restrictions and resource limits as defense in depth. Never expose CDP, Browser Harness or the upstream Jev demo port. Loopback access assumes other processes on that host are trusted.

## Deployment infrastructure (not provisioned)

1. Provision a dedicated Linux VM/container host with Python 3.12, Chrome and enough RAM (start at 2 GB, measure under load). Install the lockfile. The host must support Chrome's sandbox/user namespaces. Use an unprivileged service user, e.g. `apex-jev`.
2. Place worker code at `/opt/apex/worker`, install its `.venv`, and keep mode-600 credentials and the manufacturer JSON under `/etc/apex`. The credentials must be readable by the service user, not by the web server or Chrome.
3. Adapt `deploy/apex-jev.service`. Its systemd control group also cleans descendants on service stop. Configure restart/health monitoring, memory limits, provider spending caps and secret rotation. Linux service packaging is supplied but has not been exercised on a provisioned Linux host.
4. Put `deploy/nginx.conf.example` behind a valid TLS certificate and firewall. Expose only `/v1/equipment`; it always requires the service bearer token. Prefer private connectivity to APEX when available; otherwise restrict ingress to trusted application egress where practical. Keep 8787 and all ephemeral browser/proxy/debug ports inaccessible from outside the host. The Python standard-library HTTP server is intended behind this gateway, not as an Internet-facing server.
5. Set Vercel's three bridge env vars, using the HTTPS worker URL. Verify the project's function duration supports 150 seconds and gateway timeouts exceed 125 seconds. If the hosting plan cannot support this, do not deploy the synchronous route; an authenticated persistent job queue/polling API would be additional scope.
6. Apply gateway/Vercel request-rate limits. Existing shared inspector access is a minimal team gate, not individual identity, authorization by inspection record or an audit trail. Wider rollout needs per-user auth and deployment-wide quotas. Multiple workers need a shared quota/queue; this MVP deliberately has no autoscaling or durable job storage.
7. Run the release check below on a preview environment before considering production. No deployment has been performed by this change.

## Tests and release check

Use the worker virtual environment and Node 22+. Install only the isolated test package; the root lockfile predates this change and describes an unrelated project.

```sh
npm ci --prefix tests
npm run test:jev --prefix tests
PYTHONPATH=worker worker/.venv/bin/python -m unittest discover -s worker/tests -v
JEV_TEST_PYTHON="$PWD/worker/.venv/bin/python" npm run test:jev-browser --prefix tests
cd worker
PYTHONPATH=. .venv/bin/python tests/browser_smoke.py
```

The browser smoke uses the macOS Chrome path by default; set `JEV_CHROME_PATH` on Linux. It makes no model calls. The HTTP/UI test uses the real bridge, Python server and extraction validator, but a fixture Agent. It tests that credentials remain private, serials stay out of requests, no automatic save occurs, approval is required, identity edits invalidate results, and accepted excerpts/sources survive review and reload.

Existing regressions can be run with a static server on port 8000 (or set `APEX_TEST_URL` to a different loopback origin), then `node tests/equipment-research.browser.cjs`, `node tests/research-continuation.browser.cjs` and `node tests/jev-panel.browser.cjs` (each mocks its provider requests).

**Live release check, still required:** configure both provider accounts; use a real confirmed manufacturer/model with known HTML documentation; run the complete APEX UI path; independently open every returned source and check the quoted specifications and suffix; approve one excerpt and inspect the review/PDF and claim notes; repeat with a nonexistent model and verify no findings. Verify unauthorized calls fail, the service/debug ports are unreachable externally, and a timeout releases the worker for the next job. Record date, model, source URLs, outcome and elapsed time without secrets. Manufacturer coverage, provider reliability and production networking remain unverified until this passes.

## Verification recorded for this branch

Passed locally on macOS with Python 3.12.4, Node 23.4.0 and installed Chrome:

- Two Node test suites: existing suggestion API and new authenticated bridge (including malformed evidence, oversized upstream response and hidden errors).
- Five Python worker tests: strict identity, source/model evidence, non-public DNS rejection, proxy host/port rejection, HTTP authentication and concurrency limits.
- Complete fixture HTTP/UI workflow through the real bridge and Python server, explicit approval, report links and reload.
- Official Agent with actual Chrome, deterministic decisions, real DOM click/read, loopback navigation rejection, normal cleanup and timeout cleanup.
- Existing Claude equipment research, research continuation and optional Jev panel browser regression suites.

Not run: paid TypeSafe/text-model calls, a real manufacturer search, a provisioned Linux/systemd/nginx deployment, or production ingress/firewall checks. No deployment or remote branch push was performed.
