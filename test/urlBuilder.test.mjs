import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildUrl,
  buildUrlByIndex,
  getBaseUrl,
} from '../src/lib/urlBuilder.js';

test('buildUrl: 有邮箱时使用 authuser=邮箱', () => {
  const url = buildUrl('gemini', { email: 'work@company.com' });
  assert.equal(url, 'https://gemini.google.com/?authuser=work%40company.com');
});

test('buildUrl: aistudio 同样拼 authuser', () => {
  const url = buildUrl('aistudio', { email: 'me@gmail.com' });
  assert.equal(url, 'https://aistudio.google.com/?authuser=me%40gmail.com');
});

test('buildUrl: 邮箱前后空格被裁剪', () => {
  const url = buildUrl('gemini', { email: '  a@b.com  ' });
  assert.equal(url, 'https://gemini.google.com/?authuser=a%40b.com');
});

test('buildUrl: 无邮箱时回退到 /u/<index>/', () => {
  assert.equal(buildUrl('gemini', { index: 2 }), 'https://gemini.google.com/u/2/');
  assert.equal(buildUrl('aistudio', { index: 0 }), 'https://aistudio.google.com/u/0/');
});

test('buildUrlByIndex: 非整数 index 回退为 0', () => {
  assert.equal(buildUrlByIndex('gemini', {}), 'https://gemini.google.com/u/0/');
  assert.equal(buildUrlByIndex('gemini', { index: 'x' }), 'https://gemini.google.com/u/0/');
});

test('getBaseUrl: 返回站点基础地址', () => {
  assert.equal(getBaseUrl('gemini'), 'https://gemini.google.com/');
  assert.equal(getBaseUrl('aistudio'), 'https://aistudio.google.com/');
});

test('未知站点抛错', () => {
  assert.throws(() => buildUrl('unknown', { email: 'a@b.com' }), /Unknown site/);
  assert.throws(() => buildUrlByIndex('unknown', { index: 0 }), /Unknown site/);
});
