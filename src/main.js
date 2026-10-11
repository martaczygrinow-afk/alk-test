import {
  freshPlan,
  calculate,
  money,
  percent,
  KEY,
  COLORS,
  isPlan,
} from "./model.js";
const root = document.getElementById("root");
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let plan = freshPlan(),
  saveError = "",
  readError = "";
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const loaded = JSON.parse(raw);
    if (isPlan(loaded)) plan = loaded;
    else readError = "Nie udało się odczytać zapisanego planu.";
  }
} catch {
  readError = "Nie udało się odczytać zapisanego planu.";
}
function save() {
  plan.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(KEY, JSON.stringify(plan));
    saveError = "";
  } catch {
    saveError = "Nie udało się zapisać zmian";
  }
}
function field(label, value, error, id, key, category = "", suffix = "%") {
  return `<div class="field"><label class="sr-only" for="${id}">${escape(label)}</label><div class="input-wrap ${error ? "invalid" : ""}"><input id="${id}" data-key="${key}" data-id="${category}" value="${escape(value)}" inputmode="decimal" aria-invalid="${!!error}" ${error ? `aria-describedby="${id}-error"` : ""}><span>${suffix}</span></div>${error ? `<small class="error" id="${id}-error">${escape(error)}</small>` : ""}</div>`;
}
function stat(label, value, note, green = false) {
  return `<section class="stat ${green ? "green" : ""}"><span>${label}</span><strong>${escape(value)}</strong><small>${escape(note)}</small></section>`;
}
function empty(text) {
  return `<div class="empty"><span aria-hidden="true">▥</span><p>${text}</p></div>`;
}
function chartBudget(r) {
  if (!r.allocationValid || r.sum.gt(100))
    return empty("Popraw budżet, nazwy i udziały, aby zobaczyć podział.");
  const data = r.rows
    .filter((c) => c.p.gt(0))
    .map((c) => ({
      name: c.name,
      value: c.p.toNumber(),
      cost: c.cost,
      color: c.color,
    }));
  if (r.sum.lt(100))
    data.push({
      name: "Niewykorzystany budżet",
      value: 100 - r.sum.toNumber(),
      cost: r.remaining,
      color: "#e6e9e3",
    });
  let angle = 0;
  const segments = data.map((d) => {
    const start = angle;
    angle += d.value;
    return `${d.color} ${start}% ${angle}%`;
  });
  return `<div class="donut"><div class="donut-ring" role="img" aria-label="Podział budżetu — szczegóły w legendzie" style="background:conic-gradient(${segments.join(",")})"></div><div class="donut-center"><small>Roczny budżet</small><b>${money(r.budget.value)}</b></div></div><div class="legend">${data.map((d) => `<div title="${escape(d.name)}: ${percent(d.value)} · ${money(d.cost)}"><span class="color-dot" style="background:${d.color}"></span><span>${escape(d.name)}</span><b>${percent(d.value)}</b><small>${money(d.cost)}</small></div>`).join("")}</div>`;
}
function chartProfit(r) {
  if (!r.valid)
    return empty(
      r.sum?.gt(100)
        ? "Zmniejsz udziały do maksymalnie 100%. Prognoza jest wstrzymana."
        : "Uzupełnij poprawne dane i ROI aktywnych kanałów. Prognoza jest wstrzymana.",
    );
  const data = r.rows.filter((c) => c.p.gt(0));
  if (!data.length)
    return empty("Przydziel budżet do kanału, aby zobaczyć prognozę.");
  const values = data.map((c) => c.profit.toNumber());
  const min = Math.min(0, ...values),
    max = Math.max(0, ...values);
  const range = max - min || 1;
  const width = Math.max(480, data.length * 65),
    left = 65,
    top = 25,
    height = 240,
    plot = width - left - 15,
    step = plot / data.length;
  const y = (v) => top + ((max - v) / range) * height;
  const zero = y(0);
  const ticks = Array.from({ length: 5 }, (_, i) => min + (range * i) / 4);
  return `<div class="bar-chart"><svg viewBox="0 0 ${width} 325" role="img" aria-label="Prognozowany zysk według kanałów w złotych. Straty poniżej zera; dane w tabeli kategorii.">${ticks.map((v) => `<line x1="${left}" x2="${width - 15}" y1="${y(v)}" y2="${y(v)}" stroke="#e0e5dc" stroke-dasharray="3 5"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#5d6a57">${new Intl.NumberFormat("pl", { notation: "compact" }).format(v)}</text>`).join("")}<line x1="${left}" x2="${width - 15}" y1="${zero}" y2="${zero}" stroke="#68765f"/>${data
    .map((d, i) => {
      const v = d.profit.toNumber(),
        barWidth = Math.min(55, step * 0.65);
      return `<g><rect class="profit-bar" x="${left + step * i + (step - barWidth) / 2}" y="${Math.min(y(v), zero)}" width="${barWidth}" height="${Math.abs(y(v) - zero)}" rx="4" fill="${d.color}"><title>${escape(d.name)} — Koszt: ${money(d.cost)}; ROI: ${percent(d.r)}; Zysk: ${money(d.profit)}</title></rect><text x="${left + step * (i + 0.5)}" y="290" text-anchor="middle" fill="#5d6a57" font-size="11">${escape(d.name.length > 12 ? d.name.slice(0, 11) + "…" : d.name)}</text></g>`;
    })
    .join("")}</svg></div>`;
}
function render() {
  const active = document.activeElement,
    focusId = active?.id;
  const selection =
    active?.tagName === "INPUT"
      ? [active.selectionStart, active.selectionEnd]
      : null;
  const openDetails = [...root.querySelectorAll("details[open]")].map(
    (e) => e.dataset.id,
  );
  const r = calculate(plan),
    full = r.sum?.eq(100),
    over = r.sum?.gt(100);
  root.innerHTML = `<div class="shell"><aside><a class="brand" href="#plan"><span class="brand-icon" aria-hidden="true">▥</span>planer<span class="brand-dot">.</span></a><div class="workspace-label">TWOJA PRZESTRZEŃ</div><a class="nav active" href="#plan"><span aria-hidden="true">▣</span> Budżet marketingowy</a><div class="aside-bottom"><span class="avatar">M</span><div>Moja przestrzeń<small>Plan lokalny</small></div></div></aside><div class="main"><header><span>Przestrzeń robocza <span class="slash">/</span> <b>Budżet marketingowy</b></span><span class="header-tag">PLAN ROCZNY</span></header><main id="plan"><div class="page-heading"><div><div class="eyebrow">ZAPLANUJ. PODZIEL. ROŚNIJ.</div><h1>Budżet marketingowy</h1><p>Dobry plan zaczyna się od liczb. Sprawdź, co może przynieść Twój budżet.</p></div><button class="reset" id="reset-button" data-action="reset"><span aria-hidden="true">↺</span> Resetuj plan</button></div><div class="budget-panel"><div><label for="annual-budget">Roczny budżet</label>${field("Roczny budżet", plan.budget, r.budget.error, "annual-budget", "budget", "", "zł")}<span class="budget-year">Plan na ${plan.year} rok · PLN</span></div><div class="roi-note"><span class="info-icon" aria-hidden="true">ⓘ</span><div><b>Co oznacza ROI?</b><p>ROI to zysk netto względem nakładu. Przy ROI 50% każde 100 zł budżetu oznacza 50 zł prognozowanego zysku.</p></div></div></div><div class="section-heading"><div><h2>Podział budżetu</h2><p>Przydziel udziały i określ oczekiwany zwrot dla każdego kanału.</p></div><span class="count">${plan.categories.length} kanałów</span></div><section class="table-panel" aria-label="Kategorie marketingowe"><div class="table-head grid"><span>KANAŁ MARKETINGOWY</span><span>UDZIAŁ</span><span>OCZEKIWANY ROI</span><span>BUDŻET</span><span>PROGNOZOWANY ZYSK</span><span></span></div>${r.rows.map((c, i) => `<div class="category grid"><div class="name-cell"><span class="color-dot" style="background:${c.color}"></span><div class="field"><label class="sr-only" for="name-${c.id}">Nazwa kategorii ${i + 1}</label><input id="name-${c.id}" class="name-input" data-key="name" data-id="${c.id}" value="${escape(c.name)}" aria-invalid="${!!c.nameError}" ${c.nameError ? `aria-describedby="name-error-${c.id}"` : ""}>${c.nameError ? `<small class="error" id="name-error-${c.id}">${c.nameError}</small>` : ""}</div></div><div class="mobile-field"><span class="mobile-label">Udział</span>${field("Udział " + c.name, c.share, c.shareError, "share-" + c.id, "share", c.id)}</div><div class="mobile-field"><span class="mobile-label">Oczekiwany ROI</span>${field("ROI " + c.name, c.roi, c.roiError, "roi-" + c.id, "roi", c.id)}</div><div class="amount"><span class="mobile-label">Budżet</span>${money(c.cost)}</div><div class="amount profit ${c.profit?.lt(0) ? "negative" : ""}"><span class="mobile-label">Prognozowany zysk</span>${money(c.profit)}<details data-id="${c.id}" ${openDetails.includes(c.id) ? "open" : ""}><summary>Korzyść finansowa</summary>${money(c.benefit)}</details></div><button class="delete" data-action="delete" data-id="${c.id}" aria-label="Usuń ${escape(c.name)}"><span aria-hidden="true">×</span></button></div>`).join("")}<div class="table-footer"><button class="add" id="add-button" data-action="add"><span aria-hidden="true">＋</span> Dodaj kategorię</button><div class="allocation ${over ? "negative" : ""}" role="status"><span aria-hidden="true">${full ? "✓" : "ⓘ"}</span><b>${r.sum === null ? "Sprawdź udziały" : "Przydzielono " + percent(r.sum)}</b><span>${over ? `Zmniejsz udziały o ${percent(r.sum.sub(100)).replace("%", "")} punktów procentowych · przekroczono o ${money(r.remaining?.abs())}` : full ? "Cały budżet ma swój cel" : "Pozostało " + money(r.remaining)}</span></div></div></section><p class="rounding">Kwoty zaokrąglamy do groszy. Suma zaokrąglonych pozycji może różnić się od sumy o 0,01 zł.</p><div class="summary-grid">${stat("BUDŻET ROCZNY", r.budget.error ? "—" : money(r.budget.value), "Twój punkt wyjścia")}${stat("PRZYDZIELONA KWOTA", money(r.cost), full ? "100% budżetu w działaniu" : percent(r.sum) + " budżetu")}${stat("PROGNOZOWANY ZYSK", money(r.profit), r.valid ? "Korzyść finansowa: " + money(r.benefit) : "Uzupełnij poprawne dane", true)}${stat(full ? "WAŻONY ROI" : "ROI PRZYDZIELONEGO BUDŻETU", percent(r.roi), "Zwrot uwzględniający nakłady", true)}</div><div class="charts"><section class="chart-card"><h2>Gdzie trafia Twój budżet?</h2><p>Podział rocznego budżetu między kanały</p>${chartBudget(r)}</section><section class="chart-card"><h2>Jak pracuje Twój budżet?</h2><p>Prognozowany zysk według kanałów · zł</p>${chartProfit(r)}<div class="chart-note">↗ Zysk netto, po odjęciu kosztów marketingu.</div></section></div><div class="assumptions"><p>To prognoza, nie gwarancja. Model zakłada stały ROI oraz niezależne wyniki kanałów. Nie uwzględnia synergii ani opóźnień zwrotu. Korzyść finansowa nie oznacza automatycznie przychodu ze sprzedaży ani ROAS.</p></div><footer><span class="${saveError || readError ? "negative" : ""}" role="status">${escape(saveError || readError || "✓ Zapis w tej przeglądarce — bez synchronizacji")}</span><span>Przemyślane decyzje. Lepsze wyniki.</span></footer></main></div></div><dialog id="reset-dialog" class="modal" aria-labelledby="reset-title"><h2 id="reset-title">Zresetować plan?</h2><p>Twoje zmiany zostaną usunięte. Przywrócimy przykładowy plan początkowy.</p><div><button data-action="cancel" autofocus>Anuluj</button><button class="primary" data-action="confirm">Resetuj plan</button></div></dialog>`;
  if (focusId) {
    const target = document.getElementById(focusId);
    target?.focus({ preventScroll: true });
    if (selection) target?.setSelectionRange(...selection);
  }
}
root.addEventListener("input", (e) => {
  const { key, id } = e.target.dataset;
  if (!key) return;
  if (key === "budget") plan.budget = e.target.value;
  else {
    const c = plan.categories.find((c) => c.id === id);
    if (c) c[key] = e.target.value;
  }
  save();
  render();
});
root.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "reset") {
    document.getElementById("reset-dialog").showModal();
    return;
  }
  if (action === "cancel") {
    document.getElementById("reset-dialog").close();
    document.getElementById("reset-button").focus();
    return;
  }
  if (action === "confirm") {
    plan = freshPlan();
    readError = "";
    try {
      localStorage.removeItem(KEY);
      saveError = "";
    } catch {
      saveError = "Nie udało się zapisać zmian";
    }
    render();
    document.getElementById("reset-button").focus();
    return;
  }
  if (action === "add") {
    let n = 1;
    while (
      plan.categories.some(
        (c) => c.name.toLowerCase() === `nowa kategoria ${n}`,
      )
    )
      n++;
    const c = {
      id: crypto.randomUUID(),
      name: `Nowa kategoria ${n}`,
      share: "0",
      roi: "",
      color: COLORS[plan.categories.length % COLORS.length],
    };
    plan.categories.push(c);
    save();
    render();
    document.getElementById("name-" + c.id).focus();
    return;
  }
  if (action === "delete") {
    plan.categories = plan.categories.filter((c) => c.id !== id);
    save();
    render();
    document.getElementById("add-button").focus();
  }
});
render();
root.addEventListener("keydown", (event) => {
  const dialog = event.target.closest("dialog[open]");
  if (!dialog || event.key !== "Tab") return;
  const buttons = dialog.querySelectorAll("button");
  const first = buttons[0],
    last = buttons[buttons.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});
