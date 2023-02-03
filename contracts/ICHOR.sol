pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IICHOR.sol";


contract ICHOR is Context, IERC20, Ownable {
    using SafeMath for uint256;
    mapping (address => uint256) private _rOwned;
    mapping (address => mapping (address => uint256)) private _allowances;
    mapping (address => bool) private _isExcludedFromFee;
    mapping (address => bool) private bots;
    mapping (address => uint) private cooldown;
    uint256 private constant _tTotal = 1e10 * 10**9;
    
    uint256 private _buyProjectFee = 4;
    uint256 private _previousBuyProjectFee = _buyProjectFee;
    
    uint256 private _sellProjectFee = 4;
    uint256 private _previousSellProjectFee = _sellProjectFee;
       
    address payable private _projectWallet;
    
    string private constant _name = "Ethereal Fluid";
    string private constant _symbol = "ICHOR";
    uint8 private constant _decimals = 9;
    
    IUniswapV2Router02 public uniswapV2Router;
    address public uniswapV2Pair;
    bool private tradingOpen;
    bool private swapping;
    bool private inSwap = false;
    bool private swapEnabled = false;
    bool private cooldownEnabled = false;
    uint256 private tradingActiveBlock = 0; // 0 means trading is not active
    uint256 private blocksToBlacklist = 9;
    uint256 private _maxBuyAmount = _tTotal;
    uint256 private _maxSellAmount = _tTotal;
    uint256 private _maxWalletAmount = _tTotal;
    uint256 private swapTokensAtAmount = 0;

    mapping(address => bool) public hasClaimed;
    address oldIchorAddress;
    
    event MaxBuyAmountUpdated(uint _maxBuyAmount);
    event MaxSellAmountUpdated(uint _maxSellAmount);
    
    modifier lockTheSwap {
        inSwap = true;
        _;
        inSwap = false;
    }

    constructor (address _uniswapV2Router, address projectWallet, address _oldIchorAddress) {
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);

        _projectWallet = payable(projectWallet);
        _rOwned[_msgSender()] = _tTotal;
        _isExcludedFromFee[owner()] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[_projectWallet] = true;
        emit Transfer(address(0), _msgSender(), _tTotal);

        oldIchorAddress = _oldIchorAddress;
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

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function setCooldownEnabled(bool onoff) external onlyOwner() {
        cooldownEnabled = onoff;
    }

    function setSwapEnabled(bool onoff) external onlyOwner(){
        swapEnabled = onoff;
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
        require(amount > 0, "Transfer amount must be greater than zero");
        bool takeFee = false;
        bool shouldSwap = false;
        if (from != owner() && to != owner() && to != address(0) && to != address(0xdead) && !swapping) {
            require(!bots[from] && !bots[to]);

            takeFee = true;
            if (from == uniswapV2Pair && to != address(uniswapV2Router) && !_isExcludedFromFee[to] && cooldownEnabled) {
                require(amount <= _maxBuyAmount, "Transfer amount exceeds the maxBuyAmount.");
                require(balanceOf(to) + amount <= _maxWalletAmount, "Exceeds maximum wallet token amount.");
                require(cooldown[to] < block.timestamp);
                cooldown[to] = block.timestamp + (30 seconds);
            }
            
            if (to == uniswapV2Pair && from != address(uniswapV2Router) && !_isExcludedFromFee[from] && cooldownEnabled) {
                require(amount <= _maxSellAmount, "Transfer amount exceeds the maxSellAmount.");
                shouldSwap = true;
            }
        }

        if(_isExcludedFromFee[from] || _isExcludedFromFee[to]) {
            takeFee = false;
        }

        uint256 contractTokenBalance = balanceOf(address(this));
        bool canSwap = (contractTokenBalance > swapTokensAtAmount) && shouldSwap;

        if (canSwap && swapEnabled && !swapping && !_isExcludedFromFee[from] && !_isExcludedFromFee[to]) {
            swapping = true;
            swapBack();
            swapping = false;
        }

        _tokenTransfer(from,to,amount,takeFee, shouldSwap);
    }

    function swapBack() private {
        uint256 tokensForProject = balanceOf(address(this));
        
        bool success;
        
        if(tokensForProject == 0) {return;}

        if(tokensForProject > swapTokensAtAmount * 10) {
            tokensForProject = swapTokensAtAmount * 10;
        }
                
        uint256 initialETHBalance = address(this).balance;

        swapTokensForEth(tokensForProject); 
                              
        (success,) = address(_projectWallet).call{value: address(this).balance - initialETHBalance}("");
    }

    //TODO finish method
    function claimTokensToHolder(
    ) external {
        require(!hasClaimed[msg.sender], "ICHOR: tokens already claimed!");
        uint256 amount = IICHOR(oldIchorAddress).balanceOf(msg.sender);
        //TODO ASK IF THERE WILL BE WALLET TO EXCHANGE OLD TOKENS TO NEWEST, OR WHAT.  
        //TRANSFER TOKENS FROM WHO?
        //IICHOR(oldIchorAddress).transferFrom(_from, msg.sender, amount);
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
       
    function openTrading() external onlyOwner() {
        require(!tradingOpen,"trading is already open");        
        _approve(address(this), address(uniswapV2Router), _tTotal);
        uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(address(this), uniswapV2Router.WETH());
        uniswapV2Router.addLiquidityETH{value: address(this).balance}(address(this),balanceOf(address(this)),0,0,owner(),block.timestamp);
        swapEnabled = true;
        cooldownEnabled = true;
        _maxBuyAmount = 5e7 * 10**9;
        _maxSellAmount = 5e7 * 10**9;
        _maxWalletAmount = 1e8 * 10**9;
        swapTokensAtAmount = 5e6 * 10**9;
        tradingOpen = true;
        tradingActiveBlock = block.number;
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
    }
    
    function setBots(address[] memory bots_) public onlyOwner {
        for (uint i = 0; i < bots_.length; i++) {
            bots[bots_[i]] = true;
        }
    }

    function setMaxBuyAmount(uint256 maxBuy) public onlyOwner {
        _maxBuyAmount = maxBuy;
    }

    function setMaxSellAmount(uint256 maxSell) public onlyOwner {
        _maxSellAmount = maxSell;
    }
    
    function setMaxWalletAmount(uint256 maxToken) public onlyOwner {
        _maxWalletAmount = maxToken;
    }
    
    function setSwapTokensAtAmount(uint256 newAmount) public onlyOwner {
        require(newAmount >= 1e3 * 10**9, "Swap amount cannot be lower than 0.001% total supply.");
        require(newAmount <= 5e6 * 10**9, "Swap amount cannot be higher than 0.5% total supply.");
        swapTokensAtAmount = newAmount;
    }

    function setProjectWallet(address projectWallet) public onlyOwner() {
        require(projectWallet != address(0), "projectWallet address cannot be 0");
        _isExcludedFromFee[_projectWallet] = false;
        _projectWallet = payable(projectWallet);
        _isExcludedFromFee[_projectWallet] = true;
    }

    function excludeFromFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = true;
    }
    
    function includeInFee(address account) public onlyOwner {
        _isExcludedFromFee[account] = false;
    }

    function setBuyFee(uint256 buyProjectFee) external onlyOwner {
        require(buyProjectFee <= 5, "Buy tax is hard coded to remain under 5%");
        _buyProjectFee = buyProjectFee;
    }

    function setSellFee(uint256 sellProjectFee) external onlyOwner {
        require(sellProjectFee <= 99, "this is to help get rid of bots at launch. rest assured there are no bots when you ape frens!");
        _sellProjectFee = sellProjectFee;
        
    }

    function setBlocksToBlacklist(uint256 blocks) public onlyOwner {
        blocksToBlacklist = blocks;
    }

    function removeAllFee() private {
        if(_buyProjectFee == 0 && _sellProjectFee == 0) return;
        
        _previousBuyProjectFee = _buyProjectFee;
        _previousSellProjectFee = _sellProjectFee;
                
        _buyProjectFee = 0;
        _sellProjectFee = 0;        
    }
    
    function restoreAllFee() private {
        _buyProjectFee = _previousBuyProjectFee;
        _sellProjectFee = _previousSellProjectFee;
    }
    
    function delBot(address notbot) public onlyOwner {
        bots[notbot] = false;
    }
        
    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee, bool isSell) private {
        if(!takeFee) {
            removeAllFee();
        } else {
            amount = _takeFees(sender, amount, isSell);
        }

        _transferStandard(sender, recipient, amount);
        
        if(!takeFee) {
            restoreAllFee();
        }
    }

    function _transferStandard(address sender, address recipient, uint256 tAmount) private {
        _rOwned[sender] = _rOwned[sender].sub(tAmount);
        _rOwned[recipient] = _rOwned[recipient].add(tAmount);
        emit Transfer(sender, recipient, tAmount);
    }

    function _takeFees(address sender, uint256 amount, bool isSell) private returns (uint256) {
        uint256 pjctFee;
        if(tradingActiveBlock + blocksToBlacklist >= block.number){
            pjctFee = 99;            
        } else {
            if (isSell) {
                pjctFee = _sellProjectFee;                
            } else {
                pjctFee = _buyProjectFee;                
            }
        }
                
        uint256 tokensForProject = amount.mul(pjctFee).div(100);
        if(tokensForProject > 0) {
            _transferStandard(sender, address(this), tokensForProject);
        }
            
        return amount -= tokensForProject;
    }

    receive() external payable {}

    function manualswap() public onlyOwner() {
        uint256 contractBalance = balanceOf(address(this));
        swapTokensForEth(contractBalance);
    }
    
    
    function withdrawStuckETH() external onlyOwner {
        bool success;
        (success,) = address(msg.sender).call{value: address(this).balance}("");
    }
}