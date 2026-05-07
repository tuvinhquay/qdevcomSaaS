export type ThreatLevel = "SAFE" | "SUSPICIOUS" | "DANGEROUS" | "CRITICAL";

export type ThreatContext = {
  sessionRisk: number;
  anomalyScore: number;
  rateLimitStatus: { authAllowed: boolean; apiAllowed: boolean };
};

export type ThreatEvaluation = {
  threatLevel: ThreatLevel;
  action: "allow" | "verify_email" | "require_2fa" | "lock_account";
  score: number;
};

// Threat Engine: hop nhat diem session + anomaly + rate limit thanh muc de doa.
export function evaluateThreat(context: ThreatContext): ThreatEvaluation {
  const ratePenalty = context.rateLimitStatus.authAllowed && context.rateLimitStatus.apiAllowed ? 0 : 40;
  const score = Math.min(100, Math.round(context.sessionRisk * 0.45 + context.anomalyScore * 0.55 + ratePenalty));

  if (score >= 85) return { threatLevel: "CRITICAL", action: "lock_account", score };
  if (score >= 65) return { threatLevel: "DANGEROUS", action: "require_2fa", score };
  if (score >= 30) return { threatLevel: "SUSPICIOUS", action: "verify_email", score };
  return { threatLevel: "SAFE", action: "allow", score };
}
