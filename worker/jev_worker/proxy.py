"""Loopback-only HTTPS CONNECT proxy. Exact hosts, public pinned DNS addresses.

Chrome cannot use this proxy for HTTP, arbitrary hosts or internal addresses.
DNS is resolved once and the vetted IP is used for the actual socket connect.
"""
import select
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .policy import public_addresses


class Proxy(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, hosts):
        self.hosts = frozenset(hosts)
        super().__init__(("127.0.0.1", 0), Tunnel)


class Tunnel(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_CONNECT(self):
        host, separator, port = self.path.rpartition(":")
        if not separator or port != "443" or host not in self.server.hosts:
            self.send_error(403)
            return
        try:
            family, kind, protocol, _, address = public_addresses(host)[0]
            with socket.socket(family, kind, protocol) as upstream:
                upstream.settimeout(10)
                upstream.connect(address)
                self.send_response(200)
                self.end_headers()
                self.wfile.flush()
                sockets = (self.connection, upstream)
                while True:
                    ready, _, _ = select.select(sockets, [], [], 15)
                    if not ready:
                        return
                    for source in ready:
                        data = source.recv(65536)
                        if not data:
                            return
                        (upstream if source is self.connection else self.connection).sendall(data)
        except (OSError, ValueError):
            self.close_connection = True
