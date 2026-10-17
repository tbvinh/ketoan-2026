package com.ketoan.resource; // Thay đúng package của bạn

import com.ketoan.dto.AuthRequest;
import com.ketoan.dto.AuthResponse;
import com.ketoan.entity.User;
import com.ketoan.service.AuthService;
import com.ketoan.service.PermissionService;
import jakarta.annotation.security.RolesAllowed;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.eclipse.microprofile.jwt.JsonWebToken;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    JsonWebToken jwt;

    @Inject
    AuthService authService;

    @Inject
    PermissionService permissionService;

    @POST
    @Path("/register")
    public Response register(AuthRequest request) {
        User user = authService.register(request);

        // Đính kèm .entity(user) để trả về thông tin sau khi lưu
        return Response.status(Response.Status.CREATED)
                .entity(user)
                .build();
    }

    // Endpoint Đăng nhập
    @POST
    @Path("/login")
    public Response login(AuthRequest request) {
        AuthResponse response = authService.login(request);
        return Response.ok(response).build();
    }

    @POST
    @Path("/loginv1")
    public Response loginv1(AuthRequest request) {
        // 1. Lấy token từ service
        String token = authService.generateToken(request);

        // 2. Tạo HttpOnly Cookie
        NewCookie authCookie = new NewCookie.Builder("token")
                .value(token)
                .path("/") // Có hiệu lực trên toàn bộ domain
                .httpOnly(true) // Ngăn JS đọc cookie (Chống XSS)
                .secure(false) // Đặt là true nếu chạy HTTPS (dev HTTP thì dùng false)
                .sameSite(NewCookie.SameSite.LAX) // Chống tấn công CSRF
                .maxAge(86400) // Thời gian sống: 1 ngày (tính bằng giây)
                .build();

        // 3. Trả về response kèm cookie và thông tin user cơ bản (không trả token trong body nữa)
        return Response.ok("{\"message\": \"Đăng nhập thành công\"}")
                .cookie(authCookie)
                .build();
    }

    @GET
    @Path("/me")
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed({"admin", "user"})
    public Response me() {
        String username = jwt.getName();                       // lấy từ upn
        Set<String> groups = jwt.getGroups();
        String role = groups != null && groups.contains("admin") ? "admin" : "user";
        User user = User.findByUsername(username);
        String name = user != null && user.fullName != null && !user.fullName.isBlank()
                ? user.fullName
                : jwt.getClaim("name");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("username", username);
        body.put("name", name != null && !name.isBlank() ? name : username);
        body.put("role", role);
        body.put("permissions", permissionService.effective(username, "admin".equals(role)));
        return Response.ok(body).build();
    }

    @POST
    @Path("/logout")
    public Response logout() {
        // Xóa cookie bằng cách set maxAge = 0
        NewCookie expired = new NewCookie.Builder("token")
                .value("")
                .path("/")
                .httpOnly(true)
                .secure(false) // true khi chạy HTTPS
                .sameSite(NewCookie.SameSite.LAX)
                .maxAge(0)
                .build();

        return Response.ok("{\"message\": \"Đăng xuất thành công\"}").cookie(expired).build();
    }

    private Response unauthorized(String message) {
        return Response.status(Response.Status.UNAUTHORIZED)
                .entity(Map.of("message", message))
                .type(MediaType.APPLICATION_JSON)
                .build();
    }


}
