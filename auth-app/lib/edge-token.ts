// middleware（Edge Runtime）用のトークン検証。
// Edge では node:crypto が使えないため、Web Crypto API で HS256 を検証する。
// 署名形式は lib/crypto.ts の signToken と同一（base64url の header.payload.signature）。

const encoder = new TextEncoder();

// 返り値の型注釈はあえて付けない。`Uint8Array` と書くと `ArrayBufferLike` 版に
// 広がってしまい、crypto.subtle が要求する BufferSource に代入できなくなる。
function fromB64Url(s: string) {
  let t = s.replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "="; // pad to multiple of 4
  const bin = atob(t);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function isExpired(payloadJson: string): boolean {
  const parsed: unknown = JSON.parse(payloadJson);
  if (typeof parsed !== "object" || parsed === null) return true;
  const exp = (parsed as { exp?: unknown }).exp;
  // signToken は exp を秒単位で入れている。exp が無いトークンは期限なし扱い。
  if (typeof exp !== "number") return false;
  return Date.now() / 1000 > exp;
}

/**
 * 署名と有効期限を検証する。改ざん・期限切れ・形式不正はすべて false。
 * 例外は握りつぶして false を返すので、呼び出し側で try/catch は不要。
 */
export async function verifyTokenEdge(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signatureOk = await crypto.subtle.verify(
      "HMAC",
      key,
      fromB64Url(signature),
      encoder.encode(`${header}.${payload}`)
    );
    if (!signatureOk) return false;

    return !isExpired(new TextDecoder().decode(fromB64Url(payload)));
  } catch {
    return false;
  }
}
