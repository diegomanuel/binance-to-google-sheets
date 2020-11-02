/**
 * Script setup functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinSetup(ui) {
  return {
    APIKeys
  };
  
  
  /**
   * API keys configuration.
   */
  function APIKeys() {
    const html = HtmlService.createHtmlOutputFromFile("BinSetup")
      .setTitle("Binance to GoogleSheets")
      .setWidth(300);
    
    return SpreadsheetApp.getUi()
      .showSidebar(html);
  }
  
  function APIKeys2() {
    const userProperties = PropertiesService.getUserProperties();
    const api_key = userProperties.getProperty(API_KEY_NAME);
    const api_secret = userProperties.getProperty(API_SECRET_NAME);
    let result = false;

    // API KEY
    if (api_key) {
      result = ui.prompt("Set API Key",
                         "✅ Your API key is already set!\n\nYou can still re-enter it below to override its current value:",
                         ui.ButtonSet.OK_CANCEL);
    } else {
      result = ui.prompt("Set API Key",
                         "Please enter your API Key below:",
                         ui.ButtonSet.OK_CANCEL);  
    }
    let button = result.getSelectedButton();
    let user_input = result.getResponseText().replace(/\s+/g, '');
    if (button == ui.Button.OK && user_input) {
      userProperties.setProperty(API_KEY_NAME, user_input);
      ui.alert("API Key saved",
               "Your API Key was successfully saved!",
               ui.ButtonSet.OK);
    }
  
    // API SECRET KEY
    if (api_secret) {
      result = ui.prompt("Set API Secret Key",
                         "✅ Your API Secret key is already set!\n\nYou can still re-enter it below to override its current value:",
                         ui.ButtonSet.OK_CANCEL);
    } else {
      result = ui.prompt("Set API Secret Key",
                         "Please enter your API Secret Key below:",
                         ui.ButtonSet.OK_CANCEL);  
    }
    button = result.getSelectedButton();
    user_input = result.getResponseText().replace(/\s+/g, '');
    if (button == ui.Button.OK && user_input) {
      userProperties.setProperty(API_SECRET_NAME, user_input);
      ui.alert("API Secret Key saved",
               "Your API Secret Key was successfully saved!",
               ui.ButtonSet.OK);
    }

    if (!userProperties.getProperty(API_KEY_NAME)) {
      ui.alert("API Key not set!",
               "You must set an API Key to use this script!",
               ui.ButtonSet.OK);
    }
    if (!userProperties.getProperty(API_SECRET_NAME)) {
      ui.alert("API Secret Key not set!",
               "You must set an API Secret Key to use this script!",
               ui.ButtonSet.OK);
    }
  }
}