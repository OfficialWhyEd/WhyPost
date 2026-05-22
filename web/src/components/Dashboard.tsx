import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, Settings2, Sun, Moon } from 'lucide-react';
import { Statistics } from './Statistics';
import { Calendar } from './Calendar';
import { BottomBar } from './BottomBar';
import { QueuePanel } from './QueuePanel';
import { StatusBadge } from './StatusBadge';
import { SocialConnectModal } from './SocialConnectModal';
import type { SystemState, VideoItem, MemorySummary } from '../types';

interface Props {
  state: SystemState;
  queue: VideoItem[];
  memory: MemorySummary | null;
  serverOk: boolean;
  onVideoClick: (v: VideoItem) => void;
  lastRefresh: Date | null;
  onRefresh: () => void;
  onRunPipeline: () => void;
  pipelineRunning: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

function useRelativeTime(date: Date | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function update() {
      if (!date) { setLabel(''); return; }
      const s = Math.round((Date.now() - date.getTime()) / 1000);
      if (s < 5) setLabel('ora');
      else if (s < 60) setLabel(`${s}s fa`);
      else setLabel(`${Math.round(s / 60)}m fa`);
    }
    update();
    const id = setInterval(update, 5000);
    return () => clearInterval(id);
  }, [date]);
  return label;
}

export function Dashboard({
  state, queue, serverOk,
  onVideoClick, lastRefresh, onRefresh,
  onRunPipeline, pipelineRunning,
  theme, onToggleTheme,
}: Props) {
  const refreshLabel   = useRelativeTime(lastRefresh);
  const [showOpts, setShowOpts] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────── */}
      <header style={{
        height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surf-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'NeuePower, Geist, sans-serif',
            fontSize: 15, fontWeight: 900, color: 'var(--text)', letterSpacing: '0.4px',
          }}>WhyPost</span>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>/</span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>Mission Control</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {refreshLabel && (
            <motion.button
              onClick={onRefresh}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-3)', fontSize: 10, padding: '4px 8px', borderRadius: 6,
              }}
            >
              <RefreshCw size={11} />{refreshLabel}
            </motion.button>
          )}

          {/* Theme toggle */}
          <motion.button
            onClick={onToggleTheme}
            whileHover={{ scale: 1.06, background: 'var(--surf-3)' as never }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
            title={theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'transparent', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)', transition: 'background 0.15s',
            }}
          >
            {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          </motion.button>

          {/* Options button */}
          <motion.button
            onClick={() => setShowOpts(true)}
            whileHover={{ scale: 1.04, background: 'var(--surf-3)' as never }}
            whileTap={{ scale: 0.93 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8, cursor: 'pointer',
              color: 'var(--text-2)',
              fontSize: 11, fontWeight: 500,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <Settings2 size={12} />
            Opzioni
          </motion.button>

          {/* Run pipeline */}
          <motion.button
            onClick={onRunPipeline}
            disabled={pipelineRunning}
            whileHover={!pipelineRunning ? { scale: 1.03 } : {}}
            whileTap={!pipelineRunning ? { scale: 0.93 } : {}}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px',
              background: pipelineRunning ? 'rgba(52,211,153,0.07)' : 'var(--surf-2)',
              border: `1px solid ${pipelineRunning ? 'rgba(52,211,153,0.22)' : 'var(--border-hi)'}`,
              borderRadius: 8, cursor: pipelineRunning ? 'default' : 'pointer',
              color: pipelineRunning ? 'var(--accent)' : 'var(--text-2)',
              fontSize: 11, fontWeight: 600,
              boxShadow: 'inset 0 1px 0 var(--inset-hi)',
              transition: 'background 0.2s, border-color 0.2s, color 0.2s',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {pipelineRunning ? (
                <motion.span key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <RefreshCw size={11} />
                  </motion.div>
                  avvio...
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Play size={11} fill="currentColor" />Lancia pipeline
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <StatusBadge status={state.system} serverOk={serverOk} />
        </div>
      </header>

      {/* ── Body ───────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left column */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', borderRight: '1px solid var(--border)',
        }}>
          <div style={{ flexShrink: 0 }}>
            <Calendar queue={queue} onVideoClick={onVideoClick} />
          </div>
          <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Statistics state={state} queue={queue} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 360, flexShrink: 0, overflow: 'hidden' }}>
          <QueuePanel queue={queue} onVideoClick={onVideoClick} />
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px 16px', flexShrink: 0 }}>
        <BottomBar
          readyVideos={state.buffer.ready_videos}
          targetDays={state.buffer.target_days}
          nextPublish={state.buffer.next_publish}
        />
      </div>

      {/* ── Options modal ───────────────────────── */}
      <AnimatePresence>
        {showOpts && <SocialConnectModal onClose={() => setShowOpts(false)} />}
      </AnimatePresence>
    </div>
  );
}
