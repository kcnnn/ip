import http.client
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from unittest.mock import patch

from jev_worker.policy import NoEvidence, findings_from_page, identity, public_addresses, safe_url
from jev_worker.proxy import Proxy
from jev_worker.server import WorkerServer
from jev_worker.task import retrieve

REQUEST = {"manufacturer": "Rheem", "model": "ABC-123", "confirmed": True}
POLICY = {"start_url": "https://www.rheem.com/", "hosts": ["www.rheem.com"], "source_hosts": ["www.rheem.com"]}
PAGE = {"url": "https://www.rheem.com/product", "title": "ABC-123 specifications", "text": "Model ABC-123", "rows": ["Capacity: 50 gallons", "Refrigerant: R-410A"]}


class FakeAgent:
    page = PAGE
    status = "done"
    closed = False

    def __init__(self, url, goal):
        assert url == POLICY["start_url"]
        assert '"model": "ABC-123"' in goal
        self.browser = self

    def __enter__(self):
        return self

    def __exit__(self, *_):
        type(self).closed = True

    def run(self):
        yield {"status": self.status}

    def evaluate(self, code):
        assert "location.href" in code
        return self.page


class WorkerTests(unittest.TestCase):
    def test_identity_and_evidence(self):
        self.assertEqual(identity(REQUEST), REQUEST)
        for request in [REQUEST | {"confirmed": False}, REQUEST | {"serial": "private"}, REQUEST | {"model": ""}]:
            with self.assertRaises(ValueError):
                identity(request)
        self.assertEqual(len(findings_from_page(PAGE, REQUEST, POLICY)), 2)
        for page in [PAGE | {"url": "http://127.0.0.1/spec"}, PAGE | {"url": "https://www.rheem.com.evil.test/"}, PAGE | {"text": "ABC-123A"}, PAGE | {"rows": []}]:
            with self.assertRaises(NoEvidence):
                findings_from_page(page, REQUEST, POLICY)
        self.assertFalse(safe_url("https://a:b@www.rheem.com/", POLICY["hosts"]))

    def test_done_is_not_proof_and_cleanup(self):
        FakeAgent.page = PAGE
        self.assertEqual(retrieve(REQUEST, POLICY, FakeAgent)["provider"], "Jev Ultrafast")
        FakeAgent.page = PAGE | {"text": "Other model"}
        FakeAgent.closed = False
        with self.assertRaises(NoEvidence):
            retrieve(REQUEST, POLICY, FakeAgent)
        self.assertTrue(FakeAgent.closed)
        FakeAgent.page = PAGE
        FakeAgent.status = "blocked"
        with self.assertRaises(ValueError):
            retrieve(REQUEST, POLICY, FakeAgent)
        FakeAgent.status = "done"

    def test_private_and_mixed_dns_rejected(self):
        for ips in [["127.0.0.1"], ["169.254.169.254"], ["::1"], ["93.184.216.34", "10.0.0.1"]]:
            with patch('socket.getaddrinfo', return_value=[(socket.AF_INET, socket.SOCK_STREAM, 6, '', (ip, 443)) for ip in ips]):
                with self.assertRaises(ValueError):
                    public_addresses("www.rheem.com")

    def test_proxy_rejects_unapproved_hosts_and_ports(self):
        proxy = Proxy(POLICY['hosts'])
        threading.Thread(target=proxy.serve_forever, daemon=True).start()
        try:
            for target in ['127.0.0.1:9222', 'www.rheem.com.evil.test:443', 'www.rheem.com:80']:
                connection = http.client.HTTPConnection('127.0.0.1', proxy.server_port)
                connection.request('CONNECT', target)
                self.assertEqual(connection.getresponse().status, 403)
                connection.close()
        finally:
            proxy.shutdown()
            proxy.server_close()

    def test_http_auth_payload_and_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'policies.json'
            path.write_text(json.dumps({'rheem': POLICY}))
            server = WorkerServer(('127.0.0.1', 0), 's' * 40, path, lambda request, policy: retrieve(request, policy, FakeAgent))
            threading.Thread(target=server.serve_forever, daemon=True).start()
            def call(body=REQUEST, token='s'*40):
                client = http.client.HTTPConnection('127.0.0.1', server.server_port)
                client.request('POST', '/v1/equipment', json.dumps(body), {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
                response = client.getresponse()
                data = json.load(response)
                client.close()
                return response.status, data
            try:
                self.assertEqual(call(token='wrong')[0], 401)
                self.assertEqual(call(REQUEST | {'goal': 'arbitrary'})[0], 400)
                server.job_lock.acquire()
                self.assertEqual(call()[0], 429)
                server.job_lock.release()
                status, data = call()
                self.assertEqual(status, 200)
                self.assertEqual(data['findings'][0]['sources'][0]['url'], PAGE['url'])
                self.assertEqual(call()[0], 429)
            finally:
                server.shutdown()
                server.server_close()


if __name__ == '__main__':
    unittest.main()
