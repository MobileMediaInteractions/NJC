# Two Dudes in Wheels

**Two Dudes in Wheels** is an in-production, public NJC original podcast about
the same car from two deliberately different seats. The driver covers controls,
road manners, performance and confidence. The passenger covers comfort,
visibility, access, space and the parts of everyday travel that conventional car
reviews often compress into a sentence.

The client route is `/podcasts/two-dudes-in-wheels`. It is part of the main
publication and is not automatically paywalled behind NJC+. The site navigation
adds **Podcasts** after **Latest**, including for older stored navigation
configuration, without duplicating a manually configured route.

![Two Dudes in Wheels public series page](screenshots/dark/web-two-dudes-in-wheels.png)

## Audience experience

The public page is production-honest: until a real episode is available it says
the show is in production and does not invent a review, vehicle, release date or
audio file. A published episode activates the purpose-built client player:

- audio-only playback with play/pause, 15-second seek, scrubbing, mute and speed;
- a custom animated waveform and elapsed/remaining time in both display modes;
- timed, accessible car photography that crossfades as the hosts discuss it;
- explicit driver, passenger, both-seats and road-context visual perspectives;
- a one-tap **Audio only** mode that removes the animation stage while preserving
  playback, waveform, transcript, chapters and system media controls;
- synchronized speaker transcript cues and seekable full transcript;
- chapter navigation and share support;
- browser/PWA Media Session integration for system playback controls;
- reduced-motion behavior and a visual fallback when no timed photo is active.

## Courier MotionDeck

Courier MotionDeck is the purpose-built, versioned client renderer behind the
faceless visual experience. It is not a video player and does not stream or
pre-render a disguised video. The final audio clock selects validated scene
cues; trusted UI code then composes the car rig, road, cabin perspective,
transitions, editorial callouts, licensed photography, transcript state and
episode progress in real time.

The scene contract allows only known values for scene, perspective, motion and
transition. It accepts bounded display copy and up to three editorial callouts;
it does not accept arbitrary HTML, CSS, JavaScript, filesystem paths or invented
vehicle telemetry. When an episode has no authored animation cue at the current
time, MotionDeck uses a neutral road/cabin scene and the current speaker to
choose the perspective. Pointer movement changes only the visual lighting and
photo parallax. Reduced-motion preferences disable nonessential animation.

The listening-mode preference is stored under the versioned key
`njc:two-dudes-display:v1`. If storage is blocked, the selection still works for
the current page session and audio playback is never blocked.

### NJMotion timeline files

MotionDeck can load the first-party `.njmotion` timecode format. Version 1 uses
an identifying magic header, a fixed millisecond timebase, an allowlisted asset
catalog and typed tracks for visuals, procedural scenes, transcript, chapters
and waveform data. Visual cues define focal point, full/panel/inset placement,
contain/cover fit, bounded entrances and bounded pan/zoom behavior. The
renderer owns every actual style and animation; the document cannot inject
HTML, CSS, JavaScript or arbitrary file paths.

The no-index `/dev/motiondeck` workbench loads the checked-in format fixture and
36-second synthetic audio bed so timing, seeking, image placement, animations
and Audio Only mode can be tested without publishing a fake car review. The
complete format contract and examples live in
[NJMotion 1.0](NJMOTION_FORMAT.md).

## Episode contract

`apps/web/src/lib/two-dudes-in-wheels.ts` is the current code-owned release
pipeline. This increment intentionally adds no Studio administration. Each real
episode must pass the validated contract before it can render. The contract
requires an HTTPS or local audio asset, declared duration, real vehicle identity,
publication instant, bounded waveform data, accessible visual descriptions,
timed visual, animation and transcript cues, and optional chapters. Cue and
chapter identifiers must be unique and no timed item may extend beyond the
episode.

The player never discovers arbitrary media paths and never substitutes a fake
episode when the catalog is empty. Actual car photography must be licensed for
publication and delivered through an allowed first-party/CDN/Blob origin.

The current transparent series mark lives at
`/assets/podcasts/two-dudes-in-wheels/v1/logo-placeholder.png`. It is explicitly
provisional and must be replaced with a newly versioned asset after final brand
approval; the existing immutable placeholder path should not be overwritten.

Synthetic demonstration files live separately under
`/assets/podcasts/two-dudes-in-wheels/demo/`. Every image identifies itself as
demonstration art, and the workbench discloses that its audio, vehicle, captions
and commentary are fixtures rather than reporting.

## Release checklist

Before adding the first episode:

1. Publish the final audio file and its measured duration.
2. Generate normalized waveform peaks from that final audio master.
3. Prepare the complete reviewed transcript and speaker timing.
4. License, caption and write alt text for every car image.
5. Place visual and MotionDeck animation cues only where the conversation
   actually references the view or topic.
6. Review every scene title and callout; do not present animated decoration as
   measured vehicle telemetry.
7. Verify chapter times against the final audio master.
8. Test MotionDeck and Audio only modes with keyboard, screen reader, reduced
   motion, Media Session, iOS Safari,
   Android Chrome/PWA and desktop browsers.
9. Approve a final series identity and publish it under a new immutable asset
   version.
10. Confirm the structured podcast metadata and sitemap URL in production.

Safe recording and vehicle operation take precedence over production. Nothing
in the player requires a host or passenger to operate the page while driving.
