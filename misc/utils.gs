/**
 * General utility functions wrapper.
 *
 * @OnlyCurrentDoc
 */
function BinUtils() {
  return {
    getLock,
    getRangeOrCell,
    sortResults,
    obscureSecret
  };
  
  /**
  * Gets lock, waiting for given `time` to acquire it, or sleep given `sleep` milliseconds to return `false`.
  */
  function getLock(time, sleep) {
    time = time || 5000; // Milliseconds
    sleep = sleep || 500; // Milliseconds
    const lock = LockService.getUserLock();
    if (!lock.tryLock(time) || !lock.hasLock()) {
      Logger.log("Could not acquire lock! Waiting "+sleep+"ms..");
      Utilities.sleep(sleep);
      return false;
    }
    return lock;
  }

  /**
   * Always returns an array no matter if it's a single cell or an entire range
   * @TODO Add "n-dimension" support
   */
  function getRangeOrCell(range_or_cell) {
    return typeof range_or_cell == "string" ? [range_or_cell] : range_or_cell;
  }
  
  /**
  * Sorts a results array by given index (default 0) but keeping the first row as headers.
  */
  function sortResults([header, ...results], index, reverse) {
    const sorted = (results||[]).sort(function(v1, v2) {
      return (v1[index||0] > v2[index||0] ? 1 : -1) * (reverse ? -1 : 1);
    });
    return [header, ...sorted];
  }
  
  /**
  * Replaces some characters to obscure the given secret.
  */
  function obscureSecret(secret) {
    if (!(secret && secret.length)) {
      return "";
    }

    const length = 20;
    const start = parseInt(secret.length / 2) - parseInt(length / 2);
    return secret.substr(0,start)+"*".repeat(length-1)+secret.substr(start+length);
  }
}
