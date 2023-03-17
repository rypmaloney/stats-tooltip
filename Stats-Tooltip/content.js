//chrome.storage.sync.clear();
//import { defaultSettings } from './settings.js';

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
const findPlayerNames = (jsonData, paragraph) => {
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
                f_id: jsonData[ua_match]['graph_id'],
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
                        f_id: jsonData[ua_split]['graph_id'],
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

const fetchStats = async (playerId, pos) => {
    let url = `https://www.fangraphs.com/api/players/stats?playerid=${playerId}&position=${pos}&z=1678363774`;
    if (pos === 't') url = `https://www.fangraphs.com/api/menu/menu-standings`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (pos === 't') return data.filter((t) => t['AbbName'] == playerId)[0]; //this is the ABBR
        return data['data'];
    } catch (error) {
        console.error(error);
    }
};

const getSelectedValuesByPos = (settings, pos) => {
    return settings
        .filter((obj) => obj.pos === pos && obj.selected)
        .map((obj) => obj.value);
};

const processPlayerData = (data, position, selectedOptions) => {
    if (position === 't') {
        return [
            {
                AbbName: data['AbbName'],
                League: data['League'],
                Division: data['Division'],
                W: data['W'],
                L: data['L'],
                GB: data['GB'],
            },
        ];
    }

    const about = ['aseason', 'AbbName', 'Age'];
    const string_data = ['aseason', 'Age', 'AbbName', 'AbbLevel'];
    const thousands = ['AVG', 'OBP', 'wOBA', 'BABIP', 'OPS', 'SLG'];

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
                    if (thousands.includes(key)) {
                        tdata = Math.round(tdata * 1000) / 1000;
                    } else tdata = Math.round(tdata * 100) / 100;
                }
                playerDataObject[key] = tdata;
            });
            playerDataList.push(playerDataObject);
        }
    }

    return playerDataList;
};

const createTable = (data) => {
    const about = ['aseason', 'AbbName', 'League', 'Division'];
    const table = document.createElement('table');
    const thead = table.createTHead();
    const headerRow = thead.insertRow();

    // create header cells in one line using array.map()
    Object.keys(data[0]).map((key) => {
        const headerCell = document.createElement('th');
        if (!about.includes(key)) {
            headerCell.textContent = key;
        }
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
};

const createToolTip = (data, id, pos, name, rr_id, b_id) => {
    const table = createTable(data);

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

    const brefLink = `<a style="text-decoration:none; color: #620e0e;" target="_blank" href="${bLink}" target="_blank" >[BR]</a>`;
    const fangraphsLink = `<a style="text-decoration:none; color: #29610d;" target="_blank" href="${fLink}" target="_blank" >[FG]</a>`;
    return `<span class="tooltip"><span class="tooltip-player">${name}</span><span class="tooltiptext">${table}</span><p  class="tooltiplink">${fangraphsLink}  ${brefLink}</p></span>`;
};

/**
 * Remove tooltips from the page.
 * Allows regenerating of tooltips on settings change.
 */
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

/**
 * Some websites insert styles on tables automatically with javascript.
 * This ensures only the tooltip styles are applied to the table.
 */
const removeClasses = () => {
    const tables = document.querySelectorAll('.tooltiptext table');
    tables.forEach((element) => {
        element.classList.remove(...element.classList);
    });
    console.log('Removed table classes.');
};

const runPage = async (settings) => {
    console.log('Running Page.');
    const elements = document.querySelectorAll('p a, p');
    const striptJsonUrl = chrome.runtime.getURL('map.json');
    const playerData = {};
    let replacedText;

    try {
        const jsonData = await loadJsonFile(striptJsonUrl);

        for (let i = 0; i < elements.length; i++) {
            const elementText = elements[i].innerText;
            const foundPlayers = findPlayerNames(jsonData, elementText);
            const originalText = elements[i].innerHTML;
            const doneList = []; //only add tip to first appearance in each p
            replacedText = originalText;

            if (foundPlayers) {
                for (let j = 0; j < foundPlayers.length; j++) {
                    try {
                        const { id, pos, name, rr_id, b_id } = foundPlayers[j];

                        if (!playerData[id]) {
                            const data = await fetchStats(id, pos);

                            if (!data) {
                                continue;
                            }

                            playerData[id] = processPlayerData(
                                data,
                                pos,
                                settings
                            );
                        }

                        if (
                            playerData[id].length > 0 &&
                            !doneList.includes(id)
                        ) {
                            const tooltip = createToolTip(
                                playerData[id],
                                id,
                                pos,
                                name,
                                rr_id,
                                b_id
                            );
                            replacedText = replacedText.replace(name, tooltip);
                            doneList.push(id);
                        }
                        console.log(doneList);
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
    console.log(playerData);
};

chrome.storage.sync.get('selectedOptions', function (items) {
    (async () => {
        // workaround to import in non-module
        const src = chrome.runtime.getURL('settings.js');
        const settings = await import(src);

        let options = settings.defaultSettings;
        if (items.selectedOptions !== undefined)
            options = items.selectedOptions;

        runPage(options);
    })();

    window.addEventListener('load', function () {
        setTimeout(() => {
            removeClasses();
        }, 1500);
    });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.selectedOptions !== undefined) {
        removeTooltips();
        runPage(request.selectedOptions);
    }
    removeClasses();
});
