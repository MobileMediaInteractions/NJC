# Reader API compatibility

The public reader API keeps installed first-party applications compatible
without silently downgrading current clients. Current clients advertise
capabilities through `X-NJC-Capabilities`; older official clients that do not
send that header receive a bounded server-side projection.

## Story-note negotiation

Current mobile, television and Roku releases send:

```http
X-NJC-Capabilities: structured-story-notes-v1
```

They receive `publicNoteType` and `publicNote` as structured fields. An older
official app without that capability receives the labeled note as the final
portable `body` paragraph and does not receive the structured fields. This
prevents duplicate rendering while keeping the note visible to clients whose
story renderer only understands paragraph arrays.

Responses identify the selected projection in
`X-NJC-Compatibility-Profile` and `meta.compatibilityProfile`. Reader responses
remain private, uncached and rate limited; compatibility does not open the
first-party endpoint to general developer traffic.

## Original Roku 1.0.0

Repository history establishes the immutable first Roku contract as:

- `User-Agent: Harborline-Roku/1.0.0`;
- no `X-NJC-Client` or capability header;
- only `body[0]` is read for article copy;
- site-relative fallback artwork is not resolved by the client;
- the category label, headline, summary, location and reading time are the only
  story presentation fields available outside that single body value.

The server therefore recognizes that exact historical identifier, while still
requiring an official API origin and the normal reader rate limit. Its story
projection:

- converts relative artwork to an absolute production URL;
- folds Breaking, Exclusive and Developing into the existing category label;
- collapses the complete portable article into `body[0]`;
- carries the verified public byline, Why It Matters and topics in that body;
- places the labeled public story note last.

This covers every current story feature that can be represented by fields the
old binary already reads. It does not—and technically cannot—replace installed
SceneGraph code. The original eight-line, non-scrolling detail overlay can
still clip long copy; newer navigation, configuration-driven sections,
pagination, QR processing visuals, account-control removal, release flair and
other new interactive behavior require a Roku channel update. Server data must
never pretend those client-side capabilities exist.

## Compatibility policy

- Capability negotiation, not a mutable marketing version, selects structured
  delivery for current apps.
- Only the exact historical Roku identifier receives the special `body[0]`
  projection.
- Generic official clients without the story-note capability receive only the
  final-paragraph note fallback.
- Website and developer API contracts are not downgraded.
- Removing a legacy profile requires production evidence that no supported
  installations still use it and a documented deprecation window.
