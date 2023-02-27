const {ethers} = require("hardhat");
const {assert, expect} = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { BigNumber } = require("ethers")

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
        [owner, acc1, acc2, acc3, acc4, mockStaking, charity, voting, migrationPayer] = await ethers.getSigners();

        const StakingTx = await ethers.getContractFactory("StakingContract");
        staking = await StakingTx.deploy("100");
/* 
        const VotingFactoryTx = await ethers.getContractFactory("VotingFactory");
        vFactory = await VotingFactoryTx.deploy(); */

        const mockVotingFactoryTx = await ethers.getContractFactory("mockVotingFactory");
        vFactory = await mockVotingFactoryTx.deploy(voting.address);

        const UnicornRewardsx = await ethers.getContractFactory("UnicornRewards");
        unicornRewards = await UnicornRewardsx.deploy();

        const UnicornTokenx = await ethers.getContractFactory("UnicornToken");
        unicornToken = await UnicornTokenx.deploy("Unicorn", "UT", vFactory.address, unicornRewards.address);

        uniswapV2Router = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
        //oldIchorAddress = "0x2A552CE0738F298d901ADF2ECecCCC73493347ab"

        const mockTX = await ethers.getContractFactory("mockERC20");
        oldIchorAddress = await mockTX.deploy();

        const ICHORTx = await ethers.getContractFactory("ICHOR");
        ichor = await ICHORTx.deploy(uniswapV2Router, oldIchorAddress.address, charity.address, vFactory.address, staking.address, unicornRewards.address, migrationPayer.address);

        const name = "SactificeToken";
        const symbol = "ST";
        const SacrificeTokenTx = await ethers.getContractFactory("SacrificeToken");
        sacrifice = await SacrificeTokenTx.deploy(name, symbol, staking.address);

        //settings

        //Staking
        await staking.setIchorAddress(ichor.address);
        await staking.setSacrificeToken(sacrifice.address);

        //VotingFactory
        //await vFactory.setIchorAddress(ichor.address);
        //await vFactory.setUnicornToken(unicornToken.address);

        //UnicornRewards
        await unicornRewards.setIchorAddress(ichor.address);
        await unicornRewards.setUnicornToken(unicornToken.address);

        //UnicornToken
        await unicornToken.init(owner.address);

        uniswap = await ethers.getContractAt("IUniswapV2Factory", "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f")
        router = await ethers.getContractAt("IUniswapV2Router02", "0x7a250d5630b4cf539739df2c5dacb4c659f2488d")
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
        describe("ICHOR", function () {
            it("Sould get constructor settings", async () => {
                expect(await ichor.name()).to.be.equal("Ethereal Fluid")
                expect(await ichor.symbol()).to.be.equal("ICHOR")
                expect(await ichor.decimals()).to.be.equal(9)
                expect(await ichor.totalSupply()).to.be.equal(await ichor.balanceOf(owner.address))
            });

            it("Sould let setCooldownEnabled", async () => {
                await ichor.setCooldownEnabled(true)
            });

            it("Sould approve", async () => {
                await ichor.approve(acc1.address, "1000")
                expect(await ichor.allowance(owner.address, acc1.address)).to.be.equal("1000")
            });

            it("Sould setBots", async () => {
                await ichor.transfer(acc1.address, "100000000000")
                await ichor.setBots([acc1.address])
                await expect(ichor.connect(acc1).transfer(acc2.address, "100000000000")).to.be.revertedWithoutReason()
            });

            it("Sould delBot", async () => {
                await ichor.transfer(acc1.address, "100000000000")
                await ichor.setBots([acc1.address])
                await expect(ichor.connect(acc1).transfer(acc2.address, "100000000000")).to.be.revertedWithoutReason()
                await ichor.delBot(acc1.address) 
                await ichor.connect(acc1).transfer(acc2.address, "100000000000")
            });
            
            it("Sould openTrading", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                expect(await uniswap.getPair(ichor.address, WETH)).to.be.equal(ZERO_ADDRESS)
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()
                expect(await uniswap.getPair(ichor.address, WETH)).to.not.be.equal(ZERO_ADDRESS)
            });          
            
            it("Sould migrateTokens", async () => {
                await ichor.transfer(migrationPayer.address, "100000000000")
                await oldIchorAddress.mint(acc1.address, "10000000")
                expect(await ichor.balanceOf(acc1.address)).to.be.equal(0)
                expect(await oldIchorAddress.balanceOf(acc1.address)).to.be.equal("10000000")

                await ichor.connect(acc1).migrateTokens()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal("10000000")
                expect(await oldIchorAddress.balanceOf(acc1.address)).to.be.equal("10000000")
            });

            it("Sould setMaxBuyAmount", async () => {
                let transactionReceipt = await ichor.setMaxBuyAmount("1000")
                const receipt = await transactionReceipt.wait()
                expect(receipt.events[0].args.toString()).to.be.equal("1000")
            });

            it("Sould setMaxSellAmount", async () => {
                let transactionReceipt = await ichor.setMaxSellAmount("1000")
                const receipt = await transactionReceipt.wait()
                expect(receipt.events[0].args.toString()).to.be.equal("1000")
            });

            it("Sould setMaxWalletAmount", async () => {
                let transactionReceipt = await ichor.setMaxWalletAmount("1000")
                const receipt = await transactionReceipt.wait()
                expect(receipt.events[0].args.toString()).to.be.equal("1000")
            });

            it("Sould buy", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                await ichor.excludeFromFee(acc1.address)
                
                expect(await ichor.balanceOf(acc1.address)).to.be.equal(0)
                expect(await ichor.balanceOf(charity.address)).to.be.equal(0)
                await router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens("10000", [WETH, ichor.address], acc1.address, "10000000000", {value: "10000000000"})
                expect(await ichor.balanceOf(acc1.address)).to.not.be.equal(0)
                expect(await ichor.balanceOf(charity.address)).to.be.equal(0)
            });

            it("Sould sell", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "10000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )

                await ichor.connect(acc1).approve(router.address, await ichor.balanceOf(acc1.address))

                let tokenBalanceBefore = await ichor.balanceOf(acc1.address)

                await router.connect(acc1).swapExactTokensForETHSupportingFeeOnTransferTokens(
                    "1000000000",
                    "10000", 
                    [ichor.address, WETH], 
                    acc1.address, 
                    "10000000000"
                )
                expect(await ichor.balanceOf(acc1.address)).to.be.lessThan(tokenBalanceBefore)
            });


            it("Sould manualswap and withdrawStuckETH", async () => {
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()


                await ichor.transfer(ichor.address, "10000000")
                expect(await ichor.balanceOf(ichor.address)).to.be.equal(10000000)
                expect(await ethers.provider.getBalance(ichor.address)).to.be.equal(0)
                await ichor.manualswap()
                expect(await ichor.balanceOf(ichor.address)).to.be.equal(0)
                expect(await ethers.provider.getBalance(ichor.address)).to.not.be.equal(0)

                let balanceBefore = await ethers.provider.getBalance(owner.address)

                await ichor.withdrawStuckETH()
                
                expect(await ethers.provider.getBalance(owner.address)).to.be.greaterThan(balanceBefore)
            });

            it("Sould not take fee when totalFee is 0", async () => {
                await ichor.transfer(acc1.address, "10000000")
                await ichor.includeInFee(acc1.address)
                await ichor.includeInFee(acc3.address)
                await ichor.setTotalFee(0)
                await ichor.connect(acc1).transfer(acc3.address, "10000000")
                expect(await ichor.balanceOf(acc3.address)).to.be.equal(10000000)
                expect(await ichor.balanceOf(charity.address)).to.be.equal(0)
            });
            
        })

        describe("Reverts", function () {
            it("Sould revert approve with ERC20: approve from the zero address", async () => {
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [ZERO_ADDRESS],
                  });
                const signer = await ethers.getSigner(ZERO_ADDRESS)
                await expect(ichor.connect(signer).approve(acc1.address, "100")).to.be.revertedWith("ERC20: approve from the zero address") 
            });

            it("Sould revert approve with ERC20: approve to the zero address", async () => {
                await expect(ichor.approve(ZERO_ADDRESS, "100")).to.be.revertedWith("ERC20: approve to the zero address")
            });

            it("Sould revert setCharityAddress with ICHOR: caller is not a Voting contract!", async () => {
                await expect(ichor.setCharityAddress(acc1.address)).to.be.revertedWith("ICHOR: caller is not a Voting contract!")
            });

            it("Sould revert setCharityAddress with ICHOR: Charity cannot be a zero address!", async () => {
                await expect(ichor.connect(voting).setCharityAddress(ZERO_ADDRESS)).to.be.revertedWith("ICHOR: Charity cannot be a zero address!")
            });

            it("Sould revert transfer with ERC20: transfer from the zero address", async () => {
                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [ZERO_ADDRESS],
                  });
                const signer = await ethers.getSigner(ZERO_ADDRESS)
                await expect(ichor.connect(signer).transfer(acc1.address, "100")).to.be.revertedWith("ERC20: transfer from the zero address")
            });

            it("Sould revert transfer with ERC20: transfer to the zero address", async () => {
                await expect(ichor.transfer(ZERO_ADDRESS, "100")).to.be.revertedWith("ERC20: transfer to the zero address")
            });

            it("Sould revert transfer with ERC20: Transfer amount must be greater than zero", async () => {
                await expect(ichor.transfer(acc1.address, 0)).to.be.revertedWith("ERC20: Transfer amount must be greater than zero")
            });

            it("Sould revert transferFrom with ERC20: transfer from the zero address", async () => {
                await expect(ichor.transferFrom(ZERO_ADDRESS, acc1.address, "100")).to.be.revertedWith("ERC20: transfer from the zero address")
            });

            it("Sould revert transferFrom with ERC20: transfer to the zero address", async () => {
                await expect(ichor.transferFrom(owner.address, ZERO_ADDRESS, "100")).to.be.revertedWith("ERC20: transfer to the zero address")
            });

            it("Sould revert transferFrom with ERC20: Transfer amount must be greater than zero", async () => {
                await expect(ichor.transferFrom(acc1.address, acc2.address, 0)).to.be.revertedWith("ERC20: Transfer amount must be greater than zero")
            });

            it("Sould revert migrateTokens with ICHOR: cant pay now!", async () => {
                await oldIchorAddress.mint(acc1.address, "100000000000000")
                expect(await ichor.balanceOf(acc1.address)).to.be.equal(0)
                expect(await oldIchorAddress.balanceOf(acc1.address)).to.be.equal("100000000000000")

                await expect(ichor.connect(acc1).migrateTokens()).to.be.revertedWith("ICHOR: cant pay now!")
            });

            it("Sould revert migrateTokens with ICHOR: tokens already claimed!", async () => {
                await ichor.transfer(migrationPayer.address, "100000000000")
                await oldIchorAddress.mint(acc1.address, "10000000")
                expect(await ichor.balanceOf(acc1.address)).to.be.equal(0)
                expect(await oldIchorAddress.balanceOf(acc1.address)).to.be.equal("10000000")

                await ichor.connect(acc1).migrateTokens()

                expect(await ichor.balanceOf(acc1.address)).to.be.equal("10000000")
                expect(await oldIchorAddress.balanceOf(acc1.address)).to.be.equal("10000000")

                await expect(ichor.connect(acc1).migrateTokens()).to.be.revertedWith("ICHOR: tokens already claimed!")
            });

            it("Sould revert transfer with ICHOR: Insufficient balance!", async () => {
                await expect(ichor.connect(acc2).transfer(acc1.address, "100")).to.be.revertedWith("ICHOR: Insufficient balance!")
            });

            it("Sould revert openTrading with ICHOR: Trading is already open", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await expect(ichor.openTrading()).to.be.revertedWith("ICHOR: Trading is already open")
            });

            it("Sould revert purchasing with UniswapV2: TRANSFER_FAILED", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                await ichor.setMaxWalletAmount("10")
                await expect(router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "10000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )).to.be.revertedWith("UniswapV2: TRANSFER_FAILED")
            });

            it("Sould revert purchasing with UniswapV2: TRANSFER_FAILED", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                await ichor.setMaxBuyAmount("10")
                await expect(router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "10000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )).to.be.revertedWith("UniswapV2: TRANSFER_FAILED")
            });

            it("Sould revert purchasing with TransferHelper: TRANSFER_FROM_FAILED", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                await ichor.setMaxSellAmount("10")
                router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "10000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )

                await ichor.connect(acc1).approve(router.address, await ichor.balanceOf(acc1.address))

                await expect(router.connect(acc1).swapExactTokensForETHSupportingFeeOnTransferTokens(
                    "1000000000",
                    "10000", 
                    [ichor.address, WETH], 
                    acc1.address, 
                    "10000000000"
                )).to.be.revertedWith("TransferHelper: TRANSFER_FROM_FAILED")
            });

            it("Sould revert purchasing with UniswapV2: TRANSFER_FAILED", async () => {
                const WETH = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6"
                await owner.sendTransaction({
                    to: ichor.address,
                    value: BigNumber.from("100000000000"),
                  });
                await ichor.transfer(ichor.address, "100000000000")
                await ichor.openTrading()

                await owner.sendTransaction({
                    to: acc1.address,
                    value: BigNumber.from("100000000000"),
                  });

                await router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "5000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )

                await expect(router.connect(acc1).swapExactETHForTokensSupportingFeeOnTransferTokens(
                    "5000", 
                    [WETH, ichor.address], 
                    acc1.address, 
                    "10000000000", 
                    {value: "10000000000"}
                )).to.be.revertedWith("UniswapV2: TRANSFER_FAILED")
            });

            it("Sould revert setCooldownEnabled with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setCooldownEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert setBots with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setBots([acc1.address])).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert setMaxBuyAmount with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setMaxBuyAmount("10")).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert setMaxSellAmount with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setMaxSellAmount("10")).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert setMaxWalletAmount with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setMaxWalletAmount("10")).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert openTrading with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).openTrading()).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert excludeFromFee with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).excludeFromFee(acc1.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert includeInFee with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).includeInFee(acc1.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert manualswap with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).manualswap()).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert withdrawStuckETH with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).withdrawStuckETH()).to.be.revertedWith("Ownable: caller is not the owner")
            });

            it("Sould revert delBot with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).delBot(acc1.address)).to.be.revertedWith("Ownable: caller is not the owner")
            });  

            it("Sould revert setTotalFee with ICHOR: Fee cant be greater than 10%", async () => {
                await expect(ichor.setTotalFee(110)).to.be.revertedWith("ICHOR: Fee cant be greater than 10%")
            }); 
            
            it("Sould revert setTotalFee with Ownable: caller is not the owner", async () => {
                await expect(ichor.connect(acc2).setTotalFee(50)).to.be.revertedWith("Ownable: caller is not the owner")
            }); 
        })
    })
})