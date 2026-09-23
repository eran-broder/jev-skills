import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WIDTH = 1920;
const HEIGHT = 1080;
const OUT_DIR = resolve("out", "stills");

const times = process.argv.slice(2).map(Number);

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: [`--window-size=${WIDTH},${HEIGHT}`, "--hide-scrollbars"] });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(resolve("scene.html")).href}?t=0`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  for (const ms of times) {
    await page.evaluate((t) => (window as unknown as { seek: (ms: number) => void }).seek(t), ms);
    const file = resolve(OUT_DIR, `${String(ms).padStart(6, "0")}.png`);
    await page.screenshot({ path: file as `${string}.png` });
    console.log(file);
  }
  await browser.close();
};

await main();
