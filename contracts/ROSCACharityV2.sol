// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ROSCACharity v2 — Multi-Pool Equal-Split
 * @notice Multiple cause pools (e.g. Animal Welfare, Social Rehabilitation).
 *         Donors donate to a specific pool. On payout, the full pool balance
 *         is split EQUALLY among all active charities in that pool.
 *         ROSCA rotation advances at the POOL level each cycle.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ROSCACharityV2 is ERC721URIStorage, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    // ── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE  = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ── Constants ────────────────────────────────────────────────────────────
    address public immutable XSGD_TOKEN;
    uint256 public constant MIN_DONATION          = 1_000_000; // 1 XSGD (6dp)
    uint256 public constant MAX_CHARITIES_PER_POOL = 20;
    uint256 public constant MAX_POOLS             = 10;

    // ── Pool ─────────────────────────────────────────────────────────────────
    struct Pool {
        string  name;
        bool    active;
        uint256 balance;
        uint256[] charityIds;
    }

    uint256 public poolCount;
    mapping(uint256 => Pool) public pools;

    // ── Charity ──────────────────────────────────────────────────────────────
    struct Charity {
        address wallet;
        string  name;
        bool    active;
        uint256 poolId;
        uint256 totalReceived;
    }

    uint256 private _nextCharityId;
    mapping(uint256 => Charity)  public charities;
    mapping(address => bool)     public isRegisteredWallet;
    mapping(address => uint256)  public walletToCharityId;

    // ── ROSCA Rotation ───────────────────────────────────────────────────────
    uint256[] public poolRotation;   // ordered list of pool IDs for rotation
    uint256   public rotationIndex;  // current position in poolRotation
    uint256   public currentCycle;

    // ── NFT / Donation Receipt ───────────────────────────────────────────────
    uint256 private _nextTokenId;
    string  private _baseTokenURI;

    struct DonationReceipt {
        address donor;
        uint256 poolId;
        uint256 amount;
        uint256 timestamp;
        uint256 cycleId;
    }
    mapping(uint256 => DonationReceipt) public donationReceipts;

    // ── Events ───────────────────────────────────────────────────────────────
    event PoolCreated(uint256 indexed poolId, string name);
    event CharityAdded(uint256 indexed charityId, uint256 indexed poolId, address indexed wallet, string name);
    event CharityRemoved(uint256 indexed charityId, address indexed wallet);
    event DonationReceived(address indexed donor, uint256 indexed poolId, uint256 amount, uint256 indexed tokenId, uint256 cycleId, uint256 newPoolBalance);
    event PayoutExecuted(uint256 indexed poolId, uint256 cycleId, uint256 totalAmount, uint256 perCharityAmount, uint256 charityCount);
    event PoolEmergencyWithdrawn(address indexed to, uint256 poolId, uint256 amount);

    // ── Custom Errors ────────────────────────────────────────────────────────
    error ZeroAddress();
    error ZeroAmount();
    error BelowMinDonation(uint256 sent, uint256 minimum);
    error PoolNotFound(uint256 id);
    error PoolInactive(uint256 id);
    error MaxPoolsReached();
    error MaxCharitiesReached(uint256 poolId);
    error CharityNotFound(uint256 id);
    error WalletAlreadyRegistered(address wallet);
    error NoActiveCharities(uint256 poolId);
    error EmptyPool(uint256 poolId);
    error InvalidBaseURI();
    error NoPoolsRegistered();

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(address xsgdToken, string memory baseURI, address admin)
        ERC721("GiveRotate Donation Receipt", "GRDR")
    {
        if (xsgdToken == address(0)) revert ZeroAddress();
        if (admin == address(0))     revert ZeroAddress();
        XSGD_TOKEN    = xsgdToken;
        _baseTokenURI = baseURI;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    // ── Pool Management ──────────────────────────────────────────────────────

    function createPool(string calldata name) external onlyRole(ADMIN_ROLE) returns (uint256 poolId) {
        if (poolCount >= MAX_POOLS) revert MaxPoolsReached();
        poolId = poolCount++;
        pools[poolId].name   = name;
        pools[poolId].active = true;
        poolRotation.push(poolId);
        emit PoolCreated(poolId, name);
    }

    function addCharityToPool(uint256 poolId, address wallet, string calldata name)
        external onlyRole(ADMIN_ROLE) returns (uint256 id)
    {
        if (wallet == address(0))          revert ZeroAddress();
        if (isRegisteredWallet[wallet])    revert WalletAlreadyRegistered(wallet);
        if (poolId >= poolCount)           revert PoolNotFound(poolId);
        if (!pools[poolId].active)         revert PoolInactive(poolId);
        if (pools[poolId].charityIds.length >= MAX_CHARITIES_PER_POOL) revert MaxCharitiesReached(poolId);

        id = _nextCharityId++;
        charities[id] = Charity({ wallet: wallet, name: name, active: true, poolId: poolId, totalReceived: 0 });
        pools[poolId].charityIds.push(id);
        isRegisteredWallet[wallet]  = true;
        walletToCharityId[wallet]   = id;
        emit CharityAdded(id, poolId, wallet, name);
    }

    function removeCharity(uint256 charityId) external onlyRole(ADMIN_ROLE) {
        if (charityId >= _nextCharityId) revert CharityNotFound(charityId);
        Charity storage c = charities[charityId];
        c.active = false;
        isRegisteredWallet[c.wallet] = false;
        emit CharityRemoved(charityId, c.wallet);
    }

    function reactivateCharity(uint256 charityId) external onlyRole(ADMIN_ROLE) {
        if (charityId >= _nextCharityId) revert CharityNotFound(charityId);
        Charity storage c = charities[charityId];
        c.active = true;
        isRegisteredWallet[c.wallet] = true;
        emit CharityAdded(charityId, c.poolId, c.wallet, c.name);
    }

    // ── Donate ───────────────────────────────────────────────────────────────

    function donate(uint256 poolId, uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0)           revert ZeroAmount();
        if (amount < MIN_DONATION) revert BelowMinDonation(amount, MIN_DONATION);
        if (poolId >= poolCount)   revert PoolNotFound(poolId);
        if (!pools[poolId].active) revert PoolInactive(poolId);

        IERC20(XSGD_TOKEN).safeTransferFrom(msg.sender, address(this), amount);
        pools[poolId].balance += amount;

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, string(abi.encodePacked(_baseTokenURI, tokenId.toString())));

        donationReceipts[tokenId] = DonationReceipt({
            donor:     msg.sender,
            poolId:    poolId,
            amount:    amount,
            timestamp: block.timestamp,
            cycleId:   currentCycle
        });

        emit DonationReceived(msg.sender, poolId, amount, tokenId, currentCycle, pools[poolId].balance);
    }

    // ── Payout (ROSCA rotation at pool level) ────────────────────────────────

    function payout() external onlyRole(ADMIN_ROLE) nonReentrant whenNotPaused {
        if (poolRotation.length == 0) revert NoPoolsRegistered();

        // Find next active pool with balance
        uint256 len = poolRotation.length;
        uint256 targetPoolId;
        bool found = false;

        for (uint256 i = 0; i < len; i++) {
            uint256 idx = (rotationIndex + i) % len;
            uint256 pid = poolRotation[idx];
            if (pools[pid].active && pools[pid].balance > 0) {
                targetPoolId  = pid;
                rotationIndex = (idx + 1) % len;
                found = true;
                break;
            }
        }
        if (!found) revert EmptyPool(0);

        Pool storage p = pools[targetPoolId];

        // Count active charities in pool
        uint256 activeCount = 0;
        for (uint256 i = 0; i < p.charityIds.length; i++) {
            if (charities[p.charityIds[i]].active) activeCount++;
        }
        if (activeCount == 0) revert NoActiveCharities(targetPoolId);

        uint256 totalAmount    = p.balance;
        uint256 perCharity     = totalAmount / activeCount;
        uint256 remainder      = totalAmount - (perCharity * activeCount);

        p.balance = 0;
        currentCycle++;

        // Distribute equally, give remainder to first charity
        bool firstDone = false;
        for (uint256 i = 0; i < p.charityIds.length; i++) {
            Charity storage c = charities[p.charityIds[i]];
            if (!c.active) continue;
            uint256 amount = perCharity;
            if (!firstDone) { amount += remainder; firstDone = true; }
            c.totalReceived += amount;
            IERC20(XSGD_TOKEN).safeTransfer(c.wallet, amount);
        }

        emit PayoutExecuted(targetPoolId, currentCycle - 1, totalAmount, perCharity, activeCount);
    }

    // ── Emergency ────────────────────────────────────────────────────────────

    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function emergencyWithdraw(address to, uint256 poolId) external onlyRole(DEFAULT_ADMIN_ROLE) whenPaused nonReentrant {
        if (to == address(0))       revert ZeroAddress();
        if (poolId >= poolCount)    revert PoolNotFound(poolId);
        uint256 amount = pools[poolId].balance;
        if (amount == 0)            revert EmptyPool(poolId);
        pools[poolId].balance = 0;
        IERC20(XSGD_TOKEN).safeTransfer(to, amount);
        emit PoolEmergencyWithdrawn(to, poolId, amount);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getPool(uint256 poolId) external view returns (string memory name, bool active, uint256 balance, uint256[] memory charityIds) {
        Pool storage p = pools[poolId];
        return (p.name, p.active, p.balance, p.charityIds);
    }

    function getAllPools() external view returns (uint256[] memory ids, string[] memory names, uint256[] memory balances) {
        ids      = new uint256[](poolCount);
        names    = new string[](poolCount);
        balances = new uint256[](poolCount);
        for (uint256 i = 0; i < poolCount; i++) {
            ids[i]      = i;
            names[i]    = pools[i].name;
            balances[i] = pools[i].balance;
        }
    }

    function getPoolCharities(uint256 poolId) external view returns (uint256[] memory) {
        return pools[poolId].charityIds;
    }

    function nextPayoutPool() external view returns (uint256 poolId, string memory name, uint256 balance) {
        if (poolRotation.length == 0) revert NoPoolsRegistered();
        uint256 len = poolRotation.length;
        for (uint256 i = 0; i < len; i++) {
            uint256 idx = (rotationIndex + i) % len;
            uint256 pid = poolRotation[idx];
            if (pools[pid].active && pools[pid].balance > 0) {
                return (pid, pools[pid].name, pools[pid].balance);
            }
        }
        revert EmptyPool(0);
    }

    function totalDonations() external view returns (uint256) { return _nextTokenId; }

    function setBaseURI(string calldata newURI) external onlyRole(ADMIN_ROLE) {
        if (bytes(newURI).length == 0) revert InvalidBaseURI();
        _baseTokenURI = newURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, AccessControl) returns (bool)
    { return super.supportsInterface(interfaceId); }
}
