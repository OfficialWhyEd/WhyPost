import { useState, useEffect, useCallback } from 'react';
import type { SystemState, VideoItem, MemorySummary } from '../types';

const DEFAULT_STATE: SystemState = {
  system: 'idle',
  buffer: { ready_videos: 0, target_days: 7, next_publish: null },
  agents: {
    MAIN: { status: 'idle', last_run: null },
    EXEL: { status: 'idle', last_run: null },
    SCRIPT: { status: 'idle', last_run: null },
    ASSET: { status: 'idle', last_run: null },
    CLACK: { status: 'idle', last_run: null },
    SAFETY: { status: 'idle', last_run: null },
    PUBLISHER: { status: 'idle', last_run: null },
    TELEMETRY: { status: 'idle', last_run: null },
    OPUS: { status: 'idle', last_run: null },
  },
  updated_at: null,
};

export function useStore() {
  const [state, setState] = useState<SystemState>(DEFAULT_STATE);
  const [queue, setQueue] = useState<VideoItem[]>([]);
  const [memory, setMemory] = useState<MemorySummary | null>(null);
  const [serverOk, setServerOk] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [s, q, m] = await Promise.all([
        fetch('/api/state').then(r => r.json()),
        fetch('/api/queue').then(r => r.json()),
        fetch('/api/memory/summary').then(r => r.json()),
      ]);
      setState(s);
      setQueue(q.videos ?? []);
      setMemory(m);
      setServerOk(true);
      setLastRefresh(new Date());
    } catch {
      setServerOk(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 5000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const sendToClaudeChat = useCallback(async (userInput: string): Promise<string> => {
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_input: userInput,
          prompt: `Sei l'AI di WhyPost Mission Control. Hai memoria permanente: ogni correzione viene salvata per i video futuri.\nSistema: ${state.system}. Buffer: ${state.buffer.ready_videos}/${state.buffer.target_days}gg. Video in coda: ${queue.length}.\nUtente: ${userInput}\nRispondi in modo conciso e operativo.`,
        }),
      });
      const data = await res.json();
      return data.response ?? 'Nessuna risposta';
    } catch {
      return 'Claude non raggiungibile. Avvia: cd ~/Documents/WhyPost && source venv/bin/activate && python server/app.py';
    }
  }, [state, queue]);

  const runPipeline = useCallback(async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    try {
      await fetch('/api/run', { method: 'POST' });
      await fetchAll();
    } catch {
      // server might not have this endpoint yet — silently ignore
    } finally {
      setTimeout(() => setPipelineRunning(false), 2000);
    }
  }, [pipelineRunning, fetchAll]);

  return {
    state, queue, memory, serverOk,
    sendToClaudeChat, refresh: fetchAll,
    lastRefresh, runPipeline, pipelineRunning,
  };
}
