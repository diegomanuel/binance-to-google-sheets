/**
 * Initialization on document open.
 */
function onOpen(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  const auth_mode = event && event.authMode ? event.authMode : ScriptApp.AuthMode.NONE;
  BinMenu(SpreadsheetApp.getUi(), auth_mode); // Add items to main menu
  if (BinUtils().isAuthEnough(auth_mode)) {
    BinSetup().configTriggers(); // Automatically keep the formulas updated!
  }

  Logger.log("Welcome to 'Binance to Google Sheets' by Diego Manuel, enjoy!  =]");
}

/**
 * Initialization on add-on install.
 */
function onInstall(event) {
  Logger.log("Binance to Google Sheets was installed!");
  onOpen(event);
}

/**
 * Script setup functions wrapper.
 */
function BinSetup() {
  const user_props = PropertiesService.getUserProperties();
  const regex_formula = new RegExp(/=.*BINANCE\s*\(/);
  let lock_retries = 5; // Max retries to acquire lock

  return {
    areAPIKeysConfigured,
    getAPIKey,
    setAPIKey,
    getAPISecret,
    setAPISecret,
    configAPIKeys,
    clearAPIKeys,
    configTriggers,
    forceRefreshSheetFormulas
  };
  
  
  /**
   * Returns true is API keys are configured
   */
  function areAPIKeysConfigured() {
    return getAPIKey() && getAPISecret();
  }

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
    let changed = false;
    let result = false;
    let user_input = null;

    // API KEY
    if (getAPIKey()) {
      text = "✅ Your Binance API Key is already set!\n\nYou can let it blank to keep the current one\nor re-enter a new one below to overwrite it:";
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
      changed = true;
      ui.alert("Binance API Key saved",
               "Your Binance API Key was successfully saved!",
               ui.ButtonSet.OK);
    }
  
    // API SECRET KEY
    if (getAPISecret()) {
      text = "✅ Your Binance API Secret Key is already set!\n\nYou can let it blank to keep the current one\nor re-enter a new one below to overwrite it:";
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
      changed = true;
      ui.alert("Binance API Secret Key saved",
               "Your Binance API Secret Key was successfully saved!",
               ui.ButtonSet.OK);
    }

    const api_key = getAPIKey();
    const api_secret = getAPISecret();
    if (changed && api_key && api_secret) {
      return _refreshUI(); // Force UI refresh!
    }

    if (!api_key) {
      ui.alert("Binance API Key is not set!",
               "You just need a Binance API Key if you want open/done orders list.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
    if (!api_secret) {
      ui.alert("Binance API Secret Key is not set!",
               "You just need a Binance API Secret Key if you want open/done orders.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
  }

  /**
   * Clears configured API keys
   */
  function clearAPIKeys(ui) {
    const text = "Are you sure you want to remove your configured Binance API Keys?\n\nYou can always re-configure'em again later if you proceed here.";
    const result = ui.alert("Clear Binance API Keys", text, ui.ButtonSet.OK_CANCEL);
    if (result == ui.Button.OK) {
      user_props.deleteProperty(API_KEY_NAME);
      user_props.deleteProperty(API_SECRET_NAME);
      Logger.log("[clearAPIKeys] Binance API Keys were cleared!");
      BinUtils().toast("Binance API Keys were cleared! You can always re-configure'em again from 'Binance' main menu.", "", 30);
      _refreshUI(); // Force UI refresh!
    }
  }

  /**
   * Configs required triggers to automatically have the data updated.
   */
  function configTriggers() {
    // Time-based triggers config (everyMinutes: 1, 5, 10, 15 or 30)
    const triggers = {"doRefresh1m": 1, "doRefresh5m": 5, "doTablesPoll": 10};
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return configTriggers();
    }

    // First, deletes all triggers in the current project that belongs to this add-on
    Logger.log("[configTriggers] Removing previous triggers..");
    ScriptApp.getProjectTriggers().map(function(trigger) {
      return triggers[trigger.getHandlerFunction()] ? ScriptApp.deleteTrigger(trigger) : false;
    });

    if (DEBUG) {
      return Logger.log("[configTriggers] Skipping triggers creation while debugging..!");
    }

    try { // Create triggers again
      Logger.log("[configTriggers] Creating new triggers with: "+JSON.stringify(triggers));
      const results = Object.keys(triggers).map(function(func) {
        return ScriptApp.newTrigger(func)
          .timeBased()
          .everyMinutes(triggers[func])
          .create();
      });
      lock.releaseLock();
      return results;
    } catch (err) {
      lock.releaseLock();
      if (err.message.match(/trigger must be at least one hour/i)) {
        Logger.log("[configTriggers] Can't create 1m and/or 5m triggers! => Fallback to 1h..");
        return ScriptApp.newTrigger("doRefresh1h")
          .timeBased()
          .everyHours(1)
          .create();
      }
      throw(err);
    }
  }

  /**
   * Changes formulas then changes them back to force-refresh'em.
   */
  function forceRefreshSheetFormulas(period) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let count = 0;

    Logger.log("Refreshing spreadsheet formulas..");
    const lock = BinUtils().getScriptLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return forceRefreshSheetFormulas(period);
    }

    ss.getSheets().map(function(sheet) {
      const range = sheet.getDataRange();
      const formulas = range.getFormulas();
      const changed = _replaceRangeFormulas(period, range, formulas, "");
      if (changed > 0) { // We have changed cell/s contents! => Set the formulas back to enforce recalculation
        SpreadsheetApp.flush();
        count +=_replaceRangeFormulas(period, range, formulas);
        SpreadsheetApp.flush();
      }
    });

    lock.releaseLock();
    Logger.log(count+" spreadsheet formulas were refreshed!");
    return count;
  }

  function _replaceRangeFormulas(period, range, formulas, formula) {
    const num_cols = range.getNumColumns();
    const num_rows = range.getNumRows();
    const row_offset = range.getRow();
    const col_offset = range.getColumn();
    let count = 0;
    for (let row = 0; row < num_rows ; row++) {
      for (let col = 0; col < num_cols; col++) {
        if (_isFormulaReplacement(period, formulas[row][col])) {
          count++;
          range.getCell(row+row_offset, col+col_offset).setFormula(formula === "" ? "" : formulas[row][col]);
        }
      }
    }
    return count;
  }

  function _isFormulaReplacement(period, formula) {
    if (!(formula != "" && regex_formula.test(formula))) {
      return false;
    }
    
    return  !period
              ||
            BinUtils().isFormulaMatching(BinDoCurrentPrices(), period, formula)
              ||
            BinUtils().isFormulaMatching(BinDo24hStats(), period, formula)
              ||
            BinUtils().isFormulaMatching(BinDoOrdersDone(), period, formula)
              ||
            BinUtils().isFormulaMatching(BinDoOrdersOpen(), period, formula)
              ||
            BinUtils().isFormulaMatching(BinDoAccountInfo(), period, formula)
              ||
            BinUtils().isFormulaMatching(BinDoLastUpdate(), period, formula);
          
  }

  function _refreshUI() {
    BinMenu(SpreadsheetApp.getUi()); // Update main menu items
    return forceRefreshSheetFormulas(); // Force refresh all formulas results!
  }
}

/**
 * These ones have to live here in the outside world
 * because of how `ScriptApp.newTrigger` works.
 */
function doRefresh1m(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  BinDoOrdersTable().init(); // Initialize orders table sheets (if any)
  BinSetup().forceRefreshSheetFormulas("1m");
};
function doRefresh5m(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  BinSetup().forceRefreshSheetFormulas("5m");
};
function doRefresh1h(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  BinSetup().forceRefreshSheetFormulas(); // Refresh'em all!
};
function doTablesPoll(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }

  BinDoOrdersTable().execute();
}