# Readable feature language

For the complete top-to-bottom reference covering readable source, every current component/type, NJC Blueprints, node/port semantics, examples, validation, security and implementation boundaries, see [NJC feature language and Blueprints](authoring-language-and-blueprints.md).

The `.vfeature` language is a deterministic, English-forward projection over Feature IR. It deliberately mixes readable phrases with programming concepts such as stable IDs, typed references, state, calls, results, branches and scoped values. It is not free-form natural-language or AI interpretation.

## Authoring styles

NJC Studio exposes the same canonical model through two equivalent authoring styles:

- **Readable Source** for keyboard-first editing with statements such as `Create feature`, `When`, `Set`, `Call`, `If`, `Otherwise`, `Show` and `Play animation`.
- **NJC Blueprints** for visual node-and-wire editing with schema-filtered nodes, typed ports, inspectable configuration and draggable layout.

Edits in either style update Feature IR and are immediately reflected in Design, Data, Motion and Test. Existing controlled-source files remain accepted for backward compatibility.

## Grammar overview

```ebnf
feature       = "Create feature", Identifier, "version", Semver,
                "with id", String, Newline, requirements,
                { data | state | screen | behavior | motion } ;
requirements  = "This feature requires:", Newline,
                Indent, { "capability", Capability, Newline },
                "entitlement", String, Newline, Dedent ;
data          = "Define data", Identifier, "with id", String, Newline,
                Indent, { "field", Identifier, "is", Type,
                "with id", String, Newline }, Dedent ;
screen        = "Show screen", Identifier, "at route", String,
                "with id", String, Newline, component ;
component     = "Add", ComponentKind, Identifier, [content], ["hidden"],
                "with id", String, Newline, [Indent, { component }, Dedent] ;
behavior      = "When", ComponentReference, "is", Event, ":", Newline,
                Indent, { statement }, Dedent ;
statement     = set | ask | call | show | hide | play | navigate | wait | conditional ;
conditional   = "If", Condition, ":", Newline, Indent, { statement }, Dedent,
                ["Otherwise:", Newline, Indent, { statement }, Dedent] ;
motion        = "Define motion", Identifier, "lasting", Duration,
                "with id", String, Newline, Indent, { track }, Dedent ;
```

## Example

```text
When BuyButton is tapped:
  Set PurchaseStatus to confirming
  Ask "Purchase {SelectedProduct.name}?" with modal component.purchase-confirmation
    Use title "Review order"
    Use confirm button "Purchase"
    Use cancel button "Cancel"
  If the reader confirms:
    Call connector.purchase.operation.purchase with SelectedProduct -> purchase
    If purchase succeeds:
      Play animation purchase-success
      Show purchase-success
    Otherwise:
      Show purchase-error
```

Indentation is two spaces. Strings are quoted JSON strings. `with id` clauses preserve object identity across formatting, movement and rename operations.

## Safety and current edit boundary

The language has no imports, reflection, arbitrary native calls, process access, filesystem access, direct networking, recursion or executable expressions. Connector and host operations resolve only through typed runtime contracts after capability and entitlement checks.

The source-to-IR parser currently permits safe changes to existing declarations, component content and confirmation configuration. Visual Blueprints are the supported path for adding graph nodes. Unsupported source-level structural additions produce diagnostics instead of executing or silently changing behavior.
