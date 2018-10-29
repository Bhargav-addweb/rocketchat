(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var message, target;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:autotranslate":{"server":{"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/settings.js                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.startup(function () {
  RocketChat.settings.add('AutoTranslate_Enabled', false, {
    type: 'boolean',
    group: 'Message',
    section: 'AutoTranslate',
    public: true
  });
  RocketChat.settings.add('AutoTranslate_GoogleAPIKey', '', {
    type: 'string',
    group: 'Message',
    section: 'AutoTranslate',
    enableQuery: {
      _id: 'AutoTranslate_Enabled',
      value: true
    }
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"autotranslate.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/autotranslate.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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

class AutoTranslate {
  constructor() {
    this.languages = [];
    this.enabled = RocketChat.settings.get('AutoTranslate_Enabled');
    this.apiKey = RocketChat.settings.get('AutoTranslate_GoogleAPIKey');
    this.supportedLanguages = {};
    RocketChat.callbacks.add('afterSaveMessage', this.translateMessage.bind(this), RocketChat.callbacks.priority.MEDIUM, 'AutoTranslate');
    RocketChat.settings.get('AutoTranslate_Enabled', (key, value) => {
      this.enabled = value;
    });
    RocketChat.settings.get('AutoTranslate_GoogleAPIKey', (key, value) => {
      this.apiKey = value;
    });
  }

  tokenize(message) {
    if (!message.tokens || !Array.isArray(message.tokens)) {
      message.tokens = [];
    }

    message = this.tokenizeEmojis(message);
    message = this.tokenizeCode(message);
    message = this.tokenizeURLs(message);
    message = this.tokenizeMentions(message);
    return message;
  }

  tokenizeEmojis(message) {
    let count = message.tokens.length;
    message.msg = message.msg.replace(/:[+\w\d]+:/g, function (match) {
      const token = `<i class=notranslate>{${count++}}</i>`;
      message.tokens.push({
        token,
        text: match
      });
      return token;
    });
    return message;
  }

  tokenizeURLs(message) {
    let count = message.tokens.length;
    const schemes = RocketChat.settings.get('Markdown_SupportSchemesForLink').split(',').join('|'); // Support ![alt text](http://image url) and [text](http://link)

    message.msg = message.msg.replace(new RegExp(`(!?\\[)([^\\]]+)(\\]\\((?:${schemes}):\\/\\/[^\\)]+\\))`, 'gm'), function (match, pre, text, post) {
      const pretoken = `<i class=notranslate>{${count++}}</i>`;
      message.tokens.push({
        token: pretoken,
        text: pre
      });
      const posttoken = `<i class=notranslate>{${count++}}</i>`;
      message.tokens.push({
        token: posttoken,
        text: post
      });
      return pretoken + text + posttoken;
    }); // Support <http://link|Text>

    message.msg = message.msg.replace(new RegExp(`((?:<|&lt;)(?:${schemes}):\\/\\/[^\\|]+\\|)(.+?)(?=>|&gt;)((?:>|&gt;))`, 'gm'), function (match, pre, text, post) {
      const pretoken = `<i class=notranslate>{${count++}}</i>`;
      message.tokens.push({
        token: pretoken,
        text: pre
      });
      const posttoken = `<i class=notranslate>{${count++}}</i>`;
      message.tokens.push({
        token: posttoken,
        text: post
      });
      return pretoken + text + posttoken;
    });
    return message;
  }

  tokenizeCode(message) {
    let count = message.tokens.length;
    message.html = message.msg;
    message = RocketChat.Markdown.parseMessageNotEscaped(message);
    message.msg = message.html;

    for (const tokenIndex in message.tokens) {
      if (message.tokens.hasOwnProperty(tokenIndex)) {
        const {
          token
        } = message.tokens[tokenIndex];

        if (token.indexOf('notranslate') === -1) {
          const newToken = `<i class=notranslate>{${count++}}</i>`;
          message.msg = message.msg.replace(token, newToken);
          message.tokens[tokenIndex].token = newToken;
        }
      }
    }

    return message;
  }

  tokenizeMentions(message) {
    let count = message.tokens.length;

    if (message.mentions && message.mentions.length > 0) {
      message.mentions.forEach(mention => {
        message.msg = message.msg.replace(new RegExp(`(@${mention.username})`, 'gm'), match => {
          const token = `<i class=notranslate>{${count++}}</i>`;
          message.tokens.push({
            token,
            text: match
          });
          return token;
        });
      });
    }

    if (message.channels && message.channels.length > 0) {
      message.channels.forEach(channel => {
        message.msg = message.msg.replace(new RegExp(`(#${channel.name})`, 'gm'), match => {
          const token = `<i class=notranslate>{${count++}}</i>`;
          message.tokens.push({
            token,
            text: match
          });
          return token;
        });
      });
    }

    return message;
  }

  deTokenize(message) {
    if (message.tokens && message.tokens.length > 0) {
      for (const _ref of message.tokens) {
        const {
          token,
          text,
          noHtml
        } = _ref;
        message.msg = message.msg.replace(token, () => noHtml ? noHtml : text);
      }
    }

    return message.msg;
  }

  translateMessage(message, room, targetLanguage) {
    if (this.enabled && this.apiKey) {
      let targetLanguages;

      if (targetLanguage) {
        targetLanguages = [targetLanguage];
      } else {
        targetLanguages = RocketChat.models.Subscriptions.getAutoTranslateLanguagesByRoomAndNotUser(room._id, message.u && message.u._id);
      }

      if (message.msg) {
        Meteor.defer(() => {
          const translations = {};
          let targetMessage = Object.assign({}, message);
          targetMessage.html = s.escapeHTML(String(targetMessage.msg));
          targetMessage = this.tokenize(targetMessage);
          let msgs = targetMessage.msg.split('\n');
          msgs = msgs.map(msg => encodeURIComponent(msg));
          const query = `q=${msgs.join('&q=')}`;
          const supportedLanguages = this.getSupportedLanguages('en');
          targetLanguages.forEach(language => {
            if (language.indexOf('-') !== -1 && !_.findWhere(supportedLanguages, {
              language
            })) {
              language = language.substr(0, 2);
            }

            let result;

            try {
              result = HTTP.get('https://translation.googleapis.com/language/translate/v2', {
                params: {
                  key: this.apiKey,
                  target: language
                },
                query
              });
            } catch (e) {
              console.log('Error translating message', e);
              return message;
            }

            if (result.statusCode === 200 && result.data && result.data.data && result.data.data.translations && Array.isArray(result.data.data.translations) && result.data.data.translations.length > 0) {
              const txt = result.data.data.translations.map(translation => translation.translatedText).join('\n');
              translations[language] = this.deTokenize(Object.assign({}, targetMessage, {
                msg: txt
              }));
            }
          });

          if (!_.isEmpty(translations)) {
            RocketChat.models.Messages.addTranslations(message._id, translations);
          }
        });
      }

      if (message.attachments && message.attachments.length > 0) {
        Meteor.defer(() => {
          for (const index in message.attachments) {
            if (message.attachments.hasOwnProperty(index)) {
              const attachment = message.attachments[index];
              const translations = {};

              if (attachment.description || attachment.text) {
                const query = `q=${encodeURIComponent(attachment.description || attachment.text)}`;
                const supportedLanguages = this.getSupportedLanguages('en');
                targetLanguages.forEach(language => {
                  if (language.indexOf('-') !== -1 && !_.findWhere(supportedLanguages, {
                    language
                  })) {
                    language = language.substr(0, 2);
                  }

                  const result = HTTP.get('https://translation.googleapis.com/language/translate/v2', {
                    params: {
                      key: this.apiKey,
                      target: language
                    },
                    query
                  });

                  if (result.statusCode === 200 && result.data && result.data.data && result.data.data.translations && Array.isArray(result.data.data.translations) && result.data.data.translations.length > 0) {
                    const txt = result.data.data.translations.map(translation => translation.translatedText).join('\n');
                    translations[language] = txt;
                  }
                });

                if (!_.isEmpty(translations)) {
                  RocketChat.models.Messages.addAttachmentTranslations(message._id, index, translations);
                }
              }
            }
          }
        });
      }
    }

    return message;
  }

  getSupportedLanguages(target) {
    if (this.enabled && this.apiKey) {
      if (this.supportedLanguages[target]) {
        return this.supportedLanguages[target];
      }

      let result;
      const params = {
        key: this.apiKey
      };

      if (target) {
        params.target = target;
      }

      try {
        result = HTTP.get('https://translation.googleapis.com/language/translate/v2/languages', {
          params
        });
      } catch (e) {
        if (e.response && e.response.statusCode === 400 && e.response.data && e.response.data.error && e.response.data.error.status === 'INVALID_ARGUMENT') {
          params.target = 'en';
          target = 'en';

          if (!this.supportedLanguages[target]) {
            result = HTTP.get('https://translation.googleapis.com/language/translate/v2/languages', {
              params
            });
          }
        }
      } finally {
        if (this.supportedLanguages[target]) {
          return this.supportedLanguages[target];
        } else {
          this.supportedLanguages[target || 'en'] = result && result.data && result.data.data && result.data.data.languages;
          return this.supportedLanguages[target || 'en'];
        }
      }
    }
  }

}

RocketChat.AutoTranslate = new AutoTranslate();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"permissions.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/permissions.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.startup(() => {
  if (RocketChat.models && RocketChat.models.Permissions) {
    if (!RocketChat.models.Permissions.findOne({
      _id: 'auto-translate'
    })) {
      RocketChat.models.Permissions.insert({
        _id: 'auto-translate',
        roles: ['admin']
      });
    }
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"Messages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/models/Messages.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Messages.addTranslations = function (messageId, translations) {
  const updateObj = {};
  Object.keys(translations).forEach(key => {
    const translation = translations[key];
    updateObj[`translations.${key}`] = translation;
  });
  return this.update({
    _id: messageId
  }, {
    $set: updateObj
  });
};

RocketChat.models.Messages.addAttachmentTranslations = function (messageId, attachmentIndex, translations) {
  const updateObj = {};
  Object.keys(translations).forEach(key => {
    const translation = translations[key];
    updateObj[`attachments.${attachmentIndex}.translations.${key}`] = translation;
  });
  return this.update({
    _id: messageId
  }, {
    $set: updateObj
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/models/Subscriptions.js                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.models.Subscriptions.updateAutoTranslateById = function (_id, autoTranslate) {
  const query = {
    _id
  };
  let update;

  if (autoTranslate) {
    update = {
      $set: {
        autoTranslate
      }
    };
  } else {
    update = {
      $unset: {
        autoTranslate: 1
      }
    };
  }

  return this.update(query, update);
};

RocketChat.models.Subscriptions.updateAutoTranslateLanguageById = function (_id, autoTranslateLanguage) {
  const query = {
    _id
  };
  const update = {
    $set: {
      autoTranslateLanguage
    }
  };
  return this.update(query, update);
};

RocketChat.models.Subscriptions.getAutoTranslateLanguagesByRoomAndNotUser = function (rid, userId) {
  const subscriptionsRaw = RocketChat.models.Subscriptions.model.rawCollection();
  const distinct = Meteor.wrapAsync(subscriptionsRaw.distinct, subscriptionsRaw);
  const query = {
    rid,
    'u._id': {
      $ne: userId
    },
    autoTranslate: true
  };
  return distinct('autoTranslateLanguage', query);
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"saveSettings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/methods/saveSettings.js                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  'autoTranslate.saveSettings'(rid, field, value, options) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'saveAutoTranslateSettings'
      });
    }

    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'auto-translate')) {
      throw new Meteor.Error('error-action-not-allowed', 'Auto-Translate is not allowed', {
        method: 'autoTranslate.saveSettings'
      });
    }

    check(rid, String);
    check(field, String);
    check(value, String);

    if (['autoTranslate', 'autoTranslateLanguage'].indexOf(field) === -1) {
      throw new Meteor.Error('error-invalid-settings', 'Invalid settings field', {
        method: 'saveAutoTranslateSettings'
      });
    }

    const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(rid, Meteor.userId());

    if (!subscription) {
      throw new Meteor.Error('error-invalid-subscription', 'Invalid subscription', {
        method: 'saveAutoTranslateSettings'
      });
    }

    switch (field) {
      case 'autoTranslate':
        RocketChat.models.Subscriptions.updateAutoTranslateById(subscription._id, value === '1');

        if (!subscription.autoTranslateLanguage && options.defaultLanguage) {
          RocketChat.models.Subscriptions.updateAutoTranslateLanguageById(subscription._id, options.defaultLanguage);
        }

        break;

      case 'autoTranslateLanguage':
        RocketChat.models.Subscriptions.updateAutoTranslateLanguageById(subscription._id, value);
        break;
    }

    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"translateMessage.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/methods/translateMessage.js                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  'autoTranslate.translateMessage'(message, targetLanguage) {
    const room = RocketChat.models.Rooms.findOneById(message && message.rid);

    if (message && room && RocketChat.AutoTranslate) {
      return RocketChat.AutoTranslate.translateMessage(message, room, targetLanguage);
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getSupportedLanguages.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_autotranslate/server/methods/getSupportedLanguages.js                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  'autoTranslate.getSupportedLanguages'(targetLanguage) {
    if (!RocketChat.authz.hasPermission(Meteor.userId(), 'auto-translate')) {
      throw new Meteor.Error('error-action-not-allowed', 'Auto-Translate is not allowed', {
        method: 'autoTranslate.saveSettings'
      });
    }

    return RocketChat.AutoTranslate.getSupportedLanguages(targetLanguage);
  }

});
DDPRateLimiter.addRule({
  type: 'method',
  name: 'autoTranslate.getSupportedLanguages',

  userId()
  /* userId*/
  {
    return true;
  }

}, 5, 60000);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:autotranslate/server/settings.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/autotranslate.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/permissions.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/models/Messages.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/models/Subscriptions.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/methods/saveSettings.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/methods/translateMessage.js");
require("/node_modules/meteor/rocketchat:autotranslate/server/methods/getSupportedLanguages.js");

/* Exports */
Package._define("rocketchat:autotranslate");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_autotranslate.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvdHJhbnNsYXRlL3NlcnZlci9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvdHJhbnNsYXRlL3NlcnZlci9hdXRvdHJhbnNsYXRlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dG90cmFuc2xhdGUvc2VydmVyL3Blcm1pc3Npb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dG90cmFuc2xhdGUvc2VydmVyL21vZGVscy9NZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvdHJhbnNsYXRlL3NlcnZlci9tb2RlbHMvU3Vic2NyaXB0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvdHJhbnNsYXRlL3NlcnZlci9tZXRob2RzL3NhdmVTZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRvdHJhbnNsYXRlL3NlcnZlci9tZXRob2RzL3RyYW5zbGF0ZU1lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0b3RyYW5zbGF0ZS9zZXJ2ZXIvbWV0aG9kcy9nZXRTdXBwb3J0ZWRMYW5ndWFnZXMuanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwic3RhcnR1cCIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImFkZCIsInR5cGUiLCJncm91cCIsInNlY3Rpb24iLCJwdWJsaWMiLCJlbmFibGVRdWVyeSIsIl9pZCIsInZhbHVlIiwiXyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicyIsIkF1dG9UcmFuc2xhdGUiLCJjb25zdHJ1Y3RvciIsImxhbmd1YWdlcyIsImVuYWJsZWQiLCJnZXQiLCJhcGlLZXkiLCJzdXBwb3J0ZWRMYW5ndWFnZXMiLCJjYWxsYmFja3MiLCJ0cmFuc2xhdGVNZXNzYWdlIiwiYmluZCIsInByaW9yaXR5IiwiTUVESVVNIiwia2V5IiwidG9rZW5pemUiLCJtZXNzYWdlIiwidG9rZW5zIiwiQXJyYXkiLCJpc0FycmF5IiwidG9rZW5pemVFbW9qaXMiLCJ0b2tlbml6ZUNvZGUiLCJ0b2tlbml6ZVVSTHMiLCJ0b2tlbml6ZU1lbnRpb25zIiwiY291bnQiLCJsZW5ndGgiLCJtc2ciLCJyZXBsYWNlIiwibWF0Y2giLCJ0b2tlbiIsInB1c2giLCJ0ZXh0Iiwic2NoZW1lcyIsInNwbGl0Iiwiam9pbiIsIlJlZ0V4cCIsInByZSIsInBvc3QiLCJwcmV0b2tlbiIsInBvc3R0b2tlbiIsImh0bWwiLCJNYXJrZG93biIsInBhcnNlTWVzc2FnZU5vdEVzY2FwZWQiLCJ0b2tlbkluZGV4IiwiaGFzT3duUHJvcGVydHkiLCJpbmRleE9mIiwibmV3VG9rZW4iLCJtZW50aW9ucyIsImZvckVhY2giLCJtZW50aW9uIiwidXNlcm5hbWUiLCJjaGFubmVscyIsImNoYW5uZWwiLCJuYW1lIiwiZGVUb2tlbml6ZSIsIm5vSHRtbCIsInJvb20iLCJ0YXJnZXRMYW5ndWFnZSIsInRhcmdldExhbmd1YWdlcyIsIm1vZGVscyIsIlN1YnNjcmlwdGlvbnMiLCJnZXRBdXRvVHJhbnNsYXRlTGFuZ3VhZ2VzQnlSb29tQW5kTm90VXNlciIsInUiLCJkZWZlciIsInRyYW5zbGF0aW9ucyIsInRhcmdldE1lc3NhZ2UiLCJPYmplY3QiLCJhc3NpZ24iLCJlc2NhcGVIVE1MIiwiU3RyaW5nIiwibXNncyIsIm1hcCIsImVuY29kZVVSSUNvbXBvbmVudCIsInF1ZXJ5IiwiZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzIiwibGFuZ3VhZ2UiLCJmaW5kV2hlcmUiLCJzdWJzdHIiLCJyZXN1bHQiLCJIVFRQIiwicGFyYW1zIiwidGFyZ2V0IiwiZSIsImNvbnNvbGUiLCJsb2ciLCJzdGF0dXNDb2RlIiwiZGF0YSIsInR4dCIsInRyYW5zbGF0aW9uIiwidHJhbnNsYXRlZFRleHQiLCJpc0VtcHR5IiwiTWVzc2FnZXMiLCJhZGRUcmFuc2xhdGlvbnMiLCJhdHRhY2htZW50cyIsImluZGV4IiwiYXR0YWNobWVudCIsImRlc2NyaXB0aW9uIiwiYWRkQXR0YWNobWVudFRyYW5zbGF0aW9ucyIsInJlc3BvbnNlIiwiZXJyb3IiLCJzdGF0dXMiLCJQZXJtaXNzaW9ucyIsImZpbmRPbmUiLCJpbnNlcnQiLCJyb2xlcyIsIm1lc3NhZ2VJZCIsInVwZGF0ZU9iaiIsImtleXMiLCJ1cGRhdGUiLCIkc2V0IiwiYXR0YWNobWVudEluZGV4IiwidXBkYXRlQXV0b1RyYW5zbGF0ZUJ5SWQiLCJhdXRvVHJhbnNsYXRlIiwiJHVuc2V0IiwidXBkYXRlQXV0b1RyYW5zbGF0ZUxhbmd1YWdlQnlJZCIsImF1dG9UcmFuc2xhdGVMYW5ndWFnZSIsInJpZCIsInVzZXJJZCIsInN1YnNjcmlwdGlvbnNSYXciLCJtb2RlbCIsInJhd0NvbGxlY3Rpb24iLCJkaXN0aW5jdCIsIndyYXBBc3luYyIsIiRuZSIsIm1ldGhvZHMiLCJmaWVsZCIsIm9wdGlvbnMiLCJFcnJvciIsIm1ldGhvZCIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsImNoZWNrIiwic3Vic2NyaXB0aW9uIiwiZmluZE9uZUJ5Um9vbUlkQW5kVXNlcklkIiwiZGVmYXVsdExhbmd1YWdlIiwiUm9vbXMiLCJmaW5kT25lQnlJZCIsIkREUFJhdGVMaW1pdGVyIiwiYWRkUnVsZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekJDLGFBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLHVCQUF4QixFQUFpRCxLQUFqRCxFQUF3RDtBQUFFQyxVQUFNLFNBQVI7QUFBbUJDLFdBQU8sU0FBMUI7QUFBcUNDLGFBQVMsZUFBOUM7QUFBK0RDLFlBQVE7QUFBdkUsR0FBeEQ7QUFDQU4sYUFBV0MsUUFBWCxDQUFvQkMsR0FBcEIs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IjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfYXV0b3RyYW5zbGF0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uKCkge1xuXHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZCgnQXV0b1RyYW5zbGF0ZV9FbmFibGVkJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBncm91cDogJ01lc3NhZ2UnLCBzZWN0aW9uOiAnQXV0b1RyYW5zbGF0ZScsIHB1YmxpYzogdHJ1ZSB9KTtcblx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoJ0F1dG9UcmFuc2xhdGVfR29vZ2xlQVBJS2V5JywgJycsIHsgdHlwZTogJ3N0cmluZycsIGdyb3VwOiAnTWVzc2FnZScsIHNlY3Rpb246ICdBdXRvVHJhbnNsYXRlJywgZW5hYmxlUXVlcnk6IHsgX2lkOiAnQXV0b1RyYW5zbGF0ZV9FbmFibGVkJywgdmFsdWU6IHRydWUgfSB9KTtcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbmNsYXNzIEF1dG9UcmFuc2xhdGUge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmxhbmd1YWdlcyA9IFtdO1xuXHRcdHRoaXMuZW5hYmxlZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBdXRvVHJhbnNsYXRlX0VuYWJsZWQnKTtcblx0XHR0aGlzLmFwaUtleSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBdXRvVHJhbnNsYXRlX0dvb2dsZUFQSUtleScpO1xuXHRcdHRoaXMuc3VwcG9ydGVkTGFuZ3VhZ2VzID0ge307XG5cdFx0Um9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdhZnRlclNhdmVNZXNzYWdlJywgdGhpcy50cmFuc2xhdGVNZXNzYWdlLmJpbmQodGhpcyksIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5Lk1FRElVTSwgJ0F1dG9UcmFuc2xhdGUnKTtcblxuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBdXRvVHJhbnNsYXRlX0VuYWJsZWQnLCAoa2V5LCB2YWx1ZSkgPT4ge1xuXHRcdFx0dGhpcy5lbmFibGVkID0gdmFsdWU7XG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0F1dG9UcmFuc2xhdGVfR29vZ2xlQVBJS2V5JywgKGtleSwgdmFsdWUpID0+IHtcblx0XHRcdHRoaXMuYXBpS2V5ID0gdmFsdWU7XG5cdFx0fSk7XG5cdH1cblxuXHR0b2tlbml6ZShtZXNzYWdlKSB7XG5cdFx0aWYgKCFtZXNzYWdlLnRva2VucyB8fCAhQXJyYXkuaXNBcnJheShtZXNzYWdlLnRva2VucykpIHtcblx0XHRcdG1lc3NhZ2UudG9rZW5zID0gW107XG5cdFx0fVxuXHRcdG1lc3NhZ2UgPSB0aGlzLnRva2VuaXplRW1vamlzKG1lc3NhZ2UpO1xuXHRcdG1lc3NhZ2UgPSB0aGlzLnRva2VuaXplQ29kZShtZXNzYWdlKTtcblx0XHRtZXNzYWdlID0gdGhpcy50b2tlbml6ZVVSTHMobWVzc2FnZSk7XG5cdFx0bWVzc2FnZSA9IHRoaXMudG9rZW5pemVNZW50aW9ucyhtZXNzYWdlKTtcblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdHRva2VuaXplRW1vamlzKG1lc3NhZ2UpIHtcblx0XHRsZXQgY291bnQgPSBtZXNzYWdlLnRva2Vucy5sZW5ndGg7XG5cdFx0bWVzc2FnZS5tc2cgPSBtZXNzYWdlLm1zZy5yZXBsYWNlKC86WytcXHdcXGRdKzovZywgZnVuY3Rpb24obWF0Y2gpIHtcblx0XHRcdGNvbnN0IHRva2VuID0gYDxpIGNsYXNzPW5vdHJhbnNsYXRlPnskeyBjb3VudCsrIH19PC9pPmA7XG5cdFx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdHRleHQ6IG1hdGNoLFxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gdG9rZW47XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gbWVzc2FnZTtcblx0fVxuXG5cdHRva2VuaXplVVJMcyhtZXNzYWdlKSB7XG5cdFx0bGV0IGNvdW50ID0gbWVzc2FnZS50b2tlbnMubGVuZ3RoO1xuXG5cdFx0Y29uc3Qgc2NoZW1lcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdNYXJrZG93bl9TdXBwb3J0U2NoZW1lc0ZvckxpbmsnKS5zcGxpdCgnLCcpLmpvaW4oJ3wnKTtcblxuXHRcdC8vIFN1cHBvcnQgIVthbHQgdGV4dF0oaHR0cDovL2ltYWdlIHVybCkgYW5kIFt0ZXh0XShodHRwOi8vbGluaylcblx0XHRtZXNzYWdlLm1zZyA9IG1lc3NhZ2UubXNnLnJlcGxhY2UobmV3IFJlZ0V4cChgKCE/XFxcXFspKFteXFxcXF1dKykoXFxcXF1cXFxcKCg/OiR7IHNjaGVtZXMgfSk6XFxcXC9cXFxcL1teXFxcXCldK1xcXFwpKWAsICdnbScpLCBmdW5jdGlvbihtYXRjaCwgcHJlLCB0ZXh0LCBwb3N0KSB7XG5cdFx0XHRjb25zdCBwcmV0b2tlbiA9IGA8aSBjbGFzcz1ub3RyYW5zbGF0ZT57JHsgY291bnQrKyB9fTwvaT5gO1xuXHRcdFx0bWVzc2FnZS50b2tlbnMucHVzaCh7XG5cdFx0XHRcdHRva2VuOiBwcmV0b2tlbixcblx0XHRcdFx0dGV4dDogcHJlLFxuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IHBvc3R0b2tlbiA9IGA8aSBjbGFzcz1ub3RyYW5zbGF0ZT57JHsgY291bnQrKyB9fTwvaT5gO1xuXHRcdFx0bWVzc2FnZS50b2tlbnMucHVzaCh7XG5cdFx0XHRcdHRva2VuOiBwb3N0dG9rZW4sXG5cdFx0XHRcdHRleHQ6IHBvc3QsXG5cdFx0XHR9KTtcblxuXHRcdFx0cmV0dXJuIHByZXRva2VuICsgdGV4dCArIHBvc3R0b2tlbjtcblx0XHR9KTtcblxuXHRcdC8vIFN1cHBvcnQgPGh0dHA6Ly9saW5rfFRleHQ+XG5cdFx0bWVzc2FnZS5tc2cgPSBtZXNzYWdlLm1zZy5yZXBsYWNlKG5ldyBSZWdFeHAoYCgoPzo8fCZsdDspKD86JHsgc2NoZW1lcyB9KTpcXFxcL1xcXFwvW15cXFxcfF0rXFxcXHwpKC4rPykoPz0+fCZndDspKCg/Oj58Jmd0OykpYCwgJ2dtJyksIGZ1bmN0aW9uKG1hdGNoLCBwcmUsIHRleHQsIHBvc3QpIHtcblx0XHRcdGNvbnN0IHByZXRva2VuID0gYDxpIGNsYXNzPW5vdHJhbnNsYXRlPnskeyBjb3VudCsrIH19PC9pPmA7XG5cdFx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdFx0dG9rZW46IHByZXRva2VuLFxuXHRcdFx0XHR0ZXh0OiBwcmUsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgcG9zdHRva2VuID0gYDxpIGNsYXNzPW5vdHJhbnNsYXRlPnskeyBjb3VudCsrIH19PC9pPmA7XG5cdFx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdFx0dG9rZW46IHBvc3R0b2tlbixcblx0XHRcdFx0dGV4dDogcG9zdCxcblx0XHRcdH0pO1xuXG5cdFx0XHRyZXR1cm4gcHJldG9rZW4gKyB0ZXh0ICsgcG9zdHRva2VuO1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHR0b2tlbml6ZUNvZGUobWVzc2FnZSkge1xuXHRcdGxldCBjb3VudCA9IG1lc3NhZ2UudG9rZW5zLmxlbmd0aDtcblxuXHRcdG1lc3NhZ2UuaHRtbCA9IG1lc3NhZ2UubXNnO1xuXHRcdG1lc3NhZ2UgPSBSb2NrZXRDaGF0Lk1hcmtkb3duLnBhcnNlTWVzc2FnZU5vdEVzY2FwZWQobWVzc2FnZSk7XG5cdFx0bWVzc2FnZS5tc2cgPSBtZXNzYWdlLmh0bWw7XG5cblx0XHRmb3IgKGNvbnN0IHRva2VuSW5kZXggaW4gbWVzc2FnZS50b2tlbnMpIHtcblx0XHRcdGlmIChtZXNzYWdlLnRva2Vucy5oYXNPd25Qcm9wZXJ0eSh0b2tlbkluZGV4KSkge1xuXHRcdFx0XHRjb25zdCB7IHRva2VuIH0gPSBtZXNzYWdlLnRva2Vuc1t0b2tlbkluZGV4XTtcblx0XHRcdFx0aWYgKHRva2VuLmluZGV4T2YoJ25vdHJhbnNsYXRlJykgPT09IC0xKSB7XG5cdFx0XHRcdFx0Y29uc3QgbmV3VG9rZW4gPSBgPGkgY2xhc3M9bm90cmFuc2xhdGU+eyR7IGNvdW50KysgfX08L2k+YDtcblx0XHRcdFx0XHRtZXNzYWdlLm1zZyA9IG1lc3NhZ2UubXNnLnJlcGxhY2UodG9rZW4sIG5ld1Rva2VuKTtcblx0XHRcdFx0XHRtZXNzYWdlLnRva2Vuc1t0b2tlbkluZGV4XS50b2tlbiA9IG5ld1Rva2VuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG1lc3NhZ2U7XG5cdH1cblxuXHR0b2tlbml6ZU1lbnRpb25zKG1lc3NhZ2UpIHtcblx0XHRsZXQgY291bnQgPSBtZXNzYWdlLnRva2Vucy5sZW5ndGg7XG5cblx0XHRpZiAobWVzc2FnZS5tZW50aW9ucyAmJiBtZXNzYWdlLm1lbnRpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdG1lc3NhZ2UubWVudGlvbnMuZm9yRWFjaCgobWVudGlvbikgPT4ge1xuXHRcdFx0XHRtZXNzYWdlLm1zZyA9IG1lc3NhZ2UubXNnLnJlcGxhY2UobmV3IFJlZ0V4cChgKEAkeyBtZW50aW9uLnVzZXJuYW1lIH0pYCwgJ2dtJyksIChtYXRjaCkgPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHRva2VuID0gYDxpIGNsYXNzPW5vdHJhbnNsYXRlPnskeyBjb3VudCsrIH19PC9pPmA7XG5cdFx0XHRcdFx0bWVzc2FnZS50b2tlbnMucHVzaCh7XG5cdFx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHRcdHRleHQ6IG1hdGNoLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJldHVybiB0b2tlbjtcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAobWVzc2FnZS5jaGFubmVscyAmJiBtZXNzYWdlLmNoYW5uZWxzLmxlbmd0aCA+IDApIHtcblx0XHRcdG1lc3NhZ2UuY2hhbm5lbHMuZm9yRWFjaCgoY2hhbm5lbCkgPT4ge1xuXHRcdFx0XHRtZXNzYWdlLm1zZyA9IG1lc3NhZ2UubXNnLnJlcGxhY2UobmV3IFJlZ0V4cChgKCMkeyBjaGFubmVsLm5hbWUgfSlgLCAnZ20nKSwgKG1hdGNoKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdG9rZW4gPSBgPGkgY2xhc3M9bm90cmFuc2xhdGU+eyR7IGNvdW50KysgfX08L2k+YDtcblx0XHRcdFx0XHRtZXNzYWdlLnRva2Vucy5wdXNoKHtcblx0XHRcdFx0XHRcdHRva2VuLFxuXHRcdFx0XHRcdFx0dGV4dDogbWF0Y2gsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0cmV0dXJuIHRva2VuO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0ZGVUb2tlbml6ZShtZXNzYWdlKSB7XG5cdFx0aWYgKG1lc3NhZ2UudG9rZW5zICYmIG1lc3NhZ2UudG9rZW5zLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvciAoY29uc3QgeyB0b2tlbiwgdGV4dCwgbm9IdG1sIH0gb2YgbWVzc2FnZS50b2tlbnMpIHtcblx0XHRcdFx0bWVzc2FnZS5tc2cgPSBtZXNzYWdlLm1zZy5yZXBsYWNlKHRva2VuLCAoKSA9PiAobm9IdG1sID8gbm9IdG1sIDogdGV4dCkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbWVzc2FnZS5tc2c7XG5cdH1cblxuXHR0cmFuc2xhdGVNZXNzYWdlKG1lc3NhZ2UsIHJvb20sIHRhcmdldExhbmd1YWdlKSB7XG5cdFx0aWYgKHRoaXMuZW5hYmxlZCAmJiB0aGlzLmFwaUtleSkge1xuXHRcdFx0bGV0IHRhcmdldExhbmd1YWdlcztcblx0XHRcdGlmICh0YXJnZXRMYW5ndWFnZSkge1xuXHRcdFx0XHR0YXJnZXRMYW5ndWFnZXMgPSBbdGFyZ2V0TGFuZ3VhZ2VdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFyZ2V0TGFuZ3VhZ2VzID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5nZXRBdXRvVHJhbnNsYXRlTGFuZ3VhZ2VzQnlSb29tQW5kTm90VXNlcihyb29tLl9pZCwgbWVzc2FnZS51ICYmIG1lc3NhZ2UudS5faWQpO1xuXHRcdFx0fVxuXHRcdFx0aWYgKG1lc3NhZ2UubXNnKSB7XG5cdFx0XHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgdHJhbnNsYXRpb25zID0ge307XG5cdFx0XHRcdFx0bGV0IHRhcmdldE1lc3NhZ2UgPSBPYmplY3QuYXNzaWduKHt9LCBtZXNzYWdlKTtcblxuXHRcdFx0XHRcdHRhcmdldE1lc3NhZ2UuaHRtbCA9IHMuZXNjYXBlSFRNTChTdHJpbmcodGFyZ2V0TWVzc2FnZS5tc2cpKTtcblx0XHRcdFx0XHR0YXJnZXRNZXNzYWdlID0gdGhpcy50b2tlbml6ZSh0YXJnZXRNZXNzYWdlKTtcblxuXHRcdFx0XHRcdGxldCBtc2dzID0gdGFyZ2V0TWVzc2FnZS5tc2cuc3BsaXQoJ1xcbicpO1xuXHRcdFx0XHRcdG1zZ3MgPSBtc2dzLm1hcCgobXNnKSA9PiBlbmNvZGVVUklDb21wb25lbnQobXNnKSk7XG5cdFx0XHRcdFx0Y29uc3QgcXVlcnkgPSBgcT0keyBtc2dzLmpvaW4oJyZxPScpIH1gO1xuXG5cdFx0XHRcdFx0Y29uc3Qgc3VwcG9ydGVkTGFuZ3VhZ2VzID0gdGhpcy5nZXRTdXBwb3J0ZWRMYW5ndWFnZXMoJ2VuJyk7XG5cdFx0XHRcdFx0dGFyZ2V0TGFuZ3VhZ2VzLmZvckVhY2goKGxhbmd1YWdlKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAobGFuZ3VhZ2UuaW5kZXhPZignLScpICE9PSAtMSAmJiAhXy5maW5kV2hlcmUoc3VwcG9ydGVkTGFuZ3VhZ2VzLCB7IGxhbmd1YWdlIH0pKSB7XG5cdFx0XHRcdFx0XHRcdGxhbmd1YWdlID0gbGFuZ3VhZ2Uuc3Vic3RyKDAsIDIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bGV0IHJlc3VsdDtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdHJlc3VsdCA9IEhUVFAuZ2V0KCdodHRwczovL3RyYW5zbGF0aW9uLmdvb2dsZWFwaXMuY29tL2xhbmd1YWdlL3RyYW5zbGF0ZS92MicsIHsgcGFyYW1zOiB7IGtleTogdGhpcy5hcGlLZXksIHRhcmdldDogbGFuZ3VhZ2UgfSwgcXVlcnkgfSk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdFcnJvciB0cmFuc2xhdGluZyBtZXNzYWdlJywgZSk7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBtZXNzYWdlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKHJlc3VsdC5zdGF0dXNDb2RlID09PSAyMDAgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEuZGF0YSAmJiByZXN1bHQuZGF0YS5kYXRhLnRyYW5zbGF0aW9ucyAmJiBBcnJheS5pc0FycmF5KHJlc3VsdC5kYXRhLmRhdGEudHJhbnNsYXRpb25zKSAmJiByZXN1bHQuZGF0YS5kYXRhLnRyYW5zbGF0aW9ucy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnN0IHR4dCA9IHJlc3VsdC5kYXRhLmRhdGEudHJhbnNsYXRpb25zLm1hcCgodHJhbnNsYXRpb24pID0+IHRyYW5zbGF0aW9uLnRyYW5zbGF0ZWRUZXh0KS5qb2luKCdcXG4nKTtcblx0XHRcdFx0XHRcdFx0dHJhbnNsYXRpb25zW2xhbmd1YWdlXSA9IHRoaXMuZGVUb2tlbml6ZShPYmplY3QuYXNzaWduKHt9LCB0YXJnZXRNZXNzYWdlLCB7IG1zZzogdHh0IH0pKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRpZiAoIV8uaXNFbXB0eSh0cmFuc2xhdGlvbnMpKSB7XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5hZGRUcmFuc2xhdGlvbnMobWVzc2FnZS5faWQsIHRyYW5zbGF0aW9ucyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG1lc3NhZ2UuYXR0YWNobWVudHMgJiYgbWVzc2FnZS5hdHRhY2htZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdE1ldGVvci5kZWZlcigoKSA9PiB7XG5cdFx0XHRcdFx0Zm9yIChjb25zdCBpbmRleCBpbiBtZXNzYWdlLmF0dGFjaG1lbnRzKSB7XG5cdFx0XHRcdFx0XHRpZiAobWVzc2FnZS5hdHRhY2htZW50cy5oYXNPd25Qcm9wZXJ0eShpbmRleCkpIHtcblx0XHRcdFx0XHRcdFx0Y29uc3QgYXR0YWNobWVudCA9IG1lc3NhZ2UuYXR0YWNobWVudHNbaW5kZXhdO1xuXHRcdFx0XHRcdFx0XHRjb25zdCB0cmFuc2xhdGlvbnMgPSB7fTtcblx0XHRcdFx0XHRcdFx0aWYgKGF0dGFjaG1lbnQuZGVzY3JpcHRpb24gfHwgYXR0YWNobWVudC50ZXh0KSB7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgcXVlcnkgPSBgcT0keyBlbmNvZGVVUklDb21wb25lbnQoYXR0YWNobWVudC5kZXNjcmlwdGlvbiB8fCBhdHRhY2htZW50LnRleHQpIH1gO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IHN1cHBvcnRlZExhbmd1YWdlcyA9IHRoaXMuZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKCdlbicpO1xuXHRcdFx0XHRcdFx0XHRcdHRhcmdldExhbmd1YWdlcy5mb3JFYWNoKChsYW5ndWFnZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKGxhbmd1YWdlLmluZGV4T2YoJy0nKSAhPT0gLTEgJiYgIV8uZmluZFdoZXJlKHN1cHBvcnRlZExhbmd1YWdlcywgeyBsYW5ndWFnZSB9KSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRsYW5ndWFnZSA9IGxhbmd1YWdlLnN1YnN0cigwLCAyKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IEhUVFAuZ2V0KCdodHRwczovL3RyYW5zbGF0aW9uLmdvb2dsZWFwaXMuY29tL2xhbmd1YWdlL3RyYW5zbGF0ZS92MicsIHsgcGFyYW1zOiB7IGtleTogdGhpcy5hcGlLZXksIHRhcmdldDogbGFuZ3VhZ2UgfSwgcXVlcnkgfSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAocmVzdWx0LnN0YXR1c0NvZGUgPT09IDIwMCAmJiByZXN1bHQuZGF0YSAmJiByZXN1bHQuZGF0YS5kYXRhICYmIHJlc3VsdC5kYXRhLmRhdGEudHJhbnNsYXRpb25zICYmIEFycmF5LmlzQXJyYXkocmVzdWx0LmRhdGEuZGF0YS50cmFuc2xhdGlvbnMpICYmIHJlc3VsdC5kYXRhLmRhdGEudHJhbnNsYXRpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29uc3QgdHh0ID0gcmVzdWx0LmRhdGEuZGF0YS50cmFuc2xhdGlvbnMubWFwKCh0cmFuc2xhdGlvbikgPT4gdHJhbnNsYXRpb24udHJhbnNsYXRlZFRleHQpLmpvaW4oJ1xcbicpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHR0cmFuc2xhdGlvbnNbbGFuZ3VhZ2VdID0gdHh0O1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRcdGlmICghXy5pc0VtcHR5KHRyYW5zbGF0aW9ucykpIHtcblx0XHRcdFx0XHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmFkZEF0dGFjaG1lbnRUcmFuc2xhdGlvbnMobWVzc2FnZS5faWQsIGluZGV4LCB0cmFuc2xhdGlvbnMpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBtZXNzYWdlO1xuXHR9XG5cblx0Z2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKHRhcmdldCkge1xuXHRcdGlmICh0aGlzLmVuYWJsZWQgJiYgdGhpcy5hcGlLZXkpIHtcblx0XHRcdGlmICh0aGlzLnN1cHBvcnRlZExhbmd1YWdlc1t0YXJnZXRdKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLnN1cHBvcnRlZExhbmd1YWdlc1t0YXJnZXRdO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgcmVzdWx0O1xuXHRcdFx0Y29uc3QgcGFyYW1zID0geyBrZXk6IHRoaXMuYXBpS2V5IH07XG5cdFx0XHRpZiAodGFyZ2V0KSB7XG5cdFx0XHRcdHBhcmFtcy50YXJnZXQgPSB0YXJnZXQ7XG5cdFx0XHR9XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdHJlc3VsdCA9IEhUVFAuZ2V0KCdodHRwczovL3RyYW5zbGF0aW9uLmdvb2dsZWFwaXMuY29tL2xhbmd1YWdlL3RyYW5zbGF0ZS92Mi9sYW5ndWFnZXMnLCB7IHBhcmFtcyB9KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0aWYgKGUucmVzcG9uc2UgJiYgZS5yZXNwb25zZS5zdGF0dXNDb2RlID09PSA0MDAgJiYgZS5yZXNwb25zZS5kYXRhICYmIGUucmVzcG9uc2UuZGF0YS5lcnJvciAmJiBlLnJlc3BvbnNlLmRhdGEuZXJyb3Iuc3RhdHVzID09PSAnSU5WQUxJRF9BUkdVTUVOVCcpIHtcblx0XHRcdFx0XHRwYXJhbXMudGFyZ2V0ID0gJ2VuJztcblx0XHRcdFx0XHR0YXJnZXQgPSAnZW4nO1xuXHRcdFx0XHRcdGlmICghdGhpcy5zdXBwb3J0ZWRMYW5ndWFnZXNbdGFyZ2V0XSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ID0gSFRUUC5nZXQoJ2h0dHBzOi8vdHJhbnNsYXRpb24uZ29vZ2xlYXBpcy5jb20vbGFuZ3VhZ2UvdHJhbnNsYXRlL3YyL2xhbmd1YWdlcycsIHsgcGFyYW1zIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBmaW5hbGx5IHtcblx0XHRcdFx0aWYgKHRoaXMuc3VwcG9ydGVkTGFuZ3VhZ2VzW3RhcmdldF0pIHtcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zdXBwb3J0ZWRMYW5ndWFnZXNbdGFyZ2V0XTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnN1cHBvcnRlZExhbmd1YWdlc1t0YXJnZXQgfHwgJ2VuJ10gPSByZXN1bHQgJiYgcmVzdWx0LmRhdGEgJiYgcmVzdWx0LmRhdGEuZGF0YSAmJiByZXN1bHQuZGF0YS5kYXRhLmxhbmd1YWdlcztcblx0XHRcdFx0XHRyZXR1cm4gdGhpcy5zdXBwb3J0ZWRMYW5ndWFnZXNbdGFyZ2V0IHx8ICdlbiddO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59XG5cblJvY2tldENoYXQuQXV0b1RyYW5zbGF0ZSA9IG5ldyBBdXRvVHJhbnNsYXRlO1xuIiwiTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuXHRpZiAoUm9ja2V0Q2hhdC5tb2RlbHMgJiYgUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMpIHtcblx0XHRpZiAoIVJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmZpbmRPbmUoeyBfaWQ6ICdhdXRvLXRyYW5zbGF0ZScgfSkpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmluc2VydCh7IF9pZDogJ2F1dG8tdHJhbnNsYXRlJywgcm9sZXM6IFsnYWRtaW4nXSB9KTtcblx0XHR9XG5cdH1cbn0pO1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuYWRkVHJhbnNsYXRpb25zID0gZnVuY3Rpb24obWVzc2FnZUlkLCB0cmFuc2xhdGlvbnMpIHtcblx0Y29uc3QgdXBkYXRlT2JqID0ge307XG5cdE9iamVjdC5rZXlzKHRyYW5zbGF0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XG5cdFx0Y29uc3QgdHJhbnNsYXRpb24gPSB0cmFuc2xhdGlvbnNba2V5XTtcblx0XHR1cGRhdGVPYmpbYHRyYW5zbGF0aW9ucy4keyBrZXkgfWBdID0gdHJhbnNsYXRpb247XG5cdH0pO1xuXHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQ6IG1lc3NhZ2VJZCB9LCB7ICRzZXQ6IHVwZGF0ZU9iaiB9KTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmFkZEF0dGFjaG1lbnRUcmFuc2xhdGlvbnMgPSBmdW5jdGlvbihtZXNzYWdlSWQsIGF0dGFjaG1lbnRJbmRleCwgdHJhbnNsYXRpb25zKSB7XG5cdGNvbnN0IHVwZGF0ZU9iaiA9IHt9O1xuXHRPYmplY3Qua2V5cyh0cmFuc2xhdGlvbnMpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdGNvbnN0IHRyYW5zbGF0aW9uID0gdHJhbnNsYXRpb25zW2tleV07XG5cdFx0dXBkYXRlT2JqW2BhdHRhY2htZW50cy4keyBhdHRhY2htZW50SW5kZXggfS50cmFuc2xhdGlvbnMuJHsga2V5IH1gXSA9IHRyYW5zbGF0aW9uO1xuXHR9KTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkOiBtZXNzYWdlSWQgfSwgeyAkc2V0OiB1cGRhdGVPYmogfSk7XG59O1xuIiwiUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy51cGRhdGVBdXRvVHJhbnNsYXRlQnlJZCA9IGZ1bmN0aW9uKF9pZCwgYXV0b1RyYW5zbGF0ZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cblx0bGV0IHVwZGF0ZTtcblx0aWYgKGF1dG9UcmFuc2xhdGUpIHtcblx0XHR1cGRhdGUgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdGF1dG9UcmFuc2xhdGUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH0gZWxzZSB7XG5cdFx0dXBkYXRlID0ge1xuXHRcdFx0JHVuc2V0OiB7XG5cdFx0XHRcdGF1dG9UcmFuc2xhdGU6IDEsXG5cdFx0XHR9LFxuXHRcdH07XG5cdH1cblxuXHRyZXR1cm4gdGhpcy51cGRhdGUocXVlcnksIHVwZGF0ZSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUF1dG9UcmFuc2xhdGVMYW5ndWFnZUJ5SWQgPSBmdW5jdGlvbihfaWQsIGF1dG9UcmFuc2xhdGVMYW5ndWFnZSkge1xuXHRjb25zdCBxdWVyeSA9IHtcblx0XHRfaWQsXG5cdH07XG5cblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRzZXQ6IHtcblx0XHRcdGF1dG9UcmFuc2xhdGVMYW5ndWFnZSxcblx0XHR9LFxuXHR9O1xuXG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZ2V0QXV0b1RyYW5zbGF0ZUxhbmd1YWdlc0J5Um9vbUFuZE5vdFVzZXIgPSBmdW5jdGlvbihyaWQsIHVzZXJJZCkge1xuXHRjb25zdCBzdWJzY3JpcHRpb25zUmF3ID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5tb2RlbC5yYXdDb2xsZWN0aW9uKCk7XG5cdGNvbnN0IGRpc3RpbmN0ID0gTWV0ZW9yLndyYXBBc3luYyhzdWJzY3JpcHRpb25zUmF3LmRpc3RpbmN0LCBzdWJzY3JpcHRpb25zUmF3KTtcblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cmlkLFxuXHRcdCd1Ll9pZCc6IHsgJG5lOiB1c2VySWQgfSxcblx0XHRhdXRvVHJhbnNsYXRlOiB0cnVlLFxuXHR9O1xuXHRyZXR1cm4gZGlzdGluY3QoJ2F1dG9UcmFuc2xhdGVMYW5ndWFnZScsIHF1ZXJ5KTtcbn07XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRvVHJhbnNsYXRlLnNhdmVTZXR0aW5ncycocmlkLCBmaWVsZCwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnc2F2ZUF1dG9UcmFuc2xhdGVTZXR0aW5ncycgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnYXV0by10cmFuc2xhdGUnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0F1dG8tVHJhbnNsYXRlIGlzIG5vdCBhbGxvd2VkJywgeyBtZXRob2Q6ICdhdXRvVHJhbnNsYXRlLnNhdmVTZXR0aW5ncycgfSk7XG5cdFx0fVxuXG5cdFx0Y2hlY2socmlkLCBTdHJpbmcpO1xuXHRcdGNoZWNrKGZpZWxkLCBTdHJpbmcpO1xuXHRcdGNoZWNrKHZhbHVlLCBTdHJpbmcpO1xuXG5cdFx0aWYgKFsnYXV0b1RyYW5zbGF0ZScsICdhdXRvVHJhbnNsYXRlTGFuZ3VhZ2UnXS5pbmRleE9mKGZpZWxkKSA9PT0gLTEpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtc2V0dGluZ3MnLCAnSW52YWxpZCBzZXR0aW5ncyBmaWVsZCcsIHsgbWV0aG9kOiAnc2F2ZUF1dG9UcmFuc2xhdGVTZXR0aW5ncycgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kT25lQnlSb29tSWRBbmRVc2VySWQocmlkLCBNZXRlb3IudXNlcklkKCkpO1xuXHRcdGlmICghc3Vic2NyaXB0aW9uKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXN1YnNjcmlwdGlvbicsICdJbnZhbGlkIHN1YnNjcmlwdGlvbicsIHsgbWV0aG9kOiAnc2F2ZUF1dG9UcmFuc2xhdGVTZXR0aW5ncycgfSk7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChmaWVsZCkge1xuXHRcdFx0Y2FzZSAnYXV0b1RyYW5zbGF0ZSc6XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlQXV0b1RyYW5zbGF0ZUJ5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUgPT09ICcxJyk7XG5cdFx0XHRcdGlmICghc3Vic2NyaXB0aW9uLmF1dG9UcmFuc2xhdGVMYW5ndWFnZSAmJiBvcHRpb25zLmRlZmF1bHRMYW5ndWFnZSkge1xuXHRcdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMudXBkYXRlQXV0b1RyYW5zbGF0ZUxhbmd1YWdlQnlJZChzdWJzY3JpcHRpb24uX2lkLCBvcHRpb25zLmRlZmF1bHRMYW5ndWFnZSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0YnJlYWs7XG5cdFx0XHRjYXNlICdhdXRvVHJhbnNsYXRlTGFuZ3VhZ2UnOlxuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLnVwZGF0ZUF1dG9UcmFuc2xhdGVMYW5ndWFnZUJ5SWQoc3Vic2NyaXB0aW9uLl9pZCwgdmFsdWUpO1xuXHRcdFx0XHRicmVhaztcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnYXV0b1RyYW5zbGF0ZS50cmFuc2xhdGVNZXNzYWdlJyhtZXNzYWdlLCB0YXJnZXRMYW5ndWFnZSkge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlICYmIG1lc3NhZ2UucmlkKTtcblx0XHRpZiAobWVzc2FnZSAmJiByb29tICYmIFJvY2tldENoYXQuQXV0b1RyYW5zbGF0ZSkge1xuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQXV0b1RyYW5zbGF0ZS50cmFuc2xhdGVNZXNzYWdlKG1lc3NhZ2UsIHJvb20sIHRhcmdldExhbmd1YWdlKTtcblx0XHR9XG5cdH0sXG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J2F1dG9UcmFuc2xhdGUuZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzJyh0YXJnZXRMYW5ndWFnZSkge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2F1dG8tdHJhbnNsYXRlJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdBdXRvLVRyYW5zbGF0ZSBpcyBub3QgYWxsb3dlZCcsIHsgbWV0aG9kOiAnYXV0b1RyYW5zbGF0ZS5zYXZlU2V0dGluZ3MnIH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkF1dG9UcmFuc2xhdGUuZ2V0U3VwcG9ydGVkTGFuZ3VhZ2VzKHRhcmdldExhbmd1YWdlKTtcblx0fSxcbn0pO1xuXG5ERFBSYXRlTGltaXRlci5hZGRSdWxlKHtcblx0dHlwZTogJ21ldGhvZCcsXG5cdG5hbWU6ICdhdXRvVHJhbnNsYXRlLmdldFN1cHBvcnRlZExhbmd1YWdlcycsXG5cdHVzZXJJZCgvKiB1c2VySWQqLykge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxufSwgNSwgNjAwMDApO1xuIl19
