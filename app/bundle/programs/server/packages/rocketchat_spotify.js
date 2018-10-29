(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var OEmbed = Package['rocketchat:oembed'].OEmbed;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:spotify":{"lib":{"spotify.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_spotify/lib/spotify.js                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

const process = function (message, source, callback) {
  if (s.trim(source)) {
    // Separate text in code blocks and non code blocks
    const msgParts = source.split(/(```\w*[\n ]?[\s\S]*?```+?)|(`(?:[^`]+)`)/);

    for (let index = 0; index < msgParts.length; index++) {
      // Verify if this part is code
      const part = msgParts[index];

      if ((part != null ? part.length > 0 : undefined) != null) {
        const codeMatch = part.match(/(?:```(\w*)[\n ]?([\s\S]*?)```+?)|(?:`(?:[^`]+)`)/);

        if (codeMatch == null) {
          callback(message, msgParts, index, part);
        }
      }
    }
  }
};

class Spotify {
  static transform(message) {
    let urls = [];

    if (Array.isArray(message.urls)) {
      urls = urls.concat(message.urls);
    }

    let changed = false;
    process(message, message.msg, function (message, msgParts, index, part) {
      const re = /(?:^|\s)spotify:([^:\s]+):([^:\s]+)(?::([^:\s]+))?(?::(\S+))?(?:\s|$)/g;
      let match;

      while (match = re.exec(part)) {
        const data = _.filter(match.slice(1), value => value != null);

        const path = _.map(data, value => _.escape(value)).join('/');

        const url = `https://open.spotify.com/${path}`;
        urls.push({
          url,
          source: `spotify:${data.join(':')}`
        });
        changed = true;
      }
    }); // Re-mount message

    if (changed) {
      message.urls = urls;
    }

    return message;
  }

  static render(message) {
    process(message, message.html, function (message, msgParts, index, part) {
      if (Array.isArray(message.urls)) {
        for (const item of Array.from(message.urls)) {
          if (item.source) {
            const quotedSource = item.source.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
            const re = new RegExp(`(^|\\s)${quotedSource}(\\s|$)`, 'g');
            msgParts[index] = part.replace(re, `$1<a href="${item.url}" target="_blank">${item.source}</a>$2`);
          }
        }

        return message.html = msgParts.join('');
      }
    });
    return message;
  }

}

RocketChat.callbacks.add('beforeSaveMessage', Spotify.transform, RocketChat.callbacks.priority.LOW, 'spotify-save');
RocketChat.callbacks.add('renderMessage', Spotify.render, RocketChat.callbacks.priority.MEDIUM, 'spotify-render');
RocketChat.Spotify = Spotify;
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:spotify/lib/spotify.js");

/* Exports */
Package._define("rocketchat:spotify");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_spotify.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzcG90aWZ5L2xpYi9zcG90aWZ5LmpzIl0sIm5hbWVzIjpbIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsInMiLCJwcm9jZXNzIiwibWVzc2FnZSIsInNvdXJjZSIsImNhbGxiYWNrIiwidHJpbSIsIm1zZ1BhcnRzIiwic3BsaXQiLCJpbmRleCIsImxlbmd0aCIsInBhcnQiLCJ1bmRlZmluZWQiLCJjb2RlTWF0Y2giLCJtYXRjaCIsIlNwb3RpZnkiLCJ0cmFuc2Zvcm0iLCJ1cmxzIiwiQXJyYXkiLCJpc0FycmF5IiwiY29uY2F0IiwiY2hhbmdlZCIsIm1zZyIsInJlIiwiZXhlYyIsImRhdGEiLCJmaWx0ZXIiLCJzbGljZSIsInZhbHVlIiwicGF0aCIsIm1hcCIsImVzY2FwZSIsImpvaW4iLCJ1cmwiLCJwdXNoIiwicmVuZGVyIiwiaHRtbCIsIml0ZW0iLCJmcm9tIiwicXVvdGVkU291cmNlIiwicmVwbGFjZSIsIlJlZ0V4cCIsIlJvY2tldENoYXQiLCJjYWxsYmFja3MiLCJhZGQiLCJwcmlvcml0eSIsIkxPVyIsIk1FRElVTSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLENBQUo7QUFBTUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNDLFFBQUVELENBQUY7QUFBSTs7QUFBaEIsQ0FBMUMsRUFBNEQsQ0FBNUQ7O0FBT3BFLE1BQU1FLFVBQVUsVUFBU0MsT0FBVCxFQUFrQkMsTUFBbEIsRUFBMEJDLFFBQTFCLEVB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T0FBTCxDQUFhakIsRUFBYixFQUFrQixjQUFjYyxLQUFLSixHQUFLLHFCQUFxQkksS0FBS2pDLE1BQVEsUUFBNUUsQ0FBbEI7QUFDQTtBQUNEOztBQUNELGVBQU9ELFFBQVFpQyxJQUFSLEdBQWU3QixTQUFTeUIsSUFBVCxDQUFjLEVBQWQsQ0FBdEI7QUFDQTtBQUNELEtBWEQ7QUFhQSxXQUFPN0IsT0FBUDtBQUNBOztBQTlDWTs7QUFpRGR1QyxXQUFXQyxTQUFYLENBQXFCQyxHQUFyQixDQUF5QixtQkFBekIsRUFBOEM3QixRQUFRQyxTQUF0RCxFQUFpRTBCLFdBQVdDLFNBQVgsQ0FBcUJFLFFBQXJCLENBQThCQyxHQUEvRixFQUFvRyxjQUFwRztBQUNBSixXQUFXQyxTQUFYLENBQXFCQyxHQUFyQixDQUF5QixlQUF6QixFQUEwQzdCLFFBQVFvQixNQUFsRCxFQUEwRE8sV0FBV0MsU0FBWCxDQUFxQkUsUUFBckIsQ0FBOEJFLE1BQXhGLEVBQWdHLGdCQUFoRztBQUNBTCxXQUFXM0IsT0FBWCxHQUFxQkEsT0FBckIsQyIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9zcG90aWZ5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIFNwb3RpZnkgYSBuYW1lZCBmdW5jdGlvbiB0aGF0IHdpbGwgcHJvY2VzcyBTcG90aWZ5IGxpbmtzIG9yIHN5bnRheGVzIChleDogc3BvdGlmeTp0cmFjazoxcTZJSzFsNHFwWXlrT2FXYUxKa1dHKVxuICogQHBhcmFtIHtPYmplY3R9IG1lc3NhZ2UgLSBUaGUgbWVzc2FnZSBvYmplY3RcbiAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbmNvbnN0IHByb2Nlc3MgPSBmdW5jdGlvbihtZXNzYWdlLCBzb3VyY2UsIGNhbGxiYWNrKSB7XG5cdGlmIChzLnRyaW0oc291cmNlKSkge1xuXHRcdC8vIFNlcGFyYXRlIHRleHQgaW4gY29kZSBibG9ja3MgYW5kIG5vbiBjb2RlIGJsb2Nrc1xuXHRcdGNvbnN0IG1zZ1BhcnRzID0gc291cmNlLnNwbGl0KC8oYGBgXFx3KltcXG4gXT9bXFxzXFxTXSo/YGBgKz8pfChgKD86W15gXSspYCkvKTtcblxuXHRcdGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBtc2dQYXJ0cy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdC8vIFZlcmlmeSBpZiB0aGlzIHBhcnQgaXMgY29kZVxuXHRcdFx0Y29uc3QgcGFydCA9IG1zZ1BhcnRzW2luZGV4XTtcblxuXHRcdFx0aWYgKCgocGFydCAhPSBudWxsID8gcGFydC5sZW5ndGggPiAwIDogdW5kZWZpbmVkKSAhPSBudWxsKSkge1xuXHRcdFx0XHRjb25zdCBjb2RlTWF0Y2ggPSBwYXJ0Lm1hdGNoKC8oPzpgYGAoXFx3KilbXFxuIF0/KFtcXHNcXFNdKj8pYGBgKz8pfCg/OmAoPzpbXmBdKylgKS8pO1xuXHRcdFx0XHRpZiAoY29kZU1hdGNoID09IG51bGwpIHtcblx0XHRcdFx0XHRjYWxsYmFjayhtZXNzYWdlLCBtc2dQYXJ0cywgaW5kZXgsIHBhcnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuY2xhc3MgU3BvdGlmeSB7XG5cdHN0YXRpYyB0cmFuc2Zvcm0obWVzc2FnZSkge1xuXHRcdGxldCB1cmxzID0gW107XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZS51cmxzKSkge1xuXHRcdFx0dXJscyA9IHVybHMuY29uY2F0KG1lc3NhZ2UudXJscyk7XG5cdFx0fVxuXG5cdFx0bGV0IGNoYW5nZWQgPSBmYWxzZTtcblxuXHRcdHByb2Nlc3MobWVzc2FnZSwgbWVzc2FnZS5tc2csIGZ1bmN0aW9uKG1lc3NhZ2UsIG1zZ1BhcnRzLCBpbmRleCwgcGFydCkge1xuXHRcdFx0Y29uc3QgcmUgPSAvKD86XnxcXHMpc3BvdGlmeTooW146XFxzXSspOihbXjpcXHNdKykoPzo6KFteOlxcc10rKSk/KD86OihcXFMrKSk/KD86XFxzfCQpL2c7XG5cblx0XHRcdGxldCBtYXRjaDtcblx0XHRcdHdoaWxlICgobWF0Y2ggPSByZS5leGVjKHBhcnQpKSkge1xuXHRcdFx0XHRjb25zdCBkYXRhID0gXy5maWx0ZXIobWF0Y2guc2xpY2UoMSksICh2YWx1ZSkgPT4gdmFsdWUgIT0gbnVsbCk7XG5cdFx0XHRcdGNvbnN0IHBhdGggPSBfLm1hcChkYXRhLCAodmFsdWUpID0+IF8uZXNjYXBlKHZhbHVlKSkuam9pbignLycpO1xuXHRcdFx0XHRjb25zdCB1cmwgPSBgaHR0cHM6Ly9vcGVuLnNwb3RpZnkuY29tLyR7IHBhdGggfWA7XG5cdFx0XHRcdHVybHMucHVzaCh7IHVybCwgc291cmNlOiBgc3BvdGlmeTokeyBkYXRhLmpvaW4oJzonKSB9YCB9KTtcblx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHR9KTtcblxuXHRcdC8vIFJlLW1vdW50IG1lc3NhZ2Vcblx0XHRpZiAoY2hhbmdlZCkge1xuXHRcdFx0bWVzc2FnZS51cmxzID0gdXJscztcblx0XHR9XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdHN0YXRpYyByZW5kZXIobWVzc2FnZSkge1xuXHRcdHByb2Nlc3MobWVzc2FnZSwgbWVzc2FnZS5odG1sLCBmdW5jdGlvbihtZXNzYWdlLCBtc2dQYXJ0cywgaW5kZXgsIHBhcnQpIHtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KG1lc3NhZ2UudXJscykpIHtcblx0XHRcdFx0Zm9yIChjb25zdCBpdGVtIG9mIEFycmF5LmZyb20obWVzc2FnZS51cmxzKSkge1xuXHRcdFx0XHRcdGlmIChpdGVtLnNvdXJjZSkge1xuXHRcdFx0XHRcdFx0Y29uc3QgcXVvdGVkU291cmNlID0gaXRlbS5zb3VyY2UucmVwbGFjZSgvW1xcXFxeJC4qKz8oKVtcXF17fXxdL2csICdcXFxcJCYnKTtcblx0XHRcdFx0XHRcdGNvbnN0IHJlID0gbmV3IFJlZ0V4cChgKF58XFxcXHMpJHsgcXVvdGVkU291cmNlIH0oXFxcXHN8JClgLCAnZycpO1xuXHRcdFx0XHRcdFx0bXNnUGFydHNbaW5kZXhdID0gcGFydC5yZXBsYWNlKHJlLCBgJDE8YSBocmVmPVwiJHsgaXRlbS51cmwgfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7IGl0ZW0uc291cmNlIH08L2E+JDJgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG1lc3NhZ2UuaHRtbCA9IG1zZ1BhcnRzLmpvaW4oJycpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdiZWZvcmVTYXZlTWVzc2FnZScsIFNwb3RpZnkudHJhbnNmb3JtLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdzcG90aWZ5LXNhdmUnKTtcblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgncmVuZGVyTWVzc2FnZScsIFNwb3RpZnkucmVuZGVyLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5NRURJVU0sICdzcG90aWZ5LXJlbmRlcicpO1xuUm9ja2V0Q2hhdC5TcG90aWZ5ID0gU3BvdGlmeTtcbiJdfQ==
