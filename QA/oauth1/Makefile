all: help

VERSION = 0.4
IMAGE   = service-test
REPO    = docker.salsitasoft.com/


.PHONY: help
help:
	@printf "%s\n%s\n" "create a nodejs-expres-oauth docker image to test API calls [my-app]->[this-service-provider]" \
		"Usage: make docker"


.PHONY: docker
docker:
	rm -rf tmp-build
	mkdir tmp-build
	tar cz -C express-oauth -f tmp-build/components.tgz .
	cp docker/* tmp-build/
	docker build --no-cache --rm -t $(IMAGE) tmp-build
	docker tag -f $(IMAGE) $(REPO)$(IMAGE):$(VERSION)
	docker tag -f $(IMAGE) $(REPO)$(IMAGE):latest
	rm -rf tmp-build

