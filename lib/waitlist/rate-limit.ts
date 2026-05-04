type RateLimitBucket = {
  hits: number;
  resetAt: number;
};

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export type WaitlistRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkWaitlistRateLimit(input: {
  email: string;
  ipAddress: string | null;
}): WaitlistRateLimitResult {
  pruneBuckets();

  const checks: RateLimitConfig[] = [
    {
      key: `waitlist:email:${input.email}`,
      limit: 3,
      windowMs: 60 * 60 * 1_000,
    },
  ];

  if (input.ipAddress) {
    checks.push({
      key: `waitlist:ip:${input.ipAddress}`,
      limit: 6,
      windowMs: 10 * 60 * 1_000,
    });
  }

  let retryAfterSeconds = 0;

  for (const config of checks) {
    const result = consume(config);
    if (!result.allowed) {
      retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
    }
  }

  return {
    allowed: retryAfterSeconds === 0,
    retryAfterSeconds,
  };
}

export function resetWaitlistRateLimiter() {
  buckets.clear();
}

function consume(config: RateLimitConfig): WaitlistRateLimitResult {
  const now = Date.now();
  const current = buckets.get(config.key);

  if (!current || current.resetAt <= now) {
    buckets.set(config.key, {
      hits: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
  }

  if (current.hits >= config.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1_000),
      ),
    };
  }

  current.hits += 1;
  buckets.set(config.key, current);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

function pruneBuckets() {
  const now = Date.now();

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
