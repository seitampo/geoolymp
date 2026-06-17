PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Material" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "groupId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'LINK',
  "url" TEXT,
  "filePath" TEXT,
  "originalFileName" TEXT,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Material_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Material" ("id", "groupId", "title", "description", "type", "url")
SELECT "id", "groupId", "title", "description", 'LINK', "url" FROM "Material";

DROP TABLE "Material";
ALTER TABLE "new_Material" RENAME TO "Material";

PRAGMA foreign_keys=ON;

ALTER TABLE "Task" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Task" ADD COLUMN "options" TEXT;
ALTER TABLE "Task" ADD COLUMN "correctAnswer" TEXT;
ALTER TABLE "Task" ADD COLUMN "imagePath" TEXT;
ALTER TABLE "Task" ADD COLUMN "originalImageName" TEXT;

ALTER TABLE "Submission" ADD COLUMN "filePath" TEXT;
ALTER TABLE "Submission" ADD COLUMN "originalFileName" TEXT;
