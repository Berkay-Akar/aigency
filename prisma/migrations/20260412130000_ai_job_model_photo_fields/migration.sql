-- Add modelDetails and customization JSON columns to support model-photo generation jobs.
-- Both columns are nullable so existing rows are unaffected.

ALTER TABLE "AiGenerationJob"
  ADD COLUMN "modelDetails"  JSONB,
  ADD COLUMN "customization" JSONB;
