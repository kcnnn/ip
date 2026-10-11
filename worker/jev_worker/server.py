"""Private synchronous worker: single job, bounded input/time, no browser routes."""
import hmac
import json
import os
from pathlib import Path
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .policy import identity, load_policy
from .runtime import run_job


class WorkerServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, token, policy_path, runner=run_job):
        if len(token) < 32:
            raise ValueError("JEV_WORKER_TOKEN must contain at least 32 characters.")
        self.token, self.policy_path, self.runner = token, policy_path, runner
        self.job_lock = threading.Lock()
        self.last_started = 0
        super().__init__(address, Handler)


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(5)

    def log_message(self, *_):
        pass

    def send_json(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/v1/equipment":
            return self.send_json(404, {"error": "Not found."})
        actual = self.headers.get("Authorization", "").encode()
        if not hmac.compare_digest(actual, ("Bearer " + self.server.token).encode()):
            return self.send_json(401, {"error": "Unauthorized."})
        if self.headers.get_content_type() != "application/json":
            return self.send_json(415, {"error": "Send JSON."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if self.headers.get("Transfer-Encoding") or not 0 < size <= 2048:
                raise ValueError("Invalid request size.")
            request = identity(json.loads(self.rfile.read(size)))
        except (ValueError, OSError):
            return self.send_json(400, {"error": "Supply a confirmed manufacturer and model only."})
        if not self.server.job_lock.acquire(blocking=False):
            return self.send_json(429, {"error": "Worker busy; retry later."})
        try:
            if time.monotonic() - self.server.last_started < 30:
                return self.send_json(429, {"error": "Wait before starting another browser session."})
            self.server.last_started = time.monotonic()
            try:
                policy = load_policy(self.server.policy_path, request["manufacturer"])
            except (ValueError, OSError):
                return self.send_json(422, {"error": "Manufacturer browser policy unavailable; use Claude research."})
            result = self.server.runner(request, policy)
            return self.send_json(200, result)
        except Exception:
            return self.send_json(502, {"error": "Browser research failed or timed out. No findings saved; use Claude research."})
        finally:
            self.server.job_lock.release()


def main():
    for key in ("TYPESAFE_API_KEY", "TEXT_MODEL_API_KEY", "TEXT_MODEL", "TEXT_MODEL_BASE_URL", "JEV_CHROME_PATH", "JEV_MANUFACTURERS_FILE"):
        if not os.environ.get(key):
            raise SystemExit(f"Missing {key}")
    server = WorkerServer(("127.0.0.1", int(os.environ.get("JEV_WORKER_PORT", "8787"))),
                          os.environ.get("JEV_WORKER_TOKEN", ""), Path(os.environ["JEV_MANUFACTURERS_FILE"]))
    print("APEX Jev worker listening on loopback only.", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
