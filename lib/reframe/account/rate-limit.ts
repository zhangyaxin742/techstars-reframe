type RateLimitBucket = {
  hits: number;
  resetAt: number;
};

type RateLimitConfig = {
  key: string;
  limit: number;
  windowMs: number;
};

export type AccountRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function checkAccountOtpStartRateLimit(input: {
  ipAddress: string | null;
  emailHash: string;
  inviteTokenHash?: string;
}) {
  const checks: RateLimitConfig[] = [
    {
      key: `account:otp:email:${input.emailHash}`,
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    },
  ];

  if (input.inviteTokenHash) {
    checks.push({
      key: `account:otp:invite:${input.inviteTokenHash}`,
      limit: 5,
      windowMs: 15 * 60 * 1_000,
    });
  }

  if (input.ipAddress) {
    checks.push({
      key: `account:otp:ip:${input.ipAddress}`,
      limit: 20,
      windowMs: 10 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function checkAccountOtpVerifyRateLimit(input: {
  ipAddress: string | null;
  emailHash: string;
}) {
  const checks: RateLimitConfig[] = [
    {
      key: `account:verify:email:${input.emailHash}`,
      limit: 8,
      windowMs: 15 * 60 * 1_000,
    },
  ];

  if (input.ipAddress) {
    checks.push({
      key: `account:verify:ip:${input.ipAddress}`,
      limit: 30,
      windowMs: 15 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function checkAccountProfileRateLimit(input: {
  userId: string;
  ipAddress: string | null;
}) {
  return consumeRateLimits([
    {
      key: `account:profile:user:${input.userId}`,
      limit: 20,
      windowMs: 10 * 60 * 1_000,
    },
    ...(input.ipAddress
      ? [
          {
            key: `account:profile:ip:${input.ipAddress}`,
            limit: 60,
            windowMs: 10 * 60 * 1_000,
          },
        ]
      : []),
  ]);
}

export function checkAccountWorkspaceMutationRateLimit(input: {
  userId: string;
  workspaceId?: string;
  ipAddress: string | null;
}) {
  const checks: RateLimitConfig[] = [
    {
      key: `account:workspace:user:${input.userId}`,
      limit: 30,
      windowMs: 10 * 60 * 1_000,
    },
  ];

  if (input.workspaceId) {
    checks.push({
      key: `account:workspace:${input.workspaceId}`,
      limit: 60,
      windowMs: 10 * 60 * 1_000,
    });
  }

  if (input.ipAddress) {
    checks.push({
      key: `account:workspace:ip:${input.ipAddress}`,
      limit: 60,
      windowMs: 10 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function checkWorkspaceInviteRateLimit(input: {
  userId: string;
  workspaceId: string;
  emailHash: string;
  ipAddress: string | null;
}) {
  const checks: RateLimitConfig[] = [
    {
      key: `account:invite:user:${input.userId}`,
      limit: 20,
      windowMs: 60 * 60 * 1_000,
    },
    {
      key: `account:invite:workspace:${input.workspaceId}`,
      limit: 50,
      windowMs: 60 * 60 * 1_000,
    },
    {
      key: `account:invite:email:${input.workspaceId}:${input.emailHash}`,
      limit: 5,
      windowMs: 60 * 60 * 1_000,
    },
  ];

  if (input.ipAddress) {
    checks.push({
      key: `account:invite:ip:${input.ipAddress}`,
      limit: 60,
      windowMs: 60 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function checkWorkspaceInviteAcceptRateLimit(input: {
  userId: string;
  inviteTokenHash: string;
  ipAddress: string | null;
}) {
  const checks: RateLimitConfig[] = [
    {
      key: `account:invite-accept:user:${input.userId}`,
      limit: 20,
      windowMs: 15 * 60 * 1_000,
    },
    {
      key: `account:invite-accept:token:${input.inviteTokenHash}`,
      limit: 8,
      windowMs: 15 * 60 * 1_000,
    },
  ];

  if (input.ipAddress) {
    checks.push({
      key: `account:invite-accept:ip:${input.ipAddress}`,
      limit: 60,
      windowMs: 15 * 60 * 1_000,
    });
  }

  return consumeRateLimits(checks);
}

export function resetAccountRateLimiter() {
  buckets.clear();
}

function consumeRateLimits(checks: RateLimitConfig[]): AccountRateLimitResult {
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

function consume(config: RateLimitConfig): AccountRateLimitResult {
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
