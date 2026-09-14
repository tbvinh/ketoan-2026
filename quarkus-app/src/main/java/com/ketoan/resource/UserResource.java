package com.ketoan.resource;

import com.ketoan.model.User;
import com.ketoan.repository.UserRepository;
import io.quarkus.qute.CheckedTemplate;
import io.quarkus.qute.TemplateInstance;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

import java.util.List;

@Path("/dashboard/users")
//@RolesAllowed("user")
public class UserResource {

    @Inject
    UserRepository userRepository;

    @CheckedTemplate
    public static class Templates {
        public static native TemplateInstance list(List<User> users);
        public static native TemplateInstance form();
    }

    @GET
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance listUsers() {
        return Templates.list(userRepository.findAll());
    }

    @GET
    @Path("/new")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance newUserForm() {
        return Templates.form();
    }

    @POST
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance createUser(
            @FormParam("username") String username,
            @FormParam("password") String password,
            @FormParam("role") String role) {

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new BadRequestException("Thiếu username hoặc password");
        }
        if (userRepository.findByUsername(username) != null) {
            throw new WebApplicationException("Username đã tồn tại", 409);
        }

        userRepository.create(username, password, (role == null || role.isBlank()) ? "user" : role);
        return Templates.list(userRepository.findAll());
    }

    @DELETE
    @Path("/{id}")
    @Produces(MediaType.TEXT_HTML)
    public TemplateInstance deleteUser(@PathParam("id") Long id) {
        userRepository.deleteById(id);
        return Templates.list(userRepository.findAll());
    }
}