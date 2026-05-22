import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Unlink, ExternalLink, FolderOpen, Key, Sliders, Bell } from 'lucide-react';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';
type Section = 'social' | 'pipeline' | 'api' | 'notifiche';

function IgIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>
    </svg>
  );
}
function TkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.69a8.16 8.16 0 004.77 1.52V6.76a4.85 4.85 0 01-1.01-.07z" fill="currentColor"/>
    </svg>
  );
}
function YtIcon() {
  return (
    <svg width="20" height="14" viewBox="0 0 24 17" fill="none">
      <rect width="24" height="17" rx="4" fill="currentColor"/>
      <path d="M10 5l7 3.5L10 12V5z" fill="oklch(97% 0.005 0)"/>
    </svg>
  );
}
function GCalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
  { id: 'youtube',  name: 'YouTube Shorts',  desc: 'Pubblica Shorts e video lunghi', Icon: YtIcon,   color: '#FF4444' },
  { id: 'gcal',     name: 'Google Calendar', desc: 'Sincronizza calendario pub.',    Icon: GCalIcon, color: '#4285F4' },
];

const SECTIONS: { id: Section; icon: React.FC<{ size?: number }>; label: string }[] = [
  { id: 'social',     icon: ExternalLink, label: 'Social & Piattaforme' },
  { id: 'pipeline',   icon: Sliders,      label: 'Pipeline & Output' },
  { id: 'api',        icon: Key,          label: 'Chiavi API' },
  { id: 'notifiche',  icon: Bell,         label: 'Notifiche' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
};

export function SettingsPage() {
  const [section, setSection] = useState<Section>('social');
  const [connections, setConnections] = useState<Record<string, ConnectionState>>({
    instagram: 'disconnected',
    tiktok:    'disconnected',
    youtube:   'disconnected',
    gcal:      'disconnected',
  });

  function connect(id: string) {
    setConnections(s => ({ ...s, [id]: 'connecting' }));
    setTimeout(() => setConnections(s => ({ ...s, [id]: 'connected' })), 1400);
  }
  function disconnect(id: string) {
    setConnections(s => ({ ...s, [id]: 'disconnected' }));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', overflow: 'hidden' }}
    >
      {/* Left settings nav */}
      <div style={{
        width: 220, flexShrink: 0,
        padding: '24px 12px',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        <div style={{ paddingLeft: 12, marginBottom: 14 }}>
          <h1 style={{
            fontFamily: 'NeuePower, Geist, sans-serif',
            fontSize: 18, fontWeight: 900, letterSpacing: '-0.2px', color: 'var(--text)',
          }}>
            IMPOSTAZIONI.
          </h1>
          <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
            Configurazione del sistema
          </p>
        </div>
        {SECTIONS.map(({ id, icon: Icon, label }) => {
          const active = section === id;
          return (
            <motion.button
              key={id}
              onClick={() => setSection(id)}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px', borderRadius: 8,
                background: active ? 'var(--surf-2)' : 'transparent',
                border: `1px solid ${active ? 'var(--border-hi)' : 'transparent'}`,
                cursor: 'pointer', textAlign: 'left',
                color: active ? 'var(--text)' : 'var(--text-3)',
                fontSize: 12, fontWeight: active ? 600 : 400,
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              <Icon size={13} />
              {label}
            </motion.button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px 32px' }}>
        <AnimatePresence mode="wait">
          {section === 'social' && (
            <motion.div
              key="social"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                  Social & Piattaforme
                </h2>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Connetti i tuoi account per la pubblicazione automatica
                </p>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {PLATFORMS.map(p => {
                  const state = connections[p.id];
                  const connected  = state === 'connected';
                  const connecting = state === 'connecting';

                  return (
                    <motion.div
                      key={p.id}
                      variants={itemVariants}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '14px 18px',
                        background: connected ? `${p.color}09` : 'var(--surf-1)',
                        border: `1px solid ${connected ? `${p.color}25` : 'var(--border)'}`,
                        borderRadius: 12,
                        transition: 'background 0.25s, border-color 0.25s',
                        boxShadow: connected ? `inset 0 1px 0 ${p.color}10` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
                      }}
                    >
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: connected ? `${p.color}14` : 'var(--surf-2)',
                        border: `1px solid ${connected ? `${p.color}28` : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: p.color, opacity: connected ? 1 : 0.55,
                        transition: 'all 0.25s',
                      }}>
                        <p.Icon />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: connected ? 'var(--text)' : 'var(--text-2)' }}>
                            {p.name}
                          </span>
                          {connected && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.7 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={{
                                fontSize: 9, fontWeight: 700,
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
                        <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{p.desc}</p>
                      </div>
                      {connected ? (
                        <motion.button
                          onClick={() => disconnect(p.id)}
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.95 }}
                          transition={{ type: 'spring' as const, stiffness: 500, damping: 28 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 12px', background: 'transparent',
                            border: '1px solid rgba(248,113,113,0.22)',
                            borderRadius: 8, cursor: 'pointer',
                            color: 'var(--danger)', fontSize: 11, fontWeight: 600,
                          }}
                        >
                          <Unlink size={11} /> Disconnetti
                        </motion.button>
                      ) : connecting ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px' }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                            style={{
                              width: 13, height: 13, borderRadius: '50%',
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
                            padding: '6px 14px',
                            background: `${p.color}16`,
                            border: `1px solid ${p.color}32`,
                            borderRadius: 8, cursor: 'pointer',
                            color: p.color, fontSize: 11, fontWeight: 600,
                          }}
                        >
                          <ExternalLink size={10} /> Connetti
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {section === 'pipeline' && (
            <motion.div
              key="pipeline"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Pipeline & Output</h2>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Percorsi e configurazione del rendering</p>
              </div>
              {[
                { label: 'Cartella output video', value: '~/Documents/WhyPost/output', icon: FolderOpen },
                { label: 'Cartella Remotion',     value: '~/Documents/Remotion',       icon: FolderOpen },
                { label: 'Buffer giorni target',  value: '7',                           icon: Sliders    },
                { label: 'Video al giorno',       value: '1',                           icon: Sliders    },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', marginBottom: 4,
                  background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon size={13} color="var(--text-3)" />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>{value}</span>
                </div>
              ))}
            </motion.div>
          )}

          {section === 'api' && (
            <motion.div
              key="api"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Chiavi API</h2>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Credenziali per i servizi esterni</p>
              </div>
              {[
                { label: 'Anthropic API Key',   masked: 'sk-ant-••••••••••••••••4a2f', ok: true  },
                { label: 'ElevenLabs API Key',  masked: 'non configurata',             ok: false },
                { label: 'Pexels API Key',      masked: '••••••••••••••••8b3c',        ok: true  },
              ].map(({ label, masked, ok }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', marginBottom: 4,
                  background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: ok ? 'var(--accent)' : 'var(--text-3)',
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                  </div>
                  <span className="mono" style={{ fontSize: 10, color: ok ? 'var(--text-3)' : 'var(--danger)' }}>
                    {masked}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          {section === 'notifiche' && (
            <motion.div
              key="notifiche"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}
            >
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Notifiche</h2>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Quando ricevere aggiornamenti dal sistema</p>
              </div>
              {[
                { label: 'Video pronto per la pubblicazione', enabled: true  },
                { label: 'Errore nel pipeline',              enabled: true  },
                { label: 'Buffer sotto soglia critica',       enabled: true  },
                { label: 'Pubblicazione completata',          enabled: false },
                { label: 'Nuove metriche disponibili',        enabled: false },
              ].map(({ label, enabled }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', marginBottom: 4,
                  background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                  <div style={{
                    width: 32, height: 18, borderRadius: 10,
                    background: enabled ? 'rgba(52,211,153,0.3)' : 'var(--surf-3)',
                    border: `1px solid ${enabled ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center',
                    padding: '0 3px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}>
                    <motion.div
                      animate={{ x: enabled ? 14 : 0 }}
                      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                      style={{
                        width: 12, height: 12, borderRadius: '50%',
                        background: enabled ? 'var(--accent)' : 'var(--text-3)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
