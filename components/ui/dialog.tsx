"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
  DrawerOverlay,
} from "@/components/ui/drawer"
import { XIcon } from "lucide-react"

const MOBILE_QUERY = "(max-width: 639px)"

function subscribeToMobile(callback: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY)
  mediaQuery.addEventListener("change", callback)
  return () => mediaQuery.removeEventListener("change", callback)
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

const DialogModeContext = React.createContext(false)

type DialogProps = {
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean | "trap-focus"
  disablePointerDismissal?: boolean
  onOpenChange?: (
    open: boolean,
    details:
      | DialogPrimitive.Root.ChangeEventDetails
      | DrawerPrimitive.Root.ChangeEventDetails
  ) => void
  onOpenChangeComplete?: (open: boolean) => void
  children?: React.ReactNode
}

function Dialog(props: DialogProps) {
  const mobile = React.useSyncExternalStore(
    subscribeToMobile,
    getMobileSnapshot,
    () => false
  )

  return (
    <DialogModeContext.Provider value={mobile}>
      {mobile ? (
        <Drawer data-slot="dialog" showSwipeHandle {...props} />
      ) : (
        <DialogPrimitive.Root data-slot="dialog" {...props} />
      )}
    </DialogModeContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: Omit<DialogPrimitive.Trigger.Props, "handle">) {
  const mobile = React.useContext(DialogModeContext)
  return mobile ? (
    <DrawerTrigger data-slot="dialog-trigger" {...props} />
  ) : (
    <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
  )
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  const mobile = React.useContext(DialogModeContext)
  return mobile ? (
    <DrawerPortal data-slot="dialog-portal" {...props} />
  ) : (
    <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
  )
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  const mobile = React.useContext(DialogModeContext)
  return mobile ? (
    <DrawerClose data-slot="dialog-close" {...props} />
  ) : (
    <DialogPrimitive.Close data-slot="dialog-close" {...props} />
  )
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  const mobile = React.useContext(DialogModeContext)
  if (mobile) {
    return (
      <DrawerOverlay
        data-slot="dialog-overlay"
        className={className}
        {...props}
      />
    )
  }

  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/15 transition-opacity duration-[300ms] ease-[cubic-bezier(0.22,1,0.36,1)] supports-backdrop-filter:backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  style,
  ...props
}: Omit<DialogPrimitive.Popup.Props, "render" | "style"> & {
  style?: React.CSSProperties
  showCloseButton?: boolean
}) {
  const mobile = React.useContext(DialogModeContext)
  if (mobile) {
    return (
      <DrawerContent
        data-slot="dialog-content"
        className={cn(
        "max-h-[88dvh] border-x border-t px-4 pt-4 pb-0",
          className
        )}
        style={style}
        {...props}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
          {showCloseButton && (
            <DrawerClose
              data-slot="dialog-close"
              render={
                <Button
                  variant="ghost"
                  className="absolute top-4 right-3 z-20"
                  size="icon-sm"
                  aria-label="Close"
                />
              }
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DrawerClose>
          )}
        </div>
      </DrawerContent>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 transition-[opacity,scale] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] outline-none sm:max-w-sm data-starting-style:opacity-0 data-starting-style:scale-[0.98] data-ending-style:opacity-0 data-ending-style:scale-[0.98] motion-reduce:transition-none",
          className
        )}
        style={style}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-2 right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  const mobile = React.useContext(DialogModeContext)
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 border-b border-border pb-3",
        mobile && "pr-8",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose render={<Button variant="outline" />}>
          Close
        </DialogClose>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  const mobile = React.useContext(DialogModeContext)
  if (mobile) {
    return <DrawerTitle className={className} {...props} />
  }

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-base leading-none font-medium",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  const mobile = React.useContext(DialogModeContext)
  if (mobile) {
    return <DrawerDescription className={className} {...props} />
  }

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
