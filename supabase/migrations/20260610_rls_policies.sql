-- =========================================================================
-- LEJ Capital — Row Level Security policies
-- =========================================================================
-- Ensures investors can only read their own financial data.
-- Fund managers and operators see everything via service_role key.
--
-- Assumes:
--   1. Supabase Auth is configured with email/password
--   2. The `Investor` table has a `userId` column referencing the auth user
--   3. The app uses the service_role key for all server-side operations
--      (admin bypass) and the anon key for client-side read-only access
--
-- The service_role key always bypasses RLS, so server actions continue
-- to work without changes. These policies only restrict direct Supabase
-- client SDK access (e.g., future client-side real-time subscriptions).
-- =========================================================================

-- Enable RLS on all data tables
ALTER TABLE "Investor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvestorContribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvestorRepayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cycle" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sleeve" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MarketHolding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Borrower" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanScheduleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanRepayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperatingEngine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EngineCycleRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ICDecision" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaterfallRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WaterfallLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportSnapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Helper function: get the user's role from the User table
-- =========================================================================
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT role FROM "User"
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================================
-- Helper function: get the investor ID linked to the current auth user
-- =========================================================================
CREATE OR REPLACE FUNCTION auth.investor_id()
RETURNS TEXT AS $$
  SELECT id FROM "Investor"
  WHERE "userId" = auth.uid()::text
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================================
-- INVESTOR table
-- =========================================================================
-- Fund managers and operators can see all investors
CREATE POLICY "fm_op_read_investors" ON "Investor"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- Investors can see only their own record
CREATE POLICY "investor_read_own" ON "Investor"
  FOR SELECT
  USING ("userId" = auth.uid()::text);

-- Only fund managers can insert/update/delete
CREATE POLICY "fm_manage_investors" ON "Investor"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- INVESTOR CONTRIBUTIONS
-- =========================================================================
CREATE POLICY "fm_op_read_contributions" ON "InvestorContribution"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "investor_read_own_contributions" ON "InvestorContribution"
  FOR SELECT
  USING ("investorId" = auth.investor_id());

CREATE POLICY "fm_manage_contributions" ON "InvestorContribution"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- INVESTOR REPAYMENTS
-- =========================================================================
CREATE POLICY "fm_op_read_repayments" ON "InvestorRepayment"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "investor_read_own_repayments" ON "InvestorRepayment"
  FOR SELECT
  USING ("investorId" = auth.investor_id());

CREATE POLICY "fm_manage_repayments" ON "InvestorRepayment"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- CYCLES — all authenticated users can read cycles
-- =========================================================================
CREATE POLICY "authenticated_read_cycles" ON "Cycle"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "fm_manage_cycles" ON "Cycle"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- SLEEVES — all authenticated users can read
-- =========================================================================
CREATE POLICY "authenticated_read_sleeves" ON "Sleeve"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "fm_manage_sleeves" ON "Sleeve"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- MARKET HOLDINGS — fund managers and operators
-- =========================================================================
CREATE POLICY "fm_op_read_holdings" ON "MarketHolding"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_holdings" ON "MarketHolding"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- BORROWERS & LOANS — fund managers and operators only
-- =========================================================================
CREATE POLICY "fm_op_read_borrowers" ON "Borrower"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_borrowers" ON "Borrower"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_op_read_loans" ON "Loan"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_loans" ON "Loan"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_op_read_schedule" ON "LoanScheduleItem"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_schedule" ON "LoanScheduleItem"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_op_read_loan_repayments" ON "LoanRepayment"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_op_manage_loan_repayments" ON "LoanRepayment"
  FOR ALL
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'))
  WITH CHECK (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- =========================================================================
-- ENGINES — fund managers and operators
-- =========================================================================
CREATE POLICY "fm_op_read_engines" ON "OperatingEngine"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_engines" ON "OperatingEngine"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_op_read_engine_records" ON "EngineCycleRecord"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_op_manage_engine_records" ON "EngineCycleRecord"
  FOR ALL
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'))
  WITH CHECK (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- =========================================================================
-- AUDIT LOG — fund managers and operators can read
-- =========================================================================
CREATE POLICY "fm_op_read_audit" ON "AuditLog"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- Insert is done by service_role (server actions), no client policy needed
CREATE POLICY "fm_insert_audit" ON "AuditLog"
  FOR INSERT
  WITH CHECK (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- =========================================================================
-- IC DECISIONS — fund managers and operators
-- =========================================================================
CREATE POLICY "fm_op_read_ic" ON "ICDecision"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_ic" ON "ICDecision"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- LEDGER — fund managers and operators
-- =========================================================================
CREATE POLICY "fm_op_read_ledger" ON "LedgerEntry"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_op_manage_ledger" ON "LedgerEntry"
  FOR ALL
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'))
  WITH CHECK (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

-- =========================================================================
-- WATERFALL — fund managers and operators
-- =========================================================================
CREATE POLICY "fm_op_read_waterfall_runs" ON "WaterfallRun"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_waterfall_runs" ON "WaterfallRun"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_op_read_waterfall_lines" ON "WaterfallLine"
  FOR SELECT
  USING (auth.user_role() IN ('FUND_MANAGER', 'OPERATOR'));

CREATE POLICY "fm_manage_waterfall_lines" ON "WaterfallLine"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- REPORT SNAPSHOTS — all authenticated users can read
-- =========================================================================
CREATE POLICY "authenticated_read_snapshots" ON "ReportSnapshot"
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "fm_manage_snapshots" ON "ReportSnapshot"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');

-- =========================================================================
-- USER — users can read their own record, FM reads all
-- =========================================================================
CREATE POLICY "user_read_own" ON "User"
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "fm_read_all_users" ON "User"
  FOR SELECT
  USING (auth.user_role() = 'FUND_MANAGER');

CREATE POLICY "fm_manage_users" ON "User"
  FOR ALL
  USING (auth.user_role() = 'FUND_MANAGER')
  WITH CHECK (auth.user_role() = 'FUND_MANAGER');
