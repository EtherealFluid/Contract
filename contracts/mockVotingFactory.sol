// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Voting.sol';
import './interfaces/IVotingFactory.sol';
import './interfaces/IUnicornToken.sol';
import "./interfaces/IVotingInitialize.sol";
import "./interfaces/IVoting.sol";

contract mockVotingFactory {
    
    mapping (address => bool) mVotingInstances;

    constructor(address votingAddress) {
        mVotingInstances[votingAddress] = true;
    }

    function isVotingInstance(address instance) external view returns (bool) {
        return mVotingInstances[instance];
    }

}
