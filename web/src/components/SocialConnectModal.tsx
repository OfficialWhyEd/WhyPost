import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Unlink, ExternalLink, Zap, Bell, Sliders,
  ChevronRight,
} from 'lucide-react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';
type Section = 'social' | 'pipeline' | 'notify';

function IgIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>
    </svg>
  );
}
function TkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1.01-.07z" fill="currentColor"/>
    </svg>
  );
}
function YtIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 0.72)} viewBox="0 0 24 17" fill="none">
      <rect width="24" height="17" rx="4" fill="currentColor"/>
      <path d="M10 5l7 3.5L10 12V5z" fill="oklch(97% 0.005 0)"/>
    </svg>
  );
}
function GCalIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M2 9h20" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="15" r="2" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

const PLATFORMS = [
  { id: 'instagram', name: 'Instagram',      desc: 'Pubblica Reels e caroselli',     Icon: IgIcon,   color: '#E1306C' },
  { id: 'tiktok',   name: 'TikTok',          desc: 'Pubblica video brevi',           Icon: TkIcon,   color: '#c8c8c8' },
  { id: 'youtube',  name: 'YouTube Shorts',  desc: 'Shorts e video lunghi',          Icon: YtIcon,   color: '#FF4444' },
  { id: 'gcal',     name: 'Google Calendar', desc: 'Sincronizza calendario pub.',    Icon: GCalIcon, color: '#4285F4' },
];

const SECTIONS: { id: Section; label: string; icon: typeof Zap }[] = [
  { id: 'social',   label: 'Connessioni',  icon: ExternalLink },
  { id: 'pipeline', label: 'Pipeline',     icon: Sliders      },
  { id: 'notify',   label: 'Notifiche',    icon: Bell         },
];

const backdrop = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
};
const panel = {
  hidden:  { opacity: 0, scale: 0.96, y: 14 },
  visible: { opacity: 1, scale: 1,    y: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
  exit:    { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.14 } },
};
const contentVariants = {
  hidden:  { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 28 } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 28, delay: i * 0.05 },
  }),
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <motion.div
      onClick={() => onChange(!on)}
      animate={{ background: on ? 'var(--accent)' : 'var(--surf-3)' }}
      transition={{ duration: 0.2 }}
      style={{
        width: 34, height: 18, borderRadius: 9,
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        padding: '0 2px', flexShrink: 0,
        border: '1px solid var(--border)',
      }}
    >
      <motion.div
        animate={{ x: on ? 16 : 0 }}
        transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
        style={{ width: 14, height: 14, borderRadius: '50%', background: 'white' }}
      />
    </motion.div>
  );
}

export function SocialConnectModal({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<Section>('social');
  const [connStates, setConnStates] = useState<Record<string, ConnectionState>>({
    instagram: 'disconnected', tiktok: 'disconnected',
    youtube: 'disconnected', gcal: 'disconnected',
  });

  // Pipeline settings state
  const [autoRun,       setAutoRun]       = useState(true);
  const [qualityMin,    setQualityMin]    = useState(7);
  const [safetyBlock,   setSafetyBlock]   = useState(true);
  const [clackHD,       setClackHD]       = useState(false);
  const [renderConcur,  setRenderConcur]  = useState(2);

  // Notify settings state
  const [notifyRun,     setNotifyRun]     = useState(true);
  const [notifyError,   setNotifyError]   = useState(true);
  const [notifyPublish, setNotifyPublish] = useState(false);
  const [webhookUrl,    setWebhookUrl]    = useState('');

  function connect(id: string) {
    setConnStates(s => ({ ...s, [id]: 'connecting' }));
    setTimeout(() => setConnStates(s => ({ ...s, [id]: 'connected' })), 1400);
  }
  function disconnect(id: string) {
    setConnStates(s => ({ ...s, [id]: 'disconnected' }));
  }

  const connectedCount = Object.values(connStates).filter(s => s === 'connected').length;

  return (
    <motion.div
      variants={backdrop}
      initial="hidden" animate="visible" exit="hidden"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(7,7,9,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        variants={panel}
        initial="hidden" animate="visible" exit="exit"
        onClick={e => e.stopPropagation()}
        style={{
          width: 520,
          maxHeight: '80dvh',
          background: 'var(--surf-1)',
          border: '1px solid var(--border-hi)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.65), inset 0 1px 0 var(--inset-hi)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 0',
          flexShrink: 0,
        }}>
          <div>
            <h3 style={{
              fontFamily: 'NeuePower, Geist, sans-serif',
              fontSize: 17, fontWeight: 900, letterSpacing: '0.2px', color: 'var(--text)',
            }}>
              OPZIONI.
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>
              Connessioni, pipeline e notifiche
            </p>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.08, background: 'var(--surf-3)' as never }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--surf-2)', border: '1px solid var(--border)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}
          >
            <X size={13} />
          </motion.button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: '14px 22px 0',
          flexShrink: 0,
        }}>
          {SECTIONS.map(s => {
            const active = section === s.id;
            const SIcon = s.icon;
            return (
              <motion.button
                key={s.id}
                onClick={() => setSection(s.id)}
                whileTap={{ scale: 0.96 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px',
                  background: active ? 'rgba(52,211,153,0.08)' : 'transparent',
                  border: `1px solid ${active ? 'rgba(52,211,153,0.2)' : 'transparent'}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 11, fontWeight: active ? 600 : 400,
                  color: active ? 'var(--accent)' : 'var(--text-3)',
                  transition: 'all 0.15s',
                }}
              >
                <SIcon size={11} />
                {s.label}
                {s.id === 'social' && connectedCount > 0 && (
                  <span className="mono" style={{
                    fontSize: 9, fontWeight: 700,
                    color: 'var(--accent)',
                    background: 'rgba(52,211,153,0.15)',
                    borderRadius: 4, padding: '1px 5px',
                  }}>
                    {connectedCount}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Hairline */}
        <div style={{ height: 1, background: 'var(--border)', margin: '12px 0 0', flexShrink: 0 }} />

        {/* Content */}
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <AnimatePresence mode="wait">

            {/* Social */}
            {section === 'social' && (
              <motion.div key="social" variants={contentVariants} initial="hidden" animate="visible" exit="exit"
                style={{ padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {PLATFORMS.map((p, i) => {
                  const st = connStates[p.id];
                  const connected  = st === 'connected';
                  const connecting = st === 'connecting';
                  const PIcon = p.Icon;

                  return (
                    <motion.div
                      key={p.id} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 15px',
                        background: connected ? `${p.color}0a` : 'var(--surf-2)',
                        border: `1px solid ${connected ? `${p.color}28` : 'var(--border)'}`,
                        borderRadius: 11,
                        transition: 'background 0.25s, border-color 0.25s',
                        boxShadow: connected
                          ? `inset 0 1px 0 ${p.color}12`
                          : 'inset 0 1px 0 var(--inset-hi)',
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                        background: connected ? `${p.color}15` : 'var(--surf-3)',
                        border: `1px solid ${connected ? `${p.color}30` : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: p.color,
                        opacity: connected ? 1 : 0.55,
                        transition: 'all 0.25s',
                      }}>
                        <PIcon />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: connected ? 'var(--text)' : 'var(--text-2)' }}>
                            {p.name}
                          </span>
                          {connected && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                              transition={{ type: 'spring' as const, stiffness: 500, damping: 24 }}
                              style={{
                                fontSize: 9, fontWeight: 700, letterSpacing: '0.4px',
                                color: 'var(--accent)', padding: '1px 5px',
                                background: 'rgba(52,211,153,0.12)',
                                border: '1px solid rgba(52,211,153,0.2)',
                                borderRadius: 4,
                              }}
                            >
                              CONNESSO
                            </motion.span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
                          {p.desc}
                        </div>
                      </div>

                      {connected ? (
                        <motion.button
                          onClick={() => disconnect(p.id)}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 11px', background: 'transparent',
                            border: '1px solid rgba(248,113,113,0.2)',
                            borderRadius: 7, cursor: 'pointer',
                            color: 'var(--danger)', fontSize: 11, fontWeight: 600,
                          }}
                        >
                          <Unlink size={10} /> Disconnetti
                        </motion.button>
                      ) : connecting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px' }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            style={{
                              width: 12, height: 12, borderRadius: '50%',
                              border: `2px solid ${p.color}`, borderTopColor: 'transparent',
                            }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>connessione…</span>
                        </div>
                      ) : (
                        <motion.button
                          onClick={() => connect(p.id)}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '5px 13px',
                            background: `${p.color}18`,
                            border: `1px solid ${p.color}35`,
                            borderRadius: 7, cursor: 'pointer',
                            color: p.color, fontSize: 11, fontWeight: 600,
                            boxShadow: `inset 0 1px 0 ${p.color}15`,
                          }}
                        >
                          <ExternalLink size={10} /> Connetti
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
                <p style={{
                  fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic',
                  lineHeight: 1.6, marginTop: 4,
                }}>
                  Le connessioni OAuth vengono gestite in modo sicuro. WhyPost non memorizza le credenziali.
                </p>
              </motion.div>
            )}

            {/* Pipeline */}
            {section === 'pipeline' && (
              <motion.div key="pipeline" variants={contentVariants} initial="hidden" animate="visible" exit="exit"
                style={{ padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {[
                  {
                    label: 'Auto-run pipeline',
                    sub: 'Avvia automaticamente alla mezzanotte se il buffer è sotto soglia',
                    control: <Toggle on={autoRun} onChange={setAutoRun} />,
                  },
                  {
                    label: 'Blocco SAFETY obbligatorio',
                    sub: 'I video non passano al rendering se la review fallisce',
                    control: <Toggle on={safetyBlock} onChange={setSafetyBlock} />,
                  },
                  {
                    label: 'CLACK in HD (1080p)',
                    sub: 'Rendering ad alta qualità — più lento, più pesante',
                    control: <Toggle on={clackHD} onChange={setClackHD} />,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    custom={i} variants={itemVariants} initial="hidden" animate="visible"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: i % 2 === 0 ? 'var(--surf-2)' : 'transparent',
                      borderRadius: 10,
                      gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        {item.sub}
                      </div>
                    </div>
                    {item.control}
                  </motion.div>
                ))}

                {/* Quality threshold slider */}
                <motion.div
                  custom={3} variants={itemVariants} initial="hidden" animate="visible"
                  style={{ padding: '14px 16px', background: 'var(--surf-2)', borderRadius: 10, marginTop: 2 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                        Qualità minima script
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                        Score sotto questa soglia: scartato e riscritto
                      </div>
                    </div>
                    <span className="mono" style={{
                      fontSize: 22, fontWeight: 700,
                      color: qualityMin >= 8 ? 'var(--accent)' : qualityMin >= 6 ? 'var(--warn)' : 'var(--danger)',
                    }}>
                      {qualityMin}
                    </span>
                  </div>
                  <input
                    type="range" min={1} max={10} value={qualityMin}
                    onChange={e => setQualityMin(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--text-3)' }}>1 — permissivo</span>
                    <span style={{ fontSize: 9, color: 'var(--text-3)' }}>10 — rigido</span>
                  </div>
                </motion.div>

                {/* Concurrent renders */}
                <motion.div
                  custom={4} variants={itemVariants} initial="hidden" animate="visible"
                  style={{ padding: '14px 16px', borderRadius: 10, marginTop: 2 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                        Render paralleli (CLACK)
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                        Quanti video renderizza in simultanea
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {[1, 2, 3, 4].map(n => (
                        <motion.button
                          key={n}
                          onClick={() => setRenderConcur(n)}
                          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.9 }}
                          style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: renderConcur === n ? 'rgba(52,211,153,0.12)' : 'var(--surf-2)',
                            border: `1px solid ${renderConcur === n ? 'rgba(52,211,153,0.28)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            fontFamily: 'Geist Mono, monospace',
                            fontSize: 13, fontWeight: 700,
                            color: renderConcur === n ? 'var(--accent)' : 'var(--text-3)',
                            transition: 'all 0.15s',
                          }}
                        >
                          {n}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* Notifiche */}
            {section === 'notify' && (
              <motion.div key="notify" variants={contentVariants} initial="hidden" animate="visible" exit="exit"
                style={{ padding: '16px 22px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {[
                  {
                    label: 'Notifica avvio pipeline',
                    sub: 'Avviso quando il pipeline parte automaticamente',
                    on: notifyRun, set: setNotifyRun,
                  },
                  {
                    label: 'Notifica su errori',
                    sub: 'Alert immediato se un agente va in stato di errore',
                    on: notifyError, set: setNotifyError,
                  },
                  {
                    label: 'Notifica pubblicazione',
                    sub: 'Conferma quando un video viene pubblicato con successo',
                    on: notifyPublish, set: setNotifyPublish,
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    custom={i} variants={itemVariants} initial="hidden" animate="visible"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: i % 2 === 0 ? 'var(--surf-2)' : 'transparent',
                      borderRadius: 10, gap: 16,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.4 }}>
                        {item.sub}
                      </div>
                    </div>
                    <Toggle on={item.on} onChange={item.set} />
                  </motion.div>
                ))}

                {/* Webhook */}
                <motion.div
                  custom={3} variants={itemVariants} initial="hidden" animate="visible"
                  style={{ padding: '14px 16px', background: 'var(--surf-2)', borderRadius: 10, marginTop: 4 }}
                >
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>
                    Webhook URL
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 10 }}>
                    Invia eventi POST a Slack, Telegram, Discord, o n8n
                  </div>
                  <div style={{
                    display: 'flex', gap: 6, alignItems: 'center',
                    background: 'var(--surf-3)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '2px 4px 2px 12px',
                  }}>
                    <input
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/..."
                      style={{
                        flex: 1, background: 'none', border: 'none', outline: 'none',
                        fontSize: 11, color: 'var(--text)', fontFamily: 'Geist Mono, monospace',
                        caretColor: 'var(--accent)',
                      }}
                    />
                    {webhookUrl && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {}}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '6px 10px', borderRadius: 6,
                          background: 'rgba(52,211,153,0.12)',
                          border: '1px solid rgba(52,211,153,0.22)',
                          cursor: 'pointer', fontSize: 11, fontWeight: 600,
                          color: 'var(--accent)',
                        }}
                      >
                        <Check size={10} /> Salva
                      </motion.button>
                    )}
                  </div>
                </motion.div>

                {/* Delivery channels note */}
                <motion.div
                  custom={4} variants={itemVariants} initial="hidden" animate="visible"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                    background: 'rgba(52,211,153,0.04)',
                    border: '1px solid rgba(52,211,153,0.12)',
                    borderRadius: 10, marginTop: 4,
                  }}
                >
                  <Bell size={14} color="rgba(52,211,153,0.6)" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      Le notifiche vengono inviati via webhook. Supporta Slack, Discord, Telegram Bot, e qualsiasi receiver HTTP.
                    </div>
                    <a href="#" onClick={e => e.preventDefault()} style={{
                      fontSize: 10, color: 'var(--accent)', fontStyle: 'italic',
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3,
                    }}>
                      Documentazione webhook <ChevronRight size={9} />
                    </a>
                  </div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
