import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { downloadConfirmationTests, parseConfirmationTestPage } from '../src/services/confirmationTests.js';

const testPage = `<!doctype html><html><body>
<script id="kokuban-init" type="application/json">${JSON.stringify({
  materialMeta: { learningMaterialCode: 'TZGEJGK', type: 'evaluation_exercises', title: 'Fallback title' },
  userContext: {
    passed: true,
    history: { first: { score: 2 } },
    answers: {
      'qid-1': { answering: '3', isCorrect: true },
      'word-id': { answering: '0.48', isCorrect: false },
      'another-id': { answering: 'must-not-leak', isCorrect: true },
    },
  },
})}</script>
<section class="exercise">
  <div class="statement"><p> クロス集計表について 答えてください。 </p></div>
  <ul>
    <li class="exercise-item" data-type="normal">
      <span class="shoumon-badge" data-testid="shoumon-badge-correct"></span>
      <label class="choice-options__option"><input name="qid-1" value="1"><span class="choice-options__option__value"><b>誤り</b></span></label>
      <label class="choice-options__option"><input name="qid-1" value="3"><span class="choice-options__option__value">正解</span></label>
    </li>
    <li class="exercise-item" data-type="word">
      <input type="text" class="answers" value="">
      <div class="explanation"><p> 0.48 が答えです。 </p></div>
    </li>
    <li class="exercise-item" data-type="normal"><input name="unanswered-id"></li>
  </ul>
</section></body></html>`;

test('parseConfirmationTestPage captures questions, answers, correctness, and explanations', () => {
  const captured = parseConfirmationTestPage({
    chapterId: 123,
    testId: 456,
    title: 'クロス集計表 確認テスト',
    contentUrl: 'https://www.nnn.ed.nico/contents/exercises/456/result',
  }, testPage);

  assert.equal(captured.title, 'クロス集計表 確認テスト');
  assert.equal(captured.materialType, 'evaluation_exercises');
  assert.equal(captured.learningMaterialCode, 'TZGEJGK');
  assert.equal(captured.passed, true);
  assert.deepEqual(captured.history, { first: { score: 2 } });
  assert.equal(captured.statementText, 'クロス集計表について 答えてください。');
  assert.match(captured.statementHtml ?? '', /<p>/);
  assert.deepEqual(captured.questions[0], {
    id: 'qid-1',
    type: 'normal',
    badge: 'shoumon-badge-correct',
    choices: [
      { value: '1', text: '誤り', html: '<b>誤り</b>' },
      { value: '3', text: '正解', html: '正解' },
    ],
    userAnswer: '3',
    isCorrect: true,
  });
  assert.equal(captured.questions[1]?.id, 'word-id');
  assert.equal(captured.questions[1]?.userAnswer, '0.48');
  assert.equal(captured.questions[1]?.isCorrect, false);
  assert.equal(captured.questions[1]?.explanationText, '0.48 が答えです。');
  assert.equal(captured.questions[2]?.id, 'unanswered-id');
  assert.equal(captured.questions[2]?.userAnswer, undefined);
});

test('downloadConfirmationTests writes every chapter with captured tests and explicit failures', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'zenbukko-confirmation-tests-'));
  const warnings: string[] = [];
  const infos: string[] = [];
  const outputs = await downloadConfirmationTests({
    tests: [
      { chapterId: 10, testId: 1, title: '確認テスト 1', contentUrl: 'https://www.nnn.ed.nico/test/1' },
      { chapterId: 10, testId: 2, title: '確認テスト 2' },
      { chapterId: 20, testId: 3, title: '確認テスト 3', contentUrl: 'https://www.nnn.ed.nico/test/3' },
      { chapterId: 20, testId: 4, title: '確認テスト 4', contentUrl: 'https://example.test/steal' },
    ],
    courseDir: root,
    chapterDirNameForId: (id) => id === 10 ? '01' : '02',
    headers: { cookie: 'private' },
    logger: { info: (message) => infos.push(message), warn: (message) => warnings.push(message) },
    fetchImpl: (async (input, init) => {
      assert.equal(new Headers(init?.headers).get('cookie'), 'private');
      return String(input).endsWith('/3') ? new Response('', { status: 503 }) : new Response(testPage);
    }) as typeof fetch,
  });

  assert.deepEqual(outputs, [
    path.join(root, '01', 'chapter-10_confirmation_tests.json'),
    path.join(root, '02', 'chapter-20_confirmation_tests.json'),
  ]);
  const chapter10 = JSON.parse(await fs.readFile(outputs[0]!, 'utf8')) as Record<string, unknown>;
  const chapter20 = JSON.parse(await fs.readFile(outputs[1]!, 'utf8')) as Record<string, unknown>;
  assert.equal((chapter10.tests as unknown[]).length, 1);
  assert.deepEqual(chapter10.failures, [{ id: 2, title: '確認テスト 2', message: 'content URL is missing' }]);
  assert.deepEqual(chapter20.failures, [{
    id: 3,
    title: '確認テスト 3',
    sourceUrl: 'https://www.nnn.ed.nico/test/3',
    message: 'HTTP 503',
  }, {
    id: 4,
    title: '確認テスト 4',
    sourceUrl: 'https://example.test/steal',
    message: 'content URL must be an HTTPS URL on nnn.ed.nico',
  }]);
  assert.match(String(chapter10.generatedAt), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(warnings.length, 3);
  assert.equal(infos.length, 2);
});
