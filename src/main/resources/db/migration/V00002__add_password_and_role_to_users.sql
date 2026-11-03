-- Script migration thêm cột password và role vào bảng users
ALTER TABLE users 
    ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'USER';

--password = 123
INSERT INTO users (username, password, role) VALUES  
    ('admin', '$2a$10$FezjqxqiO09kuw87QQW1sOMMvvnmKKVCtTluhh./Q2oUMA5k9upl6', 'admin'),
    ('user1', '$2a$10$FezjqxqiO09kuw87QQW1sOMMvvnmKKVCtTluhh./Q2oUMA5k9upl6', 'user'),
    ('vinhtran', '$2a$10$FezjqxqiO09kuw87QQW1sOMMvvnmKKVCtTluhh./Q2oUMA5k9upl6', 'user');


