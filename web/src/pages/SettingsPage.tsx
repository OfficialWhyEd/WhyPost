import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Unlink, ExternalLink, FolderOpen, Key, Sliders, Bell,
  Check, X, Loader, ChevronDown, ChevronUp, Eye, EyeOff, Wand2,
  Plus, Minus, Users, Heart, Play, Image,
} from 'lucide-react';

type Section = 'social' | 'pipeline' | 'api' | 'notifiche';

// ── Platform icons ────────────────────────────────────────────────────────────
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
function PexelsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="currentColor" opacity="0.12"/>
      <text x="4" y="17" fontSize="13" fontWeight="900" fill="currentColor" fontFamily="monospace">P</text>
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step { text: string; link?: string }

interface PlatformCfg {
  id: string;
  name: string;
  desc: string;
  color: string;
  Icon: React.FC<{ size?: number }>;
  type: 'token' | 'google_oauth';
  fields?: { key: string; label: string; placeholder: string; secret?: boolean }[];
  oauthFile?: string;
  oauthStartUrl?: string;
  tokenKey?: string;
  steps: Step[];
}

interface CredStatus {
  configured: boolean;
  token_preview?: string;
  account_id?: string;
  value?: string;
  token_ready?: boolean;
}

interface SocialStats {
  instagram?: {
    ok: boolean;
    username?: string;
    followers?: number;
    posts?: number;
    error?: string;
  };
  tiktok?: {
    ok: boolean;
    username?: string;
    followers?: number;
    likes?: number;
    videos?: number;
    error?: string;
  };
}

interface PipelineConfig {
  target_days: number;
  videos_per_day: number;
  schedule_slots: string[];
  platforms: Record<string, boolean | { enabled?: boolean }>;
}

// ── Platform config ───────────────────────────────────────────────────────────

const PLATFORMS: PlatformCfg[] = [
  {
    id: 'instagram', name: 'Instagram', desc: 'Pubblica Reels automaticamente',
    color: '#E1306C', Icon: IgIcon, type: 'token',
    tokenKey: 'IG_ACCESS_TOKEN',
    fields: [
      { key: 'IG_ACCESS_TOKEN', label: 'Access Token', placeholder: 'EAABwzLixnjYBO...', secret: true },
      { key: 'IG_ACCOUNT_ID',  label: 'Account ID (numerico)', placeholder: '17841400000000000' },
    ],
    steps: [
      { text: 'Apri questo link → clicca il pulsante verde "Crea app"', link: 'https://developers.facebook.com/apps/' },
      { text: 'Scegli "Altro" → Avanti → scegli "Business" → Avanti → dai un nome (es. "WhyPost") → clicca "Crea app"' },
      { text: 'Nella pagina che si apre cerca il riquadro "Instagram Graph API" → clicca "Configura"' },
      { text: 'Menu a sinistra → in fondo clicca "Strumenti" → poi "Graph API Explorer"', link: 'https://developers.facebook.com/tools/explorer/' },
      { text: 'In alto a destra: seleziona la tua app dal menu → clicca il pulsante blu "Genera token di accesso utente"' },
      { text: 'Si apre un popup: abilita "instagram_content_publish" e "instagram_manage_insights" → clicca "Genera" → autorizza su Instagram' },
      { text: 'Copia il token che appare nel campo di testo → incollalo qui sotto → clicca "Rileva automaticamente" per l\'Account ID' },
    ],
  },
  {
    id: 'tiktok', name: 'TikTok', desc: 'Pubblica video brevi',
    color: '#c8c8c8', Icon: TkIcon, type: 'token',
    fields: [
      { key: 'TT_ACCESS_TOKEN', label: 'Access Token', placeholder: 'act.xxxxx...', secret: true },
    ],
    steps: [
      { text: 'Apri TikTok Developer Portal → la tua app', link: 'https://developers.tiktok.com/' },
      { text: 'Products → Content Posting API → abilita' },
      { text: 'Sandbox → Test Users → aggiungi il tuo account → ottieni Access Token' },
      { text: 'Incolla il token qui sotto' },
    ],
  },
  {
    id: 'youtube', name: 'YouTube Shorts', desc: 'Pubblica Shorts automaticamente',
    color: '#FF4444', Icon: YtIcon, type: 'google_oauth',
    oauthFile: 'yt_credentials.json',
    oauthStartUrl: '/api/oauth/youtube/start',
    steps: [
      { text: 'Google Cloud Console → Libreria API → abilita YouTube Data API v3', link: 'https://console.cloud.google.com/apis/library' },
      { text: 'Credenziali → Crea credenziali → ID client OAuth 2.0 → App desktop' },
      { text: 'Scarica il JSON e salvalo come: WhyPost/data/yt_credentials.json' },
      { text: 'Clicca "Apri cartella data/" → copia il file → poi "Avvia autenticazione"' },
    ],
  },
  {
    id: 'gcal', name: 'Google Calendar', desc: 'Sincronizza orari di pubblicazione',
    color: '#4285F4', Icon: GCalIcon, type: 'google_oauth',
    oauthFile: 'gcal_credentials.json',
    oauthStartUrl: '/api/oauth/gcal/start',
    steps: [
      { text: 'Google Cloud Console → Libreria API → abilita Google Calendar API', link: 'https://console.cloud.google.com/apis/library' },
      { text: 'Credenziali → Crea credenziali → ID client OAuth 2.0 → App desktop' },
      { text: 'Scarica il JSON e salvalo come: WhyPost/data/gcal_credentials.json' },
      { text: 'Clicca "Apri cartella data/" → copia il file → poi "Avvia autenticazione"' },
    ],
  },
];

const OTHER_FIELDS: PlatformCfg[] = [
  {
    id: 'pexels', name: 'Pexels', desc: 'B-roll gratuiti per i video',
    color: '#05A081', Icon: PexelsIcon, type: 'token',
    fields: [{ key: 'PEXELS_API_KEY', label: 'API Key', placeholder: '563492ad6f9170...', secret: true }],
    steps: [
      { text: 'Registrati su Pexels → piano gratuito disponibile', link: 'https://www.pexels.com/api/' },
      { text: 'Il tuo profilo → API Key → copia e incolla qui sotto' },
    ],
  },
];

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchCredStatus(): Promise<Record<string, CredStatus>> {
  try { return (await fetch('/api/credentials/status')).json(); }
  catch { return {}; }
}

async function fetchSocialStats(): Promise<SocialStats> {
  try { return (await fetch('/api/social-stats')).json(); }
  catch { return {}; }
}

async function fetchPipelineConfig(): Promise<PipelineConfig> {
  try { return (await fetch('/api/pipeline-config')).json(); }
  catch { return { target_days: 7, videos_per_day: 2, schedule_slots: ['08:00', '13:30', '20:00'], platforms: {} }; }
}

async function savePipelineConfig(data: Partial<PipelineConfig>): Promise<boolean> {
  try {
    const r = await fetch('/api/pipeline-config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await r.json()).ok;
  } catch { return false; }
}

async function saveCredentials(data: Record<string, string>): Promise<boolean> {
  try {
    const r = await fetch('/api/credentials/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return (await r.json()).ok;
  } catch { return false; }
}

async function testCredential(platform: string): Promise<{ ok: boolean; info?: string; error?: string }> {
  try { return (await fetch(`/api/credentials/test/${platform}`)).json(); }
  catch { return { ok: false, error: 'Errore di rete' }; }
}

async function openDataFolder(): Promise<void> {
  await fetch('/api/credentials/open-folder');
}

async function detectIgAccountId(token: string): Promise<{ ok: boolean; account_id?: string; error?: string }> {
  try { return (await fetch(`/api/credentials/ig-account-id?token=${encodeURIComponent(token)}`)).json(); }
  catch { return { ok: false, error: 'Errore di rete' }; }
}

// ── Step guide ────────────────────────────────────────────────────────────────

function StepGuide({ steps, color }: { steps: Step[]; color: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 7 }}>
          <span style={{
            width: 19, height: 19, borderRadius: '50%', flexShrink: 0, marginTop: 1,
            background: `${color}14`, border: `1px solid ${color}28`,
            color, fontSize: 9.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{i + 1}</span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {s.text}
            {s.link && (
              <a href={s.link} target="_blank" rel="noopener noreferrer"
                style={{ color, marginLeft: 5, textDecoration: 'none', fontWeight: 600 }}>
                Apri →
              </a>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stats chips ───────────────────────────────────────────────────────────────

function StatChip({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '2px 7px', borderRadius: 5,
      background: `${color}10`, border: `1px solid ${color}20`,
      fontSize: 10, color: 'var(--text-2)',
    }}>
      <span style={{ color, display: 'flex', alignItems: 'center' }}>{icon}</span>
      <span style={{ fontWeight: 700, color }}>{typeof value === 'number' ? value.toLocaleString('it-IT') : value}</span>
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
    </div>
  );
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Platform card ─────────────────────────────────────────────────────────────

function PlatformCard({ p, status, socialStats, onSaved }: {
  p: PlatformCfg;
  status: CredStatus | undefined;
  socialStats: SocialStats;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; info?: string; error?: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [authWaiting, setAuthWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const isConnected = p.type === 'google_oauth'
    ? (status?.token_ready ?? false)
    : (status?.configured ?? false);
  const filePresent = p.type === 'google_oauth' && (status?.configured ?? false);

  const igStats = p.id === 'instagram' ? socialStats.instagram : undefined;
  const ttStats = p.id === 'tiktok' ? socialStats.tiktok : undefined;

  async function handleSave() {
    if (!values || Object.values(values).every(v => !v.trim())) return;
    setSaving(true);
    const ok = await saveCredentials(values);
    setSaving(false);
    if (ok) { onSaved(); setExpanded(false); setValues({}); }
  }

  async function handleTest() {
    setTesting(true); setTestResult(null);
    setTestResult(await testCredential(p.id));
    setTesting(false);
  }

  async function handleDetectAccountId() {
    const token = values['IG_ACCESS_TOKEN'] || '';
    if (!token.trim()) { setDetectError('Incolla prima il token'); return; }
    setDetecting(true); setDetectError('');
    const r = await detectIgAccountId(token);
    setDetecting(false);
    if (r.ok && r.account_id) {
      setValues(v => ({ ...v, IG_ACCOUNT_ID: r.account_id! }));
    } else {
      setDetectError(r.error || 'Non trovato — inserisci manualmente');
    }
  }

  async function handleGoogleAuth() {
    if (!p.oauthStartUrl) return;
    try {
      const r = await fetch(p.oauthStartUrl, { method: 'POST' });
      const d = await r.json();
      if (!d.ok) return;
      setAuthWaiting(true);
      pollRef.current = setInterval(async () => {
        const s = await fetchCredStatus();
        if (s[p.id]?.token_ready) {
          clearInterval(pollRef.current!);
          setAuthWaiting(false);
          onSaved();
        }
      }, 2500);
      setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); setAuthWaiting(false); } }, 180_000);
    } catch { /* silent */ }
  }

  return (
    <motion.div layout style={{
      background: isConnected ? `${p.color}07` : 'var(--surf-1)',
      border: `1px solid ${isConnected ? `${p.color}22` : 'var(--border)'}`,
      borderRadius: 13, overflow: 'hidden',
      transition: 'background 0.25s, border-color 0.25s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: isConnected ? `${p.color}14` : 'var(--surf-2)',
          border: `1px solid ${isConnected ? `${p.color}28` : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: p.color, opacity: isConnected ? 1 : 0.5, transition: 'all 0.25s',
        }}>
          <p.Icon />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: isConnected ? 'var(--text)' : 'var(--text-2)' }}>
              {p.name}
            </span>
            {isConnected && (
              <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} style={{
                fontSize: 9, fontWeight: 700, color: 'var(--accent)',
                padding: '1px 5px', background: 'rgba(52,211,153,0.12)',
                border: '1px solid rgba(52,211,153,0.2)', borderRadius: 4,
              }}>CONNESSO</motion.span>
            )}
            {filePresent && !isConnected && (
              <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} style={{
                fontSize: 9, fontWeight: 700, color: 'oklch(78% 0.16 55)',
                padding: '1px 5px', background: 'oklch(78% 0.16 55 / 0.1)',
                border: '1px solid oklch(78% 0.16 55 / 0.25)', borderRadius: 4,
              }}>AUTENTICA</motion.span>
            )}
            {/* Stats chips when connected */}
            {isConnected && igStats?.ok && (
              <>
                <StatChip icon={<Users size={8} />} value={fmtNum(igStats.followers ?? 0)} label="follower" color={p.color} />
                <StatChip icon={<Image size={8} />} value={igStats.posts ?? 0} label="post" color={p.color} />
                {igStats.username && (
                  <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }}>
                    @{igStats.username}
                  </span>
                )}
              </>
            )}
            {isConnected && ttStats?.ok && (
              <>
                <StatChip icon={<Users size={8} />} value={fmtNum(ttStats.followers ?? 0)} label="follower" color={p.color} />
                <StatChip icon={<Heart size={8} />} value={fmtNum(ttStats.likes ?? 0)} label="like" color={p.color} />
                <StatChip icon={<Play size={8} />} value={ttStats.videos ?? 0} label="video" color={p.color} />
              </>
            )}
            {/* YouTube / GCal status chips */}
            {p.id === 'youtube' && isConnected && (
              <StatChip icon={<Check size={8} />} value="Token valido" label="" color={p.color} />
            )}
            {p.id === 'gcal' && isConnected && (
              <StatChip icon={<Check size={8} />} value="Sincronizzato" label="" color={p.color} />
            )}
            {/* Token preview when no stats */}
            {status?.token_preview && !igStats?.ok && !ttStats?.ok && (
              <span style={{ fontSize: 9.5, color: 'var(--text-3)', fontFamily: 'Geist Mono, monospace' }}>
                {status.token_preview}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>{p.desc}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {isConnected && (
            <motion.button onClick={handleTest} disabled={testing}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
              style={{
                padding: '5px 11px', background: 'transparent',
                border: `1px solid ${p.color}30`, borderRadius: 7,
                cursor: testing ? 'default' : 'pointer',
                color: p.color, fontSize: 10.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {testing ? <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={10} />}
              Testa
            </motion.button>
          )}
          <motion.button onClick={() => setExpanded(e => !e)}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            style={{
              padding: '6px 13px',
              background: isConnected ? 'transparent' : `${p.color}14`,
              border: `1px solid ${p.color}30`, borderRadius: 7,
              cursor: 'pointer', color: p.color, fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {isConnected ? <Unlink size={10} /> : <ExternalLink size={10} />}
            {isConnected ? 'Aggiorna' : 'Connetti'}
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          </motion.button>
        </div>
      </div>

      {/* Test result */}
      <AnimatePresence>
        {testResult && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} style={{ padding: '0 18px 10px' }}>
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 11.5,
              background: testResult.ok ? 'oklch(72% 0.16 155 / 0.08)' : 'oklch(65% 0.18 25 / 0.08)',
              border: `1px solid ${testResult.ok ? 'oklch(72% 0.16 155 / 0.2)' : 'oklch(65% 0.18 25 / 0.2)'}`,
              color: testResult.ok ? 'oklch(72% 0.16 155)' : 'oklch(65% 0.18 25)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {testResult.ok ? <Check size={12} /> : <X size={12} />}
              {testResult.ok ? testResult.info : testResult.error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded form */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0, 0.18, 1] }}
            style={{ overflow: 'hidden' }}>
            <div style={{
              padding: '14px 18px 16px',
              borderTop: `1px solid ${p.color}18`,
            }}>
              <StepGuide steps={p.steps} color={p.color} />

              {/* Token fields */}
              {p.type === 'token' && p.fields && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {p.fields.map(f => (
                    <div key={f.key}>
                      <label style={{
                        fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)',
                        letterSpacing: '0.5px', display: 'block', marginBottom: 5,
                      }}>{f.label}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={f.secret && !showSecrets[f.key] ? 'password' : 'text'}
                          value={values[f.key] ?? ''}
                          onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          style={{
                            width: '100%', padding: f.secret ? '8px 36px 8px 10px' : '8px 10px',
                            background: 'var(--surf-2)', border: '1px solid var(--border)',
                            borderRadius: 8, color: 'var(--text)', fontSize: 12,
                            fontFamily: 'Geist Mono, monospace', outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          onFocus={e => { e.target.style.borderColor = `${p.color}50`; }}
                          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
                        />
                        {f.secret && (
                          <button onClick={() => setShowSecrets(s => ({ ...s, [f.key]: !s[f.key] }))}
                            style={{
                              position: 'absolute', right: 8, top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--text-3)', padding: 2,
                            }}>
                            {showSecrets[f.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        )}
                      </div>
                      {/* Auto-detect Account ID for Instagram */}
                      {f.key === 'IG_ACCOUNT_ID' && (
                        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <motion.button onClick={handleDetectAccountId} disabled={detecting}
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            style={{
                              padding: '4px 10px', fontSize: 10.5, fontWeight: 600,
                              background: 'transparent', border: `1px solid ${p.color}30`,
                              borderRadius: 6, cursor: detecting ? 'default' : 'pointer',
                              color: p.color, display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                            {detecting
                              ? <Loader size={9} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Wand2 size={9} />}
                            Rileva Account ID automaticamente
                          </motion.button>
                          {detectError && (
                            <span style={{ fontSize: 10, color: 'oklch(65% 0.18 25)' }}>{detectError}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <motion.button onClick={handleSave} disabled={saving}
                    whileHover={!saving ? { scale: 1.02 } : {}} whileTap={!saving ? { scale: 0.97 } : {}}
                    style={{
                      marginTop: 4, padding: '9px 0', width: '100%',
                      background: `${p.color}18`, border: `1px solid ${p.color}35`,
                      borderRadius: 9, cursor: saving ? 'default' : 'pointer',
                      color: p.color, fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                    {saving
                      ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...</>
                      : <><Check size={12} /> Salva e connetti</>}
                  </motion.button>
                </div>
              )}

              {/* Google OAuth */}
              {p.type === 'google_oauth' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    padding: '10px 12px', background: 'var(--surf-2)',
                    border: '1px solid var(--border)', borderRadius: 8,
                  }}>
                    <p style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 4 }}>
                      Posiziona il file scaricato come:
                    </p>
                    <code style={{ fontSize: 11, color: p.color, fontFamily: 'Geist Mono, monospace' }}>
                      WhyPost/data/{p.oauthFile}
                    </code>
                  </div>

                  <motion.button onClick={openDataFolder}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '8px 0', width: '100%', background: 'transparent',
                      border: `1px solid ${p.color}28`, borderRadius: 9, cursor: 'pointer',
                      color: 'var(--text-2)', fontSize: 11, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    }}>
                    <FolderOpen size={12} /> Apri cartella data/
                  </motion.button>

                  {filePresent ? (
                    authWaiting ? (
                      <div style={{
                        padding: '12px 14px', background: `${p.color}08`,
                        border: `1px solid ${p.color}20`, borderRadius: 9,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Loader size={12} style={{ animation: 'spin 1s linear infinite', color: p.color }} />
                          <span style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                            Browser aperto — completa l'autenticazione Google...
                          </span>
                        </div>
                        <div style={{ height: 3, background: 'var(--surf-3)', borderRadius: 2, overflow: 'hidden' }}>
                          <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }}
                            transition={{ duration: 120, ease: 'linear' }}
                            style={{ height: '100%', background: p.color, borderRadius: 2 }} />
                        </div>
                        <button onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setAuthWaiting(false); }}
                          style={{
                            alignSelf: 'flex-start', padding: '4px 10px', fontSize: 10.5,
                            background: 'transparent', border: '1px solid var(--border)',
                            borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)',
                          }}>Annulla</button>
                      </div>
                    ) : (
                      <motion.button onClick={handleGoogleAuth}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '9px 0', width: '100%',
                          background: `${p.color}18`, border: `1px solid ${p.color}35`,
                          borderRadius: 9, cursor: 'pointer',
                          color: p.color, fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        }}>
                        <ExternalLink size={12} /> Avvia autenticazione Google
                      </motion.button>
                    )
                  ) : (
                    <p style={{
                      fontSize: 10.5, color: 'var(--text-3)', textAlign: 'center',
                      padding: '6px 0', fontStyle: 'italic',
                    }}>
                      Segui i passi sopra per posizionare il file credentials.json
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Pipeline Section ──────────────────────────────────────────────────────────

function PipelineSection() {
  const [cfg, setCfg] = useState<PipelineConfig>({
    target_days: 7,
    videos_per_day: 2,
    schedule_slots: ['08:00', '13:30', '20:00'],
    platforms: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineConfig().then(d => { setCfg(d); setLoading(false); });
  }, []);

  async function save(key: string, partial: Partial<PipelineConfig>) {
    setSaving(key);
    await savePipelineConfig(partial);
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 1500);
  }

  function isPlatformEnabled(pid: string): boolean {
    const v = cfg.platforms[pid];
    if (typeof v === 'boolean') return v;
    if (typeof v === 'object' && v !== null) return v.enabled !== false;
    return false;
  }

  function togglePlatform(pid: string) {
    const next = { ...cfg.platforms, [pid]: !isPlatformEnabled(pid) };
    setCfg(c => ({ ...c, platforms: next }));
    save('platforms', { platforms: next });
  }

  function changeVideosPerDay(delta: number) {
    const next = Math.max(1, Math.min(5, cfg.videos_per_day + delta));
    setCfg(c => ({ ...c, videos_per_day: next }));
    save('videos_per_day', { videos_per_day: next });
  }

  function changeTargetDays(val: number) {
    const next = Math.max(3, Math.min(14, val));
    setCfg(c => ({ ...c, target_days: next }));
    save('target_days', { target_days: next });
  }

  function updateSlot(idx: number, val: string) {
    const next = cfg.schedule_slots.map((s, i) => i === idx ? val : s);
    setCfg(c => ({ ...c, schedule_slots: next }));
  }
  function saveSlots() {
    save('slots', { schedule_slots: cfg.schedule_slots });
  }
  function addSlot() {
    if (cfg.schedule_slots.length >= 5) return;
    const next = [...cfg.schedule_slots, '12:00'];
    setCfg(c => ({ ...c, schedule_slots: next }));
    save('slots', { schedule_slots: next });
  }
  function removeSlot(idx: number) {
    if (cfg.schedule_slots.length <= 1) return;
    const next = cfg.schedule_slots.filter((_, i) => i !== idx);
    setCfg(c => ({ ...c, schedule_slots: next }));
    save('slots', { schedule_slots: next });
  }

  function openFolder(path: string) {
    fetch(`/api/credentials/open-folder?path=${encodeURIComponent(path)}`).catch(() => {});
    // Fallback: just trigger the open-folder endpoint
    fetch('/api/credentials/open-folder');
  }

  const platformDefs = [
    { id: 'instagram', label: 'Instagram', color: '#E1306C' },
    { id: 'tiktok',   label: 'TikTok',    color: '#c8c8c8' },
    { id: 'youtube',  label: 'YouTube',   color: '#FF4444' },
  ];

  function SaveIndicator({ id }: { id: string }) {
    if (saving === id) return <Loader size={10} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
    if (saved === id) return <Check size={10} style={{ color: 'var(--accent)' }} />;
    return null;
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-3)' }} />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
          fontFamily: 'NeuePower, Geist, sans-serif' }}>Pipeline & Output</h2>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
          Configura la produzione automatica di contenuti
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* ── COL 1 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Video al giorno */}
          <div style={{
            padding: '16px 18px', background: 'var(--surf-1)',
            border: '1px solid var(--border)', borderRadius: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Video al giorno</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Quanti video produrre ogni 24h</div>
              </div>
              <SaveIndicator id="videos_per_day" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button onClick={() => changeVideosPerDay(-1)} whileTap={{ scale: 0.9 }}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--surf-2)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-2)',
                }}>
                <Minus size={13} />
              </motion.button>
              <div style={{
                flex: 1, textAlign: 'center',
                fontSize: 32, fontWeight: 900, color: 'var(--text)',
                fontFamily: 'NeuePower, Geist, sans-serif',
              }}>
                {cfg.videos_per_day}
              </div>
              <motion.button onClick={() => changeVideosPerDay(1)} whileTap={{ scale: 0.9 }}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--surf-2)',
                  border: '1px solid var(--border)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-2)',
                }}>
                <Plus size={13} />
              </motion.button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: n <= cfg.videos_per_day ? 'var(--accent)' : 'var(--surf-3)',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
          </div>

          {/* Buffer target */}
          <div style={{
            padding: '16px 18px', background: 'var(--surf-1)',
            border: '1px solid var(--border)', borderRadius: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Buffer target</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Giorni di video pre-prodotti</div>
              </div>
              <SaveIndicator id="target_days" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--accent)', fontFamily: 'NeuePower, Geist, sans-serif' }}>
                {cfg.target_days}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>giorni</span>
            </div>
            <input
              type="range" min={3} max={14} value={cfg.target_days}
              onChange={e => changeTargetDays(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>3 giorni</span>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>14 giorni</span>
            </div>
          </div>

          {/* Piattaforme attive */}
          <div style={{
            padding: '16px 18px', background: 'var(--surf-1)',
            border: '1px solid var(--border)', borderRadius: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Piattaforme attive</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Dove pubblicare i video</div>
              </div>
              <SaveIndicator id="platforms" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {platformDefs.map(({ id, label, color }) => {
                const enabled = isPlatformEnabled(id);
                return (
                  <div key={id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 9,
                    background: enabled ? `${color}08` : 'var(--surf-2)',
                    border: `1px solid ${enabled ? `${color}20` : 'var(--border)'}`,
                    transition: 'all 0.2s',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: enabled ? color : 'var(--text-3)' }}>
                      {label}
                    </span>
                    <motion.button onClick={() => togglePlatform(id)}
                      style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: enabled ? `${color}30` : 'var(--surf-3)',
                        border: `1px solid ${enabled ? `${color}40` : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', padding: '0 3px',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      <motion.div
                        animate={{ x: enabled ? 16 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        style={{
                          width: 14, height: 14, borderRadius: '50%',
                          background: enabled ? color : 'var(--text-3)',
                        }}
                      />
                    </motion.button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── COL 2 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Slot orari */}
          <div style={{
            padding: '16px 18px', background: 'var(--surf-1)',
            border: '1px solid var(--border)', borderRadius: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Slot pubblicazione</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>Orari giornalieri (max 5)</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <SaveIndicator id="slots" />
                {cfg.schedule_slots.length < 5 && (
                  <motion.button onClick={addSlot} whileTap={{ scale: 0.9 }}
                    style={{
                      width: 22, height: 22, borderRadius: 6, background: 'var(--surf-2)',
                      border: '1px solid var(--border)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)',
                    }}>
                    <Plus size={11} />
                  </motion.button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {cfg.schedule_slots.map((slot, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent)', opacity: 0.15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontWeight: 700, color: 'var(--accent)',
                  }} />
                  <input
                    type="time" value={slot}
                    onChange={e => updateSlot(i, e.target.value)}
                    onBlur={saveSlots}
                    style={{
                      flex: 1, padding: '6px 10px',
                      background: 'var(--surf-2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', fontSize: 12,
                      fontFamily: 'Geist Mono, monospace', outline: 'none',
                      colorScheme: 'dark',
                    }}
                  />
                  <motion.button onClick={() => removeSlot(i)} whileTap={{ scale: 0.9 }}
                    disabled={cfg.schedule_slots.length <= 1}
                    style={{
                      width: 22, height: 22, borderRadius: 6, background: 'transparent',
                      border: '1px solid var(--border)', cursor: cfg.schedule_slots.length <= 1 ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: cfg.schedule_slots.length <= 1 ? 'var(--surf-3)' : 'var(--danger)',
                      opacity: cfg.schedule_slots.length <= 1 ? 0.3 : 1,
                    }}>
                    <X size={10} />
                  </motion.button>
                </div>
              ))}
            </div>
          </div>

          {/* Cartelle */}
          <div style={{
            padding: '16px 18px', background: 'var(--surf-1)',
            border: '1px solid var(--border)', borderRadius: 13,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Cartelle</div>
            {[
              { label: 'Output video', path: '~/Documents/WhyPost/data/renders' },
              { label: 'Remotion',     path: '~/Documents/WhyPost/remotion' },
            ].map(({ label, path }) => (
              <div key={label} style={{
                padding: '10px 12px', marginBottom: 8,
                background: 'var(--surf-2)', border: '1px solid var(--border)', borderRadius: 9,
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <code style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'Geist Mono, monospace', flex: 1, wordBreak: 'break-all' }}>
                    {path}
                  </code>
                  <motion.button onClick={() => openFolder(path)} whileTap={{ scale: 0.9 }}
                    style={{
                      padding: '4px 8px', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 6,
                      cursor: 'pointer', color: 'var(--text-3)', fontSize: 10,
                      display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                    }}>
                    <FolderOpen size={10} /> Finder
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SECTIONS: { id: Section; icon: React.FC<{ size?: number }>; label: string }[] = [
  { id: 'social',    icon: ExternalLink, label: 'Social & Piattaforme' },
  { id: 'pipeline',  icon: Sliders,      label: 'Pipeline & Output'    },
  { id: 'api',       icon: Key,          label: 'Chiavi API'           },
  { id: 'notifiche', icon: Bell,         label: 'Notifiche'            },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 28 } },
};

// ── Notification toggles ──────────────────────────────────────────────────────

function NotificationToggle({ label, defaultEnabled }: { label: string; defaultEnabled: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', marginBottom: 4,
      background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 10,
    }}>
      <span style={{ fontSize: 12, color: enabled ? 'var(--text)' : 'var(--text-2)' }}>{label}</span>
      <motion.button onClick={() => setEnabled(e => !e)}
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: enabled ? 'rgba(52,211,153,0.3)' : 'var(--surf-3)',
          border: `1px solid ${enabled ? 'rgba(52,211,153,0.3)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', padding: '0 3px',
          cursor: 'pointer', transition: 'all 0.2s',
        }}>
        <motion.div
          animate={{ x: enabled ? 16 : 0 }}
          transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
          style={{ width: 14, height: 14, borderRadius: '50%', background: enabled ? 'var(--accent)' : 'var(--text-3)' }}
        />
      </motion.button>
    </div>
  );
}

// ── Public URL field ──────────────────────────────────────────────────────────

function PublicUrlField({ current, onSaved }: { current: string; onSaved: () => void }) {
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValue(current); }, [current]);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    await saveCredentials({ PUBLIC_BASE_URL: value.trim() });
    setSaving(false);
    onSaved();
  }

  return (
    <div style={{ padding: '14px 18px', background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 13 }}>
      <p style={{ fontSize: 10.5, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>
        Avvia un tunnel con: <code style={{ color: 'var(--accent)', fontFamily: 'Geist Mono' }}>cloudflared tunnel --url http://localhost:5173</code> poi incolla l'URL qui.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={value} onChange={e => setValue(e.target.value)}
          placeholder="https://xxxx.trycloudflare.com"
          style={{
            flex: 1, padding: '8px 11px',
            background: 'var(--surf-2)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text)', fontSize: 12,
            fontFamily: 'Geist Mono, monospace', outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = 'oklch(73% 0.14 158 / 0.4)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
        <motion.button onClick={save} disabled={saving || !value.trim()}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
          style={{
            padding: '8px 16px', background: 'var(--accent)',
            border: '1px solid var(--accent)', borderRadius: 8,
            cursor: saving ? 'default' : 'pointer',
            color: 'oklch(15% 0.04 158)', fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
          {saving ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={11} />}
          Salva
        </motion.button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [section, setSection] = useState<Section>('social');
  const [credStatus, setCredStatus] = useState<Record<string, CredStatus>>({});
  const [socialStats, setSocialStats] = useState<SocialStats>({});

  async function loadStatus() {
    const [creds, stats] = await Promise.all([fetchCredStatus(), fetchSocialStats()]);
    setCredStatus(creds);
    setSocialStats(stats);
  }

  useEffect(() => { loadStatus(); }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

        {/* Left nav */}
        <div style={{
          width: 220, flexShrink: 0, padding: '24px 12px',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          <div style={{ paddingLeft: 12, marginBottom: 14 }}>
            <h1 style={{
              fontFamily: 'NeuePower, Geist, sans-serif',
              fontSize: 18, fontWeight: 900, letterSpacing: '-0.2px', color: 'var(--text)',
            }}>IMPOSTAZIONI.</h1>
            <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontStyle: 'italic' }}>
              Configurazione del sistema
            </p>
          </div>
          {SECTIONS.map(({ id, icon: Icon, label }) => {
            const active = section === id;
            return (
              <motion.button key={id} onClick={() => setSection(id)} whileTap={{ scale: 0.97 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 12px', borderRadius: 8,
                  background: active ? 'var(--surf-2)' : 'transparent',
                  border: `1px solid ${active ? 'var(--border-hi)' : 'transparent'}`,
                  cursor: 'pointer', textAlign: 'left',
                  color: active ? 'var(--text)' : 'var(--text-3)',
                  fontSize: 12, fontWeight: active ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                  fontFamily: 'Geist, sans-serif',
                }}>
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
              <motion.div key="social"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
                    fontFamily: 'NeuePower, Geist, sans-serif' }}>
                    Social & Piattaforme
                  </h2>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Connetti i tuoi account per la pubblicazione automatica
                  </p>
                </div>
                <motion.div variants={containerVariants} initial="hidden" animate="visible"
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...PLATFORMS, ...OTHER_FIELDS].map(p => (
                    <motion.div key={p.id} variants={itemVariants}>
                      <PlatformCard
                        p={p}
                        status={credStatus[p.id]}
                        socialStats={socialStats}
                        onSaved={loadStatus}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                <div style={{ marginTop: 20 }}>
                  <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
                    URL PUBBLICA (richiesta da IG e TikTok)
                  </h3>
                  <PublicUrlField current={credStatus.public_url?.value ?? ''} onSaved={loadStatus} />
                </div>
              </motion.div>
            )}

            {section === 'pipeline' && (
              <motion.div key="pipeline"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <PipelineSection />
              </motion.div>
            )}

            {section === 'api' && (
              <motion.div key="api"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
                    fontFamily: 'NeuePower, Geist, sans-serif' }}>Chiavi API</h2>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Riepilogo credenziali configurate</p>
                </div>
                {[
                  { label: 'Instagram Access Token', key: 'instagram', sub: 'token_preview', type: 'token' },
                  { label: 'TikTok Access Token',    key: 'tiktok',    sub: 'token_preview', type: 'token' },
                  { label: 'Pexels API Key',         key: 'pexels',    sub: 'token_preview', type: 'token' },
                  { label: 'YouTube OAuth',          key: 'youtube',   sub: null,            type: 'OAuth' },
                  { label: 'Google Calendar OAuth',  key: 'gcal',      sub: null,            type: 'OAuth' },
                  { label: 'URL Pubblica',           key: 'public_url', sub: 'value',        type: 'file'  },
                ].map(({ label, key, sub, type }) => {
                  const s = credStatus[key];
                  const ok = key === 'youtube' || key === 'gcal' ? (s?.token_ready ?? false) : (s?.configured ?? false);
                  const preview = sub ? (s as unknown as Record<string, string>)?.[sub] : '';
                  return (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', marginBottom: 4,
                      background: 'var(--surf-1)', border: '1px solid var(--border)', borderRadius: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                          background: ok ? 'var(--accent)' : 'var(--danger)',
                          boxShadow: ok ? '0 0 6px var(--accent)' : '0 0 6px var(--danger)',
                        }} />
                        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                        <span style={{
                          fontSize: 8, fontWeight: 700, color: 'var(--text-3)',
                          padding: '1px 4px', background: 'var(--surf-2)',
                          border: '1px solid var(--border)', borderRadius: 3,
                          letterSpacing: '0.3px',
                        }}>{type}</span>
                      </div>
                      <span style={{ fontSize: 10, fontFamily: 'Geist Mono, monospace', color: ok ? 'var(--text-3)' : 'var(--danger)' }}>
                        {ok ? (preview || 'configurata') : 'non configurata'}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {section === 'notifiche' && (
              <motion.div key="notifiche"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
                    fontFamily: 'NeuePower, Geist, sans-serif' }}>Notifiche</h2>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Quando ricevere aggiornamenti dal sistema
                  </p>
                </div>
                {[
                  { label: 'Video pronto per la pubblicazione', enabled: true  },
                  { label: 'Errore nel pipeline',               enabled: true  },
                  { label: 'Buffer sotto soglia critica',        enabled: true  },
                  { label: 'Pubblicazione completata',           enabled: false },
                  { label: 'Nuove metriche disponibili',         enabled: false },
                  { label: 'Aggiornamenti CLACK Director',       enabled: true  },
                ].map(({ label, enabled }) => (
                  <NotificationToggle key={label} label={label} defaultEnabled={enabled} />
                ))}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
