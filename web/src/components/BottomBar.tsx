import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, ChevronUp, ChevronDown, TrendingUp, ShieldOff } from 'lucide-react';

type Topic = { id: string; label: string; active: boolean; trending?: boolean };

const INITIAL_TOPICS: Topic[] = [
  { id: '1', label: 'tech ai',          active: true,  trending: true  },
  { id: '2', label: 'produttività dev', active: true,  trending: false },
  { id: '3', label: 'automazione',      active: true,  trending: true  },
  { id: '4', label: 'claude code',      active: true,  trending: false },
  { id: '5', label: 'tool gratuiti',    active: true,  trending: false },
  { id: '6', label: 'open source',      active: false, trending: false },
  { id: '7', label: 'indie hacking',    active: false, trending: false },
];

const INITIAL_BLACKLIST = ['politica', 'religione', 'NSFW'];

const SUGGESTED: { label: string; score: number }[] = [
  { label: 'vibe coding',      score: 94 },
  { label: 'cursor ai',        score: 89 },
  { label: 'llm locale',       score: 81 },
  { label: 'n8n automazione',  score: 77 },
];

function IgIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
    </svg>
  );
}
function TkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1.01-.07z" fill="currentColor"/>
    </svg>
  );
}
function YtIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 24 17" fill="none">
      <rect width="24" height="17" rx="4" fill="currentColor"/>
      <path d="M10 5.5l7 3.5-7 3.5V5.5z" fill="oklch(97% 0.005 0)"/>
    </svg>
  );
}

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', short: 'IG', Icon: IgIcon, color: '#E1306C' },
  { id: 'tiktok',   label: 'TikTok',    short: 'TK', Icon: TkIcon, color: 'rgba(200,200,200,0.9)' },
  { id: 'youtube',  label: 'YouTube',   short: 'YT', Icon: YtIcon, color: '#FF4444' },
];

async function postConfig(payload: object) {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // backend not running — ignore silently
  }
}

export function BottomBar({
  readyVideos,
  targetDays,
  nextPublish,
}: {
  readyVideos: number;
  targetDays: number;
  nextPublish?: string | null;
}) {
  const [topics, setTopics]           = useState<Topic[]>([]);
  const [blacklist, setBlacklist]     = useState<string[]>([]);
  const [addingTopic, setAddingTopic] = useState(false);
  const [addingBlock, setAddingBlock] = useState(false);
  const [newTopic, setNewTopic]       = useState('');
  const [newBlock, setNewBlock]       = useState('');
  const [localTarget, setLocalTarget] = useState(targetDays);
  const [activePlats, setActivePlats] = useState<Set<string>>(new Set(['instagram']));

  // Load topics and blacklist from backend at mount
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (!cfg) return;
        const rawTopics: string[] = cfg?.content?.topics ?? [];
        const rawBlacklist: string[] = cfg?.content?.blacklist ?? [];
        if (rawTopics.length) {
          setTopics(rawTopics.map((label, i) => ({
            id: String(i + 1),
            label,
            active: true,
            trending: false,
          })));
        } else {
          setTopics(INITIAL_TOPICS);
        }
        if (rawBlacklist.length) {
          setBlacklist(rawBlacklist);
        } else {
          setBlacklist(INITIAL_BLACKLIST);
        }
      })
      .catch(() => {
        setTopics(INITIAL_TOPICS);
        setBlacklist(INITIAL_BLACKLIST);
      });
  }, []);

  // Debounced config sync
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const activeTopicLabels = topics.filter(t => t.active).map(t => t.label);
      const platforms: Record<string, { enabled: boolean; order: number }> = {};
      PLATFORMS.forEach((p, i) => {
        platforms[p.id] = { enabled: activePlats.has(p.id), order: i + 1 };
      });
      postConfig({
        content: { topics: activeTopicLabels, blacklist },
        platforms,
        buffer: { target_days: localTarget },
      });
    }, 600);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [topics, blacklist, localTarget, activePlats]);

  function toggleTopic(id: string) {
    setTopics(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
  }
  function commitTopic() {
    const trimmed = newTopic.trim().toLowerCase();
    if (trimmed) {
      setTopics(prev => [...prev, { id: crypto.randomUUID(), label: trimmed, active: true }]);
    }
    setNewTopic('');
    setAddingTopic(false);
  }
  function addSuggested(label: string) {
    if (!topics.find(t => t.label === label)) {
      setTopics(prev => [...prev, { id: crypto.randomUUID(), label, active: true, trending: true }]);
    } else {
      setTopics(prev => prev.map(t => t.label === label ? { ...t, active: true } : t));
    }
  }
  function commitBlock() {
    const trimmed = newBlock.trim().toLowerCase();
    if (trimmed && !blacklist.includes(trimmed)) {
      setBlacklist(prev => [...prev, trimmed]);
    }
    setNewBlock('');
    setAddingBlock(false);
  }
  function removeBlock(label: string) {
    setBlacklist(prev => prev.filter(b => b !== label));
  }
  function togglePlatform(id: string) {
    setActivePlats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const activeTopics   = topics.filter(t => t.active);
  const inactiveTopics = topics.filter(t => !t.active);
  const ritmo          = readyVideos / Math.max(1, localTarget);
  const ritmoColor     = ritmo >= 1 ? 'var(--accent)' : ritmo >= 0.5 ? 'var(--warn)' : 'var(--danger)';
  const nextPubLabel   = nextPublish
    ? new Date(nextPublish).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    : null;
  const suggestions = SUGGESTED.filter(s => !activeTopics.find(t => t.label === s.label));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1px 280px 1px 196px',
      background: 'var(--surf-1)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>

      {/* ── ARGOMENTI + BLACKLIST ───────────────────────── */}
      <div style={{ padding: '13px 18px 14px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Topics header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <p className="label">argomenti</p>
            <span style={{ fontSize: 10, fontStyle: 'italic', color: 'var(--text-3)' }}>
              {activeTopics.length} attivi
            </span>
          </div>
          {!addingTopic && (
            <motion.button
              onClick={() => setAddingTopic(true)}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--text-3)',
                fontSize: 10, fontStyle: 'italic', padding: '2px 4px',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <Plus size={9} /> nuovo
            </motion.button>
          )}
        </div>

        {/* Active + inactive topics */}
        <motion.div layout style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8, alignItems: 'center' }}>
          <AnimatePresence>
            {activeTopics.map(t => (
              <motion.button
                key={t.id} layout
                initial={{ opacity: 0, scale: 0.82 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                onClick={() => toggleTopic(t.id)}
                whileHover={{ y: -1 }} whileTap={{ scale: 0.93 }}
                transition={{ type: 'spring' as const, stiffness: 480, damping: 28 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px 3px 9px',
                  background: 'var(--accent-dim)',
                  border: '1px solid rgba(52,211,153,0.22)',
                  borderRadius: 20, cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 10,
                  boxShadow: 'inset 0 1px 0 rgba(52,211,153,0.1)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {t.trending && <TrendingUp size={8} style={{ opacity: 0.7 }} />}
                {t.label}
              </motion.button>
            ))}
          </AnimatePresence>
          {inactiveTopics.map(t => (
            <motion.button
              key={t.id} layout
              onClick={() => toggleTopic(t.id)}
              whileHover={{ y: -1 }} whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring' as const, stiffness: 480, damping: 28 }}
              style={{
                padding: '3px 9px',
                background: 'var(--surf-2)',
                border: '1px solid var(--border)',
                borderRadius: 20, cursor: 'pointer',
                color: 'var(--text-3)', fontSize: 10, fontStyle: 'italic',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {t.label}
            </motion.button>
          ))}
          <AnimatePresence>
            {addingTopic && (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.12 }}
                style={{ display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <input
                  autoFocus
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitTopic();
                    if (e.key === 'Escape') { setAddingTopic(false); setNewTopic(''); }
                  }}
                  placeholder="argomento..."
                  style={{
                    background: 'var(--surf-2)',
                    border: '1px solid rgba(52,211,153,0.3)',
                    borderRadius: 20, padding: '3px 11px', fontSize: 10,
                    color: 'var(--text)', outline: 'none', width: 130,
                    fontFamily: 'Geist, sans-serif', fontStyle: 'italic',
                    caretColor: 'var(--accent)',
                  }}
                />
                <motion.button onClick={commitTopic} whileTap={{ scale: 0.88 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 3, display: 'flex' }}>
                  <Check size={11} />
                </motion.button>
                <motion.button onClick={() => { setAddingTopic(false); setNewTopic(''); }} whileTap={{ scale: 0.88 }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3, display: 'flex' }}>
                  <X size={11} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Suggeriti */}
        {suggestions.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <TrendingUp size={9} color="var(--text-3)" />
              <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Suggeriti
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {suggestions.slice(0, 4).map(s => (
                <motion.button
                  key={s.label}
                  onClick={() => addSuggested(s.label)}
                  whileHover={{ y: -1, borderColor: 'rgba(52,211,153,0.28)' as never, color: 'var(--accent)' as never }}
                  whileTap={{ scale: 0.93 }}
                  transition={{ type: 'spring' as const, stiffness: 480, damping: 28 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 9px',
                    background: 'transparent',
                    border: '1px dashed var(--border-hi)',
                    borderRadius: 20, cursor: 'pointer',
                    color: 'var(--text-3)', fontSize: 9,
                    transition: 'all 0.15s',
                  }}
                >
                  <Plus size={7} />
                  {s.label}
                  <span className="mono" style={{ fontSize: 8, opacity: 0.6 }}>{s.score}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── BLACKLIST ─────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldOff size={9} color="var(--danger)" style={{ opacity: 0.7 }} />
              <span style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Blacklist
              </span>
              <span style={{ fontSize: 9, color: 'var(--danger)', opacity: 0.6, fontStyle: 'italic' }}>
                {blacklist.length}
              </span>
            </div>
            {!addingBlock && (
              <motion.button
                onClick={() => setAddingBlock(true)}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', color: 'var(--text-3)',
                  fontSize: 9, fontStyle: 'italic', padding: '2px 4px',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                <Plus size={8} /> blocca
              </motion.button>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            <AnimatePresence>
              {blacklist.map(label => (
                <motion.div
                  key={label}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.75 }}
                  transition={{ type: 'spring' as const, stiffness: 480, damping: 28 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '2px 7px 2px 9px',
                    background: 'rgba(248,113,113,0.06)',
                    border: '1px solid rgba(248,113,113,0.18)',
                    borderRadius: 20,
                    color: 'var(--danger)', fontSize: 9,
                  }}
                >
                  {label}
                  <motion.button
                    onClick={() => removeBlock(label)}
                    whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.85 }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--danger)', opacity: 0.5, padding: 0,
                      display: 'flex', alignItems: 'center',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                  >
                    <X size={8} />
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Inline add block form */}
            <AnimatePresence>
              {addingBlock && (
                <motion.div
                  key="block-form"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <input
                    autoFocus
                    value={newBlock}
                    onChange={e => setNewBlock(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitBlock();
                      if (e.key === 'Escape') { setAddingBlock(false); setNewBlock(''); }
                    }}
                    placeholder="da bloccare..."
                    style={{
                      background: 'var(--surf-2)',
                      border: '1px solid rgba(248,113,113,0.3)',
                      borderRadius: 20, padding: '2px 10px', fontSize: 9,
                      color: 'var(--text)', outline: 'none', width: 120,
                      fontFamily: 'Geist, sans-serif', fontStyle: 'italic',
                      caretColor: 'var(--danger)',
                    }}
                  />
                  <motion.button onClick={commitBlock} whileTap={{ scale: 0.88 }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 3, display: 'flex' }}>
                    <Check size={10} />
                  </motion.button>
                  <motion.button onClick={() => { setAddingBlock(false); setNewBlock(''); }} whileTap={{ scale: 0.88 }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 3, display: 'flex' }}>
                    <X size={10} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--border)' }} />

      {/* ── PROGRAMMAZIONE ─────────────────────────────── */}
      <div style={{ padding: '13px 20px 14px' }}>
        <p className="label" style={{ marginBottom: 11 }}>programmazione</p>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-end' }}>

          <div>
            <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)', marginBottom: 3 }}>pronti ora</div>
            <div style={{
              fontFamily: 'NeuePower, Geist, sans-serif',
              fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px',
              color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
            }}>
              {readyVideos}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)', marginBottom: 5 }}>
              buffer target
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <motion.button
                onClick={() => setLocalTarget(t => Math.max(1, t - 1))}
                whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: 'var(--surf-2)', border: '1px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-3)',
                }}
              >
                <ChevronDown size={10} />
              </motion.button>
              <span style={{
                fontFamily: 'NeuePower, Geist, sans-serif',
                fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.5px',
                color: 'var(--text)', minWidth: 24, textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {localTarget}
              </span>
              <motion.button
                onClick={() => setLocalTarget(t => Math.min(30, t + 1))}
                whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.86 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                style={{
                  width: 20, height: 20, borderRadius: 5,
                  background: 'var(--surf-2)', border: '1px solid var(--border)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-3)',
                }}
              >
                <ChevronUp size={10} />
              </motion.button>
            </div>
            <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)', marginTop: 2, paddingLeft: 25 }}>
              giorni
            </div>
          </div>

          <div>
            <div style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)', marginBottom: 3 }}>ritmo</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span className="mono" style={{
                fontSize: 20, fontWeight: 700, color: ritmoColor,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1,
              }}>
                {ritmo.toFixed(1)}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>v/g</span>
            </div>
            {nextPubLabel && (
              <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 3 }}>
                <span style={{ fontStyle: 'italic' }}>prox </span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--text-2)' }}>{nextPubLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--border)' }} />

      {/* ── SOCIAL ─────────────────────────────────────── */}
      <div style={{ padding: '13px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 10 }}>
          <p className="label">social</p>
          <span style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--text-3)' }}>
            {activePlats.size} {activePlats.size === 1 ? 'attivo' : 'attivi'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PLATFORMS.map(({ id, label, short, Icon, color }) => {
            const active = activePlats.has(id);
            return (
              <motion.button
                key={id}
                onClick={() => togglePlatform(id)}
                whileHover={{ y: -2, scale: 1.04 }} whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                title={active ? `Disattiva ${label}` : `Attiva ${label}`}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 5,
                  padding: '9px 4px 8px',
                  background: active ? `${color}0d` : 'transparent',
                  border: active ? `1px solid ${color}40` : '1px dashed var(--border)',
                  borderRadius: 9, cursor: 'pointer',
                  transition: 'background 0.18s, border-color 0.18s',
                  boxShadow: active ? `inset 0 1px 0 ${color}1a` : 'none',
                }}
              >
                <span style={{ color, opacity: active ? 0.9 : 0.25, transition: 'opacity 0.18s' }}>
                  <Icon />
                </span>
                <span className="mono" style={{
                  fontSize: 8, fontWeight: 700, letterSpacing: '0.5px',
                  color: active ? color : 'var(--text-3)',
                  transition: 'color 0.18s', opacity: active ? 1 : 0.5,
                }}>
                  {short}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
