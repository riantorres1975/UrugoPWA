type ViewportMetrics = {
  innerHeight: number;
  clientHeight: number;
  visualHeight?: number;
  offsetTop?: number;
  scale?: number;
};

/** Some standalone launches report a dvh taller than the visible app window. */
export function getMapViewportBounds(metrics: ViewportMetrics): { height: number; top: number } | null {
  // Let the browser pan a magnified page; resizing the UI during pinch zoom fights it.
  if (metrics.scale !== undefined && Math.abs(metrics.scale - 1) > .01) return null;
  const heights = [metrics.innerHeight, metrics.clientHeight].filter(n => Number.isFinite(n) && n > 0);
  if (!heights.length) return null;
  const layoutHeight = Math.min(...heights);
  const top = Number.isFinite(metrics.offsetTop) ? Math.max(0, metrics.offsetTop!) : 0;
  const visible = metrics.visualHeight;
  const height = Math.floor(Math.min(layoutHeight - top, visible && Number.isFinite(visible) && visible > 0 ? visible : layoutHeight));
  return height > 0 ? { height, top: Math.floor(top) } : null;
}

/** React callback ref: measures before paint, including a restored/installed window. */
export function observeMapViewport(element: HTMLElement | null) {
  if (!element) return;
  const viewport = window.visualViewport;
  const standalone = window.matchMedia("(display-mode: standalone)");
  let frame = 0;
  let previous = "";
  const measure = () => {
    const bounds = getMapViewportBounds({
      innerHeight: window.innerHeight,
      clientHeight: document.documentElement.clientHeight,
      visualHeight: viewport?.height,
      offsetTop: viewport?.offsetTop,
      scale: viewport?.scale,
    });
    if (!bounds || document.visibilityState === "hidden") return;
    const key = `${bounds.height}:${bounds.top}`;
    if (key === previous) return;
    previous = key;
    element.style.setProperty("--map-viewport-height", `${bounds.height}px`);
    element.style.setProperty("--map-viewport-top", `${bounds.top}px`);
  };
  const refresh = () => {
    measure();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  };
  refresh();
  // Android's installed window can settle after hydration without a resize event.
  const settling = [100, 500, 1000].map(delay => window.setTimeout(refresh, delay));
  const events = ["resize", "orientationchange", "pageshow", "appinstalled"];
  events.forEach(event => window.addEventListener(event, refresh));
  document.addEventListener("visibilitychange", refresh);
  viewport?.addEventListener("resize", refresh);
  viewport?.addEventListener("scroll", refresh);
  standalone.addEventListener("change", refresh);
  return () => {
    cancelAnimationFrame(frame); settling.forEach(clearTimeout);
    events.forEach(event => window.removeEventListener(event, refresh));
    document.removeEventListener("visibilitychange", refresh);
    viewport?.removeEventListener("resize", refresh);
    viewport?.removeEventListener("scroll", refresh);
    standalone.removeEventListener("change", refresh);
    element.style.removeProperty("--map-viewport-height");
    element.style.removeProperty("--map-viewport-top");
  };
}
