import { ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, busy = false, className = '' }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)')?.focus();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className={`form-modal supplier-dialog ${className}`} aria-labelledby={titleId} onKeyDownCapture={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!busy) onClose(); }
  }} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="form-modal-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-btn" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={18}/></button></div>
    {children}
  </dialog>;
}
