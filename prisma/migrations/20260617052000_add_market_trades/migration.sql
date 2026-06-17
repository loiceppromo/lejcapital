-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "MarketTrade" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "holdingId" TEXT,
    "instrumentType" "InstrumentType" NOT NULL,
    "side" "TradeSide" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(18,6),
    "price" DECIMAL(18,6),
    "grossAmount" DECIMAL(18,2) NOT NULL,
    "fees" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(18,2) NOT NULL,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "executionVenue" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTrade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketTrade_cycleId_idx" ON "MarketTrade"("cycleId");

-- CreateIndex
CREATE INDEX "MarketTrade_holdingId_idx" ON "MarketTrade"("holdingId");

-- CreateIndex
CREATE INDEX "MarketTrade_tradeDate_idx" ON "MarketTrade"("tradeDate");

-- CreateIndex
CREATE INDEX "MarketTrade_instrumentType_side_idx" ON "MarketTrade"("instrumentType", "side");

-- AddForeignKey
ALTER TABLE "MarketTrade" ADD CONSTRAINT "MarketTrade_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTrade" ADD CONSTRAINT "MarketTrade_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "MarketHolding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
