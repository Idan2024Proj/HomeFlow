export {
  computeSplits,
  splitPersonal,
  splitEqual,
  splitByPercent,
  splitCustom,
  normalizeMerchantName,
  type ComputedSplit,
  type SplitParticipant,
  type SplitMode,
} from "./splits";

export {
  buildMonthSummary,
  forecastMonthEnd,
  buildDashboardAlerts,
  type MonthSummary,
  type MonthForecast,
  type DashboardAlert,
  type MonthTxInput,
} from "./dashboard";

export { computeSettlement, type SettlementSummary, type SettlementBalance } from "./settlements";

export {
  detectDuplicates,
  detectUnusualAmounts,
  detectRecurringPayments,
  fingerprintImportRow,
  type DetectedDuplicate,
  type DetectedAnomaly,
  type DetectedRecurring,
} from "./detection";
