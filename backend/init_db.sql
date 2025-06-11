-- CTA Mission 데이터베이스 스키마
-- PostgreSQL 용 테이블 생성 스크립트

-- 1. Users 테이블 (사용자 정보)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42) UNIQUE,
    social_provider VARCHAR(50), -- 'google', 'apple', 'kakao'
    social_id VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url TEXT,
    total_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Missions 테이블 (미션 정의)
CREATE TABLE IF NOT EXISTS missions (
    id SERIAL PRIMARY KEY,
    mission_type VARCHAR(50) NOT NULL, -- 'WALLET_INSTALL', 'HOMEPAGE_VISIT'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User_Missions 테이블 (사용자별 미션 완료 상태)
CREATE TABLE IF NOT EXISTS user_missions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    mission_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'FAILED'
    completed_at TIMESTAMP WITH TIME ZONE,
    verification_data JSONB, -- 검증 관련 데이터
    reward_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE,
    UNIQUE(user_id, mission_id)
);

-- 4. Point_History 테이블 (포인트 이력)
CREATE TABLE IF NOT EXISTS point_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    mission_id INTEGER,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'EARNED', 'SPENT', 'AIRDROP'
    description TEXT,
    reference_id VARCHAR(255), -- 트랜잭션 참조 ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE SET NULL
);

-- 5. 기본 미션 데이터 삽입
INSERT INTO missions (mission_type, title, description, reward_points, order_index) VALUES
('WALLET_INSTALL', '크리에이타 월렛 설치', 'Google Play Store에서 크리에이타 월렛을 설치하세요', 100, 1),
('HOMEPAGE_VISIT', '홈페이지 방문', 'CTA Mission 공식 홈페이지를 방문하세요', 50, 2)
ON CONFLICT DO NOTHING;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_point_history_user_id ON point_history(user_id);
CREATE INDEX IF NOT EXISTS idx_point_history_created_at ON point_history(created_at);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_missions_updated_at BEFORE UPDATE ON user_missions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();