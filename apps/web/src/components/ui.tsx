'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';
import { AlertCircle, Check, Loader2, X, Inbox, ArrowUpRight } from 'lucide-react';
import { api, labels } from '@/lib/api';
export function useData<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    api<T>(path)
      .then((v) => {
        if (active) setData(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
export function State({
  error,
  loading,
  children,
}: {
  error?: string;
  loading?: boolean;
  children: ReactNode;
}) {
  if (error)
    return (
      <div className="notice error">
        <AlertCircle size={20} />
        <div>
          {error}{' '}
          <button className="text-button" onClick={() => location.reload()}>
            Coba lagi
          </button>
        </div>
      </div>
    );
  if (loading)
    return (
      <div className="loading">
        <Loader2 className="spin" /> Memuat informasi…
      </div>
    );
  return children;
}
export function Badge({ value }: { value: string }) {
  return <span className={`badge b-${value.toLowerCase()}`}>{labels[value] || value}</span>;
}
export function Empty({
  text = 'Belum ada data',
  children,
}: {
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={32} />
      <h3>{text}</h3>
      {children}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Panel({
  title,
  children,
  action,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Action({
  children,
  onClick,
  className = 'button',
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => Promise<unknown>;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span className="action-wrap">
      <button
        className={className}
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await onClick();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 size={16} className="spin" /> : null}
        {children}
      </button>
      {error && (
        <small role="alert" className="error-text">
          {error}
        </small>
      )}
    </span>
  );
}
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  value?: string | number;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: string;
  accept?: string;
  hint?: string;
};
export function Form({
  fields,
  submit,
  onSubmit,
  children,
}: {
  fields: Field[];
  submit: string;
  onSubmit: (values: Record<string, FormDataEntryValue>, data: FormData) => Promise<unknown>;
  children?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setBusy(true);
        setError('');
        setSuccess(false);
        try {
          const data = new FormData(form);
          await onSubmit(Object.fromEntries(data), data);
          setSuccess(true);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map((f) => (
        <label className={f.type === 'textarea' ? 'full' : ''} key={f.name}>
          <span>
            {f.label}
            {f.required !== false && ' *'}
          </span>
          {f.options ? (
            <select name={f.name} defaultValue={f.value ?? ''} required={f.required !== false}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              name={f.name}
              defaultValue={f.value}
              required={f.required !== false}
              rows={4}
            />
          ) : (
            <input
              name={f.name}
              type={f.type || 'text'}
              defaultValue={f.type === 'file' ? undefined : f.value}
              required={f.required !== false}
              min={f.min}
              max={f.max}
              step={f.step}
              accept={f.accept}
            />
          )}{' '}
          {f.hint && <small className="muted">{f.hint}</small>}
        </label>
      ))}
      {children}
      {error && (
        <div className="notice error full" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {success && (
        <div className="notice success full" role="status">
          <Check size={18} />
          Berhasil disimpan.
        </div>
      )}
      <button className="button full" type="submit" disabled={busy}>
        {busy ? <Loader2 size={18} className="spin" /> : null}
        {busy ? 'Memproses…' : submit}
      </button>
    </form>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="panel-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Tutup">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Stat({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        {icon || <ArrowUpRight size={18} />}
      </div>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
