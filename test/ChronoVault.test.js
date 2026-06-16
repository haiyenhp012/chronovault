const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ChronoVault", function () {
  let vault, token, owner, alice, bob;
  const AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("Mock", "MCK", 18);

    const Vault = await ethers.getContractFactory("ChronoVault");
    vault = await Vault.deploy();

    await token.mint(owner.address, AMOUNT);
    await token.approve(await vault.getAddress(), AMOUNT);
  });

  async function lockNow(cliffOffset, endOffset, recipient = alice.address) {
    const start = await time.latest();
    return vault.lock(
      await token.getAddress(),
      AMOUNT,
      recipient,
      start,
      start + cliffOffset,
      start + endOffset
    );
  }

  describe("lock", function () {
    it("mints an NFT to the recipient and stores the lock", async function () {
      await lockNow(0, 1000);
      expect(await vault.ownerOf(1)).to.equal(alice.address);
      expect(await token.balanceOf(await vault.getAddress())).to.equal(AMOUNT);

      const l = await vault.getLock(1);
      expect(l.token).to.equal(await token.getAddress());
      expect(l.amount).to.equal(AMOUNT);
      expect(l.claimed).to.equal(0);
    });

    it("emits Locked", async function () {
      await expect(lockNow(0, 1000))
        .to.emit(vault, "Locked");
    });

    it("increments token ids", async function () {
      await lockNow(0, 1000);
      await token.mint(owner.address, AMOUNT);
      await token.approve(await vault.getAddress(), AMOUNT);
      await lockNow(0, 1000, bob.address);
      expect(await vault.ownerOf(2)).to.equal(bob.address);
    });

    it("reverts on zero amount", async function () {
      const start = await time.latest();
      await expect(
        vault.lock(await token.getAddress(), 0, alice.address, start, start, start + 1000)
      ).to.be.revertedWith("amount=0");
    });

    it("reverts when end <= cliff", async function () {
      const start = await time.latest();
      await expect(
        vault.lock(await token.getAddress(), AMOUNT, alice.address, start, start + 100, start + 100)
      ).to.be.revertedWith("end<=cliff");
    });

    it("reverts when cliff < start", async function () {
      const start = await time.latest();
      await expect(
        vault.lock(await token.getAddress(), AMOUNT, alice.address, start + 100, start, start + 1000)
      ).to.be.revertedWith("cliff<start");
    });
  });

  describe("vesting", function () {
    it("nothing claimable before cliff", async function () {
      await lockNow(500, 1000);
      expect(await vault.claimable(1)).to.equal(0);
    });

    it("linear vesting after cliff", async function () {
      await lockNow(0, 1000);
      await time.increase(500);
      const claimable = await vault.claimable(1);
      // ~50% vested, allow small drift for the mining timestamp
      expect(claimable).to.be.closeTo(AMOUNT / 2n, ethers.parseEther("5"));
    });

    it("fully vested after end", async function () {
      await lockNow(0, 1000);
      await time.increase(1001);
      expect(await vault.vestedAmount(1)).to.equal(AMOUNT);
    });
  });

  describe("claim", function () {
    it("only the NFT holder can claim", async function () {
      await lockNow(0, 1000);
      await time.increase(1001);
      await expect(vault.connect(bob).claim(1)).to.be.revertedWith("not holder");
    });

    it("transfers vested tokens to the holder", async function () {
      await lockNow(0, 1000);
      await time.increase(1001);
      await vault.connect(alice).claim(1);
      expect(await token.balanceOf(alice.address)).to.equal(AMOUNT);
    });

    it("burns the position once fully claimed", async function () {
      await lockNow(0, 1000);
      await time.increase(1001);
      await vault.connect(alice).claim(1);
      await expect(vault.ownerOf(1)).to.be.reverted;
    });

    it("supports partial claims across time", async function () {
      await lockNow(0, 1000);
      await time.increase(500);
      await vault.connect(alice).claim(1);
      const firstBal = await token.balanceOf(alice.address);
      expect(firstBal).to.be.gt(0);

      await time.increase(1000);
      await vault.connect(alice).claim(1);
      expect(await token.balanceOf(alice.address)).to.equal(AMOUNT);
    });

    it("reverts when nothing to claim", async function () {
      await lockNow(500, 1000);
      await expect(vault.connect(alice).claim(1)).to.be.revertedWith("nothing to claim");
    });
  });

  describe("transferable position", function () {
    it("new holder can claim after NFT transfer", async function () {
      await lockNow(0, 1000);
      await vault.connect(alice).transferFrom(alice.address, bob.address, 1);
      await time.increase(1001);
      await vault.connect(bob).claim(1);
      expect(await token.balanceOf(bob.address)).to.equal(AMOUNT);
      expect(await token.balanceOf(alice.address)).to.equal(0);
    });
  });

  describe("native OPN locking", function () {
    const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const NATIVE_AMOUNT = ethers.parseEther("3");

    async function lockNativeNow(cliffOffset, endOffset, recipient = alice.address) {
      const start = await time.latest();
      return vault.lockNative(
        recipient,
        start,
        start + cliffOffset,
        start + endOffset,
        { value: NATIVE_AMOUNT }
      );
    }

    it("locks native coin and records the NATIVE sentinel", async function () {
      await lockNativeNow(0, 1000);
      expect(await vault.ownerOf(1)).to.equal(alice.address);
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(NATIVE_AMOUNT);

      const l = await vault.getLock(1);
      expect(l.token).to.equal(NATIVE);
      expect(l.amount).to.equal(NATIVE_AMOUNT);
    });

    it("reverts on zero value", async function () {
      const start = await time.latest();
      await expect(
        vault.lockNative(alice.address, start, start, start + 1000, { value: 0 })
      ).to.be.revertedWith("amount=0");
    });

    it("rejects the NATIVE sentinel through the ERC20 lock path", async function () {
      const start = await time.latest();
      await expect(
        vault.lock(NATIVE, NATIVE_AMOUNT, alice.address, start, start, start + 1000)
      ).to.be.revertedWith("use lockNative");
    });

    it("pays out vested native coin to the holder on claim", async function () {
      await lockNativeNow(0, 1000);
      await time.increase(1001);

      const before = await ethers.provider.getBalance(bob.address);
      // transfer the NFT to bob so we measure a clean balance delta (alice pays gas)
      await vault.connect(alice).transferFrom(alice.address, bob.address, 1);
      const tx = await vault.connect(bob).claim(1);
      const rcpt = await tx.wait();
      const gas = rcpt.gasUsed * rcpt.gasPrice;
      const after = await ethers.provider.getBalance(bob.address);

      expect(after - before + gas).to.equal(NATIVE_AMOUNT);
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0);
    });

    it("supports partial native claims and burns when fully vested", async function () {
      await lockNativeNow(0, 1000);
      await time.increase(500);
      await vault.connect(alice).claim(1);
      await time.increase(1000);
      await vault.connect(alice).claim(1);
      await expect(vault.ownerOf(1)).to.be.reverted;
      expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(0);
    });
  });
});
