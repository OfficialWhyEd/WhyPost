import { motion } from 'framer-motion';
import { Brain, AlertTriangle, MessageSquareDot, Video, Star, TrendingUp } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import type { MemorySummary } from '../types';

interface Props {
  memory: MemorySummary | null;
}

function Metric({
  label, value, sub, color, icon: Icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color?: string;
  icon: React.FC<{ size?: number }>;
}) {
  const count = useCountUp(value);
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring' as const, stiffness: 400, damping: 28 }}
      style={{
        padding: '18px 20px',
        background: 'var(--surf-1)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          {label}
        </span>
        <Icon size={14} />
      </div>
      <div style={{
        fontFamily: 'NeuePower, Geist, sans-serif',
        fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: '-1px',
        color: color ?? 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {Number.isInteger(value) ? count : value.toFixed(1)}
      </div>
      {sub && (
        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

export function MemoryPage({ memory }: Props) {
  if (!memory) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
        <Brain size={32} style={{ color: "var(--text-3)" }} />
        <p style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Server offline — memoria non disponibile</p>
      </div>
    );
  }

  const metrics = [
    { label: 'Errori appresi',   value: memory.total_errors_learned, color: 'var(--text)',   icon: Brain,           sub: 'pattern di errore memorizzati' },
    { label: 'Blocchi attivi',   value: memory.active_blocks,        color: memory.active_blocks > 0 ? 'var(--danger)' : 'var(--text)', icon: AlertTriangle, sub: 'contenuti bloccati per policy' },
    { label: 'Tue correzioni',   value: memory.user_corrections,     color: 'var(--accent)',  icon: MessageSquareDot, sub: 'feedback applicati al modello' },
    { label: 'Video analizzati', value: memory.videos_analyzed,      color: 'var(--text)',    icon: Video,           sub: 'video nel dataset di training' },
    { label: 'Score migliore',   value: memory.best_video_score,     color: 'var(--warn)',    icon: Star,            sub: 'punteggio massimo registrato' },
    { label: 'Tasso correzione', value: memory.user_corrections / Math.max(1, memory.videos_analyzed) * 100, color: 'var(--info)', icon: TrendingUp, sub: '% video corretti manualmente' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', overflowY: 'auto', padding: '24px 28px 32px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'NeuePower, Geist, sans-serif',
          fontSize: 22, fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text)',
        }}>
          MEMORIA AI.
        </h1>
        <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
          Conoscenza accumulata dal sistema nel tempo
        </p>
      </div>

      {/* Metrics grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}
      >
        {metrics.map(m => (
          <motion.div key={m.label} variants={itemVariants}>
            <Metric {...m} />
          </motion.div>
        ))}
      </motion.div>

      {/* Info panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{
          padding: '16px 20px',
          background: 'var(--surf-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
          Come funziona la memoria
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { step: '01', text: 'Ogni video prodotto viene analizzato per qualità, engagement e problemi riscontrati.' },
            { step: '02', text: 'Le tue correzioni manuali vengono memorizzate e applicate ai prossimi script.' },
            { step: '03', text: 'I pattern di errore ripetuti vengono bloccati prima della generazione.' },
            { step: '04', text: 'Lo score migliore diventa il benchmark per i video futuri.' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="mono" style={{
                fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.18)',
                borderRadius: 4, padding: '2px 5px', flexShrink: 0, marginTop: 1,
              }}>
                {step}
              </span>
              <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
