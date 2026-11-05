import type { Material, MaterialView } from "@prisma/client";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/Button";
import { getT } from "@/lib/i18n";
import type { LessonText } from "@/lib/lessonText";
export async function LessonMaterials({
  materials,
  text,
  studentId,
  preview = false,
}: {
  materials: (Material & { views?: MaterialView[] })[];
  text: LessonText;
  studentId?: number;
  preview?: boolean;
}) {
  const t = await getT();
  if (!materials.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{text.materials}</h2>
      {materials.map((material) => {
        const seen = material.views?.some((view) => view.userId === studentId);
        return (
          <article
            key={material.id}
            className="rounded-xl border border-line bg-white p-5"
          >
            <h3 className="font-semibold">{material.title}</h3>
            {material.description && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {material.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {(material.url || material.filePath) && (
                <a
                  href={
                    preview
                      ? (material.url ?? `/api/materials/${material.id}/file`)
                      : `/api/materials/${material.id}/download`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-navy"
                >
                  {material.url ? text.open : text.download}
                  {material.originalFileName
                    ? ` · ${material.originalFileName}`
                    : ""}
                </a>
              )}
              {studentId &&
                !preview &&
                (seen ? (
                  <span className="text-sm text-green-800">
                    ✓ {t("material.studied")}
                  </span>
                ) : (
                  <ActionForm
                    action={`/api/materials/${material.id}/viewed`}
                    errorLabel={text.error}
                    savingLabel={text.saving}
                    successLabel={text.saved}
                    stayOnPage
                  >
                    <Button variant="secondary" size="sm">
                      {t("material.markStudied")}
                    </Button>
                  </ActionForm>
                ))}
            </div>
          </article>
        );
      })}
    </section>
  );
}
