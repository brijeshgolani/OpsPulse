import React from 'react';
import { Activity, Cpu, Eye, Database } from 'lucide-react';

interface HeaderProps {
  checkpointer: string;
  model: string;
  observability: string;
}

export const Header: React.FC<HeaderProps> = ({ checkpointer, model, observability }) => {
  return (
    <header className="h-16 border-b border-[#1f293d] bg-[#0d121d] px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            OpsPulse
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800">
              Agentic SRE
            </span>
          </h1>
          <p className="text-xs text-slate-400">Autonomous Incident Response & Triaging</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span>Model:</span>
          <span className="font-mono text-white font-medium">{model || 'Llama 3.3 70B (Groq)'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>State:</span>
          <span className="font-mono text-white font-medium capitalize">{checkpointer}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          <span>Traces:</span>
          <span className="font-medium text-emerald-400">Langfuse Active</span>
        </div>
      </div>
    </header>
  );
};
