import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, Volume2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import type { VideoItem, VideoDetail } from '../types'

const STATUS_LABEL: Record<string, string> = {
  scripted: 'Script pronto',
  assets_ready: 'Asset pronti',
  rendered: 'Renderizzato',
  ready: 'Pronto',
  published: 'Pubblicato',
  needs_fix: 'Da correggere',
}

const STATUS_COLOR: Record<string, string> = {
  ready: 'var(--accent)',
  rendered: '#60a5fa',
  assets_ready: 'var(--warn)',
  scripted: 'var(--text-2)',
  needs_fix: 'var(--danger)',
  published: 'rgba(52,211,153,0.45)',
}

const PLATFORM_COLOR: Record<string, string> = {
  instagram: '#c13584',
  tiktok: '#ff0050',
  youtube: '#ff0000',
}

interface Props {
  video: VideoItem
  onClose: () => void
  onRefresh: () => void
}

export function VideoPreviewModal({ video, onClose, onRefresh }: Props) {
  const [detail, setDetail] = useState<VideoDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [note, setNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetchDetail()
    return () => {
      // cleanup media on unmount
      audioRef.current?.pause()
      videoRef.current?.pause()
    }
  }, [video.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function fetchDetail() {
    setLoading(true)
    try {
      const r = await fetch(`/api/video/${video.id}/detail`)
      if (r.ok) setDetail(await r.json())
      else setDetail(video as VideoDetail)
    } catch {
      setDetail(video as VideoDetail)
    } finally {
      setLoading(false)
    }
  }

  async function doAction(action: 'approve' | 'reject') {
    setActionLoading(true)
    try {
      await fetch(`/api/video/${video.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      onRefresh()
      onClose()
    } finally {
      setActionLoading(false)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return
    if (audioPlaying) { audioRef.current.pause(); setAudioPlaying(false) }
    else { audioRef.current.play(); setAudioPlaying(true) }
  }

  function toggleVideo() {
    if (!videoRef.current) return
    if (videoPlaying) { videoRef.current.pause(); setVideoPlaying(false) }
    else { videoRef.current.play(); setVideoPlaying(true) }
  }

  const d = detail ?? (video as VideoDetail)
  const hasAudio = !!d.assets?.audio
  const hasRender = !!d.render_path
  const isPublished = d.status === 'published'
  const isReady = d.status === 'ready'
  const canApprove = ['rendered', 'assets_ready', 'scripted'].includes(d.status)
  const canReject = !isPublished

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring' as const, stiffness: 340, damping: 30 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 880, maxHeight: '90vh',
            background: 'rgba(14,14,20,0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid var(--border-hi)',
            boxShadow: '0 1px 0 0 var(--inset-hi) inset, 0 24px 80px rgba(0,0,0,0.7)',
            borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{
                padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                background: `${STATUS_COLOR[d.status] ?? 'var(--text-3)'}22`,
                color: STATUS_COLOR[d.status] ?? 'var(--text-2)',
                border: `1px solid ${STATUS_COLOR[d.status] ?? 'var(--text-3)'}44`,
                flexShrink: 0,
              }}>
                {STATUS_LABEL[d.status] ?? d.status}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 600, color: 'var(--text)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {d.title || d.idea_title || d.id}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Platform tags */}
              {(d.platform ?? []).map(p => (
                <span key={p} style={{
                  padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                  background: `${PLATFORM_COLOR[p] ?? '#888'}22`,
                  color: PLATFORM_COLOR[p] ?? '#888',
                  border: `1px solid ${PLATFORM_COLOR[p] ?? '#888'}44`,
                }}>
                  {p.toUpperCase()}
                </span>
              ))}
              {d.language && (
                <span style={{
                  padding: '2px 7px', borderRadius: 20, fontSize: 10,
                  background: 'var(--surf-2)', color: 'var(--text-2)',
                }}>
                  {d.language.toUpperCase()}
                </span>
              )}
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05, background: 'var(--surf-3)' } as never}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                style={{
                  background: 'var(--surf-2)', border: 'none', borderRadius: 8,
                  padding: 7, cursor: 'pointer', color: 'var(--text-2)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={13} />
              </motion.button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', gap: 0 }}>

            {/* Left: Script */}
            <div style={{
              flex: 1, padding: '18px 20px', borderRight: '1px solid var(--border)',
              overflowY: 'auto',
            }}>
              {loading ? (
                <div style={{ color: 'var(--text-3)', fontSize: 12, paddingTop: 40, textAlign: 'center' }}>
                  Carico dettagli...
                </div>
              ) : (
                <>
                  {/* Scheduled */}
                  {d.scheduled_at && (
                    <div style={{ marginBottom: 16, fontSize: 10, color: 'var(--text-3)' }}>
                      Schedulato: <span style={{ color: 'var(--text-2)' }}>{d.scheduled_at}</span>
                    </div>
                  )}

                  {/* Script sections */}
                  {d.script ? (
                    <>
                      {d.script.title_card && (
                        <ScriptSection label="TITLE CARD" color="#4a9eff">
                          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                            {d.script.title_card}
                          </span>
                        </ScriptSection>
                      )}
                      {d.script.hook && (
                        <ScriptSection label="HOOK" color="var(--warn)">
                          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text)' }}>
                            {d.script.hook}
                          </p>
                        </ScriptSection>
                      )}
                      {d.script.body && d.script.body.length > 0 && (
                        <ScriptSection label="BODY" color="var(--accent)">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {d.script.body.map((line, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span className="mono" style={{
                                  fontSize: 10, color: 'var(--accent)', marginTop: 4, flexShrink: 0, fontWeight: 700,
                                }}>
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text)', margin: 0 }}>
                                  {line}
                                </p>
                              </div>
                            ))}
                          </div>
                        </ScriptSection>
                      )}
                      {d.script.cta && (
                        <ScriptSection label="CTA" color="#c13584">
                          <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text)' }}>
                            {d.script.cta}
                          </p>
                        </ScriptSection>
                      )}
                      {d.script.hashtags && d.script.hashtags.length > 0 && (
                        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {d.script.hashtags.map(h => (
                            <span key={h} style={{
                              fontSize: 10, color: '#4a9eff',
                              background: 'rgba(74,158,255,0.08)', padding: '2px 8px', borderRadius: 20,
                            }}>
                              {h.startsWith('#') ? h : `#${h}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                      Script non ancora disponibile per questo video.
                    </div>
                  )}

                  {/* TTS text preview */}
                  {d.assets?.tts_text && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                        color: 'var(--text-3)', marginBottom: 6 }}>
                        TESTO TTS
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6,
                        background: 'var(--surf-1)', borderRadius: 8, padding: 10,
                        borderLeft: '2px solid var(--border-hi)',
                      }}>
                        {d.assets.tts_text}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right: Media */}
            <div style={{ width: 280, flexShrink: 0, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Video player (9:16 aspect) */}
              <div style={{
                background: 'var(--surf-1)', borderRadius: 10,
                border: '1px solid var(--border)',
                aspectRatio: '9/16', display: 'flex', alignItems: 'center',
                justifyContent: 'center', overflow: 'hidden', position: 'relative',
                maxHeight: 320,
              }}>
                {hasRender ? (
                  <>
                    <video
                      ref={videoRef}
                      src={`/api/video/${d.id}/render`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onEnded={() => setVideoPlaying(false)}
                      loop={false}
                    />
                    <button onClick={toggleVideo} style={{
                      position: 'absolute', bottom: 10, right: 10,
                      background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                      width: 32, height: 32, cursor: 'pointer', color: 'oklch(97% 0.005 0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {videoPlaying ? <Pause size={12} /> : <Play size={12} />}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 11 }}>
                    <div style={{ marginBottom: 8, opacity: 0.25 }}><Play size={28} /></div>
                    {d.status === 'scripted' || d.status === 'assets_ready'
                      ? 'Video non ancora renderizzato'
                      : 'Nessun video disponibile'}
                  </div>
                )}
              </div>

              {/* Audio player */}
              {hasAudio && (
                <div style={{
                  background: 'var(--surf-1)', borderRadius: 9,
                  border: '1px solid var(--border)', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <audio
                    ref={audioRef}
                    src={`/api/video/${d.id}/audio`}
                    onEnded={() => setAudioPlaying(false)}
                  />
                  <button onClick={toggleAudio} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--accent)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {audioPlaying ? <Pause size={11} color="var(--accent-text)" /> : <Play size={11} color="var(--accent-text)" />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-2)' }}>
                      {audioPlaying ? 'In riproduzione...' : 'Preview audio TTS'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Volume2 size={8} /> Voce sintetica
                    </div>
                  </div>
                </div>
              )}

              {/* B-roll count */}
              {d.assets?.broll && d.assets.broll.length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  B-roll: <span style={{ color: 'var(--warn)', fontWeight: 600 }}>{d.assets.broll.length}</span> clip disponibili
                </div>
              )}

              {/* ID / Meta */}
              <div style={{
                background: 'var(--surf-1)', borderRadius: 8, padding: '8px 12px',
                fontSize: 10, color: 'var(--text-3)', lineHeight: 1.7,
              }}>
                <div className="mono">ID: {d.id}</div>
                {d.video_type && <div>Tipo: {d.video_type}</div>}
              </div>
            </div>
          </div>

          {/* Action bar */}
          {!isPublished && (
            <div style={{
              padding: '12px 18px', borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
            }}>
              {showNoteInput ? (
                <>
                  <input
                    autoFocus
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') doAction('reject') }}
                    placeholder="Nota per il fix (opzionale)..."
                    style={{
                      flex: 1, background: 'var(--surf-2)', border: 'none', borderRadius: 8,
                      padding: '8px 12px', color: 'var(--text)', fontSize: 12, outline: 'none',
                      fontFamily: 'Geist, sans-serif',
                    }}
                  />
                  <ActionBtn
                    onClick={() => doAction('reject')}
                    loading={actionLoading}
                    color="#e05555"
                    icon={<AlertTriangle size={12} />}
                  >
                    Conferma Fix
                  </ActionBtn>
                  <ActionBtn
                    onClick={() => { setShowNoteInput(false); setNote('') }}
                    color="var(--surf-3)"
                  >
                    Annulla
                  </ActionBtn>
                </>
              ) : (
                <>
                  {canApprove && (
                    <ActionBtn
                      onClick={() => doAction('approve')}
                      loading={actionLoading}
                      color="var(--accent)"
                      textColor="var(--accent-text)"
                      icon={<CheckCircle size={12} />}
                    >
                      Approva
                    </ActionBtn>
                  )}
                  {isReady && (
                    <span style={{ fontSize: 10, color: 'var(--accent)' }}>
                      Già approvato — in attesa di pubblicazione
                    </span>
                  )}
                  {canReject && (
                    <ActionBtn
                      onClick={() => setShowNoteInput(true)}
                      color="var(--surf-2)"
                      icon={<AlertTriangle size={12} />}
                    >
                      Richiedi Fix
                    </ActionBtn>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={fetchDetail} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11,
                  }}>
                    <RefreshCw size={11} /> Aggiorna
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ScriptSection({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 6,
        color: color, opacity: 0.7,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

interface ActionBtnProps {
  onClick: () => void
  loading?: boolean
  color: string
  textColor?: string
  icon?: React.ReactNode
  children: React.ReactNode
}
function ActionBtn({ onClick, loading, color, textColor = 'var(--text)', icon, children }: ActionBtnProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { opacity: 0.85, scale: 1.02 } : {}}
      whileTap={!loading ? { scale: 0.96 } : {}}
      transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 14px', borderRadius: 8, border: 'none',
        background: color, color: textColor, cursor: loading ? 'default' : 'pointer',
        fontSize: 11, fontWeight: 600, fontFamily: 'Geist, sans-serif',
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex' }}
        >
          <RefreshCw size={12} />
        </motion.span>
      ) : icon}
      {loading ? children : children}
    </motion.button>
  )
}
