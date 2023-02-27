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
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, migrationPayer] = await ethers.getSigners();

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
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress, charity.address, vFactory.address, staking.address, unicornRewards.address, migrationPayer.address);

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
        
        //UnicornToken
        await unicornToken.init(owner.address);
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
        describe("VotingFactory", function () {
            it("Sould setIchorAddress", async () => {
                expect(await vFactory.getIchorAddress()).to.be.equal(ichor.address)
                await vFactory.setIchorAddress(acc2.address)
                expect(await vFactory.getIchorAddress()).to.be.equal(acc2.address)
            });

            it("Sould setUnicornAddress", async () => {
                expect(await vFactory.getUnicornToken()).to.be.equal(unicornToken.address)
                await vFactory.setUnicornToken(acc2.address)
                expect(await vFactory.getUnicornToken()).to.be.equal(acc2.address)
            });

            it("Sould create Voting", async () => {
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
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

        describe("Voting", function () {
            it("Sould let voteFor", async () => {
                await ichor.includeInFee(owner.address)
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 100
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                await ichor.approve(voting.address, "1000")
                await voting.voteFor("1000")

                expect(await ichor.balanceOf(voting.address)).to.be.equal("960")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("0")
                expect(result[2]).to.be.equal("1")

                expect(await voting.getbalanceVoted(owner.address)).to.be.equal("960")

                let array = [owner.address]
                let resultArray = await voting.getAllVoters()
                expect(resultArray.toString()).to.be.equal(array.toString())
                //console.log(await voting.getStats())

                //console.log(await unicornToken.getIsUnicorn(acc3.address))

                //await increaseTime(1000)
                //await voting.finishVoting()

                //console.log(await unicornToken.getIsUnicorn(acc3.address))
            });

            it("Sould let voteAgainst", async () => {
                await ichor.includeInFee(owner.address)
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 100
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                await ichor.approve(voting.address, "1000")
                await voting.voteAgainst("1000")

                expect(await ichor.balanceOf(voting.address)).to.be.equal("960")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("0")
                expect(result[1]).to.be.equal("960")
                expect(result[2]).to.be.equal("1")

                expect(await voting.getbalanceVoted(owner.address)).to.be.equal("960")
                //console.log(await voting.getStats())

                //console.log(await unicornToken.getIsUnicorn(acc3.address))

                //await increaseTime(1000)
                //await voting.finishVoting()

                //console.log(await unicornToken.getIsUnicorn(acc3.address))
            });

            it("Sould let more than 1 user", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 100
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address) //TODO автоматизировать в коде!!, или берем комиссию?
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                

                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("576")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                let array = [acc2.address, acc1.address]
                let resultArray = await voting.getAllVoters()
                expect(resultArray.toString()).to.be.equal(array.toString())
            });

            it("Sould finish voting and resolve (Unicorn)", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("576")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.false

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.true
            });

            it("Sould finish voting and resolve (UnicornRemoval)", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                let receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                let voting = await ethers.getContractAt("IVoting", votingInstance)

                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                await increaseTime(518400)
                await voting.finishVoting()

                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.true
                expect(await unicornToken.getUnicornsLength()).to.be.equal(2)
                //Removal

                votingType = 1
                desctiption = keccak256(toUtf8Bytes("Description"));
                duration = 518400
                amountOfVoters = 4
                percantage = 50
                applicant = acc3.address
                transactionReceipt = await vFactory.connect(acc3).createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                receipt = await transactionReceipt.wait()

                votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                voting = await ethers.getContractAt("IVoting", votingInstance)

                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                await increaseTime(518400)
                await voting.finishVoting()

                expect(await ichor.balanceOf(acc3.address)).to.be.equal(0)
                await unicornRewards.connect(acc3).getReward()
                expect(await ichor.balanceOf(acc3.address)).to.be.equal(2)
                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.false
                expect(await unicornToken.getUnicornsLength()).to.be.equal(1)

                await expect(vFactory.connect(acc3).createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)).to.be.revertedWith("VotingFactory: caller is not a Unicorn")
            });

            it("Sould finish voting and resolve (Charity)", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("576")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await ichor.getCharityAddress()).to.be.equal(acc3.address)

                let resultTransactionReceipt = await voting.getVotingResults()
                const resultReceipt = await resultTransactionReceipt.wait()
                let resultStats = resultReceipt.events[0].topics[0]
                expect(resultStats).to.be.equal(keccak256(toUtf8Bytes("VotingSuccessful(uint256,uint256,uint256)")))
            });

            it("Sould finish voting and do not resolve", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 100
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("576")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)

                await increaseTime(518400)
                await voting.finishVoting()

                

                let resultTransactionReceipt = await voting.getVotingResults()
                const resultReceipt = await resultTransactionReceipt.wait()
                let resultStats = resultReceipt.events[0].topics[0]

                expect(resultStats).to.be.equal(keccak256(toUtf8Bytes("VotingFailed(uint256,uint256,uint256)")))

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)
            });

            it("Sould finish voteFor more than 1 times", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("576")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc1).voteAgainst("500")

                result = await voting.getStats()
                expect(result[0]).to.be.equal("960")
                expect(result[1]).to.be.equal("1056")
                expect(result[2]).to.be.equal("2")

                let array = [acc2.address, acc1.address]
                let resultArray = await voting.getAllVoters()
                expect(resultArray.toString()).to.be.equal(array.toString())

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)
            });

            it("Sould finish voteAgainst more than 1 times", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteAgainst("1000")
                await voting.connect(acc1).voteFor("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("576")
                expect(result[1]).to.be.equal("960")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc1).voteFor("500")

                result = await voting.getStats()
                expect(result[0]).to.be.equal("1056")
                expect(result[1]).to.be.equal("960")
                expect(result[2]).to.be.equal("2")

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await ichor.getCharityAddress()).to.be.equal(acc3.address)
            });

            it("Sould finish voteAgainst more than 1 times", async () => {
                
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()
               
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(1)
                expect(await vFactory.isVotingInstance(votingInstance)).to.be.true

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.connect(acc2).approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc2).voteAgainst("1000")
                await voting.connect(acc1).voteFor("600")
                
                expect(await ichor.balanceOf(voting.address)).to.be.equal("1536")
                let result = await voting.getStats()
                expect(result[0]).to.be.equal("576")
                expect(result[1]).to.be.equal("960")
                expect(result[2]).to.be.equal("2")

                expect(await voting.getbalanceVoted(acc2.address)).to.be.equal("960")
                expect(await voting.getbalanceVoted(acc1.address)).to.be.equal("576")

                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.connect(acc1).voteFor("500")

                result = await voting.getStats()
                expect(result[0]).to.be.equal("1056")
                expect(result[1]).to.be.equal("960")
                expect(result[2]).to.be.equal("2")

                expect(await ichor.getCharityAddress()).to.be.equal(charity.address)

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await ichor.getCharityAddress()).to.be.equal(acc3.address)

                //console.log(await ichor.balanceOf(acc1.address))
                //console.log(await ichor.balanceOf(acc2.address))
                
                let balanceBeforeWithdraw1 = await ichor.balanceOf(acc1.address)
                let balanceBeforeWithdraw2 = await ichor.balanceOf(acc2.address)
                expect(await ichor.balanceOf(voting.address)).to.be.equal(1056 + 960)

                await voting.connect(acc1).withdraw()
                await voting.connect(acc2).withdraw()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal(Number(balanceBeforeWithdraw1) + 1056 - Math.round(1056*4/100))
                expect(await ichor.balanceOf(acc2.address)).to.be.equal(Number(balanceBeforeWithdraw2) + 960 - Math.round(960*4/100))
                expect(await ichor.balanceOf(voting.address)).to.be.equal(0)
                
            });
        })

        describe("Reverts", function () {
            it("Should revert createVoting with VotingFactory: caller is not a Unicorn", async () => {
                await settings()
                expect(await vFactory.getVotingInstancesLength()).to.be.equal(0)
                let votingType = 2
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                await expect(vFactory.connect(acc2).createVoting(
                    votingType, 
                    desctiption, 
                    duration, amountOfVoters, 
                    percantage, applicant, 
                )).to.be.revertedWith("VotingFactory: caller is not a Unicorn")
            });

            it("Should revert setIchorAddress with Ownable: caller is not the owner", async () => {
                await expect(vFactory.connect(acc2).setIchorAddress(acc1.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Should revert setUnicornToken with Ownable: caller is not the owner", async () => {
                await expect(vFactory.connect(acc2).setUnicornToken(acc1.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Should revert finishVoting with Voting: Voting result already completed!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.false

                await increaseTime(518400)
                await voting.finishVoting()

                expect(await unicornToken.getIsUnicorn(acc3.address)).to.be.true
                await expect(voting.finishVoting()).to.be.revertedWith("Voting: Voting result already completed!")
            });

            it("Should revert voteFor with Voting: Not enough ICHOR tokens!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)

                await expect(voting.connect(acc4).voteFor(100)).to.be.revertedWith("Voting: Not enough ICHOR tokens!")
            });

            it("Should revert finishVoting with Voting: Not enough ICHOR tokens!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)

                await expect(voting.connect(acc4).voteAgainst(100)).to.be.revertedWith("Voting: Not enough ICHOR tokens!")
            });

            it("Should revert finishVoting with Voting: Voting is not over!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await expect(voting.finishVoting()).to.be.revertedWith("Voting: Voting is not over!")
            });

            it("Should revert getVotingResults with Voting: Voting is not over!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await expect(voting.getVotingResults()).to.be.revertedWith("Voting: Voting is not over!")
            });

            it("Should revert withdraw with Voting: Voting is not over!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await expect(voting.withdraw()).to.be.revertedWith("Voting: Voting is not over!")
            });
            
            it("Should revert voteFor with Voting: Voting is over", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await increaseTime(518400)
                await voting.finishVoting()

                await expect(voting.voteFor(100)).to.be.revertedWith("Voting: Voting is over")
            });

            it("Should revert voteAgainst with Voting: Voting is over", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await increaseTime(518400)
                await voting.finishVoting()

                await expect(voting.voteAgainst(100)).to.be.revertedWith("Voting: Voting is over")
            });

            it("Should revert voteFor when already voted against with Voting: you cant vote for two options!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await expect(voting.connect(acc1).voteFor(100)).to.be.revertedWith("Voting: you cant vote for two options!")
            });

            it("Should revert voteAgainst when already voted against with Voting: you cant vote for two options!", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteFor("600")

                await expect(voting.connect(acc1).voteAgainst(100)).to.be.revertedWith("Voting: you cant vote for two options!")
            });
            

            it("Should revert withdraw with Voting: no tokens to withdraw", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let voting = await ethers.getContractAt("IVoting", votingInstance)
                //await ichor.excludeFromFee(voting.address)
                await ichor.approve(voting.address, "1000")
                await ichor.connect(acc1).approve(voting.address, "1000")
                await voting.voteFor("1000")
                await voting.connect(acc1).voteAgainst("600")

                await increaseTime(518400)

                await expect(voting.connect(acc3).withdraw()).to.be.revertedWith("Voting: no tokens to withdraw")
            });

            it("Should revert initialize with Initializable: contract is already initialized", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                let transactionReceipt = await vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)
                const receipt = await transactionReceipt.wait()

                let votingInstance = receipt.events[0].args.instanceAddress.toString()

                let Params = {
                    description: desctiption,
                    start: getTimestump(),
                    qtyVoters: amountOfVoters,
                    minPercentageVoters: percantage,
                    minQtyVoters: 2,
                    duration: duration
                }
                let voting = await ethers.getContractAt("IVoting", votingInstance)
                await expect(voting.initialize(Params, applicant, ichor.address, unicornToken.address, 0)).to.be.revertedWith("Initializable: contract is already initialized")
            });

            it("Should revert createVoting with VotingFactory: Duration exceeds the allowable interval", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 100
                let amountOfVoters = 4
                let percantage = 50
                let applicant = acc3.address
                await expect(vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)).to.be.revertedWith("VotingFactory: Duration exceeds the allowable interval")
                duration = 1317700
                await expect(vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)).to.be.revertedWith("VotingFactory: Duration exceeds the allowable interval")
            });

            it("Should revert createVoting with VotingFactory: QtyVoters must be greater than zero", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 0
                let percantage = 50
                let applicant = acc3.address
                await expect(vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)).to.be.revertedWith("VotingFactory: QtyVoters must be greater than zero")
            });

            it("Should revert createVoting with VotingFactory: Percentage must be greater than zero", async () => {
                await settings()
                let votingType = 0
                let desctiption = keccak256(toUtf8Bytes("Description"));
                let duration = 518400
                let amountOfVoters = 4
                let percantage = 0
                let applicant = acc3.address
                await expect(vFactory.createVoting(votingType, desctiption, duration, amountOfVoters, percantage, applicant)).to.be.revertedWith("VotingFactory: Percentage must be greater than zero")
            });


        })
    })
})