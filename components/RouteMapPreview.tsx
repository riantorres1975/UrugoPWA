"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function RouteMapPreview({ image, sources, name, children }: {
  image: string | null; sources: { media: string; url: string | null }[]; name: string; children: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // A cached image error can fire before hydration attaches onError.
    const timer = window.setTimeout(() => {
      if (imageRef.current?.complete && imageRef.current.naturalWidth === 0) setFailed(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!image || failed) return <div className="route-map-fallback" role="img" aria-label={`Esquema del recorrido de ${name}`}>
    {children}<span>Vista esquemática del recorrido</span>
  </div>;
  return <picture>
    {sources.map((source) => source.url && <source key={source.media} media={source.media} srcSet={source.url} />)}
    <img ref={imageRef} src={image} alt={`Mapa del recorrido de la ${name} en Uruapan`} width={640} height={480} onError={() => setFailed(true)} />
  </picture>;
}
