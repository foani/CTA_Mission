// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AccountAbstractionWallet
 * @dev 소셜 로그인 기반 Account Abstraction 지갑 컨트랙트
 * @notice Web3Auth를 통한 소셜 로그인으로 자동 생성되는 지갑
 */
contract AccountAbstractionWallet is Ownable, ReentrancyGuard {
    
    // 지갑 정보 구조체
    struct WalletInfo {
        address walletAddress;
        string socialId;        // 소셜 로그인 ID (google:123456789 형태)
        string socialProvider;  // google, apple, kakao 등
        uint256 createdAt;
        bool isActive;
    }
    
    // 소셜 ID -> 지갑 주소 매핑
    mapping(string => address) public socialIdToWallet;
    
    // 지갑 주소 -> 지갑 정보 매핑
    mapping(address => WalletInfo) public walletInfo;
    
    // 등록된 모든 지갑 주소들
    address[] public walletList;
    
    // 이벤트
    event WalletCreated(
        address indexed walletAddress,
        string socialId,
        string socialProvider,
        uint256 timestamp
    );
    
    event WalletActivated(address indexed walletAddress, bool isActive);
    
    event NativeTokenReceived(address indexed from, uint256 amount);
    
    /**
     * @dev 생성자
     * @param _initialOwner 초기 소유자 주소
     */
    constructor(address _initialOwner) Ownable(_initialOwner) {}
    
    /**
     * @dev 소셜 로그인 기반 지갑 생성
     * @param _walletAddress 생성할 지갑 주소
     * @param _socialId 소셜 로그인 ID
     * @param _socialProvider 소셜 제공자 (google, apple, kakao)
     */
    function createWallet(
        address _walletAddress,
        string memory _socialId,
        string memory _socialProvider
    ) external onlyOwner {
        require(_walletAddress != address(0), "Invalid wallet address");
        require(bytes(_socialId).length > 0, "Social ID cannot be empty");
        require(socialIdToWallet[_socialId] == address(0), "Social ID already registered");
        require(walletInfo[_walletAddress].walletAddress == address(0), "Wallet already exists");
        
        // 지갑 정보 저장
        WalletInfo memory newWallet = WalletInfo({
            walletAddress: _walletAddress,
            socialId: _socialId,
            socialProvider: _socialProvider,
            createdAt: block.timestamp,
            isActive: true
        });
        
        socialIdToWallet[_socialId] = _walletAddress;
        walletInfo[_walletAddress] = newWallet;
        walletList.push(_walletAddress);
        
        emit WalletCreated(_walletAddress, _socialId, _socialProvider, block.timestamp);
    }
    
    /**
     * @dev 소셜 ID로 지갑 주소 조회
     * @param _socialId 소셜 로그인 ID
     * @return 지갑 주소
     */
    function getWalletBySocialId(string memory _socialId) external view returns (address) {
        return socialIdToWallet[_socialId];
    }
    
    /**
     * @dev 지갑 주소로 지갑 정보 조회
     * @param _walletAddress 지갑 주소
     * @return 지갑 정보
     */
    function getWalletInfo(address _walletAddress) external view returns (WalletInfo memory) {
        return walletInfo[_walletAddress];
    }
    
    /**
     * @dev 지갑 활성화/비활성화
     * @param _walletAddress 지갑 주소
     * @param _isActive 활성화 여부
     */
    function setWalletActive(address _walletAddress, bool _isActive) external onlyOwner {
        require(walletInfo[_walletAddress].walletAddress != address(0), "Wallet does not exist");
        
        walletInfo[_walletAddress].isActive = _isActive;
        emit WalletActivated(_walletAddress, _isActive);
    }
    
    /**
     * @dev 지갑이 등록되어 있는지 확인
     * @param _walletAddress 확인할 지갑 주소
     * @return 등록 여부
     */
    function isWalletRegistered(address _walletAddress) external view returns (bool) {
        return walletInfo[_walletAddress].walletAddress != address(0);
    }
    
    /**
     * @dev 지갑이 활성화되어 있는지 확인
     * @param _walletAddress 확인할 지갑 주소
     * @return 활성화 여부
     */
    function isWalletActive(address _walletAddress) external view returns (bool) {
        return walletInfo[_walletAddress].isActive;
    }
    
    /**
     * @dev 전체 등록된 지갑 수 반환
     * @return 등록된 지갑 수
     */
    function getTotalWallets() external view returns (uint256) {
        return walletList.length;
    }
    
    /**
     * @dev 특정 범위의 지갑 목록 반환 (페이징)
     * @param _start 시작 인덱스
     * @param _end 끝 인덱스
     * @return 지갑 주소 배열
     */
    function getWalletList(uint256 _start, uint256 _end) external view returns (address[] memory) {
        require(_start <= _end, "Invalid range");
        require(_end < walletList.length, "End index out of bounds");
        
        uint256 length = _end - _start + 1;
        address[] memory result = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            result[i] = walletList[_start + i];
        }
        
        return result;
    }
    
    /**
     * @dev 네이티브 토큰(CTA) 수신 처리
     */
    receive() external payable {
        emit NativeTokenReceived(msg.sender, msg.value);
    }
    
    /**
     * @dev 응급 상황 시 컨트랙트의 네이티브 토큰 회수
     * @param _amount 회수할 금액
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner nonReentrant {
        require(address(this).balance >= _amount, "Insufficient contract balance");
        
        (bool success, ) = payable(owner()).call{value: _amount}("");
        require(success, "Transfer failed");
    }
    
    /**
     * @dev 컨트랙트의 현재 네이티브 토큰 잔액 조회
     * @return 잔액
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
