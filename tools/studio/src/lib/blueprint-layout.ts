import type { BlueprintLayoutEdge, BlueprintLayoutNode, BlueprintLayoutResult } from "../model/protocol";

const maximumNodes = 10_000;
const maximumEdges = 50_000;
const defaultWidth = 190;
const defaultHeight = 60;
const compareIds = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;

function dimension(value: number | undefined, fallback: number) {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved < 24 || resolved > 2_000) throw new Error("Blueprint node dimensions must be finite and between 24 and 2,000");
  return resolved;
}

/** Browser reference implementation for the native Rust SCC-layered engine. */
export function layoutBlueprintGraphFallback(nodes: BlueprintLayoutNode[], edges: BlueprintLayoutEdge[]): BlueprintLayoutResult {
  const started = performance.now();
  if (nodes.length > maximumNodes) throw new Error(`Blueprint exceeds the ${maximumNodes} node layout limit`);
  if (edges.length > maximumEdges) throw new Error(`Blueprint exceeds the ${maximumEdges} wire layout limit`);
  if (nodes.length === 0) return { positions: [], width: 0, height: 0, durationMicros: Math.round((performance.now() - started) * 1_000), cyclic: false, engine: "typescript-scc-layered-v1" };

  const indexById = new Map<string, number>();
  const dimensions = nodes.map((node, index) => {
    if (!/^[A-Za-z0-9._:/-]{1,256}$/.test(node.id)) throw new Error("Blueprint node IDs must contain 1 to 256 portable ID characters");
    if (indexById.has(node.id)) throw new Error(`Duplicate Blueprint node ID: ${node.id}`);
    indexById.set(node.id, index);
    return { width: dimension(node.width, defaultWidth), height: dimension(node.height, defaultHeight) };
  });
  const adjacency = Array.from({ length: nodes.length }, () => [] as number[]);
  const reverse = Array.from({ length: nodes.length }, () => [] as number[]);
  let hasSelfEdge = false;
  for (const edge of edges) {
    const from = indexById.get(edge.fromNodeId);
    const to = indexById.get(edge.toNodeId);
    if (from === undefined) throw new Error(`Unknown Blueprint source node: ${edge.fromNodeId}`);
    if (to === undefined) throw new Error(`Unknown Blueprint destination node: ${edge.toNodeId}`);
    hasSelfEdge ||= from === to;
    adjacency[from]!.push(to);
    reverse[to]!.push(from);
  }
  for (const neighbors of [...adjacency, ...reverse]) {
    neighbors.sort((left, right) => compareIds(nodes[left]!.id, nodes[right]!.id));
    for (let index = neighbors.length - 1; index > 0; index -= 1) if (neighbors[index] === neighbors[index - 1]) neighbors.splice(index, 1);
  }

  const orderedIndices = nodes.map((_, index) => index).sort((left, right) => compareIds(nodes[left]!.id, nodes[right]!.id));
  const visited = Array(nodes.length).fill(false) as boolean[];
  const finishOrder: number[] = [];
  for (const start of orderedIndices) {
    if (visited[start]) continue;
    visited[start] = true;
    const stack: { node: number; neighbor: number }[] = [{ node: start, neighbor: 0 }];
    while (stack.length > 0) {
      const current = stack.at(-1)!;
      const next = adjacency[current.node]![current.neighbor];
      if (next !== undefined) {
        current.neighbor += 1;
        if (!visited[next]) {
          visited[next] = true;
          stack.push({ node: next, neighbor: 0 });
        }
      } else {
        finishOrder.push(stack.pop()!.node);
      }
    }
  }

  const componentOf = Array(nodes.length).fill(-1) as number[];
  const components: number[][] = [];
  for (const start of finishOrder.reverse()) {
    if (componentOf[start] !== -1) continue;
    const component = components.length;
    const members: number[] = [];
    const queue = [start];
    componentOf[start] = component;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor]!;
      members.push(current);
      for (const next of reverse[current]!) {
        if (componentOf[next] === -1) {
          componentOf[next] = component;
          queue.push(next);
        }
      }
    }
    members.sort((left, right) => compareIds(nodes[left]!.id, nodes[right]!.id));
    components.push(members);
  }

  const componentKeys = components.map((members) => nodes[members[0]!]!.id);
  const componentEdges = components.map(() => new Set<number>());
  const indegree = components.map(() => 0);
  adjacency.forEach((neighbors, from) => {
    for (const to of neighbors) {
      const sourceComponent = componentOf[from]!;
      const destinationComponent = componentOf[to]!;
      if (sourceComponent !== destinationComponent && !componentEdges[sourceComponent]!.has(destinationComponent)) {
        componentEdges[sourceComponent]!.add(destinationComponent);
        indegree[destinationComponent]! += 1;
      }
    }
  });
  const layers = components.map(() => 0);
  const ready = components.map((_, index) => index).filter((index) => indegree[index] === 0);
  const sortReady = () => ready.sort((left, right) => compareIds(componentKeys[left]!, componentKeys[right]!));
  sortReady();
  while (ready.length > 0) {
    const component = ready.shift()!;
    for (const next of [...componentEdges[component]!].sort((left, right) => compareIds(componentKeys[left]!, componentKeys[right]!))) {
      layers[next] = Math.max(layers[next]!, layers[component]! + 1);
      indegree[next]! -= 1;
      if (indegree[next] === 0) {
        ready.push(next);
        sortReady();
      }
    }
  }

  const nodesByLayer = Array.from({ length: Math.max(...layers) + 1 }, () => [] as number[]);
  components.forEach((members, component) => nodesByLayer[layers[component]!]!.push(...members));
  for (const members of nodesByLayer) {
    members.sort((left, right) => {
      const componentOrder = compareIds(componentKeys[componentOf[left]!]!, componentKeys[componentOf[right]!]!);
      return componentOrder || compareIds(nodes[left]!.id, nodes[right]!.id);
    });
  }
  const layerWidths = nodesByLayer.map((members) => Math.max(defaultWidth, ...members.map((index) => dimensions[index]!.width)));
  const layerX = nodesByLayer.map(() => 20);
  for (let layer = 1; layer < layerX.length; layer += 1) layerX[layer] = layerX[layer - 1]! + layerWidths[layer - 1]! + 120;

  let width = 0;
  let height = 0;
  const positions: BlueprintLayoutResult["positions"] = [];
  nodesByLayer.forEach((members, layer) => {
    let y = 40;
    for (const index of members) {
      const size = dimensions[index]!;
      positions.push({ id: nodes[index]!.id, x: layerX[layer]!, y, layer });
      width = Math.max(width, layerX[layer]! + size.width + 40);
      height = Math.max(height, y + size.height + 40);
      y += size.height + 55;
    }
  });
  positions.sort((left, right) => compareIds(left.id, right.id));
  return {
    positions,
    width,
    height,
    durationMicros: Math.round((performance.now() - started) * 1_000),
    cyclic: hasSelfEdge || components.some((members) => members.length > 1),
    engine: "typescript-scc-layered-v1",
  };
}
