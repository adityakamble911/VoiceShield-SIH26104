import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Volume2,
  AlertCircle,
  Radio,
  Clock,
  Activity,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ScanResult, ScreenTab } from '../types';
import { formatDuration } from '../utils/audioSynth';

interface LiveDetectionScreenProps {
  onScanComplete: (result: ScanResult) => void;
  setCurrentTab: (tab: ScreenTab) => void;
  isScanning: boolean;
  setIsScanning: (scanning: boolean) => void;
};

/**
 * Convert a browser-recorded audio Blob (normally WebM/MP4)
 * into a standard PCM WAV Blob.
 *
 * The ML backend expects an audio file that librosa can decode
 * reliably. Sending the browser's WebM directly can require
 * external decoders such as FFmpeg and currently results in:
 *
 *     PySoundFile failed
 *     audioread fallback
 *     500 Internal Server Error
 *
 * This conversion happens only for the live microphone recording.
 * The actual ML model and backend prediction pipeline remain unchanged.
 */
const convertBlobToWav = async (
  blob: Blob
): Promise<{
  wavBlob: Blob;
  sampleRate: number;
  channels: number;
}> => {
  const AudioContextClass =
    window.AudioContext ||
    (window as any).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error(
      'Web Audio API is not supported by this browser.'
    );
  }

  const audioContext = new AudioContextClass();

  try {
    const arrayBuffer = await blob.arrayBuffer();

    const audioBuffer =
      await audioContext.decodeAudioData(
        arrayBuffer.slice(0)
      );

    const sampleRate = audioBuffer.sampleRate;
    const channels = 1;

    /*
     * Downmix to mono.
     *
     * The ML preprocessing also loads audio as mono,
     * so this keeps the live recording aligned with
     * the existing model pipeline.
     */
    const monoData = new Float32Array(
      audioBuffer.length
    );

    if (audioBuffer.numberOfChannels === 1) {
      monoData.set(
        audioBuffer.getChannelData(0)
      );
    } else {
      for (
        let channel = 0;
        channel < audioBuffer.numberOfChannels;
        channel++
      ) {
        const channelData =
          audioBuffer.getChannelData(channel);

        for (
          let i = 0;
          i < audioBuffer.length;
          i++
        ) {
          monoData[i] +=
            channelData[i] /
            audioBuffer.numberOfChannels;
        }
      }
    }

    /*
     * WAV PCM:
     *
     * RIFF header
     * fmt  chunk
     * data chunk
     * 16-bit signed PCM samples
     */
    const wavBuffer = encodeWav(
      monoData,
      sampleRate
    );

    return {
      wavBlob: new Blob(
        [wavBuffer],
        {
          type: 'audio/wav',
        }
      ),
      sampleRate,
      channels,
    };
  } finally {
    if (audioContext.state !== 'closed') {
      await audioContext.close();
    }
  }
};

/**
 * Encode mono Float32 PCM samples as 16-bit PCM WAV.
 */
const encodeWav = (
  samples: Float32Array,
  sampleRate: number
): ArrayBuffer => {
  const bytesPerSample = 2;
  const channels = 1;

  const dataSize =
    samples.length *
    channels *
    bytesPerSample;

  const buffer = new ArrayBuffer(
    44 + dataSize
  );

  const view = new DataView(buffer);

  const writeString = (
    offset: number,
    value: string
  ) => {
    for (
      let i = 0;
      i < value.length;
      i++
    ) {
      view.setUint8(
        offset + i,
        value.charCodeAt(i)
      );
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(
    4,
    36 + dataSize,
    true
  );
  writeString(8, 'WAVE');

  // fmt chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(
    22,
    channels,
    true
  );
  view.setUint32(
    24,
    sampleRate,
    true
  );

  const byteRate =
    sampleRate *
    channels *
    bytesPerSample;

  view.setUint32(
    28,
    byteRate,
    true
  );

  const blockAlign =
    channels * bytesPerSample;

  view.setUint16(
    32,
    blockAlign,
    true
  );

  view.setUint16(
    34,
    bytesPerSample * 8,
    true
  );

  // data chunk
  writeString(36, 'data');
  view.setUint32(
    40,
    dataSize,
    true
  );

  // Float32 [-1, 1] → signed PCM16
  let offset = 44;

  for (
    let i = 0;
    i < samples.length;
    i++
  ) {
    const sample = Math.max(
      -1,
      Math.min(1, samples[i])
    );

    const pcmValue =
      sample < 0
        ? sample * 0x8000
        : sample * 0x7fff;

    view.setInt16(
      offset,
      pcmValue,
      true
    );

    offset += 2;
  }

  return buffer;
};

export const LiveDetectionScreen: React.FC<LiveDetectionScreenProps> = ({
  onScanComplete,
  setCurrentTab,
  isScanning,
  setIsScanning,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingRecorded, setIsPlayingRecorded] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [noiseLevel, setNoiseLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop recording and stream when component unmounts
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((t) => t.stop());
      }

      if (
        audioContextRef.current &&
        audioContextRef.current.state !== 'closed'
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Real-time microphone oscilloscope & spectrum drawing
  const startVisualizer = (
    stream: MediaStream
  ) => {
    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as any).webkitAudioContext
      )();

      audioContextRef.current =
        audioCtx;

      const source =
        audioCtx.createMediaStreamSource(
          stream
        );

      const analyser =
        audioCtx.createAnalyser();

      analyser.fftSize = 256;

      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength =
        analyser.frequencyBinCount;

      const dataArray =
        new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current =
          requestAnimationFrame(draw);

        analyser.getByteFrequencyData(
          dataArray
        );

        const canvas =
          canvasRef.current;

        if (!canvas) return;

        const ctx =
          canvas.getContext('2d');

        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.fillStyle = '#060a12';
        ctx.fillRect(
          0,
          0,
          width,
          height
        );

        // Draw frequency bars
        const barWidth =
          (width / bufferLength) * 2.2;

        let x = 0;
        let totalEnergy = 0;

        for (
          let i = 0;
          i < bufferLength;
          i++
        ) {
          const barHeight =
            (dataArray[i] / 255) *
            height *
            0.9;

          totalEnergy +=
            dataArray[i];

          // Gradient from cyan to electric blue
          const r = 6;

          const g = Math.min(
            255,
            150 +
              Math.floor(
                (dataArray[i] / 255) *
                  105
              )
          );

          const b = 238;

          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.shadowColor =
            'rgba(6, 182, 212, 0.4)';
          ctx.shadowBlur = 6;

          ctx.fillRect(
            x,
            height - barHeight,
            barWidth - 1,
            barHeight
          );

          x += barWidth;
        }

        ctx.shadowBlur = 0;

        const avgEnergy = Math.round(
          (totalEnergy /
            bufferLength /
            255) *
            100
        );

        setNoiseLevel(avgEnergy);
      };

      draw();
    } catch (e) {
      console.error(
        'Visualizer error:',
        e
      );
    }
  };

  // Start Live Microphone Recording
  const handleStartRecording =
    async () => {
      setMicPermissionDenied(false);

      audioChunksRef.current = [];

      setAudioBlob(null);
      setAudioUrl(null);
      setRecordDuration(0);

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
              },
            }
          );

        streamRef.current = stream;

        setMicActive(true);

        startVisualizer(stream);

        /*
         * Keep the browser's native recording format.
         *
         * It will be converted to WAV immediately before
         * sending it to the ML backend.
         */
        const mimeType =
          MediaRecorder.isTypeSupported(
            'audio/webm'
          )
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported(
                'audio/mp4'
              )
            ? 'audio/mp4'
            : '';

        const mediaRecorder =
          new MediaRecorder(
            stream,
            mimeType
              ? { mimeType }
              : undefined
          );

        mediaRecorderRef.current =
          mediaRecorder;

        mediaRecorder.ondataavailable = (
          e
        ) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(
              e.data
            );
          }
        };

        mediaRecorder.onstop = () => {
          const recordedBlob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  mimeType ||
                  'audio/webm',
              }
            );

          setAudioBlob(
            recordedBlob
          );

          const url =
            URL.createObjectURL(
              recordedBlob
            );

          setAudioUrl(url);

          // Stop live tracks
          stream
            .getTracks()
            .forEach((t) =>
              t.stop()
            );

          setMicActive(false);
        };

        mediaRecorder.start(100);

        setIsRecording(true);

        // Start duration timer
        timerIntervalRef.current =
          setInterval(() => {
            setRecordDuration(
              (prev) =>
                prev + 0.1
            );
          }, 100);
      } catch (err: any) {
        console.error(
          'Microphone access denied:',
          err
        );

        setMicPermissionDenied(
          true
        );
      }
    };

  // Stop Live Recording
  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      isRecording
    ) {
      mediaRecorderRef.current.stop();

      setIsRecording(false);

      if (
        timerIntervalRef.current
      ) {
        clearInterval(
          timerIntervalRef.current
        );
      }

      if (
        animationFrameRef.current
      ) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }
    }
  };

  // Toggle playback of recorded clip
  const togglePlayRecorded = () => {
    if (!playbackAudioRef.current)
      return;

    if (isPlayingRecorded) {
      playbackAudioRef.current.pause();

      setIsPlayingRecorded(
        false
      );
    } else {
      playbackAudioRef.current
        .play()
        .then(() =>
          setIsPlayingRecorded(
            true
          )
        )
        .catch((e) =>
          console.log(
            'Playback error:',
            e
          )
        );
    }
  };

  // Submit Recorded Audio to the SAME ML pipeline used by UploadScreen
  const handleAnalyzeRecording =
    async () => {
      if (
        !audioBlob ||
        isScanning
      ) {
        return;
      }

      setIsScanning(true);

      try {
        /*
         * IMPORTANT:
         *
         * The live recording is normally WebM/MP4.
         *
         * Convert it to standard PCM WAV first so that
         * the exact same FastAPI /predict endpoint used by
         * UploadScreen can decode it reliably.
         */
        const {
          wavBlob,
          sampleRate,
          channels,
        } =
          await convertBlobToWav(
            audioBlob
          );

        const fileName =
          `live_mic_capture_${new Date()
            .toISOString()
            .slice(11, 19)
            .replace(
              /:/g,
              '-'
            )}.wav`;

        const formData =
          new FormData();

        formData.append(
          'file',
          wavBlob,
          fileName
        );

        /*
         * Use the same ML endpoint as normal audio upload.
         *
         * No Gemini.
         * No local AI heuristic.
         * No Math.random() fallback.
         */
        const response =
          await fetch(
            'http://127.0.0.1:8000/predict',
            {
              method: 'POST',
              body: formData,
            }
          );

        if (!response.ok) {
          let errorMessage =
            `Prediction request failed (${response.status})`;

          try {
            const errorData =
              await response.json();

            if (
              errorData &&
              errorData.detail
            ) {
              errorMessage =
                errorData.detail;
            }
          } catch {
            // Keep original HTTP error.
          }

          throw new Error(
            errorMessage
          );
        }

        const data =
          await response.json();

        if (
          !data ||
          !data.prediction
        ) {
          throw new Error(
            'ML API returned an invalid prediction response.'
          );
        }

        const isSynthetic =
          data.prediction ===
          'SYNTHETIC';

        const syntheticProbability =
          Number(
            data.prob_synthetic || 0
          );

        const realProbability =
          Number(
            data.prob_real || 0
          );

        /*
         * Backend confidence represents the probability
         * of the selected class.
         */
        const confidence =
          Number(
            data.confidence ||
              (isSynthetic
                ? syntheticProbability
                : realProbability)
          );

        const confidenceScore =
          Number(
            (
              confidence * 100
            ).toFixed(2)
          );

        /*
         * Preserve the backend risk classification.
         */
        const backendRiskLevel =
          data.risk_level;

        const riskLevel =
          backendRiskLevel ===
          'CRITICAL'
            ? 'CRITICAL'
            : backendRiskLevel ===
              'HIGH'
            ? 'HIGH'
            : backendRiskLevel ===
              'MEDIUM'
            ? 'MEDIUM'
            : backendRiskLevel ===
              'LOW'
            ? 'LOW'
            : 'SAFE';

        const indicatorSeverity =
          isSynthetic
            ? riskLevel ===
                'CRITICAL'
              ? 'CRITICAL'
              : riskLevel ===
                'HIGH'
              ? 'HIGH'
              : riskLevel ===
                'MEDIUM'
              ? 'MEDIUM'
              : 'LOW'
            : 'NORMAL';

        const indicatorStatus =
          isSynthetic
            ? 'ANOMALY_DETECTED'
            : 'NATURAL';

        const result: ScanResult = {
          id:
            'scan_rec_' +
            Date.now(),

          timestamp:
            data.timestamp ||
            new Date().toISOString(),

          fileName,

          fileSize:
            wavBlob.size,

          duration:
            Number(
              recordDuration.toFixed(
                1
              )
            ),

          format: 'WAV',

          sampleRate,

          channels,

          verdict:
            isSynthetic
              ? 'AI_GENERATED'
              : 'REAL_HUMAN',

          confidenceScore,

          riskLevel,

          detectedModelSignature:
            'VoiceShield AudioCNN',

          summary:
            isSynthetic
              ? 'The local AudioCNN model detected characteristics associated with synthetic or AI-generated speech.'
              : 'The local AudioCNN model detected characteristics consistent with real human speech.',

          detailedExplanation:
            `Local AudioCNN prediction: ${data.prediction}.\n\n` +
            `Synthetic probability: ${(syntheticProbability * 100).toFixed(2)}%.\n` +
            `Real probability: ${(realProbability * 100).toFixed(2)}%.\n` +
            `Risk level: ${riskLevel}.`,

          indicators: [
            {
              name:
                'AudioCNN Classification',

              severity:
                indicatorSeverity,

              status:
                indicatorStatus,

              detail:
                `Synthetic probability: ${(syntheticProbability * 100).toFixed(2)}% | Real probability: ${(realProbability * 100).toFixed(2)}%`,

              timestamp:
                'Complete recording',
            },
          ],

          recommendations:
            data.recommendation
              ? [
                  data.recommendation,
                ]
              : isSynthetic
              ? [
                  'Do not trust this voice alone -- require additional verification.',
                ]
              : [
                  'No significant synthetic indicators detected by the current model.',
                ],

          waveformPeaks: [],

          audioUrl:
            audioUrl ||
            undefined,

          audioType:
            'recorded',
        };

        onScanComplete(result);
      } catch (err) {
        /*
         * There is intentionally NO fake fallback.
         *
         * If conversion or ML inference fails,
         * the application reports the actual failure.
         */
        console.error(
          'Live ML prediction failed:',
          err
        );

        alert(
          err instanceof Error
            ? `Voice detection failed: ${err.message}`
            : 'Voice detection failed. Please make sure the ML backend is running.'
        );
      } finally {
        setIsScanning(false);
      }
    };

  return (
    <div
      className="space-y-6"
      id="live-detection-screen-container"
    >
      {/* Hidden Audio element for playback */}
      {audioUrl && (
        <audio
          ref={
            playbackAudioRef
          }
          src={audioUrl}
          onEnded={() =>
            setIsPlayingRecorded(
              false
            )
          }
        />
      )}

      {/* Screen Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono font-medium mb-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          REAL-TIME MICROPHONE SCANNER
        </div>

        <h1 className="text-2xl font-bold font-display text-white tracking-tight">
          Live Voice Cloning & Impersonation Interceptor
        </h1>

        <p className="text-sm text-slate-400 mt-1">
          Record live speech to instantly verify speaker identity and intercept AI voice cloning or synthetic spoofing.
        </p>
      </div>

      {/* Mic Permission Alert */}
      {micPermissionDenied && (
        <div className="glass-panel-danger rounded-2xl p-5 border border-rose-500/40 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />

          <div className="text-xs">
            <span className="font-bold text-rose-200">
              Microphone Access Blocked:{' '}
            </span>

            Please enable microphone permissions in your browser address bar to use the live acoustic scanner.
          </div>
        </div>
      )}

      {/* Main Recording Console */}
      <div className="glass-panel-glow rounded-2xl p-6 sm:p-8 border border-cyan-500/40 space-y-6 text-center">
        {/* Real-time Oscilloscope / Frequency Spectrum Stage */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-[#060a12] shadow-inner h-52 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={700}
            height={200}
            className="w-full h-full block"
          />

          {!isRecording &&
            !audioBlob && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 backdrop-blur-xs text-slate-400 p-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Mic className="w-6 h-6" />
                </div>

                <span className="text-sm font-semibold text-white">
                  Microphone Standing By
                </span>

                <span className="text-xs text-slate-500 mt-1">
                  Press "Start Live Recording" and speak a sentence for 3-6 seconds.
                </span>
              </div>
            )}

          {/* Recording active badge */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/50 text-xs font-mono text-rose-300 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>

              <span>
                LIVE AUDIO CAPTURE:{' '}
                {formatDuration(
                  recordDuration
                )}
              </span>
            </div>
          )}

          {/* Noise level indicator */}
          {isRecording && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-cyan-400">
              <Volume2 className="w-3.5 h-3.5" />

              <span>
                INPUT LEVEL:{' '}
                {noiseLevel}%
              </span>
            </div>
          )}
        </div>

        {/* Primary Controls Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {!isRecording ? (
            <button
              id="start-live-record-btn"
              onClick={
                handleStartRecording
              }
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(244,63,94,0.4)] flex items-center gap-3 transition-all active:scale-95 cursor-pointer"
            >
              <Mic className="w-5 h-5 text-white" />

              <span>
                Start Live Recording
              </span>
            </button>
          ) : (
            <button
              id="stop-live-record-btn"
              onClick={
                handleStopRecording
              }
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 border border-rose-500/50 font-bold text-sm tracking-wide shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center gap-3 transition-all active:scale-95 cursor-pointer animate-pulse"
            >
              <Square className="w-5 h-5 fill-current" />

              <span>
                Stop Recording & Process Clip
              </span>
            </button>
          )}

          {audioBlob &&
            !isRecording && (
              <button
                onClick={
                  handleStartRecording
                }
                className="px-4 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-cyan-400" />

                <span>
                  Retake Audio
                </span>
              </button>
            )}
        </div>

        {/* Recorded Audio Review & Analyze Card */}
        {audioBlob &&
          !isRecording && (
            <div className="p-5 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="flex items-center gap-3">
                <button
                  onClick={
                    togglePlayRecorded
                  }
                  className="w-12 h-12 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center justify-center transition-all shrink-0"
                >
                  {isPlayingRecorded ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                <div>
                  <div className="text-sm font-bold text-white">
                    Live Microphone Clip Ready
                  </div>

                  <div className="text-xs font-mono text-cyan-400/80 mt-0.5">
                    Duration:{' '}
                    {formatDuration(
                      recordDuration
                    )}{' '}
                    • WAV PCM
                  </div>
                </div>
              </div>

              <button
                id="analyze-live-clip-btn"
                onClick={
                  handleAnalyzeRecording
                }
                disabled={isScanning}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />

                    <span>
                      Scanning Voice Biometrics...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-black" />

                    <span>
                      Run Forensic Voice Detection
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
      </div>

      {/* Instructions & Acoustic Calibration Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-mono border border-cyan-500/40">
              1
            </span>

            <span>
              Microphone Proximity
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            Position microphone 6–12 inches from your mouth. Avoid heavy breathing directly into the capsule to prevent clipping.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-mono border border-cyan-500/40">
              2
            </span>

            <span>
              Natural Phrase Length
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            Speak at least 3–5 seconds containing natural consonant fricatives ("s", "f", "th") for optimal glottal flutter detection.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2">
          <div className="font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center text-[10px] font-mono border border-cyan-500/40">
              3
            </span>

            <span>
              Zero Synthetic Gating
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed">
            VoiceShield inspects ambient thermal noise. Natural environmental acoustic decay helps confirm authentic biological presence.
          </p>
        </div>
      </div>
    </div>
  );
};