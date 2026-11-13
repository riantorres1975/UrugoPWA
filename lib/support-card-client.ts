import { supportThanksSvg } from "@/lib/support-management";

/** Render our own SVG to a PNG that messaging apps can open. No remote assets. */
export async function createSupportCardPng(name: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([supportThanksSvg(name)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1080;
    const context = canvas.getContext("2d");
    if (!context) throw Error("Canvas unavailable");
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(Error("Export unavailable")), "image/png"));
  } finally { URL.revokeObjectURL(url); }
}
