pragma solidity ^0.5.16;

import "@openzeppelin/contracts/ownership/Ownable.sol";

// initially deployer owns it, and then it moves it to the DAO
contract Vault is Ownable {
    constructor(address owner) public {
        transferOwnership(owner);
    }

    function op(address payable target, bytes calldata data, uint ethValue) onlyOwner external payable {
        target.call.value(ethValue)(data);
    }
    function() payable external {}
}

