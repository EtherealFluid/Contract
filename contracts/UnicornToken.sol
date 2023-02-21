// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUnicornRewards.sol";
import "./interfaces/IVotingFactory.sol";

contract UnicornToken is Ownable {
    string name;
    string symbol;
    bool isInit;
    IVotingFactory public votingAddress;
    IUnicornRewards public unicornRewards;

    mapping(address => bool) private isUnicorn;

    address[] unicorns;

    event unicornStatusGranted(address to);
    event unicornStatusRemoved(address from);

    modifier onlyVoting() {
        require(
            votingAddress.isVotingInstance(msg.sender),
            "UnicornToken: caller in not a Voting!"
        );
        _;
    }

    modifier onlyOnce() {
        require(!isInit, "UnicornToken: Already initialized!");
        _;
    }

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

    function init(address user) external onlyOnce onlyOwner {
        isInit = true;
        isUnicorn[user] = true;
        unicorns.push(user);
        unicornRewards.stake(user);
        emit unicornStatusGranted(user);
    }

    function getIsUnicorn(address user) external view returns (bool) {
        return isUnicorn[user];
    }

    function getAllUnicorns() external view returns (address[] memory) {
        return unicorns;
    }

    function getUnicornsLength() external view returns (uint256) {
        return unicorns.length;
    }

    function mint(address to) external onlyVoting {
        require(isUnicorn[to] == false, "UnicornToken: already Unicorn!");
        isUnicorn[to] = true;
        unicorns.push(to);
        unicornRewards.stake(to);
        emit unicornStatusGranted(to);
    }

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