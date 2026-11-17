"use client";
import { useEffect, useId, useRef, useState } from "react";
export function PasswordField({
  label = "Password",
  newPassword = false,
}: {
  label?: string;
  newPassword?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-input">
        <input
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={newPassword ? "new-password" : "current-password"}
          required
          minLength={newPassword ? 12 : 1}
          maxLength={128}
          aria-describedby={newPassword ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-controls={id}
          aria-pressed={visible}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {newPassword && (
        <p className="field-hint" id={`${id}-hint`}>
          Use 12–128 characters. A long, unique passphrase works well.
        </p>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Pagination({
  page,
  total,
  size = 20,
  onChange,
  loading,
}: {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
  loading: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pagination">
      <span>
        {total} {total === 1 ? "result" : "results"} · Page {page} of {pages}
      </span>
      <div>
        <button
          disabled={loading || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          disabled={loading || page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function utcTime(value: string): string {
  return `${new Date(value).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}
