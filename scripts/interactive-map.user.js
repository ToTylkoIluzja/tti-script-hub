// ==UserScript==
// @name         Plemiona - Interactive Village Area Counter
// @namespace    https://github.com/ToTylkoIluzja/tti-script-hub
// @version      1.3.0
// @description  Interaktywna mapa do zaznaczania obszaru i liczenia wiosek w Plemionach.
// @author       ToTylkoIluzja
//
// @match        https://*.plemiona.pl/game.php*
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.die-staemme.de/game.php*
//
// @downloadURL  https://totylkoiluzja.github.io/tti-script-hub/scripts/interactive-map.user.js
// @updateURL    https://totylkoiluzja.github.io/tti-script-hub/scripts/interactive-map.user.js
//
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ============================================================
    // CONFIG
    // ============================================================

    const VERSION = '1.3.0';

    const CACHE_TIME =
        60 * 60 * 1000;

    const CACHE_KEY =
        'TTI_INTERACTIVE_MAP_' +
        location.hostname;


    // ============================================================
    // STATE
    // ============================================================

    let villages = [];

    let polygon = [];

    let resultVillages = [];

    let mapLoaded = false;

    let selectedPointIndex = -1;

    let draggingPoint = false;

    let panning = false;

    let panStart = null;

    let recalcTimer = null;


    const view = {

        centerX: 500,
        centerY: 500,

        zoom: 2,

        minZoom: 0.45,
        maxZoom: 18

    };


    // ============================================================
    // CSS
    // ============================================================

    const style =
        document.createElement('style');

    style.textContent = `

        #tti-map-launcher {

            position: fixed;

            left: 10px;
            top: 125px;

            z-index: 99990;

            padding: 9px 14px;

            border: 1px solid #3b2512;

            border-radius: 5px;

            background:
                linear-gradient(
                    180deg,
                    #8b5a2b,
                    #65401e
                );

            color: white;

            font-weight: bold;

            cursor: pointer;

            box-shadow:
                0 2px 8px
                rgba(0,0,0,.45);

        }


        #tti-map-panel {

            position: fixed;

            left: 50%;
            top: 55px;

            transform:
                translateX(-50%);

            width: min(
                1150px,
                calc(100vw - 30px)
            );

            height:
                min(
                    820px,
                    calc(100vh - 75px)
                );

            z-index: 99999;

            display: none;

            flex-direction: column;

            background: #f3e3bb;

            border:
                2px solid #553419;

            border-radius: 7px;

            box-shadow:
                0 8px 35px
                rgba(0,0,0,.55);

            font-family:
                Arial,
                sans-serif;

            color: #222;

            overflow: hidden;

        }


        #tti-map-header {

            height: 42px;

            flex:
                0 0 42px;

            display: flex;

            align-items: center;

            justify-content:
                space-between;

            padding:
                0 12px;

            box-sizing:
                border-box;

            background:
                linear-gradient(
                    180deg,
                    #765026,
                    #513216
                );

            color: white;

            font-weight: bold;

            cursor: move;

        }


        #tti-map-close {

            display: flex;

            align-items: center;

            justify-content: center;

            width: 27px;
            height: 27px;

            font-size: 20px;

            cursor: pointer;

            border-radius: 4px;

        }


        #tti-map-close:hover {

            background:
                rgba(
                    255,
                    255,
                    255,
                    .15
                );

        }


        #tti-main-layout {

            flex: 1;

            min-height: 0;

            display: grid;

            grid-template-columns:
                minmax(0,1fr)
                290px;

            gap: 0;

        }


        #tti-map-side {

            padding: 10px;

            overflow-y: auto;

            border-left:
                1px solid #8e6d44;

            background:
                #ead6a9;

            box-sizing:
                border-box;

        }


        #tti-map-area {

            position: relative;

            min-width: 0;

            min-height: 0;

            background: #ded0ae;

            overflow: hidden;

        }


        #tti-world-map {

            display: block;

            width: 100%;
            height: 100%;

            cursor: crosshair;

            background: #ded0ae;

        }


        #tti-coordinates {

            position: absolute;

            left: 9px;
            bottom: 9px;

            pointer-events: none;

            padding:
                5px 8px;

            background:
                rgba(30,20,10,.82);

            color: white;

            border-radius: 4px;

            font:
                11px monospace;

        }


        #tti-map-hint {

            position: absolute;

            top: 8px;
            left: 8px;

            max-width: 360px;

            pointer-events: none;

            padding:
                6px 9px;

            background:
                rgba(255,250,235,.88);

            border:
                1px solid #80653f;

            border-radius: 4px;

            font-size: 11px;

            line-height: 1.4;

        }


        .tti-section {

            margin-bottom: 12px;

            padding-bottom: 12px;

            border-bottom:
                1px solid
                rgba(100,70,35,.25);

        }


        .tti-title {

            display: block;

            margin-bottom: 7px;

            font-weight: bold;

            font-size: 12px;

        }


        .tti-button-grid {

            display: grid;

            grid-template-columns:
                1fr 1fr;

            gap: 6px;

        }


        .tti-btn {

            padding:
                7px 8px;

            border:
                1px solid #55361c;

            border-radius: 4px;

            background:
                linear-gradient(
                    #987348,
                    #73512e
                );

            color: white;

            font-size: 11px;

            font-weight: bold;

            cursor: pointer;

        }


        .tti-btn:hover {

            filter:
                brightness(1.1);

        }


        .tti-btn-primary {

            background:
                linear-gradient(
                    #5c963d,
                    #3d6e27
                );

        }


        .tti-btn-danger {

            background:
                linear-gradient(
                    #a85343,
                    #773227
                );

        }


        .tti-btn-wide {

            grid-column:
                1 / -1;

        }


        .tti-stat-grid {

            display: grid;

            grid-template-columns:
                repeat(3,1fr);

            gap: 5px;

        }


        .tti-stat {

            padding: 7px 4px;

            text-align: center;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .55
                );

            border:
                1px solid #b69768;

            border-radius: 4px;

        }


        .tti-stat-value {

            display: block;

            font-size: 17px;

            font-weight: bold;

            color: #653d19;

        }


        .tti-stat-label {

            display: block;

            margin-top: 2px;

            font-size: 9px;

        }


        #tti-import {

            width: 100%;

            box-sizing:
                border-box;

            min-height: 95px;

            resize: vertical;

            padding: 6px;

            background: #fffdf7;

            border:
                1px solid #94774f;

            border-radius: 4px;

            font:
                10px monospace;

        }


        #tti-status {

            padding: 7px;

            margin-bottom: 9px;

            border-radius: 4px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .45
                );

            font-size: 11px;

            line-height: 1.4;

        }


        #tti-point-list {

            max-height: 150px;

            overflow-y: auto;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .35
                );

            border:
                1px solid #b8996d;

            border-radius: 4px;

        }


        .tti-point-row {

            display: flex;

            justify-content:
                space-between;

            gap: 6px;

            padding:
                4px 6px;

            border-bottom:
                1px solid
                rgba(
                    120,
                    90,
                    55,
                    .15
                );

            font:
                10px monospace;

        }


        .tti-point-row:last-child {

            border-bottom: none;

        }


        .tti-point-remove {

            color: #9c251d;

            cursor: pointer;

            font-family: Arial;

            font-weight: bold;

        }


        #tti-result-list {

            width: 100%;

            box-sizing:
                border-box;

            height: 135px;

            resize: vertical;

            padding: 6px;

            font:
                10px monospace;

            background:
                #fffdf7;

            border:
                1px solid #94774f;

            border-radius: 4px;

        }


        .tti-checkbox {

            display: flex;

            align-items: center;

            gap: 6px;

            margin:
                5px 0;

            font-size: 11px;

        }


        @media (
            max-width: 850px
        ) {

            #tti-main-layout {

                grid-template-columns:
                    1fr;

                grid-template-rows:
                    minmax(400px,1fr)
                    260px;

            }


            #tti-map-side {

                border-left: none;

                border-top:
                    1px solid #8e6d44;

            }

        }

    `;

    document.head.appendChild(style);


    // ============================================================
    // UI
    // ============================================================

    const launcher =
        document.createElement('button');

    launcher.id =
        'tti-map-launcher';

    launcher.textContent =
        '🗺️ Mapa obszaru';

    document.body.appendChild(
        launcher
    );


    const panel =
        document.createElement('div');

    panel.id =
        'tti-map-panel';


    panel.innerHTML = `

        <div id="tti-map-header">

            <span>
                🗺️ Interaktywna mapa obszaru
                <small style="opacity:.65">
                    v${VERSION}
                </small>
            </span>

            <span id="tti-map-close">
                ×
            </span>

        </div>


        <div id="tti-main-layout">


            <div id="tti-map-area">

                <canvas id="tti-world-map">
                </canvas>

                <div id="tti-map-hint">

                    <b>Lewy klik:</b>
                    dodaj punkt

                    <br>

                    <b>Przeciągnij żółty punkt:</b>
                    zmień granicę

                    <br>

                    <b>Prawy klik punktu:</b>
                    usuń

                    <br>

                    <b>Prawy przycisk + przeciąganie:</b>
                    przesuń mapę

                    <br>

                    <b>Rolka:</b>
                    zoom

                </div>

                <div id="tti-coordinates">
                    X: - | Y: -
                </div>

            </div>


            <aside id="tti-map-side">


                <div id="tti-status">
                    Uruchamianie mapy...
                </div>


                <div class="tti-section">

                    <span class="tti-title">
                        Wynik
                    </span>

                    <div class="tti-stat-grid">

                        <div class="tti-stat">

                            <span
                                class="tti-stat-value"
                                id="tti-total">

                                0

                            </span>

                            <span class="tti-stat-label">
                                WSZYSTKIE
                            </span>

                        </div>


                        <div class="tti-stat">

                            <span
                                class="tti-stat-value"
                                id="tti-player">

                                0

                            </span>

                            <span class="tti-stat-label">
                                GRACZY
                            </span>

                        </div>


                        <div class="tti-stat">

                            <span
                                class="tti-stat-value"
                                id="tti-barb">

                                0

                            </span>

                            <span class="tti-stat-label">
                                BARBY
                            </span>

                        </div>

                    </div>

                </div>


                <div class="tti-section">

                    <span class="tti-title">
                        Sterowanie
                    </span>

                    <div class="tti-button-grid">

                        <button
                            class="tti-btn tti-btn-primary tti-btn-wide"
                            id="tti-count">

                            🔍 Przelicz obszar

                        </button>


                        <button
                            class="tti-btn"
                            id="tti-fit">

                            Dopasuj widok

                        </button>


                        <button
                            class="tti-btn"
                            id="tti-world">

                            Cały świat

                        </button>


                        <button
                            class="tti-btn"
                            id="tti-undo">

                            ↶ Cofnij punkt

                        </button>


                        <button
                            class="tti-btn tti-btn-danger"
                            id="tti-clear">

                            Wyczyść

                        </button>

                    </div>


                    <label class="tti-checkbox">

                        <input
                            type="checkbox"
                            id="tti-auto-count"
                            checked
                        >

                        Przeliczaj automatycznie

                    </label>


                    <label class="tti-checkbox">

                        <input
                            type="checkbox"
                            id="tti-show-outside"
                        >

                        Pokaż wioski poza granicą

                    </label>

                </div>


                <div class="tti-section">

                    <span class="tti-title">
                        Punkty granicy
                        (<span id="tti-point-count">0</span>)
                    </span>

                    <div id="tti-point-list">
                    </div>

                </div>


                <div class="tti-section">

                    <span class="tti-title">
                        Wczytaj granicę z Plemion
                    </span>

                    <textarea
                        id="tti-import"
                        placeholder="{start: [585, 421], end: [500, 459], ...},
{start: [500, 459], end: [499, 479], ...},"
                    ></textarea>

                    <div class="tti-button-grid"
                         style="margin-top:6px">

                        <button
                            class="tti-btn tti-btn-wide"
                            id="tti-import-btn">

                            📥 Wczytaj na mapę

                        </button>

                    </div>

                </div>


                <div class="tti-section">

                    <span class="tti-title">
                        Wioski w obszarze
                    </span>

                    <textarea
                        id="tti-result-list"
                        readonly
                    ></textarea>

                    <div class="tti-button-grid"
                         style="margin-top:6px">

                        <button
                            class="tti-btn tti-btn-wide"
                            id="tti-copy">

                            📋 Kopiuj kordy

                        </button>

                    </div>

                </div>


            </aside>


        </div>

    `;


    document.body.appendChild(
        panel
    );


    // ============================================================
    // ELEMENTS
    // ============================================================

    const canvas =
        document.getElementById(
            'tti-world-map'
        );

    const ctx =
        canvas.getContext('2d');


    const mapArea =
        document.getElementById(
            'tti-map-area'
        );


    const status =
        document.getElementById(
            'tti-status'
        );


    const coordBox =
        document.getElementById(
            'tti-coordinates'
        );


    const pointList =
        document.getElementById(
            'tti-point-list'
        );


    const pointCount =
        document.getElementById(
            'tti-point-count'
        );


    const autoCount =
        document.getElementById(
            'tti-auto-count'
        );


    const showOutside =
        document.getElementById(
            'tti-show-outside'
        );


    // ============================================================
    // OPEN / CLOSE
    // ============================================================

    launcher.addEventListener(
        'click',
        async () => {

            panel.style.display =
                'flex';


            resizeCanvas();


            draw();


            if (!mapLoaded) {

                await loadVillageData();

            }

        }
    );


    document
        .getElementById(
            'tti-map-close'
        )
        .addEventListener(
            'click',
            () => {

                panel.style.display =
                    'none';

            }
        );


    // ============================================================
    // CANVAS SIZE
    // ============================================================

    function resizeCanvas() {

        const rect =
            mapArea.getBoundingClientRect();


        const dpr =
            window.devicePixelRatio || 1;


        canvas.width =
            Math.max(
                1,
                Math.round(
                    rect.width * dpr
                )
            );


        canvas.height =
            Math.max(
                1,
                Math.round(
                    rect.height * dpr
                )
            );


        canvas.style.width =
            rect.width + 'px';


        canvas.style.height =
            rect.height + 'px';


        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );


        draw();

    }


    window.addEventListener(
        'resize',
        resizeCanvas
    );


    // ============================================================
    // MAP PROJECTION
    // ============================================================

    function mapDimensions() {

        return {

            width:
                canvas.clientWidth,

            height:
                canvas.clientHeight

        };

    }


    function worldToScreen(
        x,
        y
    ) {

        const {
            width,
            height
        } = mapDimensions();


        return {

            x:
                width / 2 +
                (
                    x -
                    view.centerX
                ) * view.zoom,

            y:
                height / 2 +
                (
                    y -
                    view.centerY
                ) * view.zoom

        };

    }


    function screenToWorld(
        x,
        y
    ) {

        const {
            width,
            height
        } = mapDimensions();


        return {

            x:
                view.centerX +
                (
                    x -
                    width / 2
                ) / view.zoom,

            y:
                view.centerY +
                (
                    y -
                    height / 2
                ) / view.zoom

        };

    }


    // ============================================================
    // DATA
    // ============================================================

    async function loadVillageData(
        force = false
    ) {

        status.textContent =
            'Pobieram aktualne wioski świata...';


        if (!force) {

            try {

                const cached =
                    JSON.parse(
                        localStorage.getItem(
                            CACHE_KEY
                        ) ||
                        'null'
                    );


                if (
                    cached &&
                    cached.time &&
                    cached.data &&
                    Date.now() -
                    cached.time <
                    CACHE_TIME
                ) {

                    villages =
                        cached.data;

                    mapLoaded =
                        true;


                    status.textContent =
                        `Załadowano ${villages.length.toLocaleString('pl-PL')} wiosek z pamięci.`;

                    draw();

                    return;

                }

            } catch (_) {}

        }


        try {

            const response =
                await fetch(

                    `${location.origin}/map/village.txt`,

                    {
                        credentials:
                            'same-origin'
                    }

                );


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );

            }


            const text =
                await response.text();


            villages =
                parseVillages(text);


            mapLoaded =
                true;


            try {

                localStorage.setItem(

                    CACHE_KEY,

                    JSON.stringify({

                        time:
                            Date.now(),

                        data:
                            villages

                    })

                );

            } catch (_) {}


            status.textContent =
                `Załadowano ${villages.length.toLocaleString('pl-PL')} wiosek świata.`;


            draw();


            scheduleCalculate();


        } catch (error) {

            status.textContent =
                'Błąd pobierania mapy: ' +
                error.message;

        }

    }


    function parseVillages(text) {

        const result = [];


        const rows =
            text
                .trim()
                .split(
                    /\r?\n/
                );


        for (
            const row of rows
        ) {

            const columns =
                row.split(',');


            if (
                columns.length < 6
            ) {

                continue;

            }


            let name =
                columns[1] || '';


            try {

                name =
                    decodeURIComponent(
                        name.replace(
                            /\+/g,
                            ' '
                        )
                    );

            } catch (_) {}


            const x =
                Number(
                    columns[2]
                );

            const y =
                Number(
                    columns[3]
                );


            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y)
            ) {

                continue;

            }


            result.push({

                id:
                    Number(
                        columns[0]
                    ),

                name,

                x,

                y,

                playerId:
                    Number(
                        columns[4]
                    ) || 0,

                points:
                    Number(
                        columns[5]
                    ) || 0

            });

        }


        return result;

    }


    // ============================================================
    // DRAW
    // ============================================================

    function draw() {

        const {
            width,
            height
        } = mapDimensions();


        if (
            width <= 0 ||
            height <= 0
        ) {

            return;

        }


        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        // ========================================================
        // BACKGROUND
        // ========================================================

        ctx.fillStyle =
            '#ded0ae';

        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        drawGrid();


        drawVillages();


        drawPolygon();


        drawPoints();

    }


    // ============================================================
    // GRID
    // ============================================================

    function getGridStep() {

        if (
            view.zoom >= 8
        ) {
            return 5;
        }


        if (
            view.zoom >= 4
        ) {
            return 10;
        }


        if (
            view.zoom >= 1.7
        ) {
            return 25;
        }


        if (
            view.zoom >= .8
        ) {
            return 50;
        }


        return 100;

    }


    function drawGrid() {

        const {
            width,
            height
        } = mapDimensions();


        const topLeft =
            screenToWorld(
                0,
                0
            );


        const bottomRight =
            screenToWorld(
                width,
                height
            );


        const step =
            getGridStep();


        ctx.lineWidth =
            1;


        ctx.strokeStyle =
            'rgba(70,55,35,.18)';


        ctx.fillStyle =
            'rgba(60,45,30,.75)';


        ctx.font =
            '10px Arial';


        let startX =
            Math.floor(
                topLeft.x /
                step
            ) * step;


        let startY =
            Math.floor(
                topLeft.y /
                step
            ) * step;


        for (
            let x = startX;
            x <= bottomRight.x;
            x += step
        ) {

            if (
                x < 0 ||
                x > 1000
            ) {
                continue;
            }


            const p =
                worldToScreen(
                    x,
                    0
                );


            ctx.beginPath();

            ctx.moveTo(
                p.x,
                0
            );

            ctx.lineTo(
                p.x,
                height
            );

            ctx.stroke();


            ctx.fillText(
                String(
                    Math.round(x)
                ),
                p.x + 3,
                13
            );

        }


        for (
            let y = startY;
            y <= bottomRight.y;
            y += step
        ) {

            if (
                y < 0 ||
                y > 1000
            ) {
                continue;
            }


            const p =
                worldToScreen(
                    0,
                    y
                );


            ctx.beginPath();

            ctx.moveTo(
                0,
                p.y
            );

            ctx.lineTo(
                width,
                p.y
            );

            ctx.stroke();


            ctx.fillText(
                String(
                    Math.round(y)
                ),
                3,
                p.y - 3
            );

        }


        // outer world border

        const p1 =
            worldToScreen(
                0,
                0
            );

        const p2 =
            worldToScreen(
                1000,
                1000
            );


        ctx.strokeStyle =
            'rgba(60,40,20,.6)';

        ctx.lineWidth =
            2;


        ctx.strokeRect(
            p1.x,
            p1.y,
            p2.x -
            p1.x,
            p2.y -
            p1.y
        );

    }


    // ============================================================
    // VILLAGES
    // ============================================================

    function drawVillages() {

        if (
            !mapLoaded
        ) {
            return;
        }


        const resultSet =
            new Set(
                resultVillages.map(
                    v => v.id
                )
            );


        for (
            const village of villages
        ) {

            const p =
                worldToScreen(
                    village.x,
                    village.y
                );


            if (

                p.x < -6 ||
                p.y < -6 ||
                p.x >
                    canvas.clientWidth + 6 ||
                p.y >
                    canvas.clientHeight + 6

            ) {

                continue;

            }


            const inside =
                resultSet.has(
                    village.id
                );


            if (
                !inside &&
                polygon.length >= 3 &&
                !showOutside.checked
            ) {

                continue;

            }


            let radius =
                Math.max(
                    1.25,
                    Math.min(
                        4,
                        view.zoom *
                        .65
                    )
                );


            if (inside) {

                radius +=
                    .8;

            }


            ctx.beginPath();


            ctx.arc(

                p.x,
                p.y,

                radius,

                0,
                Math.PI * 2

            );


            if (
                village.playerId === 0
            ) {

                ctx.fillStyle =
                    inside
                        ? '#222'
                        : 'rgba(80,80,80,.42)';

            } else {

                ctx.fillStyle =
                    inside
                        ? '#165cc7'
                        : 'rgba(35,90,170,.35)';

            }


            ctx.fill();

        }

    }


    // ============================================================
    // POLYGON
    // ============================================================

    function drawPolygon() {

        if (
            polygon.length < 2
        ) {
            return;
        }


        ctx.beginPath();


        polygon.forEach(
            (
                point,
                index
            ) => {

                const p =
                    worldToScreen(
                        point.x,
                        point.y
                    );


                if (
                    index === 0
                ) {

                    ctx.moveTo(
                        p.x,
                        p.y
                    );

                } else {

                    ctx.lineTo(
                        p.x,
                        p.y
                    );

                }

            }
        );


        if (
            polygon.length >= 3
        ) {

            ctx.closePath();


            ctx.fillStyle =
                'rgba(50,140,60,.15)';

            ctx.fill();

        }


        ctx.strokeStyle =
            '#d11919';

        ctx.lineWidth =
            3;

        ctx.lineJoin =
            'round';

        ctx.lineCap =
            'round';

        ctx.stroke();

    }


    // ============================================================
    // POLYGON POINTS
    // ============================================================

    function drawPoints() {

        polygon.forEach(
            (
                point,
                index
            ) => {

                const p =
                    worldToScreen(
                        point.x,
                        point.y
                    );


                ctx.beginPath();


                ctx.arc(

                    p.x,
                    p.y,

                    index ===
                    selectedPointIndex
                        ? 7
                        : 5,

                    0,
                    Math.PI * 2

                );


                ctx.fillStyle =
                    index ===
                    selectedPointIndex
                        ? '#ffdc55'
                        : '#ffae00';


                ctx.fill();


                ctx.strokeStyle =
                    '#222';

                ctx.lineWidth =
                    1.5;

                ctx.stroke();


                if (
                    view.zoom > .8
                ) {

                    ctx.fillStyle =
                        '#111';

                    ctx.font =
                        'bold 10px Arial';


                    ctx.fillText(

                        String(
                            index + 1
                        ),

                        p.x + 7,
                        p.y - 7

                    );

                }

            }
        );

    }


    // ============================================================
    // HIT TEST
    // ============================================================

    function findPointAt(
        screenX,
        screenY
    ) {

        let best =
            -1;

        let bestDistance =
            11;


        polygon.forEach(
            (
                point,
                index
            ) => {

                const p =
                    worldToScreen(
                        point.x,
                        point.y
                    );


                const distance =
                    Math.hypot(

                        p.x -
                        screenX,

                        p.y -
                        screenY

                    );


                if (
                    distance <
                    bestDistance
                ) {

                    bestDistance =
                        distance;

                    best =
                        index;

                }

            }
        );


        return best;

    }


    // ============================================================
    // MOUSE
    // ============================================================

    canvas.addEventListener(
        'mousedown',
        event => {

            const rect =
                canvas.getBoundingClientRect();


            const mouseX =
                event.clientX -
                rect.left;


            const mouseY =
                event.clientY -
                rect.top;


            if (
                event.button === 2
            ) {

                const index =
                    findPointAt(
                        mouseX,
                        mouseY
                    );


                if (
                    index !== -1
                ) {

                    polygon.splice(
                        index,
                        1
                    );


                    selectedPointIndex =
                        -1;


                    updatePointList();

                    scheduleCalculate();

                    draw();

                    return;

                }


                panning =
                    true;


                panStart = {

                    mouseX,
                    mouseY,

                    centerX:
                        view.centerX,

                    centerY:
                        view.centerY

                };


                return;

            }


            if (
                event.button !== 0
            ) {
                return;
            }


            const index =
                findPointAt(
                    mouseX,
                    mouseY
                );


            if (
                index !== -1
            ) {

                selectedPointIndex =
                    index;

                draggingPoint =
                    true;

                draw();

                return;

            }


            const world =
                screenToWorld(
                    mouseX,
                    mouseY
                );


            if (

                world.x < 0 ||
                world.y < 0 ||
                world.x > 1000 ||
                world.y > 1000

            ) {

                return;

            }


            polygon.push({

                x:
                    Math.round(
                        world.x
                    ),

                y:
                    Math.round(
                        world.y
                    )

            });


            selectedPointIndex =
                polygon.length - 1;


            updatePointList();

            scheduleCalculate();

            draw();

        }
    );


    canvas.addEventListener(
        'mousemove',
        event => {

            const rect =
                canvas.getBoundingClientRect();


            const mouseX =
                event.clientX -
                rect.left;


            const mouseY =
                event.clientY -
                rect.top;


            const world =
                screenToWorld(
                    mouseX,
                    mouseY
                );


            coordBox.textContent =

                `X: ${world.x.toFixed(1)} | Y: ${world.y.toFixed(1)}`;


            if (
                draggingPoint &&
                selectedPointIndex !== -1
            ) {

                polygon[
                    selectedPointIndex
                ] = {

                    x:
                        Math.max(
                            0,
                            Math.min(
                                1000,
                                Math.round(
                                    world.x
                                )
                            )
                        ),

                    y:
                        Math.max(
                            0,
                            Math.min(
                                1000,
                                Math.round(
                                    world.y
                                )
                            )
                        )

                };


                updatePointList();

                draw();

                return;

            }


            if (
                panning &&
                panStart
            ) {

                view.centerX =
                    panStart.centerX -
                    (
                        mouseX -
                        panStart.mouseX
                    ) /
                    view.zoom;


                view.centerY =
                    panStart.centerY -
                    (
                        mouseY -
                        panStart.mouseY
                    ) /
                    view.zoom;


                clampView();

                draw();

            }

        }
    );


    window.addEventListener(
        'mouseup',
        () => {

            if (
                draggingPoint
            ) {

                draggingPoint =
                    false;

                scheduleCalculate();

            }


            panning =
                false;

            panStart =
                null;

        }
    );


    canvas.addEventListener(
        'contextmenu',
        event => {

            event.preventDefault();

        }
    );


    // ============================================================
    // ZOOM
    // ============================================================

    canvas.addEventListener(
        'wheel',
        event => {

            event.preventDefault();


            const rect =
                canvas.getBoundingClientRect();


            const mouseX =
                event.clientX -
                rect.left;


            const mouseY =
                event.clientY -
                rect.top;


            const before =
                screenToWorld(
                    mouseX,
                    mouseY
                );


            const factor =
                event.deltaY < 0
                    ? 1.18
                    : 1 / 1.18;


            view.zoom =
                Math.max(

                    view.minZoom,

                    Math.min(

                        view.maxZoom,

                        view.zoom *
                        factor

                    )

                );


            const after =
                screenToWorld(
                    mouseX,
                    mouseY
                );


            view.centerX +=
                before.x -
                after.x;


            view.centerY +=
                before.y -
                after.y;


            clampView();

            draw();

        },

        {
            passive: false
        }

    );


    function clampView() {

        view.centerX =
            Math.max(
                -250,
                Math.min(
                    1250,
                    view.centerX
                )
            );


        view.centerY =
            Math.max(
                -250,
                Math.min(
                    1250,
                    view.centerY
                )
            );

    }


    // ============================================================
    // GEOMETRY
    // ============================================================

    function pointOnSegment(
        point,
        a,
        b
    ) {

        const cross =
            (
                point.y -
                a.y
            ) *
            (
                b.x -
                a.x
            )
            -
            (
                point.x -
                a.x
            ) *
            (
                b.y -
                a.y
            );


        if (
            Math.abs(
                cross
            ) >
            0.000001
        ) {

            return false;

        }


        const dot =
            (
                point.x -
                a.x
            ) *
            (
                b.x -
                a.x
            )
            +
            (
                point.y -
                a.y
            ) *
            (
                b.y -
                a.y
            );


        if (
            dot < 0
        ) {

            return false;

        }


        const lengthSquared =
            (
                b.x -
                a.x
            ) ** 2
            +
            (
                b.y -
                a.y
            ) ** 2;


        return (
            dot <=
            lengthSquared
        );

    }


    function pointInPolygon(
        point,
        poly
    ) {

        let inside =
            false;


        for (
            let i = 0,
                j =
                    poly.length - 1;

            i <
            poly.length;

            j = i++
        ) {

            const a =
                poly[j];

            const b =
                poly[i];


            if (
                pointOnSegment(
                    point,
                    a,
                    b
                )
            ) {

                return true;

            }


            const intersect =

                (
                    (
                        b.y >
                        point.y
                    ) !==
                    (
                        a.y >
                        point.y
                    )
                )

                &&

                (
                    point.x <

                    (
                        (
                            a.x -
                            b.x
                        ) *
                        (
                            point.y -
                            b.y
                        ) /
                        (
                            a.y -
                            b.y
                        ) +
                        b.x
                    )
                );


            if (
                intersect
            ) {

                inside =
                    !inside;

            }

        }


        return inside;

    }


    // ============================================================
    // CALCULATE
    // ============================================================

    function calculate() {

        if (
            polygon.length < 3
        ) {

            resultVillages =
                [];


            updateResults();


            status.textContent =
                'Dodaj minimum 3 punkty, aby utworzyć obszar.';


            draw();

            return;

        }


        if (
            !mapLoaded
        ) {

            status.textContent =
                'Dane świata jeszcze się ładują.';

            return;

        }


        const minX =
            Math.min(
                ...polygon.map(
                    p => p.x
                )
            );


        const maxX =
            Math.max(
                ...polygon.map(
                    p => p.x
                )
            );


        const minY =
            Math.min(
                ...polygon.map(
                    p => p.y
                )
            );


        const maxY =
            Math.max(
                ...polygon.map(
                    p => p.y
                )
            );


        const candidates =
            villages.filter(
                village =>

                    village.x >= minX &&
                    village.x <= maxX &&
                    village.y >= minY &&
                    village.y <= maxY
            );


        resultVillages =
            candidates.filter(
                village =>

                    pointInPolygon(

                        {
                            x:
                                village.x,

                            y:
                                village.y
                        },

                        polygon

                    )
            );


        resultVillages.sort(
            (a, b) =>

                a.y - b.y ||
                a.x - b.x
        );


        updateResults();


        status.innerHTML =

            `Granica ma <b>${polygon.length}</b> punktów. ` +
            `Znaleziono <b>${resultVillages.length.toLocaleString('pl-PL')}</b> wiosek.`;


        draw();

    }


    function scheduleCalculate() {

        clearTimeout(
            recalcTimer
        );


        if (
            !autoCount.checked
        ) {

            draw();

            return;

        }


        recalcTimer =
            setTimeout(
                calculate,
                120
            );

    }


    // ============================================================
    // RESULTS
    // ============================================================

    function updateResults() {

        const playerCount =
            resultVillages.filter(
                v =>
                    v.playerId !== 0
            ).length;


        const barbCount =
            resultVillages.length -
            playerCount;


        document
            .getElementById(
                'tti-total'
            )
            .textContent =
                resultVillages.length
                    .toLocaleString(
                        'pl-PL'
                    );


        document
            .getElementById(
                'tti-player'
            )
            .textContent =
                playerCount
                    .toLocaleString(
                        'pl-PL'
                    );


        document
            .getElementById(
                'tti-barb'
            )
            .textContent =
                barbCount
                    .toLocaleString(
                        'pl-PL'
                    );


        document
            .getElementById(
                'tti-result-list'
            )
            .value =

                resultVillages
                    .map(
                        village =>

                            `${village.x}|${village.y}`

                            +

                            ` | ${village.points}`

                            +

                            ` | ${
                                village.playerId === 0
                                    ? 'BARB'
                                    : 'GRACZ'
                            }`

                            +

                            ` | ${village.name}`
                    )
                    .join('\n');

    }


    // ============================================================
    // POINT LIST
    // ============================================================

    function updatePointList() {

        pointCount.textContent =
            polygon.length;


        pointList.innerHTML =
            '';


        polygon.forEach(
            (
                point,
                index
            ) => {

                const row =
                    document.createElement(
                        'div'
                    );


                row.className =
                    'tti-point-row';


                row.innerHTML = `

                    <span>
                        ${index + 1}.
                        ${point.x}|${point.y}
                    </span>

                    <span
                        class="tti-point-remove"
                        data-index="${index}">

                        ×

                    </span>

                `;


                row.addEventListener(
                    'mouseenter',
                    () => {

                        selectedPointIndex =
                            index;

                        draw();

                    }
                );


                row.addEventListener(
                    'mouseleave',
                    () => {

                        if (
                            !draggingPoint
                        ) {

                            selectedPointIndex =
                                -1;

                            draw();

                        }

                    }
                );


                pointList.appendChild(
                    row
                );

            }
        );


        pointList
            .querySelectorAll(
                '.tti-point-remove'
            )
            .forEach(
                element => {

                    element.addEventListener(
                        'click',
                        () => {

                            const index =
                                Number(
                                    element.dataset.index
                                );


                            polygon.splice(
                                index,
                                1
                            );


                            selectedPointIndex =
                                -1;


                            updatePointList();

                            scheduleCalculate();

                            draw();

                        }
                    );

                }
            );

    }


    // ============================================================
    // FIT MAP
    // ============================================================

    function fitPolygon() {

        if (
            polygon.length === 0
        ) {

            showWorld();

            return;

        }


        const minX =
            Math.min(
                ...polygon.map(
                    p => p.x
                )
            );


        const maxX =
            Math.max(
                ...polygon.map(
                    p => p.x
                )
            );


        const minY =
            Math.min(
                ...polygon.map(
                    p => p.y
                )
            );


        const maxY =
            Math.max(
                ...polygon.map(
                    p => p.y
                )
            );


        const {
            width,
            height
        } = mapDimensions();


        view.centerX =
            (
                minX +
                maxX
            ) / 2;


        view.centerY =
            (
                minY +
                maxY
            ) / 2;


        const rangeX =
            Math.max(
                20,
                maxX -
                minX
            );


        const rangeY =
            Math.max(
                20,
                maxY -
                minY
            );


        view.zoom =
            Math.min(

                view.maxZoom,

                Math.max(

                    view.minZoom,

                    Math.min(

                        width /
                        (
                            rangeX *
                            1.2
                        ),

                        height /
                        (
                            rangeY *
                            1.2
                        )

                    )

                )

            );


        draw();

    }


    function showWorld() {

        const {
            width,
            height
        } = mapDimensions();


        view.centerX =
            500;

        view.centerY =
            500;


        view.zoom =
            Math.max(

                view.minZoom,

                Math.min(

                    width / 1050,

                    height / 1050

                )

            );


        draw();

    }


    // ============================================================
    // IMPORT BORDERS
    // ============================================================

    function parseImportedBorder(
        text
    ) {

        const regex =
            /start\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\][\s\S]*?end\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/gi;


        const segments =
            [];


        let match;


        while (
            (
                match =
                regex.exec(text)
            ) !== null
        ) {

            segments.push({

                start: {

                    x:
                        Number(
                            match[1]
                        ),

                    y:
                        Number(
                            match[2]
                        )

                },

                end: {

                    x:
                        Number(
                            match[3]
                        ),

                    y:
                        Number(
                            match[4]
                        )

                }

            });

        }


        if (
            segments.length
        ) {

            return buildPolygonFromSegments(
                segments
            );

        }


        const coordinateRegex =
            /(\d{1,3})\s*\|\s*(\d{1,3})/g;


        const result =
            [];


        while (
            (
                match =
                coordinateRegex.exec(
                    text
                )
            ) !== null
        ) {

            result.push({

                x:
                    Number(
                        match[1]
                    ),

                y:
                    Number(
                        match[2]
                    )

            });

        }


        return result;

    }


    function samePoint(
        a,
        b
    ) {

        return (
            a.x === b.x &&
            a.y === b.y
        );

    }


    function buildPolygonFromSegments(
        segments
    ) {

        if (
            !segments.length
        ) {

            return [];

        }


        const remaining =
            segments.map(
                segment => ({

                    start:
                        {
                            ...segment.start
                        },

                    end:
                        {
                            ...segment.end
                        }

                })
            );


        const first =
            remaining.shift();


        const result = [

            {
                ...first.start
            },

            {
                ...first.end
            }

        ];


        while (
            remaining.length
        ) {

            const last =
                result[
                    result.length - 1
                ];


            let foundIndex =
                -1;

            let reverse =
                false;


            for (
                let i = 0;
                i <
                remaining.length;
                i++
            ) {

                if (
                    samePoint(
                        remaining[i].start,
                        last
                    )
                ) {

                    foundIndex =
                        i;

                    break;

                }


                if (
                    samePoint(
                        remaining[i].end,
                        last
                    )
                ) {

                    foundIndex =
                        i;

                    reverse =
                        true;

                    break;

                }

            }


            if (
                foundIndex === -1
            ) {

                /*
                 * Jeśli tekst jest już w poprawnej
                 * kolejności, dokładamy następny segment.
                 */

                const next =
                    remaining.shift();


                result.push({
                    ...next.start
                });


                result.push({
                    ...next.end
                });


                continue;

            }


            const found =
                remaining.splice(
                    foundIndex,
                    1
                )[0];


            result.push(

                reverse
                    ? {
                        ...found.start
                    }
                    : {
                        ...found.end
                    }

            );

        }


        /*
         * Usuwanie sąsiadujących duplikatów.
         */

        const cleaned =
            [];


        for (
            const point of result
        ) {

            if (

                !cleaned.length

                ||

                !samePoint(

                    cleaned[
                        cleaned.length - 1
                    ],

                    point

                )

            ) {

                cleaned.push(
                    point
                );

            }

        }


        /*
         * Jeśli ostatni = pierwszy,
         * nie potrzebujemy duplikatu.
         */

        if (

            cleaned.length > 2

            &&

            samePoint(

                cleaned[0],

                cleaned[
                    cleaned.length - 1
                ]

            )

        ) {

            cleaned.pop();

        }


        return cleaned;

    }


    // ============================================================
    // BUTTONS
    // ============================================================

    document
        .getElementById(
            'tti-count'
        )
        .addEventListener(
            'click',
            calculate
        );


    document
        .getElementById(
            'tti-fit'
        )
        .addEventListener(
            'click',
            fitPolygon
        );


    document
        .getElementById(
            'tti-world'
        )
        .addEventListener(
            'click',
            showWorld
        );


    document
        .getElementById(
            'tti-undo'
        )
        .addEventListener(
            'click',
            () => {

                polygon.pop();


                selectedPointIndex =
                    -1;


                updatePointList();

                scheduleCalculate();

                draw();

            }
        );


    document
        .getElementById(
            'tti-clear'
        )
        .addEventListener(
            'click',
            () => {

                polygon =
                    [];

                resultVillages =
                    [];

                selectedPointIndex =
                    -1;


                updatePointList();

                updateResults();

                draw();


                status.textContent =
                    'Granica została wyczyszczona.';

            }
        );


    document
        .getElementById(
            'tti-import-btn'
        )
        .addEventListener(
            'click',
            () => {

                const text =
                    document
                        .getElementById(
                            'tti-import'
                        )
                        .value;


                const imported =
                    parseImportedBorder(
                        text
                    );


                if (
                    imported.length < 2
                ) {

                    status.textContent =
                        'Nie znaleziono poprawnych punktów granicy.';

                    return;

                }


                polygon =
                    imported;


                selectedPointIndex =
                    -1;


                updatePointList();

                fitPolygon();

                scheduleCalculate();


                status.textContent =
                    `Wczytano ${polygon.length} punktów granicy.`;

            }
        );


    showOutside.addEventListener(
        'change',
        draw
    );


    autoCount.addEventListener(
        'change',
        () => {

            if (
                autoCount.checked
            ) {

                calculate();

            }

        }
    );


    // ============================================================
    // COPY
    // ============================================================

    document
        .getElementById(
            'tti-copy'
        )
        .addEventListener(
            'click',
            async () => {

                const text =
                    resultVillages
                        .map(
                            village =>

                                `${village.x}|${village.y}`
                        )
                        .join('\n');


                if (!text) {

                    return;

                }


                try {

                    await navigator.clipboard
                        .writeText(
                            text
                        );


                    status.textContent =
                        `Skopiowano ${resultVillages.length} kordów.`;

                } catch (_) {

                    const textarea =
                        document.createElement(
                            'textarea'
                        );


                    textarea.value =
                        text;


                    document.body
                        .appendChild(
                            textarea
                        );


                    textarea.select();


                    document.execCommand(
                        'copy'
                    );


                    textarea.remove();


                    status.textContent =
                        `Skopiowano ${resultVillages.length} kordów.`;

                }

            }
        );


    // ============================================================
    // DRAG PANEL
    // ============================================================

    const header =
        document.getElementById(
            'tti-map-header'
        );


    let panelDragging =
        false;

    let panelOffsetX =
        0;

    let panelOffsetY =
        0;


    header.addEventListener(
        'mousedown',
        event => {

            if (
                event.target.id ===
                'tti-map-close'
            ) {

                return;

            }


            panelDragging =
                true;


            const rect =
                panel.getBoundingClientRect();


            panelOffsetX =
                event.clientX -
                rect.left;


            panelOffsetY =
                event.clientY -
                rect.top;


            panel.style.transform =
                'none';


            panel.style.left =
                rect.left + 'px';


            panel.style.top =
                rect.top + 'px';


            event.preventDefault();

        }
    );


    document.addEventListener(
        'mousemove',
        event => {

            if (
                !panelDragging
            ) {

                return;

            }


            panel.style.left =
                Math.max(
                    0,
                    event.clientX -
                    panelOffsetX
                ) + 'px';


            panel.style.top =
                Math.max(
                    0,
                    event.clientY -
                    panelOffsetY
                ) + 'px';

        }
    );


    document.addEventListener(
        'mouseup',
        () => {

            panelDragging =
                false;

        }
    );


    // ============================================================
    // INIT
    // ============================================================

    updatePointList();

    updateResults();


    console.log(
        `[ToTylkoIluzja] Interactive Village Area Counter v${VERSION}`
    );

})();
