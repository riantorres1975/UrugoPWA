"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getRouteKey } from "@/lib/route-names";
import type { PublicRouteSignalStatus } from "@/lib/community-route-status";

export default function FavoriteNotices({ names }: { names: string[] }) {
  const key = JSON.stringify(names);
  const [notices, setNotices] = useState<{ name: string; date: string; expires: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      const routes: string[] = JSON.parse(key);
      const results = await Promise.all(routes.map(async (name) => {
        try {
          const response = await fetch(`/api/v1/routes/${getRouteKey(name)}/community-status`, { signal: controller.signal });
          if (!response.ok) return null;
          const data = await response.json() as PublicRouteSignalStatus;
          const date = Date.parse(data.observedAt ?? "");
          const expires = date + 7 * 86400_000;
          return data.state === "review_suggested" && date <= Date.now() && expires > Date.now()
            ? { name, date: new Date(date).toISOString(), expires: new Date(expires).toISOString() } : null;
        } catch { return null; }
      }));
      if (!controller.signal.aborted) setNotices(results.filter((item): item is NonNullable<typeof item> => !!item));
    }
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 300_000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [key]);
  if (!notices.length) return null;
  return <div className="mt-4 border-t border-white/15 pt-3"><h3 className="text-sm font-bold text-amber-200">Avisos de tus favoritas</h3>
    {notices.map((notice) => <p key={notice.name} className="mt-2 text-xs leading-5 text-[#c0cbb9]">
      <Link className="font-bold text-amber-200 underline" href={`/ruta/${getRouteKey(notice.name)}`}>{notice.name}</Link>: hay señales comunitarias revisadas de posibles cambios. Confirma el recorrido antes de salir.
      <span className="block">Reporte del {new Date(notice.date).toLocaleDateString("es-MX")} · Visible hasta {new Date(notice.expires).toLocaleDateString("es-MX")}</span>
    </p>)}
  </div>;
}
