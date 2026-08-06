import { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Camera, Download, AlertCircle, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

export function WebReceiver() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chunksRef = useRef<Map<number, string>>(new Map());
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        scanLoopRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.warn("Camera error:", err);
      setError("Camera permission denied. If you are viewing this in a preview iframe, please open the application in a new tab, or ensure you have granted camera access.");
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const processQRCode = (data: string) => {
    if (!data.startsWith('QRF|')) return;
    
    const parts = data.split('|');
    if (parts.length < 5) return;
    
    const [prefix, filenameB64, idxStr, totalStr, ...payloadParts] = parts;
    const payload = payloadParts.join('|');
    
    const index = parseInt(idxStr, 10);
    const total = parseInt(totalStr, 10);
    
    let filename = 'received_file';
    try {
      filename = atob(filenameB64);
    } catch (e) {
      // ignore
    }

    if (!fileMeta) {
      setFileMeta({ name: filename, total });
    }

    if (!chunksRef.current.has(index)) {
      chunksRef.current.set(index, payload);
      
      const currentCount = chunksRef.current.size;
      setProgress((currentCount / total) * 100);
      
      if (currentCount === total) {
        reconstructFile(filename, total);
      }
    }
  };

  const reconstructFile = (filename: string, total: number) => {
    stopCamera();
    try {
      let fullB64 = '';
      for (let i = 0; i < total; i++) {
        fullB64 += chunksRef.current.get(i) || '';
      }

      const byteCharacters = atob(fullB64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray]);
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
    chunksRef.current.clear();
    setFileMeta(null);
    setProgress(0);
    setDownloadUrl(null);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 p-6">
      {error && (
        <div className="w-full bg-red-50 text-red-700 p-4 rounded-lg flex items-center space-x-3 border border-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {!isScanning && !downloadUrl && (
        <div className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-6">
          <div className="bg-neutral-200 dark:bg-neutral-800 p-5 rounded-full">
            <Camera className="w-10 h-10 text-neutral-600 dark:text-neutral-400" />
          </div>
          <div>
            <h3 className="text-xl font-medium text-neutral-900 dark:text-neutral-100">Ready to Receive</h3>
            <p className="text-neutral-500 mt-2 text-sm max-w-sm mx-auto">
              Point your camera at a QRFerry sender to begin capturing data chunks. No internet required.
            </p>
          </div>
          <button
            onClick={startCamera}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
          >
            Open Camera & Scan
          </button>
        </div>
      )}

      {isScanning && (
        <div className="w-full flex flex-col items-center space-y-6">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden bg-black aspect-video border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              playsInline 
              muted 
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute inset-0 border-2 border-blue-500/30 m-8 rounded-lg">
               {/* Viewfinder brackets */}
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
            </div>
          </div>

          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm text-neutral-500 font-medium uppercase tracking-wider">Receiving</p>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-1 truncate max-w-[200px]">
                  {fileMeta ? fileMeta.name : 'Waiting for data...'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{progress.toFixed(0)}%</p>
                <p className="text-xs text-neutral-500 font-medium">
                  {chunksRef.current.size} / {fileMeta ? fileMeta.total : '?'} chunks
                </p>
              </div>
            </div>
            
            <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <button
              onClick={() => { stopCamera(); reset(); }}
              className="w-full py-2.5 mt-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-lg transition-colors text-sm"
            >
              Cancel Transfer
            </button>
          </div>
        </div>
      )}

      {downloadUrl && fileMeta && (
        <div className="w-full max-w-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-800/50 rounded-full flex items-center justify-center mx-auto">
            <Download className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Transfer Complete!</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mt-2 text-sm font-medium">
              {fileMeta.name} ({fileMeta.total} chunks received)
            </p>
          </div>
          
          <div className="flex flex-col space-y-3 pt-4">
            <a
              href={downloadUrl}
              download={fileMeta.name}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors inline-block"
            >
              Save File
            </a>
            <button
              onClick={reset}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 font-medium rounded-lg transition-colors text-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>Receive Another File</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
