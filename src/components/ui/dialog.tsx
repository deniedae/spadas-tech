"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DialogContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const DialogContext = React.createContext<DialogContextType | null>(null);

type DialogProps = {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: React.Dispatch<React.SetStateAction<boolean>>;
};

export function Dialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const ctx = React.useContext(DialogContext);

  return (
    <div
      onClick={() => ctx?.setOpen(true)}
      className="inline-block cursor-pointer"
    >
      {children}
    </div>
  );
}

export function DialogContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ctx = React.useContext(DialogContext);

  if (!ctx?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className={`relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl ${className}`}
      >
        <button
          onClick={() => ctx.setOpen(false)}
          className="absolute right-4 top-4 text-xl"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mb-4">{children}</div>;
}

export function DialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn("text-xl font-bold", className)}>{children}</h2>;
}

export function DialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)}>{children}</div>;
}

export function DialogClose({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = React.useContext(DialogContext);

  return (
    <div
      onClick={() => ctx?.setOpen(false)}
      className="inline-block cursor-pointer"
    >
      {children}
    </div>
  );
}

export function DialogPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function DialogOverlay() {
  return null;
}