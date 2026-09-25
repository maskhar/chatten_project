"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type NavGroup = readonly [string, readonly (readonly [string, string])[]];

// A15: below 1024px the sidebar was `hidden … lg:block` with no other control,
// so a phone could reach /admin but never move between CMS sections. The link
// list is shared between the desktop sidebar and the mobile drawer so the two
// cannot drift apart.

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({ href, label, current, onNavigate }: { href: string; label: string; current: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      className={`rounded-md px-3 py-2 text-sm ${current ? "bg-paper font-semibold text-forest" : "text-ink hover:bg-paper"}`}
    >
      {label}
    </Link>
  );
}

export function AdminNavLinks({ groups, isAdmin, onNavigate }: { groups: readonly NavGroup[]; isAdmin: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="mt-8 grid gap-6">
      {groups.map(([group, links]) => (
        <div key={group}>
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-muted">{group}</p>
          <div className="mt-2 grid gap-1">
            {links.map(([label, href]) => (
              <NavLink key={href} href={href} label={label} current={isCurrent(pathname, href)} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-muted">Administrasi</p>
        <div className="mt-2 grid gap-1">
          {isAdmin ? <NavLink href="/admin/users" label="Pengguna & Peran" current={isCurrent(pathname, "/admin/users")} onNavigate={onNavigate} /> : null}
          <NavLink href="/admin/account" label="Akun Saya" current={isCurrent(pathname, "/admin/account")} onNavigate={onNavigate} />
        </div>
      </div>
    </nav>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className="font-serif text-2xl tracking-[.12em]">CHATTEN</Link>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.18em] text-clay">Pengelola situs</p>
    </>
  );
}

export function AdminSidebar({ groups, isAdmin }: { groups: readonly NavGroup[]; isAdmin: boolean }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-mist bg-white p-5 lg:block">
      <Brand />
      <AdminNavLinks groups={groups} isAdmin={isAdmin} />
    </aside>
  );
}

export function AdminMobileNav({ groups, isAdmin }: { groups: readonly NavGroup[]; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    // Return focus after React removes the dialog, regardless of how it closes.
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    const getFocusableElements = () => Array.from(
      panel?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((element) => !element.hasAttribute("hidden"));

    // Put keyboard users inside the dialog as soon as it opens.
    getFocusableElements()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === firstElement || !panel?.contains(activeElement))) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && (activeElement === lastElement || !panel?.contains(activeElement))) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // The panel scrolls on its own; without this the page behind it scrolls too.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDrawer, open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu navigasi"
        aria-expanded={open}
        aria-controls="admin-mobile-nav"
        className="rounded border border-forest p-2 lg:hidden"
      >
        <span aria-hidden className="block h-0.5 w-5 bg-forest" />
        <span aria-hidden className="mt-1 block h-0.5 w-5 bg-forest" />
        <span aria-hidden className="mt-1 block h-0.5 w-5 bg-forest" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            onClick={closeDrawer}
            tabIndex={-1}
            className="absolute inset-0 h-full w-full bg-black/40"
          />
          <div
            ref={panelRef}
            id="admin-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi CMS"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-mist bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div><Brand onNavigate={closeDrawer} /></div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Tutup menu navigasi"
                className="rounded border border-forest px-2 py-1 text-sm font-semibold"
              >
                ✕
              </button>
            </div>
            {/* Each link closes the drawer: it is an overlay, so leaving it
                open would cover the page the operator just asked for. */}
            <AdminNavLinks groups={groups} isAdmin={isAdmin} onNavigate={closeDrawer} />
          </div>
        </div>
      ) : null}
    </>
  );
}
