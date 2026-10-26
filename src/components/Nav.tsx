"use client";

import { AdminPortalWindowSwitcher } from "@/components/AdminPortalWindowSwitcher";
import { ActiveRoleBadge, ROLE_ACCENT_BAR_CLASS } from "@/components/role-indicator";
import { type AuthRole } from "@/lib/auth-types";
import type { PortalWindow } from "@/lib/portal-windows";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { getOpsNavLinks } from "@/lib/ops-nav";
import { getCaptainNavLinks, type CaptainNavMenuItem } from "@/lib/captain-nav";

const ACCESS_LINKS = [{ href: "/access", label: "Access" }] as const;

const ADMIN_MENU_ITEMS = [
  { href: "/event-settings", label: "Event settings" },
] as const;

function ChevronIcon({ className, open }: { className?: string; open?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={`${className ?? ""} transition ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function navMenuItemActive(pathname: string, href: string, exact = false): boolean {
  const [path, hash] = href.split("#");
  if (hash) {
    return pathname === path;
  }
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavDropdownItem = {
  href: string;
  label: string;
  exact?: boolean;
};

function NavMenuLink({
  item,
  pathname,
  onClick,
  inset = false,
}: {
  item: NavDropdownItem;
  pathname: string;
  onClick: () => void;
  inset?: boolean;
}) {
  const itemActive = navMenuItemActive(pathname, item.href, item.exact);
  const isPdf = item.href.endsWith(".pdf") || item.href.endsWith(".mp4");
  return (
    <Link
      href={item.href}
      role="menuitem"
      target={isPdf ? "_blank" : undefined}
      rel={isPdf ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={`block py-1.5 text-sm transition ${inset ? "pl-6 pr-3" : "px-3"} ${
        itemActive
          ? "bg-blue-50 font-medium text-blue-800"
          : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {item.label}
    </Link>
  );
}

function useNavDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, rootRef };
}

function NavDropdownTrigger({
  label,
  open,
  onClick,
}: {
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
    >
      {label}
      <ChevronIcon className="h-4 w-4" open={open} />
    </button>
  );
}

function NavDropdownMenu({
  label,
  pathname,
  items,
  onNavigate,
}: {
  label: string;
  pathname: string;
  items: readonly NavDropdownItem[];
  onNavigate?: () => void;
}) {
  const { open, setOpen, rootRef } = useNavDropdown();

  return (
    <div ref={rootRef} className="relative">
      <NavDropdownTrigger label={label} open={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <div
          role="menu"
          className="z-50 bg-white py-1 md:absolute md:left-0 md:top-full md:mt-1 md:min-w-[12rem] md:rounded-lg md:border md:border-slate-200 md:shadow-lg"
        >
          {items.map((item) => (
            <NavMenuLink
              key={`${item.href}:${item.label}`}
              item={item}
              pathname={pathname}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminMenu({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <NavDropdownMenu
      label="Admin"
      pathname={pathname}
      items={ADMIN_MENU_ITEMS}
      onNavigate={onNavigate}
    />
  );
}

function CaptainMoreMenu({
  pathname,
  label,
  items,
  onNavigate,
}: {
  pathname: string;
  label: string;
  items: readonly CaptainNavMenuItem[];
  onNavigate?: () => void;
}) {
  return (
    <NavDropdownMenu label={label} pathname={pathname} items={items} onNavigate={onNavigate} />
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path
        fillRule="evenodd"
        d="M3 5.75A.75.75 0 013.75 5h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 5.75zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75A.75.75 0 013 10zm0 4.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-3a1 1 0 00-1-1H9a1 1 0 00-1 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function Nav({
  role,
  isAdmin = false,
  captainMoreMenuItems = [],
  roleSwitcher = null,
  portalWindowSim = null,
}: {
  role: AuthRole;
  isAdmin?: boolean;
  captainMoreMenuItems?: readonly CaptainNavMenuItem[];
  roleSwitcher?: ReactNode;
  portalWindowSim?: PortalWindow | null;
}) {
  const showAccessLink = role === "admin";
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const homeHref = role === "volunteer" ? "/volunteer" : "/";
  const onHome = pathname === homeHref;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }
  const links =
    role === "captain"
      ? getCaptainNavLinks()
      : getOpsNavLinks(role);
  const compactHeader = role === "captain" || role === "volunteer";
  const portalTitle =
    role === "captain"
      ? "Day Captain Portal"
      : role === "volunteer"
        ? "Volunteer Portal"
        : "Booth Ops";

  function isCaptainNavActive(href: string, label: string): boolean {
    if (label === "Home" || label === "Pick Day") return onHome;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <header className="no-print border-b border-slate-200 shadow-sm">
      <div
        className={`relative overflow-hidden bg-[#1a2a40] ${
          compactHeader ? "min-h-[5.25rem]" : "min-h-[8rem] sm:min-h-[10rem]"
        }`}
      >
        <div
          className={`relative mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 ${
            compactHeader ? "py-3" : "py-5"
          }`}
        >
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href={homeHref}
              className="group shrink-0 rounded-lg outline-offset-4 transition hover:opacity-95"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm transition group-hover:bg-white/25">
                <HomeIcon className="h-5 w-5" />
              </span>
            </Link>
            <div className="min-w-0">
              <Link
                href={homeHref}
                className="group block rounded-lg outline-offset-4 transition hover:opacity-95"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-blue-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  Booth Ops
                </p>
                <h1
                  className={`font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] ${
                    compactHeader ? "text-base sm:text-lg" : "text-lg sm:text-xl"
                  }`}
                >
                  {portalTitle}
                </h1>
              </Link>
              {showAccessLink ? <AdminPortalWindowSwitcher current={portalWindowSim} /> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {roleSwitcher ?? <ActiveRoleBadge role={role} />}
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="rounded-lg bg-slate-950/45 px-3 py-1.5 text-sm text-white ring-1 ring-white/35 backdrop-blur-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition hover:bg-slate-950/65"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </div>

      {role === "admin" ? (
        <div className={`h-1 ${ROLE_ACCENT_BAR_CLASS[role]}`} aria-hidden="true" />
      ) : null}

      <nav className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="portal-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon className="h-5 w-5" />
            Menu
            <ChevronIcon className="h-4 w-4" open={menuOpen} />
          </button>
          <div
            id="portal-nav-menu"
            className={`${menuOpen ? "mt-1 flex" : "hidden"} flex-col gap-1 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center`}
          >
            {links.map((entry) => {
              if ("kind" in entry) {
                return (
                  <CaptainMoreMenu
                    key="captain-more-menu"
                    pathname={pathname}
                    label={entry.label}
                    items={captainMoreMenuItems}
                    onNavigate={closeMenu}
                  />
                );
              }
              const link = entry;
              const active =
                role === "captain"
                  ? isCaptainNavActive(link.href, link.label)
                  : link.home || link.href === homeHref
                    ? onHome
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {"home" in link && link.home ? <HomeIcon className="h-4 w-4" /> : null}
                  {link.label}
                </Link>
              );
            })}
            {showAccessLink &&
              ACCESS_LINKS.map((link) => {
                const active =
                  pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            {isAdmin && <AdminMenu pathname={pathname} onNavigate={closeMenu} />}
          </div>
        </div>
      </nav>
    </header>
  );
}