# Vobiz Node.js Library

[![fern shield](https://img.shields.io/badge/%F0%9F%8C%BF-Built%20with%20Fern-brightgreen)](https://buildwithfern.com?utm_source=github&utm_medium=github&utm_campaign=readme&utm_source=Vobiz%2FNode)

The Vobiz Node.js library provides convenient access to the Vobiz APIs from TypeScript and JavaScript.

## Table of Contents

- [Installation](#installation)
- [Reference](#reference)
- [Usage](#usage)
- [Request and Response Types](#request-and-response-types)
- [VobizXML](#vobizxml)
- [Environments](#environments)
- [Exception Handling](#exception-handling)
- [Advanced](#advanced)
  - [Access Raw Response Data](#access-raw-response-data)
  - [Retries](#retries)
  - [Timeouts](#timeouts)
  - [Custom Fetch Implementation](#custom-fetch-implementation)
- [Contributing](#contributing)

## Installation

```sh
npm i -s @vobiz/sdk
```

The package ships as an ES module with bundled TypeScript declarations.

## Reference

A full reference for the underlying API is available at
[docs.vobiz.ai/api-reference](https://docs.vobiz.ai/api-reference).

## Usage

Instantiate and use the client with the following:

```typescript
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
    token: "<token>",
    authId: "<X-Auth-ID>",
    authToken: "<X-Auth-Token>",
});

const response = await client.calls.makeCall({
    auth_id: "MA_XXXXXX",
    from: "14155551234",
    to: "+919876543210",
    answer_url: "https://example.com/answer",
    answer_method: "POST",
});

console.log(response.request_uuid);
```

The client exposes one sub-client per API area, including `account`, `balance`, `calls`,
`liveCalls`, `cdr`, `subAccounts`, `subAccountKyc`, `phoneNumbers`, `trunks`, `conference`,
`conferences`, `conferenceMembers`, `conferenceRecording`, `recordCalls`, `recordings`,
`playAudio`, `speakText`, `dtmf`, `audioStreams`, `bulkOperations`, `credentials`,
`ipAccessControlList`, `originationUri`, `applications`, `endpoints`, and `partnerApi`.

For endpoints that are not yet surfaced as methods, `client.fetch(...)` performs a
passthrough request using the client's configured auth, retries, and logging.

## Request and Response Types

Every request and response type is exported under the `Vobiz` namespace, so you can
annotate values you build up before passing them to the client:

```typescript
import { Vobiz } from "@vobiz/sdk";

const request: Vobiz.MakeCallRequest = {
    auth_id: "MA_XXXXXX",
    from: "14155551234",
    to: "+919876543210",
    answer_url: "https://example.com/answer",
    answer_method: "POST",
};

const response: Vobiz.MakeCallResponse = await client.calls.makeCall(request);
```

## VobizXML

The package also exports `vobizxml`, a builder for VobizXML call-control documents:

```typescript
import { vobizxml } from "@vobiz/sdk";

const response = new vobizxml.ResponseElement();

const gather = response.addGather({
    action: "https://example.com/menu",
    inputType: "dtmf",
    numDigits: 1,
    executionTimeout: 10,
});
gather.addSpeak("Press 1 for sales, 2 for support.");

response.addHangup();

console.log(response.toString());
```

## Environments

The client points at the production environment by default. You can set it explicitly,
or point the client at any base URL:

```typescript
import { VobizClient, VobizEnvironment } from "@vobiz/sdk";

const client = new VobizClient({
    token: "<token>",
    authId: "<X-Auth-ID>",
    authToken: "<X-Auth-Token>",
    environment: VobizEnvironment.Production,
});
```

## Exception Handling

When the API returns a non-success status code (4xx or 5xx response), a `VobizError`
is thrown. It carries the status code, the parsed body, and the raw response.

```typescript
import { VobizError } from "@vobiz/sdk";

try {
    await client.calls.makeCall({
        auth_id: "MA_XXXXXX",
        from: "14155551234",
        to: "+919876543210",
        answer_url: "https://example.com/answer",
        answer_method: "POST",
    });
} catch (err) {
    if (err instanceof VobizError) {
        console.log(err.statusCode);
        console.log(err.message);
        console.log(err.body);
    }
}
```

A request that exceeds its configured timeout throws `VobizTimeoutError`, which is also
exported from the package root.

## Advanced

### Access Raw Response Data

Every method returns a promise that also exposes `.withRawResponse()`, which resolves to
both the parsed data and the raw response metadata (headers, status, URL).

```typescript
const { data, rawResponse } = await client.calls
    .makeCall({
        auth_id: "MA_XXXXXX",
        from: "14155551234",
        to: "+919876543210",
        answer_url: "https://example.com/answer",
        answer_method: "POST",
    })
    .withRawResponse();

console.log(rawResponse.status);
console.log(rawResponse.headers);
console.log(data.request_uuid);
```

### Retries

The SDK retries with exponential backoff on 408, 429, and 5XX responses. The default is
2 retries, configurable at the client level or per request.

```typescript
const client = new VobizClient({ ...options, maxRetries: 3 });

await client.calls.makeCall(request, { maxRetries: 1 });
```

### Timeouts

The SDK defaults to a 60 second timeout, configurable at the client level or per request.

```typescript
const client = new VobizClient({ ...options, timeoutInSeconds: 20 });

await client.calls.makeCall(request, { timeoutInSeconds: 5 });
```

You can also pass an `abortSignal` per request to cancel it yourself.

### Custom Fetch Implementation

Pass your own `fetch` to run on a platform without a built-in implementation, or to route
requests through a proxy or instrumented client.

```typescript
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
    token: "<token>",
    authId: "<X-Auth-ID>",
    authToken: "<X-Auth-Token>",
    fetch: myCustomFetch,
});
```

## Contributing

While we value open-source contributions to this SDK, this library is generated programmatically.
Additions made directly to this library would have to be moved over to our generation code,
otherwise they would be overwritten upon the next generated release. Feel free to open a PR as
a proof of concept, but know that we will not be able to merge it as-is. We suggest opening
an issue first to discuss with us!

On the other hand, contributions to the README are always very welcome!

---

## Built by Team Vobiz

[Vobiz](https://vobiz.ai) is a programmable voice & SIP-trunking platform for
voice APIs, SIP trunking, and AI voice agents. This is the official Vobiz Node.js SDK, built and
maintained by the Vobiz team.

**Maintainer:** Piyush Sahoo — [piyush@vobiz.ai](mailto:piyush@vobiz.ai) · [LinkedIn](https://www.linkedin.com/in/piyush-s713/)

Questions, or want to talk through an integration? Open an issue on this repo,
or reach out directly at [piyush@vobiz.ai](mailto:piyush@vobiz.ai).

**Useful links:** [Docs](https://docs.vobiz.ai) · [API reference](https://docs.vobiz.ai/api-reference) · [Sign up](https://vobiz.ai)

## License

[MIT](./LICENSE) © Vobiz
