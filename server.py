import http.server
import socketserver
import json
import os
import urllib.parse

PORT = 3000
ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, 'data')
PROFILES_FILE = os.path.join(DATA_DIR, 'player-profiles.json')

os.makedirs(DATA_DIR, exist_ok=True)
if not os.path.exists(PROFILES_FILE):
    with open(PROFILES_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f)

class TrackerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/profiles/'):
            player_id = urllib.parse.unquote(parsed.path[len('/api/profiles/'):])
            try:
                with open(PROFILES_FILE, 'r', encoding='utf-8') as f:
                    profiles = json.load(f)
                if player_id in profiles:
                    self.send_json(200, profiles[player_id])
                else:
                    self.send_json(404, {"error": "Player profile not found."})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return
        super().do_GET()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/profiles':
            length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(length)
            try:
                data = json.loads(body_bytes.decode('utf-8'))
                player_id = data.get('playerId', '').strip()
                if not player_id:
                    self.send_json(400, {"error": "Invalid player ID."})
                    return
                with open(PROFILES_FILE, 'r', encoding='utf-8') as f:
                    profiles = json.load(f)
                profiles[player_id] = data
                with open(PROFILES_FILE, 'w', encoding='utf-8') as f:
                    json.dump(profiles, f, indent=2)
                self.send_json(200, data)
            except Exception as e:
                self.send_json(400, {"error": str(e)})
            return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/chat':
            length = int(self.headers.get('Content-Length', 0))
            body_bytes = self.rfile.read(length)
            try:
                data = json.loads(body_bytes.decode('utf-8'))
                messages = data.get('messages', [])
                last_msg = messages[-1]['content'] if messages else 'Hello'
                reply = f"🎮 **GD Assistant:** I received your message: '{last_msg}'! Keep grinding and slaying those demons! 🚀"
                self.send_json(200, {"reply": reply})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
            return
        self.send_json(404, {"error": "Not found"})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

if __name__ == '__main__':
    with socketserver.TCPServer(('0.0.0.0', PORT), TrackerHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        httpd.serve_forever()
