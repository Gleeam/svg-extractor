# SVG Extractor

Extract, preview, and download all SVG graphics from any website. Built with Next.js and Puppeteer.

**Live** &mdash; [svgexport.gleeam.dev](https://svgexport.gleeam.dev)

---

## Features

- **Full page scraping** &mdash; Extracts inline SVGs, `<img>` SVGs, `<symbol>` sprites, `<object>`/`<embed>`, and CSS background SVGs using headless Chromium via Puppeteer
- **Individual parts** &mdash; Expand any inline SVG to see its child elements (paths, groups, shapes) and download them individually
- **Bulk download** &mdash; Download all extracted SVGs as a single ZIP archive
- **Copy to clipboard** &mdash; One-click copy of any SVG's source code
- **Self-contained exports** &mdash; Computed styles (`fill`, `stroke`) are inlined, `currentColor` is resolved, CSS custom properties (`var(--...)`) are replaced with concrete values, and missing `width`/`height` are derived from the `viewBox`
- **Live preview** &mdash; Each SVG is rendered on a neutral checkerboard background for clear visibility
- **Dark / Light theme** &mdash; Matches the [gleeam.dev](https://gleeam.dev) design system with peach accent colors
- **Multilingual** &mdash; Full i18n support for English, French, and Spanish with SEO metadata in each language

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, TypeScript) |
| Scraping | [Puppeteer](https://pptr.dev) + [@sparticuz/chromium](https://github.com/Sparticuz/chromium) (headless Chromium) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| UI | [shadcn/ui](https://ui.shadcn.com) components, [Radix UI](https://radix-ui.com) |
| Animations | [Framer Motion](https://www.framer.com/motion) |
| i18n | [next-intl](https://next-intl.dev) |
| ZIP | [JSZip](https://stuk.github.io/jszip) |
| Fonts | DM Sans + Inter (Google Fonts) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx        # Fonts, theme, SEO metadata, i18n provider
│   │   └── page.tsx
│   ├── api/extract/route.ts  # Puppeteer SVG extraction endpoint
│   ├── globals.css           # Design tokens (gleeam.dev theme)
│   └── layout.tsx
├── components/
│   ├── svg-extractor.tsx     # Main page: URL input, results grid, ZIP download
│   ├── svg-card.tsx          # SVG card: preview, download, copy, expandable parts
│   ├── loading-animation.tsx # Animated loading spinner
│   ├── language-switcher.tsx # EN / FR / ES dropdown
│   ├── theme-provider.tsx    # Dark / light theme context
│   ├── theme-toggle.tsx      # Theme toggle button
│   └── ui/button.tsx         # Button component (shadcn)
├── i18n/
│   ├── messages/
│   │   ├── en.json
│   │   ├── fr.json
│   │   └── es.json
│   ├── routing.ts
│   └── request.ts
├── lib/
│   ├── types.ts              # Shared TypeScript interfaces
│   └── utils.ts              # cn() utility
└── middleware.ts              # Locale routing
```

## How It Works

1. User submits a URL
2. The API route launches a headless Chromium browser via Puppeteer + @sparticuz/chromium
3. The page is fully rendered (including JS-loaded content)
4. A `page.evaluate()` script walks the DOM to find all SVGs:
   - Inline `<svg>` elements with computed styles inlined
   - `<img>` tags pointing to `.svg` files (fetched separately)
   - `<symbol>` elements from sprite sheets
   - `<object>` / `<embed>` elements
   - CSS `background-image` SVG URLs
5. For inline SVGs, top-level child elements are extracted as individual downloadable parts
6. All color values are sanitized: `currentColor` is resolved, `var(--...)` and other invalid values are replaced with `#000000`
7. Results are returned as JSON and displayed in an animated grid

## License

MIT

---

Built by [Gleeam](https://gleeam.dev)
