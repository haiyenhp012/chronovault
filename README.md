# ChronoVault

Time-locked token & LP vesting on **OPN Chain**, where every lock position is a tradable ERC-721 NFT — shipped with its own project token (**CHR**), a gas-light Merkle airdrop, and a polished React dApp.

Lock any ERC-20 (project tokens, LP tokens, stablecoins) under a **cliff + linear vesting** schedule. The position is minted as an NFT — whoever holds the NFT is the sole claimant. Transfer the NFT and you transfer the future-unlock rights, enabling OTC sales, collateralization, and secondary markets for locked positions.

Built for the **IOPn Builders Programme · Season 1 (DeFi & Open Finance)**.

## Why

Team locks, presale vesting, and OTC escrow normally trap capital in a contract no one can trade. ChronoVault makes each locked position a liquid, transferable asset while keeping the vesting schedule enforced on-chain.

## Live on OPN Chain Testnet

All three contracts are deployed and **verified** on the explorer.

| Contract | Address | Explorer |
|---|---|---|
| ChronoVault | `0x633651B116757A589B9a64135681AC4935d9FB73` | [View ↗](https://testnet.iopn.tech/address/0x633651B116757A589B9a64135681AC4935d9FB73#code) |
| ChronoToken (CHR) | `0xEE6e1d3d38893bD7f3Ecd1C30cE3efF436964419` | [View ↗](https://testnet.iopn.tech/address/0xEE6e1d3d38893bD7f3Ecd1C30cE3efF436964419#code) |
| ChronoAirdrop | `0xF1318A8cae58311E8F5408CC45DbaB956C149863` | [View ↗](https://testnet.iopn.tech/address/0xF1318A8cae58311E8F5408CC45DbaB956C149863#code) |
| Mock USDT (6 dp) | `0xB139FEEd4f49ebCd381e0fa8B525ECbAE5cEe673` | [View ↗](https://testnet.iopn.tech/address/0xB139FEEd4f49ebCd381e0fa8B525ECbAE5cEe673#code) |
| Mock WETH (18 dp) | `0x32D73323F2F6c3A1Cb0CB7FecbCbfbBF61ae5B65` | [View ↗](https://testnet.iopn.tech/address/0x32D73323F2F6c3A1Cb0CB7FecbCbfbBF61ae5B65#code) |

| Network | Value |
|---|---|
| Name | OPN Chain Testnet |
| RPC | `https://testnet-rpc.iopn.tech` |
| Chain ID | `984` |
| Explorer | `https://testnet.iopn.tech` |

## Components

### 1. ChronoVault (`contracts/ChronoVault.sol`)

The core vesting protocol. Each lock is an ERC-721 position.

- **Native OPN + any ERC-20 / LP token** — lock the chain's native coin via `lockNative` (payable), or any ERC-20 via `lock`. ERC-20 path works with fee-on-transfer tokens (locks the actually-received amount).
- **Cliff + linear vesting** — nothing claimable before the cliff, then linear unlock to the end time.
- **NFT positions** — each lock is an ERC-721 (`CHRONO`); holding the NFT = owning the claim rights.
- **Partial claims** — claim vested tokens any time; the position auto-burns once fully claimed.
- **Reentrancy-guarded** and built on OpenZeppelin (`SafeERC20`, `ReentrancyGuard`, `ERC721`). Native claims follow checks-effects-interactions (burn + state update before the value transfer).

| Function | Description |
|---|---|
| `lock(token, amount, recipient, start, cliff, end)` | Lock an ERC-20, mint position NFT to `recipient`. Returns the token id. |
| `lockNative(recipient, start, cliff, end)` *(payable)* | Lock native OPN sent as `msg.value`. The position records the `NATIVE` sentinel address. |
| `claim(id)` | NFT holder claims all currently-vested tokens/coins. Burns the NFT when fully claimed. |
| `claimable(id)` | Amount claimable right now (vested − already claimed). |
| `vestedAmount(id)` | Total vested so far. |
| `getLock(id)` | Full lock data: `token, amount, claimed, start, cliff, end`. |

Native locks use the sentinel `NATIVE = 0xEeee…EEeE` as the token address. Caller must `approve` ChronoVault for `amount` before calling `lock` (not needed for `lockNative`).

### 2. ChronoToken (`contracts/ChronoToken.sol`)

The project's ERC-20 (`CHR`). Fixed supply of **1,000,000 CHR** minted once to the treasury at deployment. No mint function after construction — supply is immutable.

### 3. ChronoAirdrop (`contracts/ChronoAirdrop.sol`)

A **Merkle-based distributor** for CHR. Eligible `(address, amount)` pairs are committed as a single Merkle root, so the contract stays cheap regardless of recipient count.

- Each address claims its exact allocation **once** (double-claim guarded).
- Leaf encoding matches OpenZeppelin's `StandardMerkleTree`: `keccak256(bytes.concat(keccak256(abi.encode(account, amount))))`.
- `canClaim(account, amount, proof)` — view helper for the UI to check eligibility.
- Owner can `setMerkleRoot` for a new round and `sweep` unclaimed tokens after a campaign.

## Frontend dApp (`frontend/`)

A React + Vite + Tailwind dApp wired to all three contracts.

- Connect wallet, auto add/switch to OPN Chain (Chain ID 984).
- **Claim airdrop** — checks eligibility against the Merkle tree and claims CHR.
- **Create a lock** — pick native OPN, CHR, USDT, WETH, or paste any custom ERC-20 (symbol + decimals resolved on-chain). Native locks skip approval; ERC-20s do approve + lock. Live schedule preview with cliff/fully-vested dates.
- **Your Positions** — each position rendered as an NFT card with its own token symbol/decimals, a live per-second vesting progress bar, countdowns, and a claim button.
- Dark glassmorphism design with animated aurora backdrop, gradient accents, skeleton loaders, and toasts.

```bash
cd frontend
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build
```

Deployed contract addresses, ABIs, and the demo airdrop proofs live in `frontend/src/config.js`.

## Setup (contracts)

```bash
npm install
npm run compile
npm test
```

28 tests cover the vault (ERC-20 lock, native OPN lock, cliff, linear vesting, partial claims, holder-only claim, NFT transfer, reverts) and the token + airdrop (eligibility, double-claim, wrong amount, owner controls).

## Deploy

Create a `.env` with a funded testnet key:

```
PRIVATE_KEY=your_private_key
```

Deploy the vault:

```bash
npm run deploy
```

Deploy the token + airdrop (builds the Merkle tree, deploys both, funds the airdrop):

```bash
node scripts/build-merkle.js                                   # build tree from scripts/airdrop-list.json
npx hardhat run scripts/deploy-token-airdrop.js --network opnTestnet
```

## Verify on the explorer

The explorer runs **Blockscout**, so verification uses hardhat-verify's Blockscout provider (configured in `hardhat.config.js`). Compiler settings must match: **Solidity 0.8.28**, optimizer **enabled, 200 runs**, EVM target **paris**.

```bash
# no constructor args
npx hardhat verify --network opnTestnet <VAULT_ADDRESS>

# with constructor args
npx hardhat verify --network opnTestnet <TOKEN_ADDRESS> <INITIAL_SUPPLY> <TREASURY>
npx hardhat verify --network opnTestnet <AIRDROP_ADDRESS> <TOKEN_ADDRESS> <MERKLE_ROOT>
```

## Project layout

```
contracts/
  ChronoVault.sol      # core: ERC-721 lock positions, cliff + linear vesting
  ChronoToken.sol      # project ERC-20 (CHR), fixed supply
  ChronoAirdrop.sol    # Merkle distributor for CHR
  MockERC20.sol        # configurable-decimals ERC-20 for tests + demo USDT/WETH
test/
  ChronoVault.test.js
  ChronoAirdrop.test.js
scripts/
  deploy.js                  # deploy ChronoVault
  build-merkle.js            # build Merkle tree from airdrop-list.json
  deploy-token-airdrop.js    # deploy + fund token & airdrop
  deploy-vault-tokens.js     # deploy vault + demo USDT/WETH tokens
  airdrop-list.json          # airdrop recipients (address, amount)
frontend/                    # React + Vite + Tailwind dApp
```

## License

MIT
