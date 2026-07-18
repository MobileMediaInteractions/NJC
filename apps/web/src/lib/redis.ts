import { Redis } from "@upstash/redis";

export type RedisRestConfig = {
  url: string;
  token: string;
};

export function getRedisRestConfig(): RedisRestConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function createRedisClient() {
  const config = getRedisRestConfig();
  return config ? new Redis(config) : null;
}
