// Node-Loader für die Tests: ersetzt, was nur im Worker-Bundle existiert
// (WASM, Fonts, satori/resvg aus dem OG-Bild) durch leere Stubs. Alles andere
// lädt Node unverändert, die Tests laufen also gegen den echten Worker-Code.
import { register } from "node:module";

const STUBS = {
  "satori/standalone": "export default async () => ''; export const init = () => {};",
  "@resvg/resvg-wasm": "export class Resvg { render() { return { asPng: () => new Uint8Array() }; } } export const initWasm = async () => {};",
};

register("data:text/javascript," + encodeURIComponent(`
  const STUBS = ${JSON.stringify(STUBS)};
  export async function resolve(spec, ctx, next) {
    if (spec in STUBS) return { url: "stub:" + spec, shortCircuit: true };
    if (/\\.(wasm|ttf)$/.test(spec)) return { url: "stub:asset", shortCircuit: true };
    return next(spec, ctx);
  }
  export async function load(url, ctx, next) {
    if (url.startsWith("stub:")) {
      const spec = url.slice(5);
      return { format: "module", source: STUBS[spec] || "export default null;", shortCircuit: true };
    }
    return next(url, ctx);
  }
`));
