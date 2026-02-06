"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, Check, ChevronDown, Layers } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface SvgPart {
  id: string;
  content: string;
  tag: string;
  label: string;
}

interface SvgCardProps {
  svg: {
    id: string;
    content: string;
    source: string;
    label: string;
    width: number | null;
    height: number | null;
    parts: SvgPart[];
  };
  index: number;
}

function downloadContent(content: string, filename: string) {
  const blob = new Blob([content], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9-_]/g, "_");
}

function SvgPreview({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      // Force a light neutral background so SVGs using currentColor / no fill / dark fills are visible
      style={{ backgroundColor: "#f5f5f5", color: "#1a1a1a" }}
    >
      {/* Checkerboard for transparency */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #999 25%, transparent 25%), linear-gradient(-45deg, #999 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #999 75%), linear-gradient(-45deg, transparent 75%, #999 75%)",
          backgroundSize: "12px 12px",
          backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
        }}
      />
      <div
        className="relative max-w-full max-h-full [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:w-auto [&_svg]:h-auto"
        style={{ color: "#1a1a1a" }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

export function SvgCard({ svg, index }: SvgCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("results");

  async function copyContent(content: string, id: string) {
    await navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const sourceLabel = t(svg.source as "inline" | "img" | "background" | "object" | "symbol");
  const hasParts = svg.parts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Main preview */}
      <SvgPreview content={svg.content} className="p-6 min-h-[160px] max-h-[200px] rounded-t-2xl" />

      {/* Info + actions */}
      <div className="flex flex-col gap-3 border-t border-border p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {svg.label}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                {sourceLabel}
              </span>
              {svg.width && svg.height && (
                <span className="text-xs text-muted-foreground">
                  {svg.width} x {svg.height}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main actions */}
        <div className="flex gap-2">
          <Button
            onClick={() =>
              downloadContent(svg.content, `${sanitizeFilename(svg.label)}.svg`)
            }
            size="sm"
            className="flex-1"
          >
            <Download className="h-3.5 w-3.5" />
            {t("download")}
          </Button>
          <Button
            onClick={() => copyContent(svg.content, svg.id)}
            variant="outline"
            size="sm"
          >
            {copied === svg.id ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Parts toggle */}
        {hasParts && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <Layers className="h-3.5 w-3.5" />
            {t("parts", { count: svg.parts.length })}
            <motion.div
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Expanded parts */}
      <AnimatePresence>
        {expanded && hasParts && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-3 space-y-2">
              {svg.parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-3 rounded-xl border border-border p-2 transition-colors hover:border-accent/20"
                >
                  {/* Part preview */}
                  <SvgPreview
                    content={part.content}
                    className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden"
                  />

                  {/* Part info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {part.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      &lt;{part.tag}&gt;
                    </p>
                  </div>

                  {/* Part actions */}
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      onClick={() =>
                        downloadContent(
                          part.content,
                          `${sanitizeFilename(svg.label)}_${sanitizeFilename(part.label)}.svg`
                        )
                      }
                      variant="ghost"
                      size="icon-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => copyContent(part.content, part.id)}
                      variant="ghost"
                      size="icon-sm"
                    >
                      {copied === part.id ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
