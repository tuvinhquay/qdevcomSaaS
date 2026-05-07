import { pushSecurityEvent } from "./securityEventService";

const AUTH_WINDOW_MS = 60_000;
const API_WINDOW_MS = 60_000;
const BLOCK_TIME_MS = 15 * 60_000;
const AUTH_LIMIT = Number(process.env.RATE_LIMIT_AUTH ?? 5);
const API_LIMIT = Number(process.env.RATE_LIMIT_API ?? 60);

type BucketState = {
  count: number;
  startedAt: number;
  blockedUntil?: number;
};

const authIpBucket = new Map<string, BucketState>();
const apiUserBucket = new Map<string, BucketState>();

function checkWindow(
  bucket: Map<string, BucketState>,
  key: string,
  limit: number,
  windowMs: number,
  onBlock: () => void,
) {
  const now = Date.now();
  const current = bucket.get(key);

  if (current?.blockedUntil && current.blockedUntil > now) {
    return { allowed: false, blockedUntil: current.blockedUntil };
  }

  if (!current || now - current.startedAt > windowMs) {
    bucket.set(key, { count: 1, startedAt: now });
    return { allowed: true };
  }

  const nextCount = current.count + 1;
  if (nextCount > limit) {
    const blockedUntil = now + BLOCK_TIME_MS;
    bucket.set(key, { count: nextCount, startedAt: current.startedAt, blockedUntil });
    onBlock();
    return { allowed: false, blockedUntil };
  }

  bucket.set(key, { ...current, count: nextCount });
  return { allowed: true };
}

export function checkAuthRateLimit(ip: string) {
  return checkWindow(authIpBucket, ip, AUTH_LIMIT, AUTH_WINDOW_MS, () => {
    void pushSecurityEvent({
      type: "RATE_LIMIT",
      severity: "medium",
      message: "Too many requests",
      metadata: { channel: "auth", ip, limit: AUTH_LIMIT },
    });
  });
}

export function checkApiRateLimit(userId: string) {
  return checkWindow(apiUserBucket, userId, API_LIMIT, API_WINDOW_MS, () => {
    void pushSecurityEvent({
      type: "RATE_LIMIT",
      severity: "medium",
      message: "Too many requests",
      metadata: { channel: "api", userId, limit: API_LIMIT },
    });
  });
}
