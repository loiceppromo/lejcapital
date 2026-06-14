/**
 * Operational-reset plan — pure data, no server bindings, so it can be unit
 * tested without pulling in server-only modules.
 *
 * `RESET_DELETION_ORDER` lists each Prisma client accessor (camelCase) that a
 * full operational reset clears, ordered so that every table is deleted BEFORE
 * any table it holds a foreign key into (children before parents).
 *
 * Preserved (intentionally absent): User, AuditLog, MarketRegimeConfig,
 * ReturnAssumption.
 *
 * `RESET_DEPENDENCIES` is the FK dependency map (model → models it directly
 * references). The reset-order test asserts the deletion order is valid against
 * it. Self-references and references to preserved tables are omitted — they do
 * not constrain deletion order among the cleared tables.
 */
export const RESET_DELETION_ORDER = [
  'notification',
  'reportSnapshot',
  'iCDecision',
  'documentNote',
  'waterfallLine',
  'waterfallRun',
  'loanRepayment',
  'loanScheduleItem',
  'loan',
  'borrower',
  'ledgerEntry',
  'marketHolding',
  'engineCycleRecord',
  'operatingEngine',
  'investorRepayment',
  'investorContribution',
  'investorCycle',
  'investor',
  'sleeve',
  'opportunisticTrigger',
  'cycle',
  'systemConfig',
] as const;

export type ResetModel = (typeof RESET_DELETION_ORDER)[number];

export const RESET_DEPENDENCIES: Record<ResetModel, readonly ResetModel[]> = {
  notification: [],
  reportSnapshot: ['cycle'],
  iCDecision: ['cycle'],
  documentNote: ['cycle'],
  waterfallLine: ['waterfallRun'],
  waterfallRun: ['cycle'],
  loanRepayment: ['loan', 'loanScheduleItem'],
  loanScheduleItem: ['loan'],
  loan: ['borrower', 'cycle'],
  borrower: [],
  ledgerEntry: ['cycle'],
  marketHolding: ['cycle'],
  engineCycleRecord: ['operatingEngine', 'cycle'],
  operatingEngine: [],
  investorRepayment: ['investor', 'cycle'],
  investorContribution: ['investor', 'cycle'],
  investorCycle: ['investor', 'cycle'],
  investor: [],
  sleeve: ['cycle'],
  opportunisticTrigger: ['cycle'],
  cycle: [],
  systemConfig: [],
};
