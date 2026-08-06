import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { PYTHON_SCRIPT } from '../lib/python-script';

export function PythonCLI() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Python CLI Client</h2>
          <p className="text-sm text-neutral-500 mt-1">Run QRFerry directly from your terminal.</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors rounded-lg text-sm font-medium"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied' : 'Copy Code'}</span>
        </button>
      </div>
      
      <div className="bg-neutral-950 rounded-xl overflow-hidden shadow-inner border border-neutral-800">
        <div className="flex bg-neutral-900 px-4 py-2 border-b border-neutral-800 items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          <span className="text-xs text-neutral-500 font-mono ml-2">qrferry.py</span>
        </div>
        <pre className="p-6 text-sm text-neutral-300 font-mono overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          <code>{PYTHON_SCRIPT}</code>
        </pre>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-900/50">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Usage Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>Save the code above as <code>qrferry.py</code></li>
          <li>Install dependencies: <code>pip install qrcode[pil] opencv-python pyzbar pyraptorq tqdm flask</code></li>
          <li>To send a file (terminal): <code>python qrferry.py send -f my_document.pdf</code></li>
          <li>To send a file (save GIF): <code>python qrferry.py send -f my_document.pdf --gif</code></li>
          <li>To receive via CLI: <code>python qrferry.py receive</code></li>
          <li>To receive via Web/Mobile: <code>python qrferry.py web-receive</code> (Opens server on :5000)</li>
        </ol>
      </div>
    </div>
  );
}
