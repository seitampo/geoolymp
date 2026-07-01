-- Индексы на внешние ключи для ускорения выборок по группам, учителю и ученику.
CREATE INDEX "Group_teacherId_idx" ON "Group"("teacherId");
CREATE INDEX "Material_groupId_idx" ON "Material"("groupId");
CREATE INDEX "Task_groupId_idx" ON "Task"("groupId");
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");
