/**
 * WebRTC Audio/Video Call Pipeline Hardener
 * 
 * Provides production-grade call quality adaptation, ICE candidate sanitization,
 * dynamic Opus bitrate adaptation, and audio level telemetry without external libraries.
 */

export type CallState = 'idle' | 'connecting' | 'ringing' | 'connected' | 'reconnecting' | 'ended' | 'failed';
export type CallType = 'audio' | 'video';

export interface WebrtcPipelineConfig {
  minBitrateBps: number;
  maxAudioBitrateBps: number;
  maxVideoBitrateBps: number;
  iceRelayOnly: boolean;
  packetLossThreshold: number;
  rttDegradeThresholdMs: number;
  audioSmoothingDecay: number;
}

export interface CallSession {
  callId: string;
  peerId: string;
  type: CallType;
  state: CallState;
  startTime: number;
  durationMs: number;
  currentBitrateBps: number;
  audioLevel: number;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  rttMs: number;
  packetLossFraction: number;
  qualityTier: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface QualityAdaptation {
  adjustedBitrateBps: number;
  qualityTier: 'excellent' | 'good' | 'fair' | 'poor';
  action: 'throttle' | 'boost' | 'maintain';
  reason: string;
}

export class WebrtcCallPipelineHardener {
  private static instance: WebrtcCallPipelineHardener | null = null;
  private sessions: Map<string, CallSession> = new Map();
  private config: WebrtcPipelineConfig;

  private constructor(config?: Partial<WebrtcPipelineConfig>) {
    this.config = {
      minBitrateBps: 16000,
      maxAudioBitrateBps: 64000,
      maxVideoBitrateBps: 1500000,
      iceRelayOnly: false,
      packetLossThreshold: 0.05,
      rttDegradeThresholdMs: 250,
      audioSmoothingDecay: 0.85,
      ...config
    };
  }

  public static getInstance(config?: Partial<WebrtcPipelineConfig>): WebrtcCallPipelineHardener {
    if (!WebrtcCallPipelineHardener.instance) {
      WebrtcCallPipelineHardener.instance = new WebrtcCallPipelineHardener(config);
    }
    return WebrtcCallPipelineHardener.instance;
  }

  public startCall(callId: string, peerId: string, type: CallType = 'audio'): CallSession {
    const session: CallSession = {
      callId,
      peerId,
      type,
      state: 'connecting',
      startTime: Date.now(),
      durationMs: 0,
      currentBitrateBps: type === 'audio' ? this.config.maxAudioBitrateBps : this.config.maxVideoBitrateBps,
      audioLevel: 0,
      isAudioMuted: false,
      isVideoMuted: type === 'audio',
      rttMs: 50,
      packetLossFraction: 0,
      qualityTier: 'excellent'
    };

    this.sessions.set(callId, session);
    return session;
  }

  public setCallConnected(callId: string): boolean {
    const session = this.sessions.get(callId);
    if (!session) return false;
    session.state = 'connected';
    return true;
  }

  public endCall(callId: string, reason = 'user_hangup'): CallSession | null {
    const session = this.sessions.get(callId);
    if (!session) return null;

    session.state = 'ended';
    session.durationMs = Date.now() - session.startTime;
    return session;
  }

  public filterIceCandidate(candidateStr: string): boolean {
    if (!candidateStr || typeof candidateStr !== 'string') return false;

    // Disallow MDNS local queries or malformed candidates
    if (candidateStr.includes('.local') && candidateStr.includes('typ host')) {
      return false;
    }

    // When relay-only mode is active, reject host and srflx candidates
    if (this.config.iceRelayOnly) {
      return candidateStr.includes('typ relay');
    }

    return candidateStr.includes('candidate:');
  }

  public adaptQuality(callId: string, rttMs: number, packetLossFraction: number): QualityAdaptation {
    const session = this.sessions.get(callId);
    const maxBitrate = session && session.type === 'video' 
      ? this.config.maxVideoBitrateBps 
      : this.config.maxAudioBitrateBps;

    let targetBitrate = session ? session.currentBitrateBps : maxBitrate;
    let qualityTier: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
    let action: 'throttle' | 'boost' | 'maintain' = 'maintain';
    let reason = 'Network conditions stable';

    if (packetLossFraction > 0.15 || rttMs > 400) {
      qualityTier = 'poor';
      targetBitrate = Math.max(this.config.minBitrateBps, Math.floor(targetBitrate * 0.7));
      action = 'throttle';
      reason = 'Severe packet loss or latency detected';
    } else if (packetLossFraction > this.config.packetLossThreshold || rttMs > this.config.rttDegradeThresholdMs) {
      qualityTier = 'fair';
      targetBitrate = Math.max(this.config.minBitrateBps, Math.floor(targetBitrate * 0.85));
      action = 'throttle';
      reason = 'Moderate packet loss or latency detected';
    } else if (packetLossFraction < 0.01 && rttMs < 100) {
      qualityTier = 'excellent';
      targetBitrate = Math.min(maxBitrate, Math.floor(targetBitrate * 1.1));
      action = targetBitrate > (session?.currentBitrateBps || 0) ? 'boost' : 'maintain';
      reason = 'Optimal network conditions';
    } else {
      qualityTier = 'good';
      action = 'maintain';
      reason = 'Acceptable baseline performance';
    }

    if (session) {
      session.rttMs = rttMs;
      session.packetLossFraction = packetLossFraction;
      session.currentBitrateBps = targetBitrate;
      session.qualityTier = qualityTier;
      session.durationMs = Date.now() - session.startTime;
    }

    return {
      adjustedBitrateBps: targetBitrate,
      qualityTier,
      action,
      reason
    };
  }

  public processAudioLevel(callId: string, rawRms: number): number {
    const session = this.sessions.get(callId);
    const clampedRaw = Math.max(0, Math.min(1, rawRms));
    
    if (!session) return clampedRaw;

    // Exponential smoothing filter
    const prev = session.audioLevel;
    const smoothed = prev * this.config.audioSmoothingDecay + clampedRaw * (1 - this.config.audioSmoothingDecay);
    session.audioLevel = Number(smoothed.toFixed(4));
    return session.audioLevel;
  }

  public toggleMute(callId: string, isAudioMuted: boolean): boolean {
    const session = this.sessions.get(callId);
    if (!session) return false;
    session.isAudioMuted = isAudioMuted;
    if (isAudioMuted) session.audioLevel = 0;
    return true;
  }

  public toggleVideo(callId: string, isVideoMuted: boolean): boolean {
    const session = this.sessions.get(callId);
    if (!session) return false;
    session.isVideoMuted = isVideoMuted;
    return true;
  }

  public getSession(callId: string): CallSession | undefined {
    return this.sessions.get(callId);
  }

  public getActiveSessions(): CallSession[] {
    return Array.from(this.sessions.values()).filter(s => s.state === 'connected' || s.state === 'connecting');
  }

  public reset(): void {
    this.sessions.clear();
  }
}
