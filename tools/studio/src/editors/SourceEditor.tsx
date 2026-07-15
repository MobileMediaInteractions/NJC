import Editor, { loader, type Monaco } from "@monaco-editor/react";
import * as monacoApi from "monaco-editor/esm/vs/editor/editor.api.js";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { AnimationLanguageService } from "@platform/runtime/tooling";
import type { Diagnostic } from "@platform/runtime/animation";
import { useEffect } from "react";
import type { ThemeMode } from "../model/protocol";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco: monacoApi });
const service = new AnimationLanguageService();
let languageRegistered = false;

function registerLanguage(monaco: Monaco) {
  if (languageRegistered) return;
  languageRegistered = true;
  monaco.languages.register({ id: "pani", extensions: [".pani"], aliases: ["Platform Animation"] });
  monaco.languages.setMonarchTokensProvider("pani", {
    keywords: ["language", "package", "scene", "input", "component", "timeline", "track", "machine", "state", "transition", "initial", "on", "play", "emit", "ease", "reducedMotion"],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/, "number.hex"],
        [/-?\d+(?:\.\d+)?(?:ms|s|dp|sp|deg|%)?/, "number"],
        [/"(?:[^"\\]|\\.)*"/, "string"],
        [/[A-Za-z_][\w.-]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      ],
    },
  });
  monaco.languages.registerCompletionItemProvider("pani", {
    provideCompletionItems(model: monacoApi.editor.ITextModel, position: monacoApi.Position) {
      const source = model.getValue();
      const offset = model.getOffsetAt(position);
      return {
        suggestions: service.complete(source, offset).map((item) => ({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: item.label,
          documentation: item.documentation,
          range: undefined,
        })),
      };
    },
  });
  monaco.languages.registerHoverProvider("pani", {
    provideHover(model: monacoApi.editor.ITextModel, position: monacoApi.Position) {
      const result = service.hover(model.getValue(), model.getOffsetAt(position));
      return result ? { contents: [{ value: result.markdown }] } : null;
    },
  });
  monaco.languages.registerDefinitionProvider("pani", {
    provideDefinition(model: monacoApi.editor.ITextModel, position: monacoApi.Position) {
      const result = service.definition(model.getValue(), model.getOffsetAt(position));
      if (!result) return null;
      return { uri: model.uri, range: new monaco.Range(result.span.start.line, result.span.start.column, result.span.end.line, result.span.end.column) };
    },
  });
  monaco.languages.registerDocumentSymbolProvider("pani", {
    provideDocumentSymbols(model: monacoApi.editor.ITextModel) {
      return service.documentSymbols(model.getValue()).map((symbol) => ({
        name: symbol.name,
        detail: symbol.kind,
        kind: monaco.languages.SymbolKind.Object,
        range: new monaco.Range(symbol.span.start.line, symbol.span.start.column, symbol.span.end.line, symbol.span.end.column),
        selectionRange: new monaco.Range(symbol.span.start.line, symbol.span.start.column, symbol.span.end.line, symbol.span.end.column),
      }));
    },
  });
}

function toMarkers(diagnostics: Diagnostic[]): monacoApi.editor.IMarkerData[] {
  return diagnostics.map((item) => ({
    severity: item.severity === "error" ? monacoApi.MarkerSeverity.Error : monacoApi.MarkerSeverity.Warning,
    message: `${item.code}: ${item.message}`,
    startLineNumber: Math.max(1, item.span.start.line),
    startColumn: Math.max(1, item.span.start.column),
    endLineNumber: Math.max(1, item.span.end.line),
    endColumn: Math.max(2, item.span.end.column),
    code: item.code,
  }));
}

export function SourceEditor({ path, source, diagnostics, theme, onChange }: { path: string; source: string; diagnostics: Diagnostic[]; theme: ThemeMode; onChange: (value: string) => void }) {
  useEffect(() => {
    const model = monacoApi.editor.getModels().find((item) => item.uri.path.endsWith(path));
    if (model) monacoApi.editor.setModelMarkers(model, "pani", toMarkers(diagnostics));
  }, [diagnostics, path]);

  return (
    <Editor
      path={`file:///${path}`}
      language={path.endsWith(".pani") ? "pani" : path.endsWith(".json") ? "json" : "typescript"}
      value={source}
      theme={theme === "dark" ? "vs-dark" : "light"}
      beforeMount={registerLanguage}
      onMount={(editor, monaco) => {
        monaco.editor.setModelMarkers(editor.getModel()!, "pani", toMarkers(diagnostics));
        editor.addAction({
          id: "pani.format",
          label: "Format Animation Source",
          keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
          run: () => {
            try { onChange(service.format(editor.getValue())); } catch { /* Diagnostics already surface invalid source. */ }
          },
        });
      }}
      onChange={(value) => onChange(value ?? "")}
      options={{
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        fontFamily: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12.5,
        lineHeight: 20,
        minimap: { enabled: true, scale: 0.75 },
        padding: { top: 12 },
        renderWhitespace: "selection",
        smoothScrolling: true,
        wordWrap: "off",
        accessibilitySupport: "auto",
      }}
    />
  );
}
