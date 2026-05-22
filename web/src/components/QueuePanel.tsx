import { motion, AnimatePresence } from 'framer-motion';
import type { VideoItem } from '../types';

const STATUS_COLOR: Record<string, string> = {
  ready: 'var(--accent)',
  rendered: '#60a5fa',
  assets_ready: 'var(--warn)',
  scripted: 'rgba(255,255,255,0.38)',
  needs_fix: 'var(--danger)',
  published: 'rgba(52,211,153,0.45)',
};

const STATUS_LABEL: Record<string, string> = {
  scripted: 'Script',
  assets_ready: 'Asset pronti',
  rendered: 'Renderizzato',
  ready: 'Pronto',
  published: 'Pubblicato',
  needs_fix: 'Da correggere',
};

const STATUS_ORDER = ['needs_fix', 'ready', 'rendered'];

const PLAT_SHORT: Record<string, string> = {
  instagram: 'IG', tiktok: 'TK', youtube: 'YT',
};

function formatDate(s: string | null): string {
  if (!s) return '';
  try {
    return new Date(s).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

const groupVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
  exit: { opacity: 0, x: 8, transition: { duration: 0.14 } },
};

interface Props {
  queue: VideoItem[];
  onVideoClick: (v: VideoItem) => void;
}

export function QueuePanel({ queue, onVideoClick }: Props) {
  const groups = STATUS_ORDER
    .map(s => [s, queue.filter(v => v.status === s)] as [string, VideoItem[]])
    .filter(([, items]) => items.length > 0);

  return (
    <div style={{ padding: '16px 18px 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <h2 className="section-title">CODA VIDEO.</h2>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {queue.length} {queue.length === 1 ? 'video' : 'video'}
        </span>
      </div>

      {queue.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{
            padding: '36px 18px', textAlign: 'center',
            color: 'var(--text-3)', fontSize: 12, lineHeight: 1.7,
            border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 12,
          }}
        >
          Nessun video in coda.
          <br/>
          <span style={{ fontSize: 11 }}>Il sistema genererà automaticamente.</span>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {groups.map(([status, videos]) => (
            <div key={status}>
              {/* Group header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                paddingBottom: 7, borderBottom: `1px solid ${STATUS_COLOR[status] === 'var(--danger)' ? 'rgba(248,113,113,0.15)' : 'var(--border)'}`,
              }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: STATUS_COLOR[status],
                  boxShadow: status === 'needs_fix'
                    ? '0 0 8px rgba(248,113,113,0.6)'
                    : status === 'ready'
                    ? '0 0 8px rgba(52,211,153,0.5)'
                    : 'none',
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                  color: STATUS_COLOR[status],
                }}>
                  {STATUS_LABEL[status] ?? status}
                </span>
                <span className="mono" style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                  marginLeft: 'auto',
                  background: 'var(--surf-2)', border: '1px solid var(--border)',
                  borderRadius: 4, padding: '1px 6px', lineHeight: '16px',
                }}>
                  {videos.length}
                </span>
              </div>

              {/* Items — max 3 */}
              <motion.div
                variants={groupVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                <AnimatePresence mode="popLayout">
                  {videos.slice(0, 3).map(v => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      status={status}
                      onClick={() => onVideoClick(v)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          ))}

          {/* Footer summary */}
          <div style={{ textAlign: 'center', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
              {queue.length} video totali · apri Coda per vedere tutti
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, status, onClick }: { video: VideoItem; status: string; onClick: () => void }) {
  const urgent = status === 'needs_fix';
  const ready = status === 'ready';

  function onMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--sx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--sy', `${e.clientY - r.top}px`);
  }

  return (
    <motion.button
      variants={itemVariants}
      layout
      layoutId={video.id}
      onClick={onClick}
      onMouseMove={onMouseMove}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
      style={{
        '--sx': '50%', '--sy': '50%',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px',
        background: urgent
          ? 'rgba(248,113,113,0.04)'
          : ready
          ? 'rgba(52,211,153,0.03)'
          : 'var(--surf-1)',
        border: `1px solid ${
          urgent ? 'rgba(248,113,113,0.1)' :
          ready  ? 'rgba(52,211,153,0.09)' :
                   'var(--border)'}`,
        borderRadius: 10, cursor: 'pointer', textAlign: 'left', width: '100%',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'background 0.15s, border-color 0.15s',
      } as React.CSSProperties}
    >
      {/* Spotlight hover */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
        background: 'radial-gradient(circle 80px at var(--sx) var(--sy), rgba(52,211,153,0.06) 0%, transparent 100%)',
      }} />

      {/* Top row: title + arrow */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.4,
          color: status === 'published' ? 'var(--text-3)' : 'var(--text)',
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {video.title}
        </span>
        <span style={{ fontSize: 14, color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }}>›</span>
      </div>

      {/* Bottom row: platforms + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(video.platform ?? []).map(p => (
            <span key={p} className="mono" style={{
              fontSize: 9, fontWeight: 700,
              padding: '2px 5px', borderRadius: 4,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-3)',
              letterSpacing: '0.5px',
            }}>
              {PLAT_SHORT[p] ?? p.slice(0, 2).toUpperCase()}
            </span>
          ))}
          {video.language && (
            <span className="mono" style={{
              fontSize: 9, fontWeight: 600,
              padding: '2px 5px', borderRadius: 4,
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-3)',
            }}>
              {video.language.toUpperCase()}
            </span>
          )}
        </div>
        {video.scheduled_at && (
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {formatDate(video.scheduled_at)}
          </span>
        )}
      </div>
    </motion.button>
  );
}
