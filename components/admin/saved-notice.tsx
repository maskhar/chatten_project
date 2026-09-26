"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// A22: saveResource, saveEvent, savePromotion and saveSpace all redirect to
// `?saved=1`, but nothing read it, so a successful save looked identical to
// doing nothing. This renders the confirmation and then strips the parameter
// from the URL so a reload or a shared link does not re-announce a save that
// already happened.
export function SavedNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const saved = params.get("saved") === "1";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      router.replace(pathname, { scroll: false });
    }, 4000);
    return () => clearTimeout(timer);
  }, [saved, pathname, router]);

  if (!saved || dismissed) return null;

  return (
    <p role="status" className="mb-6 flex items-center gap-2 border-l-4 border-leaf-ink bg-white px-4 py-3 text-sm font-semibold text-leaf">
      Perubahan disimpan.
    </p>
  );
}
