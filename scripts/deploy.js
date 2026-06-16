const { ethers } = require("hardhat");

async function main() {
  const Vault = await ethers.getContractFactory("ChronoVault");
  const vault = await Vault.deploy();
  await vault.waitForDeployment();

  const addr = await vault.getAddress();
  console.log("ChronoVault deployed to:", addr);
  console.log("Network:", (await ethers.provider.getNetwork()).chainId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
