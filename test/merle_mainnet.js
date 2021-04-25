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

let admin
let bpro;
let bravo;
let timelock;
let minter;
let compMerkle;
let makerMerkle;

let voteMonitor;

let reservoir = "0xcC09c04A9e3930343290184544F97669eFF18A8d"
let devPool = "0x225f27022a50aF2735287262a47bdacA2315a43E"
let userPool = "0x11B20aEF260837Cd82D3d8099aF46a2B6D66e20C"
let backstopPool = "0x63D7642F14f012063764BAc5aaB1CAF6c0771164"


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
const victor = "0xffF96a443aB8e8eFF4621c1Aa02Bbd90aD39DA57"

contract("Full", accounts => {
    
    beforeEach(async () => {

    });

    it("set addresses", async () => {
        admin = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"
        bpro = await BPRO.at("0xbbBBBBB5AA847A2003fbC6b5C16DF0Bd1E725f61")
        const bravoImpl = await BravoImpl.at("0xA8A9F82b9C751114D892F3A415fBA3b1c6Db18A1")
        timelock = await Timelock.at("0xBbBbbbCeF7932c10A87Ce2D5D7d5e6612070199A")
        bravo = await Bravo.at("0xbbBBBb512661E9A574A8A3E8c12AfAf647E98809")

        minter = await Minter.at("0x20fe0eadbAfCA5458E129Bb3cCA303776165b371")
        voteMonitor = await VoteMonitor.at("0x1Beb4704492645325d9a14851018De2D39F3EB18")

        compMerkle = await Generic.at("0x20428d7F2a5F9024F2A148580f58e397c3718873")
        makerMerkle = await Generic.at("0x2FdA31aF983d36d521dc6DE0Fabc87777334DC6c")
        
    });

    it("do more settings", async () => {    
        // this was still not done
        //console.log("minting 1m to monitor")
        //await bpro.mint(voteMonitor.address, web3.utils.toWei("1000000"), {from:admin})

        // set minter as minter
        await bpro.setMinter(minter.address, {from:admin})
    });

    /////////////////////// compound ///////////////////////////////////////////////////////////////////////

    it("vote out current compound admin", async () => {
        // propose a vote
        const compMigration = await Generic.at(compoundMigrateAddress)
        //console.log("propose")        
        //await compMigration.propose(compoundExecAddress)
        for(let i = 0 ; i < compoundWhales.length ; i++) {
            console.log("vote")            
            await compMigration.vote(0, {from: compoundWhales[i]})
        }
        console.log("queue")        
        await compMigration.queueProposal(0)
        await increaseTime(2 * 24 * 60 * 60)
        console.log("execute")        
        await compMigration.executeProposal(0)

        const registry = await Generic.at(registryAddress)
        const newOwner = await registry.owner()

        console.log({newOwner})

        assert.equal(newOwner, compoundExecAddress, "unexpected address")
    });

    /////////////////////////////////////// maker ///////////////////////////////////////////////////////////


    it("vote out current maker admin", async () => {
        // propose a vote
        const makerMigration = await Generic.at(makerMigrateAddress)

        for(let i = 0 ; i < makerWhale.length ; i++) {
            console.log("vote")
            const value = web3.utils.toWei("1")
            await web3.eth.sendTransaction({ from:accounts[0],to:makerWhale[i], value:value });
            const makerMigrationVote = await Generic2.at(makerMigrateAddress)
            await makerMigrationVote.vote(0, makerCDP[i], {from: makerWhale[i]})
        }
        console.log("queue")        
        await makerMigration.queueProposal(0)
        await increaseTime(48 * 24 * 60 * 60)
        console.log("execute")        
        await makerMigration.executeProposal(0)

        const man = await Generic.at(cdpManagerAddress)
        const newOwner = await man.owner()

        console.log({newOwner})

        assert.equal(newOwner, makerExecAddress, "unexpected address")
    });

    it("send to merkle", async () => {
        console.log("moving to maker")
        await voteMonitor.sendMaker()
        await voteMonitor.sendCompound()

        const qty = web3.utils.toWei("500000")

        const compBalance = await bpro.balanceOf(compMerkle.address)
        const makerBalance = await bpro.balanceOf(makerMerkle.address)

        assert.equal(compBalance.toString(), qty)
        assert.equal(makerBalance.toString(), qty)        
    });
        
    it("check makerDist", async () => {
        const fs = require('fs');
        const rawdata = fs.readFileSync('./scripts/maker_merkle.json');
        const compoundJson = JSON.parse(rawdata);
        /*
        const proof = ["0x52ecb392fc00e7756bf49ae9f764238e5d21a168f9efb93efff0b62e82ac75b5","0x03a4d246751a7597e49812b1eeb0c5d20346ffcf46a08c1356115776c57e196c","0x610b74ace8ee59dba1140f63608f9982df0b520384a6102720e33fab19d7b9ce","0xf61a5077481a53b61540d42b0ca874b724eba01efb2febeba8b1216d97d5bb01","0xb0543f7d24f078953e7a934843d1486902824b8b9fce914460b8e0866ac4b6d4","0x36f898fcd2cfe9b9735ecf159ed085760bd1efbbe445a0695c3b84f4bfb4f42f","0xf6585e59921f2bd12f1a9f9211abc36fae5650b2e3beaca46f7976af341929b4","0x08f8c1cb21c244cd85f7ceb6b465edccab0d1b8312cd5d17bb92af31c2f33cbb"]
        const amount = "0x173b89a5e83059acaa"
        const index = 2
        const user = "0x06218F8455F822E969BCE846cAf151E8a2A22DEA"

        await compoundDist.claim(index, user, amount, proof)
        assert.equal("0x"+(await bpro.balanceOf(user)).toString(16), amount, "unexpected balance")
*/
        const claims = compoundJson["claims"]
        for(const compUser in claims) {
            const proof = claims[compUser].proof
            const amount = claims[compUser].amount
            const index = claims[compUser].index

            console.log({compUser},{amount})

            await makerMerkle.claim(index, compUser, amount, proof)
            const realBalance = web3.utils.toBN(await bpro.balanceOf(compUser))
            const realAmount = web3.utils.toBN(amount)

            console.log({realAmount}, {realBalance})
            assert.equal(realBalance.toString(), realAmount.toString(), "unexpected balance")            
        }
        //function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
    });

    it("check compoundDist", async () => {
        const fs = require('fs');
        const rawdata = fs.readFileSync('./scripts/compound_merkle.json');
        const compoundJson = JSON.parse(rawdata);
        /*
        const proof = ["0x52ecb392fc00e7756bf49ae9f764238e5d21a168f9efb93efff0b62e82ac75b5","0x03a4d246751a7597e49812b1eeb0c5d20346ffcf46a08c1356115776c57e196c","0x610b74ace8ee59dba1140f63608f9982df0b520384a6102720e33fab19d7b9ce","0xf61a5077481a53b61540d42b0ca874b724eba01efb2febeba8b1216d97d5bb01","0xb0543f7d24f078953e7a934843d1486902824b8b9fce914460b8e0866ac4b6d4","0x36f898fcd2cfe9b9735ecf159ed085760bd1efbbe445a0695c3b84f4bfb4f42f","0xf6585e59921f2bd12f1a9f9211abc36fae5650b2e3beaca46f7976af341929b4","0x08f8c1cb21c244cd85f7ceb6b465edccab0d1b8312cd5d17bb92af31c2f33cbb"]
        const amount = "0x173b89a5e83059acaa"
        const index = 2
        const user = "0x06218F8455F822E969BCE846cAf151E8a2A22DEA"

        await compoundDist.claim(index, user, amount, proof)
        assert.equal("0x"+(await bpro.balanceOf(user)).toString(16), amount, "unexpected balance")
*/
        const claims = compoundJson["claims"]
        for(const compUser in claims) {
            const proof = claims[compUser].proof
            const amount = claims[compUser].amount
            const index = claims[compUser].index

            console.log({compUser},{amount})

            const balanceBefore = await bpro.balanceOf(compUser)
            await compMerkle.claim(index, compUser, amount, proof)
            const realBalance = web3.utils.toBN(await bpro.balanceOf(compUser)).sub(balanceBefore)
            const realAmount = web3.utils.toBN(amount)

            console.log({realAmount}, {realBalance})
            assert.equal(realBalance.toString(), realAmount.toString(), "unexpected balance")            
        }
        //function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
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
