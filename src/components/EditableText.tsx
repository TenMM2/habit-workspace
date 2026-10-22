import { useEffect, useState, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onCommit: (valor: string) => void;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  allowEmpty?: boolean;
  ariaLabel: string;
}

/** Texto editable en el sitio: guarda al salir del campo (o con Enter) y revierte si queda vacío. */
export default function EditableText({
  value,
  onCommit,
  className = '',
  placeholder,
  maxLength = 200,
  multiline = false,
  allowEmpty = false,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  function confirmar() {
    const limpio = draft.trim();
    if (limpio === value) return setDraft(value);
    if (limpio === '' && !allowEmpty) return setDraft(value);
    onCommit(limpio);
  }

  const base = `w-full resize-none rounded-md bg-transparent px-1 outline-none transition-colors hover:bg-hover focus:bg-hover ${className}`;

  if (multiline) {
    return (
      <textarea
        aria-label={ariaLabel}
        className={base}
        rows={Math.max(2, draft.split('\n').length)}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={confirmar}
      />
    );
  }
  return (
    <input
      aria-label={ariaLabel}
      className={base}
      type="text"
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}
