#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import json
import subprocess
import webbrowser
import threading
import time

PORT = 8888
HOST = "127.0.0.1"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
SAMPLE_LOG = os.path.join(PROJECT_DIR, "access.log")

class SparkLogHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SCRIPT_DIR, **kwargs)

    def do_GET(self):
        if self.path == '/api/sample':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            if os.path.exists(SAMPLE_LOG):
                with open(SAMPLE_LOG, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"")
            return

        elif self.path == '/api/status':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            status = {
                "spark": "1.5.1",
                "java": "OpenJDK 1.8.0_504",
                "hadoop": "2.6.0 (winutils)",
                "status": "ready"
            }
            self.wfile.write(json.dumps(status).encode('utf-8'))
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/run-spark':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            params = json.loads(body.decode('utf-8')) if body else {}
            mode = params.get('mode', 'all')

            run_script = os.path.join(PROJECT_DIR, "run.ps1")
            cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-File", run_script, "-Mode", mode]

            try:
                proc = subprocess.run(
                    cmd,
                    cwd=PROJECT_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    timeout=120
                )
                output = proc.stdout
                success = proc.returncode == 0
            except Exception as e:
                output = f"Execution failed: {str(e)}"
                success = False

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            res = {
                "success": success,
                "output": output
            }
            self.wfile.write(json.dumps(res).encode('utf-8'))
            return

        self.send_error(404, "Endpoint not found")

def open_browser():
    time.sleep(1)
    webbrowser.open(f"http://127.0.0.1:{PORT}")

if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((HOST, PORT), SparkLogHandler) as httpd:
        print(f"===========================================================")
        print(f" Spark Log Analyzer Web UI Dashboard running at:")
        print(f" http://127.0.0.1:{PORT}")
        print(f"===========================================================")
        threading.Thread(target=open_browser, daemon=True).start()
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server...")
