package com.ketoan.model;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class PhieuNhap {

    public Long id;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public String maPhieu;
    public String nhaCungCap;
    public Timestamp  ngayTao;
    public String status;
    public String createdBy;
    public List<ChiTietPhieuNhap> chiTietList = new ArrayList<>();

    public String getMaPhieu() {
        return maPhieu;
    }

    public void setMaPhieu(String maPhieu) {
        this.maPhieu = maPhieu;
    }

    public String getNhaCungCap() {
        return nhaCungCap;
    }

    public void setNhaCungCap(String nhaCungCap) {
        this.nhaCungCap = nhaCungCap;
    }

    public Timestamp  getNgayTao() {
        return ngayTao;
    }

    public void setNgayTao(Timestamp  ngayTao) {
        this.ngayTao = ngayTao;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public BigDecimal getTongTien() {
        return chiTietList.stream()
                .map(ct -> ct.thanhTien)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
