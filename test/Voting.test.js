const {ethers} = require("hardhat");
const {assert, expect} = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
var {keccak256} = require("@ethersproject/keccak256");
var {toUtf8Bytes} = require("@ethersproject/strings");



describe("ICHOR", () => {

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
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, projectWallet] = await ethers.getSigners();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("100");

        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy();

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", vFactory.address, unicornRewards.address);

        uniswapV2Router = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"
        oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, unicornRewards.address, projectWallet.address);

        const name = "SactificeToken";
        const symbol = "ST";
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol, staking.address);

        //settings

        //Staking
        await staking.setIchorAddress(ichor.address);
        await staking.setSacrificeToken(sacrifice.address);

        //VotingFactory
        await vFactory.setIchorAddress(ichor.address);
        await vFactory.setUnicornToken(unicornToken.address);

        //UnicornRewards
        await unicornRewards.setIchorAddress(ichor.address);
        await unicornRewards.setUnicornToken(unicornToken.address);
    });

    async function settings() {
        await ichor.excludeFromFee(staking.address)

        await ichor.transfer(acc1.address, "100000000000")
        await ichor.transfer(acc2.address, "100000000000")
        await ichor.transfer(staking.address, "100000000000")

        await ichor.connect(acc1).approve(staking.address, "100000000000")
        await ichor.connect(acc2).approve(staking.address, "100000000000")
    }
    
    describe("Tests", function () {
        describe("Voting", function () {
            it("Sould setIchorAddress", async () => {
                expect(await vFactory.getIchorAddress()).to.be.equal(ichor.address)
                await vFactory.setIchorAddress(acc2.address)
                expect(await vFactory.getIchorAddress()).to.be.equal(acc2.address)
            });

            it("Sould create Voting", async () => {
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 1
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 100
                let amountOfVoters = 100
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                
                const receipt = await transactionReceipt.wait()
                //console.log(receipt.logs)
                //console.log(receipt.events[0].args.instanceAddress.toString())

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true
            });
        })

        describe("Reverts", function () {
            it("Sould revert setIchorAddress with", async () => {
                
            });
        })
    })
})