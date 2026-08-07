import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileUp, Play, Square, Settings, Maximize } from 'lucide-react';
import { cn } from '../lib/utils';
import { createEncoder, blockToBinary, EncodedBlock } from 'luby-transform';
import { ErrorBoundary } from './ErrorBoundary';

function uint8ToBase64(u8Arr: Uint8Array) {
  let str = '';
  for (let i = 0; i < u8Arr.length; i++) {
    str += String.fromCharCode(u8Arr[i]);
  }
  return btoa(str);
}

export function WebSender() {
  const [file, setFile] = useState<File | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [fps, setFps] = useState(15);
  const [chunkSize, setChunkSize] = useState(800);
  const [chunksSent, setChunksSent] = useState(0);
  const [currentQrData, setCurrentQrData] = useState<string | null>(null);
  
  const generatorRef = useRef<Generator<EncodedBlock, never> | null>(null);
  const intervalRef = useRef<number | null>(null);
  const metaNameRef = useRef<string>('');

  const initEncoder = async (selectedFile: File, size: number) => {
    const buffer = await selectedFile.arrayBuffer();
    const data = new Uint8Array(buffer);
    const filenameB64 = btoa(selectedFile.name);
    metaNameRef.current = filenameB64;
    
    const encoder = createEncoder(data, size);
    generatorRef.current = encoder.fountain();
    
    const block = generatorRef.current.next().value;
    if (block) {
      const bin = blockToBinary(block);
      const b64 = uint8ToBase64(bin);
      setCurrentQrData(`LT1|${filenameB64}|${b64}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setIsTransmitting(false);
    setChunksSent(0);
    setCurrentQrData(null);
    
    await initEncoder(selected, chunkSize);
  };

  const handleChunkSizeChange = async (newSize: number) => {
    setChunkSize(newSize);
    if (file) {
      setIsTransmitting(false);
      setChunksSent(0);
      await initEncoder(file, newSize);
    }
  };

  useEffect(() => {
    if (isTransmitting && generatorRef.current) {
      intervalRef.current = window.setInterval(() => {
        let attempts = 0;
        while (attempts < 50) {
          const block = generatorRef.current?.next().value;
          if (block) {
            const bin = blockToBinary(block);
            if (bin.length > 2100) {
              attempts++;
              continue;
            }
            const b64 = uint8ToBase64(bin);
            setCurrentQrData(`LT1|${metaNameRef.current}|${b64}`);
            setChunksSent((prev) => prev + 1);
            break;
          } else {
            break;
          }
        }
      }, 1000 / fps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTransmitting, fps]);

  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto space-y-8 p-6">
      {!isTransmitting && (
        <div className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
          <label className="flex flex-col items-center justify-center cursor-pointer space-y-4">
            <div className="bg-neutral-200 dark:bg-neutral-800 p-4 rounded-full">
              <FileUp className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div>
              <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                {file ? file.name : 'Select a file to send'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Any file type, recommended < 1MB for optical transfer'}
              </p>
            </div>
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {currentQrData && (
        <div className="flex flex-col items-center space-y-6 w-full">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 w-full max-w-md aspect-square flex items-center justify-center">
            <ErrorBoundary key={currentQrData} fallback={<div className="text-red-500 font-medium text-center">Frame too large</div>}>
              <QRCodeSVG 
                value={currentQrData} 
                className="w-full h-full max-w-[320px] max-h-[320px]" 
                level="L" 
                includeMargin={false}
              />
            </ErrorBoundary>
          </div>

          <div className="w-full max-w-md flex flex-col space-y-4">
            <div className="flex justify-between text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <span>{isTransmitting ? `Transmitting (Fountain Codes)` : `Ready to Transmit`}</span>
              <span>{chunksSent} frames sent</span>
            </div>
            
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-75"
                style={{ width: `100%` }}
              />
            </div>

            <div className="flex flex-col gap-3 mt-4">
              <button
                onClick={() => setIsTransmitting(!isTransmitting)}
                className={cn(
                  "w-full flex justify-center items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors text-white",
                  isTransmitting 
                    ? "bg-red-500 hover:bg-red-600" 
                    : "bg-blue-600 hover:bg-blue-700"
                )}
              >
                {isTransmitting ? (
                  <><Square className="w-5 h-5 fill-current" /> <span>Stop Transmitting</span></>
                ) : (
                  <><Play className="w-5 h-5 fill-current" /> <span>Start Transmitting</span></>
                )}
              </button>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="flex-1 flex justify-center items-center space-x-2 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-lg">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">Speed:</span>
                  <select 
                    value={fps} 
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="bg-transparent text-sm font-medium focus:outline-none w-full"
                  >
                    <option value={4}>4 fps</option>
                    <option value={8}>8 fps</option>
                    <option value={15}>15 fps</option>
                    <option value={20}>20 fps</option>
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                  </select>
                </div>

                <div className="flex-1 flex justify-center items-center space-x-2 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-3 py-2 rounded-lg">
                  <Maximize className="w-4 h-4" />
                  <span className="text-sm">Density:</span>
                  <select 
                    value={chunkSize} 
                    onChange={(e) => handleChunkSizeChange(Number(e.target.value))}
                    className="bg-transparent text-sm font-medium focus:outline-none w-full"
                    disabled={isTransmitting}
                  >
                    <option value={300}>Low (300B)</option>
                    <option value={500}>Medium (500B)</option>
                    <option value={800}>High (800B)</option>
                    <option value={1200}>Max (1200B)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
