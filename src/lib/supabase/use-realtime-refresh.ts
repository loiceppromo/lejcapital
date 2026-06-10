'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from './browser';
import { isSupabaseConfigured } from './config';

const DEFAULT_TABLES = [
  'AuditLog',
  'Borrower',
  'Cycle',
  'DocumentNote',
  'EngineCycleRecord',
  'ICDecision',
  'Investor',
  'InvestorContribution',
  'InvestorRepayment',
  'LedgerEntry',
  'Loan',
  'LoanRepayment',
  'LoanScheduleItem',
  'MarketHolding',
  'MarketRegimeConfig',
  'Notification',
  'OperatingEngine',
  'OpportunisticTrigger',
  'ReportSnapshot',
  'ReturnAssumption',
  'Sleeve',
  'SystemConfig',
  'WaterfallLine',
  'WaterfallRun',
];

export function useRealtimeRefresh({
  enabled,
  tables = DEFAULT_TABLES,
}: {
  enabled: boolean;
  tables?: string[];
}) {
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;

    const supabase = createClient();
    const channel = supabase.channel('lej-platform-realtime');

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            router.refresh();
          }, 500);
        },
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [enabled, router, tables]);
}
