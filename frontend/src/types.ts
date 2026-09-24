export type VerdictType = 'AI_GENERATED' | 'REAL_HUMAN';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
export type IndicatorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';

export interface ForensicIndicator {
  name: string;
  severity: IndicatorSeverity;
  status: 'ANOMALY_DETECTED' | 'NATURAL';
  detail: string;
  timestamp: string;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize: number;
  duration: number;
  format: string;
  sampleRate: number;
  channels: number;
  verdict: VerdictType;
  confidenceScore: number;
  riskLevel: RiskLevel;
  detectedModelSignature: string;
  summary: string;
  detailedExplanation: string;
  indicators: ForensicIndicator[];
  recommendations: string[];
  audioUrl?: string;
  waveformPeaks?: number[];
  audioType?: 'uploaded' | 'recorded' | 'sample';
}

export type ScreenTab =
  | 'dashboard'
  | 'upload'
  | 'detection'
  | 'analysis'
  | 'live'
  | 'history';

export interface PresetSample {
  id: string;
  title: string;
  subtitle: string;
  category: 'AI Clone' | 'Real Human';
  duration: number;
  format: string;
  isSynthetic: boolean;
  modelSignature: string;
  description: string;
  audioUrl: string;
}
