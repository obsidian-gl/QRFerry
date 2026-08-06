import sys
import os
import time
import base64
import argparse
import random
import threading
import json

try:
    import cv2
    from pyzbar.pyzbar import decode
    import qrcode
    from pyraptorq import Encoder, Decoder
    from tqdm import tqdm
    from flask import Flask, request, jsonify, render_template_string
except ImportError:
    print("Missing dependencies. Please install: pip install qrcode[pil] opencv-python pyzbar pyraptorq tqdm flask")
    sys.exit(1)

# Protocol prefix
PREFIX = "QRF2|"
CHUNK_SIZE = 500

def get_payload(filename_b64, data_size, symbol_size, symbol_count, chunk_id, chunk_data):
    chunk_b64 = base64.b64encode(chunk_data).decode('utf-8')
    return f"{PREFIX}{filename_b64}|{data_size}|{symbol_size}|{symbol_count}|{chunk_id}|{chunk_b64}"

def parse_payload(text):
    if not text.startswith(PREFIX):
        return None
    parts = text.split("|")
    if len(parts) != 7:
        return None
    try:
        _, fname_b64, data_size, symbol_size, symbol_count, chunk_id, chunk_b64 = parts
        return {
            "filename": base64.b64decode(fname_b64).decode('utf-8'),
            "data_size": int(data_size),
            "symbol_size": int(symbol_size),
            "symbol_count": int(symbol_count),
            "chunk_id": int(chunk_id),
            "chunk_data": base64.b64decode(chunk_b64)
        }
    except Exception:
        return None

def send(filepath, save_gif=False):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return

    filename = os.path.basename(filepath)
    filename_b64 = base64.b64encode(filename.encode('utf-8')).decode('utf-8')
    
    with open(filepath, "rb") as f:
        data = f.read()

    data_size = len(data)
    symbol_size = CHUNK_SIZE
    symbol_count = (data_size + symbol_size - 1) // symbol_size

    print(f"Encoding {filename} ({data_size} bytes) into {symbol_count} base symbols...")
    encoder = Encoder(data, symbol_size)

    # Pre-generate some symbols for the loop (e.g., 3x the symbol_count for good LT coverage)
    total_to_generate = symbol_count * 3
    
    images = []
    payloads = []
    
    print("Generating fountain code chunks...")
    for i in tqdm(range(total_to_generate)):
        sym_data = encoder.gen_symbol(i)
        payload = get_payload(filename_b64, data_size, symbol_size, symbol_count, i, sym_data)
        payloads.append(payload)
        
        if save_gif:
            qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=4, border=4)
            qr.add_data(payload)
            qr.make(fit=True)
            images.append(qr.make_image(fill_color="black", back_color="white"))

    if save_gif:
        gif_name = f"{filename}.gif"
        print(f"Saving to {gif_name}...")
        images[0].save(gif_name, save_all=True, append_images=images[1:], duration=150, loop=0)
        print("Done!")
        return

    print("Starting terminal transmission. Press Ctrl+C to stop.")
    try:
        while True:
            for i, payload in enumerate(payloads):
                os.system('cls' if os.name == 'nt' else 'clear')
                print(f"Transmitting chunk {i+1}/{total_to_generate} (Fountain Code)")
                qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=1, border=4)
                qr.add_data(payload)
                qr.make(fit=True)
                qr.print_tty()
                time.sleep(0.15)
    except KeyboardInterrupt:
        print("\\nTransmission stopped.")

class ReceiverState:
    def __init__(self):
        self.decoder = None
        self.filename = "received_file"
        self.received_ids = set()
        self.symbol_count = 0
        self.done = False
        self.file_data = b""

    def process_chunk(self, parsed):
        if self.done:
            return True
            
        if self.decoder is None:
            self.filename = parsed['filename']
            self.symbol_count = parsed['symbol_count']
            self.decoder = Decoder(self.symbol_count, parsed['symbol_size'], parsed['data_size'])
            print(f"\\nReceiving {self.filename} ({self.symbol_count} base symbols needed)")

        cid = parsed['chunk_id']
        if cid not in self.received_ids:
            self.decoder.add_symbol(cid, parsed['chunk_data'])
            self.received_ids.add(cid)
            
            if self.decoder.may_try_decode():
                res = self.decoder.try_decode()
                if res is not None:
                    self.file_data = res
                    self.done = True
                    return True
        return self.done

def receive_cli():
    cap = cv2.VideoCapture(0)
    print("Starting camera. Press 'q' to quit.")
    
    state = ReceiverState()
    pbar = None

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        decoded_objects = decode(frame)
        for obj in decoded_objects:
            text = obj.data.decode('utf-8')
            parsed = parse_payload(text)
            if parsed:
                if state.decoder is None:
                    pbar = tqdm(total=parsed['symbol_count'], desc="Decoding")
                
                prev_len = len(state.received_ids)
                done = state.process_chunk(parsed)
                curr_len = len(state.received_ids)
                
                if pbar and curr_len > prev_len:
                    if pbar.n < pbar.total:
                        pbar.update(1)
                
                if done:
                    break

        if state.symbol_count:
            progress_text = f"Chunks: {len(state.received_ids)} / ~{state.symbol_count}"
            cv2.putText(frame, progress_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow("QRFerry Receiver", frame)

        if state.done:
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    if pbar:
        pbar.close()

    if state.done:
        with open(state.filename, "wb") as f:
            f.write(state.file_data)
        print(f"\\nFile saved successfully as {state.filename}")
    else:
        print("\\nReception incomplete.")

# --- Flask Receiver ---
flask_app = Flask(__name__)
flask_state = ReceiverState()

HTML_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>QRFerry Web Receiver</title>
    <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
    <style>
        body { font-family: system-ui; text-align: center; background: #f0f0f0; margin: 0; padding: 2rem; }
        video { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        #status { margin: 1rem 0; font-size: 1.2rem; font-weight: bold; }
        progress { width: 100%; max-width: 400px; height: 20px; }
    </style>
</head>
<body>
    <h1>QRFerry Receiver</h1>
    <video id="video" playsinline autoplay></video>
    <canvas id="canvas" hidden></canvas>
    <div id="status">Waiting for QR codes...</div>
    <progress id="progress" value="0" max="100"></progress>
    <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const statusEl = document.getElementById('status');
        const progressEl = document.getElementById('progress');
        
        let lastScanned = null;
        let isDone = false;

        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => { video.srcObject = stream; requestAnimationFrame(tick); });

        function tick() {
            if (isDone) return;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                canvas.height = video.videoHeight;
                canvas.width = video.videoWidth;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "dontInvert" });
                
                if (code && code.data.startsWith("QRF2|") && code.data !== lastScanned) {
                    lastScanned = code.data;
                    fetch('/chunk', {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain' },
                        body: code.data
                    }).then(res => res.json()).then(data => {
                        if (data.symbol_count) {
                            progressEl.max = data.symbol_count;
                            progressEl.value = Math.min(data.received, data.symbol_count);
                            statusEl.innerText = \`Received \${data.received} / ~\${data.symbol_count} chunks\`;
                        }
                        if (data.done) {
                            isDone = true;
                            statusEl.innerText = "Complete! Downloading...";
                            window.location.href = '/download';
                        }
                    });
                }
            }
            requestAnimationFrame(tick);
        }
    </script>
</body>
</html>
"""

@flask_app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@flask_app.route('/chunk', methods=['POST'])
def receive_chunk():
    text = request.data.decode('utf-8')
    parsed = parse_payload(text)
    if not parsed:
        return jsonify({"error": "Invalid payload"}), 400
    
    flask_state.process_chunk(parsed)
    return jsonify({
        "received": len(flask_state.received_ids),
        "symbol_count": flask_state.symbol_count,
        "done": flask_state.done
    })

@flask_app.route('/download')
def download_file():
    if not flask_state.done:
        return "Not finished", 400
    from flask import send_file
    import io
    return send_file(
        io.BytesIO(flask_state.file_data),
        download_name=flask_state.filename,
        as_attachment=True
    )

def run_flask():
    print("Starting Flask web receiver on http://0.0.0.0:5000")
    flask_app.run(host='0.0.0.0', port=5000)

def main():
    parser = argparse.ArgumentParser(description="QRFerry - File transfer via animated QR codes (Fountain/RaptorQ)")
    parser.add_argument("mode", choices=["send", "receive", "web-receive"], help="Mode of operation")
    parser.add_argument("-f", "--file", help="File to send (required for send mode)")
    parser.add_argument("--gif", action="store_true", help="Save as GIF instead of terminal output")
    
    args = parser.parse_args()
    
    if args.mode == "send":
        if not args.file:
            print("Error: --file argument is required for send mode.")
            sys.exit(1)
        send(args.file, args.gif)
    elif args.mode == "receive":
        receive_cli()
    elif args.mode == "web-receive":
        run_flask()

if __name__ == "__main__":
    main()
