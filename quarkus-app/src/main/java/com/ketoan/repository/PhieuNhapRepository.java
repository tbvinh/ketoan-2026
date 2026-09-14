package com.ketoan.repository;

import com.ketoan.model.ChiTietPhieuNhap;
import com.ketoan.model.PhieuNhap;
import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.handlers.BeanHandler;
import org.apache.commons.dbutils.handlers.BeanListHandler;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;

@ApplicationScoped
public class PhieuNhapRepository {

    @Inject
    DataSource dataSource;

    private QueryRunner run;

    @PostConstruct
    void init() {
        // QueryRunner tự lấy/đóng connection từ dataSource cho MỖI lệnh gọi
        // KHÔNG được gọi dataSource.getConnection() thủ công ở bất kỳ đâu bên dưới
        run = new QueryRunner(dataSource);
    }

    private final BeanListHandler<PhieuNhap> LIST_HANDLER =
        new BeanListHandler<>(PhieuNhap.class, new SnakeCaseRowProcessor());
    
    public PhieuNhap createDraft(String maPhieu, String nhaCungCap, String createdBy) throws SQLException {
        String sql = "INSERT INTO phieu_nhap (ma_phieu, nha_cung_cap, status, created_by) " +
                     "VALUES (?, ?, 'DRAFT', ?) RETURNING id";
        Long id = run.query(sql, rs -> { rs.next(); return rs.getLong(1); }, maPhieu, nhaCungCap, createdBy);
        return findById(id);
    }

    public PhieuNhap findById(Long id) throws SQLException {
        String sql = "SELECT id, ma_phieu, nha_cung_cap, ngay_tao, status, created_by " +
                     "FROM phieu_nhap WHERE id = ?";
        PhieuNhap p = run.query(sql, new BeanHandler<>(PhieuNhap.class,new SnakeCaseRowProcessor()), id);
        if (p != null) {
            p.chiTietList = findChiTietByPhieuId(id);
        }
        return p;
    }

    public List<PhieuNhap> findAll() throws SQLException {
        String sql = "SELECT id, ma_phieu, nha_cung_cap , ngay_tao, status, created_by " +
                     "FROM phieu_nhap ORDER BY ngay_tao DESC";
        return run.query(sql, LIST_HANDLER);
    }

    public void confirm(Long id) throws SQLException {
        run.update("UPDATE phieu_nhap SET status = 'CONFIRMED' WHERE id = ?", id);
    }

    public List<ChiTietPhieuNhap> findChiTietByPhieuId(Long phieuNhapId) throws SQLException {
        String sql = "SELECT id, phieu_nhap_id, ma_hang, ten_hang, so_luong, don_gia, thanh_tien " +
                     "FROM phieu_nhap_chi_tiet WHERE phieu_nhap_id = ? ORDER BY id";
        return run.query(sql, new BeanListHandler<>(ChiTietPhieuNhap.class, new SnakeCaseRowProcessor()), phieuNhapId);
    }

    public void addChiTiet(Long phieuNhapId, String maHang, String tenHang,
                            BigDecimal soLuong, BigDecimal donGia) throws SQLException {
        String sql = "INSERT INTO phieu_nhap_chi_tiet (phieu_nhap_id, ma_hang, ten_hang, so_luong, don_gia) " +
                     "VALUES (?, ?, ?, ?, ?)";
        run.update(sql, phieuNhapId, maHang, tenHang, soLuong, donGia);
    }

    public void deleteChiTiet(Long chiTietId) throws SQLException {
        run.update("DELETE FROM phieu_nhap_chi_tiet WHERE id = ?", chiTietId);
    }
}