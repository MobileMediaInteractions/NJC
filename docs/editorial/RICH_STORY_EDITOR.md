# Rich story editor

Studio's story composer supports a versioned visual document alongside the
existing portable paragraph array. An author can switch the visual editor on
or off for an individual writing session and can choose one of three workspace
modes:

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
bulleted lists, numbered lists, checklists, links, tables, alignment, and clear
formatting. Common Markdown shortcuts are supported inside the editor. The live
preview also includes the developing headline, summary, section, dateline,
byline, lead image and generated Why It Matters presentation.

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
compare a rich-format revision, approve and publish it, then verify the public
page and plain-copy API fallback. Repeat with the global feature disabled and at
the configured Write, Split and Preview defaults.

