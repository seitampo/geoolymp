CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "Group" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "teacherId" INTEGER NOT NULL,
  CONSTRAINT "Group_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

CREATE TABLE "Membership" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId" INTEGER NOT NULL,
  "groupId" INTEGER NOT NULL,
  CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Membership_userId_groupId_key" ON "Membership"("userId", "groupId");

CREATE TABLE "Material" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "groupId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  CONSTRAINT "Material_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Task" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "groupId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "maxScore" INTEGER NOT NULL,
  CONSTRAINT "Task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Submission" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "taskId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "answer" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "Submission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Submission_taskId_studentId_key" ON "Submission"("taskId", "studentId");

CREATE TABLE "Review" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "submissionId" INTEGER NOT NULL,
  "score" INTEGER NOT NULL,
  "feedback" TEXT NOT NULL,
  CONSTRAINT "Review_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Review_submissionId_key" ON "Review"("submissionId");
