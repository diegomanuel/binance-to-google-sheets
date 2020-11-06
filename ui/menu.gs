/**
 * Adds menu items under "Binance" at main menu.
 */
function BinMenu(ui) {
  /**
   * Adds the menu items to spreadsheet's main menu
   */
  function addMenuItems(menu) {
    menu.addItem("Show API Last Update", "showAPILastUpdate")
        .addSeparator()
        .addItem("Show Current Prices", "showCurrentPrices");
    if (BinSetup().areAPIKeysConfigured()) {
      menu.addItem("Show Open Orders", "showOpenOrders")
          .addSeparator()
          .addItem("Show API Keys", "showAPIKeys")
          .addItem("Re-configure API Keys", "showAPIKeysSetup")
          .addItem("Clear API Keys", "showAPIKeysClear")
    } else {
      menu.addSeparator()
          .addItem("Configure API Keys", "showAPIKeysSetup")
    }
    menu.addSeparator()
        .addItem("Credits!  =]", "showCredits");
    
    return menu.addToUi();
  }
  
  addMenuItems(ui.createMenu("Binance"));
  addMenuItems(ui.createAddonMenu());
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
 */
function showCurrentPrices() {
  const tickers = { // @TODO Improve this to be like the 10th cryptos with most volume
    "BTCUSDT": 0, "BCHUSDT": 0, "ETHUSDT": 0, "LTCUSDT": 0, "BNBUSDT": 0
  };
  const ui = SpreadsheetApp.getUi();
  const current_prices = BinDoCurrentPrices().run();
  const data = (current_prices||[]).reduce(function(tickers, [symbol, price]) {
    if (tickers[symbol] !== undefined) {
      tickers[symbol] = price;
    }
    return tickers;
    }, tickers);
  const formatted = Object.keys(data).map(function(symbol) {
    return symbol+": $"+data[symbol];
  });
  ui.alert("Current Crypto Prices", formatted.join("\n"), ui.ButtonSet.OK);
}

/**
 * Displays a modal with current open orders (@TODO: Improve how it's displayed!).
 */
function showOpenOrders() {
  const ui = SpreadsheetApp.getUi();
  const data = BinDoOpenOrders().run();
  const formatted = (data||[]).reduce(function(out, row) {
      row[0] = Utilities.formatDate(new Date(row[0]), "GMT", "MM-dd HH:mm");
      return [row.join("\t"), ...out];
    }, [])
    .join("\n");
  ui.alert("Current open orders ("+data.length+")", formatted, ui.ButtonSet.OK);
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
 * Displays a modal with the developer's credits!  =]
 */
function showCredits() {
  const ui = SpreadsheetApp.getUi();
  const body = "Diego Manuel - diegomanuel@gmail.com - Argentina\n"+
               "https://github.com/diegomanuel/binance-to-google-sheets\n"+
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
               "It only requires Binance API keys for open/finished orders list, but a READ-ONLY API key from Binance is enough for everything to work.\n"+
               "In deed, I personally recommend to generate READ-ONLY API key at Binance site.\n"+
               "It does NOT NEED write/trade access in any way to properly work with ALL its features!\n"+
               "\n"+
               "\n"+
               "This script intention will always be to fetch data from Binance API, so just read-only access is enough for good.  =]\n"+
               "So, I think and hope that many of you will find it as useful as it is for myself.\n"+
               "\n"+
               "Enjoy, cheers!";
  ui.alert("Credits - Binance to Google Sheets - "+VERSION, body, ui.ButtonSet.OK);
  Logger.log("[Credits! =] Diego Calero - dcalero@fiqus.coop - https://fiqus.coop");
}