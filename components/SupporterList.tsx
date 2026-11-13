"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Keep names server-rendered; animate each card only when it enters the screen. */
export default function SupporterList({ children }: { children: ReactNode }) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!list.current || typeof IntersectionObserver === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.setAttribute("data-supporter-visible", "true");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.15 });
    for (const item of Array.from(list.current.children)) {
      if (!item.hasAttribute("data-supporter-visible")) observer.observe(item);
    }
    return () => observer.disconnect();
  }, [children]);
  return <ul ref={list} className="supporter-grid">{children}</ul>;
}
