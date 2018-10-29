(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:markdown":{"settings.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/settings.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 1);
Meteor.startup(() => {
  RocketChat.settings.add('Markdown_Parser', 'original', {
    type: 'select',
    values: [{
      key: 'disabled',
      i18nLabel: 'Disabled'
    }, {
      key: 'original',
      i18nLabel: 'Original'
    }, {
      key: 'marked',
      i18nLabel: 'Marked'
    }],
    group: 'Message',
    section: 'Markdown',
    public: true
  });
  const enableQueryOriginal = {
    _id: 'Markdown_Parser',
    value: 'original'
  };
  RocketChat.settings.add('Markdown_Headers', false, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryOriginal
  });
  RocketChat.settings.add('Markdown_SupportSchemesForLink', 'http,https', {
    type: 'string',
    group: 'Message',
    section: 'Markdown',
    public: true,
    i18nDescription: 'Markdown_SupportSchemesForLink_Description',
    enableQuery: enableQueryOriginal
  });
  const enableQueryMarked = {
    _id: 'Markdown_Parser',
    value: 'marked'
  };
  RocketChat.settings.add('Markdown_Marked_GFM', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Tables', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Breaks', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Pedantic', false, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: [{
      _id: 'Markdown_Parser',
      value: 'marked'
    }, {
      _id: 'Markdown_Marked_GFM',
      value: false
    }]
  });
  RocketChat.settings.add('Markdown_Marked_SmartLists', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
  RocketChat.settings.add('Markdown_Marked_Smartypants', true, {
    type: 'boolean',
    group: 'Message',
    section: 'Markdown',
    public: true,
    enableQuery: enableQueryMarked
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markdown.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/markdown.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let Blaze;
module.watch(require("meteor/blaze"), {
  Blaze(v) {
    Blaze = v;
  }

}, 2);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 3);
let marked;
module.watch(require("./parser/marked/marked.js"), {
  marked(v) {
    marked = v;
  }

}, 4);
let original;
module.watch(require("./parser/original/original.js"), {
  original(v) {
    original = v;
  }

}, 5);
let code;
module.watch(require("./parser/original/code.js"), {
  code(v) {
    code = v;
  }

}, 6);
const parsers = {
  original,
  marked
};

class MarkdownClass {
  parse(text) {
    const message = {
      html: s.escapeHTML(text)
    };
    return this.mountTokensBack(this.parseMessageNotEscaped(message)).html;
  }

  parseNotEscaped(text) {
    const message = {
      html: text
    };
    return this.mountTokensBack(this.parseMessageNotEscaped(message)).html;
  }

  parseMessageNotEscaped(message) {
    const parser = RocketChat.settings.get('Markdown_Parser');

    if (parser === 'disabled') {
      return message;
    }

    if (typeof parsers[parser] === 'function') {
      return parsers[parser](message);
    }

    return parsers.original(message);
  }

  mountTokensBack(message, useHtml = true) {
    if (message.tokens && message.tokens.length > 0) {
      for (const _ref of message.tokens) {
        const {
          token,
          text,
          noHtml
        } = _ref;
        message.html = message.html.replace(token, () => useHtml ? text : noHtml); // Uses lambda so doesn't need to escape $
      }
    }

    return message;
  }

  code(...args) {
    return code(...args);
  }

}

const Markdown = new MarkdownClass();
RocketChat.Markdown = Markdown; // renderMessage already did html escape

const MarkdownMessage = message => {
  if (s.trim(message != null ? message.html : undefined)) {
    message = Markdown.parseMessageNotEscaped(message);
  }

  return message;
};

RocketChat.callbacks.add('renderMessage', MarkdownMessage, RocketChat.callbacks.priority.HIGH, 'markdown');

if (Meteor.isClient) {
  Blaze.registerHelper('RocketChatMarkdown', text => Markdown.parse(text));
  Blaze.registerHelper('RocketChatMarkdownUnescape', text => Markdown.parseNotEscaped(text));
  Blaze.registerHelper('RocketChatMarkdownInline', text => {
    const output = Markdown.parse(text);
    return output.replace(/^<p>/, '').replace(/<\/p>$/, '');
  });
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"parser":{"marked":{"marked.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/marked/marked.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  marked: () => marked
});
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);
let hljs;
module.watch(require("highlight.js"), {
  default(v) {
    hljs = v;
  }

}, 4);

let _marked;

module.watch(require("marked"), {
  default(v) {
    _marked = v;
  }

}, 5);
const renderer = new _marked.Renderer();
let msg = null;

renderer.code = function (code, lang, escaped) {
  if (this.options.highlight) {
    const out = this.options.highlight(code, lang);

    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  let text = null;

  if (!lang) {
    text = `<pre><code class="code-colors hljs">${escaped ? code : s.escapeHTML(code, true)}</code></pre>`;
  } else {
    text = `<pre><code class="code-colors hljs ${escape(lang, true)}">${escaped ? code : s.escapeHTML(code, true)}</code></pre>`;
  }

  if (_.isString(msg)) {
    return text;
  }

  const token = `=!=${Random.id()}=!=`;
  msg.tokens.push({
    highlight: true,
    token,
    text
  });
  return token;
};

renderer.codespan = function (text) {
  text = `<code class="code-colors inline">${text}</code>`;

  if (_.isString(msg)) {
    return text;
  }

  const token = `=!=${Random.id()}=!=`;
  msg.tokens.push({
    token,
    text
  });
  return token;
};

renderer.blockquote = function (quote) {
  return `<blockquote class="background-transparent-darker-before">${quote}</blockquote>`;
};

const highlight = function (code, lang) {
  if (!lang) {
    return code;
  }

  try {
    return hljs.highlight(lang, code).value;
  } catch (e) {
    // Unknown language
    return code;
  }
};

let gfm = null;
let tables = null;
let breaks = null;
let pedantic = null;
let smartLists = null;
let smartypants = null;

const marked = message => {
  msg = message;

  if (!msg.tokens) {
    msg.tokens = [];
  }

  if (gfm == null) {
    gfm = RocketChat.settings.get('Markdown_Marked_GFM');
  }

  if (tables == null) {
    tables = RocketChat.settings.get('Markdown_Marked_Tables');
  }

  if (breaks == null) {
    breaks = RocketChat.settings.get('Markdown_Marked_Breaks');
  }

  if (pedantic == null) {
    pedantic = RocketChat.settings.get('Markdown_Marked_Pedantic');
  }

  if (smartLists == null) {
    smartLists = RocketChat.settings.get('Markdown_Marked_SmartLists');
  }

  if (smartypants == null) {
    smartypants = RocketChat.settings.get('Markdown_Marked_Smartypants');
  }

  msg.html = _marked(s.unescapeHTML(msg.html), {
    gfm,
    tables,
    breaks,
    pedantic,
    smartLists,
    smartypants,
    renderer,
    sanitize: true,
    highlight
  });
  return msg;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"original":{"code.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/code.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  code: () => code
});
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let hljs;
module.watch(require("highlight.js"), {
  default(v) {
    hljs = v;
  }

}, 2);

const inlinecode = message => // Support `text`
message.html = message.html.replace(/\`([^`\r\n]+)\`([<_*~]|\B|\b|$)/gm, (match, p1, p2) => {
  const token = ` =!=${Random.id()}=!=`;
  message.tokens.push({
    token,
    text: `<span class=\"copyonly\">\`</span><span><code class=\"code-colors inline\">${p1}</code></span><span class=\"copyonly\">\`</span>${p2}`,
    noHtml: match
  });
  return token;
});

const codeblocks = message => {
  // Count occurencies of ```
  const count = (message.html.match(/```/g) || []).length;

  if (count) {
    // Check if we need to add a final ```
    if (count % 2 > 0) {
      message.html = `${message.html}\n\`\`\``;
      message.msg = `${message.msg}\n\`\`\``;
    } // Separate text in code blocks and non code blocks


    const msgParts = message.html.split(/(^.*)(```(?:[a-zA-Z]+)?(?:(?:.|\r|\n)*?)```)(.*\n?)$/gm);

    for (let index = 0; index < msgParts.length; index++) {
      // Verify if this part is code
      const part = msgParts[index];
      const codeMatch = part.match(/^```[\r\n]*(.*[\r\n\ ]?)[\r\n]*([\s\S]*?)```+?$/);

      if (codeMatch != null) {
        // Process highlight if this part is code
        const singleLine = codeMatch[0].indexOf('\n') === -1;
        const lang = !singleLine && Array.from(hljs.listLanguages()).includes(s.trim(codeMatch[1])) ? s.trim(codeMatch[1]) : '';
        const emptyLanguage = lang === '' ? s.unescapeHTML(codeMatch[1] + codeMatch[2]) : s.unescapeHTML(codeMatch[2]);
        const code = singleLine ? s.unescapeHTML(codeMatch[1]) : emptyLanguage;
        const result = lang === '' ? hljs.highlightAuto(lang + code) : hljs.highlight(lang, code);
        const token = `=!=${Random.id()}=!=`;
        message.tokens.push({
          highlight: true,
          token,
          text: `<pre><code class='code-colors hljs ${result.language}'><span class='copyonly'>\`\`\`<br></span>${result.value}<span class='copyonly'><br>\`\`\`</span></code></pre>`,
          noHtml: codeMatch[0]
        });
        msgParts[index] = token;
      } else {
        msgParts[index] = part;
      }
    } // Re-mount message


    return message.html = msgParts.join('');
  }
};

const code = message => {
  if (s.trim(message.html)) {
    if (message.tokens == null) {
      message.tokens = [];
    }

    codeblocks(message);
    inlinecode(message);
  }

  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"markdown.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/markdown.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  markdown: () => markdown
});
let Meteor;
module.watch(require("meteor/meteor"), {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);
let RocketChat;
module.watch(require("meteor/rocketchat:lib"), {
  RocketChat(v) {
    RocketChat = v;
  }

}, 2);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 3);

const parseNotEscaped = function (msg, message) {
  if (message && message.tokens == null) {
    message.tokens = [];
  }

  const addAsToken = function (html) {
    const token = `=!=${Random.id()}=!=`;
    message.tokens.push({
      token,
      text: html
    });
    return token;
  };

  const schemes = RocketChat.settings.get('Markdown_SupportSchemesForLink').split(',').join('|');

  if (RocketChat.settings.get('Markdown_Headers')) {
    // Support # Text for h1
    msg = msg.replace(/^# (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h1>$1</h1>'); // Support # Text for h2

    msg = msg.replace(/^## (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h2>$1</h2>'); // Support # Text for h3

    msg = msg.replace(/^### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h3>$1</h3>'); // Support # Text for h4

    msg = msg.replace(/^#### (([\S\w\d-_\/\*\.,\\][ \u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]?)+)/gm, '<h4>$1</h4>');
  } // Support *text* to make bold


  msg = msg.replace(/(^|&gt;|[ >_~`])\*{1,2}([^\*\r\n]+)\*{1,2}([<_~`]|\B|\b|$)/gm, '$1<span class="copyonly">*</span><strong>$2</strong><span class="copyonly">*</span>$3'); // Support _text_ to make italics

  msg = msg.replace(/(^|&gt;|[ >*~`])\_{1,2}([^\_\r\n]+)\_{1,2}([<*~`]|\B|\b|$)/gm, '$1<span class="copyonly">_</span><em>$2</em><span class="copyonly">_</span>$3'); // Support ~text~ to strike through text

  msg = msg.replace(/(^|&gt;|[ >_*`])\~{1,2}([^~\r\n]+)\~{1,2}([<_*`]|\B|\b|$)/gm, '$1<span class="copyonly">~</span><strike>$2</strike><span class="copyonly">~</span>$3'); // Support for block quote
  // >>>
  // Text
  // <<<

  msg = msg.replace(/(?:&gt;){3}\n+([\s\S]*?)\n+(?:&lt;){3}/g, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;&gt;&gt;</span>$1<span class="copyonly">&lt;&lt;&lt;</span></blockquote>'); // Support >Text for quote

  msg = msg.replace(/^&gt;(.*)$/gm, '<blockquote class="background-transparent-darker-before"><span class="copyonly">&gt;</span>$1</blockquote>'); // Remove white-space around blockquote (prevent <br>). Because blockquote is block element.

  msg = msg.replace(/\s*<blockquote class="background-transparent-darker-before">/gm, '<blockquote class="background-transparent-darker-before">');
  msg = msg.replace(/<\/blockquote>\s*/gm, '</blockquote>'); // Remove new-line between blockquotes.

  msg = msg.replace(/<\/blockquote>\n<blockquote/gm, '</blockquote><blockquote'); // Support ![alt text](http://image url)

  msg = msg.replace(new RegExp(`!\\[([^\\]]+)\\]\\(((?:${schemes}):\\/\\/[^\\)]+)\\)`, 'gm'), (match, title, url) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    return addAsToken(`<a href="${s.escapeHTML(url)}" title="${s.escapeHTML(title)}" target="${s.escapeHTML(target)}" rel="noopener noreferrer"><div class="inline-image" style="background-image: url(${s.escapeHTML(url)});"></div></a>`);
  }); // Support [Text](http://link)

  msg = msg.replace(new RegExp(`\\[([^\\]]+)\\]\\(((?:${schemes}):\\/\\/[^\\)]+)\\)`, 'gm'), (match, title, url) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    title = title.replace(/&amp;/g, '&');
    let escapedUrl = s.escapeHTML(url);
    escapedUrl = escapedUrl.replace(/&amp;/g, '&');
    return addAsToken(`<a href="${escapedUrl}" target="${s.escapeHTML(target)}" rel="noopener noreferrer">${s.escapeHTML(title)}</a>`);
  }); // Support <http://link|Text>

  msg = msg.replace(new RegExp(`(?:<|&lt;)((?:${schemes}):\\/\\/[^\\|]+)\\|(.+?)(?=>|&gt;)(?:>|&gt;)`, 'gm'), (match, url, title) => {
    const target = url.indexOf(Meteor.absoluteUrl()) === 0 ? '' : '_blank';
    return addAsToken(`<a href="${s.escapeHTML(url)}" target="${s.escapeHTML(target)}" rel="noopener noreferrer">${s.escapeHTML(title)}</a>`);
  });
  return msg;
};

const markdown = function (message) {
  message.html = parseNotEscaped(message.html, message);
  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"original.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_markdown/parser/original/original.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  original: () => original
});
let markdown;
module.watch(require("./markdown.js"), {
  markdown(v) {
    markdown = v;
  }

}, 0);
let code;
module.watch(require("./code.js"), {
  code(v) {
    code = v;
  }

}, 1);

const original = message => {
  // Parse markdown code
  message = code(message); // Parse markdown

  message = markdown(message); // Replace linebreak to br

  message.html = message.html.replace(/\n/gm, '<br>');
  return message;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:markdown/settings.js");
var exports = require("/node_modules/meteor/rocketchat:markdown/markdown.js");

/* Exports */
Package._define("rocketchat:markdown", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_markdown.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9tYXJrZG93bi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvbWFya2VkL21hcmtlZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvY29kZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYXJrZG93bi9wYXJzZXIvb3JpZ2luYWwvbWFya2Rvd24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6bWFya2Rvd24vcGFyc2VyL29yaWdpbmFsL29yaWdpbmFsLmpzIl0sIm5hbWVzIjpbIk1ldGVvciIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJSb2NrZXRDaGF0Iiwic3RhcnR1cCIsInNldHRpbmdzIiwiYWRkIiwidHlwZSIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImdyb3VwIiwic2VjdGlvbiIsInB1YmxpYyIsImVuYWJsZVF1ZXJ5T3JpZ2luYWwiLCJfaWQiLCJ2YWx1ZSIsImVuYWJsZVF1ZXJ5IiwiaTE4bkRlc2NyaXB0aW9uIiwiZW5hYmxlUXVlcnlNYXJrZWQiLCJzIiwiZGVmYXVsdCIsIkJsYXplIiwibWFya2VkIiwib3JpZ2luYWwiLCJjb2RlIiwicGFyc2VycyIsIk1hcmtkb3duQ2xhc3MiLCJwYXJzZSIsInRleHQiLCJtZXNzYWdlIiwiaHRtbCIsImVzY2FwZUhUTUwiLCJtb3VudFRva2Vuc0JhY2siLCJwYXJzZU1lc3NhZ2VOb3RFc2NhcGVkIiwicGFyc2VOb3RFc2NhcGVkIiwicGFyc2VyIiwiZ2V0IiwidXNlSHRtbCIsInRva2VucyIsImxlbmd0aCIsInRva2VuIiwibm9IdG1sIiwicmVwbGFjZSIsImFyZ3MiLCJNYXJrZG93biIsIk1hcmtkb3duTWVzc2FnZSIsInRyaW0iLCJ1bmRlZmluZWQiLCJjYWxsYmFja3MiLCJwcmlvcml0eSIsIkhJR0giLCJpc0NsaWVudCIsInJlZ2lzdGVySGVscGVyIiwib3V0cHV0IiwiZXhwb3J0IiwiUmFuZG9tIiwiXyIsImhsanMiLCJfbWFya2VkIiwicmVuZGVyZXIiLCJSZW5kZXJlciIsIm1zZyIsImxhbmciLCJlc2NhcGVkIiwib3B0aW9ucyIsImhpZ2hsaWdodCIsIm91dCIsImVzY2FwZSIsImlzU3RyaW5nIiwiaWQiLCJwdXNoIiwiY29kZXNwYW4iLCJibG9ja3F1b3RlIiwicXVvdGUiLCJlIiwiZ2ZtIiwidGFibGVzIiwiYnJlYWtzIiwicGVkYW50aWMiLCJzbWFydExpc3RzIiwic21hcnR5cGFudHMiLCJ1bmVzY2FwZUhUTUwiLCJzYW5pdGl6ZSIsImlubGluZWNvZGUiLCJtYXRjaCIsInAxIiwicDIiLCJjb2RlYmxvY2tzIiwiY291bnQiLCJtc2dQYXJ0cyIsInNwbGl0IiwiaW5kZXgiLCJwYXJ0IiwiY29kZU1hdGNoIiwic2luZ2xlTGluZSIsImluZGV4T2YiLCJBcnJheSIsImZyb20iLCJsaXN0TGFuZ3VhZ2VzIiwiaW5jbHVkZXMiLCJlbXB0eUxhbmd1YWdlIiwicmVzdWx0IiwiaGlnaGxpZ2h0QXV0byIsImxhbmd1YWdlIiwiam9pbiIsIm1hcmtkb3duIiwiYWRkQXNUb2tlbiIsInNjaGVtZXMiLCJSZWdFeHAiLCJ0aXRsZSIsInVybCIsInRhcmdldCIsImFic29sdXRlVXJsIiwiZXNjYXBlZFVybCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLE1BQUo7QUFBV0MsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGVBQVIsQ0FBYixFQUFzQztBQUFDSCxTQUFPSSxDQUFQLEVBQVM7QUFBQ0osYUFBT0ksQ0FBUDtBQUFTOztBQUFwQixDQUF0QyxFQUE0RCxDQUE1RDtB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TDtBQUFPOztBQUFoQixDQUFsQyxFQUFvRCxDQUFwRDs7QUFPekgsTUFBTXNCLFdBQVlNLE9BQUQsSUFBYTtBQUNwQztBQUNBQSxZQUFVTCxLQUFLSyxPQUFMLENBQVYsQ0FGb0MsQ0FJcEM7O0FBQ0FBLFlBQVU0RSxTQUFTNUUsT0FBVCxDQUFWLENBTG9DLENBT3BDOztBQUNBQSxVQUFRQyxJQUFSLEdBQWVELFFBQVFDLElBQVIsQ0FBYVksT0FBYixDQUFxQixNQUFyQixFQUE2QixNQUE3QixDQUFmO0FBRUEsU0FBT2IsT0FBUDtBQUNBLENBWE0sQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tYXJrZG93bi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX1BhcnNlcicsICdvcmlnaW5hbCcsIHtcblx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHR2YWx1ZXM6IFt7XG5cdFx0XHRrZXk6ICdkaXNhYmxlZCcsXG5cdFx0XHRpMThuTGFiZWw6ICdEaXNhYmxlZCcsXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnb3JpZ2luYWwnLFxuXHRcdFx0aTE4bkxhYmVsOiAnT3JpZ2luYWwnLFxuXHRcdH0sIHtcblx0XHRcdGtleTogJ21hcmtlZCcsXG5cdFx0XHRpMThuTGFiZWw6ICdNYXJrZWQnLFxuXHRcdH1dLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdH0pO1xuXG5cdGNvbnN0IGVuYWJsZVF1ZXJ5T3JpZ2luYWwgPSB7IF9pZDogJ01hcmtkb3duX1BhcnNlcicsIHZhbHVlOiAnb3JpZ2luYWwnIH07XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9IZWFkZXJzJywgZmFsc2UsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0Z3JvdXA6ICdNZXNzYWdlJyxcblx0XHRzZWN0aW9uOiAnTWFya2Rvd24nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRlbmFibGVRdWVyeTogZW5hYmxlUXVlcnlPcmlnaW5hbCxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9TdXBwb3J0U2NoZW1lc0ZvckxpbmsnLCAnaHR0cCxodHRwcycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ01hcmtkb3duX1N1cHBvcnRTY2hlbWVzRm9yTGlua19EZXNjcmlwdGlvbicsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5T3JpZ2luYWwsXG5cdH0pO1xuXG5cdGNvbnN0IGVuYWJsZVF1ZXJ5TWFya2VkID0geyBfaWQ6ICdNYXJrZG93bl9QYXJzZXInLCB2YWx1ZTogJ21hcmtlZCcgfTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9HRk0nLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9UYWJsZXMnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9CcmVha3MnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9QZWRhbnRpYycsIGZhbHNlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IFt7XG5cdFx0XHRfaWQ6ICdNYXJrZG93bl9QYXJzZXInLFxuXHRcdFx0dmFsdWU6ICdtYXJrZWQnLFxuXHRcdH0sIHtcblx0XHRcdF9pZDogJ01hcmtkb3duX01hcmtlZF9HRk0nLFxuXHRcdFx0dmFsdWU6IGZhbHNlLFxuXHRcdH1dLFxuXHR9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ01hcmtkb3duX01hcmtlZF9TbWFydExpc3RzJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRncm91cDogJ01lc3NhZ2UnLFxuXHRcdHNlY3Rpb246ICdNYXJrZG93bicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGVuYWJsZVF1ZXJ5OiBlbmFibGVRdWVyeU1hcmtlZCxcblx0fSk7XG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdNYXJrZG93bl9NYXJrZWRfU21hcnR5cGFudHMnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdGdyb3VwOiAnTWVzc2FnZScsXG5cdFx0c2VjdGlvbjogJ01hcmtkb3duJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0ZW5hYmxlUXVlcnk6IGVuYWJsZVF1ZXJ5TWFya2VkLFxuXHR9KTtcbn0pO1xuIiwiLypcbiAqIE1hcmtkb3duIGlzIGEgbmFtZWQgZnVuY3Rpb24gdGhhdCB3aWxsIHBhcnNlIG1hcmtkb3duIHN5bnRheFxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiAqL1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuaW1wb3J0IHsgTWV0ZW9yIH0gZnJvbSAnbWV0ZW9yL21ldGVvcic7XG5pbXBvcnQgeyBCbGF6ZSB9IGZyb20gJ21ldGVvci9ibGF6ZSc7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcblxuaW1wb3J0IHsgbWFya2VkIH0gZnJvbSAnLi9wYXJzZXIvbWFya2VkL21hcmtlZC5qcyc7XG5pbXBvcnQgeyBvcmlnaW5hbCB9IGZyb20gJy4vcGFyc2VyL29yaWdpbmFsL29yaWdpbmFsLmpzJztcblxuaW1wb3J0IHsgY29kZSB9IGZyb20gJy4vcGFyc2VyL29yaWdpbmFsL2NvZGUuanMnO1xuXG5jb25zdCBwYXJzZXJzID0ge1xuXHRvcmlnaW5hbCxcblx0bWFya2VkLFxufTtcblxuY2xhc3MgTWFya2Rvd25DbGFzcyB7XG5cdHBhcnNlKHRleHQpIHtcblx0XHRjb25zdCBtZXNzYWdlID0ge1xuXHRcdFx0aHRtbDogcy5lc2NhcGVIVE1MKHRleHQpLFxuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXMubW91bnRUb2tlbnNCYWNrKHRoaXMucGFyc2VNZXNzYWdlTm90RXNjYXBlZChtZXNzYWdlKSkuaHRtbDtcblx0fVxuXG5cdHBhcnNlTm90RXNjYXBlZCh0ZXh0KSB7XG5cdFx0Y29uc3QgbWVzc2FnZSA9IHtcblx0XHRcdGh0bWw6IHRleHQsXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5tb3VudFRva2Vuc0JhY2sodGhpcy5wYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpKS5odG1sO1xuXHR9XG5cblx0cGFyc2VNZXNzYWdlTm90RXNjYXBlZChtZXNzYWdlKSB7XG5cdFx0Y29uc3QgcGFyc2VyID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX1BhcnNlcicpO1xuXG5cdFx0aWYgKHBhcnNlciA9PT0gJ2Rpc2FibGVkJykge1xuXHRcdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBwYXJzZXJzW3BhcnNlcl0gPT09ICdmdW5jdGlvbicpIHtcblx0XHRcdHJldHVybiBwYXJzZXJzW3BhcnNlcl0obWVzc2FnZSk7XG5cdFx0fVxuXHRcdHJldHVybiBwYXJzZXJzLm9yaWdpbmFsKG1lc3NhZ2UpO1xuXHR9XG5cblx0bW91bnRUb2tlbnNCYWNrKG1lc3NhZ2UsIHVzZUh0bWwgPSB0cnVlKSB7XG5cdFx0aWYgKG1lc3NhZ2UudG9rZW5zICYmIG1lc3NhZ2UudG9rZW5zLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvciAoY29uc3QgeyB0b2tlbiwgdGV4dCwgbm9IdG1sIH0gb2YgbWVzc2FnZS50b2tlbnMpIHtcblx0XHRcdFx0bWVzc2FnZS5odG1sID0gbWVzc2FnZS5odG1sLnJlcGxhY2UodG9rZW4sICgpID0+ICh1c2VIdG1sID8gdGV4dCA6IG5vSHRtbCkpOyAvLyBVc2VzIGxhbWJkYSBzbyBkb2Vzbid0IG5lZWQgdG8gZXNjYXBlICRcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdGNvZGUoLi4uYXJncykge1xuXHRcdHJldHVybiBjb2RlKC4uLmFyZ3MpO1xuXHR9XG59XG5cbmNvbnN0IE1hcmtkb3duID0gbmV3IE1hcmtkb3duQ2xhc3M7XG5Sb2NrZXRDaGF0Lk1hcmtkb3duID0gTWFya2Rvd247XG5cbi8vIHJlbmRlck1lc3NhZ2UgYWxyZWFkeSBkaWQgaHRtbCBlc2NhcGVcbmNvbnN0IE1hcmtkb3duTWVzc2FnZSA9IChtZXNzYWdlKSA9PiB7XG5cdGlmIChzLnRyaW0obWVzc2FnZSAhPSBudWxsID8gbWVzc2FnZS5odG1sIDogdW5kZWZpbmVkKSkge1xuXHRcdG1lc3NhZ2UgPSBNYXJrZG93bi5wYXJzZU1lc3NhZ2VOb3RFc2NhcGVkKG1lc3NhZ2UpO1xuXHR9XG5cblx0cmV0dXJuIG1lc3NhZ2U7XG59O1xuXG5Sb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ3JlbmRlck1lc3NhZ2UnLCBNYXJrZG93bk1lc3NhZ2UsIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkhJR0gsICdtYXJrZG93bicpO1xuXG5pZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG5cdEJsYXplLnJlZ2lzdGVySGVscGVyKCdSb2NrZXRDaGF0TWFya2Rvd24nLCAodGV4dCkgPT4gTWFya2Rvd24ucGFyc2UodGV4dCkpO1xuXHRCbGF6ZS5yZWdpc3RlckhlbHBlcignUm9ja2V0Q2hhdE1hcmtkb3duVW5lc2NhcGUnLCAodGV4dCkgPT4gTWFya2Rvd24ucGFyc2VOb3RFc2NhcGVkKHRleHQpKTtcblx0QmxhemUucmVnaXN0ZXJIZWxwZXIoJ1JvY2tldENoYXRNYXJrZG93bklubGluZScsICh0ZXh0KSA9PiB7XG5cdFx0Y29uc3Qgb3V0cHV0ID0gTWFya2Rvd24ucGFyc2UodGV4dCk7XG5cdFx0cmV0dXJuIG91dHB1dC5yZXBsYWNlKC9ePHA+LywgJycpLnJlcGxhY2UoLzxcXC9wPiQvLCAnJyk7XG5cdH0pO1xufVxuIiwiaW1wb3J0IHsgUm9ja2V0Q2hhdCB9IGZyb20gJ21ldGVvci9yb2NrZXRjaGF0OmxpYic7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuaW1wb3J0IGhsanMgZnJvbSAnaGlnaGxpZ2h0LmpzJztcbmltcG9ydCBfbWFya2VkIGZyb20gJ21hcmtlZCc7XG5cbmNvbnN0IHJlbmRlcmVyID0gbmV3IF9tYXJrZWQuUmVuZGVyZXIoKTtcblxubGV0IG1zZyA9IG51bGw7XG5cbnJlbmRlcmVyLmNvZGUgPSBmdW5jdGlvbihjb2RlLCBsYW5nLCBlc2NhcGVkKSB7XG5cdGlmICh0aGlzLm9wdGlvbnMuaGlnaGxpZ2h0KSB7XG5cdFx0Y29uc3Qgb3V0ID0gdGhpcy5vcHRpb25zLmhpZ2hsaWdodChjb2RlLCBsYW5nKTtcblx0XHRpZiAob3V0ICE9IG51bGwgJiYgb3V0ICE9PSBjb2RlKSB7XG5cdFx0XHRlc2NhcGVkID0gdHJ1ZTtcblx0XHRcdGNvZGUgPSBvdXQ7XG5cdFx0fVxuXHR9XG5cblx0bGV0IHRleHQgPSBudWxsO1xuXG5cdGlmICghbGFuZykge1xuXHRcdHRleHQgPSBgPHByZT48Y29kZSBjbGFzcz1cImNvZGUtY29sb3JzIGhsanNcIj4keyAoZXNjYXBlZCA/IGNvZGUgOiBzLmVzY2FwZUhUTUwoY29kZSwgdHJ1ZSkpIH08L2NvZGU+PC9wcmU+YDtcblx0fSBlbHNlIHtcblx0XHR0ZXh0ID0gYDxwcmU+PGNvZGUgY2xhc3M9XCJjb2RlLWNvbG9ycyBobGpzICR7IGVzY2FwZShsYW5nLCB0cnVlKSB9XCI+JHsgKGVzY2FwZWQgPyBjb2RlIDogcy5lc2NhcGVIVE1MKGNvZGUsIHRydWUpKSB9PC9jb2RlPjwvcHJlPmA7XG5cdH1cblxuXHRpZiAoXy5pc1N0cmluZyhtc2cpKSB7XG5cdFx0cmV0dXJuIHRleHQ7XG5cdH1cblxuXHRjb25zdCB0b2tlbiA9IGA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblx0bXNnLnRva2Vucy5wdXNoKHtcblx0XHRoaWdobGlnaHQ6IHRydWUsXG5cdFx0dG9rZW4sXG5cdFx0dGV4dCxcblx0fSk7XG5cblx0cmV0dXJuIHRva2VuO1xufTtcblxucmVuZGVyZXIuY29kZXNwYW4gPSBmdW5jdGlvbih0ZXh0KSB7XG5cdHRleHQgPSBgPGNvZGUgY2xhc3M9XCJjb2RlLWNvbG9ycyBpbmxpbmVcIj4keyB0ZXh0IH08L2NvZGU+YDtcblx0aWYgKF8uaXNTdHJpbmcobXNnKSkge1xuXHRcdHJldHVybiB0ZXh0O1xuXHR9XG5cblx0Y29uc3QgdG9rZW4gPSBgPSE9JHsgUmFuZG9tLmlkKCkgfT0hPWA7XG5cdG1zZy50b2tlbnMucHVzaCh7XG5cdFx0dG9rZW4sXG5cdFx0dGV4dCxcblx0fSk7XG5cblx0cmV0dXJuIHRva2VuO1xufTtcblxucmVuZGVyZXIuYmxvY2txdW90ZSA9IGZ1bmN0aW9uKHF1b3RlKSB7XG5cdHJldHVybiBgPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj4keyBxdW90ZSB9PC9ibG9ja3F1b3RlPmA7XG59O1xuXG5jb25zdCBoaWdobGlnaHQgPSBmdW5jdGlvbihjb2RlLCBsYW5nKSB7XG5cdGlmICghbGFuZykge1xuXHRcdHJldHVybiBjb2RlO1xuXHR9XG5cdHRyeSB7XG5cdFx0cmV0dXJuIGhsanMuaGlnaGxpZ2h0KGxhbmcsIGNvZGUpLnZhbHVlO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0Ly8gVW5rbm93biBsYW5ndWFnZVxuXHRcdHJldHVybiBjb2RlO1xuXHR9XG59O1xuXG5sZXQgZ2ZtID0gbnVsbDtcbmxldCB0YWJsZXMgPSBudWxsO1xubGV0IGJyZWFrcyA9IG51bGw7XG5sZXQgcGVkYW50aWMgPSBudWxsO1xubGV0IHNtYXJ0TGlzdHMgPSBudWxsO1xubGV0IHNtYXJ0eXBhbnRzID0gbnVsbDtcblxuZXhwb3J0IGNvbnN0IG1hcmtlZCA9IChtZXNzYWdlKSA9PiB7XG5cdG1zZyA9IG1lc3NhZ2U7XG5cblx0aWYgKCFtc2cudG9rZW5zKSB7XG5cdFx0bXNnLnRva2VucyA9IFtdO1xuXHR9XG5cblx0aWYgKGdmbSA9PSBudWxsKSB7IGdmbSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfR0ZNJyk7IH1cblx0aWYgKHRhYmxlcyA9PSBudWxsKSB7IHRhYmxlcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfVGFibGVzJyk7IH1cblx0aWYgKGJyZWFrcyA9PSBudWxsKSB7IGJyZWFrcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9NYXJrZWRfQnJlYWtzJyk7IH1cblx0aWYgKHBlZGFudGljID09IG51bGwpIHsgcGVkYW50aWMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fTWFya2VkX1BlZGFudGljJyk7IH1cblx0aWYgKHNtYXJ0TGlzdHMgPT0gbnVsbCkgeyBzbWFydExpc3RzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX01hcmtlZF9TbWFydExpc3RzJyk7IH1cblx0aWYgKHNtYXJ0eXBhbnRzID09IG51bGwpIHsgc21hcnR5cGFudHMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fTWFya2VkX1NtYXJ0eXBhbnRzJyk7IH1cblxuXHRtc2cuaHRtbCA9IF9tYXJrZWQocy51bmVzY2FwZUhUTUwobXNnLmh0bWwpLCB7XG5cdFx0Z2ZtLFxuXHRcdHRhYmxlcyxcblx0XHRicmVha3MsXG5cdFx0cGVkYW50aWMsXG5cdFx0c21hcnRMaXN0cyxcblx0XHRzbWFydHlwYW50cyxcblx0XHRyZW5kZXJlcixcblx0XHRzYW5pdGl6ZTogdHJ1ZSxcblx0XHRoaWdobGlnaHQsXG5cdH0pO1xuXG5cdHJldHVybiBtc2c7XG59O1xuIiwiLypcbiAqIGNvZGUoKSBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwYXJzZSBgaW5saW5lIGNvZGVgIGFuZCBgYGBjb2RlYmxvY2tgYGAgc3ludGF4ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2JqZWN0XG4gKi9cbmltcG9ydCB7IFJhbmRvbSB9IGZyb20gJ21ldGVvci9yYW5kb20nO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuaW1wb3J0IGhsanMgZnJvbSAnaGlnaGxpZ2h0LmpzJztcblxuY29uc3QgaW5saW5lY29kZSA9IChtZXNzYWdlKSA9PlxuXHQvLyBTdXBwb3J0IGB0ZXh0YFxuXHRtZXNzYWdlLmh0bWwgPSBtZXNzYWdlLmh0bWwucmVwbGFjZSgvXFxgKFteYFxcclxcbl0rKVxcYChbPF8qfl18XFxCfFxcYnwkKS9nbSwgKG1hdGNoLCBwMSwgcDIpID0+IHtcblx0XHRjb25zdCB0b2tlbiA9IGAgPSE9JHsgUmFuZG9tLmlkKCkgfT0hPWA7XG5cblx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdHRva2VuLFxuXHRcdFx0dGV4dDogYDxzcGFuIGNsYXNzPVxcXCJjb3B5b25seVxcXCI+XFxgPC9zcGFuPjxzcGFuPjxjb2RlIGNsYXNzPVxcXCJjb2RlLWNvbG9ycyBpbmxpbmVcXFwiPiR7IHAxIH08L2NvZGU+PC9zcGFuPjxzcGFuIGNsYXNzPVxcXCJjb3B5b25seVxcXCI+XFxgPC9zcGFuPiR7IHAyIH1gLFxuXHRcdFx0bm9IdG1sOiBtYXRjaCxcblx0XHR9KTtcblxuXHRcdHJldHVybiB0b2tlbjtcblx0fSlcbjtcblxuY29uc3QgY29kZWJsb2NrcyA9IChtZXNzYWdlKSA9PiB7XG5cdC8vIENvdW50IG9jY3VyZW5jaWVzIG9mIGBgYFxuXHRjb25zdCBjb3VudCA9IChtZXNzYWdlLmh0bWwubWF0Y2goL2BgYC9nKSB8fCBbXSkubGVuZ3RoO1xuXG5cdGlmIChjb3VudCkge1xuXG5cdFx0Ly8gQ2hlY2sgaWYgd2UgbmVlZCB0byBhZGQgYSBmaW5hbCBgYGBcblx0XHRpZiAoKGNvdW50ICUgMikgPiAwKSB7XG5cdFx0XHRtZXNzYWdlLmh0bWwgPSBgJHsgbWVzc2FnZS5odG1sIH1cXG5cXGBcXGBcXGBgO1xuXHRcdFx0bWVzc2FnZS5tc2cgPSBgJHsgbWVzc2FnZS5tc2cgfVxcblxcYFxcYFxcYGA7XG5cdFx0fVxuXG5cdFx0Ly8gU2VwYXJhdGUgdGV4dCBpbiBjb2RlIGJsb2NrcyBhbmQgbm9uIGNvZGUgYmxvY2tzXG5cdFx0Y29uc3QgbXNnUGFydHMgPSBtZXNzYWdlLmh0bWwuc3BsaXQoLyheLiopKGBgYCg/OlthLXpBLVpdKyk/KD86KD86LnxcXHJ8XFxuKSo/KWBgYCkoLipcXG4/KSQvZ20pO1xuXG5cdFx0Zm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IG1zZ1BhcnRzLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdFx0Ly8gVmVyaWZ5IGlmIHRoaXMgcGFydCBpcyBjb2RlXG5cdFx0XHRjb25zdCBwYXJ0ID0gbXNnUGFydHNbaW5kZXhdO1xuXHRcdFx0Y29uc3QgY29kZU1hdGNoID0gcGFydC5tYXRjaCgvXmBgYFtcXHJcXG5dKiguKltcXHJcXG5cXCBdPylbXFxyXFxuXSooW1xcc1xcU10qPylgYGArPyQvKTtcblxuXHRcdFx0aWYgKGNvZGVNYXRjaCAhPSBudWxsKSB7XG5cdFx0XHRcdC8vIFByb2Nlc3MgaGlnaGxpZ2h0IGlmIHRoaXMgcGFydCBpcyBjb2RlXG5cdFx0XHRcdGNvbnN0IHNpbmdsZUxpbmUgPSBjb2RlTWF0Y2hbMF0uaW5kZXhPZignXFxuJykgPT09IC0xO1xuXHRcdFx0XHRjb25zdCBsYW5nID0gIXNpbmdsZUxpbmUgJiYgQXJyYXkuZnJvbShobGpzLmxpc3RMYW5ndWFnZXMoKSkuaW5jbHVkZXMocy50cmltKGNvZGVNYXRjaFsxXSkpID8gcy50cmltKGNvZGVNYXRjaFsxXSkgOiAnJztcblx0XHRcdFx0Y29uc3QgZW1wdHlMYW5ndWFnZSA9IGxhbmcgPT09ICcnID8gcy51bmVzY2FwZUhUTUwoY29kZU1hdGNoWzFdICsgY29kZU1hdGNoWzJdKSA6IHMudW5lc2NhcGVIVE1MKGNvZGVNYXRjaFsyXSk7XG5cdFx0XHRcdGNvbnN0IGNvZGUgPSBzaW5nbGVMaW5lID8gcy51bmVzY2FwZUhUTUwoY29kZU1hdGNoWzFdKSA6IGVtcHR5TGFuZ3VhZ2U7XG5cblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gbGFuZyA9PT0gJycgPyBobGpzLmhpZ2hsaWdodEF1dG8oKGxhbmcgKyBjb2RlKSkgOiBobGpzLmhpZ2hsaWdodChsYW5nLCBjb2RlKTtcblx0XHRcdFx0Y29uc3QgdG9rZW4gPSBgPSE9JHsgUmFuZG9tLmlkKCkgfT0hPWA7XG5cblx0XHRcdFx0bWVzc2FnZS50b2tlbnMucHVzaCh7XG5cdFx0XHRcdFx0aGlnaGxpZ2h0OiB0cnVlLFxuXHRcdFx0XHRcdHRva2VuLFxuXHRcdFx0XHRcdHRleHQ6IGA8cHJlPjxjb2RlIGNsYXNzPSdjb2RlLWNvbG9ycyBobGpzICR7IHJlc3VsdC5sYW5ndWFnZSB9Jz48c3BhbiBjbGFzcz0nY29weW9ubHknPlxcYFxcYFxcYDxicj48L3NwYW4+JHsgcmVzdWx0LnZhbHVlIH08c3BhbiBjbGFzcz0nY29weW9ubHknPjxicj5cXGBcXGBcXGA8L3NwYW4+PC9jb2RlPjwvcHJlPmAsXG5cdFx0XHRcdFx0bm9IdG1sOiBjb2RlTWF0Y2hbMF0sXG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdG1zZ1BhcnRzW2luZGV4XSA9IHRva2VuO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bXNnUGFydHNbaW5kZXhdID0gcGFydDtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBSZS1tb3VudCBtZXNzYWdlXG5cdFx0cmV0dXJuIG1lc3NhZ2UuaHRtbCA9IG1zZ1BhcnRzLmpvaW4oJycpO1xuXHR9XG59O1xuXG5leHBvcnQgY29uc3QgY29kZSA9IChtZXNzYWdlKSA9PiB7XG5cdGlmIChzLnRyaW0obWVzc2FnZS5odG1sKSkge1xuXHRcdGlmIChtZXNzYWdlLnRva2VucyA9PSBudWxsKSB7XG5cdFx0XHRtZXNzYWdlLnRva2VucyA9IFtdO1xuXHRcdH1cblxuXHRcdGNvZGVibG9ja3MobWVzc2FnZSk7XG5cdFx0aW5saW5lY29kZShtZXNzYWdlKTtcblx0fVxuXG5cdHJldHVybiBtZXNzYWdlO1xufTtcbiIsIi8qXG4gKiBNYXJrZG93biBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwYXJzZSBtYXJrZG93biBzeW50YXhcbiAqIEBwYXJhbSB7U3RyaW5nfSBtc2cgLSBUaGUgbWVzc2FnZSBodG1sXG4gKi9cbmltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgUmFuZG9tIH0gZnJvbSAnbWV0ZW9yL3JhbmRvbSc7XG5pbXBvcnQgeyBSb2NrZXRDaGF0IH0gZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bGliJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcblxuY29uc3QgcGFyc2VOb3RFc2NhcGVkID0gZnVuY3Rpb24obXNnLCBtZXNzYWdlKSB7XG5cdGlmIChtZXNzYWdlICYmIG1lc3NhZ2UudG9rZW5zID09IG51bGwpIHtcblx0XHRtZXNzYWdlLnRva2VucyA9IFtdO1xuXHR9XG5cblx0Y29uc3QgYWRkQXNUb2tlbiA9IGZ1bmN0aW9uKGh0bWwpIHtcblx0XHRjb25zdCB0b2tlbiA9IGA9IT0keyBSYW5kb20uaWQoKSB9PSE9YDtcblx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdHRva2VuLFxuXHRcdFx0dGV4dDogaHRtbCxcblx0XHR9KTtcblxuXHRcdHJldHVybiB0b2tlbjtcblx0fTtcblxuXHRjb25zdCBzY2hlbWVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01hcmtkb3duX1N1cHBvcnRTY2hlbWVzRm9yTGluaycpLnNwbGl0KCcsJykuam9pbignfCcpO1xuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWFya2Rvd25fSGVhZGVycycpKSB7XG5cdFx0Ly8gU3VwcG9ydCAjIFRleHQgZm9yIGgxXG5cdFx0bXNnID0gbXNnLnJlcGxhY2UoL14jICgoW1xcU1xcd1xcZC1fXFwvXFwqXFwuLFxcXFxdWyBcXHUwMGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwLVxcdTIwMGFcXHUyMDI4XFx1MjAyOVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdPykrKS9nbSwgJzxoMT4kMTwvaDE+Jyk7XG5cblx0XHQvLyBTdXBwb3J0ICMgVGV4dCBmb3IgaDJcblx0XHRtc2cgPSBtc2cucmVwbGFjZSgvXiMjICgoW1xcU1xcd1xcZC1fXFwvXFwqXFwuLFxcXFxdWyBcXHUwMGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwLVxcdTIwMGFcXHUyMDI4XFx1MjAyOVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdPykrKS9nbSwgJzxoMj4kMTwvaDI+Jyk7XG5cblx0XHQvLyBTdXBwb3J0ICMgVGV4dCBmb3IgaDNcblx0XHRtc2cgPSBtc2cucmVwbGFjZSgvXiMjIyAoKFtcXFNcXHdcXGQtX1xcL1xcKlxcLixcXFxcXVsgXFx1MDBhMFxcdTE2ODBcXHUxODBlXFx1MjAwMC1cXHUyMDBhXFx1MjAyOFxcdTIwMjlcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHVmZWZmXT8pKykvZ20sICc8aDM+JDE8L2gzPicpO1xuXG5cdFx0Ly8gU3VwcG9ydCAjIFRleHQgZm9yIGg0XG5cdFx0bXNnID0gbXNnLnJlcGxhY2UoL14jIyMjICgoW1xcU1xcd1xcZC1fXFwvXFwqXFwuLFxcXFxdWyBcXHUwMGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwLVxcdTIwMGFcXHUyMDI4XFx1MjAyOVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdWZlZmZdPykrKS9nbSwgJzxoND4kMTwvaDQ+Jyk7XG5cdH1cblxuXHQvLyBTdXBwb3J0ICp0ZXh0KiB0byBtYWtlIGJvbGRcblx0bXNnID0gbXNnLnJlcGxhY2UoLyhefCZndDt8WyA+X35gXSlcXCp7MSwyfShbXlxcKlxcclxcbl0rKVxcKnsxLDJ9KFs8X35gXXxcXEJ8XFxifCQpL2dtLCAnJDE8c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Kjwvc3Bhbj48c3Ryb25nPiQyPC9zdHJvbmc+PHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPio8L3NwYW4+JDMnKTtcblxuXHQvLyBTdXBwb3J0IF90ZXh0XyB0byBtYWtlIGl0YWxpY3Ncblx0bXNnID0gbXNnLnJlcGxhY2UoLyhefCZndDt8WyA+Kn5gXSlcXF97MSwyfShbXlxcX1xcclxcbl0rKVxcX3sxLDJ9KFs8Kn5gXXxcXEJ8XFxifCQpL2dtLCAnJDE8c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Xzwvc3Bhbj48ZW0+JDI8L2VtPjxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj5fPC9zcGFuPiQzJyk7XG5cblx0Ly8gU3VwcG9ydCB+dGV4dH4gdG8gc3RyaWtlIHRocm91Z2ggdGV4dFxuXHRtc2cgPSBtc2cucmVwbGFjZSgvKF58Jmd0O3xbID5fKmBdKVxcfnsxLDJ9KFteflxcclxcbl0rKVxcfnsxLDJ9KFs8XypgXXxcXEJ8XFxifCQpL2dtLCAnJDE8c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+fjwvc3Bhbj48c3RyaWtlPiQyPC9zdHJpa2U+PHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPn48L3NwYW4+JDMnKTtcblxuXHQvLyBTdXBwb3J0IGZvciBibG9jayBxdW90ZVxuXHQvLyA+Pj5cblx0Ly8gVGV4dFxuXHQvLyA8PDxcblx0bXNnID0gbXNnLnJlcGxhY2UoLyg/OiZndDspezN9XFxuKyhbXFxzXFxTXSo/KVxcbisoPzombHQ7KXszfS9nLCAnPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj48c3BhbiBjbGFzcz1cImNvcHlvbmx5XCI+Jmd0OyZndDsmZ3Q7PC9zcGFuPiQxPHNwYW4gY2xhc3M9XCJjb3B5b25seVwiPiZsdDsmbHQ7Jmx0Ozwvc3Bhbj48L2Jsb2NrcXVvdGU+Jyk7XG5cblx0Ly8gU3VwcG9ydCA+VGV4dCBmb3IgcXVvdGVcblx0bXNnID0gbXNnLnJlcGxhY2UoL14mZ3Q7KC4qKSQvZ20sICc8YmxvY2txdW90ZSBjbGFzcz1cImJhY2tncm91bmQtdHJhbnNwYXJlbnQtZGFya2VyLWJlZm9yZVwiPjxzcGFuIGNsYXNzPVwiY29weW9ubHlcIj4mZ3Q7PC9zcGFuPiQxPC9ibG9ja3F1b3RlPicpO1xuXG5cdC8vIFJlbW92ZSB3aGl0ZS1zcGFjZSBhcm91bmQgYmxvY2txdW90ZSAocHJldmVudCA8YnI+KS4gQmVjYXVzZSBibG9ja3F1b3RlIGlzIGJsb2NrIGVsZW1lbnQuXG5cdG1zZyA9IG1zZy5yZXBsYWNlKC9cXHMqPGJsb2NrcXVvdGUgY2xhc3M9XCJiYWNrZ3JvdW5kLXRyYW5zcGFyZW50LWRhcmtlci1iZWZvcmVcIj4vZ20sICc8YmxvY2txdW90ZSBjbGFzcz1cImJhY2tncm91bmQtdHJhbnNwYXJlbnQtZGFya2VyLWJlZm9yZVwiPicpO1xuXHRtc2cgPSBtc2cucmVwbGFjZSgvPFxcL2Jsb2NrcXVvdGU+XFxzKi9nbSwgJzwvYmxvY2txdW90ZT4nKTtcblxuXHQvLyBSZW1vdmUgbmV3LWxpbmUgYmV0d2VlbiBibG9ja3F1b3Rlcy5cblx0bXNnID0gbXNnLnJlcGxhY2UoLzxcXC9ibG9ja3F1b3RlPlxcbjxibG9ja3F1b3RlL2dtLCAnPC9ibG9ja3F1b3RlPjxibG9ja3F1b3RlJyk7XG5cblx0Ly8gU3VwcG9ydCAhW2FsdCB0ZXh0XShodHRwOi8vaW1hZ2UgdXJsKVxuXHRtc2cgPSBtc2cucmVwbGFjZShuZXcgUmVnRXhwKGAhXFxcXFsoW15cXFxcXV0rKVxcXFxdXFxcXCgoKD86JHsgc2NoZW1lcyB9KTpcXFxcL1xcXFwvW15cXFxcKV0rKVxcXFwpYCwgJ2dtJyksIChtYXRjaCwgdGl0bGUsIHVybCkgPT4ge1xuXHRcdGNvbnN0IHRhcmdldCA9IHVybC5pbmRleE9mKE1ldGVvci5hYnNvbHV0ZVVybCgpKSA9PT0gMCA/ICcnIDogJ19ibGFuayc7XG5cdFx0cmV0dXJuIGFkZEFzVG9rZW4oYDxhIGhyZWY9XCIkeyBzLmVzY2FwZUhUTUwodXJsKSB9XCIgdGl0bGU9XCIkeyBzLmVzY2FwZUhUTUwodGl0bGUpIH1cIiB0YXJnZXQ9XCIkeyBzLmVzY2FwZUhUTUwodGFyZ2V0KSB9XCIgcmVsPVwibm9vcGVuZXIgbm9yZWZlcnJlclwiPjxkaXYgY2xhc3M9XCJpbmxpbmUtaW1hZ2VcIiBzdHlsZT1cImJhY2tncm91bmQtaW1hZ2U6IHVybCgkeyBzLmVzY2FwZUhUTUwodXJsKSB9KTtcIj48L2Rpdj48L2E+YCk7XG5cdH0pO1xuXG5cdC8vIFN1cHBvcnQgW1RleHRdKGh0dHA6Ly9saW5rKVxuXHRtc2cgPSBtc2cucmVwbGFjZShuZXcgUmVnRXhwKGBcXFxcWyhbXlxcXFxdXSspXFxcXF1cXFxcKCgoPzokeyBzY2hlbWVzIH0pOlxcXFwvXFxcXC9bXlxcXFwpXSspXFxcXClgLCAnZ20nKSwgKG1hdGNoLCB0aXRsZSwgdXJsKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gdXJsLmluZGV4T2YoTWV0ZW9yLmFic29sdXRlVXJsKCkpID09PSAwID8gJycgOiAnX2JsYW5rJztcblx0XHR0aXRsZSA9IHRpdGxlLnJlcGxhY2UoLyZhbXA7L2csICcmJyk7XG5cblx0XHRsZXQgZXNjYXBlZFVybCA9IHMuZXNjYXBlSFRNTCh1cmwpO1xuXHRcdGVzY2FwZWRVcmwgPSBlc2NhcGVkVXJsLnJlcGxhY2UoLyZhbXA7L2csICcmJyk7XG5cblx0XHRyZXR1cm4gYWRkQXNUb2tlbihgPGEgaHJlZj1cIiR7IGVzY2FwZWRVcmwgfVwiIHRhcmdldD1cIiR7IHMuZXNjYXBlSFRNTCh0YXJnZXQpIH1cIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCI+JHsgcy5lc2NhcGVIVE1MKHRpdGxlKSB9PC9hPmApO1xuXHR9KTtcblxuXHQvLyBTdXBwb3J0IDxodHRwOi8vbGlua3xUZXh0PlxuXHRtc2cgPSBtc2cucmVwbGFjZShuZXcgUmVnRXhwKGAoPzo8fCZsdDspKCg/OiR7IHNjaGVtZXMgfSk6XFxcXC9cXFxcL1teXFxcXHxdKylcXFxcfCguKz8pKD89PnwmZ3Q7KSg/Oj58Jmd0OylgLCAnZ20nKSwgKG1hdGNoLCB1cmwsIHRpdGxlKSA9PiB7XG5cdFx0Y29uc3QgdGFyZ2V0ID0gdXJsLmluZGV4T2YoTWV0ZW9yLmFic29sdXRlVXJsKCkpID09PSAwID8gJycgOiAnX2JsYW5rJztcblx0XHRyZXR1cm4gYWRkQXNUb2tlbihgPGEgaHJlZj1cIiR7IHMuZXNjYXBlSFRNTCh1cmwpIH1cIiB0YXJnZXQ9XCIkeyBzLmVzY2FwZUhUTUwodGFyZ2V0KSB9XCIgcmVsPVwibm9vcGVuZXIgbm9yZWZlcnJlclwiPiR7IHMuZXNjYXBlSFRNTCh0aXRsZSkgfTwvYT5gKTtcblx0fSk7XG5cblx0cmV0dXJuIG1zZztcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrZG93biA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0bWVzc2FnZS5odG1sID0gcGFyc2VOb3RFc2NhcGVkKG1lc3NhZ2UuaHRtbCwgbWVzc2FnZSk7XG5cdHJldHVybiBtZXNzYWdlO1xufTtcbiIsIi8qXG4gKiBNYXJrZG93biBpcyBhIG5hbWVkIGZ1bmN0aW9uIHRoYXQgd2lsbCBwYXJzZSBtYXJrZG93biBzeW50YXhcbiAqIEBwYXJhbSB7T2JqZWN0fSBtZXNzYWdlIC0gVGhlIG1lc3NhZ2Ugb2JqZWN0XG4gKi9cbmltcG9ydCB7IG1hcmtkb3duIH0gZnJvbSAnLi9tYXJrZG93bi5qcyc7XG5pbXBvcnQgeyBjb2RlIH0gZnJvbSAnLi9jb2RlLmpzJztcblxuZXhwb3J0IGNvbnN0IG9yaWdpbmFsID0gKG1lc3NhZ2UpID0+IHtcblx0Ly8gUGFyc2UgbWFya2Rvd24gY29kZVxuXHRtZXNzYWdlID0gY29kZShtZXNzYWdlKTtcblxuXHQvLyBQYXJzZSBtYXJrZG93blxuXHRtZXNzYWdlID0gbWFya2Rvd24obWVzc2FnZSk7XG5cblx0Ly8gUmVwbGFjZSBsaW5lYnJlYWsgdG8gYnJcblx0bWVzc2FnZS5odG1sID0gbWVzc2FnZS5odG1sLnJlcGxhY2UoL1xcbi9nbSwgJzxicj4nKTtcblxuXHRyZXR1cm4gbWVzc2FnZTtcbn07XG4iXX0=
