export function ErrorBanner({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <svg
        className="mt-0.5 h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 15.5v.5" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
