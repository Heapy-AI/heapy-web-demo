// 작성자: 김진우 — 체험 인증의 계정 제한과 비밀번호 비노출을 검증한다.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const handler = require('../api/demo-login.js');

test('서버 체험 로그인은 지정 계정만 인증하고 비밀번호를 반환하지 않는다', async () => {
  const originalFetch = global.fetch;
  const originalPassword = process.env.HEAPY_DEMO_PASSWORD;
  const password = '검증용-서버-비밀번호';
  let calls = 0;
  let userId = 'e115c6ec-bc2d-46eb-af18-8cc3be723d8f';
  let upstreamOk = true;
  const invoke = async method => {
    const response = {
      headers: {},
      setHeader(key, value) { this.headers[key] = value; },
      status(value) { this.statusCode = value; return this; },
      json(body) { this.body = body; return this; },
    };
    await handler({ method, body: { email: '다른계정@example.com' } }, response);
    assert.match(response.headers['Cache-Control'], /no-store/);
    assert.ok(!JSON.stringify(response.body).includes(password));
    return response;
  };
  try {
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(url, 'https://13.125.12.94/api/auth/login');
      assert.equal(options.redirect, 'error');
      assert.deepEqual(JSON.parse(options.body), { email: 'test@gmail.com', password });
      return {
        ok: upstreamOk, status: upstreamOk ? 200 : 401,
        json: async () => ({ data: {
          accessToken: '검증-액세스', refreshToken: '검증-갱신', password,
          user: { userId, email: 'test@gmail.com', emailVerified: true },
          nextStep: 'home', onboardingStep: 6,
        } }),
      };
    };
    delete process.env.HEAPY_DEMO_PASSWORD;
    assert.equal((await invoke('GET')).statusCode, 405);
    assert.equal((await invoke('POST')).statusCode, 503);
    assert.equal(calls, 0);
    process.env.HEAPY_DEMO_PASSWORD = password;
    const success = await invoke('POST');
    assert.equal(success.statusCode, 200);
    assert.equal(success.body.data.user.userId, userId);
    assert.equal(success.body.data.accessToken, '검증-액세스');
    userId = '다른-계정';
    assert.equal((await invoke('POST')).statusCode, 502);
    upstreamOk = false;
    assert.equal((await invoke('POST')).statusCode, 503);
    global.fetch = async () => { throw new Error(password); };
    assert.equal((await invoke('POST')).statusCode, 503);
  } finally {
    global.fetch = originalFetch;
    if (originalPassword === undefined) delete process.env.HEAPY_DEMO_PASSWORD;
    else process.env.HEAPY_DEMO_PASSWORD = originalPassword;
  }
});
