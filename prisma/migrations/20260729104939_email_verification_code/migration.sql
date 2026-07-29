-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Уже зарегистрированные пользователи адрес подтвердить не могли — их аккаунты
-- считаем подтверждёнными, иначе после этой миграции они не смогут войти.
-- Требование подтверждения действует только для новых регистраций.
UPDATE "User" SET "emailVerified" = true;

-- CreateTable
CREATE TABLE "EmailVerificationCode" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailVerificationCode_userId_idx" ON "EmailVerificationCode"("userId");

-- AddForeignKey
ALTER TABLE "EmailVerificationCode" ADD CONSTRAINT "EmailVerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
