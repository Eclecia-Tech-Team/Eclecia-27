"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { can, canManageAdmins, canSeeOverview, ROLE_INFO, type AdminArea, type AdminIdentity } from "@/lib/admin/access";
import { adminLogout } from "@/lib/admin/actions/auth";
import { Toaster } from "./ui";

const NAV: { href: string; label: string; area: AdminArea | "admins" | "overview" }[] = [
  { href: "/admin", label: "Overview", area: "overview" },
  { href: "/admin/events", label: "Events", area: "events" },
  { href: "/admin/notices", label: "Notices", area: "notices" },
  { href: "/admin/registrations", label: "Registrations", area: "registrations" },
  { href: "/admin/participants", label: "Participants", area: "participants" },
  { href: "/admin/checkin", label: "Check-in", area: "checkin" },
  { href: "/admin/results", label: "Results", area: "results" },
  { href: "/admin/mail", label: "Mail", area: "mail" },
  { href: "/admin/team", label: "Admins", area: "admins" },
];

export function AdminShell({ admin, children }: { admin: AdminIdentity; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = NAV.filter((n) =>
    n.area === "overview" ? canSeeOverview(admin) : n.area === "admins" ? canManageAdmins(admin) : can(admin, n.area),
  );
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const roleLabel = admin.role === "master" ? "Master key" : ROLE_INFO[admin.role].label;

  const nav = (
    <nav className="adm-nav flex flex-col gap-0.5" aria-label="Admin">
      {items.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          aria-current={active(n.href) ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
          className="border-l-2 border-transparent px-4 py-2 text-[14px] text-parchment/70 transition-colors hover:text-parchment"
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-gold/15 px-4 py-4">
      <div className="truncate text-[13px] text-parchment/80" title={admin.email}>
        {admin.email}
      </div>
      <div className="adm-label mt-1">{roleLabel}</div>
      <div className="mt-3 flex items-center gap-4 text-[13px]">
        <a href="/" target="_blank" rel="noreferrer" className="text-parchment/55 hover:text-gold">
          View site ↗
        </a>
        <form
          action={async () => {
            await adminLogout();
            router.replace("/admin/login");
            router.refresh();
          }}
        >
          <button type="submit" className="text-parchment/55 hover:text-gold">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-gold/15 bg-black/40 lg:flex">
        <Link href="/admin" className="px-4 pb-6 pt-6">
          <div className="font-taiganja text-[18px] tracking-[0.12em] text-gold">ECLECIA&apos;27</div>
          <div className="adm-label mt-1">Control room</div>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gold/15 bg-[#060709]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="font-taiganja text-[15px] tracking-[0.12em] text-gold">
          ECLECIA&apos;27 <span className="adm-label ml-1">Control room</span>
        </Link>
        <button type="button" className="adm-btn" data-size="sm" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-x-0 top-[53px] z-20 border-b border-gold/15 bg-[#060709] lg:hidden">
          <div className="py-2">{nav}</div>
          {footer}
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      <Toaster />
    </div>
  );
}
