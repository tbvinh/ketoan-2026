-- Thêm loại phiếu điều chuyển (transfer) vào ràng buộc CHECK
ALTER TABLE inv_doc DROP CONSTRAINT inv_doc_type_check;
ALTER TABLE inv_doc ADD CONSTRAINT inv_doc_type_check
    CHECK (type IN ('import', 'export', 'return', 'transfer'));

ALTER TABLE inv_doc_counter DROP CONSTRAINT inv_doc_counter_type_check;
ALTER TABLE inv_doc_counter ADD CONSTRAINT inv_doc_counter_type_check
    CHECK (type IN ('import', 'export', 'return', 'transfer'));

INSERT INTO inv_doc_counter (type) VALUES ('transfer') ON CONFLICT (type) DO NOTHING;
