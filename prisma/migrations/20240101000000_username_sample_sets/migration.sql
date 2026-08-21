-- Data-safe migration: add `username` (default 'admin' for the first user),
-- drop `email`, and create the sample-set tables — without touching other data.

-- Create enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SampleAttemptMode') THEN
    CREATE TYPE "SampleAttemptMode" AS ENUM ('EXAM', 'PRACTICE');
  END IF;
END
$$;

-- Add username column (nullable first so it never fails on a populated table)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT;

-- Populate existing rows: first user -> 'admin', everyone else -> unique 'user_<id>'
UPDATE "User"
  SET "username" = 'admin'
  WHERE "username" IS NULL
    AND "id" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC, "id" ASC LIMIT 1);

UPDATE "User" SET "username" = 'user_' || "id" WHERE "username" IS NULL;

-- Enforce NOT NULL + unique (idempotent)
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- Remove email (idempotent)
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";

-- New tables (idempotent)
CREATE TABLE IF NOT EXISTS "SampleSet" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timeLimitMinutes" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SampleSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SampleQuestion" (
    "id" TEXT NOT NULL,
    "sampleSetId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "optionC" TEXT NOT NULL,
    "optionD" TEXT NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SampleQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SampleAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sampleSetId" TEXT NOT NULL,
    "mode" "SampleAttemptMode" NOT NULL DEFAULT 'PRACTICE',
    "score" INTEGER,
    "total" INTEGER,
    "correct" INTEGER,
    "incorrect" INTEGER,
    "unanswered" INTEGER,
    "durationMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    CONSTRAINT "SampleAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SampleResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sampleQuestionId" TEXT NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    "timeSpentMs" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SampleResponse_pkey" PRIMARY KEY ("id")
);

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS "SampleSet_courseId_idx" ON "SampleSet"("courseId");
CREATE INDEX IF NOT EXISTS "SampleQuestion_sampleSetId_idx" ON "SampleQuestion"("sampleSetId");
CREATE INDEX IF NOT EXISTS "SampleAttempt_userId_idx" ON "SampleAttempt"("userId");
CREATE INDEX IF NOT EXISTS "SampleAttempt_sampleSetId_idx" ON "SampleAttempt"("sampleSetId");
CREATE INDEX IF NOT EXISTS "SampleResponse_attemptId_idx" ON "SampleResponse"("attemptId");
CREATE INDEX IF NOT EXISTS "SampleResponse_sampleQuestionId_idx" ON "SampleResponse"("sampleQuestionId");

-- Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleSet_courseId_fkey') THEN
    ALTER TABLE "SampleSet" ADD CONSTRAINT "SampleSet_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleQuestion_sampleSetId_fkey') THEN
    ALTER TABLE "SampleQuestion" ADD CONSTRAINT "SampleQuestion_sampleSetId_fkey" FOREIGN KEY ("sampleSetId") REFERENCES "SampleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleAttempt_userId_fkey') THEN
    ALTER TABLE "SampleAttempt" ADD CONSTRAINT "SampleAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleAttempt_sampleSetId_fkey') THEN
    ALTER TABLE "SampleAttempt" ADD CONSTRAINT "SampleAttempt_sampleSetId_fkey" FOREIGN KEY ("sampleSetId") REFERENCES "SampleSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleResponse_attemptId_fkey') THEN
    ALTER TABLE "SampleResponse" ADD CONSTRAINT "SampleResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SampleAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleResponse_sampleQuestionId_fkey') THEN
    ALTER TABLE "SampleResponse" ADD CONSTRAINT "SampleResponse_sampleQuestionId_fkey" FOREIGN KEY ("sampleQuestionId") REFERENCES "SampleQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;
