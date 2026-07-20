"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function Avatar({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function AvatarImage(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  return (
    <img
      className="aspect-square h-full w-full object-cover"
      {...props}
    />
  )
}

export function AvatarFallback({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}