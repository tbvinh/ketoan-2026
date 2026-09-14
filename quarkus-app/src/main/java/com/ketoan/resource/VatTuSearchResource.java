package com.ketoan.resource;

import com.ketoan.model.VatTu;
import com.ketoan.repository.VatTuRepository;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;

import java.sql.SQLException;
import java.util.List;

@Path("/dashboard/vattu/search")
//@RolesAllowed("user")
public class VatTuSearchResource {

    @Inject
    VatTuRepository repo;

    @CheckedTemplate
    public static class Templates {
        public static native TemplateInstance suggestions(List<VatTu> items);
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance search(@QueryParam("q") String q) throws SQLException {
        if (q == null || q.isBlank()) {
            return Templates.suggestions(List.of());
        }
        return Templates.suggestions(repo.search(q.trim()));
    }
}