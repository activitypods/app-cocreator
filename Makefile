.DEFAULT_GOAL := start
.PHONY: start stop logs

DOCKER_COMPOSE_DEV=docker compose -f docker-compose-dev.yml --env-file .env

start:
	$(DOCKER_COMPOSE_DEV) up -d

stop:
	$(DOCKER_COMPOSE_DEV) down

logs:
	$(DOCKER_COMPOSE_DEV) logs -f activitypods-backend
