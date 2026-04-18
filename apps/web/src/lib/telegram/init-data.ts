import { createHash, createHmac } from 'node:crypto';

const MAX_AUTH_AGE_SECONDS = 60 * 60;

export interface VerifyInitDataResult {
  ok: boolean;
  user?: {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
    languageCode?: string;
  };
  authDate?: number;
  error?: 'missing' | 'invalid-hash' | 'expired' | 'malformed';
}

export function verifyInitData(initData: string, botToken: string): VerifyInitDataResult {
  if (!initData) return { ok: false, error: 'missing' };
  if (!botToken) return { ok: false, error: 'missing' };

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) return { ok: false, error: 'malformed' };

  params.delete('hash');

  const checkString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Telegram's HMAC recipe: secretKey = HMAC_SHA256("WebAppData", botToken)
  // then hash = HMAC_SHA256(secretKey, checkString).
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = createHmac('sha256', secretKey).update(checkString).digest('hex');

  if (!timingSafeEqualHex(expectedHash, receivedHash)) {
    return { ok: false, error: 'invalid-hash' };
  }

  const authDateRaw = params.get('auth_date');
  const authDate = authDateRaw ? Number(authDateRaw) : NaN;
  if (!Number.isFinite(authDate)) return { ok: false, error: 'malformed' };

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: 'expired' };
  }

  const userRaw = params.get('user');
  let user: VerifyInitDataResult['user'];
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as {
        id: number;
        username?: string;
        first_name: string;
        last_name?: string;
        language_code?: string;
      };
      user = {
        id: parsed.id,
        username: parsed.username,
        firstName: parsed.first_name,
        lastName: parsed.last_name,
        languageCode: parsed.language_code,
      };
    } catch {
      return { ok: false, error: 'malformed' };
    }
  }

  return { ok: true, user, authDate };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  const aHash = createHash('sha256').update(aBuf).digest();
  const bHash = createHash('sha256').update(bBuf).digest();
  let diff = 0;
  for (let i = 0; i < aHash.length; i++) {
    diff |= (aHash[i] ?? 0) ^ (bHash[i] ?? 0);
  }
  return diff === 0;
}
