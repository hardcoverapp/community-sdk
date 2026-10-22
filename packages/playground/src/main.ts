// SDK playground: pick a method, run it against a Hardcover API, and see what
// the SDK did. Connection settings live in this browser's localStorage.
import {
  fetchTransport,
  HardcoverClient,
  HardcoverError,
  type Environment,
  type RateLimitState,
  type Transport,
} from "@hardcover/sdk";
import {
  buildArgs,
  callMethod,
  catalog,
  enumKeys,
  exampleText,
  type Field,
  type Method,
  type Reader,
  type Resource,
} from "./catalog.ts";

// ---------- storage (every access can throw in private windows) ----------
const KEY = "hardcover-sdk-playground";
const store = {
  get(name: string): string | null {
    try {
      return localStorage.getItem(`${KEY}:${name}`);
    } catch {
      return null;
    }
  },
  set(name: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(`${KEY}:${name}`);
      else localStorage.setItem(`${KEY}:${name}`, value);
    } catch {
      /* storage unavailable: settings last for this page view only */
    }
  },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- connection ----------
const tokenInput = $<HTMLInputElement>("token");
const environmentSelect = $<HTMLSelectElement>("environment");
const customRow = $<HTMLDivElement>("custom-row");
const customUrl = $<HTMLInputElement>("custom-url");
const connectionSummary = $<HTMLSpanElement>("connection-summary");
const connection = $<HTMLDetailsElement>("connection");

tokenInput.value = store.get("token") ?? "";
environmentSelect.value = store.get("environment") ?? "local";
customUrl.value = store.get("customUrl") ?? "";

function describeConnection() {
  const env = environmentSelect.value;
  const where = env === "custom" ? customUrl.value || "custom URL not set" : environmentSelect.selectedOptions[0]?.textContent ?? env;
  connectionSummary.textContent = tokenInput.value ? where : `${where}, no token`;
  customRow.hidden = env !== "custom";
}
describeConnection();
if (!tokenInput.value) connection.open = true;

environmentSelect.addEventListener("change", describeConnection);
$<HTMLButtonElement>("token-toggle").addEventListener("click", (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const show = tokenInput.type === "password";
  tokenInput.type = show ? "text" : "password";
  button.textContent = show ? "Hide" : "Show";
  button.setAttribute("aria-pressed", String(show));
});
$<HTMLFormElement>("connection-form").addEventListener("submit", (event) => {
  event.preventDefault();
  store.set("token", tokenInput.value.trim() || null);
  store.set("environment", environmentSelect.value);
  store.set("customUrl", customUrl.value || null);
  client = undefined;
  describeConnection();
  connection.open = false;
  setStatus("Connection saved.", "neutral");
});
$<HTMLButtonElement>("forget").addEventListener("click", () => {
  tokenInput.value = "";
  store.set("token", null);
  client = undefined;
  describeConnection();
  setStatus("Token removed from this browser.", "neutral");
  tokenInput.focus();
});

// ---------- client (rebuilt when the connection changes) ----------
interface SentRequest {
  operation: string;
  status: string;
  ms: number;
}
let client: HardcoverClient | undefined;
let sent: SentRequest[] = [];

// Wraps the real transport to show which operations the SDK sent, in order.
const base = fetchTransport();
const loggingTransport: Transport = {
  async send(request) {
    const started = performance.now();
    const { operationName } = JSON.parse(request.body) as { operationName?: string };
    const operation = operationName ?? "anonymous query";
    try {
      const response = await base.send(request);
      sent.push({ operation, status: String(response.status), ms: Math.round(performance.now() - started) });
      return response;
    } catch (error) {
      sent.push({ operation, status: "no response", ms: Math.round(performance.now() - started) });
      throw error;
    }
  },
};

function getClient(): HardcoverClient {
  const env = environmentSelect.value;
  client ??= new HardcoverClient({
    token: tokenInput.value,
    environment: env === "custom" ? "local" : (env as Environment),
    endpoint: env === "custom" ? customUrl.value : undefined,
    transport: loggingTransport,
    userAgent: "hardcover-sdk-playground",
    onRateLimit: renderRateLimit,
  });
  return client;
}

// ---------- method picker and form ----------
// The form is built from the catalog's params. Each input's id is
// `field-` plus its path, e.g. `field-options.status`, which is how the
// values are read back when the method runs.
const resourceSelect = $<HTMLSelectElement>("resource");
const methodSelect = $<HTMLSelectElement>("method");
const inputs = $<HTMLFieldSetElement>("inputs");
const runButton = $<HTMLButtonElement>("run");

for (const resource of catalog) resourceSelect.add(new Option(resource.name, resource.name));
resourceSelect.value = store.get("resource") ?? "books";

function currentResource(): Resource {
  return catalog.find((r) => r.name === resourceSelect.value) ?? catalog[0]!;
}

function currentMethod(): Method {
  const resource = currentResource();
  return resource.methods.find((m) => m.name === methodSelect.value) ?? resource.methods[0]!;
}

function fillMethods(preferred?: string | null) {
  const resource = currentResource();
  methodSelect.replaceChildren(...resource.methods.map((m) => new Option(m.name, m.name)));

  if (preferred && resource.methods.some((m) => m.name === preferred)) methodSelect.value = preferred;
  renderMethod();
}

// Readable labels from enum keys and literal values: "WantToRead" → "Want To Read".
const readable = (key: string) => key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");

function labelFor(field: Field, id: string): HTMLLabelElement {
  const label = Object.assign(document.createElement("label"), { htmlFor: id, textContent: field.label ?? field.name });

  if (field.required) {
    label.append(Object.assign(document.createElement("span"), { className: "required", textContent: " (required)" }));
  }

  return label;
}

function selectOf(choices: { label: string; value: string }[], initial: string): HTMLSelectElement {
  const select = document.createElement("select");
  for (const choice of choices) select.add(new Option(choice.label, choice.value));

  select.value = initial;
  return select;
}

// The input for one field. Optional selects start with "(not set)", so only
// what you pick is sent.
function controlFor(field: Field): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const initial = exampleText(field);
  const notSet = field.required ? [] : [{ label: "(not set)", value: "" }];

  switch (field.kind) {
    case "enum":
      return selectOf([...notSet, ...enumKeys(field).map((key) => ({ label: readable(key), value: key }))], initial);

    case "literal":
      return selectOf([...notSet, ...(field.values ?? []).map((value) => ({ label: readable(value), value }))], initial);

    // A select rather than a checkbox, so "false" and "not set" are different.
    case "boolean":
      return selectOf([...notSet, { label: "Yes", value: "true" }, { label: "No", value: "false" }], initial);

    case "lines":
    case "longText":
    case "json":
      return Object.assign(document.createElement("textarea"), { value: initial });

    default: {
      const type = { number: "number", date: "date", datetime: "datetime-local" }[field.kind as string] ?? "text";
      const input = Object.assign(document.createElement("input"), { type, value: initial });

      if (field.kind === "number") input.step = "any";
      return input;
    }
  }
}

function hintFor(field: Field, id: string, control: HTMLElement): HTMLElement[] {
  // Say what a textarea expects when the catalog doesn't.
  const extra = field.kind === "lines" ? "One per line." : field.kind === "json" ? "JSON." : "";
  const sentence = field.hint && (/[.!?]$/.test(field.hint) ? field.hint : `${field.hint}.`);
  const text = [sentence, extra].filter(Boolean).join(" ");
  if (!text) return [];

  const hintId = `${id}-hint`;
  control.setAttribute("aria-describedby", hintId);

  return [Object.assign(document.createElement("span"), { id: hintId, className: "field-hint", textContent: text })];
}

// A group of inputs under a legend: an options object, or a stats period.
function groupOf(legendText: string, children: HTMLElement[]): HTMLFieldSetElement {
  const group = Object.assign(document.createElement("fieldset"), { className: "group" });
  group.append(Object.assign(document.createElement("legend"), { textContent: legendText }), ...children);

  return group;
}

// The stats period: a kind, and the inputs that kind needs.
function periodElement(field: Field, path: string): HTMLElement {
  const example = (field.example ?? {}) as Record<string, string | number>;

  const parts: Field[] = [
    { name: "year", kind: "number", label: "Year", example: example.year ?? new Date().getFullYear() },
    { name: "month", kind: "number", label: "Month", hint: "1 for January through 12", example: example.month },
    { name: "from", kind: "date", label: "From", example: example.from },
    { name: "to", kind: "date", label: "To", example: example.to },
  ];

  // Which inputs each kind uses.
  const uses: Record<string, string[]> = { life: [], year: ["year"], month: ["year", "month"], custom: ["from", "to"] };

  const kind: Field = { name: "kind", kind: "literal", label: "Kind", required: true, values: Object.keys(uses), example: example.kind ?? "life" };
  const kindElement = fieldElement(kind, `${path}.kind`);
  const partElements = parts.map((part) => fieldElement(part, `${path}.${part.name}`));

  const showParts = () => {
    const chosen = uses[(kindElement.querySelector("select") as HTMLSelectElement).value] ?? [];
    parts.forEach((part, i) => (partElements[i]!.hidden = !chosen.includes(part.name)));
  };

  kindElement.addEventListener("change", showParts);
  showParts();

  return groupOf(field.label ?? "Period", [kindElement, ...partElements]);
}

function fieldElement(field: Field, path: string): HTMLElement {
  if (field.kind === "options") {
    const children = (field.fields ?? []).map((inner) => fieldElement(inner, `${path}.${inner.name}`));
    return groupOf(field.label ?? "Options", children);
  }

  if (field.kind === "period") return periodElement(field, path);

  const id = `field-${path}`;
  const control = controlFor(field);
  Object.assign(control, { id, name: path });
  if (field.required && !field.nullable) control.required = true;

  const wrap = document.createElement("div");
  wrap.append(labelFor(field, id), control, ...hintFor(field, id, control));

  return wrap;
}

function renderMethod() {
  const method = currentMethod();
  store.set("resource", resourceSelect.value);
  store.set("method", method.name);
  $("method-summary").textContent = method.summary;

  const badges = $("method-badges");
  badges.replaceChildren();
  badges.hidden = !method.writes;
  if (method.writes) badges.append(Object.assign(document.createElement("span"), { className: "badge", textContent: "Changes data" }));
  if (method.destructive) badges.append(Object.assign(document.createElement("span"), { className: "badge destructive", textContent: "Deletes" }));

  const legend = inputs.querySelector("legend")!;
  inputs.replaceChildren(legend, ...method.params.map((param) => fieldElement(param, param.name)));
  inputs.hidden = method.params.length === 0;

  runButton.textContent = `Run ${resourceSelect.value}.${method.name}`;
}

resourceSelect.addEventListener("change", () => fillMethods());
methodSelect.addEventListener("change", renderMethod);
fillMethods(store.get("method"));

// What the form holds at a path; "" when there's no such input.
const readInput: Reader = (path) => {
  const control = document.getElementById(`field-${path}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return control?.value ?? "";
};

// ---------- results ----------
const statusLine = $<HTMLParagraphElement>("status");
const errorBox = $<HTMLDivElement>("error");
const output = $<HTMLPreElement>("output");

function setStatus(text: string, tone: "ok" | "failed" | "neutral") {
  statusLine.textContent = text;
  statusLine.className = `status ${tone === "neutral" ? "" : tone}`;
}

function renderRequests() {
  const list = $<HTMLOListElement>("requests");
  if (sent.length === 0) {
    list.replaceChildren(Object.assign(document.createElement("li"), { className: "empty", textContent: "None. Everything was answered locally." }));
    return;
  }
  list.replaceChildren(
    ...sent.map((r) => {
      const item = document.createElement("li");
      item.append(Object.assign(document.createElement("code"), { textContent: r.operation }));
      item.append(Object.assign(document.createElement("span"), { className: "meta", textContent: `  HTTP ${r.status}, ${r.ms} ms` }));
      return item;
    }),
  );
}

function meterRow(labelText: string, remaining?: number, limit?: number, resetSeconds?: number) {
  const row = document.createElement("div");
  const dt = Object.assign(document.createElement("dt"), { textContent: labelText });
  const dd = document.createElement("dd");
  if (remaining === undefined) {
    dd.textContent = "Not reported";
  } else {
    const meter = document.createElement("div");
    meter.className = "meter";
    if (limit) {
      const bar = Object.assign(document.createElement("meter"), { min: 0, max: limit, value: remaining, low: limit * 0.2, optimum: limit });
      bar.setAttribute("aria-label", `${labelText} remaining`);
      meter.append(bar);
    }
    const reset = resetSeconds === undefined ? "" : `, resets in ${resetSeconds}s`;
    meter.append(`${remaining}${limit ? ` of ${limit}` : ""} left${reset}`);
    dd.append(meter);
  }
  row.append(dt, dd);
  return row;
}

function renderRateLimit(state: RateLimitState) {
  const dl = $<HTMLDListElement>("rate-limit");
  dl.replaceChildren(
    meterRow(state.tier ? `Burst (${state.tier})` : "Burst", state.burst?.remaining, state.burst?.limit, state.burst?.resetSeconds),
    meterRow("Daily", state.daily?.remaining, state.daily?.limit, state.daily?.resetSeconds),
  );
}

// An error's own fields (missingScopes, operationName, messages, ...), minus noise.
function errorDetails(error: Error): [string, string][] {
  return Object.entries(error)
    .filter(([key, value]) => value !== undefined && key !== "data" && key !== "stack")
    .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)]);
}

function showError(error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  errorBox.hidden = false;
  errorBox.replaceChildren();
  errorBox.append(Object.assign(document.createElement("strong"), { textContent: `${err.name}: ${err.message}` }));
  const details = errorDetails(err);
  if (details.length) {
    const dl = document.createElement("dl");
    for (const [key, value] of details) dl.append(Object.assign(document.createElement("dt"), { textContent: key }), Object.assign(document.createElement("dd"), { textContent: value }));
    errorBox.append(dl);
  }
}

$<HTMLFormElement>("call").addEventListener("submit", async (event) => {
  event.preventDefault();
  const method = currentMethod();
  const name = `${resourceSelect.value}.${method.name}`;
  const form = event.currentTarget as HTMLFormElement;

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  if (!tokenInput.value.trim()) {
    connection.open = true;
    tokenInput.focus();
    setStatus("Add a personal access token under Connection first.", "failed");
    return;
  }
  if (method.destructive && !window.confirm(`${name} deletes data on ${connectionSummary.textContent}. Continue?`)) {
    setStatus(`${name} cancelled.`, "neutral");
    return;
  }

  sent = [];
  errorBox.hidden = true;
  output.hidden = true;
  runButton.disabled = true;
  setStatus(`Running ${name}…`, "neutral");
  const started = performance.now();

  try {
    // Positional args from the form, then the call itself, as an app would write it.
    const args = buildArgs(method.params, readInput);
    const result = await callMethod(getClient(), currentResource(), method, args);

    const ms = Math.round(performance.now() - started);
    output.textContent = result === undefined ? "(no value: the call succeeded and returns nothing)" : JSON.stringify(result, null, 2);
    output.hidden = false;
    const count = Array.isArray(result) ? `, ${result.length} items` : result && typeof result === "object" && "items" in result ? `, ${(result as { items: unknown[] }).items.length} items` : "";
    setStatus(`${name} succeeded in ${ms} ms${count}.`, "ok");
  } catch (error) {
    showError(error);
    const kind = error instanceof HardcoverError ? error.name : error instanceof TypeError || error instanceof RangeError ? `${error.name} (checked before sending)` : "Error";
    setStatus(`${name} failed: ${kind}.`, "failed");
  } finally {
    runButton.disabled = false;
    renderRequests();
    // Requests went out but no rate-limit headers were readable: say why.
    if (sent.length > 0 && !client?.rateLimit) {
      const dl = $<HTMLDListElement>("rate-limit");
      dl.replaceChildren(
        Object.assign(document.createElement("p"), {
          className: "summary",
          textContent:
            "The API's CORS response hid the rate-limit headers from this page, so the SDK paces by handling 429s instead. Locally, run Hasura with HASURA_GRAPHQL_DISABLE_CORS=true (spec/04, spec/06 #24).",
        }),
      );
    }
  }
});
