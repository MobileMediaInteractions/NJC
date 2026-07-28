import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import protobuf from "protobufjs";

const schemaPath = fileURLToPath(
  new URL("./njc-benchmark.proto", import.meta.url),
);
const root = await protobuf.load(schemaPath);
const ContentBatch = root.lookupType("njc.benchmark.v1.ContentBatch");

const runtime = {
  name: typeof Bun === "undefined" ? "node" : "bun",
  version:
    typeof Bun === "undefined"
      ? process.version
      : typeof Bun.version === "string"
        ? Bun.version
        : "unknown",
  platform: `${process.platform}-${process.arch}`,
};

const cases = [
  {
    name: "small-presence",
    count: 1,
    summaryLength: 24,
    bodyLength: 0,
    operationsPerSample: 2_000,
  },
  {
    name: "medium-story-list",
    count: 25,
    summaryLength: 280,
    bodyLength: 0,
    operationsPerSample: 150,
  },
  {
    name: "large-content-batch",
    count: 250,
    summaryLength: 320,
    bodyLength: 1_200,
    operationsPerSample: 8,
  },
];

const results = cases.map(runCase);

process.stdout.write(
  `${JSON.stringify(
    {
      schema: "njc.benchmark.v1.ContentBatch",
      runtime,
      environment: {
        cpu: process.env.NJC_BENCHMARK_CPU ?? "unrecorded",
        memoryBytes: Number(process.env.NJC_BENCHMARK_MEMORY_BYTES ?? 0),
      },
      methodology: {
        warmupSamples: 8,
        measuredSamples: 25,
        compression: "gzip level 6",
        note: [
          "Codec timings exclude schema loading.",
          "Protocol Buffer application timings include conversion between plain objects and generated-message equivalents.",
          "This measures local serialization only, not HTTP, TLS, Vercel cold starts, device battery use, or network latency.",
        ],
      },
      results,
    },
    null,
    2,
  )}\n`,
);

function runCase(definition) {
  const value = {
    events: Array.from({ length: definition.count }, (_, index) =>
      createEvent(index, definition),
    ),
  };
  const message = ContentBatch.fromObject(value);
  const jsonBytes = Buffer.from(JSON.stringify(value));
  const protobufBytes = ContentBatch.encode(message).finish();
  const jsonGzipBytes = gzipSync(jsonBytes, { level: 6 });
  const protobufGzipBytes = gzipSync(protobufBytes, { level: 6 });

  const operations = {
    jsonEncode: () => JSON.stringify(value),
    jsonDecode: () => JSON.parse(jsonBytes.toString("utf8")),
    jsonRoundTrip: () => JSON.parse(JSON.stringify(value)),
    protobufEncode: () => ContentBatch.encode(message).finish(),
    protobufDecode: () => ContentBatch.decode(protobufBytes),
    protobufApplicationRoundTrip: () =>
      ContentBatch.toObject(
        ContentBatch.decode(
          ContentBatch.encode(ContentBatch.fromObject(value)).finish(),
        ),
        { longs: Number, defaults: false },
      ),
  };

  const timings = Object.fromEntries(
    Object.entries(operations).map(([name, operation]) => [
      name,
      measure(operation, definition.operationsPerSample),
    ]),
  );

  return {
    name: definition.name,
    records: definition.count,
    bytes: {
      json: jsonBytes.byteLength,
      jsonGzip: jsonGzipBytes.byteLength,
      protobuf: protobufBytes.byteLength,
      protobufGzip: protobufGzipBytes.byteLength,
      protobufReductionVsJsonPercent: percentReduction(
        jsonBytes.byteLength,
        protobufBytes.byteLength,
      ),
      protobufGzipReductionVsJsonGzipPercent: percentReduction(
        jsonGzipBytes.byteLength,
        protobufGzipBytes.byteLength,
      ),
    },
    timings,
  };
}

function measure(operation, operationsPerSample) {
  let sink;
  for (let sample = 0; sample < 8; sample += 1) {
    for (let index = 0; index < operationsPerSample; index += 1) {
      sink = operation();
    }
  }

  const values = [];
  const rssBefore = process.memoryUsage().rss;
  for (let sample = 0; sample < 25; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < operationsPerSample; index += 1) {
      sink = operation();
    }
    values.push((performance.now() - startedAt) / operationsPerSample);
  }
  const rssAfter = process.memoryUsage().rss;
  if (sink === undefined) throw new Error("Benchmark operation produced no value.");
  values.sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    millisecondsPerOperation: {
      mean: round(total / values.length),
      p50: round(percentile(values, 0.5)),
      p95: round(percentile(values, 0.95)),
      p99: round(percentile(values, 0.99)),
    },
    operationsPerSecondFromMean: Math.round(
      1_000 / (total / values.length),
    ),
    rssDeltaBytes: rssAfter - rssBefore,
  };
}

function createEvent(index, definition) {
  return {
    id: `event-${index.toString().padStart(5, "0")}`,
    kind: definition.name === "small-presence" ? "presence" : "story",
    title:
      definition.name === "small-presence"
        ? "Online"
        : `Middlesex County reporting update ${index + 1}`,
    summary: repeatText(definition.summaryLength, index + 11),
    body: repeatText(definition.bodyLength, index + 101),
    category: index % 2 ? "Politics" : "Local News",
    author: index % 3 ? "NJ Courier Staff" : "Garden Observer",
    imageUrl:
      definition.name === "small-presence"
        ? ""
        : `https://cdn.thejerseycourier.com/benchmark/${index}.webp`,
    createdAtMs: 1_785_199_200_000 + index * 60_000,
    unread: index % 10,
    tags: definition.name === "small-presence" ? ["web"] : ["middlesex", "nj"],
    breaking: index % 17 === 0,
  };
}

function repeatText(length, seed) {
  if (!length) return "";
  const words = [
    "community",
    "reporting",
    "Middlesex",
    "residents",
    "schools",
    "transit",
    "public",
    "meeting",
    "New Jersey",
    "Courier",
  ];
  let output = "";
  let index = seed % words.length;
  while (output.length < length) {
    output += `${output ? " " : ""}${words[index % words.length]}`;
    index += 1;
  }
  return output.slice(0, length);
}

function percentile(values, quantile) {
  return values[
    Math.min(values.length - 1, Math.ceil(values.length * quantile) - 1)
  ];
}

function percentReduction(baseline, candidate) {
  return round(((baseline - candidate) / baseline) * 100);
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
