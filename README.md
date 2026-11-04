# iMON — one token for all of Monad staking

**iMON is a single token that holds a capped, auto-balanced basket of Monad's
liquid staking tokens (LSTs).** Deposit MON, get iMON. It auto-routes your MON
into the highest-yielding staking token within hard safety caps, auto-compounds
the blended yield, and lets you redeem your pro-rata slice of the basket at any
time — no oracle on the exit path, never paused.

> **Live on Monad mainnet (chain id 143) today.** This is a guarded launch of
> new smart-contract code. Deposit only what you can afford to lose, and get an
> independent review before putting in serious size.

📑 **Pitch deck:** https://claude.ai/artifact/PVQeRuj12JBRk3cJABxbC5
🔗 **Repo:** https://github.com/Fahad-Dezloper/IMON

---

## Why it exists

Monad already has several liquid staking tokens — shMON, gMON, aprMON, sMON.
They each pay a **different yield**, carry **different risk** (separate teams,
separate contracts), and the best one **keeps changing**. Picking and babysitting
one is a chore, and going all-in on a single one means one hack or de-peg can
wipe you out.

iMON packages them into one token so you don't have to choose:

- **One deposit, best yield** — MON is routed into the highest-APY sleeve that
  still has room under its cap.
- **Auto-balanced** — a hard per-token cap bounds how much any single provider
  can ever cost you.
- **Always redeemable** — exit returns your real share of the basket, directly
  from on-chain balances.

## How it works

```
Deposit MON  →  wrap to WMON  →  swap into best-APY LST  →  mint iMON
   (1 tx, native MON in — handled by the vault)

Hold iMON    →  NAV rises as the basket earns (auto-compounding, nothing to claim)

Redeem iMON  →  burn shares  →  receive pro-rata slice of every basket token
   (raw balances, no oracle, no cap check, never paused)
```

## Safety, stated honestly

iMON bounds loss — it does **not** promise loss can't happen.

| Mechanism | What it does |
|---|---|
| **Hard per-token cap** | No token exceeds its cap of the basket (enforced in the contract). One failure can only cost you that slice. |
| **Fault isolation** | If one token breaks, the others keep earning and new deposits auto-pause. |
| **Always redeemable** | Exit returns your pro-rata basket with no oracle and no cap check. |
| **Inflation-attack defense** | Virtual + dead shares and internal balance accounting (never `balanceOf(this)`). |

What we don't claim: a fast exploit is *capped*, not dodged, and a chain-level
failure hits every token at once. iMON is a smart contract, not a deposit.

## The economics

**For the depositor** — deposit 100 MON, basket earns ~10.4%/yr, we take 5% of
the *gain* (not principal) → you keep ~9.9 MON/yr, auto-compounding.

**For the protocol** — 5% of yield produced + a fee on swaps between staking
tokens + a few bps on exit (funds the safety reserve):

| TVL | Yield cut (5% of ~10.4%) |
|---|---|
| $5M | ~$26K / yr |
| $25M | ~$130K / yr |

No token. Real fees from real flow, scaling with TVL × yield and swap volume.

## Live contracts (Monad mainnet · chain 143)

| Contract | Address |
|---|---|
| **iMONVault** | [`0x821D…3e2E`](https://monadscan.com/address/0x821D8143d8Df17B55E40374f7FdcEe5706fC3e2E) |
| **YieldOracle** | [`0xC336…24C4`](https://monadscan.com/address/0xC33677eBB984388a363C6399ED5712F09F0524C4) |
| **RateReader** | [`0x3996…b2e8`](https://monadscan.com/address/0x39963350bdfE244515891C6d877e512D61B2b2e8) |
| **AssetRegistry** | [`0xd595…59EA`](https://monadscan.com/address/0xd59580620D2640058aE7A6E2CE124F80A99259EA) |
| **UniswapV3SwapAdapter** | [`0x68e6…12C9f`](https://monadscan.com/address/0x68e66EFa46B693ac87d6AA48E312B8B334c12C9f) |
| **ShMONRateAdapter** | [`0x2BB2…fb69`](https://monadscan.com/address/0x2BB26ACb4a015A00B56A529c6fA67C1d9cAffb69) |

**Basket at launch** (full record: [`backend/deployments/143.json`](backend/deployments/143.json)):

| Token | Provider | Cap |
|---|---|---|
| shMON | FastLane | 30% |
| gMON | Magma | 30% |
| aprMON | aPriori | 15% |
| sMON | Kintsu | staged — not yet in vault (needs rate adapter) |

Canonical: WMON `0x3bd359…433A` · SwapRouter02 `0xfE31F7…b900`.

## Monorepo layout

```
imon/
├── frontend/   Next.js + wagmi/viem — wallet, live vault UI, deposit/redeem
├── backend/    Foundry contracts + deploy scripts + specs + the apr-rotator keeper
├── scripts/    sync.sh (team pull + build + test) · export-abi.sh
├── docs/       PHASES.md
└── INTEGRATION.md   frontend ↔ contract wiring notes
```

## Setup

```bash
# backend — contracts + tests
cd backend
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts@v5.2.0 --no-git
forge build && forge test          # 30 tests, all passing

# frontend — the app
cd frontend
cp -n .env.local.example .env.local
npm install && npm run dev          # → http://localhost:3000
```

The frontend uses an injected wallet (MetaMask / Rabby) and talks straight to
the live mainnet contracts above — connect, deposit MON, watch iMON mint, redeem.

## Status

- **Deployed and live** on Monad mainnet: vault (v3, native `depositMON`),
  YieldOracle + apr-rotator keeper (live APY routing), RateReader, swap adapter,
  3-token basket.
- **Frontend:** connect wallet, live NAV / APY reads, native-MON deposit, redeem.
- **Next:** wire sMON (4th sleeve), FeeController + Guardian pause, external review.

See [`docs/PHASES.md`](docs/PHASES.md), [`backend/docs/BUILD.md`](backend/docs/BUILD.md),
and [`INTEGRATION.md`](INTEGRATION.md).
