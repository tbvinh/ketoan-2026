# Node.js for the Quinoa frontend build
FROM node:22-bookworm-slim AS node

# Stage build: Maven + JDK 21 + Node.js
FROM maven:3.9.9-eclipse-temurin-21 AS build
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -ntp -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -ntp -DskipTests package

# Stage run: JRE 21 with the Quarkus uber-jar
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/*-runner.jar /app/app.jar
ENV QUARKUS_HTTP_HOST=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

