'use server';

import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { requirePermission } from '@/lib/auth/server';
import { parseMoneyInput, parseOptionalMoneyInput, parseOptionalRateInput } from '@/lib/server/financial-inputs';
import { createLedgerEntryRecord } from '@/lib/server/ledger';
import { Decimal, evaluateMarketTradePrecheck } from '@/lib/finance';
import { loadPlatformState } from '@/lib/data/queries';
import { getMarketHoldings, getMarketPolicy, getSleeveAmount, getActiveCycle } from '@/lib/platform/selectors';
import { writeAuditLog } from './audit';
import { InstrumentType, TradeSide } from '@/generated/prisma/client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function parseInstrumentType(value: FormDataEntryValue | null): InstrumentType | null {
  const instrumentType = String(value ?? '');
  return Object.values(InstrumentType).includes(instrumentType as InstrumentType)
    ? instrumentType as InstrumentType
    : null;
}

function parseTradeSide(value: FormDataEntryValue | null): TradeSide | null {
  const side = String(value ?? '');
  return Object.values(TradeSide).includes(side as TradeSide)
    ? side as TradeSide
    : null;
}

function parseOptionalDecimal(value: FormDataEntryValue | null, field: string): string | null {
  const raw = String(value ?? '').replaceAll(',', '').trim();
  if (!raw) return null;
  const parsed = new Decimal(raw);
  if (!parsed.isFinite() || parsed.isNegative()) {
    throw new Error(`${field} must be a valid non-negative number.`);
  }
  return parsed.toFixed(6);
}

export async function addHolding(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected. Running in seed mode.' };
  await requirePermission('ADD_HOLDING');

  const cycleId = formData.get('cycleId') as string;
  const instrumentType = parseInstrumentType(formData.get('instrumentType'));
  const name = formData.get('name') as string;
  const amountInvested = formData.get('amountInvested') as string;
  const currentValue = formData.get('currentValue') as string;
  const returnRate = formData.get('returnRate') as string;
  const maturityDate = formData.get('maturityDate') as string;
  const purchaseDate = formData.get('purchaseDate') as string;

  if (!cycleId || !name || !amountInvested || !purchaseDate || !instrumentType) {
    return { ok: false, error: 'Cycle, name, instrument type, amount invested, and purchase date are required.' };
  }

  try {
    const invested = parseMoneyInput(amountInvested, 'Amount invested');
    const db = await getDb();
    const accountByInstrument: Record<InstrumentType, string> = {
      GSE_EQUITY: 'GSE equity',
      TBILL: 'T-Bill',
      CASH: 'Cash',
    };
    const holding = await db.$transaction(async (tx) => {
      const created = await tx.marketHolding.create({
        data: {
          cycleId,
          instrumentType,
          name,
          amountInvested: invested,
          currentValue: parseOptionalMoneyInput(currentValue, 'Current value') ?? invested,
          returnRate: parseOptionalRateInput(returnRate, 'Return rate'),
          maturityDate: maturityDate ? new Date(maturityDate) : null,
          purchaseDate: new Date(purchaseDate),
        },
      });

      await createLedgerEntryRecord(tx, {
        date: purchaseDate,
        account: accountByInstrument[instrumentType],
        description: `Market holding added: ${name}`,
        direction: 'OUT',
        amount: invested,
        source: 'MarketTrade',
        cycleId,
      });

      return created;
    });
    await writeAuditLog('ADD_HOLDING', 'MarketHolding', holding.id as string, {
      cycleId: cycleId || null,
      instrumentType,
      amountInvested: invested,
      currentValue: currentValue || invested,
      name,
    });
    revalidatePath('/market');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function recordMarketTrade(formData: FormData): Promise<ActionResult> {
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database not connected. Running in seed mode.' };
  await requirePermission('RECORD_MARKET_TRADE');

  const cycleId = String(formData.get('cycleId') ?? '');
  const holdingId = String(formData.get('holdingId') ?? '');
  const instrumentType = parseInstrumentType(formData.get('instrumentType'));
  const side = parseTradeSide(formData.get('side'));
  const name = String(formData.get('name') ?? '').trim();
  const tradeDate = String(formData.get('tradeDate') ?? '');
  const executionVenue = String(formData.get('executionVenue') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!cycleId || !instrumentType || !side || !name || !tradeDate) {
    return { ok: false, error: 'Cycle, instrument type, side, name, and trade date are required.' };
  }

  try {
    const grossAmount = parseMoneyInput(formData.get('grossAmount'), 'Gross amount');
    const fees = parseOptionalMoneyInput(formData.get('fees'), 'Fees') ?? '0.00';
    const quantity = parseOptionalDecimal(formData.get('quantity'), 'Quantity');
    const price = parseOptionalDecimal(formData.get('price'), 'Price');
    const gross = new Decimal(grossAmount);
    const feeAmount = new Decimal(fees);
    if (gross.lte(0)) return { ok: false, error: 'Gross amount must be greater than zero.' };
    if (side === 'SELL' && feeAmount.gt(gross)) return { ok: false, error: 'Fees cannot exceed gross sale proceeds.' };

    const state = await loadPlatformState();
    const stateForCycle = { ...state, activeCycleId: cycleId };
    const policy = getMarketPolicy(stateForCycle);
    const activeCycle = getActiveCycle(stateForCycle);
    const holdings = getMarketHoldings(stateForCycle);
    const selectedHolding = holdingId ? holdings.find((holding) => holding.id === holdingId) : null;
    if (side === 'SELL' && !selectedHolding) {
      return { ok: false, error: 'Select an existing holding before recording a sell trade.' };
    }
    if (selectedHolding && selectedHolding.instrumentType !== instrumentType) {
      return { ok: false, error: 'Selected holding type does not match the trade instrument type.' };
    }

    const marketAlpha = getSleeveAmount('MARKET_ALPHA', stateForCycle).plus(getSleeveAmount('LOAN_BOOK', stateForCycle));
    const nav = activeCycle.openingNAV ?? state.contributions
      .filter((contribution) => contribution.cycleId === cycleId)
      .reduce((sum, contribution) => sum.plus(contribution.amount), new Decimal(0));
    const precheck = evaluateMarketTradePrecheck({
      side,
      instrumentType,
      name,
      grossAmount: gross,
      fees: feeAmount,
      holdings: holdings.map((holding) => ({
        instrumentType: holding.instrumentType,
        name: holding.name,
        amountInvested: holding.amountInvested,
        currentValue: holding.currentValue,
      })),
      policy,
      marketAlphaCurrentValue: marketAlpha,
      nav,
      existingHoldingValue: selectedHolding?.currentValue,
    });

    if (!precheck.approved) {
      return { ok: false, error: precheck.blockers.join(' ') };
    }

    const netAmount = side === 'BUY' ? gross.plus(feeAmount) : gross.minus(feeAmount);
    const accountByInstrument: Record<InstrumentType, string> = {
      GSE_EQUITY: 'GSE equity',
      TBILL: 'T-Bill',
      CASH: 'Cash',
    };

    const db = await getDb();
    const result = await db.$transaction(async (tx) => {
      let resultingHoldingId = holdingId || null;

      if (side === 'BUY') {
        if (selectedHolding) {
          const nextInvested = selectedHolding.amountInvested.plus(netAmount).toFixed(2);
          const nextValue = selectedHolding.currentValue.plus(gross).toFixed(2);
          await tx.marketHolding.update({
            where: { id: selectedHolding.id },
            data: {
              name,
              amountInvested: nextInvested,
              currentValue: nextValue,
            },
          });
          resultingHoldingId = selectedHolding.id;
        } else {
          const holding = await tx.marketHolding.create({
            data: {
              cycleId,
              instrumentType,
              name,
              amountInvested: netAmount.toFixed(2),
              currentValue: gross.toFixed(2),
              returnRate: null,
              purchaseDate: new Date(tradeDate),
            },
          });
          resultingHoldingId = holding.id;
        }
      } else if (selectedHolding) {
        const nextInvested = Decimal.max(new Decimal(0), selectedHolding.amountInvested.minus(gross)).toFixed(2);
        const nextValue = Decimal.max(new Decimal(0), selectedHolding.currentValue.minus(gross)).toFixed(2);
        await tx.marketHolding.update({
          where: { id: selectedHolding.id },
          data: {
            amountInvested: nextInvested,
            currentValue: nextValue,
          },
        });
        resultingHoldingId = selectedHolding.id;
      }

      const trade = await tx.marketTrade.create({
        data: {
          cycleId,
          holdingId: resultingHoldingId,
          instrumentType,
          side,
          name,
          quantity,
          price,
          grossAmount: gross.toFixed(2),
          fees: feeAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
          tradeDate: new Date(tradeDate),
          executionVenue: executionVenue || null,
          notes: notes || null,
        },
      });

      await createLedgerEntryRecord(tx, {
        date: tradeDate,
        account: accountByInstrument[instrumentType],
        description: `${side === 'BUY' ? 'Buy' : 'Sell'} ${name}${quantity ? ` · qty ${quantity}` : ''}`,
        direction: side === 'BUY' ? 'OUT' : 'IN',
        amount: netAmount.toFixed(2),
        source: 'MarketTrade',
        cycleId,
      });

      return { trade, resultingHoldingId };
    });

    await writeAuditLog('RECORD_MARKET_TRADE', 'MarketTrade', result.trade.id as string, {
      cycleId,
      holdingId: result.resultingHoldingId,
      instrumentType,
      side,
      name,
      grossAmount: gross.toFixed(2),
      fees: feeAmount.toFixed(2),
      netAmount: netAmount.toFixed(2),
      projectedGsePct: precheck.projectedGsePct.toFixed(6),
      warnings: precheck.warnings,
    });

    revalidatePath('/market');
    revalidatePath('/dashboard');
    revalidatePath('/ledger');
    revalidatePath('/risk');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
