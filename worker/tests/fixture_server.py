"""Test-only HTTP worker using fixture Agent pages. Never used by production."""
import json
from pathlib import Path
import tempfile

from jev_worker.server import WorkerServer
from jev_worker.task import retrieve
from test_worker import FakeAgent, POLICY

with tempfile.TemporaryDirectory() as directory:
    path = Path(directory) / 'policies.json'
    path.write_text(json.dumps({'rheem': POLICY}))
    server = WorkerServer(('127.0.0.1', 0), 'fixture-service-' + 's' * 32, path,
                          lambda request, policy: retrieve(request, policy, FakeAgent))
    print(server.server_port, flush=True)
    server.serve_forever()
