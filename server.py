import http.server
import socketserver
import urllib.request
import urllib.parse
import os
import sys
import json

PORT = 8000
DIRECTORY = "public"

def get_saved_api_key():
    env_key = os.environ.get('OPENAI_API_KEY', '')
    if env_key:
        return env_key.strip()
    possible_files = ['.env', 'key.txt', 'api_key.txt', 'secret.txt', 'openai_key.txt']
    for fname in possible_files:
        if os.path.exists(fname):
            try:
                with open(fname, 'r', encoding='utf-8') as f:
                    for line in f:
                        s = line.strip()
                        if s.startswith('OPENAI_API_KEY='):
                            return s.split('=', 1)[1].strip('"\' ')
                        elif s.startswith('sk-'):
                            return s
            except Exception:
                pass
    return ''

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # In Python 3.7+, SimpleHTTPRequestHandler accepts directory argument
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS headers for development/canvas capture
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == '/api/tts':
            query = urllib.parse.parse_qs(parsed_url.query)
            text = query.get('text', [''])[0]
            voice = query.get('voice', ['alloy'])[0]
            api_key = query.get('key', [''])[0] or get_saved_api_key()
            
            if text:
                try:
                    audio_data = None
                    if api_key:
                        try:
                            # OpenAI TTS API Call
                            url = "https://api.openai.com/v1/audio/speech"
                            data = json.dumps({
                                "model": "tts-1",
                                "input": text,
                                "voice": voice
                            }).encode('utf-8')
                            
                            req = urllib.request.Request(
                                url,
                                data=data,
                                headers={
                                    'Authorization': f'Bearer {api_key}',
                                    'Content-Type': 'application/json'
                                },
                                method='POST'
                            )
                            with urllib.request.urlopen(req) as response:
                                audio_data = response.read()
                        except Exception as oai_err:
                            sys.stderr.write(f"OpenAI TTS error: {oai_err}, falling back to Google TTS\n")
                            audio_data = None
                    
                    if not audio_data:
                        # Fallback: Google Translate TTS URL
                        url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q={urllib.parse.quote(text)}"
                        req = urllib.request.Request(
                            url,
                            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
                        )
                        with urllib.request.urlopen(req) as response:
                            audio_data = response.read()
                        
                    self.send_response(200)
                    self.send_header('Content-Type', 'audio/mpeg')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(audio_data)
                except Exception as e:
                    self.send_response(500)
                    self.end_headers()
                    self.wfile.write(f"Error fetching TTS: {str(e)}".encode('utf-8'))
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Missing 'text' parameter")
        else:
            # Handle default routing
            cleaned_path = parsed_url.path.strip("/")
            if not cleaned_path or cleaned_path == "":
                self.path = "/index.html"
            
            # If requesting a file, verify it exists under public
            target_file = os.path.join(DIRECTORY, self.path.lstrip("/"))
            if not os.path.exists(target_file) and not os.path.isdir(target_file):
                # Fallback to index.html for SPA if not found, but since it's simple, standard 404 is fine.
                pass
            super().do_GET()

if __name__ == "__main__":
    # Ensure public directory exists
    if not os.path.exists(DIRECTORY):
        os.makedirs(DIRECTORY)

    # Clean up standard handler messages to avoid cluttering
    # Set server to run
    handler = CustomHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"==================================================")
        print(f"  GBAN Shorts Creator Server is running!")
        print(f"  Open your browser: http://localhost:{PORT}")
        print(f"  Press Ctrl+C to stop the server.")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping server...")
            sys.exit(0)
