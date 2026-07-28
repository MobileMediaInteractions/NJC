import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { WebSocket, WebSocketServer } from "ws";

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
const processStartedAt = performance.now();
const responsePayload = JSON.stringify({
  ok: true,
  channel: "newsroom",
  unread: 4,
  message: "Middlesex County desk is ready.",
});
const server = createServer((_request, response) => {
  response.writeHead(200, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(responsePayload),
  });
  response.end(responsePayload);
});
const sockets = new WebSocketServer({ server });
sockets.on("connection", (socket) => {
  socket.on("message", (data, isBinary) => socket.send(data, { binary: isBinary }));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});
const startupMilliseconds = performance.now() - processStartedAt;
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("Benchmark server did not expose a TCP port.");
}
const httpUrl = `http://127.0.0.1:${address.port}`;
const socketUrl = `ws://127.0.0.1:${address.port}`;

try {
  const http = await benchmarkHttp(httpUrl);
  const websocket = await benchmarkWebSocket(socketUrl);
  process.stdout.write(
    `${JSON.stringify(
      {
        runtime,
        environment: {
          cpu: process.env.NJC_BENCHMARK_CPU ?? "unrecorded",
          memoryBytes: Number(process.env.NJC_BENCHMARK_MEMORY_BYTES ?? 0),
        },
        methodology: {
          startupMilliseconds: round(startupMilliseconds),
          measuredSamples: 15,
          httpRequestsPerSample: 400,
          httpConcurrency: 20,
          websocketClients: 20,
          websocketMessagesPerClientPerSample: 100,
          note: [
            "Both runtimes execute the same node:http and ws source.",
            "Loopback results exclude TLS, Vercel routing, database work, and public-network latency.",
            "This is a compatibility and runtime-direction signal, not a production throughput claim.",
          ],
        },
        http,
        websocket,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  for (const socket of sockets.clients) socket.terminate();
  await new Promise((resolve) => sockets.close(resolve));
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function benchmarkHttp(url) {
  const samples = [];
  for (let warmup = 0; warmup < 3; warmup += 1) {
    await runHttpSample(url, 100, 20);
  }
  for (let sample = 0; sample < 15; sample += 1) {
    samples.push(await runHttpSample(url, 400, 20));
  }
  return summarizeSamples(samples);
}

async function runHttpSample(url, count, concurrency) {
  const latencies = [];
  let next = 0;
  const startedAt = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        next += 1;
        const requestStartedAt = performance.now();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP benchmark returned ${response.status}.`);
        await response.arrayBuffer();
        latencies.push(performance.now() - requestStartedAt);
      }
    }),
  );
  const duration = performance.now() - startedAt;
  return {
    operationsPerSecond: (count / duration) * 1_000,
    latencyMilliseconds: summarizeValues(latencies),
  };
}

async function benchmarkWebSocket(url) {
  const clients = await Promise.all(
    Array.from({ length: 20 }, () => connectSocket(url)),
  );
  try {
    for (let warmup = 0; warmup < 3; warmup += 1) {
      await runSocketSample(clients, 20);
    }
    const samples = [];
    for (let sample = 0; sample < 15; sample += 1) {
      samples.push(await runSocketSample(clients, 100));
    }
    return summarizeSamples(samples);
  } finally {
    for (const client of clients) client.terminate();
  }
}

function connectSocket(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

async function runSocketSample(clients, messagesPerClient) {
  const latencies = [];
  const startedAt = performance.now();
  await Promise.all(
    clients.map(
      (socket, clientIndex) =>
        new Promise((resolve, reject) => {
          let received = 0;
          const sentAt = new Map();
          const onError = (error) => {
            cleanup();
            reject(error);
          };
          const onMessage = (data) => {
            const sequence = Number(data.toString().split(":").at(-1));
            const key = `${clientIndex}:${sequence}`;
            const requestStartedAt = sentAt.get(key);
            if (requestStartedAt !== undefined) {
              latencies.push(performance.now() - requestStartedAt);
              sentAt.delete(key);
            }
            received += 1;
            if (received === messagesPerClient) {
              cleanup();
              resolve();
              return;
            }
            send(received);
          };
          const cleanup = () => {
            socket.off("error", onError);
            socket.off("message", onMessage);
          };
          const send = (sequence) => {
            const key = `${clientIndex}:${sequence}`;
            sentAt.set(key, performance.now());
            socket.send(key);
          };
          socket.on("error", onError);
          socket.on("message", onMessage);
          send(0);
        }),
    ),
  );
  const operationCount = clients.length * messagesPerClient;
  const duration = performance.now() - startedAt;
  return {
    operationsPerSecond: (operationCount / duration) * 1_000,
    latencyMilliseconds: summarizeValues(latencies),
  };
}

function summarizeSamples(samples) {
  return {
    operationsPerSecond: summarizeValues(
      samples.map((sample) => sample.operationsPerSecond),
    ),
    latencyMilliseconds: {
      p50: summarizeValues(
        samples.map((sample) => sample.latencyMilliseconds.p50),
      ),
      p95: summarizeValues(
        samples.map((sample) => sample.latencyMilliseconds.p95),
      ),
      p99: summarizeValues(
        samples.map((sample) => sample.latencyMilliseconds.p99),
      ),
    },
  };
}

function summarizeValues(input) {
  const values = [...input].sort((left, right) => left - right);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    mean: round(mean),
    p50: round(percentile(values, 0.5)),
    p95: round(percentile(values, 0.95)),
    p99: round(percentile(values, 0.99)),
  };
}

function percentile(values, quantile) {
  return values[
    Math.min(values.length - 1, Math.ceil(values.length * quantile) - 1)
  ];
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
