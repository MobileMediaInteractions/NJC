# NJMotion 1.0 format

NJMotion (`.njmotion`) is The New Jersey Courier's portable, declarative
timecode format for Courier MotionDeck. It tells a trusted player **when** to
show a catalogued visual, **where** to place it and **how** to animate it while
audio remains the primary media clock. It is not a video container, an
executable project, arbitrary CSS or an instruction stream.

The canonical demonstration document is
`apps/cdn/public/assets/podcasts/two-dudes-in-wheels/demo/motiondeck-demo.njmotion`.
The no-index workbench at `/dev/motiondeck` fetches, parses and renders that file
at runtime with synthetic audio and original vector fixtures.

## File identity

Every version-1 document is UTF-8 text and begins with this exact magic line:

```text
NJC-MOTIONDECK/1
```

The remaining bytes are a JSON object. The header makes a renamed `.json` file
fail closed and leaves room for a future binary or compressed revision without
guessing its schema. Version 1 uses MIME type
`application/vnd.njc.motiondeck` and a fixed `timebase` of `1000`, so one
timeline tick equals one millisecond.

```text
NJC-MOTIONDECK/1
{
  "format": "com.thejerseycourier.motiondeck",
  "version": 1,
  "timebase": 1000,
  "episode": { ... },
  "assets": [ ... ],
  "timeline": { ... }
}
```

## Root contract

| Field | Meaning |
| --- | --- |
| `format` | Must be `com.thejerseycourier.motiondeck`. |
| `version` | Must be `1`; unsupported versions are rejected. |
| `timebase` | Must be `1000`; all `start`, `end` and `duration` values are integer ticks. |
| `episode` | Public identity, measured duration, audio reference and vehicle label. |
| `assets` | The only files timeline tracks may reference. |
| `timeline` | Waveform, visual, scene, transcript and chapter tracks. |

The episode audio is referenced by `audioAssetId`, never by an unvalidated path
inside a scene. An image cue similarly uses `assetId`. Duplicate IDs, a missing
asset, a kind/MIME mismatch or an image without dimensions invalidates the
entire document.

## Asset catalog

```json
{
  "id": "driver-cockpit",
  "kind": "image",
  "src": "/podcasts/two-dudes-in-wheels/demo/v1/driver-cockpit.svg",
  "mimeType": "image/svg+xml",
  "width": 1600,
  "height": 900,
  "checksumSha256": "optional-64-character-lowercase-hash"
}
```

`kind` is `audio` or `image`. A source is either a clean CDN-relative path or a
complete HTTPS URL. Relative paths cannot contain traversal segments,
backslashes, queries or fragments. Runtime code converts a relative source
through the configured Courier asset origin. Checksums are optional in the
authoring contract and should be included for immutable production masters.

## Visual track

Visual cues answer the placement and animation questions directly:

```json
{
  "id": "visual-driver",
  "start": 12000,
  "end": 24000,
  "assetId": "driver-cockpit",
  "alt": "A complete accessible description of the image",
  "caption": "Editorial caption and credit language.",
  "perspective": "driver",
  "focalPoint": { "x": 42, "y": 55 },
  "placement": "left-panel",
  "fit": "cover",
  "entrance": "slide-right",
  "pan": "push-in"
}
```

Supported values are deliberately bounded:

| Property | Values |
| --- | --- |
| `perspective` | `driver`, `passenger`, `both`, `road` |
| `placement` | `full`, `left-panel`, `right-panel`, `inset` |
| `fit` | `cover`, `contain` |
| `entrance` | `crossfade`, `slide-left`, `slide-right`, `zoom`, `reveal` |
| `pan` | `none`, `left-to-right`, `right-to-left`, `push-in`, `pull-out` |

The coordinates in `focalPoint` are percentages from 0 through 100. The player
maps each enum to trusted application styling. A document cannot inject HTML,
CSS, JavaScript, animation keyframes or layout measurements. Reduced-motion
preferences disable nonessential entrances and pans without changing timing.

## Scene track

Scene cues control the procedural canvas and bounded editorial copy:

```json
{
  "id": "scene-driver",
  "start": 12000,
  "end": 24000,
  "scene": "cockpit",
  "perspective": "driver",
  "motion": "sport",
  "transition": "dashboard",
  "eyebrow": "00:12 · Driver view",
  "title": "Controls enter on the beat.",
  "callouts": [
    { "label": "Placement", "value": "Left panel" }
  ]
}
```

- `scene`: `road`, `cockpit`, `passenger`, `detail`, `verdict`
- `motion`: `calm`, `drive`, `sport`
- `transition`: `crossfade`, `dashboard`, `road-wipe`
- `callouts`: no more than three; these are authored display facts, never
  automatically presented as measured telemetry.

## Transcript and chapter tracks

Transcript cues have `id`, `start`, `end`, a `speaker` of `driver`, `passenger`
or `narrator`, and reviewed text. Chapters have `id`, `start` and `title`.
Waveform values are normalized from `0.05` through `1`; a document may contain
32 through 192 samples. Every timed cue must end after it starts and inside the
episode duration. IDs are unique across all tracks.

## Loading pipeline

```text
.njmotion bytes
  → exact magic-header check
  → JSON decoding
  → Zod structural and cross-reference validation
  → asset-ID resolution through the approved catalog
  → existing TwoDudesEpisode contract
  → audio-clock-driven MotionDeck renderer
```

`parseNjMotion` performs the first three steps and reports a controlled
`NjMotionError`. `compileNjMotion` resolves only catalogued IDs and then passes
the result through the existing episode contract. No partial timeline is
rendered after a validation failure.

## Authoring rules

1. Lock the final audio master and measure its duration before timecoding.
2. Add immutable, licensed assets to the CDN or approved storage and record
   their IDs, dimensions, MIME types and hashes.
3. Place transcript and chapter markers against the same audio timebase.
4. Use visuals only when they support the conversation; write genuine alt text,
   captions and credits separately.
5. Select the smallest useful animation. Decorative motion must never imply a
   measurement or vehicle behavior that was not reported.
6. Validate the file before publishing, then test seeks across every cue
   boundary and in Audio Only mode.
7. Publish changes as a new immutable file/version. Do not overwrite a released
   timeline or media master.

The included demo assets are deliberately synthetic and labelled as such. They
exist to exercise the engine; they are not a shortcut for the licensed audio,
photography, transcript and editorial review required by a real episode.
