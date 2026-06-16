// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ChronoAirdrop
/// @notice Merkle-based airdrop distributor for the Chrono token.
/// @dev Eligible (address, amount) pairs are committed via a Merkle root. Each address claims once.
contract ChronoAirdrop is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    bytes32 public merkleRoot;

    mapping(address => bool) public claimed;

    event Claimed(address indexed account, uint256 amount);
    event MerkleRootUpdated(bytes32 newRoot);
    event Swept(address indexed to, uint256 amount);

    constructor(address token_, bytes32 merkleRoot_) Ownable(msg.sender) {
        require(token_ != address(0), "token=0");
        token = IERC20(token_);
        merkleRoot = merkleRoot_;
    }

    /// @notice Claim airdropped tokens by providing a Merkle proof.
    /// @param amount The exact amount allocated to msg.sender in the Merkle tree.
    /// @param proof  Merkle proof for leaf keccak256(abi.encodePacked(msg.sender, amount)).
    function claim(uint256 amount, bytes32[] calldata proof) external {
        require(!claimed[msg.sender], "already claimed");

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender, amount))));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "invalid proof");

        claimed[msg.sender] = true;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    /// @notice Check whether `account` can still claim `amount` with `proof`.
    function canClaim(address account, uint256 amount, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        if (claimed[account]) return false;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        return MerkleProof.verify(proof, merkleRoot, leaf);
    }

    /// @notice Owner can update the Merkle root (e.g. for a new airdrop round).
    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    /// @notice Owner can recover unclaimed tokens after the campaign.
    function sweep(address to) external onlyOwner {
        require(to != address(0), "to=0");
        uint256 bal = token.balanceOf(address(this));
        token.safeTransfer(to, bal);
        emit Swept(to, bal);
    }
}
