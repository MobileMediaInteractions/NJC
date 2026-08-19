# `@harborline/media-player`

A portable, proprietary React package containing the playback engine and the
editorial timeline controls first used by NJC+. The package is deliberately
brand-neutral: a host supplies its own colors, identity, persistence endpoint,
authorization and storage URLs.

![NJC+ protected release surface](../../docs/screenshots/dark/plus-release-gate.jpg)

## What travels with the package

- one video/audio control surface;
- optional platform intro plus measured black/silence transition;
- source-relative intro, recap, chapter, credits and custom markers;
- contextual skip controls that reappear after a rewind;
- chapter navigation;
- captions, speed, picture-in-picture, fullscreen and resume position;
- private-preview notice presentation;
- a controlled visual timeline editor with scrubbing, zoom, draggable bounds,
  exact millisecond fields, overlap review, validation and save/discard hooks;
- framework-neutral composition and validation helpers.

The package does **not** contain NJC authentication, database access, private
media authorization or arbitrary upload behavior. Those remain the host
application's responsibility.

## Install

Inside this monorepo:

```bash
pnpm add @harborline/media-player@workspace:*
```

For another private project, create an installable archive:

```bash
pnpm --dir packages/media-player pack --pack-destination ../../artifacts
pnpm add /path/to/harborline-media-player-0.1.0.tgz
```

The archive contains compiled ESM, declarations, source maps and the themeable
stylesheet. The package is currently `UNLICENSED`; publishing it to a registry
requires an explicit ownership/licensing and registry-access decision.

## Viewer

```tsx
import { MediaPlayer, type PlayerProgressEvent } from "@harborline/media-player";
import "@harborline/media-player/styles.css";

export function Program({ program }: { program: Program }) {
  async function persist(event: PlayerProgressEvent) {
    await fetch(`/api/programs/${event.contentId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  }

  return (
    <MediaPlayer
      contentId={program.id}
      kind="video"
      src={program.url}
      poster={program.poster}
      captionsUrl={program.captions}
      title={program.title}
      initialPositionMs={program.resumeAtMs}
      timelineSegments={program.timeline}
      platformIntro={program.platformIntro}
      branding={{ title: "YOUR BRAND", subtitle: "Original presentation" }}
      onProgress={persist}
      style={{ "--harbor-media-accent": "#ff4f70" } as React.CSSProperties}
    />
  );
}
```

`onProgress` receives source-program time, never the inherited intro offset.
The callback is the correct place to attach the new site's authenticated API.

## Admin timeline

```tsx
import { TimelineEditor, type TimelineSegment } from "@harborline/media-player";

function AdminTimeline({ initial }: { initial: TimelineSegment[] }) {
  const [segments, setSegments] = useState(initial);

  return (
    <TimelineEditor
      mediaUrl="https://authorized.example/program.mp4"
      durationMs={3_600_000}
      segments={segments}
      onChange={setSegments}
      onSave={(next) => saveAuthorizedTimeline(next)}
      onDiscard={() => setSegments(initial)}
    />
  );
}
```

The editor is controlled. It never fetches, grants access or saves by itself.
The host must authenticate and authorize every load/save and validate the
submitted markers server-side. `validateTimeline()` is useful shared input
validation, but it is not an authorization layer.

## Theme tokens

Override these CSS custom properties on either component:

| Token | Default |
| --- | --- |
| `--harbor-media-accent` | `#b9ff4a` |
| `--harbor-media-ink` | `#05070c` |
| `--harbor-media-panel` | `#101722` |
| `--harbor-media-panel-soft` | `#192231` |
| `--harbor-media-text` | `#f7f9fc` |
| `--harbor-media-muted` | `#aab4c2` |
| `--harbor-media-line` | `#ffffff24` |
| `--harbor-media-danger` | `#ff7b7b` |

All viewer labels can also be localized through the `labels` prop.

## Boundaries and current limitations

- React 18.2+ and a browser with HTML media support are required.
- The package composes ordinary media sources in one control surface. It does
  not transcode or stitch adaptive HLS/DASH manifests.
- The host owns signed URLs, DRM, range requests, entitlements and analytics.
- Native iOS, Android, tvOS, Android TV and Roku still need native renderers for
  the same exported timeline contract; this React package does not pretend to
  be a native player.
- Package updates use semantic versions. A future consumer should pin a version
  and test its own persistence/authorization adapter before upgrading.

## Verification

```bash
pnpm --dir packages/media-player test
pnpm --dir packages/media-player typecheck
pnpm --dir packages/media-player build
pnpm --dir packages/media-player pack --pack-destination /tmp/harborline-player
```
