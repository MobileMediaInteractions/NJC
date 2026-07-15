/// Tree-sitter grammar mirrors the implemented milestone syntax. It is kept dependency-free in this repository;
/// consumers generate a parser with the standard tree-sitter CLI.
module.exports = grammar({
  name: "pani",
  extras: ($) => [/\s/, $.comment],
  rules: {
    source_file: ($) => seq("language", $.number, "package", $.identifier, ";", repeat($.scene)),
    scene: ($) => seq("scene", field("name", $.identifier), "{", repeat(choice($.input, $.component, $.timeline, $.machine, $.reduced_motion)), "}"),
    input: ($) => seq("input", $.identifier, ":", $.identifier, "=", $.value, ";"),
    component: ($) => seq("component", $.identifier, $.identifier, "{", repeat(seq($.identifier, ":", $.value, ";")), "}"),
    timeline: ($) => seq("timeline", $.identifier, $.duration, "{", repeat($.track), "}"),
    track: ($) => seq("track", $.identifier, "{", repeat(seq($.duration, ":", $.number, optional(seq("ease", $.identifier)), ";")), "}"),
    machine: ($) => seq("machine", $.identifier, "initial", $.identifier, "{", repeat(choice(seq("state", $.identifier, ";"), $.transition)), "}"),
    transition: ($) => seq("transition", $.identifier, "->", $.identifier, "on", $.identifier, optional(seq("play", $.identifier)), optional(seq("emit", $.identifier)), ";"),
    reduced_motion: ($) => seq("reducedMotion", ":", $.identifier, ";"),
    value: ($) => choice($.string, $.color, $.duration, $.number, "true", "false"),
    duration: () => /-?\d+(?:\.\d+)?(?:ms|s|dp|sp|deg|%)/,
    number: () => /-?\d+(?:\.\d+)?/,
    color: () => /#[0-9A-Fa-f]{3,8}/,
    identifier: () => /[A-Za-z_][A-Za-z0-9_.-]*/,
    string: () => /"(?:\\.|[^"\\])*"/,
    comment: () => token(seq("//", /.*/)),
  },
});
