package com.ketoan.resource;

import com.ketoan.entity.DmCongTy;
import com.ketoan.service.CompanyService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import io.quarkus.security.Authenticated;

@Path("/companies")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CompanyResource {

    @Inject
    CompanyService companyService;

    @GET
    @Authenticated
    public List<Map<String, Object>> list() {
        return companyService.listActive().stream().map(c -> view(c, false)).collect(Collectors.toList());
    }

    @GET
    @Path("/all")
    @RolesAllowed("admin")
    public List<Map<String, Object>> all() {
        return companyService.listAll().stream().map(c -> view(c, true)).collect(Collectors.toList());
    }

    @POST
    @RolesAllowed("admin")
    public Response create(DmCongTy req) {
        return Response.status(Response.Status.CREATED).entity(view(companyService.create(req), true)).build();
    }

    @PUT
    @Path("/{id}")
    @RolesAllowed("admin")
    public Map<String, Object> update(@PathParam("id") Long id, DmCongTy req) {
        return view(companyService.update(id, req), true);
    }

    @DELETE
    @Path("/{id}")
    @RolesAllowed("admin")
    public Response delete(@PathParam("id") Long id) {
        companyService.delete(id);
        return Response.noContent().build();
    }

    private static Map<String, Object> view(DmCongTy company, boolean admin) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", company.id);
        row.put("code", company.code);
        row.put("name", company.name);
        row.put("address", company.address);
        row.put("taxCode", company.taxCode);
        row.put("phone", company.phone);
        row.put("status", company.status);
        if (admin) {
            row.put("schemaName", company.schemaName);
            row.put("createdAt", company.createdAt);
        }
        return row;
    }
}
