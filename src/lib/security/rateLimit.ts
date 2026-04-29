interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

interface RateLimitState {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

async function checkRateLimitMemory(key: string, limit: number, windowMs: number): Promise<RateLimitState> {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now > current.resetAt) {
    const next = { count: 1, resetAt: now + windowMs };
    buckets.set(key, next);
    return { allowed: true, remaining: limit - 1, retryAfterMs: windowMs };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, current.resetAt - now) };
  }
  current.count += 1;
  buckets.set(key, current);
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfterMs: Math.max(0, current.resetAt - now) };
}

async function checkRateLimitUpstash(key: string, limit: number, windowMs: number): Promise<RateLimitState> {
  const baseUrl = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();
  const response = await fetch(`${baseUrl}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs), "NX"],
      ["PTTL", key],
    ]),
  });
  if (!response.ok) {
    throw new Error(`Rate limiter backend failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Array<{ result?: unknown }>;
  const count = Number(payload?.[0]?.result ?? 0);
  const ttl = Number(payload?.[2]?.result ?? windowMs);
  const retryAfterMs = Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs;
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterMs,
  };
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitState> {
  const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!hasUpstash) {
    return checkRateLimitMemory(key, limit, windowMs);
  }
  try {
    return await checkRateLimitUpstash(key, limit, windowMs);
  } catch {
    return checkRateLimitMemory(key, limit, windowMs);
  }
}
