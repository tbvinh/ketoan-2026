/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.resource;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;

/**
 *
 * @author tbvin
 */
@Path("/logout")
public class LogoutResource {

    @GET
    public Response doLogout() {
        return Response.ok("<script>window.location.href='/login';</script>")
                .header("Set-Cookie", "jwt=; Path=/; HttpOnly; Max-Age=0")
                .build();
    }
}