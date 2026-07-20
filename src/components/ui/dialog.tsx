"use client";

import * as React from "react";

const DialogContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

export function Dialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  children,
}: {
  children: React.ReactNode;
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
}: {
  children: React.ReactNode;
}) {
  return <h2 className="text-xl font-bold">{children}</h2>;
}

export function DialogDescription({
  children,
}: {
  children: React.ReactNode;
}) {
  return <p>{children}</p>;
}

export function DialogFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mt-4">{children}</div>;
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