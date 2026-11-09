import React, { useState } from 'react';
import { Terminal, Database, GitPullRequest, CheckCircle2, ChevronRight, ChevronDown, Wrench } from 'lucide-react';
import { ToolEvent, RunbookMemory } from '../services/api';

interface DiagnosticPanelProps {
  toolEvents: ToolEvent[];
  memories: RunbookMemory[];
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({ toolEvents, memories }) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'memory' | 'diff'>('tools');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (idx: number) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  return (
    <aside className="w-96 border-l border-[#1f293d] bg-[#0c101a] flex flex-col h-full">
      <div className="flex border-b border-[#1f293d] text-xs font-medium">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === 'tools'
              ? 'border-blue-500 text-blue-400 bg-[#111726]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>MCP Tools ({toolEvents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === 'memory'
              ? 'border-blue-500 text-blue-400 bg-[#111726]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Memory ({memories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex-1 py-3 px-2 flex items-center justify-center gap-1.5 transition border-b-2 ${
            activeTab === 'diff'
              ? 'border-blue-500 text-blue-400 bg-[#111726]/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitPullRequest className="w-3.5 h-3.5" />
          <span>Remediation</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'tools' && (
          <div className="space-y-2">
            {toolEvents.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                <Terminal className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No tool calls executed yet. Instruct the agent to check logs or GitHub.
              </div>
            ) : (
              toolEvents.map((evt, idx) => {
                const isStart = evt.type === 'tool_start';
                const isExpanded = expandedIndex === idx;

                return (
                  <div key={idx} className="rounded-lg bg-[#111726] border border-[#1f293d] p-3 text-xs font-mono">
                    <div onClick={() => toggleExpand(idx)} className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-2">
                        {isStart ? (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span className="font-semibold text-slate-200">{evt.tool}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>{evt.timestamp}</span>
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-[11px] text-slate-300 space-y-1 overflow-x-auto">
                        {evt.input && (
                          <div>
                            <span className="text-slate-500">Input:</span>
                            <pre className="mt-0.5 text-blue-300 bg-black/40 p-1.5 rounded">{JSON.stringify(evt.input, null, 2)}</pre>
                          </div>
                        )}
                        {evt.output && (
                          <div className="mt-1">
                            <span className="text-slate-500">Output:</span>
                            <pre className="mt-0.5 text-emerald-300 bg-black/40 p-1.5 rounded max-h-48 overflow-y-auto">{evt.output}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'memory' && (
          <div className="space-y-3">
            {memories.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                <Database className="w-6 h-6 mx-auto mb-2 opacity-40" />
                No matching historical postmortems retrieved yet.
              </div>
            ) : (
              memories.map((m) => (
                <div key={m.id} className="p-3 rounded-lg bg-[#111726] border border-[#1f293d] space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-400">{m.id}</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800">
                      Postmortem
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-200">{m.title}</h4>
                  <p className="text-[11px] text-slate-400"><strong className="text-slate-300">RCA:</strong> {m.root_cause}</p>
                  <p className="text-[11px] text-slate-400"><strong className="text-slate-300">Fix:</strong> {m.resolution}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#111726] border border-[#1f293d] text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <GitPullRequest className="w-3.5 h-3.5 text-purple-400" /> Automated Remediation PR
                </span>
                <span className="text-[10px] bg-purple-950 text-purple-400 px-2 py-0.5 rounded border border-purple-800">
                  Ready to Merge
                </span>
              </div>
              <div className="font-mono text-[11px] bg-black/50 p-2.5 rounded border border-slate-800 text-slate-300 overflow-x-auto">
                <div className="text-emerald-400">+ const token = req.auth?.token || req.headers?.authorization?.split(' ')[1];</div>
                <div className="text-rose-400">- const token = req.auth.token;</div>
              </div>
              <p className="text-[11px] text-slate-400">
                PR #412 created on branch <code className="text-blue-300">fix/guest-checkout-null-token</code> with automated rollback script attached.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
