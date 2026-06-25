import fs from "node:fs";

const csvPath = "C:\\Chess books\\Organized PDFs\\chapter_catalog.csv";
const outputPath = process.argv[2] || "C:\\Chess books\\Organized PDFs\\chapter_catalog_dashboard.html";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) => {
    const entry = {};
    headers.forEach((header, idx) => {
      entry[header] = values[idx] ?? "";
    });
    return entry;
  });
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const metadata = {
  levels: uniqueValues(rows, "level"),
  skills: uniqueValues(rows, "skill"),
  authors: uniqueValues(rows, "author"),
  titles: uniqueValues(rows, "title"),
  weaknesses: uniqueValues(rows, "what_weakness_it_solves"),
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chapter Catalog Dashboard</title>
  <style>
    :root {
      --bg: #f4efe6;
      --panel: #fffaf2;
      --panel-strong: #fffdf8;
      --ink: #1c1a18;
      --muted: #665d52;
      --line: #d9c9b4;
      --accent: #8e4b22;
      --accent-soft: #f2d8c4;
      --accent-deep: #4b2a16;
      --shadow: 0 20px 50px rgba(73, 43, 18, 0.12);
      --radius: 18px;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(222, 181, 142, 0.22), transparent 26%),
        radial-gradient(circle at top right, rgba(159, 93, 43, 0.12), transparent 22%),
        linear-gradient(180deg, #f8f3eb 0%, var(--bg) 100%);
      min-height: 100vh;
    }

    .shell {
      width: min(1480px, calc(100vw - 32px));
      margin: 24px auto 40px;
    }

    .hero {
      background: linear-gradient(135deg, rgba(255,253,248,0.98), rgba(246,233,219,0.95));
      border: 1px solid rgba(139, 93, 55, 0.18);
      box-shadow: var(--shadow);
      border-radius: 28px;
      padding: 28px 28px 24px;
      position: relative;
      overflow: hidden;
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: auto -40px -60px auto;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(142, 75, 34, 0.16), transparent 68%);
      pointer-events: none;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 3vw, 3.4rem);
      line-height: 0.95;
      color: var(--accent-deep);
      letter-spacing: -0.03em;
    }

    .subhead {
      max-width: 860px;
      font-size: 1rem;
      line-height: 1.55;
      color: var(--muted);
      margin: 0;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-top: 22px;
    }

    .stat {
      background: rgba(255, 253, 248, 0.88);
      border: 1px solid rgba(139, 93, 55, 0.15);
      border-radius: 16px;
      padding: 16px 18px;
    }

    .stat-label {
      display: block;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
      margin-bottom: 10px;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      line-height: 1;
      color: var(--accent-deep);
    }

    .layout {
      display: grid;
      grid-template-columns: 330px minmax(0, 1fr);
      gap: 18px;
      margin-top: 18px;
      align-items: start;
    }

    .filters-dock {
      position: sticky;
      top: 18px;
      align-self: start;
      z-index: 3;
    }

    .filter-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
      min-width: 130px;
    }

    .panel {
      background: var(--panel);
      border: 1px solid rgba(139, 93, 55, 0.15);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }

    .filters {
      padding: 18px;
      position: sticky;
      top: 18px;
      width: 330px;
      transition: opacity 180ms ease, transform 180ms ease;
    }

    .filters h2, .results h2 {
      margin: 0 0 14px;
      font-size: 1.1rem;
      color: var(--accent-deep);
    }

    .field {
      margin-bottom: 14px;
    }

    .field label {
      display: block;
      font-size: 0.82rem;
      margin-bottom: 7px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .field input,
    .field select {
      width: 100%;
      border: 1px solid var(--line);
      background: var(--panel-strong);
      border-radius: 12px;
      padding: 11px 12px;
      color: var(--ink);
      font: inherit;
    }

    .field input:focus,
    .field select:focus {
      outline: 2px solid rgba(142, 75, 34, 0.18);
      border-color: var(--accent);
    }

    .actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
    }

    button {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      cursor: pointer;
      font: inherit;
      transition: transform 140ms ease, opacity 140ms ease, background 140ms ease;
    }

    button:hover { transform: translateY(-1px); }
    .primary {
      background: var(--accent);
      color: #fff7ef;
    }
    .ghost {
      background: var(--accent-soft);
      color: var(--accent-deep);
    }

    .results {
      padding: 18px;
      min-width: 0;
    }

    .studio {
      margin-bottom: 16px;
      padding: 16px;
      border: 1px solid rgba(139, 93, 55, 0.14);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(255,253,248,0.96), rgba(245,233,219,0.9));
    }

    .studio-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
      gap: 16px;
      align-items: start;
    }

    .studio-note {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .studio-warning {
      margin-top: 12px;
      padding: 12px 14px;
      border-radius: 12px;
      background: #f8e8da;
      border: 1px solid rgba(142, 75, 34, 0.18);
      color: var(--accent-deep);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.76rem;
      background: rgba(75, 42, 22, 0.08);
      color: var(--accent-deep);
      vertical-align: middle;
    }

    .status-chip.is-live {
      background: #dcefdc;
      color: #1d5b2b;
    }

    .status-chip.is-offline {
      background: #f6ddd7;
      color: #8c2f1d;
    }

    .studio-card {
      border: 1px solid rgba(139, 93, 55, 0.14);
      background: rgba(255, 252, 246, 0.88);
      border-radius: 14px;
      padding: 14px;
    }

    .studio-kicker {
      display: block;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.76rem;
      margin-bottom: 8px;
    }

    .studio-title {
      margin: 0 0 6px;
      font-size: 1.05rem;
      color: var(--accent-deep);
    }

    .studio-meta {
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
    }

    .studio-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 12px;
    }

    .studio-fields .field {
      margin-bottom: 0;
    }

    .studio-output {
      width: 100%;
      min-height: 290px;
      resize: vertical;
      border: 1px solid var(--line);
      background: #fffdf9;
      border-radius: 14px;
      padding: 14px;
      color: var(--ink);
      font: 0.95rem/1.55 "Consolas", "Cascadia Code", "Courier New", monospace;
    }

    .studio-quick-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .row-actions {
      min-width: 180px;
    }

    .tiny-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .tiny {
      padding: 8px 11px;
      font-size: 0.82rem;
      background: var(--accent-soft);
      color: var(--accent-deep);
    }

    .pick {
      background: var(--accent);
      color: #fff7ef;
    }

    .results-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }

    .meta {
      color: var(--muted);
      font-size: 0.95rem;
    }

    .table-shell {
      border: 1px solid rgba(139, 93, 55, 0.14);
      border-radius: 16px;
      overflow-x: auto;
      overflow-y: auto;
      scrollbar-gutter: stable both-edges;
      max-width: 100%;
      background: var(--panel-strong);
    }

    .table-scroll-hint {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 0.9rem;
    }

    table {
      width: max-content;
      min-width: 1480px;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      background: #f4e5d6;
      color: var(--accent-deep);
      padding: 13px 14px;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      border-bottom: 1px solid rgba(139, 93, 55, 0.18);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    tbody td {
      vertical-align: top;
      padding: 14px;
      border-bottom: 1px solid rgba(139, 93, 55, 0.1);
      font-size: 0.95rem;
      line-height: 1.45;
    }

    tbody tr:hover {
      background: rgba(250, 241, 231, 0.72);
    }

    tbody tr.is-selected {
      background: linear-gradient(90deg, rgba(242, 216, 196, 0.94), rgba(255, 249, 242, 0.98));
      box-shadow: inset 5px 0 0 var(--accent);
    }

    tbody tr.select-row {
      cursor: pointer;
    }

    .book {
      min-width: 280px;
    }

    thead th:nth-child(2),
    tbody td:nth-child(2) {
      min-width: 260px;
    }

    thead th:nth-child(3),
    tbody td:nth-child(3) {
      min-width: 260px;
    }

    thead th:nth-child(4),
    tbody td:nth-child(4) {
      min-width: 280px;
    }

    thead th:nth-child(5),
    tbody td:nth-child(5) {
      min-width: 220px;
    }

    thead th:nth-child(6),
    tbody td:nth-child(6) {
      min-width: 140px;
    }

    .book-title {
      display: block;
      font-weight: 700;
      margin-bottom: 4px;
      color: var(--accent-deep);
    }

    .book-meta {
      display: block;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .book-summary,
    .cell-detail {
      display: block;
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.88rem;
      line-height: 1.45;
    }

    .cell-title {
      display: block;
      font-weight: 700;
      color: var(--accent-deep);
      margin-bottom: 4px;
    }

    .cell-subtitle {
      display: block;
      color: var(--muted);
      font-size: 0.84rem;
      margin-bottom: 8px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--accent-soft);
      color: var(--accent-deep);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.78rem;
      margin: 0 6px 6px 0;
      white-space: nowrap;
    }

    .empty {
      display: none;
      padding: 26px;
      text-align: center;
      color: var(--muted);
    }

    body.filters-collapsed .layout {
      grid-template-columns: 60px minmax(0, 1fr);
    }

    body.filters-collapsed .filters {
      opacity: 0;
      pointer-events: none;
      transform: translateX(-22px);
    }

    body.filters-collapsed .filters-dock {
      width: 60px;
    }

    body.filters-collapsed .filter-toggle {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      min-width: auto;
      min-height: 140px;
      margin-bottom: 0;
    }

    @media (max-width: 1100px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .filters-dock {
        position: static;
      }
      .filters {
        position: static;
        width: auto;
        opacity: 1;
        pointer-events: auto;
        transform: none;
      }
      body.filters-collapsed .layout {
        grid-template-columns: 1fr;
      }
      body.filters-collapsed .filter-toggle {
        writing-mode: horizontal-tb;
        transform: none;
        min-height: auto;
      }
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .studio-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 700px) {
      .shell {
        width: min(100vw - 18px, 1480px);
        margin-top: 10px;
      }
      .hero,
      .filters,
      .results {
        padding: 16px;
      }
      .filter-toggle {
        width: 100%;
        margin-bottom: 12px;
      }
      .stats {
        grid-template-columns: 1fr;
      }
      table, thead, tbody, th, td, tr {
        display: block;
      }
      thead {
        display: none;
      }
      .table-shell {
        border: none;
        background: transparent;
      }
      tbody tr {
        display: grid;
        gap: 10px;
        margin-bottom: 12px;
        padding: 14px;
        background: var(--panel-strong);
        border: 1px solid rgba(139, 93, 55, 0.14);
        border-radius: 16px;
      }
      tbody td {
        border: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <h1>Chess Chapter Catalog Dashboard</h1>
      <p class="subhead">Browse the project’s book and chapter catalog by level, author, skill, motif, or weakness. This view is built from the current chapter CSV and includes teaching focus plus the main weakness each chapter is meant to repair.</p>
      <div class="stats">
        <div class="stat">
          <span class="stat-label">Visible Rows</span>
          <span class="stat-value" id="visibleRows">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Visible Books</span>
          <span class="stat-value" id="visibleBooks">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Visible Authors</span>
          <span class="stat-value" id="visibleAuthors">0</span>
        </div>
        <div class="stat">
          <span class="stat-label">Total Rows</span>
          <span class="stat-value">${rows.length}</span>
        </div>
      </div>
    </section>

    <section class="layout">
      <div class="filters-dock">
        <button class="ghost filter-toggle" id="filterToggle" type="button" aria-expanded="true">Hide Filters</button>
        <aside class="panel filters" id="filtersPanel">
          <h2>Filters</h2>
          <div class="field">
            <label for="searchBox">Search</label>
            <input id="searchBox" type="text" placeholder="Book, chapter, motif, weakness...">
          </div>
          <div class="field">
            <label for="levelFilter">Level</label>
            <select id="levelFilter">
              <option value="">All levels</option>
              ${metadata.levels.map((value) => `<option value="${htmlEscape(value)}">${htmlEscape(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="skillFilter">Skill</label>
            <select id="skillFilter">
              <option value="">All skills</option>
              ${metadata.skills.map((value) => `<option value="${htmlEscape(value)}">${htmlEscape(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="authorFilter">Author</label>
            <select id="authorFilter">
              <option value="">All authors</option>
              ${metadata.authors.map((value) => `<option value="${htmlEscape(value)}">${htmlEscape(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="titleFilter">Book</label>
            <select id="titleFilter">
              <option value="">All books</option>
              ${metadata.titles.map((value) => `<option value="${htmlEscape(value)}">${htmlEscape(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="weaknessFilter">Weakness Solved</label>
            <select id="weaknessFilter">
              <option value="">All weakness types</option>
              ${metadata.weaknesses.map((value) => `<option value="${htmlEscape(value)}">${htmlEscape(value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="outlineFilter">Entry Type</label>
            <select id="outlineFilter">
              <option value="">All entries</option>
              <option value="chapter">Chapter rows only</option>
              <option value="overview">Whole-book overview only</option>
            </select>
          </div>
          <div class="actions">
            <button class="ghost" id="resetFilters" type="button">Reset</button>
            <button class="primary" id="copySummary" type="button">Copy Summary</button>
          </div>
        </aside>
      </div>

      <main class="panel results">
        <div class="results-toolbar">
          <h2>Catalog Rows</h2>
          <div class="meta" id="resultsMeta"></div>
        </div>
        <section class="studio" aria-label="Extraction Studio">
          <div class="studio-grid">
            <div class="studio-card">
              <span class="studio-kicker">Selected Chapter</span>
              <h3 class="studio-title" id="studioTitle">Choose a chapter row</h3>
              <p class="studio-meta" id="studioMeta">Use the action buttons in the table to load a chapter into the extraction workspace.</p>
              <div class="studio-fields">
                <div class="field">
                  <label for="extractMode">Extraction Type</label>
                  <select id="extractMode">
                    <option value="fen">FEN only</option>
                    <option value="pgn">PGN only</option>
                    <option value="both">FEN and PGN</option>
                  </select>
                </div>
                <div class="field">
                  <label for="extractDepth">Output Depth</label>
                  <select id="extractDepth">
                    <option value="chapter">Selected chapter only</option>
                    <option value="strict">Strict chapter diagrams only</option>
                    <option value="annotated">Include annotations if present</option>
                  </select>
                </div>
              </div>
              <div class="studio-quick-actions">
                <button class="ghost" id="modeFen" type="button">Use FEN</button>
                <button class="ghost" id="modePgn" type="button">Use PGN</button>
                <button class="ghost" id="modeBoth" type="button">Use Both</button>
              </div>
              <p class="studio-note">This panel builds chapter extraction output around the selected source PDF and chapter.</p>
              <p class="studio-note"><strong>Tip:</strong> click anywhere on a row below to load that chapter here. The selected row stays highlighted.</p>
              <div class="studio-warning"><strong>Safe extraction:</strong> the page can now ask the local extractor service for <code>Games + FEN JSON</code> and <code>FENs as PGN</code>. If it is not running yet, start <code>C:\\Chess books\\start_chapter_extractor.bat</code> once, then try again.</div>
            </div>
            <div class="studio-card">
              <span class="studio-kicker">Extraction Workspace</span>
              <textarea id="markdownOutput" class="studio-output" spellcheck="false"></textarea>
              <div class="actions">
                <button class="ghost" id="copyMarkdown" type="button">Copy Markdown</button>
                <button class="ghost" id="downloadGamesFens" type="button">Download Games + FEN JSON</button>
                <button class="ghost" id="downloadFenPgn" type="button">Download FENs as PGN</button>
                <button class="ghost" id="downloadFen" type="button">Download FEN Request</button>
                <button class="primary" id="downloadMarkdown" type="button">Download Request</button>
              </div>
            </div>
          </div>
        </section>
        <div class="table-shell">
          <p class="table-scroll-hint">Scroll left or right to see all chapter columns and the action buttons.</p>
          <table>
            <thead>
              <tr>
                <th>Book</th>
                <th>Chapter</th>
                <th>Teaches</th>
                <th>Weakness Solved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="resultsBody"></tbody>
          </table>
          <div class="empty" id="emptyState">No rows match the current filters.</div>
        </div>
      </main>
    </section>
  </div>

  <script>
    const rows = ${JSON.stringify(rows)};

    const searchBox = document.getElementById("searchBox");
    const levelFilter = document.getElementById("levelFilter");
    const skillFilter = document.getElementById("skillFilter");
    const authorFilter = document.getElementById("authorFilter");
    const titleFilter = document.getElementById("titleFilter");
    const weaknessFilter = document.getElementById("weaknessFilter");
    const outlineFilter = document.getElementById("outlineFilter");
    const resultsBody = document.getElementById("resultsBody");
    const emptyState = document.getElementById("emptyState");
    const resultsMeta = document.getElementById("resultsMeta");
    const visibleRows = document.getElementById("visibleRows");
    const visibleBooks = document.getElementById("visibleBooks");
    const visibleAuthors = document.getElementById("visibleAuthors");
    const extractMode = document.getElementById("extractMode");
    const extractDepth = document.getElementById("extractDepth");
    const markdownOutput = document.getElementById("markdownOutput");
    const studioTitle = document.getElementById("studioTitle");
    const studioMeta = document.getElementById("studioMeta");
    const downloadButton = document.getElementById("downloadMarkdown");
    const downloadGamesFensButton = document.getElementById("downloadGamesFens");
    const downloadFenPgnButton = document.getElementById("downloadFenPgn");
    const downloadFenButton = document.getElementById("downloadFen");
    const filterToggle = document.getElementById("filterToggle");
    let selectedRowKey = "";

    const controls = [searchBox, levelFilter, skillFilter, authorFilter, titleFilter, weaknessFilter, outlineFilter];
    for (const control of controls) {
      control.addEventListener("input", render);
      control.addEventListener("change", render);
    }

    extractMode.addEventListener("change", updateStudio);
    extractDepth.addEventListener("change", updateStudio);

    document.getElementById("modeFen").addEventListener("click", () => {
      extractMode.value = "fen";
      updateStudio();
    });
    document.getElementById("modePgn").addEventListener("click", () => {
      extractMode.value = "pgn";
      updateStudio();
    });
    document.getElementById("modeBoth").addEventListener("click", () => {
      extractMode.value = "both";
      updateStudio();
    });

    filterToggle.addEventListener("click", () => {
      const collapsed = document.body.classList.toggle("filters-collapsed");
      filterToggle.textContent = collapsed ? "Show Filters" : "Hide Filters";
      filterToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });

    document.getElementById("resetFilters").addEventListener("click", () => {
      searchBox.value = "";
      levelFilter.value = "";
      skillFilter.value = "";
      authorFilter.value = "";
      titleFilter.value = "";
      weaknessFilter.value = "";
      outlineFilter.value = "";
      render();
    });

    document.getElementById("copySummary").addEventListener("click", async () => {
      const filtered = getFilteredRows();
      const summary = [
        \`Rows: \${filtered.length}\`,
        \`Books: \${new Set(filtered.map((row) => row.title)).size}\`,
        \`Authors: \${new Set(filtered.map((row) => row.author)).size}\`,
        \`Levels: \${[...new Set(filtered.map((row) => row.level))].join(", ")}\`
      ].join(" | ");
      try {
        await navigator.clipboard.writeText(summary);
        resultsMeta.textContent = summary + " copied to clipboard.";
      } catch {
        resultsMeta.textContent = summary;
      }
    });

    document.getElementById("copyMarkdown").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(markdownOutput.value);
        resultsMeta.textContent = "Extraction output copied to clipboard.";
      } catch {
        resultsMeta.textContent = "Copy failed in this browser session.";
      }
    });

    function downloadOutput(modeOverride) {
      const row = getSelectedRow();
      const mode = modeOverride || extractMode.value;
      const slug = row ? slugify(row.title + "-" + row.chapter + "-" + mode) : "chapter-extraction-request";
      const exportSpec = getExportSpec(mode);
      const content = modeOverride ? buildOutput(row, modeOverride) : markdownOutput.value;
      const blob = new Blob([content], { type: exportSpec.mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = slug + exportSpec.extension;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    async function downloadFromExtractor(endpoint, extension, mimeType, statusText) {
      const row = getSelectedRow();
      if (!row) {
        resultsMeta.textContent = "Select a chapter row first.";
        return;
      }

      const url = new URL("http://127.0.0.1:3211" + endpoint);
      url.searchParams.set("pdfPath", row.file_path);
      url.searchParams.set("chapter", row.chapter);
      url.searchParams.set("title", row.title);

      resultsMeta.textContent = statusText;
      const response = await fetch(url.toString());
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Local extractor service did not respond successfully.");
      }

      const body = await response.text();
      const blob = new Blob([body], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = slugify(row.title + "-" + row.chapter) + extension;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    }

    async function downloadGamesFensJson() {
      try {
        await downloadFromExtractor("/api/extract-games-fens", "-games-fens.json", "application/json;charset=utf-8", "Building games + FEN JSON...");
        resultsMeta.textContent = "Games + FEN JSON downloaded.";
      } catch (error) {
        resultsMeta.textContent = (error && error.message) ? error.message : "Games + FEN JSON download failed.";
      }
    }

    async function downloadFenPgn() {
      try {
        await downloadFromExtractor("/api/extract-fen-pgn", "-fens.pgn", "application/x-chess-pgn;charset=utf-8", "Building FENs as PGN...");
        resultsMeta.textContent = "FENs as PGN downloaded.";
      } catch (error) {
        resultsMeta.textContent = (error && error.message) ? error.message : "FENs as PGN download failed.";
      }
    }

    document.getElementById("downloadMarkdown").addEventListener("click", () => downloadOutput());
    downloadGamesFensButton.addEventListener("click", () => downloadGamesFensJson());
    downloadFenPgnButton.addEventListener("click", () => downloadFenPgn());
    downloadFenButton.addEventListener("click", () => downloadOutput("fen"));

    function includesText(row, term) {
      const haystack = [
        row.title,
        row.author,
        row.level,
        row.skill,
        row.chapter,
        row.chapter_theme,
        row.what_this_chapter_teaches,
        row.what_weakness_it_solves,
        row.book_theme,
        row.file_path
      ].join(" ").toLowerCase();
      return haystack.includes(term);
    }

    function getFilteredRows() {
      const search = searchBox.value.trim().toLowerCase();
      return rows.filter((row) => {
        if (search && !includesText(row, search)) return false;
        if (levelFilter.value && row.level !== levelFilter.value) return false;
        if (skillFilter.value && row.skill !== skillFilter.value) return false;
        if (authorFilter.value && row.author !== authorFilter.value) return false;
        if (titleFilter.value && row.title !== titleFilter.value) return false;
        if (weaknessFilter.value && row.what_weakness_it_solves !== weaknessFilter.value) return false;
        if (outlineFilter.value === "chapter" && row.chapter === "Whole Book Overview") return false;
        if (outlineFilter.value === "overview" && row.chapter !== "Whole Book Overview") return false;
        return true;
      });
    }

    function rowKey(row) {
      return [row.file_path, row.chapter, row.title].join("::");
    }

    function getSelectedRow() {
      if (!selectedRowKey) return null;
      return rows.find((row) => rowKey(row) === selectedRowKey) || null;
    }

    function getExportSpec(mode = extractMode.value) {
      if (mode === "pgn") {
        return { extension: ".pgn", mime: "application/x-chess-pgn;charset=utf-8", label: "Download PGN Request" };
      }
      if (mode === "fen") {
        return { extension: ".txt", mime: "text/plain;charset=utf-8", label: "Download FEN Request" };
      }
      return { extension: ".md", mime: "text/markdown;charset=utf-8", label: "Download Request" };
    }

    function buildOutput(row, mode = extractMode.value) {
      if (!row) {
        return [
          "# Chapter Extraction Request",
          "",
          "Select a chapter row from the dashboard to generate a ready-to-use extraction brief.",
        ].join("\\n");
      }

      const modeText = mode === "fen"
        ? "Extract all chapter positions as FEN."
        : mode === "pgn"
          ? "Extract the chapter examples and games as PGN."
          : "Extract both FEN positions and PGN game/example output for the chapter.";

      const depthText = extractDepth.value === "strict"
        ? "Use only positions that clearly belong to this chapter and prefer visible diagram positions."
        : extractDepth.value === "annotated"
          ? "Preserve available annotations, comments, and chapter context wherever practical."
          : "Focus on the selected chapter and include the main examples, diagrams, and games tied to it.";

      const markdownBaseName = slugify(row.title + "-" + row.chapter);
      const markdownPath = "C:\\\\Chess books\\\\tmp\\\\" + markdownBaseName + ".md";
      const chapterLocator = row.chapter === "Whole Book Overview"
        ? "Use the whole book rather than a single chapter."
        : 'Locate the chapter heading "' + row.chapter.replace(/"/g, "'") + '" inside the converted markdown and extract only the positions, examples, and games that belong to that chapter.';
      const contextHints = [
        row.chapter_theme ? "- Chapter theme hint: " + row.chapter_theme : "",
        row.what_this_chapter_teaches ? "- Teaching hint: " + row.what_this_chapter_teaches : "",
        row.what_weakness_it_solves ? "- Weakness hint: " + row.what_weakness_it_solves : "",
      ].filter(Boolean);

      if (mode === "pgn") {
        return [
          "# PGN Extraction Request",
          "",
          "## Source Book",
          "- PDF: " + row.file_path,
          "- Markdown target: " + markdownPath,
          "- Book: " + row.title,
          "- Author: " + row.author,
          "- Chapter: " + row.chapter,
          "",
          "## Convert First",
          "~~~powershell",
          "cd 'C:\\\\Chess books\\\\markitdown-main'",
          "pip install -e 'packages/markitdown[pdf]'",
          "markitdown '" + row.file_path + "' -o '" + markdownPath + "'",
          "~~~",
          "",
          "## Extraction Task",
          "- Work from the source PDF above after converting it to markdown.",
          "- " + chapterLocator,
          "- " + modeText,
          "- " + depthText,
          "- Return clean ChessBase-friendly PGN only.",
          "- Include complete games where the chapter presents a full game.",
          "- Include chapter examples as PGN fragments only when they are not full games.",
          "- Keep moves in movetext, not as prose comments unless the book itself provides important annotations.",
          "- If a line is only an alternative variation, keep it as a variation inside the PGN rather than as plain text.",
          "",
          "## Chapter Hints",
          ...contextHints,
          "",
          "## Output Rules",
          "- Do not paraphrase the catalog summary as the extraction result.",
          "- Extract from the actual source book content.",
          "- If the chapter boundaries are unclear in OCR, note the uncertainty briefly at the end."
        ].join("\\n");
      }

      if (mode === "fen") {
        return [
          "Chapter FEN Extraction Request",
          "============================",
          "",
          "PDF: " + row.file_path,
          "Markdown target: " + markdownPath,
          "Book: " + row.title,
          "Chapter: " + row.chapter,
          "Author: " + row.author,
          "",
          "MarkItDown commands:",
          "cd 'C:\\\\Chess books\\\\markitdown-main'",
          "pip install -e 'packages/markitdown[pdf]'",
          "markitdown '" + row.file_path + "' -o '" + markdownPath + "'",
          "",
          "Request:",
          "- Work from the source PDF above after converting it to markdown.",
          "- " + chapterLocator,
          "- " + modeText,
          "- " + depthText,
          "- Extract visible diagram positions and return numbered FEN entries.",
          "- Do not return the chapter summary text as output.",
          ...contextHints,
        ].join("\\n");
      }

      return [
        "# " + row.title + " - " + row.chapter,
        "",
        "## MarkItDown Conversion",
        "- Repo: C:\\\\Chess books\\\\markitdown-main",
        "- Convert this PDF to markdown before extracting chapter-specific FEN or PGN data.",
        "- Suggested commands:",
        "~~~powershell",
        "cd 'C:\\\\Chess books\\\\markitdown-main'",
        "pip install -e 'packages/markitdown[pdf]'",
        "markitdown '" + row.file_path + "' -o '" + markdownPath + "'",
        "~~~",
        "",
        "## Source",
        "- PDF: " + row.file_path,
        "- Markdown target: " + markdownPath,
        "- Book: " + row.title,
        "- Author: " + row.author,
        "- Level: " + row.level,
        "- Skill: " + row.skill,
        "- Chapter: " + row.chapter,
        "",
        "## Request",
        "- Work from the source PDF above after converting it to markdown.",
        "- " + chapterLocator,
        "- " + modeText,
        "- " + depthText,
        "- Extract from the actual chapter content, not from the catalog summary fields.",
        "",
        "## Chapter Hints",
        ...contextHints,
        "",
        "## Preferred Output",
        "- Extraction mode: " + mode.toUpperCase(),
        mode !== "pgn" ? "- Save FEN output in a clean text or markdown list with numbering." : "-",
        mode !== "fen" ? "- Save PGN output in ChessBase-friendly format where possible." : "-",
        "- Note any uncertain positions or OCR limitations briefly.",
      ].filter((line) => line !== "-").join("\\n");
    }

    function updateStudio() {
      const row = getSelectedRow();
      if (!row) {
        studioTitle.textContent = "Choose a chapter row";
        studioMeta.textContent = "Use the action buttons in the table to load a chapter into the extraction workspace.";
      } else {
        studioTitle.textContent = row.title + " - " + row.chapter;
        studioMeta.textContent = row.author + " | " + row.level + " | " + row.skill;
      }
      markdownOutput.value = buildOutput(row);
      downloadButton.textContent = getExportSpec().label;
    }

    function selectRow(key) {
      selectedRowKey = key;
      updateStudio();
      render();
    }

    function slugify(text) {
      return String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "chapter-extraction-request";
    }

    function render() {
      const filtered = getFilteredRows();
      visibleRows.textContent = filtered.length.toLocaleString();
      visibleBooks.textContent = new Set(filtered.map((row) => row.title)).size.toLocaleString();
      visibleAuthors.textContent = new Set(filtered.map((row) => row.author)).size.toLocaleString();
      resultsMeta.textContent = filtered.length === rows.length
        ? "Showing the full catalog."
        : \`Showing \${filtered.length.toLocaleString()} filtered rows.\`;

      if (!filtered.length) {
        resultsBody.innerHTML = "";
        emptyState.style.display = "block";
        return;
      }

      emptyState.style.display = "none";
      resultsBody.innerHTML = filtered.map((row) => {
        const key = rowKey(row);
        const rowClass = key === selectedRowKey ? "select-row is-selected" : "select-row";
        const bookPills = [
          row.level,
          row.skill,
          row.chapter === "Whole Book Overview" ? "Overview" : "Chapter"
        ].filter(Boolean).map((value) => \`<span class="pill">\${escapeHtml(value)}</span>\`).join("");
        const sourceLine = row.relative_path || row.file_path;

        return \`
          <tr class="\${rowClass}" data-select-row="\${escapeHtml(key)}">
            <td class="book">
              <span class="book-title">\${escapeHtml(row.title)}</span>
              <span class="book-meta">\${escapeHtml(row.author)}</span>
              <div>\${bookPills}</div>
              <span class="book-summary">\${escapeHtml(row.book_theme || "No book theme summary yet.")}</span>
            </td>
            <td>
              <span class="cell-title">\${escapeHtml(row.chapter)}</span>
              <span class="cell-subtitle">\${escapeHtml(row.chapter_theme || "No chapter theme summary yet.")}</span>
              <span class="cell-detail">\${escapeHtml(sourceLine)}</span>
            </td>
            <td>
              <span class="cell-title">\${escapeHtml(row.what_this_chapter_teaches || "No teaching notes yet.")}</span>
              <span class="cell-detail">Theme: \${escapeHtml(row.chapter_theme || "Not specified")}</span>
            </td>
            <td>
              <span class="cell-title">\${escapeHtml(row.what_weakness_it_solves || "No weakness summary yet.")}</span>
              <span class="cell-detail">Entry: \${escapeHtml(row.chapter === "Whole Book Overview" ? "Whole-book overview" : "Chapter-specific extraction row")}</span>
            </td>
            <td class="row-actions">
              <div class="tiny-actions">
                <button class="tiny pick" type="button" data-select-button="\${escapeHtml(key)}">Pick</button>
                <button class="tiny" type="button" data-mode-row="\${escapeHtml(key)}" data-mode="fen">FEN</button>
                <button class="tiny" type="button" data-mode-row="\${escapeHtml(key)}" data-mode="pgn">PGN</button>
              </div>
            </td>
          </tr>
        \`;
      }).join("");

      for (const rowElement of resultsBody.querySelectorAll("tr[data-select-row]")) {
        rowElement.addEventListener("click", (event) => {
          if (event.target.closest("button")) return;
          selectRow(rowElement.getAttribute("data-select-row"));
        });
      }

      for (const button of resultsBody.querySelectorAll("[data-select-button]")) {
        button.addEventListener("click", () => {
          selectRow(button.getAttribute("data-select-button"));
        });
      }

      for (const button of resultsBody.querySelectorAll("[data-mode-row]")) {
        button.addEventListener("click", () => {
          selectedRowKey = button.getAttribute("data-mode-row");
          extractMode.value = button.getAttribute("data-mode");
          updateStudio();
          render();
        });
      }
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    updateStudio();
    render();
  </script>
</body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
console.log(`Built ${outputPath}`);
