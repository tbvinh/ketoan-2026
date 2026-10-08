/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.ketoan.resource;

/**
 *
 * @author tbvinh
 */

import com.ketoan.dto.AuthRequest;
import com.ketoan.dto.AuthResponse;
import com.ketoan.entity.User;
import com.ketoan.service.AuthService;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;

@Path("/public")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class HelloResource {
    
    @GET
    @Path("/hello")
    public Response hello(AuthRequest request) {
        
        return Response.ok("Hello there").build();
    }
}
