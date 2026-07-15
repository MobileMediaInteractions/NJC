import {
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  type Position,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { AnimationLanguageService } from "../../src/tooling/language-service";

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const service = new AnimationLanguageService();
const position = (value: { line: number; column: number }): Position => ({ line: Math.max(0, value.line - 1), character: Math.max(0, value.column - 1) });

connection.onInitialize(() => ({ capabilities: {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  completionProvider: { resolveProvider: false },
  hoverProvider: true,
  definitionProvider: true,
  referencesProvider: true,
  renameProvider: { prepareProvider: false },
  documentFormattingProvider: true,
  documentSymbolProvider: true,
} }));

async function validate(document: TextDocument) {
  const diagnostics = service.validate(document.getText()).map((item) => ({
    severity: item.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    code: item.code,
    message: item.message,
    source: "pani",
    range: { start: position(item.span.start), end: position(item.span.end) },
  }));
  await connection.sendDiagnostics({ uri: document.uri, diagnostics });
}
documents.onDidChangeContent(({ document }) => void validate(document));
documents.onDidClose(({ document }) => connection.sendDiagnostics({ uri: document.uri, diagnostics: [] }));

connection.onCompletion(({ textDocument, position: requestPosition }) => {
  const document = documents.get(textDocument.uri); if (!document) return [];
  return service.complete(document.getText(), document.offsetAt(requestPosition)).map((item) => ({ label: item.label, kind: CompletionItemKind.Keyword, documentation: item.documentation }));
});
connection.onHover(({ textDocument, position: requestPosition }) => {
  const document = documents.get(textDocument.uri); if (!document) return null;
  const hover = service.hover(document.getText(), document.offsetAt(requestPosition));
  return hover ? { contents: { kind: "markdown", value: hover.markdown } } : null;
});
connection.onDefinition(({ textDocument, position: requestPosition }) => {
  const document = documents.get(textDocument.uri); if (!document) return null;
  const symbol = service.definition(document.getText(), document.offsetAt(requestPosition));
  return symbol ? { uri: textDocument.uri, range: { start: position(symbol.span.start), end: position(symbol.span.end) } } : null;
});
connection.onReferences(({ textDocument, position: requestPosition }) => {
  const document = documents.get(textDocument.uri); if (!document) return [];
  return service.references(document.getText(), document.offsetAt(requestPosition)).map((item) => ({ uri: textDocument.uri, range: { start: document.positionAt(item.start), end: document.positionAt(item.end) } }));
});
connection.onRenameRequest(({ textDocument, position: requestPosition, newName }) => {
  const document = documents.get(textDocument.uri); if (!document) return null;
  const edits = service.rename(document.getText(), document.offsetAt(requestPosition), newName).map((item) => ({ range: { start: document.positionAt(item.start), end: document.positionAt(item.end) }, newText: item.replacement }));
  return { changes: { [textDocument.uri]: edits } };
});
connection.onDocumentFormatting(({ textDocument }) => {
  const document = documents.get(textDocument.uri); if (!document) return [];
  try { return [{ range: { start: { line: 0, character: 0 }, end: document.positionAt(document.getText().length) }, newText: service.format(document.getText()) }]; }
  catch { return []; }
});
connection.onDocumentSymbol(({ textDocument }) => {
  const document = documents.get(textDocument.uri); if (!document) return [];
  return service.documentSymbols(document.getText()).map((item) => ({ name: item.name, kind: 13, range: { start: position(item.span.start), end: position(item.span.end) }, selectionRange: { start: position(item.span.start), end: position(item.span.end) }, detail: item.kind }));
});

documents.listen(connection);
connection.listen();
