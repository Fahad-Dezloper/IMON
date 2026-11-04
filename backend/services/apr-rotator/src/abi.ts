export const vaultAbi = [
  {
    type: "function",
    name: "getAssets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "weightBps",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "effectiveCapBps",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint16" }],
  },
  {
    type: "function",
    name: "preferredDepositAsset",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "best", type: "address" },
      { name: "apr", type: "int256" },
    ],
  },
  {
    type: "function",
    name: "rateReader",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "rebalance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export const oracleAbi = [
  {
    type: "function",
    name: "recordMany",
    stateMutability: "nonpayable",
    inputs: [{ name: "assets_", type: "address[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "pushLiveAprMany",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets_", type: "address[]" },
      { name: "aprs_", type: "int256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "aprBps",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    type: "function",
    name: "effectiveAprBps",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "int256" }],
  },
  {
    type: "function",
    name: "hasApr",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "worstAsset",
    stateMutability: "view",
    inputs: [
      { name: "assets", type: "address[]" },
      { name: "weightsBps", type: "uint16[]" },
      { name: "enabled", type: "bool[]" },
      { name: "minWeightBps", type: "uint16" },
    ],
    outputs: [
      { name: "worst", type: "address" },
      { name: "worstApr", type: "int256" },
    ],
  },
] as const;

export const rateReaderAbi = [
  {
    type: "function",
    name: "rateOf",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;
