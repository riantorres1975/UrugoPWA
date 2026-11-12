"use client";

import { useEffect } from "react";

// Read after hydration so these directories retain their static, searchable HTML.
export function useDirectoryUrl(query: string, restore: (value: string) => void) {
  useEffect(() => {
    const read = () => restore(new URL(window.location.href).searchParams.get("buscar")?.slice(0, 120) ?? "");
    const timer = window.setTimeout(read, 0);
    window.addEventListener("popstate", read);
    return () => { window.clearTimeout(timer); window.removeEventListener("popstate", read); };
  }, [restore]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (query.trim()) url.searchParams.set("buscar", query.trim()); else url.searchParams.delete("buscar");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query]);
}
