"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, LogIn, MapPin, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

const navButton =
  "inline-flex h-8 items-center gap-2 rounded-button border border-line bg-background px-3 text-sm font-medium text-brand transition-colors hover:bg-line/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

const menuItem =
  "flex items-center gap-2 rounded-[12px] px-2 py-1.5 text-sm text-brand transition-colors hover:bg-line/30";

/**
 * Account dropdown (Figma frame 458:13636, logged-out state): Get Started
 * header → Login / Sign Up / Track Order. Closes on outside click / Escape.
 * TODO(medusa): swap to the logged-in menu (472:17346) when a session exists.
 */
export function AccountMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={navButton}
      >
        <User className="size-4" aria-hidden />
        <span className="hidden sm:inline">Account</span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-button border border-line bg-surface p-1 shadow-header"
        >
          <p className="px-2 py-1.5 text-sm font-medium text-brand">
            Get Started
          </p>
          <div className="my-1 h-px bg-line" aria-hidden />
          <Link
            href="/sign-in"
            role="menuitem"
            className={menuItem}
            onClick={() => setOpen(false)}
          >
            <LogIn className="size-4 text-muted" aria-hidden />
            Login
          </Link>
          <Link
            href="/sign-up"
            role="menuitem"
            className={menuItem}
            onClick={() => setOpen(false)}
          >
            <UserPlus className="size-4 text-muted" aria-hidden />
            Sign Up
          </Link>
          <div className="my-1 h-px bg-line" aria-hidden />
          <Link
            href="/track-order"
            role="menuitem"
            className={menuItem}
            onClick={() => setOpen(false)}
          >
            <MapPin className="size-4 text-muted" aria-hidden />
            Track Order
          </Link>
        </div>
      )}
    </div>
  );
}
