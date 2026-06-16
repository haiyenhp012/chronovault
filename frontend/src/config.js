// Auto-generated style config. Addresses come from on-chain deploys on OPN Chain testnet.
export const CHAIN = {
  id: 984,
  idHex: "0x3d8",
  name: "OPN Chain Testnet",
  rpcUrl: "https://testnet-rpc.iopn.tech",
  explorer: "https://testnet.iopn.tech",
  nativeCurrency: { name: "OPN", symbol: "OPN", decimals: 18 },
};

export const ADDRESSES = {
  vault: "0x633651B116757A589B9a64135681AC4935d9FB73",
  token: "0xEE6e1d3d38893bD7f3Ecd1C30cE3efF436964419",
  airdrop: "0xF1318A8cae58311E8F5408CC45DbaB956C149863",
  usdt: "0xB139FEEd4f49ebCd381e0fa8B525ECbAE5cEe673",
  weth: "0x32D73323F2F6c3A1Cb0CB7FecbCbfbBF61ae5B65",
};

// Sentinel address used by ChronoVault to represent the native coin (OPN).
export const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// Tokens selectable in the lock form. `native: true` uses lockNative (msg.value);
// everything else is a standard ERC20 locked via approve + lock. `custom` lets
// the user paste any ERC20 address (decimals/symbol read on-chain).
export const TOKENS = [
  { key: "OPN", symbol: "OPN", name: "OPN (native)", address: NATIVE, decimals: 18, native: true },
  { key: "CHR", symbol: "CHR", name: "Chrono", address: ADDRESSES.token, decimals: 18 },
  { key: "USDT", symbol: "USDT", name: "Tether USD", address: ADDRESSES.usdt, decimals: 6 },
  { key: "WETH", symbol: "WETH", name: "Wrapped Ether", address: ADDRESSES.weth, decimals: 18 },
  { key: "CUSTOM", symbol: "Custom", name: "Custom ERC-20…", address: null, decimals: 18, custom: true },
];

export const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

export const AIRDROP_ABI = [
  "function token() view returns (address)",
  "function merkleRoot() view returns (bytes32)",
  "function claimed(address) view returns (bool)",
  "function claim(uint256 amount, bytes32[] proof)",
  "function canClaim(address account, uint256 amount, bytes32[] proof) view returns (bool)",
];

export const VAULT_ABI = [
  "function nextId() view returns (uint256)",
  "function NATIVE() view returns (address)",
  "function lock(address token, uint256 amount, address recipient, uint64 start, uint64 cliff, uint64 end) returns (uint256)",
  "function lockNative(address recipient, uint64 start, uint64 cliff, uint64 end) payable returns (uint256)",
  "function claim(uint256 id)",
  "function claimable(uint256 id) view returns (uint256)",
  "function vestedAmount(uint256 id) view returns (uint256)",
  "function getLock(uint256 id) view returns (address token, uint256 amount, uint256 claimed, uint64 start, uint64 cliff, uint64 end)",
  "function ownerOf(uint256 id) view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "event Locked(uint256 indexed id, address indexed creator, address indexed token, uint256 amount, uint64 start, uint64 cliff, uint64 end)",
];

// Merkle claims for the demo airdrop (address -> {amount, proof}).
export const AIRDROP_CLAIMS = {
  "0x8f94296DAdb60ae7560431B6206040c245b3C358": {
    amount: "5000000000000000000000",
    proof: [
      "0xdd387fa07f03487508a7e820a5787976bc7fb2ec23111aa1a7388bac6aed76bf",
      "0xe61fd7e0056f63cd17b4edb075943081522c2c1c886ba9acbe88a9327f474c14",
    ],
  },
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": {
    amount: "1000000000000000000000",
    proof: [
      "0x777e5f6f2a341715a3b3830f8d970605101f30840beb632a31b7547bc37d74e1",
      "0x3997506407c6156d8d853bb3a5069f7e30acfd081c7e310ef780b1ef6ec4483e",
    ],
  },
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": {
    amount: "750000000000000000000",
    proof: [
      "0x31fd01e341e24e7e9051a9dd24d3baf06504ec5d832841c990b3b18e30dfa0d3",
      "0x8c34963580ba9fea51fee226bc2e9fa67df5e6b6e2ed7d7689b8a2de64fe08e5",
      "0xe61fd7e0056f63cd17b4edb075943081522c2c1c886ba9acbe88a9327f474c14",
    ],
  },
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": {
    amount: "500000000000000000000",
    proof: [
      "0x691e0f8719a3082753d76c3135e1a0153604c7f038dbd4b01f0e1fe2174c8429",
      "0x3997506407c6156d8d853bb3a5069f7e30acfd081c7e310ef780b1ef6ec4483e",
    ],
  },
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906": {
    amount: "250000000000000000000",
    proof: [
      "0x40095215b70dc3e6d95d38b5e31c5481f9d217d94cee39cda702d79a4b0b8ba1",
      "0x8c34963580ba9fea51fee226bc2e9fa67df5e6b6e2ed7d7689b8a2de64fe08e5",
      "0xe61fd7e0056f63cd17b4edb075943081522c2c1c886ba9acbe88a9327f474c14",
    ],
  },
};
