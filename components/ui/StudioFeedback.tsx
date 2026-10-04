"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, CircleAlert, Info, X } from "lucide-react";
import StudioTooltips from "./StudioTooltips";

type Tone = "success" | "warning" | "error" | "info";
type Notice = { id: number; message: string; tone: Tone };
type Confirmation = { message: string; resolve: (confirmed: boolean) => void };

export function notify(message: string, tone: Tone = "error") {
  window.dispatchEvent(new CustomEvent("studio-notice", { detail: { message, tone } }));
}
export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => window.dispatchEvent(new CustomEvent("studio-confirm", { detail: { message, resolve } })));
}

/** Themed feedback; native modal focus containment and Escape retain confirmation semantics. */
export default function StudioFeedback({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const queue = useRef<Confirmation[]>([]);
  const current = useRef<Confirmation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const count = useRef(0);
  const answer = useCallback((result: boolean) => {
    current.current?.resolve(result);
    current.current = queue.current.shift() ?? null;
    setConfirmation(current.current);
  }, []);
  useEffect(() => {
    const notice = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Notice, "id">>).detail;
      const id = ++count.current;
      setNotices(items => [...items.slice(-3), { ...detail, id }]);
      const timer = setTimeout(() => { setNotices(items => items.filter(item => item.id !== id)); timers.current.delete(timer); }, 7000);
      timers.current.add(timer);
    };
    const confirm = (event: Event) => {
      const next = (event as CustomEvent<Confirmation>).detail;
      if (current.current) queue.current.push(next);
      else { restoreFocus.current = document.activeElement as HTMLElement; current.current = next; setConfirmation(next); }
    };
    document.documentElement.dataset.pageHidden = String(document.hidden);
    const visibility = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    window.addEventListener("studio-notice", notice);
    window.addEventListener("studio-confirm", confirm);
    document.addEventListener("visibilitychange", visibility);
    const pendingTimers = timers.current;
    return () => {
      window.removeEventListener("studio-notice", notice);
      window.removeEventListener("studio-confirm", confirm);
      document.removeEventListener("visibilitychange", visibility);
      pendingTimers.forEach(clearTimeout);
      current.current?.resolve(false);
      queue.current.forEach(item => item.resolve(false));
    };
  }, []);
  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirmation && dialog.current?.open) {
      dialog.current.close();
      restoreFocus.current?.focus({ preventScroll: true });
    }
  }, [confirmation]);
  return <>{children}
    <StudioTooltips />
    <div className="studio-toast-stack" aria-live="polite" aria-relevant="additions">
      {notices.map(notice => <div key={notice.id} className="studio-toast" data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>
        {notice.tone === "success" ? <CircleCheck size={18} className="shrink-0 text-success" /> : notice.tone === "info" ? <Info size={18} className="shrink-0 text-info" /> : <CircleAlert size={18} className={"shrink-0 " + (notice.tone === "warning" ? "text-warning" : "text-destructive")} />}
        <p>{notice.message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setNotices(items => items.filter(item => item.id !== notice.id))}><X size={16} /></button>
      </div>)}
    </div>
    <dialog ref={dialog} className="studio-dialog" aria-labelledby="studio-confirm-title" aria-describedby="studio-confirm-copy"
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onCancel={event => { event.preventDefault(); answer(false); }}>
      <div className="studio-dialog-copy"><p className="studio-eyebrow mb-3">Please confirm</p><h2 id="studio-confirm-title">Delete this item?</h2><p id="studio-confirm-copy">{confirmation?.message}</p></div>
      <div className="studio-dialog-actions"><button type="button" autoFocus className="studio-compact-button" onClick={() => answer(false)}>Keep item</button><button type="button" className="studio-compact-button studio-compact-button--danger" onClick={() => answer(true)}>Delete item</button></div>
    </dialog>
  </>;
}
