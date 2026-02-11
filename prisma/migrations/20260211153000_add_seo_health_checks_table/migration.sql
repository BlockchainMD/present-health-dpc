CREATE TABLE "seo_health_checks" (
    "id" TEXT NOT NULL,
    "check_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "health_score" INTEGER NOT NULL,
    "passed_checks" INTEGER NOT NULL,
    "total_checks" INTEGER NOT NULL,
    "critical_count" INTEGER NOT NULL,
    "warning_count" INTEGER NOT NULL,
    "info_count" INTEGER NOT NULL,
    "results_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_health_checks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seo_health_checks_check_date_idx" ON "seo_health_checks"("check_date" DESC);
CREATE INDEX "seo_health_checks_status_check_date_idx" ON "seo_health_checks"("status", "check_date" DESC);
