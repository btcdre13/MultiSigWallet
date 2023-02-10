const hre = require("hardhat");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet contract", function () {
  let MultiSig;
  let wallet;
  let owner1;
  let owner2;
  let owner3;
  let addr1;
  let Token;
  let token;

  

  beforeEach(async function () {

    MultiSig = await ethers.getContractFactory("MultiSigWallet");

    [owner1, owner2, owner3, addr1] = await hre.ethers.getSigners();
    
    wallet = await MultiSig.deploy([owner1.address, owner2.address, owner3.address], 3, "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e");

    await wallet.deployed();

    // sample ERC20 Token to test ERC20 specific functions
    Token = await ethers.getContractFactory("TestToken");
    token = await Token.deploy();
    await token.deployed();

    
  });

  describe("Deployment", function () {
    
    it("should set the right owners", async function () {
      expect(await wallet.isOwner(owner1.address)).to.be.true;
      expect(await wallet.isOwner(owner2.address)).to.be.true;
      expect(await wallet.isOwner(owner3.address)).to.be.true;
      expect(await wallet.isOwner(addr1.address)).to.be.false; 
    });   
    });
    describe("Transactions", function () {
      it("should accept funds", async function () {
        await owner1.sendTransaction({to: wallet.address, value: 1000});
        expect(await wallet.checkBalance()).to.equal(1000);
      });

      it("gives a txid after addtransaction", async function(){
        await wallet.addTransaction(addr1.address, 1000, "0x");
        expect(await wallet.transactionCount()).to.equal(1);
      });

      it("let's another owner confirm the tx", async function(){
        await wallet.addTransaction(addr1.address, 1000, "0x");
        await wallet.connect(owner2).confirmTransaction(0);
        expect(await wallet.getConfirmationsCount(0)).to.equal(1);
      });

      it("confirms a transaction when using the submit transaction function", async function() {
        await wallet.submitTransaction(addr1.address, 1000, "0x");
        expect(await wallet.getConfirmationsCount(0)).to.equal(1);
      });

      it("sends a transaction after reaching the confirmation threshold", async function(){
        await owner1.sendTransaction({to: wallet.address, value: 1000});
        await wallet.submitTransaction(addr1.address, 500, "0x");
        await wallet.connect(owner2).confirmTransaction(0);
        await wallet.connect(owner3).confirmTransaction(0);
        expect(await wallet.checkBalance()).to.equal(500);
      });

      it("shows the correct confirmation count on transactions", async function(){
        await wallet.submitTransaction(addr1.address, 500, "0x");
        await wallet.connect(owner2).confirmTransaction(0);
        expect(await wallet.getConfirmationsCount(0)).to.equal(2);
      });

      it("isConfirmed function shows correct output", async function(){
        await wallet.submitTransaction(addr1.address, 500, "0x");
        await wallet.connect(owner2).confirmTransaction(0);
        expect(await wallet.isConfirmed(0)).to.equal(false);
      });
    });

    describe("handling ERC20Tokens", function(){
      it("should return the wallet's correct ERC20Token balance", async function(){
        await token.transfer(wallet.address, 10000000);
        await wallet.handleERC20Token(token.address);
        expect(await wallet.getERC20TokenBalance()).to.equal(10000000);
        });

        it("should fail if there is no token at the given address", async function(){
          await expect(wallet.handleERC20Token(token.address)).to.be.revertedWith("No token with this address stored in the wallet");
        });

      it("should let an owner transfer the ERC20Tokens out", async function(){
        await token.transfer(wallet.address, 10000000);
        await wallet.handleERC20Token(token.address);
        expect(await wallet.connect(owner3).withdrawERC20Token(owner3.address, 10000000)).to.be.ok;
        expect(await token.balanceOf(owner3.address)).to.equal(10000000);
        expect(await token.balanceOf(wallet.address)).to.equal(0);
      });
      
      it("should fail if someone else is trying to withdraw ERC20Tokens", async function(){
        await token.transfer(wallet.address, 10000000);
        await wallet.handleERC20Token(token.address);
        await expect(wallet.connect(addr1).withdrawERC20Token(addr1.address, 10000000)).to.be.revertedWith("Only an owner can withdraw ERC20Tokens");
      });
    });
  })

    
  
