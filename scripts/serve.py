#!/usr/bin/env python3
"""Serve docs/ locally for preview: python3 scripts/serve.py [port]"""
import os, sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
docs = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs")
os.chdir(docs)
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
    def log_message(self, *a): pass
print("serving", docs, "on", port, flush=True)
ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
