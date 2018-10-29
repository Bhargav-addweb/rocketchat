(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var ECMAScript = Package.ecmascript.ECMAScript;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Inject = Package['meteorhacks:inject-initial'].Inject;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:ui-master":{"server":{"inject.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/rocketchat_ui-master/server/inject.js                                                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
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

const renderDynamicCssList = _.debounce(Meteor.bindEnvironment(() => {
  // const variables = RocketChat.models.Settings.findOne({_id:'theme-custom-variables'}, {fields: { value: 1}});
  const colors = RocketChat.models.Settings.find({
    _id: /theme-color-rc/i
  }, {
    fields: {
      value: 1,
      editor: 1
    }
  }).fetch().filter(color => color && color.value);

  if (!colors) {
    return;
  }

  const css = colors.map(({
    _id,
    value,
    editor
  }) => {
    if (editor === 'expression') {
      return `--${_id.replace('theme-color-', '')}: var(--${value});`;
    }

    return `--${_id.replace('theme-color-', '')}: ${value};`;
  }).join('\n');
  Inject.rawBody('dynamic-variables', `<style id='css-variables'> :root {${css}}</style>`);
}), 500);

renderDynamicCssList(); // RocketChat.models.Settings.find({_id:'theme-custom-variables'}, {fields: { value: 1}}).observe({
// 	changed: renderDynamicCssList
// });

RocketChat.models.Settings.find({
  _id: /theme-color-rc/i
}, {
  fields: {
    value: 1
  }
}).observe({
  changed: renderDynamicCssList
});
Inject.rawHead('noreferrer', '<meta name="referrer" content="origin-when-crossorigin">');
Inject.rawHead('dynamic', `<script>${Assets.getText('server/dynamic-css.js')}</script>`);
Inject.rawBody('icons', Assets.getText('public/icons.svg'));
Inject.rawBody('page-loading-div', `
<div id="initial-page-loading" class="page-loading">
	<div class="loading-animation">
		<div class="bounce bounce1"></div>
		<div class="bounce bounce2"></div>
		<div class="bounce bounce3"></div>
	</div>
</div>`);

if (process.env.DISABLE_ANIMATION || process.env.TEST_MODE === 'true') {
  Inject.rawHead('disable-animation', `
	<style>
		body, body * {
			animation: none !important;
			transition: none !important;
		}
	</style>
	<script>
		window.DISABLE_ANIMATION = true;
	</script>
	`);
}

RocketChat.settings.get('Assets_SvgFavicon_Enable', (key, value) => {
  const standardFavicons = `
		<link rel="icon" sizes="16x16" type="image/png" href="assets/favicon_16.png" />
		<link rel="icon" sizes="32x32" type="image/png" href="assets/favicon_32.png" />`;

  if (value) {
    Inject.rawHead(key, `${standardFavicons}
			<link rel="icon" sizes="any" type="image/svg+xml" href="assets/favicon.svg" />`);
  } else {
    Inject.rawHead(key, standardFavicons);
  }
});
RocketChat.settings.get('theme-color-sidebar-background', (key, value) => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta name="msapplication-TileColor" content="${escapedValue}" />` + `<meta name="theme-color" content="${escapedValue}" />`);
});
RocketChat.settings.get('Accounts_ForgetUserSessionOnWindowClose', (key, value) => {
  if (value) {
    Inject.rawModHtml(key, html => {
      const script = `
				<script>
					if (Meteor._localStorage._data === undefined && window.sessionStorage) {
						Meteor._localStorage = window.sessionStorage;
					}
				</script>
			`;
      return html.replace(/<\/body>/, `${script}\n</body>`);
    });
  } else {
    Inject.rawModHtml(key, html => html);
  }
});
RocketChat.settings.get('Site_Name', (key, value = 'Rocket.Chat') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<title>${escapedValue}</title>` + `<meta name="application-name" content="${escapedValue}">` + `<meta name="apple-mobile-web-app-title" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_language', (key, value = '') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta http-equiv="content-language" content="${escapedValue}">` + `<meta name="language" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_robots', (key, value = '') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta name="robots" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_msvalidate01', (key, value = '') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta name="msvalidate.01" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_google-site-verification', (key, value = '') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta name="google-site-verification" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_fb_app_id', (key, value = '') => {
  const escapedValue = s.escapeHTML(value);
  Inject.rawHead(key, `<meta property="fb:app_id" content="${escapedValue}">`);
});
RocketChat.settings.get('Meta_custom', (key, value = '') => {
  Inject.rawHead(key, value);
});
Meteor.defer(() => {
  let baseUrl;

  if (__meteor_runtime_config__.ROOT_URL_PATH_PREFIX && __meteor_runtime_config__.ROOT_URL_PATH_PREFIX.trim() !== '') {
    baseUrl = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
  } else {
    baseUrl = '/';
  }

  if (/\/$/.test(baseUrl) === false) {
    baseUrl += '/';
  }

  Inject.rawHead('base', `<base href="${baseUrl}">`);
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:ui-master/server/inject.js");

/* Exports */
Package._define("rocketchat:ui-master");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_ui-master.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp1aS1tYXN0ZXIvc2VydmVyL2luamVjdC5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzIiwicmVuZGVyRHluYW1pY0Nzc0xpc3QiLCJkZWJvdW5jZSIsIk1ldGVvciIsImJpbmRFbnZpcm9ubWVudCIsImNvbG9ycyIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJTZXR0aW5ncyIsImZpbmQiLCJfaWQiLCJmaWVsZHMiLCJ2YWx1ZSIsImVkaXRvciIsImZldGNoIiwiZmlsdGVyIiwiY29sb3IiLCJjc3MiLCJtYXAiLCJyZXBsYWNlIiwiam9pbiIsIkluamVjdCIsInJhd0JvZHkiLCJvYnNlcnZlIiwiY2hhbmdlZCIsInJhd0hlYWQiLCJBc3NldHMiLCJnZXRUZXh0IiwicHJvY2VzcyIsImVudiIsIkRJU0FCTEVfQU5JTUFUSU9OIiwiVEVTVF9NT0RFIiwic2V0dGluZ3MiLCJnZXQiLCJrZXkiLCJzdGFuZGFyZEZhdmljb25zIiwiZXNjYXBlZFZhbHVlIiwiZXNjYXBlSFRNTCIsInJhd01vZEh0bWwiLCJodG1sIiwic2NyaXB0IiwiZGVmZXIiLCJiYXNlVXJsIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsIlJPT1RfVVJMX1BBVEhfUFJFRklYIiwidHJpbSIsInRlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSUEsQ0FBSjs7QUFBTUMsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYixFQUFtQztBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0wsUUFBRUssQ0FBRjtBQUFJOztBQUFoQixDQUFuQyxFQUFxRCxDQUFyRDtBQUF3RCxJQUFJQyxDQUFKO0FBQU1MLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxtQkFBUixDQUFiLEVBQTBDO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFD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RCxFQUFoSCxFQUFvSDtBQUNuSEgsY0FBVUMsMEJBQTBCQyxvQkFBcEM7QUFDQSxHQUZELE1BRU87QUFDTkYsY0FBVSxHQUFWO0FBQ0E7O0FBQ0QsTUFBSSxNQUFNSSxJQUFOLENBQVdKLE9BQVgsTUFBd0IsS0FBNUIsRUFBbUM7QUFDbENBLGVBQVcsR0FBWDtBQUNBOztBQUNEckIsU0FBT0ksT0FBUCxDQUFlLE1BQWYsRUFBd0IsZUFBZWlCLE9BQVMsSUFBaEQ7QUFDQSxDQVhELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfdWktbWFzdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBJbmplY3QgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5jb25zdCByZW5kZXJEeW5hbWljQ3NzTGlzdCA9IF8uZGVib3VuY2UoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiB7XG5cdC8vIGNvbnN0IHZhcmlhYmxlcyA9IFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmRPbmUoe19pZDondGhlbWUtY3VzdG9tLXZhcmlhYmxlcyd9LCB7ZmllbGRzOiB7IHZhbHVlOiAxfX0pO1xuXHRjb25zdCBjb2xvcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKHsgX2lkOi90aGVtZS1jb2xvci1yYy9pIH0sIHsgZmllbGRzOiB7IHZhbHVlOiAxLCBlZGl0b3I6IDEgfSB9KS5mZXRjaCgpLmZpbHRlcigoY29sb3IpID0+IGNvbG9yICYmIGNvbG9yLnZhbHVlKTtcblxuXHRpZiAoIWNvbG9ycykge1xuXHRcdHJldHVybjtcblx0fVxuXHRjb25zdCBjc3MgPSBjb2xvcnMubWFwKCh7IF9pZCwgdmFsdWUsIGVkaXRvciB9KSA9PiB7XG5cdFx0aWYgKGVkaXRvciA9PT0gJ2V4cHJlc3Npb24nKSB7XG5cdFx0XHRyZXR1cm4gYC0tJHsgX2lkLnJlcGxhY2UoJ3RoZW1lLWNvbG9yLScsICcnKSB9OiB2YXIoLS0keyB2YWx1ZSB9KTtgO1xuXHRcdH1cblx0XHRyZXR1cm4gYC0tJHsgX2lkLnJlcGxhY2UoJ3RoZW1lLWNvbG9yLScsICcnKSB9OiAkeyB2YWx1ZSB9O2A7XG5cdH0pLmpvaW4oJ1xcbicpO1xuXHRJbmplY3QucmF3Qm9keSgnZHluYW1pYy12YXJpYWJsZXMnLCBgPHN0eWxlIGlkPSdjc3MtdmFyaWFibGVzJz4gOnJvb3QgeyR7IGNzcyB9fTwvc3R5bGU+YCk7XG59KSwgNTAwKTtcblxucmVuZGVyRHluYW1pY0Nzc0xpc3QoKTtcblxuLy8gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZCh7X2lkOid0aGVtZS1jdXN0b20tdmFyaWFibGVzJ30sIHtmaWVsZHM6IHsgdmFsdWU6IDF9fSkub2JzZXJ2ZSh7XG4vLyBcdGNoYW5nZWQ6IHJlbmRlckR5bmFtaWNDc3NMaXN0XG4vLyB9KTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZCh7IF9pZDovdGhlbWUtY29sb3ItcmMvaSB9LCB7IGZpZWxkczogeyB2YWx1ZTogMSB9IH0pLm9ic2VydmUoe1xuXHRjaGFuZ2VkOiByZW5kZXJEeW5hbWljQ3NzTGlzdCxcbn0pO1xuXG5JbmplY3QucmF3SGVhZCgnbm9yZWZlcnJlcicsICc8bWV0YSBuYW1lPVwicmVmZXJyZXJcIiBjb250ZW50PVwib3JpZ2luLXdoZW4tY3Jvc3NvcmlnaW5cIj4nKTtcbkluamVjdC5yYXdIZWFkKCdkeW5hbWljJywgYDxzY3JpcHQ+JHsgQXNzZXRzLmdldFRleHQoJ3NlcnZlci9keW5hbWljLWNzcy5qcycpIH08L3NjcmlwdD5gKTtcblxuSW5qZWN0LnJhd0JvZHkoJ2ljb25zJywgQXNzZXRzLmdldFRleHQoJ3B1YmxpYy9pY29ucy5zdmcnKSk7XG5cbkluamVjdC5yYXdCb2R5KCdwYWdlLWxvYWRpbmctZGl2JywgYFxuPGRpdiBpZD1cImluaXRpYWwtcGFnZS1sb2FkaW5nXCIgY2xhc3M9XCJwYWdlLWxvYWRpbmdcIj5cblx0PGRpdiBjbGFzcz1cImxvYWRpbmctYW5pbWF0aW9uXCI+XG5cdFx0PGRpdiBjbGFzcz1cImJvdW5jZSBib3VuY2UxXCI+PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cImJvdW5jZSBib3VuY2UyXCI+PC9kaXY+XG5cdFx0PGRpdiBjbGFzcz1cImJvdW5jZSBib3VuY2UzXCI+PC9kaXY+XG5cdDwvZGl2PlxuPC9kaXY+YCk7XG5cbmlmIChwcm9jZXNzLmVudi5ESVNBQkxFX0FOSU1BVElPTiB8fCBwcm9jZXNzLmVudi5URVNUX01PREUgPT09ICd0cnVlJykge1xuXHRJbmplY3QucmF3SGVhZCgnZGlzYWJsZS1hbmltYXRpb24nLCBgXG5cdDxzdHlsZT5cblx0XHRib2R5LCBib2R5ICoge1xuXHRcdFx0YW5pbWF0aW9uOiBub25lICFpbXBvcnRhbnQ7XG5cdFx0XHR0cmFuc2l0aW9uOiBub25lICFpbXBvcnRhbnQ7XG5cdFx0fVxuXHQ8L3N0eWxlPlxuXHQ8c2NyaXB0PlxuXHRcdHdpbmRvdy5ESVNBQkxFX0FOSU1BVElPTiA9IHRydWU7XG5cdDwvc2NyaXB0PlxuXHRgKTtcbn1cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Fzc2V0c19TdmdGYXZpY29uX0VuYWJsZScsIChrZXksIHZhbHVlKSA9PiB7XG5cdGNvbnN0IHN0YW5kYXJkRmF2aWNvbnMgPSBgXG5cdFx0PGxpbmsgcmVsPVwiaWNvblwiIHNpemVzPVwiMTZ4MTZcIiB0eXBlPVwiaW1hZ2UvcG5nXCIgaHJlZj1cImFzc2V0cy9mYXZpY29uXzE2LnBuZ1wiIC8+XG5cdFx0PGxpbmsgcmVsPVwiaWNvblwiIHNpemVzPVwiMzJ4MzJcIiB0eXBlPVwiaW1hZ2UvcG5nXCIgaHJlZj1cImFzc2V0cy9mYXZpY29uXzMyLnBuZ1wiIC8+YDtcblxuXHRpZiAodmFsdWUpIHtcblx0XHRJbmplY3QucmF3SGVhZChrZXksXG5cdFx0XHRgJHsgc3RhbmRhcmRGYXZpY29ucyB9XG5cdFx0XHQ8bGluayByZWw9XCJpY29uXCIgc2l6ZXM9XCJhbnlcIiB0eXBlPVwiaW1hZ2Uvc3ZnK3htbFwiIGhyZWY9XCJhc3NldHMvZmF2aWNvbi5zdmdcIiAvPmApO1xuXHR9IGVsc2Uge1xuXHRcdEluamVjdC5yYXdIZWFkKGtleSwgc3RhbmRhcmRGYXZpY29ucyk7XG5cdH1cbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndGhlbWUtY29sb3Itc2lkZWJhci1iYWNrZ3JvdW5kJywgKGtleSwgdmFsdWUpID0+IHtcblx0Y29uc3QgZXNjYXBlZFZhbHVlID0gcy5lc2NhcGVIVE1MKHZhbHVlKTtcblx0SW5qZWN0LnJhd0hlYWQoa2V5LCBgPG1ldGEgbmFtZT1cIm1zYXBwbGljYXRpb24tVGlsZUNvbG9yXCIgY29udGVudD1cIiR7IGVzY2FwZWRWYWx1ZSB9XCIgLz5gICtcblx0XHRcdFx0XHRcdGA8bWV0YSBuYW1lPVwidGhlbWUtY29sb3JcIiBjb250ZW50PVwiJHsgZXNjYXBlZFZhbHVlIH1cIiAvPmApO1xufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19Gb3JnZXRVc2VyU2Vzc2lvbk9uV2luZG93Q2xvc2UnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRpZiAodmFsdWUpIHtcblx0XHRJbmplY3QucmF3TW9kSHRtbChrZXksIChodG1sKSA9PiB7XG5cdFx0XHRjb25zdCBzY3JpcHQgPSBgXG5cdFx0XHRcdDxzY3JpcHQ+XG5cdFx0XHRcdFx0aWYgKE1ldGVvci5fbG9jYWxTdG9yYWdlLl9kYXRhID09PSB1bmRlZmluZWQgJiYgd2luZG93LnNlc3Npb25TdG9yYWdlKSB7XG5cdFx0XHRcdFx0XHRNZXRlb3IuX2xvY2FsU3RvcmFnZSA9IHdpbmRvdy5zZXNzaW9uU3RvcmFnZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdDwvc2NyaXB0PlxuXHRcdFx0YDtcblx0XHRcdHJldHVybiBodG1sLnJlcGxhY2UoLzxcXC9ib2R5Pi8sIGAkeyBzY3JpcHQgfVxcbjwvYm9keT5gKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRJbmplY3QucmF3TW9kSHRtbChrZXksIChodG1sKSA9PiBodG1sKTtcblx0fVxufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdTaXRlX05hbWUnLCAoa2V5LCB2YWx1ZSA9ICdSb2NrZXQuQ2hhdCcpID0+IHtcblx0Y29uc3QgZXNjYXBlZFZhbHVlID0gcy5lc2NhcGVIVE1MKHZhbHVlKTtcblx0SW5qZWN0LnJhd0hlYWQoa2V5LFxuXHRcdGA8dGl0bGU+JHsgZXNjYXBlZFZhbHVlIH08L3RpdGxlPmAgK1xuXHRcdGA8bWV0YSBuYW1lPVwiYXBwbGljYXRpb24tbmFtZVwiIGNvbnRlbnQ9XCIkeyBlc2NhcGVkVmFsdWUgfVwiPmAgK1xuXHRcdGA8bWV0YSBuYW1lPVwiYXBwbGUtbW9iaWxlLXdlYi1hcHAtdGl0bGVcIiBjb250ZW50PVwiJHsgZXNjYXBlZFZhbHVlIH1cIj5gKTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWV0YV9sYW5ndWFnZScsIChrZXksIHZhbHVlID0gJycpID0+IHtcblx0Y29uc3QgZXNjYXBlZFZhbHVlID0gcy5lc2NhcGVIVE1MKHZhbHVlKTtcblx0SW5qZWN0LnJhd0hlYWQoa2V5LFxuXHRcdGA8bWV0YSBodHRwLWVxdWl2PVwiY29udGVudC1sYW5ndWFnZVwiIGNvbnRlbnQ9XCIkeyBlc2NhcGVkVmFsdWUgfVwiPmAgK1xuXHRcdGA8bWV0YSBuYW1lPVwibGFuZ3VhZ2VcIiBjb250ZW50PVwiJHsgZXNjYXBlZFZhbHVlIH1cIj5gKTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWV0YV9yb2JvdHMnLCAoa2V5LCB2YWx1ZSA9ICcnKSA9PiB7XG5cdGNvbnN0IGVzY2FwZWRWYWx1ZSA9IHMuZXNjYXBlSFRNTCh2YWx1ZSk7XG5cdEluamVjdC5yYXdIZWFkKGtleSwgYDxtZXRhIG5hbWU9XCJyb2JvdHNcIiBjb250ZW50PVwiJHsgZXNjYXBlZFZhbHVlIH1cIj5gKTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWV0YV9tc3ZhbGlkYXRlMDEnLCAoa2V5LCB2YWx1ZSA9ICcnKSA9PiB7XG5cdGNvbnN0IGVzY2FwZWRWYWx1ZSA9IHMuZXNjYXBlSFRNTCh2YWx1ZSk7XG5cdEluamVjdC5yYXdIZWFkKGtleSwgYDxtZXRhIG5hbWU9XCJtc3ZhbGlkYXRlLjAxXCIgY29udGVudD1cIiR7IGVzY2FwZWRWYWx1ZSB9XCI+YCk7XG59KTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01ldGFfZ29vZ2xlLXNpdGUtdmVyaWZpY2F0aW9uJywgKGtleSwgdmFsdWUgPSAnJykgPT4ge1xuXHRjb25zdCBlc2NhcGVkVmFsdWUgPSBzLmVzY2FwZUhUTUwodmFsdWUpO1xuXHRJbmplY3QucmF3SGVhZChrZXksIGA8bWV0YSBuYW1lPVwiZ29vZ2xlLXNpdGUtdmVyaWZpY2F0aW9uXCIgY29udGVudD1cIiR7IGVzY2FwZWRWYWx1ZSB9XCI+YCk7XG59KTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ01ldGFfZmJfYXBwX2lkJywgKGtleSwgdmFsdWUgPSAnJykgPT4ge1xuXHRjb25zdCBlc2NhcGVkVmFsdWUgPSBzLmVzY2FwZUhUTUwodmFsdWUpO1xuXHRJbmplY3QucmF3SGVhZChrZXksIGA8bWV0YSBwcm9wZXJ0eT1cImZiOmFwcF9pZFwiIGNvbnRlbnQ9XCIkeyBlc2NhcGVkVmFsdWUgfVwiPmApO1xufSk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNZXRhX2N1c3RvbScsIChrZXksIHZhbHVlID0gJycpID0+IHtcblx0SW5qZWN0LnJhd0hlYWQoa2V5LCB2YWx1ZSk7XG59KTtcblxuTWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0bGV0IGJhc2VVcmw7XG5cdGlmIChfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYICYmIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVgudHJpbSgpICE9PSAnJykge1xuXHRcdGJhc2VVcmwgPSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYO1xuXHR9IGVsc2Uge1xuXHRcdGJhc2VVcmwgPSAnLyc7XG5cdH1cblx0aWYgKC9cXC8kLy50ZXN0KGJhc2VVcmwpID09PSBmYWxzZSkge1xuXHRcdGJhc2VVcmwgKz0gJy8nO1xuXHR9XG5cdEluamVjdC5yYXdIZWFkKCdiYXNlJywgYDxiYXNlIGhyZWY9XCIkeyBiYXNlVXJsIH1cIj5gKTtcbn0pO1xuIl19
