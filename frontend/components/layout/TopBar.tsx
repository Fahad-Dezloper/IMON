"use client";

import { Menu } from "lucide-react";
import { WalletButton } from "../WalletButton";

export function TopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-[1600px] grid-cols-3 items-center px-4 sm:px-8 lg:px-12">
        <div className="justify-self-start">
          <button
            onClick={onMenu}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-muted active:scale-[0.96]"
          >
            <Menu size={20} />
          </button>
        </div>
        <div className="justify-self-center">
          <span className="text-[18px] font-bold tracking-tight text-ink">iMON</span>
        </div>
        <div className="justify-self-end">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
