require('dotenv').config();

const RPVSale = artifacts.require('RPVSale.sol')
const RPT = artifacts.require('RPTToken.sol')
const RPV = artifacts.require('RPVToken.sol')
const votingFactory = artifacts.require('VotingFactory')

module.exports = async function (deployer, network, accounts) {
  deployer.then(async () => {
    /* if (network === 'hardhat') {
    await deployer.deploy(RPVSale, '500000000000000000', accounts[8])
    await deployer.deploy(RPT, accounts[9])
    await deployer.deploy(RPV, RPVSale.address)
    await deployer.deploy(
      votingFactory,
      accounts[9],
      accounts[1],
      RPVSale.address,
      2,
      5
    ) */
    const sale = await deployer.deploy(RPVSale, '500000000000000000', process.env.DEPLOYER_ACCOUNT)
    await deployer.deploy(RPT, process.env.DEPLOYER_ACCOUNT)
    await deployer.deploy(RPV, RPVSale.address)
    const saleInstance = await RPVSale.deployed();
    await saleInstance.setToken(RPV.address, { from: process.env.DEPLOYER_ACCOUNT })
    await deployer.deploy(
      votingFactory,
      RPT.address,
      process.env.RINKEBY_FACTORY_OWNER,
      RPVSale.address,
      '500000000000000000', // rate 2,
      '200000000000000000', // rate 5
    )
    await sale.transferOwnership( process.env.RINKEBY_FACTORY_OWNER );
  })
}
