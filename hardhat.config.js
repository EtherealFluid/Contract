require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-truffle5");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",

  networks: {
    hardhat: {
      forking: {
        url: `https://bsc-dataseed2.ninicoin.io/`,
      },
      initialBaseFeePerGas: 0,
      gasPrice: 1,
    },
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
