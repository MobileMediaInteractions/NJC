import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MediaPlayer } from "../src/media-player";
import { TimelineEditor } from "../src/timeline-editor";

test("viewer feature switches, class hooks and slots are host controlled", () => {
  const html = renderToStaticMarkup(createElement(MediaPlayer, {
    contentId: "demo", kind: "video", src: "/demo.mp4", title: "Demo",
    features: { scrubber: false, seekBackward: false, seekForward: false, fullscreen: false, previewNotice: true },
    classNames: { root: "publisher-player", notice: "publisher-notice" },
    previewNotice: { body: "Authorized preview" },
    slots: { loading: () => createElement("p", { className: "publisher-loader" }, "Preparing release") },
  }));
  assert.match(html, /publisher-player/);
  assert.match(html, /publisher-notice/);
  assert.match(html, /publisher-loader/);
  assert.doesNotMatch(html, /Playback position/);
  assert.doesNotMatch(html, /Fullscreen/);
});

test("timeline copy, regions and theme styles can be replaced", () => {
  const html = renderToStaticMarkup(createElement(TimelineEditor, {
    segments: [], durationMs: 10_000, onChange: () => undefined,
    labels: { sourceTimeline: "Broadcast map", idleStatus: "Owned by publisher" },
    features: { header: false, mediaPreview: false, actions: true },
    classNames: { root: "publisher-editor" },
    style: { "--harbor-media-accent": "#ff00aa" } as React.CSSProperties,
  }));
  assert.match(html, /publisher-editor/);
  assert.match(html, /Broadcast map/);
  assert.match(html, /Owned by publisher/);
  assert.doesNotMatch(html, /Playback composition/);
});
