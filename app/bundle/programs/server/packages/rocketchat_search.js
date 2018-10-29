(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var FlowRouter = Package['kadira:flow-router'].FlowRouter;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var payload;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:search":{"server":{"index.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/index.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  searchProviderService: () => searchProviderService,
  SearchProvider: () => SearchProvider
});
let SearchProvider;
module.watch(require("./model/provider"), {
  default(v) {
    SearchProvider = v;
  }

}, 0);
module.watch(require("./service/providerService.js"));
module.watch(require("./service/validationService.js"));
module.watch(require("./events/events.js"));
module.watch(require("./provider/defaultProvider.js"));
let searchProviderService;
module.watch(require("./service/providerService"), {
  searchProviderService(v) {
    searchProviderService = v;
  }

}, 1);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"events":{"events.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/events/events.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let searchProviderService;
module.watch(require("../service/providerService"), {
  searchProviderService(v) {
    searchProviderService = v;
  }

}, 0);
let SearchLogger;
module.watch(require("../logger/logger"), {
  default(v) {
    SearchLogger = v;
  }

}, 1);

class EventService {
  /* eslint no-unused-vars: [2, { "args": "none" }]*/
  _pushError(name, value, payload) {
    // TODO implement a (performant) cache
    SearchLogger.debug(`Error on event '${name}' with id '${value}'`);
  }

  promoteEvent(name, value, payload) {
    if (!(searchProviderService.activeProvider && searchProviderService.activeProvider.on(name, value, payload))) {
      this._pushError(name, value, payload);
    }
  }

}

const eventService = new EventService();
/**
 * Listen to message changes via Hooks
 */

RocketChat.callbacks.add('afterSaveMessage', function (m) {
  eventService.promoteEvent('message.save', m._id, m);
});
RocketChat.callbacks.add('afterDeleteMessage', function (m) {
  eventService.promoteEvent('message.delete', m._id);
});
/**
 * Listen to user and room changes via cursor
 */

RocketChat.models.Users.on('change', ({
  clientAction,
  id,
  data
}) => {
  switch (clientAction) {
    case 'updated':
    case 'inserted':
      const user = data || RocketChat.models.Users.findOneById(id);
      eventService.promoteEvent('user.save', id, user);
      break;

    case 'removed':
      eventService.promoteEvent('user.delete', id);
      break;
  }
});
RocketChat.models.Rooms.on('change', ({
  clientAction,
  id,
  data
}) => {
  switch (clientAction) {
    case 'updated':
    case 'inserted':
      const room = data || RocketChat.models.Rooms.findOneById(id);
      eventService.promoteEvent('room.save', id, room);
      break;

    case 'removed':
      eventService.promoteEvent('room.delete', id);
      break;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"logger":{"logger.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/logger/logger.js                                                                  //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const SearchLogger = new Logger('Search Logger', {});
module.exportDefault(SearchLogger);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"model":{"provider.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/model/provider.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  default: () => SearchProvider
});
let SearchLogger;
module.watch(require("../logger/logger"), {
  default(v) {
    SearchLogger = v;
  }

}, 0);

/**
 * Setting Object in order to manage settings loading for providers and admin ui display
 */
class Setting {
  constructor(basekey, key, type, defaultValue, options = {}) {
    this._basekey = basekey;
    this.key = key;
    this.type = type;
    this.defaultValue = defaultValue;
    this.options = options;
    this._value = undefined;
  }

  get value() {
    return this._value;
  }
  /**
   * Id is generated based on baseKey and key
   * @returns {string}
   */


  get id() {
    return `Search.${this._basekey}.${this.key}`;
  }

  load() {
    this._value = RocketChat.settings.get(this.id);

    if (this._value === undefined) {
      this._value = this.defaultValue;
    }
  }

}
/**
 * Settings Object allows to manage Setting Objects
 */


class Settings {
  constructor(basekey) {
    this.basekey = basekey;
    this.settings = {};
  }

  add(key, type, defaultValue, options) {
    this.settings[key] = new Setting(this.basekey, key, type, defaultValue, options);
  }

  list() {
    return Object.keys(this.settings).map(key => this.settings[key]);
  }

  map() {
    return this.settings;
  }
  /**
   * return the value for key
   * @param key
   */


  get(key) {
    if (!this.settings[key]) {
      throw new Error('Setting is not set');
    }

    return this.settings[key].value;
  }
  /**
   * load currently stored values of all settings
   */


  load() {
    Object.keys(this.settings).forEach(key => {
      this.settings[key].load();
    });
  }

}

class SearchProvider {
  /**
   * Create search provider, key must match /^[a-z0-9]+$/
   * @param key
   */
  constructor(key) {
    if (!key.match(/^[A-z0-9]+$/)) {
      throw new Error(`cannot instantiate provider: ${key} does not match key-pattern`);
    }

    SearchLogger.info(`create search provider ${key}`);
    this._key = key;
    this._settings = new Settings(key);
  }
  /* --- basic params ---*/


  get key() {
    return this._key;
  }

  get i18nLabel() {
    return undefined;
  }

  get i18nDescription() {
    return undefined;
  }

  get iconName() {
    return 'magnifier';
  }

  get settings() {
    return this._settings.list();
  }

  get settingsAsMap() {
    return this._settings.map();
  }
  /* --- templates ---*/


  get resultTemplate() {
    return 'DefaultSearchResultTemplate';
  }

  get suggestionItemTemplate() {
    return 'DefaultSuggestionItemTemplate';
  }
  /* --- search functions ---*/

  /**
   * Search using the current search provider and check if results are valid for the user. The search result has
   * the format {messages:{start:0,numFound:1,docs:[{...}]},users:{...},rooms:{...}}
   * @param text the search text
   * @param context the context (uid, rid)
   * @param payload custom payload (e.g. for paging)
   * @param callback is used to return result an can be called with (error,result)
   */


  search(text, context, payload, callback) {
    throw new Error('Function search has to be implemented');
  }
  /**
   * Returns an ordered list of suggestions. The result should have at least the form [{text:string}]
   * @param text
   * @param context
   * @param payload
   * @param callback
   */


  suggest(text, context, payload, callback) {
    callback(null, []);
  }

  get supportsSuggestions() {
    return false;
  }
  /* --- triggers ---*/


  on(name, value) {
    return true;
  }
  /* --- livecycle ---*/


  run(reason, callback) {
    return new Promise((resolve, reject) => {
      this._settings.load();

      this.start(reason, resolve, reject);
    });
  }

  start(reason, resolve) {
    resolve();
  }

  stop(resolve) {
    resolve();
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"provider":{"defaultProvider.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/provider/defaultProvider.js                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let searchProviderService;
module.watch(require("../service/providerService"), {
  searchProviderService(v) {
    searchProviderService = v;
  }

}, 0);
let SearchProvider;
module.watch(require("../model/provider"), {
  default(v) {
    SearchProvider = v;
  }

}, 1);

/**
 * Implements the default provider (based on mongo db search)
 */
class DefaultProvider extends SearchProvider {
  /**
   * Enable settings: GlobalSearchEnabled, PageSize
   */
  constructor() {
    super('defaultProvider');

    this._settings.add('GlobalSearchEnabled', 'boolean', false, {
      i18nLabel: 'Global_Search',
      alert: 'This feature is currently in beta and could decrease the application performance! Please report bugs to github.com/RocketChat/Rocket.Chat/issues'
    });

    this._settings.add('PageSize', 'int', 10, {
      i18nLabel: 'Search_Page_Size'
    });
  }

  get i18nLabel() {
    return 'Default provider';
  }

  get i18nDescription() {
    return 'You_can_search_using_RegExp_eg';
  }
  /**
   * {@inheritDoc}
   * Uses Meteor function 'messageSearch'
   */


  search(text, context, payload = {}, callback) {
    const _rid = payload.searchAll ? undefined : context.rid;

    const _limit = payload.limit || this._settings.get('PageSize');

    Meteor.call('messageSearch', text, _rid, _limit, callback);
  }

} // register provider


searchProviderService.register(new DefaultProvider());
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"service":{"providerService.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/service/providerService.js                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  searchProviderService: () => searchProviderService
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let validationService;
module.watch(require("../service/validationService"), {
  validationService(v) {
    validationService = v;
  }

}, 1);
let SearchLogger;
module.watch(require("../logger/logger"), {
  default(v) {
    SearchLogger = v;
  }

}, 2);

class SearchProviderService {
  constructor() {
    this.providers = {};
    this.activeProvider = undefined;
  }
  /**
   * Stop current provider (if there is one) and start the new
   * @param id the id of the provider which should be started
   * @param cb a possible callback if provider is active or not (currently not in use)
   */


  use(id) {
    return new Promise((resolve, reject) => {
      if (!this.providers[id]) {
        throw new Error(`provider ${id} cannot be found`);
      }

      let reason = 'switch';

      if (!this.activeProvider) {
        reason = 'startup';
      } else if (this.activeProvider.key === this.providers[id].key) {
        reason = 'update';
      }

      const stopProvider = () => new Promise((resolve, reject) => {
        if (this.activeProvider) {
          SearchLogger.debug(`Stopping provider '${this.activeProvider.key}'`);
          this.activeProvider.stop(resolve, reject);
        } else {
          resolve();
        }
      });

      stopProvider().then(() => {
        this.activeProvider = undefined;
        SearchLogger.debug(`Start provider '${id}'`);

        try {
          this.providers[id].run(reason).then(() => {
            this.activeProvider = this.providers[id];
            resolve();
          }, reject);
        } catch (e) {
          reject(e);
        }
      }, reject);
    });
  }
  /**
   * Registers a search provider on system startup
   * @param provider
   */


  register(provider) {
    this.providers[provider.key] = provider;
  }
  /**
   * Starts the service (loads provider settings for admin ui, add lister not setting changes, enable current provider
   */


  start() {
    SearchLogger.debug('Load data for all providers');
    const {
      providers
    } = this; // add settings for admininistration

    RocketChat.settings.addGroup('Search', function () {
      const self = this;
      self.add('Search.Provider', 'defaultProvider', {
        type: 'select',
        values: Object.keys(providers).map(key => ({
          key,
          i18nLabel: providers[key].i18nLabel
        })),
        public: true,
        i18nLabel: 'Search_Provider'
      });
      Object.keys(providers).filter(key => providers[key].settings && providers[key].settings.length > 0).forEach(function (key) {
        self.section(providers[key].i18nLabel, function () {
          providers[key].settings.forEach(setting => {
            const _options = (0, _objectSpread2.default)({
              type: setting.type
            }, setting.options);

            _options.enableQuery = _options.enableQuery || [];

            _options.enableQuery.push({
              _id: 'Search.Provider',
              value: key
            });

            this.add(setting.id, setting.defaultValue, _options);
          });
        });
      });
    }); // add listener to react on setting changes

    const configProvider = _.debounce(Meteor.bindEnvironment(() => {
      const providerId = RocketChat.settings.get('Search.Provider');

      if (providerId) {
        this.use(providerId); // TODO do something with success and errors
      }
    }), 1000);

    RocketChat.settings.get(/^Search\./, configProvider);
  }

}

const searchProviderService = new SearchProviderService();
Meteor.startup(() => {
  searchProviderService.start();
});
Meteor.methods({
  /**
   * Search using the current search provider and check if results are valid for the user. The search result has
   * the format {messages:{start:0,numFound:1,docs:[{...}]},users:{...},rooms:{...}}
   * @param text the search text
   * @param context the context (uid, rid)
   * @param payload custom payload (e.g. for paging)
   * @returns {*}
   */
  'rocketchatSearch.search'(text, context, payload) {
    return new Promise((resolve, reject) => {
      payload = payload !== null ? payload : undefined; // TODO is this cleanup necessary?

      try {
        if (!searchProviderService.activeProvider) {
          throw new Error('Provider currently not active');
        }

        SearchLogger.debug('search: ', `\n\tText:${text}\n\tContext:${JSON.stringify(context)}\n\tPayload:${JSON.stringify(payload)}`);
        searchProviderService.activeProvider.search(text, context, payload, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(validationService.validateSearchResult(data));
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  'rocketchatSearch.suggest'(text, context, payload) {
    return new Promise((resolve, reject) => {
      payload = payload !== null ? payload : undefined; // TODO is this cleanup necessary?

      try {
        if (!searchProviderService.activeProvider) {
          throw new Error('Provider currently not active');
        }

        SearchLogger.debug('suggest: ', `\n\tText:${text}\n\tContext:${JSON.stringify(context)}\n\tPayload:${JSON.stringify(payload)}`);
        searchProviderService.activeProvider.suggest(text, context, payload, (error, data) => {
          if (error) {
            reject(error);
          } else {
            resolve(data);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  },

  /**
   * Get the current provider with key, description, resultTemplate, suggestionItemTemplate and settings (as Map)
   * @returns {*}
   */
  'rocketchatSearch.getProvider'() {
    if (!searchProviderService.activeProvider) {
      return undefined;
    }

    return {
      key: searchProviderService.activeProvider.key,
      description: searchProviderService.activeProvider.i18nDescription,
      icon: searchProviderService.activeProvider.iconName,
      resultTemplate: searchProviderService.activeProvider.resultTemplate,
      supportsSuggestions: searchProviderService.activeProvider.supportsSuggestions,
      suggestionItemTemplate: searchProviderService.activeProvider.suggestionItemTemplate,
      settings: _.mapObject(searchProviderService.activeProvider.settingsAsMap, setting => setting.value)
    };
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"validationService.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_search/server/service/validationService.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  validationService: () => validationService
});
let SearchLogger;
module.watch(require("../logger/logger"), {
  default(v) {
    SearchLogger = v;
  }

}, 0);

class ValidationService {
  constructor() {}

  validateSearchResult(result) {
    const subscriptionCache = {};

    const getSubscription = (rid, uid) => {
      if (!subscriptionCache.hasOwnProperty(rid)) {
        subscriptionCache[rid] = Meteor.call('canAccessRoom', rid, uid);
      }

      return subscriptionCache[rid];
    };

    const userCache = {};

    const getUsername = uid => {
      if (!userCache.hasOwnProperty(uid)) {
        try {
          userCache[uid] = RocketChat.models.Users.findById(uid).fetch()[0].username;
        } catch (e) {
          userCache[uid] = undefined;
        }
      }

      return userCache[uid];
    };

    const uid = Meteor.userId(); // get subscription for message

    if (result.message) {
      result.message.docs.forEach(msg => {
        const subscription = getSubscription(msg.rid, uid);

        if (subscription) {
          msg.r = {
            name: subscription.name,
            t: subscription.t
          };
          msg.username = getUsername(msg.user);
          msg.valid = true;
          SearchLogger.debug(`user ${uid} can access ${msg.rid} ( ${subscription.t === 'd' ? subscription.username : subscription.name} )`);
        } else {
          SearchLogger.debug(`user ${uid} can NOT access ${msg.rid}`);
        }
      });
      result.message.docs.filter(msg => msg.valid);
    }

    if (result.room) {
      result.room.docs.forEach(room => {
        const subscription = getSubscription(room._id, uid);

        if (subscription) {
          room.valid = true;
          SearchLogger.debug(`user ${uid} can access ${room._id} ( ${subscription.t === 'd' ? subscription.username : subscription.name} )`);
        } else {
          SearchLogger.debug(`user ${uid} can NOT access ${room._id}`);
        }
      });
      result.room.docs.filter(room => room.valid);
    }

    return result;
  }

}

const validationService = new ValidationService();
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:search/server/index.js");

/* Exports */
Package._define("rocketchat:search", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_search.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzZWFyY2gvc2VydmVyL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNlYXJjaC9zZXJ2ZXIvZXZlbnRzL2V2ZW50cy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzZWFyY2gvc2VydmVyL2xvZ2dlci9sb2dnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6c2VhcmNoL3NlcnZlci9tb2RlbC9wcm92aWRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzZWFyY2gvc2VydmVyL3Byb3ZpZGVyL2RlZmF1bHRQcm92aWRlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpzZWFyY2gvc2VydmVyL3NlcnZpY2UvcHJvdmlkZXJTZXJ2aWNlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OnNlYXJjaC9zZXJ2ZXIvc2VydmljZS92YWxpZGF0aW9uU2VydmljZS5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnQiLCJzZWFyY2hQcm92aWRlclNlcnZpY2UiLCJTZWFyY2hQcm92aWRlciIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwiU2VhcmNoTG9nZ2VyIiwiRXZlbnRTZXJ2aWNlIiwiX3B1c2hFcnJvciIsIm5hbWUiLCJ2YWx1ZSIsInBheWxvYWQiLCJkZWJ1ZyIsInByb21vdGVFdmVudCIsImFjdGl2ZVByb3ZpZGVyIiwib24iLCJldmVudFNlcnZpY2UiLCJSb2NrZXRDaGF0IiwiY2FsbGJhY2tzIiwiYWRkIiwibSIsIl9pZCIsIm1vZGVscyIsIlVzZXJzIiwiY2xpZW50QWN0aW9uIiwiaWQiLCJkYXRhIiwidXNlciIsImZpbmRPbmVCeUlkIiwiUm9vbXMiLCJyb29tIiwiTG9nZ2VyIiwiZXhwb3J0RGVmYXVsdCIsIlNldHRpbmciLCJjb25zdHJ1Y3RvciIsImJhc2VrZXkiLCJrZXkiLCJ0eXBlIiwiZGVmYXVsdFZhbHVlIiwib3B0aW9ucyIsIl9iYXNla2V5IiwiX3ZhbHVlIiwidW5kZWZpbmVkIiwibG9hZCIsInNldHRpbmdzIiwiZ2V0IiwiU2V0dGluZ3MiLCJsaXN0IiwiT2JqZWN0Iiwia2V5cyIsIm1hcCIsIkVycm9yIiwiZm9yRWFjaCIsIm1hdGNoIiwiaW5mbyIsIl9rZXkiLCJfc2V0dGluZ3MiLCJpMThuTGFiZWwiLCJpMThuRGVzY3JpcHRpb24iLCJpY29uTmFtZSIsInNldHRpbmdzQXNNYXAiLCJyZXN1bHRUZW1wbGF0ZSIsInN1Z2dlc3Rpb25JdGVtVGVtcGxhdGUiLCJzZWFyY2giLCJ0ZXh0IiwiY29udGV4dCIsImNhbGxiYWNrIiwic3VnZ2VzdCIsInN1cHBvcnRzU3VnZ2VzdGlvbnMiLCJydW4iLCJyZWFzb24iLCJQcm9taXNlIiwicmVzb2x2ZSIsInJlamVjdCIsInN0YXJ0Iiwic3RvcCIsIkRlZmF1bHRQcm92aWRlciIsImFsZXJ0IiwiX3JpZCIsInNlYXJjaEFsbCIsInJpZCIsIl9saW1pdCIsImxpbWl0IiwiTWV0ZW9yIiwiY2FsbCIsInJlZ2lzdGVyIiwiXyIsInZhbGlkYXRpb25TZXJ2aWNlIiwiU2VhcmNoUHJvdmlkZXJTZXJ2aWNlIiwicHJvdmlkZXJzIiwidXNlIiwic3RvcFByb3ZpZGVyIiwidGhlbiIsImUiLCJwcm92aWRlciIsImFkZEdyb3VwIiwic2VsZiIsInZhbHVlcyIsInB1YmxpYyIsImZpbHRlciIsImxlbmd0aCIsInNlY3Rpb24iLCJzZXR0aW5nIiwiX29wdGlvbnMiLCJlbmFibGVRdWVyeSIsInB1c2giLCJjb25maWdQcm92aWRlciIsImRlYm91bmNlIiwiYmluZEVudmlyb25tZW50IiwicHJvdmlkZXJJZCIsInN0YXJ0dXAiLCJtZXRob2RzIiwiSlNPTiIsInN0cmluZ2lmeSIsImVycm9yIiwidmFsaWRhdGVTZWFyY2hSZXN1bHQiLCJkZXNjcmlwdGlvbiIsImljb24iLCJtYXBPYmplY3QiLCJWYWxpZGF0aW9uU2VydmljZSIsInJlc3VsdCIsInN1YnNjcmlwdGlvbkNhY2hlIiwiZ2V0U3Vic2NyaXB0aW9uIiwidWlkIiwiaGFzT3duUHJvcGVydHkiLCJ1c2VyQ2FjaGUiLCJnZXRVc2VybmFtZSIsImZpbmRCeUlkIiwiZmV0Y2giLCJ1c2VybmFtZSIsInVzZXJJZCIsIm1lc3NhZ2UiLCJkb2NzIiwibXNnIiwic3Vic2NyaXB0aW9uIiwiciIsInQiLCJ2YWxpZCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsT0FBT0MsTUFBUCxDQUFjO0FBQUNDLHlCQUFzQixNQUFJQSxxQkFBM0I7QUFBaURDLGtCQUFlLE1BQUlBO0FBQXBFLENBQWQ7QUFBbUcsSUFBSUEsY0FBSjtBQUFtQkgsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLGtCQUFSLENBQWIsRUFBeUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNKLHFCQUFlSSxDQUFmO0FBQWlCOztBQUE3QixDQUF6QyxFQUF3RSxDQUF4RTtBQUEyRVAsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLDhCQUFSLENBQWI7QUFBc0RMLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSxnQ0FBUixDQUFiO0FBQXdETCxPQUFPSSxLQUFQLENBQWFDLFFBQVEsb0JBQVIsQ0FBYjtBQUE0Q0wsT0FBT0ksS0FBUCxDQUFhQyxRQUFRLCtCQUFSLENBQWI7QUFBdUQsSUFBSUgscUJBQUo7QUFBMEJGLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSwyQkFBUixDQUFiLEVBQWtEO0FBQUNILHdCQUFzQkssQ0FBdEIsRUFBd0I7QUFBQ0wsNEJBQXNCSyxDQUF0QjtBQUF3Qjs7QUFBbEQsQ0FBbEQsRUFBc0csQ0FBdEcsRTs7Ozs7Ozs7Ozs7QUNBNWEsSUFBSUwscUJBQUo7QUFBMEJGLE9BQU9JLEtBQVAsQ0FBYUMsUUFBUSw0QkFBUixDQUFiLEVBQW1EO0FBQUNILHdCQUFzQkssQ0FBdEIsRUFBd0I7QUFBQ0ws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LEdBQUssTUFBTWlILGFBQWFFLENBQWIsS0FBbUIsR0FBbkIsR0FBeUJGLGFBQWFMLFFBQXRDLEdBQWlESyxhQUFhN0gsSUFBTSxJQUFwSTtBQUNBLFNBSEQsTUFHTztBQUNOSCx1QkFBYU0sS0FBYixDQUFvQixRQUFRK0csR0FBSyxtQkFBbUI3RixLQUFLVCxHQUFLLEVBQTlEO0FBQ0E7QUFDRCxPQVJEO0FBVUFtRyxhQUFPMUYsSUFBUCxDQUFZc0csSUFBWixDQUFpQmpDLE1BQWpCLENBQXlCckUsSUFBRCxJQUFVQSxLQUFLMkcsS0FBdkM7QUFDQTs7QUFFRCxXQUFPakIsTUFBUDtBQUNBOztBQS9Ec0I7O0FBa0VqQixNQUFNakMsb0JBQW9CLElBQUlnQyxpQkFBSixFQUExQixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3NlYXJjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBTZWFyY2hQcm92aWRlciBmcm9tICcuL21vZGVsL3Byb3ZpZGVyJztcbmltcG9ydCAnLi9zZXJ2aWNlL3Byb3ZpZGVyU2VydmljZS5qcyc7XG5pbXBvcnQgJy4vc2VydmljZS92YWxpZGF0aW9uU2VydmljZS5qcyc7XG5pbXBvcnQgJy4vZXZlbnRzL2V2ZW50cy5qcyc7XG5pbXBvcnQgJy4vcHJvdmlkZXIvZGVmYXVsdFByb3ZpZGVyLmpzJztcblxuaW1wb3J0IHsgc2VhcmNoUHJvdmlkZXJTZXJ2aWNlIH0gZnJvbSAnLi9zZXJ2aWNlL3Byb3ZpZGVyU2VydmljZSc7XG5cbmV4cG9ydCB7XG5cdHNlYXJjaFByb3ZpZGVyU2VydmljZSxcblx0U2VhcmNoUHJvdmlkZXIsXG59O1xuIiwiaW1wb3J0IHsgc2VhcmNoUHJvdmlkZXJTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZS9wcm92aWRlclNlcnZpY2UnO1xuaW1wb3J0IFNlYXJjaExvZ2dlciBmcm9tICcuLi9sb2dnZXIvbG9nZ2VyJztcblxuY2xhc3MgRXZlbnRTZXJ2aWNlIHtcblxuXHQvKiBlc2xpbnQgbm8tdW51c2VkLXZhcnM6IFsyLCB7IFwiYXJnc1wiOiBcIm5vbmVcIiB9XSovXG5cdF9wdXNoRXJyb3IobmFtZSwgdmFsdWUsIHBheWxvYWQpIHtcblx0XHQvLyBUT0RPIGltcGxlbWVudCBhIChwZXJmb3JtYW50KSBjYWNoZVxuXHRcdFNlYXJjaExvZ2dlci5kZWJ1ZyhgRXJyb3Igb24gZXZlbnQgJyR7IG5hbWUgfScgd2l0aCBpZCAnJHsgdmFsdWUgfSdgKTtcblx0fVxuXG5cdHByb21vdGVFdmVudChuYW1lLCB2YWx1ZSwgcGF5bG9hZCkge1xuXHRcdGlmICghKHNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlciAmJiBzZWFyY2hQcm92aWRlclNlcnZpY2UuYWN0aXZlUHJvdmlkZXIub24obmFtZSwgdmFsdWUsIHBheWxvYWQpKSkge1xuXHRcdFx0dGhpcy5fcHVzaEVycm9yKG5hbWUsIHZhbHVlLCBwYXlsb2FkKTtcblx0XHR9XG5cdH1cbn1cblxuY29uc3QgZXZlbnRTZXJ2aWNlID0gbmV3IEV2ZW50U2VydmljZSgpO1xuXG4vKipcbiAqIExpc3RlbiB0byBtZXNzYWdlIGNoYW5nZXMgdmlhIEhvb2tzXG4gKi9cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJTYXZlTWVzc2FnZScsIGZ1bmN0aW9uKG0pIHtcblx0ZXZlbnRTZXJ2aWNlLnByb21vdGVFdmVudCgnbWVzc2FnZS5zYXZlJywgbS5faWQsIG0pO1xufSk7XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYWZ0ZXJEZWxldGVNZXNzYWdlJywgZnVuY3Rpb24obSkge1xuXHRldmVudFNlcnZpY2UucHJvbW90ZUV2ZW50KCdtZXNzYWdlLmRlbGV0ZScsIG0uX2lkKTtcbn0pO1xuXG4vKipcbiAqIExpc3RlbiB0byB1c2VyIGFuZCByb29tIGNoYW5nZXMgdmlhIGN1cnNvclxuICovXG5cblxuUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMub24oJ2NoYW5nZScsICh7IGNsaWVudEFjdGlvbiwgaWQsIGRhdGEgfSkgPT4ge1xuXHRzd2l0Y2ggKGNsaWVudEFjdGlvbikge1xuXHRcdGNhc2UgJ3VwZGF0ZWQnOlxuXHRcdGNhc2UgJ2luc2VydGVkJzpcblx0XHRcdGNvbnN0IHVzZXIgPSBkYXRhIHx8IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkKGlkKTtcblx0XHRcdGV2ZW50U2VydmljZS5wcm9tb3RlRXZlbnQoJ3VzZXIuc2F2ZScsIGlkLCB1c2VyKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAncmVtb3ZlZCc6XG5cdFx0XHRldmVudFNlcnZpY2UucHJvbW90ZUV2ZW50KCd1c2VyLmRlbGV0ZScsIGlkKTtcblx0XHRcdGJyZWFrO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMub24oJ2NoYW5nZScsICh7IGNsaWVudEFjdGlvbiwgaWQsIGRhdGEgfSkgPT4ge1xuXHRzd2l0Y2ggKGNsaWVudEFjdGlvbikge1xuXHRcdGNhc2UgJ3VwZGF0ZWQnOlxuXHRcdGNhc2UgJ2luc2VydGVkJzpcblx0XHRcdGNvbnN0IHJvb20gPSBkYXRhIHx8IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeUlkKGlkKTtcblx0XHRcdGV2ZW50U2VydmljZS5wcm9tb3RlRXZlbnQoJ3Jvb20uc2F2ZScsIGlkLCByb29tKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0Y2FzZSAncmVtb3ZlZCc6XG5cdFx0XHRldmVudFNlcnZpY2UucHJvbW90ZUV2ZW50KCdyb29tLmRlbGV0ZScsIGlkKTtcblx0XHRcdGJyZWFrO1xuXHR9XG59KTtcbiIsImNvbnN0IFNlYXJjaExvZ2dlciA9IG5ldyBMb2dnZXIoJ1NlYXJjaCBMb2dnZXInLCB7fSk7XG5leHBvcnQgZGVmYXVsdCBTZWFyY2hMb2dnZXI7XG4iLCIvKiBlc2xpbnQgbm8tdW51c2VkLXZhcnM6IFsyLCB7IFwiYXJnc1wiOiBcIm5vbmVcIiB9XSovXG5pbXBvcnQgU2VhcmNoTG9nZ2VyIGZyb20gJy4uL2xvZ2dlci9sb2dnZXInO1xuXG4vKipcbiAqIFNldHRpbmcgT2JqZWN0IGluIG9yZGVyIHRvIG1hbmFnZSBzZXR0aW5ncyBsb2FkaW5nIGZvciBwcm92aWRlcnMgYW5kIGFkbWluIHVpIGRpc3BsYXlcbiAqL1xuY2xhc3MgU2V0dGluZyB7XG5cdGNvbnN0cnVjdG9yKGJhc2VrZXksIGtleSwgdHlwZSwgZGVmYXVsdFZhbHVlLCBvcHRpb25zID0ge30pIHtcblx0XHR0aGlzLl9iYXNla2V5ID0gYmFzZWtleTtcblx0XHR0aGlzLmtleSA9IGtleTtcblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHRcdHRoaXMuZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlO1xuXHRcdHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cdFx0dGhpcy5fdmFsdWUgPSB1bmRlZmluZWQ7XG5cdH1cblxuXHRnZXQgdmFsdWUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3ZhbHVlO1xuXHR9XG5cblx0LyoqXG5cdCAqIElkIGlzIGdlbmVyYXRlZCBiYXNlZCBvbiBiYXNlS2V5IGFuZCBrZXlcblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICovXG5cdGdldCBpZCgpIHtcblx0XHRyZXR1cm4gYFNlYXJjaC4keyB0aGlzLl9iYXNla2V5IH0uJHsgdGhpcy5rZXkgfWA7XG5cdH1cblxuXHRsb2FkKCkge1xuXHRcdHRoaXMuX3ZhbHVlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQodGhpcy5pZCk7XG5cblx0XHRpZiAodGhpcy5fdmFsdWUgPT09IHVuZGVmaW5lZCkgeyB0aGlzLl92YWx1ZSA9IHRoaXMuZGVmYXVsdFZhbHVlOyB9XG5cdH1cblxufVxuXG4vKipcbiAqIFNldHRpbmdzIE9iamVjdCBhbGxvd3MgdG8gbWFuYWdlIFNldHRpbmcgT2JqZWN0c1xuICovXG5jbGFzcyBTZXR0aW5ncyB7XG5cdGNvbnN0cnVjdG9yKGJhc2VrZXkpIHtcblx0XHR0aGlzLmJhc2VrZXkgPSBiYXNla2V5O1xuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0fVxuXG5cdGFkZChrZXksIHR5cGUsIGRlZmF1bHRWYWx1ZSwgb3B0aW9ucykge1xuXHRcdHRoaXMuc2V0dGluZ3Nba2V5XSA9IG5ldyBTZXR0aW5nKHRoaXMuYmFzZWtleSwga2V5LCB0eXBlLCBkZWZhdWx0VmFsdWUsIG9wdGlvbnMpO1xuXHR9XG5cblx0bGlzdCgpIHtcblx0XHRyZXR1cm4gT2JqZWN0LmtleXModGhpcy5zZXR0aW5ncykubWFwKChrZXkpID0+IHRoaXMuc2V0dGluZ3Nba2V5XSk7XG5cdH1cblxuXHRtYXAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuc2V0dGluZ3M7XG5cdH1cblxuXHQvKipcblx0ICogcmV0dXJuIHRoZSB2YWx1ZSBmb3Iga2V5XG5cdCAqIEBwYXJhbSBrZXlcblx0ICovXG5cdGdldChrZXkpIHtcblx0XHRpZiAoIXRoaXMuc2V0dGluZ3Nba2V5XSkgeyB0aHJvdyBuZXcgRXJyb3IoJ1NldHRpbmcgaXMgbm90IHNldCcpOyB9XG5cdFx0cmV0dXJuIHRoaXMuc2V0dGluZ3Nba2V5XS52YWx1ZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBsb2FkIGN1cnJlbnRseSBzdG9yZWQgdmFsdWVzIG9mIGFsbCBzZXR0aW5nc1xuXHQgKi9cblx0bG9hZCgpIHtcblx0XHRPYmplY3Qua2V5cyh0aGlzLnNldHRpbmdzKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRcdHRoaXMuc2V0dGluZ3Nba2V5XS5sb2FkKCk7XG5cdFx0fSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgU2VhcmNoUHJvdmlkZXIge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGUgc2VhcmNoIHByb3ZpZGVyLCBrZXkgbXVzdCBtYXRjaCAvXlthLXowLTldKyQvXG5cdCAqIEBwYXJhbSBrZXlcblx0ICovXG5cdGNvbnN0cnVjdG9yKGtleSkge1xuXG5cdFx0aWYgKCFrZXkubWF0Y2goL15bQS16MC05XSskLykpIHsgdGhyb3cgbmV3IEVycm9yKGBjYW5ub3QgaW5zdGFudGlhdGUgcHJvdmlkZXI6ICR7IGtleSB9IGRvZXMgbm90IG1hdGNoIGtleS1wYXR0ZXJuYCk7IH1cblxuXHRcdFNlYXJjaExvZ2dlci5pbmZvKGBjcmVhdGUgc2VhcmNoIHByb3ZpZGVyICR7IGtleSB9YCk7XG5cblx0XHR0aGlzLl9rZXkgPSBrZXk7XG5cdFx0dGhpcy5fc2V0dGluZ3MgPSBuZXcgU2V0dGluZ3Moa2V5KTtcblx0fVxuXG5cdC8qIC0tLSBiYXNpYyBwYXJhbXMgLS0tKi9cblx0Z2V0IGtleSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fa2V5O1xuXHR9XG5cblx0Z2V0IGkxOG5MYWJlbCgpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Z2V0IGkxOG5EZXNjcmlwdGlvbigpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Z2V0IGljb25OYW1lKCkge1xuXHRcdHJldHVybiAnbWFnbmlmaWVyJztcblx0fVxuXG5cdGdldCBzZXR0aW5ncygpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2V0dGluZ3MubGlzdCgpO1xuXHR9XG5cblx0Z2V0IHNldHRpbmdzQXNNYXAoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3NldHRpbmdzLm1hcCgpO1xuXHR9XG5cblx0LyogLS0tIHRlbXBsYXRlcyAtLS0qL1xuXHRnZXQgcmVzdWx0VGVtcGxhdGUoKSB7XG5cdFx0cmV0dXJuICdEZWZhdWx0U2VhcmNoUmVzdWx0VGVtcGxhdGUnO1xuXHR9XG5cblx0Z2V0IHN1Z2dlc3Rpb25JdGVtVGVtcGxhdGUoKSB7XG5cdFx0cmV0dXJuICdEZWZhdWx0U3VnZ2VzdGlvbkl0ZW1UZW1wbGF0ZSc7XG5cdH1cblxuXHQvKiAtLS0gc2VhcmNoIGZ1bmN0aW9ucyAtLS0qL1xuXHQvKipcblx0ICogU2VhcmNoIHVzaW5nIHRoZSBjdXJyZW50IHNlYXJjaCBwcm92aWRlciBhbmQgY2hlY2sgaWYgcmVzdWx0cyBhcmUgdmFsaWQgZm9yIHRoZSB1c2VyLiBUaGUgc2VhcmNoIHJlc3VsdCBoYXNcblx0ICogdGhlIGZvcm1hdCB7bWVzc2FnZXM6e3N0YXJ0OjAsbnVtRm91bmQ6MSxkb2NzOlt7Li4ufV19LHVzZXJzOnsuLi59LHJvb21zOnsuLi59fVxuXHQgKiBAcGFyYW0gdGV4dCB0aGUgc2VhcmNoIHRleHRcblx0ICogQHBhcmFtIGNvbnRleHQgdGhlIGNvbnRleHQgKHVpZCwgcmlkKVxuXHQgKiBAcGFyYW0gcGF5bG9hZCBjdXN0b20gcGF5bG9hZCAoZS5nLiBmb3IgcGFnaW5nKVxuXHQgKiBAcGFyYW0gY2FsbGJhY2sgaXMgdXNlZCB0byByZXR1cm4gcmVzdWx0IGFuIGNhbiBiZSBjYWxsZWQgd2l0aCAoZXJyb3IscmVzdWx0KVxuXHQgKi9cblx0c2VhcmNoKHRleHQsIGNvbnRleHQsIHBheWxvYWQsIGNhbGxiYWNrKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdGdW5jdGlvbiBzZWFyY2ggaGFzIHRvIGJlIGltcGxlbWVudGVkJyk7XG5cdH1cblxuXHQvKipcblx0ICogUmV0dXJucyBhbiBvcmRlcmVkIGxpc3Qgb2Ygc3VnZ2VzdGlvbnMuIFRoZSByZXN1bHQgc2hvdWxkIGhhdmUgYXQgbGVhc3QgdGhlIGZvcm0gW3t0ZXh0OnN0cmluZ31dXG5cdCAqIEBwYXJhbSB0ZXh0XG5cdCAqIEBwYXJhbSBjb250ZXh0XG5cdCAqIEBwYXJhbSBwYXlsb2FkXG5cdCAqIEBwYXJhbSBjYWxsYmFja1xuXHQgKi9cblx0c3VnZ2VzdCh0ZXh0LCBjb250ZXh0LCBwYXlsb2FkLCBjYWxsYmFjaykge1xuXHRcdGNhbGxiYWNrKG51bGwsIFtdKTtcblx0fVxuXG5cdGdldCBzdXBwb3J0c1N1Z2dlc3Rpb25zKCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8qIC0tLSB0cmlnZ2VycyAtLS0qL1xuXHRvbihuYW1lLCB2YWx1ZSkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0LyogLS0tIGxpdmVjeWNsZSAtLS0qL1xuXHRydW4ocmVhc29uLCBjYWxsYmFjaykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0aGlzLl9zZXR0aW5ncy5sb2FkKCk7XG5cdFx0XHR0aGlzLnN0YXJ0KHJlYXNvbiwgcmVzb2x2ZSwgcmVqZWN0KTtcblx0XHR9KTtcblx0fVxuXG5cdHN0YXJ0KHJlYXNvbiwgcmVzb2x2ZSkge1xuXHRcdHJlc29sdmUoKTtcblx0fVxuXG5cdHN0b3AocmVzb2x2ZSkge1xuXHRcdHJlc29sdmUoKTtcblx0fVxufVxuXG4iLCJpbXBvcnQgeyBzZWFyY2hQcm92aWRlclNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlL3Byb3ZpZGVyU2VydmljZSc7XG5pbXBvcnQgU2VhcmNoUHJvdmlkZXIgZnJvbSAnLi4vbW9kZWwvcHJvdmlkZXInO1xuXG4vKipcbiAqIEltcGxlbWVudHMgdGhlIGRlZmF1bHQgcHJvdmlkZXIgKGJhc2VkIG9uIG1vbmdvIGRiIHNlYXJjaClcbiAqL1xuY2xhc3MgRGVmYXVsdFByb3ZpZGVyIGV4dGVuZHMgU2VhcmNoUHJvdmlkZXIge1xuXG5cdC8qKlxuXHQgKiBFbmFibGUgc2V0dGluZ3M6IEdsb2JhbFNlYXJjaEVuYWJsZWQsIFBhZ2VTaXplXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignZGVmYXVsdFByb3ZpZGVyJyk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdHbG9iYWxTZWFyY2hFbmFibGVkJywgJ2Jvb2xlYW4nLCBmYWxzZSwge1xuXHRcdFx0aTE4bkxhYmVsOiAnR2xvYmFsX1NlYXJjaCcsXG5cdFx0XHRhbGVydDogJ1RoaXMgZmVhdHVyZSBpcyBjdXJyZW50bHkgaW4gYmV0YSBhbmQgY291bGQgZGVjcmVhc2UgdGhlIGFwcGxpY2F0aW9uIHBlcmZvcm1hbmNlISBQbGVhc2UgcmVwb3J0IGJ1Z3MgdG8gZ2l0aHViLmNvbS9Sb2NrZXRDaGF0L1JvY2tldC5DaGF0L2lzc3VlcycsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdQYWdlU2l6ZScsICdpbnQnLCAxMCwge1xuXHRcdFx0aTE4bkxhYmVsOiAnU2VhcmNoX1BhZ2VfU2l6ZScsXG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgaTE4bkxhYmVsKCkge1xuXHRcdHJldHVybiAnRGVmYXVsdCBwcm92aWRlcic7XG5cdH1cblxuXHRnZXQgaTE4bkRlc2NyaXB0aW9uKCkge1xuXHRcdHJldHVybiAnWW91X2Nhbl9zZWFyY2hfdXNpbmdfUmVnRXhwX2VnJztcblx0fVxuXG5cdC8qKlxuXHQgKiB7QGluaGVyaXREb2N9XG5cdCAqIFVzZXMgTWV0ZW9yIGZ1bmN0aW9uICdtZXNzYWdlU2VhcmNoJ1xuXHQgKi9cblx0c2VhcmNoKHRleHQsIGNvbnRleHQsIHBheWxvYWQgPSB7fSwgY2FsbGJhY2spIHtcblxuXHRcdGNvbnN0IF9yaWQgPSBwYXlsb2FkLnNlYXJjaEFsbCA/IHVuZGVmaW5lZCA6IGNvbnRleHQucmlkO1xuXG5cdFx0Y29uc3QgX2xpbWl0ID0gcGF5bG9hZC5saW1pdCB8fCB0aGlzLl9zZXR0aW5ncy5nZXQoJ1BhZ2VTaXplJyk7XG5cblx0XHRNZXRlb3IuY2FsbCgnbWVzc2FnZVNlYXJjaCcsIHRleHQsIF9yaWQsIF9saW1pdCwgY2FsbGJhY2spO1xuXG5cdH1cbn1cblxuLy8gcmVnaXN0ZXIgcHJvdmlkZXJcbnNlYXJjaFByb3ZpZGVyU2VydmljZS5yZWdpc3RlcihuZXcgRGVmYXVsdFByb3ZpZGVyKCkpO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0ICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuaW1wb3J0IHsgdmFsaWRhdGlvblNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlL3ZhbGlkYXRpb25TZXJ2aWNlJztcbmltcG9ydCBTZWFyY2hMb2dnZXIgZnJvbSAnLi4vbG9nZ2VyL2xvZ2dlcic7XG5cbmNsYXNzIFNlYXJjaFByb3ZpZGVyU2VydmljZSB7XG5cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0dGhpcy5wcm92aWRlcnMgPSB7fTtcblx0XHR0aGlzLmFjdGl2ZVByb3ZpZGVyID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN0b3AgY3VycmVudCBwcm92aWRlciAoaWYgdGhlcmUgaXMgb25lKSBhbmQgc3RhcnQgdGhlIG5ld1xuXHQgKiBAcGFyYW0gaWQgdGhlIGlkIG9mIHRoZSBwcm92aWRlciB3aGljaCBzaG91bGQgYmUgc3RhcnRlZFxuXHQgKiBAcGFyYW0gY2IgYSBwb3NzaWJsZSBjYWxsYmFjayBpZiBwcm92aWRlciBpcyBhY3RpdmUgb3Igbm90IChjdXJyZW50bHkgbm90IGluIHVzZSlcblx0ICovXG5cdHVzZShpZCkge1xuXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHRcdGlmICghdGhpcy5wcm92aWRlcnNbaWRdKSB7IHRocm93IG5ldyBFcnJvcihgcHJvdmlkZXIgJHsgaWQgfSBjYW5ub3QgYmUgZm91bmRgKTsgfVxuXG5cdFx0XHRsZXQgcmVhc29uID0gJ3N3aXRjaCc7XG5cblx0XHRcdGlmICghdGhpcy5hY3RpdmVQcm92aWRlcikge1xuXHRcdFx0XHRyZWFzb24gPSAnc3RhcnR1cCc7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMuYWN0aXZlUHJvdmlkZXIua2V5ID09PSB0aGlzLnByb3ZpZGVyc1tpZF0ua2V5KSB7XG5cdFx0XHRcdHJlYXNvbiA9ICd1cGRhdGUnO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBzdG9wUHJvdmlkZXIgPSAoKSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRcdGlmICh0aGlzLmFjdGl2ZVByb3ZpZGVyKSB7XG5cblx0XHRcdFx0XHRTZWFyY2hMb2dnZXIuZGVidWcoYFN0b3BwaW5nIHByb3ZpZGVyICckeyB0aGlzLmFjdGl2ZVByb3ZpZGVyLmtleSB9J2ApO1xuXG5cdFx0XHRcdFx0dGhpcy5hY3RpdmVQcm92aWRlci5zdG9wKHJlc29sdmUsIHJlamVjdCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmVzb2x2ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0c3RvcFByb3ZpZGVyKCkudGhlbigoKSA9PiB7XG5cdFx0XHRcdHRoaXMuYWN0aXZlUHJvdmlkZXIgPSB1bmRlZmluZWQ7XG5cblx0XHRcdFx0U2VhcmNoTG9nZ2VyLmRlYnVnKGBTdGFydCBwcm92aWRlciAnJHsgaWQgfSdgKTtcblxuXHRcdFx0XHR0cnkge1xuXG5cdFx0XHRcdFx0dGhpcy5wcm92aWRlcnNbaWRdLnJ1bihyZWFzb24pLnRoZW4oKCkgPT4ge1xuXHRcdFx0XHRcdFx0dGhpcy5hY3RpdmVQcm92aWRlciA9IHRoaXMucHJvdmlkZXJzW2lkXTtcblx0XHRcdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdFx0XHR9LCByZWplY3QpO1xuXG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRyZWplY3QoZSk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIHJlamVjdCk7XG5cblx0XHR9KTtcblxuXHR9XG5cblx0LyoqXG5cdCAqIFJlZ2lzdGVycyBhIHNlYXJjaCBwcm92aWRlciBvbiBzeXN0ZW0gc3RhcnR1cFxuXHQgKiBAcGFyYW0gcHJvdmlkZXJcblx0ICovXG5cdHJlZ2lzdGVyKHByb3ZpZGVyKSB7XG5cdFx0dGhpcy5wcm92aWRlcnNbcHJvdmlkZXIua2V5XSA9IHByb3ZpZGVyO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN0YXJ0cyB0aGUgc2VydmljZSAobG9hZHMgcHJvdmlkZXIgc2V0dGluZ3MgZm9yIGFkbWluIHVpLCBhZGQgbGlzdGVyIG5vdCBzZXR0aW5nIGNoYW5nZXMsIGVuYWJsZSBjdXJyZW50IHByb3ZpZGVyXG5cdCAqL1xuXHRzdGFydCgpIHtcblx0XHRTZWFyY2hMb2dnZXIuZGVidWcoJ0xvYWQgZGF0YSBmb3IgYWxsIHByb3ZpZGVycycpO1xuXG5cdFx0Y29uc3QgeyBwcm92aWRlcnMgfSA9IHRoaXM7XG5cblx0XHQvLyBhZGQgc2V0dGluZ3MgZm9yIGFkbWluaW5pc3RyYXRpb25cblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdTZWFyY2gnLCBmdW5jdGlvbigpIHtcblxuXHRcdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNlbGYuYWRkKCdTZWFyY2guUHJvdmlkZXInLCAnZGVmYXVsdFByb3ZpZGVyJywge1xuXHRcdFx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRcdFx0dmFsdWVzOiBPYmplY3Qua2V5cyhwcm92aWRlcnMpLm1hcCgoa2V5KSA9PiAoeyBrZXksIGkxOG5MYWJlbDogcHJvdmlkZXJzW2tleV0uaTE4bkxhYmVsIH0pKSxcblx0XHRcdFx0cHVibGljOiB0cnVlLFxuXHRcdFx0XHRpMThuTGFiZWw6ICdTZWFyY2hfUHJvdmlkZXInLFxuXHRcdFx0fSk7XG5cblx0XHRcdE9iamVjdC5rZXlzKHByb3ZpZGVycylcblx0XHRcdFx0LmZpbHRlcigoa2V5KSA9PiBwcm92aWRlcnNba2V5XS5zZXR0aW5ncyAmJiBwcm92aWRlcnNba2V5XS5zZXR0aW5ncy5sZW5ndGggPiAwKVxuXHRcdFx0XHQuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRzZWxmLnNlY3Rpb24ocHJvdmlkZXJzW2tleV0uaTE4bkxhYmVsLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHByb3ZpZGVyc1trZXldLnNldHRpbmdzLmZvckVhY2goKHNldHRpbmcpID0+IHtcblxuXHRcdFx0XHRcdFx0XHRjb25zdCBfb3B0aW9ucyA9IHtcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBzZXR0aW5nLnR5cGUsXG5cdFx0XHRcdFx0XHRcdFx0Li4uc2V0dGluZy5vcHRpb25zLFxuXHRcdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRcdF9vcHRpb25zLmVuYWJsZVF1ZXJ5ID0gX29wdGlvbnMuZW5hYmxlUXVlcnkgfHwgW107XG5cblx0XHRcdFx0XHRcdFx0X29wdGlvbnMuZW5hYmxlUXVlcnkucHVzaCh7XG5cdFx0XHRcdFx0XHRcdFx0X2lkOiAnU2VhcmNoLlByb3ZpZGVyJyxcblx0XHRcdFx0XHRcdFx0XHR2YWx1ZToga2V5LFxuXHRcdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0XHR0aGlzLmFkZChzZXR0aW5nLmlkLCBzZXR0aW5nLmRlZmF1bHRWYWx1ZSwgX29wdGlvbnMpO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdH0pO1xuXG5cdFx0Ly8gYWRkIGxpc3RlbmVyIHRvIHJlYWN0IG9uIHNldHRpbmcgY2hhbmdlc1xuXHRcdGNvbnN0IGNvbmZpZ1Byb3ZpZGVyID0gXy5kZWJvdW5jZShNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdGNvbnN0IHByb3ZpZGVySWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnU2VhcmNoLlByb3ZpZGVyJyk7XG5cblx0XHRcdGlmIChwcm92aWRlcklkKSB7XG5cdFx0XHRcdHRoaXMudXNlKHByb3ZpZGVySWQpOy8vIFRPRE8gZG8gc29tZXRoaW5nIHdpdGggc3VjY2VzcyBhbmQgZXJyb3JzXG5cdFx0XHR9XG5cblx0XHR9KSwgMTAwMCk7XG5cblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXlNlYXJjaFxcLi8sIGNvbmZpZ1Byb3ZpZGVyKTtcblx0fVxuXG59XG5cbmV4cG9ydCBjb25zdCBzZWFyY2hQcm92aWRlclNlcnZpY2UgPSBuZXcgU2VhcmNoUHJvdmlkZXJTZXJ2aWNlKCk7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0c2VhcmNoUHJvdmlkZXJTZXJ2aWNlLnN0YXJ0KCk7XG59KTtcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQvKipcblx0ICogU2VhcmNoIHVzaW5nIHRoZSBjdXJyZW50IHNlYXJjaCBwcm92aWRlciBhbmQgY2hlY2sgaWYgcmVzdWx0cyBhcmUgdmFsaWQgZm9yIHRoZSB1c2VyLiBUaGUgc2VhcmNoIHJlc3VsdCBoYXNcblx0ICogdGhlIGZvcm1hdCB7bWVzc2FnZXM6e3N0YXJ0OjAsbnVtRm91bmQ6MSxkb2NzOlt7Li4ufV19LHVzZXJzOnsuLi59LHJvb21zOnsuLi59fVxuXHQgKiBAcGFyYW0gdGV4dCB0aGUgc2VhcmNoIHRleHRcblx0ICogQHBhcmFtIGNvbnRleHQgdGhlIGNvbnRleHQgKHVpZCwgcmlkKVxuXHQgKiBAcGFyYW0gcGF5bG9hZCBjdXN0b20gcGF5bG9hZCAoZS5nLiBmb3IgcGFnaW5nKVxuXHQgKiBAcmV0dXJucyB7Kn1cblx0ICovXG5cdCdyb2NrZXRjaGF0U2VhcmNoLnNlYXJjaCcodGV4dCwgY29udGV4dCwgcGF5bG9hZCkge1xuXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblxuXHRcdFx0cGF5bG9hZCA9IHBheWxvYWQgIT09IG51bGwgPyBwYXlsb2FkIDogdW5kZWZpbmVkOy8vIFRPRE8gaXMgdGhpcyBjbGVhbnVwIG5lY2Vzc2FyeT9cblxuXHRcdFx0dHJ5IHtcblxuXHRcdFx0XHRpZiAoIXNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlcikge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignUHJvdmlkZXIgY3VycmVudGx5IG5vdCBhY3RpdmUnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdFNlYXJjaExvZ2dlci5kZWJ1Zygnc2VhcmNoOiAnLCBgXFxuXFx0VGV4dDokeyB0ZXh0IH1cXG5cXHRDb250ZXh0OiR7IEpTT04uc3RyaW5naWZ5KGNvbnRleHQpIH1cXG5cXHRQYXlsb2FkOiR7IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpIH1gKTtcblxuXHRcdFx0XHRzZWFyY2hQcm92aWRlclNlcnZpY2UuYWN0aXZlUHJvdmlkZXIuc2VhcmNoKHRleHQsIGNvbnRleHQsIHBheWxvYWQsIChlcnJvciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmVzb2x2ZSh2YWxpZGF0aW9uU2VydmljZS52YWxpZGF0ZVNlYXJjaFJlc3VsdChkYXRhKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHQncm9ja2V0Y2hhdFNlYXJjaC5zdWdnZXN0Jyh0ZXh0LCBjb250ZXh0LCBwYXlsb2FkKSB7XG5cblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0cGF5bG9hZCA9IHBheWxvYWQgIT09IG51bGwgPyBwYXlsb2FkIDogdW5kZWZpbmVkOy8vIFRPRE8gaXMgdGhpcyBjbGVhbnVwIG5lY2Vzc2FyeT9cblxuXHRcdFx0dHJ5IHtcblxuXHRcdFx0XHRpZiAoIXNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlcikgeyB0aHJvdyBuZXcgRXJyb3IoJ1Byb3ZpZGVyIGN1cnJlbnRseSBub3QgYWN0aXZlJyk7IH1cblxuXHRcdFx0XHRTZWFyY2hMb2dnZXIuZGVidWcoJ3N1Z2dlc3Q6ICcsIGBcXG5cXHRUZXh0OiR7IHRleHQgfVxcblxcdENvbnRleHQ6JHsgSlNPTi5zdHJpbmdpZnkoY29udGV4dCkgfVxcblxcdFBheWxvYWQ6JHsgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkgfWApO1xuXG5cdFx0XHRcdHNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlci5zdWdnZXN0KHRleHQsIGNvbnRleHQsIHBheWxvYWQsIChlcnJvciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRcdFx0cmVqZWN0KGVycm9yKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmVzb2x2ZShkYXRhKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZWplY3QoZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdC8qKlxuXHQgKiBHZXQgdGhlIGN1cnJlbnQgcHJvdmlkZXIgd2l0aCBrZXksIGRlc2NyaXB0aW9uLCByZXN1bHRUZW1wbGF0ZSwgc3VnZ2VzdGlvbkl0ZW1UZW1wbGF0ZSBhbmQgc2V0dGluZ3MgKGFzIE1hcClcblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHQncm9ja2V0Y2hhdFNlYXJjaC5nZXRQcm92aWRlcicoKSB7XG5cdFx0aWYgKCFzZWFyY2hQcm92aWRlclNlcnZpY2UuYWN0aXZlUHJvdmlkZXIpIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuXG5cdFx0cmV0dXJuIHtcblx0XHRcdGtleTogc2VhcmNoUHJvdmlkZXJTZXJ2aWNlLmFjdGl2ZVByb3ZpZGVyLmtleSxcblx0XHRcdGRlc2NyaXB0aW9uOiBzZWFyY2hQcm92aWRlclNlcnZpY2UuYWN0aXZlUHJvdmlkZXIuaTE4bkRlc2NyaXB0aW9uLFxuXHRcdFx0aWNvbjogc2VhcmNoUHJvdmlkZXJTZXJ2aWNlLmFjdGl2ZVByb3ZpZGVyLmljb25OYW1lLFxuXHRcdFx0cmVzdWx0VGVtcGxhdGU6IHNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlci5yZXN1bHRUZW1wbGF0ZSxcblx0XHRcdHN1cHBvcnRzU3VnZ2VzdGlvbnM6IHNlYXJjaFByb3ZpZGVyU2VydmljZS5hY3RpdmVQcm92aWRlci5zdXBwb3J0c1N1Z2dlc3Rpb25zLFxuXHRcdFx0c3VnZ2VzdGlvbkl0ZW1UZW1wbGF0ZTogc2VhcmNoUHJvdmlkZXJTZXJ2aWNlLmFjdGl2ZVByb3ZpZGVyLnN1Z2dlc3Rpb25JdGVtVGVtcGxhdGUsXG5cdFx0XHRzZXR0aW5nczogXy5tYXBPYmplY3Qoc2VhcmNoUHJvdmlkZXJTZXJ2aWNlLmFjdGl2ZVByb3ZpZGVyLnNldHRpbmdzQXNNYXAsIChzZXR0aW5nKSA9PiBzZXR0aW5nLnZhbHVlKSxcblx0XHR9O1xuXHR9LFxufSk7XG5cbiIsImltcG9ydCBTZWFyY2hMb2dnZXIgZnJvbSAnLi4vbG9nZ2VyL2xvZ2dlcic7XG5cbmNsYXNzIFZhbGlkYXRpb25TZXJ2aWNlIHtcblx0Y29uc3RydWN0b3IoKSB7fVxuXG5cdHZhbGlkYXRlU2VhcmNoUmVzdWx0KHJlc3VsdCkge1xuXG5cdFx0Y29uc3Qgc3Vic2NyaXB0aW9uQ2FjaGUgPSB7fTtcblxuXHRcdGNvbnN0IGdldFN1YnNjcmlwdGlvbiA9IChyaWQsIHVpZCkgPT4ge1xuXHRcdFx0aWYgKCFzdWJzY3JpcHRpb25DYWNoZS5oYXNPd25Qcm9wZXJ0eShyaWQpKSB7XG5cdFx0XHRcdHN1YnNjcmlwdGlvbkNhY2hlW3JpZF0gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJpZCwgdWlkKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHN1YnNjcmlwdGlvbkNhY2hlW3JpZF07XG5cdFx0fTtcblxuXHRcdGNvbnN0IHVzZXJDYWNoZSA9IHt9O1xuXG5cdFx0Y29uc3QgZ2V0VXNlcm5hbWUgPSAodWlkKSA9PiB7XG5cdFx0XHRpZiAoIXVzZXJDYWNoZS5oYXNPd25Qcm9wZXJ0eSh1aWQpKSB7XG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dXNlckNhY2hlW3VpZF0gPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kQnlJZCh1aWQpLmZldGNoKClbMF0udXNlcm5hbWU7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHR1c2VyQ2FjaGVbdWlkXSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHVzZXJDYWNoZVt1aWRdO1xuXHRcdH07XG5cblx0XHRjb25zdCB1aWQgPSBNZXRlb3IudXNlcklkKCk7XG5cdFx0Ly8gZ2V0IHN1YnNjcmlwdGlvbiBmb3IgbWVzc2FnZVxuXHRcdGlmIChyZXN1bHQubWVzc2FnZSkge1xuXHRcdFx0cmVzdWx0Lm1lc3NhZ2UuZG9jcy5mb3JFYWNoKChtc2cpID0+IHtcblxuXHRcdFx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBnZXRTdWJzY3JpcHRpb24obXNnLnJpZCwgdWlkKTtcblxuXHRcdFx0XHRpZiAoc3Vic2NyaXB0aW9uKSB7XG5cdFx0XHRcdFx0bXNnLnIgPSB7IG5hbWU6IHN1YnNjcmlwdGlvbi5uYW1lLCB0OiBzdWJzY3JpcHRpb24udCB9O1xuXHRcdFx0XHRcdG1zZy51c2VybmFtZSA9IGdldFVzZXJuYW1lKG1zZy51c2VyKTtcblx0XHRcdFx0XHRtc2cudmFsaWQgPSB0cnVlO1xuXHRcdFx0XHRcdFNlYXJjaExvZ2dlci5kZWJ1ZyhgdXNlciAkeyB1aWQgfSBjYW4gYWNjZXNzICR7IG1zZy5yaWQgfSAoICR7IHN1YnNjcmlwdGlvbi50ID09PSAnZCcgPyBzdWJzY3JpcHRpb24udXNlcm5hbWUgOiBzdWJzY3JpcHRpb24ubmFtZSB9IClgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRTZWFyY2hMb2dnZXIuZGVidWcoYHVzZXIgJHsgdWlkIH0gY2FuIE5PVCBhY2Nlc3MgJHsgbXNnLnJpZCB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXN1bHQubWVzc2FnZS5kb2NzLmZpbHRlcigobXNnKSA9PiBtc2cudmFsaWQpO1xuXHRcdH1cblxuXHRcdGlmIChyZXN1bHQucm9vbSkge1xuXHRcdFx0cmVzdWx0LnJvb20uZG9jcy5mb3JFYWNoKChyb29tKSA9PiB7XG5cdFx0XHRcdGNvbnN0IHN1YnNjcmlwdGlvbiA9IGdldFN1YnNjcmlwdGlvbihyb29tLl9pZCwgdWlkKTtcblx0XHRcdFx0aWYgKHN1YnNjcmlwdGlvbikge1xuXHRcdFx0XHRcdHJvb20udmFsaWQgPSB0cnVlO1xuXHRcdFx0XHRcdFNlYXJjaExvZ2dlci5kZWJ1ZyhgdXNlciAkeyB1aWQgfSBjYW4gYWNjZXNzICR7IHJvb20uX2lkIH0gKCAkeyBzdWJzY3JpcHRpb24udCA9PT0gJ2QnID8gc3Vic2NyaXB0aW9uLnVzZXJuYW1lIDogc3Vic2NyaXB0aW9uLm5hbWUgfSApYCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0U2VhcmNoTG9nZ2VyLmRlYnVnKGB1c2VyICR7IHVpZCB9IGNhbiBOT1QgYWNjZXNzICR7IHJvb20uX2lkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJlc3VsdC5yb29tLmRvY3MuZmlsdGVyKChyb29tKSA9PiByb29tLnZhbGlkKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG59XG5cbmV4cG9ydCBjb25zdCB2YWxpZGF0aW9uU2VydmljZSA9IG5ldyBWYWxpZGF0aW9uU2VydmljZSgpO1xuIl19
