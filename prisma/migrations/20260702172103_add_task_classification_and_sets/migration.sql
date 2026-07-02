-- CreateEnum
CREATE TYPE "OlympiadLevel" AS ENUM ('SCHOOL', 'REGIONAL', 'REPUBLICAN', 'INTERNATIONAL');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "difficulty" INTEGER,
ADD COLUMN     "grade" INTEGER,
ADD COLUMN     "olympiadLevel" "OlympiadLevel";

-- CreateTable
CREATE TABLE "TaskSet" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TaskSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSetItem" (
    "id" SERIAL NOT NULL,
    "setId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "TaskSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskSet_groupId_idx" ON "TaskSet"("groupId");

-- CreateIndex
CREATE INDEX "TaskSetItem_taskId_idx" ON "TaskSetItem"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSetItem_setId_taskId_key" ON "TaskSetItem"("setId", "taskId");

-- AddForeignKey
ALTER TABLE "TaskSet" ADD CONSTRAINT "TaskSet_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSetItem" ADD CONSTRAINT "TaskSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "TaskSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSetItem" ADD CONSTRAINT "TaskSetItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
