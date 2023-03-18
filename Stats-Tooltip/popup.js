import { defaultSettings } from './settings.js';
const postError = (error) => {
    console.log();
    const errorMsg = document.getElementById('error');
    errorMsg.textContent = error;
};

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
    const addOption = (checkbox, selectedOptions) => {
        const value = checkbox.id;
        const selected = checkbox.checked;
        const pos = checkbox.getAttribute('data-pos');
        selectedOptions.push({ value, selected, pos });
    };

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const selectedOptions = [];

            for (const checkbox of checkboxes) {
                if (
                    selectedOptions.filter((o) => o.pos == 'p' && o.selected)
                        .length > 10 ||
                    selectedOptions.filter((o) => o.pos != 'p' && o.selected)
                        .length > 10
                ) {
                    postError(
                        'Selecting more than 10 stats may cause the tooltip to run off the page.'
                    );
                } else {
                    postError('');
                }

                addOption(checkbox, selectedOptions);
            }

            chrome.storage.sync.set({ selectedOptions }, () => {
                console.log('Settings saved');
            });

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { selectedOptions });
            });
        });
    });
};

//chrome.storage.sync.clear()
chrome.storage.sync.get('selectedOptions', function (items) {
    let settings = defaultSettings;
    if (items.selectedOptions != undefined) settings = items.selectedOptions;

    const bContainer = document.getElementById('b-container');
    const pContainer = document.getElementById('p-container');
    buildList(settings, pContainer, bContainer);

    const checkboxes = document.querySelectorAll('input[type=checkbox]');
    addCheckListeners(checkboxes);
});
