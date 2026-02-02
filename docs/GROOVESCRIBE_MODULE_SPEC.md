# Groovescribe Module Spec

Version: 1.0
Owner: Musicdott
Scope: Universal Groovescribe embed normalization, optional parsing, side-by-side viewer, and generator input.

## 1. Purpose
Provide a deterministic, lossless, and non-destructive way to accept any Groovescribe-related input and always return a visible module. Embedding is always preserved; parsing is optional and never blocks display.

## 2. Non-Negotiable Guarantees
- Every input results in one embedded module object.
- Original input is always preserved (verbatim).
- No guessing, no mutation of musical content.
- No dependency on Groovescribe internals or APIs.
- No silent failures: always return a module, either embedded or fallback.

## 3. Supported Inputs
Accept all of the following:
- Full URLs (official or self-hosted)
- Hash/share URLs (e.g., #/groove/ENCODED)
- Self-hosted Groovescribe (e.g., teacher.musicdott.com/groovescribe)
- iframe HTML with a Groovescribe src
- Partial or malformed but recognizable links
- Query-only strings with musical params

## 4. Detection Order (Strict)
Classify input using this exact order:
1) If input contains <iframe> -> extract src
2) If URL hostname or path contains "groovescribe"
3) If query contains musical parameters (TimeSig, Div, Tempo, H, S, K, T, C)
4) Otherwise -> still return external embed fallback

No early exits. No rejection.

## 5. Output Format (Mandatory)
Return this structure for every input:

```
{
  "type": "notation",
  "provider": "groovescribe",

  "embed": {
    "embed_url": "string | null",
    "raw": "original input"
  },

  "status": "embedded | fallback",

  "fallback": {
    "label": "Open Groovescribe",
    "url": "original input"
  }
}
```

Rules:
- embed_url must be a fully qualified URL.
- Never re-encode or reorder query parameters.
- Never strip musical data.
- raw is always exactly the input.

## 6. Embedding Logic
Embedded
- status = "embedded" if a valid URL can be constructed and points to a Groovescribe renderer (official or self-hosted).
- Embed rendering must be iframe-compatible.

Fallback
- status = "fallback" only if input cannot be safely embedded or iframe usage is blocked (e.g., auth/CSP).
- Even in fallback, the module must render without breaking the UI.

## 7. Frontend Rendering Contract
If status = embedded:

```
<iframe
  src="{embed_url}"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin"
></iframe>
```

If status = fallback:

```
[ Open Groovescribe ]
```

No empty states, ever.

## 8. Optional Translation (Non-Blocking)
If query parameters are present (TimeSig, Div, Tempo, H, S, K, etc.):
- You may expose them as metadata.
- You must NOT require parsing to succeed.
- Embedding must work even if parsing fails.

## 9. Internal Notation Translator (Optional)
### Purpose
Convert Groovescribe-style URLs into an internal grid-based drum notation format. This is additive: translation failure does not affect embedding.

### Accepted Inputs
- Groovescribe URLs (official or self-hosted)
- Query-based notation: TimeSig, Div, Tempo, Measures
- Instrument lanes: H, S, K, T, C
- iframe HTML (extract src first)

### Translation Rules
Time & Grid
- TimeSig=4/4 -> { beats: 4, unit: 4 }
- Div=16 -> steps_per_measure = 16
- Measures=n -> total_steps = n * steps_per_measure
- Tempo -> BPM (integer)

Instrument Lanes -> Events
Lane string example:
```
H=|xxxxxxxxxxxxxxxx|
S=|----O-------O---|
K=|o-------o-------|
```

Rules:
- x / o / O = hit
- O = accented hit
- - = rest
- Strip |
- Index is 1-based
- One character = one grid step

Event shape:
```
{
  "step": 5,
  "limb": "R | L | K | F | U",
  "instrument": "hihat | snare | kick | tom | cymbal",
  "velocity": 0.7,
  "accent": true
}
```

Defaults:
- Velocity = 0.7
- Limb = U (unknown) unless instrument implies limb

### Translator Output
```
{
  "status": "ok | partial | failed",

  "time_signature": { "beats": 4, "unit": 4 },
  "tempo": 80,
  "division": 16,
  "measures": 1,

  "grid": {
    "steps_per_measure": 16,
    "total_steps": 16
  },

  "events": [ ... ],

  "meta": {
    "source": "groovescribe-query",
    "confidence": "high | medium | low",
    "errors": []
  }
}
```

Rules:
- If any required parameter is missing -> partial
- If no musical data can be extracted -> failed
- Never throw

## 10. Side-by-Side Viewer
Layout (desktop-first):

```
┌─────────────────────────────────────────────┐
│ Context (Song / BPM / Section)              │
├───────────────────────┬─────────────────────┤
│ Groovescribe Viewer   │ Internal Grid       │
│ (iframe, read-only)   │ (events, editable)  │
│                       │                     │
│ Play / Loop           │ Play / Loop         │
└───────────────────────┴─────────────────────┘
```

Behavior
- Start/stop is synchronized.
- Tempo is led by Groovescribe if available.
- Loop boundaries align to measures.

Toggles (teacher only)
- Show accents
- Show limbs
- Raw / Parsed

Fallback
- If parsing is partial/failed: left Groovescribe works, right shows "Internal analysis unavailable".
- UI must not break.

## 11. Generator Input
### Event -> Block
```
{
  "block_id": "GS-001",
  "length_steps": 4,
  "events": [ ... ],
  "tags": ["groove", "groovescribe", "external"],
  "difficulty": 2,
  "source": {
    "type": "groovescribe",
    "url": "raw"
  }
}
```

Rules
- Max 1 measure per block (initially)
- Blocks may overlap
- Each block remains traceable to the original input

### Generator Constraints
Generator must never:
- Add events that do not exist
- Change feel without explicit instruction
- Remove accents

Generator may:
- Reorder
- Repeat
- Orchestrate (same timing, different instrument mapping)
- Adjust density (subsets)

### Generator Modes (MVP)
1) Mirror: exact same groove
2) Orchestrate: same events, different instrument mapping
3) Simplify: fewer hits, same timing
4) Extend: extra measure based on existing blocks

### Generator Output
```
{
  "generated": {
    "notation": { ... },
    "embed": {
      "type": "notation",
      "provider": "internal",
      "renderable": true
    }
  },
  "confidence": "high"
}
```

## 12. Error Handling
- Never throw for malformed input.
- Never drop data.
- Never auto-correct rhythms or notation.
- Deterministic and repeatable: same input -> same output.

## 13. Test Cases (Minimal)
1) iframe HTML -> extract src -> embedded
2) groovescribe.com query -> embedded
3) self-hosted groovescribe path -> embedded
4) query-only string -> embedded if render URL can be built
5) malformed but recognizable -> embedded if possible, else fallback
6) unknown input -> fallback with original input preserved

## 14. Success Criteria
- Every input yields a visible module.
- Every module is embed-safe.
- Musical intent is preserved.
- System is deterministic and repeatable.
