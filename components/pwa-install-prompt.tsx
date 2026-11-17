"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const InstallRequestContext = createContext<(() => void) | null>(null)

export function InstallAppButton({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  const requestInstall = useContext(InstallRequestContext)
  if (!requestInstall) {
    throw new Error("InstallAppButton must be rendered inside PwaInstallProvider.")
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      className={cn(
        compact && "max-sm:size-10 max-sm:px-0",
        className
      )}
      aria-label="Install Taskito"
      onClick={requestInstall}
    >
      <Download />
      <span className={compact ? "max-sm:sr-only" : undefined}>
        Install app
      </span>
    </Button>
  )
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isChromeIOS, setIsChromeIOS] = useState(false)
  const [isSafariIOS, setIsSafariIOS] = useState(false)
  const [isEdge, setIsEdge] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installError, setInstallError] = useState("")

  const requestInstall = useCallback(() => {
    const userAgent = navigator.userAgent
    const appleMobile =
      /iPhone|iPad|iPod/i.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)

    setIsIOS(appleMobile)
    setIsAndroid(/Android/i.test(userAgent))
    setIsChromeIOS(/CriOS/i.test(userAgent))
    setIsSafariIOS(
      /Safari/i.test(userAgent) &&
        !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
    )
    setIsEdge(/Edg/i.test(userAgent))
    setShowInstructions(false)
    setInstallError("")
    setOpen(true)
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setInstallPrompt(null)
      setOpen(false)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setShowInstructions(false)
      setInstallError("")
    }
  }

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstructions(true)
      return
    }

    setInstallError("")
    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      setInstallPrompt(null)
      if (outcome === "accepted") {
        setOpen(false)
      } else {
        handleOpenChange(false)
      }
    } catch (error) {
      console.error("Could not start the Taskito installation prompt.", error)
      setInstallPrompt(null)
      setInstallError(
        "Your browser could not open the installation dialog. You can still install Taskito from the browser menu."
      )
    }
  }

  const instructions = isIOS
    ? isChromeIOS
      ? "In Chrome, open the menu, tap Share, then choose Add to Home Screen. If that option is unavailable, open Taskito in Safari and use Share → Add to Home Screen."
      : isSafariIOS
        ? "In Safari, tap Share, then choose Add to Home Screen."
        : "Open your browser's Share menu and choose Add to Home Screen. If that option is unavailable, open Taskito in Safari."
    : isAndroid
      ? "Open your browser menu and choose Install app or Add to Home screen."
      : isEdge
        ? "Open the Edge menu, choose Apps, then Install this site as an app."
        : "Open the Chrome menu and choose Cast, save, and share → Install page as app."

  return (
    <InstallRequestContext.Provider value={requestInstall}>
      {children}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showInstructions
                ? "Add Taskito to your device"
                : "Install Taskito?"}
            </DialogTitle>
            <DialogDescription>
              {showInstructions
                ? "Follow your browser's steps to add Taskito to your home screen or desktop."
                : "Your browser will ask you to confirm before adding Taskito to your home screen or desktop."}
            </DialogDescription>
          </DialogHeader>

          {showInstructions ? (
            <p className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm leading-relaxed">
              {instructions}
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Taskito opens in its own app window, while your account and tasks
              stay synced with the web app.
            </p>
          )}

          {installError && (
            <p role="alert" className="text-sm text-destructive">
              {installError}
            </p>
          )}

          <DialogFooter>
            {showInstructions ? (
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleInstall}>
                  <Download />
                  Continue
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InstallRequestContext.Provider>
  )
}
