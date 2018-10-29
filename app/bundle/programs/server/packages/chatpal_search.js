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
var Inject = Package['meteorhacks:inject-initial'].Inject;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var date;

var require = meteorInstall({"node_modules":{"meteor":{"chatpal:search":{"server":{"provider":{"provider.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/chatpal_search/server/provider/provider.js                                                            //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
let searchProviderService, SearchProvider;
module.watch(require("meteor/rocketchat:search"), {
  searchProviderService(v) {
    searchProviderService = v;
  },

  SearchProvider(v) {
    SearchProvider = v;
  }

}, 0);
let Index;
module.watch(require("./index"), {
  default(v) {
    Index = v;
  }

}, 1);
let ChatpalLogger;
module.watch(require("../utils/logger"), {
  default(v) {
    ChatpalLogger = v;
  }

}, 2);

/**
 * The chatpal search provider enables chatpal search. An appropriate backedn has to be specified by settings.
 */
class ChatpalProvider extends SearchProvider {
  /**
   * Create chatpal provider with some settings for backend and ui
   */
  constructor() {
    super('chatpalProvider');
    this.chatpalBaseUrl = 'https://beta.chatpal.io/v1';

    this._settings.add('Backend', 'select', 'cloud', {
      values: [{
        key: 'cloud',
        i18nLabel: 'Cloud Service'
      }, {
        key: 'onsite',
        i18nLabel: 'On-Site'
      }],
      i18nLabel: 'Chatpal_Backend',
      i18nDescription: 'Chatpal_Backend_Description'
    });

    this._settings.add('API_Key', 'string', '', {
      enableQuery: [{
        _id: 'Search.chatpalProvider.Backend',
        value: 'cloud'
      }],
      i18nLabel: 'Chatpal_API_Key',
      i18nDescription: 'Chatpal_API_Key_Description'
    });

    this._settings.add('Base_URL', 'string', '', {
      enableQuery: [{
        _id: 'Search.chatpalProvider.Backend',
        value: 'onsite'
      }],
      i18nLabel: 'Chatpal_Base_URL',
      i18nDescription: 'Chatpal_Base_URL_Description'
    });

    this._settings.add('HTTP_Headers', 'string', '', {
      enableQuery: [{
        _id: 'Search.chatpalProvider.Backend',
        value: 'onsite'
      }],
      multiline: true,
      i18nLabel: 'Chatpal_HTTP_Headers',
      i18nDescription: 'Chatpal_HTTP_Headers_Description'
    });

    this._settings.add('Main_Language', 'select', 'en', {
      values: [{
        key: 'en',
        i18nLabel: 'English'
      }, {
        key: 'none',
        i18nLabel: 'Language_Not_set'
      }, {
        key: 'cs',
        i18nLabel: 'Czech'
      }, {
        key: 'de',
        i18nLabel: 'Deutsch'
      }, {
        key: 'el',
        i18nLabel: 'Greek'
      }, {
        key: 'es',
        i18nLabel: 'Spanish'
      }, {
        key: 'fi',
        i18nLabel: 'Finish'
      }, {
        key: 'fr',
        i18nLabel: 'French'
      }, {
        key: 'hu',
        i18nLabel: 'Hungarian'
      }, {
        key: 'it',
        i18nLabel: 'Italian'
      }, {
        key: 'nl',
        i18nLabel: 'Dutsch'
      }, {
        key: 'pl',
        i18nLabel: 'Polish'
      }, {
        key: 'pt',
        i18nLabel: 'Portuguese'
      }, {
        key: 'pt_BR',
        i18nLabel: 'Brasilian'
      }, {
        key: 'ro',
        i18nLabel: 'Romanian'
      }, {
        key: 'ru',
        i18nLabel: 'Russian'
      }, {
        key: 'sv',
        i18nLabel: 'Swedisch'
      }, {
        key: 'tr',
        i18nLabel: 'Turkish'
      }, {
        key: 'uk',
        i18nLabel: 'Ukrainian'
      }],
      i18nLabel: 'Chatpal_Main_Language',
      i18nDescription: 'Chatpal_Main_Language_Description'
    });

    this._settings.add('DefaultResultType', 'select', 'All', {
      values: [{
        key: 'All',
        i18nLabel: 'All'
      }, {
        key: 'Messages',
        i18nLabel: 'Messages'
      }],
      i18nLabel: 'Chatpal_Default_Result_Type',
      i18nDescription: 'Chatpal_Default_Result_Type_Description'
    });

    this._settings.add('PageSize', 'int', 15, {
      i18nLabel: 'Search_Page_Size'
    });

    this._settings.add('SuggestionEnabled', 'boolean', true, {
      i18nLabel: 'Chatpal_Suggestion_Enabled',
      alert: 'This feature is currently in beta and will be extended in the future'
    });

    this._settings.add('BatchSize', 'int', 100, {
      i18nLabel: 'Chatpal_Batch_Size',
      i18nDescription: 'Chatpal_Batch_Size_Description'
    });

    this._settings.add('TimeoutSize', 'int', 5000, {
      i18nLabel: 'Chatpal_Timeout_Size',
      i18nDescription: 'Chatpal_Timeout_Size_Description'
    });

    this._settings.add('WindowSize', 'int', 48, {
      i18nLabel: 'Chatpal_Window_Size',
      i18nDescription: 'Chatpal_Window_Size_Description'
    });
  }

  get i18nLabel() {
    return 'Chatpal Provider';
  }

  get iconName() {
    return 'chatpal-logo-icon-darkblue';
  }

  get resultTemplate() {
    return 'ChatpalSearchResultTemplate';
  }

  get suggestionItemTemplate() {
    return 'ChatpalSuggestionItemTemplate';
  }

  get supportsSuggestions() {
    return this._settings.get('SuggestionEnabled');
  }
  /**
   * indexing for messages, rooms and users
   * @inheritDoc
   */


  on(name, value, payload) {
    if (!this.index) {
      this.indexFail = true;
      return false;
    }

    switch (name) {
      case 'message.save':
        return this.index.indexDoc('message', payload);

      case 'user.save':
        return this.index.indexDoc('user', payload);

      case 'room.save':
        return this.index.indexDoc('room', payload);

      case 'message.delete':
        return this.index.removeDoc('message', value);

      case 'user.delete':
        return this.index.removeDoc('user', value);

      case 'room.delete':
        return this.index.removeDoc('room', value);
    }

    return true;
  }
  /**
   * Check if the index has to be deleted and completely new reindexed
   * @param reason the reason for the provider start
   * @returns {boolean}
   * @private
   */


  _checkForClear(reason) {
    if (reason === 'startup') {
      return false;
    }

    if (reason === 'switch') {
      return true;
    }

    return this._indexConfig.backendtype !== this._settings.get('Backend') || this._indexConfig.backendtype === 'onsite' && this._indexConfig.baseurl !== (this._settings.get('Base_URL').endsWith('/') ? this._settings.get('Base_URL').slice(0, -1) : this._settings.get('Base_URL')) || this._indexConfig.backendtype === 'cloud' && this._indexConfig.httpOptions.headers['X-Api-Key'] !== this._settings.get('API_Key') || this._indexConfig.language !== this._settings.get('Main_Language');
  }
  /**
   * parse string to object that can be used as header for HTTP calls
   * @returns {{}}
   * @private
   */


  _parseHeaders() {
    const headers = {};

    const sh = this._settings.get('HTTP_Headers').split('\n');

    sh.forEach(function (d) {
      const ds = d.split(':');

      if (ds.length === 2 && ds[0].trim() !== '') {
        headers[ds[0]] = ds[1];
      }
    });
    return headers;
  }
  /**
   * ping if configuration has been set correctly
   * @param config
   * @param resolve if ping was successfull
   * @param reject if some error occurs
   * @param timeout until ping is repeated
   * @private
   */


  _ping(config, resolve, reject, timeout = 5000) {
    const maxTimeout = 200000;
    const stats = Index.ping(config);

    if (stats) {
      ChatpalLogger.debug('ping was successfull');
      resolve({
        config,
        stats
      });
    } else {
      ChatpalLogger.warn(`ping failed, retry in ${timeout} ms`);
      this._pingTimeout = Meteor.setTimeout(() => {
        this._ping(config, resolve, reject, Math.min(maxTimeout, 2 * timeout));
      }, timeout);
    }
  }
  /**
   * Get index config based on settings
   * @param callback
   * @private
   */


  _getIndexConfig() {
    return new Promise((resolve, reject) => {
      const config = {
        backendtype: this._settings.get('Backend')
      };

      if (this._settings.get('Backend') === 'cloud') {
        config.baseurl = this.chatpalBaseUrl;
        config.language = this._settings.get('Main_Language');
        config.searchpath = '/search/search';
        config.updatepath = '/search/update';
        config.pingpath = '/search/ping';
        config.clearpath = '/search/clear';
        config.suggestionpath = '/search/suggest';
        config.httpOptions = {
          headers: {
            'X-Api-Key': this._settings.get('API_Key')
          }
        };
      } else {
        config.baseurl = this._settings.get('Base_URL').endsWith('/') ? this._settings.get('Base_URL').slice(0, -1) : this._settings.get('Base_URL');
        config.language = this._settings.get('Main_Language');
        config.searchpath = '/chatpal/search';
        config.updatepath = '/chatpal/update';
        config.pingpath = '/chatpal/ping';
        config.clearpath = '/chatpal/clear';
        config.suggestionpath = '/chatpal/suggest';
        config.httpOptions = {
          headers: this._parseHeaders()
        };
      }

      config.batchSize = this._settings.get('BatchSize');
      config.timeout = this._settings.get('TimeoutSize');
      config.windowSize = this._settings.get('WindowSize');

      this._ping(config, resolve, reject);
    });
  }
  /**
   * @inheritDoc
   * @param callback
   */


  stop(resolve) {
    ChatpalLogger.info('Provider stopped');
    Meteor.clearTimeout(this._pingTimeout);
    this.indexFail = false;
    this.index && this.index.stop();
    resolve();
  }
  /**
   * @inheritDoc
   * @param reason
   * @param resolve
   * @param reject
   */


  start(reason, resolve, reject) {
    const clear = this._checkForClear(reason);

    ChatpalLogger.debug(`clear = ${clear} with reason '${reason}'`);

    this._getIndexConfig().then(server => {
      this._indexConfig = server.config;
      this._stats = server.stats;
      ChatpalLogger.debug('config:', JSON.stringify(this._indexConfig, null, 2));
      ChatpalLogger.debug('stats:', JSON.stringify(this._stats, null, 2));
      this.index = new Index(this._indexConfig, this.indexFail || clear, this._stats.message.oldest || new Date().valueOf());
      resolve();
    }, reject);
  }
  /**
   * returns a list of rooms that are allowed to see by current user
   * @param context
   * @private
   */


  _getAcl(context) {
    return RocketChat.models.Subscriptions.find({
      'u._id': context.uid
    }).fetch().map(room => room.rid);
  }
  /**
   * @inheritDoc
   * @returns {*}
   */


  search(text, context, payload, callback) {
    if (!this.index) {
      return callback({
        msg: 'Chatpal_currently_not_active'
      });
    }

    const type = payload.resultType === 'All' ? ['message', 'user', 'room'] : ['message'];
    this.index.query(text, this._settings.get('Main_Language'), this._getAcl(context), type, payload.start || 0, payload.rows || this._settings.get('PageSize'), callback);
  }
  /**
   * @inheritDoc
   */


  suggest(text, context, payload, callback) {
    if (!this.index) {
      return callback({
        msg: 'Chatpal_currently_not_active'
      });
    }

    const type = payload.resultType === 'All' ? ['message', 'user', 'room'] : ['message'];
    this.index.suggest(text, this._settings.get('Main_Language'), this._getAcl(context), type, callback);
  }

}

searchProviderService.register(new ChatpalProvider());
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/chatpal_search/server/provider/index.js                                                               //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
var _interopRequireDefault = require("@babel/runtime/helpers/builtin/interopRequireDefault");

var _objectSpread2 = _interopRequireDefault(require("@babel/runtime/helpers/builtin/objectSpread"));

module.export({
  default: () => Index
});
let ChatpalLogger;
module.watch(require("../utils/logger"), {
  default(v) {
    ChatpalLogger = v;
  }

}, 0);
let Random;
module.watch(require("meteor/random"), {
  Random(v) {
    Random = v;
  }

}, 1);

/**
 * Enables HTTP functions on Chatpal Backend
 */
class Backend {
  constructor(options) {
    this._options = options;
  }
  /**
   * index a set of Sorl documents
   * @param docs
   * @returns {boolean}
   */


  index(docs) {
    const options = (0, _objectSpread2.default)({
      data: docs,
      params: {
        language: this._options.language
      }
    }, this._options.httpOptions);

    try {
      const response = HTTP.call('POST', `${this._options.baseurl}${this._options.updatepath}`, options);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        ChatpalLogger.debug(`indexed ${docs.length} documents`, JSON.stringify(response.data, null, 2));
      } else {
        throw new Error(response);
      }
    } catch (e) {
      // TODO how to deal with this
      ChatpalLogger.error('indexing failed', JSON.stringify(e, null, 2));
      return false;
    }
  }
  /**
   * remove an entry by type and id
   * @param type
   * @param id
   * @returns {boolean}
   */


  remove(type, id) {
    ChatpalLogger.debug(`Remove ${type}(${id}) from Index`);
    const options = (0, _objectSpread2.default)({
      data: {
        delete: {
          query: `id:${id} AND type:${type}`
        },
        commit: {}
      }
    }, this._options.httpOptions);

    try {
      const response = HTTP.call('POST', this._options.baseurl + this._options.clearpath, options);
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      return false;
    }
  }

  count(type) {
    return this.query({
      type,
      rows: 0,
      text: '*'
    })[type].numFound;
  }
  /**
   * query with params
   * @param params
   * @param callback
   */


  query(params, callback) {
    const options = (0, _objectSpread2.default)({
      params
    }, this._options.httpOptions);
    ChatpalLogger.debug('query: ', JSON.stringify(options, null, 2));

    try {
      if (callback) {
        HTTP.call('POST', this._options.baseurl + this._options.searchpath, options, (err, result) => {
          if (err) {
            return callback(err);
          }

          callback(undefined, result.data);
        });
      } else {
        const response = HTTP.call('POST', this._options.baseurl + this._options.searchpath, options);

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return response.data;
        } else {
          throw new Error(response);
        }
      }
    } catch (e) {
      ChatpalLogger.error('query failed', JSON.stringify(e, null, 2));
      throw e;
    }
  }

  suggest(params, callback) {
    const options = (0, _objectSpread2.default)({
      params
    }, this._options.httpOptions);
    HTTP.call('POST', this._options.baseurl + this._options.suggestionpath, options, (err, result) => {
      if (err) {
        return callback(err);
      }

      try {
        callback(undefined, result.data.suggestion);
      } catch (e) {
        callback(e);
      }
    });
  }

  clear() {
    ChatpalLogger.debug('Clear Index');
    const options = (0, _objectSpread2.default)({
      data: {
        delete: {
          query: '*:*'
        },
        commit: {}
      }
    }, this._options.httpOptions);

    try {
      const response = HTTP.call('POST', this._options.baseurl + this._options.clearpath, options);
      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      return false;
    }
  }
  /**
   * statically ping with configuration
   * @param options
   * @returns {boolean}
   */


  static ping(config) {
    const options = (0, _objectSpread2.default)({
      params: {
        stats: true
      }
    }, config.httpOptions);

    try {
      const response = HTTP.call('GET', config.baseurl + config.pingpath, options);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.data.stats;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

}
/**
 * Enabled batch indexing
 */


class BatchIndexer {
  constructor(size, func, ...rest) {
    this._size = size;
    this._func = func;
    this._rest = rest;
    this._values = [];
  }

  add(value) {
    this._values.push(value);

    if (this._values.length === this._size) {
      this.flush();
    }
  }

  flush() {
    this._func(this._values, this._rest); // TODO if flush does not work


    this._values = [];
  }

}
/**
 * Provides index functions to chatpal provider
 */


class Index {
  /**
   * Creates Index Stub
   * @param options
   * @param clear if a complete reindex should be done
   */
  constructor(options, clear, date) {
    this._id = Random.id();
    this._backend = new Backend(options);
    this._options = options;
    this._batchIndexer = new BatchIndexer(this._options.batchSize || 100, values => this._backend.index(values));

    this._bootstrap(clear, date);
  }
  /**
   * prepare solr documents
   * @param type
   * @param doc
   * @returns {*}
   * @private
   */


  _getIndexDocument(type, doc) {
    switch (type) {
      case 'message':
        return {
          id: doc._id,
          rid: doc.rid,
          user: doc.u._id,
          created: doc.ts,
          updated: doc._updatedAt,
          text: doc.msg,
          type
        };

      case 'room':
        return {
          id: doc._id,
          rid: doc._id,
          created: doc.createdAt,
          updated: doc.lm ? doc.lm : doc._updatedAt,
          type,
          room_name: doc.name,
          room_announcement: doc.announcement,
          room_description: doc.description,
          room_topic: doc.topic
        };

      case 'user':
        return {
          id: doc._id,
          created: doc.createdAt,
          updated: doc._updatedAt,
          type,
          user_username: doc.username,
          user_name: doc.name,
          user_email: doc.emails && doc.emails.map(e => e.address)
        };

      default:
        throw new Error(`Cannot index type '${type}'`);
    }
  }
  /**
   * return true if there are messages in the databases which has been created before *date*
   * @param date
   * @returns {boolean}
   * @private
   */


  _existsDataOlderThan(date) {
    return RocketChat.models.Messages.model.find({
      ts: {
        $lt: new Date(date)
      },
      t: {
        $exists: false
      }
    }, {
      limit: 1
    }).fetch().length > 0;
  }

  _doesRoomCountDiffer() {
    return RocketChat.models.Rooms.find({
      t: {
        $ne: 'd'
      }
    }).count() !== this._backend.count('room');
  }

  _doesUserCountDiffer() {
    return Meteor.users.find({
      active: true
    }).count() !== this._backend.count('user');
  }
  /**
   * Index users by using a database cursor
   */


  _indexUsers() {
    const cursor = Meteor.users.find({
      active: true
    });
    ChatpalLogger.debug(`Start indexing ${cursor.count()} users`);
    cursor.forEach(user => {
      this.indexDoc('user', user, false);
    });
    ChatpalLogger.info(`Users indexed successfully (index-id: ${this._id})`);
  }
  /**
   * Index rooms by database cursor
   * @private
   */


  _indexRooms() {
    const cursor = RocketChat.models.Rooms.find({
      t: {
        $ne: 'd'
      }
    });
    ChatpalLogger.debug(`Start indexing ${cursor.count()} rooms`);
    cursor.forEach(room => {
      this.indexDoc('room', room, false);
    });
    ChatpalLogger.info(`Rooms indexed successfully (index-id: ${this._id})`);
  }

  _indexMessages(date, gap) {
    const start = new Date(date - gap);
    const end = new Date(date);
    const cursor = RocketChat.models.Messages.model.find({
      ts: {
        $gt: start,
        $lt: end
      },
      t: {
        $exists: false
      }
    });
    ChatpalLogger.debug(`Start indexing ${cursor.count()} messages between ${start.toString()} and ${end.toString()}`);
    cursor.forEach(message => {
      this.indexDoc('message', message, false);
    });
    ChatpalLogger.info(`Messages between ${start.toString()} and ${end.toString()} indexed successfully (index-id: ${this._id})`);
    return start.getTime();
  }

  _run(date, resolve, reject) {
    this._running = true;

    if (this._existsDataOlderThan(date) && !this._break) {
      Meteor.setTimeout(() => {
        date = this._indexMessages(date, (this._options.windowSize || 24) * 3600000);

        this._run(date, resolve, reject);
      }, this._options.timeout || 1000);
    } else if (this._break) {
      ChatpalLogger.info(`stopped bootstrap (index-id: ${this._id})`);

      this._batchIndexer.flush();

      this._running = false;
      resolve();
    } else {
      ChatpalLogger.info(`No messages older than already indexed date ${new Date(date).toString()}`);

      if (this._doesUserCountDiffer() && !this._break) {
        this._indexUsers();
      } else {
        ChatpalLogger.info('Users already indexed');
      }

      if (this._doesRoomCountDiffer() && !this._break) {
        this._indexRooms();
      } else {
        ChatpalLogger.info('Rooms already indexed');
      }

      this._batchIndexer.flush();

      ChatpalLogger.info(`finished bootstrap (index-id: ${this._id})`);
      this._running = false;
      resolve();
    }
  }

  _bootstrap(clear, date) {
    ChatpalLogger.info('Start bootstrapping');
    return new Promise((resolve, reject) => {
      if (clear) {
        this._backend.clear();

        date = new Date().getTime();
      }

      this._run(date, resolve, reject);
    });
  }

  static ping(options) {
    return Backend.ping(options);
  }

  stop() {
    this._break = true;
  }

  reindex() {
    if (!this._running) {
      this._bootstrap(true);
    }
  }

  indexDoc(type, doc, flush = true) {
    this._batchIndexer.add(this._getIndexDocument(type, doc));

    if (flush) {
      this._batchIndexer.flush();
    }

    return true;
  }

  removeDoc(type, id) {
    return this._backend.remove(type, id);
  }

  query(text, language, acl, type, start, rows, callback, params = {}) {
    this._backend.query((0, _objectSpread2.default)({
      text,
      language,
      acl,
      type,
      start,
      rows
    }, params), callback);
  }

  suggest(text, language, acl, type, callback) {
    this._backend.suggest({
      text,
      language,
      acl,
      type
    }, callback);
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"utils":{"logger.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/chatpal_search/server/utils/logger.js                                                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
const ChatpalLogger = new Logger('Chatpal Logger', {});
module.exportDefault(ChatpalLogger);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"utils.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/chatpal_search/server/utils/utils.js                                                                  //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
Meteor.methods({
  'chatpalUtilsCreateKey'(email) {
    try {
      const response = HTTP.call('POST', 'https://beta.chatpal.io/v1/account', {
        data: {
          email,
          tier: 'free'
        }
      });

      if (response.statusCode === 201) {
        return response.data.key;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  },

  'chatpalUtilsGetTaC'(lang) {
    try {
      const response = HTTP.call('GET', `https://beta.chatpal.io/v1/terms/${lang}.html`);

      if (response.statusCode === 200) {
        return response.content;
      } else {
        return undefined;
      }
    } catch (e) {
      return false;
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"asset":{"config.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                //
// packages/chatpal_search/server/asset/config.js                                                                 //
//                                                                                                                //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                  //
/* globals Inject */
Inject.rawBody('chatpal-enter', Assets.getText('server/asset/chatpal-enter.svg'));
Inject.rawBody('chatpal-logo-icon-darkblue', Assets.getText('server/asset/chatpal-logo-icon-darkblue.svg'));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/chatpal:search/server/provider/provider.js");
require("/node_modules/meteor/chatpal:search/server/provider/index.js");
require("/node_modules/meteor/chatpal:search/server/utils/logger.js");
require("/node_modules/meteor/chatpal:search/server/utils/utils.js");
require("/node_modules/meteor/chatpal:search/server/asset/config.js");

/* Exports */
Package._define("chatpal:search");

})();

//# sourceURL=meteor://💻app/packages/chatpal_search.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2hhdHBhbDpzZWFyY2gvc2VydmVyL3Byb3ZpZGVyL3Byb3ZpZGVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9jaGF0cGFsOnNlYXJjaC9zZXJ2ZXIvcHJvdmlkZXIvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2NoYXRwYWw6c2VhcmNoL3NlcnZlci91dGlscy9sb2dnZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2NoYXRwYWw6c2VhcmNoL3NlcnZlci91dGlscy91dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvY2hhdHBhbDpzZWFyY2gvc2VydmVyL2Fzc2V0L2NvbmZpZy5qcyJdLCJuYW1lcyI6WyJzZWFyY2hQcm92aWRlclNlcnZpY2UiLCJTZWFyY2hQcm92aWRlciIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsInYiLCJJbmRleCIsImRlZmF1bHQiLCJDaGF0cGFsTG9nZ2VyIiwiQ2hhdHBhbFByb3ZpZGVyIiwiY29uc3RydWN0b3IiLCJjaGF0cGFsQmFzZVVybCIsIl9zZXR0aW5ncyIsImFkZCIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImkxOG5EZXNjcmlwdGlvbiIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwidmFsdWUiLCJtdWx0aWxpbmUiLCJhbGVydCIsImljb25OYW1lIiwicmVzdWx0VGVtcGxhdGUiLCJzdWdnZXN0aW9uSXRlbVRlbXBsYXRlIiwic3VwcG9ydHNTdWdnZXN0aW9ucyIsImdldCIsIm9uIiwibmFtZSIsInBheWxvYWQiLCJpbmRleCIsImluZGV4RmFpbCIsImluZGV4RG9jIiwicmVtb3ZlRG9jIiwiX2NoZWNrRm9yQ2xlYXIiLCJyZWFzb24iLCJfaW5kZXhDb25maWciLCJiYWNrZW5kdHlwZSIsImJhc2V1cmwiLCJlbmRzV2l0aCIsInNsaWNlIiwiaHR0cE9wdGlvbnMiLCJoZWFkZXJzIiwibGFuZ3VhZ2UiLCJfcGFyc2VIZWFkZXJzIiwic2giLCJzcGxpdCIsImZvckVhY2giLCJkIiwiZHMiLCJsZW5ndGgiLCJ0cmltIiwiX3BpbmciLCJjb25maWciLCJyZXNvbHZlIiwicmVqZWN0IiwidGltZW91dCIsIm1heFRpbWVvdXQiLCJzdGF0cyIsInBpbmciLCJkZWJ1ZyIsIndhcm4iLCJfcGluZ1RpbWVvdXQiLCJNZXRlb3IiLCJzZXRUaW1lb3V0IiwiTWF0aCIsIm1pbiIsIl9nZXRJbmRleENvbmZpZyIsIlByb21pc2UiLCJzZWFyY2hwYXRoIiwidXBkYXRlcGF0aCIsInBpbmdwYXRoIiwiY2xlYXJwYXRoIiwic3VnZ2VzdGlvbnBhdGgiLCJiYXRjaFNpemUiLCJ3aW5kb3dTaXplIiwic3RvcCIsImluZm8iLCJjbGVhclRpbWVvdXQiLCJzdGFydCIsImNsZWFyIiwidGhlbiIsInNlcnZlciIsIl9zdGF0cyIsIkpTT04iLCJzdHJpbmdpZnkiLCJtZXNzYWdlIiwib2xkZXN0IiwiRGF0ZSIsInZhbHVlT2YiLCJfZ2V0QWNsIiwiY29udGV4dCIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJTdWJzY3JpcHRpb25zIiwiZmluZCIsInVpZCIsImZldGNoIiwibWFwIiwicm9vbSIsInJpZCIsInNlYXJjaCIsInRleHQiLCJjYWxsYmFjayIsIm1zZyIsInR5cGUiLCJyZXN1bHRUeXBlIiwicXVlcnkiLCJyb3dzIiwic3VnZ2VzdCIsInJlZ2lzdGVyIiwiZXhwb3J0IiwiUmFuZG9tIiwiQmFja2VuZCIsIm9wdGlvbnMiLCJfb3B0aW9ucyIsImRvY3MiLCJkYXRhIiwicGFyYW1zIiwicmVzcG9uc2UiLCJIVFRQIiwiY2FsbCIsInN0YXR1c0NvZGUiLCJFcnJvciIsImUiLCJlcnJvciIsInJlbW92ZSIsImlkIiwiZGVsZXRlIiwiY29tbWl0IiwiY291bnQiLCJudW1Gb3VuZCIsImVyciIsInJlc3VsdCIsInVuZGVmaW5lZCIsInN1Z2dlc3Rpb24iLCJCYXRjaEluZGV4ZXIiLCJzaXplIiwiZnVuYyIsInJlc3QiLCJfc2l6ZSIsIl9mdW5jIiwiX3Jlc3QiLCJfdmFsdWVzIiwicHVzaCIsImZsdXNoIiwiZGF0ZSIsIl9iYWNrZW5kIiwiX2JhdGNoSW5kZXhlciIsIl9ib290c3RyYXAiLCJfZ2V0SW5kZXhEb2N1bWVudCIsImRvYyIsInVzZXIiLCJ1IiwiY3JlYXRlZCIsInRzIiwidXBkYXRlZCIsIl91cGRhdGVkQXQiLCJjcmVhdGVkQXQiLCJsbSIsInJvb21fbmFtZSIsInJvb21fYW5ub3VuY2VtZW50IiwiYW5ub3VuY2VtZW50Iiwicm9vbV9kZXNjcmlwdGlvbiIsImRlc2NyaXB0aW9uIiwicm9vbV90b3BpYyIsInRvcGljIiwidXNlcl91c2VybmFtZSIsInVzZXJuYW1lIiwidXNlcl9uYW1lIiwidXNlcl9lbWFpbCIsImVtYWlscyIsImFkZHJlc3MiLCJfZXhpc3RzRGF0YU9sZGVyVGhhbiIsIk1lc3NhZ2VzIiwibW9kZWwiLCIkbHQiLCJ0IiwiJGV4aXN0cyIsImxpbWl0IiwiX2RvZXNSb29tQ291bnREaWZmZXIiLCJSb29tcyIsIiRuZSIsIl9kb2VzVXNlckNvdW50RGlmZmVyIiwidXNlcnMiLCJhY3RpdmUiLCJfaW5kZXhVc2VycyIsImN1cnNvciIsIl9pbmRleFJvb21zIiwiX2luZGV4TWVzc2FnZXMiLCJnYXAiLCJlbmQiLCIkZ3QiLCJ0b1N0cmluZyIsImdldFRpbWUiLCJfcnVuIiwiX3J1bm5pbmciLCJfYnJlYWsiLCJyZWluZGV4IiwiYWNsIiwiTG9nZ2VyIiwiZXhwb3J0RGVmYXVsdCIsIm1ldGhvZHMiLCJlbWFpbCIsInRpZXIiLCJsYW5nIiwiY29udGVudCIsIkluamVjdCIsInJhd0JvZHkiLCJBc3NldHMiLCJnZXRUZXh0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxxQkFBSixFQUEwQkMsY0FBMUI7QUFBeUNDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSwwQkFBUixDQUFiLEVBQWlEO0FBQUNKLHdCQUFzQkssQ0FBdEIsRUFBd0I7QUFBQ0wsNEJBQXNCSyxD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cGFsX3NlYXJjaC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNlYXJjaFByb3ZpZGVyU2VydmljZSwgU2VhcmNoUHJvdmlkZXIgfSBmcm9tICdtZXRlb3Ivcm9ja2V0Y2hhdDpzZWFyY2gnO1xuaW1wb3J0IEluZGV4IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IENoYXRwYWxMb2dnZXIgZnJvbSAnLi4vdXRpbHMvbG9nZ2VyJztcblxuLyoqXG4gKiBUaGUgY2hhdHBhbCBzZWFyY2ggcHJvdmlkZXIgZW5hYmxlcyBjaGF0cGFsIHNlYXJjaC4gQW4gYXBwcm9wcmlhdGUgYmFja2VkbiBoYXMgdG8gYmUgc3BlY2lmaWVkIGJ5IHNldHRpbmdzLlxuICovXG5jbGFzcyBDaGF0cGFsUHJvdmlkZXIgZXh0ZW5kcyBTZWFyY2hQcm92aWRlciB7XG5cblx0LyoqXG5cdCAqIENyZWF0ZSBjaGF0cGFsIHByb3ZpZGVyIHdpdGggc29tZSBzZXR0aW5ncyBmb3IgYmFja2VuZCBhbmQgdWlcblx0ICovXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdjaGF0cGFsUHJvdmlkZXInKTtcblxuXHRcdHRoaXMuY2hhdHBhbEJhc2VVcmwgPSAnaHR0cHM6Ly9iZXRhLmNoYXRwYWwuaW8vdjEnO1xuXG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdCYWNrZW5kJywgJ3NlbGVjdCcsICdjbG91ZCcsIHtcblx0XHRcdHZhbHVlczpbXG5cdFx0XHRcdHsga2V5OiAnY2xvdWQnLCBpMThuTGFiZWw6ICdDbG91ZCBTZXJ2aWNlJyB9LFxuXHRcdFx0XHR7IGtleTogJ29uc2l0ZScsIGkxOG5MYWJlbDogJ09uLVNpdGUnIH0sXG5cdFx0XHRdLFxuXHRcdFx0aTE4bkxhYmVsOiAnQ2hhdHBhbF9CYWNrZW5kJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfQmFja2VuZF9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdBUElfS2V5JywgJ3N0cmluZycsICcnLCB7XG5cdFx0XHRlbmFibGVRdWVyeTpbe1xuXHRcdFx0XHRfaWQ6ICdTZWFyY2guY2hhdHBhbFByb3ZpZGVyLkJhY2tlbmQnLFxuXHRcdFx0XHR2YWx1ZTogJ2Nsb3VkJyxcblx0XHRcdH1dLFxuXHRcdFx0aTE4bkxhYmVsOiAnQ2hhdHBhbF9BUElfS2V5Jyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfQVBJX0tleV9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdCYXNlX1VSTCcsICdzdHJpbmcnLCAnJywge1xuXHRcdFx0ZW5hYmxlUXVlcnk6W3tcblx0XHRcdFx0X2lkOiAnU2VhcmNoLmNoYXRwYWxQcm92aWRlci5CYWNrZW5kJyxcblx0XHRcdFx0dmFsdWU6ICdvbnNpdGUnLFxuXHRcdFx0fV0sXG5cdFx0XHRpMThuTGFiZWw6ICdDaGF0cGFsX0Jhc2VfVVJMJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfQmFzZV9VUkxfRGVzY3JpcHRpb24nLFxuXHRcdH0pO1xuXHRcdHRoaXMuX3NldHRpbmdzLmFkZCgnSFRUUF9IZWFkZXJzJywgJ3N0cmluZycsICcnLCB7XG5cdFx0XHRlbmFibGVRdWVyeTpbe1xuXHRcdFx0XHRfaWQ6ICdTZWFyY2guY2hhdHBhbFByb3ZpZGVyLkJhY2tlbmQnLFxuXHRcdFx0XHR2YWx1ZTogJ29uc2l0ZScsXG5cdFx0XHR9XSxcblx0XHRcdG11bHRpbGluZTogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ0NoYXRwYWxfSFRUUF9IZWFkZXJzJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfSFRUUF9IZWFkZXJzX0Rlc2NyaXB0aW9uJyxcblx0XHR9KTtcblx0XHR0aGlzLl9zZXR0aW5ncy5hZGQoJ01haW5fTGFuZ3VhZ2UnLCAnc2VsZWN0JywgJ2VuJywge1xuXHRcdFx0dmFsdWVzOiBbXG5cdFx0XHRcdHsga2V5OiAnZW4nLCBpMThuTGFiZWw6ICdFbmdsaXNoJyB9LFxuXHRcdFx0XHR7IGtleTogJ25vbmUnLCBpMThuTGFiZWw6ICdMYW5ndWFnZV9Ob3Rfc2V0JyB9LFxuXHRcdFx0XHR7IGtleTogJ2NzJywgaTE4bkxhYmVsOiAnQ3plY2gnIH0sXG5cdFx0XHRcdHsga2V5OiAnZGUnLCBpMThuTGFiZWw6ICdEZXV0c2NoJyB9LFxuXHRcdFx0XHR7IGtleTogJ2VsJywgaTE4bkxhYmVsOiAnR3JlZWsnIH0sXG5cdFx0XHRcdHsga2V5OiAnZXMnLCBpMThuTGFiZWw6ICdTcGFuaXNoJyB9LFxuXHRcdFx0XHR7IGtleTogJ2ZpJywgaTE4bkxhYmVsOiAnRmluaXNoJyB9LFxuXHRcdFx0XHR7IGtleTogJ2ZyJywgaTE4bkxhYmVsOiAnRnJlbmNoJyB9LFxuXHRcdFx0XHR7IGtleTogJ2h1JywgaTE4bkxhYmVsOiAnSHVuZ2FyaWFuJyB9LFxuXHRcdFx0XHR7IGtleTogJ2l0JywgaTE4bkxhYmVsOiAnSXRhbGlhbicgfSxcblx0XHRcdFx0eyBrZXk6ICdubCcsIGkxOG5MYWJlbDogJ0R1dHNjaCcgfSxcblx0XHRcdFx0eyBrZXk6ICdwbCcsIGkxOG5MYWJlbDogJ1BvbGlzaCcgfSxcblx0XHRcdFx0eyBrZXk6ICdwdCcsIGkxOG5MYWJlbDogJ1BvcnR1Z3Vlc2UnIH0sXG5cdFx0XHRcdHsga2V5OiAncHRfQlInLCBpMThuTGFiZWw6ICdCcmFzaWxpYW4nIH0sXG5cdFx0XHRcdHsga2V5OiAncm8nLCBpMThuTGFiZWw6ICdSb21hbmlhbicgfSxcblx0XHRcdFx0eyBrZXk6ICdydScsIGkxOG5MYWJlbDogJ1J1c3NpYW4nIH0sXG5cdFx0XHRcdHsga2V5OiAnc3YnLCBpMThuTGFiZWw6ICdTd2VkaXNjaCcgfSxcblx0XHRcdFx0eyBrZXk6ICd0cicsIGkxOG5MYWJlbDogJ1R1cmtpc2gnIH0sXG5cdFx0XHRcdHsga2V5OiAndWsnLCBpMThuTGFiZWw6ICdVa3JhaW5pYW4nIH0sXG5cdFx0XHRdLFxuXHRcdFx0aTE4bkxhYmVsOiAnQ2hhdHBhbF9NYWluX0xhbmd1YWdlJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfTWFpbl9MYW5ndWFnZV9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdEZWZhdWx0UmVzdWx0VHlwZScsICdzZWxlY3QnLCAnQWxsJywge1xuXHRcdFx0dmFsdWVzOiBbXG5cdFx0XHRcdHsga2V5OiAnQWxsJywgaTE4bkxhYmVsOiAnQWxsJyB9LFxuXHRcdFx0XHR7IGtleTogJ01lc3NhZ2VzJywgaTE4bkxhYmVsOiAnTWVzc2FnZXMnIH0sXG5cdFx0XHRdLFxuXHRcdFx0aTE4bkxhYmVsOiAnQ2hhdHBhbF9EZWZhdWx0X1Jlc3VsdF9UeXBlJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfRGVmYXVsdF9SZXN1bHRfVHlwZV9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdQYWdlU2l6ZScsICdpbnQnLCAxNSwge1xuXHRcdFx0aTE4bkxhYmVsOiAnU2VhcmNoX1BhZ2VfU2l6ZScsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdTdWdnZXN0aW9uRW5hYmxlZCcsICdib29sZWFuJywgdHJ1ZSwge1xuXHRcdFx0aTE4bkxhYmVsOiAnQ2hhdHBhbF9TdWdnZXN0aW9uX0VuYWJsZWQnLFxuXHRcdFx0YWxlcnQ6ICdUaGlzIGZlYXR1cmUgaXMgY3VycmVudGx5IGluIGJldGEgYW5kIHdpbGwgYmUgZXh0ZW5kZWQgaW4gdGhlIGZ1dHVyZScsXG5cdFx0fSk7XG5cdFx0dGhpcy5fc2V0dGluZ3MuYWRkKCdCYXRjaFNpemUnLCAnaW50JywgMTAwLCB7XG5cdFx0XHRpMThuTGFiZWw6ICdDaGF0cGFsX0JhdGNoX1NpemUnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnQ2hhdHBhbF9CYXRjaF9TaXplX0Rlc2NyaXB0aW9uJyxcblx0XHR9KTtcblx0XHR0aGlzLl9zZXR0aW5ncy5hZGQoJ1RpbWVvdXRTaXplJywgJ2ludCcsIDUwMDAsIHtcblx0XHRcdGkxOG5MYWJlbDogJ0NoYXRwYWxfVGltZW91dF9TaXplJyxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0NoYXRwYWxfVGltZW91dF9TaXplX0Rlc2NyaXB0aW9uJyxcblx0XHR9KTtcblx0XHR0aGlzLl9zZXR0aW5ncy5hZGQoJ1dpbmRvd1NpemUnLCAnaW50JywgNDgsIHtcblx0XHRcdGkxOG5MYWJlbDogJ0NoYXRwYWxfV2luZG93X1NpemUnLFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnQ2hhdHBhbF9XaW5kb3dfU2l6ZV9EZXNjcmlwdGlvbicsXG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgaTE4bkxhYmVsKCkge1xuXHRcdHJldHVybiAnQ2hhdHBhbCBQcm92aWRlcic7XG5cdH1cblxuXHRnZXQgaWNvbk5hbWUoKSB7XG5cdFx0cmV0dXJuICdjaGF0cGFsLWxvZ28taWNvbi1kYXJrYmx1ZSc7XG5cdH1cblxuXHRnZXQgcmVzdWx0VGVtcGxhdGUoKSB7XG5cdFx0cmV0dXJuICdDaGF0cGFsU2VhcmNoUmVzdWx0VGVtcGxhdGUnO1xuXHR9XG5cblx0Z2V0IHN1Z2dlc3Rpb25JdGVtVGVtcGxhdGUoKSB7XG5cdFx0cmV0dXJuICdDaGF0cGFsU3VnZ2VzdGlvbkl0ZW1UZW1wbGF0ZSc7XG5cdH1cblxuXHRnZXQgc3VwcG9ydHNTdWdnZXN0aW9ucygpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2V0dGluZ3MuZ2V0KCdTdWdnZXN0aW9uRW5hYmxlZCcpO1xuXHR9XG5cblx0LyoqXG5cdCAqIGluZGV4aW5nIGZvciBtZXNzYWdlcywgcm9vbXMgYW5kIHVzZXJzXG5cdCAqIEBpbmhlcml0RG9jXG5cdCAqL1xuXHRvbihuYW1lLCB2YWx1ZSwgcGF5bG9hZCkge1xuXG5cdFx0aWYgKCF0aGlzLmluZGV4KSB7XG5cdFx0XHR0aGlzLmluZGV4RmFpbCA9IHRydWU7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0c3dpdGNoIChuYW1lKSB7XG5cdFx0XHRjYXNlICdtZXNzYWdlLnNhdmUnOiByZXR1cm4gdGhpcy5pbmRleC5pbmRleERvYygnbWVzc2FnZScsIHBheWxvYWQpO1xuXHRcdFx0Y2FzZSAndXNlci5zYXZlJzogcmV0dXJuIHRoaXMuaW5kZXguaW5kZXhEb2MoJ3VzZXInLCBwYXlsb2FkKTtcblx0XHRcdGNhc2UgJ3Jvb20uc2F2ZSc6IHJldHVybiB0aGlzLmluZGV4LmluZGV4RG9jKCdyb29tJywgcGF5bG9hZCk7XG5cdFx0XHRjYXNlICdtZXNzYWdlLmRlbGV0ZSc6IHJldHVybiB0aGlzLmluZGV4LnJlbW92ZURvYygnbWVzc2FnZScsIHZhbHVlKTtcblx0XHRcdGNhc2UgJ3VzZXIuZGVsZXRlJzogcmV0dXJuIHRoaXMuaW5kZXgucmVtb3ZlRG9jKCd1c2VyJywgdmFsdWUpO1xuXHRcdFx0Y2FzZSAncm9vbS5kZWxldGUnOiByZXR1cm4gdGhpcy5pbmRleC5yZW1vdmVEb2MoJ3Jvb20nLCB2YWx1ZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgaWYgdGhlIGluZGV4IGhhcyB0byBiZSBkZWxldGVkIGFuZCBjb21wbGV0ZWx5IG5ldyByZWluZGV4ZWRcblx0ICogQHBhcmFtIHJlYXNvbiB0aGUgcmVhc29uIGZvciB0aGUgcHJvdmlkZXIgc3RhcnRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfY2hlY2tGb3JDbGVhcihyZWFzb24pIHtcblxuXHRcdGlmIChyZWFzb24gPT09ICdzdGFydHVwJykgeyByZXR1cm4gZmFsc2U7IH1cblxuXHRcdGlmIChyZWFzb24gPT09ICdzd2l0Y2gnKSB7IHJldHVybiB0cnVlOyB9XG5cblx0XHRyZXR1cm4gdGhpcy5faW5kZXhDb25maWcuYmFja2VuZHR5cGUgIT09IHRoaXMuX3NldHRpbmdzLmdldCgnQmFja2VuZCcpIHx8XG5cdFx0XHQodGhpcy5faW5kZXhDb25maWcuYmFja2VuZHR5cGUgPT09ICdvbnNpdGUnICYmIHRoaXMuX2luZGV4Q29uZmlnLmJhc2V1cmwgIT09ICh0aGlzLl9zZXR0aW5ncy5nZXQoJ0Jhc2VfVVJMJykuZW5kc1dpdGgoJy8nKSA/IHRoaXMuX3NldHRpbmdzLmdldCgnQmFzZV9VUkwnKS5zbGljZSgwLCAtMSkgOiB0aGlzLl9zZXR0aW5ncy5nZXQoJ0Jhc2VfVVJMJykpKSB8fFxuXHRcdFx0KHRoaXMuX2luZGV4Q29uZmlnLmJhY2tlbmR0eXBlID09PSAnY2xvdWQnICYmIHRoaXMuX2luZGV4Q29uZmlnLmh0dHBPcHRpb25zLmhlYWRlcnNbJ1gtQXBpLUtleSddICE9PSB0aGlzLl9zZXR0aW5ncy5nZXQoJ0FQSV9LZXknKSkgfHxcblx0XHRcdHRoaXMuX2luZGV4Q29uZmlnLmxhbmd1YWdlICE9PSB0aGlzLl9zZXR0aW5ncy5nZXQoJ01haW5fTGFuZ3VhZ2UnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBwYXJzZSBzdHJpbmcgdG8gb2JqZWN0IHRoYXQgY2FuIGJlIHVzZWQgYXMgaGVhZGVyIGZvciBIVFRQIGNhbGxzXG5cdCAqIEByZXR1cm5zIHt7fX1cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9wYXJzZUhlYWRlcnMoKSB7XG5cdFx0Y29uc3QgaGVhZGVycyA9IHt9O1xuXHRcdGNvbnN0IHNoID0gdGhpcy5fc2V0dGluZ3MuZ2V0KCdIVFRQX0hlYWRlcnMnKS5zcGxpdCgnXFxuJyk7XG5cdFx0c2guZm9yRWFjaChmdW5jdGlvbihkKSB7XG5cdFx0XHRjb25zdCBkcyA9IGQuc3BsaXQoJzonKTtcblx0XHRcdGlmIChkcy5sZW5ndGggPT09IDIgJiYgZHNbMF0udHJpbSgpICE9PSAnJykge1xuXHRcdFx0XHRoZWFkZXJzW2RzWzBdXSA9IGRzWzFdO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiBoZWFkZXJzO1xuXHR9XG5cblx0LyoqXG5cdCAqIHBpbmcgaWYgY29uZmlndXJhdGlvbiBoYXMgYmVlbiBzZXQgY29ycmVjdGx5XG5cdCAqIEBwYXJhbSBjb25maWdcblx0ICogQHBhcmFtIHJlc29sdmUgaWYgcGluZyB3YXMgc3VjY2Vzc2Z1bGxcblx0ICogQHBhcmFtIHJlamVjdCBpZiBzb21lIGVycm9yIG9jY3Vyc1xuXHQgKiBAcGFyYW0gdGltZW91dCB1bnRpbCBwaW5nIGlzIHJlcGVhdGVkXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfcGluZyhjb25maWcsIHJlc29sdmUsIHJlamVjdCwgdGltZW91dCA9IDUwMDApIHtcblxuXHRcdGNvbnN0IG1heFRpbWVvdXQgPSAyMDAwMDA7XG5cblx0XHRjb25zdCBzdGF0cyA9IEluZGV4LnBpbmcoY29uZmlnKTtcblxuXHRcdGlmIChzdGF0cykge1xuXHRcdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZygncGluZyB3YXMgc3VjY2Vzc2Z1bGwnKTtcblx0XHRcdHJlc29sdmUoeyBjb25maWcsIHN0YXRzIH0pO1xuXHRcdH0gZWxzZSB7XG5cblx0XHRcdENoYXRwYWxMb2dnZXIud2FybihgcGluZyBmYWlsZWQsIHJldHJ5IGluICR7IHRpbWVvdXQgfSBtc2ApO1xuXG5cdFx0XHR0aGlzLl9waW5nVGltZW91dCA9IE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdFx0dGhpcy5fcGluZyhjb25maWcsIHJlc29sdmUsIHJlamVjdCwgTWF0aC5taW4obWF4VGltZW91dCwgMiAqIHRpbWVvdXQpKTtcblx0XHRcdH0sIHRpbWVvdXQpO1xuXHRcdH1cblxuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBpbmRleCBjb25maWcgYmFzZWQgb24gc2V0dGluZ3Ncblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfZ2V0SW5kZXhDb25maWcoKSB7XG5cblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Y29uc3QgY29uZmlnID0ge1xuXHRcdFx0XHRiYWNrZW5kdHlwZTogdGhpcy5fc2V0dGluZ3MuZ2V0KCdCYWNrZW5kJyksXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAodGhpcy5fc2V0dGluZ3MuZ2V0KCdCYWNrZW5kJykgPT09ICdjbG91ZCcpIHtcblx0XHRcdFx0Y29uZmlnLmJhc2V1cmwgPSB0aGlzLmNoYXRwYWxCYXNlVXJsO1xuXHRcdFx0XHRjb25maWcubGFuZ3VhZ2UgPSB0aGlzLl9zZXR0aW5ncy5nZXQoJ01haW5fTGFuZ3VhZ2UnKTtcblx0XHRcdFx0Y29uZmlnLnNlYXJjaHBhdGggPSAnL3NlYXJjaC9zZWFyY2gnO1xuXHRcdFx0XHRjb25maWcudXBkYXRlcGF0aCA9ICcvc2VhcmNoL3VwZGF0ZSc7XG5cdFx0XHRcdGNvbmZpZy5waW5ncGF0aCA9ICcvc2VhcmNoL3BpbmcnO1xuXHRcdFx0XHRjb25maWcuY2xlYXJwYXRoID0gJy9zZWFyY2gvY2xlYXInO1xuXHRcdFx0XHRjb25maWcuc3VnZ2VzdGlvbnBhdGggPSAnL3NlYXJjaC9zdWdnZXN0Jztcblx0XHRcdFx0Y29uZmlnLmh0dHBPcHRpb25zID0ge1xuXHRcdFx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0XHRcdCdYLUFwaS1LZXknOiB0aGlzLl9zZXR0aW5ncy5nZXQoJ0FQSV9LZXknKSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uZmlnLmJhc2V1cmwgPSB0aGlzLl9zZXR0aW5ncy5nZXQoJ0Jhc2VfVVJMJykuZW5kc1dpdGgoJy8nKSA/IHRoaXMuX3NldHRpbmdzLmdldCgnQmFzZV9VUkwnKS5zbGljZSgwLCAtMSkgOiB0aGlzLl9zZXR0aW5ncy5nZXQoJ0Jhc2VfVVJMJyk7XG5cdFx0XHRcdGNvbmZpZy5sYW5ndWFnZSA9IHRoaXMuX3NldHRpbmdzLmdldCgnTWFpbl9MYW5ndWFnZScpO1xuXHRcdFx0XHRjb25maWcuc2VhcmNocGF0aCA9ICcvY2hhdHBhbC9zZWFyY2gnO1xuXHRcdFx0XHRjb25maWcudXBkYXRlcGF0aCA9ICcvY2hhdHBhbC91cGRhdGUnO1xuXHRcdFx0XHRjb25maWcucGluZ3BhdGggPSAnL2NoYXRwYWwvcGluZyc7XG5cdFx0XHRcdGNvbmZpZy5jbGVhcnBhdGggPSAnL2NoYXRwYWwvY2xlYXInO1xuXHRcdFx0XHRjb25maWcuc3VnZ2VzdGlvbnBhdGggPSAnL2NoYXRwYWwvc3VnZ2VzdCc7XG5cdFx0XHRcdGNvbmZpZy5odHRwT3B0aW9ucyA9IHtcblx0XHRcdFx0XHRoZWFkZXJzOiB0aGlzLl9wYXJzZUhlYWRlcnMoKSxcblx0XHRcdFx0fTtcblx0XHRcdH1cblxuXHRcdFx0Y29uZmlnLmJhdGNoU2l6ZSA9IHRoaXMuX3NldHRpbmdzLmdldCgnQmF0Y2hTaXplJyk7XG5cdFx0XHRjb25maWcudGltZW91dCA9IHRoaXMuX3NldHRpbmdzLmdldCgnVGltZW91dFNpemUnKTtcblx0XHRcdGNvbmZpZy53aW5kb3dTaXplID0gdGhpcy5fc2V0dGluZ3MuZ2V0KCdXaW5kb3dTaXplJyk7XG5cblx0XHRcdHRoaXMuX3BpbmcoY29uZmlnLCByZXNvbHZlLCByZWplY3QpO1xuXHRcdH0pO1xuXG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXREb2Ncblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRzdG9wKHJlc29sdmUpIHtcblx0XHRDaGF0cGFsTG9nZ2VyLmluZm8oJ1Byb3ZpZGVyIHN0b3BwZWQnKTtcblx0XHRNZXRlb3IuY2xlYXJUaW1lb3V0KHRoaXMuX3BpbmdUaW1lb3V0KTtcblx0XHR0aGlzLmluZGV4RmFpbCA9IGZhbHNlO1xuXHRcdHRoaXMuaW5kZXggJiYgdGhpcy5pbmRleC5zdG9wKCk7XG5cdFx0cmVzb2x2ZSgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0RG9jXG5cdCAqIEBwYXJhbSByZWFzb25cblx0ICogQHBhcmFtIHJlc29sdmVcblx0ICogQHBhcmFtIHJlamVjdFxuXHQgKi9cblx0c3RhcnQocmVhc29uLCByZXNvbHZlLCByZWplY3QpIHtcblxuXHRcdGNvbnN0IGNsZWFyID0gdGhpcy5fY2hlY2tGb3JDbGVhcihyZWFzb24pO1xuXG5cdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZyhgY2xlYXIgPSAkeyBjbGVhciB9IHdpdGggcmVhc29uICckeyByZWFzb24gfSdgKTtcblxuXHRcdHRoaXMuX2dldEluZGV4Q29uZmlnKCkudGhlbigoc2VydmVyKSA9PiB7XG5cdFx0XHR0aGlzLl9pbmRleENvbmZpZyA9IHNlcnZlci5jb25maWc7XG5cblx0XHRcdHRoaXMuX3N0YXRzID0gc2VydmVyLnN0YXRzO1xuXG5cdFx0XHRDaGF0cGFsTG9nZ2VyLmRlYnVnKCdjb25maWc6JywgSlNPTi5zdHJpbmdpZnkodGhpcy5faW5kZXhDb25maWcsIG51bGwsIDIpKTtcblx0XHRcdENoYXRwYWxMb2dnZXIuZGVidWcoJ3N0YXRzOicsIEpTT04uc3RyaW5naWZ5KHRoaXMuX3N0YXRzLCBudWxsLCAyKSk7XG5cblx0XHRcdHRoaXMuaW5kZXggPSBuZXcgSW5kZXgodGhpcy5faW5kZXhDb25maWcsIHRoaXMuaW5kZXhGYWlsIHx8IGNsZWFyLCB0aGlzLl9zdGF0cy5tZXNzYWdlLm9sZGVzdCB8fCBuZXcgRGF0ZSgpLnZhbHVlT2YoKSk7XG5cblx0XHRcdHJlc29sdmUoKTtcblx0XHR9LCByZWplY3QpO1xuXHR9XG5cblx0LyoqXG5cdCAqIHJldHVybnMgYSBsaXN0IG9mIHJvb21zIHRoYXQgYXJlIGFsbG93ZWQgdG8gc2VlIGJ5IGN1cnJlbnQgdXNlclxuXHQgKiBAcGFyYW0gY29udGV4dFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0X2dldEFjbChjb250ZXh0KSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZCh7ICd1Ll9pZCc6IGNvbnRleHQudWlkIH0pLmZldGNoKCkubWFwKChyb29tKSA9PiByb29tLnJpZCk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXREb2Ncblx0ICogQHJldHVybnMgeyp9XG5cdCAqL1xuXHRzZWFyY2godGV4dCwgY29udGV4dCwgcGF5bG9hZCwgY2FsbGJhY2spIHtcblxuXHRcdGlmICghdGhpcy5pbmRleCkgeyByZXR1cm4gY2FsbGJhY2soeyBtc2c6J0NoYXRwYWxfY3VycmVudGx5X25vdF9hY3RpdmUnIH0pOyB9XG5cblx0XHRjb25zdCB0eXBlID0gcGF5bG9hZC5yZXN1bHRUeXBlID09PSAnQWxsJyA/IFsnbWVzc2FnZScsICd1c2VyJywgJ3Jvb20nXSA6IFsnbWVzc2FnZSddO1xuXG5cdFx0dGhpcy5pbmRleC5xdWVyeShcblx0XHRcdHRleHQsXG5cdFx0XHR0aGlzLl9zZXR0aW5ncy5nZXQoJ01haW5fTGFuZ3VhZ2UnKSxcblx0XHRcdHRoaXMuX2dldEFjbChjb250ZXh0KSxcblx0XHRcdHR5cGUsXG5cdFx0XHRwYXlsb2FkLnN0YXJ0IHx8IDAsXG5cdFx0XHRwYXlsb2FkLnJvd3MgfHwgdGhpcy5fc2V0dGluZ3MuZ2V0KCdQYWdlU2l6ZScpLFxuXHRcdFx0Y2FsbGJhY2tcblx0XHQpO1xuXG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXREb2Ncblx0ICovXG5cdHN1Z2dlc3QodGV4dCwgY29udGV4dCwgcGF5bG9hZCwgY2FsbGJhY2spIHtcblxuXHRcdGlmICghdGhpcy5pbmRleCkgeyByZXR1cm4gY2FsbGJhY2soeyBtc2c6J0NoYXRwYWxfY3VycmVudGx5X25vdF9hY3RpdmUnIH0pOyB9XG5cblx0XHRjb25zdCB0eXBlID0gcGF5bG9hZC5yZXN1bHRUeXBlID09PSAnQWxsJyA/IFsnbWVzc2FnZScsICd1c2VyJywgJ3Jvb20nXSA6IFsnbWVzc2FnZSddO1xuXG5cdFx0dGhpcy5pbmRleC5zdWdnZXN0KFxuXHRcdFx0dGV4dCxcblx0XHRcdHRoaXMuX3NldHRpbmdzLmdldCgnTWFpbl9MYW5ndWFnZScpLFxuXHRcdFx0dGhpcy5fZ2V0QWNsKGNvbnRleHQpLFxuXHRcdFx0dHlwZSxcblx0XHRcdGNhbGxiYWNrXG5cdFx0KTtcblx0fVxufVxuXG5zZWFyY2hQcm92aWRlclNlcnZpY2UucmVnaXN0ZXIobmV3IENoYXRwYWxQcm92aWRlcigpKTtcbiIsImltcG9ydCBDaGF0cGFsTG9nZ2VyIGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgeyBSYW5kb20gfSBmcm9tICdtZXRlb3IvcmFuZG9tJztcblxuLyoqXG4gKiBFbmFibGVzIEhUVFAgZnVuY3Rpb25zIG9uIENoYXRwYWwgQmFja2VuZFxuICovXG5jbGFzcyBCYWNrZW5kIHtcblxuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0dGhpcy5fb3B0aW9ucyA9IG9wdGlvbnM7XG5cdH1cblxuXHQvKipcblx0ICogaW5kZXggYSBzZXQgb2YgU29ybCBkb2N1bWVudHNcblx0ICogQHBhcmFtIGRvY3Ncblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRpbmRleChkb2NzKSB7XG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdGRhdGE6ZG9jcyxcblx0XHRcdHBhcmFtczp7IGxhbmd1YWdlOnRoaXMuX29wdGlvbnMubGFuZ3VhZ2UgfSxcblx0XHRcdC4uLnRoaXMuX29wdGlvbnMuaHR0cE9wdGlvbnMsXG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5jYWxsKCdQT1NUJywgYCR7IHRoaXMuX29wdGlvbnMuYmFzZXVybCB9JHsgdGhpcy5fb3B0aW9ucy51cGRhdGVwYXRoIH1gLCBvcHRpb25zKTtcblxuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPCAzMDApIHtcblx0XHRcdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZyhgaW5kZXhlZCAkeyBkb2NzLmxlbmd0aCB9IGRvY3VtZW50c2AsIEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmRhdGEsIG51bGwsIDIpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXNwb25zZSk7XG5cdFx0XHR9XG5cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHQvLyBUT0RPIGhvdyB0byBkZWFsIHdpdGggdGhpc1xuXHRcdFx0Q2hhdHBhbExvZ2dlci5lcnJvcignaW5kZXhpbmcgZmFpbGVkJywgSlNPTi5zdHJpbmdpZnkoZSwgbnVsbCwgMikpO1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHR9XG5cblx0LyoqXG5cdCAqIHJlbW92ZSBhbiBlbnRyeSBieSB0eXBlIGFuZCBpZFxuXHQgKiBAcGFyYW0gdHlwZVxuXHQgKiBAcGFyYW0gaWRcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRyZW1vdmUodHlwZSwgaWQpIHtcblx0XHRDaGF0cGFsTG9nZ2VyLmRlYnVnKGBSZW1vdmUgJHsgdHlwZSB9KCR7IGlkIH0pIGZyb20gSW5kZXhgKTtcblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRkYXRhOntcblx0XHRcdFx0ZGVsZXRlOiB7XG5cdFx0XHRcdFx0cXVlcnk6IGBpZDokeyBpZCB9IEFORCB0eXBlOiR7IHR5cGUgfWAsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGNvbW1pdDp7fSxcblx0XHRcdH0sXG5cdFx0XHQuLi50aGlzLl9vcHRpb25zLmh0dHBPcHRpb25zLFxuXHRcdH07XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgcmVzcG9uc2UgPSBIVFRQLmNhbGwoJ1BPU1QnLCB0aGlzLl9vcHRpb25zLmJhc2V1cmwgKyB0aGlzLl9vcHRpb25zLmNsZWFycGF0aCwgb3B0aW9ucyk7XG5cblx0XHRcdHJldHVybiByZXNwb25zZS5zdGF0dXNDb2RlID49IDIwMCAmJiByZXNwb25zZS5zdGF0dXNDb2RlIDwgMzAwO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdH1cblxuXHRjb3VudCh0eXBlKSB7XG5cdFx0cmV0dXJuIHRoaXMucXVlcnkoeyB0eXBlLCByb3dzOjAsIHRleHQ6JyonIH0pW3R5cGVdLm51bUZvdW5kO1xuXHR9XG5cblx0LyoqXG5cdCAqIHF1ZXJ5IHdpdGggcGFyYW1zXG5cdCAqIEBwYXJhbSBwYXJhbXNcblx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdCAqL1xuXHRxdWVyeShwYXJhbXMsIGNhbGxiYWNrKSB7XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0cGFyYW1zLFxuXHRcdFx0Li4udGhpcy5fb3B0aW9ucy5odHRwT3B0aW9ucyxcblx0XHR9O1xuXG5cdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZygncXVlcnk6ICcsIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMsIG51bGwsIDIpKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRpZiAoY2FsbGJhY2spIHtcblx0XHRcdFx0SFRUUC5jYWxsKCdQT1NUJywgdGhpcy5fb3B0aW9ucy5iYXNldXJsICsgdGhpcy5fb3B0aW9ucy5zZWFyY2hwYXRoLCBvcHRpb25zLCAoZXJyLCByZXN1bHQpID0+IHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7IHJldHVybiBjYWxsYmFjayhlcnIpOyB9XG5cblx0XHRcdFx0XHRjYWxsYmFjayh1bmRlZmluZWQsIHJlc3VsdC5kYXRhKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXG5cdFx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5jYWxsKCdQT1NUJywgdGhpcy5fb3B0aW9ucy5iYXNldXJsICsgdGhpcy5fb3B0aW9ucy5zZWFyY2hwYXRoLCBvcHRpb25zKTtcblxuXHRcdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDMwMCkge1xuXHRcdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihyZXNwb25zZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRDaGF0cGFsTG9nZ2VyLmVycm9yKCdxdWVyeSBmYWlsZWQnLCBKU09OLnN0cmluZ2lmeShlLCBudWxsLCAyKSk7XG5cdFx0XHR0aHJvdyBlO1xuXHRcdH1cblx0fVxuXG5cdHN1Z2dlc3QocGFyYW1zLCBjYWxsYmFjaykge1xuXG5cdFx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRcdHBhcmFtcyxcblx0XHRcdC4uLnRoaXMuX29wdGlvbnMuaHR0cE9wdGlvbnMsXG5cdFx0fTtcblxuXHRcdEhUVFAuY2FsbCgnUE9TVCcsIHRoaXMuX29wdGlvbnMuYmFzZXVybCArIHRoaXMuX29wdGlvbnMuc3VnZ2VzdGlvbnBhdGgsIG9wdGlvbnMsIChlcnIsIHJlc3VsdCkgPT4ge1xuXHRcdFx0aWYgKGVycikgeyByZXR1cm4gY2FsbGJhY2soZXJyKTsgfVxuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjYWxsYmFjayh1bmRlZmluZWQsIHJlc3VsdC5kYXRhLnN1Z2dlc3Rpb24pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRjYWxsYmFjayhlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGNsZWFyKCkge1xuXHRcdENoYXRwYWxMb2dnZXIuZGVidWcoJ0NsZWFyIEluZGV4Jyk7XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0ZGF0YTp7XG5cdFx0XHRcdGRlbGV0ZToge1xuXHRcdFx0XHRcdHF1ZXJ5OiAnKjoqJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0Y29tbWl0Ont9LFxuXHRcdFx0fSwgLi4udGhpcy5fb3B0aW9ucy5odHRwT3B0aW9ucyxcblx0XHR9O1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5jYWxsKCdQT1NUJywgdGhpcy5fb3B0aW9ucy5iYXNldXJsICsgdGhpcy5fb3B0aW9ucy5jbGVhcnBhdGgsIG9wdGlvbnMpO1xuXG5cdFx0XHRyZXR1cm4gcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDMwMDtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIHN0YXRpY2FsbHkgcGluZyB3aXRoIGNvbmZpZ3VyYXRpb25cblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdCAqL1xuXHRzdGF0aWMgcGluZyhjb25maWcpIHtcblxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRwYXJhbXM6IHtcblx0XHRcdFx0c3RhdHM6dHJ1ZSxcblx0XHRcdH0sXG5cdFx0XHQuLi5jb25maWcuaHR0cE9wdGlvbnMsXG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IEhUVFAuY2FsbCgnR0VUJywgY29uZmlnLmJhc2V1cmwgKyBjb25maWcucGluZ3BhdGgsIG9wdGlvbnMpO1xuXG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA8IDMwMCkge1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YS5zdGF0cztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cbn1cblxuLyoqXG4gKiBFbmFibGVkIGJhdGNoIGluZGV4aW5nXG4gKi9cbmNsYXNzIEJhdGNoSW5kZXhlciB7XG5cblx0Y29uc3RydWN0b3Ioc2l6ZSwgZnVuYywgLi4ucmVzdCkge1xuXHRcdHRoaXMuX3NpemUgPSBzaXplO1xuXHRcdHRoaXMuX2Z1bmMgPSBmdW5jO1xuXHRcdHRoaXMuX3Jlc3QgPSByZXN0O1xuXHRcdHRoaXMuX3ZhbHVlcyA9IFtdO1xuXHR9XG5cblx0YWRkKHZhbHVlKSB7XG5cdFx0dGhpcy5fdmFsdWVzLnB1c2godmFsdWUpO1xuXHRcdGlmICh0aGlzLl92YWx1ZXMubGVuZ3RoID09PSB0aGlzLl9zaXplKSB7XG5cdFx0XHR0aGlzLmZsdXNoKCk7XG5cdFx0fVxuXHR9XG5cblx0Zmx1c2goKSB7XG5cdFx0dGhpcy5fZnVuYyh0aGlzLl92YWx1ZXMsIHRoaXMuX3Jlc3QpOy8vIFRPRE8gaWYgZmx1c2ggZG9lcyBub3Qgd29ya1xuXHRcdHRoaXMuX3ZhbHVlcyA9IFtdO1xuXHR9XG59XG5cbi8qKlxuICogUHJvdmlkZXMgaW5kZXggZnVuY3Rpb25zIHRvIGNoYXRwYWwgcHJvdmlkZXJcbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW5kZXgge1xuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIEluZGV4IFN0dWJcblx0ICogQHBhcmFtIG9wdGlvbnNcblx0ICogQHBhcmFtIGNsZWFyIGlmIGEgY29tcGxldGUgcmVpbmRleCBzaG91bGQgYmUgZG9uZVxuXHQgKi9cblx0Y29uc3RydWN0b3Iob3B0aW9ucywgY2xlYXIsIGRhdGUpIHtcblxuXHRcdHRoaXMuX2lkID0gUmFuZG9tLmlkKCk7XG5cblx0XHR0aGlzLl9iYWNrZW5kID0gbmV3IEJhY2tlbmQob3B0aW9ucyk7XG5cblx0XHR0aGlzLl9vcHRpb25zID0gb3B0aW9ucztcblxuXHRcdHRoaXMuX2JhdGNoSW5kZXhlciA9IG5ldyBCYXRjaEluZGV4ZXIodGhpcy5fb3B0aW9ucy5iYXRjaFNpemUgfHwgMTAwLCAodmFsdWVzKSA9PiB0aGlzLl9iYWNrZW5kLmluZGV4KHZhbHVlcykpO1xuXG5cdFx0dGhpcy5fYm9vdHN0cmFwKGNsZWFyLCBkYXRlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBwcmVwYXJlIHNvbHIgZG9jdW1lbnRzXG5cdCAqIEBwYXJhbSB0eXBlXG5cdCAqIEBwYXJhbSBkb2Ncblx0ICogQHJldHVybnMgeyp9XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRfZ2V0SW5kZXhEb2N1bWVudCh0eXBlLCBkb2MpIHtcblx0XHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRcdGNhc2UgJ21lc3NhZ2UnOlxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGlkOiBkb2MuX2lkLFxuXHRcdFx0XHRcdHJpZDogZG9jLnJpZCxcblx0XHRcdFx0XHR1c2VyOiBkb2MudS5faWQsXG5cdFx0XHRcdFx0Y3JlYXRlZDogZG9jLnRzLFxuXHRcdFx0XHRcdHVwZGF0ZWQ6IGRvYy5fdXBkYXRlZEF0LFxuXHRcdFx0XHRcdHRleHQ6IGRvYy5tc2csXG5cdFx0XHRcdFx0dHlwZSxcblx0XHRcdFx0fTtcblx0XHRcdGNhc2UgJ3Jvb20nOlxuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGlkOiBkb2MuX2lkLFxuXHRcdFx0XHRcdHJpZDogZG9jLl9pZCxcblx0XHRcdFx0XHRjcmVhdGVkOiBkb2MuY3JlYXRlZEF0LFxuXHRcdFx0XHRcdHVwZGF0ZWQ6IGRvYy5sbSA/IGRvYy5sbSA6IGRvYy5fdXBkYXRlZEF0LFxuXHRcdFx0XHRcdHR5cGUsXG5cdFx0XHRcdFx0cm9vbV9uYW1lOiBkb2MubmFtZSxcblx0XHRcdFx0XHRyb29tX2Fubm91bmNlbWVudDogZG9jLmFubm91bmNlbWVudCxcblx0XHRcdFx0XHRyb29tX2Rlc2NyaXB0aW9uOiBkb2MuZGVzY3JpcHRpb24sXG5cdFx0XHRcdFx0cm9vbV90b3BpYzogZG9jLnRvcGljLFxuXHRcdFx0XHR9O1xuXHRcdFx0Y2FzZSAndXNlcic6XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0aWQ6IGRvYy5faWQsXG5cdFx0XHRcdFx0Y3JlYXRlZDogZG9jLmNyZWF0ZWRBdCxcblx0XHRcdFx0XHR1cGRhdGVkOiBkb2MuX3VwZGF0ZWRBdCxcblx0XHRcdFx0XHR0eXBlLFxuXHRcdFx0XHRcdHVzZXJfdXNlcm5hbWU6IGRvYy51c2VybmFtZSxcblx0XHRcdFx0XHR1c2VyX25hbWU6IGRvYy5uYW1lLFxuXHRcdFx0XHRcdHVzZXJfZW1haWw6IGRvYy5lbWFpbHMgJiYgZG9jLmVtYWlscy5tYXAoKGUpID0+IGUuYWRkcmVzcyksXG5cdFx0XHRcdH07XG5cdFx0XHRkZWZhdWx0OiB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBpbmRleCB0eXBlICckeyB0eXBlIH0nYCk7XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIHJldHVybiB0cnVlIGlmIHRoZXJlIGFyZSBtZXNzYWdlcyBpbiB0aGUgZGF0YWJhc2VzIHdoaWNoIGhhcyBiZWVuIGNyZWF0ZWQgYmVmb3JlICpkYXRlKlxuXHQgKiBAcGFyYW0gZGF0ZVxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9leGlzdHNEYXRhT2xkZXJUaGFuKGRhdGUpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMubW9kZWwuZmluZCh7IHRzOnsgJGx0OiBuZXcgRGF0ZShkYXRlKSB9LCB0OnsgJGV4aXN0czpmYWxzZSB9IH0sIHsgbGltaXQ6MSB9KS5mZXRjaCgpLmxlbmd0aCA+IDA7XG5cdH1cblxuXHRfZG9lc1Jvb21Db3VudERpZmZlcigpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZCh7IHQ6eyAkbmU6J2QnIH0gfSkuY291bnQoKSAhPT0gdGhpcy5fYmFja2VuZC5jb3VudCgncm9vbScpO1xuXHR9XG5cblx0X2RvZXNVc2VyQ291bnREaWZmZXIoKSB7XG5cdFx0cmV0dXJuIE1ldGVvci51c2Vycy5maW5kKHsgYWN0aXZlOnRydWUgfSkuY291bnQoKSAhPT0gdGhpcy5fYmFja2VuZC5jb3VudCgndXNlcicpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEluZGV4IHVzZXJzIGJ5IHVzaW5nIGEgZGF0YWJhc2UgY3Vyc29yXG5cdCAqL1xuXHRfaW5kZXhVc2VycygpIHtcblx0XHRjb25zdCBjdXJzb3IgPSBNZXRlb3IudXNlcnMuZmluZCh7IGFjdGl2ZTp0cnVlIH0pO1xuXG5cdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZyhgU3RhcnQgaW5kZXhpbmcgJHsgY3Vyc29yLmNvdW50KCkgfSB1c2Vyc2ApO1xuXG5cdFx0Y3Vyc29yLmZvckVhY2goKHVzZXIpID0+IHtcblx0XHRcdHRoaXMuaW5kZXhEb2MoJ3VzZXInLCB1c2VyLCBmYWxzZSk7XG5cdFx0fSk7XG5cblx0XHRDaGF0cGFsTG9nZ2VyLmluZm8oYFVzZXJzIGluZGV4ZWQgc3VjY2Vzc2Z1bGx5IChpbmRleC1pZDogJHsgdGhpcy5faWQgfSlgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBJbmRleCByb29tcyBieSBkYXRhYmFzZSBjdXJzb3Jcblx0ICogQHByaXZhdGVcblx0ICovXG5cdF9pbmRleFJvb21zKCkge1xuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmQoeyB0OnsgJG5lOidkJyB9IH0pO1xuXG5cdFx0Q2hhdHBhbExvZ2dlci5kZWJ1ZyhgU3RhcnQgaW5kZXhpbmcgJHsgY3Vyc29yLmNvdW50KCkgfSByb29tc2ApO1xuXG5cdFx0Y3Vyc29yLmZvckVhY2goKHJvb20pID0+IHtcblx0XHRcdHRoaXMuaW5kZXhEb2MoJ3Jvb20nLCByb29tLCBmYWxzZSk7XG5cdFx0fSk7XG5cblx0XHRDaGF0cGFsTG9nZ2VyLmluZm8oYFJvb21zIGluZGV4ZWQgc3VjY2Vzc2Z1bGx5IChpbmRleC1pZDogJHsgdGhpcy5faWQgfSlgKTtcblx0fVxuXG5cdF9pbmRleE1lc3NhZ2VzKGRhdGUsIGdhcCkge1xuXG5cdFx0Y29uc3Qgc3RhcnQgPSBuZXcgRGF0ZShkYXRlIC0gZ2FwKTtcblx0XHRjb25zdCBlbmQgPSBuZXcgRGF0ZShkYXRlKTtcblxuXHRcdGNvbnN0IGN1cnNvciA9IFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLm1vZGVsLmZpbmQoeyB0czp7ICRndDogc3RhcnQsICRsdDogZW5kIH0sIHQ6eyAkZXhpc3RzOmZhbHNlIH0gfSk7XG5cblx0XHRDaGF0cGFsTG9nZ2VyLmRlYnVnKGBTdGFydCBpbmRleGluZyAkeyBjdXJzb3IuY291bnQoKSB9IG1lc3NhZ2VzIGJldHdlZW4gJHsgc3RhcnQudG9TdHJpbmcoKSB9IGFuZCAkeyBlbmQudG9TdHJpbmcoKSB9YCk7XG5cblx0XHRjdXJzb3IuZm9yRWFjaCgobWVzc2FnZSkgPT4ge1xuXHRcdFx0dGhpcy5pbmRleERvYygnbWVzc2FnZScsIG1lc3NhZ2UsIGZhbHNlKTtcblx0XHR9KTtcblxuXHRcdENoYXRwYWxMb2dnZXIuaW5mbyhgTWVzc2FnZXMgYmV0d2VlbiAkeyBzdGFydC50b1N0cmluZygpIH0gYW5kICR7IGVuZC50b1N0cmluZygpIH0gaW5kZXhlZCBzdWNjZXNzZnVsbHkgKGluZGV4LWlkOiAkeyB0aGlzLl9pZCB9KWApO1xuXG5cdFx0cmV0dXJuIHN0YXJ0LmdldFRpbWUoKTtcblx0fVxuXG5cdF9ydW4oZGF0ZSwgcmVzb2x2ZSwgcmVqZWN0KSB7XG5cblx0XHR0aGlzLl9ydW5uaW5nID0gdHJ1ZTtcblxuXHRcdGlmICh0aGlzLl9leGlzdHNEYXRhT2xkZXJUaGFuKGRhdGUpICYmICF0aGlzLl9icmVhaykge1xuXG5cdFx0XHRNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHRcdGRhdGUgPSB0aGlzLl9pbmRleE1lc3NhZ2VzKGRhdGUsICh0aGlzLl9vcHRpb25zLndpbmRvd1NpemUgfHwgMjQpICogMzYwMDAwMCk7XG5cblx0XHRcdFx0dGhpcy5fcnVuKGRhdGUsIHJlc29sdmUsIHJlamVjdCk7XG5cblx0XHRcdH0sIHRoaXMuX29wdGlvbnMudGltZW91dCB8fCAxMDAwKTtcblx0XHR9IGVsc2UgaWYgKHRoaXMuX2JyZWFrKSB7XG5cdFx0XHRDaGF0cGFsTG9nZ2VyLmluZm8oYHN0b3BwZWQgYm9vdHN0cmFwIChpbmRleC1pZDogJHsgdGhpcy5faWQgfSlgKTtcblxuXHRcdFx0dGhpcy5fYmF0Y2hJbmRleGVyLmZsdXNoKCk7XG5cblx0XHRcdHRoaXMuX3J1bm5pbmcgPSBmYWxzZTtcblxuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH0gZWxzZSB7XG5cblx0XHRcdENoYXRwYWxMb2dnZXIuaW5mbyhgTm8gbWVzc2FnZXMgb2xkZXIgdGhhbiBhbHJlYWR5IGluZGV4ZWQgZGF0ZSAkeyBuZXcgRGF0ZShkYXRlKS50b1N0cmluZygpIH1gKTtcblxuXHRcdFx0aWYgKHRoaXMuX2RvZXNVc2VyQ291bnREaWZmZXIoKSAmJiAhdGhpcy5fYnJlYWspIHtcblx0XHRcdFx0dGhpcy5faW5kZXhVc2VycygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Q2hhdHBhbExvZ2dlci5pbmZvKCdVc2VycyBhbHJlYWR5IGluZGV4ZWQnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKHRoaXMuX2RvZXNSb29tQ291bnREaWZmZXIoKSAmJiAhdGhpcy5fYnJlYWspIHtcblx0XHRcdFx0dGhpcy5faW5kZXhSb29tcygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Q2hhdHBhbExvZ2dlci5pbmZvKCdSb29tcyBhbHJlYWR5IGluZGV4ZWQnKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5fYmF0Y2hJbmRleGVyLmZsdXNoKCk7XG5cblx0XHRcdENoYXRwYWxMb2dnZXIuaW5mbyhgZmluaXNoZWQgYm9vdHN0cmFwIChpbmRleC1pZDogJHsgdGhpcy5faWQgfSlgKTtcblxuXHRcdFx0dGhpcy5fcnVubmluZyA9IGZhbHNlO1xuXG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fVxuXHR9XG5cblx0X2Jvb3RzdHJhcChjbGVhciwgZGF0ZSkge1xuXG5cdFx0Q2hhdHBhbExvZ2dlci5pbmZvKCdTdGFydCBib290c3RyYXBwaW5nJyk7XG5cblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXG5cdFx0XHRpZiAoY2xlYXIpIHtcblx0XHRcdFx0dGhpcy5fYmFja2VuZC5jbGVhcigpO1xuXHRcdFx0XHRkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX3J1bihkYXRlLCByZXNvbHZlLCByZWplY3QpO1xuXG5cdFx0fSk7XG5cdH1cblxuXHRzdGF0aWMgcGluZyhvcHRpb25zKSB7XG5cdFx0cmV0dXJuIEJhY2tlbmQucGluZyhvcHRpb25zKTtcblx0fVxuXG5cdHN0b3AoKSB7XG5cdFx0dGhpcy5fYnJlYWsgPSB0cnVlO1xuXHR9XG5cblx0cmVpbmRleCgpIHtcblx0XHRpZiAoIXRoaXMuX3J1bm5pbmcpIHtcblx0XHRcdHRoaXMuX2Jvb3RzdHJhcCh0cnVlKTtcblx0XHR9XG5cdH1cblxuXHRpbmRleERvYyh0eXBlLCBkb2MsIGZsdXNoID0gdHJ1ZSkge1xuXHRcdHRoaXMuX2JhdGNoSW5kZXhlci5hZGQodGhpcy5fZ2V0SW5kZXhEb2N1bWVudCh0eXBlLCBkb2MpKTtcblxuXHRcdGlmIChmbHVzaCkgeyB0aGlzLl9iYXRjaEluZGV4ZXIuZmx1c2goKTsgfVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRyZW1vdmVEb2ModHlwZSwgaWQpIHtcblx0XHRyZXR1cm4gdGhpcy5fYmFja2VuZC5yZW1vdmUodHlwZSwgaWQpO1xuXHR9XG5cblx0cXVlcnkodGV4dCwgbGFuZ3VhZ2UsIGFjbCwgdHlwZSwgc3RhcnQsIHJvd3MsIGNhbGxiYWNrLCBwYXJhbXMgPSB7fSkge1xuXHRcdHRoaXMuX2JhY2tlbmQucXVlcnkoe1xuXHRcdFx0dGV4dCxcblx0XHRcdGxhbmd1YWdlLFxuXHRcdFx0YWNsLFxuXHRcdFx0dHlwZSxcblx0XHRcdHN0YXJ0LFxuXHRcdFx0cm93cyxcblx0XHRcdC4uLnBhcmFtcyxcblx0XHR9LCBjYWxsYmFjayk7XG5cdH1cblxuXHRzdWdnZXN0KHRleHQsIGxhbmd1YWdlLCBhY2wsIHR5cGUsIGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5fYmFja2VuZC5zdWdnZXN0KHtcblx0XHRcdHRleHQsXG5cdFx0XHRsYW5ndWFnZSxcblx0XHRcdGFjbCxcblx0XHRcdHR5cGUsXG5cdFx0fSwgY2FsbGJhY2spO1xuXHR9XG5cbn1cbiIsImNvbnN0IENoYXRwYWxMb2dnZXIgPSBuZXcgTG9nZ2VyKCdDaGF0cGFsIExvZ2dlcicsIHt9KTtcbmV4cG9ydCBkZWZhdWx0IENoYXRwYWxMb2dnZXI7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdjaGF0cGFsVXRpbHNDcmVhdGVLZXknKGVtYWlsKSB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gSFRUUC5jYWxsKCdQT1NUJywgJ2h0dHBzOi8vYmV0YS5jaGF0cGFsLmlvL3YxL2FjY291bnQnLCB7IGRhdGE6IHsgZW1haWwsIHRpZXI6ICdmcmVlJyB9IH0pO1xuXHRcdFx0aWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDIwMSkge1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YS5rZXk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0fSxcblx0J2NoYXRwYWxVdGlsc0dldFRhQycobGFuZykge1xuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCByZXNwb25zZSA9IEhUVFAuY2FsbCgnR0VUJywgYGh0dHBzOi8vYmV0YS5jaGF0cGFsLmlvL3YxL3Rlcm1zLyR7IGxhbmcgfS5odG1sYCk7XG5cdFx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5jb250ZW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWxzIEluamVjdCAqL1xuXG5JbmplY3QucmF3Qm9keSgnY2hhdHBhbC1lbnRlcicsIEFzc2V0cy5nZXRUZXh0KCdzZXJ2ZXIvYXNzZXQvY2hhdHBhbC1lbnRlci5zdmcnKSk7XG5JbmplY3QucmF3Qm9keSgnY2hhdHBhbC1sb2dvLWljb24tZGFya2JsdWUnLCBBc3NldHMuZ2V0VGV4dCgnc2VydmVyL2Fzc2V0L2NoYXRwYWwtbG9nby1pY29uLWRhcmtibHVlLnN2ZycpKTtcbiJdfQ==
