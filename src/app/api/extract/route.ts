import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const maxDuration = 60;

interface ExtractedSVG {
  id: string;
  content: string;
  source: "inline" | "img" | "background" | "object" | "symbol";
  label: string;
  width: number | null;
  height: number | null;
}

export async function POST(request: NextRequest) {
  let browser;

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    await page.goto(parsedUrl.toString(), {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait a bit for lazy-loaded content
    await page.waitForTimeout(1500);

    const svgs: ExtractedSVG[] = await page.evaluate(() => {
      const results: ExtractedSVG[] = [];
      let counter = 0;

      function generateId() {
        return `svg-${++counter}`;
      }

      function getSvgDimensions(el: SVGSVGElement) {
        const viewBox = el.getAttribute("viewBox");
        const width = el.getAttribute("width");
        const height = el.getAttribute("height");

        if (width && height) {
          return {
            width: parseFloat(width) || null,
            height: parseFloat(height) || null,
          };
        }
        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/);
          if (parts.length === 4) {
            return {
              width: parseFloat(parts[2]) || null,
              height: parseFloat(parts[3]) || null,
            };
          }
        }
        return { width: null, height: null };
      }

      function getLabel(el: Element) {
        return (
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.querySelector("title")?.textContent ||
          el.getAttribute("id") ||
          el.getAttribute("class")?.split(" ")[0] ||
          ""
        );
      }

      function serializeSvg(el: SVGSVGElement): string {
        const clone = el.cloneNode(true) as SVGSVGElement;
        // Ensure xmlns
        if (!clone.getAttribute("xmlns")) {
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        return new XMLSerializer().serializeToString(clone);
      }

      // 1. Inline <svg> elements
      document.querySelectorAll("svg").forEach((svg) => {
        // Skip tiny or hidden SVGs (likely icons used for spacing)
        const bbox = svg.getBoundingClientRect();
        if (bbox.width < 1 && bbox.height < 1) return;

        const content = serializeSvg(svg);
        if (content.length < 20) return; // Skip empty SVGs

        const dims = getSvgDimensions(svg);
        results.push({
          id: generateId(),
          content,
          source: "inline",
          label: getLabel(svg) || `Inline SVG ${counter}`,
          width: dims.width || Math.round(bbox.width) || null,
          height: dims.height || Math.round(bbox.height) || null,
        });
      });

      // 2. <img> tags with .svg src
      document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"]').forEach((img) => {
        const src = img.getAttribute("src");
        if (!src) return;

        results.push({
          id: generateId(),
          content: "", // Will be fetched separately
          source: "img",
          label: img.getAttribute("alt") || getLabel(img) || `Image SVG ${counter}`,
          width: (img as HTMLImageElement).naturalWidth || null,
          height: (img as HTMLImageElement).naturalHeight || null,
        });
      });

      // 3. <symbol> elements (sprite sheets)
      document.querySelectorAll("symbol").forEach((symbol) => {
        const viewBox = symbol.getAttribute("viewBox");
        const id = symbol.getAttribute("id") || "";

        // Create a standalone SVG from the symbol
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        if (viewBox) svg.setAttribute("viewBox", viewBox);
        svg.innerHTML = symbol.innerHTML;

        const content = new XMLSerializer().serializeToString(svg);
        if (content.length < 20) return;

        let width = null;
        let height = null;
        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/);
          if (parts.length === 4) {
            width = parseFloat(parts[2]) || null;
            height = parseFloat(parts[3]) || null;
          }
        }

        results.push({
          id: generateId(),
          content,
          source: "symbol",
          label: id || `Symbol SVG ${counter}`,
          width,
          height,
        });
      });

      // 4. <object> / <embed> with SVG
      document
        .querySelectorAll('object[data$=".svg"], embed[src$=".svg"]')
        .forEach((el) => {
          const src =
            el.getAttribute("data") || el.getAttribute("src");
          if (!src) return;

          results.push({
            id: generateId(),
            content: "",
            source: "object",
            label: getLabel(el) || `Object SVG ${counter}`,
            width: parseFloat(el.getAttribute("width") || "") || null,
            height: parseFloat(el.getAttribute("height") || "") || null,
          });
        });

      // 5. Background images with SVG URLs
      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage.includes(".svg")) {
          const match = bgImage.match(/url\(["']?(.*?\.svg[^"')]*)/);
          if (match) {
            results.push({
              id: generateId(),
              content: "",
              source: "background",
              label: getLabel(el) || `Background SVG ${counter}`,
              width: null,
              height: null,
            });
          }
        }
      });

      return results;
    });

    // For external SVGs (img src, object, background), fetch the actual SVG content
    const externalSvgUrls = await page.evaluate(() => {
      const urls: Record<string, string> = {};
      let counter = 0;

      document.querySelectorAll("svg").forEach(() => { counter++; });

      document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"]').forEach((img) => {
        counter++;
        const src = img.getAttribute("src");
        if (src) {
          try {
            urls[`svg-${counter}`] = new URL(src, document.baseURI).href;
          } catch { /* skip */ }
        }
      });

      document.querySelectorAll("symbol").forEach(() => { counter++; });

      document.querySelectorAll('object[data$=".svg"], embed[src$=".svg"]').forEach((el) => {
        counter++;
        const src = el.getAttribute("data") || el.getAttribute("src");
        if (src) {
          try {
            urls[`svg-${counter}`] = new URL(src, document.baseURI).href;
          } catch { /* skip */ }
        }
      });

      const allElements = document.querySelectorAll("*");
      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage.includes(".svg")) {
          const match = bgImage.match(/url\(["']?(.*?\.svg[^"')]*)/);
          if (match) {
            counter++;
            try {
              urls[`svg-${counter}`] = new URL(match[1], document.baseURI).href;
            } catch { /* skip */ }
          }
        }
      });

      return urls;
    });

    // Fetch external SVG contents
    for (const svg of svgs) {
      if (!svg.content && externalSvgUrls[svg.id]) {
        try {
          const response = await page.evaluate(async (url: string) => {
            const res = await fetch(url);
            return await res.text();
          }, externalSvgUrls[svg.id]);

          if (response && response.includes("<svg")) {
            svg.content = response;
          }
        } catch {
          // Skip SVGs we can't fetch
        }
      }
    }

    await browser.close();

    // Filter out SVGs with no content
    const validSvgs = svgs.filter((svg) => svg.content.length > 0);

    return NextResponse.json({
      url: parsedUrl.toString(),
      count: validSvgs.length,
      svgs: validSvgs,
    });
  } catch (error) {
    if (browser) await browser.close();

    const message =
      error instanceof Error ? error.message : "Failed to extract SVGs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
