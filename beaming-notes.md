# Beaming Notes: A Step-by-Step Beginner's Guide

> **Notation key used in this guide** (since we're working in plain text):
>
> - `♩` = quarter note (crotchet), `♪` = single eighth note (quaver) with a flag
> - `[♪ ♪]` = two or more notes **beamed together** (the flags are replaced by a connecting beam)
> - `|` = barline, `:` = beat divider inside a bar

---

## Step 0: Why Beaming Exists

Before flags and beams, imagine reading a page of eighth notes all written separately: `♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪`. It's hard to see where the beats fall. Beaming groups notes into their beats visually, so your eye can instantly see the pulse of the music without counting every single flag.

**The one rule to learn before anything else:**

> Beaming shows you where the **beat** is. Notes that belong to the same beat get connected with a beam.

Everything else in this guide is just this rule applied to different time signatures, plus a handful of well-established conventions and exceptions.

---

## Step 1: Know Your Beat Unit First

You can't beam correctly until you know what counts as "one beat" in the time signature you're using. This splits into two families:

| Time signature family | Examples           | What one beat equals                                               |
| --------------------- | ------------------ | ------------------------------------------------------------------ |
| **Simple time**       | 2/4, 3/4, 4/4, 2/2 | One quarter note (crotchet)                                        |
| **Compound time**     | 6/8, 9/8, 12/8     | One **dotted** quarter note (dotted crotchet) = three eighth notes |

**Practice 1 — Identify the beat unit**
For each time signature below, write down what one beat equals:

1. 3/4 → ?
2. 6/8 → ?
3. 4/4 → ?
4. 9/8 → ?

_Answers: 1) one quarter note 2) one dotted quarter note (3 eighth notes) 3) one quarter note 4) one dotted quarter note (3 eighth notes)_

---

## Step 2: Strong, Weak, and Off Beats — Why Position Matters

Beaming isn't only about grouping notes into beats — it's also about making the natural **accent pattern** of the bar visible. Every bar has a hierarchy of stronger and weaker beats:

- **Strong beat** — the heaviest accent, always the first beat of the bar.
- **Weak beat** — the other main beats, which get less emphasis.
- **Secondary strong beat** — in 4/4 specifically, beat 3 carries more weight than beats 2 and 4, even though it isn't as strong as beat 1.
- **Off beat** — any subdivision that falls _between_ the main beats (like the "and" of a beat).

This hierarchy leads to one of the most important general rules in beaming:

> **The first note of a beamed group should not start on an off-beat** — unless that off-beat note is preceded by a rest or a dotted note (which effectively "excuses" it from starting cleanly on the beat).

Why does this matter? If a beamed group starts on an off-beat, it visually disguises where the real beat falls, which is exactly what beaming is supposed to clarify.

**Practice 2 — Strong, weak, or off?**
In a 4/4 bar, label each beat position:

1. Beat 1 → ?
2. Beat 3 → ?
3. Beat 2 → ?
4. The "and" of beat 2 → ?

_Answers: 1) Strong beat 2) Secondary strong beat 3) Weak beat 4) Off beat_

---

## Step 3: General Rules That Apply to Every Time Signature

Before looking at specific time signatures, here are conventions that hold true everywhere, regardless of whether you're in simple or compound time:

1. **Beams never cross a barline.** All beaming happens strictly inside one measure.
2. **A stray note at the end of a bar is not beamed into the next bar.** If a single eighth note is left over at the end of a measure with nothing to beam it to, it keeps its own flag rather than reaching across the barline.
3. **Rests are never beamed themselves**, but they can sit _inside_ a beamed group — the beam simply continues visually over the top while the rest is written normally in its own space.
4. **The number of beam lines matches the number of flags** the note would have on its own: one line for eighth notes, two for sixteenths, three for thirty-second notes.
5. **The first note of a beamed group shouldn't fall on an off-beat**, unless it's preceded by a rest or a dotted note (see Step 2).

**Practice 3 — True or false**

1. A beamed group can stretch across a barline if the phrase is continuous. (True/False)
2. If a rest occurs mid-beat, the notes around it can still be beamed together as one group. (True/False)
3. Sixteenth notes are always connected with a single beam line, same as eighth notes. (True/False)

_Answers: 1) False 2) True 3) False — sixteenths need two beam lines_

---

## Step 4: Beaming in Simple Time — The Basic Rule

In simple time (2/4, 3/4, 4/4), each beat is one quarter note. So when you have eighth notes or sixteenth notes, **beam together everything that fits inside one quarter-note beat** — while respecting the off-beat-start rule from Step 2.

**Example A — 4/4, straight eighth notes**

```
4/4:  |  [♪ ♪] : [♪ ♪] : [♪ ♪] : [♪ ♪]  |
        beat1     beat2    beat3    beat4
```

Each pair of eighth notes is beamed separately because each pair fills exactly one beat. You get **four separate beamed pairs**, not one long beam — because a single beam group must not blur where the beats are.

**Example B — 3/4, mixed eighths and a quarter**

```
3/4:  |  [♪ ♪] : ♩ : [♪ ♪]  |
        beat1   beat2  beat3
```

The lone quarter note in beat 2 doesn't get beamed (it has no flag to begin with) — beaming only applies to notes that have flags (eighth notes, sixteenths, etc.).

**Practice 4 — Beam it yourself**
Given the durations below in 4/4 (each beat is a quarter note's worth of time), draw brackets around what should be beamed together, beat by beat:

```
Beat 1: two eighths
Beat 2: one quarter
Beat 3: four sixteenths
Beat 4: two eighths
```

_Answer:_

```
[♪ ♪]  :  ♩  :  [♬♬♬♬]  :  [♪ ♪]
```

(The four sixteenths in beat 3 are beamed together with a **double beam**, since sixteenth notes need two beam lines.)

---

## Step 5: The Exceptions That Break the "Show Each Beat" Rule

Music notation has a few long-standing conventions that beam _across_ beats for readability, even though they technically hide the individual beat. These are worth memorizing because you'll see them constantly in real scores.

### Exception 1 — A full bar of eighth notes in 2/4 or 3/4

If a whole bar is filled with nothing but eighth notes, they can be beamed together as one single group instead of splitting them beat by beat.

```
2/4:  |  [♪ ♪ ♪ ♪]  |     (instead of [♪ ♪] : [♪ ♪])
3/4:  |  [♪ ♪ ♪ ♪ ♪ ♪]  |  (instead of three separate pairs)
```

### Exception 2 — In 3/4, quavers can span two or three whole beats

As long as the **first note of the group falls on a beat** (not an off-beat), a run of eighth notes in 3/4 can be beamed across two or even all three beats of the bar — it doesn't have to break at every single beat boundary. Semiquaver (sixteenth-note) groups, on the other hand, are normally kept to a maximum of one beat per group.

### Exception 3 — Four eighth notes "replacing" a half note, in 3/4 or 4/4

When four eighth notes fill the same time as a half note (two beats), they're beamed together as one group of four rather than two groups of two.

```
3/4:  |  [♪ ♪ ♪ ♪] : ♩  |
4/4:  |  [♪ ♪ ♪ ♪] : [♪ ♪ ♪ ♪]  |
```

### Exception 4 — In 4/4, never beam across the middle of the bar

This is one of the most important rules for readability: even though Exception 3 allows four eighths to beam together, that beamed group **must not cross the halfway point** of a 4/4 bar (i.e., it can't straddle beat 2 and beat 3). This exists specifically to keep the secondary strong beat (beat 3, from Step 2) visible.

```
Correct:    |  [♪ ♪ ♪ ♪] : [♪ ♪ ♪ ♪]  |     ✅ (each group stays within its own half of the bar)
Incorrect:  |  [♪ ♪ : ♪ ♪ ♪ ♪ : ♪]   |     ❌ (beam spans across the middle of the bar)
```

Semiquaver groups in 4/4 are usually allowed to add up to a maximum of _two_ crotchet beats — again, without ever crossing beats 2–3.

### Exception 5 — In 3/8, the whole bar can beam together

Because 3/8 only has three eighth notes total in a bar, all of them can be joined under a single beam.

```
3/8:  |  [♪ ♪ ♪]  |
```

**Practice 5 — Spot the exception**
Which exception applies to each bar below?

1. `4/4: [♪ ♪ ♪ ♪] : ♩ ♩`
2. `2/4: [♪ ♪ ♪ ♪]`
3. `3/8: [♪ ♪ ♪]`
4. `3/4: [♪ ♪ ♪ ♪ ♪ ♪]` (all six quavers beamed together, first note on beat 1)

_Answers: 1) Exception 3 (four eighths replacing a half note) 2) Exception 1 (full bar of eighths in 2/4) 3) Exception 5 (whole 3/8 bar beamed) 4) Exception 2 (quavers spanning all three beats, starting cleanly on beat 1)_

---

## Step 6: Beaming in Compound Time — 6/8, 9/8, 12/8

This is where beginners often get tripped up, because the beat itself is worth **three** eighth notes (a dotted quarter note), not one. The core rule doesn't change — beam what fits in one beat — but "one beat" is now a group of three.

**Example C — 6/8**

```
6/8:  |  [♪ ♪ ♪] : [♪ ♪ ♪]  |
         beat 1        beat 2
```

Each beamed group of three eighth notes = one dotted-quarter beat. 6/8 has **two** beats per bar (not six!) — this is the single biggest conceptual shift from simple time.

**Why grouping matters — a contrast**

```
6/8 (correct):    |  [♪ ♪ ♪] : [♪ ♪ ♪]  |   → feels like 2 big beats, each split into 3
Wrong (looks like 3/4): |  [♪ ♪] : [♪ ♪] : [♪ ♪]  |   → this grouping of TWOS suggests 3/4, not 6/8!
```

This is the OpenLearn course's key warning: beaming together quavers in groups that don't add up to three quavers would visually suggest a different time signature. Beaming in twos when you're in 6/8 makes the music look like 3/4 even if the time signature says otherwise — so the beat grouping in the beaming has to match the compound meter.

**Practice 6 — Fix the wrong beaming**
This is meant to be in 6/8, but it's beamed incorrectly. Rebeam it correctly:

```
Wrong:    |  [♪ ♪] : [♪ ♪] : [♪ ♪]  |
Correct:  |  ?  |
```

_Answer:_ `[♪ ♪ ♪] : [♪ ♪ ♪]` — regroup into two sets of three, not three sets of two.

---

## Step 7: Notes Spanning More Than One Beat in Compound Time

Here's the twist mentioned in the OpenLearn material: once a note lasts for **two full beats or more** in compound time, the "show the dotted beat" rule stops applying, and you use the simplest notation instead.

**Example D — A note lasting two beats in 6/8**
Instead of writing it as a tied dotted-quarter + dotted-quarter (which would visually show both beats), it's simply written as one note worth six eighth notes — typically a dotted half note.

```
6/8, 2-beat note:  |  𝅗𝅥.  |   (a single dotted half note fills the whole bar)
```

**Example E — A full bar in 6/8, 9/8, and 12/8**

```
6/8  full bar = 1 dotted half note               |  𝅗𝅥.  |
9/8  full bar = 1 dotted half note + 1 dotted quarter   |  𝅗𝅥. ♩.  |
12/8 full bar = 2 dotted half notes              |  𝅗𝅥. 𝅗𝅥.  |
```

**Practice 7 — True or false**

1. In 6/8, a note lasting the whole bar is written as two separate dotted-quarter notes tied together. (True/False)
2. In 9/8, one beat = one eighth note. (True/False)
3. A 12/8 bar has four beats, each a dotted quarter note. (True/False)

_Answers: 1) False — it's written as a single dotted half note 2) False — one beat = one dotted quarter (3 eighth notes) 3) True_

---

## Step 8: Sixteenth Notes, Mixed Subdivisions, and Cut-Off Beams

The same "beam to the beat" logic extends to sixteenth notes (and beyond), just with more beam lines:

- One beam line = eighth notes
- Two beam lines = sixteenth notes
- Three beam lines = thirty-second notes (demisemiquavers)

You can also **mix** eighth and sixteenth notes within a single beamed group as long as the total still equals one beat, and the beam automatically "steps" between one and two lines depending on which note it's under.

**Example F — Mixed beaming in simple time (4/4, beat 1)**

```
Beat = 1 eighth + 2 sixteenths:   [♪ ♬ ♬]  (single beam over the eighth's portion, double beam over the two sixteenths)
```

### Cut-off (broken) beams

When a dotted eighth note is beamed to a single following sixteenth note, the sixteenth's second beam line can't run all the way to a partner note — so it's drawn as a short stub called a **cut-off beam** (or "broken beam"). A cut-off beam should be roughly as wide as a notehead, and it points toward whichever note it forms a complete beat with.

```
Dotted-eighth + sixteenth:   ♪.⌐♬   (the short second beam stub points back toward the dotted note)
```

**Practice 8 — Build the beam**
In 3/4, beat 2 contains: one sixteenth, one sixteenth, one eighth (in that order). Sketch how the beam levels would look.
_Answer:_ The group is beamed together with a **base beam** (single line) running the whole group, plus a **secondary beam** (second line) only over the first two sixteenth notes, since they're the ones subdividing further within the group.

---

## Step 9: Stem Direction and Beam Angling (Engraving Basics)

Once you're beaming real melodies (not just rhythms on one line), two more visual conventions come into play:

**Stem direction for a beamed group:** Look at whichever note in the group is **furthest from the middle line of the staff**. Whatever stem direction that note would naturally take (up if it's below the middle line, down if it's above), the _entire beamed group_ uses that same direction — even notes that would normally point the other way on their own.

**Beam angling:** The beam should follow the general melodic contour:

- If the pitches are rising, angle the beam upward.
- If the pitches are falling, angle the beam downward.
- If the first and last notes of the group are the same pitch (or the contour is essentially flat), keep the beam flat.

Getting the angle backwards — e.g., a beam that slopes down while the notes are actually rising — is a common notation mistake that makes the shape of the melody harder to read at a glance.

**Practice 9 — Quick check**
A beamed pair of eighth notes moves from a low note up to a high note. Should the beam be angled up, down, or flat?
_Answer:_ Angled up, following the rising contour.

---

## Step 10: Feathered Beaming (A Bonus, More Advanced Concept)

Beyond fixed-rhythm beaming, composers sometimes use **feathered beams** to notate a _gradual_ acceleration or deceleration rather than a strict rhythm. Instead of parallel beam lines, the secondary beam fans out diagonally:

- Beams that fan out wider toward the end of the group suggest the notes are speeding up (accelerando).
- Beams that fan out wider toward the beginning suggest the notes are slowing down (ritardando).

You won't need this for basic rhythm exercises, but it's useful to recognize when you see it in real scores — it looks like a beam with a "feathered" wedge shape rather than clean parallel lines.

---

## Step 11: Quick Reference Table

| Time Signature | Beat Unit                       | Standard Beam Group | Key Exception(s)                                                                                                                                                                  |
| -------------- | ------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2/4            | ♩                               | 2 eighths per beat  | Full bar of eighths can beam as one group                                                                                                                                         |
| 3/4            | ♩                               | 2 eighths per beat  | Full-bar eighths beam as one; quavers can span 2–3 beats if the group starts on a beat; 4 eighths "replacing" a half note beam as one group                                       |
| 4/4            | ♩                               | 2 eighths per beat  | 4 eighths replacing a half note beam together, but **never across the bar's middle** (protects the secondary strong beat on beat 3)                                               |
| 3/8            | ♪ (single eighth)               | —                   | Whole bar of eighths can beam together                                                                                                                                            |
| 6/8            | ♩. (dotted quarter = 3 eighths) | 3 eighths per beat  | Notes ≥ 2 beats use dotted half notes, not beamed groups                                                                                                                          |
| 9/8            | ♩.                              | 3 eighths per beat  | Same 2-beats-plus rule applies                                                                                                                                                    |
| 12/8           | ♩.                              | 3 eighths per beat  | Same 2-beats-plus rule applies                                                                                                                                                    |
| All signatures | —                               | —                   | Never beam across a barline; rests sit inside beam groups but are never beamed themselves; a beamed group shouldn't start on an off-beat unless preceded by a rest or dotted note |

---

## Step 12: Full Mixed Practice Set

Try these without looking at the answers first.

**12a.** Beam this 4/4 bar correctly: `♪ ♪ ♪ ♪ ♩ ♪ ♪`
_Answer:_ `[♪ ♪ ♪ ♪] : ♩ : [♪ ♪]` — the first four eighths replace a half note and beam as one group (staying within the first half of the bar), then beat 3 is a quarter note, then beat 4 is a beamed pair.

**12b.** Beam this 6/8 bar correctly: `♪ ♪ ♩ ♪`
_Answer:_ Beat 1 = `[♪ ♪]`, and the quarter note holds through the start of beat 2, with the final eighth note beamed to whatever follows it in beat 2 — always check that each beamed group's total duration equals three eighth notes before closing the beam.

**12c.** Is this correctly beamed for 9/8? `[♪ ♪ ♪] : [♪ ♪ ♪] : [♪ ♪ ♪]`
_Answer:_ Yes — three groups of three eighth notes = three dotted-quarter beats, which is exactly 9/8.

**12d.** Spot the error: `4/4: [♪ ♪ ♪ ♪ ♪ ♪ ♪ ♪]` (all eight eighth notes beamed as one group)
_Answer:_ This violates the rule against beaming across the middle of a 4/4 bar. It should be split into two groups of four: `[♪ ♪ ♪ ♪] : [♪ ♪ ♪ ♪]`.

**12e.** Spot the error: In 4/4, a group of two eighth notes is beamed starting on the "and" of beat 2, with nothing before it in that beat.
_Answer:_ This breaks the off-beat-start rule from Step 2 — a beamed group generally shouldn't begin on an off-beat unless a rest or dotted note precedes it.

---

## Step 13: A Simple Way to Check Your Own Beaming

Before finalizing any beamed group, ask yourself these questions in order:

1. **Does this beam group add up to exactly one beat** (or a clearly-established exception like a full simple-time bar, or four eighths replacing a half note)?
2. **In compound time, does the group add up to a multiple of three eighth notes** — never two, four, or five?
3. **In 4/4, does the beam avoid crossing the middle of the bar** (protecting the secondary strong beat)?
4. **Does the beam stay inside one measure**, without reaching across the barline?
5. **Does the first note of the group fall on a beat, not an off-beat** — unless it's preceded by a rest or dotted note?

If you can answer "yes" to the relevant questions, your beaming is correct.

---

## Further Study

These references were used to check the rules in this guide, and are good next steps for more examples and interactive drills:

- Open University OpenLearn — _[An Introduction to Music Theory, Section 3.6: Grouping and Beaming Notes](https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.6)_ (simple time rules and exceptions)
- Open University OpenLearn — _[Section 3.9: Grouping and Beaming Notes in Compound Time](https://www.open.edu/openlearn/history-the-arts/music/an-introduction-music-theory/content-section-3.9)_ (compound time rules)
- [musictheory.net Lessons](https://www.musictheory.net/lessons) — interactive rhythm and notation exercises to drill what you've learned here by ear and by eye
- My Music Theory — [Beaming in Groups](https://mymusictheory.com/rhythm/beaming-in-groups/) (strong/weak/off-beat concepts, stem direction, and beam angling, with exam-style practice exercises)
- Musicnotes Now — [Note Beaming and Grouping in Music Theory](https://www.musicnotes.com/blog/note-beaming-and-grouping-in-music-theory/) (general grouping rules that apply across all time signatures)
- Wikipedia — [Beam (music)](<https://en.wikipedia.org/wiki/Beam_(music)>) (a concise technical overview of beams and beaming conventions)
