/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.security;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

//@Provider
//@Priority(Priorities.AUTHENTICATION)
public class JwtCookieFilter implements ContainerRequestFilter {
    @Override
    public void filter(ContainerRequestContext requestContext) {
        var cookie = requestContext.getCookies().get("jwt");
        if (cookie != null) {
            String jwt = cookie.getValue();
            if (jwt != null && !jwt.isEmpty()) {
                System.out.println("JwtCookieFilter: found cookie jwt=" + jwt);
//                requestContext.getHeaders().add("Authorization", "Bearer " + jwt);
                requestContext.getHeaders().putSingle("Authorization", "Bearer " + jwt);

            }
        }
    }
}
