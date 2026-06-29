# Vobiz TypeScript SDK — Usage Sheet

Common operations. Resources are camelCase (`client.liveCalls`), request-body fields are
snake_case (`auth_id`, `answer_url`).

All snippets assume:

```ts
import { VobizClient } from "@vobiz/sdk";

const client = new VobizClient({ apiKey: "YOUR_AUTH_ID", authToken: "YOUR_AUTH_TOKEN" });
const authId = "YOUR_AUTH_ID";
```

All methods return a `Promise`.

## Calls

```ts
await client.calls.makeCall({
  auth_id: authId, from: "14155551234", to: "+919876543210",
  answer_url: "https://example.com/answer", answer_method: "POST",
});

await client.liveCalls.listLiveCalls({ auth_id: authId });
await client.liveCalls.getLiveCall({ auth_id: authId, call_uuid: "CALL_UUID" });
await client.liveCalls.hangupCall({ auth_id: authId, call_uuid: "CALL_UUID" });
```

## In-call actions

```ts
await client.playAudio.call({ auth_id: authId, call_uuid: "CALL_UUID", ... });
await client.speakText.call({ auth_id: authId, call_uuid: "CALL_UUID", ... });
await client.dtmf.sendDtmf({ auth_id: authId, call_uuid: "CALL_UUID", ... });
await client.recordCalls.startRecording({ auth_id: authId, call_uuid: "CALL_UUID" });
await client.recordCalls.stopRecording({ auth_id: authId, call_uuid: "CALL_UUID" });
```

## CDRs & Recordings

```ts
await client.cdr.listCdrs({ auth_id: authId });
await client.cdr.searchCdrs({ auth_id: authId });
await client.cdr.getCdr({ auth_id: authId, call_id: "CALL_ID" });
await client.recordings.listRecordings({ auth_id: authId });
await client.recordings.getRecording({ auth_id: authId, recording_id: "REC_ID" });
```

## Phone Numbers

```ts
await client.phoneNumbers.listNumbers({ auth_id: authId });
await client.phoneNumbers.listInventoryNumbers({ auth_id: authId });
await client.phoneNumbers.purchaseFromInventory({ auth_id: authId, ... });
await client.phoneNumbers.assignNumberToTrunk({ auth_id: authId, ... });
```

## Applications, Trunks, Endpoints

```ts
await client.applications.listApplications({ auth_id: authId });
await client.applications.createApplication({ auth_id: authId, ... });
await client.trunks.listTrunks({ auth_id: authId });
await client.endpoints.listEndpoints({ auth_id: authId });
```

## Conferences

```ts
await client.conferences.listConferences({ auth_id: authId });
await client.conferenceMembers.muteMember({ auth_id: authId, ... });
await client.conference.kickMember({ auth_id: authId, ... });
```

## Account & Balance

```ts
await client.account.retrieveAccount();
await client.balance.getBalance({ auth_id: authId, currency: "INR" });
await client.balance.listTransactions({ auth_id: authId });
```

> Exact request fields per method are documented at https://docs.vobiz.ai.
