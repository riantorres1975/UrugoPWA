"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function LandingActivityReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <section ref={ref} className="landing-ranking" data-revealed={revealed} aria-labelledby="activity-title">{children}</section>;
}
