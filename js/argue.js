/* The first Argue step: three topic sentences with an Evidence branch each. */
var TOPIC_SELECT_PROMPT = "Let's select the evidence that will help you craft your topic sentences! Go back to the evidence layer and click on the evidence cards";
var TOPIC_SELECT_AGAIN_PROMPT = "Once again, let's select the relevant evidence for your argument. Remember to have a holistic view of the question!";
var TOPIC_WRITE_PROMPT = "Nice! Now let's try to write the topic sentence based on the evidence";
var FINAL_STAND_PROMPT = "Now that you have crafted your topic sentences, let's come up with your final stand, your thesis statement";
var justDraggedTopicSource = null;
function argumentReviewData() {
  var topics = S.topicSentences.map(function(topic) {
    var data = topicReviewData(topic);
    return { sentence: data.topicSentence, evidence: data.evidence, explanation: String(topic.explanation || '').trim() };
  });
  return { question: S.q, terms: topicReviewData(S.topicSentences[0]).terms,
    topics: topics, finalStand: String(S.finalStand || '').trim() };
}
function syncArgumentReviewUI(card) {
  var button = card.querySelector('.argument-review-button');
  var result = card.querySelector('.argument-review-result');
  if (!button || !result) return;
  var standReady = !!String(S.finalStand || '').trim();
  var review = S.argumentReview;
  var currentKey = standReady ? JSON.stringify(argumentReviewData()) : '';
  var current = review && review.key === currentKey;
  var pending = !!(current && review.status === 'pending');
  button.disabled = !standReady || pending;
  button.textContent = pending ? 'Reviewing…' : current && review.status === 'done' ? 'Review again' : 'Review my argument';
  if (!standReady) {
    result.innerHTML = '';
  } else if (pending) {
    result.innerHTML = '<p class="argument-review-help" role="status">Thinky is reviewing your argument…</p>';
  } else if (current && review.status === 'done') {
    result.innerHTML = '<div class="argument-review-feedback" role="status"><strong>' + (review.ready ? 'On track' : 'Think again') + '</strong>' +
      '<p>' + esc(review.feedback) + '</p>' +
      (review.questions.length ? '<ol>' + review.questions.map(function(q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol>' : '') + '</div>';
  } else if (current && review.status === 'error') {
    result.innerHTML = '<p class="argument-review-error" role="alert">The review didn’t come through. Please try again.</p>';
  } else {
    result.innerHTML = '';
  }
}
function reviewArgument() {
  var card = $('argmap').querySelector('.final-stand-card');
  if (!card || !String(S.finalStand || '').trim() || !sample) {
    if (card && !sample) card.querySelector('.argument-review-result').innerHTML = '<p class="argument-review-error" role="alert">Connect Thinky in Settings to review your argument.</p>';
    return;
  }
  var data = argumentReviewData(), key = JSON.stringify(data);
  if (S.argumentReview && S.argumentReview.status === 'pending' && S.argumentReview.key === key) return;
  var review = { status: 'pending', key: key };
  S.argumentReview = review;
  syncArgumentReviewUI(card);
  mapJSON(PROMPTS.argumentReview(data), {}).then(function(res) {
    if (S.argumentReview !== review) return;
    var currentCard = $('argmap').querySelector('.final-stand-card');
    if (JSON.stringify(argumentReviewData()) !== key) { S.argumentReview = null; if (currentCard) syncArgumentReviewUI(currentCard); return; }
    var feedback = String(res && res.feedback || '').trim().slice(0, 350);
    var questions = res && Array.isArray(res.questions) ? res.questions.filter(function(q) { return typeof q === 'string' && q.trim(); }).slice(0, 2).map(function(q) { return q.trim().slice(0, 250); }) : [];
    S.argumentReview = res && typeof res.ready === 'boolean' && feedback && (res.ready || questions.length)
      ? { status: 'done', key: key, ready: res.ready, feedback: feedback, questions: questions }
      : { status: 'error', key: key };
    if (currentCard) syncArgumentReviewUI(currentCard);
  }, function(err) {
    if (S.argumentReview !== review) return;
    S.argumentReview = { status: 'error', key: key };
    handleAccess(err); renderLive();
    var currentCard = $('argmap').querySelector('.final-stand-card');
    if (currentCard) syncArgumentReviewUI(currentCard);
  });
}
function syncFinalStand() {
  var slot = $('argmap').querySelector('.final-stand-slot');
  if (!slot) return;
  var ready = S.topicSentences.length === 3 && S.topicSentences.every(function(topic) { return String(topic.text || '').trim(); });
  if (!ready) { slot.innerHTML = ''; return; }
  if (slot.querySelector('.final-stand-card')) { syncArgumentReviewUI(slot.querySelector('.final-stand-card')); return; }
  slot.innerHTML = '<div class="final-stand-card"><label for="final-stand-text">Your Final Stand</label>' +
    '<textarea id="final-stand-text" class="final-stand-text" rows="4" aria-label="Your Final Stand">' + esc(S.finalStand || '') + '</textarea>' +
    '<div class="argument-review-actions"><button type="button" class="argument-review-button">Review my argument</button></div>' +
    '<div class="argument-review-result" aria-live="polite"></div></div>';
  var field = slot.querySelector('.final-stand-text');
  field.addEventListener('input', function(e) { S.finalStand = e.target.value; syncArgumentReviewUI(slot.querySelector('.final-stand-card')); });
  field.addEventListener('focus', function() {
    S.focus = null; S.pin = null; S.askNode = null; S.sayList = null;
    S.topicChoosing = false; syncTopicEvidenceMode();
    S.argEl = field.closest('.final-stand-card'); S.mullAt = 'final-stand';
    S.say = FINAL_STAND_PROMPT; S.mood = 'cheer'; renderMull();
  });
  slot.querySelector('.argument-review-button').addEventListener('click', reviewArgument);
  syncArgumentReviewUI(slot.querySelector('.final-stand-card'));
}
function topicEvidenceHTML(topic, topicIndex) {
  return (topic.evidence || []).map(function(item, i) {
    return '<div class="topic-evidence-card" data-topic="' + topicIndex + '" data-evidence-index="' + i + '" aria-label="Selected evidence">' +
      '<button type="button" class="topic-evidence-copy topic-evidence-open" aria-label="Find this evidence in the Evidence layer">' + (item.kind === 'article' ? '<strong>' + esc(item.text) + '</strong>' : '<span>' + esc(item.text) + '</span>') + '</button>' +
      '<button type="button" class="topic-evidence-remove" data-topic="' + topicIndex + '" data-evidence="' + i + '" aria-label="Remove evidence from topic sentence ' + (topicIndex + 1) + '" title="Remove evidence">×</button>' +
    '</div>';
  }).join('');
}
function syncTopicEvidenceMode() {
  document.body.classList.toggle('topic-picking', !!(S && S.topicChoosing));
}
function openTopicEvidence(card) {
  var topic = S && S.topicSentences && S.topicSentences[Number(card.dataset.topic)];
  var item = topic && topic.evidence && topic.evidence[Number(card.dataset.evidenceIndex)];
  if (!item || !item.key) return;
  var key = String(item.key), id = key.slice(2);
  function findSource() {
    if (key.slice(0, 2) === 'A:') {
      return Array.prototype.find.call(document.querySelectorAll('#row-art .artcard, #row-search .artcard'), function(el) {
        return el.getAttribute('data-k') === 'A' + id;
      });
    }
    if (key.slice(0, 2) === 'E:') {
      var own = Array.prototype.find.call(document.querySelectorAll('#row-evidence .nw'), function(el) {
        return el.getAttribute('data-id') === id;
      });
      return own && (own.querySelector('.card') || own);
    }
    return null;
  }
  if (!findSource()) return;
  if (S.sec !== 'evidence') { S.sec = 'evidence'; renderAll(); }
  requestAnimationFrame(function() {
    var source = findSource();
    if (!source) return;
    source.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
    source.classList.remove('topic-source-flash');
    void source.offsetWidth;
    source.classList.add('topic-source-flash');
    setTimeout(function() { source.classList.remove('topic-source-flash'); }, 1800);
  });
}
function topicReviewData(topic) {
  return {
    question: S.q,
    topicSentence: String(topic.text || '').trim(),
    terms: of('term').map(function(term) {
      return { term: labelFor(term), type: term.wtype || '', context: scopeText(term) || term.summary || (term.guide && term.guide.meaning) || '' };
    }),
    evidence: (topic.evidence || []).map(function(item) {
      if (item.kind !== 'article') return { kind: 'own', text: item.text };
      var id = String(item.key || '').slice(2);
      var article = (S.arts || []).concat(searchArticlesOf(S)).find(function(a) { return String(a.id) === id; });
      return { kind: 'article', title: item.text, summary: article && article.summary || '' };
    })
  };
}
function reviewTopicSentence(index) {
  var topic = S && S.topicSentences && S.topicSentences[index];
  if (!topic || !String(topic.text || '').trim() || (topic.review && topic.review.status !== 'error')) return;
  if (!sample) {
    S.say = 'Connect Thinky in Settings to review your topic sentence.';
    S.mullAt = 'topic-write'; S.topicFocus = index; renderMull();
    return;
  }
  var data = topicReviewData(topic);
  topic.review = { status: 'pending', question: '' };
  S.topicFocus = index; S.mullAt = 'topic-write'; S.say = 'Let me look at your topic sentence and evidence…';
  S.mood = 'curious'; S.thinking = true; renderMull();
  mapJSON(PROMPTS.topicSentenceReview(data), {}).then(function(res) {
    if (S.topicSentences[index] !== topic) return;
    S.thinking = false;
    var question = String(res && res.question || '').trim().slice(0, 250);
    if (!res || typeof res.ready !== 'boolean' || (!res.ready && !question)) {
      topic.review = { status: 'error', question: '' };
      S.say = 'That review did not come through. Press Enter to try again.';
    } else if (res.ready) {
      topic.review = { status: 'ready', question: '' };
      S.say = 'Your topic sentence is ready to build on.';
    } else {
      topic.review = { status: 'question', question: question, animate: true };
      S.say = question;
    }
    if (S.sec === 'argue') {
      $('argmap').dataset.view = '';
      renderArgue(3);
      var field = $('topic-text-' + (index + 1));
      S.argEl = field && field.closest('.topic-card');
      S.topicFocus = index; S.mullAt = 'topic-write'; S.mood = 'curious';
      renderMull();
    }
  }, function(err) {
    if (S.topicSentences[index] !== topic) return;
    S.thinking = false;
    topic.review = { status: 'error', question: '' };
    handleAccess(err); renderLive();
    if (S.sec === 'argue') {
      S.say = 'That review did not come through. Press Enter to try again.';
      S.topicFocus = index; S.mullAt = 'topic-write'; renderMull();
    }
  });
}
function renderArgue(st) {
  var box = $('argmap');
  /* Once Argue has opened, keep its cards visible while Evidence is in focus
     so students can compare sources with their developing topic sentences. */
  var open = st >= 2 && (S.sec === 'argue' || (S.argueStarted && S.sec === 'evidence'));
  syncTopicEvidenceMode();
  if (!open) {
    var msg = st < 2 ? 'Lets unpack some terms first!' : 'Unpack and synthesize your findings before you start your argument!';
    if (box.dataset.view === 'locked' && box.textContent === msg) return;
    box.dataset.view = 'locked';
    box.innerHTML = '<div class="lock">' + msg + '</div>';
    return;
  }

  if (!Array.isArray(S.topicSentences)) S.topicSentences = [];
  for (var i = 0; i < 3; i++) {
    if (!S.topicSentences[i] || typeof S.topicSentences[i] !== 'object') S.topicSentences[i] = { text: '' };
  }
  S.topicSentences.length = 3;
  if (box.dataset.view === 'topics' && box.querySelector('.topic-sentences')) return;

  box.dataset.view = 'topics';
  box.innerHTML = '<div class="topic-sentences">' + S.topicSentences.map(function(topic, i) {
    var n = i + 1;
    var deeper = topic.review && topic.review.status === 'question';
    return '<div class="topic-column' + (deeper ? ' has-deeper' : '') + '">' +
      '<div class="topic-card">' +
        '<div class="topic-card-head"><label for="topic-text-' + n + '">Topic sentence ' + n + '</label></div>' +
        '<textarea id="topic-text-' + n + '" class="topic-text" data-topic="' + i + '" rows="2" aria-label="Topic sentence ' + n + '">' + esc(topic.text || '') + '</textarea>' +
      '</div>' +
      '<div class="topic-evidence-branch"><span>Evidence</span></div>' +
      '<div class="topic-evidence-list' + (deeper && topic.review.animate ? ' is-new' : '') + '">' + topicEvidenceHTML(topic, i) + '</div>' +
      (deeper ? '<div class="topic-deeper-branch' + (topic.review.animate ? ' is-new' : '') + '"><span>Deeper explanation</span></div>' +
        '<div class="topic-deeper-card' + (topic.review.animate ? ' is-new' : '') + '"><textarea class="topic-deeper-text" data-topic="' + i + '" rows="3" aria-label="Deeper explanation for topic sentence ' + n + '">' + esc(topic.explanation || '') + '</textarea></div>' : '') +
    '</div>';
  }).join('') + '</div><div class="final-stand-slot"></div>';
  S.topicSentences.forEach(function(topic) { if (topic.review) topic.review.animate = false; });
  syncFinalStand();

  box.querySelectorAll('.topic-text').forEach(function(field) {
    field.addEventListener('focus', function() {
      S.focus = null; S.pin = null; S.askNode = null; S.sayList = null;
      S.topicFocus = Number(field.dataset.topic); S.topicChoosing = true; S.argEl = field.closest('.topic-card');
      var current = S.topicSentences[S.topicFocus];
      var readyToWrite = (current.evidence || []).length > 0;
      S.mullAt = readyToWrite ? 'topic-write' : 'topic';
      S.say = current.review && current.review.status === 'question' ? current.review.question : readyToWrite ? TOPIC_WRITE_PROMPT : S.topicFocus === 0 ? TOPIC_SELECT_PROMPT : TOPIC_SELECT_AGAIN_PROMPT;
      S.mood = 'curious';
      syncTopicEvidenceMode();
      renderMull();
    });
    field.addEventListener('input', function() {
      S.topicSentences[Number(field.dataset.topic)].text = field.value;
      syncFinalStand();
    });
    field.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
      e.preventDefault();
      var index = Number(field.dataset.topic);
      S.topicSentences[index].text = field.value;
      reviewTopicSentence(index);
    });
  });
  box.querySelectorAll('.topic-deeper-text').forEach(function(field) {
    field.addEventListener('input', function() {
      S.topicSentences[Number(field.dataset.topic)].explanation = field.value;
      var card = box.querySelector('.final-stand-card'); if (card) syncArgumentReviewUI(card);
    });
    field.addEventListener('keydown', function(e) {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !field.value.trim()) return;
      e.preventDefault();
      var index = Number(field.dataset.topic);
      S.topicSentences[index].explanation = field.value;
      S.focus = null; S.pin = null; S.askNode = null; S.sayList = null;
      S.topicFocus = index; S.argEl = field.closest('.topic-deeper-card');
      S.mullAt = 'topic-deeper';
      S.say = "Nice one! Now let's improve on the topic sentence above";
      S.mood = 'cheer';
      renderMull();
    });
  });
}

$('argmap').addEventListener('click', function(e) {
  var button = e.target.closest('.topic-evidence-remove');
  if (!button) {
    var card = e.target.closest('.topic-evidence-card');
    if (card && $('argmap').contains(card)) openTopicEvidence(card);
    return;
  }
  if (!$('argmap').contains(button)) return;
  var topicIndex = Number(button.dataset.topic), evidenceIndex = Number(button.dataset.evidence);
  var topic = S && S.topicSentences && S.topicSentences[topicIndex];
  if (!topic || !Array.isArray(topic.evidence) || !topic.evidence[evidenceIndex]) return;
  topic.evidence.splice(evidenceIndex, 1);
  button.closest('.topic-evidence-list').innerHTML = topicEvidenceHTML(topic, topicIndex);
  var standCard = $('argmap').querySelector('.final-stand-card'); if (standCard) syncArgumentReviewUI(standCard);
  if (topicIndex === 0 && !topic.evidence.length && S.mullAt === 'topic-write') {
    S.mullAt = 'topic'; S.say = TOPIC_SELECT_PROMPT; S.mood = 'curious'; renderMull();
  }
});

/* A click on an Evidence source copies only the part needed in Argue. */
function chooseTopicEvidence(source) {
  if (!S || !Array.isArray(S.topicSentences) || !S.topicChoosing) return;
  var index = Number(S.topicFocus), topic = S.topicSentences[index];
  if (!Number.isInteger(index) || !topic) return;
  var key, kind, text;
  if (source.matches('.artcard')) {
    var id = source.getAttribute('data-k').slice(1);
    var article = (S.arts || []).concat(searchArticlesOf(S)).find(function(a){ return String(a.id) === id; });
    if (!article) return;
    key = 'A:' + id; kind = 'article'; text = article.title;
  } else {
    var evidence = node(+source.getAttribute('data-id'));
    if (!evidence || evidence.kind !== 'evidence') return;
    key = 'E:' + evidence.id; kind = 'own'; text = evidence.text;
  }
  if (!String(text || '').trim()) return;
  topic.evidence = topic.evidence || [];
  if (topic.evidence.some(function(item){ return item.key === key; })) return;
  topic.evidence.push({ key: key, kind: kind, text: String(text) });
  S.topicFocus = index; S.topicChoosing = true;
  S.sec = 'argue'; S.argueStarted = true; S.focus = null;
  if (index === 0) { S.mullAt = 'topic-write'; S.say = TOPIC_WRITE_PROMPT; S.mood = 'cheer'; }
  $('argmap').dataset.view = '';
  renderAll();
  requestAnimationFrame(function() {
    var column = $('argmap').querySelectorAll('.topic-column')[index];
    var card = column && column.querySelector('.topic-evidence-card:last-child');
    if (card) card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  });
}

document.querySelector('[aria-labelledby="l2"]').addEventListener('click', function(e) {
  if (!S || !S.topicChoosing || e.target.closest('button,a,input,select,.fmenu')) return;
  var source = e.target.closest('#row-art .artcard, #row-search .artcard, #row-evidence .nw');
  if (source && source === justDraggedTopicSource) { justDraggedTopicSource = null; return; }
  if (source) chooseTopicEvidence(source);
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && S && S.topicChoosing) { S.topicChoosing = false; syncTopicEvidenceMode(); }
});
