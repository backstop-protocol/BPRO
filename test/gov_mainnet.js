const RLP = require('rlp');

const BPRO = artifacts.require("BPRO");
const Minter = artifacts.require("MockMiner");

const BravoImpl = artifacts.require("GovernorBravoDelegate");
const Bravo = artifacts.require("GovernorBravoDelegator");
const Timelock = artifacts.require("Timelock");
const VoteMonitor = artifacts.require("VoteMonitor")


let admin
let bpro;
let bravo;
let timelock;
let minter;

let reservoir
let devPool
let userPool
let backstopPool

let voteMonitor

const timelockDelay = 2 * 24 * 60 * 60
const blocksPerDay = 4 * 60 * 24
const blocksPerYear = blocksPerDay * 365

contract("Gov", accounts => {
    
    beforeEach(async () => {
        admin = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"
        bpro = await BPRO.at("0xbbBBBBB5AA847A2003fbC6b5C16DF0Bd1E725f61")
        const bravoImpl = await BravoImpl.at("0xA8A9F82b9C751114D892F3A415fBA3b1c6Db18A1")
        timelock = await Timelock.at("0xBbBbbbCeF7932c10A87Ce2D5D7d5e6612070199A")
        bravo = await Bravo.at("0xbbBBBb512661E9A574A8A3E8c12AfAf647E98809")

        reservoir = accounts[7]
        devPool = accounts[8]
        userPool = accounts[9]
        backstopPool = accounts[6]

        minter = await Minter.new(bpro.address, reservoir, devPool, userPool, backstopPool, {from: admin})
    });

    it("simple mint and transfer", async () => {
        assert.equal(await bpro.totalSupply(), "0", "total supply should be 0")
        await bpro.mint(accounts[2], 12345,{from: admin})
        assert.equal(await bpro.totalSupply(), "12345", "total supply should be 12345")
        assert.equal(await bpro.balanceOf(accounts[2]), "12345", "unexpected balance")
        await bpro.transfer(accounts[3], 2345, {from: accounts[2]})
        assert.equal(await bpro.balanceOf(accounts[2]), "10000", "unexpected balance")        
        assert.equal(await bpro.balanceOf(accounts[3]), "2345", "unexpected balance")
    });

    it("printer goes brr for 1 year", async () => {
        // transfer ownership to timelock
        //await minter.transferOwnership(timelock.address, {from: admin})
        //assert.equal(await minter.owner(), timelock.address, "unexpected owner")
        await bpro.setMinter(minter.address, {from: admin})

        await minter.fwdBlockNumber(blocksPerYear)
        await minter.dripReservoir()
        await minter.dripDev()
        await minter.dripUser()
        await minter.dripBackstop()        

        assertAlmostEq(await bpro.balanceOf(devPool), 825000)
        assertAlmostEq(await bpro.balanceOf(reservoir), 1325000)        
        assertAlmostEq(await bpro.balanceOf(backstopPool), 150000)
        assertAlmostEq(await bpro.balanceOf(userPool), 250000)
    });
    
    it("printer goes brr for 1 year in two parts", async () => {
        // transfer ownership to timelock
        //await minter.transferOwnership(timelock.address, {from: admin})
        //assert.equal(await minter.owner(), timelock.address, "unexpected owner")
        await bpro.setMinter(minter.address, {from: admin})

        await minter.fwdBlockNumber(blocksPerYear / 2)
        await minter.dripReservoir()
        await minter.dripDev()
        await minter.dripUser()
        await minter.dripBackstop()        

        assertAlmostEq(await bpro.balanceOf(devPool), 825000 / 2)
        assertAlmostEq(await bpro.balanceOf(reservoir), 1325000 / 2)        
        assertAlmostEq(await bpro.balanceOf(backstopPool), 150000 / 2)
        assertAlmostEq(await bpro.balanceOf(userPool), 250000)

        const newBackstop = accounts[4]
        minter.setBackstopPool(newBackstop, {from: admin})

        await minter.fwdBlockNumber(blocksPerYear / 2)
        await minter.dripReservoir()
        await minter.dripDev()
        //await minter.dripUser()
        await minter.dripBackstop()
        
        assertAlmostEq(await bpro.balanceOf(devPool), 825000)
        assertAlmostEq(await bpro.balanceOf(reservoir), 1325000)        
        assertAlmostEq(await bpro.balanceOf(backstopPool), 150000 / 2)
        assertAlmostEq(await bpro.balanceOf(newBackstop), 150000 / 2)        
        assertAlmostEq(await bpro.balanceOf(userPool), 250000)        
    });
    
    it("printer goes brr for 2 year", async () => {
        // transfer ownership to timelock
        //await minter.transferOwnership(timelock.address, {from: admin})
        //assert.equal(await minter.owner(), timelock.address, "unexpected owner")
        await bpro.setMinter(minter.address, {from: admin})

        await minter.fwdBlockNumber(blocksPerYear * 1)
        await minter.dripReservoir()
        await minter.dripDev()
        await minter.dripUser()
        await minter.dripBackstop()        

        assertAlmostEq(await bpro.balanceOf(devPool), 825000 * 1)
        assertAlmostEq(await bpro.balanceOf(reservoir), 1325000 * 1)        
        assertAlmostEq(await bpro.balanceOf(backstopPool), 150000)
        assertAlmostEq(await bpro.balanceOf(userPool), 250000)

        await minter.fwdBlockNumber(blocksPerYear * 1)

        const newReservior = accounts[3]
        const newDev = accounts[4]

        await increaseTime(365 * 24 * 60 * 60 + 100)
        await minter.setDevPool(newDev, {from: admin})
        await minter.setReservoir(newReservior, {from: admin})        

        await minter.dripReservoir()
        await minter.dripDev()

        assertAlmostEq(await bpro.balanceOf(devPool), 825000 * 1)
        assertAlmostEq(await bpro.balanceOf(reservoir), 1325000 * 1)        
        assertAlmostEq(await bpro.balanceOf(newDev), 825000 * 1)
        assertAlmostEq(await bpro.balanceOf(newReservior), 1325000 * 1)                
        assertAlmostEq(await bpro.balanceOf(backstopPool), 150000)
        assertAlmostEq(await bpro.balanceOf(userPool), 250000)        
    });    

    it("user pool", async () => {
        // transfer ownership to timelock
        //await minter.transferOwnership(timelock.address, {from: admin})
        //assert.equal(await minter.owner(), timelock.address, "unexpected owner")
        await bpro.setMinter(minter.address, {from: admin})

        const firstPeriod = parseInt((blocksPerYear / 4) * 1 / 10)
        const secondPeriod = parseInt((blocksPerYear / 4) * 9 / 10)

        await minter.fwdBlockNumber(firstPeriod)
        await minter.dripUser()

        assertAlmostEq(await bpro.balanceOf(userPool), 250000 / 10)

        const newUserPool = accounts[3]
        await minter.setUserPool(newUserPool, {from: admin})        

        await minter.fwdBlockNumber(secondPeriod)

        await minter.dripUser()

        assertAlmostEq(await bpro.balanceOf(userPool), 250000 / 10)
        assertAlmostEq(await bpro.balanceOf(newUserPool), 250000 * 9 / 10)
    });

    it("change minter", async () => {
        // transfer ownership to timelock
        //await minter.transferOwnership(timelock.address, {from: admin})
        //assert.equal(await minter.owner(), timelock.address, "unexpected owner")
        await bpro.setMinter(minter.address, {from: admin})
        await increaseTime(4 * 365 * 24 * 60 * 60 + 100)

        const newMinter = accounts[7]
        await minter.setMinter(newMinter, {from:admin})

        await bpro.mint(accounts[9], 1234, {from: newMinter})
        assert.equal(await bpro.balanceOf(accounts[9]), 1234, "unexpected mint balance")
    });    

    it("minter revert paths", async () => {
        await bpro.setMinter(minter.address, {from: admin})

        await increaseTime(365 * 24 * 60 * 60 / 2)

        await assertRevert(minter.setMinter(accounts[7], {from:admin}), "set minter")
        await assertRevert(minter.setDevPool(accounts[9], {from:admin}), "set dev pool")

        const notAdmin = accounts[9]
        await increaseTime(365 * 24 * 60 * 60 / 2 + 10)

        await assertRevert(minter.setMinter(accounts[7], {from:notAdmin}), "set minter")
        await assertRevert(minter.setDevPool(accounts[9], {from:notAdmin}), "set dev pool")

        await minter.fwdBlockNumber(blocksPerYear + 100)
        await minter.dripBackstop()
        await minter.dripUser()

        await assertRevert(minter.dripBackstop(), "drip backstop after finished")
        await assertRevert(minter.dripUser(), "drip dripUser after finished")        
    });

    it("execute simple proposal", async () => {
        // mint just enough tokens to raise a proposal
        const proposer = accounts[3]
        await bpro.mint(proposer, web3.utils.toWei("2501"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("250001"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        const sig = "_setPendingAdmin(address)"
        const data = "0x0000000000000000000000000000000000000000000000000000000000000123"
        const target = bravo.address

        const bravoImplLike = await BravoImpl.at(bravo.address)
        await bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:proposer})

        const propId = 1
        await mineBlocks(2 * blocksPerDay + 2)

        await bravoImplLike.castVote(propId, 1, {from: voter})

        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        await mineBlocks(3 * blocksPerDay)

        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        console.log("queue tx")
        await bravoImplLike.queue(propId, {from: admin})
        console.log(await bravoImplLike.proposals(propId))        
        console.log(await bravoImplLike.state(propId))

        console.log(await bravoImplLike.proposals(propId))

        console.log("fwd 2 days")
        await increaseTime(48 * 60 * 60 + 5)

        console.log("execute tx")
        await bravoImplLike.execute(propId, {from: admin})

        console.log(await bravoImplLike.pendingAdmin())
        assert.equal(await bravoImplLike.pendingAdmin(), "0x0000000000000000000000000000000000000123")
    });
    
    it("execute simple proposal 2", async () => {
        // mint just enough tokens to raise a proposal
        const proposer = accounts[3]
        await bpro.mint(proposer, web3.utils.toWei("2501"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("250001"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        const sig = "_setPendingAdmin(address)"
        const data = "0x0000000000000000000000000000000000000000000000000000000000000124"
        const target = bravo.address

        const bravoImplLike = await BravoImpl.at(bravo.address)
        await bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:proposer})

        const propId = 2
        await mineBlocks(2 * blocksPerDay + 2)

        await bravoImplLike.castVote(propId, 1, {from: voter})

        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        await mineBlocks(3 * blocksPerDay)

        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        console.log("queue tx")
        await bravoImplLike.queue(propId, {from: admin})
        console.log(await bravoImplLike.proposals(propId))        
        console.log(await bravoImplLike.state(propId))

        console.log(await bravoImplLike.proposals(propId))

        console.log("fwd 2 days")
        await increaseTime(48 * 60 * 60 + 5)

        console.log("execute tx")
        await bravoImplLike.execute(propId, {from: admin})

        console.log(await bravoImplLike.pendingAdmin())
        assert.equal(await bravoImplLike.pendingAdmin(), "0x0000000000000000000000000000000000000124")
    });    

    it.only("execute proposal sad paths", async () => {
        // mint just enough tokens to raise a proposal
        const proposer = accounts[3]
        await bpro.mint(proposer, web3.utils.toWei("2499"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("249999"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        const sig = "_setPendingAdmin(address)"
        const data = "0x0000000000000000000000000000000000000000000000000000000000000123"
        const target = bravo.address

        const bravoImplLike = await BravoImpl.at(bravo.address)
        assertRevert(bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:proposer}), "propose too small")
        await bpro.mint(proposer, web3.utils.toWei("2"), {from: admin})

        bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:proposer})
        bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:voter})

        const propId = 1
        await mineBlocks(2 * blocksPerDay - 100)

        await assertRevert(bravoImplLike.castVote(propId, 1, {from: voter}), "vote too early")

        await mineBlocks(100)

        await bravoImplLike.castVote(propId, 1, {from: voter})
        await bravoImplLike.castVote(propId + 1, 1, {from: voter})        

        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        await bravoImplLike.castVote(propId + 1, 1, {from: proposer})

        await mineBlocks(3 * blocksPerDay - 100)

        await assertRevert(bravoImplLike.queue(propId + 1, {from: admin}), "queue without 3 days delay")        

        await mineBlocks(100)        


        console.log(await bravoImplLike.proposals(propId))
        console.log(await web3.eth.getBlock("latest"))

        console.log("queue tx")
        await bravoImplLike.queue(propId + 1, {from: admin})        
        await assertRevert(bravoImplLike.queue(propId, {from: admin}), "queue without quarom")
    });


});

async function mineBlocks(num) {
    const promises = []
    for(let i = 0 ; i < num ; i++) {
        if(i % 1000 == 0) console.log(i, num)
        //promises.push(mineBlock())
        await mineBlock()
    }

    //await Promise.all(promises)
}

async function increaseTime (addSeconds) {
    const util = require('util')
    const providerSendAsync = util.promisify((getTestProvider()).send).bind(
      getTestProvider()
    )

    await providerSendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [addSeconds],
      id: 1
    })
  }
  
  async function mineBlock () {
    const util = require('util')
    const providerSendAsync = util.promisify((getTestProvider()).send).bind(
      getTestProvider()
    )
    await providerSendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: 1
    })
  }

  function getTestProvider () {
    //console.log(web3.currentProvider)
    return web3.currentProvider
  }
  

  function assertAlmostEq(bigNum, smallNum) {
      const _1e18 = new web3.utils.toBN(web3.utils.toWei("1"))
      const smallNumToBig = (new web3.utils.toBN(smallNum)).mul(_1e18)
      const numToCompare = bigNum.add(new web3.utils.toBN("97916800"))

      assert(bigNum.lt(smallNumToBig), "number to big " + smallNum.toString())
      assert(numToCompare.gt(smallNumToBig), "number to small")      
  }

  async function assertRevert(promise, msg) {
      try {
          await promise
          assert(false, msg + " should fail")
      }
      catch(error) {
        const PREFIX = "Returned error: VM Exception while processing transaction: ";
        assert(error.message.startsWith(PREFIX), "Expected an error starting with '" + PREFIX + "' but got '" + error.message + "' instead");

        console.log(error.message)
      }
  }
