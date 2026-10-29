"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TransitionLink } from "./TransitionLink";

type GoldLook = {
  children: ReactNode;
  /** solid = filled gold (primary), ghost = hairline frame. */
  variant?: "solid" | "ghost";
  size?: "sm" | "md";
  className?: string;
};

export type GoldButtonProps = GoldLook & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
};

export type GoldActionButtonProps = GoldLook &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;

const goldClass = ({ variant = "solid", size = "md", className = "" }: Omit<GoldLook, "children">) =>
  `gold-btn group relative inline-flex items-center justify-center font-taiganja font-semibold uppercase tracking-[0.3em] transition-transform duration-300 hover:scale-[1.03] ${
    variant === "solid" ? "text-black" : "text-gold hover:text-parchment"
  } ${size === "sm" ? "px-7 py-2 text-[10px]" : "px-10 py-3.5 text-[12px]"} ${className}`;

/**
 * Ornate CTA: a cusped gold lozenge with an inner hairline and small lotus
 * finials at both points, echoing the divider ornament. Frame is SVG that
 * stretches with the label (non-scaling strokes keep lines crisp).
 * Supports both internal View Transitions and external links (e.g. target="_blank", mailto).
 */
export function GoldButton({ href, onClick, target, rel, children, ...look }: GoldButtonProps) {
  const isExternal =
    href.startsWith("http") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    Boolean(target);

  if (isExternal) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        className={goldClass(look)}
      >
        <GoldFrame variant={look.variant} size={look.size}>
          {children}
        </GoldFrame>
      </a>
    );
  }

  return (
    <TransitionLink href={href} onClick={onClick} className={goldClass(look)}>
      <GoldFrame variant={look.variant} size={look.size}>
        {children}
      </GoldFrame>
    </TransitionLink>
  );
}

/**
 * GoldButton's look on a plain <button>, for in-page actions (opening or
 * closing a dialog) rather than navigation. `data-variant` lets scoped
 * stylesheets that reset buttons restore the right colours.
 */
export function GoldActionButton({ variant = "solid", size = "md", className, children, ...button }: GoldActionButtonProps) {
  return (
    <button type="button" {...button} data-variant={variant} className={goldClass({ variant, size, className })}>
      <GoldFrame variant={variant} size={size}>
        {children}
      </GoldFrame>
    </button>
  );
}

/** Stretchable SVG frame, lotus finials and label shared by both buttons. */
function GoldFrame({
  variant = "solid",
  size = "md",
  children,
}: Pick<GoldLook, "variant" | "size" | "children">) {
  const solid = variant === "solid";
  const finial = size === "sm" ? 14 : 18;
  return (
    <>
      {/* Stretchable frame */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 200 48"
        preserveAspectRatio="none"
      >
        {/* Fill (solid) / soft glass (ghost) */}
        <path
          d="M14 1 H186 L199 24 L186 47 H14 L1 24 Z"
          fill={solid ? "#d9a441" : "rgba(0,0,0,0.35)"}
        />
        {/* Outer line */}
        <path
          d="M14 1 H186 L199 24 L186 47 H14 L1 24 Z"
          fill="none"
          stroke={solid ? "rgba(255,240,200,0.9)" : "rgba(217,164,65,0.8)"}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Inner hairline */}
        <path
          d="M17 5 H183 L194 24 L183 43 H17 L6 24 Z"
          fill="none"
          stroke={solid ? "rgba(30,20,5,0.45)" : "rgba(217,164,65,0.35)"}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* Sweep of light on hover */}
        <rect
          className="gold-btn-sheen"
          x="-60"
          y="0"
          width="60"
          height="48"
          fill="url(#gold-sweep)"
        />
        <defs>
          <linearGradient id="gold-sweep" x1="0" x2="1">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop
              offset="0.5"
              stopColor="white"
              stopOpacity={solid ? 0.55 : 0.25}
            />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Lotus finials at the points */}
      <Finial
        className="absolute left-0 top-1/2 translate-x-[-70%] -translate-y-1/2"
        size={finial}
      />
      <Finial
        className="absolute right-0 top-1/2 translate-x-[70%] -translate-y-1/2 -scale-x-100"
        size={finial}
      />

      <span className="relative z-10">{children}</span>
    </>
  );
}

function Finial({ className, size }: { className: string; size: number }) {
  return (
    <svg
      aria-hidden
      className={`gold-btn-finial pointer-events-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
    >
      {/* three-petal lotus bud pointing outward (left), with a dot */}
      <path
        d="M12 3 C15 8 15 16 12 21 C9 16 9 8 12 3 Z"
        fill="#d9a441"
        opacity="0.95"
      />
      <path
        d="M7 7 C11 10 11 14 7 17 C5 14 5 10 7 7 Z"
        fill="#d9a441"
        opacity="0.7"
      />
      <path
        d="M17 7 C13 10 13 14 17 17 C19 14 19 10 17 7 Z"
        fill="#d9a441"
        opacity="0.7"
      />
      <circle cx="3" cy="12" r="1.4" fill="#d9a441" />
    </svg>
  );
}
