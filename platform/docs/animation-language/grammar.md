# Animation language v1 grammar

The temporary source suffix is `.pani`. It is a working extension, not a public product name. Source is UTF-8, comments start with `//`, statements end with semicolons, and production runtimes never parse it.

```ebnf
program       = "language", "1", "package", identifier, ";", scene+ ;
scene         = "scene", identifier, "{", declaration*, "}" ;
declaration   = input | component | timeline | machine | reducedMotion ;
input         = "input", identifier, ":", inputType, "=", scalar, ";" ;
component     = "component", identifier, componentKind, "{", property*, "}" ;
property      = identifier, ":", scalar, ";" ;
timeline      = "timeline", identifier, duration, "{", track*, "}" ;
track         = "track", identifier, "{", keyframe+, "}" ;
keyframe      = duration, ":", number, [ "ease", identifier ], ";" ;
machine       = "machine", identifier, "initial", identifier, "{", machineItem*, "}" ;
machineItem   = "state", identifier, ";" | transition ;
transition    = "transition", identifier, "->", identifier, "on", identifier,
                [ "play", identifier ], [ "emit", identifier ], ";" ;
reducedMotion = "reducedMotion", ":", identifier, ";" ;
scalar        = number [ unit ] | string | color | boolean ;
duration      = number, ( "ms" | "s" ) ;
```

Language v1 implements strongly typed primitive inputs, engine/host components, numeric tracks, named timelines, state machines, host events and a reduced-motion timeline. Future language versions may add imports, constraints, gradients, typed expressions and nested machines; old behavior cannot change silently.

Limits default to 1 MB source, 100,000 tokens, 64 nesting levels, and package/compiler limits documented in the binary verifier. Diagnostics contain line/column source spans.
