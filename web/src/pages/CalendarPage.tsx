import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { sameDay } from '../utils/dateUtils';
import type { VideoItem } from '../types';

const STATUS_COLOR: Record<string, string> = {
  ready:        'var(--accent)',
  rendered:     '#60a5fa',
  assets_ready: 'var(--warn)',
  scripted:     'var(--text-3)',
  needs_fix:    'var(--danger)',
  published:    'rgba(52,211,153,0.55)',
};

type VideoType = 'TechNews' | 'Tutorial' | 'BestOf';
const VIDEO_TYPES: VideoType[] = ['TechNews', 'Tutorial', 'BestOf'];
const TYPE_COLOR: Record<VideoType, string> = {
  TechNews: '#60a5fa',
  Tutorial: 'var(--warn)',
  BestOf:   'var(--accent)',
};
const TYPE_SHORT: Record<VideoType, string> = {
  TechNews: 'NEWS',
  Tutorial: 'TUT',
  BestOf:   'BEST',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7; // Monday-first
}
function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const MONTH_NAMES = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
];

// Reusable type picker (same logic as Calendar.tsx)
function TypePicker({
  current, onSelect, onClose,
}: { current: VideoType | null; onSelect: (t: VideoType | null) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.94 }}
      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
      style={{
        position: 'absolute', top: 'calc(100% + 3px)', left: 0, zIndex: 50,
        background: 'var(--surf-3)', border: '1px solid var(--border-hi)',
        borderRadius: 8, padding: 4, display: 'flex', flexDirection: 'column', gap: 2,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 90,
      }}
    >
      {VIDEO_TYPES.map(t => (
        <button key={t} onClick={() => { onSelect(t); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 5,
            background: current === t ? `${TYPE_COLOR[t]}18` : 'transparent',
            border: current === t ? `1px solid ${TYPE_COLOR[t]}35` : '1px solid transparent',
            cursor: 'pointer', textAlign: 'left',
          }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: TYPE_COLOR[t], flexShrink: 0, opacity: 0.8 }} />
          <span style={{ fontSize: 9, color: TYPE_COLOR[t], fontWeight: 700 }}>{TYPE_SHORT[t]}</span>
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>{t}</span>
        </button>
      ))}
      {current && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <button onClick={() => { onSelect(null); onClose(); }}
            style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'left' }}>
            rimuovi
          </button>
        </>
      )}
    </motion.div>
  );
}

interface Props {
  queue: VideoItem[];
  onVideoClick: (v: VideoItem) => void;
}

export function CalendarPage({ queue, onVideoClick }: Props) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [dayTopics, setDayTopics] = useState<Record<string, string>>({});
  const [dayTypes, setDayTypes]   = useState<Record<string, VideoType | null>>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [pickerDay, setPickerDay]   = useState<string | null>(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const rowCount = cells.length / 7;

  function videosForDay(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    return queue.filter(v => v.scheduled_at ? sameDay(v.scheduled_at, date) : false);
  }
  function isToday(day: number) {
    return day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 28px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <h1 style={{
            fontFamily: 'NeuePower, Geist, sans-serif',
            fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px', color: 'var(--text)',
          }}>
            CALENDARIO.
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
            pianificazione mensile
          </p>

          {/* Type legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 8 }}>
            {VIDEO_TYPES.map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: TYPE_COLOR[t], opacity: 0.7, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <motion.button onClick={prevMonth}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}>
            <ChevronLeft size={13} />
          </motion.button>
          <span style={{
            fontFamily: 'NeuePower, Geist, sans-serif',
            fontSize: 15, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.2px',
            minWidth: 150, textAlign: 'center',
          }}>
            {MONTH_NAMES[viewMonth]} <span style={{ color: 'var(--text-3)' }}>{viewYear}</span>
          </span>
          <motion.button onClick={nextMonth}
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}>
            <ChevronRight size={13} />
          </motion.button>
        </div>
      </div>

      {/* Day labels row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
        padding: '8px 20px 0', gap: 4, flexShrink: 0,
      }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 9, fontWeight: 700,
            letterSpacing: '1.2px', color: 'var(--text-3)',
            textTransform: 'uppercase', paddingBottom: 6,
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — fills remaining space, no scroll */}
      <div style={{ flex: 1, padding: '0 20px 16px', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: `repeat(${rowCount}, 1fr)`,
          gap: 4,
          height: '100%',
        }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const videos = videosForDay(day);
            const todayCell = isToday(day);
            const dk = dayKey(viewYear, viewMonth, day);
            const topic = dayTopics[dk] ?? null;
            const vtype = dayTypes[dk] ?? null;

            return (
              <motion.div
                key={`${viewYear}-${viewMonth}-${day}`}
                layout
                whileHover={!todayCell ? { borderColor: 'var(--border-hi)' as never } : {}}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'relative',
                  background: todayCell ? 'rgba(52,211,153,0.05)' : 'var(--surf-1)',
                  border: `1px solid ${todayCell ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                  borderRadius: 9,
                  padding: '6px 7px 5px',
                  display: 'flex', flexDirection: 'column',
                  overflow: 'hidden',
                  boxShadow: todayCell
                    ? 'inset 0 1px 0 rgba(52,211,153,0.1)'
                    : 'inset 0 1px 0 var(--inset-hi)',
                  transition: 'border-color 0.15s',
                }}
              >
                {/* Day number + type chip */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3, flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'NeuePower, Geist, sans-serif',
                    fontSize: 17, fontWeight: 900, lineHeight: 1,
                    color: todayCell ? 'var(--accent)' : 'var(--text)',
                    letterSpacing: '-0.3px', fontVariantNumeric: 'tabular-nums',
                  }}>
                    {day}
                  </div>

                  {/* Type chip */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <motion.button
                      onClick={() => setPickerDay(pickerDay === dk ? null : dk)}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
                      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                      style={{
                        background: vtype ? `${TYPE_COLOR[vtype as VideoType]}18` : 'transparent',
                        border: vtype
                          ? `1px solid ${TYPE_COLOR[vtype as VideoType]}35`
                          : '1px dashed var(--border)',
                        borderRadius: 4, padding: '1px 4px', cursor: 'pointer', minWidth: 22,
                      }}>
                      {vtype ? (
                        <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.3px', color: TYPE_COLOR[vtype as VideoType] }}>
                          {TYPE_SHORT[vtype as VideoType]}
                        </span>
                      ) : (
                        <span style={{ fontSize: 8, color: 'var(--text-3)', opacity: 0.35 }}>+</span>
                      )}
                    </motion.button>
                    <AnimatePresence>
                      {pickerDay === dk && (
                        <TypePicker
                          current={vtype}
                          onSelect={t => setDayTypes(prev => ({ ...prev, [dk]: t }))}
                          onClose={() => setPickerDay(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Topic override */}
                {editingDay === dk ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { setDayTopics(prev => ({ ...prev, [dk]: editValue.trim() })); setEditingDay(null); }
                      if (e.key === 'Escape') setEditingDay(null);
                    }}
                    onBlur={() => { setDayTopics(prev => ({ ...prev, [dk]: editValue.trim() })); setEditingDay(null); }}
                    placeholder="argomento..."
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(52,211,153,0.3)',
                      color: 'var(--accent)', fontSize: 8, outline: 'none',
                      padding: '1px 0', fontFamily: 'Geist, sans-serif', fontStyle: 'italic',
                      caretColor: 'var(--accent)', marginBottom: 3, flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    onClick={() => { setEditingDay(dk); setEditValue(topic ?? ''); }}
                    style={{
                      fontSize: 8, color: topic ? 'var(--accent)' : 'var(--text-3)',
                      fontStyle: 'italic', cursor: 'text', marginBottom: 4, flexShrink: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      opacity: topic ? 0.8 : 0.45,
                    }}
                  >
                    {topic || 'auto'}
                  </div>
                )}

                {/* Videos */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
                  {videos.slice(0, 3).map(v => (
                    <motion.button
                      key={v.id}
                      onClick={() => onVideoClick(v)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      title={v.title}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px',
                        background: 'var(--surf-2)', border: '1px solid var(--border-hi)',
                        borderRadius: 4, cursor: 'pointer', textAlign: 'left', flexShrink: 0,
                      }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: '50%', flexShrink: 0,
                        background: STATUS_COLOR[v.status] ?? 'var(--text-3)',
                      }} />
                      <span style={{
                        fontSize: 8, color: 'var(--text-2)', lineHeight: 1.2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {v.title}
                      </span>
                    </motion.button>
                  ))}
                  {videos.length > 3 && (
                    <span style={{ fontSize: 8, color: 'var(--text-3)', fontStyle: 'italic', paddingLeft: 4 }}>
                      +{videos.length - 3}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
