/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.resource;

import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/toolbar")
public class ToolbarResource {

    // Nếu file của bạn nằm ở templates/components/toolbar.html
    @Inject
    @Location("components/toolbar.html")
    Template toolbar;

    @GET
    @Path("/{menu}")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance getToolbar(
            @PathParam("menu") String menu,
            @HeaderParam("HX-Request") boolean hxRequest) {

        
        // Trả về template toolbar và truyền biến menu vào
        return toolbar.data("menu", menu);
    }
}
