// DO NOT USE IN PRODUCTION - FOR TESTING PURPOSES ONLY
pragma solidity ^0.5.16;


// initially deployer owns it, and then it moves it to the DAO
contract Generic {
    uint public x;
    // compound jar connector = address 0xD24E557762589124D7cFeF90d870DF17C25bFf8a
    function spin() external {
        x = 5;
    }

    // compound migrate = address 0x762084f835aD6e3Ce98E7E0b744C5781FB4fB884
    function propose(address newAddress) external {
        x = 7;
    }

    function vote(uint id) external {
        x = 11;
    }

    function queueProposal(uint id) external {
        x= 9;
    }

    function executeProposal(uint id) external {
        x= 911;
    }

    function owner() external pure returns(address) {

    }

    function score() external pure returns(address) {

    }

    function pool() external pure returns(address) {

    }    

    // msig
    function submitTransaction(address target, uint value, bytes calldata data) external {
        x = 11;
    }

    function confirmTransaction(uint id) external {
        x = 99;
    }

    // admin
    function setScore(address a) external {
        x = x++;
    }

    function setPool(address a) external {
        x = x++;
    }    

    // exec
    function doTransferAdmin(address a) external {
        x = 123;
    }

    // jar
    function getGlobalScore() external view returns(uint) {
        return 5;
    }

    function getUserScore(address user) external view returns(uint) {
        return 6;
    }

    // registry
    function avatarList() external view returns(address[] memory) {
        //return [];
    }

    function ownerOf(address avatar) external view returns(address) {
        return address(0x0);
    }

    // cdpi
    function cdpi() external view returns(uint) {
        return 8;
    }

    function owns(uint cdp) external view returns(address) {
        return address(0);
    }

    // dsproxy
    /*
    function owner() external view returns(address) {
        return address(0);
    }*/

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external {
        x = 923;
    }
}

contract Generic2 {
    function vote(uint proposalId, uint cdp) external {

    }

    function getUserScore(bytes32 cdp) external view returns(uint) {
        return 6;
    }    
}

