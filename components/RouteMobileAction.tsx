"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

export default function RouteMobileAction({ href, name }: { href: string; name: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const primary = document.getElementById("route-map-action");
    if (!primary) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { rootMargin: "-72px 0px 0px 0px" });
    observer.observe(primary);
    return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  return <nav className="route-mobile-action" aria-label="Acceso rápido a la ruta">
    <Link href={href} className="transport-button transport-button-primary">Ver {name} en el mapa <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
  </nav>;
}
