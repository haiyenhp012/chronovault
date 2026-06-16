const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

// Redeploys the upgraded ChronoVault (with native OPN support) and a couple of
// demo ERC20s (USDT 6 decimals, WETH 18 decimals) so the UI token selector is
// realistic. Mints demo balances to the deployer and writes addresses to disk.

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Upgraded vault
  const Vault = await ethers.getContractFactory("ChronoVault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("ChronoVault deployed to:", vaultAddr);

  // 2. Demo tokens
  const Mock = await ethers.getContractFactory("MockERC20");

  const usdt = await Mock.deploy("Tether USD", "USDT", 6);
  await usdt.waitForDeployment();
  const usdtAddr = await usdt.getAddress();
  console.log("Mock USDT deployed to:", usdtAddr);

  const weth = await Mock.deploy("Wrapped Ether", "WETH", 18);
  await weth.waitForDeployment();
  const wethAddr = await weth.getAddress();
  console.log("Mock WETH deployed to:", wethAddr);

  // 3. Mint demo balances to deployer
  await (await usdt.mint(deployer.address, ethers.parseUnits("100000", 6))).wait();
  await (await weth.mint(deployer.address, ethers.parseUnits("50", 18))).wait();
  console.log("Minted demo balances: 100,000 USDT + 50 WETH");

  const out = {
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    vault: vaultAddr,
    usdt: usdtAddr,
    weth: wethAddr,
  };
  const outPath = path.join(__dirname, "deployed-vault-tokens.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Written to:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
