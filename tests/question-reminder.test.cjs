const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/render.js', 'utf8');
const reminderCode = source.slice(source.indexOf('function updateQuestionReminder(){'), source.indexOf("window.addEventListener('scroll', queueQuestionReminder"));
let questionBottom = 180;
let onboarding = false;
const reminder = { hidden: true, textContent: '' };
const elements = {
  'question-reminder': reminder,
  qcard: { getBoundingClientRect() { return { bottom: questionBottom }; } }
};
const context = {
  S: { q: 'Social media has more influence than politicians. Discuss.' },
  $(id) { return elements[id]; },
  document: {
    body: { classList: { contains(name) { return name === 'onb' && onboarding; } } },
    querySelector(selector) {
      assert.equal(selector, '.top');
      return { getBoundingClientRect() { return { bottom: 64 }; } };
    }
  }
};
vm.createContext(context);
vm.runInContext(reminderCode, context);

context.updateQuestionReminder();
assert.equal(reminder.hidden, true, 'The reminder stays hidden while the original question is visible');
questionBottom = 60;
context.updateQuestionReminder();
assert.equal(reminder.hidden, false, 'The reminder appears after the original passes behind the header');
assert.equal(reminder.textContent, context.S.q);
context.S.q = 'A different essay question?';
context.updateQuestionReminder();
assert.equal(reminder.textContent, context.S.q, 'The reminder follows a changed question');
onboarding = true;
context.updateQuestionReminder();
assert.equal(reminder.hidden, true, 'The reminder does not appear on the start page');
onboarding = false;
questionBottom = 170;
context.updateQuestionReminder();
assert.equal(reminder.hidden, true, 'It disappears when the original question returns');
console.log('PASS: essay question reminder follows scroll position and current question');
