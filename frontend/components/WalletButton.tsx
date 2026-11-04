"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Wallet } from "lucide-react";
import { shortAddr } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm font-medium text-ink shadow-surface transition-colors hover:bg-muted"
      >
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="tnum">{shortAddr(address)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      disabled={isPending || !connectors[0]}
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      <Wallet size={16} />
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
