const { expectEvent, BN, time, expectRevert } = require('@openzeppelin/test-helpers')
const { assert } = require('chai')

const RPVToken = artifacts.require('RPVToken')
const RPTToken = artifacts.require('RPTToken')
const votingAllowList = artifacts.require('VotingAllowList')
const votingFactory = artifacts.require('VotingFactory')
const rpvSale = artifacts.require('RPVSale')
const { toWei } = require('web3-utils')

contract('VotingAllowList testing', async (accounts) => {
  let votingContract
  let rpvContract
  let rptContract
  let rpvSaleContract
  let votingAllowListContract
  let votingFactoryContract
  let implementVoting

  const parameters = {
    rptSaleRate: '500000000000000000',
    rptSaleWallet: accounts[9],
    operator: accounts[1],
    hashIPFS: '0x7b502c3a1f48c8609ae212cdfb639dee39673f5e',
    buyVotingTokenRate: '500000000000000000', // rate 2,
    createProposalRate: '200000000000000000', // rate 5
    commonVoting: 0,
    landBased: 1,
    organisational: 2,
    duration: time.duration.weeks(1),
    qtyVoters: 10,
    minPercentageVoters: 20,
    holderRPTTokens: accounts[9]
  }

  async function createVoting(description, duration, qtyVoters, minPercentage) {
    await rpvSaleContract.sendTransaction({ from: accounts[0], value: toWei('3', 'ether') })
    await rpvContract.approve(votingFactoryContract.address, toWei('6', 'ether'))
    const { logs } = await votingFactoryContract.createVoting('1', description, duration, qtyVoters, minPercentage)
    implementVoting = await votingAllowList.at(logs[0].args.instanceAddress)
  }

  async function buyVotingToken(from) {
    await rpvSaleContract.sendTransaction({ from, value: toWei('3', 'ether') })
    await rpvContract.approve(implementVoting.address, toWei('6', 'ether'), { from })
    await implementVoting.buy(2, { from })
  }

  async function initialization() {
    await time.advanceBlock()
    rptContract = await RPTToken.new(parameters.holderRPTTokens)
    rpvSaleContract = await rpvSale.new(parameters.rptSaleRate, parameters.rptSaleWallet)
    rpvContract = await RPVToken.new(rpvSaleContract.address)
    await rpvSaleContract.setToken(rpvContract.address, { from: accounts[0] })
    votingFactoryContract = await votingFactory.new(
      rptContract.address,
      accounts[1],
      rpvSaleContract.address,
      parameters.buyVotingTokenRate,
      parameters.createProposalRate
    )
    await rptContract.transfer(votingFactoryContract.address, toWei('100000', 'ether'), {from: parameters.holderRPTTokens})
    votingAllowListContract = await votingFactoryContract.masterVotingAllowList.call()
    votingContract = await votingFactoryContract.masterVoting.call()
    await createVoting(parameters.hashIPFS, parameters.duration, parameters.qtyVoters, parameters.minPercentageVoters)
  }
  before(initialization)

  describe('Deploy', () => {
    it('Deploy smart-contracts', async () => {
      assert(votingContract !== '')
      assert(votingAllowListContract !== '')
      assert(rpvContract.address !== '')
      assert(votingFactoryContract.address !== '')
    })
  })
  describe('Vote for', () => {
    beforeEach(initialization)
    it('Vote For: expect revert', async () => {
      expectRevert(implementVoting.voteFor(), 'Address is not in AllowList')
    })
    it('Vote For: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      expectRevert(implementVoting.voteFor(), 'Not enough voting tkn')
    })
    it('Vote For: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      await time.increase(time.duration.weeks(3))
      expectRevert(implementVoting.voteFor(), 'Voting is over')
    })
    it('Vote For: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      await implementVoting.voteFor()
      expectRevert(implementVoting.voteFor(), 'Voting: already voted')
    })
    it('Vote For: successful vote', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      const previousAmountToken = await implementVoting.balanceOf.call(accounts[0])
      const {
        _for: forPrevious,
        _against: againstPrevious,
        _count: countPrevious,
      } = await implementVoting.getStats.call()
      const { logs } = await implementVoting.voteFor()
      const { _for: forNext, _against: againstNext, _count: countNext } = await implementVoting.getStats.call()
      const nextAmountToken = await implementVoting.balanceOf.call(accounts[0])
      // // 50 for create + 10 for voting
      assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('60', 'ether'))  
      assert.equal(nextAmountToken.toString(), previousAmountToken.sub(new BN(1)).toString())
      expectEvent.inLogs(logs, 'Voted', { voter: accounts[0], choice: true })
      assert.equal(forNext.toString(), forPrevious.add(new BN(1)).toString())
      assert.equal(againstNext.toString(), againstPrevious.toString())
      assert.equal(countNext.toString(), countPrevious.add(new BN(1)).toString())
    })
  })
  describe('Vote against', () => {
    beforeEach(initialization)
    it('Vote For: expect revert', async () => {
      expectRevert(implementVoting.voteFor(), 'Address is not in AllowList')
    })
    it('Vote against: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      expectRevert(implementVoting.voteAgainst(), 'Not enough voting tkn')
    })
    it('Vote against: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      await time.increase(time.duration.weeks(3))
      expectRevert(implementVoting.voteAgainst(), 'Voting is over')
    })
    it('Vote against: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      await implementVoting.voteAgainst()
      expectRevert(implementVoting.voteAgainst(), 'Voting: already voted')
    })
    it('Vote against: successful vote', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      await buyVotingToken(accounts[0])
      const previousAmountToken = await implementVoting.balanceOf.call(accounts[0])
      const {
        _for: forPrevious,
        _against: againstPrevious,
        _count: countPrevious,
      } = await implementVoting.getStats.call()
      const { logs } = await implementVoting.voteAgainst()
      const { _for: forNext, _against: againstNext, _count: countNext } = await implementVoting.getStats.call()
      const nextAmountToken = await implementVoting.balanceOf.call(accounts[0])
      // // 50 for create + 10 for voting
      assert.equal((await rptContract.balanceOf(accounts[0])).toString(), toWei('60', 'ether'))  
      assert.equal(nextAmountToken.toString(), previousAmountToken.sub(new BN(1)).toString())
      expectEvent.inLogs(logs, 'Voted', { voter: accounts[0], choice: false })
      assert.equal(forNext.toString(), forPrevious.toString())
      assert.equal(againstNext.toString(), againstPrevious.add(new BN(1)).toString())
      assert.equal(countNext.toString(), countPrevious.add(new BN(1)).toString())
    })
  })
  describe('Allow List', () => {
    beforeEach(initialization)
    it('Add to allowList: expect revert', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      expectRevert(
        implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] }),
        'Address has already been added'
      )
    })
    it('Add to allowList: expect revert', async () => {
      expectRevert(
        implementVoting.addAddressToAllowList(accounts[0], { from: accounts[0] }),
        'Caller is not an operator'
      )
    })
    it('Add to allowList: expect revert', async () => {
      const mockArray = []
      expectRevert(implementVoting.addArrayAddressesToAllowList(mockArray, { from: accounts[1] }), 'Array is empty')
    })
    it('Add to allowList: successful added', async () => {
      const previousListCount = await implementVoting.allowListCount.call()
      const { logs } = await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      const nextListCount = await implementVoting.allowListCount.call()
      const contains = await implementVoting.allowList.call(accounts[0])
      assert.equal(contains, true)
      assert.equal(nextListCount.toString(), previousListCount.add(new BN(1)).toString())
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[0] })
    })
    it('Add to allowList: successful added array', async () => {
      await implementVoting.addAddressToAllowList(accounts[0], { from: accounts[1] })
      const mockArray = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4], accounts[5]]
      const previousListCount = await implementVoting.allowListCount.call()
      const { logs } = await implementVoting.addArrayAddressesToAllowList(mockArray, { from: accounts[1] })
      const nextListCount = await implementVoting.allowListCount.call()
      const contains = await implementVoting.allowList.call(accounts[0])
      assert.equal(contains, true)
      assert.equal(nextListCount.toString(), previousListCount.add(new BN(mockArray.length - 1)).toString())
      const containsAccount1 = await implementVoting.allowList.call(accounts[1])
      const containsAccount2 = await implementVoting.allowList.call(accounts[2])
      const containsAccount3 = await implementVoting.allowList.call(accounts[3])
      assert(containsAccount1 && containsAccount2 && containsAccount3 === true)
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[1] })
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[2] })
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[3] })
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[4] })
      expectEvent.inLogs(logs, 'AllowListedAddressAdded', { addr: accounts[5] })
    })
    it('Remove Address From AllowList: expect revert', async () => {
      expectRevert(
        implementVoting.removeAddressFromAllowList(accounts[0], { from: accounts[0] }),
        'Caller is not an operator'
      )
    })
    it('Remove Address From AllowList: expect revert', async () => {
      expectRevert(
        implementVoting.removeAddressFromAllowList(accounts[0], { from: accounts[1] }),
        'Address does not exist'
      )
    })
    it('Remove Address From AllowList: successful remove', async () => {
      const mockArray = [accounts[0], accounts[1], accounts[2], accounts[3], accounts[4]]
      await implementVoting.addArrayAddressesToAllowList(mockArray, { from: accounts[1] })
      const previousListCount = await implementVoting.allowListCount.call()
      const { logs } = await implementVoting.removeAddressFromAllowList(accounts[2], { from: accounts[1] })
      const nextListCount = await implementVoting.allowListCount.call()
      const contains = await implementVoting.allowList.call(accounts[2])
      assert.equal(nextListCount.toString(), previousListCount.sub(new BN(1)).toString())
      assert.equal(contains, false)
      expectEvent.inLogs(logs, 'AllowListedAddressRemoved', { addr: accounts[2] })
    })
  })
})
