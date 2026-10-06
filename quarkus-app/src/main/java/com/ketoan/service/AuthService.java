package com.ketoan.service;

import com.ketoan.dto.AuthRequest;
import com.ketoan.dto.AuthResponse;
import com.ketoan.entity.User;
import io.quarkus.elytron.security.common.BcryptUtil;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

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

        // 3. Tạo Token ngẫu nhiên bằng UUID
        String token = UUID.randomUUID().toString();

        // 4. Lưu Token vào cột 'token' trong bảng 'users' ở DB
        user.token = token;
        user.persist();

        // 5. Trả về chuỗi token
        return token;
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
}
