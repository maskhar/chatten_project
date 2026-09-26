"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FOCUS_RING, TAP_TARGET } from "@/components/ui/control";

export type NavGroup = readonly [string, readonly (readonly [string, string])[]];

// A15: below 1024px the sidebar was `hidden … lg:block` with no other control,
// so a phone could reach /admin but never move between CMS sections. The link
// list is shared between the desktop sidebar and the mobile drawer so the two
// cannot drift apart.

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

// A92: `px-3 py-2 text-sm` measures ~36px — under the 44px minimum on every one
// of the twenty-one CMS links, and these are the controls a phone operator
// touches most. The focus ring is added here too; the nav was one of the places
// relying on the browser default over a coloured background.
const NAV_LINK = `inline-flex min-h-11 items-center rounded-md px-3 text-sm ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-white`;

function NavLink({ href, label, current, onNavigate }: { href: string; label: string; current: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      className={`${NAV_LINK} ${current ? "bg-paper font-semibold text-forest" : "text-ink hover:bg-paper"}`}
    >
      {label}
    </Link>
  );
}

// A92. Tiga hal yang membuat navigasi ini sulit dipetakan lewat papan tombol
// atau pembaca layar:
//
//   1. Kedua `<nav>` — sidebar desktop dan drawer ponsel — tidak bernama, dan
//      keduanya dapat berada di DOM sekaligus. Daftar landmark karena itu hanya
//      berbunyi "navigation, navigation": tidak ada cara memilih yang benar.
//   2. Judul kelompok ("Situs", "Konten", "Pengaturan", "Administrasi") adalah
//      `<p>`, jadi tidak muncul di daftar judul dan pembaca layar tidak
//      memberi tahu kelompok mana yang sedang dibaca. Tautannya sendiri juga
//      tidak terhubung ke judul itu.
//   3. "Administrasi" hanya berisi satu tautan bagi Editor, sehingga kelompok
//      itu diberi judul untuk daftar yang isinya satu baris.
//
// `<h2>`/`<h3>` di sini sengaja: `<aside>` dan drawer bukan bagian dari alur
// judul halaman, dan `<main>` punya `<h1>`-nya sendiri. Setiap daftar tautan
// adalah `<ul>` yang dilabeli judul kelompoknya lewat `aria-labelledby`, supaya
// keanggotaan kelompok dapat dibacakan, bukan hanya disiratkan jaraknya.
function NavGroupSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 id={id} className="px-2 text-[10px] font-semibold uppercase tracking-[.16em] text-ink-muted">{title}</h3>
      <ul aria-labelledby={id} className="mt-2 grid list-none gap-1">{children}</ul>
    </div>
  );
}

const groupHeadingId = (navId: string, group: string) => `${navId}-group-${group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export function AdminNavLinks({ groups, isAdmin, navId, onNavigate }: { groups: readonly NavGroup[]; isAdmin: boolean; navId: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-labelledby={`${navId}-heading`} className="mt-8 grid gap-6">
      <h2 id={`${navId}-heading`} className="sr-only">Navigasi CMS</h2>
      {groups.map(([group, links]) => (
        <NavGroupSection key={group} id={groupHeadingId(navId, group)} title={group}>
          {links.map(([label, href]) => (
            <li key={href} className="grid">
              <NavLink href={href} label={label} current={isCurrent(pathname, href)} onNavigate={onNavigate} />
            </li>
          ))}
        </NavGroupSection>
      ))}
      <NavGroupSection id={groupHeadingId(navId, "Administrasi")} title="Administrasi">
        {isAdmin ? (
          <li className="grid">
            <NavLink href="/admin/users" label="Pengguna & Peran" current={isCurrent(pathname, "/admin/users")} onNavigate={onNavigate} />
          </li>
        ) : null}
        <li className="grid">
          <NavLink href="/admin/account" label="Akun Saya" current={isCurrent(pathname, "/admin/account")} onNavigate={onNavigate} />
        </li>
      </NavGroupSection>
    </nav>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Link href="/admin" onClick={onNavigate} className={`${TAP_TARGET} font-serif text-2xl tracking-[.12em]`}>CHATTEN</Link>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.18em] text-clay">Pengelola situs</p>
    </>
  );
}

export function AdminSidebar({ groups, isAdmin }: { groups: readonly NavGroup[]; isAdmin: boolean }) {
  return (
    <aside aria-label="Navigasi CMS" className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-mist bg-white p-5 lg:block">
      <Brand />
      {/* The desktop sidebar and the mobile drawer can both be in the DOM at
          once, so their heading ids have to differ — a duplicated id would make
          `aria-labelledby` resolve to whichever came first. */}
      <AdminNavLinks groups={groups} isAdmin={isAdmin} navId="admin-sidebar-nav" />
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
        className={`${TAP_TARGET} justify-center rounded border border-forest px-3 lg:hidden ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-paper`}
      >
        <span className="grid gap-1">
          <span aria-hidden className="block h-0.5 w-5 bg-forest" />
          <span aria-hidden className="block h-0.5 w-5 bg-forest" />
          <span aria-hidden className="block h-0.5 w-5 bg-forest" />
        </span>
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
                className={`${TAP_TARGET} justify-center rounded border border-forest px-3 text-sm font-semibold ${FOCUS_RING} focus-visible:ring-forest focus-visible:ring-offset-white`}
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
            {/* Each link closes the drawer: it is an overlay, so leaving it
                open would cover the page the operator just asked for. */}
            <AdminNavLinks groups={groups} isAdmin={isAdmin} navId="admin-drawer-nav" onNavigate={closeDrawer} />
          </div>
        </div>
      ) : null}
    </>
  );
}
