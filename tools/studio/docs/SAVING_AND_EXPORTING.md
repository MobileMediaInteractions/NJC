# Saving, importing and exporting in NJC Studio

## Save and recovery

Studio protects animation source in two layers:

1. The editor keeps a local recovery snapshot while source is changing. Opening that file after an interrupted session restores the snapshot over the last disk version.
2. Autosave is enabled by default. For a trusted workspace, Studio waits 1.2 seconds after the latest edit and then writes the active file to disk. The native write verifies the file's previously observed SHA-256 hash, writes a temporary sibling, syncs it and atomically replaces the destination. The recovery snapshot is removed only when the source that reached disk still matches the current editor text.

The status bar shows **Autosave On**, **Autosave Pending**, **Saving…**, the most recent save time, or **Autosave Error**. Select that status to enable or disable autosave. A failed automatic write is not retried in a loop: edit the source to schedule another attempt, or use **Save** to retry explicitly.

Manual save is available from the workbench, the command palette, **File → Save** on macOS, and `Command-S` (`Control-S` on Windows/Linux). Workspace trust is required for disk writes.

## Import editable source

Use **Import**, the command palette, or **File → Import Animation…**. Studio accepts a bounded UTF-8 `.pani` file and copies it into the trusted workspace's `animations` directory. It never edits the external original in place. An existing same-named workspace file is not overwritten silently.

## Export formats

The Export dialog and native File menu expose three distinct deliverables:

| Format | Purpose | Validation |
| --- | --- | --- |
| `.pani` | Canonical editable source for another Studio workspace | Bounded text, explicit destination |
| `.pani.bin` | Compiled, checksum-protected PANI runtime container for an application | Successful compiler diagnostics, `PLATANI\0` container magic, 16 MiB maximum |
| `.mp4` | Fully rendered video of a selected timeline | Verified runtime package, exact PNG frame dimensions, bounded payload, FFmpeg encoder |

The `.pani.bin` suffix deliberately distinguishes compiled bytes from editable `.pani` text.

### Rendered MP4

Choose a scene timeline, 24/30/60 FPS, and the current preview device/orientation. Studio evaluates the actual animation runtime at deterministic timestamps, draws the returned render nodes without editor chrome, validates every resulting PNG in Rust, and encodes an MP4 with fast-start metadata. macOS prefers hardware-backed `h264_videotoolbox`; Studio falls back to `libx264` and then MPEG-4 when those encoders are available.

Current safety limits are 3,600 frames, 60 FPS, 120 seconds at the frame-scheduler layer, 3840×2160 pixels, 8 MiB per PNG and 256 MiB of total staged frame input. The frame limit can make the effective maximum duration shorter at higher frame rates.

FFmpeg must currently be installed and discoverable on `PATH`. The desktop diagnostics panel reports whether a compatible encoder is available. Public distribution still needs a product decision between documenting that dependency and shipping a reviewed, licensed, signed FFmpeg sidecar.

### Current rendering boundaries

- Animation audio is not included because the current PANI runtime has no audio-track model.
- HTTP image sources must be canvas/CORS compatible. `data:` and `blob:` images are supported. A source the renderer cannot load is represented by a visible image placeholder rather than silently aborting the complete export.
- MP4 rendering runs in the Tauri desktop application. Browser-only Studio development can download `.pani` and `.pani.bin`, but does not claim native video encoding.

Exports use a user-selected absolute destination and are finalized atomically. The frontend never receives a general filesystem or shell capability.
