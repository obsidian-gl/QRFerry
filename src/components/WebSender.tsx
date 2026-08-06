import { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FileUp, Play, Square, Settings } from 'lucide-react';
import { cn } from '../lib/utils';

const CHUNK_SIZE = 500;

export function WebSender() {
  const [file, setFile] = useState<File | null>(null);
  const [chunks, setChunks] = useState<string[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [fps, setFps] = useState(8);
  const intervalRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setIsTransmitting(false);
    setChunks([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Extract base64 part
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return;

      const filenameB64 = btoa(selected.name);
      const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
      const newChunks = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunkData = base64Data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        // Protocol: QRF|{filename_b64}|{index}|{total}|{data}
        newChunks.push(`QRF|${filenameB64}|${i}|${totalChunks}|${chunkData}`);
      }
      setChunks(newChunks);
      setCurrentChunk(0);
    };
    reader.readAsDataURL(selected);
  };

  useEffect(() => {
    if (isTransmitting && chunks.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setCurrentChunk((prev) => (prev + 1) % chunks.length);
      }, 1000 / fps);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isTransmitting, chunks.length, fps]);

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
                {file ? `${(file.size / 1024).toFixed(1)} KB - ${chunks.length} chunks generated` : 'Any file type, recommended < 1MB for optical transfer'}
              </p>
            </div>
            <input type="file" className="hidden" onChange={handleFileChange} />
          </label>
        </div>
      )}

      {chunks.length > 0 && (
        <div className="flex flex-col items-center space-y-6 w-full">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 w-full max-w-md aspect-square flex items-center justify-center">
             <QRCodeSVG 
               value={chunks[currentChunk]} 
               className="w-full h-full max-w-[320px] max-h-[320px]" 
               level="L" 
               includeMargin={false}
             />
          </div>

          <div className="w-full max-w-md flex flex-col space-y-4">
            <div className="flex justify-between text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <span>Chunk {currentChunk + 1} of {chunks.length}</span>
              <span>{( ((currentChunk + 1) / chunks.length) * 100 ).toFixed(0)}% Cycle</span>
            </div>
            
            <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-75"
                style={{ width: `${((currentChunk + 1) / chunks.length) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setIsTransmitting(!isTransmitting)}
                className={cn(
                  "flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors text-white",
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
              
              <div className="flex items-center space-x-3 text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
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
