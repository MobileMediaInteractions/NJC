import type { RenderFrame, RenderNode } from "./types";
export interface AnimationRenderer { readonly name: string; mount(target: unknown): void; render(frame: RenderFrame): void; dispose(): void; }
export interface HostPropertyAdapter { readonly supportedProperties: ReadonlySet<string>; apply(hostId: string, node: RenderNode): void; }

export class DomHostPropertyAdapter implements HostPropertyAdapter {
  readonly supportedProperties = new Set(["opacity", "x", "y", "scale", "rotation", "width", "height", "fill", "color", "cornerRadius", "text", "hostId"]);
  constructor(readonly root: ParentNode) {}
  apply(hostId: string, node: RenderNode) { const element = this.root.querySelector<HTMLElement>(`[data-platform-host="${CSS.escape(hostId)}"]`); if (!element) return; const p = node.properties; if (p.opacity !== undefined) element.style.opacity = String(p.opacity); const x = Number(p.x ?? 0); const y = Number(p.y ?? 0); const scale = Number(p.scale ?? 1); const rotation = Number(p.rotation ?? 0); element.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`; if (p.width !== undefined) element.style.width = `${p.width}px`; if (p.height !== undefined) element.style.height = `${p.height}px`; if (p.cornerRadius !== undefined) element.style.borderRadius = `${p.cornerRadius}px`; if (p.fill !== undefined) element.style.backgroundColor = String(p.fill); if (p.color !== undefined) element.style.color = String(p.color); if (p.text !== undefined) element.textContent = String(p.text); }
}

export class DomRenderer implements AnimationRenderer {
  readonly name = "dom-hybrid-v1"; #root: HTMLElement | null = null; #adapter: DomHostPropertyAdapter | null = null;
  mount(target: unknown) { if (!(target instanceof HTMLElement)) throw new Error("DOM renderer requires an HTMLElement"); this.#root = target; this.#adapter = new DomHostPropertyAdapter(target); }
  render(frame: RenderFrame) { if (!this.#root || !this.#adapter) throw new Error("Renderer is not mounted"); for (const node of frame.nodes) { const hostId = node.properties.hostId; if (node.kind === "host" && typeof hostId === "string") { this.#adapter.apply(hostId, node); continue; } let element = this.#root.querySelector<HTMLElement>(`[data-platform-node="${CSS.escape(node.id)}"]`); if (!element) { element = document.createElement(node.kind === "text" ? "span" : "div"); element.dataset.platformNode = node.id; element.style.position = "absolute"; this.#root.append(element); } applyElement(element, node); } }
  dispose() { this.#root?.querySelectorAll("[data-platform-node]").forEach((node) => node.remove()); this.#root = null; this.#adapter = null; }
}
function applyElement(element: HTMLElement, node: RenderNode) {
  const p = node.properties;
  element.style.opacity = String(p.opacity ?? 1);
  element.style.transform = `translate(${Number(p.x ?? 0)}px, ${Number(p.y ?? 0)}px) scale(${Number(p.scale ?? 1)}) rotate(${Number(p.rotation ?? 0)}deg)`;
  if (p.width !== undefined) element.style.width = `${p.width}px`;
  if (p.height !== undefined) element.style.height = `${p.height}px`;
  if (p.cornerRadius !== undefined) element.style.borderRadius = `${p.cornerRadius}px`;
  if (node.kind === "rect" && p.fill !== undefined) element.style.background = String(p.fill);
  if (p.color !== undefined) element.style.color = String(p.color);
  if (p.fontSize !== undefined) element.style.fontSize = `${p.fontSize}px`;
  if (p.fontWeight !== undefined) element.style.fontWeight = String(p.fontWeight);
  if (p.text !== undefined) element.textContent = String(p.text);
  if (node.kind === "image") {
    const source = String(p.source ?? "");
    element.style.backgroundImage = /^(?:data:image\/|https:)/i.test(source) ? `url(${JSON.stringify(source)})` : "none";
    element.style.backgroundPosition = "center"; element.style.backgroundRepeat = "no-repeat"; element.style.backgroundSize = "contain";
  }
  if (node.kind === "lottie") {
    element.dataset.lottieData = String(p.lottieData ?? "");
    element.dataset.lottieFrameRate = String(p.lottieFrameRate ?? "");
    element.dataset.lottieVersion = String(p.lottieVersion ?? "");
  }
  if (node.kind === "path" && p.path !== undefined) {
    let svg = element.querySelector<SVGSVGElement>("svg");
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.width = "100%"; svg.style.height = "100%"; svg.style.overflow = "visible";
      svg.append(document.createElementNS("http://www.w3.org/2000/svg", "path"));
      element.replaceChildren(svg);
    }
    svg.setAttribute("viewBox", `0 0 ${Number(p.width ?? 320)} ${Number(p.height ?? 140)}`);
    const path = svg.querySelector("path")!;
    path.setAttribute("d", String(p.path));
    path.setAttribute("fill", p.pathMode === "stroke" ? "none" : String(p.fill ?? "#000000"));
    path.setAttribute("stroke", p.pathMode === "stroke" ? String(p.fill ?? "#000000") : "none");
    path.setAttribute("stroke-width", String(p.strokeWidth ?? 1));
  }
}
