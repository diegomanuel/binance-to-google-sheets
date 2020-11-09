# https://developers.google.com/apps-script/guides/clasp

# You can replace it with your own script ID so you can call `make apply` directly.
export SCRIPT_ID=replace-me

all: push
	@cd ../binance-to-google-sheets-copies && ${MAKE}

push:
	@echo "Pushing Binance to Google Sheets to:"
	@cat .clasp.json
	@clasp push

versions:
	@clasp versions

deploys:
	@clasp deployments

apply:
	@echo "Binance to Google Sheets is being applied to SCRIPT_ID: ${SCRIPT_ID}"
	@echo '{"scriptId":"${SCRIPT_ID}"}' > .clasp.json
	@${MAKE} push

demo:
	@cd ../binance-to-google-sheets-copies && ${MAKE} demo

.PHONY: demo