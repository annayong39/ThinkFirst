/* =====================================================================
   ThinkFirst — THINKY'S FIXED LINES (no AI)
   ---------------------------------------------------------------------
   Everything Thinky says in its speech bubble that is NOT written by
   the AI lives in this one file. Change the words here; you never need
   to touch any other file to change one of these lines.
   (What the AI says is set by the prompts in js/prompts.js.)

   HOW TO EDIT
     - Change only the text between the quotes ' '.
     - Keep the name on the left (e.g. hello:) exactly as it is; the
       app looks the line up by that name.
     - Keep the comma at the end of each line.
     - Inside ' ' use the curly apostrophe ’ (like "I’m"), not a straight
       one ', because a straight ' ends the text early.

     A few lines fill in a word from the app, e.g. a folder name. They
     look like this:   savedTo: (d) => `Saved to ${d.folder}.`,
     - Those use backticks ` ` instead of quotes.
     - ${d.folder} is where the app drops the word in. Move it around or
       delete it, but don't change what's inside the ${ }.

   Refresh the page after saving to see the change.
   ===================================================================== */

var SAYS = {

  /* ---------- START PAGE ---------- */
  hello: 'Hi, I’m Thinky! Write down the GP question you’re working on, and we’ll unpack it together.',


  /* ---------- UNPACK: picking words ---------- */
  // the first thing Thinky says on a new question, before any words are picked
  yourTurn: 'Your turn first! Highlight the words in the question you want to unpack.',
  // fewer than 2 words highlighted
  tapTwo: 'Highlight at least two key words to unpack them!',
  // 2 or more words highlighted
  writeMeaning: 'Now write what each means to you. Click away when you’re done and I’ll read it.',


  /* ---------- UNPACK: working on a card ---------- */
  // above Thinky's list of decision questions (the questions themselves come from the AI)
  decideOwnWords: 'Decide in your own words:',
  // same, after the student already has an unpacking
  stillDeciding: 'Still deciding? Think about:',
  // above Thinky's follow-up questions 2 to 5 (the questions themselves come from the AI)
  digDeeper: 'Let’s dig a little deeper:',
  // above the question, when the student clicks one of their answer cards to see what Thinky asked
  youWereAsked: 'Here’s what I asked you:',
  // grey hint inside the small "Ask Thinky" box under Thinky's question
  clarifyHint: 'Not sure what I mean? Ask me here…',
  finishTermPrompt: 'Satisfied with your unpacking?',
  finishTerm: 'I’m done unpacking this term',
  // while Thinky reads the student's answer and thinks of the next question
  readingAnswer: 'Thinking about your answer…',
  // student clicks into a card that already has an unpacking
  cardChange: 'Change your boundaries any time, then press Enter to update your unpacking.',
  // student clicks into a card once the Definition has loaded
  cardRead: 'Read the meaning, then make the decisions in your own words. Press Enter when you’re done.',
  // student clicks into a card before the Definition has loaded
  cardWrite: 'Write what’s in and what’s out for this word.',
  // student starts typing again while Thinky was reading
  listening: 'Listening. Click away when you’re done.',
  // student opens one of Thinky's dotted note words
  yourTakeFirst: 'Your take first. I’m curious what you make of it.',
  // student presses Enter with fewer than 2 words in "Extent of Scope"
  needMoreWords: 'Write a few words about what’s in and what’s out first.',
  // while "My unpacking" is being written
  unpacking: 'Putting your unpacking together…',
  // "My unpacking" is ready
  unpackDone: 'Here’s your unpacking in one place. Nice and clear!',
  // after Thinky reads a term card, when it has no question to ask
  termIterate: 'Let’s see whether you need to iterate and think more deeply to unpack this.',
  // after a second read of a term card that came with a sample unpacking
  termRethink: 'Nice rethink! I put one way to unpack it under your card. Compare it with yours.',


  /* ---------- UNPACK: finished ---------- */
  // Thinky is still working out its own key words
  thinkingToo: 'Nice! Give me a sec, I’m having a think too…',
  // every word is unpacked (no notes left, or the notes are handled): Thinky opens Evidence, then the articles appear
  unpackFinished: 'Good job unpacking all the terms! Now let’s look at the evidence.',
  // "I’m done unpacking" pressed, but Thinky left 1 note on a word you skipped. Evidence waits until it is handled.
  unpackFinishedNote: 'Nice unpacking! I left a little note on a word I was wondering about. Unpack it yourself, or close the note if you’d rather skip it.',
  // ... Thinky left 2 notes
  unpackFinishedNotes: 'Nice unpacking! I left a couple of little notes on words I was wondering about. Unpack them yourself, or close the notes if you’d rather skip them.',
  // (no longer used: Thinky now says unpackFinished when Evidence opens)
  goToEvidence: 'If you are happy with unpacking the terms, let’s go to the evidence section, where you can add sources you know and search for more!',


  /* ---------- EVIDENCE: articles and search ---------- */
  articlesFound: 'I found a few articles that could get you started!',
  // about 5 seconds later, Thinky moves to the left panel of Evidence and explains the tools.
  // evToolsIntro is the heading; evToolsTips are the bullet points under it (add, remove or reword them freely)
  evToolsIntro: 'Here’s how to synthesize evidence:',
  // when the student places a new note with the Text tool, Thinky moves next to it and says this
  noteNudge: 'What might these examples help you argue? Write your point here, then drag the + to related notes or evidence.',
  evToolsTips: [
    'Search for more evidence to find more articles on any idea.',
    'Add your own evidence from what you already know.',
    'Add a note, opinion or stand, then connect it to related notes or evidence.'
  ],
  // ${d.query} = what the student typed in the search bar
  searching: (d) => `Looking for articles about “${d.query}”…`,
  searchFound: 'Here are a few articles to look at. Save any you like to a folder.',
  searchNone: 'I couldn’t find good matches. Try different words.',
  searchFailed: 'Hmm, that search didn’t come through.',
  // ${d.folder} = the topic folder name
  savedTo: (d) => `Saved to ${d.folder}.`,
  movedTo: (d) => `Moved to ${d.folder}.`,
  removed: 'Removed. Your call.',

  /* ---------- EVIDENCE: the student's own evidence cards ---------- */
  // when the student focuses a new, empty evidence card
  ownEvidencePrompt: 'Explain the evidence, and see how you can link it to your arguments!',
  tooMuchEvidence: 'Four examples is plenty. Remove one first.',
  // ${d.term} = the key word being linked
  linked: (d) => `Linked “${d.term}” to your evidence. Drag the + again onto it to unlink.`,
  unlinked: (d) => `Unlinked “${d.term}” from that evidence.`,
  evidenceSearchReady: 'Click on the Google link to read more on this evidence',


  /* ---------- PROBLEMS ---------- */
  noKey: 'Add your OpenAI key in Settings so I can help.',
  cantReach: 'I can’t reach the AI. Check your key in Settings.',
  breather: 'I need a breather. Try again in a bit.',
  didntComeThrough: 'Hmm, that didn’t come through.',


  /* ---------- UNPACK: command words (Discuss, To what extent…) ---------- */
  // Thinky's bubble on a command-word card: no question, just a pointer to the guide
  commandNote: 'Take note of the command word and how to approach the question!',


  /* ---------- OLD (from an earlier design; students never see these) ---------- */
  tooManyBranches: 'Six branches is a lot. Write in the ones you have first.',
  newBranch: 'Your words in the new branch. Click away and I’ll read it.'
};


/* =====================================================================
   COMMAND WORDS: pre-set definitions and "How to approach it" guides
   ---------------------------------------------------------------------
   When a student highlights a command word (or a word inside a command
   phrase, e.g. "extent" in "To what extent"), its card shows these
   instead of asking questions. No AI is used for words on this list.
   A command word NOT on this list is handled by the AI instead (prompt
   #3 in js/prompts.js writes its definition and guide in the same style).

   HOW TO EDIT
     match    the phrases to look for in the question, lower case, no
              punctuation. A highlighted word counts if it is part of one
              of these AND that phrase is in the question.
     (the card shows the phrase as it appears in the question, e.g. "To what extent")
     meaning  shown under "Definition"
     guide    shown under "How to approach it"
   Same rules as above: curly apostrophe ’ inside ' ', keep the commas.
   ===================================================================== */
var COMMAND_GUIDES = [
  { match: ['to what extent'],
    meaning: 'Judge how far the claim is true, not just yes or no.',
    guide: 'Decide how far you agree, weigh both sides, and end with a clear judgement of degree (e.g. largely, only partly).' },
  { match: ['how far'],
    meaning: 'Judge the degree to which the claim holds.',
    guide: 'Show where the claim holds and where it stops, then say how far it holds overall.' },
  { match: ['discuss'],
    meaning: 'Explore the issue from more than one side.',
    guide: 'Give a balanced look at different views and reach a reasoned conclusion of your own.' },
  { match: ['do you agree', 'how true'],
    meaning: 'Take a position on the claim.',
    guide: 'Make your stand clear early, test it against the strongest opposing view, and conclude with a qualified judgement.' },
  { match: ['evaluate', 'assess'],
    meaning: 'Judge the value, strength or importance of something.',
    guide: 'Weigh strengths against limitations with evidence, and conclude how valuable or significant it is.' },
  { match: ['is it justified', 'justified'],
    meaning: 'Judge whether something is right or reasonable.',
    guide: 'Weigh reasons for and against, consider who is affected, and give a reasoned verdict.' },
  { match: ['should'],
    meaning: 'Judge whether something ought to happen.',
    guide: 'Weigh reasons for and against, consider who is affected, and give a reasoned verdict.' },
  { match: ['consider', 'examine'],
    meaning: 'Look closely at the issue and its implications.',
    guide: 'Break the issue into parts, look at each carefully, and draw out what it means overall.' },
  { match: ['compare'],
    meaning: 'Look at similarities and differences.',
    guide: 'Set the two side by side point by point, and conclude which matters more and why.' }
];
