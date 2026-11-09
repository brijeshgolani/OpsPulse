import React, { useState, useRef, useEffect } from 'react';
import { Send, Terminal, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage } from '../services/api';

interface ChatWindowProps {
  incidentId: string;
  messages: ChatMessage[];
  streamingToken: string;
  isStreaming: boolean;
  onSendMessage: (msg: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  incidentId,
  messages,
  streamingToken,
  isStreaming,
  onSendMessage
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input);
    setInput('');
  };

  const quickPrompts = [
    "Run full diagnostic triage and inspect logs",
    "Inspect latest commit on main branch for bugs",
    "Search codebase for paymentProcessor auth dereference",
    "Generate automated pull request with rollback plan"
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0d14] relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && !streamingToken && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">OpsPulse SRE Incident Commander</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Investigating incident <span className="font-mono text-blue-400 font-semibold">{incidentId}</span>. 
              The agent has access to Model Context Protocol (MCP) tools to inspect server logs, check Git commits, 
              query past postmortems, and generate PR patches.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full text-left">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  className="p-2.5 rounded-lg bg-[#111726] border border-[#1f293d] hover:border-blue-500/50 hover:bg-[#151c2e] text-[11px] text-slate-300 transition flex items-center gap-2 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          if (msg.role === 'system') return null;

          return (
            <div key={idx} className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed ${
                isUser
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-[#111726] border border-[#1f293d] text-slate-200 rounded-bl-none whitespace-pre-wrap'
              }`}>
                {msg.content}
              </div>
              {isUser && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {streamingToken && (
          <div className="flex gap-3.5 justify-start">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="max-w-2xl rounded-xl p-4 text-xs leading-relaxed bg-[#111726] border border-blue-500/40 text-slate-200 rounded-bl-none whitespace-pre-wrap shadow-lg shadow-blue-950/20">
              {streamingToken}
              <span className="inline-block w-1.5 h-3.5 bg-blue-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-[#1f293d] bg-[#0c101a]">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? "OpsPulse is triaging and executing tools..." : "Instruct the SRE agent (e.g. check logs, inspect commit, formulate fix)..."}
            className="flex-1 bg-[#111726] border border-[#1f293d] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-medium"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
