// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/proxy/Clones.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import './Voting.sol';
import './VotingAllowList.sol';
import './IVotingFactory.sol';
import './IVotingInitialize.sol';
import './IRPVSale.sol';

contract VotingFactory is AccessControl, IVotingFactory {

    using SafeMathUpgradeable for uint256;

    struct votingInstance {
        address addressInstance;
        VotingVariants typeInstance;
    }

    address public override operator;
    address public override masterVoting;
    address public override masterVotingAllowList;
    uint256 public override buyVotingTokenRate;
    uint256 public override createProposalRate;
    uint256 public override rewardForCreate;
    uint256 public override rewardForVoting;
    address public rpvSaleContract;
    votingInstance[] public votingInstances;
    mapping (address => bool) mVotingInstances;
    IERC20Upgradeable public rpvToken;
    IERC20Upgradeable public rptToken;

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), 'Caller is not an admin');
        _;
    }
    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, _msgSender()), 'Caller is not an operator');
        _;
    }

    modifier onlyInstances() {
        require(mVotingInstances[_msgSender()], 'Caller is not instance');
        _;
    }

    bytes32 public constant OPERATOR_ROLE = keccak256('OPERATOR_ROLE');

    constructor(
        address _rptToken,
        address _operator,
        address _rpvSaleContract,
        uint256 _buyVotingTokenRate,
        uint256 _createProposalRate
    ) {
        require(_rptToken != address(0), 'Token is zero address');
        require(_operator != address(0), 'Operator is zero address');
        require(_rpvSaleContract != address(0), 'RpvSaleContract is zero address');
        require(_buyVotingTokenRate > 0 && _createProposalRate > 0, 'Rate must be greater than zero');
        
        rptToken = IERC20Upgradeable(_rptToken);
        rewardForCreate = 50 * 10 ** 18;
        rewardForVoting = 10 * 10 ** 18;
        rpvSaleContract = _rpvSaleContract;
        buyVotingTokenRate = _buyVotingTokenRate;
        createProposalRate = _createProposalRate;
        masterVoting = address(new Voting());
        masterVotingAllowList = address(new VotingAllowList());
        rpvToken = IERC20Upgradeable(IRPVSale(rpvSaleContract).rpvToken());
        operator = _operator;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OPERATOR_ROLE, _operator);
    }

    function votingReward(address _recipient) external override onlyInstances {
        _transferRpt(_recipient, rewardForVoting);
    }

    function withdrawRpt(address _recipient) external override onlyAdmin {
        _transferRpt(_recipient, rptToken.balanceOf(address(this)));
    }


    function createVoting(
        VotingVariants _typeVoting,
        bytes memory _voteDescription,
        uint256 _duration,
        uint256 _qtyVoters,
        uint256 _minPercentageVoters
    ) external override {
        require(_duration > 0, 'VF: duration == 0');
        require(_qtyVoters > 0, 'QtyVoters must be greater than zero');
        require(_minPercentageVoters > 0, 'Percentage must be greater than zero');
        uint256 _decimals = 10 ** 18;
        //1 * decimals * decimals / rate;
        uint256 rpvAmount = _decimals.mul(_decimals).div(createProposalRate);
        rpvToken.transferFrom(_msgSender(), rpvSaleContract, rpvAmount);
        address instance;
        if (_typeVoting == VotingVariants.COMMON) {
            instance = Clones.clone(masterVoting);
        } else {
            instance = Clones.clone(masterVotingAllowList);
        }
        IVotingInitialize(instance).initialize(
            IVotingInitialize.Params({
                description: _voteDescription,
                start: block.timestamp,
                qtyVoters: _qtyVoters,
                minPercentageVoters: _minPercentageVoters,
                minQtyVoters: _mulDiv(_minPercentageVoters, _qtyVoters, 100),
                buyVotingTokenRate: buyVotingTokenRate,
                duration: _duration
            }),
            rpvSaleContract,
            rpvToken
        );
        votingInstances.push(votingInstance({addressInstance: instance, typeInstance: _typeVoting}));
        mVotingInstances[instance] = true;
        _transferRpt(_msgSender(), rewardForCreate);
        emit CreateVoting(instance, _typeVoting);
    }

    function getVotingInstancesLength() external view override returns (uint256) {
        return votingInstances.length;
    }

    function setMasterVoting(address _newMasterVoting) external override onlyOperator {
        require(_newMasterVoting != address(0), 'Address == address(0)');
        emit SetMasterVoting(masterVoting, _newMasterVoting);
        masterVoting = _newMasterVoting;
    }

    function setMasterVotingAllowList(address _newMasterVotingAllowListContract) external override onlyOperator {
        require(_newMasterVotingAllowListContract != address(0), 'Address == address(0)');
        emit SetMasterVotingAllowList(masterVotingAllowList, _newMasterVotingAllowListContract);
        masterVotingAllowList = _newMasterVotingAllowListContract;
    }

    function setVotingTokenRate(uint256 _newBuyVotingTokenRate) external override onlyOperator {
        require(_newBuyVotingTokenRate > 0, 'Rate == 0');
        emit SetVotingTokenRate(buyVotingTokenRate, _newBuyVotingTokenRate);
        buyVotingTokenRate = _newBuyVotingTokenRate;
    }

    function setCreateProposalRate(uint256 _newCreateProposalRate) external override onlyOperator {
        require(_newCreateProposalRate > 0, 'Rate == 0');
        emit SetCreateProposalRate(createProposalRate, _newCreateProposalRate);
        createProposalRate = _newCreateProposalRate;
    }

    function setAdminRole(address _newAdmin) external override onlyAdmin {
        require(_newAdmin != address(0), 'Address == address(0)');
        require(!hasRole(DEFAULT_ADMIN_ROLE, _newAdmin), 'Same address');
        _setupRole(DEFAULT_ADMIN_ROLE, _newAdmin);
    }

    function setRewardForCreate(uint256 _newReward) external override onlyOperator {
        require(_newReward > 0, 'Reward == 0');
        rewardForCreate = _newReward;
    }

    function setRewardForVoting(uint256 _newReward) external override onlyOperator {
        require(_newReward > 0, 'Reward == 0');
        rewardForVoting = _newReward;
    }
    
    function setRptToken(address _rptToken) external onlyOperator {
        require(_rptToken != address(0), 'token == address(0)');
        rptToken = IERC20Upgradeable(_rptToken);
    }

    function setRpVToken(address _rpvToken) external onlyOperator {
        require(_rpvToken != address(0), 'token == address(0)');
        rpvToken = IERC20Upgradeable(_rpvToken);
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

    function _transferRpt(address _recipient, uint256 _amount) internal {
        if(rptToken.balanceOf(address(this)) >= _amount){
            rptToken.transfer(_recipient, _amount);
        }
    }
}
