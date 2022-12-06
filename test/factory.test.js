const { expectEvent, time, expectRevert } = require('@openzeppelin/test-helpers')
const { assert, expect } = require('chai')

const RPVToken = artifacts.require('RPVToken')
const RPTToken = artifacts.require('RPTToken');
const votingFactory = artifacts.require('VotingFactory')
const rpvSale = artifacts.require('RPVSale')
const { toWei, toBN } = require('web3-utils')

contract('Factory testing', async (accounts) => {
  let votingContract
  let rpvContract
  let rptContract
  let rpvSaleContract
  let votingAllowListContract
  let votingFactoryContract

  const parameters = {
    rptSaleRate: '500000000000000000',
    zeroAddress: '0x0000000000000000000000000000000000000000',
    hashIPFS: '0x7B502C3A1F48C8609AE212CDFB639DEE39673F5E',
    buyVotingTokenRate: '500000000000000000', // rate 2,
    createProposalRate: '200000000000000000', // rate 5
    commonVoting: 0,
    landBased: 1,
    organisational: 2,
    holderRPTTokens: accounts[9]
  }

  async function initialization() {
    rpvSaleContract = await rpvSale.new(parameters.rptSaleRate, accounts[9], { from: accounts[1] })
    rptContract  = await RPTToken.new(parameters.holderRPTTokens);
    rpvContract = await RPVToken.new(rpvSaleContract.address)
    await rpvSaleContract.setToken(rpvContract.address, { from: accounts[1] })
    votingFactoryContract = await votingFactory.new(
      rptContract.address,
      accounts[1],
      rpvSaleContract.address,
      parameters.buyVotingTokenRate,
      parameters.createProposalRate,
      { from: accounts[0] }
    )
    await rptContract.transfer(votingFactoryContract.address, toWei('100000', 'ether'), {from: parameters.holderRPTTokens})
    votingAllowListContract = await votingFactoryContract.masterVotingAllowList.call()
    votingContract = await votingFactoryContract.masterVoting.call()
  }

  async function createVoting(typeVoting) {
    await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
    await rpvContract.approve(votingFactoryContract.address, toWei('6', 'ether'))
    const clone = await votingFactoryContract.createVoting(
      `${typeVoting}`,
      parameters.hashIPFS,
      time.duration.weeks(1),
      100,
      20
    )
    return clone
  }

  before(initialization)

  describe('Deploy', () => {
    it('Deploy smart-contracts', async () => {
      assert(votingContract !== '')
      assert(votingAllowListContract !== '')
      assert(rpvContract.address !== '')
      assert(rptContract.address !== '')
      assert(votingFactoryContract.address !== '')
    })
    describe('Deploy Factory', () => {
      it('Expect revert', () => {
        expectRevert(
          votingFactory.new(
            parameters.zeroAddress,
            accounts[1],
            rpvSaleContract.address,
            parameters.buyVotingTokenRate,
            parameters.createProposalRate,
            { from: accounts[0], gas: 30000000 }
          ),
          'Token is zero address'
        )
      })
      it('Expect revert', () => {
        expectRevert(
          votingFactory.new(
            parameters.holderRPTTokens,
            parameters.zeroAddress,
            rpvSaleContract.address,
            parameters.buyVotingTokenRate,
            parameters.createProposalRate,
            { from: accounts[0], gas: 30000000 }
          ),
          'Operator is zero address'
        )
      })
      it('Expect revert', () => {
        expectRevert(
          votingFactory.new(
            parameters.holderRPTTokens,
            accounts[1],
            parameters.zeroAddress,
            parameters.buyVotingTokenRate,
            parameters.createProposalRate,
            { from: accounts[0], gas: 30000000 }
          ),
          'RpvSaleContract is zero address'
        )
      })
      it('Expect revert', () => {
        expectRevert(
          votingFactory.new(parameters.holderRPTTokens, accounts[1], rpvSaleContract.address, 0, parameters.createProposalRate, {
            from: accounts[0],
            gas: 30000000,
          }),
          'Rate must be greater than zero'
        )
      })
      it('Expect revert', () => {
        expectRevert(
          votingFactory.new(parameters.holderRPTTokens, accounts[1], rpvSaleContract.address, parameters.buyVotingTokenRate, 0, {
            from: accounts[0],
            gas: 30000000,
          }),
          'Rate must be greater than zero'
        )
      })
    })
  })
  describe('Get State', () => {
    it('RPVSale contract', async () => {
      const contract = await votingFactoryContract.rpvSaleContract.call()
      assert.equal(contract, rpvSaleContract.address)
    })
    it('RPVToken contract', async () => {
      const contract = await votingFactoryContract.rpvToken.call()
      assert.equal(contract, rpvContract.address)
    })
    it('RPTToken contract', async () => {
      const contract = await votingFactoryContract.rptToken.call()
      assert.equal(contract, rptContract.address)
    })
    it('Operator', async () => {
      const operator = await votingFactoryContract.operator.call()
      assert.equal(operator, accounts[1])
    })
    it('Buy Voting Token Rate', async () => {
      const rate = await votingFactoryContract.buyVotingTokenRate.call()
      assert.equal(rate, parameters.buyVotingTokenRate)
    })
    it('Create Proposal Rate', async () => {
      const rate = await votingFactoryContract.createProposalRate.call()
      assert.equal(rate, parameters.createProposalRate)
    })
  })
  describe('Get Functions', () => {
    before(initialization)
    it('Return Instances Length (0)', async () => {
      const length = await votingFactoryContract.getVotingInstancesLength.call()
      assert.equal(length.toString(), '0')
    })
    it('Return Instances Length (1)', async () => {
      await createVoting(1)
      const length = await votingFactoryContract.getVotingInstancesLength.call()
      assert.equal(length.toString(), '1')
    })
    it('Return Instances Length (2)', async () => {
      await createVoting(0)
      const length = await votingFactoryContract.getVotingInstancesLength.call()
      assert.equal(length.toString(), '2')
    })
  })
  describe('Voting Reward', () => {
    before(initialization)
    it('voting reward: expect revert', async () => {
      const mockAcc = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
      mockAcc.forEach(async (address) => {
        expectRevert(votingFactoryContract.votingReward(accounts[0], {from: address}), 'Caller is not instance')
      })
    })
  })
  describe('Withdraw RPTToken', () => {
    before(initialization)
    it('withdraw: expect success', async () => {
      const beforeBalance = await rptContract.balanceOf(votingFactoryContract.address);
      await votingFactoryContract.withdrawRpt(accounts[1]);
      const afterBalance = await rptContract.balanceOf(votingFactoryContract.address);
      expect(beforeBalance).to.be.bignumber.equal(toWei('100000', 'ether'))
      expect(afterBalance).to.be.bignumber.equal(toBN('0'))
    })
  })
  describe('Set rate', () => {
    before(initialization)
    it('Set voting token rate: expect revert', async () => {
      expectRevert(votingFactoryContract.setVotingTokenRate(1), 'Caller is not an operator')
    })
    it('Set voting token rate: expect revert', async () => {
      expectRevert(votingFactoryContract.setVotingTokenRate(0, { from: accounts[1] }), 'Rate == 0')
    })
    it('Set voting token rate: expect set new rate', async () => {
      const previousRate = await votingFactoryContract.buyVotingTokenRate.call()
      const { logs } = await votingFactoryContract.setVotingTokenRate(1, { from: accounts[1] })
      const newRate = await votingFactoryContract.buyVotingTokenRate.call()
      assert.equal(newRate, 1)
      expectEvent.inLogs(logs, 'SetVotingTokenRate', { previousRate, newRate })
    })
    it('Set create proposal rate: expect revert', async () => {
      expectRevert(votingFactoryContract.setCreateProposalRate(1), 'Caller is not an operator')
    })
    it('Set voting token rate: expect revert', async () => {
      expectRevert(votingFactoryContract.setCreateProposalRate(0, { from: accounts[1] }), 'Rate == 0')
    })
    it('Set create proposal rate: expect set new rate', async () => {
      const previousRate = await votingFactoryContract.createProposalRate.call()
      const { logs } = await votingFactoryContract.setCreateProposalRate(2, { from: accounts[1] })
      const newRate = await votingFactoryContract.createProposalRate.call()
      assert.equal(newRate, 2)
      expectEvent.inLogs(logs, 'SetCreateProposalRate', { previousRate, newRate })
    })
  })
  describe('Set reward', () => {
    before(initialization)
    it('Set reward for create: expect revert', async () => {
      expectRevert(votingFactoryContract.setRewardForCreate(2), 'Caller is not an operator')
    })
    it('Set reward for create: expect revert', async () => {
      expectRevert(votingFactoryContract.setRewardForCreate(0, { from: accounts[1] }), 'Reward == 0')
    })
    it('Set reward for create: expect successful', async () => {
      await votingFactoryContract.setRewardForCreate(2, { from: accounts[1] })
      const newRate = await votingFactoryContract.rewardForCreate.call()
      assert.equal(newRate, 2)
    })
    it('Set reward for create: expect revert', async () => {
      expectRevert(votingFactoryContract.setRewardForVoting(2), 'Caller is not an operator')
    })
    it('Set reward for create: expect revert', async () => {
      expectRevert(votingFactoryContract.setRewardForVoting(0, { from: accounts[1] }), 'Reward == 0')
    })
    it('Set reward for create: expect successful', async () => {
      await votingFactoryContract.setRewardForVoting(2, { from: accounts[1] })
      const newRate = await votingFactoryContract.rewardForVoting.call()
      assert.equal(newRate, 2)
    })
  })
  describe('Set addresses', () => {
    before(initialization)
    it('Set master voting: expect revert', async () => {
      expectRevert(votingFactoryContract.setMasterVoting(accounts[4]), 'Caller is not an operator')
    })
    it('Set master voting: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setMasterVoting(parameters.zeroAddress, { from: accounts[1] }),
        'Address == address(0)'
      )
    })
    it('Set master voting: set new address', async () => {
      const { logs } = await votingFactoryContract.setMasterVoting(accounts[9], { from: accounts[1] })
      const newAddress = await votingFactoryContract.masterVoting.call()
      assert.equal(newAddress, accounts[9])
      expectEvent.inLogs(logs, 'SetMasterVoting', {
        previousContract: votingContract,
        newContract: accounts[9],
      })
    })
    it('Set master votingAllowList: expect revert', async () => {
      expectRevert(votingFactoryContract.setMasterVotingAllowList(accounts[4]), 'Caller is not an operator')
    })
    it('Set master voting: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setMasterVotingAllowList(parameters.zeroAddress, { from: accounts[1] }),
        'Address == address(0)'
      )
    })
    it('Set master votingAllowList: set new address', async () => {
      const { logs } = await votingFactoryContract.setMasterVotingAllowList(accounts[9], { from: accounts[1] })
      const newAddress = await votingFactoryContract.masterVotingAllowList.call()
      assert.equal(newAddress, accounts[9])
      expectEvent.inLogs(logs, 'SetMasterVotingAllowList', {
        previousContract: votingAllowListContract,
        newContract: accounts[9],
      })
    })
    it('Set rpt token: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setRptToken(accounts[2], { from: accounts[0] }),
        'Caller is not an operator'
      )
    })
    it('Set rpt token: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setRptToken(parameters.zeroAddress, { from: accounts[1] }),
        'token == address(0)'
      )
    })
    it('Set rpt token: expect success', async () => {
      await votingFactoryContract.setRptToken(accounts[5], { from: accounts[1] })
      assert.equal(await votingFactoryContract.rptToken.call(), accounts[5])
    })
    it('Set rpv token: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setRpVToken(accounts[2], { from: accounts[0] }),
        'Caller is not an operator'
      )
    })
    it('Set rpv token: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setRpVToken(parameters.zeroAddress, { from: accounts[1] }),
        'token == address(0)'
      )
    })
    it('Set rpv token: expect success', async () => {
      await votingFactoryContract.setRpVToken(accounts[5], { from: accounts[1] })
      assert.equal(await votingFactoryContract.rpvToken.call(), accounts[5])
    })
  })
  describe('Set Admin Role', () => {
    before(initialization)
    it('Set admin role: expect revert', async () => {
      expectRevert(votingFactoryContract.setAdminRole(accounts[4], { from: accounts[3] }), 'Caller is not an admin')
    })
    it('Set admin role: expect revert', async () => {
      expectRevert(votingFactoryContract.setAdminRole(accounts[0], { from: accounts[0] }), 'Same address')
    })
    it('Set admin role: expect revert', async () => {
      expectRevert(
        votingFactoryContract.setAdminRole('0x0000000000000000000000000000000000000000', { from: accounts[0] }),
        'Address == address(0)'
      )
    })
    it('Set admin role: expect set new admin', async () => {
      const { logs } = await votingFactoryContract.setAdminRole(accounts[6], { from: accounts[0] })
      expectEvent.inLogs(logs, 'RoleGranted', { account: accounts[6], sender: accounts[0] })
    })
  })
  describe('Create Voting', () => {
    beforeEach(initialization)
    it('Clone: expect revert', async () => {
      await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
      await rpvContract.approve(votingFactoryContract.address, 5)
      expectRevert(
        votingFactoryContract.createVoting(parameters.commonVoting, parameters.hashIPFS, 0, 100, 20),
        'VF: duration == 0'
      )
    })
    it('Clone: expect revert', async () => {
      await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
      await rpvContract.approve(votingFactoryContract.address, 5)
      expectRevert(
        votingFactoryContract.createVoting(parameters.commonVoting, parameters.hashIPFS, time.duration.weeks(1), 0, 20),
        'QtyVoters must be greater than zero'
      )
    })
    it('Clone: expect revert', async () => {
      await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
      await rpvContract.approve(votingFactoryContract.address, 5)
      expectRevert(
        votingFactoryContract.createVoting(
          parameters.commonVoting,
          parameters.hashIPFS,
          time.duration.weeks(1),
          100,
          0
        ),
        'Percentage must be greater than zero'
      )
    })
    it('Clone Common type', async () => {
      const previousLength = await votingFactoryContract.getVotingInstancesLength.call()
      const { logs } = await createVoting(parameters.commonVoting)
      const currentLength = await votingFactoryContract.getVotingInstancesLength.call()
      expectEvent.inLogs(logs, 'CreateVoting', {
        instanceAddress: logs[0].args.instanceAddress,
        instanceType: toBN(`${parameters.commonVoting}`),
      })
      assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('50', 'ether').toString())
      assert.equal(currentLength.toString(), previousLength.add(toBN(1)).toString())
    })
    it('Clone LandBased type', async () => {
      const previousLength = await votingFactoryContract.getVotingInstancesLength.call()
      const { logs } = await createVoting(parameters.landBased)
      const currentLength = await votingFactoryContract.getVotingInstancesLength.call()
      expectEvent.inLogs(logs, 'CreateVoting', {
        instanceAddress: logs[0].args.instanceAddress,
        instanceType: toBN(`${parameters.landBased}`),
      })
      assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('50', 'ether').toString())
      assert.equal(currentLength.toString(), previousLength.add(toBN(1)).toString())
    })
    it('Clone Organisational type', async () => {
      const previousLength = await votingFactoryContract.getVotingInstancesLength.call()
      const { logs } = await createVoting(parameters.organisational)
      const currentLength = await votingFactoryContract.getVotingInstancesLength.call()
      expectEvent.inLogs(logs, 'CreateVoting', {
        instanceAddress: logs[0].args.instanceAddress,
        instanceType: toBN(`${parameters.organisational}`),
      })
      assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('50', 'ether').toString())
      assert.equal(currentLength.toString(), previousLength.add(toBN(1)).toString())
    })
  })
})
