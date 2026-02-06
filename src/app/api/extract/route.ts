import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const maxDuration = 60;

interface SvgPart {
  id: string;
  content: string;
  tag: string;
  label: string;
}

interface ExtractedSVG {
  id: string;
  content: string;
  source: "inline" | "img" | "background" | "object" | "symbol";
  label: string;
  width: number | null;
  height: number | null;
  parts: SvgPart[];
}

export async function POST(request: NextRequest) {
  let browser;

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

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

    await page.waitForTimeout(1500);

    const svgs: ExtractedSVG[] = await page.evaluate(() => {
      const results: ExtractedSVG[] = [];
      let counter = 0;
      let partCounter = 0;

      function generateId() {
        return `svg-${++counter}`;
      }

      function generatePartId() {
        return `part-${++partCounter}`;
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

      function rgbToHex(rgb: string): string {
        const match = rgb.match(/\d+/g);
        if (!match || match.length < 3) return rgb;
        const [r, g, b] = match.map(Number);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      }

      function getResolvedColor(el: Element): string {
        const computed = window.getComputedStyle(el);
        const color = computed.color || "rgb(0,0,0)";
        return rgbToHex(color);
      }

      function resolveCurrentColor(svgString: string, color: string): string {
        return svgString.replace(/currentColor/gi, color);
      }

      const NAMED_COLORS = new Set([
        "black","white","red","green","blue","yellow","orange","purple","pink",
        "gray","grey","cyan","magenta","navy","teal","maroon","olive","silver",
        "aqua","fuchsia","lime","indigo","violet","gold","coral","salmon","tomato",
        "wheat","beige","ivory","linen","snow","plum","orchid","peru","sienna",
        "tan","thistle","turquoise","crimson","khaki","lavender","chocolate",
        "azure","bisque","brown","burlywood","chartreuse","cornsilk","firebrick",
        "gainsboro","honeydew","hotpink","lawngreen","limegreen","mintcream",
        "moccasin","oldlace","orangered","papayawhip","peachpuff","powderblue",
        "rosybrown","royalblue","sandybrown","seagreen","seashell","skyblue",
        "slateblue","slategray","slategrey","springgreen","steelblue","yellowgreen",
        "aliceblue","antiquewhite","blanchedalmond","blueviolet","cadetblue",
        "cornflowerblue","darkblue","darkcyan","darkgoldenrod","darkgray","darkgrey",
        "darkgreen","darkkhaki","darkmagenta","darkolivegreen","darkorange",
        "darkorchid","darkred","darksalmon","darkseagreen","darkslateblue",
        "darkslategray","darkslategrey","darkturquoise","darkviolet","deeppink",
        "deepskyblue","dimgray","dimgrey","dodgerblue","floralwhite","forestgreen",
        "ghostwhite","goldenrod","greenyellow","indianred","lemonchiffon",
        "lightblue","lightcoral","lightcyan","lightgoldenrodyellow","lightgray",
        "lightgrey","lightgreen","lightpink","lightsalmon","lightseagreen",
        "lightskyblue","lightslategray","lightslategrey","lightsteelblue",
        "lightyellow","mediumaquamarine","mediumblue","mediumorchid","mediumpurple",
        "mediumseagreen","mediumslateblue","mediumspringgreen","mediumturquoise",
        "mediumvioletred","midnightblue","mistyrose","navajowhite","olivedrab",
        "palegoldenrod","palegreen","paleturquoise","palevioletred","rebeccapurple",
        "saddlebrown",
      ]);

      function isValidSvgColor(value: string): boolean {
        const v = value.trim();
        if (!v) return false;
        if (/^#[0-9a-f]{3,8}$/i.test(v)) return true;
        if (/^(?:rgb|rgba|hsl|hsla)\(/i.test(v)) return true;
        if (/^(?:none|transparent|inherit)$/i.test(v)) return true;
        if (/^url\(/i.test(v)) return true;
        if (NAMED_COLORS.has(v.toLowerCase())) return true;
        return false;
      }

      // Sanitize the final SVG string: replace any invalid color values with #000000
      const COLOR_ATTRS = ["fill", "stroke", "color", "stop-color", "flood-color", "lighting-color"];

      function sanitizeColors(svgString: string): string {
        // 1. Direct attributes: fill="var(--x)" or fill="something-invalid"
        let result = svgString.replace(
          new RegExp(`((?:${COLOR_ATTRS.join("|")})=")([^"]*)(")`, "g"),
          (match, pre: string, val: string, post: string) => {
            if (isValidSvgColor(val)) return match;
            return `${pre}#000000${post}`;
          }
        );
        // 2. Inside style="..." attributes
        result = result.replace(
          /style="([^"]*)"/g,
          (match, content: string) => {
            const fixed = content.replace(
              new RegExp(`((?:${COLOR_ATTRS.join("|")})\\s*:\\s*)([^;\"]+)`, "g"),
              (propMatch, prefix: string, val: string) => {
                if (isValidSvgColor(val)) return propMatch;
                return `${prefix}#000000`;
              }
            );
            return `style="${fixed}"`;
          }
        );
        return result;
      }

      // Inline computed fill/stroke on elements that rely on page CSS.
      // This makes the SVG self-contained when copied standalone.
      const VISUAL_PROPS = ["fill", "stroke"] as const;

      function inlineComputedStyles(root: Element): Array<{ el: Element; prop: string; orig: string | null }> {
        const restored: Array<{ el: Element; prop: string; orig: string | null }> = [];
        const selector = "path, circle, rect, line, polygon, polyline, ellipse, text, use, g";
        const els = root.matches?.(selector) ? [root, ...root.querySelectorAll(selector)] : root.querySelectorAll(selector);

        els.forEach((el) => {
          const computed = window.getComputedStyle(el);
          for (const prop of VISUAL_PROPS) {
            const existing = el.getAttribute(prop);

            // If element already has a valid value, leave it alone
            if (existing && isValidSvgColor(existing)) continue;

            const val = computed.getPropertyValue(prop);
            if (!val || val === "" ) continue;

            let resolved: string;
            if (val === "none") {
              resolved = "none";
            } else if (val.startsWith("rgb")) {
              resolved = rgbToHex(val);
            } else if (isValidSvgColor(val)) {
              resolved = val;
            } else {
              resolved = "#000000";
            }

            el.setAttribute(prop, resolved);
            restored.push({ el, prop, orig: existing });
          }
        });

        return restored;
      }

      function restoreInlinedStyles(restored: Array<{ el: Element; prop: string; orig: string | null }>) {
        for (const { el, prop, orig } of restored) {
          if (orig === null) el.removeAttribute(prop);
          else el.setAttribute(prop, orig);
        }
      }

      function getViewBoxOrFallback(svg: SVGSVGElement): string | null {
        const vb = svg.getAttribute("viewBox");
        if (vb) return vb;
        const w = svg.getAttribute("width");
        const h = svg.getAttribute("height");
        if (w && h) return `0 0 ${parseFloat(w)} ${parseFloat(h)}`;
        const bbox = svg.getBBox();
        if (bbox.width > 0 && bbox.height > 0) {
          return `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
        }
        return null;
      }

      // Collect defs from the parent SVG (gradients, clipPaths, filters, etc.)
      function collectDefs(svg: SVGSVGElement): string {
        const defsEl = svg.querySelector("defs");
        if (!defsEl) return "";
        return new XMLSerializer().serializeToString(defsEl);
      }

      function wrapInSvg(innerHTML: string, viewBox: string | null, defs: string): string {
        const vbAttr = viewBox ? ` viewBox="${viewBox}"` : "";
        return `<svg xmlns="http://www.w3.org/2000/svg"${vbAttr}>${defs}${innerHTML}</svg>`;
      }

      // Shape tags that represent meaningful visual elements
      const SHAPE_TAGS = new Set([
        "path", "circle", "rect", "line", "polygon",
        "polyline", "ellipse", "g", "use", "text", "image",
      ]);

      function extractParts(svg: SVGSVGElement, resolvedColor: string): SvgPart[] {
        const parts: SvgPart[] = [];
        const viewBox = getViewBoxOrFallback(svg);
        const defs = collectDefs(svg);

        // Only look at direct children of the SVG (top-level shapes/groups)
        const children = Array.from(svg.children);

        // Skip if there's only 1 meaningful child - no point showing parts
        const meaningfulChildren = children.filter(
          (c) => SHAPE_TAGS.has(c.tagName.toLowerCase())
        );
        if (meaningfulChildren.length <= 1) return [];

        for (const child of meaningfulChildren) {
          const tag = child.tagName.toLowerCase();
          // Inline computed styles on this child subtree before serializing
          const childRestored = inlineComputedStyles(child);
          const serialized = new XMLSerializer().serializeToString(child);
          restoreInlinedStyles(childRestored);
          const resolved = sanitizeColors(resolveCurrentColor(serialized, resolvedColor));
          const content = wrapInSvg(resolved, viewBox, defs);

          const label =
            child.getAttribute("id") ||
            child.getAttribute("aria-label") ||
            child.getAttribute("class")?.split(" ")[0] ||
            tag;

          parts.push({
            id: generatePartId(),
            content,
            tag,
            label,
          });
        }

        return parts;
      }

      // Ensure SVG has width/height so it renders at a real size standalone
      function ensureDimensions(el: SVGSVGElement) {
        if (el.getAttribute("width") && el.getAttribute("height")) return;
        const viewBox = el.getAttribute("viewBox");
        if (viewBox) {
          const vbParts = viewBox.split(/[\s,]+/);
          if (vbParts.length === 4) {
            if (!el.getAttribute("width")) el.setAttribute("width", vbParts[2]);
            if (!el.getAttribute("height")) el.setAttribute("height", vbParts[3]);
            return;
          }
        }
        const bbox = el.getBoundingClientRect();
        if (bbox.width > 0 && bbox.height > 0) {
          if (!el.getAttribute("width")) el.setAttribute("width", String(Math.round(bbox.width)));
          if (!el.getAttribute("height")) el.setAttribute("height", String(Math.round(bbox.height)));
        }
      }

      function serializeSvg(el: SVGSVGElement, resolvedColor: string): string {
        const restored = inlineComputedStyles(el);
        const origWidth = el.getAttribute("width");
        const origHeight = el.getAttribute("height");
        ensureDimensions(el);
        if (!el.getAttribute("xmlns")) {
          el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        }
        const raw = new XMLSerializer().serializeToString(el);
        // Restore original DOM state
        restoreInlinedStyles(restored);
        if (origWidth === null) el.removeAttribute("width"); else el.setAttribute("width", origWidth);
        if (origHeight === null) el.removeAttribute("height"); else el.setAttribute("height", origHeight);
        return sanitizeColors(resolveCurrentColor(raw, resolvedColor));
      }

      // 1. Inline <svg> elements
      document.querySelectorAll("svg").forEach((svg) => {
        const bbox = svg.getBoundingClientRect();
        if (bbox.width < 1 && bbox.height < 1) return;

        const resolvedColor = getResolvedColor(svg);
        const content = serializeSvg(svg, resolvedColor);
        if (content.length < 20) return;

        const dims = getSvgDimensions(svg);
        const parts = extractParts(svg, resolvedColor);

        results.push({
          id: generateId(),
          content,
          source: "inline",
          label: getLabel(svg) || `Inline SVG ${counter}`,
          width: dims.width || Math.round(bbox.width) || null,
          height: dims.height || Math.round(bbox.height) || null,
          parts,
        });
      });

      // 2. <img> tags with .svg src
      document.querySelectorAll('img[src$=".svg"], img[src*=".svg?"]').forEach((img) => {
        const src = img.getAttribute("src");
        if (!src) return;

        results.push({
          id: generateId(),
          content: "",
          source: "img",
          label: img.getAttribute("alt") || getLabel(img) || `Image SVG ${counter}`,
          width: (img as HTMLImageElement).naturalWidth || null,
          height: (img as HTMLImageElement).naturalHeight || null,
          parts: [],
        });
      });

      // 3. <symbol> elements (sprite sheets)
      document.querySelectorAll("symbol").forEach((symbol) => {
        const viewBox = symbol.getAttribute("viewBox");
        const id = symbol.getAttribute("id") || "";

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
          parts: [],
        });
      });

      // 4. <object> / <embed> with SVG
      document
        .querySelectorAll('object[data$=".svg"], embed[src$=".svg"]')
        .forEach((el) => {
          const src = el.getAttribute("data") || el.getAttribute("src");
          if (!src) return;

          results.push({
            id: generateId(),
            content: "",
            source: "object",
            label: getLabel(el) || `Object SVG ${counter}`,
            width: parseFloat(el.getAttribute("width") || "") || null,
            height: parseFloat(el.getAttribute("height") || "") || null,
            parts: [],
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
              parts: [],
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
          const response = await page.evaluate(async (fetchUrl: string) => {
            const res = await fetch(fetchUrl);
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
