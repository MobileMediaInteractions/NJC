import assert from "node:assert/strict";
import test from "node:test";
import {
  generateWhyItMatters,
  WHY_IT_MATTERS_MAX_CHARACTERS,
} from "../src/lib/why-it-matters";

test("selects article language that explains the local impact", () => {
  const result = generateWhyItMatters({
    headline: "Council approves the Route 9 redevelopment plan",
    dek: "The township council approved the proposal Tuesday after a three-hour hearing.",
    body: [
      "The plan permits six new buildings on the former warehouse property.",
      "Residents could see more traffic near two schools, while the project is expected to add 140 housing units.",
    ],
  });

  assert.match(result, /Residents could see more traffic/i);
  assert.ok(result.length <= WHY_IT_MATTERS_MAX_CHARACTERS);
});

test("fits long source copy without breaking the final word", () => {
  const result = generateWhyItMatters({
    headline: "School board introduces a new district budget",
    dek: "The proposed school budget affects classroom staffing, after-school services, transportation schedules, building repairs, technology purchases, athletic programs, and the property taxes paid by families throughout the district next year.",
    body: [],
  });

  assert.ok(result.length <= WHY_IT_MATTERS_MAX_CHARACTERS);
  assert.match(result, /…$/);
  assert.doesNotMatch(result, /\s…$/);
});

test("returns no callout when the article contains no usable copy", () => {
  assert.equal(generateWhyItMatters({ headline: "Untitled", dek: "", body: [] }), "");
});
