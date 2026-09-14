package com.ketoan.resource;

import io.quarkus.qute.Location;
import io.quarkus.qute.Template;
import io.quarkus.qute.TemplateInstance;
import jakarta.inject.Inject;
import jakarta.ws.rs.FormParam;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Response;

import io.smallrye.jwt.build.Jwt;

@Path("/login")
public class LoginResource {

    @Inject
    @Location("login/login.html")
    Template login_login; // ánh xạ tới templates/login/login.html

    @GET
    @Produces("text/html; charset=UTF-8")
    public TemplateInstance showLogin() {
        return login_login.instance();
    }

    @POST
    @Produces("text/html; charset=UTF-8")
    public Response doLogin(@FormParam("username") String user,
            @FormParam("password") String pass) {
        if ("admin".equals(user) && "123".equals(pass)) {
            String token = Jwt.issuer("ketoan-app")
                    .upn(user)
                    //                    .claim("roles", Arrays.asList("user"))
                    .groups("user")
                    .expiresAt(System.currentTimeMillis() / 1000 + 3600) // sống 1h   
                    .signWithSecret("mysuperlongsecretkeyforhs256jwt1234567890"); // HS256 ký bằng secret

            // Trả token về client, HTMX có thể lưu vào localStorage hoặc cookie
            //return Response.ok("<script>localStorage.setItem('jwt','" + token + "'); window.location.href='/dashboard';</script>").build();
            return Response.ok("<script>window.location.href='/dashboard';</script>")
                    .header("Set-Cookie", "jwt=" + token + "; Path=/; HttpOnly")
                    .build();
        } else {
            return Response.ok("<div class='notification is-danger'>Sai tên đăng nhập hoặc mật khẩu!</div>").build();
        }
    }


}
