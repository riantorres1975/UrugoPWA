export type CameraPadding = { top: number; right: number; bottom: number; left: number };

/** Keep at least half the map available while the mobile keyboard changes its size. */
export function getSafeCameraPadding(width: number, height: number, requested: CameraPadding): CameraPadding {
  const vertical = requested.top + requested.bottom;
  const horizontal = requested.left + requested.right;
  const scaleY = vertical > 0 ? Math.min(1, Math.max(0, height) / 2 / vertical) : 1;
  const scaleX = horizontal > 0 ? Math.min(1, Math.max(0, width) / 2 / horizontal) : 1;
  return {
    top: requested.top * scaleY,
    bottom: requested.bottom * scaleY,
    left: requested.left * scaleX,
    right: requested.right * scaleX,
  };
}
