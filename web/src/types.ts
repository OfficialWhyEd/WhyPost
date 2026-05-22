export interface AgentStatus {
  status: 'idle' | 'running' | 'error';
  last_run: string | null;
  [key: string]: unknown;
}

export interface BufferState {
  ready_videos: number;
  target_days: number;
  next_publish: string | null;
}

export interface SystemState {
  system: string;
  buffer: BufferState;
  agents: Record<string, AgentStatus>;
  updated_at: string | null;
}

export interface VideoItem {
  id: string;
  title: string;
  status: 'scripted' | 'assets_ready' | 'rendered' | 'ready' | 'published' | 'needs_fix';
  platform: string[];
  scheduled_at: string | null;
  language: string;
  video_type?: string;
}

export interface VideoScript {
  hook?: string;
  body?: string[];
  cta?: string;
  title_card?: string;
  hashtags?: string[];
}

export interface VideoAssets {
  audio: string | null;
  captions: string | null;
  broll: string[];
  tts_text?: string;
}

export interface VideoDetail extends VideoItem {
  script?: VideoScript;
  assets?: VideoAssets;
  idea_title?: string;
  render_path?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export interface MemorySummary {
  total_errors_learned: number;
  active_blocks: number;
  user_corrections: number;
  videos_analyzed: number;
  best_video_score: number;
}
