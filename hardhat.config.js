require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-truffle5");

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
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
