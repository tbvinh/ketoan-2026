package com.ketoan.resource;

import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.annotation.security.RolesAllowed;
import jakarta.ws.rs.core.Response;

@Path("/dashboard")
public class DashboardResource {

    @Inject
    SecurityIdentity identity;
    @Inject
    @Location("dashboard/main.html")
    Template dashboard_main; // ánh xạ tới templates/dashboard/main.html

    @GET
    @Produces("text/html; charset=UTF-8")
//    @RolesAllowed("user")
    public Response showDashboard() {
        System.out.println("Principal: " + identity.getPrincipal().getName());
        System.out.println("Roles: " + identity.getRoles());

//        return dashboard_main.instance();
        return Response.ok(dashboard_main.instance())
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .build();
    }
}
