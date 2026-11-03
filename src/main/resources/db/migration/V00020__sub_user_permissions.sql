-- V00020: Phan quyen chi tiet tren tung Sub-user cua Chu so huu cong ty (Owner).
-- Chi THEM file migration moi, KHONG sua V00001..V00019.

ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_permissions BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS user_permissions (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_permissions UNIQUE (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions (user_id);

