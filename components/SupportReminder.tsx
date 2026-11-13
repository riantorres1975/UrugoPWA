"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, X } from "lucide-react";
import { ONBOARDING_STORAGE_KEY } from "@/lib/onboarding";
import { canShowSupportReminder, registerSupportVisit, SUPPORT_REMINDER_DAYS, SUPPORT_REMINDER_UNTIL, SUPPORT_VISITS_KEY } from "@/lib/support-reminder";
import "./support-reminder.css";

function interfaceIsIdle() {
  if (document.visibilityState !== "visible" || !navigator.onLine) return false;
  if (document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) return false;
  if (Array.from(document.querySelectorAll('[role="dialog"],[role="listbox"]')).some((element) => {
    if (element.closest('[aria-hidden="true"],[inert]')) return false;
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight && bounds.bottom > 0 && style.visibility !== "hidden" && style.display !== "none";
  })) return false;
  const viewport = window.visualViewport;
  return !viewport || window.innerHeight - viewport.height < 150;
}

export default function SupportReminder({ blocked }: { blocked: boolean }) {
  const [visible, setVisible] = useState(false);
  const card = useRef<HTMLElement>(null);
  const dismissed = useRef(false);
  const shownAt = useRef(0);
  const mountedAt = useRef(0);
  useEffect(() => {
    if (!mountedAt.current) mountedAt.current = Date.now();
    let visits: ReturnType<typeof registerSupportVisit>;
    try {
      visits = registerSupportVisit(localStorage.getItem(SUPPORT_VISITS_KEY), Date.now());
      localStorage.setItem(SUPPORT_VISITS_KEY, JSON.stringify(visits));
    } catch { return; } // No working storage: don't repeatedly ask on every visit.
    function check() {
      if (dismissed.current) return;
      const now = Date.now();
      const focused = card.current?.contains(document.activeElement) ?? false;
      if (shownAt.current && now - shownAt.current >= 20_000 && !focused) { dismissed.current = true; setVisible(false); return; }
      let eligible = false;
      try {
        eligible = localStorage.getItem(ONBOARDING_STORAGE_KEY) === "1" && (shownAt.current > 0 || canShowSupportReminder(visits, Number(localStorage.getItem(SUPPORT_REMINDER_UNTIL) ?? 0), now, mountedAt.current));
      } catch { /* Storage may become unavailable while the page is open. */ }
      const show = eligible && !blocked && interfaceIsIdle();
      if (show && !shownAt.current) {
        try { localStorage.setItem(SUPPORT_REMINDER_UNTIL, String(now + SUPPORT_REMINDER_DAYS * 86400_000)); }
        catch { return; }
        shownAt.current = now;
      }
      setVisible(show);
    }
    check();
    const interval = window.setInterval(check, 1000);
    document.addEventListener("focusin", check); document.addEventListener("focusout", check);
    document.addEventListener("visibilitychange", check);
    window.visualViewport?.addEventListener("resize", check);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { clearInterval(interval); observer.disconnect(); document.removeEventListener("focusin", check); document.removeEventListener("focusout", check); document.removeEventListener("visibilitychange", check); window.visualViewport?.removeEventListener("resize", check); };
  }, [blocked]);
  function quiet(days: number) {
    dismissed.current = true; setVisible(false);
    try { localStorage.setItem(SUPPORT_REMINDER_UNTIL, String(Date.now() + days * 86400_000)); } catch { /* No telemetry or remote storage. */ }
  }
  if (blocked || !visible) return null;
  return <aside ref={card} className="map-support-reminder" aria-label="Apoyo voluntario a UruGo">
    <Heart className="map-support-heart" aria-hidden="true" /><div><p>¿UruGo te ayuda a llegar?</p><span>Un apoyo voluntario ayuda a mantener el mapa.</span><Link href="/apoyar" onClick={() => quiet(90)}>Ver cómo apoyar →</Link></div>
    <button type="button" aria-label="Cerrar recordatorio por 30 días" onClick={() => quiet(30)}><X aria-hidden="true" /></button>
  </aside>;
}
