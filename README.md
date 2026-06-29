# Vobiz TypeScript SDK

The official TypeScript and Node.js SDK for [Vobiz](https://vobiz.ai) — an AI-first voice and telephony API platform for builders. Programmatically make and control calls, manage SIP trunks, phone numbers, conferences, recordings, and call flows with full TypeScript types and a single, consistent client.

## Quick links

- 📚 **Docs:** [https://docs.vobiz.ai](https://docs.vobiz.ai)
- 🔑 **Dashboard & credentials:** [https://console.vobiz.ai](https://console.vobiz.ai)
- ⚡ **Usage cheat-sheet:** [`./USAGE.md`](./USAGE.md)

---

## Features

The Vobiz TypeScript SDK provides comprehensive access to the Vobiz API, enabling you to build powerful voice applications with ease:

- **Programmatic Call Control:** Initiate, manage, and terminate calls, including live call manipulation.
- **In-Call Actions:** Perform actions during live calls such as playing audio, speaking text (TTS), sending DTMF tones, and recording calls.
- **Call Detail Records (CDRs):** Retrieve and search for detailed information about past calls.
- **Call Recordings:** Manage and access call recordings.
- **Phone Number Management:** List available numbers, purchase numbers from inventory, and assign them to trunks.
- **SIP Trunk Management:** Configure and manage SIP trunks for connecting to your telephony infrastructure.
- **Endpoint and Credential Management:** Define and manage SIP endpoints and associated credentials.
- **Conference Management:** Create, manage, and interact with conference calls, including muting and kicking members.
- **Application Management:** Create and manage Vobiz applications that define call flows.
- **Account & Balance:** Retrieve account details and monitor your balance and transaction history.
- **Full TypeScript Support:** Enjoy strong typing for all API requests and responses, enhancing developer experience and reducing errors.
- **Robust Error Handling & Retries:** Catch specific API errors and benefit from built-in exponential backoff for transient network issues.

---

## Requirements

- Node.js (version 16 or higher recommended)
- npm, yarn, or pnpm package manager

---

## Installation

Install the Vobiz TypeScript SDK using your preferred package manager:

```sh
npm install @vobiz/sdk
```

---

## Authentication

To authenticate with the Vobiz API, you need your **Auth ID** and **Auth Token**. These credentials can be found in your [Vobiz console](https://console.vobiz.ai). The SDK sends these as `X-Auth-ID` and `X-Auth-Token` HTTP headers, respectively. 

When initializing the `VobizClient`, pass them as `apiKey` and `authToken`. For production environments, it is highly recommended to load your credentials from environment variables rather than hard-coding them.

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: process.env.VOBIZ_AUTH_ID!,       // Maps to X-Auth-ID header
  authToken: process.env.VOBIZ_AUTH_TOKEN!, // Maps to X-Auth-Token header
});
```

---

## Quickstart

This example demonstrates how to initialize the client and make an outbound call. When the callee answers, Vobiz will fetch the `answer_url`, which should return [VobizXML](https://docs.vobiz.ai/xml-builder) to define the call flow.

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: process.env.VOBIZ_AUTH_ID!,
  authToken: process.env.VOBIZ_AUTH_TOKEN!,
});

const authId = process.env.VOBIZ_AUTH_ID!;

async function initiateCall() {
  try {
    const call = await client.calls.makeCall({
      auth_id: authId,
      from: "14155551234",                      // Your Vobiz number or SIP URI
      to: "+919876543210",                       // The destination number
      answer_url: "https://example.com/answer",  // URL for VobizXML
      answer_method: "POST",
    });
    console.log("Call initiated successfully:", call);
  } catch (error) {
    console.error("Failed to initiate call:", error);
  }
}

initiateCall();
```

> **Note on naming conventions:** Resources and client namespaces are `camelCase` (e.g., `client.liveCalls`), while request body fields are `snake_case` (e.g., `auth_id`, `answer_url`).

---

## Common operations

Here are more examples of common operations you can perform with the SDK. All snippets assume the client and `authId` are initialized as shown in the Quickstart.

### 1. Live Call Control

Retrieve active calls, fetch specific live call details, or hang up an ongoing call.

```ts
// List all active calls
const liveCalls = await client.liveCalls.listLiveCalls({ auth_id: authId });
console.log("Active Calls:", liveCalls);

// Get details of a specific live call
const callDetails = await client.liveCalls.getLiveCall({ 
  auth_id: authId, 
  call_uuid: "CALL_UUID" 
});

// Terminate an ongoing call
await client.liveCalls.hangupCall({ 
  auth_id: authId, 
  call_uuid: "CALL_UUID" 
});
```

### 2. In-Call Actions

Control the media and flow of an active call in real-time.

```ts
// Speak text to the participant (Text-to-Speech)
await client.speakText.call({
  auth_id: authId,
  call_uuid: "CALL_UUID",
  // Additional text/voice options can be provided here
});

// Play an audio file into the call
await client.playAudio.call({
  auth_id: authId,
  call_uuid: "CALL_UUID",
  // Additional audio URL options can be provided here
});

// Send DTMF tones (digits) to interact with IVRs
await client.dtmf.sendDtmf({
  auth_id: authId,
  call_uuid: "CALL_UUID",
  digits: "1234",
});

// Start and stop call recording
await client.recordCalls.startRecording({ auth_id: authId, call_uuid: "CALL_UUID" });
await client.recordCalls.stopRecording({ auth_id: authId, call_uuid: "CALL_UUID" });
```

### 3. CDRs & Recordings

Retrieve historical Call Detail Records (CDRs) and manage your call recordings.

```ts
// List and search CDRs
const cdrs = await client.cdr.listCdrs({ auth_id: authId });
const searchResults = await client.cdr.searchCdrs({ auth_id: authId });

// Get a single CDR by ID
const singleCdr = await client.cdr.getCdr({ auth_id: authId, call_id: "CALL_ID" });

// List and retrieve call recordings
const recordings = await client.recordings.listRecordings({ auth_id: authId });
const singleRecording = await client.recordings.getRecording({ auth_id: authId, recording_id: "REC_ID" });
```

### 4. Account & Balance

Monitor your account status, current balance, and transaction history.

```ts
// Retrieve account details
const accountInfo = await client.account.retrieveAccount();
console.log("Account Info:", accountInfo);

// Get current balance
const balance = await client.balance.getBalance({ auth_id: authId, currency: "INR" });
console.log("Current Balance:", balance);

// List transaction history
const transactions = await client.balance.listTransactions({ auth_id: authId });
console.log("Transactions:", transactions);
```

---

## Configuration

The `VobizClient` constructor allows for configuration of network-related settings:

- `timeoutInSeconds`: Sets the maximum time (in seconds) for a request to complete. Defaults to 60 seconds.
- `maxRetries`: Configures the number of automatic retries for failed requests due to transient network issues. Defaults to 2 retries with exponential backoff.

These options can be set globally for the client instance:

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({
  apiKey: process.env.VOBIZ_AUTH_ID!,
  authToken: process.env.VOBIZ_AUTH_TOKEN!,
  timeoutInSeconds: 30, // Set a 30-second timeout for all requests
  maxRetries: 5,        // Allow up to 5 retries on transient failures
});
```

---

## Error handling

All methods in the Vobiz TypeScript SDK return `Promise`s. Failed API requests or network issues will cause these promises to reject. You should wrap your API calls in standard `try/catch` blocks to handle these errors gracefully. 

```ts
try {
  const call = await client.calls.makeCall({
    auth_id: authId,
    from: "14155551234",
    to: "+919876543210",
    answer_url: "https://example.com/answer",
    answer_method: "POST",
  });
} catch (error) {
  // Handle network timeouts, invalid credentials, or non-2xx API responses
  console.error("An error occurred during the API call:", error);
}
```

---

## Other Vobiz SDKs

Vobiz provides official SDKs for several popular programming languages:

| Language | Repository |
| :--- | :--- |
| **Python** | [vobiz-ai/Vobiz-Python-SDK](https://github.com/vobiz-ai/Vobiz-Python-SDK) |
| **Go** | [vobiz-ai/Vobiz-Go-SDK](https://github.com/vobiz-ai/Vobiz-Go-SDK) |
| **Ruby** | [vobiz-ai/Vobiz-Ruby-SDK](https://github.com/vobiz-ai/Vobiz-Ruby-SDK) |
| **C#** | [vobiz-ai/Vobiz-Csharp-sdk](https://github.com/vobiz-ai/Vobiz-Csharp-sdk) |
| **Java** | [vobiz-ai/Vobiz-Java-SDK](https://github.com/vobiz-ai/Vobiz-Java-SDK) |
| **PHP** | [vobiz-ai/Vobiz-PHP-SDK](https://github.com/vobiz-ai/Vobiz-PHP-SDK) |

---

## Support

If you encounter any issues or have questions about the API, please refer to the [Vobiz Documentation](https://docs.vobiz.ai) or check your account settings in the [Vobiz Dashboard](https://console.vobiz.ai).

---

## License

This project is licensed under the MIT License.
