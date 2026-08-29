# Building a Live MusicXML Sheet Editor with OSMD, Vite, React, TypeScript, shadcn/ui & Tailwind**

An advanced, practical build guide. It covers project setup, the OSMD rendering lifecycle, building a live (edit-and-preview) workflow, interactive note/cursor handling, XML validation, playback sync, autosave, performance (including Web Worker offloading), a hybrid RiffScore+OSMD authoring architecture with Tonal.js theory validation and MIDI export, and where to go for deeper MusicXML knowledge. **§10** adds a second, complementary workflow — a production-hardened `useOSMD` variant, real-time + export-time transposition, zoom/page-format controls, a step-based cursor UI, `.musicxml`/`.mxl` export, and file-import (drag-and-drop) — for apps built around opening and editing existing score files rather than live-typing MusicXML from scratch.

::: tip Important framing
OSMD is a **renderer**, not a full graphical score editor. It turns MusicXML into SVG/Canvas beautifully and exposes a data model + cursor API, but it does not provide drag-and-drop note placement out of the box. A "live editor" in this stack means one of two architectures — pick based on your goals:

1. **Text/structured-data → live preview** (fastest to build): the user edits MusicXML (or a friendlier intermediate model), you debounce, re-parse, and re-render with OSMD. This is what this guide builds.
2. **Click-to-edit on the rendered score**: you intercept clicks on OSMD's SVG nodes, map them back to the underlying `Note`/`VoiceEntry` objects, mutate the OSMD sheet model or the source XML, then re-render. This guide shows the pattern and its limits.
   :::

## Architecture Overview

### Decision tree: which editing path do you actually need?

The single biggest architectural fork in this stack is **OSMD-only vs. hybrid-with-RiffScore** — decide this first, since it changes what §3–§6 are _for_:

```bash
                 Do users need to author new notes/measures
                 from scratch inside your app?
                              │
              ┌───────────────┴───────────────┐
              NO                              YES
              │                                │
   You're building a VIEWER            Do you also need to import
   (display + annotate/highlight       MusicXML files users bring
   only). Use OSMD alone:              in from other tools (Finale,
   §2–§3, §5 (highlight-only),         MuseScore, Sibelius exports)?
   §8. Skip RiffScore.                          │
                                  ┌──────────────┴──────────────┐
                                  NO                            YES
                                  │                              │
                       Use RiffScore ALONE            Use the HYBRID pattern:
                       as the editor.                 RiffScore for authoring +
                       Appendix §A.                   OSMD for importing/viewing
                       Skip OSMD entirely              existing files (Appendix §A).
                       (or keep it only for             Both read/write the same
                       print/export views).             MusicXML in one store (§7).
```

**Recommended default for a genuinely "live editor"**: the **hybrid pattern** — RiffScore owns note entry/editing, OSMD handles rendering anything imported or referenced. This guide builds the OSMD renderer path first (§2–§8, since it's the substrate either way — RiffScore itself renders through the same VexFlow lineage, and OSMD is what you'll reach for the moment you need to _display_ a file the user didn't create in-app), then shows the hybrid wiring in the Appendix. If you know upfront you only need a viewer (no authoring), you can stop after §8.

### Component diagram (hybrid architecture)

```bash
┌───────────────────────────────────────────────────────────────────┐
│                            App Shell                                │
│   Tailwind + shadcn/ui (Toolbar, Tabs, Dialogs, Toasts)             │
├───────────────┬───────────────────┬────────────────┬────────────────┤
│  Score Store   │  RiffScore Editor │  MusicXML Text │  OSMD Canvas   │
│ (Zustand +     │  (authoring, its  │  Editor         │  (import /     │
│  autosave,     │  own toolbar/     │  (CodeMirror,   │  reference     │
│  §7)           │  undo, Tonal+Tone │  advanced/raw   │  view, §3)     │
│                │  internally)      │  XML editing)   │                │
├───────────────┴───────────────────┴────────────────┴────────────────┤
│         Tonal.js (theory validation)  ·  Web MIDI (note input)       │
└───────────────────────────────────────────────────────────────────┘
        │  RiffScore batch event      │  debounced update  │
        └─────────────────────────────┴─────────────────────►  osmd.load(xml)
                     exportMusicXML() ──────────────────────►  osmd.render()
```

Key pieces:

- **Vite** — dev server + bundler.
- **React + TypeScript** — component/state layer.
- **OSMD (`opensheetmusicdisplay`)** — parses MusicXML and renders via VexFlow to SVG/Canvas; use it for import/viewing and (§5–§6) light click-to-edit.
- **RiffScore** (Appendix §A) — the actual authoring surface when users create/edit notes, chords, and measures directly.
- **Tonal.js** (Appendix §B) — pure theory functions backing validation, transposition, and chord detection across both surfaces.
- **shadcn/ui** — accessible, unstyled-by-default component primitives (Toolbar buttons, Tabs, Sheet/Dialog, Slider for zoom, Toggle for playback).
- **Tailwind CSS** — styling and the design-token layer shadcn builds on.

> The MusicXML string in your `scoreStore` (§7) is the single contract between all four panels — RiffScore writes to it via `exportMusicXML()` on each batch, the text editor writes to it via debounced `onChange`, and OSMD only ever reads from it. Treat it as one-way-in-from-multiple-sources, one-way-out-to-the-renderer to avoid feedback loops (e.g. don't feed OSMD's own re-render back into RiffScore).

### Why OSMD instead of raw VexFlow

VexFlow is a low-level rendering primitive: it draws staves, noteheads, beams, and ties, but it has **no concept of a musical score**. Building directly on VexFlow means also building your own MusicXML parser, your own part/measure/voice model, your own layout engine (system breaks, justification, multi-page pagination), and your own cursor/iterator abstraction — a multi-month undertaking before writing a single "editor" feature. OSMD is built _on top of_ VexFlow and gives you all of that for the price of `osmd.load(xmlString)`:

- A full **MusicXML → internal `Sheet` model → VexFlow backend** pipeline.
- A **graphical model** (`GraphicSheet`) mapping musical objects (notes, measures, voice entries) to their rendered SVG coordinates — essential for the click-to-edit pattern in §5.
- Built-in **pagination, system breaks, and responsive re-layout**, where most from-scratch VexFlow projects stall.
- The **cursor/iterator API** (`osmd.cursor`) this guide's playback sync (§5.1) and click-to-edit (§5) both build on.

The trade-off: OSMD is opinionated and heavier than VexFlow alone, and its public API for _mutating_ a loaded score (as opposed to rendering it) is thinner than a DAW-grade editor needs — which is exactly why §6 shows dropping down to raw MusicXML DOM manipulation for edits OSMD doesn't expose directly, and §10.3 does the same for export-correct transposition.

**Where this sits in the broader notation-software ecosystem**, for context if you're evaluating architecture:

- **MuseScore Studio** is a full native (Qt/C++) notation editor with its own internal score model; it exports MusicXML/MXL as an interchange format but doesn't run in the browser. Useful mainly as a reference for what a "real" MusicXML file looks like once authored by a mature engraving tool — a good source of test fixtures for your parser/importer.
- **LilyPond** takes the opposite approach: a text-based, declarative description of a score, compiled to high-quality engraved output. A good mental model for _why_ MusicXML is verbose — it captures the same engraving intent LilyPond captures in its syntax, but as portable XML instead of a DSL.
- **Audiveris** is an Optical Music Recognition (OMR) engine turning scanned sheet music into MusicXML. Relevant if your ingestion pipeline includes "photo of paper score → editable app" — Audiveris output is a realistic (and messier) MusicXML source to test your importer against, alongside hand-authored MuseScore/Finale/Sibelius exports.

## Project Setup

```bash
# 1. Scaffold Vite + React + TS
npm create vite@latest musicxml-editor -- --template react-ts
cd musicxml-editor
npm install

# 2. Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  // "class" strategy (vs. "media") lets a shadcn `Toggle`/theme-switcher
  // flip dark mode by toggling a class on <html>, instead of only
  // following the OS-level color-scheme preference.
  darkMode: ["class"],
  // Only files Tailwind actually scans for class names — keep this in
  // sync with where you add components, or new utility classes won't
  // be picked up by the JIT compiler and will silently no-op.
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {}, // shadcn's `init` step below populates this with your CSS-variable-driven color/radius tokens.
  },
  // Powers shadcn's built-in open/close animations (Dialog, Sheet, Toast, etc.).
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

Add the Tailwind directives to `src/index.css`, then initialize **shadcn/ui** (it wires up `components.json`, path aliases, and CSS variables for theming):

```bash
npx shadcn@latest init
npx shadcn@latest add button toolbar slider tabs sheet toggle tooltip select card scroll-area
```

> **Staying current:** this setup targets Tailwind v3's PostCSS-based config. If you're starting a project fresh today, Tailwind v4's first-party Vite plugin (`npm install -D tailwindcss @tailwindcss/vite`, then add `tailwindcss()` to `vite.config.ts`'s `plugins` and `@import "tailwindcss";` to `src/index.css` — no `tailwind.config.ts`/PostCSS step needed) is the more current path, and shadcn's CLI now defaults to **Base UI** as its primitive library (`npx shadcn@latest init -d`, or `--base base-ui` to be explicit; `--base radix` opts back into Radix). Both paths produce the same `@/components/ui/*` component shape this guide's code assumes — §10 uses the same `Button`/`Select`/`Alert`/`Card` component names regardless of which primitive library backs them.

Install OSMD and a code editor for the MusicXML text pane:

```bash
npm install opensheetmusicdisplay
npm install @uiw/react-codemirror @codemirror/lang-xml
```

Configure `vite.config.ts` path aliases to match shadcn's `@/` convention:

```ts
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the "@/*" -> "./src/*" mapping shadcn's CLI writes into
    // tsconfig.json's `paths`; without this, Vite's dev server and
    // production bundler won't resolve "@/components/ui/..." imports
    // even though the TS type-checker is happy with them.
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Starter Template: Solo Violin (4/4), Treble Clef

Since this guide is scoped to a solo Violin, the starter document (`src/lib/starterXml.ts`, referenced in §4) declares a single non-transposing treble-clef part with a proper `<score-instrument>`/`<midi-instrument>` pair — this is what makes RiffScore/OSMD/playback all agree the part is "a violin" rather than a generic staff:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
  "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1">
      <part-name>Violin</part-name>
      <part-abbreviation>Vln.</part-abbreviation>
      <score-instrument id="P1-I1">
        <instrument-name>Violin</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-program>41</midi-program> <!-- General MIDI: 41 = Violin -->
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <!-- divisions = how many <duration> ticks make up one quarter note
             for THIS part. 2 means a quarter note is "2" and an eighth
             note would be "1" — every <duration> below is expressed in
             these units, not in absolute time. -->
        <divisions>2</divisions>
        <key><fifths>0</fifths></key> <!-- 0 sharps/flats = C major / A minor -->
        <time><beats>4</beats><beat-type>4</beat-type></time> <!-- 4/4 -->
        <clef><sign>G</sign><line>2</line></clef> <!-- treble clef, G-line on staff line 2 -->
      </attributes>
      <note>
        <pitch><step>G</step><octave>3</octave></pitch>
        <duration>2</duration> <!-- 2 ticks = 1 quarter note, per <divisions> above -->
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>D</step><octave>4</octave></pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>A</step><octave>4</octave></pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
      <note>
        <pitch><step>E</step><octave>5</octave></pitch>
        <duration>2</duration>
        <type>quarter</type>
      </note>
    </measure>
  </part>
</score-partwise>
```

The four starter notes are the violin's **open strings** (G3, D4, A4, E5) — a deliberate choice: it's immediately recognizable to anyone testing the editor, and it doubles as a sanity check that your range-validation logic (§9.2) accepts the instrument's own tuning as in-range. `<clef><sign>G</sign><line>2</line></clef>` is the standard treble clef (no `<clef-octave-change>` — violin is non-transposing, unlike e.g. guitar). `midi-program 41` is the General MIDI program number for Violin, so any MIDI export (Appendix §D) or Tone.js sampler patch selection defaults to the right timbre without the user having to pick an instrument.

## The OSMD React Wrapper

OSMD's own React example (`react-opensheetmusicdisplay`) is intentionally minimal — for a "live" editor you want your own hook so you control the render lifecycle, loading states, and error handling precisely.

`src/hooks/useOSMD.ts`:

```ts
import { useEffect, useRef, useState, useCallback } from "react";
import { OpenSheetMusicDisplay, IOSMDOptions } from "opensheetmusicdisplay";

interface UseOSMDResult {
  containerRef: React.RefObject<HTMLDivElement>;
  osmd: OpenSheetMusicDisplay | null;
  isLoading: boolean;
  error: string | null;
}

// Module-level constant (not recreated on every render) so it's a stable
// default for the `options` param below — passing an inline object literal
// as the default instead would be a new reference on every call site render,
// though since `options` is intentionally excluded from the effect's
// dependency array (see note below), that particular risk doesn't apply here.
const defaultOptions: IOSMDOptions = {
  autoResize: true, // re-render on container resize; disable for many-instance thumbnail views (§8)
  backend: "svg", // "svg" keeps notes as addressable DOM nodes — required for click-to-edit (§5); "canvas" is cheaper but loses that
  drawTitle: true,
  drawingParameters: "default",
  cursorsOptions: [{ type: 0, color: "#3b82f6", follow: true }], // type 0 = standard vertical bar cursor; `follow: true` auto-scrolls it into view
};

export function useOSMD(
  musicXml: string | null,
  options: IOSMDOptions = defaultOptions,
): UseOSMDResult {
  const containerRef = useRef<HTMLDivElement>(null);
  // Plain ref (not state) for the OSMD instance itself: we need synchronous
  // access to it inside the second effect without that effect re-running
  // every time the instance "changes" (it's only ever set once).
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  // Mirrored into state purely so consumers of this hook re-render once
  // OSMD becomes available (e.g. to enable toolbar buttons that call
  // `osmd.cursor.next()`).
  const [osmd, setOsmd] = useState<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Effect 1: instantiate OSMD once the container <div> exists. ---
  // Deliberately NOT re-run when `options` changes — OSMD doesn't support
  // reconfiguring an existing instance's constructor options, so changing
  // `options` after mount is a no-op here by design, not an oversight.
  useEffect(() => {
    if (!containerRef.current) return;
    const instance = new OpenSheetMusicDisplay(containerRef.current, options);
    osmdRef.current = instance;
    setOsmd(instance);
    // Teardown: release OSMD's internal SVG/canvas and listeners when this
    // component unmounts or the container ref changes, to avoid leaking
    // detached DOM nodes.
    return () => {
      instance.clear();
    };
    // `containerRef.current` in the deps array is unusual (refs aren't
    // normally reactive) — this relies on the component re-rendering after
    // the ref attaches so the effect re-evaluates and sees a non-null value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]);

  // --- Effect 2: (re)load + render whenever the source XML changes. ---
  // This is the "live" part of the live editor: every debounced XML update
  // from XmlEditor (§4) flows in here as a new `musicXml` value.
  useEffect(() => {
    const instance = osmdRef.current;
    if (!instance || !musicXml) return;

    // Guards against a race: if `musicXml` changes again before the current
    // `load()` promise resolves, this flag stops the stale response from
    // clobbering the newer one's loading/error state.
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    instance
      .load(musicXml) // async: parses MusicXML into OSMD's internal MusicSheet model
      .then(() => {
        if (cancelled) return;
        instance.render(); // sync: draws the parsed model to SVG/Canvas
      })
      .catch((err: Error) => {
        // Surfaces OSMD's own semantic parse/render errors (distinct from
        // the structural pre-validation in §4.1, which runs before this).
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    // Cleanup flips the guard if this effect re-runs (new musicXml) or
    // the component unmounts before the in-flight load() settles.
    return () => {
      cancelled = true;
    };
  }, [musicXml]);

  return { containerRef, osmd, isLoading, error };
}
```

`src/components/ScoreCanvas.tsx`:

```tsx
import { useOSMD } from "@/hooks/useOSMD";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ScoreCanvasProps {
  musicXml: string | null;
}

export function ScoreCanvas({ musicXml }: ScoreCanvasProps) {
  // All the imperative OSMD wiring lives in the hook (§3 above) — this
  // component only needs the derived UI state plus the container ref
  // that OSMD mounts its SVG/Canvas into.
  const { containerRef, isLoading, error } = useOSMD(musicXml);

  return (
    <Card className="relative h-full overflow-hidden">
      {/* Loading overlay sits above the (possibly stale) previous render
          rather than unmounting it, so the score doesn't flash blank on
          every debounced keystroke — only the overlay toggles. */}
      {isLoading && (
        <div className="absolute inset-0 grid place-items-center bg-background/60 text-sm text-muted-foreground">
          Rendering score…
        </div>
      )}
      {/* OSMD's own render/parse errors (semantic MusicXML issues) — see §4.1
          for the separate, earlier structural-validation error path. */}
      {error && (
        <div className="absolute inset-x-0 top-0 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <ScrollArea className="h-full w-full">
        {/* OSMD takes ownership of this div's contents directly — don't
            render React children inside it, since OSMD's own SVG/Canvas
            output and React's virtual DOM diffing would fight each other. */}
        <div ref={containerRef} className="p-4" />
      </ScrollArea>
    </Card>
  );
}
```

**Why `load()` then `render()` are separate:** `load()` parses the MusicXML string/URL into OSMD's internal `MusicSheet` object model asynchronously (it returns a `Promise`); `render()` is the synchronous draw step. Keeping them separate is what lets you inspect/mutate the parsed model _before_ drawing — the hook on which click-to-edit is built.

## Wiring the "Live" Text-Editor Pane

`src/components/XmlEditor.tsx` (CodeMirror + debounce, so you don't re-render OSMD on every keystroke):

```tsx
import { useState, useEffect, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { xml } from "@codemirror/lang-xml";

interface XmlEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export function XmlEditor({
  initialValue,
  onChange,
  debounceMs = 400,
}: XmlEditorProps) {
  // CodeMirror owns keystroke-by-keystroke updates via this local state;
  // `initialValue` seeds it once but is intentionally NOT re-synced on
  // every parent re-render (no effect watching `initialValue`) — otherwise
  // an external XML update (e.g. from RiffScore, §Appendix A) would fight
  // the user's in-progress typing.
  const [value, setValue] = useState(initialValue);

  // Debounce: only propagate to the parent (and from there to OSMD's
  // load()/render() cycle, §3) `debounceMs` after typing pauses, so a full
  // MusicXML re-parse doesn't run on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => onChange(value), debounceMs);
    return () => clearTimeout(handle); // cancels the pending call if `value` changes again first
  }, [value, debounceMs, onChange]);

  // Memoized so CodeMirror doesn't tear down and rebuild its XML-language
  // extension on every render — `xml()` returns a new extension array
  // instance each call, which CodeMirror treats as "config changed."
  const extensions = useMemo(() => [xml()], []);

  return (
    <CodeMirror
      value={value}
      height="100%"
      extensions={extensions}
      onChange={setValue} // fires on every keystroke; debouncing happens above, not here
      className="h-full text-sm"
    />
  );
}
```

Top-level composition:

```tsx
// src/App.tsx
import { useState, useCallback } from "react";
import { XmlEditor } from "@/components/XmlEditor";
import { ScoreCanvas } from "@/components/ScoreCanvas";
import { Toolbar } from "@/components/Toolbar";
import { starterXml } from "@/lib/starterXml";

export default function App() {
  // `musicXml` and `committedXml` are set together in `handleChange`, so at
  // this stage they're always equal — the split exists so it's clear which
  // consumer reads which value: `musicXml` feeds the Toolbar (e.g. for
  // export) and `XmlEditor`'s one-time `initialValue`, while `committedXml`
  // is what actually triggers an OSMD reload via ScoreCanvas. Diverge them
  // later if you add a path that shouldn't immediately trigger a re-render
  // (e.g. a "preview without committing" mode).
  const [musicXml, setMusicXml] = useState<string>(starterXml);
  const [committedXml, setCommittedXml] = useState<string>(starterXml);

  // Already-debounced by the time it arrives here (XmlEditor's internal
  // debounce, §4) — no further debouncing needed at this level.
  const handleChange = useCallback((xml: string) => {
    setMusicXml(xml);
    setCommittedXml(xml); // triggers OSMD reload
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <Toolbar xml={musicXml} />
      <div className="grid flex-1 grid-cols-2 gap-2 p-2">
        {/* `initialValue` seeds CodeMirror once on mount; XmlEditor manages
            keystrokes internally from there (§4). */}
        <XmlEditor initialValue={musicXml} onChange={handleChange} />
        <ScoreCanvas musicXml={committedXml} />
      </div>
    </div>
  );
}
```

This gives you the full loop: type MusicXML → debounce → `osmd.load()` → `osmd.render()`, wrapped in shadcn `Card`/`ScrollArea` and styled with Tailwind.

### Validating MusicXML Before It Reaches OSMD

Right now, a malformed edit only surfaces after `osmd.load()` rejects it — the user sees a generic error string with no line number. Validate structurally _before_ handing the string to OSMD, so mistakes surface as inline editor feedback instead of a failed render:

```ts
// src/lib/validateMusicXml.ts
import { XMLParser, XMLValidator } from "fast-xml-parser";

export interface XmlValidationResult {
  valid: boolean;
  error?: string;
  line?: number;
}

// `ignoreAttributes: false` keeps attributes (e.g. `<note-id>` `id="..."`)
// in the parsed object instead of discarding them — needed if you later
// extend this validator to check attribute-level constraints.
const parser = new XMLParser({ ignoreAttributes: false });

export function validateMusicXml(xml: string): XmlValidationResult {
  // 1. Well-formedness (unclosed tags, bad entities, etc.) — this alone is
  // cheap enough to run on every debounced keystroke; it catches the most
  // common typing-in-progress states (an unclosed tag) with an exact line
  // number, which `osmd.load()`'s own error message doesn't give you.
  const wellFormed = XMLValidator.validate(xml);
  if (wellFormed !== true) {
    return {
      valid: false,
      error: wellFormed.err.msg,
      line: wellFormed.err.line,
    };
  }

  // 2. Minimal structural sanity check — cheap, catches the most common
  // authoring mistakes before a full OSMD parse (which is much slower).
  // This is intentionally NOT a full MusicXML schema validation (that would
  // duplicate OSMD's own parser and be slow to maintain against the spec);
  // it only guards the handful of root-level elements OSMD assumes exist
  // before it even starts walking the document.
  const parsed = parser.parse(xml);
  const root = parsed["score-partwise"] ?? parsed["score-timewise"];
  if (!root) {
    return {
      valid: false,
      error: "Missing <score-partwise> or <score-timewise> root element.",
    };
  }
  if (!root["part-list"]) {
    return { valid: false, error: "Missing required <part-list> element." };
  }

  return { valid: true };
}
```

Wire it into the debounce in `XmlEditor` so OSMD only ever sees XML that has already passed the cheap checks:

```tsx
useEffect(() => {
  const handle = setTimeout(() => {
    const result = validateMusicXml(value);
    setValidation(result); // drives the inline error strip regardless of validity
    if (result.valid) onChange(value); // only propagate valid XML downstream
    // Invalid XML intentionally stays local: `committedXml` (and thus
    // OSMD, §3) is never updated with something that would fail load(),
    // so the last good render stays on screen while the user fixes the typo.
  }, debounceMs);
  return () => clearTimeout(handle);
}, [value, debounceMs, onChange]);
```

Surface `validation.error` inline (a small `role="alert"` strip under the CodeMirror pane, or a shadcn `Tooltip` gutter marker at `validation.line`) instead of waiting for OSMD's own error boundary in `ScoreCanvas`. This keeps the two error paths distinct: **validation errors** (fast, structural, shown while typing) vs. **OSMD render errors** (semantic MusicXML issues OSMD itself rejects, shown in `ScoreCanvas` per §3).

## Interactive Cursor & Note Selection (Click-to-Edit Pattern)

OSMD ships a **`Cursor`** API for programmatic navigation (`osmd.cursor.next()`, `.previous()`, `.show()`, `.reset()`), and every rendered note is an actual SVG element you can attach listeners to. This is the bridge between "just a renderer" and "an editor."

```ts
// src/lib/noteInteraction.ts
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

export function attachNoteClickHandlers(
  osmd: OpenSheetMusicDisplay,
  onNoteClick: (noteId: string, measureIndex: number) => void,
) {
  const svg = osmd.container.querySelector("svg");
  if (!svg) return; // nothing rendered yet (e.g. called before the first `render()`, §3)

  // OSMD tags graphical note groups; walk voice entries to build a lookup.
  // `cursor.reset()` + the iterator is the same traversal mechanism used
  // for playback sync (§5.1) — one pass over every note in source order.
  osmd.cursor.reset();
  const iterator = osmd.cursor.iterator;

  while (!iterator.EndReached) {
    const voices = iterator.CurrentVoiceEntries; // notes sounding at this timestamp, across all voices on the staff
    for (const voice of voices) {
      for (const note of voice.Notes) {
        // NOTE: the exact accessor for a note's graphical SVG element has
        // moved between OSMD versions — verify `rules.GNote` /
        // `getSVGGElement` against the OSMD version you've pinned before
        // relying on it; treat this as the *pattern* (map a model Note to
        // its rendered SVG group), not a guaranteed-stable API surface.
        const gNote = osmd.rules.GNote?.(note);
        const el = gNote?.getSVGGElement?.();
        if (el) {
          el.style.cursor = "pointer"; // visual affordance that the note is clickable
          el.addEventListener("click", () =>
            // `NoteToString?.()` gives a human-readable pitch (e.g. "C4"),
            // not a stable unique ID — fine for a demo, but for production
            // click-to-edit prefer a real per-note identifier so two notes
            // at the same pitch in the same measure don't collide.
            onNoteClick(
              note.NoteToString?.() ?? "",
              iterator.CurrentMeasureIndex,
            ),
          );
        }
      }
    }
    iterator.moveToNext();
  }

  // Caveat: these listeners are attached to SVG nodes that OSMD tears down
  // and recreates on every render() (§3, e.g. after each debounced XML
  // edit). Re-run attachNoteClickHandlers after every render, and don't
  // rely on the old element references still being in the DOM.
}
```

Typical uses once you can identify a clicked note:

- **Highlight/select**: toggle a CSS class or recolor the SVG node directly (instant, no re-render needed — see §6).
- **Move the cursor there**: `osmd.cursor.show()` + iterate until you match the entry, so playback/edit tools stay in sync with the click.
- **Open an editing panel**: a shadcn `Sheet` or `Popover` anchored to the click, letting the user change pitch/duration, which you then translate into an XML mutation (§6) and push back through `onChange`.

For toolbar controls (Play, Next Note, Previous Note, Zoom), pair shadcn `Toggle`/`Button`/`Slider` with the cursor and `osmd.zoom` property:

```tsx
// src/components/Toolbar.tsx (excerpt)
{/* Optional-chained: `osmd` may still be null on first paint, before the
    mount effect in useOSMD (§3) has run — clicking too early is a silent
    no-op rather than a crash. */}
<Button size="icon" variant="outline" onClick={() => osmd?.cursor.previous()}>
  <ChevronLeft className="h-4 w-4" />
</Button>
<Button size="icon" variant="outline" onClick={() => osmd?.cursor.next()}>
  <ChevronRight className="h-4 w-4" />
</Button>
<Slider
  defaultValue={[1]} // 1.0 = 100% — matches osmd.zoom's own default scale
  min={0.5}
  max={2}
  step={0.1}
  onValueChange={([z]) => {
    if (osmd) {
      osmd.zoom = z;
      // Zoom needs an explicit render() call — changing `.zoom` alone
      // only updates the property, it doesn't trigger a redraw.
      osmd.render();
    }
  }}
/>
```

### Playback Cursor Sync (Time-Driven, Not Step-Driven)

A recurring pain point in OSMD's own issue tracker: `cursor.next()` advances **one note/beat at a time**, but playback needs the cursor to move by **wall-clock time**. Stepping the cursor on a fixed interval drifts against real tempo (different note durations take different real time). The fix is to drive the cursor from Tone.js's `Transport`, scheduling each cursor move at the note's actual timestamp rather than polling.

```ts
// src/lib/playbackSync.ts
import * as Tone from "tone";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

export function schedulePlayback(osmd: OpenSheetMusicDisplay, bpm: number) {
  osmd.cursor.reset();
  osmd.cursor.show(); // cursor is hidden by default until show() is called
  const iterator = osmd.cursor.iterator;

  Tone.Transport.bpm.value = bpm;
  Tone.Transport.cancel(); // clear any previously scheduled events — avoids stacking duplicate schedules on re-entry

  // Walk every voice entry once, scheduling a cursor move at its
  // timestamp (in quarter-note fractions, converted to Transport time).
  while (!iterator.EndReached) {
    // `RealValue` is a fraction of a whole note; ×4 converts it to
    // quarter-note units, matching Tone.Transport's default time signature.
    const timestampQuarters = iterator.CurrentSourceTimestamp.RealValue * 4;
    // Tone's Bars:Beats:Sixteenths string format — this naive conversion
    // packs the whole offset into the "sixteenths" slot rather than
    // properly carrying over into bars/beats, so it only reads correctly
    // for short passages; for anything beyond a few measures, compute
    // proper bar/beat/sixteenth components (or pass an absolute seconds
    // value instead) — see the Tone.js Time docs.
    const transportTime = `0:0:${timestampQuarters}`;

    Tone.Transport.schedule((time) => {
      // Tone.Draw defers the DOM mutation to the next animation frame,
      // synced to Tone's audio clock — mutating the cursor directly
      // inside the Transport callback would run on the audio thread's
      // timing and could visibly stutter against requestAnimationFrame.
      Tone.Draw.schedule(() => {
        osmd.cursor.next();
      }, time);
    }, transportTime);

    iterator.moveToNext();
  }

  osmd.cursor.reset(); // rewind visually; Transport hasn't started yet — this schedule call only *prepares* playback
}

export function playFromStart() {
  Tone.Transport.start();
}

export function stopPlayback(osmd: OpenSheetMusicDisplay) {
  Tone.Transport.stop();
  osmd.cursor.reset(); // also rewind the visual cursor, so a stopped score doesn't look mid-playback
}
```

Key points:

- **`Tone.Draw.schedule`** defers the actual DOM/cursor mutation to the browser's animation frame, keeping it in sync with Tone's audio clock without blocking audio scheduling.
- **Recompute the schedule whenever the XML changes** (call `schedulePlayback` again after each `osmd.render()`) — cursor timestamps are only valid for the score that was iterated.
- If you're also triggering actual sound (not just cursor movement), schedule note-on/note-off events on the _same_ `Tone.Transport` timeline so audio and visual cursor never drift apart — one shared clock, not two.
- Wire `playFromStart`/`stopPlayback` to the shadcn `Toggle` in the toolbar (§5) alongside `osmd.cursor.next()/previous()` for manual step-through.

## Two Editing Strategies (and Their Trade-offs)

### A. Instant visual edits (no reparse) — cheap, limited

Manipulate the SVG or the in-memory graphical model directly (e.g., recoloring a note, hiding a staff). This is fast because it **skips `load()` entirely** and just touches the DOM/graphical objects OSMD already built.

```ts
// Direct DOM mutation on an already-rendered SVG node — no osmd.load()/
// render() round-trip, so it's cheap, but the change lives only in the
// DOM and is lost on the next render() unless you also persist it (§7).
gNote.getSVGGElement().setAttribute("fill", "#ef4444"); // recolor selected note
```

Good for: selection highlighting, annotations, muting/soloing a voice visually. **Not persisted** to MusicXML unless you separately track the change and serialize it back.

### B. Source-of-truth edits (reparse) — correct, more work

Mutate the actual MusicXML string (or an intermediate JSON model you maintain and serialize to MusicXML), then run it back through `osmd.load()` → `osmd.render()`. This is the only way to make an edit that OSMD will re-lay-out correctly (e.g., changing a note's duration reflows the whole measure).

Practical pattern: keep MusicXML as your **single source of truth** in a store, apply edits with an XML library (e.g. `fast-xml-parser` or plain DOM `DOMParser`/`XMLSerializer`, since it's just XML) rather than string-splicing, then feed the serialized result back into the editor pane so the text view and the rendered view never disagree.

```ts
// Mutates a parsed MusicXML Document in place, then serializes it back to
// a string for the store (§7) and OSMD's next load()/render() pass.
function setNoteDuration(
  xmlDoc: Document,
  measureIdx: number,
  noteIdx: number,
  newType: string,
) {
  const measures = xmlDoc.querySelectorAll("measure");
  const notes = measures[measureIdx].querySelectorAll("note");
  const typeEl = notes[noteIdx].querySelector("type");
  // Guards against a missing <type> element (e.g. a grace note or a note
  // that only specifies <duration>) — silently no-ops rather than
  // throwing, which is fine for a demo but worth surfacing as a toast/
  // error in a production editor rather than failing silently.
  if (typeEl) typeEl.textContent = newType;
  // NOTE: this only updates the note's <type> (visual duration label,
  // e.g. "quarter"); a real implementation also needs to update the
  // sibling <duration> (tick count, §2.1) to keep the two in sync —
  // OSMD and playback logic both read <duration> for actual timing.
  return new XMLSerializer().serializeToString(xmlDoc);
}
```

For anything beyond trivial mutations (adding measures, changing time signatures, multi-voice edits), model your data as a typed intermediate structure (a `Score`/`Measure`/`Note` TS interface) and write a small **serializer to MusicXML**, rather than hand-editing DOM nodes — it scales much better as the editor grows.

## State Management

For anything beyond the toy example above, separate:

- **Document state** (the MusicXML / score model) — a Zustand store or React Context + `useReducer` works well; undo/redo is much easier with a reducer holding a history stack of serialized XML snapshots.
- **View state** (zoom, selected note, cursor position, panel visibility) — local component state or a lightweight UI store; keep it out of the document store so undo/redo doesn't also rewind your scroll position.

```ts
// src/store/scoreStore.ts
import { create } from "zustand";

interface ScoreState {
  xml: string;
  history: string[]; // past snapshots, oldest first — top of stack is history[history.length - 1]
  future: string[]; // snapshots undone from `history`, replayable via redo()
  setXml: (xml: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useScoreStore = create<ScoreState>((set, get) => ({
  xml: "",
  history: [],
  future: [],
  // Every committed edit (from XmlEditor's debounce §4, or RiffScore's
  // batch events, Appendix §A) pushes the *previous* xml onto history and
  // clears `future` — a fresh edit invalidates any redo stack from a
  // prior undo, same as most editors' undo model.
  setXml: (xml) =>
    set((s) => ({ xml, history: [...s.history, s.xml], future: [] })),
  undo: () => {
    const { history, xml, future } = get();
    if (!history.length) return; // nothing to undo — no-op rather than throwing
    const prev = history[history.length - 1];
    set({ xml: prev, history: history.slice(0, -1), future: [xml, ...future] });
  },
  redo: () => {
    const { future, xml, history } = get();
    if (!future.length) return;
    const next = future[0];
    set({ xml: next, future: future.slice(1), history: [...history, xml] });
  },
  // NOTE: `history`/`future` are unbounded here — for a long editing
  // session on a large score, each entry is a full serialized MusicXML
  // string, which can add up. Consider capping the stack length (e.g.
  // drop the oldest entry past ~50) or switching to diff-based snapshots
  // if memory becomes a concern.
}));
```

### Autosave & Local Persistence

A text/XML editor with no persistence is one accidental tab-close away from lost work. Snapshot the document store to **IndexedDB** (localStorage caps out around 5MB and is synchronous, which can jank the main thread on large scores — fine for small scores, but IndexedDB is the safer default). The [`idb`](https://github.com/jakearchibald/idb) package gives IndexedDB a usable promise-based API:

```bash
npm install idb
```

```ts
// src/lib/persistence.ts
import { openDB } from "idb";

const DB_NAME = "musicxml-editor";
const STORE = "scores";

// `upgrade` only runs when the DB doesn't exist yet or its version number
// increases — bump the second argument to openDB() (currently 1) and add
// migration logic here if you ever change the object store's shape.
async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

export async function saveSnapshot(id: string, xml: string) {
  const db = await getDb();
  // `savedAt` isn't read anywhere yet in this guide, but keeping it means
  // you can later show "last saved 2 minutes ago" or prune snapshots older
  // than N days without a schema migration.
  await db.put(STORE, { xml, savedAt: Date.now() }, id);
}

export async function loadSnapshot(id: string): Promise<string | null> {
  const db = await getDb();
  const record = await db.get(STORE, id);
  return record?.xml ?? null; // no matching record (first-ever visit) resolves to null, not a rejected promise
}
```

Debounce the autosave separately from the OSMD re-render debounce (§4) — autosave can afford a longer interval (e.g. 2–3s) since it's not blocking any visual feedback:

```ts
// inside scoreStore, or a dedicated hook watching xml changes
useEffect(() => {
  // Separate timer from both the OSMD re-render debounce (§4, ~300-500ms)
  // and CodeMirror's own onChange — this one only needs to fire often
  // enough to survive an accidental tab close, not to feel "live."
  const handle = setTimeout(() => saveSnapshot("current-document", xml), 2000);
  return () => clearTimeout(handle); // resets the 2s window on every further keystroke, so we save 2s after typing *stops*
}, [xml]);
```

On mount, attempt `loadSnapshot()` before falling back to a starter/blank score, and surface a shadcn `Toast` ("Restored unsaved changes from your last session") so the recovery isn't silent. For multi-document apps, key snapshots by document ID rather than a fixed `"current-document"` string.

## Performance Notes

- **Debounce, always.** `osmd.load()` re-parses the entire document; never call it on every keystroke. 300–500ms is a reasonable default; make it a Tailwind/shadcn `Slider`-configurable setting if your users edit large scores.
- **Avoid re-instantiating OSMD.** Create one `OpenSheetMusicDisplay` instance per container and reuse it across `load()`/`render()` calls rather than tearing it down — construction is the expensive part.
- **`backend: "svg"` vs `"canvas"`.** SVG is the default and gives you addressable DOM nodes (needed for click-to-edit); Canvas is cheaper to paint for very large scores but loses per-note DOM interactivity.
- **Large scores**: consider paging by movement/section rather than loading a huge MusicXML document at once, since layout is recomputed on every `render()`.
- **`autoResize: true`** attaches a resize observer — fine for one instance, but disable/manage manually if you're mounting many OSMD instances on one page (e.g. a library/thumbnail view).

### Offloading Parsing to a Web Worker (Large Scores)

`osmd.load()` and `osmd.render()` run on the main thread — for a multi-page orchestral score, XML parsing alone can visibly block input while the user is still typing in the CodeMirror pane. OSMD itself needs the DOM to render (SVG/Canvas), so `render()` can't move off the main thread, but the **XML parsing and validation** (§4.1) can.

```ts
// src/workers/xmlValidation.worker.ts
import { validateMusicXml } from "@/lib/validateMusicXml";

// Runs on a separate thread from the main UI, so the (structurally cheap
// but non-trivial at scale) fast-xml-parser pass in validateMusicXml (§4.1)
// no longer competes with keystroke handling or CodeMirror's own re-render.
self.onmessage = (e: MessageEvent<string>) => {
  const result = validateMusicXml(e.data);
  self.postMessage(result);
};
```

```ts
// src/hooks/useValidationWorker.ts
import { useEffect, useRef, useState } from "react";
import type { XmlValidationResult } from "@/lib/validateMusicXml";

export function useValidationWorker(xml: string, debounceMs = 300) {
  const workerRef = useRef<Worker>();
  const [result, setResult] = useState<XmlValidationResult | null>(null);

  // Worker is created once per component instance and reused across every
  // validation call — spinning up a new Worker per keystroke would cost
  // far more than the parsing it's meant to offload.
  useEffect(() => {
    workerRef.current = new Worker(
      // Vite's native worker syntax: `new URL(..., import.meta.url)` lets
      // Vite statically discover and bundle the worker file — a plain
      // string path here would NOT be bundled correctly.
      new URL("@/workers/xmlValidation.worker.ts", import.meta.url),
      { type: "module" }, // ES module worker, so the worker file's `import` statement above works
    );
    workerRef.current.onmessage = (e: MessageEvent<XmlValidationResult>) =>
      setResult(e.data);
    return () => workerRef.current?.terminate(); // release the worker thread on unmount
  }, []);

  // Same debounce shape as the main-thread validation in §4.1 — only
  // `postMessage` replaces the direct `validateMusicXml()` call, since the
  // actual parsing now happens off-thread inside the worker.
  useEffect(() => {
    const handle = setTimeout(
      () => workerRef.current?.postMessage(xml),
      debounceMs,
    );
    return () => clearTimeout(handle);
  }, [xml, debounceMs]);

  return result;
}
```

This keeps keystroke-to-feedback latency low even while a large document is being validated, since the (relatively cheap but non-trivial) `fast-xml-parser` pass happens off-thread. Vite supports the `new URL(..., import.meta.url)` worker syntax natively — no extra plugin needed. For genuinely huge scores, also consider **paging by movement/section** (§8) so `osmd.load()`/`render()` on the main thread never has to process the entire piece at once.

## Instrument Scope: Solo Violin (4/4) & Optional Quarter-Tone Support

### Why the instrument setup matters

The starter template (§2.1) already declares `<instrument-name>Violin</instrument-name>` and `midi-program 41`, but it's worth being explicit about what that buys you across the stack:

- **OSMD** reads `part-name`/`instrument-name` to label the staff and uses the clef (`<clef><sign>G</sign><line>2</line></clef>`, no octave transposition) to lay out pitches correctly — get this wrong and every note renders on the wrong line.
- **RiffScore** should be configured to match — a single `staff: 'treble'` part, not `'grand'` (grand staff is for piano; a violin never needs a bass-clef staff):

  ```tsx
  <RiffScore
    id="live-editor"
    config={{
      // "treble" (not "grand") — a solo violin part is a single staff;
      // "grand" would allocate a second, unused bass-clef staff meant
      // for piano-style two-staff instruments.
      score: { staff: "treble", measureCount: 8, keySignature: "G" },
      ui: { showToolbar: true },
    }}
  />
  ```

- **MIDI export/playback** (Appendix §D, §5.1) uses `midi-program 41` so both the downloaded `.mid` file and any Tone.js sampler default to a violin timbre rather than the piano default most audio libraries ship with.

### Validating the Violin's Playable Range with Tonal.js

A solo violin has a well-defined range: open G3 up to roughly E7 in normal (non-harmonic) playing, though most idiomatic writing stays under C7. Rather than letting RiffScore or the XML editor accept arbitrary octaves, validate entered pitches against that range using `Note.midi()`:

```ts
// src/lib/violinRange.ts
import { Note } from "tonal";

// G3 (open G string) to E7 (roughly the top of comfortable non-harmonic
// playing) — widen this if you need to support artificial harmonics.
const VIOLIN_MIN_MIDI = Note.midi("G3")!; // 55
const VIOLIN_MAX_MIDI = Note.midi("E7")!; // 100

export interface RangeCheck {
  inRange: boolean;
  message?: string; // human-readable reason, only set when inRange is false — surface this directly in a shadcn Toast (§9.2)
}

export function checkViolinRange(noteName: string): RangeCheck {
  const midi = Note.midi(noteName);
  // Note.midi() returns `null` (not a thrown error) for unparseable input,
  // e.g. a typo or a partial string mid-keystroke — handle it as a
  // distinct case rather than lumping it in with "out of range."
  if (midi == null) {
    return {
      inRange: false,
      message: `"${noteName}" is not a recognizable pitch.`,
    };
  }
  if (midi < VIOLIN_MIN_MIDI) {
    return {
      inRange: false,
      message: `${noteName} is below the violin's open G string.`,
    };
  }
  if (midi > VIOLIN_MAX_MIDI) {
    return {
      inRange: false,
      message: `${noteName} is above typical violin range — consider a harmonic or ledger-line check.`,
    };
  }
  return { inRange: true };
}
```

Wire this into whichever entry point writes pitches — the RiffScore sync hook (Appendix §A), the click-to-edit handler (§5), or MIDI input (Appendix §C) — and surface out-of-range pitches as a non-blocking shadcn `Toast` warning rather than a hard rejection; extended technique (scordatura, artificial harmonics) can legitimately go outside the "typical" range, so this should guide, not gate.

### Optional: Quarter-Tone Support (50-Cent Sharp/Flat)

Quarter tones — pitches exactly halfway between two adjacent semitones, 50 cents up or down — show up in extended violin writing (Ligeti, Bartók-influenced string quartets) and in Middle Eastern/Turkish maqam-influenced repertoire, both idiomatic on a fretless instrument like the violin where the pitch isn't mechanically constrained the way it is on a piano. This is genuinely optional: leave it off unless your users need it.

**a) MusicXML representation.** A quarter-tone alteration uses a fractional `<alter>` value of `±0.5` alongside an explicit `<accidental>` so notation programs render the correct microtonal accidental glyph rather than guessing:

```xml
<!-- A quarter tone below A4 ("A half-flat") -->
<note>
  <pitch>
    <step>A</step>
    <alter>-0.5</alter>
    <octave>4</octave>
  </pitch>
  <duration>2</duration>
  <type>quarter</type>
  <accidental>quarter-flat</accidental>
</note>
```

Valid `<accidental>` values for this include `quarter-sharp`, `quarter-flat`, `three-quarters-sharp`, and `three-quarters-flat`. See David Matthew's [Part 4 tutorial](https://davidmatthew.ie/a-musicxml-tutorial-part-4-non-western-notation/) for the full walkthrough — it also notes `<alter>` can go as fine as hundredths of a semitone (cents) for tunings that don't divide neatly into quarter tones, e.g. Turkish makam.

**b) OSMD rendering — supported natively.** OSMD renders `quarter-sharp`/`quarter-flat` (and three-quarter variants) out of the box via VexFlow's Stein-Zimmermann accidental glyphs — no configuration needed; if your MusicXML has a valid `<accidental>` value, `osmd.render()` draws it correctly.

**c) RiffScore — not currently supported; use the XML/OSMD path.** RiffScore's accidental shortcuts (`-`/`=`/`0` for flat/sharp/natural) don't currently expose quarter-tone entry. For quarter-tone notes, bypass RiffScore's `addNote()` for that specific edit and write the `<pitch>`/`<accidental>` pair directly into the MusicXML (§6B's DOM-mutation pattern), then let it flow back through the shared store (§1.2) so RiffScore picks up the change on its next `load()`/reparse — same hybrid contract as importing an external file.

**d) Tonal.js — no built-in quarter-tone note names; use a cents-based helper.** Tonal's note-name parser (`Note.get("A4")`) is built for 12-tone equal temperament and won't parse `"A4 half-flat"` as a distinct pitch. Model quarter tones as a cents offset on top of a Tonal-recognized base note instead of trying to force a note-name string:

```ts
// src/lib/quarterTone.ts
import { Note } from "tonal";

export interface QuarterTonePitch {
  baseNote: string; // Tonal-recognized name, e.g. "A4"
  centsOffset: -50 | 0 | 50; // quarter-flat / natural / quarter-sharp
}

// Converts a base pitch + cents offset into an actual playback frequency —
// used for audio (Tone.js oscillator/sampler detune), not for notation.
export function quarterToneFrequency({
  baseNote,
  centsOffset,
}: QuarterTonePitch): number {
  const baseFreq = Note.freq(baseNote);
  // Throws rather than returning null/NaN here (unlike checkViolinRange's
  // softer handling above) because a frequency of NaN would silently break
  // downstream audio scheduling — better to fail loudly at the boundary.
  if (baseFreq == null) throw new Error(`Unrecognized base note: ${baseNote}`);
  // 12-tone-equal-temperament cents formula: each 1200 cents = one octave
  // (a doubling in frequency), so 50 cents ≈ a ~2.9% frequency shift.
  return baseFreq * Math.pow(2, centsOffset / 1200);
}

// Converts the same cents offset into the MusicXML <alter>/<accidental>
// pair (§9.3a) — the notation-side counterpart to quarterToneFrequency
// above; keep both in sync if you ever add more offsets (e.g. three-quarter tones).
export function toMusicXmlAlterAndAccidental(
  centsOffset: QuarterTonePitch["centsOffset"],
) {
  switch (centsOffset) {
    case -50:
      return { alter: -0.5, accidental: "quarter-flat" as const };
    case 50:
      return { alter: 0.5, accidental: "quarter-sharp" as const };
    default:
      return { alter: 0, accidental: undefined }; // natural — omit <accidental> entirely in the serialized XML
  }
}

quarterToneFrequency({ baseNote: "A4", centsOffset: -50 }); // ≈ 427.47 Hz
```

This keeps Tonal doing what it's good at (parsing/validating the _base_ note name, computing its frequency) while the ±50-cent offset is handled as plain arithmetic on top — accurate for playback (feed the resulting frequency straight into a Tone.js oscillator/sampler pitch-bend) and exact for notation (feed `alter`/`accidental` straight into the `<pitch>` element above).

## Alternative Engine & File-Based Editing Workflow

Everything through §9 builds a **live-typing** editor: the user (or RiffScore) writes MusicXML directly, and OSMD renders whatever's currently valid. Some apps instead center on **opening an existing score file** (drag-and-drop a `.musicxml`/`.mxl` a user exported from MuseScore/Finale/Sibelius) and editing it through dedicated controls — transpose, zoom, step through notes — rather than a raw XML pane. This section merges in that workflow as a complementary alternative: a hardened engine hook, view-time vs. export-time transposition, zoom/page-format controls, a step-based cursor UI, `.musicxml`/`.mxl` export, and file import. Reuse whichever pieces fit — e.g. pairing §10.6's export with §7's autosave, or §10.4's zoom slider in place of the toolbar excerpt in §5.

### A production-hardened `useOSMD` variant

The `useOSMD` hook in §3 covers the common path. At production scale, four additional failure modes tend to surface:

1. **Double-initialization under React 18 Strict Mode** — `useEffect` mounts, unmounts, and remounts in dev, so `new OpenSheetMusicDisplay(...)` must be idempotent and cleanup must actually tear down the SVG backend, or you get duplicate/ghost scores.
2. **Stale closures over the OSMD instance** — because loading is async, a component can unmount (or reload a different file) while a previous `load()` promise is still in flight. Every post-await mutation needs an "is this still the current instance/generation" check.
3. **Resize thrashing** — calling `osmd.render()` on every `ResizeObserver` tick during a drag-resize visibly stutters and can re-enter mid-render. Debounce it.
4. **Canvas/SVG leak on unmount** — OSMD attaches an SVG (or canvas) backend into your container; without an explicit `osmd.clear()` plus manually emptying the container on unmount, remounting the viewer (e.g. a route change) leaves detached DOM nodes and duplicated listeners behind.

```ts
// src/hooks/useOSMDHardened.ts
import { useCallback, useEffect, useRef, useState } from "react";
import {
  OpenSheetMusicDisplay,
  IOSMDOptions,
  TransposeCalculator,
} from "opensheetmusicdisplay";
import {
  DEFAULT_OSMD_OPTIONS,
  LoadState,
  OSMDRenderOptions,
} from "@/lib/musicxml/types";

interface UseOSMDResult {
  containerRef: React.RefObject<HTMLDivElement>;
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>;
  loadState: LoadState;
  loadXML: (xml: string) => Promise<void>;
  rerender: () => void;
}

export function useOSMDHardened(
  options: Partial<OSMDRenderOptions> = {},
): UseOSMDResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  // Bumped on every load() call so in-flight async work can detect it has
  // been superseded and bail out instead of mutating stale state — the
  // hardened version of the `cancelled` boolean flag used in §3's useOSMD.
  const generationRef = useRef(0);

  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });

  // --- 1. Engine construction (runs once per mounted container) ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const merged: OSMDRenderOptions = { ...DEFAULT_OSMD_OPTIONS, ...options };

    const osmdOptions: IOSMDOptions = {
      autoResize: false, // manual control, see ResizeObserver effect below — this is the opposite default from §3's useOSMD, which delegates resize entirely to OSMD
      backend: merged.backend,
      drawTitle: merged.drawTitle,
      drawSubtitle: merged.drawSubtitle,
      drawComposer: merged.drawComposer,
      drawPartNames: merged.drawPartNames,
      drawMeasureNumbers: merged.drawMeasureNumbers,
      drawingParameters: merged.drawingParameters,
      pageFormat: merged.pageFormat,
      pageBackgroundColor: merged.pageBackgroundColor,
    };

    const osmd = new OpenSheetMusicDisplay(container, osmdOptions);

    // Transpose support is opt-in in OSMD to keep the base bundle lean.
    // Attaching the calculator here means osmd.Sheet.Transpose becomes
    // usable the moment a score is loaded (§10.3).
    osmd.TransposeCalculator = new TransposeCalculator();

    osmdRef.current = osmd;

    return () => {
      // --- Full teardown: prevents ghost SVGs under Strict Mode remounts ---
      try {
        osmd.clear();
      } catch {
        // clear() can throw if no sheet was ever loaded — safe to ignore
      }
      // OSMD does not always fully empty the container on clear(); be explicit.
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      osmdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once — option changes are applied via setOptions, not remount

  // --- 2. Debounced, leak-safe resize handling ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame: number | null = null;

    const observer = new ResizeObserver(() => {
      if (frame !== null) cancelAnimationFrame(frame);
      // rAF debounce: coalesces the burst of events a drag-resize produces
      // into a single re-render on the next paint.
      frame = requestAnimationFrame(() => {
        const osmd = osmdRef.current;
        if (!osmd || !osmd.IsReadyToRender()) return;
        try {
          osmd.render();
        } catch (err) {
          // A resize firing mid-teardown can race the render call; swallow
          // rather than crash the app, but keep it visible in dev tools.
          console.warn("[useOSMDHardened] resize render skipped:", err);
        }
      });
    });

    observer.observe(container);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // --- 3. Safe, generation-guarded load ---
  const loadXML = useCallback(async (xml: string) => {
    const osmd = osmdRef.current;
    if (!osmd) return;

    const myGeneration = ++generationRef.current;
    setLoadState({ status: "loading" });

    try {
      await osmd.load(xml);

      // Bail if a newer load() started (or the hook unmounted) while we awaited.
      if (generationRef.current !== myGeneration || !osmdRef.current) return;

      osmd.render();
      setLoadState({ status: "ready" });
    } catch (err) {
      if (generationRef.current !== myGeneration) return;
      const message =
        err instanceof Error ? err.message : "Failed to parse MusicXML";
      setLoadState({ status: "error", error: message });
    }
  }, []);

  const rerender = useCallback(() => {
    const osmd = osmdRef.current;
    if (!osmd || !osmd.IsReadyToRender()) return;
    osmd.render();
  }, []);

  return { containerRef, osmdRef, loadState, loadXML, rerender };
}
```

Backing types for the hook above:

```ts
// src/lib/musicxml/types.ts

/** Subset of OSMD's rendering/layout options exposed to the app layer. */
export interface OSMDRenderOptions {
  autoResize: boolean;
  backend: "svg" | "canvas";
  drawTitle: boolean;
  drawSubtitle: boolean;
  drawComposer: boolean;
  drawPartNames: boolean;
  drawMeasureNumbers: boolean;
  drawingParameters:
    | "default"
    | "compacttight"
    | "compact"
    | "preview"
    | "leadsheet";
  pageFormat: string; // e.g. 'A4_P', 'A4_L', 'Endless', 'Letter_P'
  pageBackgroundColor: string;
}

export const DEFAULT_OSMD_OPTIONS: OSMDRenderOptions = {
  autoResize: false, // resize is driven manually via ResizeObserver, above
  backend: "svg",
  drawTitle: true,
  drawSubtitle: false,
  drawComposer: true,
  drawPartNames: true,
  drawMeasureNumbers: true,
  drawingParameters: "default",
  pageFormat: "Endless",
  pageBackgroundColor: "#FFFFFF",
};

export interface CursorPosition {
  measureIndex: number;
  timestamp: number; // fractional beat position within the sheet, from OSMD's iterator
  isEndOfSheet: boolean;
  noteNames: string[]; // human-readable names of notes under the cursor right now
}

export interface LoadState {
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
}
```

### An imperative `MusicXMLViewer` wrapper

Where `ScoreCanvas` (§3) is driven purely by props (`musicXml` in, render out), toolbar-heavy apps often need sibling components to reach the live OSMD instance imperatively — e.g. a transpose button that mutates the model directly rather than round-tripping through a parent's state and a re-render.

```tsx
// src/components/MusicXMLViewer.tsx
import { forwardRef, useImperativeHandle } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { AlertCircle } from "lucide-react";
import { useOSMDHardened } from "@/hooks/useOSMDHardened";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadState, OSMDRenderOptions } from "@/lib/musicxml/types";

export interface MusicXMLViewerHandle {
  osmd: OpenSheetMusicDisplay | null;
  loadXML: (xml: string) => Promise<void>;
  rerender: () => void;
}

interface MusicXMLViewerProps {
  renderOptions?: Partial<OSMDRenderOptions>;
  onLoadStateChange?: (state: LoadState) => void;
  className?: string;
}

/**
 * Thin, presentational wrapper around useOSMDHardened (§10.1). Exposes an
 * imperative handle so sibling toolbar components (transpose/zoom/cursor/
 * export, below) can reach the live OSMD instance without prop-drilling
 * every mutation through this component's own re-render cycle — those
 * tools intentionally do NOT need to cause MusicXMLViewer to re-render;
 * they mutate the OSMD model directly and call rerender() themselves.
 */
export const MusicXMLViewer = forwardRef<
  MusicXMLViewerHandle,
  MusicXMLViewerProps
>(({ renderOptions, onLoadStateChange, className }, ref) => {
  const { containerRef, osmdRef, loadState, loadXML, rerender } =
    useOSMDHardened(renderOptions);

  useImperativeHandle(
    ref,
    () => ({ osmd: osmdRef.current, loadXML, rerender }),
    [loadXML, rerender, osmdRef],
  );

  // Surface load state to parent for toolbar enable/disable + error
  // banners, without forcing this component to accept loadState as a
  // controlled prop. Firing on every render is intentional and cheap
  // here — loadState is a small object and the parent is expected to
  // memoize its handler (e.g. a `useState` setter, as in §10.8).
  if (onLoadStateChange) {
    onLoadStateChange(loadState);
  }

  return (
    <div className={`relative h-full w-full ${className ?? ""}`}>
      {loadState.status === "loading" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 font-sans text-sm">
          Rendering score…
        </div>
      )}
      {loadState.status === "error" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to load MusicXML</AlertTitle>
            <AlertDescription>{loadState.error}</AlertDescription>
          </Alert>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full overflow-auto"
        data-testid="osmd-container"
      />
    </div>
  );
});

MusicXMLViewer.displayName = "MusicXMLViewer";
```

### Real-time transposition: preview vs. export

OSMD's built-in `Sheet.Transpose` is a _view-time_ transformation — it never touches the underlying XML, which is exactly right for a live preview but wrong for **export**: if the user transposes up a major third and hits "Download," the exported file must say so in `<pitch>` and `<key>` elements, playable correctly in any MusicXML consumer that never runs your OSMD instance. That means export needs its own, independent transposition pass over the raw XML DOM — the same "mutate the actual MusicXML" strategy as §6B, just for pitches instead of durations.

**a) View-time (fast, OSMD-model-only):**

```ts
// src/hooks/useTranspose.ts
import { useCallback, useState } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";

/**
 * Drives OSMD's built-in semitone transposition. This operates on the
 * already-parsed `Sheet` model (not the raw XML), so it's fast enough to
 * bind directly to a slider or +/- buttons — no debounce needed, unlike
 * the text-editor path in §4.
 *
 * Range is clamped to +/-24 semitones (two octaves) — beyond that, standard
 * notation stops being idiomatic and a clef/ottava change fits better,
 * which is outside the scope of transposition.
 */
export function useTranspose(
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>,
) {
  const [semitones, setSemitonesState] = useState(0);

  const applyTranspose = useCallback(
    (nextSemitones: number) => {
      const osmd = osmdRef.current;
      if (!osmd || !osmd.Sheet) return;

      const clamped = Math.max(-24, Math.min(24, nextSemitones));

      // Sheet.Transpose is interpreted relative to the ORIGINAL key on
      // every render, not incrementally — set it directly rather than
      // accumulating deltas, which avoids drift after repeated clicks.
      osmd.Sheet.Transpose = clamped;

      // updateGraphic() rebuilds the graphical (VexFlow) model from the
      // now-transposed Sheet model; render() paints it. Both are required —
      // render() alone repaints stale graphics.
      osmd.updateGraphic();
      osmd.render();

      setSemitonesState(clamped);
    },
    [osmdRef],
  );

  const transposeUp = useCallback(
    () => applyTranspose(semitones + 1),
    [applyTranspose, semitones],
  );
  const transposeDown = useCallback(
    () => applyTranspose(semitones - 1),
    [applyTranspose, semitones],
  );
  const reset = useCallback(() => applyTranspose(0), [applyTranspose]);

  return { semitones, applyTranspose, transposeUp, transposeDown, reset };
}
```

```tsx
// src/components/TransposeControls.tsx
import { Minus, Plus, RotateCcw } from "lucide-react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { Button } from "@/components/ui/button";
import { useTranspose } from "@/hooks/useTranspose";

const INTERVAL_NAMES: Record<number, string> = {
  0: "Unison",
  1: "Minor 2nd",
  2: "Major 2nd",
  3: "Minor 3rd",
  4: "Major 3rd",
  5: "Perfect 4th",
  6: "Tritone",
  7: "Perfect 5th",
  8: "Minor 6th",
  9: "Major 6th",
  10: "Minor 7th",
  11: "Major 7th",
  12: "Octave",
};

// Purely cosmetic label logic — turns "+7 st" into "Perfect 5th up" for
// the toolbar readout; doesn't affect the actual transposition math above.
function describeInterval(semitones: number): string {
  const abs = Math.abs(semitones);
  const octaves = Math.floor(abs / 12);
  const remainder = abs % 12;
  const base = INTERVAL_NAMES[remainder] ?? `${remainder} semitones`;
  const direction = semitones === 0 ? "" : semitones > 0 ? "up" : "down";
  const octaveLabel =
    octaves > 0 ? `${octaves} octave${octaves > 1 ? "s" : ""} + ` : "";
  return semitones === 0
    ? "Original key"
    : `${octaveLabel}${base} ${direction}`;
}

export function TransposeControls({
  osmdRef,
}: {
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>;
}) {
  const { semitones, transposeUp, transposeDown, reset } =
    useTranspose(osmdRef);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={transposeDown}
        aria-label="Transpose down a semitone"
      >
        <Minus size={16} />
      </Button>
      <div className="min-w-40 text-center text-[13px]">
        <div className="font-semibold">
          {semitones >= 0 ? `+${semitones}` : semitones} st
        </div>
        <div className="opacity-70">{describeInterval(semitones)}</div>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={transposeUp}
        aria-label="Transpose up a semitone"
      >
        <Plus size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={reset}
        aria-label="Reset transposition"
        disabled={semitones === 0}
      >
        <RotateCcw size={16} />
      </Button>
    </div>
  );
}
```

**b) Export-time (correct, raw-XML rewrite):**

```ts
// src/lib/musicxml/transpose.ts

/**
 * Chromatic pitch-class table, indexed 0 (C) .. 11 (B), using each class's
 * "natural" letter name. Alteration (sharp/flat/double) is stored separately
 * in MusicXML as <alter>, so this table alone is enough to compute the
 * *sounding* pitch; correct spelling is handled by SPELLING_SHARPS/_FLATS.
 */
const STEP_TO_SEMITONE: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const SPELLING_SHARPS: { step: string; alter: number }[] = [
  { step: "C", alter: 0 },
  { step: "C", alter: 1 },
  { step: "D", alter: 0 },
  { step: "D", alter: 1 },
  { step: "E", alter: 0 },
  { step: "F", alter: 0 },
  { step: "F", alter: 1 },
  { step: "G", alter: 0 },
  { step: "G", alter: 1 },
  { step: "A", alter: 0 },
  { step: "A", alter: 1 },
  { step: "B", alter: 0 },
];

const SPELLING_FLATS: { step: string; alter: number }[] = [
  { step: "C", alter: 0 },
  { step: "D", alter: -1 },
  { step: "D", alter: 0 },
  { step: "E", alter: -1 },
  { step: "E", alter: 0 },
  { step: "F", alter: 0 },
  { step: "G", alter: -1 },
  { step: "G", alter: 0 },
  { step: "A", alter: -1 },
  { step: "A", alter: 0 },
  { step: "B", alter: -1 },
  { step: "B", alter: 0 },
];

/**
 * Maps an ascending chromatic interval (0-11 semitones) to its circle-of-
 * fifths displacement, so a transposed <key><fifths> value stays musically
 * correct (e.g. transposing up a Perfect 5th moves the key 1 fifth sharp-
 * ward, not an arbitrary semitone-scaled guess). Index = semitones up (0-11).
 */
const SEMITONES_TO_FIFTHS_DELTA: number[] = [
  0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5,
];

export interface TransposeXMLOptions {
  /** Positive = up, negative = down. Any integer number of semitones. */
  semitones: number;
  /** Prefer flat spellings (Eb) over sharp (D#) for the transposed pitches. */
  preferFlats?: boolean;
}

/**
 * Transposes every <pitch> element and updates every <key><fifths> element
 * in a MusicXML document string, returning a new document string. This is
 * intentionally independent of OSMD — pure XML DOM manipulation, so the
 * result is a standalone, spec-correct MusicXML file usable outside this
 * app (same independence-from-the-renderer principle as §6B's edit strategy).
 */
export function transposeMusicXML(
  xml: string,
  options: TransposeXMLOptions,
): string {
  const { semitones, preferFlats = false } = options;
  if (semitones === 0) return xml;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");

  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Invalid MusicXML: ${parserError.textContent}`);
  }

  const spellingTable = preferFlats ? SPELLING_FLATS : SPELLING_SHARPS;
  const normalizedSemitones = ((semitones % 12) + 12) % 12;

  // --- 1. Transpose every sounding pitch ---
  const pitchNodes = Array.from(doc.getElementsByTagName("pitch"));
  for (const pitchNode of pitchNodes) {
    const stepEl = pitchNode.getElementsByTagName("step")[0];
    const alterEl = pitchNode.getElementsByTagName("alter")[0];
    const octaveEl = pitchNode.getElementsByTagName("octave")[0];
    if (!stepEl || !octaveEl) continue;

    const step = stepEl.textContent?.trim() ?? "C";
    const alter = alterEl ? parseInt(alterEl.textContent ?? "0", 10) : 0;
    const octave = parseInt(octaveEl.textContent ?? "4", 10);

    const originalSemitone = STEP_TO_SEMITONE[step] + alter;
    const totalSemitone = octave * 12 + originalSemitone + semitones;

    const newOctave = Math.floor(totalSemitone / 12);
    let pitchClass = totalSemitone % 12;
    if (pitchClass < 0) pitchClass += 12;

    const spelling = spellingTable[pitchClass];

    stepEl.textContent = spelling.step;
    octaveEl.textContent = String(newOctave);

    if (spelling.alter !== 0) {
      if (alterEl) {
        alterEl.textContent = String(spelling.alter);
      } else {
        const newAlter = doc.createElement("alter");
        newAlter.textContent = String(spelling.alter);
        stepEl.after(newAlter); // <alter> must follow <step> per the MusicXML schema
      }
    } else if (alterEl) {
      alterEl.parentNode?.removeChild(alterEl);
    }
  }

  // --- 2. Update key signatures (circle-of-fifths shift, wrapped to -7..7) ---
  const fifthsDelta =
    SEMITONES_TO_FIFTHS_DELTA[normalizedSemitones] * (semitones < 0 ? -1 : 1);
  const fifthsNodes = Array.from(doc.getElementsByTagName("fifths"));
  for (const fifthsNode of fifthsNodes) {
    const current = parseInt(fifthsNode.textContent ?? "0", 10);
    let next = current + fifthsDelta;
    while (next > 7) next -= 12; // wrap into the standard -7 (Cb) .. +7 (C#) key-signature range
    while (next < -7) next += 12;
    fifthsNode.textContent = String(next);
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

/**
 * Reads the number of sharps/flats currently declared on the first <key>
 * element found — useful for defaulting a preferFlats UI toggle to match
 * the piece's existing key rather than always guessing sharps.
 */
export function getPrimaryKeyFifths(xml: string): number {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const fifths = doc.getElementsByTagName("fifths")[0];
  return fifths ? parseInt(fifths.textContent ?? "0", 10) : 0;
}
```

**Key design point:** keep "what OSMD is currently _displaying_" (§10.3a, which may include live-preview-only transforms) and "what will be _exported_" (§10.3b, always applied to the raw XML) as two deliberately separate concerns — conflating them is the most common source of "the exported file doesn't match what I saw on screen" bugs. §10.8's `App.tsx` shows the "commit" step that reconciles the two on demand rather than on every slider tick.

### Zoom & page-format controls

```tsx
// src/components/ZoomControls.tsx
import { useCallback, useState } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { OpenSheetMusicDisplay, PageFormat } from "opensheetmusicdisplay";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;

const PAGE_FORMATS: { label: string; value: string }[] = [
  { label: "Continuous (no page breaks)", value: "Endless" },
  { label: "A4 Portrait", value: "A4_P" },
  { label: "A4 Landscape", value: "A4_L" },
  { label: "US Letter Portrait", value: "Letter_P" },
];

export function ZoomControls({
  osmdRef,
  rerender,
}: {
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>;
  rerender: () => void;
}) {
  const [zoom, setZoom] = useState(1.0);
  const [pageFormat, setPageFormat] = useState("Endless");

  const applyZoom = useCallback(
    (next: number) => {
      const osmd = osmdRef.current;
      if (!osmd) return;
      const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));

      // Zoom is a scaling factor OSMD applies during layout, not a CSS
      // transform — this reflows the score (line breaks recompute), unlike
      // the Slider in §5's toolbar excerpt, which is functionally the same
      // idea but without the explicit min/max clamping or page-format pairing.
      osmd.Zoom = clamped;
      osmd.render();
      setZoom(clamped);
    },
    [osmdRef],
  );

  const applyPageFormat = useCallback(
    (value: string) => {
      const osmd = osmdRef.current;
      if (!osmd) return;
      osmd.setOptions({ pageFormat: value as PageFormat | string });
      osmd.render();
      setPageFormat(value);
    },
    [osmdRef],
  );

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyZoom(zoom - ZOOM_STEP)}
          aria-label="Zoom out"
        >
          <ZoomOut size={16} />
        </Button>
        <span className="min-w-11 text-center text-[13px]">
          {Math.round(zoom * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => applyZoom(zoom + ZOOM_STEP)}
          aria-label="Zoom in"
        >
          <ZoomIn size={16} />
        </Button>
      </div>

      {/* shadcn's Select is built on the Base UI/Radix Select primitive
          (§2's setup note) — correct keyboard nav (arrows, type-ahead) and
          a portalled listbox come for free, versus a native <select>'s
          inconsistent-across-platforms popup styling. */}
      <Select value={pageFormat} onValueChange={applyPageFormat}>
        <SelectTrigger className="w-55 text-[13px]" aria-label="Page format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_FORMATS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={rerender}
        title="Force a layout recalculation"
      >
        Refresh layout
      </Button>
    </div>
  );
}
```

### Step-based cursor & playback tracking UI

§5.1 drives the cursor by **wall-clock time** for actual audio playback. For a scrubbable step-editor UI (no audio, just "what's under the cursor right now"), a simpler step-at-a-time model is often enough:

```ts
// src/hooks/useCursor.ts
import { useCallback, useEffect, useState } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { CursorPosition } from "@/lib/musicxml/types";

export function useCursor(
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>,
) {
  const [position, setPosition] = useState<CursorPosition | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const readPosition = useCallback((): CursorPosition | null => {
    const osmd = osmdRef.current;
    const cursor = osmd?.cursor;
    if (!osmd || !cursor || !cursor.iterator) return null;

    const iterator = cursor.iterator;

    // CurrentVoiceEntries holds every note/rest sounding at the cursor's
    // current timestamp, across all staves/voices — e.g. both notes of a
    // chord, plus a bass-clef note happening simultaneously.
    const noteNames: string[] = [];
    for (const voiceEntry of iterator.CurrentVoiceEntries ?? []) {
      for (const note of voiceEntry.Notes) {
        if (note.isRest()) continue;
        const name =
          note.Pitch?.ToString?.() ??
          note.Pitch?.FundamentalNote?.toString() ??
          "?";
        noteNames.push(name);
      }
    }

    return {
      measureIndex: iterator.CurrentMeasureIndex ?? 0,
      timestamp: iterator.currentTimeStamp?.RealValue ?? 0,
      isEndOfSheet: iterator.EndReached ?? false,
      noteNames,
    };
  }, [osmdRef]);

  const show = useCallback(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    cursor.show();
    setIsVisible(true);
    setPosition(readPosition());
  }, [osmdRef, readPosition]);

  const hide = useCallback(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    cursor.hide();
    setIsVisible(false);
  }, [osmdRef]);

  const reset = useCallback(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    cursor.reset();
    setPosition(readPosition());
  }, [osmdRef, readPosition]);

  const stepForward = useCallback(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor || cursor.iterator.EndReached) return;
    cursor.next();
    setPosition(readPosition());
  }, [osmdRef, readPosition]);

  const stepBackward = useCallback(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    // OSMD's cursor has no built-in previous() — rebuild the iterator from
    // the start and fast-forward to (current - 1) steps. Fine for
    // step-editing UIs; for high-frequency playback scrubbing (§5.1), cache
    // visited timestamps instead of re-walking from zero each time.
    const targetIndex = Math.max(0, (position?.measureIndex ?? 0) - 1);
    cursor.reset();
    let guard = 0;
    while (
      !cursor.iterator.EndReached &&
      cursor.iterator.CurrentMeasureIndex < targetIndex &&
      guard++ < 10000
    ) {
      cursor.next();
    }
    setPosition(readPosition());
  }, [osmdRef, position, readPosition]);

  // Re-sync displayed position whenever a new sheet is loaded and the
  // cursor is re-created by OSMD internally.
  useEffect(() => {
    setPosition(readPosition());
  }, [readPosition]);

  return { position, isVisible, show, hide, reset, stepForward, stepBackward };
}
```

```tsx
// src/components/CursorControls.tsx
import { ChevronLeft, ChevronRight, Eye, EyeOff, SkipBack } from "lucide-react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { Button } from "@/components/ui/button";
import { useCursor } from "@/hooks/useCursor";

export function CursorControls({
  osmdRef,
}: {
  osmdRef: React.RefObject<OpenSheetMusicDisplay | null>;
}) {
  const { position, isVisible, show, hide, reset, stepForward, stepBackward } =
    useCursor(osmdRef);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={isVisible ? hide : show}
        aria-label="Toggle cursor"
      >
        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={reset}
        aria-label="Reset cursor to start"
      >
        <SkipBack size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={stepBackward}
        disabled={!isVisible}
        aria-label="Step back"
      >
        <ChevronLeft size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={stepForward}
        disabled={!isVisible}
        aria-label="Step forward"
      >
        <ChevronRight size={16} />
      </Button>
      <div className="min-w-50 text-[13px]">
        {isVisible && position ? (
          position.isEndOfSheet ? (
            <span>End of score</span>
          ) : (
            <span>
              Measure {position.measureIndex + 1} · beat{" "}
              {position.timestamp.toFixed(2)} ·{" "}
              {position.noteNames.length > 0
                ? position.noteNames.join(", ")
                : "rest"}
            </span>
          )
        ) : (
          <span className="opacity-50">Cursor hidden</span>
        )}
      </div>
    </div>
  );
}
```

### Exporting to `.musicxml` and `.mxl`

Neither §7 (autosave to IndexedDB) nor Appendix §D (MIDI export) covers letting a user download the score itself as a standard, spec-compliant MusicXML file — either uncompressed (`.musicxml`) or as the zipped `.mxl` container most desktop notation software also accepts.

```typescript
// src/lib/musicxml/export.ts
import JSZip from "jszip";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Deferred revoke: some browsers cancel the download if the object URL
  // is revoked synchronously before the click has been fully processed.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const XML_DECLARATION =
  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n';
const DOCTYPE =
  '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" ' +
  '"http://www.musicxml.org/dtds/partwise.dtd">\n';

/** Ensures the serialized document has a proper XML prolog + DOCTYPE, which
 * XMLSerializer does not emit on its own — several notation programs are
 * strict about this on import. */
function ensureWellFormedDeclaration(xml: string): string {
  const withoutExistingProlog = xml.replace(/^<\?xml[^>]*\?>\s*/i, "");
  const withoutExistingDoctype = withoutExistingProlog.replace(
    /^<!DOCTYPE[^>]*>\s*/i,
    "",
  );
  return XML_DECLARATION + DOCTYPE + withoutExistingDoctype;
}

export function exportRawMusicXML(
  xml: string,
  filename = "score.musicxml",
): void {
  const finalXML = ensureWellFormedDeclaration(xml);
  const blob = new Blob([finalXML], {
    type: "application/vnd.recordare.musicxml+xml",
  });
  triggerDownload(blob, filename);
}

/**
 * Builds a spec-compliant compressed MXL container:
 *   /mimetype                       (stored, uncompressed, first entry)
 *   /META-INF/container.xml         (points a reader at the root score file)
 *   /<scoreFileName>                (the actual MusicXML content)
 */
export async function exportCompressedMXL(
  xml: string,
  scoreFileName = "score.musicxml",
  outputFilename = "score.mxl",
): Promise<void> {
  const finalXML = ensureWellFormedDeclaration(xml);
  const zip = new JSZip();

  // The mimetype file must be the first entry and stored without compression
  // per the Open Packaging Conventions container spec MXL is based on.
  zip.file("mimetype", "application/vnd.recordare.musicxml", {
    compression: "STORE",
  });

  const containerXML =
    XML_DECLARATION +
    "<container>\n" +
    "  <rootfiles>\n" +
    `    <rootfile full-path="${scoreFileName}" media-type="application/vnd.recordare.musicxml+xml"/>\n` +
    "  </rootfiles>\n" +
    "</container>\n";

  zip.file("META-INF/container.xml", containerXML);
  zip.file(scoreFileName, finalXML);

  const blob = await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.recordare.musicxml",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  triggerDownload(blob, outputFilename);
}
```

```tsx
// src/components/ExportControls.tsx
import { useState } from "react";
import { Download, FileArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportCompressedMXL, exportRawMusicXML } from "@/lib/musicxml/export";

export function ExportControls({
  getCurrentXML,
}: {
  getCurrentXML: () => string | null;
}) {
  const [isExportingMXL, setIsExportingMXL] = useState(false);

  const handleExportRaw = () => {
    const xml = getCurrentXML();
    if (!xml) return;
    exportRawMusicXML(xml, "score.musicxml");
  };

  const handleExportMXL = async () => {
    const xml = getCurrentXML();
    if (!xml) return;
    setIsExportingMXL(true);
    try {
      await exportCompressedMXL(xml, "score.xml", "score.mxl");
    } finally {
      setIsExportingMXL(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportRaw}>
        <Download size={16} className="mr-1" />
        Export .musicxml
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportMXL}
        disabled={isExportingMXL}
      >
        <FileArchive size={16} className="mr-1" />
        {isExportingMXL ? "Zipping…" : "Export .mxl"}
      </Button>
    </div>
  );
}
```

**Key design point:** the export controls don't ask OSMD for anything — they ask the app's own source-of-truth XML string (kept in `App.tsx` state, §10.8), updated by `transposeMusicXML` (§10.3b) whenever the user applies a transposition they intend to keep. This is the same "OSMD as a pure reader of the store" discipline as §1.2's one-way-in-from-multiple-sources principle, applied to export instead of render.

### File import: drag-and-drop `.musicxml` / `.mxl`

The counterpart to §10.6's export — reading a `.musicxml`, `.xml`, or `.mxl` file a user drags in or picks via a file input, unzipping `.mxl` client-side with the same `jszip` dependency used for export above.

```tsx
// src/components/FileDropzone.tsx
import { ChangeEvent, DragEvent, useCallback, useRef, useState } from "react";
import { AlertCircle, UploadCloud } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileDropzoneProps {
  onFileLoaded: (xml: string, fileName: string) => void;
}

/** Reads a .musicxml/.xml file directly, or unzips a .mxl (dynamically
 * importing jszip so it's not in the main bundle for apps that never
 * import files), falling back to a helpful error on a malformed archive. */

async function readScoreFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".mxl")) {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);

    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile)
      throw new Error("Invalid .mxl: missing META-INF/container.xml");

    const containerXML = await containerFile.async("text");
    const rootPathMatch = containerXML.match(/full-path="([^"]+)"/);
    const rootPath = rootPathMatch?.[1];
    if (!rootPath)
      throw new Error("Invalid .mxl: could not resolve root score file");

    const scoreFile = zip.file(rootPath);
    if (!scoreFile)
      throw new Error(
        `Invalid .mxl: root file "${rootPath}" not found in archive`,
      );

    return scoreFile.async("text");
  }

  return file.text();
}

export function FileDropzone({ onFileLoaded }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const xml = await readScoreFile(file);
        onFileLoaded(xml, file.name);
        // Note: this doesn't run the imported XML through validateMusicXml
        // (§4.1) before handing it to the caller — a file exported by a
        // mature tool like MuseScore is usually well-formed, but wiring
        // that same structural check in here is cheap insurance against a
        // hand-edited or partially-corrupted upload.
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read file");
      }
    },
    [onFileLoaded],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed transition-colors ${
        isDragActive
          ? "border-blue-600 bg-blue-50"
          : "border-slate-300 bg-transparent"
      }`}
    >
      <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
        <UploadCloud size={28} />
        <p className="m-0 text-sm">
          Drop a <code>.musicxml</code>, <code>.xml</code>, or <code>.mxl</code>{" "}
          file here, or
        </p>
        {/* Button variant="link" programmatically clicking a hidden ref'd
            input keeps the same "click to browse" affordance as a
            <label>-wrapped native input, but with the Button component's
            own focus-visible/keyboard-activation treatment applied. */}
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => fileInputRef.current?.click()}
        >
          browse for a file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.musicxml,.mxl"
          onChange={onInputChange}
          className="hidden"
        />
        {error && (
          <Alert variant="destructive" className="mt-2 text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
```

### Alternate top-level composition: a file-based editor

This composes §10.1–§10.7 into a second, complete `App.tsx` — an alternative to §4's dual-pane live-text editor, for a product where users open an existing score and edit it through dedicated controls rather than typing MusicXML by hand. Swap this in wholesale, or lift just the pieces you need (e.g. `TransposeControls` alongside §4's `XmlEditor`/`ScoreCanvas` pair).

```tsx
// src/App.tsx (file-based alternative to §4's live-text-editor App.tsx)
import { useCallback, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  MusicXMLViewer,
  MusicXMLViewerHandle,
} from "@/components/MusicXMLViewer";
import { TransposeControls } from "@/components/TransposeControls";
import { ZoomControls } from "@/components/ZoomControls";
import { CursorControls } from "@/components/CursorControls";
import { ExportControls } from "@/components/ExportControls";
import { FileDropzone } from "@/components/FileDropzone";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { transposeMusicXML } from "@/lib/musicxml/transpose";
import { LoadState } from "@/lib/musicxml/types";

export default function App() {
  const viewerRef = useRef<MusicXMLViewerHandle>(null);

  // The app's source-of-truth document. This is what gets exported, and it
  // is what transposeMusicXML permanently rewrites — distinct from OSMD's
  // live-preview-only Sheet.Transpose (§10.3a), which is used for on-screen
  // feedback only.
  const [sourceXML, setSourceXML] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("untitled.musicxml");
  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [pendingSemitones, setPendingSemitones] = useState(0);

  const handleFileLoaded = useCallback(async (xml: string, name: string) => {
    setSourceXML(xml);
    setFileName(name.replace(/\.(xml|musicxml|mxl)$/i, ""));
    setPendingSemitones(0);
    await viewerRef.current?.loadXML(xml);
  }, []);

  // "Bake" the currently-previewed OSMD transposition into the exportable
  // source XML. This is what the toolbar's "Commit transpose" action calls —
  // it keeps live preview cheap (OSMD-side, §10.3a) while making export
  // correctness (§10.3b) an explicit, deliberate step rather than something
  // recomputed on every slider tick.
  const commitTranspose = useCallback(async () => {
    if (!sourceXML || pendingSemitones === 0) return;
    const rewritten = transposeMusicXML(sourceXML, {
      semitones: pendingSemitones,
    });
    setSourceXML(rewritten);
    setPendingSemitones(0);
    // Reload the committed, semitone-zeroed XML so OSMD's Sheet.Transpose
    // (view-only) and the document's actual pitches agree again.
    await viewerRef.current?.loadXML(rewritten);
  }, [sourceXML, pendingSemitones]);

  const getCurrentXML = useCallback(() => sourceXML, [sourceXML]);

  return (
    <div className="flex h-screen flex-col font-sans">
      <header className="border-b border-slate-200 px-4 py-3">
        <h1 className="m-0 text-lg">MusicXML Editor - {fileName}</h1>
      </header>

      {!sourceXML && (
        <div className="mx-auto mt-10 w-full max-w-120 p-6">
          <FileDropzone onFileLoaded={handleFileLoaded} />
        </div>
      )}

      {sourceXML && (
        <>
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
            <TransposeControls
              osmdRef={{ current: viewerRef.current?.osmd ?? null }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={commitTranspose}
              disabled={pendingSemitones === 0}
            >
              Commit transpose to export
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <ZoomControls
              osmdRef={{ current: viewerRef.current?.osmd ?? null }}
              rerender={() => viewerRef.current?.rerender()}
            />
            <Separator orientation="vertical" className="h-6" />
            <CursorControls
              osmdRef={{ current: viewerRef.current?.osmd ?? null }}
            />
            <div className="ml-auto">
              <ExportControls getCurrentXML={getCurrentXML} />
            </div>
          </div>

          <div className="flex-1 overflow-hidden p-4">
            <MusicXMLViewer
              ref={viewerRef}
              onLoadStateChange={setLoadState}
              renderOptions={{ drawTitle: true, drawComposer: true }}
            />
          </div>

          {loadState.status === "error" && (
            <Alert variant="destructive" className="mx-4 mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{loadState.error}</AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
```

> **Why `osmdRef={{ current: viewerRef.current?.osmd ?? null }}`?** `MusicXMLViewer` owns the actual OSMD instance behind its imperative handle; the toolbar components expect a ref object as their prop, for symmetry with `useOSMDHardened`'s own return shape. Wrapping the current value in a fresh object each render is intentional and cheap — these toolbar components read `.current` at call-time inside event handlers, not during render, so this never causes a stale-closure bug, only an extra tiny object allocation per parent render.

### Production considerations for this workflow

- **Large scores:** OSMD's `render()` cost scales with visible measures. Beyond a few hundred measures, `drawingParameters: 'compacttight'` helps for editing views; lazy-loading systems only as they scroll into view isn't natively supported by OSMD — virtualize at the page level (render N pages, swap the container's loaded XML subset) rather than fighting OSMD's internal layout. Same underlying constraint as §8's paging-by-movement recommendation.
- **Undo/redo:** because §10.6's export path treats `sourceXML` as the single source of truth, a straightforward undo stack is just an array of previous `sourceXML` strings — no custom diffing required, reload via `loadXML` on undo/redo. This is the same shape as §7's Zustand `history`/`future` stack; the two can share one store if you're combining this workflow with §4's live text editor.
- **Concurrent edits (collaborative editing):** if you extend this toward multi-user editing, don't diff serialized XML strings for conflict resolution — operate on a structured intermediate representation (measure/voice/note IDs) and serialize to MusicXML only at save/export time, or you'll fight XML whitespace/attribute-order noise constantly.
- **Validation:** before export, consider round-tripping the committed XML back through `osmd.load()` in a detached, invisible OSMD instance as a cheap correctness check — if OSMD can't parse what you just generated, neither can most other consumers. `validateMusicXml` (§4.1) covers the cheaper structural half of this.
- **Testing the transpose math:** `transposeMusicXML` (§10.3b) is pure and DOM-only (no OSMD dependency), so it's straightforward to unit test with `jsdom` against fixture MusicXML files exported from MuseScore — worth doing for enharmonic edge cases (e.g. transposing a piece already in a heavily-flatted key like Gb major up a semitone, which should land on G major, not F#/Gb ambiguity).
- **shadcn components vs. hand-rolled classes:** with every button, select, separator, and alert coming from `@/components/ui/*`, hover/focus/disabled treatment lives in one place per component type instead of drifting across `TransposeControls`, `ZoomControls`, `CursorControls`, and `ExportControls`. For a one-off variant (e.g. a louder "danger" export button), extend the generated `button.tsx`'s `cva` variants rather than reaching for inline classes again.
- **Customizing generated components:** because the CLI copies component source into your project rather than installing a package, `src/components/ui/button.tsx` (etc.) is yours to edit directly. Re-running `npx shadcn@latest add button --overwrite` discards local edits, so treat these files as application code you own, not a vendored dependency.

## Appendix: Integrating RiffScore and Tonal.js

Everything in §2–§8 builds a _renderer-driven_ editor: OSMD draws, you mutate MusicXML, OSMD redraws. Two packages are worth layering in once you outgrow that loop — and per the decision tree in §1.1, they're the **recommended default**, not an optional add-on, once your app needs real authoring: **RiffScore**, an actual embeddable editing UI (not just a renderer), and **Tonal.js**, a pure music-theory engine for validating and generating what gets written into your score.

### A. RiffScore — an embeddable editor, not just a renderer

[RiffScore](https://github.com/joekotvas/RiffScore) is a self-hostable React sheet-music **editor** component (SMuFL/Bravura engraving, its own toolbar, keyboard shortcuts, undo/redo, and a chainable imperative API). This changes the architecture question: instead of hand-building note-entry UI around OSMD (§5–§6 above), you can let RiffScore _own_ note entry, and use OSMD for anything RiffScore doesn't do (e.g. rendering documents imported from other tools, print-quality output of files you didn't create in-app, or side-by-side "reference score" views).

**Where it fits relative to OSMD:**

|            | OSMD (this guide, §1–§8)                    | RiffScore                                          |
| ---------- | ------------------------------------------- | -------------------------------------------------- |
| Role       | MusicXML → SVG **renderer**                 | Full **editor** with its own data model            |
| Note entry | You build it (click handlers, XML mutation) | Built in (keyboard shortcuts, imperative API)      |
| Playback   | Not included (bring your own, e.g. Tone.js) | Built in (Tone.js sampler)                         |
| Export     | N/A (you control the source XML)            | JSON, MusicXML, ABC                                |
| Import     | MusicXML (its core purpose)                 | MusicXML import is on the roadmap, not yet shipped |

Given RiffScore's MusicXML _import_ is still "Coming Soon" at the time of writing, a practical hybrid is: **RiffScore for authoring new scores**, **OSMD for displaying/importing existing MusicXML** the user brings in — both writing to/reading from the same MusicXML string in your document store (§7), so your undo history and toolbar work uniformly across both surfaces.

**Install:**

```bash
npm install riffscore
```

**Basic embed** (styles/fonts are bundled, no separate CSS import needed):

```tsx
// src/components/RiffScoreEditor.tsx
import { RiffScore } from "riffscore";

export function RiffScoreEditor() {
  return (
    <RiffScore
      id="live-editor"
      config={{
        // 'treble' single staff, not 'grand' — a solo violin never needs
        // a bass-clef staff. See §9.1 for why this matches the OSMD/MIDI setup.
        score: { staff: "treble", measureCount: 8, keySignature: "G" },
        ui: { showToolbar: true },
      }}
    />
  );
}
```

**Wiring it into the shadcn/Tailwind shell and syncing to your MusicXML store** — RiffScore exposes a `window.riffScore.get(id)` imperative API with fluent chaining and an event bus (`api.on('score', cb)` / `api.on('batch', cb)`), which is the hook point for keeping your Zustand `scoreStore` (§7) in sync:

```tsx
// src/hooks/useRiffScoreSync.ts
import { useEffect } from "react";
import { useScoreStore } from "@/store/scoreStore";

declare global {
  interface Window {
    riffScore: { get: (id: string) => RiffScoreApi };
  }
}

interface RiffScoreApi {
  // Methods return `RiffScoreApi` (this) to support chaining, e.g.
  // `api.select(0).addNote("C4").addNote("E4")` — a fluent-builder pattern.
  select: (measureIndex: number) => RiffScoreApi;
  addNote: (pitch: string, duration?: string) => RiffScoreApi;
  exportMusicXML: () => string; // serializes RiffScore's internal model back to a MusicXML string, for the shared store (§7)
  on: (event: "score" | "batch", cb: (e: unknown) => void) => void; // "batch" fires once per undo-step-worth of edits, not per note
}

export function useRiffScoreSync(editorId: string) {
  const setXml = useScoreStore((s) => s.setXml);

  useEffect(() => {
    const api = window.riffScore?.get(editorId);
    // RiffScore mounts and registers itself on `window.riffScore`
    // asynchronously — if this effect races ahead of that, `api` is
    // undefined and we bail rather than throwing. Re-mounting this
    // component (or re-running the effect on a retry timer) after
    // RiffScore's own mount is one way to close that race in practice.
    if (!api) return;

    // Every committed batch (a chord entry, a paste, a transaction) is a
    // single undo step in RiffScore — mirror it into your own store so
    // toolbar-level undo/redo (Cmd+Z outside the editor) stays consistent.
    api.on("batch", () => {
      setXml(api.exportMusicXML());
    });
  }, [editorId, setXml]);
}
```

```tsx
// Usage alongside a read-only OSMD "reference" pane
<div className="grid grid-cols-2 gap-2">
  <RiffScoreEditor />
  <ScoreCanvas musicXml={referenceXml} /> {/* e.g. an imported original */}
</div>
```

Because RiffScore ships a **transaction API** (`beginTransaction` / `commitTransaction`), scripted or programmatic edits (e.g. "transpose everything up a fourth," driven by Tonal.js — see below) collapse into a single undo step rather than one step per note:

```ts
const api = window.riffScore.get("live-editor");
api.beginTransaction();
// Each addNote() call would normally fire its own "batch" event (§ above,
// useRiffScoreSync) — wrapping them in a transaction suppresses that until
// commitTransaction(), so the whole arpeggio becomes one undo step.
["C4", "E4", "G4", "C5"].forEach((pitch) => api.addNote(pitch, "quarter"));
api.commitTransaction("Insert arpeggio"); // the string is the undo-history label shown in RiffScore's own UI
```

RiffScore already bundles **Tonal.js** internally for its own scale/chord/transposition logic and **Tone.js** for playback — which is exactly why it pairs naturally with the next tool if you need theory logic _outside_ RiffScore's own UI (e.g. in a chord-suggestion sidebar built with shadcn `Command`/`Popover`).

### B. Tonal.js — music theory as pure functions

[Tonal.js](https://github.com/tonaljs/tonal) is a TypeScript, functional music-theory library (no audio, no rendering — pure data transforms over notes, intervals, chords, scales, and keys). Use it to validate or generate the content you feed into OSMD/RiffScore, rather than hand-rolling pitch/interval math.

**Install:**

```bash
npm install tonal
```

**Core API surface you'll actually use in an editor:**

```ts
import { Note, Interval, Scale, Chord, Key } from "tonal";

Note.midi("C4"); // 60 — for MIDI-in/out or Web Audio playback
Note.transpose("C4", "5P"); // "G4" — transpose a note by an interval
Interval.distance("C4", "G4"); // "5P" — get the interval between two notes
Scale.get("C major").notes; // ["C","D","E","F","G","A","B"]
Chord.get("Cmaj7").notes; // ["C","E","G","B"]
Key.majorKey("G").scale; // ["G","A","B","C","D","E","F#"]
```

**Practical integration points in this stack:**

1. **Chord-symbol autocomplete / validation.** Feed user input (e.g. `"Cmaj7"`) through `Chord.get()`; if `chord.empty` is `true`, the input is invalid — surface that in a shadcn `Input` with `aria-invalid` rather than trusting free text before it goes into MusicXML `<harmony>` elements.

   ```ts
   function isValidChordSymbol(symbol: string): boolean {
     return !Chord.get(symbol).empty;
   }
   ```

2. **Programmatic transposition** — a common "editor" feature. Instead of manually rewriting `<pitch>` elements, transpose the abstract note names with Tonal, then re-serialize to MusicXML (or push through RiffScore's `addNote`):

   ```ts
   function transposeNotes(
     notes: string[],
     semitoneInterval: string,
   ): string[] {
     return notes.map((n) => Note.transpose(n, semitoneInterval));
   }
   transposeNotes(["C4", "E4", "G4"], "2M"); // ["D4", "F#4", "A4"]
   ```

3. **Key-aware note entry / scale-locked input.** For a "snap to scale" toggle (nice as a shadcn `Toggle`), constrain incoming MIDI or click input to `Scale.get(currentKey).notes` before writing the note.

4. **Enharmonic/display cleanup.** MusicXML and OSMD care about correct enharmonic spelling (`C#` vs `Db`) for accidentals to render correctly; `Note.enharmonic()` and `Key.majorKey(tonic).scale` help you choose the spelling that matches the current key signature rather than defaulting to sharps.

5. **Deriving a chord from clicked notes.** If your click-to-edit flow (§5) lets a user multi-select notes in a chord, `Chord.detect(["C4","E4","G4"])` (→ `["CM"]`) can auto-populate a chord-symbol field.

Because Tonal is pure and dependency-free, it's cheap to use purely on the client for instant validation feedback (e.g. in the `XmlEditor`'s onChange path or a chord-symbol `Popover`) without round-tripping through OSMD's parser.

### C. Other packages worth considering

| Package                                                                     | Purpose                                  | When to reach for it                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Tone.js](https://tonejs.github.io/)                                        | Web Audio synthesis/sampling, scheduling | Playback of the score (RiffScore already bundles it; use directly if you build your own OSMD-driven player using the cursor iterator from §5)                                                           |
| [VexFlow](https://www.vexflow.com/)                                         | Low-level SVG music engraving            | Both OSMD and RiffScore render through it; go here directly only if you need engraving control below what either exposes                                                                                |
| [`webmidi`](https://webmidijs.org/)                                         | Web MIDI API wrapper                     | MIDI-keyboard note entry, feeding pitches into Tonal for validation and into RiffScore's `addNote`/OSMD's XML mutation                                                                                  |
| [`fast-xml-parser`](https://github.com/NaturalIntelligence/fast-xml-parser) | XML ↔ JS object parsing                  | Structured MusicXML mutation (§6B) instead of raw DOM `querySelector` chains                                                                                                                            |
| [`abcjs`](https://www.abcjs.net/)                                           | ABC notation renderer + editor           | If you want a lightweight text-based alternative notation input (ABC is far terser to type than MusicXML) alongside MusicXML/OSMD; RiffScore also exports ABC, so it can be a shared interchange format |
| [Verovio](https://www.verovio.org/)                                         | MEI/MusicXML → SVG engraving (WASM)      | Alternative renderer to OSMD/VexFlow with strong support for early/complex notation; useful if you outgrow OSMD's notation coverage                                                                     |

### D. MIDI Export

`webmidi` (table above) covers **input** — a hardware keyboard feeding notes in. For **output** — letting users download what they built as a `.mid` file — pair it with [`midi-writer-js`](https://github.com/grimmdude/MidiWriterJS), which generates multi-track Standard MIDI files entirely client-side and accepts the same note-name strings (`"C#4"`, `"Eb5"`) that Tonal.js produces, so no pitch-format translation layer is needed.

**Install:**

```bash
npm install midi-writer-js
```

**Exporting the current score's notes as a downloadable MIDI file** — walk the same OSMD cursor iterator used for click-to-edit (§5) and playback sync (§5.1), but instead of scheduling audio, feed each note into a `MidiWriter.Track`:

```ts
// src/lib/exportMidi.ts
import MidiWriter from "midi-writer-js";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { Note } from "tonal";

// Maps OSMD's `note.Length.RealValue` — a fraction of a whole note
// (quarter = 0.25, eighth = 0.125, dotted-quarter = 0.375, ...) — to
// MidiWriterJS's duration-string vocabulary. Checked longest-first isn't
// needed here since every RealValue maps to exactly one bucket, but note
// durations that don't cleanly match one of these (e.g. a triplet eighth,
// RealValue ≈ 0.0833) fall through to the closest supported value rather
// than being rejected outright.
function realValueToMidiDuration(realValue: number): string {
  const table: Array<[number, string]> = [
    [1, "1"], // whole note
    [0.75, "2d"], // dotted half
    [0.5, "2"], // half note
    [0.375, "4d"], // dotted quarter
    [0.25, "4"], // quarter note
    [0.1875, "8d"], // dotted eighth
    [0.125, "8"], // eighth note
    [0.0625, "16"], // sixteenth note
  ];
  // Exact match first (the common case for non-tuplet rhythms).
  const exact = table.find(([value]) => value === realValue);
  if (exact) return exact[1];
  // Otherwise fall back to the nearest supported duration — good enough
  // for tuplets/irregular rhythms in an MVP; for exact tuplet playback,
  // MidiWriterJS also accepts an explicit tick count instead of a
  // duration string, which is worth reaching for if this matters to you.
  const closest = table.reduce((best, entry) =>
    Math.abs(entry[0] - realValue) < Math.abs(best[0] - realValue)
      ? entry
      : best,
  );
  return closest[1];
}

export function exportToMidi(osmd: OpenSheetMusicDisplay, bpm: number): string {
  const track = new MidiWriter.Track();
  track.setTempo(bpm);

  osmd.cursor.reset();
  const iterator = osmd.cursor.iterator;

  while (!iterator.EndReached) {
    const voices = iterator.CurrentVoiceEntries;
    for (const voice of voices) {
      const pitches = voice.Notes.filter((n) => !n.isRest()).map(
        (n) => n.Pitch.ToString(), // e.g. "C4"
      );
      // Validate before export: a pitch OSMD parsed but Tonal can't
      // resolve to a MIDI number (malformed enharmonic spelling, an
      // unsupported microtonal accidental, §9.3) would otherwise be
      // silently dropped by MidiWriterJS — surface it instead so the
      // exported file's note count matches what's on screen.
      const validPitches = pitches.filter((p) => {
        const isValid = Note.midi(p) != null;
        if (!isValid)
          console.warn(`Skipping unresolvable pitch in MIDI export: ${p}`);
        return isValid;
      });
      if (validPitches.length) {
        const duration = realValueToMidiDuration(
          voice.Notes[0]?.Length?.RealValue ?? 0.25,
        );
        track.addEvent(
          new MidiWriter.NoteEvent({ pitch: validPitches, duration }),
        );
      }
    }
    iterator.moveToNext();
  }

  const writer = new MidiWriter.Writer(track);
  return writer.dataUri(); // bind to an <a download="score.mid" href={dataUri}>
}
```

Two integration notes, now reflected in the snippet above rather than left as an exercise:

- **Duration mapping** is handled by `realValueToMidiDuration()`, converting each note's actual OSMD length (`note.Length.RealValue`) into MidiWriterJS's duration strings instead of hardcoding `"4"` (quarter note) for everything.
- **Validation before export** runs every pitch through `Note.midi()` (Tonal) first; anything that fails to resolve is logged and excluded rather than silently passed through to MidiWriterJS, which would otherwise drop it without explanation.

## References Used

- OpenSheetMusicDisplay — official site, feature overview, and limitations (renderer, not a full editor): <https://opensheetmusicdisplay.org/>
- OpenSheetMusicDisplay GitHub repository and README: <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay>
- OSMD Wiki — Getting Started (constructor, `load()`/`render()`, options): <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Getting-Started>
- OSMD "Using OSMD with TypeScript": <https://opensheetmusicdisplay.github.io/usage/typescript/>
- OSMD Class Reference — `Cursor`: <https://opensheetmusicdisplay.github.io/classdoc/classes/Cursor.html>
- OSMD Class Reference — `OpenSheetMusicDisplay` (options incl. `cursorsOptions`, `PageFormatStandards`): <https://opensheetmusicdisplay.github.io/classdoc/classes/OpenSheetMusicDisplay.html>
- OSMD Wiki — Tutorial: Extracting Note Timing for Playing (`GNote`, `getSVGGElement`, cursor iterator): <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Tutorial---Extracting-note-timing-for-playing>
- `react-opensheetmusicdisplay` — official minimal React wrapper example: <https://github.com/opensheetmusicdisplay/react-opensheetmusicdisplay>
- RiffScore — README, features, imperative API, and engines (Tonal.js, Tone.js): <https://github.com/joekotvas/RiffScore>
- Tonal.js — README and core API (Note, Interval, Scale, Chord, Key): <https://github.com/tonaljs/tonal>
- OSMD GitHub — cursor capability discussions on time- vs. step-based cursor movement (motivating §5.1): <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/480> and <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions/961>
- `midi-writer-js` — README and API for generating multi-track MIDI files client-side: <https://github.com/grimmdude/MidiWriterJS>
- `fast-xml-parser` — used for structural MusicXML validation (§4.1) and mutation (§6B): <https://github.com/NaturalIntelligence/fast-xml-parser>
- `idb` — promise-based IndexedDB wrapper used for autosave/persistence (§7.1): <https://github.com/jakearchibald/idb>
- `jszip` — used for building/reading `.mxl` (zipped MusicXML) archives client-side (§10.6, §10.7): <https://github.com/Stuk/jszip>
- MuseScore Studio — native notation editor referenced for MusicXML/MXL interchange behavior and as a source of realistic test fixtures (§1.3): <https://musescore.org/>
- LilyPond — text-based engraving system referenced for context on MusicXML's verbosity (§1.3): <https://lilypond.org/>
- Audiveris — Optical Music Recognition (OMR) engine producing MusicXML from scanned scores, referenced as an ingestion-pipeline test source (§1.3): <https://github.com/Audiveris/audiveris>
- OSMD GitHub — MusicXML accidental support matrix, confirming native quarter-tone/three-quarter-tone rendering via VexFlow's Stein-Zimmermann glyphs (§9.3): <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/issues/1084>
- OSMD GitHub Discussions — confirmation of half-sharp/half-flat (quarter-tone) accidental support: <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/discussions/950>
- David Matthew, _A MusicXML Tutorial_ series (referenced per your request): <https://davidmatthew.ie/tag/musicxml/>
  - Part 1 — Musical Markup for the Web: <https://davidmatthew.ie/a-musicxml-tutorial-part-1-musical-markup-for-the-web/>
  - Part 2 — Voices, Staves, Directions and Dynamics: <https://davidmatthew.ie/a-musicxml-tutorial-part-2-voices-staves-directions-and-dynamics/>
  - Part 3 — Rests, Ties, Tuplets, Beams and Barlines: <https://davidmatthew.ie/a-musicxml-tutorial-part-3-rests-ties-tuplets-beams-barlines/>
  - Part 4 — Microtonal and Non-Western Notation: <https://davidmatthew.ie/a-musicxml-tutorial-part-4-non-western-notation/>
  - MusicXML Tips and Thoughts: An Interview with Karim Ratib (editor of the MusicXML spec): <https://davidmatthew.ie/musicxml-tips-thoughts-karim-ratib/>
  - An Interactive MusicXML Element Tree: <https://davidmatthew.ie/musicxml-tree/>

## Free MusicXML / OSMD Courses & Tutorials

- **David Matthew's "A MusicXML Tutorial" series** (4 parts + interview) — free blog series building up a score from scratch: <https://davidmatthew.ie/tag/musicxml/>
- **OSMD official Wiki** (Getting Started, Debugging, Exploring the Demo, note-timing tutorial) — free, maintained by the OSMD/PhonicScore team: <https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki>
- **OSMD Public Demo** (interactive, browser console access to the live `osmd` object for experimentation): <https://opensheetmusicdisplay.github.io/demo/>
- **MusicXML official tutorials and specification** (W3C/MakeMusic, the authoritative reference for the format itself): <https://www.w3.org/2021/06/musicxml40/tutorial/>
- **`webpack-usage-example` / `RawJavascript-usage-example` repos** — free, runnable OSMD starter projects: <https://github.com/opensheetmusicdisplay/webpack-usage-example> and <https://github.com/opensheetmusicdisplay/RawJavascript-usage-example>
- **shadcn/ui documentation** — free official docs for installing components into a Vite project: <https://ui.shadcn.com/docs/installation/vite>
- **Tailwind CSS documentation** — free official install/usage guide: <https://tailwindcss.com/docs/installation>
