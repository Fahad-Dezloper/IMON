// Intentional empty stub. RainbowKit transitively pulls Coinbase's Base Account
// connector, whose @coinbase/cdp-sdk optionally imports @x402/* payment modules that
// aren't installed. We never use x402 payments, so next.config.ts aliases those
// specifiers to this empty module. If any x402 code path ever runs (it won't in iMON),
// it would hit undefined exports here — which is the correct "feature not present".
export {};
