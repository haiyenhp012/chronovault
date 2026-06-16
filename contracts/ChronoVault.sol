// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ChronoVault
/// @notice Time-locked vesting where each lock position is a tradable NFT.
/// @dev Supports any ERC20/LP token plus the chain's native coin. Cliff + linear vesting.
///      The NFT holder is the sole claimant of a position.
contract ChronoVault is ERC721, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Sentinel token address that represents the native coin (OPN).
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct Lock {
        address token;        // ERC20/LP token, or NATIVE for the native coin
        uint256 amount;       // total amount locked
        uint256 claimed;      // amount already withdrawn
        uint64 start;         // unix time vesting starts
        uint64 cliff;         // unix time before which nothing is claimable
        uint64 end;           // unix time at which fully vested
    }

    uint256 public nextId = 1;
    mapping(uint256 => Lock) private _locks;

    event Locked(
        uint256 indexed id,
        address indexed creator,
        address indexed token,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 end
    );
    event Claimed(uint256 indexed id, address indexed to, uint256 amount);

    constructor() ERC721("ChronoVault Position", "CHRONO") {}

    /// @notice Lock `amount` of an ERC20 `token` with a cliff + linear vesting schedule.
    /// @param token       ERC20 or LP token to lock (must not be the NATIVE sentinel).
    /// @param amount      Total amount to lock (must be > 0).
    /// @param recipient   Address that receives the position NFT.
    /// @param start       Vesting start (use block.timestamp for "now").
    /// @param cliff       No tokens claimable before this time. Must be >= start.
    /// @param end         Fully vested at this time. Must be > cliff.
    /// @return id         The minted position's token id.
    function lock(
        address token,
        uint256 amount,
        address recipient,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) external nonReentrant returns (uint256 id) {
        require(token != address(0), "token=0");
        require(token != NATIVE, "use lockNative");
        require(amount > 0, "amount=0");

        IERC20 erc20 = IERC20(token);
        uint256 before = erc20.balanceOf(address(this));
        erc20.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = erc20.balanceOf(address(this)) - before;
        require(received > 0, "no tokens received");

        id = _mintLock(token, received, recipient, start, cliff, end);
    }

    /// @notice Lock native coin (OPN) sent as msg.value with a cliff + linear vesting schedule.
    /// @param recipient   Address that receives the position NFT.
    /// @param start       Vesting start (use block.timestamp for "now").
    /// @param cliff       No coins claimable before this time. Must be >= start.
    /// @param end         Fully vested at this time. Must be > cliff.
    /// @return id         The minted position's token id.
    function lockNative(
        address recipient,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) external payable nonReentrant returns (uint256 id) {
        require(msg.value > 0, "amount=0");
        id = _mintLock(NATIVE, msg.value, recipient, start, cliff, end);
    }

    function _mintLock(
        address token,
        uint256 amount,
        address recipient,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) internal returns (uint256 id) {
        require(recipient != address(0), "recipient=0");
        require(cliff >= start, "cliff<start");
        require(end > cliff, "end<=cliff");

        id = nextId++;
        _locks[id] = Lock({
            token: token,
            amount: amount,
            claimed: 0,
            start: start,
            cliff: cliff,
            end: end
        });

        _safeMint(recipient, id);
        emit Locked(id, msg.sender, token, amount, start, cliff, end);
    }

    /// @notice Amount currently claimable for a position (vested minus already claimed).
    function claimable(uint256 id) public view returns (uint256) {
        Lock memory l = _locks[id];
        require(l.amount > 0, "no lock");
        return _vested(l) - l.claimed;
    }

    /// @notice Total amount vested so far for a position.
    function vestedAmount(uint256 id) external view returns (uint256) {
        Lock memory l = _locks[id];
        require(l.amount > 0, "no lock");
        return _vested(l);
    }

    /// @notice Claim all currently claimable tokens for a position to the NFT holder.
    function claim(uint256 id) external nonReentrant {
        address holder = ownerOf(id); // reverts if token does not exist
        require(msg.sender == holder, "not holder");

        Lock storage l = _locks[id];
        uint256 amount = _vested(l) - l.claimed;
        require(amount > 0, "nothing to claim");

        l.claimed += amount;
        address token = l.token;

        if (l.claimed == l.amount) {
            _burn(id);
            delete _locks[id];
        }

        if (token == NATIVE) {
            (bool ok, ) = payable(holder).call{value: amount}("");
            require(ok, "native transfer failed");
        } else {
            IERC20(token).safeTransfer(holder, amount);
        }

        emit Claimed(id, holder, amount);
    }

    /// @notice Read a position's full lock data.
    function getLock(uint256 id)
        external
        view
        returns (
            address token,
            uint256 amount,
            uint256 claimed,
            uint64 start,
            uint64 cliff,
            uint64 end
        )
    {
        Lock memory l = _locks[id];
        require(l.amount > 0, "no lock");
        return (l.token, l.amount, l.claimed, l.start, l.cliff, l.end);
    }

    function _vested(Lock memory l) internal view returns (uint256) {
        if (block.timestamp < l.cliff) return 0;
        if (block.timestamp >= l.end) return l.amount;
        uint256 elapsed = block.timestamp - l.start;
        uint256 duration = l.end - l.start;
        return (l.amount * elapsed) / duration;
    }
}
