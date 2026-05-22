import { memo } from 'react';
import { motion } from 'framer-motion';
import { Play, Clock, AlertTriangle, CheckCircle2, Minus } from 'lucide-react';
import type { SystemState } from '../types';

const AGENTS = ['MAIN','EXEL','SCRIPT','ASSET','CLACK','SAFETY','PUBLISHER','TELEMETRY','OPUS'];

const AGENT_INFO: Record<string, { desc: string; detail: string; icon: string }> = {
  MAIN:      { desc: 'Orchestra',    detail: 'Coordina tutti gli agenti e decide la sequenza di esecuzione del pipeline.',       icon: '⬡' },
  EXEL:      { desc: 'Ricerca',      detail: 'Raccoglie trend, analizza competitor e suggerisce argomenti ad alto potenziale.',    icon: '◎' },
  SCRIPT:    { desc: 'Scrittura',    detail: 'Genera script ottimizzati per piattaforma con hook, corpo e CTA su misura.',        icon: '⟨⟩' },
  ASSET:     { desc: 'Audio/B-roll', detail: 'Sintetizza voce TTS, genera caption karaoke e seleziona clip B-roll.',              icon: '◈' },
  CLACK:     { desc: 'Rendering',    detail: 'Assembla tutti gli asset in video pronti tramite Remotion e ffmpeg.',               icon: '▷' },
  SAFETY:    { desc: 'Review',       detail: 'Verifica contenuto, copyright, policy platform e score qualità prima del rilascio.',icon: '◈' },
  PUBLISHER: { desc: 'Pubblica',     detail: 'Gestisce la pubblicazione schedulata su Instagram, TikTok e YouTube.',              icon: '↑' },
  TELEMETRY: { desc: 'Metriche',     detail: 'Raccoglie performance post-pubblicazione e alimenta la memoria AI.',                icon: '⌇' },
  OPUS:      { desc: 'Analisi',      detail: 'Analisi profonda su richiesta: outlier, pattern virali, suggerimenti strategici.',  icon: '◉' },
};

const LiveDot = memo(function LiveDot({ running, error }: { running: boolean; error: boolean }) {
  const color = running ? 'var(--accent)' : error ? 'var(--danger)' : 'var(--text-3)';
  return (
    <motion.div
      style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }}
      animate={running ? { scale: [1, 1.5, 1], opacity: [1, 0.35, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

interface Props {
  state: SystemState;
}

export function AgentsPage({ state }: Props) {
  const runningCount = AGENTS.filter(a => state.agents[a]?.status === 'running').length;
  const errorCount   = AGENTS.filter(a => state.agents[a]?.status === 'error').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', overflowY: 'auto', padding: '24px 28px 32px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'NeuePower, Geist, sans-serif',
            fontSize: 22, fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text)',
          }}>
            AGENTI.
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
            {AGENTS.length} agenti nel pipeline · sistema {state.system}
          </p>
        </div>

        {/* Status summary */}
        <div style={{ display: 'flex', gap: 8 }}>
          {runningCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.18)',
              borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'var(--accent)',
            }}>
              <Play size={10} fill="currentColor" /> {runningCount} in esecuzione
            </div>
          )}
          {errorCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.18)',
              borderRadius: 8, fontSize: 11, fontWeight: 600, color: 'var(--danger)',
            }}>
              <AlertTriangle size={10} /> {errorCount} errori
            </div>
          )}
          {runningCount === 0 && errorCount === 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              background: 'var(--surf-2)',
              border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 11, color: 'var(--text-3)',
            }}>
              <Minus size={10} /> tutti in standby
            </div>
          )}
        </div>
      </div>

      {/* Agent cards — asymmetric bento grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {AGENTS.map(a => {
          const st = state.agents[a]?.status ?? 'idle';
          const running = st === 'running';
          const error   = st === 'error';
          const lastRun = state.agents[a]?.last_run;
          const info    = AGENT_INFO[a];

          return (
            <motion.div
              key={a}
              variants={cardVariants}
              whileHover={{ y: -2 }}
              transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
              style={{
                padding: '16px 18px',
                background: running
                  ? 'rgba(52,211,153,0.04)'
                  : error
                  ? 'rgba(248,113,113,0.04)'
                  : 'var(--surf-1)',
                border: `1px solid ${
                  running ? 'rgba(52,211,153,0.15)' :
                  error   ? 'rgba(248,113,113,0.14)' :
                            'var(--border)'}`,
                borderRadius: 12,
                boxShadow: running
                  ? 'inset 0 1px 0 rgba(52,211,153,0.1)'
                  : 'inset 0 1px 0 var(--inset-hi)',
                transition: 'background 0.25s, border-color 0.2s',
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LiveDot running={running} error={error} />
                  <span className="mono" style={{
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.5px',
                    color: running ? 'var(--accent)' : error ? 'var(--danger)' : 'var(--text)',
                  }}>
                    {a}
                  </span>
                </div>
                {/* Status icon */}
                {running ? (
                  <Play size={11} color="var(--accent)" fill="var(--accent)" />
                ) : error ? (
                  <AlertTriangle size={11} color="var(--danger)" />
                ) : (
                  <CheckCircle2 size={11} color="var(--text-3)" />
                )}
              </div>

              {/* Description */}
              <p style={{
                fontSize: 11, color: 'var(--text-2)', marginBottom: 8, lineHeight: 1.5,
              }}>
                {info.detail}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 10, fontStyle: 'italic',
                  color: running ? 'var(--accent)' : 'var(--text-3)',
                }}>
                  {running ? 'in esecuzione…' : st === 'error' ? 'errore' : 'standby'}
                </span>
                {lastRun && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text-3)' }}>
                    <Clock size={8} />
                    <span className="mono">
                      {new Date(lastRun).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
