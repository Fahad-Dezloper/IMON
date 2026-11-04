"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import type { View } from "@/lib/types";
import { OnboardingGate } from "@/components/OnboardingGate";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/views/DashboardView";
import { BasketView } from "@/components/views/BasketView";
import { ActivityView } from "@/components/views/ActivityView";
import { SafetyView } from "@/components/views/SafetyView";
import { DepositModal } from "@/components/DepositModal";
import { RedeemModal } from "@/components/RedeemModal";

type ActiveModal = null | "deposit" | "redeem";

export default function Home() {
  const { isConnected } = useAccount();
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<ActiveModal>(null);

  const close = () => setModal(null);

  return (
    <>
      {!isConnected && <OnboardingGate />}

      <AppShell view={view} onNavigate={setView}>
        {view === "dashboard" && (
          <DashboardView onDeposit={() => setModal("deposit")} onRedeem={() => setModal("redeem")} />
        )}
        {view === "basket" && <BasketView />}
        {view === "activity" && <ActivityView />}
        {view === "safety" && <SafetyView />}
      </AppShell>

      <DepositModal open={modal === "deposit"} onClose={close} />
      <RedeemModal open={modal === "redeem"} onClose={close} />
    </>
  );
}
