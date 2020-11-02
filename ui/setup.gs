/**
 * Script setup functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinSetup() {
  const user_props = PropertiesService.getUserProperties();

  return {
    getAPIKey,
    setAPIKey,
    getAPISecret,
    setAPISecret,
    configAPIKeys
  };
  
  
  /**
   * Returns the Binance API Key
   */
  function getAPIKey() {
    return user_props.getProperty(API_KEY_NAME) || "";
  }
  /**
   * Returns the Binance API Key
   */
  function setAPIKey(value) {
    return user_props.setProperty(API_KEY_NAME, value);
  }

  /**
   * Returns the Binance API Secret
   */
  function getAPISecret() {
    return user_props.getProperty(API_SECRET_NAME) || "";
  }
  /**
   * Sets the Binance API Secret
   */
  function setAPISecret(value) {
    return user_props.setProperty(API_SECRET_NAME, value);
  }

  /**
   * API keys configuration.
   */
  function configAPIKeys(ui) {
    let text = "";
    let result = false;
    let user_input = null;

    // API KEY
    if (getAPIKey()) {
      text = "✅ Your Binance API key is already set!\n\nYou can still re-enter it below to override its current value:";
    } else {
      text = "Please enter your Binance API Key below:";
    }
    result = ui.prompt("Set Binance API Key", text, ui.ButtonSet.OK_CANCEL);
    user_input = result.getResponseText().replace(/\s+/g, '');
    if (result.getSelectedButton() != ui.Button.OK) {
      return false; // Cancel setup
    }
    if (user_input) {
      setAPIKey(user_input);
      ui.alert("Binance API Key saved",
               "Your Binance API Key was successfully saved!",
               ui.ButtonSet.OK);
    }
  
    // API SECRET KEY
    if (getAPISecret()) {
      text = "✅ Your Binance API Secret key is already set!\n\nYou can still re-enter it below to override its current value:";
    } else {
      text = "Please enter your Binance API Secret Key below:";  
    }
    result = ui.prompt("Set Binance API Secret Key", text, ui.ButtonSet.OK_CANCEL);
    user_input = result.getResponseText().replace(/\s+/g, '');
    if (result.getSelectedButton() != ui.Button.OK) {
      return false; // Cancel setup
    }
    if (user_input) {
      setAPISecret(user_input);
      ui.alert("Binance API Secret Key saved",
               "Your Binance API Secret Key was successfully saved!",
               ui.ButtonSet.OK);
    }

    if (!getAPIKey()) {
      ui.alert("Binance API Key is not set!",
               "You just need a Binance API Key if you want open/closed orders list.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
    if (!getAPISecret()) {
      ui.alert("Binance API Secret Key is not set!",
               "You just need a Binance API Secret Key if you want open/closed orders.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
  }
}