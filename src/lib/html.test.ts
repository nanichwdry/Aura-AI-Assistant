import { expect, test } from 'vitest';
import { escapeHtml } from './html';
test('printed conversation text cannot become executable HTML', () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & hello')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; hello');
});
