-- V00016: Danh muc cong ty (master schema). Chay o public va moi schema tenant.
CREATE TABLE dmcongty (
    id          BIGSERIAL    PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    schema_name VARCHAR(63)  NOT NULL,
    status      VARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_dmcongty_code UNIQUE (code),
    CONSTRAINT uq_dmcongty_schema UNIQUE (schema_name),
    CONSTRAINT ck_dmcongty_status CHECK (status IN ('active', 'inactive'))
);

CREATE UNIQUE INDEX uq_dmcongty_code_lower ON dmcongty (LOWER(code));
CREATE INDEX idx_dmcongty_status ON dmcongty (status);
