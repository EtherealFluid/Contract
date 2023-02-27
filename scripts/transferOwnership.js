
// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { format } = require("prettier");
require('dotenv').config()
const { ACC_PRIVATE_KEY } = process.env;


async function main() {
        //charity start address: 0xde21F729137C5Af1b01d73aF1dC21eFfa2B8a0d6
        //Ichor deployer address for all ownership: 0x660D5035Ce4F1F50537bAA612bEb35855cD80F16

       /*  const ichor = await ethers.getContractAt("IICHOR", "0x2b5718E170b945FaFCd3D9235B2FfBa61549738e");
        await ichor.transfer("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16", "8999999999523799767")
 */
        const staking = await ethers.getContractAt("IStakingContract", "0x31Cf15F22FF46c22d0949A94117e5Ea6AEc29Fb8");
        await staking.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        const vFactory = await ethers.getContractAt("IVotingFactory", "0x80104642e60bE0c40c982a50FE6B0B34dcB0344C");
        await vFactory.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        const unicornRewards = await ethers.getContractAt("IUnicornRewards", "0xf11B984BC8B276747800F97B955b1Fc661582df8");
        await unicornRewards.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")
        
        const unicornToken = await ethers.getContractAt("IUnicornToken", "0xA77d7B28Dca3a56eb0B47E748f421B3043A8280A");
        await unicornToken.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        const oldIchorAddress = await ethers.getContractAt("ImockERC20", "0xe47C8560811f8616a893487612F01F72252Dadb7");
        await oldIchorAddress.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        const ichor = await ethers.getContractAt("IICHOR", "0x2b5718E170b945FaFCd3D9235B2FfBa61549738e");
        await ichor.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        const sacrifice = await ethers.getContractAt("ISacrificeToken", "0x7fbd58cFEe5A0a12E30AC6669D3672cBBD908D85");
        await sacrifice.transferOwnership("0x660D5035Ce4F1F50537bAA612bEb35855cD80F16")

        console.log("OWNER CHANGED")
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
