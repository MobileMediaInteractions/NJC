# Rich story editor

Studio's story composer supports a versioned visual document alongside the
existing portable paragraph array. The explicit **Visual | Text** control keeps
the original plain-copy workflow available without creating a second article.
Visual changes regenerate the portable paragraph fallback; intentional Text
changes regenerate a safe plain Lexical document. Switching modes without
typing does not normalize or discard the stored rich document.

An author can also choose one of three workspace modes:

- **Write** keeps the full editing surface in view.
- **Split** places the editor and the reader presentation side by side at
  newsroom desktop widths, with both panes stacked on smaller screens.
- **Preview** shows the reader presentation without editing chrome.

Administrators can disable the visual editor or choose its default workspace
mode in **Studio Settings → Experience**. Disabling it makes the plain-copy
editor authoritative and sends no rich document for newly saved copy.

## Authoring tools

The toolbar includes undo and redo, paragraphs, second- and third-level
headings, block quotes, bold, italic, underline, strikethrough, inline code,
bulleted lists, numbered lists, checklists, links, tables, horizontal
separators, alignment, and clear formatting. Common Markdown shortcuts are
supported inside the editor. The editor and public renderer share the same
article-content CSS rules. The live preview calls the public rich-content
renderer and also includes the developing headline, summary, section, dateline,
byline, lead image and generated Why It Matters presentation.

## Unsaved work and revisions

Studio labels unsaved changes and warns before a browser navigation discards
them. After 1.2 seconds of inactivity it stores a temporary, story-bound
browser recovery record. A returning editor can explicitly restore or discard
that record. Browser recovery never enters Postgres, never counts as an
editorial revision and is removed after a successful meaningful save.

The existing `story_revisions` ledger remains the only permanent history.
Opening or previewing a story creates no entry, and a save whose editorial
snapshot is unchanged returns the current story without incrementing its
content or revision version. Status, schedule, byline, body structure, search
metadata and lead-media changes remain meaningful revisions.

## Comparison and restoration

The story review screen provides a revision workbench that can compare any two
of the latest 100 retained snapshots or compare a historical snapshot with the
current newsroom state. When a published snapshot exists, **Changes since
published** selects it as the base. Comparisons include:

- unified and responsive side-by-side layouts;
- paragraph/line additions and removals with word-level highlighting;
- headline, summary, URL, section, dateline, byline and workflow changes;
- lead-image previews, alt text, image type, video and search metadata;
- explicit `+`/`−` and screen-reader labels so meaning does not rely on color.

Publishers can restore a historical snapshot only after entering a reason and
the exact `RESTORE REVISION` phrase. Restoration never rewrites history. A
pre-publication restoration creates a new applied Draft revision and
invalidates approvals and schedules. Restoring an active published story
creates a pending live-story revision that a different publisher must approve.
Final/closed stories remain locked. Both paths write API audit events.

## Storage and compatibility

`stories.rich_body` stores a JSON document with this envelope:

```json
{
  "schemaVersion": 1,
  "editor": "lexical",
  "state": {
    "root": {
      "type": "root",
      "version": 1,
      "children": []
    }
  }
}
```

The existing `body` paragraph array remains the portable, searchable fallback.
Every visual-editor change regenerates that fallback before saving. Older
stories therefore continue to render, and mobile, TV, API and export consumers
that do not yet understand the rich schema continue to receive readable copy.
The public web renderer uses the rich document when it passes validation and
fails closed to `body` when it does not.

The rich document is included in editorial integrity hashes, proposed live
revisions, approval comparisons and portable database exports. The additive
database migration is `apps/web/drizzle/0034_clumsy_deadpool.sql`.

## Security and limits

The API accepts only schema version 1, a bounded document size, bounded node
count and nesting depth, supported node types, and safe `https:`, `http:`,
`mailto:` or publication-local links. Public pages render a known node
allowlist directly to React elements; stored editor data is never inserted as
raw HTML. Unsupported or malformed documents are rejected on writes and fall
back safely on reads.

## Release acceptance

Before calling the protected workflow production-accepted, test it with real
author and approver accounts: create formatted draft copy, reload it, submit it,
compare arbitrary and non-consecutive revisions in both layouts, inspect a
single-word and lead-media change, restore a pre-publication revision, submit a
published restoration for independent approval, approve and publish it, then
verify the public page and plain-copy API fallback. Confirm an unchanged save
does not create a revision and a browser recovery remains temporary. Repeat
with the global feature disabled and at the configured Write, Split and Preview
defaults.
