// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Voting.sol';
import './interfaces/IVotingFactory.sol';
import './interfaces/IUnicornToken.sol';
import "./interfaces/IVotingInitialize.sol";
import "./interfaces/IVoting.sol";

contract VotingFactory is Ownable, IVotingFactory {
    struct votingInstance {
        address addressInstance;
        VotingVariants typeInstance;
    }

    address public masterVoting;

    votingInstance[] public votingInstances;

    IICHOR public ichorToken; 
    IUnicornToken public unicornToken;

    mapping (address => bool) mVotingInstances;

    modifier onlyUnicorns() {
        require(unicornToken.getIsUnicorn(msg.sender), "VotingFactory: caller is not a Unicorn");
        _;
    }

    constructor() {
        masterVoting = address(new Voting());
    }

    function setIchorAddress(address ichorToken_) external onlyOwner {
        ichorToken = IICHOR(ichorToken_);
    }

    function getIchorAddress() external view returns(address) {
        return address(ichorToken);
    }

    function setUnicornToken(address unicornToken_) external onlyOwner {
        unicornToken = IUnicornToken(unicornToken_);
    }

    function getUnicornToken() external view returns(address) {
        return address(unicornToken);
    }

    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters,
        address _applicant,
        address _unicornToken
    ) external override onlyUnicorns {
        require(_duration >= 518400 && _duration <= 1317600, 'VotingFactory: Duration exceeds the allowable interval');
        require(_qtyVoters > 0, 'VotingFactory: QtyVoters must be greater than zero');
        require(_minPercentageVoters > 0, 'VotingFactory: Percentage must be greater than zero');

        address instance;
        instance = Clones.clone(masterVoting);
        IVoting(instance).initialize(
            IVotingInitialize.Params({
                description: _voteDescription,
                start: block.timestamp,
                qtyVoters: _qtyVoters,
                minPercentageVoters: _minPercentageVoters,
                minQtyVoters: _mulDiv(_minPercentageVoters, _qtyVoters, 100),
                duration: _duration
            }),
            _applicant,
            address(ichorToken),
            address(_unicornToken),
            _typeVoting
        );
        votingInstances.push(votingInstance({addressInstance: instance, typeInstance: _typeVoting}));
        mVotingInstances[instance] = true;
        emit CreateVoting(instance, _typeVoting);
    }

    function getVotingInstancesLength() external view override returns (uint256) {
        return votingInstances.length;
    }

    function isVotingInstance(address instance) external view returns (bool) {
        return mVotingInstances[instance];
    }

    function _mulDiv(
        uint256 x,
        uint256 y,
        uint256 z
    ) internal pure returns (uint256) {
        uint256 a = x / z;
        uint256 b = x % z; // x = a * z + b
        uint256 c = y / z;
        uint256 d = y % z; // y = c * z + d
        return a * b * z + a * d + b * c + (b * d) / z;
    }
}
