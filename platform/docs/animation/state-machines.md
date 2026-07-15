# State machines

A machine declares an initial state, state set, and `from -> to on event` transitions. A transition can start a timeline and emit an event after its duration. The host can only send named events; assets cannot invoke arbitrary application functions. Frames report active states and emitted events for inspection.

Transition targets, timelines and duplicate states are validated. Nested/parallel machines, guards, priorities, timers, gestures, completion conditions and trace streams remain planned language/runtime work.
