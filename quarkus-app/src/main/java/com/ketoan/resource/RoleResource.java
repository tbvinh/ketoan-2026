package com.ketoan.resource;

import com.ketoan.entity.Role;
import com.ketoan.service.AdminService;
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
import java.util.List;
import java.util.Map;

@Path("/roles")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RolesAllowed("admin")
public class RoleResource {

    @Inject
    AdminService adminService;

    @GET
    public List<Map<String, Object>> list() {
        return adminService.listRoles();
    }

    @POST
    public Response create(Role role) {
        return Response.status(Response.Status.CREATED).entity(adminService.createRole(role)).build();
    }

    @PUT
    @Path("/{id}")
    public Role update(@PathParam("id") Long id, Role role) {
        return adminService.updateRole(id, role);
    }

    @DELETE
    @Path("/{id}")
    public Response delete(@PathParam("id") Long id) {
        adminService.deleteRole(id);
        return Response.noContent().build();
    }

    @GET
    @Path("/{id}/permissions")
    public Map<String, Map<String, Boolean>> permissions(@PathParam("id") Long id) {
        return adminService.rolePermissions(id);
    }

    @PUT
    @Path("/{id}/permissions")
    public Response savePermissions(@PathParam("id") Long id, Map<String, Map<String, Boolean>> permissions) {
        adminService.saveRolePermissions(id, permissions);
        return Response.noContent().build();
    }
}
