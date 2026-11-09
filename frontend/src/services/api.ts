const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Incident {
  id: string;
  title: string;
  service: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ToolEvent {
  type: 'tool_start' | 'tool_end';
  tool: string;
  input?: any;
  output?: string;
  timestamp: string;
}

export interface RunbookMemory {
  id: string;
  title: string;
  root_cause: string;
  resolution: string;
}

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  return res.json();
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${BASE_URL}/api/incidents`);
  return res.json();
}

export async function createIncident(data: { title: string; service: string; severity: string }): Promise<Incident> {
  const res = await fetch(`${BASE_URL}/api/incidents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function fetchIncidentHistory(threadId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${BASE_URL}/api/incidents/${threadId}/history`);
  const data = await res.json();
  return (data.messages || []).map((m: any) => ({
    role: m.type === 'human' ? 'user' : m.type === 'ai' ? 'assistant' : 'system',
    content: m.content
  }));
}

export async function streamIncidentChat(
  threadId: string,
  message: string,
  handlers: {
    onToken: (token: string) => void;
    onToolEvent: (event: ToolEvent) => void;
    onMemoryFound: (runbooks: RunbookMemory[]) => void;
    onError: (error: string) => void;
    onDone: () => void;
  }
) {
  try {
    const res = await fetch(`${BASE_URL}/api/incidents/${threadId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('ReadableStream not supported.');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim().startsWith('data: ')) continue;
        const payload = block.replace(/^data:\s*/, '').trim();

        if (payload === '[DONE]') {
          handlers.onDone();
          return;
        }

        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'token') handlers.onToken(parsed.content);
          else if (parsed.type === 'tool_start') {
            handlers.onToolEvent({
              type: 'tool_start',
              tool: parsed.tool,
              input: parsed.input,
              timestamp: new Date().toLocaleTimeString()
            });
          } else if (parsed.type === 'tool_end') {
            handlers.onToolEvent({
              type: 'tool_end',
              tool: parsed.tool,
              output: parsed.output,
              timestamp: new Date().toLocaleTimeString()
            });
          } else if (parsed.type === 'memory_found') {
            handlers.onMemoryFound(parsed.runbooks);
          } else if (parsed.type === 'error') {
            handlers.onError(parsed.message);
          }
        } catch (err) {
          console.warn('Could not parse SSE payload:', payload, err);
        }
      }
    }
    handlers.onDone();
  } catch (err: any) {
    handlers.onError(err.message || 'Stream connection failed');
    handlers.onDone();
  }
}
