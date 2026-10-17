package com.ketoan.resource;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ketoan.entity.DmCongTy;
import com.ketoan.service.CompanyService;
import com.ketoan.service.TenantProvisioner;
import io.agroal.api.AgroalDataSource;
import io.quarkus.security.Authenticated;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.StreamingOutput;
import java.io.ByteArrayOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.jboss.resteasy.reactive.RestForm;
import org.jboss.resteasy.reactive.multipart.FileUpload;
import org.postgresql.PGConnection;
import org.postgresql.copy.CopyManager;
import org.postgresql.copy.CopyOut;

/**
 * Sao luu / phuc hoi schema cong ty bang CSV trong ZIP, stream qua PostgreSQL COPY.
 * Khong doc toan bo du lieu vao bo nho: COPY TO STDOUT -> HTTP, ZIP -> COPY FROM STDIN.
 */
@Path("/company")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Authenticated
public class CompanyDataResource {

    private static final String FORMAT = "ketoan-company-backup-csv";
    private static final int FORMAT_VERSION = 2;
    private static final String ZIP_MIME = "application/zip";
    private static final int MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

    private static final Set<String> EXCLUDED = Set.of(
            "flyway_schema_history", "dmcongty",
            "users", "roles", "user_roles", "permissions", "role_permissions");

    private static final Set<String> CLONE_EXCLUDED = Set.of("flyway_schema_history", "dmcongty");

    @Inject
    AgroalDataSource dataSource;

    @Inject
    TenantProvisioner provisioner;

    @Inject
    CompanyService companyService;

    @Inject
    ObjectMapper mapper;

    @GET
    @Path("/{id}/export")
    @Produces(ZIP_MIME)
    @RolesAllowed("admin")
    public Response export(@PathParam("id") Long id) throws Exception {
        DmCongTy company = find(id);
        String schema = company.schemaName;

        List<Table> tables;
        try (Connection connection = dataSource.getConnection()) {
            tables = tables(connection, schema);
        }

        Map<String, Object> manifest = manifest(company, schema, tables);
        byte[] manifestBytes = mapper.writeValueAsBytes(manifest);
        String fileName = "company-" + safe(company.code) + "-" + manifest.get("schemaVersion") + ".zip";

        return Response.ok((StreamingOutput) out -> stream(out, schema, tables, manifestBytes), ZIP_MIME)
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .build();
    }

    private void stream(OutputStream out, String schema, List<Table> tables, byte[] manifestBytes) throws IOException {
        try (Connection connection = dataSource.getConnection()) {
            CopyManager copy = connection.unwrap(PGConnection.class).getCopyAPI();
            try (ZipOutputStream zip = new ZipOutputStream(out, StandardCharsets.UTF_8)) {
                zip.putNextEntry(new ZipEntry("manifest.json"));
                zip.write(manifestBytes);
                zip.closeEntry();
                for (Table table : tables) {
                    zip.putNextEntry(new ZipEntry(table.name() + ".csv"));
                    CopyOut rows = copy.copyOut(copyOutSql(schema, table));
                    try {
                        byte[] chunk;
                        while ((chunk = rows.readFromCopy(true)) != null) {
                            if (chunk.length > 0) zip.write(chunk);
                        }
                    } finally {
                        try {
                            if (rows.isActive()) rows.cancelCopy();
                        } catch (SQLException ignored) {
                            // Bỏ qua lỗi huỷ COPY khi kết nối đã đóng.
                        }
                    }
                    zip.closeEntry();
                }
            }
        } catch (SQLException e) {
            throw new IOException("Company export failed", e);
        }
    }

    private Map<String, Object> manifest(DmCongTy company, String schema, List<Table> tables) {
        Map<String, Object> manifest = new LinkedHashMap<>();
        manifest.put("format", FORMAT);
        manifest.put("formatVersion", FORMAT_VERSION);
        manifest.put("schemaVersion", provisioner.currentVersion(schema));
        manifest.put("latestVersion", provisioner.latestVersion());
        manifest.put("exportedAt", OffsetDateTime.now().toString());
        manifest.put("company", companyInfo(company));

        List<Map<String, Object>> tableList = new ArrayList<>();
        for (Table table : tables) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", table.name());
            item.put("columns", table.columns().stream()
                    .filter(column -> !column.generated())
                    .map(Column::name)
                    .toList());
            tableList.add(item);
        }
        manifest.put("tables", tableList);
        return manifest;
    }

    @POST
    @Path("/{sourceCompanyId}/clone")
    @RolesAllowed("admin")
    public Map<String, Object> clone(@PathParam("sourceCompanyId") Long sourceCompanyId, DmCongTy body) {
        DmCongTy source = find(sourceCompanyId);
        if (body == null || body.code == null || body.code.isBlank()
                || body.name == null || body.name.isBlank()) {
            throw problem(Response.Status.BAD_REQUEST, "Mã và tên công ty không được để trống");
        }
        String latest = provisioner.latestVersion();
        String sourceVersion = provisioner.currentVersion(source.schemaName);
        if (TenantProvisioner.versionNumber(sourceVersion) > TenantProvisioner.versionNumber(latest)) {
            throw problem(Response.Status.CONFLICT, "Schema nguồn mới hơn phiên bản ứng dụng");
        }

        DmCongTy request = new DmCongTy();
        request.code = body.code.trim();
        request.name = body.name.trim();
        request.address = body.address == null ? source.address : body.address;
        request.taxCode = body.taxCode == null ? source.taxCode : body.taxCode;
        request.phone = body.phone == null ? source.phone : body.phone;
        request.status = "active";

        DmCongTy target = companyService.create(request);
        try {
            Stats stats = cloneData(source.schemaName, target.schemaName);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("sourceCompanyId", source.id);
            result.put("companyId", target.id);
            result.put("code", target.code);
            result.put("name", target.name);
            result.put("schemaName", target.schemaName);
            result.put("tables", stats.tables());
            result.put("rows", stats.rows());
            result.put("schemaVersion", provisioner.currentVersion(target.schemaName));
            return result;
        } catch (Exception e) {
            try { companyService.delete(target.id); } catch (RuntimeException ignored) { }
            if (e instanceof WebApplicationException wae) throw wae;
            throw problem(Response.Status.BAD_REQUEST, "Nhân bản thất bại: " + e.getMessage());
        }
    }

    @POST
    @Path("/import")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @RolesAllowed("admin")
    public Map<String, Object> importPackage(@RestForm("file") FileUpload file,
                                             @RestForm("companyId") String companyId) {
        if (file == null || file.uploadedFile() == null) {
            throw problem(Response.Status.BAD_REQUEST, "Chưa chọn tệp sao lưu công ty");
        }
        java.nio.file.Path uploaded = file.uploadedFile();

        try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(uploaded), StandardCharsets.UTF_8)) {
            ZipEntry first = zip.getNextEntry();
            if (first == null || !"manifest.json".equals(first.getName())) {
                throw problem(Response.Status.BAD_REQUEST, "Tệp không đúng định dạng sao lưu công ty");
            }
            Map<String, Object> manifest = mapper.readValue(readEntry(zip, MAX_MANIFEST_BYTES),
                    new TypeReference<Map<String, Object>>() { });
            zip.closeEntry();

            if (!FORMAT.equals(string(manifest, "format")) || number(manifest.get("formatVersion")) != FORMAT_VERSION) {
                throw problem(Response.Status.BAD_REQUEST, "Định dạng tệp sao lưu không được hỗ trợ");
            }
            String packageVersion = string(manifest, "schemaVersion");
            if (packageVersion == null || packageVersion.isBlank()) {
                throw problem(Response.Status.BAD_REQUEST, "Gói dữ liệu thiếu schema version");
            }

            DmCongTy company = target(companyId, manifest);
            String schema = company.schemaName;
            String latest = provisioner.latestVersion();
            String current = provisioner.currentVersion(schema);
            boolean upgraded = false;

            if (TenantProvisioner.versionNumber(current) < TenantProvisioner.versionNumber(latest)) {
                try {
                    provisioner.migrate(schema);
                } catch (RuntimeException e) {
                    throw problem(Response.Status.BAD_REQUEST, "Không thể nâng cấp schema công ty: " + e.getMessage());
                }
                upgraded = true;
                current = provisioner.currentVersion(schema);
            }
            if (TenantProvisioner.versionNumber(packageVersion) > TenantProvisioner.versionNumber(current)) {
                throw problem(Response.Status.CONFLICT,
                        "Gói dữ liệu có schema version " + packageVersion + " mới hơn CSDL (" + current + ")");
            }

            Stats stats = copyEntries(zip, schema, manifest);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("companyId", company.id);
            result.put("code", company.code);
            result.put("schemaName", schema);
            result.put("schemaVersion", packageVersion);
            result.put("targetVersion", current);
            result.put("upgraded", upgraded);
            result.put("tables", stats.tables());
            result.put("rows", stats.rows());
            return result;
        } catch (WebApplicationException e) {
            throw e;
        } catch (Exception e) {
            throw problem(Response.Status.BAD_REQUEST, "Import thất bại: " + e.getMessage());
        }
    }


    private Stats copyEntries(ZipInputStream zip, String schema, Map<String, Object> manifest) throws Exception {
        Map<String, List<String>> packageTables = manifestTables(manifest);
        if (packageTables.isEmpty()) throw problem(Response.Status.BAD_REQUEST, "Gói dữ liệu không có bảng dữ liệu");

        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                List<Table> targetTables = tables(connection, schema);
                if (targetTables.isEmpty()) throw problem(Response.Status.BAD_REQUEST, "Schema công ty chưa có dữ liệu");
                Map<String, Table> byName = new LinkedHashMap<>();
                for (Table table : targetTables) byName.put(table.name(), table);

                for (Map.Entry<String, List<String>> entry : packageTables.entrySet()) {
                    Table table = byName.get(entry.getKey());
                    if (table == null) {
                        throw problem(Response.Status.BAD_REQUEST,
                                "Bảng " + entry.getKey() + " không tồn tại trong schema đích");
                    }
                    Set<String> targetColumns = table.columns().stream()
                            .filter(column -> !column.generated())
                            .map(Column::name)
                            .collect(Collectors.toSet());
                    for (String column : entry.getValue()) {
                        if (!targetColumns.contains(column)) {
                            throw problem(Response.Status.BAD_REQUEST,
                                    "Cột " + entry.getKey() + "." + column + " không tồn tại trong schema đích");
                        }
                    }
                }

                String truncate = targetTables.stream()
                        .map(table -> table(schema, table.name()))
                        .collect(Collectors.joining(", "));
                try (Statement statement = connection.createStatement()) {
                    statement.execute("TRUNCATE TABLE " + truncate + " RESTART IDENTITY CASCADE");
                    for (Table table : targetTables) {
                        statement.execute("ALTER TABLE " + table(schema, table.name()) + " DISABLE TRIGGER ALL");
                    }
                }

                CopyManager copy = connection.unwrap(PGConnection.class).getCopyAPI();
                int tableCount = 0;
                long rowCount = 0;
                ZipEntry entry;
                while ((entry = zip.getNextEntry()) != null) {
                    if (entry.isDirectory()) continue;
                    String name = entry.getName();
                    if (!name.endsWith(".csv")) continue;
                    String tableName = name.substring(0, name.length() - 4);
                    List<String> columns = packageTables.get(tableName);
                    if (columns == null) {
                        throw problem(Response.Status.BAD_REQUEST, "Bảng " + tableName + " không có trong manifest");
                    }
                    if (columns.isEmpty()) {
                        zip.closeEntry();
                        continue;
                    }
                    InputStream rows = new FilterInputStream(zip) {
                        @Override
                        public void close() {
                            // Không đóng ZipInputStream khi CopyManager kết thúc một entry.
                        }
                    };
                    rowCount += copy.copyIn(copyInSql(schema, tableName, columns), rows);
                    tableCount++;
                    zip.closeEntry();
                }

                try (Statement statement = connection.createStatement()) {
                    for (Table table : targetTables) {
                        statement.execute("ALTER TABLE " + table(schema, table.name()) + " ENABLE TRIGGER ALL");
                    }
                }
                for (Table table : targetTables) resetSequence(connection, schema, table);
                connection.commit();
                return new Stats(tableCount, rowCount);
            } catch (Exception e) {
                try { connection.rollback(); } catch (SQLException ignored) { }
                throw e;
            }
        }
    }

    private Stats cloneData(String sourceSchema, String targetSchema) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                List<Table> sourceTables = tables(connection, sourceSchema, CLONE_EXCLUDED);
                List<Table> targetTables = tables(connection, targetSchema, CLONE_EXCLUDED);
                Map<String, Table> targetByName = new LinkedHashMap<>();
                for (Table table : targetTables) targetByName.put(table.name(), table);

                for (Table source : sourceTables) {
                    if (!targetByName.containsKey(source.name())) {
                        throw problem(Response.Status.BAD_REQUEST,
                                "Bảng " + source.name() + " không tồn tại trong schema đích");
                    }
                }

                String truncate = targetTables.stream()
                        .map(table -> table(targetSchema, table.name()))
                        .collect(Collectors.joining(", "));
                try (Statement statement = connection.createStatement()) {
                    statement.execute("TRUNCATE TABLE " + truncate + " RESTART IDENTITY CASCADE");
                    for (Table table : targetTables) {
                        statement.execute("ALTER TABLE " + table(targetSchema, table.name()) + " DISABLE TRIGGER ALL");
                    }
                }

                int tableCount = 0;
                long rowCount = 0;
                for (Table source : sourceTables) {
                    Table target = targetByName.get(source.name());
                    Set<String> sourceColumns = source.columns().stream()
                            .filter(column -> !column.generated())
                            .map(Column::name)
                            .collect(Collectors.toSet());
                    List<Column> columns = target.columns().stream()
                            .filter(column -> !column.generated())
                            .filter(column -> sourceColumns.contains(column.name()))
                            .toList();
                    if (columns.isEmpty()) continue;

                    String columnList = columns.stream().map(column -> q(column.name()))
                            .collect(Collectors.joining(", "));
                    String sql = "INSERT INTO " + table(targetSchema, source.name()) + " (" + columnList + ") "
                            + (columns.stream().anyMatch(Column::identityAlways) ? "OVERRIDING SYSTEM VALUE " : "")
                            + "SELECT " + columnList + " FROM " + table(sourceSchema, source.name());
                    try (Statement statement = connection.createStatement()) {
                        rowCount += statement.executeUpdate(sql);
                    }
                    tableCount++;
                }

                try (Statement statement = connection.createStatement()) {
                    for (Table table : targetTables) {
                        statement.execute("ALTER TABLE " + table(targetSchema, table.name()) + " ENABLE TRIGGER ALL");
                    }
                }
                for (Table table : targetTables) resetSequence(connection, targetSchema, table);
                connection.commit();
                return new Stats(tableCount, rowCount);
            } catch (Exception e) {
                try { connection.rollback(); } catch (SQLException ignored) { }
                if (e instanceof SQLException sql) throw sql;
                if (e instanceof RuntimeException runtime) throw runtime;
                throw new SQLException(e);
            }
        }
    }

    private DmCongTy target(String companyId, Map<String, Object> manifest) {
        if (companyId != null && !companyId.isBlank()) {
            try {
                return find(Long.valueOf(companyId.trim()));
            } catch (NumberFormatException e) {
                throw problem(Response.Status.BAD_REQUEST, "Công ty đích không hợp lệ");
            }
        }
        Object value = manifest.get("company");
        Map<?, ?> meta = value instanceof Map<?, ?> map ? map : Map.of();
        String code = objectString(meta.get("code"));
        if (code == null || code.isBlank()) throw problem(Response.Status.BAD_REQUEST, "Gói dữ liệu thiếu mã công ty");
        if (DmCongTy.findByCode(code) != null) {
            throw problem(Response.Status.CONFLICT, "Mã công ty đã tồn tại — chọn công ty đích để ghi đè");
        }
        DmCongTy request = new DmCongTy();
        request.code = code;
        request.name = objectString(meta.get("name"));
        if (request.name == null || request.name.isBlank()) request.name = code;
        request.address = objectString(meta.get("address"));
        request.taxCode = objectString(meta.get("taxCode"));
        request.phone = objectString(meta.get("phone"));
        return companyService.create(request);
    }

    private static DmCongTy find(Long id) {
        DmCongTy company = DmCongTy.findById(id);
        if (company == null) throw problem(Response.Status.NOT_FOUND, "Không tìm thấy công ty");
        return company;
    }

    private static Map<String, Object> companyInfo(DmCongTy company) {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("id", company.id);
        info.put("code", company.code);
        info.put("name", company.name);
        info.put("address", company.address);
        info.put("taxCode", company.taxCode);
        info.put("phone", company.phone);
        return info;
    }

    private static Map<String, List<String>> manifestTables(Map<String, Object> manifest) {
        Object value = manifest.get("tables");
        if (!(value instanceof List<?> list)) {
            throw problem(Response.Status.BAD_REQUEST, "Gói dữ liệu thiếu danh sách bảng");
        }
        Map<String, List<String>> tables = new LinkedHashMap<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> map)) continue;
            String name = objectString(map.get("name"));
            Object columnsValue = map.get("columns");
            if (name == null || !(columnsValue instanceof List<?> columnsList)) continue;
            List<String> columns = new ArrayList<>();
            for (Object column : columnsList) {
                String columnName = objectString(column);
                if (columnName != null) columns.add(columnName);
            }
            tables.put(name, columns);
        }
        return tables;
    }


    private static List<Table> tables(Connection connection, String schema) throws SQLException {
        return tables(connection, schema, EXCLUDED);
    }

    private static List<Table> tables(Connection connection, String schema, Set<String> excluded) throws SQLException {
        LinkedHashMap<String, List<Column>> map = new LinkedHashMap<>();
        String tableSql = "select tablename from pg_catalog.pg_tables where schemaname = ? order by tablename";
        try (PreparedStatement statement = connection.prepareStatement(tableSql)) {
            statement.setString(1, schema);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    String name = result.getString(1);
                    if (!excluded.contains(name)) map.put(name, new ArrayList<>());
                }
            }
        }

        String columnSql = """
                select c.table_name, c.column_name,
                       (c.is_generated = 'ALWAYS') as generated,
                       (c.is_identity = 'YES' and c.identity_generation = 'ALWAYS') as identity_always,
                       (c.column_default like 'nextval%' or c.is_identity = 'YES') as sequence_column
                from information_schema.columns c
                join pg_catalog.pg_namespace n on n.nspname = c.table_schema
                join pg_catalog.pg_class cl on cl.relnamespace = n.oid and cl.relname = c.table_name
                join pg_catalog.pg_attribute a on a.attrelid = cl.oid and a.attname = c.column_name and a.attnum > 0
                where c.table_schema = ?
                order by c.table_name, c.ordinal_position
                """;
        try (PreparedStatement statement = connection.prepareStatement(columnSql)) {
            statement.setString(1, schema);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    List<Column> columns = map.get(result.getString("table_name"));
                    if (columns == null) continue;
                    columns.add(new Column(
                            result.getString("column_name"),
                            result.getBoolean("generated"),
                            result.getBoolean("identity_always"),
                            result.getBoolean("sequence_column")));
                }
            }
        }
        map.values().removeIf(columns -> columns.isEmpty() || columns.stream().allMatch(Column::generated));
        List<Table> tables = new ArrayList<>();
        map.forEach((name, columns) -> tables.add(new Table(name, columns)));
        return tables;
    }

    private static String copyOutSql(String schema, Table table) {
        String columns = table.columns().stream()
                .filter(column -> !column.generated())
                .map(column -> q(column.name()))
                .collect(Collectors.joining(", "));
        return "COPY (SELECT " + columns + " FROM " + table(schema, table.name())
                + ") TO STDOUT WITH (FORMAT csv, HEADER true)";
    }

    private static String copyInSql(String schema, String table, List<String> columns) {
        String names = columns.stream().map(CompanyDataResource::q).collect(Collectors.joining(", "));
        return "COPY " + table(schema, table) + " (" + names + ") FROM STDIN WITH (FORMAT csv, HEADER true)";
    }

    private static void resetSequence(Connection connection, String schema, Table table) throws SQLException {
        for (Column column : table.columns()) {
            if (!column.sequenceColumn()) continue;
            String sequence = null;
            try (PreparedStatement statement = connection.prepareStatement("select pg_get_serial_sequence(?, ?)")) {
                statement.setString(1, schema + "." + table.name());
                statement.setString(2, column.name());
                try (ResultSet result = statement.executeQuery()) {
                    if (result.next()) sequence = result.getString(1);
                }
            }
            if (sequence == null) continue;
            String tableRef = table(schema, table.name());
            String columnRef = q(column.name());
            String max = "(select max(" + columnRef + ") from " + tableRef + ")";
            String sql = "select setval('" + literal(sequence) + "', coalesce(" + max + ", 1), " + max + " is not null)";
            try (Statement statement = connection.createStatement()) {
                statement.execute(sql);
            }
        }
    }

    private static byte[] readEntry(ZipInputStream zip, int max) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = zip.read(buffer)) > 0) {
            if (out.size() + read > max) throw new IOException("Manifest quá lớn");
            out.write(buffer, 0, read);
        }
        return out.toByteArray();
    }


    private static String string(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static String objectString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static int number(Object value) {
        if (value == null) return -1;
        String digits = String.valueOf(value).replaceAll("\\D", "");
        try {
            return digits.isEmpty() ? -1 : Integer.parseInt(digits);
        } catch (NumberFormatException e) {
            return -1;
        }
    }

    private static String q(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private static String table(String schema, String table) {
        return q(schema) + "." + q(table);
    }

    private static String literal(String value) {
        return value.replace("'", "''");
    }

    private static String safe(String value) {
        return value == null ? "company" : value.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static WebApplicationException problem(Response.Status status, String message) {
        return new WebApplicationException(Response.status(status)
                .entity(Map.of("message", message))
                .type(MediaType.APPLICATION_JSON)
                .build());
    }

    private record Column(String name, boolean generated, boolean identityAlways, boolean sequenceColumn) { }

    private record Table(String name, List<Column> columns) { }

    private record Stats(int tables, long rows) { }


}
