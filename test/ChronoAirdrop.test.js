const { expect } = require("chai");
const { ethers } = require("hardhat");
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");

describe("ChronoToken + ChronoAirdrop", function () {
  let token, airdrop, tree;
  let deployer, alice, bob, carol, outsider;

  const SUPPLY = ethers.parseUnits("1000000", 18);
  const A = ethers.parseUnits("1000", 18);
  const B = ethers.parseUnits("750", 18);
  const C = ethers.parseUnits("500", 18);

  beforeEach(async function () {
    [deployer, alice, bob, carol, outsider] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("ChronoToken");
    token = await Token.deploy(SUPPLY, deployer.address);
    await token.waitForDeployment();

    const values = [
      [alice.address, A.toString()],
      [bob.address, B.toString()],
      [carol.address, C.toString()],
    ];
    tree = StandardMerkleTree.of(values, ["address", "uint256"]);

    const Airdrop = await ethers.getContractFactory("ChronoAirdrop");
    airdrop = await Airdrop.deploy(await token.getAddress(), tree.root);
    await airdrop.waitForDeployment();

    // Fund the airdrop contract.
    await token.transfer(await airdrop.getAddress(), A + B + C);
  });

  function proofFor(addr) {
    for (const [i, v] of tree.entries()) {
      if (v[0] === addr) return tree.getProof(i);
    }
    throw new Error("not in tree");
  }

  describe("ChronoToken", function () {
    it("mints fixed supply to treasury", async function () {
      expect(await token.balanceOf(deployer.address)).to.equal(SUPPLY - (A + B + C));
      expect(await token.totalSupply()).to.equal(SUPPLY);
      expect(await token.name()).to.equal("Chrono");
      expect(await token.symbol()).to.equal("CHR");
    });
  });

  describe("claim", function () {
    it("lets an eligible address claim its exact allocation", async function () {
      const proof = proofFor(alice.address);
      await expect(airdrop.connect(alice).claim(A, proof))
        .to.emit(airdrop, "Claimed")
        .withArgs(alice.address, A);
      expect(await token.balanceOf(alice.address)).to.equal(A);
    });

    it("marks claimed and blocks double claim", async function () {
      const proof = proofFor(alice.address);
      await airdrop.connect(alice).claim(A, proof);
      expect(await airdrop.claimed(alice.address)).to.equal(true);
      await expect(airdrop.connect(alice).claim(A, proof)).to.be.revertedWith(
        "already claimed"
      );
    });

    it("rejects a wrong amount", async function () {
      const proof = proofFor(alice.address);
      await expect(
        airdrop.connect(alice).claim(A + 1n, proof)
      ).to.be.revertedWith("invalid proof");
    });

    it("rejects an address not in the tree", async function () {
      const proof = proofFor(alice.address);
      await expect(
        airdrop.connect(outsider).claim(A, proof)
      ).to.be.revertedWith("invalid proof");
    });

    it("canClaim reflects eligibility and claimed state", async function () {
      const proof = proofFor(bob.address);
      expect(await airdrop.canClaim(bob.address, B, proof)).to.equal(true);
      await airdrop.connect(bob).claim(B, proof);
      expect(await airdrop.canClaim(bob.address, B, proof)).to.equal(false);
    });
  });

  describe("owner controls", function () {
    it("only owner can set a new root", async function () {
      await expect(
        airdrop.connect(alice).setMerkleRoot(ethers.ZeroHash)
      ).to.be.revertedWithCustomError(airdrop, "OwnableUnauthorizedAccount");
      await airdrop.setMerkleRoot(ethers.ZeroHash);
      expect(await airdrop.merkleRoot()).to.equal(ethers.ZeroHash);
    });

    it("owner can sweep unclaimed tokens", async function () {
      const before = await token.balanceOf(deployer.address);
      await airdrop.sweep(deployer.address);
      const after = await token.balanceOf(deployer.address);
      expect(after - before).to.equal(A + B + C);
      expect(await token.balanceOf(await airdrop.getAddress())).to.equal(0n);
    });
  });
});
