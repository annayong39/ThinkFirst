# ThinkFirst
ThinkFirst is a General Paper (GP) essay planner for Singapore JC students.
Students unpack the key words in a GP question, gather evidence, and (soon)
build their argument on a mind map. **Thinky**, the notebook mascot, is an AI
thinking partner. It never writes the student's thinking for them. It only
asks questions and gives short, honest reads.

Everything runs in the browser. There is no server and no install.

---

## 1. Run it

**Quickest:** double-click `index.html`. It opens in your browser and works.

**Better while editing (VS Code):**
1. Install the **Live Server** extension in VS Code.
2. Right-click `index.html` → **Open with Live Server**.
3. The page reloads by itself every time you save a file.

## 2. Connect Thinky to OpenAI

1. Get an API key from <https://platform.openai.com/api-keys>. It starts with `sk-`.
2. In ThinkFirst, click the **gear icon** (top right).
3. Paste the key, then press **Save**. "Connected. Thinky is ready." means it worked.

Until a key is saved, Thinky stays hidden and the gear shows a small orange dot.

> **About the key.** It's saved only in *this* browser (localStorage). It is
> never put in any file, so it won't end up on GitHub. But anyone who uses
> this browser can find it with the browser's developer tools. Don't save it
> on a shared or school computer, and don't host this app publicly with your
> key in it.

**Model.** Settings also has a Model box (default `gpt-5-mini`). Type any
OpenAI chat model name your key can use. If you see "model not found",
check the spelling on OpenAI's models page.

**Speed.** GPT-5 models think before answering, which makes them slower.
`js/ai.js` asks them for the least thinking possible (`reasoning_effort`).
For even faster replies, try a non-thinking model such as `gpt-4.1-mini`
in Settings. Replies are quicker, but the questions may be a little less sharp.

## 3. Settings menu (gear icon)

| Setting | What it does |
|---|---|
| API key | Your OpenAI key, saved in this browser. **Remove key** deletes it. |
| Model | Which OpenAI model Thinky uses. |
| Theme | System / Light / Dark. |
| Text size | Small / Default / Large / Extra large. Scales the whole app. |

---

## 4. Editing the prompts (the part you'll change most)

**Every message sent to the AI is in one file: `js/prompts.js`.**

Each prompt is a labelled block that tells you:

- **WHEN** it is sent (what the student did),
- **SENDS** what student data gets filled in,
- **RETURNS** what JSON the app expects back.

| # | Prompt | Sent when… |
|---|---|---|
| 0 | `system` | With every call. |
| 1 | `findPhrases` | A new question starts. Finds phrases like "social media". |
| 2 | `keyWords` | The student picks their first word. Thinky's own picks, used for its dotted notes. |
| 3 | `termGuide` | A word is highlighted. Gives the **Definition** plus the decisions Thinky asks about. |
| 4 | `unpackSummary` | Enter, or clicking out of **Extent of Scope**. Writes **My unpacking**. |
| 5 | `articles` | **I'm done unpacking**. Gives 2 articles per word. |
| 6 | `search` | The Evidence search bar. Gives 3–4 articles. |
| 7 | `readEvidence` | Enter, or clicking out of an evidence card. Gives Thinky's read plus 1 question. |

**Safe to change:** any wording, tone, rules, word limits and examples.

**Change with care:** the last line of each prompt,
`Reply with only JSON: {...}`. The app reads those exact key names. If you
rename or remove a key, the matching code has to change too. The comment
above each prompt says which file uses it.

**When Thinky speaks:** AI calls happen when the student presses **Enter** or
**clicks out of the box they're working in**, never while they're typing.

## 5. What each file does

```
ThinkFirst/
├── index.html            the page: all the HTML, plus the list of CSS/JS files
├── README.md             this file
├── css/
│   ├── tokens.css        colours + fonts from the Brand Deck (light AND dark)
│   ├── base.css          page, header, buttons, zoom controls
│   ├── question.css      the question card + highlighter
│   ├── map.css           mind map: rows, Unpack cards, wires, Thinky's tabs
│   ├── thinky.css        the floating mascot + speech bubble
│   ├── evidence.css      search bar, results, article boxes
│   ├── start.css         start page + topic folders
│   └── settings.css      the settings menu
└── js/                   (loaded in this order; order matters)
    ├── prompts.js        ★ every AI prompt; edit freely
    ├── settings.js       settings menu + saving settings in the browser
    ├── ai.js             the only file that talks to OpenAI
    ├── core.js           shared state (S) + small helpers
    ├── thinky.js         Thinky's drawings, one per mood
    ├── question.js       splitting the question, picked words → cards
    ├── render.js         drawing the map: cards, rows, wires, Thinky's position
    ├── reading.js        Thinky reading a card (Enter / click out)
    ├── evidence.js       articles, search, article boxes
    ├── argue.js          Argue section: placeholder for now
    ├── unpack.js         Definition + "My unpacking"
    ├── start.js          start page + saved-example folders
    ├── interactions.js   dragging, joining words, linking, zoom, panning
    └── app.js            starts the app, connects Thinky when a key is saved
```

**How the files share things:** they're plain `<script>` files (no modules,
no build step). Anything one file defines at the top level (like `S`,
`renderAll()` or `PROMPTS`) can be used by files loaded **after** it. If you
add a new file, add its `<script>` tag in `index.html` in the right place.

**Where things are saved (all in this browser):**

| What | localStorage key |
|---|---|
| Settings + API key | `tf-settings` |
| Your own topic folders | `tf-topics2` |

Use **Save this project** beside the logo on the mind-map page. Open **Your saved projects**, below the examples on the start page, to restore an essay and continue editing. Saving again updates that project and its saved date. New questions start separate projects.

Projects are stored under `tf-projects` in this browser, including answers, AI feedback, articles, notes, connections, positions and zoom. Save manually after changes. Refreshing does not erase saved projects, but clearing browser storage does; projects do not sync between devices. Unfinished AI requests can be retried after reopening.

Each saved-project card also offers:
- **PDF / Print:** opens a landscape print preview of the latest saved content. Unpack, Evidence and Argue each have visual map pages with the highlighted question, coloured cards and connecting wires. Longer answers and Thinky feedback continue on readable detail pages. Choose **Save as PDF** or a printer in the browser's print dialog. Allow pop-ups for ThinkFirst if the preview is blocked.
- **Project backup (.json):** downloads the complete saved project, including layout and connections, without API settings. The browser decides whether to ask for a location or use Downloads. Import is not currently available.
- **Delete project:** asks for confirmation before removing the saved copy from this browser. Downloaded files are unaffected.

## 6. Status

| Part | Status |
|---|---|
| Start page, topic folders, Add Topic | Built |
| Unpack (highlighter, Definition, boundaries, My unpacking) | Built |
| Evidence (articles, search, own evidence) | Built |
| Argue | **Placeholder.** Design still being decided (see the Argue Lab prototypes) |
| Saving the whole map | Built: manual save and restore in this browser |

## 7. If something goes wrong

| What you see | Try |
|---|---|
| Thinky never appears | Open Settings and save a key. The orange dot means no key is saved. |
| "OpenAI rejected this key" | Copy the key again, in full. |
| "Too many requests or no credit left" | Check billing on your OpenAI account. |
| "model not found" | Fix the model name in Settings. |
| Something else is broken | Press F12 → **Console** to see the error, and paste it to Claude/Codex. |
