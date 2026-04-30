import {
  type LowStockItem,
  type TodayProductionSummary,
  type WorkerPerformance,
} from "@/core/ai/dataAnalyzer";

export type AnalysisData = {
  todayProduction: TodayProductionSummary;
  lowStock: LowStockItem[];
  workerPerformance: WorkerPerformance[];
};

export function runRules(analysisData: AnalysisData): string[] {
  const warnings: string[] = [];

  for (const worker of analysisData.workerPerformance) {
    if (worker.progress < 80) {
      warnings.push(`Cong nhan ${worker.worker} dang duoi 80% target`);
    }
  }

  if (analysisData.todayProduction.lateOrders > 0) {
    warnings.push("Co don hang dang tre deadline");
  }

  if (analysisData.lowStock.length > 0) {
    const names = analysisData.lowStock.map((item) => item.name).join(", ");
    warnings.push(`Ton kho thap: ${names}`);
  }

  return warnings;
}
