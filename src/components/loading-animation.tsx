"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export function LoadingAnimation() {
  const t = useTranslations("hero");

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Animated SVG-themed loader */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring */}
        <motion.div
          className="absolute h-20 w-20 rounded-full border-2 border-accent/20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Spinning ring */}
        <motion.div
          className="h-16 w-16 rounded-full border-2 border-transparent border-t-accent border-r-accent/40"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />

        {/* Center dot */}
        <motion.div
          className="absolute h-3 w-3 rounded-full bg-accent"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Animated dots text */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <span>{t("loading")}</span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          .
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3,
          }}
        >
          .
        </motion.span>
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.6,
          }}
        >
          .
        </motion.span>
      </div>
    </div>
  );
}
