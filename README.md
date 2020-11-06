# Binance to Google Sheets!

A lightweight **Google Spreadsheets** `add-on` to GET data <u>directly</u> from **Binance API** without any intermediaries!

It <u>only</u> requires **Binance API keys** for open/finished orders listing, but a **READ-ONLY** API key from Binance is enough for everything to work.  
In deed, I _personally recommend_ to generate <u>READ-ONLY</u> API key at Binance site.  
It does <u>NOT</u> need write/trade access <u>in any way</u> to properly work with **ALL** its features!

This script intention will always be to fetch data from Binance API, so just read-only access is enough for good.  =]

I think and hope that many of you will find it as useful as it is for myself.  
Enjoy, cheers! :beers:


## How can I use it in my Google Spreadsheets?

### If you AREN'T a developer

Simple enough! Just download the **Binance to Google Sheets `add-on`** from within your desired spreadsheet using [Google Workspace Marketplace](https://gsuite.google.com/u/1/marketplace/appfinder/category/works-with-spreadsheet) and you are ready to go!  
Follow these simple steps:

1. With your desired `Google Spreadsheet` opened, go to `Add-ons -> Get add-ons`.
2. Search for `Binance to Google Sheets` and click on it once found.
3. Click the `Install` button and voila!

### If you ARE a developer

You will need [clasp](https://github.com/google/clasp) and [node](https://nodejs.org) in order to apply the `add-on` to your Google Spreadsheet.  

1. Install `node` and `clasp`.
2. Clone the `repo` at your local computer.
3. Get the `Script ID` for your desired Google Spreadsheet.
    1. At your `Google Spreadsheet` screen, go to `Tools -> Script editor`.
    2. At the `Google Script` screen, go to `File -> Project properties`.
    3. The needed ID is the one under the `Script ID` label!
4. Run the target `make apply SCRIPT_ID=my-script-id` replacing `my-script-id` with the ID obtained at point `3`.
5. Refresh/reload your Google Spreadsheet (hit `F5`) and voila!

You can also do it **by hand**, manually copying each file content to your script source at [Google Scripts](https://script.google.com/) but it's a pain in _you-know-where_.


### Binance API Keys

Only needed if you **also want** to have pending and done orders listing working in your spreadsheet.  
To get your keys, go to [Binance API panel](https://www.binance.com/en/usercenter/settings/api-management) and create a new one:

1. Enter a label like `Binance to Google Sheets` and click the `Create` button.
2. Take note for both `API Key` and `Secret Key` values.
3. Click the `Edit restrictions` button.
    1. Under `API restrictions` **ONLY** `Can Read` checkbox should be checked.  
    2. Under `IP access restrictions` select `Unrestricted`.
4. Click the `Save` button and now you have to configure them on your spreadsheet!

Once you have the `add-on` already installed/enabled on your desired Google Spreadsheet, the main menu item `Binance` should have appeared at the rightmost position at your spreadsheet's screen.

1. At spreadsheet's main menu, go to `Binance -> Configure API Keys`.
2. Set your `API Key` and click `OK`. Do the same for `API Secret Key`.
3. Voila, you are ready to go!

**NOTE:** You can remove or re-configure them at any time from the `Binance` main menu item.


## See it working live!

https://docs.google.com/spreadsheets/d/1AcOcPFsncrDB_ve3wWMHwfiFql6A4hmG1sFc01LLTDg


## Some background: Why this tool had ever to come alive?!


I needed a way to have Binance data directly available at my Google Spreadsheet.  
First, I've looked for several existing solutions, but none provided me the _freedom_ and _confidence_ that I wanted for this kind of _delicate_ stuff (you know what I mean, right? =)  
So I decided to write my own code, all from scratch, with only my will and my javascript knownledge aboard..  
..and I was sooo happy with the results that I simply decided to share it to the world! :tada:


## Disclaimer

I'm just a guy that uses both services and wanted to have **Binance** data at my personal **Google Spreadsheet**.  
I did it for myself and I liked it so much, that I decided to share it to the world so anyone can use it!

The script only needs **READ** access keys to **Binance API**, so there is <u>no security concerns</u> about what the script is able to do at Binance.  
It will just **retrieve** useful Binance data for your enjoyment in your spreadsheets!  =]

I'm not responsible for your private usage of this tool, although it will never cause you any trouble.

Be safe!  
Diego.
