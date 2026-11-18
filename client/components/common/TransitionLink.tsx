"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { curtainNavigate } from "@/lib/route-curtain";

export interface TransitionLinkProps extends React.ComponentProps<typeof Link> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function TransitionLink({
  href,
  children,
  className,
  onClick,
  ...props
}: TransitionLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (onClick) {
      onClick(e);
    }

    // Allow default behavior for modifier keys (cmd/ctrl click for new tab)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    e.preventDefault();
    // The route curtain covers the swap while the next page loads.
    void curtainNavigate(href, () => router.push(href));
  };

  return (
    <Link href={href} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
