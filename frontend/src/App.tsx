import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IncidentSidebar } from './components/IncidentSidebar';
import { ChatWindow } from './components/ChatWindow';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import {
  Incident,
  ChatMessage,
  ToolEvent,
  RunbookMemory,
  fetchHealth,
  fetchIncidents,
  createIncident,
  fetchIncidentHistory,
  streamIncidentChat
} from './services/api';

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string>('INC-8092');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingToken, setStreamingToken] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [memories, setMemories] = useState<RunbookMemory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [healthInfo, setHealthInfo] = useState({ checkpointer: 'memory', model: 'llama-3.3-70b', observability: 'active' });

  useEffect(() => {
    loadHealth();
    loadIncidents();
  }, []);

  useEffect(() => {
    if (activeIncidentId) {
      resumeSession(activeIncidentId);
    }
  }, [activeIncidentId]);

  const loadHealth = async () => {
    try {
      const data = await fetchHealth();
      setHealthInfo(data);
    } catch (e) {
      console.warn('Backend offline or health check failed:', e);
    }
  };

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const list = await fetchIncidents();
      setIncidents(list);
      if (list.length > 0 && !activeIncidentId) {
        setActiveIncidentId(list[0].id);
      }
    } catch (e) {
      console.warn('Could not fetch incidents list:', e);
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async (id: string) => {
    setMessages([]);
    setStreamingToken('');
    setToolEvents([]);
    try {
      const history = await fetchIncidentHistory(id);
      setMessages(history);
    } catch (e) {
      console.warn('Could not fetch thread history:', e);
    }
  };

  const handleCreateIncident = async (data: { title: string; service: string; severity: string }) => {
    try {
      const newInc = await createIncident(data);
      setIncidents((prev) => [newInc, ...prev]);
      setActiveIncidentId(newInc.id);
    } catch (e) {
      console.error('Failed to create incident:', e);
    }
  };

  const handleSendMessage = (content: string) => {
    const userMsg: ChatMessage = { role: 'user', content, timestamp: new Date().toLocaleTimeString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingToken('');

    let currentStreamBuffer = '';

    streamIncidentChat(activeIncidentId, content, {
      onToken: (tok) => {
        currentStreamBuffer += tok;
        setStreamingToken(currentStreamBuffer);
      },
      onToolEvent: (event) => {
        setToolEvents((prev) => [event, ...prev]);
      },
      onMemoryFound: (foundMemories) => {
        setMemories(foundMemories);
      },
      onError: (errMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `⚠️ Error during investigation: ${errMsg}` }
        ]);
        setStreamingToken('');
        setIsStreaming(false);
      },
      onDone: () => {
        if (currentStreamBuffer) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: currentStreamBuffer, timestamp: new Date().toLocaleTimeString() }
          ]);
        }
        setStreamingToken('');
        setIsStreaming(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100">
      <Header
        checkpointer={healthInfo.checkpointer}
        model={healthInfo.model}
        observability={healthInfo.observability}
      />
      <div className="flex flex-1 overflow-hidden">
        <IncidentSidebar
          incidents={incidents}
          activeIncidentId={activeIncidentId}
          onSelectIncident={setActiveIncidentId}
          onCreateIncident={handleCreateIncident}
          onRefresh={loadIncidents}
          loading={loading}
        />
        <ChatWindow
          incidentId={activeIncidentId}
          messages={messages}
          streamingToken={streamingToken}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
        />
        <DiagnosticPanel
          toolEvents={toolEvents}
          memories={memories}
        />
      </div>
    </div>
  );
};

export default App;
