package com.ketoan.resource;

import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/sidebar")
@Produces(MediaType.TEXT_HTML)
public class SidebarResource {

    @Inject
    @Location("components/sidebars/mail-sidebar")
    Template mailSidebar;

    @Inject
    @Location("components/sidebars/calendar-sidebar")
    Template calendarSidebar;

    @Inject
    @Location("components/sidebars/tasks-sidebar")
    Template tasksSidebar;

    @GET
    @Path("/mail")
    public TemplateInstance getMailSidebar() {
        return mailSidebar.instance();
    }

    @GET
    @Path("/calendar")
    public TemplateInstance getCalendarSidebar() {
        return calendarSidebar.instance();
    }

    @GET
    @Path("/tasks")
    public TemplateInstance getTasksSidebar() {
        return tasksSidebar.instance();
    }
}