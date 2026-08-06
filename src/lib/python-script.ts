export const PYTHON_SCRIPT = `import sys
import os
import time
import base64
import argparse
try:
    import cv2
    from pyzbar.pyzbar import decode
    import qrcode
except ImportError:
    print("Missing dependencies. Please install: pip install qrcode opencv-python pyzbar")
    sys.exit(1)

CHUNK_SIZE = 500

def send(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return

    filename = os.path.basename(filepath)
    filename_b64 = base64.b64encode(filename.encode('utf-8')).decode('utf-8')
    
    with open(filepath, "rb") as f:
        data = f.read()

    b64_data = base64.b64encode(data).decode('utf-8')
    total_chunks = (len(b64_data) // CHUNK_SIZE) + (1 if len(b64_data) % CHUNK_SIZE != 0 else 0)

    chunks = []
    for i in range(total_chunks):
        chunk_data = b64_data[i*CHUNK_SIZE : (i+1)*CHUNK_SIZE]
        payload = f"QRF|{filename_b64}|{i}|{total_chunks}|{chunk_data}"
        chunks.append(payload)

    print(f"Prepared {total_chunks} chunks for {filename}.")
    print("Starting transmission in terminal. Press Ctrl+C to stop.")

    try:
        while True:
            for i, payload in enumerate(chunks):
                os.system('cls' if os.name == 'nt' else 'clear')
                print(f"Transmitting chunk {i+1}/{total_chunks}")
                qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=1, border=4)
                qr.add_data(payload)
                qr.make(fit=True)
                qr.print_tty()
                time.sleep(0.15) # ~6.6 fps
    except KeyboardInterrupt:
        print("\nTransmission stopped.")

def receive():
    cap = cv2.VideoCapture(0)
    print("Starting camera. Press 'q' to quit.")
    
    received_chunks = {}
    total_expected = None
    filename = "received_file"

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        decoded_objects = decode(frame)
        for obj in decoded_objects:
            text = obj.data.decode('utf-8')
            if text.startswith("QRF|"):
                parts = text.split("|", 4)
                if len(parts) == 5:
                    _, fname_b64, idx_str, total_str, data = parts
                    idx = int(idx_str)
                    total = int(total_str)
                    
                    if total_expected is None:
                        total_expected = total
                        try:
                            filename = base64.b64decode(fname_b64).decode('utf-8')
                        except:
                            pass
                        print(f"Receiving {filename} ({total_expected} chunks)")

                    if idx not in received_chunks:
                        received_chunks[idx] = data
                        progress = len(received_chunks) / total_expected * 100
                        print(f"Received chunk {idx+1}/{total_expected} ({progress:.1f}%)")

        if total_expected:
            progress_text = f"Progress: {len(received_chunks)}/{total_expected}"
            cv2.putText(frame, progress_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow("QRFerry Receiver", frame)

        if total_expected and len(received_chunks) == total_expected:
            print("\nAll chunks received! Reconstructing...")
            break

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    if total_expected and len(received_chunks) == total_expected:
        full_b64 = "".join(received_chunks[i] for i in range(total_expected))
        file_data = base64.b64decode(full_b64)
        with open(filename, "wb") as f:
            f.write(file_data)
        print(f"File saved successfully as {filename}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QRFerry - File transfer via animated QR codes")
    parser.add_argument("mode", choices=["send", "receive"], help="Mode of operation")
    parser.add_argument("-f", "--file", help="File to send (required for send mode)")
    
    args = parser.parse_args()
    
    if args.mode == "send":
        if not args.file:
            print("Error: --file argument is required for send mode.")
            sys.exit(1)
        send(args.file)
    elif args.mode == "receive":
        receive()
`;
