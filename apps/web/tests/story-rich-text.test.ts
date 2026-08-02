import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StoryRichContent } from "../src/components/story-rich-content";
import {
  createPlainStoryRichTextDocument,
  richTextToPlainParagraphs,
  storyRichTextDocumentSchema,
  validateStoryRichTextDocument,
} from "../src/lib/story-rich-text";

test("plain paragraphs receive a valid portable rich document", () => {
  const document = createPlainStoryRichTextDocument([
    "Council members adopted the budget.",
    "The vote followed a public hearing.",
  ]);

  assert.equal(storyRichTextDocumentSchema.safeParse(document).success, true);
  assert.deepEqual(richTextToPlainParagraphs(document), [
    "Council members adopted the budget.",
    "The vote followed a public hearing.",
  ]);
});

test("unsafe nodes and links are rejected before persistence", () => {
  const unsafeNode = createPlainStoryRichTextDocument(["Verified copy."]);
  unsafeNode.state.root.children!.push({ type: "script", version: 1, text: "alert(1)" });
  assert.equal(validateStoryRichTextDocument(unsafeNode).valid, false);

  const unsafeLink = createPlainStoryRichTextDocument([]);
  unsafeLink.state.root.children = [{
    type: "paragraph",
    version: 1,
    children: [{
      type: "link",
      version: 1,
      url: "javascript:alert(1)",
      children: [{ type: "text", version: 1, text: "Unsafe", format: 0 }],
    }],
  }];
  assert.equal(validateStoryRichTextDocument(unsafeLink).valid, false);
});

test("public rendering supports rich structure without injecting raw HTML", () => {
  const document = createPlainStoryRichTextDocument([]);
  document.state.root.children = [
    {
      type: "heading",
      tag: "h2",
      version: 1,
      children: [{ type: "text", version: 1, text: "What changed", format: 1 }],
    },
    {
      type: "paragraph",
      version: 1,
      children: [
        { type: "text", version: 1, text: "Read the ", format: 0 },
        {
          type: "link",
          version: 1,
          url: "https://www.thejerseycourier.com/latest",
          children: [{ type: "text", version: 1, text: "latest report", format: 8 }],
        },
        { type: "text", version: 1, text: " <script>never</script>", format: 0 },
      ],
    },
  ];

  const html = renderToStaticMarkup(createElement(StoryRichContent, {
    document,
    fallback: ["Fallback"],
  }));
  assert.match(html, /<h2[^>]*><strong>What changed<\/strong><\/h2>/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /&lt;script&gt;never&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test("invalid rich copy fails closed to portable paragraphs", () => {
  const invalid = createPlainStoryRichTextDocument(["Hidden rich copy"]);
  invalid.state.root.children = [{ type: "unknown", version: 1, text: "Bad" }];
  const html = renderToStaticMarkup(createElement(StoryRichContent, {
    document: invalid,
    fallback: ["Visible fallback"],
  }));
  assert.match(html, /Visible fallback/);
  assert.doesNotMatch(html, /Bad/);
});
