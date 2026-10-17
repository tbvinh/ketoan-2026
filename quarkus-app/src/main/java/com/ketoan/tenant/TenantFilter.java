package com.ketoan.tenant;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

/** Doc X-Company-Id / X-Tenant-Id truoc khi Hibernate mo session. */
@Provider
@Priority(Priorities.AUTHENTICATION - 10)
public class TenantFilter implements ContainerRequestFilter {

    @Inject
    TenantContext context;

    @Override
    public void filter(ContainerRequestContext request) {
        String path = request.getUriInfo().getPath();
        if (path.startsWith("/")) path = path.substring(1);
        if (path.startsWith("auth") || path.startsWith("companies") || path.startsWith("company/")) return;

        String company = request.getHeaderString("X-Company-Id");
        if (company == null || company.isBlank()) {
            company = request.getHeaderString("X-Tenant-Id");
        }
        context.setCompanyId(company);
    }
}
