import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function saveUploadedFile(file: File, folder: "materials" | "tasks" | "submissions") {
  const uploadsDirectory = path.join(process.cwd(), "uploads", folder);
  await mkdir(uploadsDirectory, { recursive: true });

  const originalFileName = sanitizeFileName(file.name);
  const extension = path.extname(originalFileName).toLowerCase();
  const storedFileName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(uploadsDirectory, storedFileName);

  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    filePath: path.join("uploads", folder, storedFileName),
    originalFileName,
  };
}

export function getAbsoluteUploadPath(filePath: string) {
  return path.join(process.cwd(), filePath);
}

export function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_");
}
