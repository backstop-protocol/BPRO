//const { artifacts } = require('hardhat');
const RLP = require('rlp');

const BPRO = artifacts.require("BPRO");
const Minter = artifacts.require("MockMiner");

const BravoImpl = artifacts.require("GovernorBravoDelegate");
const Bravo = artifacts.require("GovernorBravoDelegator");
const Timelock = artifacts.require("Timelock");

const Generic = artifacts.require("Generic")
const Generic2 = artifacts.require("Generic2")

const VoteMonitor = artifacts.require("VoteMonitor")
const Gnosis = artifacts.require("MultiSigWalletWithDailyLimit")

const Vault = artifacts.require("Vault")

let admin
let bpro;
let bravo;
let timelock;
let minter;
let compMerkle;
let makerMerkle;

let gnosis;
let bigGnosis;

let voteMonitor;

let reservoir = "0xcC09c04A9e3930343290184544F97669eFF18A8d"
let devPool = "0x225f27022a50aF2735287262a47bdacA2315a43E"
let userPool = "0x11B20aEF260837Cd82D3d8099aF46a2B6D66e20C"
let backstopPool = "0x63D7642F14f012063764BAc5aaB1CAF6c0771164"
let minterAddress = "0x20fe0eadbAfCA5458E129Bb3cCA303776165b371"


const timelockDelay = 2 * 24 * 60 * 60
const blocksPerDay = 4 * 60 * 24
const blocksPerYear = blocksPerDay * 365


const compoundWhales = ["0x3631401a11Ba7004d1311e24d177B05Ece39B4b3","0xeE8Ad6769fe89eCb8fee0D981ad709E08E6D1C06", "0x61C808D82A3Ac53231750daDc13c777b59310bD9", "0x86b0BE38A41eE669Fb2d8cb5854a3C89a0a2b8Fe"]
const makerWhale = ["0x6db544E2A4464762c4Df0876389C5357fA7A3A93"]
const makerCDP = [23]

const compoundExecAddress = "0xd3d2cE885BE9a4cE079423d40E4e5bbBDF2e7962"
const makerExecAddress = "0xaEd8E3b2441031971ECe303694dFB5e4dd8bcAED"

const compoundMigrateAddress = "0x762084f835aD6e3Ce98E7E0b744C5781FB4fB884"
const compoundJarConnecorAddress = "0xD24E557762589124D7cFeF90d870DF17C25bFf8a"
const registryAddress = "0xbF698dF5591CaF546a7E087f5806E216aFED666A"

const makerJarConnectorAddress = "0xf10Bb2Ca172249C715E4F9eE7776b2C8C31aaA69"
const makerMigrateAddress = "0xA30b9677A14ED10ecEb6BA87af73A27F51A17C89"
const cdpManagerAddress = "0x3f30c2381CD8B917Dd96EB2f1A4F96D91324BBed"

const protocolMultisigAddress = "0xF15aBf59A957aeA1D81fc77F2634a2F55dD3b280"


const yaron = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"
const victor = "0x8180a5CA4E3B94045e05A9313777955f7518D757"
const loi = "0x449bAf9413C60cd24a8C1c6010729c84B9D5139B"

contract("Full", accounts => {
    
    beforeEach(async () => {

    });

    it("set addresses", async () => {
        admin = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"
        bpro = await BPRO.at("0xbbBBBBB5AA847A2003fbC6b5C16DF0Bd1E725f61")
        const bravoImpl = await BravoImpl.at("0xA8A9F82b9C751114D892F3A415fBA3b1c6Db18A1")
        timelock = await Timelock.at("0xBbBbbbCeF7932c10A87Ce2D5D7d5e6612070199A")
        bravo = await Bravo.at("0xbbBBBb512661E9A574A8A3E8c12AfAf647E98809")

        minter = await Minter.at(minterAddress)
        voteMonitor = await VoteMonitor.at("0x1Beb4704492645325d9a14851018De2D39F3EB18")

        compMerkle = await Generic.at("0x20428d7F2a5F9024F2A148580f58e397c3718873")
        makerMerkle = await Generic.at("0x2FdA31aF983d36d521dc6DE0Fabc87777334DC6c")
        gnosis = await Gnosis.at("0xF15aBf59A957aeA1D81fc77F2634a2F55dD3b280")  
        bigGnosis = await Gnosis.at(devPool)      
    });

    it.skip("do more settings", async () => {    
        // this was still not done
        //console.log("minting 1m to monitor")
        //await bpro.mint(voteMonitor.address, web3.utils.toWei("1000000"), {from:admin})

        // set minter as minter
        await bpro.setMinter(minter.address, {from:admin})
    });
    it.skip("drip", async () => {    
        const currBlock = 12311517
        const blockFrom1YearAgo = 9942900

        const numBlocksToMint = currBlock - blockFrom1YearAgo
        await mineBlocks(numBlocksToMint / 100)

        await minter.dripReservoir()
        await minter.dripDev()        
        await minter.dripUser()        
        await minter.dripUser()        
        await minter.dripBackstop()
        
        const reservBal = await bpro.balanceOf(reservoir)
        const devBal = await bpro.balanceOf(devPool)
        const userBal = await bpro.balanceOf(userPool)
        const backstopBal = await bpro.balanceOf(backstopPool)

        const fromWei = web3.utils.fromWei
        const reserveBalNorm = Number(fromWei(reservBal))/1325000
        const devBalNorm = Number(fromWei(devBal))/825000
        const userBalNorm = Number(fromWei(userBal))/1e6
        const backstopBalNorm = Number(fromWei(backstopBal))/150000
        console.log(fromWei(reservBal), fromWei(devBal), fromWei(userBal), fromWei(backstopBal))
        console.log(reserveBalNorm, devBalNorm, userBalNorm, backstopBalNorm)        

        let bal

        await doBigMsigTransfer(accounts[3], "890")
        bal = await bpro.balanceOf(accounts[3])
        console.log({bal})
        assert.equal(bal.toString(),"890")        

        await doSmallMsigTransfer(userPool, accounts[0], 123)
        bal = await bpro.balanceOf(accounts[0])
        console.log({bal})
        assert.equal(bal.toString(),"123")

        await doSmallMsigTransfer(backstopPool, accounts[1], 234)
        bal = await bpro.balanceOf(accounts[1])
        console.log({bal})
        assert.equal(bal.toString(),"234")        

        await doSmallMsigTransfer(reservoir, accounts[2], 567)
        bal = await bpro.balanceOf(accounts[2])
        console.log({bal})
        assert.equal(bal.toString(),"567")
    });

    it("execute change minter after 4 years", async () => {
        const bproContract = new web3.eth.Contract(BPRO.abi)
        const newMinter = accounts[1]
        console.log({newMinter})
        const newMinterData = bproContract.methods.setMinter(newMinter).encodeABI()
        console.log({newMinterData})

        // mint just enough tokens to raise a proposal
        const proposer = accounts[5]
        await bpro.mint(proposer, web3.utils.toWei("2501"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("250001"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        await bpro.setMinter(minterAddress, {from: admin})

        await increaseTime(4 * 365 * 24 * 60 * 60)

        const sig = ""
        const data = newMinterData
        const target = minterAddress

        const bravoImplLike = await BravoImpl.at(bravo.address)
        await bravoImplLike.propose([target],[0],[sig],[data], "set new minter", {from:proposer})

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

        const newOwner = await bpro.minter()
        console.log({newOwner})

        assert.equal(newOwner, newMinter, "unexpcted new minter")

        console.log("minting some to acounts[7]")
        await bpro.mint(accounts[7], 101, {from: newMinter})
        const bal = await bpro.balanceOf(accounts[7])
        assert.equal(bal.toString(10), "101")
    });    
    
    // change minter address after 4 years via timelock V
    // withdraw from pool addresses V
    // check rate of progress V


});

async function doBigMsigTransfer(to, amount) {
    const bproContract = new web3.eth.Contract(BPRO.abi)
    const transferData = bproContract.methods.transfer(to, amount).encodeABI()
    
    // just to get the id    
    const id = await bigGnosis.submitTransaction.call(to,0,"0x", {from: yaron})

    const target = bpro.address
    const data = transferData

    await bigGnosis.submitTransaction(target, 0, data, {from:yaron})
    await bigGnosis.confirmTransaction(id, {from: victor})    
    await bigGnosis.confirmTransaction(id, {from: loi})        
}

async function doSmallMsigTransfer(from, to, amount) {
    // just to get the id    
    const id = await gnosis.submitTransaction.call(to,0,"0x", {from: yaron})

    const target = from
    const data = encodeTransfer(to, amount)

    await gnosis.submitTransaction(target, 0, data, {from:yaron})
    await gnosis.confirmTransaction(id, {from: victor})
}

function encodeTransfer(to, amount) {
    const bproContract = new web3.eth.Contract(BPRO.abi)
    const transferData = bproContract.methods.transfer(to, amount).encodeABI()

    const opContract = new web3.eth.Contract(Vault.abi)
    return opContract.methods.op(bpro.address, transferData, 0).encodeABI()
}

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
