// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUnicornRewards.sol";
import "./interfaces/IVotingFactory.sol";

/// @notice SoulBound token
contract UnicornToken is Ownable {
    /// @notice Name of the token
    string private name;

    /// @notice Symbol of the token
    string private symbol;

    /// @notice Shows if contract is initialized
    bool private isInit;

    /// @notice VotingFactory instance
    IVotingFactory public votingAddress;

    /// @notice UnicornRewards instance
    IUnicornRewards public unicornRewards;

    /// @notice Mappint (address => bool). Shows if user is Unicorn
    mapping(address => bool) private isUnicorn;

    /// @notice Array of all Unicorns
    address[] private unicorns;

    /// @notice Indicates that unicorn status was granted
    /// @param to Account of new Unicorn
    event unicornStatusGranted(address to);

    /// @notice Indicates that unicorn status was removed
    /// @param from Account of removed Unicorn
    event unicornStatusRemoved(address from);


    /// @notice Checks if caller is Voting instance
    modifier onlyVoting() {
        require(
            votingAddress.isVotingInstance(msg.sender),
            "UnicornToken: caller in not a Voting!"
        );
        _;
    }

    /// @notice Checks if init method was called only once
    modifier onlyOnce() {
        require(!isInit, "UnicornToken: Already initialized!");
        _;
    }

    /// @param name_ Name of the token
    /// @param symbol_ Symbol of the token
    /// @param votingAddress_ Address of VotingFactory contract
    /// @param unicornRewards_ Address of UnicornRewards contract
    constructor(
        string memory name_,
        string memory symbol_,
        address votingAddress_,
        address unicornRewards_
    ) {
        name = name_;
        symbol = symbol_;
        votingAddress = IVotingFactory(votingAddress_);
        unicornRewards = IUnicornRewards(unicornRewards_);
        isInit = false;
    }


    /// @notice Sets first Unicorn (Owner)
    /**
    @dev This method can be called only by an Owner of the contract.
    This method can be called only once
    **/
    function init(address user) external onlyOnce onlyOwner {
        isInit = true;
        isUnicorn[user] = true;
        unicorns.push(user);
        unicornRewards.stake(user);
        emit unicornStatusGranted(user);
    }

    /// @notice Returns Unicorn status
    /// @param user Account to check
    /// @return bool True - user is Unicorn, False - User is not a Unicorn
    function getIsUnicorn(address user) external view returns (bool) {
        return isUnicorn[user];
    }

    /// @notice Returns all Unicorns
    /// @return addresses Array of Unicorns addresses
    function getAllUnicorns() external view returns (address[] memory) {
        return unicorns;
    }

    /// @notice Returns total amount of Unicorns
    /// @return amount Total amount of Unicorns
    function getUnicornsLength() external view returns (uint256) {
        return unicorns.length;
    }

    /// @notice Grants Unicorn status to targeted account
    /// @param to Targeted account
    /** 
    @dev This method can be called only by a Voting Inctance
    User can have only one Unicorn token
    **/ 
    function mint(address to) external onlyVoting {
        require(isUnicorn[to] == false, "UnicornToken: already Unicorn!");
        isUnicorn[to] = true;
        unicorns.push(to);
        unicornRewards.stake(to);
        emit unicornStatusGranted(to);
    }

    /// @notice Removes Unicorn status to targeted account
    /// @param from Targeted account
    /** 
    @dev This method can be called only by a Voting Inctance
    **/ 
    function burn(address from) external onlyVoting {
        require(
            isUnicorn[from] == true,
            "UnicornToken: user is not a Unicorn!"
        );
        unicornRewards.unstake(from);
        isUnicorn[from] = false;
        for (uint256 i = 0; i < unicorns.length; i++) {
            if (unicorns[i] == from) {
                unicorns[i] = unicorns[unicorns.length - 1];
                unicorns.pop();
                break;
            }
        }
        emit unicornStatusRemoved(from);
    }
}