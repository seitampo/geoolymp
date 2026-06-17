import { MaterialType } from "@prisma/client";
import path from "path";
import { getAbsoluteUploadPath, saveUploadedFile } from "./uploads";

export const materialTypes = [
  { value: MaterialType.PDF, label: "PDF" },
  { value: MaterialType.DOCX, label: "DOCX" },
  { value: MaterialType.PPTX, label: "PPTX" },
  { value: MaterialType.IMAGE, label: "Изображение" },
  { value: MaterialType.LINK, label: "Ссылка на внешний ресурс" },
  { value: MaterialType.ZIP, label: "ZIP архив" },
];

const allowedExtensions: Record<MaterialType, string[]> = {
  PDF: [".pdf"],
  DOCX: [".docx"],
  PPTX: [".pptx"],
  IMAGE: [".jpg", ".jpeg", ".png", ".webp"],
  LINK: [],
  ZIP: [".zip"],
};

export function getMaterialTypeLabel(type: MaterialType) {
  return materialTypes.find((item) => item.value === type)?.label ?? type;
}

export function isFileMaterial(type: MaterialType) {
  return type !== MaterialType.LINK;
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
