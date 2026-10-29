# Vobiz TypeScript SDK

The official TypeScript and JavaScript SDK for the [Vobiz](https://www.vobiz.ai) voice and messaging platform: programmable calls, conferences, call records and recordings, phone numbers, SIP trunking, sub-accounts, SMS, MMS and RCS, plus the VobizXML call-control builder. Generated from the Vobiz OpenAPI specification, so every endpoint and type matches the [API reference](https://www.vobiz.ai/docs/api-reference).

Works in Node.js 18 and newer, Bun, Deno and modern browsers (any runtime with a global `fetch`).

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
- [Authentication](#authentication)
- [VobizXML call control](#vobizxml-call-control)
- [Messaging](#messaging)
- [Exception handling](#exception-handling)
- [Advanced](#advanced)
  - [Raw response data](#raw-response-data)
  - [Retries](#retries)
  - [Timeouts and cancellation](#timeouts-and-cancellation)
  - [Custom headers, base URL and fetch](#custom-headers-base-url-and-fetch)
- [Reference](#reference)
- [Contributing](#contributing)

## Installation

The SDK is distributed from this repository. Clone it next to your project and install it as a local dependency:

```sh
git clone https://github.com/vobiz-ai/Vobiz-Node-SDK.git
cd your-project
npm install ../Vobiz-Node-SDK
```

The package is ESM (`"type": "module"`) and ships TypeScript types. Build it once after cloning if you want the compiled `dist/`:

```sh
cd Vobiz-Node-SDK && npm install && npm run build
```

## Usage

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: "MA_XXXXXXXX",        // your Auth ID, sent as the X-Auth-ID header
  authToken: "YOUR_AUTH_TOKEN", // your Auth Token, sent as the X-Auth-Token header
});

// Read the account
const account = await client.account.retrieveAccount();

// Place a call. Vobiz fetches answer_url when the call connects and runs the VobizXML it returns.
const call = await client.calls.makeCall({
  auth_id: "MA_XXXXXXXX",
  from: "14155551234",
  to: "+919876543210",
  answer_url: "https://example.com/answer",
  answer_method: "POST",
});
```

Resources hang off the client by API area: `client.account`, `client.calls`, `client.liveCalls`, `client.conferences`, `client.cdr`, `client.recordings`, `client.phoneNumbers`, `client.applications`, `client.endpoints`, `client.trunks`, `client.credentials`, `client.ipAccessControlList`, `client.originationUri`, `client.subAccounts`, `client.audioStreams`, `client.sms` and more. Every method is typed; your editor lists the request fields and the response shape.

Calls that place calls, send messages, buy or release numbers or change settings are billed to your account and affect live traffic. Run them with your own credentials and only when you mean to.

## Authentication

Every request carries the two headers the [Vobiz API](https://www.vobiz.ai/docs/authentication) expects. Find both values in the [Vobiz Console](https://console.vobiz.ai):

| Option | Header | Where to find it |
|---|---|---|
| `apiKey` | `X-Auth-ID` | Console → Dashboard → API credentials (the `MA_…` Auth ID) |
| `authToken` | `X-Auth-Token` | Same place; rotate it from the console if it is ever exposed |

Endpoints scoped to an account also take the Auth ID as the `auth_id` request field, as in the `makeCall` example above. Sub-account credentials (`SA_…`) work the same way.

Both options accept a function as well as a string, so you can resolve credentials at request time:

```ts
const client = new VobizClient({
  apiKey: () => process.env.VOBIZ_AUTH_ID!,
  authToken: () => process.env.VOBIZ_AUTH_TOKEN!,
});
```

Never commit credentials. Keep them in environment variables or a secret manager.

## VobizXML call control

Your `answer_url` must return [VobizXML](https://www.vobiz.ai/docs/xml). The bundled `vobizxml` builder produces it without hand-writing XML:

```ts
import { vobizxml } from "@vobiz/sdk";

const r = new vobizxml.ResponseElement();
const g = r.addGather({
  action: "https://yourapp.com/menu-choice",
  method: "POST",
  inputType: "dtmf",
  numDigits: 1,
  executionTimeout: 10,
});
g.addSpeak("Press 1 for sales, 2 for support, or 0 for an operator.");
r.addSpeak("We did not get your choice. Goodbye.");

response.type("application/xml").send(r.toXML()); // Express
```

Option keys are the camelCase VobizXML attribute names. Elements available: `Speak`, `Play`, `Gather`, `Dial` with `Number` and `User`, `Record`, `Conference`, `Dtmf`, `Redirect`, `Hangup`, `Stream`, `Wait` and `PreAnswer`. Pass `{ ssml: "<prosody …>…</prosody>" }` to `addSpeak` to emit raw SSML.

## Messaging

SMS, MMS and RCS live under `client.sms`, with `messages`, `conversations`, `broadcasts`, `campaigns`, `brands`, `numbers`, `optOuts`, `rcsSenders` and `coverage`. For example:

```ts
const messages = await client.sms.messages.listMessages({ limit: 20 });
```

See the [Messaging API reference](https://www.vobiz.ai/docs/sms/numbers) for channel requirements and compliance registration.

## Exception handling

A non-2xx response throws `VobizError`, which carries the HTTP status and the parsed body. Timeouts throw `VobizTimeoutError`.

```ts
import { VobizClient, VobizError, VobizTimeoutError } from "@vobiz/sdk";

try {
  await client.calls.makeCall({ /* ... */ });
} catch (err) {
  if (err instanceof VobizTimeoutError) {
    // retry later, or raise timeoutInSeconds
  } else if (err instanceof VobizError) {
    console.log(err.statusCode); // e.g. 401, 403, 429
    console.log(err.body);       // the error payload from Vobiz
    console.log(err.rawResponse?.headers.get("retry-after"));
  }
}
```

Rate limiting returns 429 with a `Retry-After` header; see [rate limits](https://www.vobiz.ai/docs/rate-limits).

## Advanced

### Raw response data

Every method returns an `HttpResponsePromise`. Call `.withRawResponse()` to get the headers and status alongside the parsed data:

```ts
const { data, rawResponse } = await client.account.retrieveAccount().withRawResponse();
console.log(rawResponse.status, rawResponse.headers.get("x-request-id"));
```

### Retries

Requests that fail with 408, 409, 429 or a 5xx status are retried with exponential backoff, twice by default. Change it per client or per request:

```ts
const client = new VobizClient({ apiKey: "...", authToken: "...", maxRetries: 0 });
await client.account.retrieveAccount({ maxRetries: 5 });
```

### Timeouts and cancellation

The default timeout is 60 seconds. Override it per client or per request, and pass an `AbortSignal` to cancel:

```ts
const client = new VobizClient({ apiKey: "...", authToken: "...", timeoutInSeconds: 30 });

const controller = new AbortController();
await client.cdr.listCdrs({ auth_id: "MA_XXXXXXXX" }, { timeoutInSeconds: 10, abortSignal: controller.signal });
```

### Custom headers, base URL and fetch

```ts
const client = new VobizClient({
  apiKey: "...",
  authToken: "...",
  headers: { "X-Request-Source": "billing-job" },
  baseUrl: "https://api.vobiz.ai", // the default; VobizEnvironment.Production
  fetch: myFetch,                  // any fetch-compatible implementation
});
```

## Reference

- [Vobiz API reference](https://www.vobiz.ai/docs/api-reference)
- [Authentication](https://www.vobiz.ai/docs/authentication)
- [VobizXML](https://www.vobiz.ai/docs/xml)
- [Webhooks (callbacks)](https://www.vobiz.ai/docs/concepts/webhooks)
- [Agent Skills for Vobiz](https://github.com/vobiz-ai/Agent-Skills) if you are building with an AI coding assistant
- [Vobiz MCP Server](https://www.vobiz.ai/docs/resources/vobiz-mcp) to drive the same API from Claude, ChatGPT, Cursor and other agents

## Contributing

This SDK is generated from `openapi.yaml` in the Vobiz documentation repository on every API change, so pull requests that edit generated files here are overwritten by the next sync. Report problems or request changes at [support@vobiz.ai](mailto:support@vobiz.ai) or by opening an issue on this repository. The `vobizxml` builder is hand-written and maintained in the same documentation repository under `sdk-extras/vobizxml-node`.

Released under the [MIT License](./LICENSE).
