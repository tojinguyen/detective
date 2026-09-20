import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders the Vietnamese game with production metadata and first playable controls", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /<title>E·RASE — Chiếc huy hiệu biến mất<\/title>/);
  assert.match(html, /lang="vi"/);
  assert.match(html, /Hồ sơ/);
  assert.match(html, /Tìm người đã di chuyển huy hiệu/);
  assert.match(html, /MỐC (?:<!-- -->)?16:12/);
  assert.doesNotMatch(html, /Thu thập 4 chứng cứ/);
  assert.match(html, /Khám phá/);
  assert.match(html, /Phòng học/);
  assert.match(html, /Buồng an ninh/);
  assert.match(html, /room-classroom\.png/);
  assert.match(html, /room-security\.png/);
  assert.match(html, /5(?:<!-- -->)? nhân vật/);
  assert.doesNotMatch(html, /nghi phạm|thủ phạm|hung thủ|buộc tội/i);
  assert.match(html, /VỤ ÁN/);
  assert.match(html, /TÚI CHỨNG CỨ/);
  assert.match(html, /tự di chuyển/);
  assert.doesNotMatch(html, /WASD/);
  assert.doesNotMatch(html, /Cụm phím di chuyển/);
  assert.match(html, /Điều tra/);
});

test("bundles every local CSS resource, including mathematical fonts", () => {
  const client = fileURLToPath(new URL("../dist/client", import.meta.url));
  const paths = readdirSync(client, { recursive: true }).filter(p => p.endsWith('.css'));
  let fontCount = 0;
  for (const relative of paths) {
    const path = resolve(client, relative);
    for (const match of readFileSync(path, 'utf8').matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) {
      const asset = match[1];
      if (/^(?:data:|https?:|#)/.test(asset)) continue;
      const target = asset.startsWith('/') ? resolve(client, '.' + asset) : resolve(dirname(path), asset);
      assert.ok(existsSync(target), 'Missing CSS resource: ' + asset);
      if (/KaTeX.*\.woff2/.test(asset)) fontCount++;
    }
  }
  assert.ok(fontCount > 0, 'Mathematical fonts are included in the output');
});
