-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "explanationFileName" TEXT,
ADD COLUMN     "explanationFilePath" TEXT,
ADD COLUMN     "explanationText" TEXT;

-- AlterTable
ALTER TABLE "TaskSet" ADD COLUMN     "trainingMinutes" INTEGER;

-- CreateTable
CREATE TABLE "TrainingAttempt" (
    "id" SERIAL NOT NULL,
    "setId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrainingAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingAttempt_studentId_idx" ON "TrainingAttempt"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAttempt_setId_studentId_key" ON "TrainingAttempt"("setId", "studentId");

-- CreateIndex
CREATE INDEX "TrainingAnswer_taskId_idx" ON "TrainingAnswer"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingAnswer_attemptId_taskId_key" ON "TrainingAnswer"("attemptId", "taskId");

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TaskSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAnswer" ADD CONSTRAINT "TrainingAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "TrainingAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingAnswer" ADD CONSTRAINT "TrainingAnswer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
