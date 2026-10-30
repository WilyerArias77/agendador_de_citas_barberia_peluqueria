/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";

type Props = { variant?: "lockup" | "full"; className?: string; href?: Route | null };

// Muestra la versión clara u oscura del logo según el tema activo (ver .logo-on-* en globals.css).
export function Logo({ variant = "lockup", className = "h-11", href = "/" }: Props) {
  const ratio = variant === "lockup" ? "325 / 233" : "325 / 301";
  const images = <span className={`relative inline-block ${className}`} style={{ aspectRatio: ratio }}>
    <img src={`/logo-gs-${variant}-dark.png`} alt="Growing Solutions" className="logo-on-dark absolute inset-0 h-full w-full object-contain" />
    <img src={`/logo-gs-${variant}-light.png`} alt="" aria-hidden="true" className="logo-on-light absolute inset-0 h-full w-full object-contain" />
  </span>;
  if (!href) return images;
  return <Link href={href} aria-label="Growing Solutions, inicio" className="inline-flex shrink-0">{images}</Link>;
}
