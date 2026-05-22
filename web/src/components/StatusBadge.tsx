import { motion } from 'framer-motion';
import { memo } from 'react';

interface Props { status: string; serverOk: boolean; }

// Isolated perpetual dot pulse
const PulseDot = memo(function PulseDot({ color, animate: shouldPulse }: { color: string; animate: boolean }) {
  return (
    <motion.div
      style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }}
      animate={shouldPulse ? { scale: [1, 1.4, 1], opacity: [1, 0.35, 1] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
});

export function StatusBadge({ status, serverOk }: Props) {
  const offline = !serverOk;
  const running = status === 'running';

  const accent = offline ? 'var(--danger)' : running ? 'var(--accent)' : 'var(--text-3)';
  const bg = offline
    ? 'rgba(248,113,113,0.08)'
    : running
    ? 'rgba(52,211,153,0.08)'
    : 'var(--surf-1)';
  const borderColor = offline
    ? 'rgba(248,113,113,0.18)'
    : running
    ? 'rgba(52,211,153,0.16)'
    : 'var(--border)';

  return (
    <motion.div
      layout
      transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '5px 12px',
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 20,
        /* Inner refraction */
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <PulseDot color={accent} animate={running} />
      <motion.span
        layout
        className="mono"
        style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.6px', color: accent }}
      >
        {offline ? 'offline' : running ? 'running' : 'idle'}
      </motion.span>
    </motion.div>
  );
}
