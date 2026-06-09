import { Decimal, ZERO, ONE, type InterestMethod, type ScheduleItem } from './types';

export function generateSchedule(params: {
  principal: Decimal;
  annualRate: Decimal;
  termMonths: number;
  method: InterestMethod;
  disbursementDate: Date;
  scheduleType?: 'MONTHLY';
}): ScheduleItem[] {
  if (params.termMonths <= 0) {
    throw new Error('termMonths must be positive');
  }
  if (params.principal.lte(ZERO)) {
    throw new Error('principal must be positive');
  }

  if (params.method === 'FLAT') {
    return generateFlatSchedule(params);
  }
  return generateReducingBalanceSchedule(params);
}

function generateFlatSchedule(params: {
  principal: Decimal;
  annualRate: Decimal;
  termMonths: number;
  disbursementDate: Date;
}): ScheduleItem[] {
  const { principal, annualRate, termMonths, disbursementDate } = params;

  // Flat: interest = P × annualRate × (termMonths/12), spread equally
  const totalInterest = principal
    .times(annualRate)
    .times(new Decimal(termMonths))
    .div(new Decimal(12));

  const monthlyInterest = totalInterest.div(new Decimal(termMonths));
  const monthlyPrincipal = principal.div(new Decimal(termMonths));

  const items: ScheduleItem[] = [];
  let outstanding = principal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(disbursementDate, i);

    let principalDue: Decimal;
    if (i === termMonths) {
      principalDue = outstanding;
    } else {
      principalDue = monthlyPrincipal;
    }

    const interestDue = monthlyInterest;
    outstanding = outstanding.minus(principalDue);

    if (outstanding.lt(ZERO)) {
      outstanding = ZERO;
    }

    items.push({
      period: i,
      dueDate,
      principalDue,
      interestDue,
      totalDue: principalDue.plus(interestDue),
      outstandingAfter: outstanding,
    });
  }

  return items;
}

function generateReducingBalanceSchedule(params: {
  principal: Decimal;
  annualRate: Decimal;
  termMonths: number;
  disbursementDate: Date;
}): ScheduleItem[] {
  const { principal, annualRate, termMonths, disbursementDate } = params;

  // Monthly rate
  const r = annualRate.div(new Decimal(12));
  const n = new Decimal(termMonths);

  // PMT = P × r / (1 − (1+r)^(−n))
  let monthlyPayment: Decimal;
  if (r.isZero()) {
    monthlyPayment = principal.div(n);
  } else {
    const onePlusR = ONE.plus(r);
    const denominator = ONE.minus(onePlusR.pow(n.neg()));
    monthlyPayment = principal.times(r).div(denominator);
  }

  const items: ScheduleItem[] = [];
  let outstanding = principal;

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = addMonths(disbursementDate, i);
    const interestDue = outstanding.times(r);

    let principalDue: Decimal;
    if (i === termMonths) {
      principalDue = outstanding;
    } else {
      principalDue = monthlyPayment.minus(interestDue);
    }

    if (principalDue.lt(ZERO)) {
      principalDue = ZERO;
    }

    outstanding = outstanding.minus(principalDue);
    if (outstanding.lt(ZERO)) {
      outstanding = ZERO;
    }

    const totalDue = principalDue.plus(interestDue);

    items.push({
      period: i,
      dueDate,
      principalDue,
      interestDue,
      totalDue,
      outstandingAfter: outstanding,
    });
  }

  return items;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function computeOutstandingBalance(
  principal: Decimal,
  totalPrincipalPaid: Decimal,
): Decimal {
  const balance = principal.minus(totalPrincipalPaid);
  return balance.lt(ZERO) ? ZERO : balance;
}

export function computeNetDisbursement(
  principal: Decimal,
  originationFee: Decimal,
  deductFromDisbursement: boolean,
): Decimal {
  if (deductFromDisbursement) {
    return principal.minus(originationFee);
  }
  return principal;
}
