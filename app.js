const state = {
    scripts: [],
    category: 'Wszystkie',
    query: '',
    loaderConnected: false,
    loaderVersion: null,
    moduleSettings: {}
};


const elements = {

    list:
        document.getElementById(
            'list'
        ),

    categories:
        document.getElementById(
            'cats'
        ),

    search:
        document.getElementById(
            'search'
        ),

    count:
        document.getElementById(
            'count'
        ),

    status:
        document.getElementById(
            'state'
        )

};


// ============================================================
// CONFIG
// ============================================================

const LOADER_PING_INTERVAL =
    3000;


const LOADER_TIMEOUT =
    1200;


// ============================================================
// START
// ============================================================

async function init() {

    elements.status.textContent =
        'Ładowanie bazy...';


    setupLoaderBridge();


    await loadManifest();


    pingLoader();


    setInterval(
        pingLoader,
        LOADER_PING_INTERVAL
    );

}


// ============================================================
// LOAD MANIFEST
// ============================================================

async function loadManifest() {

    try {

        const response =
            await fetch(
                'data/scripts.json',
                {
                    cache:
                        'no-store'
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        if (
            !data
            ||
            !Array.isArray(
                data.modules
            )
        ) {

            throw new Error(
                'Brak tablicy modules.'
            );

        }


        state.scripts =
            data.modules;


        renderCategories();

        renderScripts();


        updateStatus();

    } catch (error) {

        console.error(
            '[TTI SCRIPT HUB]',
            error
        );


        elements.status.textContent =
            'Błąd wczytywania bazy';


        elements.list.innerHTML = `

            <div class="empty">

                Nie udało się wczytać

                <b>
                    data/scripts.json
                </b>

            </div>

        `;

    }

}


// ============================================================
// LOADER BRIDGE
// ============================================================

function setupLoaderBridge() {

    window.addEventListener(
        'message',
        event => {

            if (
                event.source !==
                window
            ) {

                return;

            }


            const message =
                event.data;


            if (
                !message
                ||
                typeof message !==
                'object'
            ) {

                return;

            }


            // =================================================
            // LOADER READY
            // =================================================

            if (
                message.type ===
                'TTI_HUB_LOADER_READY'
            ) {

                state.loaderConnected =
                    true;


                state.loaderVersion =
                    message.loaderVersion || null;


                requestSettings();


                updateStatus();

                renderScripts();


                return;

            }


            // =================================================
            // PONG
            // =================================================

            if (
                message.type ===
                'TTI_HUB_PONG'
            ) {

                state.loaderConnected =
                    true;


                state.loaderVersion =
                    message.loaderVersion || null;


                requestSettings();


                updateStatus();

                renderScripts();


                return;

            }


            // =================================================
            // SETTINGS
            // =================================================

            if (
                message.type ===
                'TTI_HUB_SETTINGS'
            ) {

                state.loaderConnected =
                    true;


                state.loaderVersion =
                    message.loaderVersion || null;


                state.moduleSettings =
                    message.settings || {};


                updateStatus();

                renderScripts();


                return;

            }


            // =================================================
            // MODULE CHANGED
            // =================================================

            if (
                message.type ===
                'TTI_HUB_MODULE_CHANGED'
            ) {

                state.moduleSettings[
                    message.moduleId
                ] =
                    Boolean(
                        message.enabled
                    );


                renderScripts();

                return;

            }

        }
    );

}


// ============================================================
// PING LOADER
// ============================================================

function pingLoader() {

    let answered =
        false;


    const previousState =
        state.loaderConnected;


    const handler =
        event => {

            const message =
                event.data;


            if (
                message
                &&
                (
                    message.type ===
                    'TTI_HUB_PONG'

                    ||

                    message.type ===
                    'TTI_HUB_LOADER_READY'
                )
            ) {

                answered =
                    true;


                window.removeEventListener(
                    'message',
                    handler
                );

            }

        };


    window.addEventListener(
        'message',
        handler
    );


    window.postMessage(

        {

            type:
                'TTI_HUB_PING'

        },

        '*'

    );


    setTimeout(
        () => {

            window.removeEventListener(
                'message',
                handler
            );


            if (!answered) {

                state.loaderConnected =
                    false;


                if (
                    previousState !==
                    state.loaderConnected
                ) {

                    updateStatus();

                    renderScripts();

                }

            }

        },

        LOADER_TIMEOUT

    );

}


// ============================================================
// REQUEST SETTINGS
// ============================================================

function requestSettings() {

    window.postMessage(

        {

            type:
                'TTI_HUB_GET_SETTINGS'

        },

        '*'

    );

}


// ============================================================
// CHANGE MODULE
// ============================================================

function setModuleState(
    moduleId,
    enabled
) {

    if (
        !state.loaderConnected
    ) {

        alert(
            'TTI Script Hub Loader nie został wykryty.\n\n' +
            'Najpierw zainstaluj i włącz Loader w Tampermonkey.'
        );

        return;

    }


    window.postMessage(

        {

            type:
                'TTI_HUB_SET_MODULE',

            moduleId:
                moduleId,

            enabled:
                Boolean(
                    enabled
                )

        },

        '*'

    );


    state.moduleSettings[
        moduleId
    ] =
        Boolean(
            enabled
        );


    renderScripts();

}


// ============================================================
// MODULE STATE
// ============================================================

function isModuleEnabled(
    script
) {

    if (
        Object.prototype
            .hasOwnProperty.call(
                state.moduleSettings,
                script.id
            )
    ) {

        return Boolean(
            state.moduleSettings[
                script.id
            ]
        );

    }


    return Boolean(
        script.enabledByDefault
    );

}


// ============================================================
// STATUS
// ============================================================

function updateStatus() {

    if (
        !state.loaderConnected
    ) {

        elements.status.textContent =
            'Loader offline';


        elements.status.style.color =
            '#a13c2a';


        return;

    }


    elements.status.textContent =
        state.loaderVersion

            ? `Loader v${state.loaderVersion} online`

            : 'Loader online';


    elements.status.style.color =
        '#64811e';

}


// ============================================================
// KATEGORIE
// ============================================================

function renderCategories() {

    const categoryList = [

        'Wszystkie',

        ...new Set(

            state.scripts.map(
                script =>
                    script.category
            )

        )

    ];


    elements.categories.innerHTML =
        '';


    categoryList.forEach(
        category => {

            const button =
                document.createElement(
                    'button'
                );


            button.className =
                'cat' +
                (
                    category ===
                    state.category
                        ? ' on'
                        : ''
                );


            button.textContent =
                category;


            button.addEventListener(
                'click',
                () => {

                    state.category =
                        category;


                    renderCategories();

                    renderScripts();

                }
            );


            elements.categories
                .appendChild(
                    button
                );

        }
    );

}


// ============================================================
// FILTER
// ============================================================

function getFilteredScripts() {

    const query =
        state.query
            .trim()
            .toLowerCase();


    return state.scripts.filter(
        script => {

            const matchesCategory =

                state.category ===
                'Wszystkie'

                ||

                script.category ===
                state.category;


            const searchText =

                [
                    script.name,
                    script.description,
                    script.category,
                    script.version
                ]
                    .join(' ')
                    .toLowerCase();


            const matchesQuery =

                !query

                ||

                searchText.includes(
                    query
                );


            return (
                matchesCategory &&
                matchesQuery
            );

        }
    );

}


// ============================================================
// RENDER
// ============================================================

function renderScripts() {

    const scripts =
        getFilteredScripts();


    elements.count.textContent =
        scripts.length;


    elements.list.innerHTML =
        '';


    if (!scripts.length) {

        elements.list.innerHTML = `

            <div class="empty">

                Brak skryptów spełniających
                wybrane kryteria.

            </div>

        `;

        return;

    }


    scripts.forEach(
        script => {

            const card =
                createScriptCard(
                    script
                );


            elements.list
                .appendChild(
                    card
                );

        }
    );

}


// ============================================================
// CARD
// ============================================================

function createScriptCard(
    script
) {

    const enabled =
        isModuleEnabled(
            script
        );


    const card =
        document.createElement(
            'article'
        );


    card.className =
        'card';


    if (enabled) {

        card.classList.add(
            'module-enabled'
        );

    }


    const top =
        document.createElement(
            'div'
        );


    top.className =
        'top';


    const badge =
        document.createElement(
            'span'
        );


    badge.className =
        'badge';


    badge.textContent =
        script.category;


    const version =
        document.createElement(
            'span'
        );


    version.className =
        'ver';


    version.textContent =
        `v${script.version}`;


    top.append(
        badge,
        version
    );


    const title =
        document.createElement(
            'h2'
        );


    title.textContent =
        script.name;


    const description =
        document.createElement(
            'p'
        );


    description.className =
        'desc';


    description.textContent =
        script.description;


    // ========================================================
    // STATUS MODUŁU
    // ========================================================

    const moduleStatus =
        document.createElement(
            'div'
        );


    moduleStatus.className =
        'module-status';


    if (
        !state.loaderConnected
    ) {

        moduleStatus.classList.add(
            'offline'
        );


        moduleStatus.textContent =
            '● LOADER OFFLINE';

    } else if (enabled) {

        moduleStatus.classList.add(
            'enabled'
        );


        moduleStatus.textContent =
            '● AKTYWNY';

    } else {

        moduleStatus.classList.add(
            'disabled'
        );


        moduleStatus.textContent =
            '○ WYŁĄCZONY';

    }


    const meta =
        document.createElement(
            'div'
        );


    meta.className =
        'meta';


    meta.textContent =
        `Moduł: ${script.file}`;


    // ========================================================
    // ACTIONS
    // ========================================================

    const actions =
        document.createElement(
            'div'
        );


    actions.className =
        'actions';


    const toggleButton =
        document.createElement(
            'button'
        );


    toggleButton.className =
        enabled
            ? 'btn module-disable'
            : 'btn module-enable';


    toggleButton.textContent =
        enabled
            ? 'Wyłącz'
            : 'Włącz';


    if (
        !state.loaderConnected
    ) {

        toggleButton.textContent =
            'Loader wymagany';


        toggleButton.disabled =
            true;

    }


    toggleButton.addEventListener(
        'click',
        () => {

            setModuleState(

                script.id,

                !enabled

            );

        }
    );


    actions.appendChild(
        toggleButton
    );


    card.append(

        top,

        title,

        description,

        moduleStatus,

        meta,

        actions

    );


    return card;

}


// ============================================================
// SEARCH
// ============================================================

elements.search.addEventListener(
    'input',
    event => {

        state.query =
            event.target.value;


        renderScripts();

    }
);


// ============================================================
// INIT
// ============================================================

init();
