# https://developers.google.com/apps-script/guides/clasp

# Read: 
export SCRIPT_ID="replace-me"

all: push
	@cd ../binance-to-google-sheets-copies && ${MAKE}

push:
	@clasp push

versions:
	@clasp versions

deploys:
	@clasp deployments

apply:
	@echo "@TODO Coming soon!"

demo:
	@cd ../binance-to-google-sheets-copies && ${MAKE} demo

.PHONY: demo