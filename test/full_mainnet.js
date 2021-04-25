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
        admin = "0xf7D44D5a28d5AF27a7F9c8fc6eFe0129e554d7c4"
        bpro = await BPRO.at("0xbbBBBBB5AA847A2003fbC6b5C16DF0Bd1E725f61")
        const bravoImpl = await BravoImpl.at("0xA8A9F82b9C751114D892F3A415fBA3b1c6Db18A1")
        timelock = await Timelock.at("0xBbBbbbCeF7932c10A87Ce2D5D7d5e6612070199A")
        bravo = await Bravo.at("0xbbBBBb512661E9A574A8A3E8c12AfAf647E98809")

        minter = await Minter.at("0x20fe0eadbAfCA5458E129Bb3cCA303776165b371")
        voteMonitor = await VoteMonitor.at("0x1Beb4704492645325d9a14851018De2D39F3EB18")
    });

    /////////////////////// compound ///////////////////////////////////////////////////////////////////////

    it("vote out current compound admin", async () => {
        //voteMonitor = await VoteMonitor.new()        
/*        await increaseTime(4.5 * 60 * 60)
        const compJarConnector = await Generic.at(compoundJarConnecorAddress)
        //console.log({compJarConnector})
        console.log("spining")
        await compJarConnector.spin()
*/
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

    it("change admin of b.compound", async () => {
        const execContract = new web3.eth.Contract(Generic.abi)
        const newScore = accounts[0]
        console.log({newScore})
        const setScoreData = execContract.methods.setScore(newScore).encodeABI()
        const msig = await Generic.at(protocolMultisigAddress)
        
        console.log("init score change")
        await msig.submitTransaction(compoundExecAddress, 0, setScoreData, {from: yaron})
        console.log("confirm score change")
        await msig.confirmTransaction(3, {from: victor})

        const registry = await Generic.at(registryAddress)        
        const score = await registry.score()
        console.log({score})
        assert.equal(newScore, score, "unexpected score")
    });    

    it("execute simple proposal", async () => {
        const execContract = new web3.eth.Contract(Generic.abi)
        const newGov = accounts[1]
        console.log({newGov})
        const newGovData = execContract.methods.doTransferAdmin(newGov).encodeABI()
        console.log({newGovData})

        // mint just enough tokens to raise a proposal
        const proposer = accounts[5]
        await bpro.mint(proposer, web3.utils.toWei("2501"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("250001"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        const sig = ""
        const data = newGovData
        const target = compoundExecAddress

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

        const registry = await Generic.at(registryAddress)
        const newOwner = await registry.owner()
        console.log({newOwner})

        assert.equal(newOwner, newGov, "unexpcted new owner")
    });

    /////////////////////////////////////// maker ///////////////////////////////////////////////////////////

    it("send to merkle and fail", async () => {
        const compMerkle = "0x20428d7F2a5F9024F2A148580f58e397c3718873"
        const makerMerkle = "0x2FdA31aF983d36d521dc6DE0Fabc87777334DC6c"

        console.log("minting 1m to monitor")
        await bpro.mint(voteMonitor.address, web3.utils.toWei("1000000"), {from:admin})

        console.log("moving to maker should fail")
        await assertRevert(voteMonitor.sendMaker(), "send maker")
        console.log("ZZZ", await voteMonitor.softGrace(), await voteMonitor.makerApproved(), await voteMonitor.compoundApproved())
        await assertRevert(voteMonitor.sendCompound(), "send compound because maker wasn't approve")

        await increaseTime(14 * 24 * 60 * 60)

        console.log("moving to compound")
        await voteMonitor.sendCompound()

        console.log("YYY", await voteMonitor.sentCompound())        

        assert.equal((await bpro.balanceOf(compMerkle)).toString(), web3.utils.toWei("500000"))
    });

    it("vote out current maker admin", async () => {
/*        await increaseTime(4.5 * 60 * 60)
        const makerJarConnector = await Generic.at(makerJarConnectorAddress)
        //console.log({compJarConnector})
        console.log("spining")
        await makerJarConnector.spin()
*/
        // propose a vote
        const makerMigration = await Generic.at(makerMigrateAddress)
        //console.log("propose")        
        //await makerMigration.propose(makerExecAddress)

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
        const compMerkle = "0x20428d7F2a5F9024F2A148580f58e397c3718873"
        const makerMerkle = "0x2FdA31aF983d36d521dc6DE0Fabc87777334DC6c"

        console.log("minting 1m to monitor")
        await bpro.mint(voteMonitor.address, web3.utils.toWei("1000000"), {from:admin})

        console.log("moving to maker")
        await voteMonitor.sendMaker()
        await assertRevert(voteMonitor.sendMaker(), "send twice to maker")

        console.log("moving to compound")
        console.log("XXX", await voteMonitor.sentCompound())
        await assertRevert(voteMonitor.sendCompound(), "send twice to compound")

        const compBalance = await bpro.balanceOf(compMerkle)
        const makerBalance = await bpro.balanceOf(makerMerkle)

        console.log({compBalance})
        console.log({makerBalance})

        const qty = web3.utils.toWei("500000")
        assert.equal(compBalance.toString(), qty)
        assert.equal(makerBalance.toString(), qty)        
    });    

    it("change admin of b.maker", async () => {
        const execContract = new web3.eth.Contract(Generic.abi)
        const newPool = accounts[0]
        console.log({newPool})
        const setSpoolData = execContract.methods.setPool(newPool).encodeABI()
        const msig = await Generic.at(protocolMultisigAddress)
        
        console.log("init score change")
        await msig.submitTransaction(makerExecAddress, 0, setSpoolData, {from: yaron})
        console.log("confirm score change")
        await msig.confirmTransaction(3, {from: victor})

        const man = await Generic.at(cdpManagerAddress)        
        const pool = await man.pool()
        console.log({pool})
        assert.equal(newPool, pool, "unexpected score")
    });        

    it("execute maker switch owner proposal", async () => {
        const execContract = new web3.eth.Contract(Generic.abi)
        const newGov = accounts[1]
        console.log({newGov})
        const newGovData = execContract.methods.doTransferAdmin(newGov).encodeABI()
        console.log({newGovData})

        // mint just enough tokens to raise a proposal
        const proposer = accounts[5]
        await bpro.mint(proposer, web3.utils.toWei("2501"), {from: admin})
        // delegate to self
        await bpro.delegate(proposer, {from:proposer})

        const voter = accounts[4]
        await bpro.mint(voter, web3.utils.toWei("250001"), {from: admin})
        // delegate to self
        await bpro.delegate(voter, {from:voter})

        const sig = ""
        const data = newGovData
        const target = makerExecAddress

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

        const man = await Generic.at(cdpManagerAddress)
        const newOwner = await man.owner()
        console.log({newOwner})

        assert.equal(newOwner, newGov, "unexpcted new owner")
    });    

    /////////////////////////////////////////////////////////////////////////////////////////////////////////    

    it.skip("calc score compound", async () => {
        const jarConnector = await Generic.at(compoundJarConnecorAddress)
        const registry = await Generic.at(registryAddress)
        const avatars = await registry.avatarList()

        const json = {}
        let i = 0
        let totalScore = new web3.utils.toBN("0")
        const userScores = []
        const userAddresses = []
        const Web3 = require("web3")
        const web2 = new Web3("https://mainnet.infura.io/v3/58073b4a32df4105906c702f167b91d2")
        console.log("new contract")
        const jarConnectorContract = new web2.eth.Contract(Generic.abi, compoundJarConnecorAddress)
        console.log("get global score")
        const globalScore = await jarConnectorContract.methods.getGlobalScore().call(12304550)
        console.log({globalScore})

        for(const av of avatars) {
            const user = await registry.ownerOf(av)
            console.log({user})
            const userScoreRes = await jarConnectorContract.methods.getUserScore(user).call(12304550)
            //const userScoreRes = await jarConnector.getUserScore(user)
            console.log({userScoreRes})

            totalScore = totalScore.add(web3.utils.toBN(userScoreRes))

            userAddresses.push(user)
            userScores.push(web3.utils.toBN(userScoreRes))
            console.log(++i)                    
        }

        for(i = 0 ; i < userScores.length ; i++) {
            const compoundTokens = web3.utils.toBN(web3.utils.toWei("500000"))
            console.log(userScores[i], {totalScore})
            const tokenAllocation = compoundTokens.mul(userScores[i]).div(totalScore)
            //console.log({tokenAllocation})
    
            json[userAddresses[i]] = tokenAllocation.toString(16)    
        }


        console.log({totalScore}, {globalScore})

        console.log(JSON.stringify(json, null, 4));
    });
    
    /////////////////////////////////////////////////////////////////////////////////////////////////////////    

    it.skip("calc score maker", async () => {
        const jarConnector = await Generic.at("0xf10Bb2Ca172249C715E4F9eE7776b2C8C31aaA69")
        const jarConnectorUser = await Generic2.at("0xf10Bb2Ca172249C715E4F9eE7776b2C8C31aaA69")
        const man = await Generic.at(cdpManagerAddress)

        const cdpi = await man.cdpi()

        const globalScore = await jarConnector.getGlobalScore()
        console.log({globalScore})
        const json = {}
        const user0 = await man.owns(1)
        let expectedCode = await web3.eth.getCode(user0)
        let isDiff = false
        for(let i = 1 ; i <= cdpi ; i++) {
            const user = await man.owns(i)
            console.log({user})
            const cdpHex = i.toString(16)
            const paddingZeros = "0x" + "0".repeat(64 - cdpHex.length)
            const cdpBytes32 = paddingZeros + cdpHex
            console.log(cdpBytes32)
            const userScoreRes = await jarConnectorUser.getUserScore(cdpBytes32)
            console.log({userScoreRes})
            const userCode = await web3.eth.getCode(user)
            console.log(userCode === expectedCode)
            if(userCode !== expectedCode) {
                console.log("diff user", {user})
                df
                isDiff = true;
            }

            const proxy = await Generic.at(user)
            const realUser = await proxy.owner()

            if(realUser.toLowerCase() == "0x9654DdA28c96fE9E28b93542C3C9A68f59f7f766".toLowerCase()) {
                console.log("OOO", proxy.address)
                //sd
            }

            const makerTokens = web3.utils.toBN(web3.utils.toWei("500000"))
            const tokenAllocation = makerTokens.mul(userScoreRes).div(globalScore)
            console.log({tokenAllocation})

            if(realUser in json) console.log("already in XXX")
            if(tokenAllocation.toString(10) !== "0") json[realUser] = tokenAllocation.toString(16)
            console.log(i)
        }

        console.log({isDiff})

        console.log(JSON.stringify(json, null, 4));
    });    

    /////////////////////////////////////////////////////////////////////////////////////////////////////////    

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

    it("execute proposal sad paths", async () => {
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
        await assertRevert(bravoImplLike.propose([target],[0],[sig],[data], "set pending admin", {from:proposer}), "propose too small")
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
