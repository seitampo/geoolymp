export function ErrorBanner({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800"
    >
      {message}
    </div>
  );
}
