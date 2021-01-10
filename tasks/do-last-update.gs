/**
 * Runs the last update script.
 */
function BinDoLastUpdate() {
  const PROP_NAME = "BIN_LAST_UPDATE";
  const delay = 1000; // Delay getter calls in milliseconds

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "last_update";
  }

  /**
   * Returns this function period (the one that's used by the refresh triggers)
   */
  function period() {
    return BinScheduler().getSchedule(tag()) || "1m";
  }

  /**
  * Sets or returns the timestamp of the last issued request to Binance API.
  */
  function run(ts) {
    const doc_props = PropertiesService.getDocumentProperties();
    
    if (ts == undefined) { // Getter
      Utilities.sleep(delay); // Wait a little to try to get a fresh value (useful mainly when a trigger runs)
      const last_update = doc_props.getProperty(PROP_NAME);
      ts = last_update ? new Date(last_update) : "";
      Logger.log("[BinDoLastUpdate] Got last update time: "+ts);
      return ts;
    }
    
    // Setter
    ts = new Date();
    doc_props.setProperty(PROP_NAME, ts);
    Logger.log("[BinDoLastUpdate] Set last update time: "+ts);
    return ts;
  }

  // Return just what's needed from outside!
  return {
    tag,
    period,
    run
  };
}