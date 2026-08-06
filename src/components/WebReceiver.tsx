import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Camera, Download, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { createDecoder, binaryToBlock, LtDecoder } from 'luby-transform';

function base64ToUint8(b64: string) {
  const str = atob(b64);
  const u8 = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    u8[i] = str.charCodeAt(i);
  }
  return u8;
}

export function WebReceiver() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const decoderRef = useRef<LtDecoder | null>(null);
  const seenBlocksRef = useRef<Set<number>>(new Set());
  
  const [fileMeta, setFileMeta] = useState<{ name: string, total: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const scanLoopRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      setIsScanning(true);
    } catch (err: any) {
      console.warn("Camera error:", err);
      setError("Camera permission denied. If you are viewing this in a preview iframe, please open the application in a new tab, or ensure you have granted camera access.");
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    scanLoopRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isScanning && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error(e));
      if (!scanLoopRef.current) {
        scanLoopRef.current = requestAnimationFrame(scanTick);
      }
    }
  }, [isScanning]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const processQRCode = (data: string) => {
    if (!data.startsWith('LT1|')) return;
    
    const parts = data.split('|');
    if (parts.length < 3) return;
    
    const [prefix, filenameB64, payloadB64] = parts;
    
    let filename = 'received_file';
    try {
      filename = atob(filenameB64);
    } catch (e) {
      // ignore
    }

    try {
      const bin = base64ToUint8(payloadB64);
      const block = binaryToBlock(bin);
      
      // Initialize decoder if this is the first block
      if (!decoderRef.current) {
        decoderRef.current = createDecoder();
        setFileMeta({ name: filename, total: block.k });
      }

      decoderRef.current.addBlock(block);
      
      // Calculate progress
      const k = block.k;
      const decodedCount = decoderRef.current.decodedCount;
      const encodedCount = decoderRef.current.encodedCount;
      
      setProgress((decodedCount / k) * 100);

      // Try to get decoded data
      const decodedData = decoderRef.current.getDecoded();
      if (decodedData) {
        reconstructFile(decodedData, filename);
      }
    } catch (err) {
      console.warn("Error processing block:", err);
    }
  };

  const reconstructFile = (data: Uint8Array, filename: string) => {
    stopCamera();
    try {
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err) {
      console.error("Reconstruction failed", err);
      setError("File reconstruction failed. The data might be corrupted.");
    }
  };

  const scanTick = () => {
    if (!isScanning) return;
    
    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code) {
          processQRCode(code.data);
        }
      }
    }
    
    scanLoopRef.current = requestAnimationFrame(scanTick);
  };

  const reset = () => {
    decoderRef.current = null;
    seenBlocksRef.current.clear();
    setFileMeta(null);
    setProgress(0);
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 p-6">
      {error && (
        <div className="w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!downloadUrl ? (
        <div className="w-full flex flex-col items-center space-y-6">
          <div className="relative w-full max-w-md aspect-[4/3] bg-neutral-900 rounded-xl overflow-hidden shadow-sm border border-neutral-200 dark:border-neutral-800">
            {isScanning ? (
              <>
                <video ref={videoRef} playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 m-8 rounded-lg" />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-500">
                <Camera className="w-12 h-12 opacity-50" />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="w-full max-w-md">
            {fileMeta ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">Receiving: {fileMeta.name}</p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {decoderRef.current?.encodedCount || 0} frames scanned. {decoderRef.current?.decodedCount || 0} / {fileMeta.total} base chunks recovered
                  </p>
                </div>
                <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-neutral-500 text-sm">
                Point your camera at a QRFerry transmission...
              </p>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={isScanning ? stopCamera : startCamera}
              className={cn(
                "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors text-white",
                isScanning 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              {isScanning ? (
                <><span>Stop Scanner</span></>
              ) : (
                <><Camera className="w-5 h-5" /> <span>Start Scanner</span></>
              )}
            </button>
            {fileMeta && (
              <button
                onClick={reset}
                className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700"
              >
                <RefreshCcw className="w-5 h-5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400">
            <Download className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Transfer Complete</h2>
            <p className="text-neutral-500">{fileMeta?.name}</p>
          </div>
          <div className="flex justify-center space-x-4 pt-4">
            <a
              href={downloadUrl}
              download={fileMeta?.name}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              <span>Save File</span>
            </a>
            <button
              onClick={reset}
              className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-700 rounded-lg font-medium transition-colors"
            >
              Receive Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
