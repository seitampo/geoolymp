-- CreateTable
CREATE TABLE "Olympiad" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "shuffleTasks" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Olympiad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlympiadTask" (
    "id" SERIAL NOT NULL,
    "olympiadId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "OlympiadTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlympiadGroup" (
    "id" SERIAL NOT NULL,
    "olympiadId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,

    CONSTRAINT "OlympiadGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlympiadAttempt" (
    "id" SERIAL NOT NULL,
    "olympiadId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "taskOrder" TEXT NOT NULL,

    CONSTRAINT "OlympiadAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OlympiadAnswer" (
    "id" SERIAL NOT NULL,
    "attemptId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "OlympiadAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Olympiad_teacherId_idx" ON "Olympiad"("teacherId");

-- CreateIndex
CREATE INDEX "OlympiadTask_taskId_idx" ON "OlympiadTask"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "OlympiadTask_olympiadId_taskId_key" ON "OlympiadTask"("olympiadId", "taskId");

-- CreateIndex
CREATE INDEX "OlympiadGroup_groupId_idx" ON "OlympiadGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "OlympiadGroup_olympiadId_groupId_key" ON "OlympiadGroup"("olympiadId", "groupId");

-- CreateIndex
CREATE INDEX "OlympiadAttempt_studentId_idx" ON "OlympiadAttempt"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "OlympiadAttempt_olympiadId_studentId_key" ON "OlympiadAttempt"("olympiadId", "studentId");

-- CreateIndex
CREATE INDEX "OlympiadAnswer_taskId_idx" ON "OlympiadAnswer"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "OlympiadAnswer_attemptId_taskId_key" ON "OlympiadAnswer"("attemptId", "taskId");

-- AddForeignKey
ALTER TABLE "Olympiad" ADD CONSTRAINT "Olympiad_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadTask" ADD CONSTRAINT "OlympiadTask_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadTask" ADD CONSTRAINT "OlympiadTask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadGroup" ADD CONSTRAINT "OlympiadGroup_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadGroup" ADD CONSTRAINT "OlympiadGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadAttempt" ADD CONSTRAINT "OlympiadAttempt_olympiadId_fkey" FOREIGN KEY ("olympiadId") REFERENCES "Olympiad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadAttempt" ADD CONSTRAINT "OlympiadAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadAnswer" ADD CONSTRAINT "OlympiadAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "OlympiadAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OlympiadAnswer" ADD CONSTRAINT "OlympiadAnswer_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
