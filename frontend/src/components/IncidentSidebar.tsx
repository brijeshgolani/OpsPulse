import React, { useState } from 'react';
import { ShieldAlert, Plus, RefreshCw, Radio } from 'lucide-react';
import { Incident } from '../services/api';

interface IncidentSidebarProps {
  incidents: Incident[];
  activeIncidentId: string;
  onSelectIncident: (id: string) => void;
  onCreateIncident: (data: { title: string; service: string; severity: string }) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const IncidentSidebar: React.FC<IncidentSidebarProps> = ({
  incidents,
  activeIncidentId,
  onSelectIncident,
  onCreateIncident,
  onRefresh,
  loading
}) => {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [service, setService] = useState('checkout-service');
  const [severity, setSeverity] = useState('CRITICAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateIncident({ title, service, severity });
    setTitle('');
    setShowModal(false);
  };

  return (
    <aside className="w-72 border-r border-[#1f293d] bg-[#0c101a] flex flex-col h-full">
      <div className="p-4 border-b border-[#1f293d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Active Incidents</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onRefresh} className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowModal(true)} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {incidents.map((inc) => {
          const isActive = inc.id === activeIncidentId;
          const isCritical = inc.severity === 'CRITICAL';
          return (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc.id)}
              className={`p-3 rounded-lg cursor-pointer transition border text-left ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500/50 shadow-md shadow-blue-950/20'
                  : 'bg-[#111726]/60 border-[#1f293d] hover:bg-[#151c2e] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-blue-400">{inc.id}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                  isCritical
                    ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                }`}>
                  {inc.severity}
                </span>
              </div>
              <h3 className="text-xs font-medium text-slate-200 line-clamp-2 leading-relaxed mb-2">{inc.title}</h3>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{inc.service}</span>
                <span className="text-slate-500">{inc.status}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111726] border border-[#1f293d] rounded-xl p-5 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Trigger Simulated Incident
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Alert Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unhandled NullPointerException in checkout"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Service</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="checkout-service">checkout-service</option>
                    <option value="auth-service">auth-service</option>
                    <option value="order-service">order-service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#1f293d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                >
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
