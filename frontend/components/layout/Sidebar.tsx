"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Boxes, LayoutDashboard, ListChecks, ShieldCheck, X } from "lucide-react";
import type { View } from "@/lib/types";

const NAV: { view: View; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { view: "basket", label: "Basket", icon: Boxes },
  { view: "activity", label: "Activity", icon: ListChecks },
  { view: "safety", label: "Safety", icon: ShieldCheck },
];

interface Props {
  open: boolean;
  onClose: () => void;
  view: View;
  onNavigate: (v: View) => void;
}

export function Sidebar({ open, onClose, view, onNavigate }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col rounded-r-3xl bg-surface p-5 shadow-pop"
            role="dialog"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-bold text-ink">iMON</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-md p-1 text-ink-4 transition-colors hover:bg-muted hover:text-ink-2"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-6 flex flex-col gap-1">
              {NAV.map((n) => {
                const active = n.view === view;
                return (
                  <button
                    key={n.view}
                    onClick={() => {
                      onNavigate(n.view);
                      onClose();
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-accent-deep font-semibold text-white"
                        : "font-medium text-ink-2 hover:bg-muted hover:text-ink"
                    }`}
                  >
                    <n.icon size={active ? 20 : 18} strokeWidth={active ? 2.5 : 2} />
                    {n.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto text-xs text-ink-4">iMON · Monad · unaudited</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
