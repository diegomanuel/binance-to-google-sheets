/**
 * Adds menu items under "Binance" at main menu.
 */
function BinMenu(ui, auth_mode) {
  /**
   * Adds the menu items to spreadsheet's main menu
   */
  function addMenuItems(menu) {
    const is_auth_enough = BinUtils().isAuthEnough(auth_mode);

    if (!is_auth_enough) { // Script is not authorized
      menu.addItem("Enable BINANCE() formula", "showEnableFull");
    } else {
      menu.addItem("Refresh", "forceRefresh");
    }
    menu.addSeparator()
        .addItem("Show API Last Update", "showAPILastUpdate")
        .addItem("Show Current Prices", "showCurrentPrices");
    if (is_auth_enough) { // Script is installed and authorized
      if (BinSetup().areAPIKeysConfigured()) {
        menu.addItem("Show Open Orders", "showOpenOrders")
            .addSeparator()
            .addItem("Show API Keys", "showAPIKeys")
            .addSubMenu(ui.createMenu("Setup API Keys")
              .addItem("Re-configure API Keys", "showAPIKeysSetup")
              .addItem("Clear API Keys", "showAPIKeysClear"));
      } else {
        menu.addSeparator()
            .addItem("Setup API Keys", "showAPIKeysSetup");
      }
      menu.addSeparator()
          .addItem("Credits", "showCredits")
          .addItem("Donate  =]", "showDonate")
          .addSeparator()
          .addItem("Version: "+VERSION, "showVersion");
    }
    
    menu.addToUi(); // Add resultant menu items to the spreadsheet main menu

    if (is_auth_enough) { // Show welcome/acknownledge toast
      BinUtils().toast("I just started working at this spreadsheet. Enjoy it!  =]");
    } else if (auth_mode !== ScriptApp.AuthMode.NONE) { // Show enable/authorize toast
      BinUtils().toast("The BINANCE() formula  WON'T be available until you **enable and authorize** the add-on.", "", 30);
    }
  }
  
  addMenuItems(ui.createMenu("Binance"));
  addMenuItems(ui.createAddonMenu());
}

/**
 * Forces all BINANCE() formulas recalculation on the current spreadsheet.
 * NOTE: Data might come from cache anyways! This function is useful only when triggers are not available to automatically update'em.
 */
function forceRefresh() {
  BinUtils().toast("Refreshing data, be patient..!", "", 5);
  BinSetup().forceRefreshSheetFormulas(); // Refresh'em all!
}

/**
 * Displays a modal to tell the user to enable/authorize the add-on.
 */
function showEnableFull() {
  const ui = SpreadsheetApp.getUi();
  ui.alert("Enable Binance to Google Sheets!",
           "You first need to **enable and authorize** the add-on in order to\n"+
           "get the 'BINANCE()' formula available on this spreadsheet.\n"+
           "\n"+
           "Unlock the power and enjoy!\n"+
           "Diego"
           ,ui.ButtonSet.OK);
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
  const data = BinDoOpenOrders().run(null, {});
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
               "First, I've looked for several existing solutions, but none provided me the 'freedom' and 'confidence' that I wanted for this kind of 'delicate' stuff (you know what I mean, right? =)\n"+
               "So I decided to write my own code, all from scratch, with only my will and my javascript knownledge aboard..\n"+
               "..and I was sooo happy with the results that I simply decided to share it to the world!\n"+
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
               "\n"+
               "I have plenty of ideas for new features and improvements.\n"+
               "So far, this is just the first acceptable release, but much more could come..!\n"+
               "\n"+
               "------------------------------------------------\n"+
               "Don't you have a Binance account yet?\n"+
               "Just register there and start trading with its fantastic platform!\n"+
               "https://www.binance.com/en/register?ref=45140860\n"+
               "------------------------------------------------\n"+
               "[BTC] Bitcoin donate address:\n"+
               "1FsN54WNibhhPhRt4vnAPRGgzaVeeFvEnM\n"+
               "\n"+
               "[ETH] Ethereum donate address:\n"+
               "0x1d047bc3e46ce0351fd0c44fc2a2029512e87a97\n"+
               "\n"+
               "[LTC] Litecoin donate address:\n"+
               "LZ8URuChzyuuy272isMCrts7R7UKtwnj6a\n"+
               "\n"+
               "[BNB] Binance Coin donate address:\n"+
               "0x1d047bc3e46ce0351fd0c44fc2a2029512e87a97\n"+
               "------------------------------------------------\n"+
               "\n"+
               "This software was published and released under the GPL-3.0 License.\n"+
               "\n"+
               "Use it wisely, happy trading!\n"+
               "Diego.";
  ui.alert(title, body, ui.ButtonSet.OK);
  Logger.log("[Donate] Buy me a beer!  =]");
}