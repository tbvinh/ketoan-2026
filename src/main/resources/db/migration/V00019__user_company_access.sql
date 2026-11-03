-- V00019: Phan quyen nguoi dung theo tung cong ty (tenant) va vai tro Chu so huu cong ty (company_admin / owner).
-- Chi THEM file migration moi, KHONG sua V00001..V00018.

-- 1. Them vai tro company_admin (Chu so huu cong ty / Owner) co day du quyen nghiep vu trong pham vi cong ty duoc gan
INSERT INTO roles (code, name, description)
SELECT 'company_admin', 'Chủ sở hữu công ty (Owner)', 'Toàn quyền nghiệp vụ kế toán trong các công ty được phân quyền'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE LOWER(code) = 'company_admin');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE LOWER(r.code) = 'company_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Bo sung cot default_company_id va allow_public cho bang users
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_company_id BIGINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_public BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users SET allow_public = TRUE WHERE allow_public IS DISTINCT FROM TRUE;

-- 3. Bang anh xa User <-> Cong ty (user_companies)
CREATE TABLE IF NOT EXISTS user_companies (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_id  BIGINT    NOT NULL REFERENCES dmcongty (id) ON DELETE CASCADE,
    is_owner    BOOLEAN   NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_companies UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user ON user_companies (user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON user_companies (company_id);

