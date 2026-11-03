# quarkus-app

This project uses Quarkus, the Supersonic Subatomic Java Framework.

If you want to learn more about Quarkus, please visit its website: <https://quarkus.io/>.

## Running the application in dev mode

You can run your application in dev mode that enables live coding using:

```shell script
./mvnw compile quarkus:dev
```

> **_NOTE:_**  Quarkus now ships with a Dev UI, which is available in dev mode only at <http://localhost:8080/q/dev/>.

## Packaging and running the application

The application can be packaged using:

```shell script
./mvnw package
```

It produces the `quarkus-run.jar` file in the `target/quarkus-app/` directory.
Be aware that it’s not an _über-jar_ as the dependencies are copied into the `target/quarkus-app/lib/` directory.

The application is now runnable using `java -jar target/quarkus-app/quarkus-run.jar`.

If you want to build an _über-jar_, execute the following command:

```shell script
./mvnw package -Dquarkus.package.jar.type=uber-jar
```

The application, packaged as an _über-jar_, is now runnable using `java -jar target/*-runner.jar`.

## Creating a native executable

You can create a native executable using:

```shell script
./mvnw package -Dnative
```

Or, if you don't have GraalVM installed, you can run the native executable build in a container using:

```shell script
./mvnw package -Dnative -Dquarkus.native.container-build=true
```

You can then execute your native executable with: `./target/quarkus-app-1.0.0-SNAPSHOT-runner`

If you want to learn more about building native executables, please consult <https://quarkus.io/guides/maven-tooling>.

## Related Guides

- Qute ([guide](https://quarkus.io/guides/qute)): Offer templating support for web, email, etc in a build time, type-safe way
- JDBC Driver - PostgreSQL ([guide](https://quarkus.io/guides/datasource)): Connect to the PostgreSQL database via JDBC
- RESTEasy Classic ([guide](https://quarkus.io/guides/resteasy)): REST endpoint framework implementing Jakarta REST and more

## Provided Code

### RESTEasy JAX-RS

Easily start your RESTful Web Services

[Related guide section...](https://quarkus.io/guides/getting-started#the-jax-rs-resources)


// =====================================================================================
// 2) Tạo cặp khóa RSA (chạy 1 lần), đặt 2 file .pem vào src/main/resources
// =====================================================================================
//   openssl genrsa -out rsaPrivateKey.pem 2048
//   openssl rsa -pubout -in rsaPrivateKey.pem -out publicKey.pem
//   openssl pkcs8 -topk8 -nocrypt -inform pem -in rsaPrivateKey.pem -outform pem -out privateKey.pem
//   (xóa rsaPrivateKey.pem; KHÔNG commit privateKey.pem lên git, production nên nạp từ secret/đường dẫn ngoài)

## Đóng gói & Cài đặt cho Khách hàng (Windows / Linux)

Bộ cài đặt đóng gói sẵn toàn bộ Docker images (`app`, `postgres:16-alpine`, `nginx:1.27-alpine`), file cấu hình và script khởi chạy. Máy khách hàng chỉ cần có sẵn **Docker** (Docker Engine trên Linux hoặc Docker Desktop trên Windows) và **không cần** kết nối Internet để tải image.

### 1. Tạo bộ cài đặt (trên máy Dev / Build)

Có 2 chế độ đóng gói:

* **Bản JVM (nhanh, tương thích rộng):**
  ```bash
  ./build-images.sh
  ```
  Kết quả tạo ra file: `deployment-package.tar.gz`

* **Bản Native GraalVM (khởi động cực nhanh, tốn ít RAM):**
  ```bash
  ./build-images-native.sh
  ```
  Kết quả tạo ra file: `deployment-package-native.tar.gz`

Bên trong gói `.tar.gz` bao gồm:
```text
├── docker-compose.yml
├── .env.example
├── install.sh / start.sh       # Dành cho Linux / macOS / Git Bash
├── install.bat / start.bat     # Dành cho Windows (CMD / PowerShell)
├── nginx/
│   └── default.conf
└── images/
    ├── app-image.tar.gz
    ├── postgres-image.tar.gz
    └── nginx-image.tar.gz
```

---

### 2. Cài đặt và chạy trên máy Khách hàng (Linux)

1. **Giải nén gói cài đặt:**
   ```bash
   mkdir -p ketoan && tar -xzf deployment-package.tar.gz -C ketoan
   cd ketoan
   ```

2. **Chạy cài đặt lần đầu** (tạo thư mục `postgres_data`, `uploads`, nạp Docker images từ `./images` và sinh file `.env`):
   ```bash
   chmod +x install.sh start.sh
   ./install.sh
   ```
   *(Tùy chọn)* Mở file `.env` để đổi cổng `HTTP_PORT` (mặc định là `80`, ví dụ đổi thành `HTTP_PORT=8080` nếu cổng 80 đang bận).

3. **Khởi động hệ thống:**
   ```bash
   ./start.sh
   ```
   Truy cập ứng dụng tại: `http://localhost` (hoặc `http://localhost:<HTTP_PORT>`).

---

### 3. Cài đặt và chạy trên máy Khách hàng (Windows)

1. **Yêu cầu:** Cài đặt và bật sẵn **Docker Desktop** (đợi biểu tượng Docker ở góc dưới bên phải báo *Engine running*).
2. **Giải nén gói cài đặt** (bằng 7-Zip, WinRAR hoặc lệnh `tar` có sẵn trên Windows 10/11):
   ```cmd
   mkdir C:\ketoan
   tar -xzf deployment-package.tar.gz -C C:\ketoan
   cd /d C:\ketoan
   ```
3. **Chạy cài đặt lần đầu** (trong `cmd` hoặc `PowerShell`, hoặc nháy đúp vào `install.bat`):
   ```cmd
   install.bat
   ```
   *(Tùy chọn)* Mở file `.env` bằng Notepad để chỉnh `HTTP_PORT=8080` nếu cổng `80` trên Windows đang bị IIS/hệ thống chiếm.
4. **Khởi động hệ thống:**
   ```cmd
   start.bat
   ```
   Truy cập ứng dụng tại: `http://localhost` (hoặc `http://localhost:<HTTP_PORT>`).

---

### 4. Các lệnh quản trị thường dùng trên máy Khách hàng

* **Xem trạng thái các container:**
  ```bash
  docker compose ps
  ```
* **Xem log ứng dụng:**
  ```bash
  docker compose logs -f app
  ```
* **Dừng hệ thống:**
  ```bash
  docker compose stop
  ```
* **Khởi động lại hệ thống:**
  ```bash
  docker compose restart
  ```

---

## Chạy chế độ Debug / Dev (trên máy lập trình)

1. Chỉ chạy PostgreSQL trong Docker:
   ```bash
   docker compose up -d postgres
   ```
2. Chạy Quarkus Dev trên máy host (tự động phục vụ cả `/api/*`, giao diện React Quinoa và `/uploads/*`):
   ```bash
   ./mvnw quarkus:dev
   ```
   *(Nếu muốn chạy thêm container `nginx` khi debug: `docker compose up -d postgres nginx`, Nginx sẽ tự động fallback về `host.docker.internal:8080` khi container `app` tắt).*

## Các lệnh tham khảo khác

docker compose --env-file .env up postgres nginx -d

docker compose up -d --force-recreate app

docker compose up -d pgadmin

docker compose up -d postgres

docker stats --no-stream

1. Change quarkus/src/main/resources/*pem-sample to *.pem
2. Change quarkus/src/main/webui/.env.local-sample to .env.local

# clean db
 quarkus_flyway_clean_at_start=true ./mvnw clean compile quarkus:dev

# Test create
curl -i -X POST http://localhost:8080/api/auth/register \
   -H "Content-Type: application/json" \
   -d '{"username": "user2", "password": "123"}'

# Test login
curl -i -X POST http://localhost:8080/api/auth/login \
   -H "Content-Type: application/json" \
   -d '{"username": "user1", "password": "123"}'

# Test login HTTP_ONLY
curl -i -X POST http://localhost:8080/api/auth/loginv1 \
  -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "password": "123"
  }'






