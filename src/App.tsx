import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { ScanLine, Send, TerminalSquare } from 'lucide-react';
import { WebSender } from './components/WebSender';
import { WebReceiver } from './components/WebReceiver';
import { PythonCLI } from './components/PythonCLI';
import { cn } from './lib/utils';

function AppLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans flex flex-col">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-neutral-900 dark:bg-white p-2 rounded-lg">
              <ScanLine className="w-5 h-5 text-white dark:text-neutral-900" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">QRFerry</h1>
          </div>
          
          <nav className="flex items-center space-x-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto">
            <NavLink
              to="/receive"
              className={({ isActive }) => cn(
                "flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <ScanLine className="w-4 h-4" />
              <span>Receive</span>
            </NavLink>
            <NavLink
              to="/send"
              className={({ isActive }) => cn(
                "flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </NavLink>
            <NavLink
              to="/cli"
              className={({ isActive }) => cn(
                "flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white" 
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <TerminalSquare className="w-4 h-4" />
              <span>Python CLI</span>
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto py-6 px-4">
        <Routes>
          <Route path="/" element={<Navigate to="/receive" replace />} />
          <Route path="/receive" element={<WebReceiver />} />
          <Route path="/send" element={<WebSender />} />
          <Route path="/cli" element={<PythonCLI />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

