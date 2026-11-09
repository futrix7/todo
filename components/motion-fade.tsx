"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

const EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Fade + slide reveal on scroll. */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Wrapper used for entrance animations of page-level blocks. */
export function FadeIn({
  children,
  delay = 0,
  y = 12,
  className,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { EASE };
