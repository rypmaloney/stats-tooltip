chrome.storage.sync.clear();

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
    return str.replace(/[áéíóúÁÉÍÓÚ]/g, function (match) {
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
function findPlayerNames(jsonData, paragraph) {
    const nameRegex =
        /\b[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+\s(?:[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+\s){0,4}[A-ZÀ-ÖØ-öø-ÿ][a-zà-öø-ÿ]+\b/g;
    // a string that starts and ends with a word in title case (i.e. with an uppercase letter followed by lowercase letters or accented characters), and can have 0 to 4 additional words
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
                        name: split,
                        pos: jsonData[ua_split]['pos'],
                    });
                }
            }
        }
    }

    return names;
}

async function fetchStats(playerId, pos) {
    const url = `https://www.fangraphs.com/api/players/stats?playerid=${playerId}&position=${pos}&z=1678363774`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

function getSelectedValuesByPos(settings, pos) {
    return settings
        .filter((obj) => obj.pos === pos && obj.selected)
        .map((obj) => obj.value);
}

const processPlayerData = (data, position, selectedOptions) => {
    const about = ['aseason', 'Age', 'AbbName'];
    const string_data = ['aseason', 'Age', 'AbbName', 'AbbLevel'];

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
            previousYears.includes(aseasonYear) &&
            team != 'Average' &&
            data[j].hasOwnProperty('WAR')
        ) {
            const playerDataObject = {};
            keysToInclude.forEach((key) => {
                let tdata = data[j][key];
                if (!string_data.includes(key)) {
                    tdata = Math.round(tdata * 100) / 100;
                }
                playerDataObject[key] = tdata;
            });
            playerDataList.push(playerDataObject);
        }
    }

    return playerDataList;
};

function createTable(data) {
    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // create header cells in one line using array.map()
    Object.keys(data[0]).map((key) => {
        const headerCell = document.createElement('th');
        headerCell.textContent = key;
        headerRow.appendChild(headerCell);
    });

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // create data rows in one line using array.forEach()
    data.forEach((obj) => {
        const row = tbody.insertRow();
        Object.values(obj).forEach((val) => {
            const cell = row.insertCell();
            cell.textContent = val;
        });
    });

    return table.outerHTML;
}
const createToolTip = (data, id, pos, name) => {
    const table = createTable(data);
    const fangraphsLink = `<sup class="tooltiplink"><a target="_blank" href=https://www.fangraphs.com/players/mike-trout/${id}/stats?position=${pos} target="_blank" class=tooltiplink>(F)</a></sup>`;
    return `<span class="tooltip"><span class="tooltip-player">${name}</span><span class="tooltiptext">${table}</span>${fangraphsLink}</span>`;
};

const removeTooltips = () => {
    const toolTips = document.querySelectorAll('.tooltip');
    toolTips.forEach((element) => {
        const playerName = element.querySelector('.tooltip-player').textContent;
        const playerNode = document.createTextNode(playerName);
        element.parentNode.replaceChild(playerNode, element);
    });
    document.querySelectorAll('.tooltiplink').forEach((element) => {
        element.remove();
    });
};

const runPage = async (settings) => {
    const elements = document.querySelectorAll('p a, p, td');
    const striptJsonUrl = chrome.runtime.getURL('map.json');
    const playerData = {};
    let replacedText;

    try {
        const jsonData = await loadJsonFile(striptJsonUrl);

        for (let i = 0; i < elements.length; i++) {
            const elementText = elements[i].innerText;
            const foundPlayers = findPlayerNames(jsonData, elementText);
            const originalText = elements[i].innerHTML;
            replacedText = originalText;

            if (foundPlayers) {
                for (let j = 0; j < foundPlayers.length; j++) {
                    try {
                        const { id, pos, name } = foundPlayers[j];

                        if (!playerData[id]) {
                            const data = await fetchStats(id, pos);

                            if (!data) {
                                continue;
                            }

                            playerData[id] = processPlayerData(
                                data['data'],
                                pos,
                                settings
                            );
                        }

                        if (playerData[id].length > 0) {
                            const tooltip = createToolTip(
                                playerData[id],
                                id,
                                pos,
                                name
                            );
                            replacedText = replacedText.replace(name, tooltip);
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
            elements[i].innerHTML = replacedText;
        }
    } catch (error) {
        console.error(error);
    }
};

chrome.storage.sync.get('selectedOptions', function (items) {
    let options = window.defaultSettings;
    if (items.selectedOptions !== undefined) options = items.selectedOptions;
    runPage(options);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.selectedOptions !== undefined) {
        removeTooltips();
        runPage(request.selectedOptions);
    }
});
