import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowUp, ChevronLeft, ChevronRight, MessageSquare, Zap, CalendarDays } from 'lucide-react';
import { WeekPlanner } from './WeekPlanner';
import type { ChatMessage } from '../types';

const DEFAULT_PROMPTS = [
  { id: '1', label: 'Stato del sistema', on: true },
  { id: '2', label: 'Genera 3 idee video', on: true },
  { id: '3', label: 'Cosa hai imparato?', on: true },
  { id: '4', label: 'Blocchi attivi?', on: true },
  { id: '5', label: 'Buffer attuale?', on: true },
  { id: '6', label: 'Analizza la coda', on: false },
  { id: '7', label: 'Prossima pubblicazione', on: false },
  { id: '8', label: 'Statistiche settimana', on: false },
];

const msgVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.98 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, stiffness: 480, damping: 28 },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

interface Props {
  onSend: (msg: string) => Promise<string>;
  collapsed: boolean;
  onCollapse: () => void;
}

export function ChatSidebar({ onSend, collapsed, onCollapse }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [tab, setTab] = useState<'chat' | 'prompts' | 'plan'>('chat');
  const [prompts, setPrompts] = useState(DEFAULT_PROMPTS);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Magnetic send button — useMotionValue only, never useState
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const tx = useTransform(mx, [-20, 20], [-4, 4]);
  const ty = useTransform(my, [-20, 20], [-4, 4]);
  const sendBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: msg, ts: Date.now() }]);
    setLoading(true);
    const response = await onSend(msg);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: response, ts: Date.now() }]);
    setLoading(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }

  function togglePrompt(id: string) {
    setPrompts(p => p.map(x => x.id === id ? { ...x, on: !x.on } : x));
  }

  function handleSendMouseMove(e: React.MouseEvent<HTMLButtonElement>) {
    const btn = sendBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    mx.set(e.clientX - (r.left + r.width / 2));
    my.set(e.clientY - (r.top + r.height / 2));
  }

  function handleSendMouseLeave() {
    animate(mx, 0, { type: 'spring' as const, stiffness: 300, damping: 25 });
    animate(my, 0, { type: 'spring' as const, stiffness: 300, damping: 25 });
  }

  const activePrompts = prompts.filter(p => p.on);
  const inactivePrompts = prompts.filter(p => !p.on);

  if (collapsed) {
    return (
      <div style={{
        width: 44, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderLeft: '1px solid var(--border)',
        background: 'var(--surf-1)',
      }}>
        <motion.button
          onClick={onCollapse}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
          style={{
            background: 'var(--surf-2)',
            border: '1px solid var(--border-hi)',
            boxShadow: 'inset 0 1px 0 var(--inset-hi)',
            borderRadius: 8, padding: 9, cursor: 'pointer',
            color: 'var(--text-2)', display: 'flex',
          }}
        >
          <ChevronLeft size={13} />
        </motion.button>
      </div>
    );
  }

  return (
    <div style={{
      width: 300, display: 'flex', flexDirection: 'column', flexShrink: 0,
      borderLeft: '1px solid var(--border)',
      background: 'var(--surf-1)',
    }}>

      {/* Header */}
      <div style={{
        padding: '13px 16px 11px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{
              fontFamily: 'NeuePower, sans-serif',
              fontSize: 22, fontWeight: 900, color: 'var(--text)',
              letterSpacing: '0.3px', lineHeight: 1,
            }}>
              WhyChat
            </h2>
            {/* Live pulse dot — conveys agent connection, not decoration */}
            <motion.div
              animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--accent)',
                flexShrink: 0,
              }}
            />
          </div>
          <motion.button
            onClick={onCollapse}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', padding: 4, display: 'flex',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <ChevronRight size={13} />
          </motion.button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, letterSpacing: '0.3px' }}>
          WhyPost AI Agent · memoria attiva
        </p>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 2, marginTop: 11,
          background: 'var(--surf-2)',
          border: '1px solid var(--border)',
          borderRadius: 8, padding: 3,
        }}>
            {([
            { id: 'chat',    icon: <MessageSquare size={10} />, label: 'Chat' },
            { id: 'prompts', icon: <Zap size={10} />,           label: 'Prompt' },
            { id: 'plan',    icon: <CalendarDays size={10} />,  label: 'Pianifica' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '5px 6px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: tab === t.id ? 'var(--surf-3)' : 'transparent',
                color: tab === t.id ? 'var(--text)' : 'var(--text-3)',
                fontSize: 9.5, fontWeight: 600, fontFamily: 'Geist, sans-serif',
                transition: 'background 0.15s, color 0.15s',
                boxShadow: tab === t.id ? 'inset 0 1px 0 var(--inset-hi)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

        {tab === 'plan' ? (
          <WeekPlanner />
        ) : tab === 'chat' ? (
          <div style={{ padding: '14px 14px 8px' }}>

            {/* Empty state */}
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, type: 'spring' as const, stiffness: 300, damping: 28 }}
                style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', paddingTop: 44, gap: 10,
                }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'oklch(73% 0.14 158 / 0.07)',
                  border: '1px solid oklch(73% 0.14 158 / 0.16)',
                  boxShadow: 'inset 0 1px 0 oklch(73% 0.14 158 / 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}>
                  <Zap size={14} strokeWidth={1.5} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                  Chiedimi qualcosa sul sistema
                </span>
              </motion.div>
            )}

            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  variants={msgVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  style={{
                    marginBottom: 10, display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end', gap: 7,
                  }}
                >
                  {/* W avatar — solid tinted, no gradient */}
                  {msg.role === 'assistant' && (
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'oklch(73% 0.14 158 / 0.14)',
                      border: '1px solid oklch(73% 0.14 158 / 0.24)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, fontWeight: 900,
                      color: 'var(--accent)',
                      fontFamily: 'NeuePower, sans-serif',
                      flexShrink: 0,
                    }}>W</div>
                  )}
                  <div style={{
                    maxWidth: '83%',
                    padding: msg.role === 'user' ? '7px 10px' : '6px 0',
                    borderRadius: msg.role === 'user' ? 10 : 0,
                    fontSize: 11.5, lineHeight: 1.65,
                    background: msg.role === 'user' ? 'var(--surf-2)' : 'transparent',
                    border: msg.role === 'user' ? '1px solid var(--border-hi)' : 'none',
                    boxShadow: msg.role === 'user' ? 'inset 0 1px 0 var(--inset-hi)' : 'none',
                    color: msg.role === 'user' ? 'var(--text)' : 'var(--text-2)',
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Loading dots */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 27, marginBottom: 10 }}>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1, 0.7] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.22, ease: 'easeInOut' }}
                  />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        ) : (

          /* Prompt Library — two sections: active and saved */
          <div style={{ padding: '12px 14px' }}>
            {activePrompts.length > 0 && (
              <>
                <p className="label" style={{ marginBottom: 8 }}>ATTIVI</p>
                {activePrompts.map(p => (
                  <PromptRow
                    key={p.id}
                    prompt={p}
                    onSend={() => { send(p.label); setTab('chat'); }}
                    onToggle={() => togglePrompt(p.id)}
                  />
                ))}
              </>
            )}

            {inactivePrompts.length > 0 && (
              <div style={{ marginTop: activePrompts.length > 0 ? 14 : 0 }}>
                <p className="label" style={{ marginBottom: 8 }}>SALVATI</p>
                {inactivePrompts.map(p => (
                  <PromptRow
                    key={p.id}
                    prompt={p}
                    onSend={() => { send(p.label); setTab('chat'); }}
                    onToggle={() => togglePrompt(p.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input — no dead toolbar buttons, just write and send */}
      <div style={{ padding: '8px 12px 14px', flexShrink: 0, borderTop: '1px solid var(--border)' }}>
        <motion.div
          animate={{
            borderColor: inputFocused
              ? 'oklch(73% 0.14 158 / 0.38)'
              : 'var(--border)',
            boxShadow: inputFocused
              ? '0 0 0 3px oklch(73% 0.14 158 / 0.07)'
              : '0 0 0 0px transparent',
          }}
          transition={{ duration: 0.18 }}
          style={{
            background: 'var(--surf-2)',
            borderRadius: 11, padding: '10px 10px 8px 13px',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 1px 0 var(--inset-hi)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Scrivi a WhyChat..."
            rows={1}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              color: 'var(--text)', fontSize: 12,
              resize: 'none', outline: 'none',
              fontFamily: 'Geist, sans-serif', lineHeight: 1.55,
              minHeight: 20, maxHeight: 120,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <motion.button
              ref={sendBtnRef}
              onClick={() => send()}
              disabled={!input.trim() || loading}
              onMouseMove={handleSendMouseMove}
              onMouseLeave={handleSendMouseLeave}
              whileTap={input.trim() && !loading ? { scale: 0.88 } : {}}
              style={{
                x: tx, y: ty,
                width: 28, height: 28, borderRadius: 8, border: 'none',
                background: input.trim() && !loading ? 'var(--accent)' : 'var(--surf-3)',
                color: input.trim() && !loading ? 'oklch(15% 0.04 158)' : 'var(--text-3)',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: input.trim() && !loading
                  ? 'inset 0 1px 0 oklch(95% 0.05 158 / 0.25)'
                  : 'none',
                transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
              } as unknown as React.CSSProperties}
            >
              <ArrowUp size={13} />
            </motion.button>
          </div>
        </motion.div>

        <p style={{ marginTop: 6, fontSize: 9, color: 'var(--text-3)', textAlign: 'center' }}>
          Le correzioni vengono salvate nella memoria
        </p>
      </div>
    </div>
  );
}

function PromptRow({
  prompt,
  onSend,
  onToggle,
}: {
  prompt: { id: string; label: string; on: boolean };
  onSend: () => void;
  onToggle: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0',
      borderBottom: '1px solid var(--border)',
      gap: 8,
    }}>
      <span
        onClick={onSend}
        style={{
          fontSize: 11.5,
          color: prompt.on ? 'var(--text-2)' : 'var(--text-3)',
          cursor: 'pointer',
          flex: 1,
          lineHeight: 1.4,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={e => (e.currentTarget.style.color = prompt.on ? 'var(--text-2)' : 'var(--text-3)')}
      >
        {prompt.label}
      </span>
      <button
        onClick={onToggle}
        style={{
          width: 30, height: 17, borderRadius: 9, border: 'none', cursor: 'pointer',
          background: prompt.on ? 'var(--accent)' : 'var(--surf-3)',
          position: 'relative', flexShrink: 0,
          transition: 'background 0.2s',
          boxShadow: prompt.on ? 'inset 0 1px 0 oklch(95% 0.05 158 / 0.2)' : 'none',
        }}
      >
        <motion.div
          animate={{ left: prompt.on ? 15 : 2 }}
          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute', top: 2,
            width: 13, height: 13, borderRadius: '50%',
            background: 'oklch(97% 0.004 160)',
            boxShadow: '0 1px 3px oklch(0% 0 0 / 0.3)',
          }}
        />
      </button>
    </div>
  );
}
