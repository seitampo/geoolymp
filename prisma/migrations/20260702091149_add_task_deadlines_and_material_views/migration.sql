-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "opensAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MaterialView" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaterialView_userId_idx" ON "MaterialView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialView_materialId_userId_key" ON "MaterialView"("materialId", "userId");

-- AddForeignKey
ALTER TABLE "MaterialView" ADD CONSTRAINT "MaterialView_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialView" ADD CONSTRAINT "MaterialView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
