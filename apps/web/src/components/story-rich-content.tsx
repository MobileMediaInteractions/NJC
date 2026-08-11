import { Fragment, type ReactNode } from "react";
import type {
  StoryRichTextDocument,
  StoryRichTextNode,
} from "@harborline/contracts";
import { isSafeStoryLink, validateStoryRichTextDocument } from "@/lib/story-rich-text";

const textFormats = {
  bold: 1,
  italic: 2,
  strikethrough: 4,
  underline: 8,
  code: 16,
  subscript: 32,
  superscript: 64,
} as const;

export function StoryRichContent({
  document,
  fallback,
  dropCap = true,
  className = "",
}: {
  document?: StoryRichTextDocument | null;
  fallback: string[];
  dropCap?: boolean;
  className?: string;
}) {
  const validation = validateStoryRichTextDocument(document);
  if (!document || !validation.valid) {
    return (
      <div className={`space-y-6 ${className}`}>
        {fallback.map((paragraph, index) => (
          <p key={index} className={dropCap && index === 0 ? dropCapClass : ""}>{paragraph}</p>
        ))}
      </div>
    );
  }

  const children = document.state.root.children ?? [];
  const firstParagraphIndex = children.findIndex((node) => node.type === "paragraph");
  return (
    <div className={`story-rich-content ${className}`}>
      {children.map((node, index) => (
        <Fragment key={index}>
          {renderBlock(node, `${index}`, dropCap && index === firstParagraphIndex)}
        </Fragment>
      ))}
    </div>
  );
}

function renderBlock(node: StoryRichTextNode, key: string, dropCap: boolean): ReactNode {
  const children = renderChildren(node, key);
  const alignment = alignmentClass(node.format);
  switch (node.type) {
    case "paragraph":
      return <p key={key} className={`${dropCap ? dropCapClass : ""} ${alignment}`}>{children || <br />}</p>;
    case "heading": {
      const Tag = node.tag === "h3" ? "h3" : "h2";
      return <Tag key={key} className={alignment}>{children}</Tag>;
    }
    case "quote":
      return <blockquote key={key} className={alignment}>{children}</blockquote>;
    case "list": {
      if (node.listType === "number") {
        return <ol key={key} start={node.start ?? 1} className={alignment}>{children}</ol>;
      }
      return <ul key={key} data-list-type={node.listType ?? "bullet"} className={alignment}>{children}</ul>;
    }
    case "listitem":
      return (
        <li key={key} data-checked={typeof node.checked === "boolean" ? String(node.checked) : undefined}>
          {children}
        </li>
      );
    case "table":
      return <div key={key} className="story-rich-table-wrap"><table><tbody>{children}</tbody></table></div>;
    case "tablerow":
      return <tr key={key}>{children}</tr>;
    case "tablecell": {
      const Tag = (node.headerState ?? 0) > 0 ? "th" : "td";
      return <Tag key={key} colSpan={node.colSpan ?? 1} rowSpan={node.rowSpan ?? 1}>{children}</Tag>;
    }
    case "code":
      return <pre key={key} data-language={node.language || undefined}><code>{children}</code></pre>;
    case "horizontalrule":
      return <hr key={key} />;
    default:
      return renderInline(node, key);
  }
}

function renderInline(node: StoryRichTextNode, key: string): ReactNode {
  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    const format = typeof node.format === "number" ? node.format : 0;
    if (format & textFormats.code) content = <code>{content}</code>;
    if (format & textFormats.bold) content = <strong>{content}</strong>;
    if (format & textFormats.italic) content = <em>{content}</em>;
    if (format & textFormats.underline) content = <u>{content}</u>;
    if (format & textFormats.strikethrough) content = <s>{content}</s>;
    if (format & textFormats.subscript) content = <sub>{content}</sub>;
    if (format & textFormats.superscript) content = <sup>{content}</sup>;
    return <Fragment key={key}>{content}</Fragment>;
  }
  if (node.type === "linebreak") return <br key={key} />;
  if (node.type === "tab") return <span key={key} aria-hidden="true">&emsp;</span>;
  if ((node.type === "link" || node.type === "autolink") && isSafeStoryLink(node.url)) {
    const external = /^https?:/i.test(node.url);
    return (
      <a
        key={key}
        href={node.url}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {renderChildren(node, key)}
      </a>
    );
  }
  return <Fragment key={key}>{renderChildren(node, key)}</Fragment>;
}

function renderChildren(node: StoryRichTextNode, key: string) {
  return (node.children ?? []).map((child, index) =>
    ["paragraph", "heading", "quote", "list", "listitem", "table", "tablerow", "tablecell", "code", "horizontalrule"].includes(child.type)
      ? renderBlock(child, `${key}-${index}`, false)
      : renderInline(child, `${key}-${index}`),
  );
}

function alignmentClass(format: StoryRichTextNode["format"]) {
  const alignment = typeof format === "string" ? format : "";
  return ["left", "center", "right", "justify"].includes(alignment)
    ? `story-align-${alignment}`
    : "";
}

const dropCapClass = "first-letter:float-left first-letter:mr-2 first-letter:text-6xl first-letter:font-black first-letter:leading-[0.85] first-letter:text-brand-blue";
