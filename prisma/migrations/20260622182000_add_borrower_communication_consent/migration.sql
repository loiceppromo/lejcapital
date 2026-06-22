ALTER TABLE "Borrower"
  ADD COLUMN IF NOT EXISTS "communicationConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "communicationConsentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "communicationConsentSource" TEXT;
