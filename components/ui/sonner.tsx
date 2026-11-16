"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-center"
      className="toaster group"
      gap={10}
      offset={16}
      visibleToasts={3}
      duration={3500}
      icons={{
        success: <CircleCheckIcon className="size-5 text-[#30d158]" />,
        info: <InfoIcon className="size-5 text-[#0a84ff]" />,
        warning: <TriangleAlertIcon className="size-5 text-[#ff9f0a]" />,
        error: <OctagonXIcon className="size-5 text-[#ff453a]" />,
        loading: <Loader2Icon className="size-5 animate-spin opacity-70" />,
      }}
      style={{ "--width": "26rem" } as React.CSSProperties}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: [
            // layout
            "flex w-full items-center gap-3 px-4 py-3.5 rounded-[22px]",
            // glass
            "bg-white/70 dark:bg-[#1c1c1e]/70",
            "backdrop-blur-2xl backdrop-saturate-150",
            "border border-black/[0.08] dark:border-white/[0.12]",
            "text-[#1d1d1f] dark:text-[#f5f5f7]",
            // depth
            "shadow-[0_12px_40px_rgba(0,0,0,0.22),0_2px_8px_rgba(0,0,0,0.12)]",
            // type
            "font-sans antialiased",
            // iOS spring-like easing
            "[transition-property:transform,opacity,height,box-shadow]!",
            "[transition-duration:500ms]!",
            "[transition-timing-function:cubic-bezier(0.32,0.72,0,1)]!",
            "motion-reduce:[transition-duration:10ms]!",
          ].join(" "),
          icon: "m-0 flex shrink-0 items-center justify-center",
          content: "flex flex-col gap-0.5",
          title: "text-[15px] font-semibold leading-snug tracking-[-0.01em]",
          description: "text-[13px] leading-snug opacity-70",
          actionButton:
            "ml-auto h-auto rounded-full bg-[#0a84ff] px-3 py-1.5 text-[13px] font-semibold text-white active:scale-95 transition-transform",
          cancelButton:
            "h-auto rounded-full bg-[rgba(120,120,128,0.24)] px-3 py-1.5 text-[13px] font-medium active:scale-95 transition-transform",
          closeButton:
            "bg-white/80 dark:bg-[#1c1c1e]/80 border-black/10 dark:border-white/15",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }