/**
 * Adds menu items under "Binance" at main menu.
 */
function BinMenu(ui) {
  /**
   * Adds the menu items to spreadsheet's main menu
   */
  function addMenuItems(menu) {
    const is_ready = BinSetup().isReady();

    if (!is_ready) { // Add-on is not ready (unauthorized or BinScheduler is stalled or never run)
      menu.addItem("Authorize add-on!", "authorizeMe");
    } else {
      menu.addItem("Refresh", "forceRefreshFormulas");
    }
    menu.addSeparator()
        .addItem("Show API Last Update", "showAPILastUpdate")
        .addItem("Show Current Prices", "showCurrentPrices");
    if (is_ready) { // Add-on is authorized and running fine!
      if (BinSetup().areAPIKeysConfigured()) {
        menu.addItem("Show Open Orders", "showOpenOrders")
            .addSeparator()
            .addSubMenu(addSubAccountsMenu())
            .addSeparator()
            .addItem("Show API Keys", "showAPIKeys")
            .addSubMenu(ui.createMenu("Setup API Keys")
              .addItem("Re-configure API Keys", "showAPIKeysSetup")
              .addItem("Clear API Keys", "showAPIKeysClear"));
      } else {
        menu.addSeparator()
            .addItem("Setup API Keys", "showAPIKeysSetup");
      }
      menu.addSubMenu(ui.createMenu("Update Intervals")
            .addSubMenu(addTriggerIntervalItems("Prices", "Prices", BinDoCurrentPrices()))
            .addSubMenu(addTriggerIntervalItems("24h Stats", "24hStats", BinDo24hStats()))
            .addSubMenu(addTriggerIntervalItems("Account Info", "AccountInfo", BinDoAccountInfo()))
            .addSubMenu(addTriggerIntervalItems("Open Orders", "OrdersOpen", BinDoOrdersOpen()))
            .addSubMenu(addTriggerIntervalItems("Done Orders", "OrdersDone", BinDoOrdersDone()))
            .addSeparator()
            .addItem("Reset to Defaults", "resetTriggersIntervalConfig"));
      menu.addSeparator()
          .addItem("Credits", "showCredits")
          .addItem("Donate  =]", "showDonate")
          .addSeparator()
          .addItem("Version: "+VERSION, "showVersion");
    }
    
    menu.addToUi(); // Add menu items to the spreadsheet main menu
  }

  function addSubAccountsMenu() {
    const subaccs = BinSetup().getSubAccounts();
    const menu = ui.createMenu("Sub-Accounts")
      //.addItem("Show List", "showSubAccountsList") // @TODO Add sub-account list
      .addItem("Add Sub-Account", "showSubAccountsAdd");

    if (Object.keys(subaccs).length) {
      menu.addSeparator();
      Object.keys(subaccs).forEach(function(email) {
        menu.addItem(email, "showSubAccountsRemove");
      });
      menu.addSeparator()
        .addItem("Remove Sub-Accounts", "showSubAccountsRemove");
    }

    return menu;
  }

  /**
   * Helper to define each trigger's interval options
   */
  function addTriggerIntervalItems(menuText, func, module) {
    const funcName = "setIntervalFor"+func;
    const intervalSelected = (interval) => module.period() === interval ? "[X] " : "";
    return ui.createMenu(menuText+" ("+module.period()+")")
      .addItem(intervalSelected("1m")+"1 minute", funcName+"1m")
      .addItem(intervalSelected("5m")+"5 minutes", funcName+"5m")
      .addItem(intervalSelected("10m")+"10 minutes", funcName+"10m")
      .addItem(intervalSelected("15m")+"15 minutes", funcName+"15m")
      .addItem(intervalSelected("30m")+"30 minutes", funcName+"30m")
      .addItem(intervalSelected("60m")+"1 hour", funcName+"60m")
      .addSeparator()
      .addItem(intervalSelected("off")+"OFF!", funcName+"Off");
  }

  // Add the menu to the UI
  addMenuItems(ui.createMenu("Binance"));
  addMenuItems(ui.createAddonMenu());
}

/**
 * Forces all BINANCE() formulas recalculation on the current spreadsheet.
 * Cleans the cache first to ensure getting fresh data from Binance API!
 */
function forceRefreshFormulas() {
  const utils = BinUtils();
  utils.toast("Refreshing data, be patient..!", "", 5);
  BinCache().clean(); // Clean cache!
  utils.forceRefreshSheetFormulas(); // Refresh'em all!
}

/**
 * Triggers the modal to enable/authorize the add-on.
 * If this function gets executed, it means that the user has authorized the add-on!
 */
function authorizeMe() {
  BinSetup().authorize();
}

/**
 * Displays a modal with the datetime of the last Binance API call.
 */
function showAPILastUpdate() {
  const ui = SpreadsheetApp.getUi();
  const last_update = BinDoLastUpdate().run();
  const formatted = last_update+"" || "- never called yet -";
  ui.alert("Binance API last call", formatted, ui.ButtonSet.OK);
}

/**
 * Displays a modal with the most important crypto prices.
 * // @TODO Improve this to be like the 10th cryptos with most volume
 */
function showCurrentPrices() {
  const ui = SpreadsheetApp.getUi();
  const tickers = ["BTC", "BCH", "ETH", "LTC", "BNB"];
  const opts = {headers: false};
  const formatted = BinDoCurrentPrices().run(tickers, opts).map(function([symbol, price]) {
    return symbol+": $"+price;
  });
  ui.alert("Current Crypto Prices", formatted.join("\n"), ui.ButtonSet.OK);
}

/**
 * Displays a modal with current open orders (@TODO: Improve how it's displayed!).
 */
function showOpenOrders() {
  const ui = SpreadsheetApp.getUi();
  const data = BinDoOrdersOpen().run(null, {});
  const formatted = (data||[]).reduce(function(out, row) {
      if (out.length > 0) {
        row[0] = Utilities.formatDate(new Date(row[0]), "UTC", "MM-dd HH:mm");
        row[row.length-1] = "$"+row[row.length-1];
      }
      out.push(row.join(" || "));
      if (out.length === 1) {
        out.push("-------------------------------------------------------------------------------------------------");
      }
      return out;
    }, [])
    .join("\n");
  ui.alert("Current open orders ("+(data.length-1)+")", formatted, ui.ButtonSet.OK);
}

/**
 * Displays a modal to add a sub-account.
 */
function showSubAccountsAdd() {
  BinSetup().addSubAccount(SpreadsheetApp.getUi());
}

/**
 * Displays a modal to remove a sub-account.
 */
function showSubAccountsRemove() {
  BinSetup().removeSubAccount(SpreadsheetApp.getUi());
}

/**
 * Displays a modal with currently configured API keys.
 */
function showAPIKeys() {
  const ui = SpreadsheetApp.getUi();
  ui.alert("Binance API Keys",
           "API Key:\n"+
           (BinSetup().getAPIKey() || "- not set -")+"\n"+
           "\n"+
           "API Secret Key:\n"+
           (BinUtils().obscureSecret(BinSetup().getAPISecret()) || "- not set -")
           ,ui.ButtonSet.OK);
}

/**
 * Displays a modal to setup API keys.
 */
function showAPIKeysSetup() {
  BinSetup().configAPIKeys(SpreadsheetApp.getUi());
}

/**
 * Displays a modal to setup API keys.
 */
function showAPIKeysClear() {
  BinSetup().clearAPIKeys(SpreadsheetApp.getUi());
}

/**
 * Displays a modal with the current running version info
 */
function showVersion() {
  const ui = SpreadsheetApp.getUi();
  const title = "Binance to Google Sheets - "+VERSION;
  const body = "Diego Manuel - diegomanuel@gmail.com - Argentina\n"+
               REPO_URL+"\n"+
               "\n"+
               "\n"+
               "You are running version: '"+VERSION+"'\n"+
               "Check the github repo for the latest updates.\n"+
               "\n"+
               "\n"+
               "\n"+
               "Keep enjoying!  =]";
  ui.alert(title, body, ui.ButtonSet.OK);
  Logger.log("[Version] "+title);
}

/**
 * Displays a modal with the developer's credits!  =]
 */
function showCredits() {
  const ui = SpreadsheetApp.getUi();
  const title = "Credits - Binance to Google Sheets - "+VERSION;
  const body = "Diego Manuel - diegomanuel@gmail.com - Argentina\n"+
               REPO_URL+"\n"+
               "\n"+
               "\n"+
               "Diego says: Hello there folks!\n"+
               "Hope you enjoy this handy tool as it currently is for myself.  =]\n"+
               "\n"+
               "Some background: Why this tool had ever to come alive?!\n"+
               "I needed a way to have Binance data directly available at my Google Spreadsheet.\n"+
               "First, I've looked for several existing solutions, but none provided me the freedom, confidence and privacy that I want for this kind of delicate stuff.\n"+
               "It's a requirement for me that requests to Binance go directly from my spreadsheet to its API without any intermediary service in between.\n"+
               "So I decided to write my own code, all from scratch, with only my will and my javascript knownledge aboard..\n"+
               "..and I was so happy with the results that I simply decided to share it to the world!\n"+
               "\n"+
               "\n"+
               "I think and hope that many of you will find it as useful as it is for myself.\n"+
               "\n"+
               "Enjoy, cheers!";
  ui.alert(title, body, ui.ButtonSet.OK);
  Logger.log("[Credits] Diego Manuel - diegomanuel@gmail.com - "+REPO_URL);
}

/**
 * Displays a modal with the donation options  =]
 */
function showDonate() {
  const ui = SpreadsheetApp.getUi();
  const title = "Donate - Buy me a beer!  =]";
  const body = "Thank you for using Binance to Google Sheets add-on!\n"+
               "I really hope you enjoyed and loved it as much as I love to use it everyday.\n"+
               "\n"+
               "If your love is strong enough, feel free to share it with me!  =D\n"+
               "I will much appreciate any contribution and support to keep working on it.\n"+
               "I have several ideas for new features, so much more could come!\n"+
               "\n"+
               "\n"+
               "You can send any token through the Binance Smart Chain (BSC/BEP20) to:\n"+
               "0x1d047bc3e46ce0351fd0c44fc2a2029512e87a97\n"+
               "\n"+
               "But you can also use:\n"+
               "[BTC] BTC: 1FsN54WNibhhPhRt4vnAPRGgzaVeeFvEnM\n"+
               "[BTC] SegWit: bc1qanxn2ycp9em50hj5p7en6wxe962zj4umqvs7q9\n"+
               "[ETH] ERC20: 0x1d047bc3e46ce0351fd0c44fc2a2029512e87a97\n"+
               "[LTC] LTC: LZ8URuChzyuuy272isMCrts7R7UKtwnj6a\n"+
               "\n"+
               "------------------------------------------------\n"+
               "Don't you have a Binance account yet?\n"+
               "Register using the referal link below and get a 10% discount on fees for all your trades!\n"+
               "https://www.binance.com/en/register?ref=SM93PRAV\n"+
               "------------------------------------------------\n"+
               "\n"+
               "This software was published and released under the GPL-3.0 License.\n"+
               "\n"+
               "Use it wisely, happy trading!\n"+
               "Diego.";
  ui.alert(title, body, ui.ButtonSet.OK);
  Logger.log("[Donate] Buy me a beer!  =]");
}

/**
 * Below here, all the functions to configure trigger intervals
 */
function resetTriggersIntervalConfig() {
  const ui = SpreadsheetApp.getUi();
  const text = "Proceed to reset your intervals configuration for triggers to default values?";
  const result = ui.alert("Confirm reset to defaults", text, ui.ButtonSet.OK_CANCEL);
  if (result == ui.Button.OK) {
    BinScheduler().cleanSchedules();
    BinUtils().toast("Intervals configuration for triggers were reset to its defaults!");
    BinUtils().refreshMenu(); // Refresh main menu items
  }
}

function _setIntervalFor(operation, interval) {
  BinScheduler().setSchedule(operation, interval);
  BinUtils().toast("Configured schedule for ["+operation+"] every ["+interval+"]");
  BinUtils().refreshMenu(); // Refresh main menu items
}

// PRICES
function _setIntervalForPrices(interval) {
  _setIntervalFor(BinDoCurrentPrices().tag(), interval);
}
function setIntervalForPricesOff() {
  _setIntervalForPrices("off");
}
function setIntervalForPrices1m() {
  _setIntervalForPrices("1m");
}
function setIntervalForPrices5m() {
  _setIntervalForPrices("5m");
}
function setIntervalForPrices10m() {
  _setIntervalForPrices("10m");
}
function setIntervalForPrices15m() {
  _setIntervalForPrices("15m");
}
function setIntervalForPrices30m() {
  _setIntervalForPrices("30m");
}
function setIntervalForPrices60m() {
  _setIntervalForPrices("60m");
}

// 24H STATS
function _setIntervalFor24hStats(interval) {
  _setIntervalFor(BinDo24hStats().tag(), interval);
}
function setIntervalFor24hStatsOff() {
  _setIntervalFor24hStats("off");
}
function setIntervalFor24hStats1m() {
  _setIntervalFor24hStats("1m");
}
function setIntervalFor24hStats5m() {
  _setIntervalFor24hStats("5m");
}
function setIntervalFor24hStats10m() {
  _setIntervalFor24hStats("10m");
}
function setIntervalFor24hStats15m() {
  _setIntervalFor24hStats("15m");
}
function setIntervalFor24hStats30m() {
  _setIntervalFor24hStats("30m");
}
function setIntervalFor24hStats60m() {
  _setIntervalFor24hStats("60m");
}

// ACCOUNT INFO
function _setIntervalForAccountInfo(interval) {
  _setIntervalFor(BinDoAccountInfo().tag(), interval);
}
function setIntervalForAccountInfoOff() {
  _setIntervalForAccountInfo("off");
}
function setIntervalForAccountInfo1m() {
  _setIntervalForAccountInfo("1m");
}
function setIntervalForAccountInfo5m() {
  _setIntervalForAccountInfo("5m");
}
function setIntervalForAccountInfo10m() {
  _setIntervalForAccountInfo("10m");
}
function setIntervalForAccountInfo15m() {
  _setIntervalForAccountInfo("15m");
}
function setIntervalForAccountInfo30m() {
  _setIntervalForAccountInfo("30m");
}
function setIntervalForAccountInfo60m() {
  _setIntervalForAccountInfo("60m");
}

// OPEN ORDERS
function _setIntervalForOrdersOpen(interval) {
  _setIntervalFor(BinDoOrdersOpen().tag(), interval);
}
function setIntervalForOrdersOpenOff() {
  _setIntervalForOrdersOpen("off");
}
function setIntervalForOrdersOpen1m() {
  _setIntervalForOrdersOpen("1m");
}
function setIntervalForOrdersOpen5m() {
  _setIntervalForOrdersOpen("5m");
}
function setIntervalForOrdersOpen10m() {
  _setIntervalForOrdersOpen("10m");
}
function setIntervalForOrdersOpen15m() {
  _setIntervalForOrdersOpen("15m");
}
function setIntervalForOrdersOpen30m() {
  _setIntervalForOrdersOpen("30m");
}
function setIntervalForOrdersOpen60m() {
  _setIntervalForOrdersOpen("60m");
}

// DONE ORDERS
function _setIntervalForOrdersDone(interval) {
  _setIntervalFor(BinDoOrdersDone().tag(), interval);
}
function setIntervalForOrdersDoneOff() {
  _setIntervalForOrdersDone("off");
}
function setIntervalForOrdersDone1m() {
  _setIntervalForOrdersDone("1m");
}
function setIntervalForOrdersDone5m() {
  _setIntervalForOrdersDone("5m");
}
function setIntervalForOrdersDone10m() {
  _setIntervalForOrdersDone("10m");
}
function setIntervalForOrdersDone15m() {
  _setIntervalForOrdersDone("15m");
}
function setIntervalForOrdersDone30m() {
  _setIntervalForOrdersDone("30m");
}
function setIntervalForOrdersDone60m() {
  _setIntervalForOrdersDone("60m");
}