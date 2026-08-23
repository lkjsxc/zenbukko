import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseConfirmationTestPage } from '../src/services/confirmationTests.js';

const answerListPage = `<!doctype html><html><body>
<section class="exercise">
  <div class="statement"><p>Answer every question.</p></div>
  <div class="explanation"><p>Exercise explanation.</p></div>
  <ul>
    <li data-type="normal" data-item-id="normal-id">
      <div class="question"><p>Choose one.</p></div>
      <ul class="answers" data-type="perfect">
        <li data-correct="false" data-input-value="1"><p>First</p><br></li>
        <li data-correct="true" data-input-value="2"><p>Second</p><br></li>
      </ul>
    </li>
    <li data-type="fill_in" data-ref-name="fill-id">
      <div class="fill_in"><p>Fill the blank.</p></div>
      <ul class="answers" data-type="perfect">
        <li data-correct="true" data-input-value="3"><p>Third</p></li>
        <li data-correct="false" data-input-value="4"><p>Fourth</p></li>
      </ul>
    </li>
  </ul>
</section></body></html>`;

test('parseConfirmationTestPage captures NNN server-rendered answer lists', () => {
  const captured = parseConfirmationTestPage({
    chapterId: 1,
    testId: 2,
    title: 'Synthetic confirmation test',
    contentUrl: 'https://www.nnn.ed.nico/contents/exercises/2/result',
  }, answerListPage);

  assert.equal(captured.statementText, 'Answer every question.');
  assert.equal(captured.explanationText, 'Exercise explanation.');
  assert.equal(captured.questions.length, 2);
  assert.deepEqual(captured.questions[0], {
    id: 'normal-id',
    type: 'normal',
    answerMode: 'perfect',
    statementText: 'Choose one.',
    statementHtml: '<p>Choose one.</p>',
    choices: [
      { value: '1', text: 'First', html: '<p>First</p><br>', correct: false },
      { value: '2', text: 'Second', html: '<p>Second</p><br>', correct: true },
    ],
  });
  assert.deepEqual(captured.questions[1]?.choices.map(({ value, correct }) => ({ value, correct })), [
    { value: '3', correct: true },
    { value: '4', correct: false },
  ]);
  assert.equal(captured.questions[1]?.id, 'fill-id');
  assert.equal(captured.questions[1]?.type, 'fill_in');
  assert.equal(captured.questions[1]?.statementText, 'Fill the blank.');
});
