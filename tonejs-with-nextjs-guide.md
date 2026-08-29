# Tone.js Guitar Audio Infrastructure Guide

> Next.js App Router · Tailwind CSS · TypeScript · Shadcn/ui

<!-- toc -->

1. [Installation & Dependencies](#1-installation--dependencies)
2. [The SSR Problem & How to Solve It](#2-the-ssr-problem--how-to-solve-it)
3. [Audio Context Provider](#3-audio-context-provider)
4. [Microphone & Audio Permission Hook](#4-microphone--audio-permission-hook)
5. [Guitar Audio Engine](#5-guitar-audio-engine)
6. [Effects Chain Architecture](#6-effects-chain-architecture)
7. [Tuner Hook (Microphone Input)](#7-tuner-hook-microphone-input)
8. [Shadcn Permission Dialog](#8-shadcn-permission-dialog)
9. [Guitar Player UI Component](#9-guitar-player-ui-component)
10. [Complete File Structure](#10-complete-file-structure)
11. [Common Pitfalls & Solutions](#11-common-pitfalls--solutions)

<!-- tocstop -->

## 1. Installation & Dependencies

```bash
# Core audio
npm install tone

# Pitch detection for tuner (Yin algorithm)
npm install pitchfinder

# Types
npm install --save-dev @types/node
```

Add Shadcn components you'll need:

```bash
npx shadcn@latest add dialog slider switch button card badge toast
```

---

## 2. The SSR Problem & How to Solve It

Tone.js uses the Web Audio API, which **does not exist in Node.js**. The App Router
runs server-side by default, so you must be deliberate about where audio code runs.

### Rule #1 — Never import Tone.js at the module level in a Server Component

```tsx
// ❌ WRONG — This will crash during SSR
import * as Tone from "tone";

// ✅ CORRECT — Dynamic import inside a client component
const Tone = await import("tone");
```

### Rule #2 — Mark every audio file with `"use client"`

```tsx
"use client"; // Must be the very first line
import { useEffect, useRef } from "react";
```

### Rule #3 — Lazy-load Tone.js with next/dynamic for components

```tsx
// app/page.tsx (Server Component)
import dynamic from "next/dynamic";

const GuitarPlayer = dynamic(
  () => import("@/components/guitar/GuitarPlayer"),
  {
    ssr: false, // 🔑 Disables server-side rendering for this component
    loading: () => <p>Loading audio engine…</p>,
  }
);

export default function Page() {
  return <GuitarPlayer />;
}
```

### Rule #4 — The AudioContext must be started by a user gesture

Browsers block audio until the user interacts with the page. Always call
`Tone.start()` inside an event handler:

```tsx
// ❌ WRONG — Called on mount, before any user interaction
useEffect(() => { Tone.start(); }, []);

// ✅ CORRECT — Called inside a click handler
const handleStart = async () => {
  await Tone.start();
  console.log("AudioContext is now running");
};
```

---

## 3. Audio Context Provider

Create a singleton context so the `AudioContext` is shared across the entire app.
Multiple `AudioContext` instances cause memory leaks and browser warnings.

```tsx
// lib/audio/AudioProvider.tsx
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type AudioState = "suspended" | "running" | "closed";

interface AudioContextValue {
  /** Whether Tone.js + AudioContext have been started */
  isStarted: boolean;
  /** Current AudioContext state */
  audioState: AudioState;
  /** Call this from a user-gesture handler to unlock audio */
  startAudio: () => Promise<void>;
  /** Stop and clean up all audio */
  stopAudio: () => Promise<void>;
}

const AudioCtx = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isStarted, setIsStarted] = useState(false);
  const [audioState, setAudioState] = useState<AudioState>("suspended");
  const toneRef = useRef<typeof import("tone") | null>(null);

  const startAudio = useCallback(async () => {
    if (isStarted) return;

    // Dynamically import Tone.js — safe from SSR
    const Tone = await import("tone");
    toneRef.current = Tone;

    await Tone.start();
    setIsStarted(true);
    setAudioState(Tone.getContext().state as AudioState);
  }, [isStarted]);

  const stopAudio = useCallback(async () => {
    if (!toneRef.current) return;
    await toneRef.current.getContext().dispose();
    setIsStarted(false);
    setAudioState("closed");
  }, []);

  // Keep audioState in sync with actual AudioContext state
  useEffect(() => {
    if (!toneRef.current || !isStarted) return;
    const ctx = toneRef.current.getContext().rawContext;

    const handler = () => setAudioState(ctx.state as AudioState);
    ctx.addEventListener("statechange", handler);
    return () => ctx.removeEventListener("statechange", handler);
  }, [isStarted]);

  return (
    <AudioCtx.Provider value={{ isStarted, audioState, startAudio, stopAudio }}>
      {children}
    </AudioCtx.Provider>
  );
}

/** Use this hook anywhere inside <AudioProvider> */
export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio must be used inside <AudioProvider>");
  return ctx;
}
```

Register the provider in your root layout:

```tsx
// app/layout.tsx
import { AudioProvider } from "@/lib/audio/AudioProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AudioProvider>
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
```

---

## 4. Microphone & Audio Permission Hook

Requesting microphone access requires explicit user consent. Wrap the permission
flow in a hook so you can reuse it and react to permission state changes.

```tsx
// lib/audio/useMicrophonePermission.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MicPermission = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface UseMicrophonePermissionReturn {
  permission: MicPermission;
  stream: MediaStream | null;
  /** Prompt the browser's permission dialog */
  requestPermission: () => Promise<MediaStream | null>;
  /** Release the microphone (turns off the LED on laptops) */
  releaseMicrophone: () => void;
  error: string | null;
}

export function useMicrophonePermission(): UseMicrophonePermissionReturn {
  const [permission, setPermission] = useState<MicPermission>("idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setPermission("idle");
  }, []);

  const requestPermission = useCallback(async () => {
    // Guard: MediaDevices API not available (SSR or insecure context)
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPermission("unavailable");
      setError("MediaDevices API is not available. Use HTTPS or localhost.");
      return null;
    }

    setPermission("requesting");
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Ideal constraints for musical analysis
          echoCancellation: false,   // Don't alter the guitar signal
          noiseSuppression: false,   // Don't filter out harmonics
          autoGainControl: false,    // We'll control gain ourselves
          sampleRate: 44100,         // CD quality
          channelCount: 1,           // Mono is fine for guitar
        },
        video: false,
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setPermission("granted");
      return mediaStream;
    } catch (err) {
      const message =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "Microphone access was denied. Please allow access in your browser settings."
            : err.name === "NotFoundError"
            ? "No microphone was found on this device."
            : err.message
          : "An unknown error occurred.";

      setError(message);
      setPermission("denied");
      return null;
    }
  }, []);

  // Check existing permission state on mount (no prompt)
  useEffect(() => {
    if (!navigator?.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (result.state === "granted") setPermission("granted");
        if (result.state === "denied") setPermission("denied");

        result.onchange = () => {
          if (result.state === "denied") {
            releaseMicrophone();
            setPermission("denied");
          }
        };
      })
      .catch(() => { /* Permissions API not supported */ });
  }, [releaseMicrophone]);

  // Clean up on unmount
  useEffect(() => () => releaseMicrophone(), [releaseMicrophone]);

  return { permission, stream, requestPermission, releaseMicrophone, error };
}
```

---

## 5. Guitar Audio Engine

This is the core of your instrument. It models a signal chain that mirrors a real
guitar rig: **Instrument → Preamp → Effects Pedals → Amp Cabinet → Master Out**.

```tsx
// lib/audio/useGuitarEngine.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "./AudioProvider";

export interface GuitarEffectParams {
  distortion: number;    // 0–1
  reverbWet: number;     // 0–1
  delayTime: number;     // seconds
  delayFeedback: number; // 0–1
  delayWet: number;      // 0–1
  chorusDepth: number;   // 0–1
  chorusWet: number;     // 0–1
  eqLow: number;         // dB (-20 to +20)
  eqMid: number;         // dB (-20 to +20)
  eqHigh: number;        // dB (-20 to +20)
  masterVolume: number;  // dB (-60 to 0)
}

export const DEFAULT_PARAMS: GuitarEffectParams = {
  distortion: 0,
  reverbWet: 0.2,
  delayTime: 0.25,
  delayFeedback: 0.3,
  delayWet: 0,
  chorusDepth: 0.5,
  chorusWet: 0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  masterVolume: -6,
};

// Standard guitar string frequencies (E2 to E4, standard tuning)
export const GUITAR_STRINGS = [
  { name: "E2", freq: 82.41,  midi: 40 },
  { name: "A2", freq: 110.0,  midi: 45 },
  { name: "D3", freq: 146.83, midi: 50 },
  { name: "G3", freq: 196.0,  midi: 55 },
  { name: "B3", freq: 246.94, midi: 59 },
  { name: "E4", freq: 329.63, midi: 64 },
];

interface GuitarEngine {
  isReady: boolean;
  /** Play a synthesized guitar note */
  pluckString: (stringIndex: number, fret?: number) => void;
  /** Play a full chord by string indices */
  strumChord: (stringIndices: number[], fret?: number) => void;
  /** Update effect parameters in real-time */
  setParam: <K extends keyof GuitarEffectParams>(key: K, value: GuitarEffectParams[K]) => void;
  params: GuitarEffectParams;
}

export function useGuitarEngine(): GuitarEngine {
  const { isStarted } = useAudio();
  const [isReady, setIsReady] = useState(false);
  const [params, setParams] = useState<GuitarEffectParams>(DEFAULT_PARAMS);
  const engineRef = useRef<{
    synth:      import("tone").PolySynth | null;
    distortion: import("tone").Distortion | null;
    eq:         import("tone").EQ3 | null;
    chorus:     import("tone").Chorus | null;
    delay:      import("tone").PingPongDelay | null;
    reverb:     import("tone").Reverb | null;
    limiter:    import("tone").Limiter | null;
    volume:     import("tone").Volume | null;
  }>({
    synth: null, distortion: null, eq: null,
    chorus: null, delay: null, reverb: null,
    limiter: null, volume: null,
  });

  // Build the signal chain once AudioContext is running
  useEffect(() => {
    if (!isStarted) return;

    let disposed = false;

    (async () => {
      const Tone = await import("tone");

      if (disposed) return;

      const p = DEFAULT_PARAMS;

      // ── 1. Source: PluckSynth models Karplus-Strong (physical string model) ──
      const synth = new Tone.PolySynth(Tone.PluckSynth, {
        attackNoise: 1,       // Pick attack noise (0–20)
        dampening: 4000,      // High-frequency rolloff (Hz)
        resonance: 0.98,      // String sustain (0–1, closer to 1 = longer sustain)
      });

      // ── 2. Preamp Distortion ──────────────────────────────────────────────
      const distortion = new Tone.Distortion({
        distortion: p.distortion,
        oversample: "4x",    // Anti-aliasing for cleaner overdrive
      });

      // ── 3. 3-Band EQ (Tone/Bass/Treble like a real amp) ──────────────────
      const eq = new Tone.EQ3({
        low: p.eqLow,
        mid: p.eqMid,
        high: p.eqHigh,
        lowFrequency: 250,   // Guitar low-cut around 250Hz
        highFrequency: 3500, // Guitar high-cut around 3.5kHz
      });

      // ── 4. Chorus (thickens the sound, doubles effect) ───────────────────
      const chorus = new Tone.Chorus({
        frequency: 1.5,      // LFO rate (Hz)
        delayTime: 3.5,      // Delay time (ms)
        depth: p.chorusDepth,
        wet: p.chorusWet,
      });
      await chorus.start(); // Chorus LFO must be explicitly started

      // ── 5. Ping-Pong Delay ────────────────────────────────────────────────
      const delay = new Tone.PingPongDelay({
        delayTime: p.delayTime,
        feedback: p.delayFeedback,
        wet: p.delayWet,
      });

      // ── 6. Convolution Reverb (Room/Hall simulation) ──────────────────────
      const reverb = new Tone.Reverb({
        decay: 2.5,          // Room size in seconds
        preDelay: 0.01,      // Pre-delay before reverb hits
        wet: p.reverbWet,
      });
      await reverb.generate(); // Must generate IR (async)

      // ── 7. Output Stage: Limiter + Volume ────────────────────────────────
      const limiter = new Tone.Limiter(-3);   // Prevent clipping
      const volume  = new Tone.Volume(p.masterVolume);

      // ── 8. Connect the chain ──────────────────────────────────────────────
      // synth → distortion → eq → chorus → delay → reverb → limiter → volume → destination
      synth.chain(distortion, eq, chorus, delay, reverb, limiter, volume, Tone.getDestination());

      if (disposed) {
        [synth, distortion, eq, chorus, delay, reverb, limiter, volume].forEach(n => n.dispose());
        return;
      }

      engineRef.current = { synth, distortion, eq, chorus, delay, reverb, limiter, volume };
      setIsReady(true);
    })();

    return () => {
      disposed = true;
      const e = engineRef.current;
      [e.synth, e.distortion, e.eq, e.chorus, e.delay, e.reverb, e.limiter, e.volume]
        .forEach(n => n?.dispose());
      engineRef.current = {
        synth: null, distortion: null, eq: null,
        chorus: null, delay: null, reverb: null,
        limiter: null, volume: null,
      };
      setIsReady(false);
    };
  }, [isStarted]);

  // ── Note calculation ──────────────────────────────────────────────────────
  const getNoteFreq = useCallback((stringIndex: number, fret = 0) => {
    const baseFreq = GUITAR_STRINGS[stringIndex]?.freq ?? 82.41;
    // Each fret is one semitone = 2^(1/12) multiplier
    return baseFreq * Math.pow(2, fret / 12);
  }, []);

  // ── Pluck a single string ─────────────────────────────────────────────────
  const pluckString = useCallback((stringIndex: number, fret = 0) => {
    const { synth } = engineRef.current;
    if (!synth) return;
    const freq = getNoteFreq(stringIndex, fret);
    synth.triggerAttack(freq, Tone.now ?? undefined);
  }, [getNoteFreq]);

  // ── Strum a chord (staggered attack like a real strum) ───────────────────
  const strumChord = useCallback(async (stringIndices: number[], fret = 0) => {
    const { synth } = engineRef.current;
    if (!synth) return;
    const Tone = await import("tone");
    const strumDelay = 0.025; // 25ms between each string (realistic strum speed)

    stringIndices.forEach((stringIndex, i) => {
      const freq = getNoteFreq(stringIndex, fret);
      const time = Tone.now() + i * strumDelay;
      synth.triggerAttack(freq, time);
    });
  }, [getNoteFreq]);

  // ── Live parameter update ─────────────────────────────────────────────────
  const setParam = useCallback(<K extends keyof GuitarEffectParams>(
    key: K,
    value: GuitarEffectParams[K]
  ) => {
    const e = engineRef.current;
    if (!e.synth) return;

    // Apply to the correct Tone.js node
    switch (key) {
      case "distortion":
        e.distortion!.distortion = value as number;
        break;
      case "reverbWet":
        e.reverb!.wet.value = value as number;
        break;
      case "delayTime":
        (e.delay!.delayTime as any).value = value as number;
        break;
      case "delayFeedback":
        e.delay!.feedback.value = value as number;
        break;
      case "delayWet":
        e.delay!.wet.value = value as number;
        break;
      case "chorusDepth":
        e.chorus!.depth = value as number;
        break;
      case "chorusWet":
        e.chorus!.wet.value = value as number;
        break;
      case "eqLow":
        e.eq!.low.value = value as number;
        break;
      case "eqMid":
        e.eq!.mid.value = value as number;
        break;
      case "eqHigh":
        e.eq!.high.value = value as number;
        break;
      case "masterVolume":
        e.volume!.volume.value = value as number;
        break;
    }

    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  return { isReady, pluckString, strumChord, setParam, params };
}
```

---

## 6. Effects Chain Architecture

Here's a visual representation of the signal chain built above:

```
┌─────────────────────────────────────────────────────────────────┐
│                     GUITAR SIGNAL CHAIN                         │
│                                                                 │
│  ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌──────────┐  │
│  │PluckSynth│──▶│ Distortion │──▶│   EQ3    │──▶│  Chorus  │  │
│  │(Karplus- │   │(Overdrive/ │   │(Low/Mid/ │   │(12-string│  │
│  │ Strong)  │   │  Fuzz)     │   │  High)   │   │  effect) │  │
│  └──────────┘   └────────────┘   └──────────┘   └────┬─────┘  │
│                                                       │        │
│  ┌──────────┐   ┌────────────┐   ┌──────────┐        │        │
│  │  Volume  │◀──│  Limiter   │◀──│  Reverb  │◀──┐    │        │
│  │ (Master) │   │ (-3dBFS)   │   │ (Room /  │   │    │        │
│  └────┬─────┘   └────────────┘   │  Hall)   │   │    │        │
│       │                          └──────────┘   │    │        │
│       │                                         │    │        │
│       │                          ┌──────────────┘    │        │
│       │                          │  PingPong Delay ◀─┘        │
│       │                          │  (Echo / Slapback)         │
│       │                          └────────────────────        │
│       ▼                                                        │
│  AudioDestination (Speakers)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Preset configurations

```tsx
// lib/audio/guitarPresets.ts
import { GuitarEffectParams } from "./useGuitarEngine";

export const GUITAR_PRESETS: Record<string, GuitarEffectParams> = {
  "Clean": {
    distortion: 0, reverbWet: 0.15, delayTime: 0.25,
    delayFeedback: 0.2, delayWet: 0, chorusDepth: 0.3,
    chorusWet: 0, eqLow: 2, eqMid: 0, eqHigh: 1, masterVolume: -6,
  },
  "Crunch": {
    distortion: 0.4, reverbWet: 0.2, delayTime: 0.25,
    delayFeedback: 0.3, delayWet: 0, chorusDepth: 0.4,
    chorusWet: 0, eqLow: 4, eqMid: -2, eqHigh: 2, masterVolume: -8,
  },
  "Heavy Metal": {
    distortion: 0.9, reverbWet: 0.1, delayTime: 0.125,
    delayFeedback: 0.2, delayWet: 0.1, chorusDepth: 0.2,
    chorusWet: 0, eqLow: 6, eqMid: -4, eqHigh: 3, masterVolume: -10,
  },
  "Indie Chorus": {
    distortion: 0.05, reverbWet: 0.35, delayTime: 0.375,
    delayFeedback: 0.4, delayWet: 0.2, chorusDepth: 0.8,
    chorusWet: 0.6, eqLow: 0, eqMid: 0, eqHigh: 2, masterVolume: -7,
  },
  "Blues": {
    distortion: 0.25, reverbWet: 0.25, delayTime: 0.5,
    delayFeedback: 0.25, delayWet: 0.15, chorusDepth: 0.2,
    chorusWet: 0, eqLow: 3, eqMid: 2, eqHigh: -1, masterVolume: -6,
  },
};
```

---

## 7. Tuner Hook (Microphone Input)

Connect the microphone stream into Tone.js for real-time pitch detection:

```tsx
// lib/audio/useGuitarTuner.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAudio } from "./AudioProvider";

interface TunerNote {
  note: string;         // e.g. "E", "A", "D"
  octave: number;       // e.g. 4
  cents: number;        // -50 to +50 (deviation from perfect pitch)
  frequency: number;    // raw Hz
  isInTune: boolean;    // within ±5 cents
}

const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

function frequencyToNote(freq: number): TunerNote | null {
  if (!freq || freq < 20 || freq > 5000) return null;

  // Convert frequency to MIDI note number
  const midiNote = 12 * Math.log2(freq / 440) + 69;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);
  const octave = Math.floor(roundedMidi / 12) - 1;
  const note = NOTE_NAMES[roundedMidi % 12];

  return {
    note,
    octave,
    cents,
    frequency: freq,
    isInTune: Math.abs(cents) <= 5,
  };
}

interface UseGuitarTunerOptions {
  stream: MediaStream | null;
}

export function useGuitarTuner({ stream }: UseGuitarTunerOptions) {
  const { isStarted } = useAudio();
  const [currentNote, setCurrentNote] = useState<TunerNote | null>(null);
  const [isListening, setIsListening] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const detect = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);

    // Autocorrelation-based pitch detection (simplified YIN)
    const sampleRate = analyser.context.sampleRate;
    const size = buffer.length;
    let maxCorrelation = 0;
    let bestOffset = -1;

    for (let offset = 20; offset < size / 2; offset++) {
      let correlation = 0;
      for (let i = 0; i < size / 2; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - correlation / (size / 2);

      if (correlation > maxCorrelation && correlation > 0.9) {
        maxCorrelation = correlation;
        bestOffset = offset;
      }
    }

    if (bestOffset !== -1) {
      const frequency = sampleRate / bestOffset;
      const note = frequencyToNote(frequency);
      setCurrentNote(note);
    }

    rafRef.current = requestAnimationFrame(detect);
  }, []);

  useEffect(() => {
    if (!isStarted || !stream) {
      setIsListening(false);
      return;
    }

    let ctx: AudioContext | null = null;

    (async () => {
      const Tone = await import("tone");
      ctx = Tone.getContext().rawContext as AudioContext;

      // Connect the MediaStream to the Web Audio graph
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;          // ~23ms resolution at 44.1kHz
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      rafRef.current = requestAnimationFrame(detect);
    })();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      analyserRef.current?.disconnect();
      sourceRef.current?.disconnect();
      analyserRef.current = null;
      sourceRef.current = null;
      setIsListening(false);
    };
  }, [isStarted, stream, detect]);

  return { currentNote, isListening };
}
```

---

## 8. Shadcn Permission Dialog

Use the Shadcn `Dialog` component to ask for microphone access with a polished UI:

```tsx
// components/guitar/MicPermissionDialog.tsx
"use client";

import { Mic, MicOff, Music, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MicPermission } from "@/lib/audio/useMicrophonePermission";

interface MicPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: MicPermission;
  onRequestPermission: () => Promise<void>;
  error: string | null;
}

export function MicPermissionDialog({
  open,
  onOpenChange,
  permission,
  onRequestPermission,
  error,
}: MicPermissionDialogProps) {
  const isRequesting = permission === "requesting";
  const isDenied = permission === "denied" || permission === "unavailable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Enable Microphone</DialogTitle>
          </div>
          <DialogDescription>
            The guitar tuner needs access to your microphone to detect the pitch
            of your guitar strings in real time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Permissions list */}
          {[
            { icon: <Music className="h-4 w-4" />, text: "Detect guitar string pitch" },
            { icon: <Mic className="h-4 w-4" />,   text: "Listen via your microphone" },
            { icon: <MicOff className="h-4 w-4" />, text: "Never recorded or stored" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="text-primary">{icon}</span>
              {text}
            </div>
          ))}

          {/* Error message */}
          {isDenied && error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button
            onClick={onRequestPermission}
            disabled={isRequesting}
            className="flex items-center gap-2"
          >
            {isRequesting ? (
              <>
                <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                Requesting…
              </>
            ) : isDenied ? (
              "Try Again"
            ) : (
              <>
                <Mic className="h-4 w-4" />
                Allow Microphone
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 9. Guitar Player UI Component

Wire everything together in the main component:

```tsx
// components/guitar/GuitarPlayer.tsx
"use client";

import { useState } from "react";
import { Mic, Volume2, Zap, Music2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAudio } from "@/lib/audio/AudioProvider";
import { useGuitarEngine, GUITAR_STRINGS } from "@/lib/audio/useGuitarEngine";
import { useMicrophonePermission } from "@/lib/audio/useMicrophonePermission";
import { useGuitarTuner } from "@/lib/audio/useGuitarTuner";
import { MicPermissionDialog } from "./MicPermissionDialog";
import { GUITAR_PRESETS } from "@/lib/audio/guitarPresets";

export default function GuitarPlayer() {
  const { isStarted, startAudio } = useAudio();
  const { isReady, pluckString, strumChord, setParam, params } = useGuitarEngine();
  const { permission, stream, requestPermission, error } = useMicrophonePermission();
  const { currentNote, isListening } = useGuitarTuner({ stream });

  const [micDialogOpen, setMicDialogOpen] = useState(false);
  const [tunerEnabled, setTunerEnabled] = useState(false);
  const [activePreset, setActivePreset] = useState("Clean");

  // Step 1: Unlock audio on first interaction
  const handleStart = async () => {
    await startAudio();
  };

  // Step 2: Open mic dialog
  const handleEnableTuner = () => {
    setMicDialogOpen(true);
  };

  // Step 3: Request mic and start tuner
  const handleRequestMic = async () => {
    const granted = await requestPermission();
    if (granted) {
      setTunerEnabled(true);
      setMicDialogOpen(false);
    }
  };

  // Apply a preset
  const applyPreset = (presetName: string) => {
    const preset = GUITAR_PRESETS[presetName];
    if (!preset) return;
    setActivePreset(presetName);
    (Object.entries(preset) as [keyof typeof preset, number][]).forEach(
      ([key, value]) => setParam(key, value)
    );
  };

  // Tuner needle angle (-50 cents = -90°, 0 = 0°, +50 cents = +90°)
  const cents = currentNote?.cents ?? 0;
  const needleAngle = Math.max(-90, Math.min(90, (cents / 50) * 90));

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6">
        <Music2 className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-3xl font-bold">Guitar Studio</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          Click below to unlock the audio engine. Browsers require a user gesture
          before audio can play.
        </p>
        {/* This button IS the user gesture that unlocks AudioContext */}
        <Button size="lg" onClick={handleStart} className="gap-2">
          <Volume2 className="h-5 w-5" />
          Start Audio Engine
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Guitar Studio</h1>
        <div className="flex items-center gap-2">
          <Badge variant={isReady ? "default" : "secondary"}>
            {isReady ? "Engine Ready" : "Loading…"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleEnableTuner}
          >
            <Mic className="h-4 w-4" />
            {tunerEnabled ? "Tuner On" : "Enable Tuner"}
          </Button>
        </div>
      </div>

      {/* ── Tuner ─────────────────────────────────────────────── */}
      {tunerEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mic className="h-4 w-4" />
              Chromatic Tuner
              {isListening && (
                <Badge variant="outline" className="text-xs ml-auto">
                  Listening…
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentNote ? (
              <div className="flex flex-col items-center gap-4">
                <div className={`text-6xl font-mono font-bold tabular-nums
                  ${currentNote.isInTune ? "text-green-500" : "text-yellow-500"}`}>
                  {currentNote.note}{currentNote.octave}
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentNote.frequency.toFixed(1)} Hz &nbsp;·&nbsp;{" "}
                  {currentNote.cents > 0 ? "+" : ""}{currentNote.cents} cents
                </p>
                {/* Needle SVG */}
                <svg viewBox="0 0 200 110" className="w-56">
                  <path d="M 10 100 A 90 90 0 0 1 190 100"
                    fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 100 A 90 90 0 0 1 190 100"
                    fill="none" stroke={currentNote.isInTune ? "#22c55e" : "#eab308"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray="283" strokeDashoffset="142" />
                  {/* Needle */}
                  <line
                    x1="100" y1="100"
                    x2={100 + 75 * Math.sin((needleAngle * Math.PI) / 180)}
                    y2={100 - 75 * Math.cos((needleAngle * Math.PI) / 180)}
                    stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round"
                    style={{ transition: "x2 0.1s, y2 0.1s" }}
                  />
                  <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
                  {/* Labels */}
                  <text x="8"  y="108" fontSize="10" fill="hsl(var(--muted-foreground))">-50</text>
                  <text x="94" y="16"  fontSize="10" fill="hsl(var(--muted-foreground))">0</text>
                  <text x="178" y="108" fontSize="10" fill="hsl(var(--muted-foreground))">+50</text>
                </svg>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                Play a note on your guitar…
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Virtual Strings ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Virtual Strings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {GUITAR_STRINGS.map((string, i) => (
            <button
              key={string.name}
              onClick={() => pluckString(i)}
              className="w-full flex items-center gap-4 group"
              disabled={!isReady}
            >
              <span className="w-8 text-sm font-mono text-muted-foreground">
                {string.name}
              </span>
              <div
                className={`flex-1 rounded-full bg-foreground/20 group-hover:bg-primary
                  group-active:bg-primary transition-colors`}
                style={{ height: `${Math.max(1, 4 - i * 0.5)}px` }}
              />
              <span className="w-20 text-xs text-right text-muted-foreground">
                {string.freq} Hz
              </span>
            </button>
          ))}
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => strumChord([0, 1, 2, 3, 4, 5])}
            disabled={!isReady}
          >
            Strum All Strings
          </Button>
        </CardContent>
      </Card>

      {/* ── Presets ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Amp Presets
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.keys(GUITAR_PRESETS).map((name) => (
            <Button
              key={name}
              variant={activePreset === name ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(name)}
              disabled={!isReady}
            >
              {name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* ── Effects Controls ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Effects Chain</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { label: "Distortion",    key: "distortion",    min: 0, max: 1,   step: 0.01 },
            { label: "Reverb Mix",    key: "reverbWet",     min: 0, max: 1,   step: 0.01 },
            { label: "Delay Mix",     key: "delayWet",      min: 0, max: 1,   step: 0.01 },
            { label: "Delay Feedback",key: "delayFeedback", min: 0, max: 0.95,step: 0.01 },
            { label: "Chorus Mix",    key: "chorusWet",     min: 0, max: 1,   step: 0.01 },
            { label: "Master Volume", key: "masterVolume",  min: -40,max: 0,  step: 1    },
            { label: "EQ Low",        key: "eqLow",         min: -20,max: 20, step: 1    },
            { label: "EQ Mid",        key: "eqMid",         min: -20,max: 20, step: 1    },
            { label: "EQ High",       key: "eqHigh",        min: -20,max: 20, step: 1    },
          ].map(({ label, key, min, max, step }) => (
            <div key={key} className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-sm">{label}</Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {(params[key as keyof typeof params] as number).toFixed(2)}
                </span>
              </div>
              <Slider
                min={min} max={max} step={step}
                value={[params[key as keyof typeof params] as number]}
                onValueChange={([v]) => setParam(key as any, v)}
                disabled={!isReady}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Mic Permission Dialog ─────────────────────────────── */}
      <MicPermissionDialog
        open={micDialogOpen}
        onOpenChange={setMicDialogOpen}
        permission={permission}
        onRequestPermission={handleRequestMic}
        error={error}
      />
    </div>
  );
}
```

---

## 10. Complete File Structure

```
src/
├── app/
│   ├── layout.tsx                    ← AudioProvider registered here
│   └── page.tsx                      ← dynamic() import with ssr: false
│
├── components/
│   ├── guitar/
│   │   ├── GuitarPlayer.tsx          ← Main UI (use client)
│   │   └── MicPermissionDialog.tsx   ← Shadcn Dialog wrapper
│   └── ui/                           ← Shadcn auto-generated components
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── slider.tsx
│       ├── switch.tsx
│       └── badge.tsx
│
└── lib/
    └── audio/
        ├── AudioProvider.tsx         ← Singleton AudioContext + React context
        ├── useGuitarEngine.ts        ← Tone.js signal chain
        ├── useGuitarTuner.ts         ← Microphone pitch detection
        ├── useMicrophonePermission.ts← getUserMedia + permission state
        └── guitarPresets.ts          ← Named effect configurations
```

---

## 11. Common Pitfalls & Solutions

### `window is not defined` / `AudioContext is not defined`

**Cause:** Tone.js imported at module level in a file rendered server-side.

**Fix:** Use `dynamic(() => import("…"), { ssr: false })` or `await import("tone")`
inside a `useEffect` or event handler.

---

### `The AudioContext was not allowed to start`

**Cause:** `Tone.start()` called before any user gesture (click, keydown, etc.).

**Fix:** Gate all audio initialization behind a button click. Keep the `startAudio`
function in your `AudioProvider` and only expose it — never call it automatically.

---

### Microphone audio sounds processed / robotized

**Cause:** Browser echo cancellation, noise suppression, and AGC are altering the
guitar signal before it reaches your app.

**Fix:** Disable them in your `getUserMedia` constraints:
```ts
audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
```

---

### Tone.js nodes not cleaned up, audio still playing after component unmount

**Cause:** Missing `dispose()` calls.

**Fix:** Always return a cleanup function from `useEffect` that calls `.dispose()` on
every Tone.js node:
```ts
return () => {
  synth.dispose();
  reverb.dispose();
  // … every node
};
```

---

### `Reverb.generate()` / `Chorus.start()` not awaited

**Cause:** Some Tone.js nodes require async initialization before they're active.

**Fix:**
```ts
const reverb = new Tone.Reverb({ decay: 2.5 });
await reverb.generate(); // ← required

const chorus = new Tone.Chorus({ ... });
await chorus.start();    // ← required
```

---

### PingPongDelay `delayTime` type error

**Cause:** `PingPongDelay.delayTime` is a `Signal`, not a plain number.

**Fix:**
```ts
// ❌ delay.delayTime = 0.5;
// ✅
(delay.delayTime as any).value = 0.5;
// Or use Tone.Signal type directly
```

---

### Hydration mismatch with audio state

**Cause:** Server renders one state, client renders another (e.g. `isStarted: false`
on server, but the component uses it to conditionally render).

**Fix:** Start with all audio state as `false`/`"suspended"` and only update it in
`useEffect` — never during render.

---

*Built with Tone.js 15 · Next.js 15 App Router · TypeScript · Tailwind CSS · Shadcn/ui*