-- Keep existing lessons available. Application-created lessons now start as drafts.
ALTER TABLE "TaskSet" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TaskSet" ADD COLUMN "assignedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "isLibraryItem" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Material" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "_LessonMaterials" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_LessonMaterials_A_fkey" FOREIGN KEY ("A") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LessonMaterials_B_fkey" FOREIGN KEY ("B") REFERENCES "TaskSet"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "_LessonMaterials_AB_unique" ON "_LessonMaterials"("A", "B");
CREATE INDEX "_LessonMaterials_B_index" ON "_LessonMaterials"("B");
