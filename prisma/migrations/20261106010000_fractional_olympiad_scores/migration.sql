-- Preserve the half-point criteria used by the supplied written olympiads.
ALTER TABLE "Task" ALTER COLUMN "maxScore" TYPE DOUBLE PRECISION;
ALTER TABLE "Review" ALTER COLUMN "score" TYPE DOUBLE PRECISION;
ALTER TABLE "TrainingAnswer" ALTER COLUMN "score" TYPE DOUBLE PRECISION;
