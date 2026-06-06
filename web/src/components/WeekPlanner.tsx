import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader, Play, Sparkles } from 'lucide-react';

const API = '';

const DAY_NAMES  = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const FULL_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const SLOTS      = ['08:00', '13:30', '20:00'];

// Ease curve per slide settimana
const WEEK_EASE = [0.32, 0, 0.18, 1] as const;

interface ScheduledVideo {
  id: string;
  title: string;
  status: string;
  platform: string[];
  idea_title?: string;
  scheduled_at?: string;
}

interface DayPlan {
  date: string;
  dayLabel: string;
  fullName: string;
  topic: string;
  videos: ScheduledVideo[];
  isToday: boolean;
}

function getWeekDays(weekOffset = 0): DayPlan[] {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = (dow === 0 ? -6 : 1 - dow) + weekOffset * 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return {
      date: iso,
      dayLabel: DAY_NAMES[i],
      fullName: FULL_NAMES[i],
      topic: '',
      videos: [],
      isToday: iso === today.toISOString().slice(0, 10),
    };
  });
}

function weekLabel(offset: number): string {
  if (offset === 0) return 'Questa settimana';
  if (offset === 1) return 'Settimana prossima';
  if (offset === -1) return 'Settimana scorsa';
  const days = getWeekDays(offset);
  const from = new Date(days[0].date);
  const to   = new Date(days[6].date);
  return `${from.getDate()} – ${to.getDate()} ${to.toLocaleString('it-IT', { month: 'short' })}`;
}

async function fetchQueue(): Promise<ScheduledVideo[]> {
  try {
    const r = await fetch(`${API}/api/queue`);
    const d = await r.json();
    return (d.videos ?? []).filter(
      (v: ScheduledVideo) => ['ready', 'rendered', 'assets_ready'].includes(v.status)
    );
  } catch {
    return [];
  }
}

async function fetchConfig(): Promise<Record<string, string>> {
  try {
    const r = await fetch(`${API}/api/config`);
    const d = await r.json();
    return d.daily_topics ?? {};
  } catch {
    return {};
  }
}

async function planWeek(days: DayPlan[]): Promise<{ ok: boolean; message?: string }> {
  const payload = days.map(d => ({ date: d.date, topic: d.topic })).filter(d => d.topic);
  try {
    const r = await fetch(`${API}/api/plan-week`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: payload }),
    });
    return r.json();
  } catch {
    return { ok: false, message: 'Errore di rete' };
  }
}

export function WeekPlanner() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // slide direction
  const [days, setDays] = useState<DayPlan[]>(() => getWeekDays(0));
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const base = getWeekDays(weekOffset);
    Promise.all([fetchQueue(), fetchConfig()]).then(([videos, dailyTopics]) => {
      const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      setDays(base.map((d, i) => ({
        ...d,
        topic: dailyTopics[dayKeys[i]] ?? '',
        videos: videos.filter(v =>
          v.scheduled_at ? v.scheduled_at.slice(0, 10) === d.date : false
        ).slice(0, 3),
      })));
    });
  }, [weekOffset]);

  function navigate(delta: 1 | -1) {
    setDirection(delta);
    setWeekOffset(w => w + delta);
    setExpandedDay(null);
  }

  function setTopic(date: string, topic: string) {
    setDays(prev => prev.map(d => d.date === date ? { ...d, topic } : d));
  }

  async function handlePlan() {
    setPlanning(true);
    setFeedback('');
    const result = await planWeek(days);
    setPlanning(false);
    setFeedback(result.ok ? 'Settimana pianificata!' : (result.message ?? 'Errore'));
    setTimeout(() => setFeedback(''), 3000);
  }

  const totalScheduled = days.reduce((acc, d) => acc + d.videos.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header settimana ── */}
      <div style={{
        padding: '10px 14px 9px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Nav settimana */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}
          >
            <ChevronLeft size={12} />
          </motion.button>

          {/* Week label — slide animata */}
          <div style={{ overflow: 'hidden', flex: 1, textAlign: 'center', padding: '0 8px' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={weekOffset}
                initial={{ x: direction * 28, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction * -28, opacity: 0 }}
                transition={{ duration: 0.28, ease: WEEK_EASE }}
                style={{
                  display: 'block',
                  fontSize: 11, fontWeight: 700,
                  color: weekOffset === 0 ? 'var(--accent)' : 'var(--text-2)',
                  letterSpacing: '0.1px',
                }}
              >
                {weekLabel(weekOffset)}
              </motion.span>
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => navigate(1)}
            whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}
          >
            <ChevronRight size={12} />
          </motion.button>
        </div>

        {/* Summary row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={10} color="var(--text-3)" />
            <span style={{ fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.4px', fontWeight: 600 }}>
              {days[0]?.date} — {days[6]?.date}
            </span>
          </div>
          {totalScheduled > 0 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                fontSize: 9.5, color: 'var(--accent)',
                background: 'oklch(73% 0.14 158 / 0.08)',
                border: '1px solid oklch(73% 0.14 158 / 0.16)',
                borderRadius: 5, padding: '2px 7px', fontWeight: 700,
              }}
            >
              {totalScheduled} pronti
            </motion.span>
          )}
        </div>

        {/* Slot pills */}
        <div style={{ display: 'flex', gap: 4, marginTop: 7 }}>
          {SLOTS.map(s => (
            <div key={s} style={{
              padding: '2px 7px',
              background: 'var(--surf-2)',
              border: '1px solid var(--border)',
              borderRadius: 5,
              fontSize: 9, color: 'var(--text-3)',
              fontFamily: 'Geist Mono, monospace',
            }}>
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* ── Day list — slide animata ── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={weekOffset}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.3, ease: WEEK_EASE }}
            style={{ padding: '6px 0' }}
          >
            {days.map(day => (
              <DayRow
                key={day.date}
                day={day}
                expanded={expandedDay === day.date}
                onExpand={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                onTopicChange={t => setTopic(day.date, t)}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '8px 14px 12px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <AnimatePresence>
          {feedback && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 10.5,
                color: feedback.includes('rror') ? '#e55' : 'var(--accent)',
                marginBottom: 7, textAlign: 'center',
              }}
            >
              {feedback}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handlePlan}
          disabled={planning}
          whileHover={!planning ? { scale: 1.02 } : {}}
          whileTap={!planning ? { scale: 0.97 } : {}}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{
            width: '100%', padding: '9px 0',
            background: planning ? 'var(--surf-2)' : 'var(--accent)',
            border: '1px solid',
            borderColor: planning ? 'var(--border)' : 'oklch(73% 0.14 158)',
            borderRadius: 9, cursor: planning ? 'default' : 'pointer',
            color: planning ? 'var(--text-3)' : 'oklch(15% 0.04 158)',
            fontSize: 11.5, fontWeight: 700, fontFamily: 'Geist, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: planning ? 'none' : 'inset 0 1px 0 oklch(95% 0.05 158 / 0.25)',
            transition: 'background 0.15s, color 0.15s',
          } as React.CSSProperties}
        >
          {planning
            ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Pianificando...</>
            : <><Sparkles size={12} /> Pianifica settimana</>
          }
        </motion.button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function DayRow({
  day, expanded, onExpand, onTopicChange,
}: {
  day: DayPlan;
  expanded: boolean;
  onExpand: () => void;
  onTopicChange: (t: string) => void;
}) {
  const hasVideos = day.videos.length > 0;

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={onExpand}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', cursor: 'pointer',
          background: day.isToday ? 'oklch(73% 0.14 158 / 0.04)' : 'transparent',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!day.isToday) (e.currentTarget as HTMLDivElement).style.background = 'var(--surf-2)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = day.isToday ? 'oklch(73% 0.14 158 / 0.04)' : 'transparent'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: day.isToday ? 'var(--accent)' : 'var(--surf-2)',
            border: '1px solid',
            borderColor: day.isToday ? 'var(--accent)' : 'var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 800,
              color: day.isToday ? 'oklch(15% 0.04 158)' : 'var(--text-3)',
              fontFamily: 'Geist Mono, monospace',
            }}>
              {day.dayLabel}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: day.isToday ? 'var(--text)' : 'var(--text-2)', lineHeight: 1 }}>
              {day.fullName}
              {day.isToday && (
                <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.3px' }}>
                  OGGI
                </span>
              )}
            </p>
            <p style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 2 }}>
              {day.topic
                ? <span style={{ color: 'var(--accent)' }}>{day.topic}</span>
                : 'Nessun topic'
              }
              {hasVideos && ` · ${day.videos.length} video`}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {hasVideos && (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Play size={8} color="var(--text-3)" />
            </div>
          )}
          {expanded ? <ChevronUp size={12} color="var(--text-3)" /> : <ChevronDown size={12} color="var(--text-3)" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0, 0.18, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '6px 14px 10px' }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{
                  fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.5px',
                  fontWeight: 600, display: 'block', marginBottom: 4,
                }}>
                  TOPIC
                </label>
                <input
                  value={day.topic}
                  onChange={e => onTopicChange(e.target.value)}
                  placeholder="Es: AI, Apple, Crypto..."
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: '100%', padding: '6px 9px',
                    background: 'var(--surf-2)', border: '1px solid var(--border)',
                    borderRadius: 7, color: 'var(--text)', fontSize: 11,
                    fontFamily: 'Geist, sans-serif', outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = 'oklch(73% 0.14 158 / 0.4)';
                    e.target.style.boxShadow = '0 0 0 2px oklch(73% 0.14 158 / 0.07)';
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = 'var(--border)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {hasVideos && (
                <div>
                  <label style={{
                    fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.5px',
                    fontWeight: 600, display: 'block', marginBottom: 5,
                  }}>
                    VIDEO IN CODA
                  </label>
                  {day.videos.map((v, i) => (
                    <div key={v.id} style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '5px 0',
                      borderBottom: i < day.videos.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{
                        fontFamily: 'Geist Mono, monospace', fontSize: 9, color: 'var(--accent)',
                        background: 'oklch(73% 0.14 158 / 0.08)',
                        border: '1px solid oklch(73% 0.14 158 / 0.14)',
                        borderRadius: 4, padding: '1px 5px', flexShrink: 0,
                      }}>
                        {SLOTS[i] ?? '—'}
                      </span>
                      <span style={{
                        fontSize: 10.5, color: 'var(--text-2)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>
                        {v.idea_title ?? v.id}
                      </span>
                      <StatusDot status={v.status} />
                    </div>
                  ))}
                </div>
              )}

              {!hasVideos && (
                <p style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Nessun video pianificato
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'published'    ? 'oklch(72% 0.16 155)' :
    status === 'ready'        ? 'oklch(76% 0.14 140)' :
    status === 'rendered'     ? 'oklch(76% 0.14 200)' :
    'var(--text-3)';
  return <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />;
}
