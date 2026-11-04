"use client";

import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ActionForm({
  action,
  children,
  errorLabel,
  savingLabel,
  successLabel,
  resetOnSuccess = false,
}: {
  action: string;
  children: ReactNode;
  errorLabel: string;
  savingLabel: string;
  successLabel: string;
  resetOnSuccess?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [version, setVersion] = useState(0);
  const active = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    active.current = true;
    const form = event.currentTarget;
    const body = new FormData(form);
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      const response = await fetch(action, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || errorLabel);
      setSuccess(data.message || successLabel);
      if (resetOnSuccess) setVersion((value) => value + 1);
      if (data.redirectTo) router.push(data.redirectTo);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : errorLabel);
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      action={action}
      method="post"
      encType="multipart/form-data"
      onSubmit={submit}
      className="mt-4 grid gap-4"
    >
      <fieldset key={version} disabled={busy} className="grid min-w-0 gap-4">
        {children}
      </fieldset>
      {busy && (
        <p role="status" className="text-sm text-ink-mute">
          {savingLabel}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {success}
        </p>
      )}
      {error && (
        <p
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
