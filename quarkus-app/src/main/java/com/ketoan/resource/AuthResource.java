package com.ketoan.resource; // Thay đúng package của bạn

import com.ketoan.dto.AuthRequest;
import com.ketoan.dto.AuthResponse;
import com.ketoan.entity.User;
import com.ketoan.service.AuthService;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.NewCookie;
import jakarta.ws.rs.core.Response;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    AuthService authService;

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
                .path("/")                     // Có hiệu lực trên toàn bộ domain
                .httpOnly(true)                // Ngăn JS đọc cookie (Chống XSS)
                .secure(false)                 // Đặt là true nếu chạy HTTPS (dev HTTP thì dùng false)
                .sameSite(NewCookie.SameSite.LAX) // Chống tấn công CSRF
                .maxAge(86400)                 // Thời gian sống: 1 ngày (tính bằng giây)
                .build();

        // 3. Trả về response kèm cookie và thông tin user cơ bản (không trả token trong body nữa)
        return Response.ok("{\"message\": \"Đăng nhập thành công\"}")
                .cookie(authCookie)
                .build();
    }

    @POST
    @Path("/logout")
    public Response logout() {
        // Xóa cookie bằng cách set maxAge = 0
        NewCookie deleteCookie = new NewCookie.Builder("token")
                .value("")
                .path("/")
                .httpOnly(true)
                .maxAge(0)
                .build();

        return Response.ok("{\"message\": \"Đăng xuất thành công\"}").cookie(deleteCookie).build();
    }
}