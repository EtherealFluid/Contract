// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
 

import "@openzeppelin/contracts/access/Ownable.sol";

 
contract UnicornToken {

    string name;
    string symbol;
    address votingAddress;

    mapping (address => bool) private isUnicorn;

    address[] unicorns;

    event unicornStatusGranted(address to);
    event unicornStatusRemoved(address from);

    modifier onlyVoting() {
        require(msg.sender == votingAddress, "UnicornToken: caller in not a Voting!");
        _;
    }

    constructor(string memory name_, string memory symbol_, address votingAddress_) {
        name = name_;
        symbol = symbol_;
        votingAddress = votingAddress_;
    }

    function getIsUnicorn(address user) external view returns(bool) {
        return isUnicorn[user];
    }

    function getAllUnicorns() external view returns(address[] memory) {
        return unicorns;
    }

    function getUnicornsLength() external view returns(uint256) {
        return unicorns.length;
    }
 
    function mint(address to) external onlyVoting {
        require(isUnicorn[to] == false, "UnicornToken: already Unicorn!");
        isUnicorn[to] = true;
        unicorns.push(to);
        emit unicornStatusGranted(to);
    }
 
    function burn(address from) external onlyVoting {
        require(isUnicorn[from] == true, "UnicornToken: user is not a Unicorn!");
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