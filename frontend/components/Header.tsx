import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[760px] items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-ink">iMON</span>
          <span className="rounded-full bg-accent-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            Monad
          </span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
