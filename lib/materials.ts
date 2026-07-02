import { MaterialType } from "@prisma/client";
import path from "path";
import { allowedImageExtensions, getAbsoluteUploadPath, saveUploadedFile } from "./uploads";

export const materialTypes = [
  { value: MaterialType.TEXT, label: "Только текст (без файла и ссылки)" },
  { value: MaterialType.PDF, label: "PDF" },
  { value: MaterialType.DOCX, label: "DOCX" },
  { value: MaterialType.PPTX, label: "PPTX" },
  { value: MaterialType.IMAGE, label: "Изображение" },
  { value: MaterialType.LINK, label: "Ссылка на внешний ресурс" },
  { value: MaterialType.ZIP, label: "ZIP архив" },
];

const allowedExtensions: Record<MaterialType, string[]> = {
  TEXT: [],
  PDF: [".pdf"],
  DOCX: [".docx"],
  PPTX: [".pptx"],
  IMAGE: allowedImageExtensions,
  LINK: [],
  ZIP: [".zip"],
};

export function getMaterialTypeLabel(type: MaterialType) {
  return materialTypes.find((item) => item.value === type)?.label ?? type;
}

/** Короткая подпись для бейджа на карточке (полная — для выпадающего списка). */
export function getMaterialTypeBadgeLabel(type: MaterialType) {
  if (type === MaterialType.LINK) return "Ссылка";
  if (type === MaterialType.TEXT) return "Текст";
  return getMaterialTypeLabel(type);
}

/**
 * Ссылки материалов сохраняются в href как есть, поэтому принимаем только http/https:
 * без проверки можно сохранить javascript:-ссылку, которая выполнится по клику.
 */
export function isValidExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isFileMaterial(type: MaterialType) {
  return type !== MaterialType.LINK && type !== MaterialType.TEXT;
}

export function isPreviewableMaterial(type: MaterialType) {
  return type === MaterialType.PDF || type === MaterialType.IMAGE;
}

export function validateMaterialType(value: string): MaterialType | null {
  return materialTypes.some((item) => item.value === value) ? (value as MaterialType) : null;
}

export function isAllowedFileName(type: MaterialType, fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  return allowedExtensions[type].includes(extension);
}

export async function saveMaterialFile(file: File) {
  return saveUploadedFile(file, "materials");
}

export function getAbsoluteMaterialPath(filePath: string) {
  return getAbsoluteUploadPath(filePath);
}
