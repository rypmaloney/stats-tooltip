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

const jsonDasta = await loadJsonFile('stript.json');

function findPlayerNames(jsonData, paragraph) {
    const text = paragraph;

    const nameRegex = /([A-Z][a-z]+)\s+([A-Z][a-z]+)/g;
    let match;

    while ((match = nameRegex.exec(text)) !== null) {
        const fullName = match[0];

        if (jsonData.hasOwnProperty(fullName)) {
            const graphId = jsonData[fullName].graph_id;
            return { id: graphId, name: fullName };
        }
    }
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
async function example() {
    try {
        const data = await fetchStats(10155);
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

searchForNames(
    jsonData,
    "<p>There are many variations Tony Abreu of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.</p>"
);
