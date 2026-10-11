"""Own all browser resources so timeout cleanup also kills Chrome and Harness."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from contextlib import contextmanager

from .proxy import Proxy


@contextmanager
def browser_runtime(policy):
    with tempfile.TemporaryDirectory(prefix="apex-jev-", dir="/tmp") as folder:
        root = Path(folder)
        proxy = Proxy(policy["hosts"])
        threading.Thread(target=proxy.serve_forever, daemon=True).start()
        chrome = daemon = None
        try:
            # Chrome receives no service or model credentials and never a personal profile.
            clean = {key: os.environ[key] for key in ("PATH", "HOME", "DISPLAY", "LANG", "TMPDIR") if key in os.environ}
            chrome = subprocess.Popen([
                os.environ["JEV_CHROME_PATH"], "--headless=new", "--enable-automation",
                f"--user-data-dir={root / 'chrome'}", "--remote-debugging-address=127.0.0.1",
                "--remote-debugging-port=0", "--no-first-run", "--disable-background-networking",
                "--disable-extensions", "--disable-sync", "--disable-quic",
                "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
                f"--proxy-server=http://127.0.0.1:{proxy.server_port}", "--proxy-bypass-list=<-loopback>",
                "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1", "about:blank",
            ], env=clean, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            port_file = root / "chrome" / "DevToolsActivePort"
            deadline = time.monotonic() + 15
            while not port_file.exists():
                if chrome.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError("Dedicated Chrome failed to start.")
                time.sleep(0.05)
            port = int(port_file.read_text().splitlines()[0])
            env = clean | {key: os.environ[key] for key in (
                "TYPESAFE_API_KEY", "TYPESAFE_MODEL", "TEXT_MODEL_API_KEY", "TEXT_MODEL_BASE_URL",
                "TEXT_MODEL", "TEXT_MODEL_REASONING") if key in os.environ}
            env.update(BU_CDP_URL=f"http://127.0.0.1:{port}", BU_NAME="apex", BH_HOME=str(root / "harness"),
                       BH_RUNTIME_DIR=str(root / "ipc"), BH_TMP_DIR=str(root / "tmp"), BH_TELEMETRY="0")
            # Start ourselves rather than let ensure_daemon detach an unowned process.
            daemon = subprocess.Popen([sys.executable, "-m", "browser_harness.daemon"], env=env,
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            socket_path = root / "ipc" / "bu.sock"
            deadline = time.monotonic() + 10
            while not socket_path.exists():
                if daemon.poll() is not None or time.monotonic() > deadline:
                    raise RuntimeError("Browser Harness failed to start.")
                time.sleep(0.05)
            yield env
        finally:
            for process in (daemon, chrome):
                if process and process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
            proxy.shutdown()
            proxy.server_close()


def run_job(request, policy):
    with browser_runtime(policy) as env:
        completed = subprocess.run([sys.executable, "-m", "jev_worker.task"], env=env,
                                   input=json.dumps({"request": request, "policy": policy}), text=True,
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=90)
        if completed.returncode:
            raise RuntimeError("No verifiable HTML specifications returned; use Claude research or inspect sources manually.")
        return json.loads(completed.stdout)
