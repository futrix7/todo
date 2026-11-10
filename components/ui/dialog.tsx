
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

type DialogProps = DialogPrimitive.Root.Props

function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: Omit<DialogPrimitive.Trigger.Props, "handle">) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/20 backdrop-blur-[2px]",
        "transition-opacity duration-200 ease-out",
        "data-starting-style:opacity-0 data-ending-style:opacity-0",
        "motion-reduce:transition-none",
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
  return (
    <DialogPortal>
      <DialogOverlay />

      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid",
          "max-h-[calc(100dvh-1rem)] w-[95vw] max-w-[95vw] sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2.5rem)] sm:max-w-xs",
          "-translate-x-1/2 -translate-y-1/2",
          "gap-4 overflow-y-auto overscroll-contain",
          "rounded-2xl border bg-popover p-3 sm:p-4",
          "text-sm text-popover-foreground",
          "shadow-xl shadow-black/10 ring-1 ring-foreground/10 outline-none",

          // Simple fade animation
          "transition-[opacity,scale] duration-200 ease-out",
          "data-starting-style:opacity-0 data-starting-style:scale-[0.98]",
          "data-ending-style:opacity-0 data-ending-style:scale-[0.98]",
          "motion-reduce:transition-none",

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
                className="absolute right-2.5 top-2.5 size-8 rounded-full"
                size="icon"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 border-b border-border pb-3 pr-9",
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
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end [&_[data-slot=button]]:min-h-10 [&_[data-slot=button]]:w-full [&_[data-slot=button]]:px-3 [&_[data-slot=button]]:text-sm sm:[&_[data-slot=button]]:w-auto",
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
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs leading-relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
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
