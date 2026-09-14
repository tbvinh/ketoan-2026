package com.ketoan.security;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;
import io.quarkus.security.UnauthorizedException;
import io.quarkus.security.ForbiddenException;

@Provider
public class UnauthorizedExceptionMapper implements ExceptionMapper<UnauthorizedException> {
    @Override
    public Response toResponse(UnauthorizedException exception) {
        return Response.status(Response.Status.FOUND)
                .header("Location", "/login")
                .build();
    }
}