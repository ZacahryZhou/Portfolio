const test = require('node:test');
const assert = require('node:assert');
const { generate, describe } = require('../src/fakeClient');

test('same seed gives the same client', () => {
  assert.deepStrictEqual(generate(42), generate(42));
});

test('different seeds give different clients', () => {
  assert.notDeepStrictEqual(generate(1), generate(2));
});

test('client has the fields the forms need, in a valid shape', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const c = generate(seed);
    assert.match(c.uci, /^\d{10}$/);
    assert.match(c.dob, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(c.email, /^[^@\s]+@example\.com$/);
    assert.match(c.address.postalCode, /^[ABCEGHJKLMNPRSTVXY]\d[ABCEGHJKLMNPRSTVWXYZ] \d[ABCEGHJKLMNPRSTVWXYZ]\d$/);
    assert.ok(c.givenName && c.familyName && c.passportNumber && c.address.line1);
  }
});

test('describe masks personal values when asked', () => {
  const c = generate(7);
  const masked = describe(c, true);
  assert.ok(!masked.includes(c.givenName) && !masked.includes(c.uci));
  assert.ok(describe(c, false).includes(c.uci));
});
