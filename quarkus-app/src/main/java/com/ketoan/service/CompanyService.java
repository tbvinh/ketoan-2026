package com.ketoan.service;

import com.ketoan.entity.DmCongTy;
import com.ketoan.tenant.TenantRegistry;
import io.quarkus.narayana.jta.QuarkusTransaction;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/** Quan ly danh muc cong ty va cap schema tenant. */
@ApplicationScoped
public class CompanyService {

    private static final Pattern SCHEMA = Pattern.compile("[a-z][a-z0-9_]{1,62}");

    @Inject
    EntityManager em;

    @Inject
    TenantProvisioner provisioner;

    @Inject
    TenantRegistry registry;

    public List<DmCongTy> listActive() {
        return DmCongTy.list("status = ?1 order by name", "active");
    }

    public List<DmCongTy> listAll() {
        return DmCongTy.list("order by id");
    }

    public DmCongTy create(DmCongTy req) {
        if (req == null || blank(req.code)) throw bad("Mã công ty không được để trống");
        if (blank(req.name)) throw bad("Tên công ty không được để trống");
        validateInfo(req);

        String code = req.code.trim();
        if (code.length() > 50) throw bad("Mã công ty tối đa 50 ký tự");
        if (req.name.trim().length() > 150) throw bad("Tên công ty tối đa 150 ký tự");
        String status = blank(req.status) ? "active" : req.status.trim().toLowerCase(Locale.ROOT);
        if (!"active".equals(status) && !"inactive".equals(status)) throw bad("Trạng thái không hợp lệ");
        String schema = blank(req.schemaName) ? generateSchema(code) : req.schemaName.trim().toLowerCase(Locale.ROOT);
        validateSchema(schema);
        if (DmCongTy.findByCode(code) != null) throw conflict("Mã công ty đã tồn tại");
        if (DmCongTy.findBySchema(schema) != null) throw conflict("Schema tenant đã tồn tại");

        provisioner.createSchema(schema);
        try {
            provisioner.migrate(schema);
        } catch (RuntimeException e) {
            provisioner.dropSchema(schema);
            throw bad("Không thể khởi tạo schema tenant: " + e.getMessage());
        }

        DmCongTy company = new DmCongTy();
        company.code = code;
        company.name = req.name.trim();
        company.address = clean(req.address);
        company.taxCode = clean(req.taxCode);
        company.phone = clean(req.phone);
        company.schemaName = schema;
        company.status = status;
        company.createdAt = LocalDateTime.now();
        try {
            QuarkusTransaction.requiringNew().run(() -> {
                company.persist();
                em.flush();
            });
        } catch (RuntimeException e) {
            provisioner.dropSchema(schema);
            throw conflict("Không thể lưu công ty: " + e.getMessage());
        }
        registry.refresh();
        return company;
    }

    @Transactional
    public DmCongTy update(Long id, DmCongTy req) {
        DmCongTy company = find(id);
        if (req == null) throw bad("Dữ liệu không hợp lệ");
        validateInfo(req);
        if (!blank(req.name)) company.name = req.name.trim();
        if (req.address != null) company.address = clean(req.address);
        if (req.taxCode != null) company.taxCode = clean(req.taxCode);
        if (req.phone != null) company.phone = clean(req.phone);
        if (!blank(req.status)) {
            String status = req.status.trim().toLowerCase(Locale.ROOT);
            if (!"active".equals(status) && !"inactive".equals(status)) throw bad("Trạng thái không hợp lệ");
            company.status = status;
        }
        registry.refresh();
        return company;
    }

    public void delete(Long id) {
        DmCongTy company = find(id);
        if ("public".equalsIgnoreCase(company.schemaName)) throw bad("Không thể xóa schema public");
        provisioner.dropSchema(company.schemaName);
        QuarkusTransaction.requiringNew().run(() -> DmCongTy.deleteById(id));
        registry.refresh();
    }

    private DmCongTy find(Long id) {
        DmCongTy company = em.find(DmCongTy.class, id);
        if (company == null) throw notFound("Không tìm thấy công ty");
        return company;
    }

    public static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static String clean(String value) {
        return blank(value) ? null : value.trim();
    }

    private static void validateInfo(DmCongTy req) {
        if (req.address != null && req.address.trim().length() > 500) throw bad("Địa chỉ tối đa 500 ký tự");
        if (req.taxCode != null && req.taxCode.trim().length() > 50) throw bad("Mã số thuế tối đa 50 ký tự");
        if (req.phone != null && req.phone.trim().length() > 50) throw bad("Điện thoại tối đa 50 ký tự");
    }

    private static void validateSchema(String schema) {
        if (schema == null || "public".equalsIgnoreCase(schema) || !SCHEMA.matcher(schema).matches()) {
            throw bad("Schema tenant không hợp lệ (chữ thường, số, _; không dùng public)");
        }
    }

    private static String generateSchema(String code) {
        String base = code.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
        if (base.isBlank()) base = "company";
        String schema = "tenant_" + base;
        return schema.length() > 63 ? schema.substring(0, 63) : schema;
    }

    private static WebApplicationException bad(String message) {
        return new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("message", message)).type(MediaType.APPLICATION_JSON).build());
    }

    private static WebApplicationException conflict(String message) {
        return new WebApplicationException(Response.status(Response.Status.CONFLICT)
                .entity(Map.of("message", message)).type(MediaType.APPLICATION_JSON).build());
    }

    private static WebApplicationException notFound(String message) {
        return new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("message", message)).type(MediaType.APPLICATION_JSON).build());
    }
}
