up:
	docker-compose up --build
down:
	docker-compose down
stop:
	docker-compose stop
build:
	docker-compose build
iclean:
	docker image prune --force
vclean:
	docker volume prune --force
cleanall: stop down iclean vclean
ps:
	docker ps
images:
	docker images

.PHONY: up down stop build iclean vclean cleanall ps images