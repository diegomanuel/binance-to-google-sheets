/**
 * Scheduler coordinator wrapper.
 */
function BinScheduler(OPTIONS) {
  OPTIONS = OPTIONS || {}; // Init options
  const SCHEDULES_PROP_NAME = "BIN_SCHEDULER_ENTRIES";
  const LAST_RUN_PROP_NAME = "BIN_SCHEDULER_LAST_RUN";

  return {
    init,
    run1m,
    run5m,
    run10m,
    run15m,
    run30m,
    run60m,
    getSchedule,
    setSchedule,
    cleanSchedules,
    isStalled
  };

  /**
   * Mark the scheduler as initialized (ugly workaround)
   */
  function init() {
    _updateLastRun();
  }

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
   * Returns the scheduled interval for given task (or all schedules if no task given)
   */
  function getSchedule(task) {
    const props = _getDocPropService().getProperty(SCHEDULES_PROP_NAME);
    const schedules = props ? JSON.parse(props) : {};
    return task ? schedules[task] : schedules;
  }

  /**
   * Sets the scheduled interval for given task
   */
  function setSchedule(task, interval) {
    const schedules = getSchedule(); // Get all current schedules
    schedules[task] = interval; // Set the given schedule
    Logger.log("Setting new schedule for ["+task+"] at: "+interval);
    Logger.log("Updated schedules: "+JSON.stringify(schedules));
    return _getDocPropService().setProperty(SCHEDULES_PROP_NAME, JSON.stringify(schedules));
  }

  /**
   * Cleans ALL the scheduled intervals
   */
  function cleanSchedules() {
    Logger.log("Cleaning ALL schedules:\n"+JSON.stringify(getSchedule()));
    return _getDocPropService().setProperty(SCHEDULES_PROP_NAME, JSON.stringify({}));
  }

  /**
   * Returns true if the scheduler didn't run in the last 5 minutes
   */
  function isStalled() {
    const lastRun = _getDocPropService().getProperty(LAST_RUN_PROP_NAME) || null;
    return !lastRun || lastRun < (new Date()).getTime() - 1000*60*5; // 5 minutes in milliseconds
  }

  /**
   * Updates the last run timestamp
   */
  function _updateLastRun() {
    return _getDocPropService().setProperty(LAST_RUN_PROP_NAME, (new Date()).getTime());
  }

  function _getDocPropService() {
    return PropertiesService.getDocumentProperties();
  }
}