const {ethers} = require("hardhat");
const {assert, expect} = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");


describe("SacrificeToken", () => {

    const increaseTime = async (time) => {
        await ethers.provider.send("evm_increaseTime", [time])
        await ethers.provider.send("evm_mine")
      }

    const getTimestump = async () => {
        let blockNumber = await ethers.provider.getBlockNumber()
        let block = await ethers.provider.getBlock(blockNumber)
        return block.timestamp
    }

    beforeEach(async () => {
        //Get signers
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, projectWallet] = await ethers.getSigners();

        const name = "SactificeToken";
        const symbol = "ST";
        //Deploy token
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol);

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy(sacrifice.address, "100");

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, projectWallet.address);


        await staking.setIchorAddress(ichor.address);
        await vFactory.setIchorAddress(ichor.address);
        await sacrifice.setStakingAddress(staking.address);

        await ichor.excludeFromFee(staking.address)

        await ichor.transfer(acc1.address, "100000000000")
        await ichor.transfer(acc2.address, "100000000000")
        await ichor.transfer(staking.address, "100000000000")

        await ichor.connect(acc1).approve(staking.address, "100000000000")
        await ichor.connect(acc2).approve(staking.address, "100000000000")

    });
    
    describe("Tests", function () {
        
        describe("Main", function () {
            it("Sould getStakingAddress", async () => {
                expect(await sacrifice.connect(acc1).getStakingAddress()).to.be.equal(staking.address)
            });
        })

        describe("Reverts", function () {
            it("Sould revert mint with SacrificeToken: caller is not a StakingContract!", async () => {
                await expect(sacrifice.connect(acc1).mint(acc1.address, 50)).to.be.revertedWith("SacrificeToken: caller is not a StakingContract!")
            });

            it("Sould revert burn with SacrificeToken: caller is not a StakingContract!", async () => {
                await expect(sacrifice.connect(acc1).burn(acc1.address, 50)).to.be.revertedWith("SacrificeToken: caller is not a StakingContract!")
            });

            it("Sould revert setStakingAddress with Ownable: caller is not the owner", async () => {
                await expect(sacrifice.connect(acc1).setStakingAddress(acc2.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });
        })
    })
}) 