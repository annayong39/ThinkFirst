/* =====================================================================
   ThinkFirst — AI CONNECTION (OpenAI)
   ---------------------------------------------------------------------
   The ONLY file that talks to OpenAI. Most Thinky features call
       TFAI.json(promptText, { signal })
   Article discovery calls TFAI.webJSON() so its links come from live search.

   The prompt text itself comes from js/prompts.js.
   The API key and model come from the Settings menu (js/settings.js).

   Errors come back as { code } so the app can react:
     'no_key'        no API key saved yet
     'not_granted'   OpenAI rejected the key (401)
     'rate_limited'  too many requests, or no credit left (429)
     'cancelled'     the student changed the text, so we stopped waiting
     'bad_json'      the reply wasn't valid JSON
     'error'         anything else (network down, server error)
   ===================================================================== */

var TFAI = (function () {
  var URL = 'https://api.openai.com/v1/chat/completions';

  /* SPEED: GPT-5 models "think" before answering, which is what makes them slow.
     Thinky's jobs are short, so we ask for the least thinking each model allows:
       gpt-5, gpt-5-mini, gpt-5-nano  → 'minimal'
       gpt-5.1 and newer (gpt-5.x)    → 'none'
       o-series (o3, o4-mini…)        → 'low'
       other models (gpt-4.1-mini…)   → nothing to set; they don't think first
     If OpenAI says a model doesn't support this, we quietly retry without it. */
  function speedOptions(model) {
    var m = String(model || '').toLowerCase();
    if (/^gpt-5(-mini|-nano)?(-\d|$)/.test(m)) return { reasoning_effort: 'minimal', verbosity: 'low' };
    if (/^gpt-5\./.test(m)) return { reasoning_effort: 'none', verbosity: 'low' };
    if (/^o\d/.test(m)) return { reasoning_effort: 'low' };
    return {};
  }

  function json(prompt, opts, plain) {
    var key = TFSettings.get('apiKey');
    if (!key) return Promise.reject({ code: 'no_key' });
    var model = TFSettings.get('model') || DEFAULT_MODEL;
    var body = Object.assign({
      model: model,
      messages: [
        { role: 'system', content: PROMPTS.system },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    }, plain ? {} : speedOptions(model));
    return fetch(URL, {
      method: 'POST',
      signal: opts && opts.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (res.ok) return res.json();
      return res.json().catch(function () { return {}; }).then(function (e) {
        var msg = e && e.error && e.error.message;
        var code = res.status === 401 ? 'not_granted' : res.status === 429 ? 'rate_limited' : 'error';
        throw { code: code, status: res.status, message: msg || res.statusText };
      });
    }).then(function (data) {
      var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      try { return JSON.parse(text); } catch (e) { throw { code: 'bad_json', message: 'The AI reply was not valid JSON.' }; }
    }).catch(function (err) {
      if (err && err.name === 'AbortError') throw { code: 'cancelled' };
      /* this model doesn't accept the speed settings: try once more without them */
      if (!plain && err && err.status === 400 && /reasoning|verbosity/i.test(err.message || '')) return json(prompt, opts, true);
      if (err && err.code) throw err;
      throw { code: 'error', message: err && err.message };
    });
  }

  /* Article discovery needs live sources. Keep this separate from the other
     Thinky calls, which do not need web access. */
  function webJSON(prompt, opts) {
    var key = TFSettings.get('apiKey');
    if (!key) return Promise.reject({ code: 'no_key' });
    var model = TFSettings.get('model') || DEFAULT_MODEL;
    var effort = speedOptions(model).reasoning_effort;
    var body = {
      model: model,
      instructions: PROMPTS.system,
      input: prompt,
      tools: [{ type: 'web_search', search_context_size: 'low' }],
      tool_choice: 'required',
      include: ['web_search_call.action.sources']
    };
    if (effort) body.reasoning = { effort: effort };
    return fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: opts && opts.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify(body)
    }).then(function(res){
      if (res.ok) return res.json();
      return res.json().catch(function(){ return {}; }).then(function(e){
        throw { code: res.status === 401 ? 'not_granted' : res.status === 429 ? 'rate_limited' : 'error',
          status: res.status, message: (e.error && e.error.message) || res.statusText };
      });
    }).then(function(data){
      if (data.status === 'incomplete' || data.status === 'failed')
        throw { code: 'error', message: (data.error && data.error.message) || (data.incomplete_details && data.incomplete_details.reason) || 'The search response was incomplete.' };
      var output = data.output || [], messages = output.filter(function(item){ return item.type === 'message'; });
      var parts = messages.reduce(function(all, item){ return all.concat(item.content || []); }, []);
      var body = parts.filter(function(part){ return part.type === 'output_text'; }).map(function(part){ return part.text || ''; }).join('');
      var searched = output.some(function(item){ return item.type === 'web_search_call' && item.status === 'completed'; });
      if (!searched) throw { code: 'error', message: 'The article search did not run.' };
      var sources = [];
      output.forEach(function(item){
        if (item.type === 'web_search_call') (item.action && item.action.sources || []).forEach(function(source){
          if (source.url) sources.push(source.url);
        });
      });
      parts.forEach(function(part){
        (part.annotations || []).forEach(function(annotation){
          if (annotation.type === 'url_citation' && annotation.url) sources.push(annotation.url);
        });
      });
      try { var parsed = JSON.parse(body); parsed._sources = sources; return parsed; }
      catch(e){ throw { code: 'bad_json', message: 'The article search reply was not valid JSON.' }; }
    }).catch(function(err){
      if (err && err.name === 'AbortError') throw { code: 'cancelled' };
      if (err && err.code) throw err;
      throw { code: 'error', message: err && err.message };
    });
  }

  /* a tiny call used by Settings to check the key works */
  function test() { return json('Reply with only JSON: {"ok": true}'); }

  /* a friendly sentence for each error, shown in Settings */
  function explain(err) {
    var c = err && err.code;
    if (c === 'no_key') return 'Add your OpenAI API key first.';
    if (c === 'not_granted') return 'OpenAI rejected this key. Check it was copied in full.';
    if (c === 'rate_limited') return 'OpenAI says too many requests or no credit left: ' + (err.message || '');
    if (err && err.status === 404) return 'That model name wasn’t found. Check the model in Settings.';
    return 'Couldn’t reach OpenAI: ' + ((err && err.message) || 'unknown error');
  }

  return { json: json, webJSON: webJSON, test: test, explain: explain, ready: function () { return !!TFSettings.get('apiKey'); } };
})();
