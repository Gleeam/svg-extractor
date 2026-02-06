"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, PackageOpen, AlertCircle, Github, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import JSZip from "jszip";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SvgCard } from "@/components/svg-card";
import { LoadingAnimation } from "@/components/loading-animation";
import type { ExtractedSVG } from "@/lib/types";

export function SvgExtractor() {
  const t = useTranslations();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [svgs, setSvgs] = useState<ExtractedSVG[]>([]);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSvgs([]);
    setHasSearched(false);

    let normalizedUrl = url.trim();
    if (!normalizedUrl) return;

    // Add protocol if missing
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      setError(t("errors.invalid_url"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("errors.fetch_failed"));
        return;
      }

      setSvgs(data.svgs || []);
      setSourceUrl(data.url || normalizedUrl);
      setHasSearched(true);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  }

  async function downloadAll() {
    const zip = new JSZip();

    svgs.forEach((svg, i) => {
      const name = `${svg.label.replace(/[^a-zA-Z0-9-_]/g, "_")}_${i + 1}.svg`;
      zip.file(name, svg.content);
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;

    const hostname = (() => {
      try {
        return new URL(sourceUrl).hostname;
      } catch {
        return "svgs";
      }
    })();

    a.download = `${hostname}_svgs.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }

  const resultText =
    svgs.length === 1
      ? t("results.foundSingular")
      : t("results.found", { count: svgs.length });

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-accent">
              <PackageOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-heading text-lg font-semibold text-foreground tracking-tight">
              SVG Extractor
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <LanguageSwitcher />
            <ThemeToggle />
          </motion.div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />
        </div>

        {/* Hero section */}
        <section className="relative">
          <div className="relative mx-auto max-w-3xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
            >
              {t("hero.title")}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto"
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* Search form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("hero.placeholder")}
                  className="w-full h-12 rounded-xl border border-border bg-card pl-11 pr-4 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={loading || !url.trim()}
                className="h-12 rounded-xl px-8 font-medium"
              >
                {loading ? t("hero.loading") : t("hero.button")}
              </Button>
            </motion.form>
          </div>
        </section>

        {/* Loading state */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-center py-16"
            >
              <LoadingAnimation />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-2xl px-4 sm:px-6 py-8"
            >
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-destructive" />
                <p className="text-foreground">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {hasSearched && !loading && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="mx-auto max-w-6xl px-4 sm:px-6 pb-16"
            >
              {svgs.length > 0 ? (
                <>
                  {/* Results header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <h2 className="font-heading text-2xl font-semibold text-foreground">
                        {resultText}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground truncate max-w-md">
                        {sourceUrl}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Button onClick={downloadAll} size="lg" className="rounded-xl">
                        <Download className="h-4 w-4" />
                        {t("results.downloadAll")}
                      </Button>
                    </motion.div>
                  </div>

                  {/* SVG grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {svgs.map((svg, i) => (
                      <SvgCard key={svg.id} svg={svg} index={i} />
                    ))}
                  </div>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center py-16 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <PackageOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold text-foreground">
                    {t("results.none")}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md">
                    {t("results.noneSub")}
                  </p>
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            {t("footer.built")}{" "}
            <a
              href="https://gleeam.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline font-medium"
            >
              Gleeam
            </a>
            {" "}&mdash;{" "}
            {t("footer.description")}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="mailto:contact@gleeam.dev"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              {t("footer.reportBug")}
            </a>
            <a
              href="https://github.com/Gleeam/svg-extractor"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-3.5 w-3.5" />
              {t("footer.sourceCode")}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
