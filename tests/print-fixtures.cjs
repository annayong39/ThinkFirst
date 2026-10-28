const fs = require('node:fs');
const vm = require('node:vm');
const c = { URL, Date };
c.window = c;
c.matchMedia = () => ({ matches: false });
vm.createContext(c);
for (const file of ['js/core.js', 'js/project-export.js', 'js/project-print.js'])
  vm.runInContext(fs.readFileSync(file, 'utf8'), c);

const sample = {
  version: 1, question: 'Social media has more influence than politicians. Discuss.',
  savedAt: '2026-10-24T04:00:00Z',
  state: {
    nodes: [{ id: 1, kind: 'term', phrase: 'Social media', summary: 'Public platforms can shape opinion and mobilise people.' }],
    arts: [{ id: 'a1', title: 'Example article', source: 'Example publication', summary: 'An example about public influence.', url: 'https://example.com/article', verified: true }],
    notes: [{ id: 'n1', text: 'Compare influence with political authority.', links: ['A:a1'] }],
    topicSentences: [
      { text: 'Platforms can mobilise public opinion.', evidence: [{ key: 'A:a1', kind: 'article', text: 'Example article' }] },
      { text: 'Politicians retain legal authority.', evidence: [] },
      { text: 'The effects depend on context.', evidence: [] }
    ],
    finalStand: 'Both shape outcomes, but their influence operates through different means.'
  }
};
const project = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : sample;
fs.mkdirSync('tmp/print-qa', { recursive: true });
fs.writeFileSync('tmp/print-qa/document.html', c.projectPrintHTML(project));
