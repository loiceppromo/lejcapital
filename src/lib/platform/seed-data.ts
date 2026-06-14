import { Decimal } from '@/lib/finance';
import type { PlatformState } from './types';

export const loanAsOfDate = '2026-06-11';

export const platformState: PlatformState = {
  mode: 'SEED',
  activeCycleId: 'cycle-1',
  requestedRegime: 'NORMAL',
  cycles: [
    {
      id: 'cycle-1',
      sequenceNo: 1,
      startDate: '2026-07-01',
      endDate: '2026-09-30',
      status: 'PLANNING',
      openingNAV: new Decimal(0),
      closingNAV: null,
      retainedCapital: null,
      notes: 'First cycle — awaiting capital contributions.',
    },
  ],
  sleevesByCycle: {
    'cycle-1': [
      { type: 'PROTECTION', targetAmount: null, fundedAmount: new Decimal(0), floorAmount: null, notes: '' },
      { type: 'RESERVE', targetAmount: null, fundedAmount: new Decimal(0), floorAmount: null, notes: '' },
      { type: 'OPERATING_ALPHA', targetAmount: null, fundedAmount: new Decimal(0), floorAmount: null, notes: '' },
      { type: 'MARKET_ALPHA', targetAmount: null, fundedAmount: new Decimal(0), floorAmount: null, notes: '' },
      { type: 'LOAN_BOOK', targetAmount: null, fundedAmount: new Decimal(0), floorAmount: null, notes: '' },
    ],
  },
  investors: [],
  contributions: [],
  repayments: [],
  marketHoldings: [],
  borrowers: [],
  loans: [],
  loanSchedules: [],
  loanRepayments: [],
  engines: [],
  engineRecords: [],
  auditEntries: [],
  icDecisions: [],
  ledgerEntries: [],
  waterfallRuns: [],
  opportunisticTriggers: [],
  reportSnapshots: [],
  investorCycles: [],
};
