-- V00015: Quan tri he thong - vai tro, quyen chi tiet, nguoi dung
-- Chi THEM file migration moi, KHONG sua V00001..V00014.

-- 1. ROLES
CREATE TABLE roles (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_roles_code_lower ON roles (LOWER(code));

INSERT INTO roles (code, name, description) VALUES
('admin', 'Quản trị viên', 'Toàn quyền trên mọi chức năng'),
('user',  'Người dùng',  'Quyền theo ma trận phân quyền');

-- 2. USERS: bo sung ho ten + trang thai hoat dong
ALTER TABLE users ADD COLUMN full_name VARCHAR(150);
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE UNIQUE INDEX uq_users_username_lower ON users (LOWER(username));

-- 3. USER_ROLES
CREATE TABLE user_roles (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    CONSTRAINT uq_user_roles UNIQUE (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);
CREATE INDEX idx_user_roles_user ON user_roles (user_id);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON LOWER(r.code) = LOWER(u.role)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. PERMISSIONS: quyen chi tiet theo module + hanh dong
CREATE TABLE permissions (
    id     BIGSERIAL   PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    label  VARCHAR(150),
    CONSTRAINT uq_permissions_module_action UNIQUE (module, action),
    CONSTRAINT ck_permissions_action CHECK (action IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT'))
);

INSERT INTO permissions (module, action, label)
SELECT m.module, a.action, m.module || ':' || a.action
FROM (VALUES ('inventory'), ('catalog'), ('opening'), ('cash'), ('bank'), ('general'), ('reports')) AS m(module)
CROSS JOIN (VALUES ('READ'), ('CREATE'), ('UPDATE'), ('DELETE'), ('IMPORT'), ('EXPORT')) AS a(action);

-- 5. ROLE_PERMISSIONS
CREATE TABLE role_permissions (
    id            BIGSERIAL PRIMARY KEY,
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);
CREATE INDEX idx_role_permissions_role ON role_permissions (role_id);

-- Quyen mac dinh cho vai tro "user" (admin luon full quyen, khong luu trong bang)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON TRUE
WHERE r.code = 'user' AND (
       (p.module = 'inventory' AND p.action IN ('READ', 'CREATE', 'UPDATE', 'IMPORT', 'EXPORT'))
    OR (p.module = 'catalog'   AND p.action IN ('READ', 'CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT'))
    OR (p.module = 'opening'   AND p.action IN ('READ', 'CREATE', 'UPDATE', 'DELETE'))
    OR (p.module = 'cash'      AND p.action IN ('READ', 'CREATE', 'UPDATE'))
    OR (p.module = 'bank'      AND p.action IN ('READ', 'CREATE', 'UPDATE'))
    OR (p.module = 'general'   AND p.action IN ('READ', 'CREATE', 'UPDATE'))
    OR (p.module = 'reports'   AND p.action IN ('READ'))
);
