# Vobiz Node.js Library

Typed TypeScript and JavaScript client for the Vobiz programmable voice and
SIP-trunking API, with a built-in VobizXML builder for call-control documents.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6.svg)](https://www.typescriptlang.org/)
[![Docs](https://img.shields.io/badge/docs-docs.vobiz.ai-3b82f6.svg)](https://docs.vobiz.ai)
[![fern shield](https://img.shields.io/badge/%F0%9F%8C%BF-Built%20with%20Fern-brightgreen)](https://buildwithfern.com?utm_source=github&utm_medium=github&utm_campaign=readme&utm_source=Vobiz%2FNode)

## Overview

`@vobiz/sdk` is the official Node.js client for the Vobiz REST API. It covers the
whole platform surface: placing and controlling calls, live-call inspection, in-call
actions such as text-to-speech, audio playback and DTMF, recordings, call detail
records, phone-number inventory, SIP trunks and endpoints, conferences,
applications, sub-accounts and KYC, IP access control lists, balance and the partner
API.

The client is generated from the Vobiz OpenAPI specification with
[Fern](https://buildwithfern.com), so every sub-client, method, request type and
response type tracks the published API. Every request and response shape is exported
under the `Vobiz` namespace, so you can annotate values before you pass them in and
let the compiler catch mistakes.

The package ships as an ES module with bundled TypeScript declarations and has **no
runtime dependencies** — it uses the platform's global `fetch`. That makes it usable
on Node 18 and newer, and on any runtime with a WHATWG `fetch` (Deno, Bun,
Cloudflare Workers, Vercel Edge), optionally with your own `fetch` implementation
injected.

Alongside the API client the package exports `vobizxml`, a self-contained builder for
VobizXML — the XML call-control documents Vobiz fetches from your `answer_url` when a
call connects. It mirrors the `plivoxml` builder API, and emits XML byte-identical to
the Python `vobizxml` package.

At the end of a first integration you should be able to place an outbound call from
Node, serve a VobizXML document that speaks a prompt and collects a DTMF digit, watch
the call in the live-calls list, and read the resulting CDR.

## Installation

The package is not yet on the npm registry. Build it from source:

```sh
git clone https://github.com/vobiz-ai/Vobiz-Node-SDK.git
cd Vobiz-Node-SDK
npm install
npm run build
```

`npm run build` runs `tsc -p tsconfig.json` and emits `dist/`, which is what
`package.json` points `main` and `types` at. See [Troubleshooting](#troubleshooting)
for the type-check warnings the generated code currently emits.

To consume it from another project, link the built package:

```sh
cd Vobiz-Node-SDK && npm link
cd ../my-app && npm link @vobiz/sdk
```

Requires Node.js 18 or newer for global `fetch`. TypeScript 5.4 is a dev dependency
only. Once the package is published, `npm i @vobiz/sdk` will be the recommended route
— see [Roadmap](#roadmap).

## Authentication

Vobiz identifies your account with an **Auth ID** and an **Auth Token**, and
authorises the request with a **bearer token**. All three are passed to the client
constructor:

| Header | Constructor option | Purpose |
| --- | --- | --- |
| `X-Auth-ID` | `authId` | Identifies the account or sub-account |
| `X-Auth-Token` | `authToken` | Account secret paired with the Auth ID |
| `Authorization: Bearer <token>` | `token` | Bearer credential, applied by `BearerAuthProvider` |

```typescript
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
    token: process.env.VOBIZ_TOKEN!,
    authId: process.env.VOBIZ_AUTH_ID!,
    authToken: process.env.VOBIZ_AUTH_TOKEN!,
});
```

`authId` and `authToken` are required. `token` is required by the default bearer
auth provider — omit it and the first request throws
`Please provide 'token' when initializing the client`.

Each option is a `Supplier`, so it accepts a value, a function, or an async function.
That is the hook for credentials that rotate: the supplier is resolved per request,
so you can refresh a short-lived token without rebuilding the client.

```typescript
const client = new VobizClient({
    token: async () => await tokenStore.current(),
    authId: process.env.VOBIZ_AUTH_ID!,
    authToken: process.env.VOBIZ_AUTH_TOKEN!,
});
```

You can also override `authId` and `authToken` for a single request, which is how a
parent account acts on behalf of a sub-account:

```typescript
await client.cdr.listCdrs({ auth_id: SUB_AUTH_ID }, {
    authId: SUB_AUTH_ID,
    authToken: SUB_AUTH_TOKEN,
});
```

Advanced: `auth: false` disables the bearer provider entirely, and `auth` also
accepts a function returning auth headers or a custom `AuthProvider` — useful when
credentials come from a gateway that signs requests for you.

Keep credentials in environment variables or a secrets manager. The SDK is intended
for server-side use; do not ship these values to a browser bundle.

Sign up and find your credentials at [vobiz.ai](https://vobiz.ai); the credential
model is documented at
[docs.vobiz.ai/api-reference](https://docs.vobiz.ai/api-reference).

## Quickstart

Place an outbound call. Vobiz dials `to`, and when the callee answers it fetches your
`answer_url` for a VobizXML document describing what should happen next.

```typescript
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
    token: process.env.VOBIZ_TOKEN!,
    authId: process.env.VOBIZ_AUTH_ID!,
    authToken: process.env.VOBIZ_AUTH_TOKEN!,
});

const AUTH_ID = process.env.VOBIZ_AUTH_ID!;

const response = await client.calls.makeCall({
    auth_id: AUTH_ID,
    from: "14155551234",
    to: "+15550003333",
    answer_url: "https://example.com/answer",
    answer_method: "POST",
});

console.log(response.request_uuid);
```

Two naming conventions run side by side, and it is worth being deliberate about them:

- **Client options are camelCase** — `authId`, `authToken`, `timeoutInSeconds`,
  `maxRetries`.
- **Request bodies are snake_case**, because they mirror the wire format — `auth_id`,
  `answer_url`, `answer_method`, `call_uuid`, `per_page`.

`auth_id` is a member of the request object, not a positional argument, and it is the
account the operation acts on. `to` accepts multiple destinations separated by `<`,
fanning a single request out to up to 1000 destinations, for example
`"+15550003333<+15550004444"`.

### Request and response types

Every request and response type is exported under the `Vobiz` namespace, so you can
build values up before passing them in:

```typescript
import { Vobiz } from "@vobiz/sdk";

const request: Vobiz.MakeCallRequest = {
    auth_id: AUTH_ID,
    from: "14155551234",
    to: "+15550003333",
    answer_url: "https://example.com/answer",
    answer_method: "POST",
};

const response: Vobiz.MakeCallResponse = await client.calls.makeCall(request);
```

## Common operations

Every snippet below reuses the `client` and `AUTH_ID` from the quickstart. Method
signatures come from the generated sub-clients under
[`api/resources/`](./api/resources); the full API surface is documented at
[docs.vobiz.ai/api-reference](https://docs.vobiz.ai/api-reference).

### List live calls

`status` is required and accepts `"live"` or `"queued"`.

```typescript
const live = await client.liveCalls.listLiveCalls({
    auth_id: AUTH_ID,
    status: "live",
});

const detail = await client.liveCalls.getLiveCall({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
    status: "live",
});
```

`listQueuedCalls` and `getQueuedCall` mirror these for the queued set.

### Hang up a call

```typescript
await client.liveCalls.hangupCall({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
});
```

### Speak text and play audio into a live call

```typescript
await client.speakText.call({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
    text: "Your driver is two minutes away.",
    legs: "aleg",              // "aleg" | "bleg" | "both"
});

await client.playAudio.call({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
    urls: "https://cdn.example.com/hold-music.mp3",
    loop: true,
});

await client.speakText.stopSpeakCall({ auth_id: AUTH_ID, call_uuid: "cdr_XXXXXXXXXX" });
await client.playAudio.stopAudioCall({ auth_id: AUTH_ID, call_uuid: "cdr_XXXXXXXXXX" });
```

### Send DTMF

```typescript
await client.dtmf.sendDtmf({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
    digits: "1234#",
    leg: "aleg",              // optional: "aleg" | "bleg" | "both"
});
```

### Record a call and fetch the recording

```typescript
await client.recordCalls.startRecording({
    auth_id: AUTH_ID,
    call_uuid: "cdr_XXXXXXXXXX",
    file_format: "mp3",              // "mp3" | "wav"
    record_channel_type: "stereo",   // "mono" | "stereo"
    time_limit: 600,
    transcription_type: "auto",      // set to "auto" to enable transcription
    callback_url: "https://example.com/recording-ready",
});

await client.recordCalls.stopRecording({ auth_id: AUTH_ID, call_uuid: "cdr_XXXXXXXXXX" });

const recordings = await client.recordings.listRecordings({
    auth_id: AUTH_ID,
    limit: 20,
    offset: 0,
});
await client.recordings.getRecording({ auth_id: AUTH_ID, recording_id: "REC_ID" });
await client.recordings.deleteRecording({ auth_id: AUTH_ID, recording_id: "REC_ID" });
```

### Query call detail records

```typescript
const page = await client.cdr.listCdrs({
    auth_id: AUTH_ID,
    start_date: "2026-01-01",       // YYYY-MM-DD, required alongside end_date
    end_date: "2026-01-31",
    call_direction: "outbound",
    min_duration: 30,
    page: 1,
    per_page: 100,                  // max 100
});

const recent = await client.cdr.listRecentCdrs({ auth_id: AUTH_ID, limit: 25 });
const one = await client.cdr.getCdr({ auth_id: AUTH_ID, call_id: "CALL_ID" });
```

`searchCdrs` takes the same filters as `listCdrs`, and `exportCdrs` takes the same
filters without the paging arguments. Other filters available on all three:
`from_number`, `to_number`, `sip_call_id`, `bridge_uuid`, `hangup_cause`,
`hangup_disposition`, `context`, `campaign_id` and free-text `search`.

### Endpoints not yet surfaced as methods

`client.fetch(...)` performs a passthrough request using the client's configured
auth, base URL, retries and logging, and returns a standard `Response`:

```typescript
const res = await client.fetch("api/v1/Account/" + AUTH_ID + "/SomeNewEndpoint/", {
    method: "GET",
});
console.log(res.status, await res.json());
```

### Other resource groups

The same pattern — `client.<group>.<method>({ auth_id, ... })` — covers `account`,
`balance`, `phoneNumbers`, `applications`, `trunks`, `endpoints`, `credentials`,
`conference`, `conferences`, `conferenceMembers`, `conferenceRecording`,
`audioStreams`, `subAccounts`, `subAccountKyc`, `subAccountKycTestMode`,
`bulkOperations`, `ipAccessControlList`, `originationUri` and `partnerApi`.

## VobizXML

`vobizxml` builds the call-control documents Vobiz fetches from your `answer_url`. It
is a single self-contained module with no dependencies, so you can import it in a web
handler without constructing an API client.

```typescript
import { vobizxml } from "@vobiz/sdk";

const response = new vobizxml.ResponseElement();

const gather = response.addGather({
    action: "https://example.com/menu",
    method: "POST",
    inputType: "dtmf",
    numDigits: 1,
    executionTimeout: 10,
});
gather.addSpeak("Press 1 for sales, or 2 for support.");

response.addSpeak("We did not receive any input. Goodbye.");
response.addHangup();

console.log(response.toString());
```

That prints:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="https://example.com/menu" method="POST" inputType="dtmf" numDigits="1" executionTimeout="10">
        <Speak>Press 1 for sales, or 2 for support.</Speak>
    </Gather>
    <Speak>We did not receive any input. Goodbye.</Speak>
    <Hangup/>
</Response>
```

Points worth knowing:

- **Attribute keys are the camelCase VobizXML names, used verbatim.** Unlike the
  Python builder there is no snake_case conversion, so write `inputType` and
  `executionTimeout` exactly as they appear in the XML. `<Gather>` uses
  `executionTimeout`, not `timeout`.
- **`null` and `undefined` attributes are dropped**, so you can pass optional values
  through without guarding each one.
- **Booleans render as `true`/`false`**, and text plus attribute values are XML
  escaped for you.
- **`add*` helpers return the child element**, so you can keep nesting:
  `response.addDial().addNumber("+15550003333")`.
- **`{ ssml }` injects raw, unescaped content** into `<Speak>` when you need SSML
  markup.
- **`toString(false)` emits the document unindented** when you would rather not send
  whitespace over the wire.

Elements exported by the builder: `ResponseElement`, `SpeakElement`, `PlayElement`,
`WaitElement`, `GatherElement`, `DialElement`, `NumberElement`, `UserElement`,
`RecordElement`, `ConferenceElement`, `DtmfElement`, `RedirectElement`,
`HangupElement`, `PreAnswerElement` and `StreamElement`.

Migrating from Plivo? `addGetDigits()` and `addGetInput()` are kept as aliases for
`addGather()`, so `plivoxml` call sites keep working after the import change.

Serving it from Express:

```typescript
import express from "express";
import { vobizxml } from "@vobiz/sdk";

const app = express();

app.post("/answer", (_req, res) => {
    const r = new vobizxml.ResponseElement();
    r.addSpeak("Thanks for calling. Connecting you now.");
    r.addDial().addNumber("+15550003333");
    res.type("application/xml").send(r.toString());
});
```

## Configuration

### Environments and base URL

The client points at production by default. Set it explicitly, or point the client at
any base URL — `baseUrl` takes precedence over `environment`:

```typescript
import { VobizClient, VobizEnvironment } from "@vobiz/sdk";

const client = new VobizClient({
    token: "...", authId: "...", authToken: "...",
    environment: VobizEnvironment.Production,   // https://api.vobiz.ai
});

const local = new VobizClient({
    token: "...", authId: "...", authToken: "...",
    baseUrl: "http://localhost:8080",
});
```

### Client options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `authId` | `Supplier<string>` | required | Sent as `X-Auth-ID` |
| `authToken` | `Supplier<string>` | required | Sent as `X-Auth-Token` |
| `token` | `Supplier<string>` | required | Sent as `Authorization: Bearer …` |
| `environment` | `Supplier<VobizEnvironment \| string>` | `Production` | `https://api.vobiz.ai` |
| `baseUrl` | `Supplier<string>` | from `environment` | Overrides the environment URL |
| `headers` | `Record<string, string \| Supplier<…>>` | — | Extra headers on every request |
| `timeoutInSeconds` | `number` | 60 | Per-request timeout |
| `maxRetries` | `number` | 2 | Default retry attempts |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch implementation |
| `logging` | `LogConfig \| Logger` | silent | Client logging configuration |
| `auth` | `false \| fn \| AuthProvider \| { token }` | bearer | Override or disable auth |

### Per-request options

Every method takes an optional second argument:

| Option | Type | Description |
| --- | --- | --- |
| `timeoutInSeconds` | `number` | Overrides the client timeout |
| `maxRetries` | `number` | Overrides the client retry count |
| `abortSignal` | `AbortSignal` | Cancel the request yourself |
| `authId` / `authToken` | `string` | Act on behalf of another account |
| `queryParams` | `Record<string, unknown>` | Extra query string parameters |
| `headers` | `Record<string, …>` | Extra headers for this request |

```typescript
const controller = new AbortController();

await client.cdr.listCdrs(
    { auth_id: AUTH_ID, per_page: 100 },
    { timeoutInSeconds: 120, maxRetries: 1, abortSignal: controller.signal },
);
```

### Retries

Requests are retried with exponential backoff on **408**, **429** and all **5xx**
responses, twice by default
([`core/fetcher/requestWithRetries.ts`](./core/fetcher/requestWithRetries.ts)).

### Custom fetch

Pass your own `fetch` to run on a platform without a built-in implementation, or to
route requests through a proxy or an instrumented client:

```typescript
const client = new VobizClient({
    token: "...", authId: "...", authToken: "...",
    fetch: myInstrumentedFetch,
});
```

### Logging

```typescript
const client = new VobizClient({ ...options, logging: { level: "debug" } });
```

Logging is silent by default. Enable it when diagnosing a request, and remember that
debug output may include request metadata.

## Error handling

Any non-2xx response throws `VobizError`, which carries the status code, the parsed
body and the raw response:

```typescript
import { VobizError, VobizTimeoutError } from "@vobiz/sdk";

try {
    await client.calls.makeCall({
        auth_id: AUTH_ID,
        from: "14155551234",
        to: "+15550003333",
        answer_url: "https://example.com/answer",
        answer_method: "POST",
    });
} catch (err) {
    if (err instanceof VobizError) {
        console.log(err.statusCode);   // number | undefined
        console.log(err.body);         // parsed response body
        console.log(err.rawResponse);  // status, headers, url
        console.log(err.message);      // message + status code + body, pre-formatted
    } else if (err instanceof VobizTimeoutError) {
        console.log("timed out:", err.message);
    }
}
```

There is a single error class rather than one subclass per status, so branch on
`statusCode`:

| Status | Typical cause | Suggested handling |
| --- | --- | --- |
| 400 | Malformed or missing parameters | Fix the request; do not retry |
| 401 | Wrong Auth ID, Auth Token or bearer token | Re-check credentials |
| 403 | Credentials valid, operation not permitted | Check account permissions |
| 404 | Unknown call UUID, recording ID or account | Treat a live call as already ended |
| 409 | Resource already exists or is in a conflicting state | Reconcile, then retry |
| 422 | Understood but semantically invalid | Fix the request; do not retry |
| 429 | Rate limited | Back off; the SDK already retries twice |
| 5xx | Server-side failure | The SDK already retries; escalate if persistent |

`VobizTimeoutError` is thrown when a request exceeds `timeoutInSeconds`. An
`abortSignal` you trigger yourself surfaces as an `AbortError` from `fetch`.

### Raw response data

Every method returns a promise that also exposes `.withRawResponse()`, resolving to
both the parsed data and the response metadata — useful for reading rate-limit
headers:

```typescript
const { data, rawResponse } = await client.cdr
    .listCdrs({ auth_id: AUTH_ID, per_page: 10 })
    .withRawResponse();

console.log(rawResponse.status);
console.log(rawResponse.headers);
console.log(data);
```

## Pagination and async

The SDK is async throughout — every method returns a promise, and there is no
synchronous variant.

Listing methods paginate explicitly; there is no auto-paging iterator, so you drive
the loop yourself. Two conventions are in use:

- **`page` / `per_page`** — `cdr.listCdrs`, `cdr.searchCdrs` (`per_page` max 100)
- **`limit` / `offset`** — `recordings.listRecordings`; `cdr.listRecentCdrs` takes
  `limit` only

```typescript
for (let page = 1; ; page++) {
    const result = await client.cdr.listCdrs({ auth_id: AUTH_ID, page, per_page: 100 });
    const rows = result.data ?? [];
    if (rows.length === 0) break;
    for (const row of rows) {
        // ...
    }
}
```

Fan several requests out concurrently with `Promise.all`, and keep the concurrency
modest so you do not trip the rate limit:

```typescript
await Promise.all(
    callUuids.map((call_uuid) =>
        client.liveCalls.hangupCall({ auth_id: AUTH_ID, call_uuid }),
    ),
);
```

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Please provide 'token' when initializing the client` | `token` was omitted; the default bearer provider needs it | Pass `token`, or set `auth: false` if a gateway signs requests for you |
| `npm run build` prints `TS2339: Property 'error' does not exist on type 'APIResponse…'` | Known type-narrowing warnings in the generated client code | The build still emits a working `dist/`; see [Roadmap](#roadmap) for the clean type-check item |
| `npm i github:vobiz-ai/Vobiz-Node-SDK` installs but `dist/` is missing | `package.json` builds via `prepublishOnly`, which npm does not run for git installs | Clone the repo and run `npm install && npm run build`, then `npm link` |
| `ReferenceError: fetch is not defined` | Running on Node 16 or older, where `fetch` is not global | Upgrade to Node 18 or newer, or pass a `fetch` implementation via the `fetch` option |
| `ERR_REQUIRE_ESM` / `require() of ES Module` | The package is ESM-only (`"type": "module"`) | Use `import`, set `"type": "module"` in your `package.json`, or use a dynamic `import()` from CommonJS |
| 401 on every request | Auth ID, Auth Token or bearer token is wrong, or points at a different environment | Re-check all three; confirm `environment`/`baseUrl` is the intended host |
| 404 from `getLiveCall` or `hangupCall` | The call has already ended, so it is no longer in the live-call set | Treat 404 as "already finished"; look it up with `client.cdr.getCdr(...)` instead |
| `VobizTimeoutError` on a CDR export | Default 60 second timeout is shorter than the server needs | Raise it per request: `{ timeoutInSeconds: 300 }` |
| Type error on `auth_id` / `answer_url` | Client options are camelCase but request bodies are snake_case | Use `authId` in the constructor and `auth_id` inside the request object |
| `<Gather>` never fires the `action` callback | `timeout` was used instead of `executionTimeout` | Pass `executionTimeout` to `addGather()` |
| VobizXML renders as escaped text in the browser | The response was served as `text/html` | Serve `toString()` with `Content-Type: application/xml` |

## Other Vobiz SDKs

| Language | Repository | Package name |
| --- | --- | --- |
| Python | [Vobiz-Python-SDK](https://github.com/vobiz-ai/Vobiz-Python-SDK) | `vobiz` |
| Go | [Vobiz-Go-SDK](https://github.com/vobiz-ai/Vobiz-Go-SDK) | `github.com/vobiz-ai/Vobiz-Go-SDK` |
| Ruby | [Vobiz-Ruby-SDK](https://github.com/vobiz-ai/Vobiz-Ruby-SDK) | `vobiz` |
| C# / .NET | [Vobiz-Csharp-sdk](https://github.com/vobiz-ai/Vobiz-Csharp-sdk) | `Vobiz` |

All of them are generated from the same OpenAPI specification, so resource groups and
method names line up across languages once you allow for naming conventions.

## Versioning and stability

The library is at version `0.1.0`. While the major version is `0`, minor releases may
contain breaking changes as the generated surface tracks the API specification. Pin an
exact commit or tag in production and review the diff before upgrading.

The API surface is regenerated from the Vobiz OpenAPI specification, so sub-client and
method names can change when the specification changes. `vobizxml` is hand-written and
follows the `plivoxml` shape; it is the more stable half of the package.

## Roadmap

> Planned improvements to this library. Ideas and pull requests are welcome —
> open an issue to discuss anything here.

- [ ] Publish `@vobiz/sdk` to the npm registry, with a `prepare` script so
      `npm i github:vobiz-ai/Vobiz-Node-SDK` builds on install too.
- [ ] Adopt semantic versioning guarantees from `1.0.0` onward, with a documented
      deprecation window for generated method renames.
- [ ] Reach a clean `tsc` run — the generated clients currently emit `TS2339`
      narrowing warnings on `APIResponse` even though the emitted JavaScript works.
- [ ] Ship a CommonJS build alongside the ESM one, so the package can be `require`d
      from existing CJS projects.
- [ ] Auto-paging async iterators for `cdr.listCdrs` and `recordings.listRecordings`,
      so callers stop hand-rolling loops.
- [ ] Typed error subclasses per status code, surfacing the Vobiz error code and
      message as fields rather than an untyped `body`.
- [ ] Webhook signature verification helpers, so `answer_url` and callback handlers
      can validate that a request genuinely came from Vobiz.
- [ ] A test suite covering the `vobizxml` builder and a recorded-response contract
      suite for the generated client.

## Contributing

While we value open-source contributions to this SDK, this library is generated
programmatically. Additions made directly to this library would have to be moved over
to our generation code, otherwise they would be overwritten upon the next generated
release. Feel free to open a PR as a proof of concept, but know that we will not be
able to merge it as-is. We suggest opening an issue first to discuss with us!

On the other hand, contributions to the README and to the hand-written
[`vobizxml.ts`](./vobizxml.ts) builder are always very welcome.

To check your changes locally:

```sh
npm install
npm run build
```

## License

Released under the [MIT License](./LICENSE) © Vobiz.

MIT is permissive: you may use, modify, and redistribute this code, including in
closed-source commercial products, provided the copyright notice and licence text
are retained. There is no warranty. If your organisation needs a different
licensing arrangement, contact [piyush@vobiz.ai](mailto:piyush@vobiz.ai).

## Built by Team Vobiz

[Vobiz](https://vobiz.ai) is a programmable voice and SIP-trunking platform for
voice APIs, SIP trunking, and AI voice agents. This repository is built and
maintained by the Vobiz team.

**Maintainer:** Piyush Sahoo — [piyush@vobiz.ai](mailto:piyush@vobiz.ai) · [LinkedIn](https://www.linkedin.com/in/piyush-s713/)

Questions, or want to talk through an integration? Open an issue on this repo,
or reach out directly at [piyush@vobiz.ai](mailto:piyush@vobiz.ai).

**Useful links:** [Docs](https://docs.vobiz.ai) · [API reference](https://docs.vobiz.ai/api-reference) · [Sign up](https://vobiz.ai)
