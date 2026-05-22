import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import { AgentGrid } from './AgentGrid';
import { useCountUp } from '../hooks/useCountUp';
import { getWeekDays, sameDay } from '../utils/dateUtils';
import type { SystemState, VideoItem } from '../types';

interface Props {
  state: SystemState;
  queue: VideoItem[];
}

function BigNum({ value, color, size = 36 }: { value: number; color?: string; size?: number }) {
  const count = useCountUp(value);
  return (
    <span style={{
      fontFamily: 'NeuePower, Geist, sans-serif',
      fontSize: size, fontWeight: 900, lineHeight: 1,
      color: color ?? 'var(--text)',
      letterSpacing: '-1.5px',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {count}
    </span>
  );
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cellVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
};

export function Statistics({ state, queue }: Props) {
  const { buffer } = state;
  const pct      = Math.min(1, buffer.ready_videos / Math.max(1, buffer.target_days));
  const pctColor = pct >= 0.7 ? 'var(--accent)' : pct >= 0.4 ? 'var(--warn)' : 'var(--danger)';
  const pctInt   = Math.round(pct * 100);
  const ritmo    = buffer.ready_videos / Math.max(1, buffer.target_days);

  const days = getWeekDays();
  const weekData = days.map(day => ({
    d: day.label.slice(0, 1),
    label: day.label,
    v: queue.filter(v => v.scheduled_at ? sameDay(v.scheduled_at, day.date) : day.isToday).length,
    today: day.isToday,
  }));

  const statusCounts = {
    scripted:     queue.filter(v => v.status === 'scripted').length,
    assets_ready: queue.filter(v => v.status === 'assets_ready').length,
    rendered:     queue.filter(v => v.status === 'rendered').length,
    ready:        queue.filter(v => v.status === 'ready').length,
  };
  const pipelineData = [
    { stage: 'Script', v: statusCounts.scripted,     color: 'rgba(255,255,255,0.3)' },
    { stage: 'Asset',  v: statusCounts.assets_ready, color: 'var(--warn)' },
    { stage: 'Render', v: statusCounts.rendered,     color: '#60a5fa' },
    { stage: 'Pronto', v: statusCounts.ready,        color: 'var(--accent)' },
  ];

  const totalWeek     = weekData.reduce((s, d) => s + d.v, 0);
  const totalPipeline = pipelineData.reduce((s, d) => s + d.v, 0);
  const published     = queue.filter(v => v.status === 'published').length;

  // Tooltip style uses CSS vars so it adapts to theme
  const tooltipStyle = {
    background: 'var(--surf-3)',
    border: '1px solid var(--border-hi)',
    borderRadius: 8, fontSize: 11, color: 'var(--text)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      style={{ padding: '14px 18px 18px' }}
    >
      <h2 className="section-title" style={{ marginBottom: 12 }}>STATISTICHE.</h2>

      {/* ── Metrics — ASYMMETRIC layout (2fr + 1fr + 1fr) ─── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 6,
          marginBottom: 10,
        }}
      >
        {/* Buffer — dominant cell, takes 2x width */}
        <motion.div variants={cellVariants} style={{
          padding: '14px 18px',
          background: pct >= 0.7 ? 'rgba(52,211,153,0.04)' : 'var(--surf-1)',
          border: `1px solid ${pct >= 0.7 ? 'rgba(52,211,153,0.16)' : 'var(--border)'}`,
          borderRadius: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Buffer
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <BigNum value={buffer.ready_videos} color={pct >= 0.7 ? 'var(--accent)' : 'var(--text)'} size={44} />
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>/ {buffer.target_days}g</span>
            <span className="mono" style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700,
              color: ritmo >= 1 ? 'var(--accent)' : 'var(--warn)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {ritmo.toFixed(1)} <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 400 }}>v/g</span>
            </span>
          </div>

          {/* Animated progress bar */}
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 4, overflow: 'hidden', marginBottom: 5 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pctInt}%` }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                style={{ height: '100%', background: pctColor, borderRadius: 4, position: 'relative', overflow: 'hidden' }}
              >
                <motion.div
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2.5 }}
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  }}
                />
              </motion.div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: pctColor, fontWeight: 600 }}>{pctInt}%</span>
              {buffer.next_publish && (
                <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  prox{' '}
                  <span className="mono" style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                    {new Date(buffer.next_publish).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Settimana */}
        <motion.div variants={cellVariants} style={{
          padding: '14px 14px',
          background: 'var(--surf-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Settimana
          </div>
          <BigNum value={totalWeek} size={36} />
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
              <span style={{ color: published > 0 ? 'var(--accent)' : 'var(--text-3)', fontWeight: published > 0 ? 600 : 400 }}>
                {published}
              </span>
              <span style={{ opacity: 0.6 }}> pubblicati</span>
            </div>
          </div>
        </motion.div>

        {/* Pipeline */}
        <motion.div variants={cellVariants} style={{
          padding: '14px 14px',
          background: 'var(--surf-1)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Pipeline
          </div>
          <BigNum value={totalPipeline} size={36} />
          <div style={{ display: 'flex', gap: 3, marginTop: 8, alignItems: 'flex-end' }}>
            {pipelineData.map(s => (
              <motion.div
                key={s.stage}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                style={{ transformOrigin: 'bottom' }}
                title={`${s.stage}: ${s.v}`}
              >
                <div style={{
                  width: 14,
                  height: Math.max(3, Math.round((s.v / Math.max(1, totalPipeline)) * 22)),
                  background: s.color, borderRadius: 2,
                  opacity: s.v > 0 ? 0.85 : 0.12,
                }} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Charts row ─────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
        border: '1px solid var(--border)', borderRadius: 12,
        overflow: 'hidden', marginBottom: 10,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}>
        <div style={{ padding: '12px 14px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Video / giorno
            </span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
              {totalWeek}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={72}>
            <BarChart data={weekData} barSize={16} margin={{ top: 2, right: 0, left: -32, bottom: 0 }}>
              <XAxis
                dataKey="d"
                tick={{ fill: 'var(--text-3)', fontSize: 9, fontFamily: 'Geist Mono, monospace' }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(() => { /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ return (_v: any, _n: any, item: any) => [item.payload.v, item.payload.label]; })()}
                cursor={{ fill: 'rgba(128,128,128,0.06)' }}
              />
              <Bar dataKey="v" radius={[4, 4, 0, 0]} isAnimationActive animationBegin={400} animationDuration={900} animationEasing="ease-out">
                {weekData.map((entry, i) => (
                  <Cell key={i} fill={entry.today ? 'var(--accent)' : 'rgba(52,211,153,0.4)'} opacity={entry.v === 0 ? 0.2 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'var(--border)' }} />

        <div style={{ padding: '12px 14px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Pipeline
            </span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
              {totalPipeline}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={72}>
            <AreaChart data={pipelineData} margin={{ top: 2, right: 0, left: -32, bottom: 0 }}>
              <defs>
                <linearGradient id="pipeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="stage"
                tick={{ fill: 'var(--text-3)', fontSize: 9, fontFamily: 'Geist, sans-serif' }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: 'rgba(128,128,128,0.1)', strokeWidth: 1 }} />
              <Area
                type="monotone" dataKey="v"
                stroke="var(--accent)" strokeWidth={1.5}
                fill="url(#pipeGrad)"
                dot={{ fill: 'var(--accent)', strokeWidth: 0, r: 3 }}
                isAnimationActive animationBegin={500} animationDuration={1000} animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Agent grid ─────────────────────────────────── */}
      <AgentGrid agents={state.agents} />
    </motion.div>
  );
}
