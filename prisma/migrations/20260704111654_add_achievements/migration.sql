-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "EarnedBadge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),

    CONSTRAINT "EarnedBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarnedBadge_userId_idx" ON "EarnedBadge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedBadge_userId_code_key" ON "EarnedBadge"("userId", "code");

-- AddForeignKey
ALTER TABLE "EarnedBadge" ADD CONSTRAINT "EarnedBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
