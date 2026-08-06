import { useState } from 'react';
import { ScanLine, Send, TerminalSquare } from 'lucide-react';
import { WebSender } from './components/WebSender';
import { WebReceiver } from './components/WebReceiver';
import { PythonCLI } from './components/PythonCLI';
import { cn } from './lib/utils';

type Tab = 'send' | 'receive' | 'cli';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('receive');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-neutral-900 dark:bg-white p-2 rounded-lg">
              <ScanLine className="w-5 h-5 text-white dark:text-neutral-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">QRFerry</h1>
          </div>
          
          <nav className="flex items-center space-x-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <button
              onClick={() => setActiveTab('receive')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === 'receive' 
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <ScanLine className="w-4 h-4" />
              <span className="hidden sm:inline">Receive (Camera)</span>
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === 'send' 
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send (Screen)</span>
            </button>
            <button
              onClick={() => setActiveTab('cli')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === 'cli' 
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <TerminalSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Python CLI</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="py-8">
        {activeTab === 'receive' && <WebReceiver />}
        {activeTab === 'send' && <WebSender />}
        {activeTab === 'cli' && <PythonCLI />}
      </main>
    </div>
  );
}

