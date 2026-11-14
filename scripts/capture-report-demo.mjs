import { access, mkdir, readdir, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve, sep } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const workspace = resolve(process.cwd());
const frameDir = resolve(workspace, ".cache", "readme-report-demo");
const outputPath = join(workspace, "public", "readme", "reportar-ruta.gif");
const videoOutputPath = join(workspace, "public", "readme", "reportar-ruta.mp4");

if (!frameDir.startsWith(`${workspace}${sep}`)) {
  throw new Error("El directorio temporal debe permanecer dentro del proyecto.");
}

async function bundledFfmpegPath() {
  const pnpmDir = join(workspace, "node_modules", ".pnpm");
  const packages = await readdir(pnpmDir, { withFileTypes: true });
  const executable = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";

  for (const pkg of packages) {
    if (!pkg.isDirectory() || !pkg.name.startsWith("@remotion+compositor-")) continue;
    const scopeDir = join(pnpmDir, pkg.name, "node_modules", "@remotion");
    const scopedPackages = await readdir(scopeDir, { withFileTypes: true }).catch(() => []);
    for (const scopedPackage of scopedPackages) {
      if (!scopedPackage.isDirectory() || !scopedPackage.name.startsWith("compositor-")) continue;
      const candidate = join(scopeDir, scopedPackage.name, executable);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep looking for the platform-specific Remotion binary.
      }
    }
  }

  return null;
}

function availableFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const command = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  return spawnSync(command, ["-version"], { stdio: "ignore" }).status === 0 ? command : null;
}

await rm(frameDir, { recursive: true, force: true });
await mkdir(frameDir, { recursive: true });
await mkdir(join(workspace, "public", "readme"), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 720, height: 700 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  locale: "es-MX",
  serviceWorkers: "block",
});
await context.addInitScript(() => {
  localStorage.setItem("rutas-uru-onboarded", "1");
  localStorage.setItem("voy-pwa-banner-dismissed", "1");
  localStorage.setItem("voy-pwa-ios-hint-dismissed", "1");
  localStorage.setItem("urugo:announcement:dismissed:fare-update-2026-08", "capture");
});

const page = await context.newPage();
await page.route("**/api/**", (route) =>
  ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.abort(),
);
await page.route("**/api/community/reports", (route) => route.fulfill({
  status: 201,
  contentType: "application/json",
  body: JSON.stringify({ ok: true }),
}));

let frame = 0;
let cursor = { x: 670, y: 650 };

async function captureFrame() {
  await page.screenshot({
    path: join(frameDir, `frame-${String(frame).padStart(3, "0")}.png`),
    animations: "disabled",
  });
  frame += 1;
}

async function hold(count = 8) {
  for (let index = 0; index < count; index += 1) await captureFrame();
}

async function setStep(text) {
  await page.evaluate((label) => {
    const step = document.querySelector("#readme-demo-step");
    if (step) step.textContent = label;
  }, text);
}

async function moveCursorTo(locator, frames = 6) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("No se pudo ubicar un control de la demostración.");
  const target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const start = cursor;
  for (let index = 1; index <= frames; index += 1) {
    const progress = index / frames;
    cursor = {
      x: start.x + (target.x - start.x) * progress,
      y: start.y + (target.y - start.y) * progress,
    };
    await page.evaluate(({ x, y }) => {
      const element = document.querySelector("#readme-demo-cursor");
      if (element instanceof HTMLElement) element.style.transform = `translate(${x}px, ${y}px)`;
    }, cursor);
    await captureFrame();
  }
}

async function scrollToLocator(locator, frames = 7) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("No se pudo ubicar la sección de la demostración.");
  const start = await page.evaluate(() => window.scrollY);
  const target = Math.max(0, start + box.y - 135);
  for (let index = 1; index <= frames; index += 1) {
    const progress = index / frames;
    const eased = 1 - (1 - progress) ** 3;
    await page.evaluate((y) => window.scrollTo(0, y), start + (target - start) * eased);
    await captureFrame();
  }
}

async function click(locator) {
  await moveCursorTo(locator);
  await page.evaluate(() => document.querySelector("#readme-demo-cursor")?.classList.add("is-clicking"));
  await captureFrame();
  await locator.click();
  await page.evaluate(() => document.querySelector("#readme-demo-cursor")?.classList.remove("is-clicking"));
}

await page.goto(`${baseUrl}/reportar-error`, { waitUntil: "domcontentloaded" });
await page.locator("h1").waitFor({ state: "visible" });
await page.addStyleTag({
  content: `
    nextjs-portal { display: none !important; }
    #readme-demo-step {
      position: fixed; z-index: 10000; top: 76px; left: 50%; transform: translateX(-50%);
      max-width: calc(100vw - 40px); padding: 10px 16px; border: 1px solid rgba(184,232,64,.55);
      background: rgba(7,16,6,.94); color: #eef2ea; font: 700 14px/1.25 system-ui, sans-serif;
      box-shadow: 0 12px 36px rgba(0,0,0,.42); white-space: nowrap;
    }
    #readme-demo-cursor {
      position: fixed; z-index: 10001; left: -9px; top: -9px; width: 18px; height: 18px;
      border: 3px solid #071006; border-radius: 50%; background: #b8e840;
      box-shadow: 0 0 0 2px #eef2ea; pointer-events: none; transition: transform 80ms linear;
    }
    #readme-demo-cursor.is-clicking { background: #48cce0; transform-origin: center; }
  `,
});
await page.evaluate(() => {
  const step = document.createElement("div");
  step.id = "readme-demo-step";
  step.textContent = "1. Elige qué está mal";
  document.body.appendChild(step);
  const cursorElement = document.createElement("div");
  cursorElement.id = "readme-demo-cursor";
  cursorElement.style.transform = "translate(670px, 650px)";
  document.body.appendChild(cursorElement);
});

await hold(10);

const routeSelect = page.getByLabel("Elige una ruta");
await setStep("2. Selecciona la ruta");
await scrollToLocator(routeSelect);
await moveCursorTo(routeSelect);
await routeSelect.selectOption({ label: "Ruta 17" });
await hold(9);

const openMap = page.getByRole("button", { name: /Marcar calles en el mapa/ });
await setStep("3. Mueve la mira y agrega cada esquina");
await scrollToLocator(openMap, 5);
await click(openMap);
const editor = page.getByRole("dialog", { name: "¿Por dónde pasa el camión?" });
await page.waitForFunction(() => !document.querySelector(".proposal-add")?.disabled);
await page.evaluate(() => {
  const editor = document.querySelector(".proposal-editor");
  for (const id of ["readme-demo-step", "readme-demo-cursor"]) {
    const element = document.getElementById(id);
    if (element) editor?.appendChild(element);
  }
});
const add = editor.getByRole("button", { name: "Agregar punto", exact: true });
for (let index = 0; index < 3; index++) {
  await click(add);
  await page.locator(".proposal-canvas canvas").focus();
  await page.keyboard.press(index === 0 ? "ArrowRight" : "ArrowDown");
  await page.waitForTimeout(400);
  await hold(3);
}
const finishMap = editor.getByRole("button", { name: "Usar este tramo · 3 puntos", exact: true });
await page.evaluate(() => {
  for (const id of ["readme-demo-step", "readme-demo-cursor"]) {
    const element = document.getElementById(id);
    if (element) document.body.appendChild(element);
  }
});
await click(finishMap);

const detail = page.getByLabel("Detalle del reporte");
await setStep("4. Escribe una referencia clara");
await scrollToLocator(detail);
await moveCursorTo(detail, 5);
await detail.fill("La Ruta 17 ahora entra por la colonia y pasa frente al mercado.");
await hold(10);

const submit = page.getByRole("button", { name: "Enviar reporte" });
await setStep("5. Envía el reporte para revisión");
await scrollToLocator(submit, 5);
await click(submit);
await page.getByRole("heading", { name: "Gracias, recibimos tu reporte." }).waitFor({ state: "visible" });
await page.evaluate(() => window.scrollTo(0, 0));
await setStep("Listo: el reporte queda privado hasta revisarse");
await hold(14);

await browser.close();

const ffmpeg = availableFfmpeg() ?? await bundledFfmpegPath();
if (!ffmpeg) throw new Error("No se encontró ffmpeg. Define FFMPEG_PATH o instala las dependencias de Remotion.");

const result = spawnSync(ffmpeg, [
  "-y",
  "-framerate", "10",
  "-i", join(frameDir, "frame-%03d.png"),
  "-vf", "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
  "-loop", "0",
  outputPath,
], { stdio: "inherit" });

if (result.status !== 0) throw new Error(`ffmpeg terminó con código ${result.status ?? "desconocido"}.`);

const videoResult = spawnSync(ffmpeg, [
  "-y",
  "-framerate", "10",
  "-i", join(frameDir, "frame-%03d.png"),
  "-vf", "scale=640:-2:flags=lanczos",
  "-c:v", "libx264",
  "-crf", "26",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  videoOutputPath,
], { stdio: "inherit" });

if (videoResult.status !== 0) throw new Error(`ffmpeg terminó el MP4 con código ${videoResult.status ?? "desconocido"}.`);
await rm(frameDir, { recursive: true, force: true });
console.log(`[readme] Report demos updated: ${outputPath}, ${videoOutputPath}`);
