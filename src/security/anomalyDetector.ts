export type UserActivity = {
  projectCreatedPerMinute: number;
  dataExportCount: number;
  apiCallsPerMinute: number;
  loginCountPerHour: number;
};

export type AnomalyResult = {
  anomalyScore: number;
  reason: string;
};

export function detectUserAnomaly(userActivity: UserActivity): AnomalyResult {
  let score = 0;
  const reasons: string[] = [];

  if (userActivity.projectCreatedPerMinute >= 100) {
    score += 45;
    reasons.push("Create project rate is abnormal");
  }

  if (userActivity.dataExportCount >= 10) {
    score += 35;
    reasons.push("Bulk export detected");
  }

  if (userActivity.apiCallsPerMinute >= 200) {
    score += 35;
    reasons.push("API call burst detected");
  }

  if (userActivity.loginCountPerHour >= 20) {
    score += 25;
    reasons.push("Login frequency is unusual");
  }

  return {
    anomalyScore: Math.min(100, score),
    reason: reasons.join("; ") || "Normal behavior",
  };
}
