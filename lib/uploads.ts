import { randomUUID } from "crypto";
import path from "path";
import { r2CopyObject, r2DeleteObject, r2GetObject, r2PutObject, r2TotalBytes } from "./r2";

/** Максимальный размер одного загружаемого файла (10 МБ). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Потолок суммарного объёма хранилища (5 ГБ). Держим заметно ниже бесплатного
 * лимита R2 (10 ГБ), чтобы исключить любые списания: при достижении потолка новые
 * загрузки блокируются, а не оплачиваются.
 */
export const MAX_TOTAL_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;

/** Расширения изображений, которые принимаем и отдаём с image/* Content-Type. */
export const allowedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

export function isUploadTooLarge(sizeInBytes: number) {
  return sizeInBytes > MAX_UPLOAD_BYTES;
}

export function maxUploadLabel() {
  return `${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} МБ`;
}

export function storageLimitLabel() {
  return `${Math.round(MAX_TOTAL_STORAGE_BYTES / (1024 * 1024 * 1024))} ГБ`;
}

/** Есть ли место под новый файл в пределах потолка хранилища. */
export async function hasStorageRoom(incomingBytes: number): Promise<boolean> {
  const used = await r2TotalBytes();
  return used + incomingBytes <= MAX_TOTAL_STORAGE_BYTES;
}

export function isAllowedImageFileName(fileName: string) {
  return allowedImageExtensions.includes(path.extname(fileName).toLowerCase());
}

/** Ключ объекта в R2: uploads/<папка>/<uuid><расширение>. Тот же формат, что раньше
 *  хранился в БД для локального диска, — данные и логика роутов не меняются. */
function buildObjectKey(folder: string, fileName: string) {
  const extension = path.extname(sanitizeFileName(fileName)).toLowerCase();
  return ["uploads", folder, `${randomUUID()}${extension}`].join("/");
}

export async function saveUploadedFile(file: File, folder: "materials" | "tasks" | "submissions") {
  const originalFileName = sanitizeFileName(file.name);
  const filePath = buildObjectKey(folder, originalFileName);
  const body = Buffer.from(await file.arrayBuffer());
  await r2PutObject(filePath, body, file.type || undefined);

  return { filePath, originalFileName };
}

/** Читает загруженный файл из R2. Возвращает null, если объекта нет. */
export function readUploadedFile(filePath: string) {
  return r2GetObject(filePath);
}

/** Удаляет загруженный файл из R2. Отсутствие объекта не считается ошибкой. */
export async function deleteUploadedFile(filePath: string): Promise<void> {
  await r2DeleteObject(filePath);
}

/**
 * Физическая копия загруженного файла под новым ключом — для дублирования
 * материалов и задач: у копии свой объект, удаление оригинала её не ломает.
 * Возвращает null, если исходного объекта нет.
 */
export async function copyUploadedFile(
  sourceFilePath: string,
  folder: "materials" | "tasks",
): Promise<string | null> {
  const destinationKey = buildObjectKey(folder, sourceFilePath);
  const copied = await r2CopyObject(sourceFilePath, destinationKey);
  return copied ? destinationKey : null;
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
