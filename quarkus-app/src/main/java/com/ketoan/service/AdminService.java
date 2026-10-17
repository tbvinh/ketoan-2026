package com.ketoan.service;

import com.ketoan.dto.UserRequest;
import com.ketoan.entity.Permission;
import com.ketoan.entity.Role;
import com.ketoan.entity.RolePermission;
import com.ketoan.entity.User;
import com.ketoan.entity.UserRole;
import io.quarkus.elytron.security.common.BcryptUtil;
import io.quarkus.hibernate.orm.panache.PanacheQuery;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Nghiep vu quan tri: nguoi dung, vai tro va ma tran phan quyen chi tiet.
 */
@ApplicationScoped
public class AdminService {

    @Inject
    EntityManager em;

    // ---------- Nguoi dung ----------

    public Map<String, Object> listUsers(String q, String role, Integer page, Integer pageSize) {
        StringBuilder where = new StringBuilder("1=1");
        Map<String, Object> params = new HashMap<>();
        if (q != null && !q.isBlank()) {
            where.append(" and (lower(username) like :q or lower(coalesce(fullName, '')) like :q)");
            params.put("q", "%" + q.trim().toLowerCase(Locale.ROOT) + "%");
        }
        if (role != null && !role.isBlank()) {
            where.append(" and lower(role) = :role");
            params.put("role", role.trim().toLowerCase(Locale.ROOT));
        }
        PanacheQuery<User> query = User.find(where + " order by username", params);
        long total = query.count();
        List<User> items;
        if (page == null && pageSize == null) {
            items = query.list();
        } else {
            int pg = Math.max(1, page == null ? 1 : page);
            int size = Math.min(Math.max(1, pageSize == null ? 20 : pageSize), 100);
            items = query.page(pg - 1, size).list();
        }
        return Map.of("items", items, "total", total);
    }

    public User getUser(Long id) {
        User user = em.find(User.class, id);
        if (user == null) throw notFound("Không tìm thấy người dùng");
        return user;
    }

    @Transactional
    public User createUser(UserRequest req) {
        if (req == null || blank(req.username)) throw bad("Tên đăng nhập không được để trống");
        if (blank(req.password)) throw bad("Mật khẩu không được để trống");
        String username = req.username.trim();
        if (User.findByUsername(username) != null) throw conflict("Tên đăng nhập đã tồn tại");

        Role role = roleOrThrow(blank(req.role) ? "user" : req.role);
        User user = new User();
        user.username = username;
        user.password = BcryptUtil.bcryptHash(req.password);
        user.fullName = blank(req.fullName) ? null : req.fullName.trim();
        user.imageUrl = blank(req.imageUrl) ? null : req.imageUrl.trim();
        user.role = role.code.toLowerCase(Locale.ROOT);
        user.active = req.active == null ? Boolean.TRUE : req.active;
        user.persist();
        em.flush();
        writeRole(user.id, role.id);
        return user;
    }

    @Transactional
    public User updateUser(Long id, UserRequest req, String actor) {
        User user = getUser(id);
        if (req == null) throw bad("Dữ liệu không hợp lệ");
        Role role = roleOrThrow(blank(req.role) ? user.role : req.role);
        boolean active = req.active == null ? !Boolean.FALSE.equals(user.active) : req.active;
        boolean wasAdmin = isAdmin(user);
        boolean willAdmin = "admin".equalsIgnoreCase(role.code);

        if (wasAdmin && (!willAdmin || !active) && countActiveAdmins() <= 1) {
            throw bad("Phải còn ít nhất một quản trị viên đang hoạt động");
        }
        if (actor != null && actor.equalsIgnoreCase(user.username) && (!willAdmin || !active)) {
            throw bad("Không thể tự khóa hoặc hạ quyền chính mình");
        }

        if (!blank(req.password)) user.password = BcryptUtil.bcryptHash(req.password);
        if (req.fullName != null) user.fullName = blank(req.fullName) ? null : req.fullName.trim();
        if (req.imageUrl != null) user.imageUrl = blank(req.imageUrl) ? null : req.imageUrl.trim();
        user.role = role.code.toLowerCase(Locale.ROOT);
        user.active = active;
        writeRole(user.id, role.id);
        flushOrConflict("Không thể cập nhật người dùng");
        return user;
    }

    @Transactional
    public void deleteUser(Long id, String actor) {
        User user = getUser(id);
        if (actor != null && actor.equalsIgnoreCase(user.username)) throw bad("Không thể xóa chính mình");
        if (isAdmin(user) && countActiveAdmins() <= 1) throw bad("Không thể xóa quản trị viên cuối cùng");
        UserRole.delete("userId", user.id);
        em.remove(user);
        flushOrConflict("Không thể xóa người dùng");
    }

    // ---------- Vai tro ----------

    public List<Map<String, Object>> listRoles() {
        List<Map<String, Object>> items = new ArrayList<>();
        for (Role role : Role.<Role>list("order by id")) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", role.id);
            row.put("code", role.code);
            row.put("name", role.name);
            row.put("description", role.description);
            row.put("builtin", isBuiltin(role.code));
            row.put("userCount", UserRole.count("roleId", role.id));
            row.put("permissionCount", RolePermission.count("roleId", role.id));
            items.add(row);
        }
        return items;
    }

    @Transactional
    public Role createRole(Role req) {
        if (req == null || blank(req.code)) throw bad("Mã vai trò không được để trống");
        if (blank(req.name)) throw bad("Tên vai trò không được để trống");
        String code = req.code.trim().toLowerCase(Locale.ROOT);
        if (!code.matches("[a-z0-9_-]{2,50}")) throw bad("Mã vai trò chỉ gồm chữ thường, số, _ hoặc -");
        if (Role.findByCode(code) != null) throw conflict("Mã vai trò đã tồn tại");

        Role role = new Role();
        role.code = code;
        role.name = req.name.trim();
        role.description = blank(req.description) ? null : req.description.trim();
        role.persist();
        return role;
    }

    @Transactional
    public Role updateRole(Long id, Role req) {
        Role role = roleOrThrow(id);
        if (req == null) throw bad("Dữ liệu không hợp lệ");
        if (req.code != null && !req.code.isBlank() && !req.code.equalsIgnoreCase(role.code)) {
            throw bad("Không được đổi mã vai trò");
        }
        if (blank(req.name)) throw bad("Tên vai trò không được để trống");
        role.name = req.name.trim();
        role.description = blank(req.description) ? null : req.description.trim();
        return role;
    }

    @Transactional
    public void deleteRole(Long id) {
        Role role = roleOrThrow(id);
        if (isBuiltin(role.code)) throw bad("Không thể xóa vai trò hệ thống");
        if (UserRole.count("roleId", role.id) > 0) throw conflict("Vai trò đang được gán cho người dùng");
        em.createQuery("delete from RolePermission rp where rp.roleId = :id").setParameter("id", role.id).executeUpdate();
        em.remove(role);
    }

    // ---------- Ma tran phan quyen ----------

    public Map<String, Map<String, Boolean>> rolePermissions(Long roleId) {
        Role role = roleOrThrow(roleId);
        List<Permission> all = Permission.list("order by module, action");
        Set<Long> granted = new LinkedHashSet<>();
        if (!"admin".equalsIgnoreCase(role.code)) {
            List<Long> ids = em.createQuery(
                            "select rp.permissionId from RolePermission rp where rp.roleId = :id", Long.class)
                    .setParameter("id", roleId)
                    .getResultList();
            granted.addAll(ids);
        }

        Map<String, Map<String, Boolean>> matrix = new LinkedHashMap<>();
        for (Permission p : all) {
            String module = p.module == null ? "" : p.module.toLowerCase(Locale.ROOT);
            String action = p.action == null ? "" : p.action.toLowerCase(Locale.ROOT);
            matrix.computeIfAbsent(module, k -> new LinkedHashMap<>())
                    .put(action, "admin".equalsIgnoreCase(role.code) || granted.contains(p.id));
        }
        return matrix;
    }

    @Transactional
    public void saveRolePermissions(Long roleId, Map<String, Map<String, Boolean>> body) {
        Role role = roleOrThrow(roleId);
        if ("admin".equalsIgnoreCase(role.code)) {
            throw bad("Vai trò Quản trị viên luôn có đầy đủ quyền");
        }
        em.createQuery("delete from RolePermission rp where rp.roleId = :id")
                .setParameter("id", roleId)
                .executeUpdate();
        if (body == null) return;

        for (Map.Entry<String, Map<String, Boolean>> moduleEntry : body.entrySet()) {
            if (moduleEntry.getValue() == null) continue;
            for (Map.Entry<String, Boolean> actionEntry : moduleEntry.getValue().entrySet()) {
                if (!Boolean.TRUE.equals(actionEntry.getValue())) continue;
                Permission permission = Permission.findOne(moduleEntry.getKey(), actionEntry.getKey());
                if (permission == null) continue;
                RolePermission link = new RolePermission();
                link.roleId = roleId;
                link.permissionId = permission.id;
                link.persist();
            }
        }
        flushOrConflict("Không thể lưu phân quyền");
    }

    // ---------- helper ----------

    private Role roleOrThrow(Long id) {
        Role role = em.find(Role.class, id);
        if (role == null) throw notFound("Không tìm thấy vai trò");
        return role;
    }

    private Role roleOrThrow(String code) {
        Role role = Role.findByCode(code);
        if (role == null) throw bad("Vai trò không hợp lệ");
        return role;
    }

    private void writeRole(Long userId, Long roleId) {
        UserRole.delete("userId", userId);
        UserRole link = new UserRole();
        link.userId = userId;
        link.roleId = roleId;
        link.persist();
    }

    private boolean isAdmin(User user) {
        if (user == null) return false;
        Set<String> roles = new LinkedHashSet<>();
        em.createQuery("select r.code from UserRole ur, Role r where ur.userId = :id and r.id = ur.roleId", String.class)
                .setParameter("id", user.id)
                .getResultList()
                .forEach(c -> roles.add(c == null ? "" : c.toLowerCase(Locale.ROOT)));
        if (roles.isEmpty() && user.role != null) roles.add(user.role.toLowerCase(Locale.ROOT));
        return roles.contains("admin");
    }

    private long countActiveAdmins() {
        return em.createQuery(
                        "select count(distinct u.id) from User u, UserRole ur, Role r "
                                + "where ur.userId = u.id and r.id = ur.roleId "
                                + "and lower(r.code) = 'admin' and u.active = true",
                        Long.class)
                .getSingleResult();
    }

    private static boolean isBuiltin(String code) {
        return "admin".equalsIgnoreCase(code) || "user".equalsIgnoreCase(code);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private void flushOrConflict(String msg) {
        try {
            em.flush();
        } catch (PersistenceException ex) {
            throw conflict(msg);
        }
    }

    private static WebApplicationException bad(String msg) {
        return new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("message", msg)).type(MediaType.APPLICATION_JSON).build());
    }

    private static WebApplicationException conflict(String msg) {
        return new WebApplicationException(Response.status(Response.Status.CONFLICT)
                .entity(Map.of("message", msg)).type(MediaType.APPLICATION_JSON).build());
    }

    private static WebApplicationException notFound(String msg) {
        return new WebApplicationException(Response.status(Response.Status.NOT_FOUND)
                .entity(Map.of("message", msg)).type(MediaType.APPLICATION_JSON).build());
    }
}
