# Typed data binding

Inputs declare a type and default. `setInput` rejects incompatible values. String properties may reference `${inputName}` and are resolved at evaluation. Missing or mistyped inputs fail before rendering where possible.

Bindings are deliberately one-way and expression-free in v1: they cannot read files, call networks, reflect native objects or invoke host functions. Future deterministic expressions require a typed semantic model, bounded evaluator and explicit capability review.
