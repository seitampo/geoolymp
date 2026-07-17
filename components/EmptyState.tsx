import { Compass, ContourLines } from "@/components/Compass";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-ink/20 bg-white px-6 py-12 text-center">
      <ContourLines className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-ink/10" />
      <div className="relative">
        <Compass className="mx-auto mb-3 h-10 w-10" />
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-mute">{description}</p>}
      </div>
    </div>
  );
}
