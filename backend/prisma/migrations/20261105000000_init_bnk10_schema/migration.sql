-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RM', 'TEAM_LEAD');

-- CreateEnum
CREATE TYPE "RiskProfile" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProductRiskRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "NbaStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('CALL', 'EMAIL');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('CONTACT_ATTEMPTED', 'CONTACTED', 'NO_RESPONSE', 'FOLLOW_UP_REQUIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OutcomeType" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'NO_RESPONSE', 'FOLLOW_UP_REQUIRED', 'CONVERTED');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lead_rm_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rms" (
    "id" TEXT NOT NULL,
    "team_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RM',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "rm_id" TEXT,
    "full_name" TEXT NOT NULL,
    "segment" TEXT NOT NULL DEFAULT 'PREMIER',
    "risk_profile" "RiskProfile" NOT NULL DEFAULT 'MEDIUM',
    "client_since" TIMESTAMP(3),
    "kyc_status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "tax_residency" TEXT NOT NULL DEFAULT 'DOMESTIC',
    "email" TEXT,
    "phone" TEXT,
    "total_balance" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "risk_rating" "ProductRiskRating" NOT NULL DEFAULT 'LOW',
    "min_investment" DECIMAL(18,2),
    "expected_return_bps" INTEGER,
    "tenure_months" INTEGER,
    "tax_treatment" TEXT DEFAULT 'TAXABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "account_number" TEXT,
    "start_date" TIMESTAMP(3),
    "interest_rate_bps" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "balance" DECIMAL(18,2) NOT NULL,
    "maturity_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "detected_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "next_best_actions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "evidence" JSONB NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "NbaStatus" NOT NULL DEFAULT 'PENDING',
    "suggested_product_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "suitability" JSONB,
    "dismissal_rationale" TEXT,
    "expires_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "next_best_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outreaches" (
    "id" TEXT NOT NULL,
    "nba_id" TEXT NOT NULL,
    "created_by_rm_id" TEXT NOT NULL,
    "draft_text" TEXT NOT NULL,
    "channel" TEXT DEFAULT 'EMAIL',
    "tone" TEXT DEFAULT 'ADVISORY',
    "subject" TEXT,
    "grounding_citations" JSONB,
    "disclaimer" TEXT,
    "status" "OutreachStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreaches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_activities" (
    "id" TEXT NOT NULL,
    "outreach_id" TEXT NOT NULL,
    "rm_id" TEXT NOT NULL,
    "contact_method" "ContactMethod" NOT NULL DEFAULT 'EMAIL',
    "contact_status" "ContactStatus" NOT NULL DEFAULT 'CONTACTED',
    "notes" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nba_outcomes" (
    "id" TEXT NOT NULL,
    "nba_id" TEXT NOT NULL,
    "recorded_by_rm_id" TEXT NOT NULL,
    "action_taken" BOOLEAN NOT NULL DEFAULT true,
    "outcome" "OutcomeType" NOT NULL DEFAULT 'INTERESTED',
    "notes" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nba_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rms_email_key" ON "rms"("email");

-- AddForeignKey
ALTER TABLE "rms" ADD CONSTRAINT "rms_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_rm_id_fkey" FOREIGN KEY ("rm_id") REFERENCES "rms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signals" ADD CONSTRAINT "signals_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_best_actions" ADD CONSTRAINT "next_best_actions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "next_best_actions" ADD CONSTRAINT "next_best_actions_suggested_product_id_fkey" FOREIGN KEY ("suggested_product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_nba_id_fkey" FOREIGN KEY ("nba_id") REFERENCES "next_best_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_created_by_rm_id_fkey" FOREIGN KEY ("created_by_rm_id") REFERENCES "rms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_outreach_id_fkey" FOREIGN KEY ("outreach_id") REFERENCES "outreaches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_activities" ADD CONSTRAINT "contact_activities_rm_id_fkey" FOREIGN KEY ("rm_id") REFERENCES "rms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nba_outcomes" ADD CONSTRAINT "nba_outcomes_nba_id_fkey" FOREIGN KEY ("nba_id") REFERENCES "next_best_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nba_outcomes" ADD CONSTRAINT "nba_outcomes_recorded_by_rm_id_fkey" FOREIGN KEY ("recorded_by_rm_id") REFERENCES "rms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

