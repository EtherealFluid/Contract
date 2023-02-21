require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-truffle5");
require('dotenv').config()
const { ACC_PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",

  networks: {
    hardhat: {
      forking: {
        url: `https://endpoints.omniatech.io/v1/eth/goerli/public`,
      },
      initialBaseFeePerGas: 0,
      gasPrice: 1,
    },

    testnet: {
      url: "https://endpoints.omniatech.io/v1/eth/goerli/public",
      accounts: [ACC_PRIVATE_KEY],
      gas: 2100000,
      gasPrice: 8000000000,
  },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
