package com.ketoan.repository;

import com.ketoan.model.VatTu;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.handlers.BeanListHandler;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.List;

@ApplicationScoped
public class VatTuRepository {

    @Inject
    DataSource dataSource;

    
    private QueryRunner run;

    @PostConstruct
    void init() {
        // QueryRunner tự lấy/đóng connection từ dataSource cho MỖI lệnh gọi
        // KHÔNG được gọi dataSource.getConnection() thủ công ở bất kỳ đâu bên dưới
        run = new QueryRunner(dataSource);
    }
    public List<VatTu> search(String keyword) throws SQLException {
        String sql = "SELECT id, ma_hang, ten_hang, don_vi_tinh, gia_nhap_gan_nhat "
                + "FROM vat_tu "
                + "WHERE ma_hang ILIKE ? OR ten_hang ILIKE ? "
                + "ORDER BY ma_hang LIMIT 10";
        String pattern = "%" + keyword + "%";
        return run.query(dataSource.getConnection(), sql,
                new BeanListHandler<>(VatTu.class,new SnakeCaseRowProcessor()), pattern, pattern);
    }

    public VatTu findById(Long id) throws SQLException {
        String sql = "SELECT id, ma_hang, ten_hang, don_vi_tinh, gia_nhap_gan_nhat "
                + "FROM vat_tu WHERE id = ?";
        return run.query(dataSource.getConnection(), sql,
                new org.apache.commons.dbutils.handlers.BeanHandler<>(VatTu.class,new SnakeCaseRowProcessor()), id);
    }
}
