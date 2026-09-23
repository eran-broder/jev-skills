import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const OUT_DIR = resolve("out");
const OUTPUT = resolve(OUT_DIR, "jev-skills.mp4");

const encoder = () =>
  spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", OUTPUT], {
    stdio: ["pipe", "ignore", "inherit"],
  });

const writeFrame = (stream: NodeJS.WritableStream, frame: Uint8Array) =>
  new Promise<void>((done) => (stream.write(frame) ? done() : stream.once("drain", done)));

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: [`--window-size=${WIDTH},${HEIGHT}`, "--hide-scrollbars", "--force-device-scale-factor=1"] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(resolve("scene.html")).href}?t=0`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const totalMs = await page.evaluate(() => (window as unknown as { totalMs: () => number }).totalMs());
  const frames = Math.ceil((totalMs / 1000) * FPS);
  const ffmpeg = encoder();
  const started = performance.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((ms) => (window as unknown as { seek: (ms: number) => void }).seek(ms), (i * 1000) / FPS);
    await writeFrame(ffmpeg.stdin, await page.screenshot({ type: "png", encoding: "binary" }));
    if (i % 300 === 0) console.log(`frame ${i}/${frames}  ${((performance.now() - started) / 1000).toFixed(0)}s`);
  }
  ffmpeg.stdin.end();
  await new Promise<void>((done, fail) => ffmpeg.on("exit", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`)))));
  await browser.close();
  console.log(`wrote ${OUTPUT}: ${frames} frames, ${(totalMs / 1000).toFixed(1)} s`);
};

await main();
