"use client";

import { motion } from "framer-motion";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface SvgCardProps {
  svg: {
    id: string;
    content: string;
    source: string;
    label: string;
    width: number | null;
    height: number | null;
  };
  index: number;
}

export function SvgCard({ svg, index }: SvgCardProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("results");

  function downloadSvg() {
    const blob = new Blob([svg.content], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${svg.label.replace(/[^a-zA-Z0-9-_]/g, "_")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copySvg() {
    await navigator.clipboard.writeText(svg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sourceLabel = t(svg.source as "inline" | "img" | "background" | "object" | "symbol");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      {/* Preview area */}
      <div className="relative flex items-center justify-center p-6 min-h-[160px]">
        {/* Checkerboard background for transparency */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
          }}
        />
        <div
          className="relative max-w-full max-h-[120px] [&_svg]:max-w-full [&_svg]:max-h-[120px] [&_svg]:w-auto [&_svg]:h-auto text-foreground"
          dangerouslySetInnerHTML={{ __html: svg.content }}
        />
      </div>

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

        <div className="flex gap-2">
          <Button
            onClick={downloadSvg}
            size="sm"
            className="flex-1"
          >
            <Download className="h-3.5 w-3.5" />
            {t("download")}
          </Button>
          <Button
            onClick={copySvg}
            variant="outline"
            size="sm"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
