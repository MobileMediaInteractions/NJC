# NJC feature language and Blueprints: complete authoring reference

This is the top-to-bottom reference for authoring visual features in NJC Studio. It covers both the readable `.vfeature` language and NJC Blueprints. The two styles are synchronized projections of one canonical, typed `FeatureIR`; they are not separate programs.

> **Implementation status:** This guide describes the repository as implemented. Sections labeled **current boundary** distinguish working runtime behavior from syntax or IR reserved for later milestones.

## Contents

1. [The core model](#1-the-core-model)
2. [Working in Studio](#2-working-in-studio)
3. [Language rules](#3-language-rules)
4. [Feature header, requirements and identity](#4-feature-header-requirements-and-identity)
5. [Data and state](#5-data-and-state)
6. [Screens and components](#6-screens-and-components)
7. [Behavior language](#7-behavior-language)
8. [NJC Blueprints](#8-njc-blueprints)
9. [Motions](#9-motions)
10. [Bindings, connectors, tests and other IR fields](#10-bindings-connectors-tests-and-other-ir-fields)
11. [Complete example](#11-complete-example)
12. [Validation and diagnostics](#12-validation-and-diagnostics)
13. [Security and execution limits](#13-security-and-execution-limits)
14. [Current editing boundaries](#14-current-editing-boundaries)
15. [Legacy syntax](#15-legacy-syntax)
16. [Troubleshooting](#16-troubleshooting)
17. [Glossary](#17-glossary)

## 1. The core model

Every feature passes through the same pipeline:

```text
Design / Data / Motion / Test editors
                  │
Readable .vfeature source ──► canonical FeatureIR ◄── NJC Blueprint graph
                                      │
                               validate + compile
                                      │
                          checksummed feature package
                                      │
                    entitlement/capability-gated runtime
```

The important consequences are:

- Source and Blueprints do not drift into independent files.
- A component, node, edge, motion and keyframe has a stable ID.
- Graph wires are checked by typed input and output ports.
- Formatting is deterministic; source is not interpreted by AI.
- The runtime receives a validated package, not executable source text.
- Moving a Blueprint node changes editor layout, not execution order. Wires define execution order.

The source file extension is `.vfeature`. The current example is [`examples/purchase-confirmation/feature.vfeature`](../../examples/purchase-confirmation/feature.vfeature).

## 2. Working in Studio

Open **Feature** in NJC Studio, then choose one of the synchronized modes:

| Mode | Purpose |
| --- | --- |
| Design | Add/select components and edit schema-backed properties and accessibility |
| Blueprints | Attach event-driven behavior using typed nodes and wires |
| Data | Inspect declared models, state, bindings and development values |
| Motion | Edit compositions, tracks, keyframes and interpolation |
| Test | Run the compiled feature against a development host and inspect state/results |
| Code | Read, format, edit and validate the English-forward source projection |

In **Code**:

1. Edit the readable source.
2. Select **Format** to normalize tabs, trailing whitespace and the final newline.
3. Select **Apply to visual model**.
4. Resolve any error diagnostics. The existing model is replaced only when parsing has no errors.

In **Blueprints**:

1. Select a component in Design.
2. Select its event in the Blueprint palette.
3. Add only actions offered for that component schema.
4. Select a node to inspect its stable ID, config and typed ports.
5. Drag nodes or use `Alt` + arrow keys. Add `Shift` for a larger keyboard step.
6. Select **Auto arrange** for dependency-layered layout.
7. Read the synchronized English projection in the right inspector.

## 3. Language rules

### 3.1 Deterministic English, not free-form prose

The language deliberately combines English phrases with programming concepts:

```text
When BuyButton is tapped:
  Set PurchaseStatus to confirming
  Show purchase-spinner
```

Only defined statements are accepted. Synonyms, conversational instructions and arbitrary prose are not guessed.

### 3.2 Indentation

- Canonical indentation is two spaces per level.
- Tabs are converted to two spaces by the formatter.
- Nested components, branches, motion tracks and keyframes use indentation.
- Blank lines separate major declarations.

### 3.3 Comments

A line whose first non-whitespace character is `#` is ignored by the parser.

```text
# This is a source comment.
```

### 3.4 Names, IDs and references

- A display name begins with a letter and may contain word characters or `-`.
- Canonical formatting removes spaces from feature names, for example `Purchase Confirmation` becomes `PurchaseConfirmation`.
- Feature versions use semantic versioning, such as `1.2.0` or `1.2.0-beta.1`.
- Feature IDs are lowercase dotted or hyphenated identifiers, such as `njc.poll-results`.
- `with id "..."` preserves stable identity when a display name or node position changes.
- References use a model name such as `SelectedProduct`, or a stable ID such as `component.purchase-confirmation`.
- Blueprint layout accepts portable IDs made from letters, digits, `.`, `_`, `:`, `/` and `-`.

Do not casually change stable IDs after release. Other components, wires, motions, packages, migrations or host integrations may refer to them.

### 3.5 Strings and scalar values

Strings are JSON strings, including JSON escaping:

```text
Add text Greeting showing "Welcome, \"Jersey\" reader" with id "component.greeting"
```

State initial values are JSON values: strings, numbers, booleans, `null`, arrays or objects.

### 3.6 Informal grammar

```ebnf
feature       = "Create feature", Name, "version", Semver,
                "with id", String, Newline,
                requirements, { data | state-block | screen | behavior | motion } ;
requirements  = "This feature requires:", Newline,
                Indent, { "capability", Identifier, Newline },
                "entitlement", String, Newline, Dedent ;
data          = "Define data", Name, "with id", String, Newline,
                Indent, { field }, Dedent ;
field         = "field", Name, "is", Type, ["?"], "with id", String ;
state-block   = "Remember these state values:", Newline,
                Indent, { state }, Dedent ;
state         = "state", Name, "is", Type, "scoped to", Scope,
                ["=", JsonValue], "with id", String ;
screen        = "Show screen", Name, "at route", String,
                "with id", String, Newline, component ;
component     = "Add", ComponentType, Name, [content], ["hidden"],
                "with id", String, Newline,
                [Indent, { component }, Dedent] ;
behavior      = "When", ComponentName, "is", Event, ":", Newline,
                Indent, { statement }, Dedent ;
statement     = set | ask | call | show | hide | play | navigate | wait | branch ;
motion        = "Define motion", Name, "lasting", Milliseconds,
                "with id", String, Newline, Indent, { track }, Dedent ;
```

## 4. Feature header, requirements and identity

Every formatted feature begins with:

```text
Create feature WeeklyPulse version 1.0.0 with id "njc.weekly-pulse"
```

Then declare runtime requirements:

```text
This feature requires:
  capability network
  capability accessibility
  entitlement "civic.polls"
```

### Capabilities

Capabilities describe what the host must provide. The runtime compares the feature's complete capability list with the host's granted capability set before initializing any state. Common repository examples include:

- `accessibility`
- `animation`
- `localization`
- `media`
- `navigation`
- `network`
- `purchase`
- `secure-storage`
- `ui-overlays`

Capabilities are strings so the registry can grow, but a capability does nothing unless a host or registered adapter implements it.

### Entitlement

The feature entitlement is mandatory for a releasable feature. The runtime refuses to load the package unless the host grants the exact entitlement.

```text
entitlement "commerce.purchase"
```

Capabilities answer “can this host perform this class of operation?” Entitlements answer “is this application/account allowed to use this feature?” Both checks apply.

## 5. Data and state

### 5.1 Data models

```text
Define data PollChoice with id "data.poll-choice"
  field id is text with id "field.poll-choice.id"
  field label is text with id "field.poll-choice.label"
  field votes is number with id "field.poll-choice.votes"
  field image is image? with id "field.poll-choice.image"
```

Implemented field types:

| Type | Meaning |
| --- | --- |
| `text` | String content |
| `number` | Numeric value |
| `boolean` | True/false value |
| `money` | Monetary value represented by the host/model contract |
| `image` | Image reference |
| `video` | Video reference |
| `date` | Date value represented by the host/model contract |
| `record` | Structured object |
| `list` | Ordered collection |

Append `?` to make a field optional.

The canonical IR can additionally store an item type, default value and validation rules (`required`, `minimum`, `maximum`, `pattern`). Those details are edited through the model/Data tooling today; the readable formatter does not yet emit them.

### 5.2 State

```text
Remember these state values:
  state SelectedChoice is PollChoice? scoped to feature = null with id "state.selected-choice"
  state HasVoted is boolean scoped to screen = false with id "state.has-voted"
  state LiveResults is record scoped to server = {} with id "state.live-results"
```

Implemented state scopes:

| Scope | Intended lifetime/owner |
| --- | --- |
| `local` | Local authoring/runtime context |
| `screen` | Current screen |
| `feature` | Feature instance |
| `session` | Signed-in/runtime session |
| `application` | Application-wide |
| `persisted` | Persisted host storage |
| `secure` | Secure host storage |
| `server` | Server-owned; direct client mutation is rejected |

State type declarations are currently stored as strings. They may be primitives, model names, optional forms or unions:

```text
state Status is idle | loading | ready | failure scoped to screen = "idle" with id "state.status"
```

### 5.3 Paths and interpolation

Use dot paths to read nested state in bindings, connector inputs and message interpolation:

```text
SelectedProduct.name
LiveScore.total
```

Confirmation messages interpolate values in braces at runtime:

```text
Ask "Vote for {SelectedChoice.label}?" with modal component.vote-confirmation
```

If a value cannot be resolved, the placeholder remains visible instead of executing an expression.

## 6. Screens and components

### 6.1 Screen declaration

```text
Show screen PollScreen at route "/polls/:pollId" with id "screen.poll"
  Add stack PollLayout with id "component.poll-layout"
```

Routes are host-facing metadata. A screen may also require authentication or a specific entitlement in the canonical IR; those fields are not currently emitted by readable source.

### 6.2 Component hierarchy

Indentation defines parent/child containment:

```text
Show screen ArticleScreen at route "/article/:slug" with id "screen.article"
  Add stack ArticleLayout with id "component.article-layout"
    Add heading Headline showing "Council approves revised budget" with id "component.headline"
    Add text Summary showing "What residents need to know." with id "component.summary"
    Add button ShareButton saying "Share" with id "component.share"
```

`hidden` maps to an initial `visible: false` property:

```text
Add modal ShareConfirmation showing "Share article" hidden with id "component.share-confirmation"
```

### 6.3 Component catalog

The table below mirrors the current component registry. Palette suggestions come from these schemas.

| Source type | Primary content phrase | Events | Suggested actions | Required capability |
| --- | --- | --- | --- | --- |
| `stack` | none | appears | show, hide | none |
| `row` | none | appears | show, hide | none |
| `heading` | `showing "text"` | visible, hidden | show, hide, set value, animate property | accessibility |
| `text` | `showing "text"` | visible, hidden, value changes | show, hide, set value, animate property | localization |
| `button` | `saying "label"` | tapped, pressed, released, focused, unfocused, enabled, disabled | navigate, show modal, run action, change state, submit form, play animation, start purchase | accessibility |
| `image` | `showing "source"` | loaded, failed, visible | change source, show, hide, animate property | media |
| `video` | `showing "source"` | connected, buffering, finished, failed | play, pause, seek, mute, change source, enter fullscreen | media |
| `text field` | none | changes, focused, submitted | validate, save value, search while typing, format input, clear | accessibility |
| `list` | none | item selected, reaches end | filter, refresh, scroll, select item | none |
| `card` | none | tapped, visible | show, hide, navigate | none |
| `modal` | `showing "title"` | opened, closed, confirmed, cancelled | open, close, confirm | ui-overlays, accessibility |
| `spinner` | none | visible, hidden | show, hide, play animation | animation |
| `badge` | none | value changes | set value, show, hide | none |
| `navigation bar` | none | item selected | navigate, go back | navigation |

The shared registry currently targets web, iOS, Android, tvOS, Android TV and desktop. Roku requires a separately declared/verified adapter; it is not silently treated as compatible.

### 6.4 Properties, layout and accessibility

Source currently projects the main content property, stable ID and initial visibility. The canonical component model also contains:

- schema-defined properties such as `opacity`, `gap`, `source`, `label`, `title` and `visible`;
- layout kind: `stack`, `row`, `grid`, `overlay` or `absolute`;
- gap, padding, width, height and alignment;
- accessibility name, role, hint, focus order and decorative state;
- bindings;
- platform overrides;
- editor lock/hidden metadata.

Use Design/Inspector for these fields. Interactive registered components require an accessible name or validation fails.

## 7. Behavior language

### 7.1 Event entry point

```text
When VoteButton is tapped:
  Set VoteStatus to submitting
```

The component and event must exist. At runtime, dispatch finds the matching flow, starts at its `event` node and follows the `next` wire.

### 7.2 Sequential statements

#### Set state

```text
Set VoteStatus to submitted
```

Blueprint configuration:

```json
{ "state": "VoteStatus", "value": "submitted" }
```

#### Show and hide components

```text
Show results-card
Hide loading-spinner
```

These statements toggle the target component's runtime visibility.

#### Play a motion

```text
Play animation vote-success
```

The motion ID is resolved from `motion.vote-success`. If reduced motion is active and the motion declares an alternative, the runtime selects that alternative.

#### Navigate

```text
Navigate to screen ResultsScreen
```

#### Wait

```text
Wait for 250ms
```

> **Current boundary:** Navigate and Wait have IR kinds and readable formatting, but the current vertical-slice runtime does not yet perform navigation or delay. It records/traverses the node and follows `next`. A production host adapter/runtime implementation is still required.

### 7.3 Confirmation branch

```text
Ask "Submit your vote for {SelectedChoice.label}?" with modal component.vote-confirmation
  Use title "Confirm vote"
  Use confirm button "Submit"
  Use cancel button "Go back"
If the reader confirms:
  Set VoteStatus to submitting
Otherwise:
  Hide vote-confirmation
```

The equivalent Ask node has:

- config keys `modalId`, `title`, `message`, `confirm`, `cancel`;
- a `confirmed` control output;
- a `cancelled` control output.

Execution pauses at the Ask node. Calling the runtime confirmation API resumes from the selected branch.

### 7.4 Connector action and success/failure branch

```text
Call connector.poll.operation.submit with SelectedChoice -> submission
If submission succeeds:
  Set VoteStatus to submitted
  Show results-card
Otherwise:
  Set VoteStatus to failure
  Show vote-error
```

The Action node stores:

```json
{
  "connectorId": "connector.poll",
  "operationId": "operation.submit",
  "input": "SelectedChoice",
  "result": "submission"
}
```

It has `success` and `failure` control outputs. The host must register the connector executor. The runtime supports cancellation through `AbortController` and never reads embedded credentials from source.

### 7.5 Behavior node support matrix

`FeatureIR` defines the following node kinds:

| Node kind | Readable projection | Current runtime semantics | Typical ports |
| --- | --- | --- | --- |
| `event` | `When … is …:` header | Fully supported entry point | `next` output |
| `set-state` | `Set … to …` | Fully supported | `in`, `next` |
| `show` | `Show …` | Fully supported | `in`, `next` |
| `hide` | `Hide …` | Fully supported | `in`, `next` |
| `ask` | `Ask …`, `If the reader confirms`, `Otherwise` | Fully supported; pauses/resumes | `in`, `confirmed`, `cancelled` |
| `action` | `Call …`, success/failure branch | Fully supported through host connector | `in`, `success`, `failure` |
| `animation` | `Play animation …` | Fully supported | `in`, `next` |
| `navigate` | `Navigate to screen …` | Projection exists; host behavior pending | `in`, `next` |
| `wait` | `Wait for …` | Projection exists; delay pending | `in`, `next` |
| `condition` | Reserved | Not yet projected/executed | commonly `true`, `false` |
| `emit` | Reserved/guided fallback | Not yet projected/executed | commonly `next` |
| `error` | Reserved | Not yet projected/executed | schema-defined |
| `parallel` | Reserved | Not yet projected/executed | schema-defined branches |

Do not represent reserved kinds as production-complete until their formatter, parser, validator and runtime semantics are implemented and tested.

## 8. NJC Blueprints

### 8.1 What a Blueprint contains

A behavior flow contains:

```ts
type BehaviorFlow = {
  id: string;
  name: string;
  trigger: { componentId: string; event: string };
  nodes: BehaviorNode[];
  edges: BehaviorEdge[];
};
```

Each node contains:

- stable ID;
- node kind and human label;
- typed input/output ports;
- typed/configured values stored as JSON;
- editor position `{ x, y }`.

Each edge contains:

- source node and output-port IDs;
- destination node and input-port IDs;
- value type;
- optional outcome (`next`, `confirmed`, `cancelled`, `success`, `failure`, `true`, `false`).

### 8.2 Port types

Implemented graph value types are:

| Type | Intended value |
| --- | --- |
| `control` | Execution flow |
| `text` | Text/string |
| `number` | Number |
| `boolean` | Boolean |
| `money` | Money value |
| `image` | Image reference |
| `video` | Video reference |
| `record` | Structured object |
| `list` | Collection |
| `error` | Error value |
| `result` | Operation result |
| `event` | Event payload |
| `any` | Explicit wildcard/adapter boundary |

Validation rejects a wire when its source and destination port types differ, unless one side is `any`. A visible wire never substitutes for server-side/runtime validation.

### 8.3 Palette filtering

The left palette reads the selected component's schema. A button offers button events and button actions; a video offers video events/actions; a text field offers input-specific operations. This prevents unrelated operations from appearing as if they were universally valid.

> **Current boundary:** Palette items are schema-aware, but the guided node factory is still a vertical slice. It creates concrete Navigate, Animation, Show and Set State nodes for recognized action names and an `emit` fallback for other suggestions. Inspect and test generated configuration before release.

### 8.4 Selection and inspection

Selecting a node shows:

- kind;
- label;
- stable ID;
- configuration key/value pairs;
- input and output port names/types;
- synchronized readable source.

Changing source-supported values or graph configuration updates the same IR used by Design, Data, Motion, Test and packaging.

### 8.5 Moving and arranging nodes

- Drag with the primary pointer button.
- `Alt` + arrow moves the focused node 5 pixels.
- `Alt` + `Shift` + arrow moves it 20 pixels.
- **Reset view** returns the scroll viewport to the origin.
- **Auto arrange** computes deterministic dependency layers.

The desktop build uses `rust-scc-layered-v1` on a native worker. It validates up to 10,000 nodes and 50,000 wires, groups strongly connected cycles and returns execution timing. Browser preview uses the labeled `typescript-scc-layered-v1` contract-compatible fallback. Auto-layout affects positions only.

### 8.6 Source-to-Blueprint mapping example

Readable source:

```text
When BuyButton is tapped:
  Set PurchaseStatus to confirming
  Ask "Continue?" with modal component.purchase-confirmation
    Use title "Confirm purchase"
    Use confirm button "Purchase"
    Use cancel button "Cancel"
  If the reader confirms:
    Call connector.purchase.operation.purchase with SelectedProduct -> purchase
    If purchase succeeds:
      Show purchase-success
    Otherwise:
      Show purchase-error
```

Conceptual graph:

```text
[BuyButton tapped]
        next
          │
[Set confirming]
        next
          │
[Ask for confirmation] ──cancelled──► [cancel path]
        confirmed
          │
[Purchase action] ──failure──► [Show error]
        success
          │
   [Show success]
```

## 9. Motions

### 9.1 Composition

```text
Define motion VoteSuccess lasting 500ms with id "motion.vote-success"
  Animate ResultsCard.opacity with id "track.results-opacity"
    At 0ms set value to 0 using linear with id "key.results-opacity.0"
    At 500ms set value to 1 using bezier with id "key.results-opacity.1"
```

A motion contains tracks. A track targets a component and numeric property. A track contains time-ordered keyframes.

### 9.2 Interpolation

| Interpolation | Meaning |
| --- | --- |
| `linear` | Constant-rate interpolation |
| `hold` | Retain the prior value until the next keyframe |
| `step` | Discrete stepped change |
| `bezier` | Cubic Bézier easing; detailed control points live in IR/Motion editor |
| `spring` | Spring interpolation; velocity parameters live in IR/Motion editor |

The IR can store incoming/outgoing velocity, cubic Bézier points, labels and motion markers. The readable projection currently emits time, value, interpolation and stable ID.

### 9.3 Reduced motion

A motion may reference a shorter or less spatial `reducedMotionAlternative` in IR. When the runtime host reports reduced motion, an Animation node selects that alternative automatically.

## 10. Bindings, connectors, tests and other IR fields

Readable source intentionally does not yet serialize every `FeatureIR` field. The canonical model also includes the following.

### Bindings

A binding maps state to a component property:

```ts
{
  id: "binding.product-title",
  targetComponentId: "component.product-title",
  targetProperty: "text",
  expression: "SelectedProduct.name",
  mode: "one-way",
  valueType: "text",
  changeAnimation: "crossfade"
}
```

Modes are `one-way`, `two-way` and `derived`. Expressions are bounded dot paths, not JavaScript. Validation detects direct two-binding cycles.

### Connectors

Connector kinds are `rest`, `graphql`, `websocket`, `sse`, `local-storage`, `secure-storage`, `host` and `media`. Operations declare method, path, input/output types, timeout and retry policy. Realtime connectors additionally declare reconnect, backoff, stale-data and event-rate behavior.

Production connector rules:

- non-local URLs must use HTTPS;
- localhost HTTP is allowed for development;
- credentials are host references such as `host:poll-service`;
- secrets must never be written into Feature IR or `.vfeature` source;
- connector capabilities and entitlement still apply.

### Tests

Feature tests support these step kinds in the model:

```text
open, tap, confirm, set-data, emit,
expect-state, expect-visible, expect-animation
```

The current test runner implements tap, confirm, set-data and the three expectation steps. Open and emit remain model-level scaffolding in the vertical slice.

### Other canonical fields

The IR also carries:

- schema version and minimum runtime;
- supported platforms;
- design tokens;
- localizations;
- migrations;
- screen authentication/entitlement requirements;
- platform-specific component property overrides.

These remain part of compilation even when the readable projection does not display them.

## 11. Complete example

This end-to-end example covers requirements, a model, state, components, a confirmation branch, connector results and motion:

```text
Create feature PurchaseConfirmation version 1.0.0 with id "studio.purchase-confirmation"

This feature requires:
  capability network
  capability purchase
  capability animation
  capability ui-overlays
  capability accessibility
  entitlement "commerce.purchase"

Define data Product with id "data.product"
  field id is text with id "field.product.id"
  field name is text with id "field.product.name"
  field price is money with id "field.product.price"

Remember these state values:
  state SelectedProduct is Product? scoped to feature = {"id":"headphones","name":"Studio Headphones","price":"$129.00"} with id "state.selected-product"
  state PurchaseStatus is idle | confirming | purchasing | success | failure scoped to screen = "idle" with id "state.purchase-status"

Show screen ProductScreen at route "/products/:productId" with id "screen.product"
  Add stack PurchaseLayout with id "component.purchase-layout"
    Add heading ProductTitle showing "Studio Headphones" with id "component.product-title"
    Add text ProductPrice showing "$129.00" with id "component.product-price"
    Add button BuyButton saying "Purchase" with id "component.buy-button"
    Add modal PurchaseConfirmation showing "Confirm purchase" hidden with id "component.purchase-confirmation"
    Add spinner PurchasingState hidden with id "component.purchase-spinner"
    Add card PurchaseSuccess hidden with id "component.purchase-success"
    Add card PurchaseError hidden with id "component.purchase-error"

When BuyButton is tapped:
  Set PurchaseStatus to confirming
  Ask "Purchase {SelectedProduct.name} for {SelectedProduct.price}?" with modal component.purchase-confirmation
    Use title "Confirm purchase"
    Use confirm button "Purchase"
    Use cancel button "Cancel"
  If the reader confirms:
    Set PurchaseStatus to purchasing
    Show purchase-spinner
    Call connector.purchase.operation.purchase with SelectedProduct -> purchase
    If purchase succeeds:
      Set PurchaseStatus to success
      Play animation purchase-success
      Show purchase-success
    Otherwise:
      Set PurchaseStatus to failure
      Show purchase-error

Define motion PurchaseSuccessAnimation lasting 900ms with id "motion.purchase-success"
  Animate PurchaseSuccess.scale with id "track.success-scale"
    At 0ms set value to 0.72 using bezier with id "key.success-scale.0"
    At 520ms set value to 1.08 using spring with id "key.success-scale.1"
    At 900ms set value to 1 using bezier with id "key.success-scale.2"
  Animate PurchaseSuccess.opacity with id "track.success-opacity"
    At 0ms set value to 0 using linear with id "key.success-opacity.0"
    At 220ms set value to 1 using bezier with id "key.success-opacity.1"
```

The repository's longer canonical example additionally includes secure storage, localization, image data and a reduced-motion composition.

## 12. Validation and diagnostics

Validation runs after source parsing and before compilation/runtime use.

| Diagnostic/code | Cause or rule |
| --- | --- |
| `FEATURE_SOURCE_SYNTAX` | Unsupported readable-language statement |
| `FEATURE_SOURCE_COMPONENT` | Source references an unknown component ID |
| `FEATURE_SOURCE_ASK` | No Ask node uses the referenced modal |
| `FEATURE_SOURCE_STRUCTURE` | Source attempted a structural edit not supported by the current parser |
| `FEATURE_SCHEMA` | Unsupported Feature IR schema version |
| `FEATURE_ID` | Invalid lowercase dotted feature identity |
| `FEATURE_VERSION` | Invalid semantic version |
| `FEATURE_ENTITLEMENT` | Missing release entitlement |
| `FEATURE_DUPLICATE_ID` | Stable ID reused |
| `FEATURE_COMPONENT_LIMIT` | More than 500 components |
| `FEATURE_BEHAVIOR_LIMIT` | More than 1,000 behavior nodes across the feature |
| `FEATURE_COMPONENT_UNKNOWN` | Component type is not registered |
| `FEATURE_ACCESSIBLE_NAME` | Interactive component has no accessible name |
| `FEATURE_TRIGGER_TARGET` | Behavior trigger component is missing |
| `FEATURE_EDGE_TARGET` | Wire references a missing node |
| `FEATURE_EDGE_PORT` | Wire references a missing port |
| `FEATURE_EDGE_TYPE` | Connected port types are incompatible |
| `FEATURE_BINDING_CYCLE` | Direct binding cycle detected |
| `FEATURE_URL_POLICY` | Non-local connector does not use HTTPS |
| `FEATURE_CREDENTIAL_REFERENCE` | Connector embeds/uses an invalid credential reference |
| `FEATURE_MOTION_TARGET` | Motion track targets a missing component |

Errors prevent source application or successful validation. Warnings describe a safe limitation, such as a structural source edit that was not applied.

## 13. Security and execution limits

Feature source has no:

- imports or dynamic imports;
- arbitrary JavaScript/native execution;
- reflection;
- filesystem or process access;
- direct shell access;
- ambient network access;
- recursive expression evaluator;
- embedded credential support.

Implemented limits include:

- 16 MiB compiled package limit;
- 500 components per feature;
- 1,000 behavior nodes per feature;
- 256 behavior execution steps per dispatch/resume;
- 500 retained runtime trace entries;
- 10,000 native Auto arrange nodes and 50,000 wires;
- 10,000 recorded live events at the recorder hard maximum;
- entitlement and capability checks before runtime state initialization;
- server-owned state mutation restrictions;
- package framing, length and SHA-256 verification.

Treat editable source, packages, network values, plugins and host responses as untrusted input. Client-side hiding of a node or control is never authorization.

## 14. Current editing boundaries

The formatter can project the complete current feature shape shown in this guide. The source parser is intentionally narrower.

### Source edits applied today

- feature name, version and ID when the header is valid;
- primary content on an existing heading, text, button, image, video or modal;
- an existing Ask node's message, title, confirmation label and cancellation label;
- legacy equivalents of those edits;
- formatting, symbols, completion and definition lookup.

### Source text recognized but not structurally created today

- new data/state/screen/component declarations;
- new behavior nodes or wires;
- new motions/tracks/keyframes;
- new connectors, bindings, tests, localizations or migrations.

Recognized lines remain safe during round-trip editing, but they do not imply that the current parser constructs a new object from a blank file. Use Design, Blueprints, Data and Motion for supported structural changes. Unsupported statements produce diagnostics rather than being executed or silently invented.

Blueprints are the supported current path for adding guided behavior nodes. Even there, reserved node kinds and some schema suggestions require further runtime/config implementation, as listed in the support matrix.

## 15. Legacy syntax

The parser keeps the earlier compact controlled syntax for compatibility:

```text
feature PurchaseConfirmation version 1.0.0 id "studio.purchase-confirmation"

button BuyButton saying "Legacy purchase" id "component.buy-button"
ask "Continue?" using component.purchase-confirmation
  title "Legacy title"
  confirm "Purchase"
  cancel "Cancel"
```

Formatting a feature produces the current English-forward form. Prefer current syntax for new work.

## 16. Troubleshooting

### “Unsupported controlled-language statement”

Use one of the exact statements in this guide. Check spelling, quoting and whether the statement belongs to a reserved/not-yet-editable area.

### “Source references unknown component”

The `with id` value does not exist in the current base Feature IR. Restore the stable ID or create/select the component through Design.

### A Blueprint wire is rejected

Verify both node IDs and port IDs, then compare port value types. Use a typed transform node when one becomes available; do not relabel the wire to bypass validation.

### A branch does not run

Check that Ask uses `confirmed`/`cancelled`, Action uses `success`/`failure`, and ordinary nodes use `next`. Node position has no execution effect.

### Auto arrange changes the graph shape

It changes only `position`. Cyclic nodes are placed on a shared dependency layer. Wires, configs, stable IDs and behavior semantics are unchanged.

### The feature compiles but will not load

Confirm that the host grants the feature entitlement and every declared capability, supports the target platform/components, registers required connectors, and satisfies the minimum runtime.

### A server state edit fails

State scoped to `server` must arrive through `acceptServerValue` or an authorized connector/event path; direct `setData` is rejected.

## 17. Glossary

| Term | Definition |
| --- | --- |
| Feature IR | Canonical serializable typed model shared by all authoring modes |
| Projection | A readable or visual representation derived from the IR |
| Stable ID | Persistent machine identity separate from a display name |
| Component | Typed visual or interactive element in a screen tree |
| Behavior flow | Event-triggered graph of nodes and typed edges |
| Node | One behavior operation or control point |
| Port | Typed input/output connection point on a node |
| Edge/wire | Directed connection from an output port to an input port |
| Outcome | Named control branch such as success, failure or confirmed |
| Binding | Bounded state-path mapping to a component property |
| Connector | Host-provided service contract used by Action nodes |
| Motion | Timed composition containing tracks and keyframes |
| Capability | Host functionality required by the feature |
| Entitlement | Permission/license required to load or call the feature |
| Host | Web, mobile, TV or desktop application executing the package |

## Source-of-truth implementation

- Language formatter/parser/service: [`packages/feature-language/src/index.ts`](../../packages/feature-language/src/index.ts)
- Feature model, registry and validation: [`packages/feature-model/src/index.ts`](../../packages/feature-model/src/index.ts)
- Executable example graph: [`packages/feature-model/src/examples.ts`](../../packages/feature-model/src/examples.ts)
- Runtime behavior: [`packages/feature-runtime/src/index.ts`](../../packages/feature-runtime/src/index.ts)
- Studio Blueprint editor: [`../tools/studio/src/composer/ComposerBehavior.tsx`](../../../tools/studio/src/composer/ComposerBehavior.tsx)
- Native Blueprint layout policy: [`../tools/studio/docs/architecture/0002-native-acceleration.md`](../../../tools/studio/docs/architecture/0002-native-acceleration.md)
- Security details: [`../security/threat-model.md`](../security/threat-model.md)
