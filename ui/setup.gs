/**
 * Initialization on document open.
 */
function onOpen(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  const setup = BinSetup();
  BinMenu(SpreadsheetApp.getUi()); // Add items to main menu
  if (setup.isReady()) { // Add-on is ready!
    setup.init();
    BinUtils().toast("Hi there! I'm installed and working at this spreadsheet. Enjoy it!  =]");
  } else { // Add-on is not ready! It might be due to missing authorization or permissions removal (BinScheduler is stalled or never run)
    Logger.log("The add-on is NOT authorized!");
    BinUtils().toast("The add-on is NOT authorized! Click 'Authorize add-on!' button on 'Binance' menu TWICE.", "", 600);
  }

  Logger.log("Welcome to 'Binance to Google Sheets' by Diego Manuel, enjoy!  =]");
}

/**
 * Initialization on add-on install.
 * This would never happen since the add-on isn't installed from marketplace.. but whatever..!
 */
function onInstall(event) {
  Logger.log("Binance to Google Sheets was installed!");
  onOpen(event);
}

/**
 * Script setup functions wrapper.
 */
function BinSetup() {
  const API_KEY_NAME = "BIN_API_KEY";
  const API_SECRET_NAME = "BIN_API_SECRET";
  const WALLETS_DISABLED_NAME = "BIN_WALLETS_DISABLED";
  const SUB_ACCOUNTS_NAME = "BIN_SUB_ACCOUNTS";
  const user_props = PropertiesService.getUserProperties();

  return {
    init,
    authorize,
    isReady,
    areAPIKeysConfigured,
    getAPIKey,
    setAPIKey,
    getAPISecret,
    setAPISecret,
    configAPIKeys,
    clearAPIKeys,
    toggleWalletDisabled,
    getDisabledWallets,
    addSubAccount,
    removeSubAccount,
    getSubAccounts
  };

  /**
   * Runs initialization tasks
   */
  function init() {
    BinScheduler().init(); // Mark the scheduler as initialized
    _configTriggers(); // Create triggers to automatically keep the formulas updated
  }

  /**
   * Sadly, we can't detect from within the code when the user authorizes the add-on
   * since there is NO `onAuthorize` trigger or something like that (basically a mechanism to let the code know when it gets authorized).
   * The `onInstall` trigger only works when the add-on is installed from the Google Marketplace, but
   * this is not our case (and besides, marketplace add-ons can't have triggers smaller than 1 hour.. so totally discarded).
   * So, this is an "ugly workaround" to try to help the user to get things working in the initial setup!
   */
  function authorize() {
    init();
    Logger.log("The add-on is authorized, enjoy!");
    BinUtils().toast("The add-on is authorized and running, enjoy!", "Ready to rock", 10);
    BinUtils().refreshMenu(); // Refresh add-on's main menu items
  }

  /**
   * Returns true if the add-on is setup and ready to rock!
   */
  function isReady() {
    const isStalled = BinScheduler().isStalled();
    const authFull = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL).getAuthorizationStatus();
    const authLimited = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.LIMITED).getAuthorizationStatus();
    return !isStalled &&
      (authFull === ScriptApp.AuthorizationStatus.NOT_REQUIRED || authLimited === ScriptApp.AuthorizationStatus.NOT_REQUIRED);
  }

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
               "You just need a Binance API Key if you want to use private operations.\n\n"+
               "It's NOT needed to use public operations like current market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
    if (!api_secret) {
      ui.alert("Binance API Secret Key is not set!",
               "You just need a Binance API Secret Key if you to use private operations.\n\n"+
               "It's NOT needed to use public operations like current market prices and 24hr stats!",
               ui.ButtonSet.OK);
    }
  }

  /**
   * Clears configured API keys
   */
  function clearAPIKeys(ui) {
    const text = "Are you sure you want to remove your configured Binance API Keys?\n\nYou can always re-configure'em again later if you proceed here.";
    const result = ui.alert("Clear Binance API Keys", text, ui.ButtonSet.OK_CANCEL);
    if (result !== ui.Button.OK) {
      return false; // Cancel
    }

    user_props.deleteProperty(API_KEY_NAME);
    user_props.deleteProperty(API_SECRET_NAME);
    Logger.log("[clearAPIKeys] Binance API Keys were cleared!");
    BinUtils().toast("Binance API Keys were cleared! You can always re-configure'em again from 'Binance' main menu.", "", 30);
    _refreshUI(); // Force UI refresh!
  }

  /**
   * Toggles the enabled/disabled status for a given wallet type
   */
  function toggleWalletDisabled(type, ui) {
    const wallets = getDisabledWallets();
    const disabled = !!wallets[type];
    const title = (disabled?"En":"Dis")+"able wallet: "+type.toUpperCase();
    const text = "You will "+(disabled?"EN":"DIS")+"ABLE the "+type.toUpperCase()+" wallet!\nProceed?";
    const result = ui.alert(title, text, ui.ButtonSet.OK_CANCEL);
    if (result !== ui.Button.OK) {
      return false; // Cancel
    }

    Logger.log("[BinSetup] "+(disabled?"En":"Dis")+"abling wallet: "+type.toUpperCase());
    wallets[type] = !disabled;
    user_props.setProperty(WALLETS_DISABLED_NAME, JSON.stringify(wallets));
    const bu = BinUtils();
    bu.refreshMenu();
    bu.toast("The "+type.toUpperCase()+" wallet was "+(disabled?"EN":"DIS")+"ABLED!\nPlease wait while assets are refreshed..", "", 30);

    Logger.log("[BinSetup] Clearing wallet assets and refreshing formulas..");
    const bw = BinWallet();
    bw.clearAssets(type);
    bw.refreshAssets();
    bu.forceRefreshSheetFormulas(BinDoAccountInfo().tag());

    return !disabled;
  }

  /**
   * Gets the current disabled wallets
   */
  function getDisabledWallets() {
    const data = user_props.getProperty(WALLETS_DISABLED_NAME);
    return data ? JSON.parse(data) : {};
  }

  /**
   * Adds a sub-account
   */
  function addSubAccount(ui) {
    const available = BinDoAccountInfo().listSubAccounts().map((subacc) => subacc.email);
    if (!available.length) {
      ui.alert("No Sub-Accounts Available",
               "You don't have any sub-account yet!\nYou must create one at Binance first.",
               ui.ButtonSet.OK);
      return false; // Cancel
    }
    Logger.log("[BinSetup] Available sub-accounts detected: "+available.length+"\n"+JSON.stringify(available));

    const subaccs = getSubAccounts();
    const text = "Please enter the sub-account email that you want to add:\n"+
      "\nAvailable sub-accounts detected: "+available.length+"\n"+available.join("\n")+"\n"+
      "\nCurrently added sub-accounts:\n"+(Object.keys(subaccs).join("\n")||"- none -");
    const result = ui.prompt("Add Sub-Account", text, ui.ButtonSet.OK_CANCEL);
    if (result.getSelectedButton() != ui.Button.OK) {
      return false; // Cancel
    }
    const email = result.getResponseText().replace(/\s+/g, '');
    if (!email) {
      return false; // Cancel
    }
    if (available.indexOf(email) === -1) {
      ui.alert("Sub-Account Not Found",
               "ERROR: The email '"+email+"' is not part of your available sub-accounts emails!\n\nAvailable sub-account emails:\n"+available.join("\n"),
               ui.ButtonSet.OK);
      return false; // Cancel
    }

    Logger.log("[BinSetup] Adding sub-account: "+email);
    subaccs[email] = email; // @TODO Add some useful data here?
    user_props.setProperty(SUB_ACCOUNTS_NAME, JSON.stringify(subaccs));
    BinDoAccountInfo().schedule(); // Update assets in the next "1m" trigger run
    BinUtils().refreshMenu();
    Logger.log("[BinSetup] Currently added sub-accounts:\n"+JSON.stringify(Object.keys(subaccs)));
    ui.alert("Sub-Account Added",
             "Email '"+email+"' was successfully added as sub-account!\n\nAccount assets will be refreshed in the next minute..",
             ui.ButtonSet.OK);
    return email;
  }

  /**
   * Removes a sub-account
   */
  function removeSubAccount(ui) {
    const subaccs = getSubAccounts();
    const text = "Please enter the sub-account email that you want to remove:\n"+
      "\nCurrently added sub-accounts:\n"+(Object.keys(subaccs).join("\n")||"- none -");
    const result = ui.prompt("Remove Sub-Account", text, ui.ButtonSet.OK_CANCEL);
    if (result.getSelectedButton() != ui.Button.OK) {
      return false; // Cancel
    }
    const email = result.getResponseText().replace(/\s+/g, '');
    if (!email) {
      return false; // Cancel
    }
    if (!subaccs[email]) {
      ui.alert("Remove Sub-Account",
               "ERROR: The email '"+email+"' doesn't belong to any added sub-account!",
               ui.ButtonSet.OK);
      return false; // Cancel
    }

    Logger.log("[BinSetup] Removing sub-account: "+email);
    delete subaccs[email];
    user_props.setProperty(SUB_ACCOUNTS_NAME, JSON.stringify(subaccs));
    BinDoAccountInfo().schedule(); // Update assets in the next "1m" trigger run
    BinUtils().refreshMenu();
    Logger.log("[BinSetup] Currently added sub-accounts:\n"+JSON.stringify(Object.keys(subaccs)));
    ui.alert("Sub-Account Removed",
             "Email '"+email+"' was successfully removed as sub-account!\n\nAccount assets will be refreshed in the next minute..",
             ui.ButtonSet.OK);
    return email;
  }

  /**
   * Gets the current added sub-accounts
   */
  function getSubAccounts() {
    const data = user_props.getProperty(SUB_ACCOUNTS_NAME);
    return data ? JSON.parse(data) : {};
  }

  /**
   * Configs required triggers to automatically have the data updated.
   */
  function _configTriggers() {
    // Time-based triggers config
    const triggers = {
      "doRefresh1m": [1, false],
      "doRefresh5m": [5, false],
      "doRefresh10m": [10, false],
      "doRefresh15m": [15, false],
      "doRefresh30m": [30, false],
      "doRefresh1h": [60, false],
      "doTablesPoll": [10, false] // This one will have its own trigger fixed at 10m
    };

    // First, check which triggers were already created
    ScriptApp.getProjectTriggers().map(function(trigger) {
      if (triggers[trigger.getHandlerFunction()]) { // This trigger already exists and belongs to this add-on
        if (DEBUG) { // Remove triggers while debugging..!
          ScriptApp.deleteTrigger(trigger);
        }
        triggers[trigger.getHandlerFunction()][1] = true; // Mark it as created
      }
    });

    if (DEBUG) {
      return Logger.log("[configTriggers] Removed add-on triggers and skipping creation while debugging..!");
    }

    try { // Create missing triggers (if any)
      return Object.keys(triggers).map(function(func) {
        const [triggerMinutes, triggerCreated] = triggers[func];
        if (triggerCreated) { // This trigger was marked as already created!
          Logger.log("[configTriggers] Trigger already setup every "+triggerMinutes+"m: "+func);
          return false; // Skip
        }
        Logger.log("[configTriggers] Creating new trigger every "+triggerMinutes+"m: "+func);
        return ScriptApp.newTrigger(func)
          .timeBased()
          [triggerMinutes < 60 ? "everyMinutes" : "everyHours"](triggerMinutes < 60 ? triggerMinutes : Math.floor(triggerMinutes / 60))
          .create();
      });
    } catch (err) {
      if (err.message.match(/trigger must be at least one hour/i)) {
        // This can only happen if it was installed as an add-on!
        // This is discouraged and the user should instead follow the setup steps in README.md
        // to properly setup the fully-working code with all the needed permissions.
        console.error("[configTriggers] Can't create <1h triggers!");
        BinUtils().toast("Couldn't create triggers to keep data updated! Follow the setup steps in README.md to have it working properly.", "", 30);
      }
      throw(err);
    }
  }

  function _refreshUI() {
    BinUtils().refreshMenu(); // Refresh main menu items
    return BinUtils().forceRefreshSheetFormulas(); // Force refresh all formulas!
  }
}

/**
 * These ones have to live here in the outside world
 * because of how `ScriptApp.newTrigger` works.
 */
function doRefresh1m(event) {
  _callScheduler(event, "1m");
}
function doRefresh5m(event) {
  _callScheduler(event, "5m");
}
function doRefresh10m(event) {
  _callScheduler(event, "10m");
}
function doRefresh15m(event) {
  _callScheduler(event, "15m");
}
function doRefresh30m(event) {
  _callScheduler(event, "30m");
}
function doRefresh1h(event) {
  _callScheduler(event, "60m");
}

function doTablesPoll(event) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  if (BinSetup().areAPIKeysConfigured()) {
    BinDoOrdersTable().execute();
  }
}

function _callScheduler(event, every) {
  if (DEBUG) {
    Logger.log("EVENT: "+JSON.stringify(event));
  }
  BinScheduler()["run"+every]();
}