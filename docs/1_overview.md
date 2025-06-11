# CTA Mission 프로젝트 개요

## 📋 프로젝트 정보

**프로젝트명**: CTA Mission - Catena Network Crypto Price Prediction DApp  
**버전**: v1.0.0  
**개발 기간**: 2025년 6월 ~ (빠른 개발을 위한 오픈소스 활용)  
**라이선스**: MIT License  

## 🎯 프로젝트 목표

### 핵심 목표
1. **Catena(CIP-20) 메인넷**에서 CTA 네이티브 토큰을 활용한 DApp 구축
2. **크립토 가격 업다운(UP/DOWN) 예측** 미션게임 제공
3. **점수 기반 랭킹 시스템**을 통한 경쟁 요소 도입
4. **자동 CTA 에어드롭**으로 사용자 참여 동기 부여
5. **소셜 로그인 기반 Account Abstraction**으로 Web3 진입장벽 완화

### 사용자 경험 목표
- 🔐 **시드/프라이빗키 관리 없는** 간편한 DApp 사용
- 🌍 **다국어 지원** (한국어, 영어, 베트남어, 일본어)
- 📱 **웹 기반 반응형** 인터페이스
- ⚡ **실시간 가격 데이터**를 활용한 몰입감 있는 게임
- 🏆 **주기별 랭킹과 보상**으로 지속적인 참여 유도

## 🎮 주요 기능

### 1. 크립토 가격 예측 게임
- **참여 조건**: 사전 미션 수행 필수
  - Creata Wallet 설치: https://play.google.com/store/search?q=creata+wallet&c=apps&hl=1
  - 홈페이지 방문: https://creatachain.com/ourstory (10초간 머무르기)
- **대상 토큰**: BTC, ETH, CTA 등 주요 암호화폐
- **게임 방식**: 일정 시간 후 가격의 업다운 예측
- **점수 시스템**: 예측 정확도에 따른 점수 부여
- **실시간 가격**: Binance API, CryptoCompare 등 활용

### 2. 랭킹 및 보상 시스템
- **랭킹 산정**: 누적 점수 기반 실시간 랭킹
- **보상 등급**:
  - 🥇 **1등**: 1명 - 1,000 CTA + 5,000 USDT
  - 🥈 **2등**: 20명 - 50 CTA + 250 USDT
  - 🥉 **3등**: 500명 - 2 CTA
  - 🏅 **4등**: 1,000명 - 1 CTA
  - 🎖️ **5등**: 2,000명 - 0.5 CTA
  - 🎗️ **6등**: 5,000명 - 0.2 CTA
  - 🏵️ **7등**: 10,000명 - 0.1 CTA
- **수동 지급**: 수동지급 솔루션 만들것것

### 3. 소셜 로그인 & Account Abstraction
- **지원 플랫폼**: Google, Apple, Kakao
- **지갑 자동 생성**: Web3Auth 기반 AA 지갑
- **복구 시스템**: 2FA, OTP 등 보안 지원
- **사용자 편의**: 가스비 추상화, 메타마스크 불필요

### 4. 다국어 지원
- **한국어** (기본): 한국 사용자 대상
- **영어**: 글로벌 사용자 대상  
- **베트남어**: 동남아시아 시장 확장
- **일본어**: 일본 시장 진출

## 🔧 기술 스택

### Frontend
- **프레임워크**: React 18+ with Hooks
- **빌드 도구**: Vite (빠른 개발 환경)
- **언어**: TypeScript (타입 안정성)
- **스타일링**: Tailwind CSS (빠른 UI 개발)
- **상태 관리**: Zustand or Context API
- **Web3 연동**: Web3Auth, WalletConnect, Web3Modal

### Backend
- **런타임**: Node.js 18+
- **프레임워크**: Express.js (안정성과 생태계)
- **언어**: TypeScript (프론트엔드와 일관성)
- **데이터베이스**: PostgreSQL
- **실시간 통신**: Socket.io (가격 업데이트)
- **인증**: OAuth2 (Google, Apple, Kakao)
- **API**: RESTful API + WebSocket
### Blockchain & Smart Contracts
- **네트워크**: Catena Network (CIP-20)
- **언어**: Solidity ^0.8.19
- **개발 도구**: Hardhat
- **컨트랙트 종류**:
  - Account Abstraction Wallet
  - Prediction Game Manager
  - Ranking & Airdrop Manager
  - Ranking & Airdrop Manager

### Infrastructure & DevOps
- **컨테이너**: Docker & Docker Compose
- **배포**: PM2 (Node.js 프로세스 관리)
- **모니터링**: Winston (로깅)
- **환경 관리**: dotenv (환경변수)

## 🌍 Catena 네트워크 정보

### 네트워크 설정
- **네트워크명**: Catena Mainnet
- **RPC URL**: https://cvm.node.creatachain.com
- **Chain ID**: 1000 (0x3E8)
- **네이티브 토큰**: CTA
- **익스플로러**: https://catena.explorer.creatachain.com

### CTA 토큰 특징
- **토큰 표준**: CIP-20 (Catena 네이티브)
- **용도**: 게임 보상, 가스비, 거버넌스
- **배포 방식**: 자동 멀티센드 스마트컨트랙트

## 🚀 개발 전략

### 빠른 개발을 위한 오픈소스 활용
1. **UI/UX**: 기존 prediction game UI 템플릿 활용
2. **Web3 연동**: Web3Auth 예제 코드 활용
3. **스마트컨트랙트**: OpenZeppelin, Airdrop 컨트랙트 활용
4. **백엔드**: Express 보일러플레이트 활용

### 개발 우선순위
1. **Phase 1**: 기본 구조 및 소셜 로그인
2. **Phase 2**: 가격 예측 게임 코어 로직
3. **Phase 3**: 랭킹 시스템 및 스마트컨트랙트
4. **Phase 4**: 에어드롭 자동화 및 다국어 지원
5. **Phase 5**: 최적화 및 배포

## 🎯 성공 지표

### 사용자 지표
- **MAU (월 활성 사용자)**: 1,000명+
- **게임 참여율**: 일일 50%+
- **리텐션**: 30일 리텐션 20%+

### 기술 지표  
- **응답 시간**: API 응답 < 200ms
- **가동 시간**: 99.9% 업타임
- **가스 효율성**: 트랜잭션 비용 최적화

### 비즈니스 지표
- **에어드롭 참여**: 주간 80%+ 참여율
- **커뮤니티 성장**: 소셜 미디어 팔로워 증가
- **파트너십**: Catena 생태계 내 협력 확대

## 🤝 참여 방법

### 개발자
- GitHub 레포지토리 기여
- 이슈 리포팅 및 PR 제출
- 코드 리뷰 참여

### 커뮤니티
- 베타 테스트 참여
- 피드백 제공
- 버그 리포팅

### 파트너
- Catena 생태계 프로젝트 협력
- 크로스 프로모션
- 기술 협력

---

**📞 연락처**  
- **프로젝트 리드**: [담당자 정보]  
- **기술 문의**: [기술팀 연락처]  
- **비즈니스 문의**: [비즈니스팀 연락처]  

---

*본 문서는 CTA Mission 프로젝트의 전체적인 비전과 방향성을 제시합니다. 세부 기술 사양은 별도 문서를 참조하시기 바랍니다.*