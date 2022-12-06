const { expectEvent, BN, time, expectRevert } = require('@openzeppelin/test-helpers')
const { assert } = require('chai')

const RPVToken = artifacts.require('RPVToken')
const rpvSale = artifacts.require('RPVSale')
const { toWei } = require('web3-utils')

contract('RPTSale Testing', async (accounts) => {
  let rpvContract
  let rpvSaleContract

  const parameters = {
    rptSaleRate: '500000000000000000',
    zeroAddress: '0x0000000000000000000000000000000000000000',
    rptSaleWallet: accounts[9],
    operator: accounts[0],
    buyVotingTokenRate: '500000000000000000', // rate 2,
    createProposalRate: '200000000000000000', // rate 5
    commonVoting: 0,
    landBased: 1,
    organisational: 2,
    duration: time.duration.weeks(1),
    qtyVoters: 10,
    minPercentageVoters: 20,
  }

  async function initialization() {
    rpvSaleContract = await rpvSale.new(parameters.rptSaleRate, parameters.rptSaleWallet)
    rpvContract = await RPVToken.new(rpvSaleContract.address)
    await rpvSaleContract.setToken(rpvContract.address, { from: accounts[0] })
  }
  before(initialization)
  describe('Deploy', () => {
    it('Expect revert', async () => {
      expectRevert(rpvSale.new(0, parameters.rptSaleWallet), 'RPTSale: rate == 0')
    })
    it('Expect revert', async () => {
      expectRevert(rpvSale.new(parameters.rptSaleRate, parameters.zeroAddress), 'RPTSale: wallet == address(0)')
    })
  })
  describe('Get Functions', () => {
    it('Get rate', async () => {
      const rate = await rpvSaleContract.rate.call()
      assert.equal(rate, parameters.rptSaleRate)
    })
    it('Get wallet: expect revert', async () => {
      expectRevert(rpvSaleContract.getWallet.call({ from: accounts[1] }), 'Ownable: caller is not the owner')
    })
    it('Get wallet: successful', async () => {
      const wallet = await rpvSaleContract.getWallet.call({ from: parameters.operator })
      assert.equal(wallet, parameters.rptSaleWallet)
    })
    describe('Get Income Sales: successful', async () => {
      beforeEach(initialization)
      const mockArray = [toWei('3', 'ether'), toWei('2', 'ether'), toWei('11', 'ether')]
      mockArray.forEach(async (item, index) => {
        it(`Send: ${index + 1}`, async () => {
          const previousAmount = await rpvSaleContract.incomeSales.call()
          await rpvSaleContract.sendTransaction({ from: accounts[0], value: item })
          const nextAmount = await rpvSaleContract.incomeSales.call()
          assert.equal(nextAmount.toString(), previousAmount.add(new BN(item)).toString())
        })
      })
    })
  })
  describe('Buy Token', () => {
    before(initialization)
    it('Buy Token: expect revert', async () => {
      expectRevert(rpvSaleContract.buyTokens(parameters.zeroAddress), 'RPTSale: address == address(0)')
    })
    it('Buy Token: expect revert', async () => {
      expectRevert(rpvSaleContract.buyTokens(accounts[0], { from: accounts[0], value: 0 }), 'RPTSale: msg.value == 0')
    })
    // it('Buy Token: expect revert', async () => {
    //   await rpvSaleContract.setRate(toWei('1', 'wei'))
    //   expectRevert(
    //     rpvSaleContract.buyTokens(accounts[0], { from: accounts[0], value: toWei('260000000', 'ether') }),
    //     'RPTSale: Not enough RPT'
    //   )
    // })
    describe('Buy Token: expect revert', () => {
      before(initialization)
      const mockArray = [toWei('400', 'milli'), toWei('1700', 'milli'), toWei('700', 'milli'), toWei('1200', 'milli')]
      mockArray.forEach((item, index) => {
        it(`Incorrect msg.value: ${index + 1}`, async () => {
          expectRevert(
            rpvSaleContract.buyTokens(accounts[0], { from: accounts[0], value: item }),
            'RPTSale: Incorrect msg.value'
          )
        })
      })
    })
    describe('Buy Token: successful', () => {
      before(initialization)
      const mockArray = [
        toWei('500', 'milli'),
        toWei('1500', 'milli'),
        toWei('2', 'ether'),
        toWei('4', 'ether'),
        toWei('14', 'ether'),
      ]
      mockArray.forEach((item, index) => {
        it(`Buy via function ${index + 1}`, async () => {
          const previousAmount = await rpvContract.balanceOf(accounts[0])
          await rpvSaleContract.buyTokens(accounts[0], { from: accounts[0], value: item })
          const equal = (new BN(item).div(new BN(parameters.rptSaleRate))).mul(new BN('1000000000000000000'))
          const nextAmount = await rpvContract.balanceOf(accounts[0])
          assert.equal(nextAmount.toString(), previousAmount.add(equal).toString())
        })
      })
      mockArray.forEach((item, index) => {
        it(`Buy via sendTransaction ${index + 1}`, async () => {
          const previousAmount = await rpvContract.balanceOf(accounts[1])
          await rpvSaleContract.sendTransaction({ from: accounts[1], value: item })
          const equal = new BN(item).div(new BN(parameters.rptSaleRate)).mul(new BN('1000000000000000000'))
          const nextAmount = await rpvContract.balanceOf(accounts[1])
          assert.equal(nextAmount.toString(), previousAmount.add(equal).toString())
        })
      })
    })
    describe('Set functions', () => {
      it('Set new wallet: expect revert', async () => {
        expectRevert(rpvSaleContract.setWallet(accounts[1], { from: accounts[1] }), 'Ownable: caller is not the owner')
      })
      it('Set new wallet: expect revert', async () => {
        expectRevert(
          rpvSaleContract.setWallet(parameters.zeroAddress, { from: accounts[0] }),
          'RPTSale: wallet == address(0)'
        )
      })
      it('Set new wallet: successful', async () => {
        const { logs } = await rpvSaleContract.setWallet(accounts[6], { from: accounts[0] })
        const wallet = await rpvSaleContract.getWallet({ from: accounts[0] })
        expectEvent.inLogs(logs, 'SetWallet', { previous: parameters.rptSaleWallet, set: accounts[6] })
        assert.equal(wallet, accounts[6])
      })
      it('Set new rate: expect revert', async () => {
        expectRevert(
          rpvSaleContract.setRate(toWei('100', 'milli'), { from: accounts[1] }),
          'Ownable: caller is not the owner'
        )
      })
      it('Set new rate: expect revert', async () => {
        expectRevert(rpvSaleContract.setRate(0, { from: accounts[0] }), 'RPTSale: rate == 0')
      })
      it('Set new rate: successful', async () => {
        const { logs } = await rpvSaleContract.setRate(toWei('100', 'milli'), { from: accounts[0] })
        const rate = await rpvSaleContract.rate.call({ from: accounts[0] })
        expectEvent.inLogs(logs, 'SetRate', { previous: parameters.rptSaleRate, set: toWei('100', 'milli') })
        assert.equal(rate, toWei('100', 'milli'))
      })
      it('Set new token: expect revert', async () => {
        expectRevert(rpvSaleContract.setToken(accounts[6], { from: accounts[1] }), 'Ownable: caller is not the owner')
      })
      it('Set new token: expect revert', async () => {
        expectRevert(
          rpvSaleContract.setToken(parameters.zeroAddress, { from: accounts[0] }),
          'RPTSale: token == address(0)'
        )
      })
      it('Set new token: successful', async () => {
        const { logs } = await rpvSaleContract.setToken(accounts[5], { from: accounts[0] })
        const token = await rpvSaleContract.rpvToken.call()
        expectEvent.inLogs(logs, 'SetToken', { previous: rpvContract.address, set: token })
        assert.equal(token, accounts[5])
      })
    })
  })
})
