require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-truffle5");
require('dotenv').config()
const { ACC_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",

  networks: {
    hardhat: {
      forking: {
        url: `https://goerli.blockpi.network/v1/rpc/public`,
      },
      initialBaseFeePerGas: 0,
      gasPrice: 1,
    },

    testnet: {
      url: "https://data-seed-prebsc-2-s2.binance.org:8545",
      accounts: [ACC_PRIVATE_KEY],
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
