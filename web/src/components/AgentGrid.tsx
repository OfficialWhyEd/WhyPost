import { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import type { SystemState } from '../types';

const AGENTS = ['MAIN','EXEL','SCRIPT','ASSET','CLACK','SAFETY','PUBLISHER','TELEMETRY','OPUS'];

const AGENT_INFO: Record<string, { desc: string; detail: string }> = {
  MAIN:      { desc: 'Orchestra',    detail: 'Coordina il pipeline e la sequenza di esecuzione' },
  EXEL:      { desc: 'Ricerca',      detail: 'Trend, competitor, argomenti ad alto potenziale' },
  SCRIPT:    { desc: 'Scrittura',    detail: 'Genera script con hook, corpo e CTA ottimizzati' },
  ASSET:     { desc: 'Audio/B-roll', detail: 'Voce TTS, caption karaoke, selezione clip' },
  CLACK:     { desc: 'Rendering',    detail: 'Assembla video tramite Remotion + ffmpeg' },
  SAFETY:    { desc: 'Review',       detail: 'Copyright, policy piattaforme, score qualità' },
  PUBLISHER: { desc: 'Pubblica',     detail: 'Pubblicazione schedulata su IG, TK e YT' },
  TELEMETRY: { desc: 'Metriche',     detail: 'Performance post-pubblicazione e memoria AI' },
  OPUS:      { desc: 'Analisi',      detail: 'Outlier, pattern virali, suggerimenti strategici' },
};

function useElapsed(startStr: string | null, active: boolean): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!active || !startStr) { setLabel(''); return; }
    function tick() {
      const s = Math.max(0, Math.round((Date.now() - new Date(startStr!).getTime()) / 1000));
      if (s < 60) setLabel(`${s}s`);
      else if (s < 3600) setLabel(`${Math.floor(s / 60)}m ${s % 60}s`);
      else setLabel(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startStr, active]);
  return label;
}

const LiveDot = memo(function LiveDot({ running, error }: { running: boolean; error: boolean }) {
  const color = running ? 'var(--accent)' : error ? 'var(--danger)' : 'var(--border-hi)';
  return (
    <motion.div
      style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
      animate={running ? { scale: [1, 1.7, 1], opacity: [1, 0.25, 1] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

function RunningCard({ name, lastRun }: { name: string; lastRun: string | null }) {
  const elapsed = useElapsed(lastRun, true);
  const info = AGENT_INFO[name];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ type: 'spring' as const, stiffness: 340, damping: 26 }}
      style={{
        position: 'relative',
        padding: '10px 14px',
        background: 'rgba(52,211,153,0.04)',
        border: '1px solid rgba(52,211,153,0.2)',
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 0 rgba(52,211,153,0.1), 0 0 0 1px rgba(52,211,153,0.04)',
      }}
    >
      {/* Sweep shimmer */}
      <motion.div
        animate={{ x: ['-110%', '210%'] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.2 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.07) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LiveDot running error={false} />
          <span className="mono" style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.6px',
            color: 'var(--accent)', flexShrink: 0,
          }}>
            {name}
          </span>
          <span style={{
            fontSize: 10, color: 'var(--text-2)', fontStyle: 'italic',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {info.detail}
          </span>
        </div>

        {elapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 10 }}
          >
            <Clock size={9} color="rgba(52,211,153,0.6)" />
            <span className="mono" style={{
              fontSize: 11, fontWeight: 700,
              color: 'rgba(52,211,153,0.85)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.4px',
            }}>
              {elapsed}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function ErrorCard({ name }: { name: string }) {
  const info = AGENT_INFO[name];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring' as const, stiffness: 340, damping: 26 }}
      style={{
        padding: '9px 14px',
        background: 'rgba(248,113,113,0.04)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertTriangle size={10} color="var(--danger)" />
        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', letterSpacing: '0.5px' }}>
          {name}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(248,113,113,0.6)', fontStyle: 'italic' }}>
          {info.desc}
        </span>
      </div>
      <span style={{ fontSize: 9, color: 'var(--danger)', opacity: 0.7, fontStyle: 'italic' }}>errore</span>
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.025 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 3 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 500, damping: 30 } },
};

export function AgentGrid({ agents }: { agents: SystemState['agents'] }) {
  const runningAgents = AGENTS.filter(a => agents[a]?.status === 'running');
  const errorAgents   = AGENTS.filter(a => agents[a]?.status === 'error');
  const active        = runningAgents.length + errorAgents.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p className="label">agenti</p>
          <AnimatePresence mode="wait">
            {runningAgents.length > 0 ? (
              <motion.span key="run"
                initial={{ opacity: 0, scale: 0.8, y: 3 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -3 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 9, fontWeight: 700,
                  color: 'var(--accent)', padding: '2px 8px',
                  background: 'rgba(52,211,153,0.1)',
                  border: '1px solid rgba(52,211,153,0.22)',
                  borderRadius: 4,
                }}
              >
                <motion.span animate={{ opacity: [1, 0.25, 1] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  ●
                </motion.span>
                {runningAgents.length} {runningAgents.length === 1 ? 'attivo' : 'attivi'}
              </motion.span>
            ) : errorAgents.length > 0 ? (
              <motion.span key="err"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{
                  fontSize: 9, fontWeight: 700,
                  color: 'var(--danger)', padding: '2px 8px',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.22)',
                  borderRadius: 4,
                }}
              >
                {errorAgents.length} {errorAgents.length === 1 ? 'errore' : 'errori'}
              </motion.span>
            ) : (
              <motion.span key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)' }}
              >
                tutti in standby
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {active > 0 && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Zap size={9} color="var(--accent)" />
              <span className="mono" style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>LIVE</span>
            </motion.div>
          )}
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>{AGENTS.length} agenti</span>
        </div>
      </div>

      {/* Live activity area — runs + errors shown as expanded cards */}
      <AnimatePresence>
        {(runningAgents.length > 0 || errorAgents.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden', marginBottom: 8 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 2 }}>
              {runningAgents.map(a => (
                <RunningCard key={a} name={a} lastRun={agents[a]?.last_run ?? null} />
              ))}
              {errorAgents.map(a => (
                <ErrorCard key={a} name={a} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact roster — all agents, always visible */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}
      >
        {AGENTS.map(a => {
          const st      = agents[a]?.status ?? 'idle';
          const running = st === 'running';
          const error   = st === 'error';
          const lastRun = agents[a]?.last_run;
          const timeStr = lastRun
            ? new Date(lastRun).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
            : null;

          // Weekly quota badge — solo per PUBLISHER
          const weeklyUsed = a === 'PUBLISHER' ? (agents[a]?.weekly_used as number | undefined) : undefined;
          const weeklyMax  = a === 'PUBLISHER' ? (agents[a]?.weekly_max  as number | undefined) : undefined;
          const weeklyPct  = (weeklyUsed != null && weeklyMax != null && weeklyMax > 0)
            ? Math.round((weeklyUsed / weeklyMax) * 100)
            : null;
          // Warn se ≥ 75% della quota usabile (= 75% di 40 = 30)
          const quotaWarn = weeklyPct != null && weeklyPct >= 75;
          const quotaCrit = weeklyPct != null && weeklyPct >= 95;

          return (
            <motion.div
              key={a}
              variants={itemVariants}
              whileHover={{ y: -1, borderColor: (running ? 'rgba(52,211,153,0.32)' : error ? 'rgba(248,113,113,0.3)' : 'var(--border-hi)') as never }}
              transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
              style={{
                padding: '7px 10px',
                background: running
                  ? 'rgba(52,211,153,0.04)'
                  : error
                  ? 'rgba(248,113,113,0.03)'
                  : 'var(--surf-1)',
                border: `1px solid ${
                  running ? 'rgba(52,211,153,0.14)' :
                  error   ? 'rgba(248,113,113,0.12)' :
                            'var(--border)'}`,
                borderRadius: 7,
                cursor: 'default',
                transition: 'background 0.2s, border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: timeStr || weeklyPct != null ? 4 : 0 }}>
                <LiveDot running={running} error={error} />
                <span className="mono" style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.4px',
                  color: running ? 'var(--accent)' : error ? 'var(--danger)' : 'var(--text-2)',
                  flexShrink: 0,
                }}>
                  {a}
                </span>
              </div>
              {timeStr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, paddingLeft: 12, marginBottom: weeklyPct != null ? 4 : 0 }}>
                  <Clock size={7} color="var(--text-3)" />
                  <span className="mono" style={{
                    fontSize: 8, color: running ? 'rgba(52,211,153,0.6)' : 'var(--text-3)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {timeStr}
                  </span>
                </div>
              )}
              {/* Weekly quota bar — solo PUBLISHER */}
              {weeklyPct != null && weeklyMax != null && (
                <div style={{ paddingLeft: 12 }}>
                  <div style={{
                    height: 3, borderRadius: 2,
                    background: 'var(--surf-3)',
                    overflow: 'hidden',
                    marginBottom: 2,
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(weeklyPct, 100)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: quotaCrit
                          ? 'var(--danger)'
                          : quotaWarn
                          ? 'oklch(78% 0.16 55)'
                          : 'var(--accent)',
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize: 7.5, color: quotaCrit ? 'var(--danger)' : quotaWarn ? 'oklch(78% 0.16 55)' : 'var(--text-3)',
                    fontFamily: 'Geist Mono, monospace',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {weeklyUsed}/{weeklyMax} settimana
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
