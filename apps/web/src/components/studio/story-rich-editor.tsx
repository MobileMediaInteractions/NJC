"use client";

import { useCallback, useEffect, useState } from "react";
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type ElementFormatType,
  type LexicalEditor,
  type TextFormatType,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import {
  HorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND,
} from "@lexical/react/LexicalHorizontalRuleNode";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, $isQuoteNode, HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { CodeNode } from "@lexical/code";
import { TRANSFORMERS } from "@lexical/markdown";
import { $setBlocksType } from "@lexical/selection";
import { mergeRegister } from "@lexical/utils";
import {
  INSERT_TABLE_COMMAND,
  TableCellNode,
  TableNode,
  TableRowNode,
} from "@lexical/table";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Unlink,
} from "lucide-react";
import type { StoryRichTextDocument } from "@harborline/contracts";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { isSafeStoryLink, richTextToPlainParagraphs } from "@/lib/story-rich-text";

type RichEditorChange = {
  document: StoryRichTextDocument;
  paragraphs: string[];
};

export function StoryRichEditor({
  initialDocument,
  onChange,
  invalid,
}: {
  initialDocument: StoryRichTextDocument;
  onChange: (change: RichEditorChange) => void;
  invalid?: boolean;
}) {
  const [initialConfig] = useState(
    () => ({
      namespace: "NjCourierStoryComposer",
      editorState: JSON.stringify(initialDocument.state),
      nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        AutoLinkNode,
        CodeNode,
        TableNode,
        TableRowNode,
        TableCellNode,
        HorizontalRuleNode,
      ],
      onError(error: Error) {
        throw error;
      },
      theme: {
        paragraph: "story-editor-paragraph",
        heading: { h2: "story-editor-h2", h3: "story-editor-h3" },
        quote: "story-editor-quote",
        code: "story-editor-code-block",
        link: "story-editor-link",
        list: {
          nested: { listitem: "story-editor-nested-listitem" },
          ol: "story-editor-ol",
          ul: "story-editor-ul",
          listitem: "story-editor-listitem",
          listitemChecked: "story-editor-listitem-checked",
          listitemUnchecked: "story-editor-listitem-unchecked",
        },
        text: {
          bold: "font-bold",
          italic: "italic",
          underline: "underline",
          strikethrough: "line-through",
          underlineStrikethrough: "underline line-through",
          code: "story-editor-code",
        },
        table: "story-editor-table",
        tableCell: "story-editor-table-cell",
        tableCellHeader: "story-editor-table-cell-header",
        tableRow: "story-editor-table-row",
      },
    }),
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`overflow-hidden rounded-xl border bg-background shadow-sm ${invalid ? "border-destructive" : "border-border"}`}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                id="body"
                aria-invalid={invalid}
                aria-label="Story body rich-text editor"
                className="story-editor-surface min-h-[38rem] px-6 py-7 text-base leading-8 outline-none sm:px-10"
              />
            }
            placeholder={
              <div className="pointer-events-none absolute left-6 top-7 text-muted-foreground sm:left-10">
                Write the story. Use the toolbar or Markdown shortcuts for structure.
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin validateUrl={isSafeStoryLink} />
          <TablePlugin hasCellMerge hasCellBackgroundColor={false} hasTabHandler />
          <HorizontalRulePlugin />
          <TabIndentationPlugin />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange
            onChange={(editorState) => {
              const document = {
                schemaVersion: 1,
                editor: "lexical",
                state: editorState.toJSON(),
              } as StoryRichTextDocument;
              onChange({ document, paragraphs: richTextToPlainParagraphs(document) });
            }}
          />
        </div>
      </div>
    </LexicalComposer>
  );
}

type BlockType = "paragraph" | "h2" | "h3" | "quote" | "bullet" | "number" | "check";

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [alignment, setAlignment] = useState<ElementFormatType>("left");
  const [formats, setFormats] = useState<Record<string, boolean>>({});
  const [hasLink, setHasLink] = useState(false);

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    setFormats({
      bold: selection.hasFormat("bold"),
      italic: selection.hasFormat("italic"),
      underline: selection.hasFormat("underline"),
      strikethrough: selection.hasFormat("strikethrough"),
      code: selection.hasFormat("code"),
    });
    const anchor = selection.anchor.getNode();
    const top = anchor.getKey() === "root" ? anchor : anchor.getTopLevelElementOrThrow();
    setAlignment($isElementNode(top) ? (top.getFormatType() || "left") : "left");
    if ($isHeadingNode(top)) setBlockType(top.getTag() as "h2" | "h3");
    else if ($isQuoteNode(top)) setBlockType("quote");
    else if ($isListNode(top)) setBlockType(top.getListType() as "bullet" | "number" | "check");
    else setBlockType("paragraph");
    setHasLink(selection.getNodes().some((node) => node.getParent()?.getType() === "link"));
  }, []);

  useEffect(
    () => mergeRegister(
      editor.registerUpdateListener(({ editorState }) => editorState.read(updateToolbar)),
      editor.registerCommand(SELECTION_CHANGE_COMMAND, () => { updateToolbar(); return false; }, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(CAN_UNDO_COMMAND, (value) => { setCanUndo(value); return false; }, COMMAND_PRIORITY_CRITICAL),
      editor.registerCommand(CAN_REDO_COMMAND, (value) => { setCanRedo(value); return false; }, COMMAND_PRIORITY_CRITICAL),
    ),
    [editor, updateToolbar],
  );

  function setBlock(next: BlockType) {
    if (next === "bullet") editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    else if (next === "number") editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    else if (next === "check") editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        $setBlocksType(selection, () =>
          next === "h2" || next === "h3"
            ? $createHeadingNode(next)
            : next === "quote"
              ? $createQuoteNode()
              : $createParagraphNode(),
        );
      });
    }
  }

  function toggleLink() {
    if (hasLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      return;
    }
    const entered = window.prompt("Paste or enter a secure link (https://, mailto: or a local /path)");
    if (!entered) return;
    const normalized = /^([a-z]+:|\/)/i.test(entered) ? entered : `https://${entered}`;
    if (!isSafeStoryLink(normalized)) {
      window.alert("That link is not supported. Use HTTPS, mailto, or a local site path.");
      return;
    }
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: normalized, target: /^https?:/i.test(normalized) ? "_blank" : null });
  }

  function clearFormatting() {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      for (const node of selection.getNodes()) {
        if ($isTextNode(node)) {
          node.setFormat(0);
          node.setStyle("");
        }
      }
      $setBlocksType(selection, () => $createParagraphNode());
    });
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1 border-b bg-background/95 p-2 backdrop-blur" role="toolbar" aria-label="Article formatting">
      <ToolButton label="Undo" disabled={!canUndo} onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} icon={<Undo2 />} />
      <ToolButton label="Redo" disabled={!canRedo} onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} icon={<Redo2 />} />
      <ToolbarDivider />
      <ToolButton label="Paragraph" active={blockType === "paragraph"} onClick={() => setBlock("paragraph")} icon={<Pilcrow />} />
      <ToolButton label="Heading 2" active={blockType === "h2"} onClick={() => setBlock("h2")} icon={<Heading2 />} />
      <ToolButton label="Heading 3" active={blockType === "h3"} onClick={() => setBlock("h3")} icon={<Heading3 />} />
      <ToolButton label="Quote" active={blockType === "quote"} onClick={() => setBlock("quote")} icon={<Quote />} />
      <ToolbarDivider />
      <FormatButton editor={editor} format="bold" active={formats.bold} label="Bold" icon={<Bold />} />
      <FormatButton editor={editor} format="italic" active={formats.italic} label="Italic" icon={<Italic />} />
      <FormatButton editor={editor} format="underline" active={formats.underline} label="Underline" icon={<Underline />} />
      <FormatButton editor={editor} format="strikethrough" active={formats.strikethrough} label="Strikethrough" icon={<Strikethrough />} />
      <FormatButton editor={editor} format="code" active={formats.code} label="Inline code" icon={<Code2 />} />
      <ToolbarDivider />
      <ToolButton label="Bulleted list" active={blockType === "bullet"} onClick={() => setBlock("bullet")} icon={<List />} />
      <ToolButton label="Numbered list" active={blockType === "number"} onClick={() => setBlock("number")} icon={<ListOrdered />} />
      <ToolButton label="Checklist" active={blockType === "check"} onClick={() => setBlock("check")} icon={<CheckSquare />} />
      <ToolButton label={hasLink ? "Remove link" : "Add link"} active={hasLink} onClick={toggleLink} icon={hasLink ? <Unlink /> : <Link2 />} />
      <ToolButton label="Insert 3 by 3 table" onClick={() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns: "3", rows: "3", includeHeaders: true })} icon={<Table2 />} />
      <ToolButton label="Insert horizontal separator" onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} icon={<Minus />} />
      <ToolbarDivider />
      <AlignButton editor={editor} alignment="left" active={alignment === "left" || alignment === "start"} label="Align left" icon={<AlignLeft />} />
      <AlignButton editor={editor} alignment="center" active={alignment === "center"} label="Align center" icon={<AlignCenter />} />
      <AlignButton editor={editor} alignment="right" active={alignment === "right" || alignment === "end"} label="Align right" icon={<AlignRight />} />
      <AlignButton editor={editor} alignment="justify" active={alignment === "justify"} label="Justify" icon={<AlignJustify />} />
      <ToolButton label="Clear formatting" onClick={clearFormatting} icon={<Eraser />} />
    </div>
  );
}

function FormatButton({ editor, format, active, label, icon }: { editor: LexicalEditor; format: TextFormatType; active?: boolean; label: string; icon: React.ReactNode }) {
  return <ToolButton label={label} active={active} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, format)} icon={icon} />;
}

function AlignButton({ editor, alignment, active, label, icon }: { editor: LexicalEditor; alignment: ElementFormatType; active: boolean; label: string; icon: React.ReactNode }) {
  return <ToolButton label={label} active={active} onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment)} icon={icon} />;
}

function ToolButton({ label, icon, active, disabled, onClick }: { label: string; icon: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="shrink-0"
    >
      {icon}
    </Button>
  );
}

function ToolbarDivider() {
  return <Separator orientation="vertical" className="mx-1 h-6" />;
}
