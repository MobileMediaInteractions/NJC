import type { BehaviorEdge, BehaviorNode, FeatureComponent, FeatureIR, MotionComposition } from "./index";

const controlInput = [{ id: "in", label: "In", valueType: "control" as const }];
const controlOutput = [{ id: "next", label: "Next", valueType: "control" as const }];
const node = (id: string, kind: BehaviorNode["kind"], label: string, config: BehaviorNode["config"], x: number, y: number, outputs = controlOutput): BehaviorNode => ({ id, kind, label, config, inputs: kind === "event" ? [] : structuredClone(controlInput), outputs: structuredClone(outputs), position: { x, y } });
const edge = (id: string, fromNodeId: string, fromPortId: string, toNodeId: string, outcome?: BehaviorEdge["outcome"]): BehaviorEdge => ({ id, fromNodeId, fromPortId, toNodeId, toPortId: "in", valueType: "control", ...(outcome ? { outcome } : {}) });
const baseComponent = (id: string, name: string, type: string, properties: FeatureComponent["properties"], accessibilityName?: string): FeatureComponent => ({
  id, name, type, properties, layout: { kind: "stack", width: "fill", height: "content" }, accessibility: accessibilityName ? { name: accessibilityName } : {}, bindings: [], children: [],
});

const purchaseMotion: MotionComposition = {
  id: "motion.purchase-success", name: "PurchaseSuccessAnimation", durationMs: 900, reducedMotionAlternative: "motion.purchase-success-reduced", markers: [{ id: "marker.complete", name: "complete", timeMs: 900 }],
  tracks: [
    { id: "track.success-scale", targetComponentId: "component.purchase-success", property: "scale", keyframes: [
      { id: "key.success-scale.0", timeMs: 0, value: 0.72, interpolation: "bezier", cubicBezier: [0.17, 0.89, 0.32, 1.28], outgoingVelocity: 1.7 },
      { id: "key.success-scale.1", timeMs: 520, value: 1.08, interpolation: "spring", incomingVelocity: 1.7, outgoingVelocity: -0.3 },
      { id: "key.success-scale.2", timeMs: 900, value: 1, interpolation: "bezier", cubicBezier: [0.2, 0.8, 0.2, 1], incomingVelocity: -0.3 },
    ] },
    { id: "track.success-opacity", targetComponentId: "component.purchase-success", property: "opacity", keyframes: [
      { id: "key.success-opacity.0", timeMs: 0, value: 0, interpolation: "linear" },
      { id: "key.success-opacity.1", timeMs: 220, value: 1, interpolation: "bezier", cubicBezier: [0.16, 1, 0.3, 1] },
    ] },
  ],
};

export function createPurchaseFeature(): FeatureIR {
  const productImage = baseComponent("component.product-image", "ProductImage", "image", { source: "asset://headphones", opacity: 1 });
  productImage.bindings.push({ id: "binding.product-image", targetComponentId: productImage.id, targetProperty: "source", expression: "SelectedProduct.image", mode: "one-way", valueType: "image", changeAnimation: "crossfade" });
  const title = baseComponent("component.product-title", "ProductTitle", "heading", { text: "Studio Headphones", opacity: 1 });
  title.bindings.push({ id: "binding.product-title", targetComponentId: title.id, targetProperty: "text", expression: "SelectedProduct.name", mode: "one-way", valueType: "text" });
  const price = baseComponent("component.product-price", "ProductPrice", "text", { text: "$129.00", opacity: 1 });
  price.bindings.push({ id: "binding.product-price", targetComponentId: price.id, targetProperty: "text", expression: "SelectedProduct.price", mode: "one-way", valueType: "money", changeAnimation: "count" });
  const buy = baseComponent("component.buy-button", "BuyButton", "button", { label: "Purchase", opacity: 1 }, "Purchase Studio Headphones");
  const confirmation = baseComponent("component.purchase-confirmation", "PurchaseConfirmation", "modal", { title: "Confirm purchase", message: "Purchase Studio Headphones for $129.00?", visible: false, opacity: 1 }, "Purchase confirmation");
  const spinner = baseComponent("component.purchase-spinner", "PurchasingState", "spinner", { visible: false, opacity: 1 });
  const success = baseComponent("component.purchase-success", "PurchaseSuccess", "card", { title: "Purchase complete", visible: false, opacity: 0, scale: 0.72 }, "Purchase complete");
  const failure = baseComponent("component.purchase-error", "PurchaseError", "card", { title: "Purchase failed", visible: false, opacity: 1 }, "Purchase error");
  const root = baseComponent("component.purchase-layout", "PurchaseLayout", "stack", { gap: 18, padding: 24, opacity: 1 });
  root.layout = { kind: "stack", gap: 18, padding: 24, width: "fill", height: "fill", align: "stretch" };
  root.children = [productImage, title, price, buy, confirmation, spinner, success, failure];
  const branchOutputs = [
    { id: "confirmed", label: "Confirmed", valueType: "control" as const },
    { id: "cancelled", label: "Cancelled", valueType: "control" as const },
  ];
  const resultOutputs = [
    { id: "success", label: "Success", valueType: "control" as const },
    { id: "failure", label: "Failure", valueType: "control" as const },
  ];
  const nodes: BehaviorNode[] = [
    node("behavior.buy.event", "event", "BuyButton tapped", { componentId: buy.id, event: "tapped" }, 20, 40),
    node("behavior.buy.confirming", "set-state", "Set status to confirming", { state: "PurchaseStatus", value: "confirming" }, 20, 140),
    node("behavior.buy.ask", "ask", "Ask for confirmation", { modalId: confirmation.id, title: "Confirm purchase", message: "Purchase {SelectedProduct.name} for {SelectedProduct.price}?", confirm: "Purchase", cancel: "Cancel" }, 20, 240, branchOutputs),
    node("behavior.buy.purchasing", "set-state", "Set status to purchasing", { state: "PurchaseStatus", value: "purchasing" }, 20, 360),
    node("behavior.buy.loading", "show", "Show purchasing state", { componentId: spinner.id }, 20, 460),
    node("behavior.buy.action", "action", "Purchase SelectedProduct", { connectorId: "connector.purchase", operationId: "operation.purchase", input: "SelectedProduct", result: "purchase" }, 20, 560, resultOutputs),
    node("behavior.buy.success-state", "set-state", "Set status to success", { state: "PurchaseStatus", value: "success" }, -160, 690),
    node("behavior.buy.success-motion", "animation", "Play success animation", { motionId: purchaseMotion.id }, -160, 790),
    node("behavior.buy.success-show", "show", "Show purchase success", { componentId: success.id }, -160, 890),
    node("behavior.buy.failure-state", "set-state", "Set status to failure", { state: "PurchaseStatus", value: "failure" }, 210, 690),
    node("behavior.buy.failure-show", "show", "Show purchase error", { componentId: failure.id, message: "purchase.error.message" }, 210, 790),
  ];
  return {
    schemaVersion: 1,
    id: "studio.purchase-confirmation",
    name: "Purchase Confirmation",
    version: "1.0.0",
    minimumRuntime: "0.1.0",
    supportedPlatforms: ["web", "ios", "android", "tvos", "androidtv", "desktop"],
    entitlement: "commerce.purchase",
    capabilities: ["network", "secure-storage", "purchase", "animation", "ui-overlays", "accessibility", "localization"],
    designTokens: { "color.background": "#f6f1e8", "color.accent": "#176b50", "color.error": "#aa3e36", "space.unit": 4 },
    dataModels: [{ id: "data.product", name: "Product", fields: [
      { id: "field.product.id", name: "id", type: "text", validation: { required: true } },
      { id: "field.product.name", name: "name", type: "text", validation: { required: true } },
      { id: "field.product.price", name: "price", type: "money", validation: { required: true, minimum: 0 } },
      { id: "field.product.image", name: "image", type: "image", validation: { required: true } },
    ] }],
    state: [
      { id: "state.selected-product", name: "SelectedProduct", type: "Product?", scope: "feature", initialValue: { id: "studio-headphones", name: "Studio Headphones", price: "$129.00", image: "asset://headphones" } },
      { id: "state.purchase-status", name: "PurchaseStatus", type: "idle | confirming | purchasing | success | failure", scope: "screen", initialValue: "idle" },
      { id: "state.purchase-error", name: "PurchaseError", type: "text?", scope: "screen", initialValue: null },
    ],
    screens: [{ id: "screen.product", name: "ProductScreen", route: "/products/:productId", requiredEntitlement: "commerce.purchase", root }],
    behaviors: [{ id: "behavior.buy", name: "CompletePurchase", trigger: { componentId: buy.id, event: "tapped" }, nodes, edges: [
      edge("edge.buy.1", nodes[0]!.id, "next", nodes[1]!.id), edge("edge.buy.2", nodes[1]!.id, "next", nodes[2]!.id),
      edge("edge.buy.confirmed", nodes[2]!.id, "confirmed", nodes[3]!.id, "confirmed"), edge("edge.buy.3", nodes[3]!.id, "next", nodes[4]!.id),
      edge("edge.buy.4", nodes[4]!.id, "next", nodes[5]!.id), edge("edge.buy.success", nodes[5]!.id, "success", nodes[6]!.id, "success"),
      edge("edge.buy.success.2", nodes[6]!.id, "next", nodes[7]!.id), edge("edge.buy.success.3", nodes[7]!.id, "next", nodes[8]!.id),
      edge("edge.buy.failure", nodes[5]!.id, "failure", nodes[9]!.id, "failure"), edge("edge.buy.failure.2", nodes[9]!.id, "next", nodes[10]!.id),
    ] }],
    connectors: [{ id: "connector.purchase", name: "PurchaseService", kind: "host", credentialReference: "host:purchase-service", capabilities: ["purchase", "network"], entitlement: "commerce.purchase", operations: [{ id: "operation.purchase", name: "Purchase", method: "POST", path: "/purchases", inputType: "Product", outputType: "PurchaseReceipt", timeoutMs: 15_000, retry: { attempts: 1, baseDelayMs: 0, exponential: false }, mockResult: { receiptId: "demo-receipt", status: "approved" } }] }],
    motions: [purchaseMotion, { id: "motion.purchase-success-reduced", name: "PurchaseSuccessReduced", durationMs: 120, markers: [], tracks: [{ id: "track.success-opacity-reduced", targetComponentId: success.id, property: "opacity", keyframes: [{ id: "key.reduced.0", timeMs: 0, value: 0, interpolation: "linear" }, { id: "key.reduced.1", timeMs: 120, value: 1, interpolation: "linear" }] }] }],
    localizations: { "en-US": { "purchase.title": "Confirm purchase", "purchase.action": "Purchase", "purchase.success": "Purchase complete" }, "es-US": { "purchase.title": "Confirmar compra", "purchase.action": "Comprar", "purchase.success": "Compra completada" } },
    tests: [{ id: "test.purchase-success", name: "Successful purchase", steps: [
      { id: "test.step.open", action: "open", target: "ProductScreen" }, { id: "test.step.tap", action: "tap", target: "BuyButton" },
      { id: "test.step.confirm", action: "confirm", target: "PurchaseConfirmation", value: true }, { id: "test.step.state", action: "expect-state", target: "PurchaseStatus", value: "success" },
      { id: "test.step.visible", action: "expect-visible", target: "PurchaseSuccess" }, { id: "test.step.animation", action: "expect-animation", target: "PurchaseSuccessAnimation" },
    ] }],
    migrations: [],
  };
}

export function createLiveInformationFeature(): FeatureIR {
  const root = baseComponent("component.live-layout", "LiveLayout", "stack", { gap: 14, padding: 20, opacity: 1 });
  root.layout = { kind: "grid", gap: 14, padding: 20, width: "fill", height: "fill" };
  const title = baseComponent("component.live-title", "LiveTitle", "heading", { text: "Live information", opacity: 1 });
  const score = baseComponent("component.live-score", "ScoreText", "heading", { text: "42", opacity: 1 });
  score.bindings.push({ id: "binding.live-score", targetComponentId: score.id, targetProperty: "text", expression: "LiveScore.total", mode: "one-way", valueType: "number", changeAnimation: "count" });
  const image = baseComponent("component.live-image", "RemoteImage", "image", { source: "https://images.example.test/score.jpg", opacity: 1 });
  const video = baseComponent("component.live-video", "LiveVideo", "video", { source: "fixture://live-video", opacity: 1 }, "Simulated live video");
  const connection = baseComponent("component.connection", "ConnectionState", "badge", { value: "Connected", opacity: 1 });
  root.children = [title, score, image, video, connection];
  return {
    schemaVersion: 1, id: "studio.live-information", name: "Live Information", version: "1.0.0", minimumRuntime: "0.1.0",
    supportedPlatforms: ["web", "ios", "android", "desktop"], entitlement: "data.live", capabilities: ["network", "media", "animation", "accessibility"],
    designTokens: { "color.increase": "#16845d", "color.decrease": "#b4433a" }, dataModels: [{ id: "data.live-score", name: "LiveScore", fields: [{ id: "field.score.total", name: "total", type: "number" }, { id: "field.score.image", name: "image", type: "image", optional: true }] }],
    state: [{ id: "state.live-score", name: "LiveScore", type: "LiveScore", scope: "server", initialValue: { total: 42, image: "https://images.example.test/score.jpg" } }, { id: "state.connection", name: "ConnectionStatus", type: "connected | reconnecting | stale", scope: "feature", initialValue: "connected" }],
    screens: [{ id: "screen.live", name: "LiveDashboard", route: "/live", root }], behaviors: [],
    connectors: [{ id: "connector.live", name: "LiveScoreFeed", kind: "websocket", baseUrl: "https://realtime.example.test", credentialReference: "host:live-feed", capabilities: ["network"], operations: [{ id: "operation.live.subscribe", name: "Subscribe", method: "SUBSCRIBE", path: "/scores", outputType: "LiveScore", timeoutMs: 10_000, retry: { attempts: 8, baseDelayMs: 500, exponential: true } }], realtime: { reconnect: true, maxBackoffMs: 30_000, staleAfterMs: 10_000, maxEventsPerSecond: 10, keepLastValue: true } }],
    motions: [{ id: "motion.score-change", name: "ScoreChange", durationMs: 400, markers: [], tracks: [{ id: "track.score-opacity", targetComponentId: score.id, property: "opacity", keyframes: [{ id: "key.score.0", timeMs: 0, value: 0.65, interpolation: "linear" }, { id: "key.score.1", timeMs: 400, value: 1, interpolation: "spring" }] }] }],
    localizations: { "en-US": { "live.title": "Live information", "live.stale": "Updates delayed" } }, tests: [{ id: "test.live-reconnect", name: "Connection recovery", steps: [{ id: "live.step.open", action: "open", target: "LiveDashboard" }, { id: "live.step.emit", action: "emit", target: "LiveScoreFeed", value: { total: 43 } }, { id: "live.step.state", action: "expect-state", target: "ConnectionStatus", value: "connected" }] }], migrations: [],
  };
}
