const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// Deploys ChronoToken + ChronoAirdrop, funds the airdrop with the exact
// total from the Merkle tree, and writes deployment addresses to disk.

async function main() {
  const merklePath = path.join(__dirname, "airdrop-merkle.json");
  const merkle = JSON.parse(fs.readFileSync(merklePath, "utf8"));
  const root = merkle.root;
  const tokenTotal = BigInt(merkle.tokenTotal);

  const [deployer] = await ethers.getSigners();
  const treasury = deployer.address;

  // 1M CHR total supply
  const initialSupply = ethers.parseUnits("1000000", 18);

  const Token = await ethers.getContractFactory("ChronoToken");
  const token = await Token.deploy(initialSupply, treasury);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("ChronoToken deployed to:", tokenAddr);

  const Airdrop = await ethers.getContractFactory("ChronoAirdrop");
  const airdrop = await Airdrop.deploy(tokenAddr, root);
  await airdrop.waitForDeployment();
  const airdropAddr = await airdrop.getAddress();
  console.log("ChronoAirdrop deployed to:", airdropAddr);

  // Fund the airdrop contract with the exact total allocation.
  const fundTx = await token.transfer(airdropAddr, tokenTotal);
  await fundTx.wait();
  console.log("Funded airdrop with:", ethers.formatUnits(tokenTotal, 18), "CHR");

  const out = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    token: tokenAddr,
    airdrop: airdropAddr,
    merkleRoot: root,
    initialSupply: initialSupply.toString(),
    airdropFunded: tokenTotal.toString(),
  };
  const outPath = path.join(__dirname, "deployed-token-airdrop.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Written to:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
