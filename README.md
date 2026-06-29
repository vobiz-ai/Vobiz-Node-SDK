# Vobiz TypeScript SDK

The official TypeScript / Node.js SDK for [Vobiz](https://vobiz.ai) — an AI-first voice & telephony API platform for builders. Programmatically make and control calls, manage SIP trunks, phone numbers, conferences, recordings, and call flows, with full TypeScript types and a single, consistent client.

## Quick links

- 📚 **Docs:** https://docs.vobiz.ai
- 🔑 **Dashboard & credentials:** https://console.vobiz.ai
- 📖 **Full API reference:** https://docs.vobiz.ai
- ⚡ **Usage cheat-sheet:** [`./USAGE.md`](./USAGE.md)

## Installation

```sh
npm install @vobiz/sdk
```

```sh
yarn add @vobiz/sdk
```

```sh
pnpm add @vobiz/sdk
```

## Authentication

Authenticate with your account **Auth ID** and **Auth Token** from the [Vobiz console](https://console.vobiz.ai). They are sent as the `X-Auth-ID` and `X-Auth-Token` headers — pass them as `apiKey` and `authToken` respectively:

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: process.env.VOBIZ_AUTH_ID!,       // → X-Auth-ID
  authToken: process.env.VOBIZ_AUTH_TOKEN!, // → X-Auth-Token
});
```

We recommend loading credentials from environment variables rather than hard-coding them in source.

## Quickstart — make a call

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: process.env.VOBIZ_AUTH_ID!,
  authToken: process.env.VOBIZ_AUTH_TOKEN!,
});

const authId = process.env.VOBIZ_AUTH_ID!;

await client.calls.makeCall({
  auth_id: authId,
  from: "14155551234",
  to: "+919876543210",
  answer_url: "https://example.com/answer", // returns VobizXML
  answer_method: "POST",
});
```

When the callee answers, Vobiz fetches `answer_url`, which should return [VobizXML](https://docs.vobiz.ai/xml-builder) describing the call flow. See [`./USAGE.md`](./USAGE.md) for more examples covering live calls, recordings, phone numbers, conferences, and more.

> Resources are camelCase (`client.liveCalls`); request-body fields are snake_case (`auth_id`, `answer_url`).

## What you can do

| Area | Client namespace |
|------|------------------|
| Calls & live calls | `client.calls`, `client.liveCalls` |
| In-call actions | `client.playAudio`, `client.speakText`, `client.dtmf`, `client.recordCalls` |
| Call detail records & recordings | `client.cdr`, `client.recordings` |
| Phone numbers | `client.phoneNumbers` |
| Trunks / endpoints / credentials | `client.trunks`, `client.endpoints`, `client.credentials` |
| Conferences | `client.conference`, `client.conferences`, `client.conferenceMembers` |
| Applications | `client.applications` |
| Sub-accounts & KYC | `client.subAccounts`, `client.subAccountKyc` |
| Account & balance | `client.account`, `client.balance` |

## Async & error handling

Every method returns a `Promise`. Failed requests throw a typed `VobizError` exposing the HTTP `statusCode` and parsed `body`; request timeouts throw a `VobizTimeoutError`.

```ts
import { VobizClient, VobizError, VobizTimeoutError } from "@vobiz/sdk";

try {
  await client.calls.makeCall({ /* ... */ });
} catch (err) {
  if (err instanceof VobizTimeoutError) {
    console.error("Request timed out");
  } else if (err instanceof VobizError) {
    console.error(err.statusCode, err.body);
  } else {
    throw err;
  }
}
```

Requests are automatically retried with exponential backoff (defaults to 2 retries). You can tune `maxRetries` and `timeoutInSeconds` per-client or per-request.

## Other SDKs

Vobiz ships official SDKs for every major language — all under [github.com/vobiz-ai](https://github.com/vobiz-ai):

| Language | Repository |
|----------|------------|
| Python | [Vobiz-Python-SDK](https://github.com/vobiz-ai/Vobiz-Python-SDK) |
| Go | [Vobiz-Go-SDK](https://github.com/vobiz-ai/Vobiz-Go-SDK) |
| Java | [Vobiz-Java-SDK](https://github.com/vobiz-ai/Vobiz-Java-SDK) |
| Ruby | [Vobiz-Ruby-SDK](https://github.com/vobiz-ai/Vobiz-Ruby-SDK) |
| C# | [Vobiz-Csharp-sdk](https://github.com/vobiz-ai/Vobiz-Csharp-sdk) |
| PHP | [Vobiz-PHP-SDK](https://github.com/vobiz-ai/Vobiz-PHP-SDK) |

## License

MIT
