import { defaultSettings } from './settings.js';

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
    let settings = defaultSettings;
    if (items.selectedOptions != undefined) {
        settings = items.selectedOptions;
    }

    const bContainer = document.getElementById('b-container');
    const pContainer = document.getElementById('p-container');
    buildList(settings, pContainer, bContainer);
    const checkboxes = document.querySelectorAll('input[type=checkbox]');
    addCheckListeners(checkboxes);
});
