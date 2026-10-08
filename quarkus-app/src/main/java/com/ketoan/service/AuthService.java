package com.ketoan.service;

import com.ketoan.dto.AuthRequest;
import com.ketoan.dto.AuthResponse;
import com.ketoan.entity.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.smallrye.jwt.build.Jwt;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.Set;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    public static final String ISSUER = "https://vinhcancode.local";   // phải trùng mp.jwt.verify.issuer
    public static final long TOKEN_TTL_SECONDS = 86400;           // 1 ngày, bằng maxAge của cookie

    @Transactional
    public AuthResponse login(AuthRequest request) {
        // 1. Tìm user trong DB
        User user = User.findByUsername(request.username);

        // 2. Kiểm tra tồn tại và so sánh mật khẩu mã hóa BCrypt
        if (user == null || !BcryptUtil.matches(request.password, user.password)) {
            throw new WebApplicationException(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("{\"error\": \"Tên đăng nhập hoặc mật khẩu không đúng!\"}")
                            .type(MediaType.APPLICATION_JSON)
                            .build()
            );
        }

        // 3. Sinh token đơn giản dạng UUID
        String token = UUID.randomUUID().toString();

        // 4. Lưu token vào DB
        user.token = token;
        user.persist();

        // 5. Trả về token cho Client
        return new AuthResponse(token);
    }

    @Transactional
    public String generateToken(AuthRequest request) {
        // 1. Tìm user theo username
        User user = User.findByUsername(request.username);

        // 2. Kiểm tra tài khoản và xác thực mật khẩu băm BCrypt
        if (user == null || !BcryptUtil.matches(request.password, user.password)) {
            throw new WebApplicationException(
                    Response.status(Response.Status.UNAUTHORIZED)
                            .entity("{\"error\": \"Tên đăng nhập hoặc mật khẩu không đúng!\"}")
                            .type(MediaType.APPLICATION_JSON)
                            .build()
            );
        }

        // 3. Tạo JWT đã ký. Không cần lưu token vào DB nữa (stateless) => có thể bỏ cột users.token
        return Jwt.issuer(ISSUER)
                .subject(user.username)
                .upn(user.username) // jwt.getName() sẽ trả về giá trị này
                .groups(Set.of(normalizeRole(user.role))) // "admin" | "user" => dùng cho @RolesAllowed
                .claim("name", user.username != null ? user.username : user.username)
                .expiresIn(TOKEN_TTL_SECONDS)
                .sign();                                                 // ký bằng smallrye.jwt.sign.key.location
    }

    @Transactional // MUST HAVE: Để commit transaction xuống DB
    public User register(AuthRequest request) {
        if (User.findByUsername(request.username) != null) {
            throw new WebApplicationException(
                    Response.status(Response.Status.BAD_REQUEST)
                            .entity("{\"error\": \"Username đã tồn tại trong hệ thống!\"}")
                            .type(MediaType.APPLICATION_JSON)
                            .build()
            );
        }

        User user = new User();
        user.username = request.username;
        user.password = BcryptUtil.bcryptHash(request.password);
        user.role = "USER";

        user.persist(); // Lưu vào DB
        return user;
    }

    private static String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "user";
        }
        String r = role.trim().toLowerCase().replaceFirst("^role_", "");
        return r.equals("admin") ? "admin" : "user";
    }
}
