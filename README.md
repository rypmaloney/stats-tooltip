# Stats Tooltip
Extension to dynamically insert hover-on tooltips for MLB active players. Provides customizable statistics on active MLB players for the past three seasons, as well as aggregate projections (ATC). All data is live and will update as the season progresses. Also provides a link to Fangraphs and Baseball Reference profiles.

Stats tooltip is [available in the Chrome Web Store](https://chrome.google.com/webstore/detail/stats-tooltip/gipkpjcpmnibggjnccmfmmchhgfanoip?hl=en).
## Features
Select the stats you want to display for both pitchers and position players.

![Settings for tooltip](./images/settings_small.png)

Samples below from Fangraphs, the Athletic, and MLBtradeRumors. This tooltip should work on most articles referencing currently active MLB players. I've tested it on about 45 websites listed in manifest.json.

![the Athletic](./images/at_small.png)

![Fangraphs](./images/fg_small.png)

![MlbTradeRumors](./images/mtr_small.png)

## Stats Tooltip is available on the following websites:

theathletic.com, mlbtraderumors.com, fangraphs.com, blogs.fangraphs.com, fantrax.com/news/mlb, fansided.com, lookoutlanding.com, baseballprospectus.com, theringer.com, si.com, espn.com, bleacherreport.com, cbssports.com, mlb.com, foxsports.com, mlb.nbcsports.com, baseball-reference.com, sportingnews.com, rotoworld.com, mlbtr.com, pitcherlist.com, mlbpipeline.com, baseballamerica.com, mlbdepthcharts.com, fantasypros.com, beyondtheboxscore.com, deadspin.com, sbnation.com/mlb, batterypower.com, mlbcomblogs.mlblogs.com, thescore.com, twinsdaily.com, nbcsports.com/mlb, upi.com, yardbarker.com, usatoday.com, nytimes.com, washingtonpost.com, latimes.com, chicagotribune.com, sfgate.com, boston.com, miamiherald.com, azcentral.com, tampabay.com, foxsports.com/mlb, startribune.com, draysbay.com, fansided.com, lookoutlanding.com, baseballprospectus.com, theringer.com



## How does it work?
Stats tooltip pulls a list of likely player names based on a regex pattern that resembles names. Then it compares against a JSON player mapping, which stores Fangraphs and Baseball Reference player ids. It uses that data to make an API request to Fangraphs, and create links to both sites. All data is formatted then inserted into the the page.

Player data is stored in chrome.storage.local to prevent redundant API calls. All cached data is timestamped and updated every 24hrs. Ive set an arbitrary limit on the amount of data cached.

Stats are pulled from Fangraphs. Player ID mapping provided by: https://www.smartfantasybaseball.com
