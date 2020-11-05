/**
 * Executes setup on document open and add-on install.
 */
function onOpen(e) {
  BinMenu(SpreadsheetApp.getUi());
  BinSetup().configTrigger(); // Automatically keep the prices updated!
  Logger.log("EVENT: "+JSON.stringify(e));
  Logger.log("Welcome to 'Binance to Google Sheets' by Diego Calero, enjoy!  =]");
  SpreadsheetApp.getActive().toast("Enabled, enjoy it!  =]", "Binance to Google Sheets", 10);
}

function onInstall(e) {
  Logger.log("Installing 'Binance to Google Sheets'..");
  onOpen(e);
}

/**
 * Script setup functions wrapper.
 */
function BinSetup() {
  const user_props = PropertiesService.getUserProperties();
  const regex_formula = new RegExp(/=.*BINANCE\s*\(/);

  return {
    areAPIKeysConfigured,
    getAPIKey,
    setAPIKey,
    getAPISecret,
    setAPISecret,
    configAPIKeys,
    configTrigger,
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
      changed = true;
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
      changed = true;
      ui.alert("Binance API Secret Key saved",
               "Your Binance API Secret Key was successfully saved!",
               ui.ButtonSet.OK);
    }

    const api_key = getAPIKey();
    const api_secret = getAPISecret();
    if (changed && api_key && api_secret) {
      return forceRefreshSheetFormulas(); // Force refresh all formulas results!
    }

    if (!api_key) {
      ui.alert("Binance API Key is not set!",
               "You just need a Binance API Key if you want open/closed orders list.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
    if (!api_secret) {
      ui.alert("Binance API Secret Key is not set!",
               "You just need a Binance API Secret Key if you want open/closed orders.\n\n"+
               "It's NOT needed to get market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
  }

  /**
   * Configs a trigger to automatically have the data updated.
   */
  function configTrigger() {
    // First, deletes all triggers in the current project
    ScriptApp.getProjectTriggers().map(function(trigger) {
      return ScriptApp.deleteTrigger(trigger);
    });

    // Create triggers again
    ScriptApp.newTrigger("doRefresh1m")
      .timeBased()
      .everyMinutes(1)
      .create();
    ScriptApp.newTrigger("doRefresh5m")
      .timeBased()
      .everyMinutes(5)
      .create();
  }

  /**
   * Changes formulas then changes them back to force-refresh'em.
   */
  function forceRefreshSheetFormulas(period) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let count = 0;

    Logger.log("Refreshing spreadsheet formulas..");
    ss.getSheets().map(function(sheet) {
      const range = sheet.getDataRange();
      const formulas = range.getFormulas();
      const changed = _replaceRangeFormulas(period, range, formulas, "");
      if (changed > 0) {
        SpreadsheetApp.flush();
        count +=_replaceRangeFormulas(period, range, formulas);
        SpreadsheetApp.flush();
      }
    });
    Logger.log(count+" spreadsheet formulas were refreshed!");
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
      };
    };
    return count;
  }

  function _isFormulaReplacement(period, formula) {
    if (!(formula != "" && regex_formula.test(formula))) {
      return false;
    }
    
    return  !period
              ||
            BinDoCurrentPrices().isFormulaReplacement(period, formula)
              ||
            BinDo24hStats().isFormulaReplacement(period, formula)
              ||
            BinDoDoneOrders().isFormulaReplacement(period, formula)
              ||
            BinDoOpenOrders().isFormulaReplacement(period, formula)
              ||
            BinDoLastUpdate().isFormulaReplacement(period, formula);
          
  }
}

/**
 * These ones have to live here in the outside world
 * because of how `ScriptApp.newTrigger` works.
 */
function doRefresh1m(e) {
  Logger.log("EVENT: "+JSON.stringify(e));
  BinSetup().forceRefreshSheetFormulas("1m");
};
function doRefresh5m(e) {
  Logger.log("EVENT: "+JSON.stringify(e));
  BinSetup().forceRefreshSheetFormulas("5m");
};