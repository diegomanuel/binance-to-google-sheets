# https://developers.google.com/apps-script/guides/clasp

all: push
	@cd ../binance-to-google-sheets-copies && ${MAKE}

push:
	@clasp push

versions:
	@clasp versions

deploys:
	@clasp deployments

demo:
	@cd ../binance-to-google-sheets-copies && ${MAKE} demo

.PHONY: demo