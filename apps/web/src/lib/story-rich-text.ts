import { z } from "zod";
import type {
  StoryRichTextDocument,
  StoryRichTextNode,
} from "@harborline/contracts";

export const STORY_RICH_TEXT_SCHEMA_VERSION = 1 as const;
export const STORY_RICH_TEXT_MAX_BYTES = 750_000;
export const STORY_RICH_TEXT_MAX_NODES = 8_000;
export const STORY_RICH_TEXT_MAX_DEPTH = 24;

const allowedNodeTypes = new Set([
  "root",
  "paragraph",
  "text",
  "linebreak",
  "tab",
  "heading",
  "quote",
  "list",
  "listitem",
  "link",
  "autolink",
  "table",
  "tablerow",
  "tablecell",
  "code",
  "horizontalrule",
]);

export const storyRichTextDocumentSchema = z.custom<StoryRichTextDocument>(
  (value) => validateStoryRichTextDocument(value).valid,
  "The rich article document is invalid or contains unsupported content.",
);

export function validateStoryRichTextDocument(value: unknown): {
  valid: boolean;
  error?: string;
} {
  if (!isObject(value)) return { valid: false, error: "Document must be an object." };
  if (value.schemaVersion !== STORY_RICH_TEXT_SCHEMA_VERSION || value.editor !== "lexical") {
    return { valid: false, error: "Unsupported rich article document version." };
  }
  if (!isObject(value.state) || !isObject(value.state.root)) {
    return { valid: false, error: "Document root is missing." };
  }

  let serialized = "";
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { valid: false, error: "Document cannot be serialized." };
  }
  if (new TextEncoder().encode(serialized).byteLength > STORY_RICH_TEXT_MAX_BYTES) {
    return { valid: false, error: "Document exceeds the rich-copy size limit." };
  }

  let nodeCount = 0;
  const visit = (node: unknown, depth: number): string | null => {
    if (!isObject(node)) return "Every document node must be an object.";
    if (depth > STORY_RICH_TEXT_MAX_DEPTH) return "Document nesting is too deep.";
    if (++nodeCount > STORY_RICH_TEXT_MAX_NODES) return "Document contains too many nodes.";
    if (typeof node.type !== "string" || !allowedNodeTypes.has(node.type)) {
      return `Unsupported rich-copy node: ${String(node.type ?? "unknown")}.`;
    }
    if (typeof node.version !== "number" || !Number.isInteger(node.version) || node.version < 1) {
      return "A document node has an invalid version.";
    }
    if (node.type === "root" && depth !== 0) return "A root node cannot be nested.";
    if (node.type === "text" && (typeof node.text !== "string" || node.text.length > 100_000)) {
      return "A text node is invalid or too large.";
    }
    if ((node.type === "link" || node.type === "autolink") && !isSafeStoryLink(node.url)) {
      return "A link uses an unsupported or unsafe URL.";
    }
    if (node.children !== undefined && !Array.isArray(node.children)) {
      return "Document children must be an array.";
    }
    for (const child of Array.isArray(node.children) ? node.children : []) {
      const error = visit(child, depth + 1);
      if (error) return error;
    }
    return null;
  };

  const error = visit(value.state.root, 0);
  if (error) return { valid: false, error };
  if (value.state.root.type !== "root") return { valid: false, error: "Document root has the wrong type." };
  return { valid: true };
}

export function createPlainStoryRichTextDocument(
  paragraphs: string[],
): StoryRichTextDocument {
  const initialParagraphs = paragraphs.length > 0 ? paragraphs : [""];
  return {
    schemaVersion: STORY_RICH_TEXT_SCHEMA_VERSION,
    editor: "lexical",
    state: {
      root: {
        children: initialParagraphs.map((paragraph) => ({
          children: paragraph
            ? [{ detail: 0, format: 0, mode: "normal", style: "", text: paragraph, type: "text", version: 1 }]
            : [],
          direction: null,
          format: "",
          indent: 0,
          type: "paragraph",
          version: 1,
        })),
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    },
  };
}

export function richTextToPlainParagraphs(
  document: StoryRichTextDocument | null | undefined,
): string[] {
  if (!document) return [];
  const validation = validateStoryRichTextDocument(document);
  if (!validation.valid) return [];

  const paragraphs: string[] = [];
  const collectText = (node: StoryRichTextNode): string => {
    if (node.type === "text") return node.text ?? "";
    if (node.type === "linebreak") return "\n";
    if (node.type === "tab") return "\t";
    return (node.children ?? []).map(collectText).join("");
  };
  const visitBlocks = (node: StoryRichTextNode) => {
    if (["paragraph", "heading", "quote", "listitem", "tablecell", "code"].includes(node.type)) {
      const text = collectText(node).replace(/[ \t]+\n/g, "\n").trim();
      if (text) paragraphs.push(text);
      return;
    }
    for (const child of node.children ?? []) visitBlocks(child);
  };
  for (const child of document.state.root.children ?? []) visitBlocks(child);
  return paragraphs;
}

export function richTextWordCount(
  document: StoryRichTextDocument | null | undefined,
) {
  const text = richTextToPlainParagraphs(document).join(" ").trim();
  return text ? text.split(/\s+/).length : 0;
}

export function isSafeStoryLink(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
