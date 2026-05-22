import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWeekDays, sameDay } from '../utils/dateUtils';
import type { VideoItem } from '../types';

const STATUS_COLOR: Record<string, string> = {
  ready: 'var(--accent)',
  rendered: '#60a5fa',
  assets_ready: 'var(--warn)',
  scripted: 'var(--text-3)',
  needs_fix: 'var(--danger)',
  published: 'rgba(52,211,153,0.45)',
};

type VideoType = 'WhyMultiTemplate' | 'Tutorial' | 'BestOf';
const VIDEO_TYPES: VideoType[] = ['WhyMultiTemplate', 'Tutorial', 'BestOf'];
const TYPE_COLOR: Record<VideoType, string> = {
  WhyMultiTemplate: '#60a5fa',
  Tutorial: 'var(--warn)',
  BestOf:   'var(--accent)',
};
const TYPE_SHORT: Record<VideoType, string> = {
  WhyMultiTemplate: 'MULTI',
  Tutorial: 'TUT',
  BestOf:   'BEST',
};

function dayKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function IgIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="#E1306C" strokeWidth="2.2"/>
      <circle cx="12" cy="12" r="4.5" stroke="#E1306C" strokeWidth="2.2"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="#E1306C"/>
    </svg>
  );
}
function TkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1.01-.07z" fill="var(--text)"/>
    </svg>
  );
}
function YtIcon() {
  return (
    <svg width="12" height="9" viewBox="0 0 24 17" fill="none" style={{ flexShrink: 0 }}>
      <rect width="24" height="17" rx="4" fill="#FF0000"/>
      <path d="M10 5l7 3.5L10 12V5z" fill="white"/>
    </svg>
  );
}
function PlatformIcon({ p }: { p: string }) {
  if (p === 'instagram') return <IgIcon />;
  if (p === 'tiktok') return <TkIcon />;
  if (p === 'youtube') return <YtIcon />;
  return null;
}

// Small type picker popover
function TypePicker({
  current,
  onSelect,
  onClose,
}: {
  current: VideoType | null;
  onSelect: (t: VideoType | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.94 }}
      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
      style={{
        position: 'absolute',
        top: 'calc(100% + 3px)',
        left: 0,
        zIndex: 50,
        background: 'var(--surf-3)',
        border: '1px solid var(--border-hi)',
        borderRadius: 8,
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        minWidth: 90,
      }}
    >
      {VIDEO_TYPES.map(t => (
        <button
          key={t}
          onClick={() => { onSelect(t); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 8px', borderRadius: 5,
            background: current === t ? `${TYPE_COLOR[t]}18` : 'transparent',
            border: current === t ? `1px solid ${TYPE_COLOR[t]}35` : '1px solid transparent',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: TYPE_COLOR[t], flexShrink: 0, opacity: 0.8,
          }} />
          <span style={{ fontSize: 9, color: TYPE_COLOR[t], fontWeight: 700, letterSpacing: '0.3px' }}>
            {TYPE_SHORT[t]}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>
            {t}
          </span>
        </button>
      ))}
      {current && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
          <button
            onClick={() => { onSelect(null); onClose(); }}
            style={{
              padding: '3px 8px', borderRadius: 5, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic', textAlign: 'left',
            }}
          >
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

export function Calendar({ queue, onVideoClick }: Props) {
  const days = getWeekDays();
  const todayIdx = days.findIndex(d => d.isToday);

  // Per-day overrides
  const [dayTopics, setDayTopics] = useState<Record<string, string>>({});
  const [dayTypes, setDayTypes]   = useState<Record<string, VideoType | null>>({});
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [pickerDay, setPickerDay]   = useState<string | null>(null);

  function commitTopic(dk: string) {
    const trimmed = editValue.trim();
    setDayTopics(prev => ({ ...prev, [dk]: trimmed }));
    setEditingDay(null);
  }

  return (
    <div style={{ padding: '18px 20px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <h2 className="section-title">WEEKLY CALENDAR.</h2>
        <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
          {days[0].date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </span>

        {/* Video type legend */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {VIDEO_TYPES.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: TYPE_COLOR[t], opacity: 0.7, flexShrink: 0,
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 8, color: 'var(--text-3)', letterSpacing: '0.3px' }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {days.map((day, idx) => {
          const videos = queue.filter(v =>
            v.scheduled_at ? sameDay(v.scheduled_at, day.date) : idx === todayIdx
          );
          const today = day.isToday;
          const dk    = dayKey(day.date);
          const topic = dayTopics[dk] ?? null;
          const vtype = dayTypes[dk] ?? null;

          return (
            <motion.div
              key={idx}
              whileHover={!today ? { borderColor: 'var(--border-hi)' as never } : {}}
              transition={{ duration: 0.15 }}
              style={{
                position: 'relative',
                background: today ? 'rgba(52,211,153,0.06)' : 'var(--surf-1)',
                border: `1px solid ${today ? 'rgba(52,211,153,0.2)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '8px 7px 7px',
                minHeight: 116,
                display: 'flex', flexDirection: 'column',
                boxShadow: today
                  ? 'inset 0 1px 0 rgba(52,211,153,0.12)'
                  : 'inset 0 1px 0 var(--inset-hi)',
                transition: 'background 0.2s, border-color 0.2s',
              }}
            >
              {/* Day header */}
              <div style={{ marginBottom: 6, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '1.4px',
                      color: today ? 'rgba(52,211,153,0.7)' : 'var(--text-3)',
                      marginBottom: 3, textTransform: 'uppercase',
                    }}>
                      {day.label}
                    </div>
                    <div style={{
                      fontFamily: 'NeuePower, Geist, sans-serif',
                      fontSize: 24, fontWeight: 900, lineHeight: 1,
                      color: today ? 'var(--accent)' : 'var(--text)',
                      letterSpacing: '-0.5px',
                    }}>
                      {day.date.getDate()}
                    </div>
                  </div>

                  {/* Video type chip — top right */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 1 }}>
                    <motion.button
                      onClick={() => setPickerDay(pickerDay === dk ? null : dk)}
                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
                      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                      title={vtype ? `Tipo: ${vtype} — clicca per cambiare` : 'Assegna tipo video'}
                      style={{
                        background: vtype ? `${TYPE_COLOR[vtype as VideoType]}18` : 'transparent',
                        border: vtype
                          ? `1px solid ${TYPE_COLOR[vtype as VideoType]}35`
                          : '1px dashed var(--border-hi)',
                        borderRadius: 6, padding: '2px 5px',
                        cursor: 'pointer',
                        minWidth: 28,
                      }}
                    >
                      {vtype ? (
                        <span style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.4px',
                          color: TYPE_COLOR[vtype as VideoType],
                          display: 'block',
                        }}>
                          {TYPE_SHORT[vtype as VideoType]}
                        </span>
                      ) : (
                        <span style={{ fontSize: 8, color: 'var(--text-3)', opacity: 0.3 }}>+</span>
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

                {/* Topic override — inline editable */}
                {editingDay === dk ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitTopic(dk);
                      if (e.key === 'Escape') setEditingDay(null);
                    }}
                    onBlur={() => commitTopic(dk)}
                    placeholder="argomento..."
                    style={{
                      marginTop: 4, width: '100%',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(52,211,153,0.3)',
                      color: 'var(--accent)', fontSize: 9, fontStyle: 'italic',
                      outline: 'none', padding: '1px 0',
                      fontFamily: 'Geist, sans-serif',
                      caretColor: 'var(--accent)',
                    }}
                  />
                ) : (
                  <div
                    onClick={() => { setEditingDay(dk); setEditValue(topic ?? ''); }}
                    title={topic ? `Override: ${topic} — clicca per modificare` : 'Clicca per impostare argomento'}
                    style={{
                      marginTop: 4, fontSize: 9,
                      color: topic ? 'var(--accent)' : 'var(--text-3)',
                      fontStyle: 'italic', cursor: 'text',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      opacity: topic ? 0.8 : 0.4,
                      paddingBottom: 1,
                      borderBottom: '1px solid transparent',
                      transition: 'opacity 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.opacity = '1';
                      (e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--border-hi)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.opacity = topic ? '0.8' : '0.4';
                      (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent';
                    }}
                  >
                    {topic || 'auto'}
                  </div>
                )}
              </div>

              {/* Video cards */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {videos.slice(0, 1).map(v => (
                  <motion.button
                    key={v.id}
                    onClick={() => onVideoClick(v)}
                    whileHover={{ scale: 1.02, x: 1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                    title={v.title}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      padding: '6px 7px',
                      background: 'var(--surf-2)',
                      border: '1px solid var(--border-hi)',
                      borderRadius: 6,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                      boxShadow: 'inset 0 1px 0 var(--inset-hi)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {(v.platform ?? []).map(p => (
                          <span key={p} style={{ display: 'flex', alignItems: 'center' }}>
                            <PlatformIcon p={p} />
                          </span>
                        ))}
                      </div>
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: STATUS_COLOR[v.status] ?? 'var(--text-3)',
                      }} />
                    </div>
                    <div style={{
                      fontSize: 10, lineHeight: 1.3,
                      color: 'var(--text-2)',
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}>
                      {v.title}
                    </div>
                  </motion.button>
                ))}
                {videos.length > 1 && (
                  <div style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', paddingTop: 2 }}>
                    +{videos.length - 1}
                  </div>
                )}

                {videos.length === 0 && (
                  <button
                    className="cal-empty"
                    style={{
                      flex: 1, minHeight: 22,
                      border: '1px dashed var(--border)',
                      borderRadius: 7,
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-3)',
                      transition: 'border-color 0.2s, color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(52,211,153,0.2)';
                      e.currentTarget.style.color = 'rgba(52,211,153,0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.color = 'var(--text-3)';
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
