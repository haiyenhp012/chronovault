// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ChronoToken
/// @notice Project token for the ChronoVault ecosystem on OPN Chain.
/// @dev Fixed supply minted once to the deployer at construction.
contract ChronoToken is ERC20 {
    constructor(uint256 initialSupply, address treasury)
        ERC20("Chrono", "CHR")
    {
        _mint(treasury, initialSupply);
    }
}
