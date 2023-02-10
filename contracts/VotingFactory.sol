// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import './Voting.sol';
import './interfaces/IVotingFactory.sol';

contract VotingFactory is Ownable, IVotingFactory {

    using SafeMathUpgradeable for uint256;

    struct votingInstance {
        address addressInstance;
        VotingVariants typeInstance;
    }

    address public override operator;

    address public override masterVoting;

    votingInstance[] public votingInstances;

    IICHOR public ichorToken; 

    mapping (address => bool) mVotingInstances;

    modifier onlyUnicorns() {
        //TODO CHECK IF CALLER IS UNICORN
        //require(, 'Caller is not an Unicorn');
        _;
    }

    constructor(
        address _operator,
        address _ichorTokenAddress
    ) {
        require(_operator != address(0), 'Operator is zero address');
        ichorToken = IICHOR(_ichorTokenAddress);
        masterVoting = address(new Voting());
    }

    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters,
        address _applicant
    ) external override onlyUnicorns {
        require(_duration > 0, 'VF: duration == 0');
        require(_qtyVoters > 0, 'QtyVoters must be greater than zero');
        require(_minPercentageVoters > 0, 'Percentage must be greater than zero');

        //TODO IS THERE FEE TO CREATE A VOTING?
        address instance;
        instance = Clones.clone(masterVoting);
        IVotingInitialize(instance).initialize(
            IVotingInitialize.Params({
                description: _voteDescription,
                start: block.timestamp,
                qtyVoters: _qtyVoters,
                minPercentageVoters: _minPercentageVoters,
                minQtyVoters: _mulDiv(_minPercentageVoters, _qtyVoters, 100),
                duration: _duration
            }),
            _applicant,
            address(ichorToken)
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
    
    
    function setMasterVoting(address _newMasterVoting) external override onlyOwner {
        require(_newMasterVoting != address(0), 'Address == address(0)');
        emit SetMasterVoting(masterVoting, _newMasterVoting);
        masterVoting = _newMasterVoting;
    }

    function setAdminRole(address _newAdmin) external override onlyOwner {
        require(_newAdmin != address(0), 'Address == address(0)');
        require(!hasRole(DEFAULT_ADMIN_ROLE, _newAdmin), 'Same address');
        _setupRole(DEFAULT_ADMIN_ROLE, _newAdmin);
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
