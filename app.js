const state = {
    scripts: [],
    category: 'Wszystkie',
    query: ''
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
// START
// ============================================================

async function init() {

    try {

        elements.status.textContent =
            'Ładowanie bazy...';


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


        state.scripts =
            await response.json();


        renderCategories();

        renderScripts();


        elements.status.textContent =
            'Baza online';

    } catch (error) {

        console.error(
            '[TTI SCRIPT HUB]',
            error
        );


        elements.status.textContent =
            'Błąd wczytywania bazy';


        elements.list.innerHTML = `

            <div class="empty">

                Nie udało się wczytać pliku

                <b>
                    data/scripts.json
                </b>

            </div>

        `;

    }

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
// FILTROWANIE
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
// RENDEROWANIE SKRYPTÓW
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
// KARTA SKRYPTU
// ============================================================

function createScriptCard(
    script
) {

    const card =
        document.createElement(
            'article'
        );


    card.className =
        'card';


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


    const meta =
        document.createElement(
            'div'
        );


    meta.className =
        'meta';


    meta.textContent =
        `Aktualizacja: ${script.updated}`;


    const actions =
        document.createElement(
            'div'
        );


    actions.className =
        'actions';


    // ========================================================
    // INSTALUJ
    // ========================================================

    const installButton =
        document.createElement(
            'a'
        );


    installButton.className =
        'btn';


    installButton.textContent =
        'Instaluj';


    installButton.href =
        script.file;


    installButton.target =
        '_blank';


    installButton.rel =
        'noopener noreferrer';


    // ========================================================
    // KOD
    // ========================================================

    const codeButton =
        document.createElement(
            'a'
        );


    codeButton.className =
        'btn code';


    codeButton.textContent =
        'Kod';


    codeButton.href =
        script.file;


    codeButton.target =
        '_blank';


    codeButton.rel =
        'noopener noreferrer';


    actions.append(
        installButton,
        codeButton
    );


    card.append(

        top,

        title,

        description,

        meta,

        actions

    );


    return card;

}


// ============================================================
// WYSZUKIWARKA
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
