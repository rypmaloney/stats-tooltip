const defaultSetting = [
    { value: 'IP', selected: false, pos: 'p' },
    { value: 'ERA', selected: false, pos: 'p' },
    { value: 'WHIP', selected: false, pos: 'p' },
    { value: 'xFIP', selected: false, pos: 'p' },
    { value: 'FIP', selected: false, pos: 'p' },
    { value: 'WAR', selected: false, pos: 'p' },
    { value: 'K/9', selected: false, pos: 'p' },
    { value: 'BB/9', selected: false, pos: 'p' },
    { value: 'K/BB', selected: false, pos: 'p' },
    { value: 'H/9', selected: false, pos: 'p' },
    { value: 'GB%', selected: false, pos: 'p' },
    { value: 'SwStr%', selected: false, pos: 'p' },
    { value: 'K%', selected: false, pos: 'p' },
    { value: 'W', selected: false, pos: 'p' },
    { value: 'L', selected: false, pos: 'p' },

    { value: 'G', selected: false, pos: 'b' },
    { value: 'PA', selected: false, pos: 'b' },
    { value: 'AB', selected: false, pos: 'b' },
    { value: '1B', selected: false, pos: 'b' },
    { value: '2B', selected: false, pos: 'b' },
    { value: '3B', selected: false, pos: 'b' },
    { value: 'HR', selected: false, pos: 'b' },

    { value: 'RBI', selected: false, pos: 'b' },
    { value: 'BB', selected: false, pos: 'b' },
    { value: 'SO', selected: false, pos: 'b' },
    { value: 'AVG', selected: false, pos: 'b' },
    { value: 'OBP', selected: false, pos: 'b' },
    { value: 'SLG', selected: false, pos: 'b' },
    { value: 'OPS', selected: false, pos: 'b' },
    { value: 'BABPI', selected: false, pos: 'b' },

    { value: 'wOBA', selected: false, pos: 'b' },
    { value: 'wRC+', selected: false, pos: 'b' },
    { value: 'WAR', selected: false, pos: 'b' },
];

const buildList = (options, pParent, bParent) => {
    options.forEach(function (option) {
        const { value, selected, pos } = option;
        const checkbox = document.createElement('input');
        const container = document.createElement('div');

        checkbox.type = 'checkbox';
        checkbox.id = value;
        checkbox.value = value;
        checkbox.checked = selected;
        checkbox.setAttribute('data-pos', pos);

        var label = document.createElement('label');
        label.setAttribute('for', option.value);
        label.textContent = option.value;
        container.appendChild(checkbox);
        container.appendChild(label);
        const parent = option.pos == 'p' ? pParent : bParent;

        parent.appendChild(container);
    });
};

const addCheckListeners = (checkboxes) => {
    checkboxes.forEach(function (checkbox) {
        checkbox.addEventListener('change', function () {
            var selectedOptions = [];
            console.log(checkboxes);
            checkboxes.forEach(function (checkbox) {
                if (checkbox.checked) {
                    selectedOptions.push({
                        value: checkbox.id,
                        selected: true,
                        pos: checkbox.getAttribute('data-pos'),
                    });
                } else {
                    selectedOptions.push({
                        value: checkbox.id,
                        selected: false,
                        pos: checkbox.getAttribute('data-pos'),
                    });
                }
            });

            chrome.storage.sync.set(
                { selectedOptions: selectedOptions },
                function () {
                    console.log('Settings saved');
                }
            );

            chrome.tabs.query(
                { active: true, currentWindow: true },
                function (tabs) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        selectedOptions: selectedOptions,
                    });
                }
            );
        });
    });
};
//chrome.storage.sync.clear()
chrome.storage.sync.get('selectedOptions', function (items) {
    let settings = defaultSetting;
    if (items.selectedOptions != undefined) {
        settings = items.selectedOptions;
    }

    const bContainer = document.getElementById('b-container');
    const pContainer = document.getElementById('p-container');
    buildList(settings, pContainer, bContainer);
    const checkboxes = document.querySelectorAll('input[type=checkbox]');
    addCheckListeners(checkboxes);
});
