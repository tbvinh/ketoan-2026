docker compose -f docker-compose.yml up -d

docker compose -f docker-compose.yml -f docker-compose.override.yml up quarkus

docker compose -f docker-compose.yml down


