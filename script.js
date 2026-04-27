// === Configurazione ===
const MONTHS_TO_LOAD = 12;            // quanti mesi passati cercare
const DATA_FOLDER = 'data/';

// === Elementi DOM ===
const navButtons = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('.section');
const currentMonthTitle = document.getElementById('current-month-title');
const currentResourcesContainer = document.getElementById('current-resources');
const archiveListContainer = document.getElementById('archive-list');

// === Stato globale ===
let allMonths = [];                  // array di { month (display), items }
let currentMonthIndex = 0;          // indice dell’elemento più recente

// === Parser Markdown per un singolo mese ===
function parseMonthMarkdown(mdText, fallbackMonthName) {
    const lines = mdText.split('\n');
    const items = [];
    let displayMonth = fallbackMonthName;

    for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') continue;

        // Cattura il titolo del mese (primo heading di livello 1)
        if (trimmed.startsWith('# ') && !displayMonth) {
            displayMonth = trimmed.slice(2).trim();
            continue;
        }

        // Formato: "- Tipo: Titolo (meta) [Link text](url)"
        const match = trimmed.match(/^-\s*([^:]+):\s*(.+?)\s*\(([^)]*)\)(?:\s*\[(.+?)\]\((.+?)\))?\s*$/);
        if (match) {
            const type = match[1].trim();
            const title = match[2].trim();
            const meta = match[3] ? match[3].trim() : '';
            const linkText = match[4] ? match[4].trim() : null;
            const linkUrl = match[5] ? match[5].trim() : null;

            items.push({
                type: type,
                title: title,
                meta: meta,
                link: linkUrl || '#',
                linkText: linkText || '🔗'
            });
        }
    }

    // Se non c'era un heading, usa il nome di fallback
    return { month: displayMonth || fallbackMonthName, items };
}

// === Genera le date degli ultimi MONTHS_TO_LOAD mesi ===
function generateMonthKeys() {
    const now = new Date();
    const months = [];
    for (let i = 0; i < MONTHS_TO_LOAD; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        months.push({ year, month });
    }
    return months;
}

// === Carica tutti i mesi esistenti ===
async function loadAllData() {
    const monthKeys = generateMonthKeys();
    const fetchPromises = monthKeys.map(async ({ year, month }) => {
        const filename = `${DATA_FOLDER}${year}-${month}.md`;
        const fallbackName = `${year}-${month}`;
        try {
            const response = await fetch(filename);
            if (!response.ok) return null;
            const mdText = await response.text();
            return parseMonthMarkdown(mdText, fallbackName);
        } catch {
            return null;
        }
    });

    const results = await Promise.all(fetchPromises);
    // Filtra i mesi caricati con successo e che contengono almeno una risorsa
    const validMonths = results.filter(m => m !== null && m.items.length > 0);

    if (validMonths.length === 0) {
        currentResourcesContainer.innerHTML = '<p>Nessun mese trovato. Aggiungi file <code>YYYY-MM.md</code> nella cartella <code>data/</code>.</p>';
        return false;
    }

    // L'ordine di generazione è già dal più recente al più vecchio
    allMonths = validMonths;
    currentMonthIndex = 0;  // il primo è il più recente
    return true;
}

// === Renderizza mese corrente ===
function renderCurrentMonth() {
    if (allMonths.length === 0) return;
    const current = allMonths[currentMonthIndex];
    currentMonthTitle.textContent = current.month;
    currentResourcesContainer.innerHTML = current.items.map(item => `
        <div class="resource-card">
            <span class="resource-type">${item.type}</span>
            <div class="resource-title">
                <a href="${item.link}" class="resource-link" target="_blank" rel="noopener">${item.title}</a>
            </div>
            <div class="resource-meta">${item.meta}</div>
        </div>
    `).join('');
}

// === Renderizza archivio (tutti i mesi tranne quello corrente) ===
function renderArchive() {
    const archiveMonths = allMonths.filter((_, idx) => idx !== currentMonthIndex);
    if (archiveMonths.length === 0) {
        archiveListContainer.innerHTML = '<p>Nessun mese passato disponibile.</p>';
        return;
    }

    archiveListContainer.innerHTML = archiveMonths.map((monthData, index) => {
        const monthId = `archive-month-${index}`;
        return `
            <div class="month-group">
                <div class="month-header" data-target="${monthId}">
                    <span>📅 ${monthData.month}</span>
                    <span class="arrow">▼</span>
                </div>
                <div id="${monthId}" class="month-resources">
                    ${monthData.items.map(item => `
                        <div class="resource-card">
                            <span class="resource-type">${item.type}</span>
                            <div class="resource-title">
                                <a href="${item.link}" class="resource-link" target="_blank" rel="noopener">${item.title}</a>
                            </div>
                            <div class="resource-meta">${item.meta}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Toggle dei mesi in archivio
    document.querySelectorAll('.month-header').forEach(header => {
        header.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const resourcesDiv = document.getElementById(targetId);
            this.classList.toggle('open');
            resourcesDiv.classList.toggle('open');
        });
    });
}

// === Navigazione tra sezioni ===
function switchSection(sectionId) {
    sections.forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });
}

// === Inizializzazione ===
async function init() {
    const success = await loadAllData();
    if (success) {
        renderCurrentMonth();
        renderArchive();
    }
    switchSection('this-month');
}

// Event listener navigazione
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const sectionId = btn.dataset.section;
        switchSection(sectionId);
    });
});

init();