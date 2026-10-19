"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type OpenScannerLinkProps = ComponentProps<typeof Link>;

export function OpenScannerLink({ onClick, ...props }: OpenScannerLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        try {
          localStorage.setItem("spadas_seen_home", "1");
          localStorage.setItem("spadas_mobile_intent", "scanner");
        } catch {}

        onClick?.(event);
      }}
    />
  );
}
