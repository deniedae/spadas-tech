"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface BottomSheetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function BottomSheetDrawer({
  isOpen,
  onClose,
  title,
  children,
}: BottomSheetDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border-t sm:border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up"
      >
        {/* Native Mobile Drag Handle Indicator Bar */}
        <div className="w-full flex flex-col items-center justify-center pt-1 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-slate-700 shadow-inner" />
        </div>

        {/* Bottom Sheet Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-800 p-2 text-slate-400 hover:text-white transition cursor-pointer active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
