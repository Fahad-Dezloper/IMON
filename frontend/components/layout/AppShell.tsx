"use client";

import { useState, type ReactNode } from "react";
import type { View } from "@/lib/types";
import { TopBar } from "./TopBar";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

interface Props {
  view: View;
  onNavigate: (v: View) => void;
  children: ReactNode;
}

export function AppShell({ view, onNavigate, children }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <TopBar onMenu={() => setMenuOpen(true)} />
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} view={view} onNavigate={onNavigate} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-24 pt-6 sm:px-8 lg:px-12">
        {children}
      </main>
      <StatusBar />
    </div>
  );
}
