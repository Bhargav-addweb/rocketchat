(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:mailer":{"server":{"api.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_mailer/server/api.js                                                                      //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  replacekey: () => replacekey,
  translate: () => translate,
  replace: () => replace,
  replaceEscaped: () => replaceEscaped,
  wrap: () => wrap,
  inlinecss: () => inlinecss,
  getTemplate: () => getTemplate,
  getTemplateWrapped: () => getTemplateWrapped,
  setSettings: () => setSettings,
  rfcMailPatternWithName: () => rfcMailPatternWithName,
  checkAddressFormat: () => checkAddressFormat,
  sendNoWrap: () => sendNoWrap,
  send: () => send,
  checkAddressFormatAndThrow: () => checkAddressFormatAndThrow,
  getHeader: () => getHeader,
  getFooter: () => getFooter
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 1);
let juice;
module.watch(require("juice"), {
  default(v) {
    juice = v;
  }

}, 2);
let contentHeader;
let contentFooter;
let body;
let Settings = {
  get: () => {}
};

const replacekey = (str, key, value = '') => str.replace(new RegExp(`(\\[${key}\\]|__${key}__)`, 'igm'), value);

const translate = str => str.replace(/\{ ?([^\} ]+)(( ([^\}]+))+)? ?\}/gmi, (match, key) => TAPi18n.__(key));

const replace = function replace(str, data = {}) {
  if (!str) {
    return '';
  }

  const options = (0, _objectSpread2.default)({
    Site_Name: Settings.get('Site_Name'),
    Site_URL: Settings.get('Site_Url'),
    Site_URL_Slash: Settings.get('Site_Url').replace(/\/?$/, '/')
  }, data.name && {
    fname: s.strLeft(data.name, ' '),
    lname: s.strRightBack(data.name, ' ')
  }, data);
  return Object.entries(options).reduce((ret, [key, value]) => replacekey(ret, key, value), translate(str));
};

const replaceEscaped = (str, data = {}) => replace(str, (0, _objectSpread2.default)({
  Site_Name: s.escapeHTML(RocketChat.settings.get('Site_Name')),
  Site_Url: s.escapeHTML(RocketChat.settings.get('Site_Url'))
}, Object.entries(data).reduce((ret, [key, value]) => {
  ret[key] = s.escapeHTML(value);
  return ret;
}, {})));

const wrap = (html, data = {}) => replaceEscaped(body.replace('{{body}}', html), data);

const inlinecss = html => juice.inlineContent(html, Settings.get('email_style'));

const getTemplate = (template, fn, escape = true) => {
  let html = '';
  Settings.get(template, (key, value) => {
    html = value || '';
    fn(escape ? inlinecss(html) : html);
  });
  Settings.get('email_style', () => {
    fn(escape ? inlinecss(html) : html);
  });
};

const getTemplateWrapped = (template, fn) => {
  let html = '';

  const wrapInlineCSS = _.debounce(() => fn(wrap(inlinecss(html))), 100);

  Settings.get('Email_Header', () => html && wrapInlineCSS());
  Settings.get('Email_Footer', () => html && wrapInlineCSS());
  Settings.get('email_style', () => html && wrapInlineCSS());
  Settings.get(template, (key, value) => {
    html = value || '';
    return html && wrapInlineCSS();
  });
};

const setSettings = s => {
  Settings = s;
  getTemplate('Email_Header', value => {
    contentHeader = replace(value || '');
    body = inlinecss(`${contentHeader} {{body}} ${contentFooter}`);
  }, false);
  getTemplate('Email_Footer', value => {
    contentFooter = replace(value || '');
    body = inlinecss(`${contentHeader} {{body}} ${contentFooter}`);
  }, false);
  body = inlinecss(`${contentHeader} {{body}} ${contentFooter}`);
};

const rfcMailPatternWithName = /^(?:.*<)?([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)(?:>?)$/;

const checkAddressFormat = from => rfcMailPatternWithName.test(from);

const sendNoWrap = ({
  to,
  from,
  subject,
  html
}) => {
  if (!checkAddressFormat(to)) {
    return;
  }

  Meteor.defer(() => Email.send({
    to,
    from,
    subject,
    html
  }));
};

const send = ({
  to,
  from,
  subject,
  html,
  data
}) => sendNoWrap({
  to,
  from,
  subject: replace(subject, data),
  html: wrap(html, data)
});

const checkAddressFormatAndThrow = (from, func) => {
  if (checkAddressFormat(from)) {
    return true;
  }

  throw new Meteor.Error('error-invalid-from-address', 'Invalid from address', {
    function: func
  });
};

const getHeader = () => contentHeader;

const getFooter = () => contentFooter;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:mailer/server/api.js");

/* Exports */
Package._define("rocketchat:mailer", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_mailer.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDptYWlsZXIvc2VydmVyL2FwaS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJyZXBsYWNla2V5IiwidHJhbnNsYXRlIiwicmVwbGFjZSIsInJlcGxhY2VFc2NhcGVkIiwid3JhcCIsImlubGluZWNzcyIsImdldFRlbXBsYXRlIiwiZ2V0VGVtcGxhdGVXcmFwcGVkIiwic2V0U2V0dGluZ3MiLCJyZmNNYWlsUGF0dGVybldpdGhOYW1lIiwiY2hlY2tBZGRyZXNzRm9ybWF0Iiwic2VuZE5vV3JhcCIsInNlbmQiLCJjaGVja0FkZHJlc3NGb3JtYXRBbmRUaHJvdyIsImdldEhlYWRlciIsImdldEZvb3RlciIsIl8iLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInMiLCJqdWljZSIsImNvbnRlbnRIZWFkZXIiLCJjb250ZW50Rm9vdGVyIiwiYm9keSIsIlNldHRpbmdzIiwiZ2V0Iiwic3RyIiwia2V5IiwidmFsdWUiLCJSZWdFeHAiLCJtYXRjaCIsIlRBUGkxOG4iLCJfXyIsImRhdGEiLCJvcHRpb25zIiwiU2l0ZV9OYW1lIiwiU2l0ZV9VUkwiLCJTaXRlX1VSTF9TbGFzaCIsIm5hbWUiLCJmbmFtZSIsInN0ckxlZnQiLCJsbmFtZSIsInN0clJpZ2h0QmFjayIsIk9iamVjdCIsImVudHJpZXMiLCJyZWR1Y2UiLCJyZXQiLCJlc2NhcGVIVE1MIiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiU2l0ZV9VcmwiLCJodG1sIiwiaW5saW5lQ29udGVudCIsInRlbXBsYXRlIiwiZm4iLCJlc2NhcGUiLCJ3cmFwSW5saW5lQ1NTIiwiZGVib3VuY2UiLCJmcm9tIiwidGVzdCIsInRvIiwic3ViamVjdCIsIk1ldGVvciIsImRlZmVyIiwiRW1haWwiLCJmdW5jIiwiRXJyb3IiLCJmdW5jdGlvbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUFBLE9BQU9DLE1B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LGFBQXhCOztBQUVBLE1BQU1SLFlBQVksTUFBTVMsYUFBeEIsQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9tYWlsZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCBzIGZyb20gJ3VuZGVyc2NvcmUuc3RyaW5nJztcbmltcG9ydCBqdWljZSBmcm9tICdqdWljZSc7XG5sZXQgY29udGVudEhlYWRlcjtcbmxldCBjb250ZW50Rm9vdGVyO1xuXG5sZXQgYm9keTtcbmxldCBTZXR0aW5ncyA9IHtcblx0Z2V0OiAoKSA9PiB7fSxcbn07XG5cbmV4cG9ydCBjb25zdCByZXBsYWNla2V5ID0gKHN0ciwga2V5LCB2YWx1ZSA9ICcnKSA9PiBzdHIucmVwbGFjZShuZXcgUmVnRXhwKGAoXFxcXFskeyBrZXkgfVxcXFxdfF9fJHsga2V5IH1fXylgLCAnaWdtJyksIHZhbHVlKTtcblxuZXhwb3J0IGNvbnN0IHRyYW5zbGF0ZSA9IChzdHIpID0+IHN0ci5yZXBsYWNlKC9cXHsgPyhbXlxcfSBdKykoKCAoW15cXH1dKykpKyk/ID9cXH0vZ21pLCAobWF0Y2gsIGtleSkgPT4gVEFQaTE4bi5fXyhrZXkpKTtcbmV4cG9ydCBjb25zdCByZXBsYWNlID0gZnVuY3Rpb24gcmVwbGFjZShzdHIsIGRhdGEgPSB7fSkge1xuXHRpZiAoIXN0cikge1xuXHRcdHJldHVybiAnJztcblx0fVxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFNpdGVfTmFtZTogU2V0dGluZ3MuZ2V0KCdTaXRlX05hbWUnKSxcblx0XHRTaXRlX1VSTDogU2V0dGluZ3MuZ2V0KCdTaXRlX1VybCcpLFxuXHRcdFNpdGVfVVJMX1NsYXNoOiBTZXR0aW5ncy5nZXQoJ1NpdGVfVXJsJykucmVwbGFjZSgvXFwvPyQvLCAnLycpLFxuXHRcdC4uLihkYXRhLm5hbWUgJiYge1xuXHRcdFx0Zm5hbWU6IHMuc3RyTGVmdChkYXRhLm5hbWUsICcgJyksXG5cdFx0XHRsbmFtZTogcy5zdHJSaWdodEJhY2soZGF0YS5uYW1lLCAnICcpLFxuXHRcdH0pLFxuXHRcdC4uLmRhdGEsXG5cdH07XG5cdHJldHVybiBPYmplY3QuZW50cmllcyhvcHRpb25zKS5yZWR1Y2UoKHJldCwgW2tleSwgdmFsdWVdKSA9PiByZXBsYWNla2V5KHJldCwga2V5LCB2YWx1ZSksIHRyYW5zbGF0ZShzdHIpKTtcbn07XG5cbmV4cG9ydCBjb25zdCByZXBsYWNlRXNjYXBlZCA9IChzdHIsIGRhdGEgPSB7fSkgPT4gcmVwbGFjZShzdHIsIHtcblx0U2l0ZV9OYW1lOiBzLmVzY2FwZUhUTUwoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1NpdGVfTmFtZScpKSxcblx0U2l0ZV9Vcmw6IHMuZXNjYXBlSFRNTChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2l0ZV9VcmwnKSksXG5cdC4uLk9iamVjdC5lbnRyaWVzKGRhdGEpLnJlZHVjZSgocmV0LCBba2V5LCB2YWx1ZV0pID0+IHtcblx0XHRyZXRba2V5XSA9IHMuZXNjYXBlSFRNTCh2YWx1ZSk7XG5cdFx0cmV0dXJuIHJldDtcblx0fSwge30pLFxufSk7XG5leHBvcnQgY29uc3Qgd3JhcCA9IChodG1sLCBkYXRhID0ge30pID0+IHJlcGxhY2VFc2NhcGVkKGJvZHkucmVwbGFjZSgne3tib2R5fX0nLCBodG1sKSwgZGF0YSk7XG5leHBvcnQgY29uc3QgaW5saW5lY3NzID0gKGh0bWwpID0+IGp1aWNlLmlubGluZUNvbnRlbnQoaHRtbCwgU2V0dGluZ3MuZ2V0KCdlbWFpbF9zdHlsZScpKTtcbmV4cG9ydCBjb25zdCBnZXRUZW1wbGF0ZSA9ICh0ZW1wbGF0ZSwgZm4sIGVzY2FwZSA9IHRydWUpID0+IHtcblx0bGV0IGh0bWwgPSAnJztcblx0U2V0dGluZ3MuZ2V0KHRlbXBsYXRlLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdGh0bWwgPSB2YWx1ZSB8fCAnJztcblx0XHRmbihlc2NhcGUgPyBpbmxpbmVjc3MoaHRtbCkgOiBodG1sKTtcblx0fSk7XG5cdFNldHRpbmdzLmdldCgnZW1haWxfc3R5bGUnLCAoKSA9PiB7XG5cdFx0Zm4oZXNjYXBlID8gaW5saW5lY3NzKGh0bWwpIDogaHRtbCk7XG5cdH0pO1xufTtcbmV4cG9ydCBjb25zdCBnZXRUZW1wbGF0ZVdyYXBwZWQgPSAodGVtcGxhdGUsIGZuKSA9PiB7XG5cdGxldCBodG1sID0gJyc7XG5cdGNvbnN0IHdyYXBJbmxpbmVDU1MgPSBfLmRlYm91bmNlKCgpID0+IGZuKHdyYXAoaW5saW5lY3NzKGh0bWwpKSksIDEwMCk7XG5cblx0U2V0dGluZ3MuZ2V0KCdFbWFpbF9IZWFkZXInLCAoKSA9PiBodG1sICYmIHdyYXBJbmxpbmVDU1MoKSk7XG5cdFNldHRpbmdzLmdldCgnRW1haWxfRm9vdGVyJywgKCkgPT4gaHRtbCAmJiB3cmFwSW5saW5lQ1NTKCkpO1xuXHRTZXR0aW5ncy5nZXQoJ2VtYWlsX3N0eWxlJywgKCkgPT4gaHRtbCAmJiB3cmFwSW5saW5lQ1NTKCkpO1xuXHRTZXR0aW5ncy5nZXQodGVtcGxhdGUsIChrZXksIHZhbHVlKSA9PiB7XG5cdFx0aHRtbCA9IHZhbHVlIHx8ICcnO1xuXHRcdHJldHVybiBodG1sICYmIHdyYXBJbmxpbmVDU1MoKTtcblx0fSk7XG59O1xuZXhwb3J0IGNvbnN0IHNldFNldHRpbmdzID0gKHMpID0+IHtcblx0U2V0dGluZ3MgPSBzO1xuXG5cdGdldFRlbXBsYXRlKCdFbWFpbF9IZWFkZXInLCAodmFsdWUpID0+IHtcblx0XHRjb250ZW50SGVhZGVyID0gcmVwbGFjZSh2YWx1ZSB8fCAnJyk7XG5cdFx0Ym9keSA9IGlubGluZWNzcyhgJHsgY29udGVudEhlYWRlciB9IHt7Ym9keX19ICR7IGNvbnRlbnRGb290ZXIgfWApO1xuXHR9LCBmYWxzZSk7XG5cblx0Z2V0VGVtcGxhdGUoJ0VtYWlsX0Zvb3RlcicsICh2YWx1ZSkgPT4ge1xuXHRcdGNvbnRlbnRGb290ZXIgPSByZXBsYWNlKHZhbHVlIHx8ICcnKTtcblx0XHRib2R5ID0gaW5saW5lY3NzKGAkeyBjb250ZW50SGVhZGVyIH0ge3tib2R5fX0gJHsgY29udGVudEZvb3RlciB9YCk7XG5cdH0sIGZhbHNlKTtcblxuXHRib2R5ID0gaW5saW5lY3NzKGAkeyBjb250ZW50SGVhZGVyIH0ge3tib2R5fX0gJHsgY29udGVudEZvb3RlciB9YCk7XG59O1xuXG5leHBvcnQgY29uc3QgcmZjTWFpbFBhdHRlcm5XaXRoTmFtZSA9IC9eKD86Lio8KT8oW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKikoPzo+PykkLztcblxuZXhwb3J0IGNvbnN0IGNoZWNrQWRkcmVzc0Zvcm1hdCA9IChmcm9tKSA9PiByZmNNYWlsUGF0dGVybldpdGhOYW1lLnRlc3QoZnJvbSk7XG5cbmV4cG9ydCBjb25zdCBzZW5kTm9XcmFwID0gKHsgdG8sIGZyb20sIHN1YmplY3QsIGh0bWwgfSkgPT4ge1xuXHRpZiAoIWNoZWNrQWRkcmVzc0Zvcm1hdCh0bykpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0TWV0ZW9yLmRlZmVyKCgpID0+IEVtYWlsLnNlbmQoeyB0bywgZnJvbSwgc3ViamVjdCwgaHRtbCB9KSk7XG59O1xuXG5leHBvcnQgY29uc3Qgc2VuZCA9ICh7IHRvLCBmcm9tLCBzdWJqZWN0LCBodG1sLCBkYXRhIH0pID0+IHNlbmROb1dyYXAoeyB0bywgZnJvbSwgc3ViamVjdDogcmVwbGFjZShzdWJqZWN0LCBkYXRhKSwgaHRtbDogd3JhcChodG1sLCBkYXRhKSB9KTtcblxuZXhwb3J0IGNvbnN0IGNoZWNrQWRkcmVzc0Zvcm1hdEFuZFRocm93ID0gKGZyb20sIGZ1bmMpID0+IHtcblx0aWYgKGNoZWNrQWRkcmVzc0Zvcm1hdChmcm9tKSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZnJvbS1hZGRyZXNzJywgJ0ludmFsaWQgZnJvbSBhZGRyZXNzJywge1xuXHRcdGZ1bmN0aW9uOiBmdW5jLFxuXHR9KTtcbn07XG5cbmV4cG9ydCBjb25zdCBnZXRIZWFkZXIgPSAoKSA9PiBjb250ZW50SGVhZGVyO1xuXG5leHBvcnQgY29uc3QgZ2V0Rm9vdGVyID0gKCkgPT4gY29udGVudEZvb3RlcjtcbiJdfQ==
