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
import { catalog, type Field, type Method, type Values } from "./catalog.ts";

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
const resourceSelect = $<HTMLSelectElement>("resource");
const methodSelect = $<HTMLSelectElement>("method");
const inputs = $<HTMLFieldSetElement>("inputs");
const runButton = $<HTMLButtonElement>("run");

for (const resource of catalog) resourceSelect.add(new Option(resource.name, resource.name));
resourceSelect.value = store.get("resource") ?? "books";

function currentMethod(): Method {
  const resource = catalog.find((r) => r.name === resourceSelect.value) ?? catalog[0]!;
  return resource.methods.find((m) => m.name === methodSelect.value) ?? resource.methods[0]!;
}

function fillMethods(preferred?: string | null) {
  const resource = catalog.find((r) => r.name === resourceSelect.value) ?? catalog[0]!;
  methodSelect.replaceChildren(...resource.methods.map((m) => new Option(m.name, m.name)));
  if (preferred && resource.methods.some((m) => m.name === preferred)) methodSelect.value = preferred;
  renderMethod();
}

function fieldElement(field: Field): HTMLElement {
  const wrap = document.createElement("div");
  const id = `field-${field.name}`;
  const hintId = `${id}-hint`;
  let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  if (field.kind === "checkbox") {
    const label = document.createElement("label");
    label.className = "check";
    const box = Object.assign(document.createElement("input"), { type: "checkbox", id, name: field.name, checked: Boolean(field.value) });
    label.append(box, field.label);
    wrap.append(label);
    control = box;
  } else {
    const label = Object.assign(document.createElement("label"), { htmlFor: id, textContent: field.label });
    if ("required" in field && field.required) label.append(Object.assign(document.createElement("span"), { className: "required", textContent: " (required)" }));
    if (field.kind === "select") {
      const select = document.createElement("select");
      for (const option of field.options) select.add(new Option(option.label, String(option.value)));
      if (field.value !== undefined) select.value = String(field.value);
      control = select;
    } else if (field.kind === "lines") {
      control = Object.assign(document.createElement("textarea"), { value: field.value ?? "" });
    } else {
      const type = { number: "number", text: "text", date: "date", datetime: "datetime-local" }[field.kind];
      control = Object.assign(document.createElement("input"), { type, value: "value" in field && field.value !== undefined ? String(field.value) : "" });
      if (field.kind === "number") control.setAttribute("step", "any");
    }
    Object.assign(control, { id, name: field.name });
    if ("required" in field && field.required) control.required = true;
    wrap.append(label, control);
  }

  if (field.hint) {
    wrap.append(Object.assign(document.createElement("span"), { id: hintId, className: "field-hint", textContent: field.hint }));
    control.setAttribute("aria-describedby", hintId);
  }
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
  inputs.replaceChildren(legend, ...method.fields.map(fieldElement));
  inputs.hidden = method.fields.length === 0;
  runButton.textContent = `Run ${resourceSelect.value}.${method.name}`;
}

resourceSelect.addEventListener("change", () => fillMethods());
methodSelect.addEventListener("change", renderMethod);
fillMethods(store.get("method"));

function readValues(method: Method): Values {
  const values: Values = {};
  for (const field of method.fields) {
    const control = document.getElementById(`field-${field.name}`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    if (field.kind === "checkbox") values[field.name] = (control as HTMLInputElement).checked;
    else if (field.kind === "lines") values[field.name] = control.value.split("\n").map((l) => l.trim()).filter(Boolean);
    else values[field.name] = control.value.trim();
  }
  return values;
}

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
    const result = await method.run(getClient(), readValues(method));
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
