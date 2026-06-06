import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clapperboard, Send, Link2, GitBranch, Sparkles,
  TrendingUp, Eye, Lightbulb, AlertCircle, Loader, Bell, BellOff,
} from 'lucide-react';

const API = '';

interface FeedMessage {
  id: string;
  type: 'discovery' | 'suggestion' | 'analysis' | 'viral' | 'user' | 'system' | 'url_analysis';
  from: 'CLACK' | 'user';
  text: string;
  url?: string;
  url_title?: string;
  tags?: string[];
  timestamp: string;
  unread?: boolean;
}

interface Toast {
  id: string;
  type: FeedMessage['type'];
  text: string;
  url?: string;
}

const TYPE_META: Record<string, { icon: React.FC<{ size?: number }>, color: string, label: string }> = {
  discovery:    { icon: GitBranch,   color: 'oklch(73% 0.14 280)', label: 'SCOPERTA'      },
  suggestion:   { icon: Lightbulb,   color: 'oklch(78% 0.16 55)',  label: 'SUGGERIMENTO'  },
  analysis:     { icon: Eye,         color: 'oklch(74% 0.14 200)', label: 'ANALISI'        },
  viral:        { icon: TrendingUp,  color: 'oklch(72% 0.18 155)', label: 'VIRAL'          },
  url_analysis: { icon: Link2,       color: 'oklch(75% 0.14 320)', label: 'URL ANALISI'    },
  system:       { icon: AlertCircle, color: 'var(--text-3)',        label: 'SISTEMA'        },
  user:         { icon: Send,        color: 'var(--accent)',        label: 'TU'             },
};

async function fetchFeed(): Promise<FeedMessage[]> {
  try {
    const r = await fetch(`${API}/api/clack/feed`);
    const d = await r.json();
    return d.messages ?? [];
  } catch {
    return [];
  }
}

async function postMessage(text: string, url?: string): Promise<boolean> {
  try {
    const r = await fetch(`${API}/api/clack/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, url }),
    });
    return (await r.json()).ok;
  } catch {
    return false;
  }
}

async function triggerResearch(): Promise<void> {
  await fetch(`${API}/api/clack/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true }),
  });
}

// ── Notification permission ───────────────────────────────────────────────────

function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  );

  async function request() {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPermission(p);
  }

  function notify(title: string, body: string, tag?: string) {
    if (permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body,
        tag: tag ?? 'whyclack',
        icon: '/favicon.ico',
        silent: false,
      });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {}
  }

  return { permission, request, notify };
}

// ── Toast stack ───────────────────────────────────────────────────────────────

function ToastStack({ toasts, onDismiss }: { toasts: Toast[], onDismiss: (id: string) => void }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column-reverse', gap: 10,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(toast => {
          const meta = TYPE_META[toast.type] ?? TYPE_META.system;
          const Icon = meta.icon;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              onClick={() => onDismiss(toast.id)}
              style={{
                pointerEvents: 'auto',
                width: 320,
                background: 'var(--surf-2)',
                border: `1px solid ${meta.color.includes('oklch') ? meta.color.replace(')', ' / 0.3)') : 'var(--border)'}`,
                borderRadius: 14,
                padding: '12px 14px',
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: `${meta.color.replace(')', ' / 0.12)')}`,
                  border: `1px solid ${meta.color.replace(')', ' / 0.2)')}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ color: meta.color }}><Icon size={12} /></span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.7px',
                      color: meta.color, fontFamily: 'Geist Mono, monospace',
                    }}>
                      WHYCLACK · {meta.label}
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }}>
                      adesso
                    </span>
                  </div>
                </div>
              </div>

              {/* Text */}
              <p style={{
                fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties}>
                {toast.text}
              </p>

              {/* Dismiss hint */}
              <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 7 }}>
                Clicca per chiudere · apri WhyClack per i dettagli
              </p>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ClackDirectorPage() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [researching, setResearching] = useState(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { permission, request: requestNotif, notify } = useNotifications();

  const load = useCallback(async (isFirst = false) => {
    const msgs = await fetchFeed();
    setMessages(msgs);

    if (!isFirst) {
      const newMsgs = msgs.filter(
        m => m.from === 'CLACK' && m.unread && !prevIdsRef.current.has(m.id)
      );
      newMsgs.forEach(m => {
        const meta = TYPE_META[m.type] ?? TYPE_META.system;
        // Browser notification
        notify(`WhyClack · ${meta.label}`, m.text.slice(0, 100));
        // Toast in-app
        setToasts(prev => [
          ...prev.slice(-2),
          { id: m.id, type: m.type, text: m.text, url: m.url },
        ]);
      });
    }

    prevIdsRef.current = new Set(msgs.map(m => m.id));
  }, [notify]);

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 12_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput('');
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    await postMessage(text, urlMatch?.[0]);
    await load(false);
    setSending(false);
    inputRef.current?.focus();
  }

  async function handleResearch() {
    setResearching(true);
    await triggerResearch();
    setTimeout(async () => { await load(false); setResearching(false); }, 3500);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const lastTimestamp = messages.filter(m => m.from === 'CLACK').at(-1)?.timestamp;

  return (
    <>
      <div style={{
        display: 'flex', flexDirection: 'column', height: '100dvh',
        background: 'var(--bg)', fontFamily: 'Geist, sans-serif',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '14px 22px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--surf-1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'oklch(72% 0.18 280 / 0.08)',
                border: '1px solid oklch(72% 0.18 280 / 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <Clapperboard size={16} color="oklch(72% 0.18 280)" />
                {/* Pulse dot */}
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'oklch(72% 0.18 155)',
                  boxShadow: '0 0 0 2px var(--surf-1)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <h1 style={{
                    fontSize: 15, fontWeight: 900, color: 'var(--text)',
                    letterSpacing: '-0.4px', lineHeight: 1,
                  }}>
                    WhyClack
                  </h1>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.8px',
                    color: 'oklch(72% 0.18 280)',
                    background: 'oklch(72% 0.18 280 / 0.08)',
                    border: '1px solid oklch(72% 0.18 280 / 0.15)',
                    borderRadius: 5, padding: '1px 7px',
                    fontFamily: 'Geist Mono, monospace',
                  }}>
                    DIRECTOR MODE
                  </span>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
                  {lastTimestamp
                    ? `Ultimo messaggio ${new Date(lastTimestamp).toLocaleString('it-IT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                    : 'In ascolto — ricerca template, tecniche virali, novità'
                  }
                </p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              {/* Notification toggle */}
              <motion.button
                onClick={permission === 'granted' ? undefined : requestNotif}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                title={permission === 'granted' ? 'Notifiche attive' : 'Attiva notifiche'}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: permission === 'granted' ? 'oklch(72% 0.18 155 / 0.08)' : 'var(--surf-2)',
                  border: `1px solid ${permission === 'granted' ? 'oklch(72% 0.18 155 / 0.2)' : 'var(--border)'}`,
                  cursor: permission === 'granted' ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: permission === 'granted' ? 'oklch(72% 0.18 155)' : 'var(--text-3)',
                }}
              >
                {permission === 'granted' ? <Bell size={13} /> : <BellOff size={13} />}
              </motion.button>

              {/* Research button */}
              <motion.button
                onClick={handleResearch}
                disabled={researching}
                whileHover={!researching ? { scale: 1.04 } : {}}
                whileTap={!researching ? { scale: 0.94 } : {}}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px',
                  background: researching ? 'var(--surf-2)' : 'oklch(72% 0.18 280 / 0.08)',
                  border: `1px solid ${researching ? 'var(--border)' : 'oklch(72% 0.18 280 / 0.22)'}`,
                  borderRadius: 8, cursor: researching ? 'default' : 'pointer',
                  color: researching ? 'var(--text-3)' : 'oklch(72% 0.18 280)',
                  fontSize: 11.5, fontWeight: 600, fontFamily: 'Geist, sans-serif',
                }}
              >
                {researching
                  ? <><Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> Cercando...</>
                  : <><Sparkles size={11} /> Ricerca ora</>
                }
              </motion.button>
            </div>
          </div>
        </div>

        {/* ── Feed ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0 8px' }}>
          {messages.length === 0 ? (
            <EmptyState onResearch={handleResearch} onNotif={requestNotif} notifGranted={permission === 'granted'} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <AnimatePresence initial={false}>
                {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
              </AnimatePresence>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: '10px 18px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surf-1)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: 'var(--surf-2)',
            border: '1px solid var(--border)',
            borderRadius: 13, padding: '10px 13px',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi a CLACK · incolla un URL GitHub · suggerisci un tipo di video... (⌘↵ per inviare)"
              rows={2}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 12.5, lineHeight: 1.55,
                fontFamily: 'Geist, sans-serif', resize: 'none',
              }}
            />
            <motion.button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              whileHover={input.trim() && !sending ? { scale: 1.1 } : {}}
              whileTap={input.trim() && !sending ? { scale: 0.88 } : {}}
              style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: input.trim() && !sending
                  ? 'oklch(72% 0.18 280 / 0.12)'
                  : 'var(--surf-3)',
                border: `1px solid ${input.trim() && !sending ? 'oklch(72% 0.18 280 / 0.28)' : 'var(--border)'}`,
                cursor: input.trim() && !sending ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: input.trim() && !sending ? 'oklch(72% 0.18 280)' : 'var(--text-3)',
                transition: 'all 0.15s',
              }}
            >
              {sending
                ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={13} />
              }
            </motion.button>
          </div>
          <p style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 6, paddingLeft: 3 }}>
            Incolla URL GitHub, TikTok, articoli di tecniche video — CLACK analizza e ricorda tutto permanentemente.
          </p>
        </div>
      </div>

      {/* ── Toast notifications ── */}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: FeedMessage }) {
  const isUser = msg.from === 'user';
  const meta = TYPE_META[msg.type] ?? TYPE_META.system;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 10, padding: '5px 20px',
        alignItems: 'flex-start',
      }}
    >
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
          background: meta.color.includes('oklch')
            ? meta.color.replace(')', ' / 0.1)')
            : 'var(--surf-2)',
          border: `1px solid ${meta.color.includes('oklch') ? meta.color.replace(')', ' / 0.2)') : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: meta.color }}><Icon size={13} /></span>
        </div>
      )}

      <div style={{
        maxWidth: isUser ? '72%' : '80%',
        background: isUser
          ? 'oklch(73% 0.14 158 / 0.07)'
          : msg.type === 'viral'
            ? 'oklch(72% 0.18 155 / 0.05)'
            : msg.type === 'discovery'
              ? 'oklch(73% 0.14 280 / 0.05)'
              : 'var(--surf-2)',
        border: `1px solid ${
          isUser ? 'oklch(73% 0.14 158 / 0.14)'
          : msg.type === 'viral' ? 'oklch(72% 0.18 155 / 0.14)'
          : msg.type === 'discovery' ? 'oklch(73% 0.14 280 / 0.14)'
          : 'var(--border)'
        }`,
        borderRadius: isUser ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        padding: '10px 13px',
      }}>
        {/* Label + time */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 5,
        }}>
          {!isUser && (
            <span style={{
              fontSize: 8.5, fontWeight: 800, letterSpacing: '0.7px',
              color: meta.color, fontFamily: 'Geist Mono, monospace',
            }}>
              {meta.label}
            </span>
          )}
          <span style={{
            fontSize: 9, color: 'var(--text-3)',
            fontFamily: 'Geist Mono, monospace',
            marginLeft: 'auto',
          }}>
            {new Date(msg.timestamp).toLocaleTimeString('it-IT', {
              hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        <p style={{
          fontSize: 12.5, color: 'var(--text)',
          lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </p>

        {msg.url && (
          <a href={msg.url} target="_blank" rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 9, padding: '4px 9px',
              background: 'var(--surf-3)',
              border: '1px solid var(--border-hi)',
              borderRadius: 7, textDecoration: 'none',
              fontSize: 10.5, color: 'var(--text-2)',
            }}
          >
            <Link2 size={9} color="var(--text-3)" />
            <span style={{
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260,
            }}>
              {msg.url_title || msg.url}
            </span>
          </a>
        )}

        {msg.tags && msg.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {msg.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 9, color: 'var(--text-3)',
                background: 'var(--surf-3)',
                border: '1px solid var(--border)',
                borderRadius: 4, padding: '1px 6px',
                fontFamily: 'Geist Mono, monospace',
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({
  onResearch, onNotif, notifGranted,
}: { onResearch: () => void, onNotif: () => void, notifGranted: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%',
      padding: '60px 40px', gap: 18, textAlign: 'center',
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 16,
        background: 'oklch(72% 0.18 280 / 0.07)',
        border: '1px solid oklch(72% 0.18 280 / 0.14)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Clapperboard size={26} color="oklch(72% 0.18 280 / 0.55)" />
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 7, letterSpacing: '-0.3px' }}>
          WhyClack pronto
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.65, maxWidth: 320 }}>
          CLACK esplora template, tecniche virali e metodi di editing ogni giorno. Tutto quello che scopre appare qui — e ti manda una notifica.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!notifGranted && (
          <motion.button
            onClick={onNotif}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '9px 16px',
              background: 'oklch(72% 0.18 155 / 0.08)',
              border: '1px solid oklch(72% 0.18 155 / 0.2)',
              borderRadius: 10, cursor: 'pointer',
              color: 'oklch(72% 0.18 155)',
              fontSize: 12, fontWeight: 600, fontFamily: 'Geist, sans-serif',
            }}
          >
            <Bell size={13} /> Attiva notifiche
          </motion.button>
        )}
        <motion.button
          onClick={onResearch}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px',
            background: 'oklch(72% 0.18 280 / 0.08)',
            border: '1px solid oklch(72% 0.18 280 / 0.22)',
            borderRadius: 10, cursor: 'pointer',
            color: 'oklch(72% 0.18 280)',
            fontSize: 12, fontWeight: 600, fontFamily: 'Geist, sans-serif',
          }}
        >
          <Sparkles size={13} /> Prima ricerca
        </motion.button>
      </div>
    </div>
  );
}
