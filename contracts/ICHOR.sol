pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IICHOR.sol";
import "./interfaces/IVotingFactory.sol";
import "./interfaces/IStakingContract.sol";
import "./interfaces/IUnicornRewards.sol";


contract ICHOR is Context, IERC20, Ownable {
    using SafeMath for uint256;
    mapping(address => uint256) private _rOwned;
    mapping(address => mapping(address => uint256)) private _allowances;
    mapping(address => bool) private _isExcludedFromFee;
    mapping(address => bool) private bots;
    mapping(address => uint256) private cooldown;
    uint256 private constant _tTotal = 1e10 * 10 ** 9;

    address private _charity;

    IVotingFactory public voting;

    address public stakingAddress;

    string private constant _name = "Ethereal Fluid";
    string private constant _symbol = "ICHOR";
    uint8 private constant _decimals = 9;

    address unicornRewards;

    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;
    bool private tradingOpen;
    bool private inSwap = false;
    bool private cooldownEnabled = false;
    uint256 private tradingActiveBlock = 0; // 0 means trading is not active
    uint256 private _maxBuyAmount = _tTotal;
    uint256 private _maxSellAmount = _tTotal;
    uint256 private _maxWalletAmount = _tTotal;

    mapping(address => bool) public hasClaimed;
    address oldIchorAddress;
    address private migrationPayer;

    event MaxBuyAmountUpdated(uint256 _maxBuyAmount);
    event MaxSellAmountUpdated(uint256 _maxSellAmount);
    event MaxWalletAmountUpdated(uint256 _maxWalletAmount);
    event TokensMigrated(address _user, uint256 _amount);

    modifier lockTheSwap() {
        inSwap = true;
        _;
        inSwap = false;
    }

    modifier onlyVoting() {
        require(
            voting.isVotingInstance(msg.sender),
            "ICHOR: caller is not a Voting contract!"
        );
        _;
    }

    constructor(
        address _uniswapV2Router,
        address _oldIchorAddress,
        address charity,
        address _votingFactoryAddress,
        address _stakingAddress,
        address _unicornRewards,
        address _migrationPayer
    ) {
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);

        _rOwned[_msgSender()] = _tTotal;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        unicornRewards = _unicornRewards;
        emit Transfer(address(0), _msgSender(), _tTotal);

        oldIchorAddress = _oldIchorAddress;
        _charity = charity;
        voting = IVotingFactory(_votingFactoryAddress);
        stakingAddress = _stakingAddress;
        migrationPayer = _migrationPayer;
    }

    function name() public pure returns (string memory) {
        return _name;
    }

    function symbol() public pure returns (string memory) {
        return _symbol;
    }

    function decimals() public pure returns (uint8) {
        return _decimals;
    }

    function totalSupply() public pure override returns (uint256) {
        return _tTotal;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _rOwned[account];
    }

    function transfer(
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            _msgSender(),
            _allowances[sender][_msgSender()].sub(
                amount,
                "ERC20: transfer amount exceeds allowance"
            )
        );
        return true;
    }

    function setCooldownEnabled(bool onoff) external onlyOwner {
        cooldownEnabled = onoff;
    }

    function setCharityAddress(address charity) external onlyVoting {
        require(
            charity != address(0),
            "ICHOR: Charity cannot be a zero address!"
        );
        _charity = charity;
    }

    function getCharityAddress() external view returns (address) {
        return _charity;
    }

    function _approve(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "ERC20: Transfer amount must be greater than zero");
        bool takeFee = true;
        if (
            from != owner() &&
            to != owner() &&
            to != address(0) &&
            to != address(0xdead)
        ) {
            require(!bots[from] && !bots[to]);

            if (
                from == uniswapV2Pair &&
                to != address(uniswapV2Router) &&
                !_isExcludedFromFee[to] &&
                cooldownEnabled
            ) {
                require(
                    amount <= _maxBuyAmount,
                    "ICHOR: Transfer amount exceeds the maxBuyAmount!"
                );
                require(
                    balanceOf(to) + amount <= _maxWalletAmount,
                    "ICHOR: Exceeds maximum wallet token amount!"
                );
                require(cooldown[to] < block.timestamp);
                cooldown[to] = block.timestamp + (30 seconds);
            }

            if (
                to == uniswapV2Pair &&
                from != address(uniswapV2Router) &&
                !_isExcludedFromFee[from] &&
                cooldownEnabled
            ) {
                require(
                    amount <= _maxSellAmount,
                    "ICHOR: Transfer amount exceeds the maxSellAmount!"
                );
            }
        }

        if (_isExcludedFromFee[from] || _isExcludedFromFee[to]) {
            takeFee = false;
        }

        _tokenTransfer(from, to, amount, takeFee);
    }

    function swapTokensForEth(uint256 tokenAmount) private lockTheSwap {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        _approve(address(this), address(uniswapV2Router), tokenAmount);
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function migrateTokens() external {
        uint256 amount = IICHOR(oldIchorAddress).balanceOf(msg.sender);
        require(balanceOf(migrationPayer) >= amount, "ICHOR: cant pay now!");
        require(!hasClaimed[msg.sender], "ICHOR: tokens already claimed!");
        hasClaimed[msg.sender] = true;
        _transferStandard(migrationPayer, msg.sender, amount);
        emit TokensMigrated(msg.sender, amount);
    }

    function openTrading() external onlyOwner {
        require(!tradingOpen, "ICHOR: Trading is already open");
        _approve(address(this), address(uniswapV2Router), _tTotal);
        uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(
            address(this),
            uniswapV2Router.WETH()
        );
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(
            address(this),
            balanceOf(address(this)),
            0,
            0,
            owner(),
            block.timestamp
        );

        cooldownEnabled = true;
        _maxBuyAmount = 5e7 * 10 ** 9;
        _maxSellAmount = 5e7 * 10 ** 9;
        _maxWalletAmount = 1e8 * 10 ** 9;
        tradingOpen = true;
        tradingActiveBlock = block.number;
        IERC20(uniswapV2Pair).approve(
            address(uniswapV2Router),
            type(uint256).max
        );
    }

    function setBots(address[] memory bots_) public onlyOwner {
        for (uint256 i = 0; i < bots_.length; i++) {
            bots[bots_[i]] = true;
        }
    }

    function setMaxBuyAmount(uint256 maxBuy) public onlyOwner {
        _maxBuyAmount = maxBuy;
        emit MaxBuyAmountUpdated(_maxBuyAmount);
    }

    function setMaxSellAmount(uint256 maxSell) public onlyOwner {
        _maxSellAmount = maxSell;
        emit MaxSellAmountUpdated(_maxSellAmount);
    }

    function setMaxWalletAmount(uint256 maxToken) public onlyOwner {
        _maxWalletAmount = maxToken;
        emit MaxWalletAmountUpdated(_maxWalletAmount);
    }

    function excludeFromFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = true;
    }

    function includeInFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = false;
    }

    function delBot(address notbot) public onlyOwner {
        bots[notbot] = false;
    }

    function _tokenTransfer(
        address sender,
        address recipient,
        uint256 amount,
        bool takeFee
    ) private {
        if (takeFee) {
            amount = _takeFees(sender, amount);
        }
        _transferStandard(sender, recipient, amount);
    }

    function _transferStandard(
        address sender,
        address recipient,
        uint256 tAmount
    ) private {
        require(balanceOf(sender) >= tAmount, "ICHOR: Insufficient balance!");
        _rOwned[sender] = _rOwned[sender].sub(tAmount);
        _rOwned[recipient] = _rOwned[recipient].add(tAmount);
        emit Transfer(sender, recipient, tAmount);
    }

    function _takeFees(
        address sender,
        uint256 amount
    ) private returns (uint256) {
        uint256 totalFeeAmount = amount.mul(4).div(100);
        uint256 amountToCharity = totalFeeAmount.mul(50).div(100);
        uint256 amountToStaking = (totalFeeAmount.sub(amountToCharity))
            .mul(85)
            .div(100);
        uint256 amountToUnicorns = totalFeeAmount.sub(
            amountToCharity.add(amountToStaking)
        );

        if (amountToCharity > 0) {
            _transferStandard(sender, _charity, amountToCharity);
        }

        if (amountToStaking > 0) {
            _transferStandard(sender, stakingAddress, amountToStaking);
            IStakingContract(stakingAddress).notifyRewardAmount(
                amountToStaking
            );
        }

        if (amountToUnicorns > 0) {
            _transferStandard(sender, unicornRewards, amountToUnicorns);
            IUnicornRewards(unicornRewards).notifyRewardAmount(
                amountToUnicorns
            );
        }
        return amount -= totalFeeAmount;
    }

    receive() external payable {}

    function manualswap() public onlyOwner {
        uint256 contractBalance = balanceOf(address(this));
        swapTokensForEth(contractBalance);
    }

    function withdrawStuckETH() external onlyOwner {
        bool success;
        (success, ) = address(msg.sender).call{value: address(this).balance}("");
    }
}
