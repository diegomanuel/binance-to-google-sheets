/**
 * Scheduler coordinator wrapper.
 */
function BinScheduler(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const LAST_RUN_PROP_NAME = "BIN_SCHEDULER_LAST_RUN";

  return {
    run1m,
    run5m,
    run10m,
    run15m,
    run30m,
    run60m,
    getSchedule,
    setSchedule,
    isStalled
  };

  /**
   * Runs the scheduled functions for 1m
   */
  function run1m() {
    _updateLastRun();
    BinDoOrdersTable().init(); // Initialize orders table sheets (if any)
    BinUtils().forceRefreshSheetFormulas("1m");
  }

  /**
   * Runs the scheduled functions for 5m
   */
  function run5m() {
    _updateLastRun();
    BinUtils().forceRefreshSheetFormulas("5m");
  }

  /**
   * Runs the scheduled functions for 10m
   */
  function run10m() {
    _updateLastRun();
    BinUtils().forceRefreshSheetFormulas("10m");
  }

  /**
   * Runs the scheduled functions for 15m
   */
  function run15m() {
    _updateLastRun();
    BinUtils().forceRefreshSheetFormulas("15m");
  }

  /**
   * Runs the scheduled functions for 30m
   */
  function run30m() {
    _updateLastRun();
    BinUtils().forceRefreshSheetFormulas("30m");
  }

  /**
   * Runs the scheduled functions for 60m
   */
  function run60m() {
    _updateLastRun();
    BinUtils().forceRefreshSheetFormulas("1h");
  }

  /**
   * Returns the scheduled interval for given task
   */
  function getSchedule(task) {
    //Logger.log("GET SCHEDULE: "+task);
    return "1m";
  }

  /**
   * Sets the scheduled interval for given task
   */
  function setSchedule(task, interval) {
    //Logger.log("SET SCHEDULE: "+task+" ("+interval+")");
    return "";
  }

  /**
   * Returns true if the scheduler didn't run in the last 10 minutes
   */
  function isStalled() {
    const lastRun = PropertiesService.getDocumentProperties().getProperty(LAST_RUN_PROP_NAME) || null;
    return !lastRun || lastRun < (new Date()).getTime() - 1000*60*10; // 10 minutes in milliseconds
  }

  /**
   * Updates the last run timestamp
   */
  function _updateLastRun() {
    return PropertiesService.getDocumentProperties().setProperty(LAST_RUN_PROP_NAME, (new Date()).getTime());
  }
}