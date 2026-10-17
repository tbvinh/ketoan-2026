package com.ketoan.tenant;

import io.agroal.api.AgroalDataSource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/** Anh xa ma/id cong ty -> schema tenant, cache trong bo nho. */
@ApplicationScoped
public class TenantRegistry {

    private static final Pattern SCHEMA = Pattern.compile("[a-z][a-z0-9_]{1,62}");
    private final Map<String, String> cache = new ConcurrentHashMap<>();
    private final Map<String, String> codes = new ConcurrentHashMap<>();

    @Inject
    AgroalDataSource dataSource;

    public String resolveSchema(String company) {
        if (company == null || company.isBlank()) return "public";
        String key = company.trim().toLowerCase();
        if ("public".equals(key)) return "public";
        String cached = cache.get(key);
        if (cached != null) return cached;

        String sql = "select schema_name from public.dmcongty "
                + "where status = 'active' and (id::text = ? or lower(code) = ? or schema_name = ?)";
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, company.trim());
            statement.setString(2, key);
            statement.setString(3, key);
            try (ResultSet rs = statement.executeQuery()) {
                if (rs.next()) {
                    String schema = rs.getString(1);
                    if (!validSchema(schema)) invalid();
                    cache.put(key, schema);
                    cache.put(schema.toLowerCase(), schema);
                    return schema;
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot resolve tenant " + company, e);
        }
        throw invalid();
    }

    /** Ma cong ty (dung lam thu muc upload) tu id / code / schema. */
    public String resolveCompanyCode(String company) {
        if (company == null || company.isBlank()) return "public";
        String key = company.trim().toLowerCase();
        if ("public".equals(key)) return "public";
        String cached = codes.get(key);
        if (cached != null) return cached;

        String sql = "select code from public.dmcongty "
                + "where status = 'active' and (id::text = ? or lower(code) = ? or schema_name = ?)";
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, company.trim());
            statement.setString(2, key);
            statement.setString(3, key);
            try (ResultSet rs = statement.executeQuery()) {
                if (rs.next()) {
                    String code = rs.getString(1);
                    codes.put(key, code);
                    codes.put(code.toLowerCase(), code);
                    return code;
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot resolve company " + company, e);
        }
        throw invalid();
    }

    public boolean validSchema(String schema) {
        return schema != null && !"public".equalsIgnoreCase(schema) && SCHEMA.matcher(schema).matches();
    }

    public void refresh() {
        cache.clear();
        codes.clear();
    }

    private static WebApplicationException invalid() {
        return new WebApplicationException(Response.status(Response.Status.BAD_REQUEST)
                .entity(Map.of("message", "Công ty không tồn tại hoặc đã ngừng hoạt động"))
                .type(MediaType.APPLICATION_JSON)
                .build());
    }
}
