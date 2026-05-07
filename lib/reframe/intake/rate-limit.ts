type RateLimitBucket = {
  hits: number;
  resetAt: number;
};

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export type IntakeRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkDraftSaveRateLimit(input: {
  ipAddress: string | null;
  draftTokenHash: string;
}): IntakeRateLimitResult {
  const checks: RateLimitConfig[] = [
    {
      key: `intake:draft:${input.draftTokenHash}`,
      limit: 30,
      windowMs: 10 * 60 * 1_000,
    },
  ];

  if (input.ipAddress) {
    checks.push({
      key: `intake:ip:${input.ipAddress}`,
      limit: 60,
      windowMs: 10 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function resetIntakeRateLimiter() {
  buckets.clear();
}

function consumeRateLimits(checks: RateLimitConfig[]): IntakeRateLimitResult {
  pruneBuckets();

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

function consume(config: RateLimitConfig): IntakeRateLimitResult {
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
