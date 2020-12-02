/**
 * Runs the account info script.
 *
 * @OnlyCurrentDoc
 */
function BinDoAccountInfo() {
  const CACHE_TTL = 60 * 5 - 10; // 4:50 minutes, in seconds
  const regex_formula = new RegExp("=.*BINANCE\\s*\\(\\s*\""+tag());
  let lock_retries = 10; // Max retries to acquire lock

  /**
   * Returns this function tag (the one that's used for BINANCE function 1st parameter)
   */
  function tag() {
    return "account";
  }
  
  /**
   * Returns account information.
   *
   * @param options An option list like "headers: false"
   * @return A list with account information
   */
  function run(options) {
    Logger.log("[BinDoAccountInfo] Running..");
    const lock = BinUtils().getUserLock(lock_retries--);
    if (!lock) { // Could not acquire lock! => Retry
      return run(options);
    }
    
    const opts = {CACHE_TTL};
    const data = BinRequest(opts).get("api/v3/account", "", "");
  
    lock.releaseLock();
    const parsed = parse(data, options);
    Logger.log("[BinDoAccountInfo] Done!");
    return parsed;
  }
  
  /**
   * @OnlyCurrentDoc
   */
  function parse(data, {headers: show_headers}) {
    show_headers = BinUtils().parseBool(show_headers);
    const header1 = ["Maker Commission", "Taker Commission", "Buyer Commission", "Seller Commission", "Can Trade", "Can Withdraw", "Can Deposit", "Account Type", "Last Update"];
    const header2 = ["Symbol", "Free", "Locked", "Total"];
    const account = [data.makerCommission, data.takerCommission, data.buyerCommission, data.sellerCommission, data.canTrade, data.canWithdraw, data.canDeposit, data.accountType, new Date(parseInt(data.updateTime))];
    const general = show_headers ? [header1, account, header2] : [account];

    const balances = (data.balances || []).reduce(function(rows, r) {
      const free = parseFloat(r.free);
      const locked = parseFloat(r.locked);
      if (free + locked > 0) { // Only return symbols with balance
        const row = [
          r.asset,
          free,
          locked,
          free + locked
        ];
        rows.push(row);
      }
      return rows;
    }, []);
    const [_, ...sorted] = BinUtils().sortResults(["placeholder", ...balances]);

    return [...general, ...sorted];
  }

  /**
   * Returns true if the formula matches the criteria
   */
  function isFormulaReplacement(period, formula) {
    return period == "5m" && regex_formula.test(formula);
  }
  
  // Return just what's needed from outside!
  return {
    tag,
    run,
    isFormulaReplacement
  };
}