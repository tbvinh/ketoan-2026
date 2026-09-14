package com.ketoan;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;

@Path("/danhmuc")
public class DanhMucTaiKhoanResource {
    @Inject
    Template danhmucKetoan;
    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String hello() {
        return "Hello RESTEasy 2.0";
    }

    @GET
    @Path("/ketoan")

    @Produces("text/html; charset=UTF-8")
    public TemplateInstance viewDanhMuc() throws SQLException {
        
        return danhmucKetoan.data("test", "Danh mục kết toán");
    }
}
