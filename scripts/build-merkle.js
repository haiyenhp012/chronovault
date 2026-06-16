const fs = require("fs");
const path = require("path");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const { ethers } = require("ethers");

// Build a Merkle tree for the airdrop from scripts/airdrop-list.json.
// Leaf encoding: (address, uint256) — must match ChronoAirdrop.sol.
// Output: scripts/airdrop-merkle.json containing the root and per-address proofs.

function main() {
  const listPath = path.join(__dirname, "airdrop-list.json");
  const raw = JSON.parse(fs.readFileSync(listPath, "utf8"));
  const decimals = raw.decimals ?? 18;

  const values = raw.recipients.map((r) => [
    ethers.getAddress(r.address),
    ethers.parseUnits(String(r.amount), decimals).toString(),
  ]);

  const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

  const claims = {};
  let total = 0n;
  for (const [i, v] of tree.entries()) {
    const [addr, amount] = v;
    claims[addr] = { amount, proof: tree.getProof(i) };
    total += BigInt(amount);
  }

  const out = {
    root: tree.root,
    decimals,
    tokenTotal: total.toString(),
    claims,
  };

  const outPath = path.join(__dirname, "airdrop-merkle.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log("Merkle root:", tree.root);
  console.log("Recipients:", Object.keys(claims).length);
  console.log("Total to fund:", ethers.formatUnits(total, decimals));
  console.log("Written to:", outPath);
}

main();
