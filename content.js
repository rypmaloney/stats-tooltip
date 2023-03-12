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

function findPlayerNames(jsonData, paragraph) {
    const nameRegex =
        /(?:\b(?!([A-Z][a-z]+)\.))(?:\b[A-Z][a-z]+\b\s){1,2}\b[A-Z][a-z]+(?:[-'][A-Za-z][a-z]+)?\b/g;

    const matches = paragraph.match(nameRegex);
    console.log(matches);
    if (matches === null) {
        return false;
    }
    const names = [];
    matches.forEach((match) => {
        if (jsonData.hasOwnProperty(match)) {
            const graphId = jsonData[match].graph_id;
            names.push({ id: graphId, name: match });
        } else if (match.split(' ').length > 2) {
            const split_names = getWordPairs(match);

            split_names.forEach((match) => {
                if (jsonData.hasOwnProperty(match)) {
                    const graphId = jsonData[match].graph_id;
                    names.push({ id: graphId, name: match });
                }
            });
        }
    });

    return names;
}

async function fetchStats(playerId) {
    const url = `https://www.fangraphs.com/api/players/stats?playerid=${playerId}&position=OF&z=1678363774`;
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

const createTooltipTable = (data, keysToInclude) => {
    const table = document.createElement('table');
    const headerRow = table.insertRow();
    for (let i = 0; i < keysToInclude.length; i++) {
        const headerCell = headerRow.insertCell();
        headerCell.textContent = keysToInclude[i];
    }

    // Get the current year and the two previous years
    const currentYear = new Date().getFullYear();
    const previousYears = [currentYear - 1, currentYear - 2];

    // Create a set of years that have already been added to the table
    const addedYears = new Set();

    // Create a row for each object in the data that matches the current or previous years
    for (var j = 0; j < data.length; j++) {
        const aseasonYear = parseInt(data[j]['aseason']);
        if (
            previousYears.includes(aseasonYear) &&
            !addedYears.has(aseasonYear)
        ) {
            const dataRow = table.insertRow();
            for (let k = 0; k < keysToInclude.length; k++) {
                let tdata = data[j][keysToInclude[k]];
                if (keysToInclude[k] != 'Season') {
                    tdata = Math.round(tdata * 10) / 10;
                }
                const dataCell = dataRow.insertCell();
                dataCell.innerHTML = tdata;
            }
            addedYears.add(aseasonYear);
        }
    }

    // Return the HTML code for the table
    return table.outerHTML;
};

(async () => {
    const elements = document.querySelectorAll('a, p, td, h1, h2, h3, h4');
    const jsonData = await loadJsonFile('stript.json');

    for (i = 0; i < elements.length; i++) {
        const foundPlayers = findPlayerNames(jsonData, elements[i].innerText);
        const originalText = elements[i].innerHTML;
        let replacedText = originalText;

        if (foundPlayers) {
            for (let j = 0; j < foundPlayers.length; j++) {
                try {
                    const data = await fetchStats(foundPlayers[j]['id']);

                    const table = createTooltipTable(data['data'], [
                        'Season',
                        'Age',
                        'G',
                        'wOBA',
                        'wRC+',
                        'WAR',
                    ]);

                    replacedText = replacedText.replace(
                        foundPlayers[j]['name'],
                        `<span class="tooltip">${foundPlayers[j]['name']}<span class="tooltiptext">${table}</span></span>`
                    );
                } catch (error) {
                    console.error(error);
                }
            }
        }
        elements[i].innerHTML = replacedText;
    }
})();
