all: help

VERSION = 1.0
IMAGE   = hive-postgres
REPO    = docker.salsitasoft.com/

.PHONY: help
help:
	@printf "%s\n%s\n" "create a postgres docker image" \
		"Usage: make docker"


.PHONY: docker
docker:
	docker build --no-cache --rm -t $(IMAGE) docker
	docker tag -f $(IMAGE) $(REPO)$(IMAGE):$(VERSION)
	docker tag -f $(IMAGE) $(REPO)$(IMAGE):latest
