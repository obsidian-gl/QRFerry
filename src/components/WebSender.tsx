import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileUp, Play, Square, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { createEncoder, blockToBinary, EncodedBlock } from 'luby-transform';

const CHUNK_SIZE = 500;

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
  const [fps, setFps] = useState(8);
  const [chunksSent, setChunksSent] = useState(0);
  const [currentQrData, setCurrentQrData] = useState<string | null>(null);
  
  const generatorRef = useRef<Generator<EncodedBlock, never> | null>(null);
  const intervalRef = useRef<number | null>(null);
  const metaNameRef = useRef<string>('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    
    setFile(selected);
    setIsTransmitting(false);
    setChunksSent(0);
    setCurrentQrData(null);
    
    const buffer = await selected.arrayBuffer();
    const data = new Uint8Array(buffer);
    const filenameB64 = btoa(selected.name);
    metaNameRef.current = filenameB64;
    
    const encoder = createEncoder(data, CHUNK_SIZE);
    generatorRef.current = encoder.fountain();
    
    // generate the first QR to display immediately
    const block = generatorRef.current.next().value;
    if (block) {
      const bin = blockToBinary(block);
      const b64 = uint8ToBase64(bin);
      setCurrentQrData(`LT1|${filenameB64}|${b64}`);
    }
  };

  useEffect(() => {
    if (isTransmitting && generatorRef.current) {
      intervalRef.current = window.setInterval(() => {
        const block = generatorRef.current?.next().value;
        if (block) {
          const bin = blockToBinary(block);
          const b64 = uint8ToBase64(bin);
          setCurrentQrData(`LT1|${metaNameRef.current}|${b64}`);
          setChunksSent((prev) => prev + 1);
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
             <QRCodeSVG 
               value={currentQrData} 
               className="w-full h-full max-w-[320px] max-h-[320px]" 
               level="L" 
               includeMargin={false}
             />
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

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <button
                onClick={() => setIsTransmitting(!isTransmitting)}
                className={cn(
                  "w-full sm:w-auto flex justify-center items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors text-white",
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
              
              <div className="w-full sm:w-auto flex justify-center items-center space-x-3 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Speed:</span>
                <select 
                  value={fps} 
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="bg-transparent text-sm font-medium focus:outline-none"
                  disabled={isTransmitting}
                >
                  <option value={4}>Slow (4 fps)</option>
                  <option value={8}>Normal (8 fps)</option>
                  <option value={15}>Fast (15 fps)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
