// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;


import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


interface EACAggregatorProxy{
    function latestAnswer() external view returns (int);
}

contract MultiSigWallet {
using SafeERC20 for IERC20;

    address[] public owners;
    uint public transactionCount;
    uint public required;
    uint public ethPrice;
    uint public ethUsdBalance;
    IERC20 erc20Token;
    address public chainlinkETHUSDAddress;

    struct Transaction {
        address payable to;
        uint amount;
        bool executed;
        bytes data;
    }

    mapping(uint => Transaction) public transactions;
    mapping(uint => mapping(address => bool)) public confirmations;


    constructor(address[] memory _owners, uint _confirmations, address _chainlinkETHUSDAddress) {
        require(_owners.length > 0);
        require(_confirmations > 0);
        require(_confirmations <= _owners.length);
        owners = _owners;
        required = _confirmations;
        chainlinkETHUSDAddress = _chainlinkETHUSDAddress;
    }

    receive() payable external {
        
    }

    function checkBalance() public view returns(uint){
        return address(this).balance;
    }

    function isOwner(address addr) public view returns(bool) {
        for(uint i = 0; i < owners.length; i++) {
            if(owners[i] == addr) {
                return true;
            }
        }
        return false;
    }

     function getConfirmationsCount(uint transactionId) public view returns(uint) {
        uint count;
        for(uint i = 0; i < owners.length; i++) {
            if(confirmations[transactionId][owners[i]]) {
                count++;
            }
        }
        return count;
    }

    function isConfirmed(uint transactionId) public view returns(bool) {
        return getConfirmationsCount(transactionId) >= required;
    }

    function addTransaction(address payable to, uint amount, bytes memory data) public returns(uint) {
        transactions[transactionCount] = Transaction(to, amount, false, data);
        transactionCount += 1;
        return transactionCount - 1;
    }

    function submitTransaction(address payable to, uint amount, bytes memory data) external {
        require(isOwner(msg.sender));
        uint id = addTransaction(to, amount, data);
        confirmTransaction(id);
    }

     function confirmTransaction(uint transactionId) public {
        require(isOwner(msg.sender));
        confirmations[transactionId][msg.sender] = true;
        if(isConfirmed(transactionId)){
            executeTransaction(transactionId);
        }
    }

    function executeTransaction(uint transactionId) public {
        require(isConfirmed(transactionId));
        Transaction storage _tx = transactions[transactionId];
        (bool success, ) = _tx.to.call{ value: _tx.amount }(_tx.data);
        require(success);
        _tx.executed = true;
    }

     function updateEthPrice() public returns (uint) {
        int chainlinkEthPrice = EACAggregatorProxy(chainlinkETHUSDAddress).latestAnswer();
        ethPrice = uint(chainlinkEthPrice / 100000000);
        return ethPrice;
    }

    function getETHUSDBalance() public returns (uint) {
        uint ethBalance = address(this).balance;
        updateEthPrice();
        ethUsdBalance =  ethBalance * ethPrice / (10**18);
        return ethUsdBalance;
    }

    function handleERC20Token(address _tokenAddress) public {
        erc20Token = IERC20(_tokenAddress);
        require(erc20Token.balanceOf(address(this)) > 0, "No token with this address stored in the wallet");
    }

    function getERC20TokenBalance() public view returns (uint){
        return erc20Token.balanceOf(address(this));
    }

    function withdrawERC20Token(address to, uint amount) public {
        require(isOwner(msg.sender), "Only an owner can withdraw ERC20Tokens");
        erc20Token.safeTransfer(to, amount);
    } 

}
