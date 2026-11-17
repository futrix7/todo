"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { ThemeProvider as NextThemesProvider } from "next-themes"

function ThemeColorSync() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (!resolvedTheme) return

    const color = resolvedTheme === "dark" ? "#131313" : "#ffffff"
    const syncThemeColor = () => {
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => {
          if (meta.content !== color) meta.setAttribute("content", color)
        })
    }

    syncThemeColor()
    const observer = new MutationObserver(syncThemeColor)
    observer.observe(document.head, {
      attributes: true,
      attributeFilter: ["content", "name"],
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      {children}
      <ThemeColorSync />
    </NextThemesProvider>
  )
}