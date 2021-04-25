pragma solidity ^0.5.16;

//import "./BPRO.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

contract BPROLike {
    function mint(address to, uint qty) external;
    function setMinter(address newMinter) external;
}

// initially deployer owns it, and then it moves it to the DAO
contract BPROMinter is Ownable {
    address public reservoir;
    address public devPool;
    address public userPool;
    address public backstopPool;
    address public genesisPool;

    uint public deploymentBlock;
    uint public deploymentTime;
    mapping(bytes32 => uint) lastDripBlock;

    BPROLike public bpro;

    uint constant BLOCKS_PER_YEAR = 45 * 60 * 24 * 365 / 10; // 4.5 blocks per minute
    uint constant BLOCKS_PER_MONTH = (BLOCKS_PER_YEAR / 12);

    uint constant YEAR = 365 days;

    event MinterSet(address newMinter);
    event DevPoolSet(address newPool);
    event BackstopPoolSet(address newPool);
    event UserPoolSet(address newPool);
    event ReservoirSet(address newPool);

    constructor(BPROLike _bpro, address _reservoir, address _devPool, address _userPool, address _backstopPool) public {
        reservoir = _reservoir;
        devPool = _devPool;

        userPool = _userPool;
        backstopPool = _backstopPool;

        deploymentBlock = getBlockNumber();
        deploymentTime = now;

        bpro = _bpro;

        // this will be pre minted before ownership transfer
        //bpro.mint(_genesisMakerPool, 500_000e18);
        //bpro.mint(_genesisCompoundPool, 500_000e18);        
    }

    function dripReservoir() external {
        drip(reservoir, "reservoir", 1_325_000e18 / BLOCKS_PER_YEAR, uint(-1));
    }

    function dripDev() external {
        drip(devPool, "devPool", 825_000e18 / BLOCKS_PER_YEAR, uint(-1));
    }

    function dripUser() external {
        uint dripPerMonth = 250_000e18 / uint(3);

        drip(userPool, "dripUser", dripPerMonth / BLOCKS_PER_MONTH, deploymentBlock + BLOCKS_PER_MONTH * 3);
    }

    function dripBackstop() external {
        drip(backstopPool, "dripBackstop", 150_000e18 / BLOCKS_PER_YEAR, deploymentBlock + BLOCKS_PER_YEAR);
    }

    function setMinter(address newMinter) external onlyOwner {
        require(now > deploymentTime + 4 * YEAR, "setMinter: wait-4-years");
        bpro.setMinter(newMinter);

        emit MinterSet(newMinter);
    }

    function setDevPool(address newPool) external onlyOwner {
        require(now > deploymentTime + YEAR, "setDevPool: wait-1-years");
        devPool = newPool;

        emit DevPoolSet(newPool);
    }

    function setBackstopPool(address newPool) external onlyOwner {
        backstopPool = newPool;

        emit BackstopPoolSet(newPool);
    }

    function setUserPool(address newPool) external onlyOwner {
        userPool = newPool;

        emit UserPoolSet(newPool);
    }

    function setReservoir(address newPool) external onlyOwner {
        reservoir = newPool;

        emit ReservoirSet(newPool);
    }

    function drip(address target, bytes32 targetName, uint dripRate, uint finalDripBlock) internal {
        uint prevDripBlock = lastDripBlock[targetName];
        if(prevDripBlock == 0) prevDripBlock = deploymentBlock;

        uint currBlock = getBlockNumber();
        if(currBlock > finalDripBlock) currBlock = finalDripBlock;

        require(currBlock > prevDripBlock, "drip: bad-block");

        uint deltaBlock = currBlock - prevDripBlock;
        lastDripBlock[targetName] = currBlock;

        uint mintAmount = deltaBlock * dripRate;
        bpro.mint(target, mintAmount);
    }

    function getBlockNumber() public view returns(uint) {
        return block.number;
    }
}

contract MockMiner is BPROMinter {
    uint blockNumber;

    constructor(BPROLike _bpro, address _reservoir, address _devPool, address _userPool, address _backstopPool) public 
        BPROMinter(_bpro,_reservoir,_devPool,_userPool,_backstopPool)
    {
        blockNumber = block.number;
    }

    function fwdBlockNumber(uint delta) public {
        blockNumber += delta;
    }

    function getBlockNumber() public view returns(uint) {
        if(blockNumber == 0) return block.number;

        return blockNumber;
    }
}