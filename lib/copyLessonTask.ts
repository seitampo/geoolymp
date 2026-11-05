import type { Task } from "@prisma/client";
import {
  copyUploadedFile,
  deleteUploadedFile,
  hasStorageRoom,
  readUploadedFile,
} from "./uploads";

/** Each issued lesson has independent answers and files; reusing a question never moves it. */
export async function prepareLessonTaskCopy(
  task: Task,
  groupId: number,
  published: boolean,
) {
  const files: string[] = [];
  try {
    let imagePath: string | null = null;
    let explanationFilePath: string | null = null;
    for (const field of ["imagePath", "explanationFilePath"] as const) {
      const source = task[field];
      if (!source) continue;
      const original = await readUploadedFile(source);
      if (!original || !(await hasStorageRoom(original.byteLength)))
        throw new Error("The source file is unavailable or storage is full.");
      const copy = await copyUploadedFile(source, "tasks");
      if (!copy) throw new Error("The source file is unavailable.");
      files.push(copy);
      if (field === "imagePath") imagePath = copy;
      else explanationFilePath = copy;
    }
    return {
      files,
      data: {
        groupId,
        title: task.title,
        description: task.description,
        maxScore: task.maxScore,
        type: task.type,
        options: task.options,
        correctAnswer: task.correctAnswer,
        imagePath,
        originalImageName: task.originalImageName,
        explanationText: task.explanationText,
        explanationFilePath,
        explanationFileName: task.explanationFileName,
        mapTargetX: task.mapTargetX,
        mapTargetY: task.mapTargetY,
        mapRadius: task.mapRadius,
        grade: task.grade,
        difficulty: task.difficulty,
        olympiadLevel: task.olympiadLevel,
        isPublished: published,
        isLibraryItem: false,
      },
    };
  } catch (error) {
    await Promise.allSettled(files.map(deleteUploadedFile));
    throw error;
  }
}
