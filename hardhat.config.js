require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    opnTestnet: {
      url: "https://testnet-rpc.iopn.tech",
      chainId: 984,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  blockscout: {
    enabled: true,
    customChains: [
      {
        network: "opnTestnet",
        chainId: 984,
        urls: {
          apiURL: "https://testnet.iopn.tech/api",
          browserURL: "https://testnet.iopn.tech",
        },
      },
    ],
  },
  etherscan: {
    enabled: false,
  },
  sourcify: {
    enabled: false,
  },
};
