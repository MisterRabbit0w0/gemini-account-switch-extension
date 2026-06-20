import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseListAccounts, DetectError } from '../src/lib/detector.js';

// ListAccounts 响应：XSSI 前缀 + ["gaia.l.a.r", [ ...账号... ]]
const sample =
  ")]}'\n" +
  JSON.stringify([
    'gaia.l.a.r',
    [
      ['gaia.l.a', 1, 'alice@gmail.com', 'Alice', 'https://photo/a'],
      ['gaia.l.a', 1, 'bob@gmail.com', 'Bob', 'https://photo/b'],
    ],
  ]);

test('parseListAccounts: 剥离 XSSI 前缀并解析账号', () => {
  const accounts = parseListAccounts(sample);
  assert.equal(accounts.length, 2);
  assert.deepEqual(accounts[0], {
    email: 'alice@gmail.com',
    name: 'Alice',
    index: 0,
  });
  assert.equal(accounts[1].index, 1);
});

test('parseListAccounts: 无前缀的纯 JSON 也能解析', () => {
  const noPrefix = JSON.stringify(['gaia.l.a.r', [['x', 1, 'c@d.com', 'C']]]);
  assert.equal(parseListAccounts(noPrefix)[0].email, 'c@d.com');
});

test('parseListAccounts: 列表为空返回空数组', () => {
  assert.deepEqual(parseListAccounts(")]}'\n" + JSON.stringify(['r', []])), []);
});

test('parseListAccounts: 缺邮箱的条目被过滤', () => {
  const data = JSON.stringify(['r', [['x', 1, '', 'NoEmail']]]);
  assert.deepEqual(parseListAccounts(data), []);
});

test('parseListAccounts: 非 JSON（登录页）抛 parse 错误', () => {
  assert.throws(() => parseListAccounts('<!DOCTYPE html><html>login</html>'), (e) => {
    assert.ok(e instanceof DetectError);
    assert.equal(e.reason, 'parse');
    return true;
  });
});

test('parseListAccounts: 结构不符抛 shape 错误', () => {
  assert.throws(() => parseListAccounts(JSON.stringify(['only-one-element'])), (e) => {
    assert.ok(e instanceof DetectError);
    assert.equal(e.reason, 'shape');
    return true;
  });
});
