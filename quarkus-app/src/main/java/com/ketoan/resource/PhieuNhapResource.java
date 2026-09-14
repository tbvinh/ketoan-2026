package com.ketoan.resource;

import com.ketoan.model.PhieuNhap;
import com.ketoan.repository.PhieuNhapRepository;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.SecurityContext;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.List;

@Path("/dashboard/phieunhap")
//@RolesAllowed("user")
public class PhieuNhapResource {

    @Inject
    PhieuNhapRepository repo;

    @CheckedTemplate
    public static class Templates {

        public static native TemplateInstance detail(PhieuNhap phieu);

        public static native TemplateInstance list(List<PhieuNhap> phieuList);

        public static native TemplateInstance newForm();
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance listAll() throws SQLException {
        return Templates.list(repo.findAll());
    }

    @GET
    @Path("/new")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance newForm() {
        return Templates.newForm();
    }

    @POST
    @Path("/new")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance createDraft(
            @Context SecurityContext ctx,
            @FormParam("nhaCungCap") String nhaCungCap) throws SQLException {
        String user = ctx.getUserPrincipal() != null ? ctx.getUserPrincipal().getName() : "unknown";
        String maPhieu = "PN" + System.currentTimeMillis();
        PhieuNhap p = repo.createDraft(maPhieu, nhaCungCap, user);
        return Templates.detail(p);
    }

    @GET
    @Path("/{id}")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance view(@PathParam("id") Long id) throws SQLException {
        PhieuNhap p = repo.findById(id);
        if (p == null) {
            throw new NotFoundException();
        }
        return Templates.detail(p);
    }

    @POST
    @Path("/{id}/chitiet")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance addChiTiet(
            @PathParam("id") Long id,
            @FormParam("vatTuId") Long vatTuId,
            @FormParam("tenHang") String tenHang,
            @FormParam("soLuong") BigDecimal soLuong,
            @FormParam("donGia") BigDecimal donGia) throws SQLException {

        if (vatTuId == null) {
            return GlobalTemplates.Templates.error("Vui lòng chọn vật tư từ danh mục, không tự nhập mã");
//            throw new BadRequestException("Vui lòng chọn vật tư từ danh mục, không tự nhập mã");
        }
        // ... (phần validate + insert giữ nguyên như trước)
        return Templates.detail(repo.findById(id));
    }

    @DELETE
    @Path("/{id}/chitiet/{lineId}")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance deleteChiTiet(
            @PathParam("id") Long id, @PathParam("lineId") Long lineId) throws SQLException {
        repo.deleteChiTiet(lineId);
        return Templates.detail(repo.findById(id));
    }

    @POST
    @Path("/{id}/confirm")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance confirm(@PathParam("id") Long id) throws SQLException {
        PhieuNhap p = repo.findById(id);
        if (p.chiTietList.isEmpty()) {
            throw new WebApplicationException("Phiếu chưa có dòng hàng nào", 400);
        }
        repo.confirm(id);
        return Templates.detail(repo.findById(id));
    }
}
