import { useState } from 'react';
import { Copy, Check, Download, FileText, Code2, Terminal } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { PACKAGE_FILES } from '../lib/python-package';

export function PythonCLI() {
  const [activeFile, setActiveFile] = useState<keyof typeof PACKAGE_FILES>('README.md');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PACKAGE_FILES[activeFile]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDownloadZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();
      
      Object.entries(PACKAGE_FILES).forEach(([filename, content]) => {
        zip.file(filename, content);
      });
      
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'qrferry-package.zip');
    } catch (err) {
      console.error('Failed to generate zip:', err);
    }
  };

  const fileKeys = Object.keys(PACKAGE_FILES) as (keyof typeof PACKAGE_FILES)[];

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Python CLI Package</h2>
          <p className="text-sm text-neutral-500 mt-1">Download and install QRFerry globally via pip.</p>
        </div>
        <button
          onClick={handleDownloadZip}
          className="flex items-center space-x-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white transition-colors rounded-lg text-sm font-medium shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Download .zip</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3 px-2">Files</h3>
          {fileKeys.map((file) => (
            <button
              key={file}
              onClick={() => setActiveFile(file)}
              className={\`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors \${
                activeFile === file 
                  ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100" 
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900"
              }\`}
            >
              {file.endsWith('.md') ? <FileText className="w-4 h-4" /> : 
               file.endsWith('.py') ? <Code2 className="w-4 h-4" /> : 
               <Terminal className="w-4 h-4" />}
              <span className="truncate">{file}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 bg-neutral-950 rounded-xl overflow-hidden shadow-inner border border-neutral-800 flex flex-col h-[600px]">
          <div className="flex bg-neutral-900 px-4 py-3 border-b border-neutral-800 items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-sm text-neutral-400 font-mono ml-4">{activeFile}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 transition-colors rounded-md text-xs font-medium text-neutral-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-[#0d0d0d]">
            <pre className="text-sm text-neutral-300 font-mono leading-relaxed">
              <code>{PACKAGE_FILES[activeFile]}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
