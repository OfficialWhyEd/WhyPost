import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, ChevronRight } from 'lucide-react';
import type { VideoItem } from '../types';

const STATUS_COLOR: Record<string, string> = {
  ready:        'var(--accent)',
  rendered:     '#60a5fa',
  assets_ready: 'var(--warn)',
  scripted:     'var(--text-2)',
  needs_fix:    'var(--danger)',
  published:    'rgba(52,211,153,0.45)',
};
const STATUS_LABEL: Record<string, string> = {
  scripted:     'Script',
  assets_ready: 'Asset pronti',
  rendered:     'Renderizzato',
  ready:        'Pronto',
  published:    'Pubblicato',
  needs_fix:    'Da correggere',
};
const STATUS_ORDER = ['needs_fix','ready','rendered','assets_ready','scripted','published'];
const TABS = ['tutti', ...STATUS_ORDER] as const;
type Tab = typeof TABS[number];

const PLAT_SHORT: Record<string, string> = { instagram: 'IG', tiktok: 'TK', youtube: 'YT' };

function fmt(s: string | null) {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
}

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};
const rowVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
};

interface Props {
  queue: VideoItem[];
  onVideoClick: (v: VideoItem) => void;
}

export function QueuePage({ queue, onVideoClick }: Props) {
  const [tab, setTab] = useState<Tab>('tutti');
  const [search, setSearch] = useState('');

  const filtered = queue
    .filter(v => tab === 'tutti' || v.status === tab)
    .filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()));

  const countFor = (t: Tab) => t === 'tutti' ? queue.length : queue.filter(v => v.status === t).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Page header */}
      <div style={{
        padding: '20px 28px 0',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surf-1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{
              fontFamily: 'NeuePower, Geist, sans-serif',
              fontSize: 22, fontWeight: 900, letterSpacing: '-0.3px',
              color: 'var(--text)',
            }}>
              CODA VIDEO.
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
              {queue.length} video in pipeline
            </p>
          </div>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--surf-2)', border: '1px solid var(--border)',
            borderRadius: 9, padding: '6px 12px',
          }}>
            <Search size={12} color="var(--text-3)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="cerca titolo…"
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 11, color: 'var(--text)', width: 160,
                fontFamily: 'Geist, sans-serif', fontStyle: 'italic',
                caretColor: 'var(--accent)',
              }}
            />
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(t => {
            const count = countFor(t);
            if (count === 0 && t !== 'tutti') return null;
            const active = tab === t;
            return (
              <motion.button
                key={t}
                onClick={() => setTab(t)}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  color: active
                    ? (t === 'tutti' ? 'var(--text)' : STATUS_COLOR[t] ?? 'var(--text)')
                    : 'var(--text-3)',
                  borderBottom: active ? `2px solid ${t === 'tutti' ? 'var(--text)' : STATUS_COLOR[t] ?? 'var(--text)'}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s',
                }}
              >
                {t === 'tutti' ? 'Tutti' : STATUS_LABEL[t] ?? t}
                <span className="mono" style={{
                  fontSize: 9, fontWeight: 700,
                  color: active ? 'inherit' : 'var(--text-3)',
                  opacity: active ? 0.7 : 1,
                }}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60%', gap: 10,
            color: 'var(--text-3)',
          }}>
            <SlidersHorizontal size={28} opacity={0.3} />
            <p style={{ fontSize: 12, fontStyle: 'italic' }}>Nessun video trovato</p>
          </div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
          >
            <AnimatePresence>
              {filtered.map(v => (
                <motion.button
                  key={v.id}
                  variants={rowVariants}
                  layout
                  onClick={() => onVideoClick(v)}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px 1fr auto auto auto',
                    alignItems: 'center', gap: 14,
                    padding: '13px 16px',
                    background: 'var(--surf-1)',
                    border: `1px solid ${v.status === 'needs_fix' ? 'rgba(248,113,113,0.12)' : v.status === 'ready' ? 'rgba(52,211,153,0.1)' : 'var(--border)'}`,
                    borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    boxShadow: 'inset 0 1px 0 var(--inset-hi)',
                    transition: 'background 0.15s, border-color 0.15s',
                    width: '100%',
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: STATUS_COLOR[v.status] ?? 'var(--text-3)',
                    boxShadow: v.status === 'needs_fix'
                      ? '0 0 6px rgba(248,113,113,0.5)'
                      : v.status === 'ready'
                      ? '0 0 6px rgba(52,211,153,0.4)'
                      : 'none',
                  }} />

                  {/* Title */}
                  <div>
                    <span style={{
                      fontSize: 13, fontWeight: 500, color: v.status === 'published' ? 'var(--text-3)' : 'var(--text)',
                      lineHeight: 1.4, display: 'block',
                    }}>
                      {v.title}
                    </span>
                    {v.video_type && (
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 1, display: 'block' }}>
                        {v.video_type}
                      </span>
                    )}
                  </div>

                  {/* Platforms */}
                  <div style={{ display: 'flex', gap: 3 }}>
                    {(v.platform ?? []).map(p => (
                      <span key={p} className="mono" style={{
                        fontSize: 9, fontWeight: 700,
                        padding: '2px 6px', borderRadius: 4,
                        background: 'var(--surf-2)',
                        color: 'var(--text-3)', letterSpacing: '0.5px',
                      }}>
                        {PLAT_SHORT[p] ?? p.slice(0,2).toUpperCase()}
                      </span>
                    ))}
                  </div>

                  {/* Date */}
                  <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', width: 56, textAlign: 'right' }}>
                    {fmt(v.scheduled_at)}
                  </span>

                  {/* Status label */}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: STATUS_COLOR[v.status] ?? 'var(--text-3)',
                    width: 90, textAlign: 'right',
                  }}>
                    {STATUS_LABEL[v.status] ?? v.status}
                    <ChevronRight size={11} style={{ display: 'inline', marginLeft: 2, opacity: 0.5 }} />
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
