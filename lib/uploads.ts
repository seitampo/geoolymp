import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

/** Максимальный размер одного загружаемого файла (10 МБ). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Расширения изображений, которые принимаем и отдаём с image/* Content-Type. */
export const allowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

export function isUploadTooLarge(sizeInBytes: number) {
  return sizeInBytes > MAX_UPLOAD_BYTES;
}

export function maxUploadLabel() {
  return `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} МБ`;
}

export function isAllowedImageFileName(fileName: string) {
  return allowedImageExtensions.includes(path.extname(fileName).toLowerCase());
}

export async function saveUploadedFile(file: File, folder: "materials" | "tasks" | "submissions") {
  const uploadsDirectory = path.join(process.cwd(), "uploads", folder);
  await mkdir(uploadsDirectory, { recursive: true });

  const originalFileName = sanitizeFileName(file.name);
  const extension = path.extname(originalFileName).toLowerCase();
  const storedFileName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(uploadsDirectory, storedFileName);

  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    // В БД путь храним всегда с "/": path.join на Windows даёт "\", и такие записи
    // ломаются после переезда на Linux-хостинг. path.join при чтении понимает оба вида.
    filePath: ["uploads", folder, storedFileName].join("/"),
    originalFileName,
  };
}

export function getAbsoluteUploadPath(filePath: string) {
  return path.join(process.cwd(), filePath);
}

export function sanitizeFileName(fileName: string) {
  return path.basename(fileName).replace(/[^\w.\-а-яА-ЯёЁ ]/g, "_");
}

/**
 * Content-Disposition с поддержкой кириллицы: `filename*` (RFC 5987) читают современные
 * браузеры, а ASCII-`filename` — запасной вариант. Раньше кириллические имена скачивались
 * в виде percent-encoded строки ("%D0%9A%D0%B0...").
 */
export function contentDisposition(type: "inline" | "attachment", fileName: string) {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `${type}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}
