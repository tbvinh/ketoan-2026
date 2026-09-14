package com.ketoan.model;

import java.math.BigDecimal;

public class ChiTietPhieuNhap {
    public Long id;
    public Long phieuNhapId;
    public String maHang;
    public String tenHang;
    public BigDecimal soLuong;
    public BigDecimal donGia;
    public BigDecimal thanhTien;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPhieuNhapId() {
        return phieuNhapId;
    }

    public void setPhieuNhapId(Long phieuNhapId) {
        this.phieuNhapId = phieuNhapId;
    }

    public String getMaHang() {
        return maHang;
    }

    public void setMaHang(String maHang) {
        this.maHang = maHang;
    }

    public String getTenHang() {
        return tenHang;
    }

    public void setTenHang(String tenHang) {
        this.tenHang = tenHang;
    }

    public BigDecimal getSoLuong() {
        return soLuong;
    }

    public void setSoLuong(BigDecimal soLuong) {
        this.soLuong = soLuong;
    }

    public BigDecimal getDonGia() {
        return donGia;
    }

    public void setDonGia(BigDecimal donGia) {
        this.donGia = donGia;
    }

    public BigDecimal getThanhTien() {
        return thanhTien;
    }

    public void setThanhTien(BigDecimal thanhTien) {
        this.thanhTien = thanhTien;
    }
    
    
}