/**
 * vobizxml - build VobizXML call-control documents in Node/TypeScript.
 *
 * Mirrors Plivo's `plivoxml` (ResponseElement + add* builders + toString()) and emits
 * XML byte-identical to the Python `vobizxml` package. Single self-contained file so it
 * compiles/runs cleanly when injected into `@vobiz/sdk` at publish time (no relative
 * imports to resolve). Option keys are the camelCase VobizXML attribute names directly.
 *
 *   import { vobizxml } from "@vobiz/sdk";
 *   const r = new vobizxml.ResponseElement();
 *   const g = r.addGather({ action: "https://app/menu", inputType: "dtmf",
 *                           numDigits: 1, executionTimeout: 10 });
 *   g.addSpeak("Press 1 for sales, 2 for support.");
 *   r.addHangup();
 *   console.log(r.toString());
 */

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const INDENT = "    "; // 4 spaces, matching the xml/*.mdx reference style

export type AttrValue = string | number | boolean | null | undefined;
export type Attrs = Record<string, AttrValue>;

export function attrValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function escape(text: string | number): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeAttr(value: string): string {
  return escape(value).replace(/"/g, "&quot;");
}

export class VobizXMLElement {
  name: string;
  content: string | null;
  raw: boolean;
  children: VobizXMLElement[] = [];
  attributes: Map<string, string> = new Map();

  constructor(name: string, content: string | null = null, attrs: Attrs = {}, raw = false) {
    this.name = name;
    this.content = content;
    this.raw = raw;
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      this.attributes.set(key, attrValue(value));
    }
  }

  /** Append a child element and return it (so callers can keep nesting). */
  add<T extends VobizXMLElement>(element: T): T {
    this.children.push(element);
    return element;
  }

  /** Set/override attributes after construction; returns this for chaining. */
  set(attrs: Attrs): this {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined) continue;
      this.attributes.set(key, attrValue(value));
    }
    return this;
  }

  private openTag(): string {
    const parts = [this.name];
    for (const [key, value] of this.attributes) {
      parts.push(`${key}="${escapeAttr(value)}"`);
    }
    return parts.join(" ");
  }

  render(level: number, pretty: boolean): string {
    const pad = pretty ? INDENT.repeat(level) : "";
    const openTag = this.openTag();

    if (this.children.length === 0 && this.content === null) {
      return `${pad}<${openTag}/>`;
    }
    if (this.children.length === 0) {
      const body = this.raw ? this.content! : escape(this.content!);
      return `${pad}<${openTag}>${body}</${this.name}>`;
    }
    if (pretty) {
      const inner = this.children.map((c) => c.render(level + 1, pretty)).join("\n");
      return `${pad}<${openTag}>\n${inner}\n${pad}</${this.name}>`;
    }
    const inner = this.children.map((c) => c.render(level + 1, pretty)).join("");
    return `<${openTag}>${inner}</${this.name}>`;
  }

  /** Serialize to a VobizXML document string (with the XML declaration). */
  toString(pretty = true): string {
    const body = this.render(0, pretty);
    return XML_DECLARATION + (pretty ? "\n" : "") + body;
  }
}

// --- Leaf / content elements -------------------------------------------------

export class SpeakElement extends VobizXMLElement {
  /** Pass `{ ssml }` to inject raw SSML unescaped. */
  constructor(content: string | null = null, attrs: Attrs & { ssml?: string } = {}) {
    const { ssml, ...rest } = attrs;
    if (ssml !== undefined) super("Speak", ssml, rest, true);
    else super("Speak", content, rest);
  }
}

export class PlayElement extends VobizXMLElement {
  constructor(url: string | null = null, attrs: Attrs = {}) {
    super("Play", url, attrs);
  }
}

export class WaitElement extends VobizXMLElement {
  constructor(attrs: Attrs = {}) {
    super("Wait", null, attrs);
  }
}

export class NumberElement extends VobizXMLElement {
  constructor(number: string | null = null, attrs: Attrs = {}) {
    super("Number", number, attrs);
  }
}

export class UserElement extends VobizXMLElement {
  constructor(sipUri: string | null = null, attrs: Attrs = {}) {
    super("User", sipUri, attrs);
  }
}

export class RecordElement extends VobizXMLElement {
  constructor(attrs: Attrs = {}) {
    super("Record", null, attrs);
  }
}

export class ConferenceElement extends VobizXMLElement {
  constructor(room: string | null = null, attrs: Attrs = {}) {
    super("Conference", room, attrs);
  }
}

export class DtmfElement extends VobizXMLElement {
  constructor(digits: string | null = null, attrs: Attrs = {}) {
    super("DTMF", digits, attrs);
  }
}

export class RedirectElement extends VobizXMLElement {
  constructor(url: string | null = null, attrs: Attrs = {}) {
    super("Redirect", url, attrs);
  }
}

export class HangupElement extends VobizXMLElement {
  constructor(attrs: Attrs = {}) {
    super("Hangup", null, attrs);
  }
}

export class StreamElement extends VobizXMLElement {
  constructor(url: string | null = null, attrs: Attrs = {}) {
    super("Stream", url, attrs);
  }
}

// --- Container elements ------------------------------------------------------

export class GatherElement extends VobizXMLElement {
  constructor(attrs: Attrs = {}) {
    super("Gather", null, attrs);
  }
  addSpeak(content?: string | null, attrs: Attrs & { ssml?: string } = {}): SpeakElement {
    return this.add(new SpeakElement(content ?? null, attrs));
  }
  addPlay(url?: string | null, attrs: Attrs = {}): PlayElement {
    return this.add(new PlayElement(url ?? null, attrs));
  }
}

export class PreAnswerElement extends VobizXMLElement {
  constructor() {
    super("PreAnswer", null, {});
  }
  addSpeak(content?: string | null, attrs: Attrs & { ssml?: string } = {}): SpeakElement {
    return this.add(new SpeakElement(content ?? null, attrs));
  }
  addPlay(url?: string | null, attrs: Attrs = {}): PlayElement {
    return this.add(new PlayElement(url ?? null, attrs));
  }
  addWait(attrs: Attrs = {}): WaitElement {
    return this.add(new WaitElement(attrs));
  }
}

export class DialElement extends VobizXMLElement {
  constructor(number: string | null = null, attrs: Attrs = {}) {
    super("Dial", number, attrs);
  }
  addNumber(number?: string | null, attrs: Attrs = {}): NumberElement {
    return this.add(new NumberElement(number ?? null, attrs));
  }
  addUser(sipUri?: string | null, attrs: Attrs = {}): UserElement {
    return this.add(new UserElement(sipUri ?? null, attrs));
  }
  addRecord(attrs: Attrs = {}): RecordElement {
    return this.add(new RecordElement(attrs));
  }
}

export class ResponseElement extends VobizXMLElement {
  constructor() {
    super("Response", null, {});
  }
  addSpeak(content?: string | null, attrs: Attrs & { ssml?: string } = {}): SpeakElement {
    return this.add(new SpeakElement(content ?? null, attrs));
  }
  addPlay(url?: string | null, attrs: Attrs = {}): PlayElement {
    return this.add(new PlayElement(url ?? null, attrs));
  }
  addWait(attrs: Attrs = {}): WaitElement {
    return this.add(new WaitElement(attrs));
  }
  addGather(attrs: Attrs = {}): GatherElement {
    return this.add(new GatherElement(attrs));
  }
  // Plivo-parity aliases: GetDigits/GetInput both map to <Gather>.
  addGetDigits(attrs: Attrs = {}): GatherElement {
    return this.addGather(attrs);
  }
  addGetInput(attrs: Attrs = {}): GatherElement {
    return this.addGather(attrs);
  }
  addDial(number?: string | null, attrs: Attrs = {}): DialElement {
    return this.add(new DialElement(number ?? null, attrs));
  }
  addRecord(attrs: Attrs = {}): RecordElement {
    return this.add(new RecordElement(attrs));
  }
  addConference(room?: string | null, attrs: Attrs = {}): ConferenceElement {
    return this.add(new ConferenceElement(room ?? null, attrs));
  }
  addDtmf(digits?: string | null, attrs: Attrs = {}): DtmfElement {
    return this.add(new DtmfElement(digits ?? null, attrs));
  }
  addRedirect(url?: string | null, attrs: Attrs = {}): RedirectElement {
    return this.add(new RedirectElement(url ?? null, attrs));
  }
  addHangup(attrs: Attrs = {}): HangupElement {
    return this.add(new HangupElement(attrs));
  }
  addPreanswer(): PreAnswerElement {
    return this.add(new PreAnswerElement());
  }
  addStream(url?: string | null, attrs: Attrs = {}): StreamElement {
    return this.add(new StreamElement(url ?? null, attrs));
  }
}

/** Namespace mirroring Plivo's `from plivo import plivoxml`. */
export const vobizxml = {
  VobizXMLElement,
  ResponseElement,
  SpeakElement,
  PlayElement,
  WaitElement,
  GatherElement,
  DialElement,
  NumberElement,
  UserElement,
  RecordElement,
  ConferenceElement,
  DtmfElement,
  RedirectElement,
  HangupElement,
  PreAnswerElement,
  StreamElement,
  escape,
  escapeAttr,
  attrValue,
};
