# QRFerry ⛴️ 📱

**Offline optical file transfer tool using animated QR codes.**

QRFerry allows you to transfer files across physically isolated devices (air-gapped environments) without requiring Wi-Fi, Bluetooth, or any network connection. It encodes files into a stream of animated QR codes using Fountain Codes (RaptorQ), allowing the receiver to reconstruct the file flawlessly even if some frames are missed.

## Features

- **100% Offline**: Zero network calls, no Bluetooth, no local network.
- **Robust Transfer**: Uses RaptorQ forward error correction. You don't need to capture every frame—just ~110% of the total chunks!
- **Cross-Platform Receiver**: Receive files using the CLI tool or a built-in Flask web receiver.
- **GIF Generation**: Export your file as a QR code GIF for easy sharing or playback.

## Installation

```bash
git clone https://github.com/yourusername/qrferry.git
cd qrferry
pip install .
```

*Note: Requires Python 3.9+ due to `pyraptorq` compatibility.*

## Usage

### 1. Send a File (Terminal)

Splits a file into QR codes and plays them in your terminal.

```bash
qrferry send -f secret_document.pdf
```

### 2. Send a File (Export to GIF)

Generates an animated GIF containing the QR stream.

```bash
qrferry send -f secret_document.pdf --gif
```

### 3. Receive a File (CLI)

Uses your webcam to scan the animated QR code from the sender's screen.

```bash
qrferry receive
```

### 4. Receive a File (Web UI)

Starts a local web server (on port 5000) that you can open on your smartphone or another device to receive the file via its browser camera.

```bash
qrferry web-receive
```

## License

MIT License
