class ChromeStorageCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.maxAge = 24 * 60 * 60 * 1000; // 24hrs
        this.cache = {};
        this.init = async () => {
            try {
                const cache = await this._getFromStorage('statCache');
                if (cache) {
                    this.cache = cache;
                } else {
                    this.cache = {};
                    await this._setInStorage('statCache', {});
                }
                let cacheSize = Object.keys(this.cache).length;
                console.log(`StatTooltip - cache size: ${cacheSize}.`);
            } catch (error) {
                console.log(`Error establishing chromeLocalStorage. ${error}.`);
            }
        };
        this.init();
    }
    async _getFromStorage(key) {
        // Gets cache object
        try {
            return new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => {
                    resolve(result[key]);
                });
            });
        } catch (error) {
            console.error(`Error getting from chromeLocalStorage: ${error}`);
            return null;
        }
    }

    async _setInStorage(key, value) {
        // Sets cache object
        try {
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, () => {
                    resolve();
                });
            });
        } catch (error) {
            console.error(`Error setting to chromeLocalStorage: ${error}`);
            return null;
        }
    }

    async set(key, value) {
        // add the key-value pair to the cache
        this.cache[key] = {
            value,
            expiration: Date.now() + this.maxAge,
        };
        // remove the oldest entry if we have exceeded the cache size
        if (Object.keys(this.cache).length > this.maxSize) {
            const oldestKey = Object.keys(this.cache)[0];
            delete this.cache[oldestKey];
        }
        return this.cache[key];
    }

    async get(key) {
        // Check for key in cache obj, not storage
        if (this.cache[key] != undefined) {
            if (Date.now() < this.cache[key].expiration) {
                return this.cache[key].value;
            } else {
                delete this.cache[key];
            }
        }
        return null;
    }

    async closeCache() {
        try {
            await this._setInStorage('statCache', this.cache);
            let cacheSize = Object.keys(this.cache).length;
            console.log(`StatTooltip - cache size: ${cacheSize}.`);
        } catch (error) {
            console.error(`Error setting to chromeLocalStorage: ${error}`);
            return null;
        }
    }
}

async function loadJsonFile(filename) {
    try {
        const response = await fetch(filename);
        const jsonData = await response.json();
        return jsonData;
    } catch (error) {
        console.error(`Error loading JSON file ${filename}: ${error}`);
        return null;
    }
}

function getWordPairs(string) {
    let words = string.split(' ');
    let pairs = [];
    for (let i = 0; i < words.length - 1; i++) {
        pairs.push(words[i] + ' ' + words[i + 1]);
    }
    return pairs;
}

function removeAccents(str) {
    return str.replace(/[ñáéíóúÁÉÍÓÚ]/g, function (match) {
        switch (match) {
            case 'á':
                return 'a';
            case 'é':
                return 'e';
            case 'í':
                return 'i';
            case 'ó':
                return 'o';
            case 'ú':
                return 'u';
            case 'Á':
                return 'A';
            case 'É':
                return 'E';
            case 'Í':
                return 'I';
            case 'Ó':
                return 'O';
            case 'Ú':
                return 'U';
            case 'ñ':
                return 'n';
        }
    });
}

/**
 * Finds player names. Selects likely suspects with Regex.
 * Tests two word combinations against json list.
 *
 * @param {json} jsonData - Json lib of player - Fangraph Id maps
 * @param {string} paragraph -  Text from DOM
 * @returns {object} Fangraphs Id, position, and name as it appears on the page
 */
const findPlayerNames = (jsonData, paragraph) => {
    const nameRegex =
        /\b[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+(?:-[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+)*(?:\s[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+(?:-[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+)*){1,4}\b/g;

    // a string that starts and ends with a word in title case (i.e. with an uppercase letter followed by lowercase letters or accented characters), and can have 1 to 4 additional words
    const matches = paragraph.match(nameRegex);
    if (matches === null) {
        return false;
    }

    const names = [];

    for (const match of matches) {
        const ua_match = removeAccents(match);

        if (jsonData.hasOwnProperty(ua_match)) {
            names.push({
                id: jsonData[ua_match]['graph_id'],
                b_id: jsonData[ua_match]['id_player'],
                rr_id: jsonData[ua_match]['rr'],
                name: match,
                pos: jsonData[ua_match]['pos'],
            });
        } else if (match.split(' ').length > 2) {
            const splitNames = getWordPairs(match);

            for (const split of splitNames) {
                const ua_split = removeAccents(split);

                if (jsonData.hasOwnProperty(ua_split)) {
                    names.push({
                        id: jsonData[ua_split]['graph_id'],
                        b_id: jsonData[ua_split]['id_player'],
                        rr_id: jsonData[ua_split]['rr'],
                        name: split,
                        pos: jsonData[ua_split]['pos'],
                    });
                }
            }
        }
    }

    return names;
};

/**
 * Retrieve player data from cache or API.
 * Player data is stored in chrome.storage.local.
 */
async function fetchStats(playerId, pos, cache) {
    const timeStamp = Math.floor(Date.now() / 1000);
    const url = `https://www.fangraphs.com/api/players/stats?playerid=${playerId}&position=${pos}&z=${timeStamp}`;

    try {
        const key = `${playerId}-${pos}`;

        let cachedData = await cache.get(key);

        if (cachedData) {
            return cachedData;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        await cache.set(key, data['data']);

        return data['data'];
    } catch (error) {
        console.error(error);
    }
}

const getSelectedValuesByPos = (settings, pos) => {
    return settings
        .filter((obj) => obj.pos === pos && obj.selected)
        .map((obj) => obj.value);
};

const formatData = (data, key) => {
    const thousands = ['AVG', 'OBP', 'wOBA', 'BABIP', 'OPS', 'SLG'];
    const tens = ['wRC+'];
    const string_data = ['aseason', 'Age', 'AbbName', 'AbbLevel'];

    if (!string_data.includes(key)) {
        if (thousands.includes(key)) return Math.round(data * 1000) / 1000;
        if (tens.includes(key)) return Math.round(data * 10) / 10;
        return Math.round(data * 100) / 100;
    }
    return data;
};

/**
 * Process player data to extract the relevant  metadata based on the player's position and the selected options.
 *
 * @param {Array} data - An array of objects containing player data.
 * @param {String} position - The player's position ('p' for pitcher, 'b' for batter).
 * @param {Array} selectedOptions - An array of objects containing the selected options.
 * @returns {Array} - An array of objects containing the player metadata that can be used to fetch.
 */
const processPlayerData = (data, position, selectedOptions) => {
    const about = ['aseason', 'AbbName', 'Age'];
    const projections = ['ATC'];

    keysToInclude =
        position === 'P'
            ? about.concat(getSelectedValuesByPos(selectedOptions, 'p'))
            : about.concat(getSelectedValuesByPos(selectedOptions, 'b'));

    const playerDataList = [];
    // Get the current year and the two previous years
    const currentYear = new Date().getFullYear();
    const previousYears = [
        currentYear - 1,
        currentYear - 2,
        currentYear - 3,
        currentYear - 4,
    ];

    for (let j = 0; j < data.length; j++) {
        const aseasonYear = parseInt(data[j]['aseason']);
        const team = data[j]['Team'];

        if (
            (previousYears.includes(aseasonYear) &&
                team != 'Average' &&
                data[j].hasOwnProperty('WAR')) ||
            projections.includes(team)
        ) {
            const playerDataObject = {};
            keysToInclude.forEach((key) => {
                let tdata = data[j][key];
                tdata = formatData(tdata, key);

                playerDataObject[key] = tdata;
            });
            playerDataList.push(playerDataObject);
        }
    }

    return playerDataList;
};

const createTable = (data) => {
    const about = ['aseason', 'AbbName', 'League', 'Division', 'Age'];
    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // create header cells in one line
    Object.keys(data[0]).map((key) => {
        const headerCell = document.createElement('th');
        if (!about.includes(key)) {
            headerCell.textContent = key;
        }
        headerRow.appendChild(headerCell);
    });

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // create data rows in one line
    data.forEach((obj) => {
        const row = tbody.insertRow();
        for (const [key, val] of Object.entries(obj)) {
            const cell = row.insertCell();
            let content = val;
            if (isNaN(parseInt(val)) && !about.includes(key)) content = 'n/a';
            cell.textContent = content;
        }
    });

    return table.outerHTML;
};

const createToolTip = (data, id, pos, name, rr_id, b_id) => {
    const table = createTable(data);
    const fgLogo = chrome.runtime.getURL('images/fgLogo.jpg');
    const brefLogo = chrome.runtime.getURL('images/brefLogo.jpg');

    const fLink =
        pos == 't'
            ? `https://www.fangraphs.com/teams/${rr_id}`
            : `https://www.fangraphs.com/players/mike-trout/${id}/stats?position=${pos}`;

    const bLink =
        pos == 't'
            ? `https://www.baseball-reference.com/teams/${b_id}`
            : `https://www.baseball-reference.com/players/${b_id.slice(
                  0,
                  1
              )}/${b_id}.shtml`;

    const brefLink = `<a href="${bLink}" target="_blank" style="text-decoration:none; color: #620e0e;"><img src="${brefLogo}"></a>`;
    const fangraphsLink = `<a href="${fLink}" target="_blank" style="text-decoration:none; color: #29610d;"><img src="${fgLogo}"></a>`;

    return `
        <span class="stats-tooltip">
            <span class="tooltip-player">${name}</span>
            <span class="stats-tooltiptext">${table}</span>
            <div class="tooltiplink">${fangraphsLink}${brefLink}</div>
        </span>
    `;
};

/**
 * Remove tooltips from the page.
 * Allows regenerating of tooltips on settings change.
 */
const removeTooltips = () => {
    const toolTips = document.querySelectorAll('.stats-tooltip');
    toolTips.forEach((element) => {
        const playerName = element.querySelector('.tooltip-player').textContent;
        const playerNode = document.createTextNode(playerName);
        element.parentNode.replaceChild(playerNode, element);
    });
    document.querySelectorAll('.tooltiplink').forEach((element) => {
        element.remove();
    });
};

/**
 * Some websites insert styles on tables automatically with javascript.
 * This ensures only the tooltip styles are applied to the table.
 */
const removeTableClasses = () => {
    const tables = document.querySelectorAll('.stats-tooltiptext table');
    tables.forEach((element) => {
        element.classList.remove(...element.classList);
    });
};

/**
 * Insert tooltip for first of each player that appears.
 * Only insert first appearance. Only insert if they have data
 */
const processElement = async (element, foundPlayers, settings, cache) => {
    const originalText = element.innerHTML;
    const doneList = []; //only add tip to first appearance in each p
    let processedText = originalText;

    if (foundPlayers) {
        for (const player of foundPlayers) {
            try {
                const { id, pos, name, rr_id, b_id } = player;

                if (doneList.includes(id)) {
                    continue;
                }
                // Retreive player from cache or Fangraphs
                const data = await fetchStats(id, pos, cache);

                if (!data) {
                    continue;
                }

                const processedData = processPlayerData(data, pos, settings);

                if (processedData.length > 0) {
                    const tooltip = createToolTip(
                        processedData,
                        id,
                        pos,
                        name,
                        rr_id,
                        b_id
                    );

                    processedText = processedText.replace(name, tooltip);
                    doneList.push(id);
                }
            } catch (error) {
                console.error(error);
            }
        }
    }
    element.innerHTML = processedText;

    return true;
};

/**
 * Processes the text content of the page and replaces the names of baseball players with
 * tooltips displaying their statistics. Uses a mapping file and user-selected options to fetch
 * the necessary data and create the tooltips. Modifies the HTML content of the page in place.
 *
 * @param {Object} settings - User-selected options for data display.
 *  @param {Object} cache - Local storage cache object
 * @returns {void}
 */
const runPage = async (settings) => {
    console.log('StatTooltip - Running Page.');
    const elements = document.querySelectorAll('p a, p, li a');
    const striptJsonUrl = chrome.runtime.getURL('map.json');
    const cache = new ChromeStorageCache(150);

    try {
        const jsonData = await loadJsonFile(striptJsonUrl);

        for (const element of elements) {
            const elementText = element.innerText;
            const foundPlayers = findPlayerNames(jsonData, elementText);
            await processElement(element, foundPlayers, settings, cache);
        }
    } catch (error) {
        console.error(error);
    }

    cache.closeCache();
    console.log('StatTooltip - Page complete.');
};

/**
 * Overall control flow.
 *  Set cache, get settings, run page, run cleanup, add event listener for settings change
 */
(() => {
    chrome.storage.sync.get('selectedOptions', function (items) {
        (async () => {
            // workaround to import in non-module
            const src = chrome.runtime.getURL('settings.js');
            const settings = await import(src);

            let options = settings.defaultSettings;
            if (items.selectedOptions !== undefined)
                options = items.selectedOptions;

            setTimeout(() => {
                runPage(options);
            }, 2000);
        })();
    });
})();
