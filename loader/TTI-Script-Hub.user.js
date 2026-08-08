// ==UserScript==
// @name         TTI Script Hub Loader
// @namespace    https://github.com/ToTylkoIluzja/tti-script-hub
// @version      1.0.0
// @description  Główny loader Bazy ToTylkoIluzja. Pobiera i uruchamia aktywne moduły z GitHub Pages.
// @author       ToTylkoIluzja
//
// @match        https://*.plemiona.pl/game.php*
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.die-staemme.de/game.php*
//
// @match        https://totylkoiluzja.github.io/tti-script-hub/*
//
// @connect      totylkoiluzja.github.io
//
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
//
// @run-at       document-idle
//
// @downloadURL  https://totylkoiluzja.github.io/tti-script-hub/loader/TTI-Script-Hub.user.js
// @updateURL    https://totylkoiluzja.github.io/tti-script-hub/loader/TTI-Script-Hub.user.js
// ==/UserScript==


(function () {

    'use strict';


    // ============================================================
    // CONFIG
    // ============================================================

    const LOADER_VERSION =
        '1.0.0';


    const HUB_BASE =
        'https://totylkoiluzja.github.io/tti-script-hub';


    const MANIFEST_URL =
        `${HUB_BASE}/data/scripts.json`;


    const SETTINGS_KEY =
        'TTI_HUB_MODULE_SETTINGS';


    const DEBUG =
        true;



    // ============================================================
    // STATE
    // ============================================================

    const loadedModules =
        new Set();


    let manifest =
        null;



    // ============================================================
    // LOG
    // ============================================================

    function log(
        ...args
    ) {

        if (!DEBUG) {
            return;
        }


        console.log(
            '%c[TTI HUB]',
            'color:#8b5a2b;font-weight:bold;',
            ...args
        );

    }


    function warn(
        ...args
    ) {

        console.warn(
            '[TTI HUB]',
            ...args
        );

    }


    function error(
        ...args
    ) {

        console.error(
            '[TTI HUB]',
            ...args
        );

    }



    // ============================================================
    // HTTP
    // ============================================================

    function requestText(
        url
    ) {

        return new Promise(
            (
                resolve,
                reject
            ) => {

                GM_xmlhttpRequest({

                    method:
                        'GET',

                    url:
                        url,

                    headers: {

                        'Cache-Control':
                            'no-cache'

                    },

                    onload:
                        response => {

                            if (
                                response.status >= 200
                                &&
                                response.status < 300
                            ) {

                                resolve(
                                    response.responseText
                                );

                                return;

                            }


                            reject(
                                new Error(
                                    `HTTP ${response.status}`
                                )
                            );

                        },

                    onerror:
                        () => {

                            reject(
                                new Error(
                                    'Błąd połączenia'
                                )
                            );

                        },

                    ontimeout:
                        () => {

                            reject(
                                new Error(
                                    'Przekroczono czas połączenia'
                                )
                            );

                        }

                });

            }
        );

    }



    // ============================================================
    // MANIFEST
    // ============================================================

    async function loadManifest() {

        log(
            'Pobieram manifest:',
            MANIFEST_URL
        );


        const text =
            await requestText(
                MANIFEST_URL
            );


        let data;


        try {

            data =
                JSON.parse(
                    text
                );

        } catch (err) {

            throw new Error(
                'Niepoprawny plik scripts.json'
            );

        }


        if (
            !data
            ||
            !Array.isArray(
                data.modules
            )
        ) {

            throw new Error(
                'Manifest nie zawiera tablicy modules.'
            );

        }


        manifest =
            data;


        log(
            `Manifest v${data.hubVersion || '?'}:`,
            `${data.modules.length} modułów`
        );


        return data;

    }



    // ============================================================
    // SETTINGS
    // ============================================================

    function getSettings() {

        const saved =
            GM_getValue(
                SETTINGS_KEY,
                {}
            );


        if (
            !saved
            ||
            typeof saved !==
            'object'
        ) {

            return {};

        }


        return saved;

    }


    function saveSettings(
        settings
    ) {

        GM_setValue(
            SETTINGS_KEY,
            settings
        );

    }


    function hasExplicitSetting(
        moduleId
    ) {

        const settings =
            getSettings();


        return Object.prototype
            .hasOwnProperty.call(
                settings,
                moduleId
            );

    }


    function isModuleEnabled(
        module
    ) {

        const settings =
            getSettings();


        if (
            Object.prototype
                .hasOwnProperty.call(
                    settings,
                    module.id
                )
        ) {

            return Boolean(
                settings[
                    module.id
                ]
            );

        }


        return Boolean(
            module.enabledByDefault
        );

    }


    function setModuleEnabled(
        moduleId,
        enabled
    ) {

        const settings =
            getSettings();


        settings[
            moduleId
        ] =
            Boolean(
                enabled
            );


        saveSettings(
            settings
        );


        log(
            moduleId,
            enabled
                ? 'WŁĄCZONY'
                : 'WYŁĄCZONY'
        );

    }



    // ============================================================
    // MODULE URL
    // ============================================================

    function getModuleUrl(
        module
    ) {

        if (
            /^https?:\/\//i.test(
                module.file
            )
        ) {

            return module.file;

        }


        return (
            HUB_BASE
            +
            '/'
            +
            String(
                module.file
            )
                .replace(
                    /^\/+/,
                    ''
                )
        );

    }



    // ============================================================
    // EXECUTE MODULE
    // ============================================================

    function executeCode(
        code,
        module
    ) {

        const url =
            getModuleUrl(
                module
            );


        /*
         * sourceURL sprawia, że w konsoli przeglądarki
         * błędy będą podpisane nazwą modułu.
         */

        const source =
            code
            +
            '\n//# sourceURL='
            +
            url;


        const runner =
            new Function(
                source
            );


        runner.call(
            window
        );

    }



    // ============================================================
    // LOAD MODULE
    // ============================================================

    async function loadModule(
        module
    ) {

        if (
            loadedModules.has(
                module.id
            )
        ) {

            log(
                `Moduł ${module.id} jest już załadowany.`
            );

            return;

        }


        const url =
            getModuleUrl(
                module
            );


        log(
            `Ładuję ${module.name}:`,
            url
        );


        try {

            const code =
                await requestText(
                    url
                );


            if (
                !code
                ||
                !code.trim()
            ) {

                throw new Error(
                    'Plik modułu jest pusty.'
                );

            }


            executeCode(
                code,
                module
            );


            loadedModules.add(
                module.id
            );


            log(
                `✓ Uruchomiono: ${module.name} v${module.version}`
            );

        } catch (err) {

            error(
                `Błąd modułu ${module.name}:`,
                err
            );

        }

    }



    // ============================================================
    // LOAD ACTIVE MODULES
    // ============================================================

    async function loadEnabledModules() {

        if (!manifest) {

            await loadManifest();

        }


        for (
            const module of manifest.modules
        ) {

            if (
                !isModuleEnabled(
                    module
                )
            ) {

                log(
                    `Pominięto: ${module.name}`
                );

                continue;

            }


            await loadModule(
                module
            );

        }

    }



    // ============================================================
    // HUB WEBSITE BRIDGE
    // ============================================================
    //
    // Dzięki temu app.js na naszej stronie będzie mógł
    // komunikować się z Tampermonkey.
    //
    // Strona -> postMessage
    // Loader -> GM_getValue / GM_setValue
    //
    // ============================================================

    function setupWebsiteBridge() {

        log(
            'Uruchamiam most strony WWW.'
        );


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
                // POBRANIE USTAWIEŃ
                // =================================================

                if (
                    message.type ===
                    'TTI_HUB_GET_SETTINGS'
                ) {

                    window.postMessage(

                        {

                            type:
                                'TTI_HUB_SETTINGS',

                            settings:
                                getSettings(),

                            loaderVersion:
                                LOADER_VERSION

                        },

                        '*'

                    );


                    return;

                }


                // =================================================
                // WŁĄCZ / WYŁĄCZ
                // =================================================

                if (
                    message.type ===
                    'TTI_HUB_SET_MODULE'
                ) {

                    if (
                        typeof message.moduleId !==
                        'string'
                    ) {

                        return;

                    }


                    setModuleEnabled(

                        message.moduleId,

                        Boolean(
                            message.enabled
                        )

                    );


                    window.postMessage(

                        {

                            type:
                                'TTI_HUB_MODULE_CHANGED',

                            moduleId:
                                message.moduleId,

                            enabled:
                                Boolean(
                                    message.enabled
                                )

                        },

                        '*'

                    );


                    return;

                }


                // =================================================
                // STATUS LOADERA
                // =================================================

                if (
                    message.type ===
                    'TTI_HUB_PING'
                ) {

                    window.postMessage(

                        {

                            type:
                                'TTI_HUB_PONG',

                            installed:
                                true,

                            loaderVersion:
                                LOADER_VERSION

                        },

                        '*'

                    );

                }

            }
        );


        window.postMessage(

            {

                type:
                    'TTI_HUB_LOADER_READY',

                loaderVersion:
                    LOADER_VERSION

            },

            '*'

        );

    }



    // ============================================================
    // TAMPERMONKEY MENU
    // ============================================================

    function setupMenu() {

        try {

            GM_registerMenuCommand(

                '📦 Otwórz Bazę ToTylkoIluzja',

                () => {

                    window.open(
                        HUB_BASE,
                        '_blank'
                    );

                }

            );


            GM_registerMenuCommand(

                '🔄 Odśwież moduły',

                () => {

                    location.reload();

                }

            );


            GM_registerMenuCommand(

                '🧹 Reset ustawień modułów',

                () => {

                    GM_setValue(
                        SETTINGS_KEY,
                        {}
                    );


                    alert(
                        'TTI Script Hub\n\nUstawienia modułów zostały zresetowane.'
                    );

                }

            );

        } catch (err) {

            warn(
                'Nie udało się utworzyć menu.',
                err
            );

        }

    }



    // ============================================================
    // DETECTION
    // ============================================================

    function isHubWebsite() {

        return (
            location.hostname ===
            'totylkoiluzja.github.io'
            &&
            location.pathname
                .startsWith(
                    '/tti-script-hub'
                )
        );

    }


    function isGame() {

        return (

            /\.plemiona\.pl$/i
                .test(
                    location.hostname
                )

            ||

            /\.tribalwars\.net$/i
                .test(
                    location.hostname
                )

            ||

            /\.die-staemme\.de$/i
                .test(
                    location.hostname
                )

        );

    }



    // ============================================================
    // INIT HUB WEBSITE
    // ============================================================

    async function initHubWebsite() {

        log(
            `TTI Script Hub Loader v${LOADER_VERSION}`
        );


        setupWebsiteBridge();


        try {

            await loadManifest();

        } catch (err) {

            error(
                'Błąd manifestu:',
                err
            );

        }

    }



    // ============================================================
    // INIT GAME
    // ============================================================

    async function initGame() {

        log(
            `TTI Script Hub Loader v${LOADER_VERSION}`
        );


        log(
            'Uruchomiono w Plemionach.'
        );


        try {

            await loadManifest();


            await loadEnabledModules();


            log(
                `Gotowe. Aktywnych modułów: ${loadedModules.size}`
            );

        } catch (err) {

            error(
                'Błąd uruchamiania bazy:',
                err
            );

        }

    }



    // ============================================================
    // START
    // ============================================================

    setupMenu();


    if (
        isHubWebsite()
    ) {

        initHubWebsite();

        return;

    }


    if (
        isGame()
    ) {

        initGame();

        return;

    }


})();
