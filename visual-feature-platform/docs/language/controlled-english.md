# Controlled feature English

The temporary `.vfeature` language is a deterministic projection over Feature IR. It reads like instructions but is not natural-language interpretation.

## Initial grammar

```ebnf
feature       = "feature", Identifier, "version", Semver, "id", String, Newline,
                requirements, { data | state | screen | behavior | motion } ;
requirements  = "requires", Newline, Indent, { Capability, Newline },
                "entitlement", String, Newline, Dedent ;
data          = "data", Identifier, "id", String, Newline,
                Indent, { Identifier, Type, ["?"], "id", String, Newline }, Dedent ;
screen        = "screen", Identifier, "route", String, "id", String, Newline,
                component ;
component     = ComponentKind, Identifier, [content], ["hidden"], "id", String, Newline,
                [Indent, { component }, Dedent] ;
behavior      = "when", ComponentReference, "is", Event, Newline,
                Indent, { statement }, Dedent ;
statement     = set | ask | call | show | hide | play | navigate | wait | conditional ;
conditional   = "if", Condition, Newline, Indent, { statement }, Dedent,
                ["otherwise", Newline, Indent, { statement }, Dedent] ;
motion        = "motion", Identifier, "duration", Duration, "id", String, Newline,
                Indent, { track }, Dedent ;
track         = "animate", Reference, "id", String, Newline,
                Indent, { "at", Duration, "value", Number, "using", Interpolation, "id", String, Newline }, Dedent ;
```

Indentation is two spaces. Strings are quoted JSON strings. References are declared identifiers. Stable identity annotations are explicit so formatting, movement and rename do not replace object identity.

## Implemented statements

```text
when BuyButton is tapped
  set PurchaseStatus = confirming
  ask "Purchase {SelectedProduct.name}?" using component.purchase-confirmation
    title "Confirm purchase"
    confirm "Purchase"
    cancel "Cancel"
  if confirmed
    call connector.purchase.operation.purchase using SelectedProduct as purchase
    if purchase succeeds
      play purchase-success
      show purchase-success
    otherwise
      show purchase-error
```

The language service implements formatting, keywords, symbol indexing and definition ranges. The current source-to-IR parser safely updates declarations already represented by the vertical-slice model. Adding arbitrary new graph structure from source remains a documented next milestone and produces diagnostics when unsupported.

## Safety

There are no imports, reflection, dynamic native calls, process access, filesystem access, network access, recursion or executable expressions. Network and native operations are declared graph actions resolved through typed host contracts after capability and entitlement checks.
