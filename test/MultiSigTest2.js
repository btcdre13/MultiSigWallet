const hre = require("hardhat");
const { ethers } = require("hardhat");
const { expect } = require("chai");


describe("MultiSigWallet contract", function () {
    let MultiSig;
    let wallet;
    let owner1;
    let owner2;
    let owner3;
  
    beforeEach(async function () {
      MultiSig = await ethers.getContractFactory("MultiSigWallet");
  
      
      [owner1, owner2, owner3] = await hre.ethers.getSigners();
  
        //address[0-2] from hardhat node (goerli fork), 3 confirmation minimum and chainlinkETHUSDAddress for Goerli network
        wallet = await MultiSig.deploy(["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"], 3, "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e");
      
      await wallet.deployed();

    });

    describe("fetching live data from chainlink", function () {
        it("should update the EthPrice when the function is called", async function(){
            expect(await wallet.ethPrice()).to.equal(0);
            await wallet.updateEthPrice();
            expect(await wallet.ethPrice()).to.be.greaterThan(1000);
        });

        it("should show the correct ETHBalance in USD", async function(){
            expect(await wallet.ethUsdBalance()).to.equal(0);
            await owner1.sendTransaction({to: wallet.address, value: ethers.utils.parseEther("0.05")});
            await wallet.getETHUSDBalance();
            expect(await wallet.ethUsdBalance()).to.be.greaterThan(50);
        });
    });
    });
