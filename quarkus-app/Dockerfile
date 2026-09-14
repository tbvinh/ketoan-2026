# Stage build: dùng Maven + JDK 21
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn package -DskipTests

# Stage run: chỉ cần JRE 21
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/quarkus-app/ .
CMD ["java", "-jar", "quarkus-run.jar"]

