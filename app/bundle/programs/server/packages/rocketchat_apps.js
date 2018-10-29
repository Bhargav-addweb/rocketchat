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

/* Package-scope variables */
var Apps, content;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:apps":{"lib":{"Apps.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/lib/Apps.js                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// Please see both server and client's repsective "orchestrator" file for the contents
Apps = {};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"misc":{"Utilities.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/lib/misc/Utilities.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  Utilities: () => Utilities
});

class Utilities {
  static getI18nKeyForApp(key, appId) {
    return key && `apps-${appId}-${key}`;
  }

  static curl({
    method,
    params,
    auth,
    headers = {},
    url,
    query,
    content
  }, opts = {}) {
    const newLine = '\\\n   ';
    const cmd = ['curl']; // curl options

    if (opts.verbose) {
      cmd.push('-v');
    }

    if (opts.headers) {
      cmd.push('-i');
    } // method


    cmd.push('-X');
    cmd.push((method || 'GET').toUpperCase()); // URL

    let u = url;

    if (typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        u = u.replace(`:${key}`, value);
      });
    }

    if (typeof query === 'object') {
      const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
      u += `?${queryString}`;
    }

    cmd.push(u); // username

    if (auth) {
      cmd.push(newLine);
      cmd.push('-u');
      cmd.push(auth);
    } // headers


    const headerKeys = [];
    Object.entries(headers).forEach(([key, val]) => {
      key = key.toLowerCase();
      headerKeys.push(key);
      cmd.push(newLine);
      cmd.push('-H');
      cmd.push(`"${key}${val ? ': ' : ';'}${val || ''}"`);
    });

    if (content) {
      if (typeof content === 'object') {
        if (!headerKeys.includes('content-type')) {
          cmd.push(newLine);
          cmd.push('-H');
          cmd.push('"content-type: application/json"');
        }

        content = JSON.stringify(content);
      }

      cmd.push(newLine);
      cmd.push('--data-binary');
      cmd.push(`'${content}'`);
    }

    return cmd.join(' ');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"storage":{"apps-logs-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-logs-model.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsLogsModel: () => AppsLogsModel
});

class AppsLogsModel extends RocketChat.models._Base {
  constructor() {
    super('apps_logs');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"apps-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-model.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsModel: () => AppsModel
});

class AppsModel extends RocketChat.models._Base {
  constructor() {
    super('apps');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"apps-persistence-model.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/apps-persistence-model.js                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsPersistenceModel: () => AppsPersistenceModel
});

class AppsPersistenceModel extends RocketChat.models._Base {
  constructor() {
    super('apps_persistence');
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"storage.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/storage.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRealStorage: () => AppRealStorage
});
let AppStorage;
module.watch(require("@rocket.chat/apps-engine/server/storage"), {
  AppStorage(v) {
    AppStorage = v;
  }

}, 0);

class AppRealStorage extends AppStorage {
  constructor(data) {
    super('mongodb');
    this.db = data;
  }

  create(item) {
    return new Promise((resolve, reject) => {
      item.createdAt = new Date();
      item.updatedAt = new Date();
      let doc;

      try {
        doc = this.db.findOne({
          $or: [{
            id: item.id
          }, {
            'info.nameSlug': item.info.nameSlug
          }]
        });
      } catch (e) {
        return reject(e);
      }

      if (doc) {
        return reject(new Error('App already exists.'));
      }

      try {
        const id = this.db.insert(item);
        item._id = id;
        resolve(item);
      } catch (e) {
        reject(e);
      }
    });
  }

  retrieveOne(id) {
    return new Promise((resolve, reject) => {
      let doc;

      try {
        doc = this.db.findOne({
          $or: [{
            _id: id
          }, {
            id
          }]
        });
      } catch (e) {
        return reject(e);
      }

      if (doc) {
        resolve(doc);
      } else {
        reject(new Error(`No App found by the id: ${id}`));
      }
    });
  }

  retrieveAll() {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find({}).fetch();
      } catch (e) {
        return reject(e);
      }

      const items = new Map();
      docs.forEach(i => items.set(i.id, i));
      resolve(items);
    });
  }

  update(item) {
    return new Promise((resolve, reject) => {
      try {
        this.db.update({
          id: item.id
        }, item);
      } catch (e) {
        return reject(e);
      }

      this.retrieveOne(item.id).then(updated => resolve(updated)).catch(err => reject(err));
    });
  }

  remove(id) {
    return new Promise((resolve, reject) => {
      try {
        this.db.remove({
          id
        });
      } catch (e) {
        return reject(e);
      }

      resolve({
        success: true
      });
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/index.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsLogsModel: () => AppsLogsModel,
  AppsModel: () => AppsModel,
  AppsPersistenceModel: () => AppsPersistenceModel,
  AppRealLogsStorage: () => AppRealLogsStorage,
  AppRealStorage: () => AppRealStorage
});
let AppsLogsModel;
module.watch(require("./apps-logs-model"), {
  AppsLogsModel(v) {
    AppsLogsModel = v;
  }

}, 0);
let AppsModel;
module.watch(require("./apps-model"), {
  AppsModel(v) {
    AppsModel = v;
  }

}, 1);
let AppsPersistenceModel;
module.watch(require("./apps-persistence-model"), {
  AppsPersistenceModel(v) {
    AppsPersistenceModel = v;
  }

}, 2);
let AppRealLogsStorage;
module.watch(require("./logs-storage"), {
  AppRealLogsStorage(v) {
    AppRealLogsStorage = v;
  }

}, 3);
let AppRealStorage;
module.watch(require("./storage"), {
  AppRealStorage(v) {
    AppRealStorage = v;
  }

}, 4);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"logs-storage.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/storage/logs-storage.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRealLogsStorage: () => AppRealLogsStorage
});
let AppConsole;
module.watch(require("@rocket.chat/apps-engine/server/logging"), {
  AppConsole(v) {
    AppConsole = v;
  }

}, 0);
let AppLogStorage;
module.watch(require("@rocket.chat/apps-engine/server/storage"), {
  AppLogStorage(v) {
    AppLogStorage = v;
  }

}, 1);

class AppRealLogsStorage extends AppLogStorage {
  constructor(model) {
    super('mongodb');
    this.db = model;
  }

  find(...args) {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find(...args).fetch();
      } catch (e) {
        return reject(e);
      }

      resolve(docs);
    });
  }

  storeEntries(appId, logger) {
    return new Promise((resolve, reject) => {
      const item = AppConsole.toStorageEntry(appId, logger);

      try {
        const id = this.db.insert(item);
        resolve(this.db.findOneById(id));
      } catch (e) {
        reject(e);
      }
    });
  }

  getEntriesFor(appId) {
    return new Promise((resolve, reject) => {
      let docs;

      try {
        docs = this.db.find({
          appId
        }).fetch();
      } catch (e) {
        return reject(e);
      }

      resolve(docs);
    });
  }

  removeEntriesFor(appId) {
    return new Promise((resolve, reject) => {
      try {
        this.db.remove({
          appId
        });
      } catch (e) {
        return reject(e);
      }

      resolve();
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"bridges":{"activation.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/activation.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppActivationBridge: () => AppActivationBridge
});

class AppActivationBridge {
  constructor(orch) {
    this.orch = orch;
  }

  appAdded(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appAdded(app.getID()));
    });
  }

  appUpdated(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appUpdated(app.getID()));
    });
  }

  appRemoved(app) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appRemoved(app.getID()));
    });
  }

  appStatusChanged(app, status) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getNotifier().appStatusUpdated(app.getID(), status));
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"bridges.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/bridges.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  RealAppBridges: () => RealAppBridges
});
let AppBridges;
module.watch(require("@rocket.chat/apps-engine/server/bridges"), {
  AppBridges(v) {
    AppBridges = v;
  }

}, 0);
let AppActivationBridge;
module.watch(require("./activation"), {
  AppActivationBridge(v) {
    AppActivationBridge = v;
  }

}, 1);
let AppDetailChangesBridge;
module.watch(require("./details"), {
  AppDetailChangesBridge(v) {
    AppDetailChangesBridge = v;
  }

}, 2);
let AppCommandsBridge;
module.watch(require("./commands"), {
  AppCommandsBridge(v) {
    AppCommandsBridge = v;
  }

}, 3);
let AppApisBridge;
module.watch(require("./api"), {
  AppApisBridge(v) {
    AppApisBridge = v;
  }

}, 4);
let AppEnvironmentalVariableBridge;
module.watch(require("./environmental"), {
  AppEnvironmentalVariableBridge(v) {
    AppEnvironmentalVariableBridge = v;
  }

}, 5);
let AppHttpBridge;
module.watch(require("./http"), {
  AppHttpBridge(v) {
    AppHttpBridge = v;
  }

}, 6);
let AppListenerBridge;
module.watch(require("./listeners"), {
  AppListenerBridge(v) {
    AppListenerBridge = v;
  }

}, 7);
let AppMessageBridge;
module.watch(require("./messages"), {
  AppMessageBridge(v) {
    AppMessageBridge = v;
  }

}, 8);
let AppPersistenceBridge;
module.watch(require("./persistence"), {
  AppPersistenceBridge(v) {
    AppPersistenceBridge = v;
  }

}, 9);
let AppRoomBridge;
module.watch(require("./rooms"), {
  AppRoomBridge(v) {
    AppRoomBridge = v;
  }

}, 10);
let AppSettingBridge;
module.watch(require("./settings"), {
  AppSettingBridge(v) {
    AppSettingBridge = v;
  }

}, 11);
let AppUserBridge;
module.watch(require("./users"), {
  AppUserBridge(v) {
    AppUserBridge = v;
  }

}, 12);

class RealAppBridges extends AppBridges {
  constructor(orch) {
    super();
    this._actBridge = new AppActivationBridge(orch);
    this._cmdBridge = new AppCommandsBridge(orch);
    this._apiBridge = new AppApisBridge(orch);
    this._detBridge = new AppDetailChangesBridge(orch);
    this._envBridge = new AppEnvironmentalVariableBridge(orch);
    this._httpBridge = new AppHttpBridge();
    this._lisnBridge = new AppListenerBridge(orch);
    this._msgBridge = new AppMessageBridge(orch);
    this._persistBridge = new AppPersistenceBridge(orch);
    this._roomBridge = new AppRoomBridge(orch);
    this._setsBridge = new AppSettingBridge(orch);
    this._userBridge = new AppUserBridge(orch);
  }

  getCommandBridge() {
    return this._cmdBridge;
  }

  getApiBridge() {
    return this._apiBridge;
  }

  getEnvironmentalVariableBridge() {
    return this._envBridge;
  }

  getHttpBridge() {
    return this._httpBridge;
  }

  getListenerBridge() {
    return this._lisnBridge;
  }

  getMessageBridge() {
    return this._msgBridge;
  }

  getPersistenceBridge() {
    return this._persistBridge;
  }

  getAppActivationBridge() {
    return this._actBridge;
  }

  getAppDetailChangesBridge() {
    return this._detBridge;
  }

  getRoomBridge() {
    return this._roomBridge;
  }

  getServerSettingBridge() {
    return this._setsBridge;
  }

  getUserBridge() {
    return this._userBridge;
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"commands.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/commands.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppCommandsBridge: () => AppCommandsBridge
});
let SlashCommandContext;
module.watch(require("@rocket.chat/apps-engine/definition/slashcommands"), {
  SlashCommandContext(v) {
    SlashCommandContext = v;
  }

}, 0);
let Utilities;
module.watch(require("../../lib/misc/Utilities"), {
  Utilities(v) {
    Utilities = v;
  }

}, 1);

class AppCommandsBridge {
  constructor(orch) {
    this.orch = orch;
    this.disabledCommands = new Map();
  }

  doesCommandExist(command, appId) {
    console.log(`The App ${appId} is checking if "${command}" command exists.`);

    if (typeof command !== 'string' || command.length === 0) {
      return false;
    }

    const cmd = command.toLowerCase();
    return typeof RocketChat.slashCommands.commands[cmd] === 'object' || this.disabledCommands.has(cmd);
  }

  enableCommand(command, appId) {
    console.log(`The App ${appId} is attempting to enable the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();

    if (!this.disabledCommands.has(cmd)) {
      throw new Error(`The command is not currently disabled: "${cmd}"`);
    }

    RocketChat.slashCommands.commands[cmd] = this.disabledCommands.get(cmd);
    this.disabledCommands.delete(cmd);
    this.orch.getNotifier().commandUpdated(cmd);
  }

  disableCommand(command, appId) {
    console.log(`The App ${appId} is attempting to disable the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();

    if (this.disabledCommands.has(cmd)) {
      // The command is already disabled, no need to disable it yet again
      return;
    }

    if (typeof RocketChat.slashCommands.commands[cmd] === 'undefined') {
      throw new Error(`Command does not exist in the system currently: "${cmd}"`);
    }

    this.disabledCommands.set(cmd, RocketChat.slashCommands.commands[cmd]);
    delete RocketChat.slashCommands.commands[cmd];
    this.orch.getNotifier().commandDisabled(cmd);
  } // command: { command, paramsExample, i18nDescription, executor: function }


  modifyCommand(command, appId) {
    console.log(`The App ${appId} is attempting to modify the command: "${command}"`);

    this._verifyCommand(command);

    const cmd = command.toLowerCase();

    if (typeof RocketChat.slashCommands.commands[cmd] === 'undefined') {
      throw new Error(`Command does not exist in the system currently (or it is disabled): "${cmd}"`);
    }

    const item = RocketChat.slashCommands.commands[cmd];
    item.params = command.paramsExample ? command.paramsExample : item.params;
    item.description = command.i18nDescription ? command.i18nDescription : item.params;
    item.callback = this._appCommandExecutor.bind(this);
    item.providesPreview = command.providesPreview;
    item.previewer = command.previewer ? this._appCommandPreviewer.bind(this) : item.previewer;
    item.previewCallback = command.executePreviewItem ? this._appCommandPreviewExecutor.bind(this) : item.previewCallback;
    RocketChat.slashCommands.commands[cmd] = item;
    this.orch.getNotifier().commandUpdated(cmd);
  }

  registerCommand(command, appId) {
    console.log(`The App ${appId} is registering the command: "${command.command}"`);

    this._verifyCommand(command);

    const item = {
      command: command.command.toLowerCase(),
      params: Utilities.getI18nKeyForApp(command.i18nParamsExample, appId),
      description: Utilities.getI18nKeyForApp(command.i18nDescription, appId),
      callback: this._appCommandExecutor.bind(this),
      providesPreview: command.providesPreview,
      previewer: !command.previewer ? undefined : this._appCommandPreviewer.bind(this),
      previewCallback: !command.executePreviewItem ? undefined : this._appCommandPreviewExecutor.bind(this)
    };
    RocketChat.slashCommands.commands[command.command.toLowerCase()] = item;
    this.orch.getNotifier().commandAdded(command.command.toLowerCase());
  }

  unregisterCommand(command, appId) {
    console.log(`The App ${appId} is unregistering the command: "${command}"`);

    if (typeof command !== 'string' || command.trim().length === 0) {
      throw new Error('Invalid command parameter provided, must be a string.');
    }

    const cmd = command.toLowerCase();
    this.disabledCommands.delete(cmd);
    delete RocketChat.slashCommands.commands[cmd];
    this.orch.getNotifier().commandRemoved(cmd);
  }

  _verifyCommand(command) {
    if (typeof command !== 'object') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.command !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (command.i18nParamsExample && typeof command.i18nParamsExample !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (command.i18nDescription && typeof command.i18nDescription !== 'string') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.providesPreview !== 'boolean') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }

    if (typeof command.executor !== 'function') {
      throw new Error('Invalid Slash Command parameter provided, it must be a valid ISlashCommand object.');
    }
  }

  _appCommandExecutor(command, parameters, message) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    Promise.await(this.orch.getManager().getCommandManager().executeCommand(command, context));
  }

  _appCommandPreviewer(command, parameters, message) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    return Promise.await(this.orch.getManager().getCommandManager().getPreviews(command, context));
  }

  _appCommandPreviewExecutor(command, parameters, message, preview) {
    const user = this.orch.getConverters().get('users').convertById(Meteor.userId());
    const room = this.orch.getConverters().get('rooms').convertById(message.rid);
    const params = parameters.length === 0 || parameters === ' ' ? [] : parameters.split(' ');
    const context = new SlashCommandContext(Object.freeze(user), Object.freeze(room), Object.freeze(params));
    Promise.await(this.orch.getManager().getCommandManager().executePreview(command, preview, context));
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"environmental.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/environmental.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppEnvironmentalVariableBridge: () => AppEnvironmentalVariableBridge
});

class AppEnvironmentalVariableBridge {
  constructor(orch) {
    this.orch = orch;
    this.allowed = ['NODE_ENV', 'ROOT_URL', 'INSTANCE_IP'];
  }

  getValueByName(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the environmental variable value ${envVarName}.`);

      if (this.isReadable(envVarName, appId)) {
        return process.env[envVarName];
      }

      throw new Error(`The environmental variable "${envVarName}" is not readable.`);
    });
  }

  isReadable(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if the environmental variable is readable ${envVarName}.`);
      return this.allowed.includes(envVarName.toUpperCase());
    });
  }

  isSet(envVarName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if the environmental variable is set ${envVarName}.`);

      if (this.isReadable(envVarName, appId)) {
        return typeof process.env[envVarName] !== 'undefined';
      }

      throw new Error(`The environmental variable "${envVarName}" is not readable.`);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"messages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/messages.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessageBridge: () => AppMessageBridge
});

class AppMessageBridge {
  constructor(orch) {
    this.orch = orch;
  }

  create(message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is creating a new message.`);
      let msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      Meteor.runAsUser(msg.u._id, () => {
        msg = Meteor.call('sendMessage', msg);
      });
      return msg._id;
    });
  }

  getById(messageId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the message: "${messageId}"`);
      return this.orch.getConverters().get('messages').convertById(messageId);
    });
  }

  update(message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating a message.`);

      if (!message.editor) {
        throw new Error('Invalid editor assigned to the message for the update.');
      }

      if (!message.id || !RocketChat.models.Messages.findOneById(message.id)) {
        throw new Error('A message must exist to update.');
      }

      const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      const editor = RocketChat.models.Users.findOneById(message.editor.id);
      RocketChat.updateMessage(msg, editor);
    });
  }

  notifyUser(user, message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is notifying a user.`);
      const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
      RocketChat.Notifications.notifyUser(user.id, 'message', Object.assign(msg, {
        _id: Random.id(),
        ts: new Date(),
        u: undefined,
        editor: undefined
      }));
    });
  }

  notifyRoom(room, message, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is notifying a room's users.`);

      if (room) {
        const msg = this.orch.getConverters().get('messages').convertAppMessage(message);
        const rmsg = Object.assign(msg, {
          _id: Random.id(),
          rid: room.id,
          ts: new Date(),
          u: undefined,
          editor: undefined
        });
        const users = RocketChat.models.Subscriptions.findByRoomIdWhenUserIdExists(room._id, {
          fields: {
            'u._id': 1
          }
        }).fetch().map(s => s.u._id);
        RocketChat.models.Users.findByIds(users, {
          fields: {
            _id: 1
          }
        }).fetch().forEach(({
          _id
        }) => RocketChat.Notifications.notifyUser(_id, 'message', rmsg));
      }
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"persistence.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/persistence.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppPersistenceBridge: () => AppPersistenceBridge
});

class AppPersistenceBridge {
  constructor(orch) {
    this.orch = orch;
  }

  purge(appId) {
    return Promise.asyncApply(() => {
      console.log(`The App's persistent storage is being purged: ${appId}`);
      this.orch.getPersistenceModel().remove({
        appId
      });
    });
  }

  create(data, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is storing a new object in their persistence.`, data);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      return this.orch.getPersistenceModel().insert({
        appId,
        data
      });
    });
  }

  createWithAssociations(data, associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is storing a new object in their persistence that is associated with some models.`, data, associations);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      return this.orch.getPersistenceModel().insert({
        appId,
        associations,
        data
      });
    });
  }

  readById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is reading their data in their persistence with the id: "${id}"`);
      const record = this.orch.getPersistenceModel().findOneById(id);
      return record.data;
    });
  }

  readByAssociations(associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is searching for records that are associated with the following:`, associations);
      const records = this.orch.getPersistenceModel().find({
        appId,
        associations: {
          $all: associations
        }
      }).fetch();
      return Array.isArray(records) ? records.map(r => r.data) : [];
    });
  }

  remove(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is removing one of their records by the id: "${id}"`);
      const record = this.orch.getPersistenceModel().findOne({
        _id: id,
        appId
      });

      if (!record) {
        return undefined;
      }

      this.orch.getPersistenceModel().remove({
        _id: id,
        appId
      });
      return record.data;
    });
  }

  removeByAssociations(associations, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is removing records with the following associations:`, associations);
      const query = {
        appId,
        associations: {
          $all: associations
        }
      };
      const records = this.orch.getPersistenceModel().find(query).fetch();

      if (!records) {
        return undefined;
      }

      this.orch.getPersistenceModel().remove(query);
      return Array.isArray(records) ? records.map(r => r.data) : [];
    });
  }

  update(id, data, upsert, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating the record "${id}" to:`, data);

      if (typeof data !== 'object') {
        throw new Error('Attempted to store an invalid data type, it must be an object.');
      }

      throw new Error('Not implemented.');
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/rooms.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRoomBridge: () => AppRoomBridge
});
let RoomType;
module.watch(require("@rocket.chat/apps-engine/definition/rooms"), {
  RoomType(v) {
    RoomType = v;
  }

}, 0);

class AppRoomBridge {
  constructor(orch) {
    this.orch = orch;
  }

  create(room, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is creating a new room.`, room);
      const rcRoom = this.orch.getConverters().get('rooms').convertAppRoom(room);
      let method;

      switch (room.type) {
        case RoomType.CHANNEL:
          method = 'createChannel';
          break;

        case RoomType.PRIVATE_GROUP:
          method = 'createPrivateGroup';
          break;

        default:
          throw new Error('Only channels and private groups can be created.');
      }

      let rid;
      Meteor.runAsUser(room.creator.id, () => {
        const info = Meteor.call(method, rcRoom.members);
        rid = info.rid;
      });
      return rid;
    });
  }

  getById(roomId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the roomById: "${roomId}"`);
      return this.orch.getConverters().get('rooms').convertById(roomId);
    });
  }

  getByName(roomName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the roomByName: "${roomName}"`);
      return this.orch.getConverters().get('rooms').convertByName(roomName);
    });
  }

  getCreatorById(roomId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the room's creator by id: "${roomId}"`);
      const room = RocketChat.models.Rooms.findOneById(roomId);

      if (!room || !room.u || !room.u._id) {
        return undefined;
      }

      return this.orch.getConverters().get('users').convertById(room.u._id);
    });
  }

  getCreatorByName(roomName, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the room's creator by name: "${roomName}"`);
      const room = RocketChat.models.Rooms.findOneByName(roomName);

      if (!room || !room.u || !room.u._id) {
        return undefined;
      }

      return this.orch.getConverters().get('users').convertById(room.u._id);
    });
  }

  update(room, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating a room.`);

      if (!room.id || RocketChat.models.Rooms.findOneById(room.id)) {
        throw new Error('A room must exist to update.');
      }

      const rm = this.orch.getConverters().get('rooms').convertAppRoom(room);
      RocketChat.models.Rooms.update(rm._id, rm);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/settings.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppSettingBridge: () => AppSettingBridge
});

class AppSettingBridge {
  constructor(orch) {
    this.orch = orch;
    this.allowedGroups = [];
    this.disallowedSettings = ['Accounts_RegistrationForm_SecretURL', 'CROWD_APP_USERNAME', 'CROWD_APP_PASSWORD', 'Direct_Reply_Username', 'Direct_Reply_Password', 'SMTP_Username', 'SMTP_Password', 'FileUpload_S3_AWSAccessKeyId', 'FileUpload_S3_AWSSecretAccessKey', 'FileUpload_S3_BucketURL', 'FileUpload_GoogleStorage_Bucket', 'FileUpload_GoogleStorage_AccessId', 'FileUpload_GoogleStorage_Secret', 'GoogleVision_ServiceAccount', 'Allow_Invalid_SelfSigned_Certs', 'GoogleTagManager_id', 'Bugsnag_api_key', 'LDAP_CA_Cert', 'LDAP_Reject_Unauthorized', 'LDAP_Domain_Search_User', 'LDAP_Domain_Search_Password', 'Livechat_secret_token', 'Livechat_Knowledge_Apiai_Key', 'AutoTranslate_GoogleAPIKey', 'MapView_GMapsAPIKey', 'Meta_fb_app_id', 'Meta_google-site-verification', 'Meta_msvalidate01', 'Accounts_OAuth_Dolphin_secret', 'Accounts_OAuth_Drupal_secret', 'Accounts_OAuth_Facebook_secret', 'Accounts_OAuth_Github_secret', 'API_GitHub_Enterprise_URL', 'Accounts_OAuth_GitHub_Enterprise_secret', 'API_Gitlab_URL', 'Accounts_OAuth_Gitlab_secret', 'Accounts_OAuth_Google_secret', 'Accounts_OAuth_Linkedin_secret', 'Accounts_OAuth_Meteor_secret', 'Accounts_OAuth_Twitter_secret', 'API_Wordpress_URL', 'Accounts_OAuth_Wordpress_secret', 'Push_apn_passphrase', 'Push_apn_key', 'Push_apn_cert', 'Push_apn_dev_passphrase', 'Push_apn_dev_key', 'Push_apn_dev_cert', 'Push_gcm_api_key', 'Push_gcm_project_number', 'SAML_Custom_Default_cert', 'SAML_Custom_Default_private_key', 'SlackBridge_APIToken', 'Smarsh_Email', 'SMS_Twilio_Account_SID', 'SMS_Twilio_authToken'];
  }

  getAll(appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting all the settings.`);
      return RocketChat.models.Settings.find({
        _id: {
          $nin: this.disallowedSettings
        }
      }).fetch().map(s => this.orch.getConverters().get('settings').convertToApp(s));
    });
  }

  getOneById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the setting by id ${id}.`);

      if (!this.isReadableById(id, appId)) {
        throw new Error(`The setting "${id}" is not readable.`);
      }

      return this.orch.getConverters().get('settings').convertById(id);
    });
  }

  hideGroup(name, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is hidding the group ${name}.`);
      throw new Error('Method not implemented.');
    });
  }

  hideSetting(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is hidding the setting ${id}.`);

      if (!this.isReadableById(id, appId)) {
        throw new Error(`The setting "${id}" is not readable.`);
      }

      throw new Error('Method not implemented.');
    });
  }

  isReadableById(id, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is checking if they can read the setting ${id}.`);
      return !this.disallowedSettings.includes(id);
    });
  }

  updateOne(setting, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is updating the setting ${setting.id} .`);

      if (!this.isReadableById(setting.id, appId)) {
        throw new Error(`The setting "${setting.id}" is not readable.`);
      }

      throw new Error('Method not implemented.');
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/users.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppUserBridge: () => AppUserBridge
});

class AppUserBridge {
  constructor(orch) {
    this.orch = orch;
  }

  getById(userId, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the userId: "${userId}"`);
      return this.orch.getConverters().get('users').convertById(userId);
    });
  }

  getByUsername(username, appId) {
    return Promise.asyncApply(() => {
      console.log(`The App ${appId} is getting the username: "${username}"`);
      return this.orch.getConverters().get('users').convertByUsername(username);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/index.js                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  RealAppBridges: () => RealAppBridges,
  AppActivationBridge: () => AppActivationBridge,
  AppCommandsBridge: () => AppCommandsBridge,
  AppEnvironmentalVariableBridge: () => AppEnvironmentalVariableBridge,
  AppHttpBridge: () => AppHttpBridge,
  AppListenerBridge: () => AppListenerBridge,
  AppMessageBridge: () => AppMessageBridge,
  AppPersistenceBridge: () => AppPersistenceBridge,
  AppRoomBridge: () => AppRoomBridge,
  AppSettingBridge: () => AppSettingBridge,
  AppUserBridge: () => AppUserBridge
});
let RealAppBridges;
module.watch(require("./bridges"), {
  RealAppBridges(v) {
    RealAppBridges = v;
  }

}, 0);
let AppActivationBridge;
module.watch(require("./activation"), {
  AppActivationBridge(v) {
    AppActivationBridge = v;
  }

}, 1);
let AppCommandsBridge;
module.watch(require("./commands"), {
  AppCommandsBridge(v) {
    AppCommandsBridge = v;
  }

}, 2);
let AppEnvironmentalVariableBridge;
module.watch(require("./environmental"), {
  AppEnvironmentalVariableBridge(v) {
    AppEnvironmentalVariableBridge = v;
  }

}, 3);
let AppHttpBridge;
module.watch(require("./http"), {
  AppHttpBridge(v) {
    AppHttpBridge = v;
  }

}, 4);
let AppListenerBridge;
module.watch(require("./listeners"), {
  AppListenerBridge(v) {
    AppListenerBridge = v;
  }

}, 5);
let AppMessageBridge;
module.watch(require("./messages"), {
  AppMessageBridge(v) {
    AppMessageBridge = v;
  }

}, 6);
let AppPersistenceBridge;
module.watch(require("./persistence"), {
  AppPersistenceBridge(v) {
    AppPersistenceBridge = v;
  }

}, 7);
let AppRoomBridge;
module.watch(require("./rooms"), {
  AppRoomBridge(v) {
    AppRoomBridge = v;
  }

}, 8);
let AppSettingBridge;
module.watch(require("./settings"), {
  AppSettingBridge(v) {
    AppSettingBridge = v;
  }

}, 9);
let AppUserBridge;
module.watch(require("./users"), {
  AppUserBridge(v) {
    AppUserBridge = v;
  }

}, 10);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"api.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/api.js                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppApisBridge: () => AppApisBridge
});
let express;
module.watch(require("express"), {
  default(v) {
    express = v;
  }

}, 0);
let WebApp;
module.watch(require("meteor/webapp"), {
  WebApp(v) {
    WebApp = v;
  }

}, 1);
const apiServer = express();
WebApp.connectHandlers.use(apiServer);

class AppApisBridge {
  constructor(orch) {
    this.orch = orch;
    this.appRouters = new Map(); // apiServer.use('/api/apps', (req, res, next) => {
    // 	console.log({
    // 		method: req.method.toLowerCase(),
    // 		url: req.url,
    // 		query: req.query,
    // 		body: req.body,
    // 	});
    // 	next();
    // });

    apiServer.use('/api/apps/private/:appId/:hash', (req, res) => {
      const notFound = () => res.send(404);

      const router = this.appRouters.get(req.params.appId);

      if (router) {
        req._privateHash = req.params.hash;
        return router(req, res, notFound);
      }

      notFound();
    });
    apiServer.use('/api/apps/public/:appId', (req, res) => {
      const notFound = () => res.send(404);

      const router = this.appRouters.get(req.params.appId);

      if (router) {
        return router(req, res, notFound);
      }

      notFound();
    });
  }

  registerApi({
    api,
    computedPath,
    endpoint
  }, appId) {
    console.log(`The App ${appId} is registering the api: "${endpoint.path}" (${computedPath})`);

    this._verifyApi(api, endpoint);

    if (!this.appRouters.get(appId)) {
      this.appRouters.set(appId, express.Router()); // eslint-disable-line
    }

    const router = this.appRouters.get(appId);
    const method = api.method || 'all';
    let routePath = endpoint.path.trim();

    if (!routePath.startsWith('/')) {
      routePath = `/${routePath}`;
    }

    router[method](routePath, Meteor.bindEnvironment(this._appApiExecutor(api, endpoint, appId)));
  }

  unregisterApis(appId) {
    console.log(`The App ${appId} is unregistering all apis`);

    if (this.appRouters.get(appId)) {
      this.appRouters.delete(appId);
    }
  }

  _verifyApi(api, endpoint) {
    if (typeof api !== 'object') {
      throw new Error('Invalid Api parameter provided, it must be a valid IApi object.');
    }

    if (typeof endpoint.path !== 'string') {
      throw new Error('Invalid Api parameter provided, it must be a valid IApi object.');
    }
  }

  _appApiExecutor(api, endpoint, appId) {
    return (req, res) => {
      const request = {
        method: req.method.toLowerCase(),
        headers: req.headers,
        query: req.query || {},
        params: req.params || {},
        content: req.body,
        privateHash: req._privateHash
      };
      this.orch.getManager().getApiManager().executeApi(appId, endpoint.path, request).then(({
        status,
        headers = {},
        content
      }) => {
        res.set(headers);
        res.status(status);
        res.send(content);
      }).catch(reason => {
        // Should we handle this as an error?
        res.status(500).send(reason.message);
      });
    };
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"details.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/details.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppDetailChangesBridge: () => AppDetailChangesBridge
});

class AppDetailChangesBridge {
  constructor(orch) {
    this.orch = orch;
  }

  onAppSettingsChange(appId, setting) {
    try {
      this.orch.getNotifier().appSettingsChange(appId, setting);
    } catch (e) {
      console.warn('failed to notify about the setting change.', appId);
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"http.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/http.js                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppHttpBridge: () => AppHttpBridge
});

class AppHttpBridge {
  call(info) {
    return Promise.asyncApply(() => {
      if (!info.request.content && typeof info.request.data === 'object') {
        info.request.content = JSON.stringify(info.request.data);
      }

      console.log(`The App ${info.appId} is requesting from the outter webs:`, info);

      try {
        return HTTP.call(info.method, info.url, info.request);
      } catch (e) {
        return e.response;
      }
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"listeners.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/bridges/listeners.js                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppListenerBridge: () => AppListenerBridge
});

class AppListenerBridge {
  constructor(orch) {
    this.orch = orch;
  }

  messageEvent(inte, message) {
    return Promise.asyncApply(() => {
      const msg = this.orch.getConverters().get('messages').convertMessage(message);
      const result = Promise.await(this.orch.getManager().getListenerManager().executeListener(inte, msg));

      if (typeof result === 'boolean') {
        return result;
      } else {
        return this.orch.getConverters().get('messages').convertAppMessage(result);
      } // try {
      // } catch (e) {
      // 	console.log(`${ e.name }: ${ e.message }`);
      // 	console.log(e.stack);
      // }

    });
  }

  roomEvent(inte, room) {
    return Promise.asyncApply(() => {
      const rm = this.orch.getConverters().get('rooms').convertRoom(room);
      const result = Promise.await(this.orch.getManager().getListenerManager().executeListener(inte, rm));

      if (typeof result === 'boolean') {
        return result;
      } else {
        return this.orch.getConverters().get('rooms').convertAppRoom(result);
      } // try {
      // } catch (e) {
      // 	console.log(`${ e.name }: ${ e.message }`);
      // 	console.log(e.stack);
      // }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"communication":{"methods.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/methods.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMethods: () => AppMethods
});

const waitToLoad = function (orch) {
  return new Promise(resolve => {
    let id = setInterval(() => {
      if (orch.isEnabled() && orch.isLoaded()) {
        clearInterval(id);
        id = -1;
        resolve();
      }
    }, 100);
  });
};

const waitToUnload = function (orch) {
  return new Promise(resolve => {
    let id = setInterval(() => {
      if (!orch.isEnabled() && !orch.isLoaded()) {
        clearInterval(id);
        id = -1;
        resolve();
      }
    }, 100);
  });
};

class AppMethods {
  constructor(orch) {
    this._orch = orch;

    this._addMethods();
  }

  isEnabled() {
    return typeof this._orch !== 'undefined' && this._orch.isEnabled();
  }

  isLoaded() {
    return typeof this._orch !== 'undefined' && this._orch.isEnabled() && this._orch.isLoaded();
  }

  _addMethods() {
    const instance = this;
    Meteor.methods({
      'apps/is-enabled'() {
        return instance.isEnabled();
      },

      'apps/is-loaded'() {
        return instance.isLoaded();
      },

      'apps/go-enable'() {
        if (!Meteor.userId()) {
          throw new Meteor.Error('error-invalid-user', 'Invalid user', {
            method: 'apps/go-enable'
          });
        }

        if (!RocketChat.authz.hasPermission(Meteor.userId(), 'manage-apps')) {
          throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
            method: 'apps/go-enable'
          });
        }

        RocketChat.settings.set('Apps_Framework_enabled', true);
        Promise.await(waitToLoad(instance._orch));
      },

      'apps/go-disable'() {
        if (!Meteor.userId()) {
          throw new Meteor.Error('error-invalid-user', 'Invalid user', {
            method: 'apps/go-enable'
          });
        }

        if (!RocketChat.authz.hasPermission(Meteor.userId(), 'manage-apps')) {
          throw new Meteor.Error('error-action-not-allowed', 'Not allowed', {
            method: 'apps/go-enable'
          });
        }

        RocketChat.settings.set('Apps_Framework_enabled', false);
        Promise.await(waitToUnload(instance._orch));
      }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rest.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/rest.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppsRestApi: () => AppsRestApi
});
let Busboy;
module.watch(require("busboy"), {
  default(v) {
    Busboy = v;
  }

}, 0);

class AppsRestApi {
  constructor(orch, manager) {
    this._orch = orch;
    this._manager = manager;
    this.api = new RocketChat.API.ApiClass({
      version: 'apps',
      useDefaultAuth: true,
      prettyJson: false,
      enableCors: false,
      auth: RocketChat.API.getUserAuth()
    });
    this.addManagementRoutes();
  }

  _handleFile(request, fileField) {
    const busboy = new Busboy({
      headers: request.headers
    });
    return Meteor.wrapAsync(callback => {
      busboy.on('file', Meteor.bindEnvironment((fieldname, file) => {
        if (fieldname !== fileField) {
          return callback(new Meteor.Error('invalid-field', `Expected the field "${fileField}" but got "${fieldname}" instead.`));
        }

        const fileData = [];
        file.on('data', Meteor.bindEnvironment(data => {
          fileData.push(data);
        }));
        file.on('end', Meteor.bindEnvironment(() => callback(undefined, Buffer.concat(fileData))));
      }));
      request.pipe(busboy);
    })();
  }

  addManagementRoutes() {
    const orchestrator = this._orch;
    const manager = this._manager;
    const fileHandler = this._handleFile;
    this.api.addRoute('', {
      authRequired: true
    }, {
      get() {
        const apps = manager.get().map(prl => {
          const info = prl.getInfo();
          info.languages = prl.getStorageItem().languageContent;
          info.status = prl.getStatus();
          return info;
        });
        return RocketChat.API.v1.success({
          apps
        });
      },

      post() {
        let buff;

        if (this.bodyParams.url) {
          const result = HTTP.call('GET', this.bodyParams.url, {
            npmRequestOptions: {
              encoding: 'base64'
            }
          });

          if (result.statusCode !== 200 || !result.headers['content-type'] || result.headers['content-type'] !== 'application/zip') {
            return RocketChat.API.v1.failure({
              error: 'Invalid url. It doesn\'t exist or is not "application/zip".'
            });
          }

          buff = Buffer.from(result.content, 'base64');
        } else {
          buff = fileHandler(this.request, 'app');
        }

        if (!buff) {
          return RocketChat.API.v1.failure({
            error: 'Failed to get a file to install for the App. '
          });
        }

        const aff = Promise.await(manager.add(buff.toString('base64'), false));
        const info = aff.getAppInfo(); // If there are compiler errors, there won't be an App to get the status of

        if (aff.getApp()) {
          info.status = aff.getApp().getStatus();
        } else {
          info.status = 'compiler_error';
        }

        return RocketChat.API.v1.success({
          app: info,
          implemented: aff.getImplementedInferfaces(),
          compilerErrors: aff.getCompilerErrors()
        });
      }

    });
    this.api.addRoute('languages', {
      authRequired: false
    }, {
      get() {
        const apps = manager.get().map(prl => ({
          id: prl.getID(),
          languages: prl.getStorageItem().languageContent
        }));
        return RocketChat.API.v1.success({
          apps
        });
      }

    });
    this.api.addRoute(':id', {
      authRequired: true
    }, {
      get() {
        console.log('Getting:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const info = prl.getInfo();
          info.status = prl.getStatus();
          return RocketChat.API.v1.success({
            app: info
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        console.log('Updating:', this.urlParams.id); // TODO: Verify permissions

        let buff;

        if (this.bodyParams.url) {
          const result = HTTP.call('GET', this.bodyParams.url, {
            npmRequestOptions: {
              encoding: 'base64'
            }
          });

          if (result.statusCode !== 200 || !result.headers['content-type'] || result.headers['content-type'] !== 'application/zip') {
            return RocketChat.API.v1.failure({
              error: 'Invalid url. It doesn\'t exist or is not "application/zip".'
            });
          }

          buff = Buffer.from(result.content, 'base64');
        } else {
          buff = fileHandler(this.request, 'app');
        }

        if (!buff) {
          return RocketChat.API.v1.failure({
            error: 'Failed to get a file to install for the App. '
          });
        }

        const aff = Promise.await(manager.update(buff.toString('base64')));
        const info = aff.getAppInfo(); // Should the updated version have compiler errors, no App will be returned

        if (aff.getApp()) {
          info.status = aff.getApp().getStatus();
        } else {
          info.status = 'compiler_error';
        }

        return RocketChat.API.v1.success({
          app: info,
          implemented: aff.getImplementedInferfaces(),
          compilerErrors: aff.getCompilerErrors()
        });
      },

      delete() {
        console.log('Uninstalling:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          Promise.await(manager.remove(prl.getID()));
          const info = prl.getInfo();
          info.status = prl.getStatus();
          return RocketChat.API.v1.success({
            app: info
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/icon', {
      authRequired: true
    }, {
      get() {
        console.log('Getting the App\'s Icon:', this.urlParams.id);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const info = prl.getInfo();
          return RocketChat.API.v1.success({
            iconFileContent: info.iconFileContent
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/languages', {
      authRequired: false
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s languages..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const languages = prl.getStorageItem().languageContent || {};
          return RocketChat.API.v1.success({
            languages
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/logs', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s logs..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const {
            offset,
            count
          } = this.getPaginationItems();
          const {
            sort,
            fields,
            query
          } = this.parseJsonQuery();
          const ourQuery = Object.assign({}, query, {
            appId: prl.getID()
          });
          const options = {
            sort: sort ? sort : {
              _updatedAt: -1
            },
            skip: offset,
            limit: count,
            fields
          };
          const logs = Promise.await(orchestrator.getLogStorage().find(ourQuery, options));
          return RocketChat.API.v1.success({
            logs
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/settings', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s settings..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const settings = Object.assign({}, prl.getStorageItem().settings);
          Object.keys(settings).forEach(k => {
            if (settings[k].hidden) {
              delete settings[k];
            }
          });
          return RocketChat.API.v1.success({
            settings
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        console.log(`Updating ${this.urlParams.id}'s settings..`);

        if (!this.bodyParams || !this.bodyParams.settings) {
          return RocketChat.API.v1.failure('The settings to update must be present.');
        }

        const prl = manager.getOneById(this.urlParams.id);

        if (!prl) {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }

        const {
          settings
        } = prl.getStorageItem();
        const updated = [];
        this.bodyParams.settings.forEach(s => {
          if (settings[s.id]) {
            Promise.await(manager.getSettingsManager().updateAppSetting(this.urlParams.id, s)); // Updating?

            updated.push(s);
          }
        });
        return RocketChat.API.v1.success({
          updated
        });
      }

    });
    this.api.addRoute(':id/settings/:settingId', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting the App ${this.urlParams.id}'s setting ${this.urlParams.settingId}`);

        try {
          const setting = manager.getSettingsManager().getAppSetting(this.urlParams.id, this.urlParams.settingId);
          RocketChat.API.v1.success({
            setting
          });
        } catch (e) {
          if (e.message.includes('No setting found')) {
            return RocketChat.API.v1.notFound(`No Setting found on the App by the id of: "${this.urlParams.settingId}"`);
          } else if (e.message.includes('No App found')) {
            return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
          } else {
            return RocketChat.API.v1.failure(e.message);
          }
        }
      },

      post() {
        console.log(`Updating the App ${this.urlParams.id}'s setting ${this.urlParams.settingId}`);

        if (!this.bodyParams.setting) {
          return RocketChat.API.v1.failure('Setting to update to must be present on the posted body.');
        }

        try {
          Promise.await(manager.getSettingsManager().updateAppSetting(this.urlParams.id, this.bodyParams.setting));
          return RocketChat.API.v1.success();
        } catch (e) {
          if (e.message.includes('No setting found')) {
            return RocketChat.API.v1.notFound(`No Setting found on the App by the id of: "${this.urlParams.settingId}"`);
          } else if (e.message.includes('No App found')) {
            return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
          } else {
            return RocketChat.API.v1.failure(e.message);
          }
        }
      }

    });
    this.api.addRoute(':id/apis', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s apis..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          return RocketChat.API.v1.success({
            apis: manager.apiManager.listApis(this.urlParams.id)
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
    this.api.addRoute(':id/status', {
      authRequired: true
    }, {
      get() {
        console.log(`Getting ${this.urlParams.id}'s status..`);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          return RocketChat.API.v1.success({
            status: prl.getStatus()
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      },

      post() {
        if (!this.bodyParams.status || typeof this.bodyParams.status !== 'string') {
          return RocketChat.API.v1.failure('Invalid status provided, it must be "status" field and a string.');
        }

        console.log(`Updating ${this.urlParams.id}'s status...`, this.bodyParams.status);
        const prl = manager.getOneById(this.urlParams.id);

        if (prl) {
          const result = Promise.await(manager.changeStatus(prl.getID(), this.bodyParams.status));
          return RocketChat.API.v1.success({
            status: result.getStatus()
          });
        } else {
          return RocketChat.API.v1.notFound(`No App found by the id of: ${this.urlParams.id}`);
        }
      }

    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"websockets.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/websockets.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppEvents: () => AppEvents,
  AppServerListener: () => AppServerListener,
  AppServerNotifier: () => AppServerNotifier
});
let AppStatus, AppStatusUtils;
module.watch(require("@rocket.chat/apps-engine/definition/AppStatus"), {
  AppStatus(v) {
    AppStatus = v;
  },

  AppStatusUtils(v) {
    AppStatusUtils = v;
  }

}, 0);
const AppEvents = Object.freeze({
  APP_ADDED: 'app/added',
  APP_REMOVED: 'app/removed',
  APP_UPDATED: 'app/updated',
  APP_STATUS_CHANGE: 'app/statusUpdate',
  APP_SETTING_UPDATED: 'app/settingUpdated',
  COMMAND_ADDED: 'command/added',
  COMMAND_DISABLED: 'command/disabled',
  COMMAND_UPDATED: 'command/updated',
  COMMAND_REMOVED: 'command/removed'
});

class AppServerListener {
  constructor(orch, engineStreamer, clientStreamer, received) {
    this.orch = orch;
    this.engineStreamer = engineStreamer;
    this.clientStreamer = clientStreamer;
    this.received = received;
    this.engineStreamer.on(AppEvents.APP_ADDED, this.onAppAdded.bind(this));
    this.engineStreamer.on(AppEvents.APP_STATUS_CHANGE, this.onAppStatusUpdated.bind(this));
    this.engineStreamer.on(AppEvents.APP_SETTING_UPDATED, this.onAppSettingUpdated.bind(this));
    this.engineStreamer.on(AppEvents.APP_REMOVED, this.onAppRemoved.bind(this));
    this.engineStreamer.on(AppEvents.APP_UPDATED, this.onAppUpdated.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_ADDED, this.onCommandAdded.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_DISABLED, this.onCommandDisabled.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_UPDATED, this.onCommandUpdated.bind(this));
    this.engineStreamer.on(AppEvents.COMMAND_REMOVED, this.onCommandRemoved.bind(this));
  }

  onAppAdded(appId) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getManager().loadOne(appId));
      this.clientStreamer.emit(AppEvents.APP_ADDED, appId);
    });
  }

  onAppStatusUpdated({
    appId,
    status
  }) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_STATUS_CHANGE}_${appId}`, {
        appId,
        status,
        when: new Date()
      });

      if (AppStatusUtils.isEnabled(status)) {
        Promise.await(this.orch.getManager().enable(appId));
        this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
          appId,
          status
        });
      } else if (AppStatusUtils.isDisabled(status)) {
        Promise.await(this.orch.getManager().disable(appId, AppStatus.MANUALLY_DISABLED === status));
        this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
          appId,
          status
        });
      }
    });
  }

  onAppSettingUpdated({
    appId,
    setting
  }) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`, {
        appId,
        setting,
        when: new Date()
      });
      Promise.await(this.orch.getManager().getSettingsManager().updateAppSetting(appId, setting));
      this.clientStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId
      });
    });
  }

  onAppUpdated(appId) {
    return Promise.asyncApply(() => {
      this.received.set(`${AppEvents.APP_UPDATED}_${appId}`, {
        appId,
        when: new Date()
      });
      const storageItem = Promise.await(this.orch.getStorage().retrieveOne(appId));
      Promise.await(this.orch.getManager().update(storageItem.zip));
      this.clientStreamer.emit(AppEvents.APP_UPDATED, appId);
    });
  }

  onAppRemoved(appId) {
    return Promise.asyncApply(() => {
      Promise.await(this.orch.getManager().remove(appId));
      this.clientStreamer.emit(AppEvents.APP_REMOVED, appId);
    });
  }

  onCommandAdded(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_ADDED, command);
    });
  }

  onCommandDisabled(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_DISABLED, command);
    });
  }

  onCommandUpdated(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_UPDATED, command);
    });
  }

  onCommandRemoved(command) {
    return Promise.asyncApply(() => {
      this.clientStreamer.emit(AppEvents.COMMAND_REMOVED, command);
    });
  }

}

class AppServerNotifier {
  constructor(orch) {
    this.engineStreamer = new Meteor.Streamer('apps-engine', {
      retransmit: false
    });
    this.engineStreamer.serverOnly = true;
    this.engineStreamer.allowRead('none');
    this.engineStreamer.allowEmit('all');
    this.engineStreamer.allowWrite('none'); // This is used to broadcast to the web clients

    this.clientStreamer = new Meteor.Streamer('apps', {
      retransmit: false
    });
    this.clientStreamer.serverOnly = true;
    this.clientStreamer.allowRead('all');
    this.clientStreamer.allowEmit('all');
    this.clientStreamer.allowWrite('none');
    this.received = new Map();
    this.listener = new AppServerListener(orch, this.engineStreamer, this.clientStreamer, this.received);
  }

  appAdded(appId) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.APP_ADDED, appId);
      this.clientStreamer.emit(AppEvents.APP_ADDED, appId);
    });
  }

  appRemoved(appId) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.APP_REMOVED, appId);
      this.clientStreamer.emit(AppEvents.APP_REMOVED, appId);
    });
  }

  appUpdated(appId) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_UPDATED}_${appId}`)) {
        this.received.delete(`${AppEvents.APP_UPDATED}_${appId}`);
        return;
      }

      this.engineStreamer.emit(AppEvents.APP_UPDATED, appId);
      this.clientStreamer.emit(AppEvents.APP_UPDATED, appId);
    });
  }

  appStatusUpdated(appId, status) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_STATUS_CHANGE}_${appId}`)) {
        const details = this.received.get(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);

        if (details.status === status) {
          this.received.delete(`${AppEvents.APP_STATUS_CHANGE}_${appId}`);
          return;
        }
      }

      this.engineStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
        appId,
        status
      });
      this.clientStreamer.emit(AppEvents.APP_STATUS_CHANGE, {
        appId,
        status
      });
    });
  }

  appSettingsChange(appId, setting) {
    return Promise.asyncApply(() => {
      if (this.received.has(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`)) {
        this.received.delete(`${AppEvents.APP_SETTING_UPDATED}_${appId}_${setting.id}`);
        return;
      }

      this.engineStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId,
        setting
      });
      this.clientStreamer.emit(AppEvents.APP_SETTING_UPDATED, {
        appId
      });
    });
  }

  commandAdded(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_ADDED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_ADDED, command);
    });
  }

  commandDisabled(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_DISABLED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_DISABLED, command);
    });
  }

  commandUpdated(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_UPDATED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_UPDATED, command);
    });
  }

  commandRemoved(command) {
    return Promise.asyncApply(() => {
      this.engineStreamer.emit(AppEvents.COMMAND_REMOVED, command);
      this.clientStreamer.emit(AppEvents.COMMAND_REMOVED, command);
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/communication/index.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMethods: () => AppMethods,
  AppsRestApi: () => AppsRestApi,
  AppEvents: () => AppEvents,
  AppServerNotifier: () => AppServerNotifier,
  AppServerListener: () => AppServerListener
});
let AppMethods;
module.watch(require("./methods"), {
  AppMethods(v) {
    AppMethods = v;
  }

}, 0);
let AppsRestApi;
module.watch(require("./rest"), {
  AppsRestApi(v) {
    AppsRestApi = v;
  }

}, 1);
let AppEvents, AppServerNotifier, AppServerListener;
module.watch(require("./websockets"), {
  AppEvents(v) {
    AppEvents = v;
  },

  AppServerNotifier(v) {
    AppServerNotifier = v;
  },

  AppServerListener(v) {
    AppServerListener = v;
  }

}, 2);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"converters":{"messages.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/messages.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessagesConverter: () => AppMessagesConverter
});

class AppMessagesConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(msgId) {
    const msg = RocketChat.models.Messages.getOneById(msgId);
    return this.convertMessage(msg);
  }

  convertMessage(msgObj) {
    if (!msgObj) {
      return undefined;
    }

    const room = this.orch.getConverters().get('rooms').convertById(msgObj.rid);
    let sender;

    if (msgObj.u && msgObj.u._id) {
      sender = this.orch.getConverters().get('users').convertById(msgObj.u._id);

      if (!sender) {
        sender = this.orch.getConverters().get('users').convertToApp(msgObj.u);
      }
    }

    let editor;

    if (msgObj.editedBy) {
      editor = this.orch.getConverters().get('users').convertById(msgObj.editedBy._id);
    }

    const attachments = this._convertAttachmentsToApp(msgObj.attachments);

    return {
      id: msgObj._id,
      room,
      sender,
      text: msgObj.msg,
      createdAt: msgObj.ts,
      updatedAt: msgObj._updatedAt,
      editor,
      editedAt: msgObj.editedAt,
      emoji: msgObj.emoji,
      avatarUrl: msgObj.avatar,
      alias: msgObj.alias,
      customFields: msgObj.customFields,
      groupable: msgObj.groupable,
      attachments,
      reactions: msgObj.reactions
    };
  }

  convertAppMessage(message) {
    if (!message) {
      return undefined;
    }

    const room = RocketChat.models.Rooms.findOneById(message.room.id);

    if (!room) {
      throw new Error('Invalid room provided on the message.');
    }

    let u;

    if (message.sender && message.sender.id) {
      const user = RocketChat.models.Users.findOneById(message.sender.id);

      if (user) {
        u = {
          _id: user._id,
          username: user.username,
          name: user.name
        };
      } else {
        u = {
          _id: message.sender.id,
          username: message.sender.username,
          name: message.sender.name
        };
      }
    }

    let editedBy;

    if (message.editor) {
      const editor = RocketChat.models.Users.findOneById(message.editor.id);
      editedBy = {
        _id: editor._id,
        username: editor.username
      };
    }

    const attachments = this._convertAppAttachments(message.attachments);

    return {
      _id: message.id || Random.id(),
      rid: room._id,
      u,
      msg: message.text,
      ts: message.createdAt || new Date(),
      _updatedAt: message.updatedAt || new Date(),
      editedBy,
      editedAt: message.editedAt,
      emoji: message.emoji,
      avatar: message.avatarUrl,
      alias: message.alias,
      customFields: message.customFields,
      groupable: message.groupable,
      attachments,
      reactions: message.reactions
    };
  }

  _convertAppAttachments(attachments) {
    if (typeof attachments === 'undefined' || !Array.isArray(attachments)) {
      return undefined;
    }

    return attachments.map(attachment => ({
      collapsed: attachment.collapsed,
      color: attachment.color,
      text: attachment.text,
      ts: attachment.timestamp,
      message_link: attachment.timestampLink,
      thumb_url: attachment.thumbnailUrl,
      author_name: attachment.author ? attachment.author.name : undefined,
      author_link: attachment.author ? attachment.author.link : undefined,
      author_icon: attachment.author ? attachment.author.icon : undefined,
      title: attachment.title ? attachment.title.value : undefined,
      title_link: attachment.title ? attachment.title.link : undefined,
      title_link_download: attachment.title ? attachment.title.displayDownloadLink : undefined,
      image_url: attachment.imageUrl,
      audio_url: attachment.audioUrl,
      video_url: attachment.videoUrl,
      fields: attachment.fields,
      actions: attachment.actions,
      type: attachment.type,
      description: attachment.description
    })).map(a => {
      Object.keys(a).forEach(k => {
        if (typeof a[k] === 'undefined') {
          delete a[k];
        }
      });
      return a;
    });
  }

  _convertAttachmentsToApp(attachments) {
    if (typeof attachments === 'undefined' || !Array.isArray(attachments)) {
      return undefined;
    }

    return attachments.map(attachment => {
      let author;

      if (attachment.author_name || attachment.author_link || attachment.author_icon) {
        author = {
          name: attachment.author_name,
          link: attachment.author_link,
          icon: attachment.author_icon
        };
      }

      let title;

      if (attachment.title || attachment.title_link || attachment.title_link_download) {
        title = {
          value: attachment.title,
          link: attachment.title_link,
          displayDownloadLink: attachment.title_link_download
        };
      }

      return {
        collapsed: attachment.collapsed,
        color: attachment.color,
        text: attachment.text,
        timestamp: attachment.ts,
        timestampLink: attachment.message_link,
        thumbnailUrl: attachment.thumb_url,
        author,
        title,
        imageUrl: attachment.image_url,
        audioUrl: attachment.audio_url,
        videoUrl: attachment.video_url,
        fields: attachment.fields,
        actions: attachment.actions,
        type: attachment.type,
        description: attachment.description
      };
    });
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"rooms.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/rooms.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppRoomsConverter: () => AppRoomsConverter
});
let RoomType;
module.watch(require("@rocket.chat/apps-engine/definition/rooms"), {
  RoomType(v) {
    RoomType = v;
  }

}, 0);

class AppRoomsConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(roomId) {
    const room = RocketChat.models.Rooms.findOneById(roomId);
    return this.convertRoom(room);
  }

  convertByName(roomName) {
    const room = RocketChat.models.Rooms.findOneByName(roomName);
    return this.convertRoom(room);
  }

  convertAppRoom(room) {
    if (!room) {
      return undefined;
    }

    let u;

    if (room.creator) {
      const creator = RocketChat.models.Users.findOneById(room.creator.id);
      u = {
        _id: creator._id,
        username: creator.username
      };
    }

    return {
      _id: room.id,
      fname: room.displayName,
      name: room.slugifiedName,
      t: room.type,
      u,
      members: room.members,
      default: typeof room.isDefault === 'undefined' ? false : room.isDefault,
      ro: typeof room.isReadOnly === 'undefined' ? false : room.isReadOnly,
      sysMes: typeof room.displaySystemMessages === 'undefined' ? true : room.displaySystemMessages,
      msgs: room.messageCount || 0,
      ts: room.createdAt,
      _updatedAt: room.updatedAt,
      lm: room.lastModifiedAt
    };
  }

  convertRoom(room) {
    if (!room) {
      return undefined;
    }

    let creator;

    if (room.u) {
      creator = this.orch.getConverters().get('users').convertById(room.u._id);
    }

    return {
      id: room._id,
      displayName: room.fname,
      slugifiedName: room.name,
      type: this._convertTypeToApp(room.t),
      creator,
      members: room.members,
      isDefault: typeof room.default === 'undefined' ? false : room.default,
      isReadOnly: typeof room.ro === 'undefined' ? false : room.ro,
      displaySystemMessages: typeof room.sysMes === 'undefined' ? true : room.sysMes,
      messageCount: room.msgs,
      createdAt: room.ts,
      updatedAt: room._updatedAt,
      lastModifiedAt: room.lm,
      customFields: {}
    };
  }

  _convertTypeToApp(typeChar) {
    switch (typeChar) {
      case 'c':
        return RoomType.CHANNEL;

      case 'p':
        return RoomType.PRIVATE_GROUP;

      case 'd':
        return RoomType.DIRECT_MESSAGE;

      case 'lc':
        return RoomType.LIVE_CHAT;

      default:
        return typeChar;
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/settings.js                                                             //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppSettingsConverter: () => AppSettingsConverter
});
let SettingType;
module.watch(require("@rocket.chat/apps-engine/definition/settings"), {
  SettingType(v) {
    SettingType = v;
  }

}, 0);

class AppSettingsConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(settingId) {
    const setting = RocketChat.models.Settings.findOneNotHiddenById(settingId);
    return this.convertToApp(setting);
  }

  convertToApp(setting) {
    return {
      id: setting._id,
      type: this._convertTypeToApp(setting.type),
      packageValue: setting.packageValue,
      values: setting.values,
      value: setting.value,
      public: setting.public,
      hidden: setting.hidden,
      group: setting.group,
      i18nLabel: setting.i18nLabel,
      i18nDescription: setting.i18nDescription,
      createdAt: setting.ts,
      updatedAt: setting._updatedAt
    };
  }

  _convertTypeToApp(type) {
    switch (type) {
      case 'boolean':
        return SettingType.BOOLEAN;

      case 'code':
        return SettingType.CODE;

      case 'color':
        return SettingType.COLOR;

      case 'font':
        return SettingType.FONT;

      case 'int':
        return SettingType.NUMBER;

      case 'select':
        return SettingType.SELECT;

      case 'string':
        return SettingType.STRING;

      default:
        return type;
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"users.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/users.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppUsersConverter: () => AppUsersConverter
});
let UserStatusConnection, UserType;
module.watch(require("@rocket.chat/apps-engine/definition/users"), {
  UserStatusConnection(v) {
    UserStatusConnection = v;
  },

  UserType(v) {
    UserType = v;
  }

}, 0);

class AppUsersConverter {
  constructor(orch) {
    this.orch = orch;
  }

  convertById(userId) {
    const user = RocketChat.models.Users.findOneById(userId);
    return this.convertToApp(user);
  }

  convertByUsername(username) {
    const user = RocketChat.models.Users.findOneByUsername(username);
    return this.convertToApp(user);
  }

  convertToApp(user) {
    if (!user) {
      return undefined;
    }

    const type = this._convertUserTypeToEnum(user.type);

    const statusConnection = this._convertStatusConnectionToEnum(user.username, user._id, user.statusConnection);

    return {
      id: user._id,
      username: user.username,
      emails: user.emails,
      type,
      isEnabled: user.active,
      name: user.name,
      roles: user.roles,
      status: user.status,
      statusConnection,
      utcOffset: user.utcOffset,
      createdAt: user.createdAt,
      updatedAt: user._updatedAt,
      lastLoginAt: user.lastLogin
    };
  }

  _convertUserTypeToEnum(type) {
    switch (type) {
      case 'user':
        return UserType.USER;

      case 'bot':
        return UserType.BOT;

      case '':
      case undefined:
        return UserType.UNKNOWN;

      default:
        console.warn(`A new user type has been added that the Apps don't know about? "${type}"`);
        return type.toUpperCase();
    }
  }

  _convertStatusConnectionToEnum(username, userId, status) {
    switch (status) {
      case 'offline':
        return UserStatusConnection.OFFLINE;

      case 'online':
        return UserStatusConnection.ONLINE;

      case 'away':
        return UserStatusConnection.AWAY;

      case 'busy':
        return UserStatusConnection.BUSY;

      case undefined:
        // This is needed for Livechat guests and Rocket.Cat user.
        return UserStatusConnection.UNDEFINED;

      default:
        console.warn(`The user ${username} (${userId}) does not have a valid status (offline, online, away, or busy). It is currently: "${status}"`);
        return !status ? UserStatusConnection.OFFLINE : status.toUpperCase();
    }
  }

}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/converters/index.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  AppMessagesConverter: () => AppMessagesConverter,
  AppRoomsConverter: () => AppRoomsConverter,
  AppSettingsConverter: () => AppSettingsConverter,
  AppUsersConverter: () => AppUsersConverter
});
let AppMessagesConverter;
module.watch(require("./messages"), {
  AppMessagesConverter(v) {
    AppMessagesConverter = v;
  }

}, 0);
let AppRoomsConverter;
module.watch(require("./rooms"), {
  AppRoomsConverter(v) {
    AppRoomsConverter = v;
  }

}, 1);
let AppSettingsConverter;
module.watch(require("./settings"), {
  AppSettingsConverter(v) {
    AppSettingsConverter = v;
  }

}, 2);
let AppUsersConverter;
module.watch(require("./users"), {
  AppUsersConverter(v) {
    AppUsersConverter = v;
  }

}, 3);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"orchestrator.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_apps/server/orchestrator.js                                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let RealAppBridges;
module.watch(require("./bridges"), {
  RealAppBridges(v) {
    RealAppBridges = v;
  }

}, 0);
let AppMethods, AppsRestApi, AppServerNotifier;
module.watch(require("./communication"), {
  AppMethods(v) {
    AppMethods = v;
  },

  AppsRestApi(v) {
    AppsRestApi = v;
  },

  AppServerNotifier(v) {
    AppServerNotifier = v;
  }

}, 1);
let AppMessagesConverter, AppRoomsConverter, AppSettingsConverter, AppUsersConverter;
module.watch(require("./converters"), {
  AppMessagesConverter(v) {
    AppMessagesConverter = v;
  },

  AppRoomsConverter(v) {
    AppRoomsConverter = v;
  },

  AppSettingsConverter(v) {
    AppSettingsConverter = v;
  },

  AppUsersConverter(v) {
    AppUsersConverter = v;
  }

}, 2);
let AppsLogsModel, AppsModel, AppsPersistenceModel, AppRealStorage, AppRealLogsStorage;
module.watch(require("./storage"), {
  AppsLogsModel(v) {
    AppsLogsModel = v;
  },

  AppsModel(v) {
    AppsModel = v;
  },

  AppsPersistenceModel(v) {
    AppsPersistenceModel = v;
  },

  AppRealStorage(v) {
    AppRealStorage = v;
  },

  AppRealLogsStorage(v) {
    AppRealLogsStorage = v;
  }

}, 3);
let AppManager;
module.watch(require("@rocket.chat/apps-engine/server/AppManager"), {
  AppManager(v) {
    AppManager = v;
  }

}, 4);

class AppServerOrchestrator {
  constructor() {
    if (RocketChat.models && RocketChat.models.Permissions) {
      RocketChat.models.Permissions.createOrUpdate('manage-apps', ['admin']);
    }

    this._model = new AppsModel();
    this._logModel = new AppsLogsModel();
    this._persistModel = new AppsPersistenceModel();
    this._storage = new AppRealStorage(this._model);
    this._logStorage = new AppRealLogsStorage(this._logModel);
    this._converters = new Map();

    this._converters.set('messages', new AppMessagesConverter(this));

    this._converters.set('rooms', new AppRoomsConverter(this));

    this._converters.set('settings', new AppSettingsConverter(this));

    this._converters.set('users', new AppUsersConverter(this));

    this._bridges = new RealAppBridges(this);
    this._manager = new AppManager(this._storage, this._logStorage, this._bridges);
    this._communicators = new Map();

    this._communicators.set('methods', new AppMethods(this));

    this._communicators.set('notifier', new AppServerNotifier(this));

    this._communicators.set('restapi', new AppsRestApi(this, this._manager));
  }

  getModel() {
    return this._model;
  }

  getPersistenceModel() {
    return this._persistModel;
  }

  getStorage() {
    return this._storage;
  }

  getLogStorage() {
    return this._logStorage;
  }

  getConverters() {
    return this._converters;
  }

  getBridges() {
    return this._bridges;
  }

  getNotifier() {
    return this._communicators.get('notifier');
  }

  getManager() {
    return this._manager;
  }

  isEnabled() {
    return RocketChat.settings.get('Apps_Framework_enabled');
  }

  isLoaded() {
    return this.getManager().areAppsLoaded();
  }

  load() {
    // Don't try to load it again if it has
    // already been loaded
    if (this.isLoaded()) {
      return;
    }

    this._manager.load().then(affs => console.log(`Loaded the Apps Framework and loaded a total of ${affs.length} Apps!`)).catch(err => console.warn('Failed to load the Apps Framework and Apps!', err));
  }

  unload() {
    // Don't try to unload it if it's already been
    // unlaoded or wasn't unloaded to start with
    if (!this.isLoaded()) {
      return;
    }

    this._manager.unload().then(() => console.log('Unloaded the Apps Framework.')).catch(err => console.warn('Failed to unload the Apps Framework!', err));
  }

}

RocketChat.settings.addGroup('General', function () {
  this.section('Apps', function () {
    this.add('Apps_Framework_enabled', true, {
      type: 'boolean',
      hidden: false
    });
  });
});
RocketChat.settings.get('Apps_Framework_enabled', (key, isEnabled) => {
  // In case this gets called before `Meteor.startup`
  if (!global.Apps) {
    return;
  }

  if (isEnabled) {
    global.Apps.load();
  } else {
    global.Apps.unload();
  }
});
Meteor.startup(function _appServerOrchestrator() {
  global.Apps = new AppServerOrchestrator();

  if (global.Apps.isEnabled()) {
    global.Apps.load();
  }
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:apps/lib/Apps.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-logs-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/apps-persistence-model.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/storage.js");
require("/node_modules/meteor/rocketchat:apps/server/storage/index.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/activation.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/bridges.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/commands.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/environmental.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/messages.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/persistence.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/rooms.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/settings.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/users.js");
require("/node_modules/meteor/rocketchat:apps/server/bridges/index.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/methods.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/rest.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/websockets.js");
require("/node_modules/meteor/rocketchat:apps/server/communication/index.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/messages.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/rooms.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/settings.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/users.js");
require("/node_modules/meteor/rocketchat:apps/server/converters/index.js");
require("/node_modules/meteor/rocketchat:apps/server/orchestrator.js");

/* Exports */
Package._define("rocketchat:apps", {
  Apps: Apps
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_apps.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL2xpYi9BcHBzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvbGliL21pc2MvVXRpbGl0aWVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvYXBwcy1sb2dzLW1vZGVsLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvYXBwcy1tb2RlbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9zdG9yYWdlL2FwcHMtcGVyc2lzdGVuY2UtbW9kZWwuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvc3RvcmFnZS9zdG9yYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL3N0b3JhZ2UvaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvc3RvcmFnZS9sb2dzLXN0b3JhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9hY3RpdmF0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvYnJpZGdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL2NvbW1hbmRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvZW52aXJvbm1lbnRhbC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL21lc3NhZ2VzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvcGVyc2lzdGVuY2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9yb29tcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvdXNlcnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL2FwaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9icmlkZ2VzL2RldGFpbHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvYnJpZGdlcy9odHRwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2JyaWRnZXMvbGlzdGVuZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbW11bmljYXRpb24vbWV0aG9kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb21tdW5pY2F0aW9uL3Jlc3QuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29tbXVuaWNhdGlvbi93ZWJzb2NrZXRzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbW11bmljYXRpb24vaW5kZXguanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29udmVydGVycy9tZXNzYWdlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb252ZXJ0ZXJzL3Jvb21zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL2NvbnZlcnRlcnMvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXBwcy9zZXJ2ZXIvY29udmVydGVycy91c2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphcHBzL3NlcnZlci9jb252ZXJ0ZXJzL2luZGV4LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmFwcHMvc2VydmVyL29yY2hlc3RyYXRvci5qcyJdLCJuYW1lcyI6WyJBcHBzIiwibW9kdWxlIiwiZXhwb3J0IiwiVXRpbGl0aWVzIiwiZ2V0STE4bktleUZvckFwcCIsImtleSIsImFwcElkIiwiY3VybCIsIm1ldGhvZCIsInBhcmFtcyIsImF1dGgiLCJoZWFkZXJzIiwidXJsIiwicXVlcnkiLCJjb250ZW50Iiwib3B0cyIsIm5ld0xpbmUiLCJjbWQiLCJ2ZXJib3NlIiwicHVzaCIsInRvVXBwZXJDYXNlIiwidSIsIk9iamVjdCIsImVudHJpZXMiLCJmb3JFYWNoIiwidmFsdWUiLCJyZXBsYWNlIiwicXVlcnlTdHJpbmciLCJtYXAiLCJqb2luIiwiaGVhZGVyS2V5cyIsInZhbCIsInRvTG93ZXJDYXNlIiwiaW5jbHVkZXMiLCJKU09OIiwic3RyaW5naWZ5IiwiQXBwc0xvZ3NNb2RlbCIsIlJvY2tldENoYXQiLCJtb2RlbHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwiQXBwc01vZGVsIiwiQXBwc1BlcnNpc3RlbmNlTW9kZWwiLCJBcHBSZWFsU3RvcmFnZSIsIkFwcFN0b3JhZ2UiLCJ3YXRjaCIsInJlcXVpcmUiLCJ2IiwiZGF0YSIsImRiIiwiY3JlYXRlIiwiaXRlbSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwiY3JlYXRlZEF0IiwiRGF0ZSIsInVwZGF0ZWRBdCIsImRvYyIsImZpbmRPbmUiLCIkb3IiLCJpZCIsImluZm8iLCJuYW1lU2x1ZyIsImUiLCJFcnJvciIsImluc2VydCIsIl9pZCIsInJldHJpZXZlT25lIiwicmV0cmlldmVBbGwiLCJkb2NzIiwiZmluZCIsImZldGNoIiwiaXRlbXMiLCJNYXAiLCJpIiwic2V0IiwidXBkYXRlIiwidGhlbiIsInVwZGF0ZWQiLCJjYXRjaCIsImVyciIsInJlbW92ZSIsInN1Y2Nlc3MiLCJBcHBSZWFsTG9nc1N0b3JhZ2UiLCJBcHBDb25zb2xlIiwiQXBwTG9nU3RvcmFnZSIsIm1vZGVsIiwiYXJncyIsInN0b3JlRW50cmllcyIsImxvZ2dlciIsInRvU3RvcmFnZUVudHJ5IiwiZmluZE9uZUJ5SWQiLCJnZXRFbnRyaWVzRm9yIiwicmVtb3ZlRW50cmllc0ZvciIsIkFwcEFjdGl2YXRpb25CcmlkZ2UiLCJvcmNoIiwiYXBwQWRkZWQiLCJhcHAiLCJnZXROb3RpZmllciIsImdldElEIiwiYXBwVXBkYXRlZCIsImFwcFJlbW92ZWQiLCJhcHBTdGF0dXNDaGFuZ2VkIiwic3RhdHVzIiwiYXBwU3RhdHVzVXBkYXRlZCIsIlJlYWxBcHBCcmlkZ2VzIiwiQXBwQnJpZGdlcyIsIkFwcERldGFpbENoYW5nZXNCcmlkZ2UiLCJBcHBDb21tYW5kc0JyaWRnZSIsIkFwcEFwaXNCcmlkZ2UiLCJBcHBFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2UiLCJBcHBIdHRwQnJpZGdlIiwiQXBwTGlzdGVuZXJCcmlkZ2UiLCJBcHBNZXNzYWdlQnJpZGdlIiwiQXBwUGVyc2lzdGVuY2VCcmlkZ2UiLCJBcHBSb29tQnJpZGdlIiwiQXBwU2V0dGluZ0JyaWRnZSIsIkFwcFVzZXJCcmlkZ2UiLCJfYWN0QnJpZGdlIiwiX2NtZEJyaWRnZSIsIl9hcGlCcmlkZ2UiLCJfZGV0QnJpZGdlIiwiX2VudkJyaWRnZSIsIl9odHRwQnJpZGdlIiwiX2xpc25CcmlkZ2UiLCJfbXNnQnJpZGdlIiwiX3BlcnNpc3RCcmlkZ2UiLCJfcm9vbUJyaWRnZSIsIl9zZXRzQnJpZGdlIiwiX3VzZXJCcmlkZ2UiLCJnZXRDb21tYW5kQnJpZGdlIiwiZ2V0QXBpQnJpZGdlIiwiZ2V0RW52aXJvbm1lbnRhbFZhcmlhYmxlQnJpZGdlIiwiZ2V0SHR0cEJyaWRnZSIsImdldExpc3RlbmVyQnJpZGdlIiwiZ2V0TWVzc2FnZUJyaWRnZSIsImdldFBlcnNpc3RlbmNlQnJpZGdlIiwiZ2V0QXBwQWN0aXZhdGlvbkJyaWRnZSIsImdldEFwcERldGFpbENoYW5nZXNCcmlkZ2UiLCJnZXRSb29tQnJpZGdlIiwiZ2V0U2VydmVyU2V0dGluZ0JyaWRnZSIsImdldFVzZXJCcmlkZ2UiLCJTbGFzaENvbW1hbmRDb250ZXh0IiwiZGlzYWJsZWRDb21tYW5kcyIsImRvZXNDb21tYW5kRXhpc3QiLCJjb21tYW5kIiwiY29uc29sZSIsImxvZyIsImxlbmd0aCIsInNsYXNoQ29tbWFuZHMiLCJjb21tYW5kcyIsImhhcyIsImVuYWJsZUNvbW1hbmQiLCJ0cmltIiwiZ2V0IiwiZGVsZXRlIiwiY29tbWFuZFVwZGF0ZWQiLCJkaXNhYmxlQ29tbWFuZCIsImNvbW1hbmREaXNhYmxlZCIsIm1vZGlmeUNvbW1hbmQiLCJfdmVyaWZ5Q29tbWFuZCIsInBhcmFtc0V4YW1wbGUiLCJkZXNjcmlwdGlvbiIsImkxOG5EZXNjcmlwdGlvbiIsImNhbGxiYWNrIiwiX2FwcENvbW1hbmRFeGVjdXRvciIsImJpbmQiLCJwcm92aWRlc1ByZXZpZXciLCJwcmV2aWV3ZXIiLCJfYXBwQ29tbWFuZFByZXZpZXdlciIsInByZXZpZXdDYWxsYmFjayIsImV4ZWN1dGVQcmV2aWV3SXRlbSIsIl9hcHBDb21tYW5kUHJldmlld0V4ZWN1dG9yIiwicmVnaXN0ZXJDb21tYW5kIiwiaTE4blBhcmFtc0V4YW1wbGUiLCJ1bmRlZmluZWQiLCJjb21tYW5kQWRkZWQiLCJ1bnJlZ2lzdGVyQ29tbWFuZCIsImNvbW1hbmRSZW1vdmVkIiwiZXhlY3V0b3IiLCJwYXJhbWV0ZXJzIiwibWVzc2FnZSIsInVzZXIiLCJnZXRDb252ZXJ0ZXJzIiwiY29udmVydEJ5SWQiLCJNZXRlb3IiLCJ1c2VySWQiLCJyb29tIiwicmlkIiwic3BsaXQiLCJjb250ZXh0IiwiZnJlZXplIiwiYXdhaXQiLCJnZXRNYW5hZ2VyIiwiZ2V0Q29tbWFuZE1hbmFnZXIiLCJleGVjdXRlQ29tbWFuZCIsImdldFByZXZpZXdzIiwicHJldmlldyIsImV4ZWN1dGVQcmV2aWV3IiwiYWxsb3dlZCIsImdldFZhbHVlQnlOYW1lIiwiZW52VmFyTmFtZSIsImlzUmVhZGFibGUiLCJwcm9jZXNzIiwiZW52IiwiaXNTZXQiLCJtc2ciLCJjb252ZXJ0QXBwTWVzc2FnZSIsInJ1bkFzVXNlciIsImNhbGwiLCJnZXRCeUlkIiwibWVzc2FnZUlkIiwiZWRpdG9yIiwiTWVzc2FnZXMiLCJVc2VycyIsInVwZGF0ZU1lc3NhZ2UiLCJub3RpZnlVc2VyIiwiTm90aWZpY2F0aW9ucyIsImFzc2lnbiIsIlJhbmRvbSIsInRzIiwibm90aWZ5Um9vbSIsInJtc2ciLCJ1c2VycyIsIlN1YnNjcmlwdGlvbnMiLCJmaW5kQnlSb29tSWRXaGVuVXNlcklkRXhpc3RzIiwiZmllbGRzIiwicyIsImZpbmRCeUlkcyIsInB1cmdlIiwiZ2V0UGVyc2lzdGVuY2VNb2RlbCIsImNyZWF0ZVdpdGhBc3NvY2lhdGlvbnMiLCJhc3NvY2lhdGlvbnMiLCJyZWFkQnlJZCIsInJlY29yZCIsInJlYWRCeUFzc29jaWF0aW9ucyIsInJlY29yZHMiLCIkYWxsIiwiQXJyYXkiLCJpc0FycmF5IiwiciIsInJlbW92ZUJ5QXNzb2NpYXRpb25zIiwidXBzZXJ0IiwiUm9vbVR5cGUiLCJyY1Jvb20iLCJjb252ZXJ0QXBwUm9vbSIsInR5cGUiLCJDSEFOTkVMIiwiUFJJVkFURV9HUk9VUCIsImNyZWF0b3IiLCJtZW1iZXJzIiwicm9vbUlkIiwiZ2V0QnlOYW1lIiwicm9vbU5hbWUiLCJjb252ZXJ0QnlOYW1lIiwiZ2V0Q3JlYXRvckJ5SWQiLCJSb29tcyIsImdldENyZWF0b3JCeU5hbWUiLCJmaW5kT25lQnlOYW1lIiwicm0iLCJhbGxvd2VkR3JvdXBzIiwiZGlzYWxsb3dlZFNldHRpbmdzIiwiZ2V0QWxsIiwiU2V0dGluZ3MiLCIkbmluIiwiY29udmVydFRvQXBwIiwiZ2V0T25lQnlJZCIsImlzUmVhZGFibGVCeUlkIiwiaGlkZUdyb3VwIiwibmFtZSIsImhpZGVTZXR0aW5nIiwidXBkYXRlT25lIiwic2V0dGluZyIsImdldEJ5VXNlcm5hbWUiLCJ1c2VybmFtZSIsImNvbnZlcnRCeVVzZXJuYW1lIiwiZXhwcmVzcyIsImRlZmF1bHQiLCJXZWJBcHAiLCJhcGlTZXJ2ZXIiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJhcHBSb3V0ZXJzIiwicmVxIiwicmVzIiwibm90Rm91bmQiLCJzZW5kIiwicm91dGVyIiwiX3ByaXZhdGVIYXNoIiwiaGFzaCIsInJlZ2lzdGVyQXBpIiwiYXBpIiwiY29tcHV0ZWRQYXRoIiwiZW5kcG9pbnQiLCJwYXRoIiwiX3ZlcmlmeUFwaSIsIlJvdXRlciIsInJvdXRlUGF0aCIsInN0YXJ0c1dpdGgiLCJiaW5kRW52aXJvbm1lbnQiLCJfYXBwQXBpRXhlY3V0b3IiLCJ1bnJlZ2lzdGVyQXBpcyIsInJlcXVlc3QiLCJib2R5IiwicHJpdmF0ZUhhc2giLCJnZXRBcGlNYW5hZ2VyIiwiZXhlY3V0ZUFwaSIsInJlYXNvbiIsIm9uQXBwU2V0dGluZ3NDaGFuZ2UiLCJhcHBTZXR0aW5nc0NoYW5nZSIsIndhcm4iLCJIVFRQIiwicmVzcG9uc2UiLCJtZXNzYWdlRXZlbnQiLCJpbnRlIiwiY29udmVydE1lc3NhZ2UiLCJyZXN1bHQiLCJnZXRMaXN0ZW5lck1hbmFnZXIiLCJleGVjdXRlTGlzdGVuZXIiLCJyb29tRXZlbnQiLCJjb252ZXJ0Um9vbSIsIkFwcE1ldGhvZHMiLCJ3YWl0VG9Mb2FkIiwic2V0SW50ZXJ2YWwiLCJpc0VuYWJsZWQiLCJpc0xvYWRlZCIsImNsZWFySW50ZXJ2YWwiLCJ3YWl0VG9VbmxvYWQiLCJfb3JjaCIsIl9hZGRNZXRob2RzIiwiaW5zdGFuY2UiLCJtZXRob2RzIiwiYXV0aHoiLCJoYXNQZXJtaXNzaW9uIiwic2V0dGluZ3MiLCJBcHBzUmVzdEFwaSIsIkJ1c2JveSIsIm1hbmFnZXIiLCJfbWFuYWdlciIsIkFQSSIsIkFwaUNsYXNzIiwidmVyc2lvbiIsInVzZURlZmF1bHRBdXRoIiwicHJldHR5SnNvbiIsImVuYWJsZUNvcnMiLCJnZXRVc2VyQXV0aCIsImFkZE1hbmFnZW1lbnRSb3V0ZXMiLCJfaGFuZGxlRmlsZSIsImZpbGVGaWVsZCIsImJ1c2JveSIsIndyYXBBc3luYyIsIm9uIiwiZmllbGRuYW1lIiwiZmlsZSIsImZpbGVEYXRhIiwiQnVmZmVyIiwiY29uY2F0IiwicGlwZSIsIm9yY2hlc3RyYXRvciIsImZpbGVIYW5kbGVyIiwiYWRkUm91dGUiLCJhdXRoUmVxdWlyZWQiLCJhcHBzIiwicHJsIiwiZ2V0SW5mbyIsImxhbmd1YWdlcyIsImdldFN0b3JhZ2VJdGVtIiwibGFuZ3VhZ2VDb250ZW50IiwiZ2V0U3RhdHVzIiwidjEiLCJwb3N0IiwiYnVmZiIsImJvZHlQYXJhbXMiLCJucG1SZXF1ZXN0T3B0aW9ucyIsImVuY29kaW5nIiwic3RhdHVzQ29kZSIsImZhaWx1cmUiLCJlcnJvciIsImZyb20iLCJhZmYiLCJhZGQiLCJ0b1N0cmluZyIsImdldEFwcEluZm8iLCJnZXRBcHAiLCJpbXBsZW1lbnRlZCIsImdldEltcGxlbWVudGVkSW5mZXJmYWNlcyIsImNvbXBpbGVyRXJyb3JzIiwiZ2V0Q29tcGlsZXJFcnJvcnMiLCJ1cmxQYXJhbXMiLCJpY29uRmlsZUNvbnRlbnQiLCJvZmZzZXQiLCJjb3VudCIsImdldFBhZ2luYXRpb25JdGVtcyIsInNvcnQiLCJwYXJzZUpzb25RdWVyeSIsIm91clF1ZXJ5Iiwib3B0aW9ucyIsIl91cGRhdGVkQXQiLCJza2lwIiwibGltaXQiLCJsb2dzIiwiZ2V0TG9nU3RvcmFnZSIsImtleXMiLCJrIiwiaGlkZGVuIiwiZ2V0U2V0dGluZ3NNYW5hZ2VyIiwidXBkYXRlQXBwU2V0dGluZyIsInNldHRpbmdJZCIsImdldEFwcFNldHRpbmciLCJhcGlzIiwiYXBpTWFuYWdlciIsImxpc3RBcGlzIiwiY2hhbmdlU3RhdHVzIiwiQXBwRXZlbnRzIiwiQXBwU2VydmVyTGlzdGVuZXIiLCJBcHBTZXJ2ZXJOb3RpZmllciIsIkFwcFN0YXR1cyIsIkFwcFN0YXR1c1V0aWxzIiwiQVBQX0FEREVEIiwiQVBQX1JFTU9WRUQiLCJBUFBfVVBEQVRFRCIsIkFQUF9TVEFUVVNfQ0hBTkdFIiwiQVBQX1NFVFRJTkdfVVBEQVRFRCIsIkNPTU1BTkRfQURERUQiLCJDT01NQU5EX0RJU0FCTEVEIiwiQ09NTUFORF9VUERBVEVEIiwiQ09NTUFORF9SRU1PVkVEIiwiZW5naW5lU3RyZWFtZXIiLCJjbGllbnRTdHJlYW1lciIsInJlY2VpdmVkIiwib25BcHBBZGRlZCIsIm9uQXBwU3RhdHVzVXBkYXRlZCIsIm9uQXBwU2V0dGluZ1VwZGF0ZWQiLCJvbkFwcFJlbW92ZWQiLCJvbkFwcFVwZGF0ZWQiLCJvbkNvbW1hbmRBZGRlZCIsIm9uQ29tbWFuZERpc2FibGVkIiwib25Db21tYW5kVXBkYXRlZCIsIm9uQ29tbWFuZFJlbW92ZWQiLCJsb2FkT25lIiwiZW1pdCIsIndoZW4iLCJlbmFibGUiLCJpc0Rpc2FibGVkIiwiZGlzYWJsZSIsIk1BTlVBTExZX0RJU0FCTEVEIiwic3RvcmFnZUl0ZW0iLCJnZXRTdG9yYWdlIiwiemlwIiwiU3RyZWFtZXIiLCJyZXRyYW5zbWl0Iiwic2VydmVyT25seSIsImFsbG93UmVhZCIsImFsbG93RW1pdCIsImFsbG93V3JpdGUiLCJsaXN0ZW5lciIsImRldGFpbHMiLCJBcHBNZXNzYWdlc0NvbnZlcnRlciIsIm1zZ0lkIiwibXNnT2JqIiwic2VuZGVyIiwiZWRpdGVkQnkiLCJhdHRhY2htZW50cyIsIl9jb252ZXJ0QXR0YWNobWVudHNUb0FwcCIsInRleHQiLCJlZGl0ZWRBdCIsImVtb2ppIiwiYXZhdGFyVXJsIiwiYXZhdGFyIiwiYWxpYXMiLCJjdXN0b21GaWVsZHMiLCJncm91cGFibGUiLCJyZWFjdGlvbnMiLCJfY29udmVydEFwcEF0dGFjaG1lbnRzIiwiYXR0YWNobWVudCIsImNvbGxhcHNlZCIsImNvbG9yIiwidGltZXN0YW1wIiwibWVzc2FnZV9saW5rIiwidGltZXN0YW1wTGluayIsInRodW1iX3VybCIsInRodW1ibmFpbFVybCIsImF1dGhvcl9uYW1lIiwiYXV0aG9yIiwiYXV0aG9yX2xpbmsiLCJsaW5rIiwiYXV0aG9yX2ljb24iLCJpY29uIiwidGl0bGUiLCJ0aXRsZV9saW5rIiwidGl0bGVfbGlua19kb3dubG9hZCIsImRpc3BsYXlEb3dubG9hZExpbmsiLCJpbWFnZV91cmwiLCJpbWFnZVVybCIsImF1ZGlvX3VybCIsImF1ZGlvVXJsIiwidmlkZW9fdXJsIiwidmlkZW9VcmwiLCJhY3Rpb25zIiwiYSIsIkFwcFJvb21zQ29udmVydGVyIiwiZm5hbWUiLCJkaXNwbGF5TmFtZSIsInNsdWdpZmllZE5hbWUiLCJ0IiwiaXNEZWZhdWx0Iiwicm8iLCJpc1JlYWRPbmx5Iiwic3lzTWVzIiwiZGlzcGxheVN5c3RlbU1lc3NhZ2VzIiwibXNncyIsIm1lc3NhZ2VDb3VudCIsImxtIiwibGFzdE1vZGlmaWVkQXQiLCJfY29udmVydFR5cGVUb0FwcCIsInR5cGVDaGFyIiwiRElSRUNUX01FU1NBR0UiLCJMSVZFX0NIQVQiLCJBcHBTZXR0aW5nc0NvbnZlcnRlciIsIlNldHRpbmdUeXBlIiwiZmluZE9uZU5vdEhpZGRlbkJ5SWQiLCJwYWNrYWdlVmFsdWUiLCJ2YWx1ZXMiLCJwdWJsaWMiLCJncm91cCIsImkxOG5MYWJlbCIsIkJPT0xFQU4iLCJDT0RFIiwiQ09MT1IiLCJGT05UIiwiTlVNQkVSIiwiU0VMRUNUIiwiU1RSSU5HIiwiQXBwVXNlcnNDb252ZXJ0ZXIiLCJVc2VyU3RhdHVzQ29ubmVjdGlvbiIsIlVzZXJUeXBlIiwiZmluZE9uZUJ5VXNlcm5hbWUiLCJfY29udmVydFVzZXJUeXBlVG9FbnVtIiwic3RhdHVzQ29ubmVjdGlvbiIsIl9jb252ZXJ0U3RhdHVzQ29ubmVjdGlvblRvRW51bSIsImVtYWlscyIsImFjdGl2ZSIsInJvbGVzIiwidXRjT2Zmc2V0IiwibGFzdExvZ2luQXQiLCJsYXN0TG9naW4iLCJVU0VSIiwiQk9UIiwiVU5LTk9XTiIsIk9GRkxJTkUiLCJPTkxJTkUiLCJBV0FZIiwiQlVTWSIsIlVOREVGSU5FRCIsIkFwcE1hbmFnZXIiLCJBcHBTZXJ2ZXJPcmNoZXN0cmF0b3IiLCJQZXJtaXNzaW9ucyIsImNyZWF0ZU9yVXBkYXRlIiwiX21vZGVsIiwiX2xvZ01vZGVsIiwiX3BlcnNpc3RNb2RlbCIsIl9zdG9yYWdlIiwiX2xvZ1N0b3JhZ2UiLCJfY29udmVydGVycyIsIl9icmlkZ2VzIiwiX2NvbW11bmljYXRvcnMiLCJnZXRNb2RlbCIsImdldEJyaWRnZXMiLCJhcmVBcHBzTG9hZGVkIiwibG9hZCIsImFmZnMiLCJ1bmxvYWQiLCJhZGRHcm91cCIsInNlY3Rpb24iLCJnbG9iYWwiLCJzdGFydHVwIiwiX2FwcFNlcnZlck9yY2hlc3RyYXRvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0FBLE9BQU8sRUFBUCxDOzs7Ozs7Ozs7OztBQ0RBQyxPQUFPQyxNQUFQLENBQWM7QUFBQ0MsYUFBVSxNQUFJQTtBQUFmLENBQWQ7O0FBQU8sTUFBTUEsU0FBTixDQUFnQjtBQUN0QixTQUFPQyxnQkFBUCxDQUF3QkMsR0FBeEIsRUFBNkJDLEtBQTdCLEVBQW9DO0FBQ25DLFdBQU9ELE9BQVEsUUFBUUMsS0FBTyxJQUFJRCxHQUFLLEVBQXZDO0FBQ0E7O0FBRUQsU0FBT0UsSUFBUCxDQUFZO0FBQUVDLFVBQUY7QUFBVUMsVUFBVjtBQUFrQkMsUUFBbEI7QUFBd0JDLGNBQVUsRUFBbEM7QUFB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WSxPQUFQLENBQWUsU0FBU0Msc0JBQVQsR0FBa0M7QUFDaERGLFNBQU8vakIsSUFBUCxHQUFjLElBQUk0aUIscUJBQUosRUFBZDs7QUFFQSxNQUFJbUIsT0FBTy9qQixJQUFQLENBQVlxVSxTQUFaLEVBQUosRUFBNkI7QUFDNUIwUCxXQUFPL2pCLElBQVAsQ0FBWTBqQixJQUFaO0FBQ0E7QUFDRCxDQU5ELEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfYXBwcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFBsZWFzZSBzZWUgYm90aCBzZXJ2ZXIgYW5kIGNsaWVudCdzIHJlcHNlY3RpdmUgXCJvcmNoZXN0cmF0b3JcIiBmaWxlIGZvciB0aGUgY29udGVudHNcbkFwcHMgPSB7fTtcbiIsImV4cG9ydCBjbGFzcyBVdGlsaXRpZXMge1xuXHRzdGF0aWMgZ2V0STE4bktleUZvckFwcChrZXksIGFwcElkKSB7XG5cdFx0cmV0dXJuIGtleSAmJiBgYXBwcy0keyBhcHBJZCB9LSR7IGtleSB9YDtcblx0fVxuXG5cdHN0YXRpYyBjdXJsKHsgbWV0aG9kLCBwYXJhbXMsIGF1dGgsIGhlYWRlcnMgPSB7fSwgdXJsLCBxdWVyeSwgY29udGVudCB9LCBvcHRzID0ge30pIHtcblx0XHRjb25zdCBuZXdMaW5lID0gJ1xcXFxcXG4gICAnO1xuXG5cdFx0Y29uc3QgY21kID0gWydjdXJsJ107XG5cblx0XHQvLyBjdXJsIG9wdGlvbnNcblx0XHRpZiAob3B0cy52ZXJib3NlKSB7XG5cdFx0XHRjbWQucHVzaCgnLXYnKTtcblx0XHR9XG5cdFx0aWYgKG9wdHMuaGVhZGVycykge1xuXHRcdFx0Y21kLnB1c2goJy1pJyk7XG5cdFx0fVxuXG5cdFx0Ly8gbWV0aG9kXG5cdFx0Y21kLnB1c2goJy1YJyk7XG5cdFx0Y21kLnB1c2goKG1ldGhvZCB8fCAnR0VUJykudG9VcHBlckNhc2UoKSk7XG5cblx0XHQvLyBVUkxcblx0XHRsZXQgdSA9IHVybDtcblxuXHRcdGlmICh0eXBlb2YgcGFyYW1zID09PSAnb2JqZWN0Jykge1xuXHRcdFx0T2JqZWN0LmVudHJpZXMocGFyYW1zKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcblx0XHRcdFx0dSA9IHUucmVwbGFjZShgOiR7IGtleSB9YCwgdmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBxdWVyeSA9PT0gJ29iamVjdCcpIHtcblx0XHRcdGNvbnN0IHF1ZXJ5U3RyaW5nID0gT2JqZWN0LmVudHJpZXMocXVlcnkpLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgJHsga2V5IH09JHsgdmFsdWUgfWApLmpvaW4oJyYnKTtcblx0XHRcdHUgKz0gYD8keyBxdWVyeVN0cmluZyB9YDtcblx0XHR9XG5cdFx0Y21kLnB1c2godSk7XG5cblx0XHQvLyB1c2VybmFtZVxuXHRcdGlmIChhdXRoKSB7XG5cdFx0XHRjbWQucHVzaChuZXdMaW5lKTtcblx0XHRcdGNtZC5wdXNoKCctdScpO1xuXHRcdFx0Y21kLnB1c2goYXV0aCk7XG5cdFx0fVxuXG5cdFx0Ly8gaGVhZGVyc1xuXHRcdGNvbnN0IGhlYWRlcktleXMgPSBbXTtcblx0XHRPYmplY3QuZW50cmllcyhoZWFkZXJzKS5mb3JFYWNoKChba2V5LCB2YWxdKSA9PiB7XG5cdFx0XHRrZXkgPSBrZXkudG9Mb3dlckNhc2UoKTtcblx0XHRcdGhlYWRlcktleXMucHVzaChrZXkpO1xuXHRcdFx0Y21kLnB1c2gobmV3TGluZSk7XG5cdFx0XHRjbWQucHVzaCgnLUgnKTtcblx0XHRcdGNtZC5wdXNoKGBcIiR7IGtleSB9JHsgdmFsID8gJzogJyA6ICc7JyB9JHsgdmFsIHx8ICcnIH1cImApO1xuXHRcdH0pO1xuXG5cdFx0aWYgKGNvbnRlbnQpIHtcblx0XHRcdGlmICh0eXBlb2YgY29udGVudCA9PT0gJ29iamVjdCcpIHtcblx0XHRcdFx0aWYgKCFoZWFkZXJLZXlzLmluY2x1ZGVzKCdjb250ZW50LXR5cGUnKSkge1xuXHRcdFx0XHRcdGNtZC5wdXNoKG5ld0xpbmUpO1xuXHRcdFx0XHRcdGNtZC5wdXNoKCctSCcpO1xuXHRcdFx0XHRcdGNtZC5wdXNoKCdcImNvbnRlbnQtdHlwZTogYXBwbGljYXRpb24vanNvblwiJyk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29udGVudCA9IEpTT04uc3RyaW5naWZ5KGNvbnRlbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRjbWQucHVzaChuZXdMaW5lKTtcblx0XHRcdGNtZC5wdXNoKCctLWRhdGEtYmluYXJ5Jyk7XG5cdFx0XHRjbWQucHVzaChgJyR7IGNvbnRlbnQgfSdgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY21kLmpvaW4oJyAnKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcHNMb2dzTW9kZWwgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdhcHBzX2xvZ3MnKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcHNNb2RlbCBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2FwcHMnKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcHNQZXJzaXN0ZW5jZU1vZGVsIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignYXBwc19wZXJzaXN0ZW5jZScpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBTdG9yYWdlIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL3NlcnZlci9zdG9yYWdlJztcblxuZXhwb3J0IGNsYXNzIEFwcFJlYWxTdG9yYWdlIGV4dGVuZHMgQXBwU3RvcmFnZSB7XG5cdGNvbnN0cnVjdG9yKGRhdGEpIHtcblx0XHRzdXBlcignbW9uZ29kYicpO1xuXHRcdHRoaXMuZGIgPSBkYXRhO1xuXHR9XG5cblx0Y3JlYXRlKGl0ZW0pIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0aXRlbS5jcmVhdGVkQXQgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0aXRlbS51cGRhdGVkQXQgPSBuZXcgRGF0ZSgpO1xuXG5cdFx0XHRsZXQgZG9jO1xuXG5cdFx0XHR0cnkge1xuXHRcdFx0XHRkb2MgPSB0aGlzLmRiLmZpbmRPbmUoeyAkb3I6IFt7IGlkOiBpdGVtLmlkIH0sIHsgJ2luZm8ubmFtZVNsdWcnOiBpdGVtLmluZm8ubmFtZVNsdWcgfV0gfSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChkb2MpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChuZXcgRXJyb3IoJ0FwcCBhbHJlYWR5IGV4aXN0cy4nKSk7XG5cdFx0XHR9XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IGlkID0gdGhpcy5kYi5pbnNlcnQoaXRlbSk7XG5cdFx0XHRcdGl0ZW0uX2lkID0gaWQ7XG5cblx0XHRcdFx0cmVzb2x2ZShpdGVtKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmVqZWN0KGUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0cmV0cmlldmVPbmUoaWQpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0bGV0IGRvYztcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZG9jID0gdGhpcy5kYi5maW5kT25lKHsgJG9yOiBbeyBfaWQ6IGlkIH0sIHsgaWQgfV0gfSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJldHVybiByZWplY3QoZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChkb2MpIHtcblx0XHRcdFx0cmVzb2x2ZShkb2MpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcihgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZDogJHsgaWQgfWApKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdHJldHJpZXZlQWxsKCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRsZXQgZG9jcztcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZG9jcyA9IHRoaXMuZGIuZmluZCh7fSkuZmV0Y2goKTtcblx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0cmV0dXJuIHJlamVjdChlKTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgaXRlbXMgPSBuZXcgTWFwKCk7XG5cblx0XHRcdGRvY3MuZm9yRWFjaCgoaSkgPT4gaXRlbXMuc2V0KGkuaWQsIGkpKTtcblxuXHRcdFx0cmVzb2x2ZShpdGVtcyk7XG5cdFx0fSk7XG5cdH1cblxuXHR1cGRhdGUoaXRlbSkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLmRiLnVwZGF0ZSh7IGlkOiBpdGVtLmlkIH0sIGl0ZW0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnJldHJpZXZlT25lKGl0ZW0uaWQpLnRoZW4oKHVwZGF0ZWQpID0+IHJlc29sdmUodXBkYXRlZCkpLmNhdGNoKChlcnIpID0+IHJlamVjdChlcnIpKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlbW92ZShpZCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLmRiLnJlbW92ZSh7IGlkIH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNvbHZlKHsgc3VjY2VzczogdHJ1ZSB9KTtcblx0XHR9KTtcblx0fVxufVxuIiwiaW1wb3J0IHsgQXBwc0xvZ3NNb2RlbCB9IGZyb20gJy4vYXBwcy1sb2dzLW1vZGVsJztcbmltcG9ydCB7IEFwcHNNb2RlbCB9IGZyb20gJy4vYXBwcy1tb2RlbCc7XG5pbXBvcnQgeyBBcHBzUGVyc2lzdGVuY2VNb2RlbCB9IGZyb20gJy4vYXBwcy1wZXJzaXN0ZW5jZS1tb2RlbCc7XG5pbXBvcnQgeyBBcHBSZWFsTG9nc1N0b3JhZ2UgfSBmcm9tICcuL2xvZ3Mtc3RvcmFnZSc7XG5pbXBvcnQgeyBBcHBSZWFsU3RvcmFnZSB9IGZyb20gJy4vc3RvcmFnZSc7XG5cbmV4cG9ydCB7IEFwcHNMb2dzTW9kZWwsIEFwcHNNb2RlbCwgQXBwc1BlcnNpc3RlbmNlTW9kZWwsIEFwcFJlYWxMb2dzU3RvcmFnZSwgQXBwUmVhbFN0b3JhZ2UgfTtcbiIsImltcG9ydCB7IEFwcENvbnNvbGUgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvc2VydmVyL2xvZ2dpbmcnO1xuaW1wb3J0IHsgQXBwTG9nU3RvcmFnZSB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9zZXJ2ZXIvc3RvcmFnZSc7XG5cbmV4cG9ydCBjbGFzcyBBcHBSZWFsTG9nc1N0b3JhZ2UgZXh0ZW5kcyBBcHBMb2dTdG9yYWdlIHtcblx0Y29uc3RydWN0b3IobW9kZWwpIHtcblx0XHRzdXBlcignbW9uZ29kYicpO1xuXHRcdHRoaXMuZGIgPSBtb2RlbDtcblx0fVxuXG5cdGZpbmQoLi4uYXJncykge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHRsZXQgZG9jcztcblxuXHRcdFx0dHJ5IHtcblx0XHRcdFx0ZG9jcyA9IHRoaXMuZGIuZmluZCguLi5hcmdzKS5mZXRjaCgpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNvbHZlKGRvY3MpO1xuXHRcdH0pO1xuXHR9XG5cblx0c3RvcmVFbnRyaWVzKGFwcElkLCBsb2dnZXIpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0Y29uc3QgaXRlbSA9IEFwcENvbnNvbGUudG9TdG9yYWdlRW50cnkoYXBwSWQsIGxvZ2dlcik7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGNvbnN0IGlkID0gdGhpcy5kYi5pbnNlcnQoaXRlbSk7XG5cblx0XHRcdFx0cmVzb2x2ZSh0aGlzLmRiLmZpbmRPbmVCeUlkKGlkKSk7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdHJlamVjdChlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdGdldEVudHJpZXNGb3IoYXBwSWQpIHtcblx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuXHRcdFx0bGV0IGRvY3M7XG5cblx0XHRcdHRyeSB7XG5cdFx0XHRcdGRvY3MgPSB0aGlzLmRiLmZpbmQoeyBhcHBJZCB9KS5mZXRjaCgpO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNvbHZlKGRvY3MpO1xuXHRcdH0pO1xuXHR9XG5cblx0cmVtb3ZlRW50cmllc0ZvcihhcHBJZCkge1xuXHRcdHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0aGlzLmRiLnJlbW92ZSh7IGFwcElkIH0pO1xuXHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fSk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBBY3RpdmF0aW9uQnJpZGdlIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRhc3luYyBhcHBBZGRlZChhcHApIHtcblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5hcHBBZGRlZChhcHAuZ2V0SUQoKSk7XG5cdH1cblxuXHRhc3luYyBhcHBVcGRhdGVkKGFwcCkge1xuXHRcdGF3YWl0IHRoaXMub3JjaC5nZXROb3RpZmllcigpLmFwcFVwZGF0ZWQoYXBwLmdldElEKCkpO1xuXHR9XG5cblx0YXN5bmMgYXBwUmVtb3ZlZChhcHApIHtcblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5hcHBSZW1vdmVkKGFwcC5nZXRJRCgpKTtcblx0fVxuXG5cdGFzeW5jIGFwcFN0YXR1c0NoYW5nZWQoYXBwLCBzdGF0dXMpIHtcblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5hcHBTdGF0dXNVcGRhdGVkKGFwcC5nZXRJRCgpLCBzdGF0dXMpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBCcmlkZ2VzIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL3NlcnZlci9icmlkZ2VzJztcblxuaW1wb3J0IHsgQXBwQWN0aXZhdGlvbkJyaWRnZSB9IGZyb20gJy4vYWN0aXZhdGlvbic7XG5pbXBvcnQgeyBBcHBEZXRhaWxDaGFuZ2VzQnJpZGdlIH0gZnJvbSAnLi9kZXRhaWxzJztcbmltcG9ydCB7IEFwcENvbW1hbmRzQnJpZGdlIH0gZnJvbSAnLi9jb21tYW5kcyc7XG5pbXBvcnQgeyBBcHBBcGlzQnJpZGdlIH0gZnJvbSAnLi9hcGknO1xuaW1wb3J0IHsgQXBwRW52aXJvbm1lbnRhbFZhcmlhYmxlQnJpZGdlIH0gZnJvbSAnLi9lbnZpcm9ubWVudGFsJztcbmltcG9ydCB7IEFwcEh0dHBCcmlkZ2UgfSBmcm9tICcuL2h0dHAnO1xuaW1wb3J0IHsgQXBwTGlzdGVuZXJCcmlkZ2UgfSBmcm9tICcuL2xpc3RlbmVycyc7XG5pbXBvcnQgeyBBcHBNZXNzYWdlQnJpZGdlIH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBBcHBQZXJzaXN0ZW5jZUJyaWRnZSB9IGZyb20gJy4vcGVyc2lzdGVuY2UnO1xuaW1wb3J0IHsgQXBwUm9vbUJyaWRnZSB9IGZyb20gJy4vcm9vbXMnO1xuaW1wb3J0IHsgQXBwU2V0dGluZ0JyaWRnZSB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgQXBwVXNlckJyaWRnZSB9IGZyb20gJy4vdXNlcnMnO1xuXG5leHBvcnQgY2xhc3MgUmVhbEFwcEJyaWRnZXMgZXh0ZW5kcyBBcHBCcmlkZ2VzIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHN1cGVyKCk7XG5cblx0XHR0aGlzLl9hY3RCcmlkZ2UgPSBuZXcgQXBwQWN0aXZhdGlvbkJyaWRnZShvcmNoKTtcblx0XHR0aGlzLl9jbWRCcmlkZ2UgPSBuZXcgQXBwQ29tbWFuZHNCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fYXBpQnJpZGdlID0gbmV3IEFwcEFwaXNCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fZGV0QnJpZGdlID0gbmV3IEFwcERldGFpbENoYW5nZXNCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fZW52QnJpZGdlID0gbmV3IEFwcEVudmlyb25tZW50YWxWYXJpYWJsZUJyaWRnZShvcmNoKTtcblx0XHR0aGlzLl9odHRwQnJpZGdlID0gbmV3IEFwcEh0dHBCcmlkZ2UoKTtcblx0XHR0aGlzLl9saXNuQnJpZGdlID0gbmV3IEFwcExpc3RlbmVyQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX21zZ0JyaWRnZSA9IG5ldyBBcHBNZXNzYWdlQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX3BlcnNpc3RCcmlkZ2UgPSBuZXcgQXBwUGVyc2lzdGVuY2VCcmlkZ2Uob3JjaCk7XG5cdFx0dGhpcy5fcm9vbUJyaWRnZSA9IG5ldyBBcHBSb29tQnJpZGdlKG9yY2gpO1xuXHRcdHRoaXMuX3NldHNCcmlkZ2UgPSBuZXcgQXBwU2V0dGluZ0JyaWRnZShvcmNoKTtcblx0XHR0aGlzLl91c2VyQnJpZGdlID0gbmV3IEFwcFVzZXJCcmlkZ2Uob3JjaCk7XG5cdH1cblxuXHRnZXRDb21tYW5kQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9jbWRCcmlkZ2U7XG5cdH1cblxuXHRnZXRBcGlCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwaUJyaWRnZTtcblx0fVxuXG5cdGdldEVudmlyb25tZW50YWxWYXJpYWJsZUJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fZW52QnJpZGdlO1xuXHR9XG5cblx0Z2V0SHR0cEJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5faHR0cEJyaWRnZTtcblx0fVxuXG5cdGdldExpc3RlbmVyQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9saXNuQnJpZGdlO1xuXHR9XG5cblx0Z2V0TWVzc2FnZUJyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbXNnQnJpZGdlO1xuXHR9XG5cblx0Z2V0UGVyc2lzdGVuY2VCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3BlcnNpc3RCcmlkZ2U7XG5cdH1cblxuXHRnZXRBcHBBY3RpdmF0aW9uQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9hY3RCcmlkZ2U7XG5cdH1cblxuXHRnZXRBcHBEZXRhaWxDaGFuZ2VzQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9kZXRCcmlkZ2U7XG5cdH1cblxuXHRnZXRSb29tQnJpZGdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9yb29tQnJpZGdlO1xuXHR9XG5cblx0Z2V0U2VydmVyU2V0dGluZ0JyaWRnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc2V0c0JyaWRnZTtcblx0fVxuXG5cdGdldFVzZXJCcmlkZ2UoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX3VzZXJCcmlkZ2U7XG5cdH1cbn1cbiIsImltcG9ydCB7IFNsYXNoQ29tbWFuZENvbnRleHQgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvZGVmaW5pdGlvbi9zbGFzaGNvbW1hbmRzJztcbmltcG9ydCB7IFV0aWxpdGllcyB9IGZyb20gJy4uLy4uL2xpYi9taXNjL1V0aWxpdGllcyc7XG5cbmV4cG9ydCBjbGFzcyBBcHBDb21tYW5kc0JyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHRcdHRoaXMuZGlzYWJsZWRDb21tYW5kcyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdGRvZXNDb21tYW5kRXhpc3QoY29tbWFuZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGNoZWNraW5nIGlmIFwiJHsgY29tbWFuZCB9XCIgY29tbWFuZCBleGlzdHMuYCk7XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdzdHJpbmcnIHx8IGNvbW1hbmQubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY21kID0gY29tbWFuZC50b0xvd2VyQ2FzZSgpO1xuXHRcdHJldHVybiB0eXBlb2YgUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0gPT09ICdvYmplY3QnIHx8IHRoaXMuZGlzYWJsZWRDb21tYW5kcy5oYXMoY21kKTtcblx0fVxuXG5cdGVuYWJsZUNvbW1hbmQoY29tbWFuZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGF0dGVtcHRpbmcgdG8gZW5hYmxlIHRoZSBjb21tYW5kOiBcIiR7IGNvbW1hbmQgfVwiYCk7XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdzdHJpbmcnIHx8IGNvbW1hbmQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBtdXN0IGJlIGEgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHRpZiAoIXRoaXMuZGlzYWJsZWRDb21tYW5kcy5oYXMoY21kKSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKGBUaGUgY29tbWFuZCBpcyBub3QgY3VycmVudGx5IGRpc2FibGVkOiBcIiR7IGNtZCB9XCJgKTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXSA9IHRoaXMuZGlzYWJsZWRDb21tYW5kcy5nZXQoY21kKTtcblx0XHR0aGlzLmRpc2FibGVkQ29tbWFuZHMuZGVsZXRlKGNtZCk7XG5cblx0XHR0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5jb21tYW5kVXBkYXRlZChjbWQpO1xuXHR9XG5cblx0ZGlzYWJsZUNvbW1hbmQoY29tbWFuZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGF0dGVtcHRpbmcgdG8gZGlzYWJsZSB0aGUgY29tbWFuZDogXCIkeyBjb21tYW5kIH1cImApO1xuXG5cdFx0aWYgKHR5cGVvZiBjb21tYW5kICE9PSAnc3RyaW5nJyB8fCBjb21tYW5kLnRyaW0oKS5sZW5ndGggPT09IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgbXVzdCBiZSBhIHN0cmluZy4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBjbWQgPSBjb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKHRoaXMuZGlzYWJsZWRDb21tYW5kcy5oYXMoY21kKSkge1xuXHRcdFx0Ly8gVGhlIGNvbW1hbmQgaXMgYWxyZWFkeSBkaXNhYmxlZCwgbm8gbmVlZCB0byBkaXNhYmxlIGl0IHlldCBhZ2FpblxuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF0gPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYENvbW1hbmQgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHN5c3RlbSBjdXJyZW50bHk6IFwiJHsgY21kIH1cImApO1xuXHRcdH1cblxuXHRcdHRoaXMuZGlzYWJsZWRDb21tYW5kcy5zZXQoY21kLCBSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXSk7XG5cdFx0ZGVsZXRlIFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdO1xuXG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZERpc2FibGVkKGNtZCk7XG5cdH1cblxuXHQvLyBjb21tYW5kOiB7IGNvbW1hbmQsIHBhcmFtc0V4YW1wbGUsIGkxOG5EZXNjcmlwdGlvbiwgZXhlY3V0b3I6IGZ1bmN0aW9uIH1cblx0bW9kaWZ5Q29tbWFuZChjb21tYW5kLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgYXR0ZW1wdGluZyB0byBtb2RpZnkgdGhlIGNvbW1hbmQ6IFwiJHsgY29tbWFuZCB9XCJgKTtcblxuXHRcdHRoaXMuX3ZlcmlmeUNvbW1hbmQoY29tbWFuZCk7XG5cblx0XHRjb25zdCBjbWQgPSBjb21tYW5kLnRvTG93ZXJDYXNlKCk7XG5cdFx0aWYgKHR5cGVvZiBSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgQ29tbWFuZCBkb2VzIG5vdCBleGlzdCBpbiB0aGUgc3lzdGVtIGN1cnJlbnRseSAob3IgaXQgaXMgZGlzYWJsZWQpOiBcIiR7IGNtZCB9XCJgKTtcblx0XHR9XG5cblx0XHRjb25zdCBpdGVtID0gUm9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NtZF07XG5cdFx0aXRlbS5wYXJhbXMgPSBjb21tYW5kLnBhcmFtc0V4YW1wbGUgPyBjb21tYW5kLnBhcmFtc0V4YW1wbGUgOiBpdGVtLnBhcmFtcztcblx0XHRpdGVtLmRlc2NyaXB0aW9uID0gY29tbWFuZC5pMThuRGVzY3JpcHRpb24gPyBjb21tYW5kLmkxOG5EZXNjcmlwdGlvbiA6IGl0ZW0ucGFyYW1zO1xuXHRcdGl0ZW0uY2FsbGJhY2sgPSB0aGlzLl9hcHBDb21tYW5kRXhlY3V0b3IuYmluZCh0aGlzKTtcblx0XHRpdGVtLnByb3ZpZGVzUHJldmlldyA9IGNvbW1hbmQucHJvdmlkZXNQcmV2aWV3O1xuXHRcdGl0ZW0ucHJldmlld2VyID0gY29tbWFuZC5wcmV2aWV3ZXIgPyB0aGlzLl9hcHBDb21tYW5kUHJldmlld2VyLmJpbmQodGhpcykgOiBpdGVtLnByZXZpZXdlcjtcblx0XHRpdGVtLnByZXZpZXdDYWxsYmFjayA9IGNvbW1hbmQuZXhlY3V0ZVByZXZpZXdJdGVtID8gdGhpcy5fYXBwQ29tbWFuZFByZXZpZXdFeGVjdXRvci5iaW5kKHRoaXMpIDogaXRlbS5wcmV2aWV3Q2FsbGJhY2s7XG5cblx0XHRSb2NrZXRDaGF0LnNsYXNoQ29tbWFuZHMuY29tbWFuZHNbY21kXSA9IGl0ZW07XG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZFVwZGF0ZWQoY21kKTtcblx0fVxuXG5cdHJlZ2lzdGVyQ29tbWFuZChjb21tYW5kLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgcmVnaXN0ZXJpbmcgdGhlIGNvbW1hbmQ6IFwiJHsgY29tbWFuZC5jb21tYW5kIH1cImApO1xuXG5cdFx0dGhpcy5fdmVyaWZ5Q29tbWFuZChjb21tYW5kKTtcblxuXHRcdGNvbnN0IGl0ZW0gPSB7XG5cdFx0XHRjb21tYW5kOiBjb21tYW5kLmNvbW1hbmQudG9Mb3dlckNhc2UoKSxcblx0XHRcdHBhcmFtczogVXRpbGl0aWVzLmdldEkxOG5LZXlGb3JBcHAoY29tbWFuZC5pMThuUGFyYW1zRXhhbXBsZSwgYXBwSWQpLFxuXHRcdFx0ZGVzY3JpcHRpb246IFV0aWxpdGllcy5nZXRJMThuS2V5Rm9yQXBwKGNvbW1hbmQuaTE4bkRlc2NyaXB0aW9uLCBhcHBJZCksXG5cdFx0XHRjYWxsYmFjazogdGhpcy5fYXBwQ29tbWFuZEV4ZWN1dG9yLmJpbmQodGhpcyksXG5cdFx0XHRwcm92aWRlc1ByZXZpZXc6IGNvbW1hbmQucHJvdmlkZXNQcmV2aWV3LFxuXHRcdFx0cHJldmlld2VyOiAhY29tbWFuZC5wcmV2aWV3ZXIgPyB1bmRlZmluZWQgOiB0aGlzLl9hcHBDb21tYW5kUHJldmlld2VyLmJpbmQodGhpcyksXG5cdFx0XHRwcmV2aWV3Q2FsbGJhY2s6ICFjb21tYW5kLmV4ZWN1dGVQcmV2aWV3SXRlbSA/IHVuZGVmaW5lZCA6IHRoaXMuX2FwcENvbW1hbmRQcmV2aWV3RXhlY3V0b3IuYmluZCh0aGlzKSxcblx0XHR9O1xuXG5cdFx0Um9ja2V0Q2hhdC5zbGFzaENvbW1hbmRzLmNvbW1hbmRzW2NvbW1hbmQuY29tbWFuZC50b0xvd2VyQ2FzZSgpXSA9IGl0ZW07XG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZEFkZGVkKGNvbW1hbmQuY29tbWFuZC50b0xvd2VyQ2FzZSgpKTtcblx0fVxuXG5cdHVucmVnaXN0ZXJDb21tYW5kKGNvbW1hbmQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyB1bnJlZ2lzdGVyaW5nIHRoZSBjb21tYW5kOiBcIiR7IGNvbW1hbmQgfVwiYCk7XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdzdHJpbmcnIHx8IGNvbW1hbmQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBtdXN0IGJlIGEgc3RyaW5nLicpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGNtZCA9IGNvbW1hbmQudG9Mb3dlckNhc2UoKTtcblx0XHR0aGlzLmRpc2FibGVkQ29tbWFuZHMuZGVsZXRlKGNtZCk7XG5cdFx0ZGVsZXRlIFJvY2tldENoYXQuc2xhc2hDb21tYW5kcy5jb21tYW5kc1tjbWRdO1xuXG5cdFx0dGhpcy5vcmNoLmdldE5vdGlmaWVyKCkuY29tbWFuZFJlbW92ZWQoY21kKTtcblx0fVxuXG5cdF92ZXJpZnlDb21tYW5kKGNvbW1hbmQpIHtcblx0XHRpZiAodHlwZW9mIGNvbW1hbmQgIT09ICdvYmplY3QnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU2xhc2ggQ29tbWFuZCBwYXJhbWV0ZXIgcHJvdmlkZWQsIGl0IG11c3QgYmUgYSB2YWxpZCBJU2xhc2hDb21tYW5kIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIGNvbW1hbmQuY29tbWFuZCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTbGFzaCBDb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgaXQgbXVzdCBiZSBhIHZhbGlkIElTbGFzaENvbW1hbmQgb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGlmIChjb21tYW5kLmkxOG5QYXJhbXNFeGFtcGxlICYmIHR5cGVvZiBjb21tYW5kLmkxOG5QYXJhbXNFeGFtcGxlICE9PSAnc3RyaW5nJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNsYXNoIENvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBpdCBtdXN0IGJlIGEgdmFsaWQgSVNsYXNoQ29tbWFuZCBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGNvbW1hbmQuaTE4bkRlc2NyaXB0aW9uICYmIHR5cGVvZiBjb21tYW5kLmkxOG5EZXNjcmlwdGlvbiAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTbGFzaCBDb21tYW5kIHBhcmFtZXRlciBwcm92aWRlZCwgaXQgbXVzdCBiZSBhIHZhbGlkIElTbGFzaENvbW1hbmQgb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgY29tbWFuZC5wcm92aWRlc1ByZXZpZXcgIT09ICdib29sZWFuJykge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNsYXNoIENvbW1hbmQgcGFyYW1ldGVyIHByb3ZpZGVkLCBpdCBtdXN0IGJlIGEgdmFsaWQgSVNsYXNoQ29tbWFuZCBvYmplY3QuJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBjb21tYW5kLmV4ZWN1dG9yICE9PSAnZnVuY3Rpb24nKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU2xhc2ggQ29tbWFuZCBwYXJhbWV0ZXIgcHJvdmlkZWQsIGl0IG11c3QgYmUgYSB2YWxpZCBJU2xhc2hDb21tYW5kIG9iamVjdC4nKTtcblx0XHR9XG5cdH1cblxuXHRfYXBwQ29tbWFuZEV4ZWN1dG9yKGNvbW1hbmQsIHBhcmFtZXRlcnMsIG1lc3NhZ2UpIHtcblx0XHRjb25zdCB1c2VyID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3VzZXJzJykuY29udmVydEJ5SWQoTWV0ZW9yLnVzZXJJZCgpKTtcblx0XHRjb25zdCByb29tID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3Jvb21zJykuY29udmVydEJ5SWQobWVzc2FnZS5yaWQpO1xuXHRcdGNvbnN0IHBhcmFtcyA9IHBhcmFtZXRlcnMubGVuZ3RoID09PSAwIHx8IHBhcmFtZXRlcnMgPT09ICcgJyA/IFtdIDogcGFyYW1ldGVycy5zcGxpdCgnICcpO1xuXG5cdFx0Y29uc3QgY29udGV4dCA9IG5ldyBTbGFzaENvbW1hbmRDb250ZXh0KE9iamVjdC5mcmVlemUodXNlciksIE9iamVjdC5mcmVlemUocm9vbSksIE9iamVjdC5mcmVlemUocGFyYW1zKSk7XG5cdFx0UHJvbWlzZS5hd2FpdCh0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldENvbW1hbmRNYW5hZ2VyKCkuZXhlY3V0ZUNvbW1hbmQoY29tbWFuZCwgY29udGV4dCkpO1xuXHR9XG5cblx0X2FwcENvbW1hbmRQcmV2aWV3ZXIoY29tbWFuZCwgcGFyYW1ldGVycywgbWVzc2FnZSkge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdGNvbnN0IHJvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0Y29uc3QgcGFyYW1zID0gcGFyYW1ldGVycy5sZW5ndGggPT09IDAgfHwgcGFyYW1ldGVycyA9PT0gJyAnID8gW10gOiBwYXJhbWV0ZXJzLnNwbGl0KCcgJyk7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gbmV3IFNsYXNoQ29tbWFuZENvbnRleHQoT2JqZWN0LmZyZWV6ZSh1c2VyKSwgT2JqZWN0LmZyZWV6ZShyb29tKSwgT2JqZWN0LmZyZWV6ZShwYXJhbXMpKTtcblx0XHRyZXR1cm4gUHJvbWlzZS5hd2FpdCh0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldENvbW1hbmRNYW5hZ2VyKCkuZ2V0UHJldmlld3MoY29tbWFuZCwgY29udGV4dCkpO1xuXHR9XG5cblx0X2FwcENvbW1hbmRQcmV2aWV3RXhlY3V0b3IoY29tbWFuZCwgcGFyYW1ldGVycywgbWVzc2FnZSwgcHJldmlldykge1xuXHRcdGNvbnN0IHVzZXIgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChNZXRlb3IudXNlcklkKCkpO1xuXHRcdGNvbnN0IHJvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChtZXNzYWdlLnJpZCk7XG5cdFx0Y29uc3QgcGFyYW1zID0gcGFyYW1ldGVycy5sZW5ndGggPT09IDAgfHwgcGFyYW1ldGVycyA9PT0gJyAnID8gW10gOiBwYXJhbWV0ZXJzLnNwbGl0KCcgJyk7XG5cblx0XHRjb25zdCBjb250ZXh0ID0gbmV3IFNsYXNoQ29tbWFuZENvbnRleHQoT2JqZWN0LmZyZWV6ZSh1c2VyKSwgT2JqZWN0LmZyZWV6ZShyb29tKSwgT2JqZWN0LmZyZWV6ZShwYXJhbXMpKTtcblx0XHRQcm9taXNlLmF3YWl0KHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZ2V0Q29tbWFuZE1hbmFnZXIoKS5leGVjdXRlUHJldmlldyhjb21tYW5kLCBwcmV2aWV3LCBjb250ZXh0KSk7XG5cdH1cbn1cbiIsImV4cG9ydCBjbGFzcyBBcHBFbnZpcm9ubWVudGFsVmFyaWFibGVCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmFsbG93ZWQgPSBbJ05PREVfRU5WJywgJ1JPT1RfVVJMJywgJ0lOU1RBTkNFX0lQJ107XG5cdH1cblxuXHRhc3luYyBnZXRWYWx1ZUJ5TmFtZShlbnZWYXJOYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgZW52aXJvbm1lbnRhbCB2YXJpYWJsZSB2YWx1ZSAkeyBlbnZWYXJOYW1lIH0uYCk7XG5cblx0XHRpZiAodGhpcy5pc1JlYWRhYmxlKGVudlZhck5hbWUsIGFwcElkKSkge1xuXHRcdFx0cmV0dXJuIHByb2Nlc3MuZW52W2VudlZhck5hbWVdO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcihgVGhlIGVudmlyb25tZW50YWwgdmFyaWFibGUgXCIkeyBlbnZWYXJOYW1lIH1cIiBpcyBub3QgcmVhZGFibGUuYCk7XG5cdH1cblxuXHRhc3luYyBpc1JlYWRhYmxlKGVudlZhck5hbWUsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBjaGVja2luZyBpZiB0aGUgZW52aXJvbm1lbnRhbCB2YXJpYWJsZSBpcyByZWFkYWJsZSAkeyBlbnZWYXJOYW1lIH0uYCk7XG5cblx0XHRyZXR1cm4gdGhpcy5hbGxvd2VkLmluY2x1ZGVzKGVudlZhck5hbWUudG9VcHBlckNhc2UoKSk7XG5cdH1cblxuXHRhc3luYyBpc1NldChlbnZWYXJOYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgY2hlY2tpbmcgaWYgdGhlIGVudmlyb25tZW50YWwgdmFyaWFibGUgaXMgc2V0ICR7IGVudlZhck5hbWUgfS5gKTtcblxuXHRcdGlmICh0aGlzLmlzUmVhZGFibGUoZW52VmFyTmFtZSwgYXBwSWQpKSB7XG5cdFx0XHRyZXR1cm4gdHlwZW9mIHByb2Nlc3MuZW52W2VudlZhck5hbWVdICE9PSAndW5kZWZpbmVkJztcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBlbnZpcm9ubWVudGFsIHZhcmlhYmxlIFwiJHsgZW52VmFyTmFtZSB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwTWVzc2FnZUJyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlKG1lc3NhZ2UsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBjcmVhdGluZyBhIG5ldyBtZXNzYWdlLmApO1xuXG5cdFx0bGV0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdFx0TWV0ZW9yLnJ1bkFzVXNlcihtc2cudS5faWQsICgpID0+IHtcblx0XHRcdG1zZyA9IE1ldGVvci5jYWxsKCdzZW5kTWVzc2FnZScsIG1zZyk7XG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gbXNnLl9pZDtcblx0fVxuXG5cdGFzeW5jIGdldEJ5SWQobWVzc2FnZUlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgbWVzc2FnZTogXCIkeyBtZXNzYWdlSWQgfVwiYCk7XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ21lc3NhZ2VzJykuY29udmVydEJ5SWQobWVzc2FnZUlkKTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZShtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgdXBkYXRpbmcgYSBtZXNzYWdlLmApO1xuXG5cdFx0aWYgKCFtZXNzYWdlLmVkaXRvcikge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGVkaXRvciBhc3NpZ25lZCB0byB0aGUgbWVzc2FnZSBmb3IgdGhlIHVwZGF0ZS4nKTtcblx0XHR9XG5cblx0XHRpZiAoIW1lc3NhZ2UuaWQgfHwgIVJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLmZpbmRPbmVCeUlkKG1lc3NhZ2UuaWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0EgbWVzc2FnZSBtdXN0IGV4aXN0IHRvIHVwZGF0ZS4nKTtcblx0XHR9XG5cblx0XHRjb25zdCBtc2cgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnbWVzc2FnZXMnKS5jb252ZXJ0QXBwTWVzc2FnZShtZXNzYWdlKTtcblx0XHRjb25zdCBlZGl0b3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChtZXNzYWdlLmVkaXRvci5pZCk7XG5cblx0XHRSb2NrZXRDaGF0LnVwZGF0ZU1lc3NhZ2UobXNnLCBlZGl0b3IpO1xuXHR9XG5cblx0YXN5bmMgbm90aWZ5VXNlcih1c2VyLCBtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgbm90aWZ5aW5nIGEgdXNlci5gKTtcblxuXHRcdGNvbnN0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIodXNlci5pZCwgJ21lc3NhZ2UnLCBPYmplY3QuYXNzaWduKG1zZywge1xuXHRcdFx0X2lkOiBSYW5kb20uaWQoKSxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0dTogdW5kZWZpbmVkLFxuXHRcdFx0ZWRpdG9yOiB1bmRlZmluZWQsXG5cdFx0fSkpO1xuXHR9XG5cblx0YXN5bmMgbm90aWZ5Um9vbShyb29tLCBtZXNzYWdlLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgbm90aWZ5aW5nIGEgcm9vbSdzIHVzZXJzLmApO1xuXG5cdFx0aWYgKHJvb20pIHtcblx0XHRcdGNvbnN0IG1zZyA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdtZXNzYWdlcycpLmNvbnZlcnRBcHBNZXNzYWdlKG1lc3NhZ2UpO1xuXHRcdFx0Y29uc3Qgcm1zZyA9IE9iamVjdC5hc3NpZ24obXNnLCB7XG5cdFx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRcdHJpZDogcm9vbS5pZCxcblx0XHRcdFx0dHM6IG5ldyBEYXRlKCksXG5cdFx0XHRcdHU6IHVuZGVmaW5lZCxcblx0XHRcdFx0ZWRpdG9yOiB1bmRlZmluZWQsXG5cdFx0XHR9KTtcblxuXHRcdFx0Y29uc3QgdXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRCeVJvb21JZFdoZW5Vc2VySWRFeGlzdHMocm9vbS5faWQsIHsgZmllbGRzOiB7ICd1Ll9pZCc6IDEgfSB9KVxuXHRcdFx0XHQuZmV0Y2goKVxuXHRcdFx0XHQubWFwKChzKSA9PiBzLnUuX2lkKTtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRCeUlkcyh1c2VycywgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSlcblx0XHRcdFx0LmZldGNoKClcblx0XHRcdFx0LmZvckVhY2goKHsgX2lkIH0pID0+XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeVVzZXIoX2lkLCAnbWVzc2FnZScsIHJtc2cpXG5cdFx0XHRcdCk7XG5cdFx0fVxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwUGVyc2lzdGVuY2VCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGFzeW5jIHB1cmdlKGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAncyBwZXJzaXN0ZW50IHN0b3JhZ2UgaXMgYmVpbmcgcHVyZ2VkOiAkeyBhcHBJZCB9YCk7XG5cblx0XHR0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLnJlbW92ZSh7IGFwcElkIH0pO1xuXHR9XG5cblx0YXN5bmMgY3JlYXRlKGRhdGEsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBzdG9yaW5nIGEgbmV3IG9iamVjdCBpbiB0aGVpciBwZXJzaXN0ZW5jZS5gLCBkYXRhKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5pbnNlcnQoeyBhcHBJZCwgZGF0YSB9KTtcblx0fVxuXG5cdGFzeW5jIGNyZWF0ZVdpdGhBc3NvY2lhdGlvbnMoZGF0YSwgYXNzb2NpYXRpb25zLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgc3RvcmluZyBhIG5ldyBvYmplY3QgaW4gdGhlaXIgcGVyc2lzdGVuY2UgdGhhdCBpcyBhc3NvY2lhdGVkIHdpdGggc29tZSBtb2RlbHMuYCwgZGF0YSwgYXNzb2NpYXRpb25zKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5pbnNlcnQoeyBhcHBJZCwgYXNzb2NpYXRpb25zLCBkYXRhIH0pO1xuXHR9XG5cblx0YXN5bmMgcmVhZEJ5SWQoaWQsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyByZWFkaW5nIHRoZWlyIGRhdGEgaW4gdGhlaXIgcGVyc2lzdGVuY2Ugd2l0aCB0aGUgaWQ6IFwiJHsgaWQgfVwiYCk7XG5cblx0XHRjb25zdCByZWNvcmQgPSB0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLmZpbmRPbmVCeUlkKGlkKTtcblxuXHRcdHJldHVybiByZWNvcmQuZGF0YTtcblx0fVxuXG5cdGFzeW5jIHJlYWRCeUFzc29jaWF0aW9ucyhhc3NvY2lhdGlvbnMsIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyBzZWFyY2hpbmcgZm9yIHJlY29yZHMgdGhhdCBhcmUgYXNzb2NpYXRlZCB3aXRoIHRoZSBmb2xsb3dpbmc6YCwgYXNzb2NpYXRpb25zKTtcblxuXHRcdGNvbnN0IHJlY29yZHMgPSB0aGlzLm9yY2guZ2V0UGVyc2lzdGVuY2VNb2RlbCgpLmZpbmQoe1xuXHRcdFx0YXBwSWQsXG5cdFx0XHRhc3NvY2lhdGlvbnM6IHsgJGFsbDogYXNzb2NpYXRpb25zIH0sXG5cdFx0fSkuZmV0Y2goKTtcblxuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KHJlY29yZHMpID8gcmVjb3Jkcy5tYXAoKHIpID0+IHIuZGF0YSkgOiBbXTtcblx0fVxuXG5cdGFzeW5jIHJlbW92ZShpZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHJlbW92aW5nIG9uZSBvZiB0aGVpciByZWNvcmRzIGJ5IHRoZSBpZDogXCIkeyBpZCB9XCJgKTtcblxuXHRcdGNvbnN0IHJlY29yZCA9IHRoaXMub3JjaC5nZXRQZXJzaXN0ZW5jZU1vZGVsKCkuZmluZE9uZSh7IF9pZDogaWQsIGFwcElkIH0pO1xuXG5cdFx0aWYgKCFyZWNvcmQpIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0dGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5yZW1vdmUoeyBfaWQ6IGlkLCBhcHBJZCB9KTtcblxuXHRcdHJldHVybiByZWNvcmQuZGF0YTtcblx0fVxuXG5cdGFzeW5jIHJlbW92ZUJ5QXNzb2NpYXRpb25zKGFzc29jaWF0aW9ucywgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHJlbW92aW5nIHJlY29yZHMgd2l0aCB0aGUgZm9sbG93aW5nIGFzc29jaWF0aW9uczpgLCBhc3NvY2lhdGlvbnMpO1xuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRhcHBJZCxcblx0XHRcdGFzc29jaWF0aW9uczoge1xuXHRcdFx0XHQkYWxsOiBhc3NvY2lhdGlvbnMsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRjb25zdCByZWNvcmRzID0gdGhpcy5vcmNoLmdldFBlcnNpc3RlbmNlTW9kZWwoKS5maW5kKHF1ZXJ5KS5mZXRjaCgpO1xuXG5cdFx0aWYgKCFyZWNvcmRzKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHRoaXMub3JjaC5nZXRQZXJzaXN0ZW5jZU1vZGVsKCkucmVtb3ZlKHF1ZXJ5KTtcblxuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KHJlY29yZHMpID8gcmVjb3Jkcy5tYXAoKHIpID0+IHIuZGF0YSkgOiBbXTtcblx0fVxuXG5cdGFzeW5jIHVwZGF0ZShpZCwgZGF0YSwgdXBzZXJ0LCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgdXBkYXRpbmcgdGhlIHJlY29yZCBcIiR7IGlkIH1cIiB0bzpgLCBkYXRhKTtcblxuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignQXR0ZW1wdGVkIHRvIHN0b3JlIGFuIGludmFsaWQgZGF0YSB0eXBlLCBpdCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcblx0XHR9XG5cblx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUm9vbVR5cGUgfSBmcm9tICdAcm9ja2V0LmNoYXQvYXBwcy1lbmdpbmUvZGVmaW5pdGlvbi9yb29tcyc7XG5cbmV4cG9ydCBjbGFzcyBBcHBSb29tQnJpZGdlIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRhc3luYyBjcmVhdGUocm9vbSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGNyZWF0aW5nIGEgbmV3IHJvb20uYCwgcm9vbSk7XG5cblx0XHRjb25zdCByY1Jvb20gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QXBwUm9vbShyb29tKTtcblx0XHRsZXQgbWV0aG9kO1xuXG5cdFx0c3dpdGNoIChyb29tLnR5cGUpIHtcblx0XHRcdGNhc2UgUm9vbVR5cGUuQ0hBTk5FTDpcblx0XHRcdFx0bWV0aG9kID0gJ2NyZWF0ZUNoYW5uZWwnO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgUm9vbVR5cGUuUFJJVkFURV9HUk9VUDpcblx0XHRcdFx0bWV0aG9kID0gJ2NyZWF0ZVByaXZhdGVHcm91cCc7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdPbmx5IGNoYW5uZWxzIGFuZCBwcml2YXRlIGdyb3VwcyBjYW4gYmUgY3JlYXRlZC4nKTtcblx0XHR9XG5cblx0XHRsZXQgcmlkO1xuXHRcdE1ldGVvci5ydW5Bc1VzZXIocm9vbS5jcmVhdG9yLmlkLCAoKSA9PiB7XG5cdFx0XHRjb25zdCBpbmZvID0gTWV0ZW9yLmNhbGwobWV0aG9kLCByY1Jvb20ubWVtYmVycyk7XG5cdFx0XHRyaWQgPSBpbmZvLnJpZDtcblx0XHR9KTtcblxuXHRcdHJldHVybiByaWQ7XG5cdH1cblxuXHRhc3luYyBnZXRCeUlkKHJvb21JZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb21CeUlkOiBcIiR7IHJvb21JZCB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlJZChyb29tSWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0QnlOYW1lKHJvb21OYW1lLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgcm9vbUJ5TmFtZTogXCIkeyByb29tTmFtZSB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QnlOYW1lKHJvb21OYW1lKTtcblx0fVxuXG5cdGFzeW5jIGdldENyZWF0b3JCeUlkKHJvb21JZCwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb20ncyBjcmVhdG9yIGJ5IGlkOiBcIiR7IHJvb21JZCB9XCJgKTtcblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdFx0aWYgKCFyb29tIHx8ICFyb29tLnUgfHwgIXJvb20udS5faWQpIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeUlkKHJvb20udS5faWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0Q3JlYXRvckJ5TmFtZShyb29tTmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHJvb20ncyBjcmVhdG9yIGJ5IG5hbWU6IFwiJHsgcm9vbU5hbWUgfVwiYCk7XG5cblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5TmFtZShyb29tTmFtZSk7XG5cblx0XHRpZiAoIXJvb20gfHwgIXJvb20udSB8fCAhcm9vbS51Ll9pZCkge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3VzZXJzJykuY29udmVydEJ5SWQocm9vbS51Ll9pZCk7XG5cdH1cblxuXHRhc3luYyB1cGRhdGUocm9vbSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHVwZGF0aW5nIGEgcm9vbS5gKTtcblxuXHRcdGlmICghcm9vbS5pZCB8fCBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tLmlkKSkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdBIHJvb20gbXVzdCBleGlzdCB0byB1cGRhdGUuJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm0gPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QXBwUm9vbShyb29tKTtcblxuXHRcdFJvY2tldENoYXQubW9kZWxzLlJvb21zLnVwZGF0ZShybS5faWQsIHJtKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcFNldHRpbmdCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmFsbG93ZWRHcm91cHMgPSBbXTtcblx0XHR0aGlzLmRpc2FsbG93ZWRTZXR0aW5ncyA9IFtcblx0XHRcdCdBY2NvdW50c19SZWdpc3RyYXRpb25Gb3JtX1NlY3JldFVSTCcsICdDUk9XRF9BUFBfVVNFUk5BTUUnLCAnQ1JPV0RfQVBQX1BBU1NXT1JEJywgJ0RpcmVjdF9SZXBseV9Vc2VybmFtZScsXG5cdFx0XHQnRGlyZWN0X1JlcGx5X1Bhc3N3b3JkJywgJ1NNVFBfVXNlcm5hbWUnLCAnU01UUF9QYXNzd29yZCcsICdGaWxlVXBsb2FkX1MzX0FXU0FjY2Vzc0tleUlkJywgJ0ZpbGVVcGxvYWRfUzNfQVdTU2VjcmV0QWNjZXNzS2V5Jyxcblx0XHRcdCdGaWxlVXBsb2FkX1MzX0J1Y2tldFVSTCcsICdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfQnVja2V0JywgJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9BY2Nlc3NJZCcsXG5cdFx0XHQnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1NlY3JldCcsICdHb29nbGVWaXNpb25fU2VydmljZUFjY291bnQnLCAnQWxsb3dfSW52YWxpZF9TZWxmU2lnbmVkX0NlcnRzJywgJ0dvb2dsZVRhZ01hbmFnZXJfaWQnLFxuXHRcdFx0J0J1Z3NuYWdfYXBpX2tleScsICdMREFQX0NBX0NlcnQnLCAnTERBUF9SZWplY3RfVW5hdXRob3JpemVkJywgJ0xEQVBfRG9tYWluX1NlYXJjaF9Vc2VyJywgJ0xEQVBfRG9tYWluX1NlYXJjaF9QYXNzd29yZCcsXG5cdFx0XHQnTGl2ZWNoYXRfc2VjcmV0X3Rva2VuJywgJ0xpdmVjaGF0X0tub3dsZWRnZV9BcGlhaV9LZXknLCAnQXV0b1RyYW5zbGF0ZV9Hb29nbGVBUElLZXknLCAnTWFwVmlld19HTWFwc0FQSUtleScsXG5cdFx0XHQnTWV0YV9mYl9hcHBfaWQnLCAnTWV0YV9nb29nbGUtc2l0ZS12ZXJpZmljYXRpb24nLCAnTWV0YV9tc3ZhbGlkYXRlMDEnLCAnQWNjb3VudHNfT0F1dGhfRG9scGhpbl9zZWNyZXQnLFxuXHRcdFx0J0FjY291bnRzX09BdXRoX0RydXBhbF9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfRmFjZWJvb2tfc2VjcmV0JywgJ0FjY291bnRzX09BdXRoX0dpdGh1Yl9zZWNyZXQnLCAnQVBJX0dpdEh1Yl9FbnRlcnByaXNlX1VSTCcsXG5cdFx0XHQnQWNjb3VudHNfT0F1dGhfR2l0SHViX0VudGVycHJpc2Vfc2VjcmV0JywgJ0FQSV9HaXRsYWJfVVJMJywgJ0FjY291bnRzX09BdXRoX0dpdGxhYl9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfR29vZ2xlX3NlY3JldCcsXG5cdFx0XHQnQWNjb3VudHNfT0F1dGhfTGlua2VkaW5fc2VjcmV0JywgJ0FjY291bnRzX09BdXRoX01ldGVvcl9zZWNyZXQnLCAnQWNjb3VudHNfT0F1dGhfVHdpdHRlcl9zZWNyZXQnLCAnQVBJX1dvcmRwcmVzc19VUkwnLFxuXHRcdFx0J0FjY291bnRzX09BdXRoX1dvcmRwcmVzc19zZWNyZXQnLCAnUHVzaF9hcG5fcGFzc3BocmFzZScsICdQdXNoX2Fwbl9rZXknLCAnUHVzaF9hcG5fY2VydCcsICdQdXNoX2Fwbl9kZXZfcGFzc3BocmFzZScsXG5cdFx0XHQnUHVzaF9hcG5fZGV2X2tleScsICdQdXNoX2Fwbl9kZXZfY2VydCcsICdQdXNoX2djbV9hcGlfa2V5JywgJ1B1c2hfZ2NtX3Byb2plY3RfbnVtYmVyJywgJ1NBTUxfQ3VzdG9tX0RlZmF1bHRfY2VydCcsXG5cdFx0XHQnU0FNTF9DdXN0b21fRGVmYXVsdF9wcml2YXRlX2tleScsICdTbGFja0JyaWRnZV9BUElUb2tlbicsICdTbWFyc2hfRW1haWwnLCAnU01TX1R3aWxpb19BY2NvdW50X1NJRCcsICdTTVNfVHdpbGlvX2F1dGhUb2tlbicsXG5cdFx0XTtcblx0fVxuXG5cdGFzeW5jIGdldEFsbChhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyBhbGwgdGhlIHNldHRpbmdzLmApO1xuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlNldHRpbmdzLmZpbmQoeyBfaWQ6IHsgJG5pbjogdGhpcy5kaXNhbGxvd2VkU2V0dGluZ3MgfSB9KVxuXHRcdFx0LmZldGNoKClcblx0XHRcdC5tYXAoKHMpID0+IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdzZXR0aW5ncycpLmNvbnZlcnRUb0FwcChzKSk7XG5cdH1cblxuXHRhc3luYyBnZXRPbmVCeUlkKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgc2V0dGluZyBieSBpZCAkeyBpZCB9LmApO1xuXG5cdFx0aWYgKCF0aGlzLmlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIHNldHRpbmcgXCIkeyBpZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnc2V0dGluZ3MnKS5jb252ZXJ0QnlJZChpZCk7XG5cdH1cblxuXHRhc3luYyBoaWRlR3JvdXAobmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGhpZGRpbmcgdGhlIGdyb3VwICR7IG5hbWUgfS5gKTtcblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxuXG5cdGFzeW5jIGhpZGVTZXR0aW5nKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgaGlkZGluZyB0aGUgc2V0dGluZyAkeyBpZCB9LmApO1xuXG5cdFx0aWYgKCF0aGlzLmlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVGhlIHNldHRpbmcgXCIkeyBpZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxuXG5cdGFzeW5jIGlzUmVhZGFibGVCeUlkKGlkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgY2hlY2tpbmcgaWYgdGhleSBjYW4gcmVhZCB0aGUgc2V0dGluZyAkeyBpZCB9LmApO1xuXG5cdFx0cmV0dXJuICF0aGlzLmRpc2FsbG93ZWRTZXR0aW5ncy5pbmNsdWRlcyhpZCk7XG5cdH1cblxuXHRhc3luYyB1cGRhdGVPbmUoc2V0dGluZywgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHVwZGF0aW5nIHRoZSBzZXR0aW5nICR7IHNldHRpbmcuaWQgfSAuYCk7XG5cblx0XHRpZiAoIXRoaXMuaXNSZWFkYWJsZUJ5SWQoc2V0dGluZy5pZCwgYXBwSWQpKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYFRoZSBzZXR0aW5nIFwiJHsgc2V0dGluZy5pZCB9XCIgaXMgbm90IHJlYWRhYmxlLmApO1xuXHRcdH1cblxuXHRcdHRocm93IG5ldyBFcnJvcignTWV0aG9kIG5vdCBpbXBsZW1lbnRlZC4nKTtcblx0fVxufVxuIiwiZXhwb3J0IGNsYXNzIEFwcFVzZXJCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGFzeW5jIGdldEJ5SWQodXNlcklkLCBhcHBJZCkge1xuXHRcdGNvbnNvbGUubG9nKGBUaGUgQXBwICR7IGFwcElkIH0gaXMgZ2V0dGluZyB0aGUgdXNlcklkOiBcIiR7IHVzZXJJZCB9XCJgKTtcblxuXHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZCh1c2VySWQpO1xuXHR9XG5cblx0YXN5bmMgZ2V0QnlVc2VybmFtZSh1c2VybmFtZSwgYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIGdldHRpbmcgdGhlIHVzZXJuYW1lOiBcIiR7IHVzZXJuYW1lIH1cImApO1xuXG5cdFx0cmV0dXJuIHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeVVzZXJuYW1lKHVzZXJuYW1lKTtcblx0fVxufVxuIiwiaW1wb3J0IHsgUmVhbEFwcEJyaWRnZXMgfSBmcm9tICcuL2JyaWRnZXMnO1xuaW1wb3J0IHsgQXBwQWN0aXZhdGlvbkJyaWRnZSB9IGZyb20gJy4vYWN0aXZhdGlvbic7XG5pbXBvcnQgeyBBcHBDb21tYW5kc0JyaWRnZSB9IGZyb20gJy4vY29tbWFuZHMnO1xuaW1wb3J0IHsgQXBwRW52aXJvbm1lbnRhbFZhcmlhYmxlQnJpZGdlIH0gZnJvbSAnLi9lbnZpcm9ubWVudGFsJztcbmltcG9ydCB7IEFwcEh0dHBCcmlkZ2UgfSBmcm9tICcuL2h0dHAnO1xuaW1wb3J0IHsgQXBwTGlzdGVuZXJCcmlkZ2UgfSBmcm9tICcuL2xpc3RlbmVycyc7XG5pbXBvcnQgeyBBcHBNZXNzYWdlQnJpZGdlIH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBBcHBQZXJzaXN0ZW5jZUJyaWRnZSB9IGZyb20gJy4vcGVyc2lzdGVuY2UnO1xuaW1wb3J0IHsgQXBwUm9vbUJyaWRnZSB9IGZyb20gJy4vcm9vbXMnO1xuaW1wb3J0IHsgQXBwU2V0dGluZ0JyaWRnZSB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgQXBwVXNlckJyaWRnZSB9IGZyb20gJy4vdXNlcnMnO1xuXG5leHBvcnQge1xuXHRSZWFsQXBwQnJpZGdlcyxcblx0QXBwQWN0aXZhdGlvbkJyaWRnZSxcblx0QXBwQ29tbWFuZHNCcmlkZ2UsXG5cdEFwcEVudmlyb25tZW50YWxWYXJpYWJsZUJyaWRnZSxcblx0QXBwSHR0cEJyaWRnZSxcblx0QXBwTGlzdGVuZXJCcmlkZ2UsXG5cdEFwcE1lc3NhZ2VCcmlkZ2UsXG5cdEFwcFBlcnNpc3RlbmNlQnJpZGdlLFxuXHRBcHBSb29tQnJpZGdlLFxuXHRBcHBTZXR0aW5nQnJpZGdlLFxuXHRBcHBVc2VyQnJpZGdlLFxufTtcbiIsImltcG9ydCBleHByZXNzIGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHsgV2ViQXBwIH0gZnJvbSAnbWV0ZW9yL3dlYmFwcCc7XG5cbmNvbnN0IGFwaVNlcnZlciA9IGV4cHJlc3MoKTtcbldlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKGFwaVNlcnZlcik7XG5cbmV4cG9ydCBjbGFzcyBBcHBBcGlzQnJpZGdlIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdFx0dGhpcy5hcHBSb3V0ZXJzID0gbmV3IE1hcCgpO1xuXG5cdFx0Ly8gYXBpU2VydmVyLnVzZSgnL2FwaS9hcHBzJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZyh7XG5cdFx0Ly8gXHRcdG1ldGhvZDogcmVxLm1ldGhvZC50b0xvd2VyQ2FzZSgpLFxuXHRcdC8vIFx0XHR1cmw6IHJlcS51cmwsXG5cdFx0Ly8gXHRcdHF1ZXJ5OiByZXEucXVlcnksXG5cdFx0Ly8gXHRcdGJvZHk6IHJlcS5ib2R5LFxuXHRcdC8vIFx0fSk7XG5cdFx0Ly8gXHRuZXh0KCk7XG5cdFx0Ly8gfSk7XG5cblx0XHRhcGlTZXJ2ZXIudXNlKCcvYXBpL2FwcHMvcHJpdmF0ZS86YXBwSWQvOmhhc2gnLCAocmVxLCByZXMpID0+IHtcblx0XHRcdGNvbnN0IG5vdEZvdW5kID0gKCkgPT4gcmVzLnNlbmQoNDA0KTtcblxuXHRcdFx0Y29uc3Qgcm91dGVyID0gdGhpcy5hcHBSb3V0ZXJzLmdldChyZXEucGFyYW1zLmFwcElkKTtcblxuXHRcdFx0aWYgKHJvdXRlcikge1xuXHRcdFx0XHRyZXEuX3ByaXZhdGVIYXNoID0gcmVxLnBhcmFtcy5oYXNoO1xuXHRcdFx0XHRyZXR1cm4gcm91dGVyKHJlcSwgcmVzLCBub3RGb3VuZCk7XG5cdFx0XHR9XG5cblx0XHRcdG5vdEZvdW5kKCk7XG5cdFx0fSk7XG5cblx0XHRhcGlTZXJ2ZXIudXNlKCcvYXBpL2FwcHMvcHVibGljLzphcHBJZCcsIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0Y29uc3Qgbm90Rm91bmQgPSAoKSA9PiByZXMuc2VuZCg0MDQpO1xuXG5cdFx0XHRjb25zdCByb3V0ZXIgPSB0aGlzLmFwcFJvdXRlcnMuZ2V0KHJlcS5wYXJhbXMuYXBwSWQpO1xuXG5cdFx0XHRpZiAocm91dGVyKSB7XG5cdFx0XHRcdHJldHVybiByb3V0ZXIocmVxLCByZXMsIG5vdEZvdW5kKTtcblx0XHRcdH1cblxuXHRcdFx0bm90Rm91bmQoKTtcblx0XHR9KTtcblx0fVxuXG5cdHJlZ2lzdGVyQXBpKHsgYXBpLCBjb21wdXRlZFBhdGgsIGVuZHBvaW50IH0sIGFwcElkKSB7XG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgYXBwSWQgfSBpcyByZWdpc3RlcmluZyB0aGUgYXBpOiBcIiR7IGVuZHBvaW50LnBhdGggfVwiICgkeyBjb21wdXRlZFBhdGggfSlgKTtcblxuXHRcdHRoaXMuX3ZlcmlmeUFwaShhcGksIGVuZHBvaW50KTtcblxuXHRcdGlmICghdGhpcy5hcHBSb3V0ZXJzLmdldChhcHBJZCkpIHtcblx0XHRcdHRoaXMuYXBwUm91dGVycy5zZXQoYXBwSWQsIGV4cHJlc3MuUm91dGVyKCkpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cdFx0fVxuXG5cdFx0Y29uc3Qgcm91dGVyID0gdGhpcy5hcHBSb3V0ZXJzLmdldChhcHBJZCk7XG5cblx0XHRjb25zdCBtZXRob2QgPSBhcGkubWV0aG9kIHx8ICdhbGwnO1xuXG5cdFx0bGV0IHJvdXRlUGF0aCA9IGVuZHBvaW50LnBhdGgudHJpbSgpO1xuXHRcdGlmICghcm91dGVQYXRoLnN0YXJ0c1dpdGgoJy8nKSkge1xuXHRcdFx0cm91dGVQYXRoID0gYC8keyByb3V0ZVBhdGggfWA7XG5cdFx0fVxuXG5cdFx0cm91dGVyW21ldGhvZF0ocm91dGVQYXRoLCBNZXRlb3IuYmluZEVudmlyb25tZW50KHRoaXMuX2FwcEFwaUV4ZWN1dG9yKGFwaSwgZW5kcG9pbnQsIGFwcElkKSkpO1xuXHR9XG5cblx0dW5yZWdpc3RlckFwaXMoYXBwSWQpIHtcblx0XHRjb25zb2xlLmxvZyhgVGhlIEFwcCAkeyBhcHBJZCB9IGlzIHVucmVnaXN0ZXJpbmcgYWxsIGFwaXNgKTtcblxuXHRcdGlmICh0aGlzLmFwcFJvdXRlcnMuZ2V0KGFwcElkKSkge1xuXHRcdFx0dGhpcy5hcHBSb3V0ZXJzLmRlbGV0ZShhcHBJZCk7XG5cdFx0fVxuXHR9XG5cblx0X3ZlcmlmeUFwaShhcGksIGVuZHBvaW50KSB7XG5cdFx0aWYgKHR5cGVvZiBhcGkgIT09ICdvYmplY3QnKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgQXBpIHBhcmFtZXRlciBwcm92aWRlZCwgaXQgbXVzdCBiZSBhIHZhbGlkIElBcGkgb2JqZWN0LicpO1xuXHRcdH1cblxuXHRcdGlmICh0eXBlb2YgZW5kcG9pbnQucGF0aCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBBcGkgcGFyYW1ldGVyIHByb3ZpZGVkLCBpdCBtdXN0IGJlIGEgdmFsaWQgSUFwaSBvYmplY3QuJyk7XG5cdFx0fVxuXHR9XG5cblx0X2FwcEFwaUV4ZWN1dG9yKGFwaSwgZW5kcG9pbnQsIGFwcElkKSB7XG5cdFx0cmV0dXJuIChyZXEsIHJlcykgPT4ge1xuXHRcdFx0Y29uc3QgcmVxdWVzdCA9IHtcblx0XHRcdFx0bWV0aG9kOiByZXEubWV0aG9kLnRvTG93ZXJDYXNlKCksXG5cdFx0XHRcdGhlYWRlcnM6IHJlcS5oZWFkZXJzLFxuXHRcdFx0XHRxdWVyeTogcmVxLnF1ZXJ5IHx8IHt9LFxuXHRcdFx0XHRwYXJhbXM6IHJlcS5wYXJhbXMgfHwge30sXG5cdFx0XHRcdGNvbnRlbnQ6IHJlcS5ib2R5LFxuXHRcdFx0XHRwcml2YXRlSGFzaDogcmVxLl9wcml2YXRlSGFzaCxcblx0XHRcdH07XG5cblx0XHRcdHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZ2V0QXBpTWFuYWdlcigpLmV4ZWN1dGVBcGkoYXBwSWQsIGVuZHBvaW50LnBhdGgsIHJlcXVlc3QpXG5cdFx0XHRcdC50aGVuKCh7IHN0YXR1cywgaGVhZGVycyA9IHt9LCBjb250ZW50IH0pID0+IHtcblx0XHRcdFx0XHRyZXMuc2V0KGhlYWRlcnMpO1xuXHRcdFx0XHRcdHJlcy5zdGF0dXMoc3RhdHVzKTtcblx0XHRcdFx0XHRyZXMuc2VuZChjb250ZW50KTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmNhdGNoKChyZWFzb24pID0+IHtcblx0XHRcdFx0XHQvLyBTaG91bGQgd2UgaGFuZGxlIHRoaXMgYXMgYW4gZXJyb3I/XG5cdFx0XHRcdFx0cmVzLnN0YXR1cyg1MDApLnNlbmQocmVhc29uLm1lc3NhZ2UpO1xuXHRcdFx0XHR9KTtcblx0XHR9O1xuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwRGV0YWlsQ2hhbmdlc0JyaWRnZSB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0b25BcHBTZXR0aW5nc0NoYW5nZShhcHBJZCwgc2V0dGluZykge1xuXHRcdHRyeSB7XG5cdFx0XHR0aGlzLm9yY2guZ2V0Tm90aWZpZXIoKS5hcHBTZXR0aW5nc0NoYW5nZShhcHBJZCwgc2V0dGluZyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS53YXJuKCdmYWlsZWQgdG8gbm90aWZ5IGFib3V0IHRoZSBzZXR0aW5nIGNoYW5nZS4nLCBhcHBJZCk7XG5cdFx0fVxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwSHR0cEJyaWRnZSB7XG5cdGFzeW5jIGNhbGwoaW5mbykge1xuXHRcdGlmICghaW5mby5yZXF1ZXN0LmNvbnRlbnQgJiYgdHlwZW9mIGluZm8ucmVxdWVzdC5kYXRhID09PSAnb2JqZWN0Jykge1xuXHRcdFx0aW5mby5yZXF1ZXN0LmNvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShpbmZvLnJlcXVlc3QuZGF0YSk7XG5cdFx0fVxuXG5cdFx0Y29uc29sZS5sb2coYFRoZSBBcHAgJHsgaW5mby5hcHBJZCB9IGlzIHJlcXVlc3RpbmcgZnJvbSB0aGUgb3V0dGVyIHdlYnM6YCwgaW5mbyk7XG5cblx0XHR0cnkge1xuXHRcdFx0cmV0dXJuIEhUVFAuY2FsbChpbmZvLm1ldGhvZCwgaW5mby51cmwsIGluZm8ucmVxdWVzdCk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmV0dXJuIGUucmVzcG9uc2U7XG5cdFx0fVxuXHR9XG59XG4iLCJleHBvcnQgY2xhc3MgQXBwTGlzdGVuZXJCcmlkZ2Uge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGFzeW5jIG1lc3NhZ2VFdmVudChpbnRlLCBtZXNzYWdlKSB7XG5cdFx0Y29uc3QgbXNnID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ21lc3NhZ2VzJykuY29udmVydE1lc3NhZ2UobWVzc2FnZSk7XG5cdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5nZXRMaXN0ZW5lck1hbmFnZXIoKS5leGVjdXRlTGlzdGVuZXIoaW50ZSwgbXNnKTtcblxuXHRcdGlmICh0eXBlb2YgcmVzdWx0ID09PSAnYm9vbGVhbicpIHtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgnbWVzc2FnZXMnKS5jb252ZXJ0QXBwTWVzc2FnZShyZXN1bHQpO1xuXHRcdH1cblx0XHQvLyB0cnkge1xuXG5cdFx0Ly8gfSBjYXRjaCAoZSkge1xuXHRcdC8vIFx0Y29uc29sZS5sb2coYCR7IGUubmFtZSB9OiAkeyBlLm1lc3NhZ2UgfWApO1xuXHRcdC8vIFx0Y29uc29sZS5sb2coZS5zdGFjayk7XG5cdFx0Ly8gfVxuXHR9XG5cblx0YXN5bmMgcm9vbUV2ZW50KGludGUsIHJvb20pIHtcblx0XHRjb25zdCBybSA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCdyb29tcycpLmNvbnZlcnRSb29tKHJvb20pO1xuXHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZ2V0TGlzdGVuZXJNYW5hZ2VyKCkuZXhlY3V0ZUxpc3RlbmVyKGludGUsIHJtKTtcblxuXHRcdGlmICh0eXBlb2YgcmVzdWx0ID09PSAnYm9vbGVhbicpIHtcblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgncm9vbXMnKS5jb252ZXJ0QXBwUm9vbShyZXN1bHQpO1xuXHRcdH1cblx0XHQvLyB0cnkge1xuXG5cdFx0Ly8gfSBjYXRjaCAoZSkge1xuXHRcdC8vIFx0Y29uc29sZS5sb2coYCR7IGUubmFtZSB9OiAkeyBlLm1lc3NhZ2UgfWApO1xuXHRcdC8vIFx0Y29uc29sZS5sb2coZS5zdGFjayk7XG5cdFx0Ly8gfVxuXHR9XG59XG4iLCJjb25zdCB3YWl0VG9Mb2FkID0gZnVuY3Rpb24ob3JjaCkge1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcblx0XHRsZXQgaWQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG5cdFx0XHRpZiAob3JjaC5pc0VuYWJsZWQoKSAmJiBvcmNoLmlzTG9hZGVkKCkpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChpZCk7XG5cdFx0XHRcdGlkID0gLTE7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH1cblx0XHR9LCAxMDApO1xuXHR9KTtcbn07XG5cbmNvbnN0IHdhaXRUb1VubG9hZCA9IGZ1bmN0aW9uKG9yY2gpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG5cdFx0bGV0IGlkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuXHRcdFx0aWYgKCFvcmNoLmlzRW5hYmxlZCgpICYmICFvcmNoLmlzTG9hZGVkKCkpIHtcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChpZCk7XG5cdFx0XHRcdGlkID0gLTE7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH1cblx0XHR9LCAxMDApO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBjbGFzcyBBcHBNZXRob2RzIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMuX29yY2ggPSBvcmNoO1xuXG5cdFx0dGhpcy5fYWRkTWV0aG9kcygpO1xuXHR9XG5cblx0aXNFbmFibGVkKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fb3JjaCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5fb3JjaC5pc0VuYWJsZWQoKTtcblx0fVxuXG5cdGlzTG9hZGVkKCkge1xuXHRcdHJldHVybiB0eXBlb2YgdGhpcy5fb3JjaCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5fb3JjaC5pc0VuYWJsZWQoKSAmJiB0aGlzLl9vcmNoLmlzTG9hZGVkKCk7XG5cdH1cblxuXHRfYWRkTWV0aG9kcygpIHtcblx0XHRjb25zdCBpbnN0YW5jZSA9IHRoaXM7XG5cblx0XHRNZXRlb3IubWV0aG9kcyh7XG5cdFx0XHQnYXBwcy9pcy1lbmFibGVkJygpIHtcblx0XHRcdFx0cmV0dXJuIGluc3RhbmNlLmlzRW5hYmxlZCgpO1xuXHRcdFx0fSxcblxuXHRcdFx0J2FwcHMvaXMtbG9hZGVkJygpIHtcblx0XHRcdFx0cmV0dXJuIGluc3RhbmNlLmlzTG9hZGVkKCk7XG5cdFx0XHR9LFxuXG5cdFx0XHQnYXBwcy9nby1lbmFibGUnKCkge1xuXHRcdFx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdFx0XHRtZXRob2Q6ICdhcHBzL2dvLWVuYWJsZScsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdtYW5hZ2UtYXBwcycpKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdFx0bWV0aG9kOiAnYXBwcy9nby1lbmFibGUnLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5zZXQoJ0FwcHNfRnJhbWV3b3JrX2VuYWJsZWQnLCB0cnVlKTtcblxuXHRcdFx0XHRQcm9taXNlLmF3YWl0KHdhaXRUb0xvYWQoaW5zdGFuY2UuX29yY2gpKTtcblx0XHRcdH0sXG5cblx0XHRcdCdhcHBzL2dvLWRpc2FibGUnKCkge1xuXHRcdFx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRcdFx0XHRtZXRob2Q6ICdhcHBzL2dvLWVuYWJsZScsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdtYW5hZ2UtYXBwcycpKSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRcdFx0bWV0aG9kOiAnYXBwcy9nby1lbmFibGUnLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5zZXQoJ0FwcHNfRnJhbWV3b3JrX2VuYWJsZWQnLCBmYWxzZSk7XG5cblx0XHRcdFx0UHJvbWlzZS5hd2FpdCh3YWl0VG9VbmxvYWQoaW5zdGFuY2UuX29yY2gpKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cdH1cbn1cbiIsImltcG9ydCBCdXNib3kgZnJvbSAnYnVzYm95JztcblxuZXhwb3J0IGNsYXNzIEFwcHNSZXN0QXBpIHtcblx0Y29uc3RydWN0b3Iob3JjaCwgbWFuYWdlcikge1xuXHRcdHRoaXMuX29yY2ggPSBvcmNoO1xuXHRcdHRoaXMuX21hbmFnZXIgPSBtYW5hZ2VyO1xuXHRcdHRoaXMuYXBpID0gbmV3IFJvY2tldENoYXQuQVBJLkFwaUNsYXNzKHtcblx0XHRcdHZlcnNpb246ICdhcHBzJyxcblx0XHRcdHVzZURlZmF1bHRBdXRoOiB0cnVlLFxuXHRcdFx0cHJldHR5SnNvbjogZmFsc2UsXG5cdFx0XHRlbmFibGVDb3JzOiBmYWxzZSxcblx0XHRcdGF1dGg6IFJvY2tldENoYXQuQVBJLmdldFVzZXJBdXRoKCksXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFkZE1hbmFnZW1lbnRSb3V0ZXMoKTtcblx0fVxuXG5cdF9oYW5kbGVGaWxlKHJlcXVlc3QsIGZpbGVGaWVsZCkge1xuXHRcdGNvbnN0IGJ1c2JveSA9IG5ldyBCdXNib3koeyBoZWFkZXJzOiByZXF1ZXN0LmhlYWRlcnMgfSk7XG5cblx0XHRyZXR1cm4gTWV0ZW9yLndyYXBBc3luYygoY2FsbGJhY2spID0+IHtcblx0XHRcdGJ1c2JveS5vbignZmlsZScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGZpZWxkbmFtZSwgZmlsZSkgPT4ge1xuXHRcdFx0XHRpZiAoZmllbGRuYW1lICE9PSBmaWxlRmllbGQpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IE1ldGVvci5FcnJvcignaW52YWxpZC1maWVsZCcsIGBFeHBlY3RlZCB0aGUgZmllbGQgXCIkeyBmaWxlRmllbGQgfVwiIGJ1dCBnb3QgXCIkeyBmaWVsZG5hbWUgfVwiIGluc3RlYWQuYCkpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgZmlsZURhdGEgPSBbXTtcblx0XHRcdFx0ZmlsZS5vbignZGF0YScsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGRhdGEpID0+IHtcblx0XHRcdFx0XHRmaWxlRGF0YS5wdXNoKGRhdGEpO1xuXHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0ZmlsZS5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PiBjYWxsYmFjayh1bmRlZmluZWQsIEJ1ZmZlci5jb25jYXQoZmlsZURhdGEpKSkpO1xuXHRcdFx0fSkpO1xuXG5cdFx0XHRyZXF1ZXN0LnBpcGUoYnVzYm95KTtcblx0XHR9KSgpO1xuXHR9XG5cblx0YWRkTWFuYWdlbWVudFJvdXRlcygpIHtcblx0XHRjb25zdCBvcmNoZXN0cmF0b3IgPSB0aGlzLl9vcmNoO1xuXHRcdGNvbnN0IG1hbmFnZXIgPSB0aGlzLl9tYW5hZ2VyO1xuXHRcdGNvbnN0IGZpbGVIYW5kbGVyID0gdGhpcy5faGFuZGxlRmlsZTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCcnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnN0IGFwcHMgPSBtYW5hZ2VyLmdldCgpLm1hcCgocHJsKSA9PiB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHBybC5nZXRJbmZvKCk7XG5cdFx0XHRcdFx0aW5mby5sYW5ndWFnZXMgPSBwcmwuZ2V0U3RvcmFnZUl0ZW0oKS5sYW5ndWFnZUNvbnRlbnQ7XG5cdFx0XHRcdFx0aW5mby5zdGF0dXMgPSBwcmwuZ2V0U3RhdHVzKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gaW5mbztcblx0XHRcdFx0fSk7XG5cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBhcHBzIH0pO1xuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGxldCBidWZmO1xuXG5cdFx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMudXJsKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdHRVQnLCB0aGlzLmJvZHlQYXJhbXMudXJsLCB7IG5wbVJlcXVlc3RPcHRpb25zOiB7IGVuY29kaW5nOiAnYmFzZTY0JyB9IH0pO1xuXG5cdFx0XHRcdFx0aWYgKHJlc3VsdC5zdGF0dXNDb2RlICE9PSAyMDAgfHwgIXJlc3VsdC5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCByZXN1bHQuaGVhZGVyc1snY29udGVudC10eXBlJ10gIT09ICdhcHBsaWNhdGlvbi96aXAnKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7IGVycm9yOiAnSW52YWxpZCB1cmwuIEl0IGRvZXNuXFwndCBleGlzdCBvciBpcyBub3QgXCJhcHBsaWNhdGlvbi96aXBcIi4nIH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJ1ZmYgPSBCdWZmZXIuZnJvbShyZXN1bHQuY29udGVudCwgJ2Jhc2U2NCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGJ1ZmYgPSBmaWxlSGFuZGxlcih0aGlzLnJlcXVlc3QsICdhcHAnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghYnVmZikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IGEgZmlsZSB0byBpbnN0YWxsIGZvciB0aGUgQXBwLiAnIH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgYWZmID0gUHJvbWlzZS5hd2FpdChtYW5hZ2VyLmFkZChidWZmLnRvU3RyaW5nKCdiYXNlNjQnKSwgZmFsc2UpKTtcblx0XHRcdFx0Y29uc3QgaW5mbyA9IGFmZi5nZXRBcHBJbmZvKCk7XG5cblx0XHRcdFx0Ly8gSWYgdGhlcmUgYXJlIGNvbXBpbGVyIGVycm9ycywgdGhlcmUgd29uJ3QgYmUgYW4gQXBwIHRvIGdldCB0aGUgc3RhdHVzIG9mXG5cdFx0XHRcdGlmIChhZmYuZ2V0QXBwKCkpIHtcblx0XHRcdFx0XHRpbmZvLnN0YXR1cyA9IGFmZi5nZXRBcHAoKS5nZXRTdGF0dXMoKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpbmZvLnN0YXR1cyA9ICdjb21waWxlcl9lcnJvcic7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7XG5cdFx0XHRcdFx0YXBwOiBpbmZvLFxuXHRcdFx0XHRcdGltcGxlbWVudGVkOiBhZmYuZ2V0SW1wbGVtZW50ZWRJbmZlcmZhY2VzKCksXG5cdFx0XHRcdFx0Y29tcGlsZXJFcnJvcnM6IGFmZi5nZXRDb21waWxlckVycm9ycygpLFxuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnbGFuZ3VhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc3QgYXBwcyA9IG1hbmFnZXIuZ2V0KCkubWFwKChwcmwpID0+ICh7XG5cdFx0XHRcdFx0aWQ6IHBybC5nZXRJRCgpLFxuXHRcdFx0XHRcdGxhbmd1YWdlczogcHJsLmdldFN0b3JhZ2VJdGVtKCkubGFuZ3VhZ2VDb250ZW50LFxuXHRcdFx0XHR9KSk7XG5cblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBhcHBzIH0pO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdHZXR0aW5nOicsIHRoaXMudXJsUGFyYW1zLmlkKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0Y29uc3QgaW5mbyA9IHBybC5nZXRJbmZvKCk7XG5cdFx0XHRcdFx0aW5mby5zdGF0dXMgPSBwcmwuZ2V0U3RhdHVzKCk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGFwcDogaW5mbyB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdVcGRhdGluZzonLCB0aGlzLnVybFBhcmFtcy5pZCk7XG5cdFx0XHRcdC8vIFRPRE86IFZlcmlmeSBwZXJtaXNzaW9uc1xuXG5cdFx0XHRcdGxldCBidWZmO1xuXG5cdFx0XHRcdGlmICh0aGlzLmJvZHlQYXJhbXMudXJsKSB7XG5cdFx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gSFRUUC5jYWxsKCdHRVQnLCB0aGlzLmJvZHlQYXJhbXMudXJsLCB7IG5wbVJlcXVlc3RPcHRpb25zOiB7IGVuY29kaW5nOiAnYmFzZTY0JyB9IH0pO1xuXG5cdFx0XHRcdFx0aWYgKHJlc3VsdC5zdGF0dXNDb2RlICE9PSAyMDAgfHwgIXJlc3VsdC5oZWFkZXJzWydjb250ZW50LXR5cGUnXSB8fCByZXN1bHQuaGVhZGVyc1snY29udGVudC10eXBlJ10gIT09ICdhcHBsaWNhdGlvbi96aXAnKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSh7IGVycm9yOiAnSW52YWxpZCB1cmwuIEl0IGRvZXNuXFwndCBleGlzdCBvciBpcyBub3QgXCJhcHBsaWNhdGlvbi96aXBcIi4nIH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGJ1ZmYgPSBCdWZmZXIuZnJvbShyZXN1bHQuY29udGVudCwgJ2Jhc2U2NCcpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGJ1ZmYgPSBmaWxlSGFuZGxlcih0aGlzLnJlcXVlc3QsICdhcHAnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghYnVmZikge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IGEgZmlsZSB0byBpbnN0YWxsIGZvciB0aGUgQXBwLiAnIH0pO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgYWZmID0gUHJvbWlzZS5hd2FpdChtYW5hZ2VyLnVwZGF0ZShidWZmLnRvU3RyaW5nKCdiYXNlNjQnKSkpO1xuXHRcdFx0XHRjb25zdCBpbmZvID0gYWZmLmdldEFwcEluZm8oKTtcblxuXHRcdFx0XHQvLyBTaG91bGQgdGhlIHVwZGF0ZWQgdmVyc2lvbiBoYXZlIGNvbXBpbGVyIGVycm9ycywgbm8gQXBwIHdpbGwgYmUgcmV0dXJuZWRcblx0XHRcdFx0aWYgKGFmZi5nZXRBcHAoKSkge1xuXHRcdFx0XHRcdGluZm8uc3RhdHVzID0gYWZmLmdldEFwcCgpLmdldFN0YXR1cygpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGluZm8uc3RhdHVzID0gJ2NvbXBpbGVyX2Vycm9yJztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHtcblx0XHRcdFx0XHRhcHA6IGluZm8sXG5cdFx0XHRcdFx0aW1wbGVtZW50ZWQ6IGFmZi5nZXRJbXBsZW1lbnRlZEluZmVyZmFjZXMoKSxcblx0XHRcdFx0XHRjb21waWxlckVycm9yczogYWZmLmdldENvbXBpbGVyRXJyb3JzKCksXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGRlbGV0ZSgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ1VuaW5zdGFsbGluZzonLCB0aGlzLnVybFBhcmFtcy5pZCk7XG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKHBybCkge1xuXHRcdFx0XHRcdFByb21pc2UuYXdhaXQobWFuYWdlci5yZW1vdmUocHJsLmdldElEKCkpKTtcblxuXHRcdFx0XHRcdGNvbnN0IGluZm8gPSBwcmwuZ2V0SW5mbygpO1xuXHRcdFx0XHRcdGluZm8uc3RhdHVzID0gcHJsLmdldFN0YXR1cygpO1xuXG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBhcHA6IGluZm8gfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBBcHAgZm91bmQgYnkgdGhlIGlkIG9mOiAkeyB0aGlzLnVybFBhcmFtcy5pZCB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnOmlkL2ljb24nLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKCdHZXR0aW5nIHRoZSBBcHBcXCdzIEljb246JywgdGhpcy51cmxQYXJhbXMuaWQpO1xuXHRcdFx0XHRjb25zdCBwcmwgPSBtYW5hZ2VyLmdldE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuaWQpO1xuXG5cdFx0XHRcdGlmIChwcmwpIHtcblx0XHRcdFx0XHRjb25zdCBpbmZvID0gcHJsLmdldEluZm8oKTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgaWNvbkZpbGVDb250ZW50OiBpbmZvLmljb25GaWxlQ29udGVudCB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvbGFuZ3VhZ2VzJywgeyBhdXRoUmVxdWlyZWQ6IGZhbHNlIH0sIHtcblx0XHRcdGdldCgpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coYEdldHRpbmcgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIGxhbmd1YWdlcy4uYCk7XG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKHBybCkge1xuXHRcdFx0XHRcdGNvbnN0IGxhbmd1YWdlcyA9IHBybC5nZXRTdG9yYWdlSXRlbSgpLmxhbmd1YWdlQ29udGVudCB8fCB7fTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgbGFuZ3VhZ2VzIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0dGhpcy5hcGkuYWRkUm91dGUoJzppZC9sb2dzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgR2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3MgbG9ncy4uYCk7XG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKHBybCkge1xuXHRcdFx0XHRcdGNvbnN0IHsgb2Zmc2V0LCBjb3VudCB9ID0gdGhpcy5nZXRQYWdpbmF0aW9uSXRlbXMoKTtcblx0XHRcdFx0XHRjb25zdCB7IHNvcnQsIGZpZWxkcywgcXVlcnkgfSA9IHRoaXMucGFyc2VKc29uUXVlcnkoKTtcblxuXHRcdFx0XHRcdGNvbnN0IG91clF1ZXJ5ID0gT2JqZWN0LmFzc2lnbih7fSwgcXVlcnksIHsgYXBwSWQ6IHBybC5nZXRJRCgpIH0pO1xuXHRcdFx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0XHRcdFx0XHRzb3J0OiBzb3J0ID8gc29ydCA6IHsgX3VwZGF0ZWRBdDogLTEgfSxcblx0XHRcdFx0XHRcdHNraXA6IG9mZnNldCxcblx0XHRcdFx0XHRcdGxpbWl0OiBjb3VudCxcblx0XHRcdFx0XHRcdGZpZWxkcyxcblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0Y29uc3QgbG9ncyA9IFByb21pc2UuYXdhaXQob3JjaGVzdHJhdG9yLmdldExvZ1N0b3JhZ2UoKS5maW5kKG91clF1ZXJ5LCBvcHRpb25zKSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IGxvZ3MgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBBcHAgZm91bmQgYnkgdGhlIGlkIG9mOiAkeyB0aGlzLnVybFBhcmFtcy5pZCB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnOmlkL3NldHRpbmdzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgR2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3Mgc2V0dGluZ3MuLmApO1xuXHRcdFx0XHRjb25zdCBwcmwgPSBtYW5hZ2VyLmdldE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuaWQpO1xuXG5cdFx0XHRcdGlmIChwcmwpIHtcblx0XHRcdFx0XHRjb25zdCBzZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIHBybC5nZXRTdG9yYWdlSXRlbSgpLnNldHRpbmdzKTtcblxuXHRcdFx0XHRcdE9iamVjdC5rZXlzKHNldHRpbmdzKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoc2V0dGluZ3Nba10uaGlkZGVuKSB7XG5cdFx0XHRcdFx0XHRcdGRlbGV0ZSBzZXR0aW5nc1trXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgc2V0dGluZ3MgfSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBBcHAgZm91bmQgYnkgdGhlIGlkIG9mOiAkeyB0aGlzLnVybFBhcmFtcy5pZCB9YCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRwb3N0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgVXBkYXRpbmcgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIHNldHRpbmdzLi5gKTtcblx0XHRcdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMgfHwgIXRoaXMuYm9keVBhcmFtcy5zZXR0aW5ncykge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdUaGUgc2V0dGluZ3MgdG8gdXBkYXRlIG11c3QgYmUgcHJlc2VudC4nKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHBybCA9IG1hbmFnZXIuZ2V0T25lQnlJZCh0aGlzLnVybFBhcmFtcy5pZCk7XG5cblx0XHRcdFx0aWYgKCFwcmwpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHsgc2V0dGluZ3MgfSA9IHBybC5nZXRTdG9yYWdlSXRlbSgpO1xuXG5cdFx0XHRcdGNvbnN0IHVwZGF0ZWQgPSBbXTtcblx0XHRcdFx0dGhpcy5ib2R5UGFyYW1zLnNldHRpbmdzLmZvckVhY2goKHMpID0+IHtcblx0XHRcdFx0XHRpZiAoc2V0dGluZ3Nbcy5pZF0pIHtcblx0XHRcdFx0XHRcdFByb21pc2UuYXdhaXQobWFuYWdlci5nZXRTZXR0aW5nc01hbmFnZXIoKS51cGRhdGVBcHBTZXR0aW5nKHRoaXMudXJsUGFyYW1zLmlkLCBzKSk7XG5cdFx0XHRcdFx0XHQvLyBVcGRhdGluZz9cblx0XHRcdFx0XHRcdHVwZGF0ZWQucHVzaChzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgdXBkYXRlZCB9KTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnOmlkL3NldHRpbmdzLzpzZXR0aW5nSWQnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBHZXR0aW5nIHRoZSBBcHAgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIHNldHRpbmcgJHsgdGhpcy51cmxQYXJhbXMuc2V0dGluZ0lkIH1gKTtcblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGNvbnN0IHNldHRpbmcgPSBtYW5hZ2VyLmdldFNldHRpbmdzTWFuYWdlcigpLmdldEFwcFNldHRpbmcodGhpcy51cmxQYXJhbXMuaWQsIHRoaXMudXJsUGFyYW1zLnNldHRpbmdJZCk7XG5cblx0XHRcdFx0XHRSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKHsgc2V0dGluZyB9KTtcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdGlmIChlLm1lc3NhZ2UuaW5jbHVkZXMoJ05vIHNldHRpbmcgZm91bmQnKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLm5vdEZvdW5kKGBObyBTZXR0aW5nIGZvdW5kIG9uIHRoZSBBcHAgYnkgdGhlIGlkIG9mOiBcIiR7IHRoaXMudXJsUGFyYW1zLnNldHRpbmdJZCB9XCJgKTtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGUubWVzc2FnZS5pbmNsdWRlcygnTm8gQXBwIGZvdW5kJykpIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZShlLm1lc3NhZ2UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBVcGRhdGluZyB0aGUgQXBwICR7IHRoaXMudXJsUGFyYW1zLmlkIH0ncyBzZXR0aW5nICR7IHRoaXMudXJsUGFyYW1zLnNldHRpbmdJZCB9YCk7XG5cblx0XHRcdFx0aWYgKCF0aGlzLmJvZHlQYXJhbXMuc2V0dGluZykge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5mYWlsdXJlKCdTZXR0aW5nIHRvIHVwZGF0ZSB0byBtdXN0IGJlIHByZXNlbnQgb24gdGhlIHBvc3RlZCBib2R5LicpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRQcm9taXNlLmF3YWl0KG1hbmFnZXIuZ2V0U2V0dGluZ3NNYW5hZ2VyKCkudXBkYXRlQXBwU2V0dGluZyh0aGlzLnVybFBhcmFtcy5pZCwgdGhpcy5ib2R5UGFyYW1zLnNldHRpbmcpKTtcblxuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5zdWNjZXNzKCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHRpZiAoZS5tZXNzYWdlLmluY2x1ZGVzKCdObyBzZXR0aW5nIGZvdW5kJykpIHtcblx0XHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gU2V0dGluZyBmb3VuZCBvbiB0aGUgQXBwIGJ5IHRoZSBpZCBvZjogXCIkeyB0aGlzLnVybFBhcmFtcy5zZXR0aW5nSWQgfVwiYCk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChlLm1lc3NhZ2UuaW5jbHVkZXMoJ05vIEFwcCBmb3VuZCcpKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLmZhaWx1cmUoZS5tZXNzYWdlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmFwaS5hZGRSb3V0ZSgnOmlkL2FwaXMnLCB7IGF1dGhSZXF1aXJlZDogdHJ1ZSB9LCB7XG5cdFx0XHRnZXQoKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKGBHZXR0aW5nICR7IHRoaXMudXJsUGFyYW1zLmlkIH0ncyBhcGlzLi5gKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3Moe1xuXHRcdFx0XHRcdFx0YXBpczogbWFuYWdlci5hcGlNYW5hZ2VyLmxpc3RBcGlzKHRoaXMudXJsUGFyYW1zLmlkKSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuYXBpLmFkZFJvdXRlKCc6aWQvc3RhdHVzJywgeyBhdXRoUmVxdWlyZWQ6IHRydWUgfSwge1xuXHRcdFx0Z2V0KCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyhgR2V0dGluZyAkeyB0aGlzLnVybFBhcmFtcy5pZCB9J3Mgc3RhdHVzLi5gKTtcblx0XHRcdFx0Y29uc3QgcHJsID0gbWFuYWdlci5nZXRPbmVCeUlkKHRoaXMudXJsUGFyYW1zLmlkKTtcblxuXHRcdFx0XHRpZiAocHJsKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQVBJLnYxLnN1Y2Nlc3MoeyBzdGF0dXM6IHBybC5nZXRTdGF0dXMoKSB9KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEubm90Rm91bmQoYE5vIEFwcCBmb3VuZCBieSB0aGUgaWQgb2Y6ICR7IHRoaXMudXJsUGFyYW1zLmlkIH1gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBvc3QoKSB7XG5cdFx0XHRcdGlmICghdGhpcy5ib2R5UGFyYW1zLnN0YXR1cyB8fCB0eXBlb2YgdGhpcy5ib2R5UGFyYW1zLnN0YXR1cyAhPT0gJ3N0cmluZycpIHtcblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuZmFpbHVyZSgnSW52YWxpZCBzdGF0dXMgcHJvdmlkZWQsIGl0IG11c3QgYmUgXCJzdGF0dXNcIiBmaWVsZCBhbmQgYSBzdHJpbmcuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zb2xlLmxvZyhgVXBkYXRpbmcgJHsgdGhpcy51cmxQYXJhbXMuaWQgfSdzIHN0YXR1cy4uLmAsIHRoaXMuYm9keVBhcmFtcy5zdGF0dXMpO1xuXHRcdFx0XHRjb25zdCBwcmwgPSBtYW5hZ2VyLmdldE9uZUJ5SWQodGhpcy51cmxQYXJhbXMuaWQpO1xuXG5cdFx0XHRcdGlmIChwcmwpIHtcblx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBQcm9taXNlLmF3YWl0KG1hbmFnZXIuY2hhbmdlU3RhdHVzKHBybC5nZXRJRCgpLCB0aGlzLmJvZHlQYXJhbXMuc3RhdHVzKSk7XG5cblx0XHRcdFx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5BUEkudjEuc3VjY2Vzcyh7IHN0YXR1czogcmVzdWx0LmdldFN0YXR1cygpIH0pO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHJldHVybiBSb2NrZXRDaGF0LkFQSS52MS5ub3RGb3VuZChgTm8gQXBwIGZvdW5kIGJ5IHRoZSBpZCBvZjogJHsgdGhpcy51cmxQYXJhbXMuaWQgfWApO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBTdGF0dXMsIEFwcFN0YXR1c1V0aWxzIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vQXBwU3RhdHVzJztcblxuZXhwb3J0IGNvbnN0IEFwcEV2ZW50cyA9IE9iamVjdC5mcmVlemUoe1xuXHRBUFBfQURERUQ6ICdhcHAvYWRkZWQnLFxuXHRBUFBfUkVNT1ZFRDogJ2FwcC9yZW1vdmVkJyxcblx0QVBQX1VQREFURUQ6ICdhcHAvdXBkYXRlZCcsXG5cdEFQUF9TVEFUVVNfQ0hBTkdFOiAnYXBwL3N0YXR1c1VwZGF0ZScsXG5cdEFQUF9TRVRUSU5HX1VQREFURUQ6ICdhcHAvc2V0dGluZ1VwZGF0ZWQnLFxuXHRDT01NQU5EX0FEREVEOiAnY29tbWFuZC9hZGRlZCcsXG5cdENPTU1BTkRfRElTQUJMRUQ6ICdjb21tYW5kL2Rpc2FibGVkJyxcblx0Q09NTUFORF9VUERBVEVEOiAnY29tbWFuZC91cGRhdGVkJyxcblx0Q09NTUFORF9SRU1PVkVEOiAnY29tbWFuZC9yZW1vdmVkJyxcbn0pO1xuXG5leHBvcnQgY2xhc3MgQXBwU2VydmVyTGlzdGVuZXIge1xuXHRjb25zdHJ1Y3RvcihvcmNoLCBlbmdpbmVTdHJlYW1lciwgY2xpZW50U3RyZWFtZXIsIHJlY2VpdmVkKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyID0gZW5naW5lU3RyZWFtZXI7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lciA9IGNsaWVudFN0cmVhbWVyO1xuXHRcdHRoaXMucmVjZWl2ZWQgPSByZWNlaXZlZDtcblxuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9BRERFRCwgdGhpcy5vbkFwcEFkZGVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFLCB0aGlzLm9uQXBwU3RhdHVzVXBkYXRlZC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLm9uKEFwcEV2ZW50cy5BUFBfU0VUVElOR19VUERBVEVELCB0aGlzLm9uQXBwU2V0dGluZ1VwZGF0ZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQVBQX1JFTU9WRUQsIHRoaXMub25BcHBSZW1vdmVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkFQUF9VUERBVEVELCB0aGlzLm9uQXBwVXBkYXRlZC5iaW5kKHRoaXMpKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLm9uKEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCB0aGlzLm9uQ29tbWFuZEFkZGVkLmJpbmQodGhpcykpO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIub24oQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIHRoaXMub25Db21tYW5kRGlzYWJsZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQ09NTUFORF9VUERBVEVELCB0aGlzLm9uQ29tbWFuZFVwZGF0ZWQuYmluZCh0aGlzKSk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5vbihBcHBFdmVudHMuQ09NTUFORF9SRU1PVkVELCB0aGlzLm9uQ29tbWFuZFJlbW92ZWQuYmluZCh0aGlzKSk7XG5cdH1cblxuXHRhc3luYyBvbkFwcEFkZGVkKGFwcElkKSB7XG5cdFx0YXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5sb2FkT25lKGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9BRERFRCwgYXBwSWQpO1xuXHR9XG5cblx0YXN5bmMgb25BcHBTdGF0dXNVcGRhdGVkKHsgYXBwSWQsIHN0YXR1cyB9KSB7XG5cdFx0dGhpcy5yZWNlaXZlZC5zZXQoYCR7IEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSB9XyR7IGFwcElkIH1gLCB7IGFwcElkLCBzdGF0dXMsIHdoZW46IG5ldyBEYXRlKCkgfSk7XG5cblx0XHRpZiAoQXBwU3RhdHVzVXRpbHMuaXNFbmFibGVkKHN0YXR1cykpIHtcblx0XHRcdGF3YWl0IHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkuZW5hYmxlKGFwcElkKTtcblx0XHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UsIHsgYXBwSWQsIHN0YXR1cyB9KTtcblx0XHR9IGVsc2UgaWYgKEFwcFN0YXR1c1V0aWxzLmlzRGlzYWJsZWQoc3RhdHVzKSkge1xuXHRcdFx0YXdhaXQgdGhpcy5vcmNoLmdldE1hbmFnZXIoKS5kaXNhYmxlKGFwcElkLCBBcHBTdGF0dXMuTUFOVUFMTFlfRElTQUJMRUQgPT09IHN0YXR1cyk7XG5cdFx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFLCB7IGFwcElkLCBzdGF0dXMgfSk7XG5cdFx0fVxuXHR9XG5cblx0YXN5bmMgb25BcHBTZXR0aW5nVXBkYXRlZCh7IGFwcElkLCBzZXR0aW5nIH0pIHtcblx0XHR0aGlzLnJlY2VpdmVkLnNldChgJHsgQXBwRXZlbnRzLkFQUF9TRVRUSU5HX1VQREFURUQgfV8keyBhcHBJZCB9XyR7IHNldHRpbmcuaWQgfWAsIHsgYXBwSWQsIHNldHRpbmcsIHdoZW46IG5ldyBEYXRlKCkgfSk7XG5cblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0TWFuYWdlcigpLmdldFNldHRpbmdzTWFuYWdlcigpLnVwZGF0ZUFwcFNldHRpbmcoYXBwSWQsIHNldHRpbmcpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCwgeyBhcHBJZCB9KTtcblx0fVxuXG5cdGFzeW5jIG9uQXBwVXBkYXRlZChhcHBJZCkge1xuXHRcdHRoaXMucmVjZWl2ZWQuc2V0KGAkeyBBcHBFdmVudHMuQVBQX1VQREFURUQgfV8keyBhcHBJZCB9YCwgeyBhcHBJZCwgd2hlbjogbmV3IERhdGUoKSB9KTtcblxuXHRcdGNvbnN0IHN0b3JhZ2VJdGVtID0gYXdhaXQgdGhpcy5vcmNoLmdldFN0b3JhZ2UoKS5yZXRyaWV2ZU9uZShhcHBJZCk7XG5cblx0XHRhd2FpdCB0aGlzLm9yY2guZ2V0TWFuYWdlcigpLnVwZGF0ZShzdG9yYWdlSXRlbS56aXApO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1VQREFURUQsIGFwcElkKTtcblx0fVxuXG5cdGFzeW5jIG9uQXBwUmVtb3ZlZChhcHBJZCkge1xuXHRcdGF3YWl0IHRoaXMub3JjaC5nZXRNYW5hZ2VyKCkucmVtb3ZlKGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9SRU1PVkVELCBhcHBJZCk7XG5cdH1cblxuXHRhc3luYyBvbkNvbW1hbmRBZGRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCBjb21tYW5kKTtcblx0fVxuXG5cdGFzeW5jIG9uQ29tbWFuZERpc2FibGVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgb25Db21tYW5kVXBkYXRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1VQREFURUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgb25Db21tYW5kUmVtb3ZlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1JFTU9WRUQsIGNvbW1hbmQpO1xuXHR9XG59XG5cbmV4cG9ydCBjbGFzcyBBcHBTZXJ2ZXJOb3RpZmllciB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyID0gbmV3IE1ldGVvci5TdHJlYW1lcignYXBwcy1lbmdpbmUnLCB7IHJldHJhbnNtaXQ6IGZhbHNlIH0pO1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuc2VydmVyT25seSA9IHRydWU7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5hbGxvd1JlYWQoJ25vbmUnKTtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmFsbG93RW1pdCgnYWxsJyk7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5hbGxvd1dyaXRlKCdub25lJyk7XG5cblx0XHQvLyBUaGlzIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHRvIHRoZSB3ZWIgY2xpZW50c1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIgPSBuZXcgTWV0ZW9yLlN0cmVhbWVyKCdhcHBzJywgeyByZXRyYW5zbWl0OiBmYWxzZSB9KTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLnNlcnZlck9ubHkgPSB0cnVlO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuYWxsb3dSZWFkKCdhbGwnKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmFsbG93RW1pdCgnYWxsJyk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5hbGxvd1dyaXRlKCdub25lJyk7XG5cblx0XHR0aGlzLnJlY2VpdmVkID0gbmV3IE1hcCgpO1xuXHRcdHRoaXMubGlzdGVuZXIgPSBuZXcgQXBwU2VydmVyTGlzdGVuZXIob3JjaCwgdGhpcy5lbmdpbmVTdHJlYW1lciwgdGhpcy5jbGllbnRTdHJlYW1lciwgdGhpcy5yZWNlaXZlZCk7XG5cdH1cblxuXHRhc3luYyBhcHBBZGRlZChhcHBJZCkge1xuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX0FEREVELCBhcHBJZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfQURERUQsIGFwcElkKTtcblx0fVxuXG5cdGFzeW5jIGFwcFJlbW92ZWQoYXBwSWQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9SRU1PVkVELCBhcHBJZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfUkVNT1ZFRCwgYXBwSWQpO1xuXHR9XG5cblx0YXN5bmMgYXBwVXBkYXRlZChhcHBJZCkge1xuXHRcdGlmICh0aGlzLnJlY2VpdmVkLmhhcyhgJHsgQXBwRXZlbnRzLkFQUF9VUERBVEVEIH1fJHsgYXBwSWQgfWApKSB7XG5cdFx0XHR0aGlzLnJlY2VpdmVkLmRlbGV0ZShgJHsgQXBwRXZlbnRzLkFQUF9VUERBVEVEIH1fJHsgYXBwSWQgfWApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRoaXMuZW5naW5lU3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1VQREFURUQsIGFwcElkKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkFQUF9VUERBVEVELCBhcHBJZCk7XG5cdH1cblxuXHRhc3luYyBhcHBTdGF0dXNVcGRhdGVkKGFwcElkLCBzdGF0dXMpIHtcblx0XHRpZiAodGhpcy5yZWNlaXZlZC5oYXMoYCR7IEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSB9XyR7IGFwcElkIH1gKSkge1xuXHRcdFx0Y29uc3QgZGV0YWlscyA9IHRoaXMucmVjZWl2ZWQuZ2V0KGAkeyBBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UgfV8keyBhcHBJZCB9YCk7XG5cdFx0XHRpZiAoZGV0YWlscy5zdGF0dXMgPT09IHN0YXR1cykge1xuXHRcdFx0XHR0aGlzLnJlY2VpdmVkLmRlbGV0ZShgJHsgQXBwRXZlbnRzLkFQUF9TVEFUVVNfQ0hBTkdFIH1fJHsgYXBwSWQgfWApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfU1RBVFVTX0NIQU5HRSwgeyBhcHBJZCwgc3RhdHVzIH0pO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NUQVRVU19DSEFOR0UsIHsgYXBwSWQsIHN0YXR1cyB9KTtcblx0fVxuXG5cdGFzeW5jIGFwcFNldHRpbmdzQ2hhbmdlKGFwcElkLCBzZXR0aW5nKSB7XG5cdFx0aWYgKHRoaXMucmVjZWl2ZWQuaGFzKGAkeyBBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCB9XyR7IGFwcElkIH1fJHsgc2V0dGluZy5pZCB9YCkpIHtcblx0XHRcdHRoaXMucmVjZWl2ZWQuZGVsZXRlKGAkeyBBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCB9XyR7IGFwcElkIH1fJHsgc2V0dGluZy5pZCB9YCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5BUFBfU0VUVElOR19VUERBVEVELCB7IGFwcElkLCBzZXR0aW5nIH0pO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQVBQX1NFVFRJTkdfVVBEQVRFRCwgeyBhcHBJZCB9KTtcblx0fVxuXG5cdGFzeW5jIGNvbW1hbmRBZGRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX0FEREVELCBjb21tYW5kKTtcblx0XHR0aGlzLmNsaWVudFN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfQURERUQsIGNvbW1hbmQpO1xuXHR9XG5cblx0YXN5bmMgY29tbWFuZERpc2FibGVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfRElTQUJMRUQsIGNvbW1hbmQpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQ09NTUFORF9ESVNBQkxFRCwgY29tbWFuZCk7XG5cdH1cblxuXHRhc3luYyBjb21tYW5kVXBkYXRlZChjb21tYW5kKSB7XG5cdFx0dGhpcy5lbmdpbmVTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1VQREFURUQsIGNvbW1hbmQpO1xuXHRcdHRoaXMuY2xpZW50U3RyZWFtZXIuZW1pdChBcHBFdmVudHMuQ09NTUFORF9VUERBVEVELCBjb21tYW5kKTtcblx0fVxuXG5cdGFzeW5jIGNvbW1hbmRSZW1vdmVkKGNvbW1hbmQpIHtcblx0XHR0aGlzLmVuZ2luZVN0cmVhbWVyLmVtaXQoQXBwRXZlbnRzLkNPTU1BTkRfUkVNT1ZFRCwgY29tbWFuZCk7XG5cdFx0dGhpcy5jbGllbnRTdHJlYW1lci5lbWl0KEFwcEV2ZW50cy5DT01NQU5EX1JFTU9WRUQsIGNvbW1hbmQpO1xuXHR9XG59XG4iLCJpbXBvcnQgeyBBcHBNZXRob2RzIH0gZnJvbSAnLi9tZXRob2RzJztcbmltcG9ydCB7IEFwcHNSZXN0QXBpIH0gZnJvbSAnLi9yZXN0JztcbmltcG9ydCB7IEFwcEV2ZW50cywgQXBwU2VydmVyTm90aWZpZXIsIEFwcFNlcnZlckxpc3RlbmVyIH0gZnJvbSAnLi93ZWJzb2NrZXRzJztcblxuZXhwb3J0IHtcblx0QXBwTWV0aG9kcyxcblx0QXBwc1Jlc3RBcGksXG5cdEFwcEV2ZW50cyxcblx0QXBwU2VydmVyTm90aWZpZXIsXG5cdEFwcFNlcnZlckxpc3RlbmVyLFxufTtcbiIsImV4cG9ydCBjbGFzcyBBcHBNZXNzYWdlc0NvbnZlcnRlciB7XG5cdGNvbnN0cnVjdG9yKG9yY2gpIHtcblx0XHR0aGlzLm9yY2ggPSBvcmNoO1xuXHR9XG5cblx0Y29udmVydEJ5SWQobXNnSWQpIHtcblx0XHRjb25zdCBtc2cgPSBSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5nZXRPbmVCeUlkKG1zZ0lkKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRNZXNzYWdlKG1zZyk7XG5cdH1cblxuXHRjb252ZXJ0TWVzc2FnZShtc2dPYmopIHtcblx0XHRpZiAoIW1zZ09iaikge1xuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcblx0XHR9XG5cblx0XHRjb25zdCByb29tID0gdGhpcy5vcmNoLmdldENvbnZlcnRlcnMoKS5nZXQoJ3Jvb21zJykuY29udmVydEJ5SWQobXNnT2JqLnJpZCk7XG5cblx0XHRsZXQgc2VuZGVyO1xuXHRcdGlmIChtc2dPYmoudSAmJiBtc2dPYmoudS5faWQpIHtcblx0XHRcdHNlbmRlciA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeUlkKG1zZ09iai51Ll9pZCk7XG5cblx0XHRcdGlmICghc2VuZGVyKSB7XG5cdFx0XHRcdHNlbmRlciA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRUb0FwcChtc2dPYmoudSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IGVkaXRvcjtcblx0XHRpZiAobXNnT2JqLmVkaXRlZEJ5KSB7XG5cdFx0XHRlZGl0b3IgPSB0aGlzLm9yY2guZ2V0Q29udmVydGVycygpLmdldCgndXNlcnMnKS5jb252ZXJ0QnlJZChtc2dPYmouZWRpdGVkQnkuX2lkKTtcblx0XHR9XG5cblx0XHRjb25zdCBhdHRhY2htZW50cyA9IHRoaXMuX2NvbnZlcnRBdHRhY2htZW50c1RvQXBwKG1zZ09iai5hdHRhY2htZW50cyk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aWQ6IG1zZ09iai5faWQsXG5cdFx0XHRyb29tLFxuXHRcdFx0c2VuZGVyLFxuXHRcdFx0dGV4dDogbXNnT2JqLm1zZyxcblx0XHRcdGNyZWF0ZWRBdDogbXNnT2JqLnRzLFxuXHRcdFx0dXBkYXRlZEF0OiBtc2dPYmouX3VwZGF0ZWRBdCxcblx0XHRcdGVkaXRvcixcblx0XHRcdGVkaXRlZEF0OiBtc2dPYmouZWRpdGVkQXQsXG5cdFx0XHRlbW9qaTogbXNnT2JqLmVtb2ppLFxuXHRcdFx0YXZhdGFyVXJsOiBtc2dPYmouYXZhdGFyLFxuXHRcdFx0YWxpYXM6IG1zZ09iai5hbGlhcyxcblx0XHRcdGN1c3RvbUZpZWxkczogbXNnT2JqLmN1c3RvbUZpZWxkcyxcblx0XHRcdGdyb3VwYWJsZTogbXNnT2JqLmdyb3VwYWJsZSxcblx0XHRcdGF0dGFjaG1lbnRzLFxuXHRcdFx0cmVhY3Rpb25zOiBtc2dPYmoucmVhY3Rpb25zLFxuXHRcdH07XG5cdH1cblxuXHRjb252ZXJ0QXBwTWVzc2FnZShtZXNzYWdlKSB7XG5cdFx0aWYgKCFtZXNzYWdlKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChtZXNzYWdlLnJvb20uaWQpO1xuXG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcm9vbSBwcm92aWRlZCBvbiB0aGUgbWVzc2FnZS4nKTtcblx0XHR9XG5cblx0XHRsZXQgdTtcblx0XHRpZiAobWVzc2FnZS5zZW5kZXIgJiYgbWVzc2FnZS5zZW5kZXIuaWQpIHtcblx0XHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChtZXNzYWdlLnNlbmRlci5pZCk7XG5cblx0XHRcdGlmICh1c2VyKSB7XG5cdFx0XHRcdHUgPSB7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZTogdXNlci51c2VybmFtZSxcblx0XHRcdFx0XHRuYW1lOiB1c2VyLm5hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR1ID0ge1xuXHRcdFx0XHRcdF9pZDogbWVzc2FnZS5zZW5kZXIuaWQsXG5cdFx0XHRcdFx0dXNlcm5hbWU6IG1lc3NhZ2Uuc2VuZGVyLnVzZXJuYW1lLFxuXHRcdFx0XHRcdG5hbWU6IG1lc3NhZ2Uuc2VuZGVyLm5hbWUsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0bGV0IGVkaXRlZEJ5O1xuXHRcdGlmIChtZXNzYWdlLmVkaXRvcikge1xuXHRcdFx0Y29uc3QgZWRpdG9yID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQobWVzc2FnZS5lZGl0b3IuaWQpO1xuXHRcdFx0ZWRpdGVkQnkgPSB7XG5cdFx0XHRcdF9pZDogZWRpdG9yLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGVkaXRvci51c2VybmFtZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0Y29uc3QgYXR0YWNobWVudHMgPSB0aGlzLl9jb252ZXJ0QXBwQXR0YWNobWVudHMobWVzc2FnZS5hdHRhY2htZW50cyk7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0X2lkOiBtZXNzYWdlLmlkIHx8IFJhbmRvbS5pZCgpLFxuXHRcdFx0cmlkOiByb29tLl9pZCxcblx0XHRcdHUsXG5cdFx0XHRtc2c6IG1lc3NhZ2UudGV4dCxcblx0XHRcdHRzOiBtZXNzYWdlLmNyZWF0ZWRBdCB8fCBuZXcgRGF0ZSgpLFxuXHRcdFx0X3VwZGF0ZWRBdDogbWVzc2FnZS51cGRhdGVkQXQgfHwgbmV3IERhdGUoKSxcblx0XHRcdGVkaXRlZEJ5LFxuXHRcdFx0ZWRpdGVkQXQ6IG1lc3NhZ2UuZWRpdGVkQXQsXG5cdFx0XHRlbW9qaTogbWVzc2FnZS5lbW9qaSxcblx0XHRcdGF2YXRhcjogbWVzc2FnZS5hdmF0YXJVcmwsXG5cdFx0XHRhbGlhczogbWVzc2FnZS5hbGlhcyxcblx0XHRcdGN1c3RvbUZpZWxkczogbWVzc2FnZS5jdXN0b21GaWVsZHMsXG5cdFx0XHRncm91cGFibGU6IG1lc3NhZ2UuZ3JvdXBhYmxlLFxuXHRcdFx0YXR0YWNobWVudHMsXG5cdFx0XHRyZWFjdGlvbnM6IG1lc3NhZ2UucmVhY3Rpb25zLFxuXHRcdH07XG5cdH1cblxuXHRfY29udmVydEFwcEF0dGFjaG1lbnRzKGF0dGFjaG1lbnRzKSB7XG5cdFx0aWYgKHR5cGVvZiBhdHRhY2htZW50cyA9PT0gJ3VuZGVmaW5lZCcgfHwgIUFycmF5LmlzQXJyYXkoYXR0YWNobWVudHMpKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJldHVybiBhdHRhY2htZW50cy5tYXAoKGF0dGFjaG1lbnQpID0+ICh7XG5cdFx0XHRjb2xsYXBzZWQ6IGF0dGFjaG1lbnQuY29sbGFwc2VkLFxuXHRcdFx0Y29sb3I6IGF0dGFjaG1lbnQuY29sb3IsXG5cdFx0XHR0ZXh0OiBhdHRhY2htZW50LnRleHQsXG5cdFx0XHR0czogYXR0YWNobWVudC50aW1lc3RhbXAsXG5cdFx0XHRtZXNzYWdlX2xpbms6IGF0dGFjaG1lbnQudGltZXN0YW1wTGluayxcblx0XHRcdHRodW1iX3VybDogYXR0YWNobWVudC50aHVtYm5haWxVcmwsXG5cdFx0XHRhdXRob3JfbmFtZTogYXR0YWNobWVudC5hdXRob3IgPyBhdHRhY2htZW50LmF1dGhvci5uYW1lIDogdW5kZWZpbmVkLFxuXHRcdFx0YXV0aG9yX2xpbms6IGF0dGFjaG1lbnQuYXV0aG9yID8gYXR0YWNobWVudC5hdXRob3IubGluayA6IHVuZGVmaW5lZCxcblx0XHRcdGF1dGhvcl9pY29uOiBhdHRhY2htZW50LmF1dGhvciA/IGF0dGFjaG1lbnQuYXV0aG9yLmljb24gOiB1bmRlZmluZWQsXG5cdFx0XHR0aXRsZTogYXR0YWNobWVudC50aXRsZSA/IGF0dGFjaG1lbnQudGl0bGUudmFsdWUgOiB1bmRlZmluZWQsXG5cdFx0XHR0aXRsZV9saW5rOiBhdHRhY2htZW50LnRpdGxlID8gYXR0YWNobWVudC50aXRsZS5saW5rIDogdW5kZWZpbmVkLFxuXHRcdFx0dGl0bGVfbGlua19kb3dubG9hZDogYXR0YWNobWVudC50aXRsZSA/IGF0dGFjaG1lbnQudGl0bGUuZGlzcGxheURvd25sb2FkTGluayA6IHVuZGVmaW5lZCxcblx0XHRcdGltYWdlX3VybDogYXR0YWNobWVudC5pbWFnZVVybCxcblx0XHRcdGF1ZGlvX3VybDogYXR0YWNobWVudC5hdWRpb1VybCxcblx0XHRcdHZpZGVvX3VybDogYXR0YWNobWVudC52aWRlb1VybCxcblx0XHRcdGZpZWxkczogYXR0YWNobWVudC5maWVsZHMsXG5cdFx0XHRhY3Rpb25zOiBhdHRhY2htZW50LmFjdGlvbnMsXG5cdFx0XHR0eXBlOiBhdHRhY2htZW50LnR5cGUsXG5cdFx0XHRkZXNjcmlwdGlvbjogYXR0YWNobWVudC5kZXNjcmlwdGlvbixcblx0XHR9KSkubWFwKChhKSA9PiB7XG5cdFx0XHRPYmplY3Qua2V5cyhhKS5mb3JFYWNoKChrKSA9PiB7XG5cdFx0XHRcdGlmICh0eXBlb2YgYVtrXSA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRkZWxldGUgYVtrXTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiBhO1xuXHRcdH0pO1xuXHR9XG5cblx0X2NvbnZlcnRBdHRhY2htZW50c1RvQXBwKGF0dGFjaG1lbnRzKSB7XG5cdFx0aWYgKHR5cGVvZiBhdHRhY2htZW50cyA9PT0gJ3VuZGVmaW5lZCcgfHwgIUFycmF5LmlzQXJyYXkoYXR0YWNobWVudHMpKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdHJldHVybiBhdHRhY2htZW50cy5tYXAoKGF0dGFjaG1lbnQpID0+IHtcblx0XHRcdGxldCBhdXRob3I7XG5cdFx0XHRpZiAoYXR0YWNobWVudC5hdXRob3JfbmFtZSB8fCBhdHRhY2htZW50LmF1dGhvcl9saW5rIHx8IGF0dGFjaG1lbnQuYXV0aG9yX2ljb24pIHtcblx0XHRcdFx0YXV0aG9yID0ge1xuXHRcdFx0XHRcdG5hbWU6IGF0dGFjaG1lbnQuYXV0aG9yX25hbWUsXG5cdFx0XHRcdFx0bGluazogYXR0YWNobWVudC5hdXRob3JfbGluayxcblx0XHRcdFx0XHRpY29uOiBhdHRhY2htZW50LmF1dGhvcl9pY29uLFxuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXG5cdFx0XHRsZXQgdGl0bGU7XG5cdFx0XHRpZiAoYXR0YWNobWVudC50aXRsZSB8fCBhdHRhY2htZW50LnRpdGxlX2xpbmsgfHwgYXR0YWNobWVudC50aXRsZV9saW5rX2Rvd25sb2FkKSB7XG5cdFx0XHRcdHRpdGxlID0ge1xuXHRcdFx0XHRcdHZhbHVlOiBhdHRhY2htZW50LnRpdGxlLFxuXHRcdFx0XHRcdGxpbms6IGF0dGFjaG1lbnQudGl0bGVfbGluayxcblx0XHRcdFx0XHRkaXNwbGF5RG93bmxvYWRMaW5rOiBhdHRhY2htZW50LnRpdGxlX2xpbmtfZG93bmxvYWQsXG5cdFx0XHRcdH07XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNvbGxhcHNlZDogYXR0YWNobWVudC5jb2xsYXBzZWQsXG5cdFx0XHRcdGNvbG9yOiBhdHRhY2htZW50LmNvbG9yLFxuXHRcdFx0XHR0ZXh0OiBhdHRhY2htZW50LnRleHQsXG5cdFx0XHRcdHRpbWVzdGFtcDogYXR0YWNobWVudC50cyxcblx0XHRcdFx0dGltZXN0YW1wTGluazogYXR0YWNobWVudC5tZXNzYWdlX2xpbmssXG5cdFx0XHRcdHRodW1ibmFpbFVybDogYXR0YWNobWVudC50aHVtYl91cmwsXG5cdFx0XHRcdGF1dGhvcixcblx0XHRcdFx0dGl0bGUsXG5cdFx0XHRcdGltYWdlVXJsOiBhdHRhY2htZW50LmltYWdlX3VybCxcblx0XHRcdFx0YXVkaW9Vcmw6IGF0dGFjaG1lbnQuYXVkaW9fdXJsLFxuXHRcdFx0XHR2aWRlb1VybDogYXR0YWNobWVudC52aWRlb191cmwsXG5cdFx0XHRcdGZpZWxkczogYXR0YWNobWVudC5maWVsZHMsXG5cdFx0XHRcdGFjdGlvbnM6IGF0dGFjaG1lbnQuYWN0aW9ucyxcblx0XHRcdFx0dHlwZTogYXR0YWNobWVudC50eXBlLFxuXHRcdFx0XHRkZXNjcmlwdGlvbjogYXR0YWNobWVudC5kZXNjcmlwdGlvbixcblx0XHRcdH07XG5cdFx0fSk7XG5cdH1cbn1cbiIsImltcG9ydCB7IFJvb21UeXBlIH0gZnJvbSAnQHJvY2tldC5jaGF0L2FwcHMtZW5naW5lL2RlZmluaXRpb24vcm9vbXMnO1xuXG5leHBvcnQgY2xhc3MgQXBwUm9vbXNDb252ZXJ0ZXIge1xuXHRjb25zdHJ1Y3RvcihvcmNoKSB7XG5cdFx0dGhpcy5vcmNoID0gb3JjaDtcblx0fVxuXG5cdGNvbnZlcnRCeUlkKHJvb21JZCkge1xuXHRcdGNvbnN0IHJvb20gPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFJvb20ocm9vbSk7XG5cdH1cblxuXHRjb252ZXJ0QnlOYW1lKHJvb21OYW1lKSB7XG5cdFx0Y29uc3Qgcm9vbSA9IFJvY2tldENoYXQubW9kZWxzLlJvb21zLmZpbmRPbmVCeU5hbWUocm9vbU5hbWUpO1xuXG5cdFx0cmV0dXJuIHRoaXMuY29udmVydFJvb20ocm9vbSk7XG5cdH1cblxuXHRjb252ZXJ0QXBwUm9vbShyb29tKSB7XG5cdFx0aWYgKCFyb29tKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGxldCB1O1xuXHRcdGlmIChyb29tLmNyZWF0b3IpIHtcblx0XHRcdGNvbnN0IGNyZWF0b3IgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZChyb29tLmNyZWF0b3IuaWQpO1xuXHRcdFx0dSA9IHtcblx0XHRcdFx0X2lkOiBjcmVhdG9yLl9pZCxcblx0XHRcdFx0dXNlcm5hbWU6IGNyZWF0b3IudXNlcm5hbWUsXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRfaWQ6IHJvb20uaWQsXG5cdFx0XHRmbmFtZTogcm9vbS5kaXNwbGF5TmFtZSxcblx0XHRcdG5hbWU6IHJvb20uc2x1Z2lmaWVkTmFtZSxcblx0XHRcdHQ6IHJvb20udHlwZSxcblx0XHRcdHUsXG5cdFx0XHRtZW1iZXJzOiByb29tLm1lbWJlcnMsXG5cdFx0XHRkZWZhdWx0OiB0eXBlb2Ygcm9vbS5pc0RlZmF1bHQgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiByb29tLmlzRGVmYXVsdCxcblx0XHRcdHJvOiB0eXBlb2Ygcm9vbS5pc1JlYWRPbmx5ID09PSAndW5kZWZpbmVkJyA/IGZhbHNlIDogcm9vbS5pc1JlYWRPbmx5LFxuXHRcdFx0c3lzTWVzOiB0eXBlb2Ygcm9vbS5kaXNwbGF5U3lzdGVtTWVzc2FnZXMgPT09ICd1bmRlZmluZWQnID8gdHJ1ZSA6IHJvb20uZGlzcGxheVN5c3RlbU1lc3NhZ2VzLFxuXHRcdFx0bXNnczogcm9vbS5tZXNzYWdlQ291bnQgfHwgMCxcblx0XHRcdHRzOiByb29tLmNyZWF0ZWRBdCxcblx0XHRcdF91cGRhdGVkQXQ6IHJvb20udXBkYXRlZEF0LFxuXHRcdFx0bG06IHJvb20ubGFzdE1vZGlmaWVkQXQsXG5cdFx0fTtcblx0fVxuXG5cdGNvbnZlcnRSb29tKHJvb20pIHtcblx0XHRpZiAoIXJvb20pIHtcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdFx0fVxuXG5cdFx0bGV0IGNyZWF0b3I7XG5cdFx0aWYgKHJvb20udSkge1xuXHRcdFx0Y3JlYXRvciA9IHRoaXMub3JjaC5nZXRDb252ZXJ0ZXJzKCkuZ2V0KCd1c2VycycpLmNvbnZlcnRCeUlkKHJvb20udS5faWQpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRpZDogcm9vbS5faWQsXG5cdFx0XHRkaXNwbGF5TmFtZTogcm9vbS5mbmFtZSxcblx0XHRcdHNsdWdpZmllZE5hbWU6IHJvb20ubmFtZSxcblx0XHRcdHR5cGU6IHRoaXMuX2NvbnZlcnRUeXBlVG9BcHAocm9vbS50KSxcblx0XHRcdGNyZWF0b3IsXG5cdFx0XHRtZW1iZXJzOiByb29tLm1lbWJlcnMsXG5cdFx0XHRpc0RlZmF1bHQ6IHR5cGVvZiByb29tLmRlZmF1bHQgPT09ICd1bmRlZmluZWQnID8gZmFsc2UgOiByb29tLmRlZmF1bHQsXG5cdFx0XHRpc1JlYWRPbmx5OiB0eXBlb2Ygcm9vbS5ybyA9PT0gJ3VuZGVmaW5lZCcgPyBmYWxzZSA6IHJvb20ucm8sXG5cdFx0XHRkaXNwbGF5U3lzdGVtTWVzc2FnZXM6IHR5cGVvZiByb29tLnN5c01lcyA9PT0gJ3VuZGVmaW5lZCcgPyB0cnVlIDogcm9vbS5zeXNNZXMsXG5cdFx0XHRtZXNzYWdlQ291bnQ6IHJvb20ubXNncyxcblx0XHRcdGNyZWF0ZWRBdDogcm9vbS50cyxcblx0XHRcdHVwZGF0ZWRBdDogcm9vbS5fdXBkYXRlZEF0LFxuXHRcdFx0bGFzdE1vZGlmaWVkQXQ6IHJvb20ubG0sXG5cdFx0XHRjdXN0b21GaWVsZHM6IHt9LFxuXHRcdH07XG5cdH1cblxuXHRfY29udmVydFR5cGVUb0FwcCh0eXBlQ2hhcikge1xuXHRcdHN3aXRjaCAodHlwZUNoYXIpIHtcblx0XHRcdGNhc2UgJ2MnOlxuXHRcdFx0XHRyZXR1cm4gUm9vbVR5cGUuQ0hBTk5FTDtcblx0XHRcdGNhc2UgJ3AnOlxuXHRcdFx0XHRyZXR1cm4gUm9vbVR5cGUuUFJJVkFURV9HUk9VUDtcblx0XHRcdGNhc2UgJ2QnOlxuXHRcdFx0XHRyZXR1cm4gUm9vbVR5cGUuRElSRUNUX01FU1NBR0U7XG5cdFx0XHRjYXNlICdsYyc6XG5cdFx0XHRcdHJldHVybiBSb29tVHlwZS5MSVZFX0NIQVQ7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdHlwZUNoYXI7XG5cdFx0fVxuXHR9XG59XG4iLCJpbXBvcnQgeyBTZXR0aW5nVHlwZSB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9kZWZpbml0aW9uL3NldHRpbmdzJztcblxuZXhwb3J0IGNsYXNzIEFwcFNldHRpbmdzQ29udmVydGVyIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRjb252ZXJ0QnlJZChzZXR0aW5nSWQpIHtcblx0XHRjb25zdCBzZXR0aW5nID0gUm9ja2V0Q2hhdC5tb2RlbHMuU2V0dGluZ3MuZmluZE9uZU5vdEhpZGRlbkJ5SWQoc2V0dGluZ0lkKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRUb0FwcChzZXR0aW5nKTtcblx0fVxuXG5cdGNvbnZlcnRUb0FwcChzZXR0aW5nKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGlkOiBzZXR0aW5nLl9pZCxcblx0XHRcdHR5cGU6IHRoaXMuX2NvbnZlcnRUeXBlVG9BcHAoc2V0dGluZy50eXBlKSxcblx0XHRcdHBhY2thZ2VWYWx1ZTogc2V0dGluZy5wYWNrYWdlVmFsdWUsXG5cdFx0XHR2YWx1ZXM6IHNldHRpbmcudmFsdWVzLFxuXHRcdFx0dmFsdWU6IHNldHRpbmcudmFsdWUsXG5cdFx0XHRwdWJsaWM6IHNldHRpbmcucHVibGljLFxuXHRcdFx0aGlkZGVuOiBzZXR0aW5nLmhpZGRlbixcblx0XHRcdGdyb3VwOiBzZXR0aW5nLmdyb3VwLFxuXHRcdFx0aTE4bkxhYmVsOiBzZXR0aW5nLmkxOG5MYWJlbCxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogc2V0dGluZy5pMThuRGVzY3JpcHRpb24sXG5cdFx0XHRjcmVhdGVkQXQ6IHNldHRpbmcudHMsXG5cdFx0XHR1cGRhdGVkQXQ6IHNldHRpbmcuX3VwZGF0ZWRBdCxcblx0XHR9O1xuXHR9XG5cblx0X2NvbnZlcnRUeXBlVG9BcHAodHlwZSkge1xuXHRcdHN3aXRjaCAodHlwZSkge1xuXHRcdFx0Y2FzZSAnYm9vbGVhbic6XG5cdFx0XHRcdHJldHVybiBTZXR0aW5nVHlwZS5CT09MRUFOO1xuXHRcdFx0Y2FzZSAnY29kZSc6XG5cdFx0XHRcdHJldHVybiBTZXR0aW5nVHlwZS5DT0RFO1xuXHRcdFx0Y2FzZSAnY29sb3InOlxuXHRcdFx0XHRyZXR1cm4gU2V0dGluZ1R5cGUuQ09MT1I7XG5cdFx0XHRjYXNlICdmb250Jzpcblx0XHRcdFx0cmV0dXJuIFNldHRpbmdUeXBlLkZPTlQ7XG5cdFx0XHRjYXNlICdpbnQnOlxuXHRcdFx0XHRyZXR1cm4gU2V0dGluZ1R5cGUuTlVNQkVSO1xuXHRcdFx0Y2FzZSAnc2VsZWN0Jzpcblx0XHRcdFx0cmV0dXJuIFNldHRpbmdUeXBlLlNFTEVDVDtcblx0XHRcdGNhc2UgJ3N0cmluZyc6XG5cdFx0XHRcdHJldHVybiBTZXR0aW5nVHlwZS5TVFJJTkc7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRyZXR1cm4gdHlwZTtcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCB7IFVzZXJTdGF0dXNDb25uZWN0aW9uLCBVc2VyVHlwZSB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9kZWZpbml0aW9uL3VzZXJzJztcblxuZXhwb3J0IGNsYXNzIEFwcFVzZXJzQ29udmVydGVyIHtcblx0Y29uc3RydWN0b3Iob3JjaCkge1xuXHRcdHRoaXMub3JjaCA9IG9yY2g7XG5cdH1cblxuXHRjb252ZXJ0QnlJZCh1c2VySWQpIHtcblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRUb0FwcCh1c2VyKTtcblx0fVxuXG5cdGNvbnZlcnRCeVVzZXJuYW1lKHVzZXJuYW1lKSB7XG5cdFx0Y29uc3QgdXNlciA9IFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeVVzZXJuYW1lKHVzZXJuYW1lKTtcblxuXHRcdHJldHVybiB0aGlzLmNvbnZlcnRUb0FwcCh1c2VyKTtcblx0fVxuXG5cdGNvbnZlcnRUb0FwcCh1c2VyKSB7XG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHRcdH1cblxuXHRcdGNvbnN0IHR5cGUgPSB0aGlzLl9jb252ZXJ0VXNlclR5cGVUb0VudW0odXNlci50eXBlKTtcblx0XHRjb25zdCBzdGF0dXNDb25uZWN0aW9uID0gdGhpcy5fY29udmVydFN0YXR1c0Nvbm5lY3Rpb25Ub0VudW0odXNlci51c2VybmFtZSwgdXNlci5faWQsIHVzZXIuc3RhdHVzQ29ubmVjdGlvbik7XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0aWQ6IHVzZXIuX2lkLFxuXHRcdFx0dXNlcm5hbWU6IHVzZXIudXNlcm5hbWUsXG5cdFx0XHRlbWFpbHM6IHVzZXIuZW1haWxzLFxuXHRcdFx0dHlwZSxcblx0XHRcdGlzRW5hYmxlZDogdXNlci5hY3RpdmUsXG5cdFx0XHRuYW1lOiB1c2VyLm5hbWUsXG5cdFx0XHRyb2xlczogdXNlci5yb2xlcyxcblx0XHRcdHN0YXR1czogdXNlci5zdGF0dXMsXG5cdFx0XHRzdGF0dXNDb25uZWN0aW9uLFxuXHRcdFx0dXRjT2Zmc2V0OiB1c2VyLnV0Y09mZnNldCxcblx0XHRcdGNyZWF0ZWRBdDogdXNlci5jcmVhdGVkQXQsXG5cdFx0XHR1cGRhdGVkQXQ6IHVzZXIuX3VwZGF0ZWRBdCxcblx0XHRcdGxhc3RMb2dpbkF0OiB1c2VyLmxhc3RMb2dpbixcblx0XHR9O1xuXHR9XG5cblx0X2NvbnZlcnRVc2VyVHlwZVRvRW51bSh0eXBlKSB7XG5cdFx0c3dpdGNoICh0eXBlKSB7XG5cdFx0XHRjYXNlICd1c2VyJzpcblx0XHRcdFx0cmV0dXJuIFVzZXJUeXBlLlVTRVI7XG5cdFx0XHRjYXNlICdib3QnOlxuXHRcdFx0XHRyZXR1cm4gVXNlclR5cGUuQk9UO1xuXHRcdFx0Y2FzZSAnJzpcblx0XHRcdGNhc2UgdW5kZWZpbmVkOlxuXHRcdFx0XHRyZXR1cm4gVXNlclR5cGUuVU5LTk9XTjtcblx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdGNvbnNvbGUud2FybihgQSBuZXcgdXNlciB0eXBlIGhhcyBiZWVuIGFkZGVkIHRoYXQgdGhlIEFwcHMgZG9uJ3Qga25vdyBhYm91dD8gXCIkeyB0eXBlIH1cImApO1xuXHRcdFx0XHRyZXR1cm4gdHlwZS50b1VwcGVyQ2FzZSgpO1xuXHRcdH1cblx0fVxuXG5cdF9jb252ZXJ0U3RhdHVzQ29ubmVjdGlvblRvRW51bSh1c2VybmFtZSwgdXNlcklkLCBzdGF0dXMpIHtcblx0XHRzd2l0Y2ggKHN0YXR1cykge1xuXHRcdFx0Y2FzZSAnb2ZmbGluZSc6XG5cdFx0XHRcdHJldHVybiBVc2VyU3RhdHVzQ29ubmVjdGlvbi5PRkZMSU5FO1xuXHRcdFx0Y2FzZSAnb25saW5lJzpcblx0XHRcdFx0cmV0dXJuIFVzZXJTdGF0dXNDb25uZWN0aW9uLk9OTElORTtcblx0XHRcdGNhc2UgJ2F3YXknOlxuXHRcdFx0XHRyZXR1cm4gVXNlclN0YXR1c0Nvbm5lY3Rpb24uQVdBWTtcblx0XHRcdGNhc2UgJ2J1c3knOlxuXHRcdFx0XHRyZXR1cm4gVXNlclN0YXR1c0Nvbm5lY3Rpb24uQlVTWTtcblx0XHRcdGNhc2UgdW5kZWZpbmVkOlxuXHRcdFx0XHQvLyBUaGlzIGlzIG5lZWRlZCBmb3IgTGl2ZWNoYXQgZ3Vlc3RzIGFuZCBSb2NrZXQuQ2F0IHVzZXIuXG5cdFx0XHRcdHJldHVybiBVc2VyU3RhdHVzQ29ubmVjdGlvbi5VTkRFRklORUQ7XG5cdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRjb25zb2xlLndhcm4oYFRoZSB1c2VyICR7IHVzZXJuYW1lIH0gKCR7IHVzZXJJZCB9KSBkb2VzIG5vdCBoYXZlIGEgdmFsaWQgc3RhdHVzIChvZmZsaW5lLCBvbmxpbmUsIGF3YXksIG9yIGJ1c3kpLiBJdCBpcyBjdXJyZW50bHk6IFwiJHsgc3RhdHVzIH1cImApO1xuXHRcdFx0XHRyZXR1cm4gIXN0YXR1cyA/IFVzZXJTdGF0dXNDb25uZWN0aW9uLk9GRkxJTkUgOiBzdGF0dXMudG9VcHBlckNhc2UoKTtcblx0XHR9XG5cdH1cbn1cbiIsImltcG9ydCB7IEFwcE1lc3NhZ2VzQ29udmVydGVyIH0gZnJvbSAnLi9tZXNzYWdlcyc7XG5pbXBvcnQgeyBBcHBSb29tc0NvbnZlcnRlciB9IGZyb20gJy4vcm9vbXMnO1xuaW1wb3J0IHsgQXBwU2V0dGluZ3NDb252ZXJ0ZXIgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IEFwcFVzZXJzQ29udmVydGVyIH0gZnJvbSAnLi91c2Vycyc7XG5cbmV4cG9ydCB7XG5cdEFwcE1lc3NhZ2VzQ29udmVydGVyLFxuXHRBcHBSb29tc0NvbnZlcnRlcixcblx0QXBwU2V0dGluZ3NDb252ZXJ0ZXIsXG5cdEFwcFVzZXJzQ29udmVydGVyLFxufTtcbiIsImltcG9ydCB7IFJlYWxBcHBCcmlkZ2VzIH0gZnJvbSAnLi9icmlkZ2VzJztcbmltcG9ydCB7IEFwcE1ldGhvZHMsIEFwcHNSZXN0QXBpLCBBcHBTZXJ2ZXJOb3RpZmllciB9IGZyb20gJy4vY29tbXVuaWNhdGlvbic7XG5pbXBvcnQgeyBBcHBNZXNzYWdlc0NvbnZlcnRlciwgQXBwUm9vbXNDb252ZXJ0ZXIsIEFwcFNldHRpbmdzQ29udmVydGVyLCBBcHBVc2Vyc0NvbnZlcnRlciB9IGZyb20gJy4vY29udmVydGVycyc7XG5pbXBvcnQgeyBBcHBzTG9nc01vZGVsLCBBcHBzTW9kZWwsIEFwcHNQZXJzaXN0ZW5jZU1vZGVsLCBBcHBSZWFsU3RvcmFnZSwgQXBwUmVhbExvZ3NTdG9yYWdlIH0gZnJvbSAnLi9zdG9yYWdlJztcblxuaW1wb3J0IHsgQXBwTWFuYWdlciB9IGZyb20gJ0Byb2NrZXQuY2hhdC9hcHBzLWVuZ2luZS9zZXJ2ZXIvQXBwTWFuYWdlcic7XG5cbmNsYXNzIEFwcFNlcnZlck9yY2hlc3RyYXRvciB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdGlmIChSb2NrZXRDaGF0Lm1vZGVscyAmJiBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucykge1xuXHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ21hbmFnZS1hcHBzJywgWydhZG1pbiddKTtcblx0XHR9XG5cblx0XHR0aGlzLl9tb2RlbCA9IG5ldyBBcHBzTW9kZWwoKTtcblx0XHR0aGlzLl9sb2dNb2RlbCA9IG5ldyBBcHBzTG9nc01vZGVsKCk7XG5cdFx0dGhpcy5fcGVyc2lzdE1vZGVsID0gbmV3IEFwcHNQZXJzaXN0ZW5jZU1vZGVsKCk7XG5cdFx0dGhpcy5fc3RvcmFnZSA9IG5ldyBBcHBSZWFsU3RvcmFnZSh0aGlzLl9tb2RlbCk7XG5cdFx0dGhpcy5fbG9nU3RvcmFnZSA9IG5ldyBBcHBSZWFsTG9nc1N0b3JhZ2UodGhpcy5fbG9nTW9kZWwpO1xuXG5cdFx0dGhpcy5fY29udmVydGVycyA9IG5ldyBNYXAoKTtcblx0XHR0aGlzLl9jb252ZXJ0ZXJzLnNldCgnbWVzc2FnZXMnLCBuZXcgQXBwTWVzc2FnZXNDb252ZXJ0ZXIodGhpcykpO1xuXHRcdHRoaXMuX2NvbnZlcnRlcnMuc2V0KCdyb29tcycsIG5ldyBBcHBSb29tc0NvbnZlcnRlcih0aGlzKSk7XG5cdFx0dGhpcy5fY29udmVydGVycy5zZXQoJ3NldHRpbmdzJywgbmV3IEFwcFNldHRpbmdzQ29udmVydGVyKHRoaXMpKTtcblx0XHR0aGlzLl9jb252ZXJ0ZXJzLnNldCgndXNlcnMnLCBuZXcgQXBwVXNlcnNDb252ZXJ0ZXIodGhpcykpO1xuXG5cdFx0dGhpcy5fYnJpZGdlcyA9IG5ldyBSZWFsQXBwQnJpZGdlcyh0aGlzKTtcblxuXHRcdHRoaXMuX21hbmFnZXIgPSBuZXcgQXBwTWFuYWdlcih0aGlzLl9zdG9yYWdlLCB0aGlzLl9sb2dTdG9yYWdlLCB0aGlzLl9icmlkZ2VzKTtcblxuXHRcdHRoaXMuX2NvbW11bmljYXRvcnMgPSBuZXcgTWFwKCk7XG5cdFx0dGhpcy5fY29tbXVuaWNhdG9ycy5zZXQoJ21ldGhvZHMnLCBuZXcgQXBwTWV0aG9kcyh0aGlzKSk7XG5cdFx0dGhpcy5fY29tbXVuaWNhdG9ycy5zZXQoJ25vdGlmaWVyJywgbmV3IEFwcFNlcnZlck5vdGlmaWVyKHRoaXMpKTtcblx0XHR0aGlzLl9jb21tdW5pY2F0b3JzLnNldCgncmVzdGFwaScsIG5ldyBBcHBzUmVzdEFwaSh0aGlzLCB0aGlzLl9tYW5hZ2VyKSk7XG5cdH1cblxuXHRnZXRNb2RlbCgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbW9kZWw7XG5cdH1cblxuXHRnZXRQZXJzaXN0ZW5jZU1vZGVsKCkge1xuXHRcdHJldHVybiB0aGlzLl9wZXJzaXN0TW9kZWw7XG5cdH1cblxuXHRnZXRTdG9yYWdlKCkge1xuXHRcdHJldHVybiB0aGlzLl9zdG9yYWdlO1xuXHR9XG5cblx0Z2V0TG9nU3RvcmFnZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fbG9nU3RvcmFnZTtcblx0fVxuXG5cdGdldENvbnZlcnRlcnMoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2NvbnZlcnRlcnM7XG5cdH1cblxuXHRnZXRCcmlkZ2VzKCkge1xuXHRcdHJldHVybiB0aGlzLl9icmlkZ2VzO1xuXHR9XG5cblx0Z2V0Tm90aWZpZXIoKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2NvbW11bmljYXRvcnMuZ2V0KCdub3RpZmllcicpO1xuXHR9XG5cblx0Z2V0TWFuYWdlcigpIHtcblx0XHRyZXR1cm4gdGhpcy5fbWFuYWdlcjtcblx0fVxuXG5cdGlzRW5hYmxlZCgpIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0FwcHNfRnJhbWV3b3JrX2VuYWJsZWQnKTtcblx0fVxuXG5cdGlzTG9hZGVkKCkge1xuXHRcdHJldHVybiB0aGlzLmdldE1hbmFnZXIoKS5hcmVBcHBzTG9hZGVkKCk7XG5cdH1cblxuXHRsb2FkKCkge1xuXHRcdC8vIERvbid0IHRyeSB0byBsb2FkIGl0IGFnYWluIGlmIGl0IGhhc1xuXHRcdC8vIGFscmVhZHkgYmVlbiBsb2FkZWRcblx0XHRpZiAodGhpcy5pc0xvYWRlZCgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWFuYWdlci5sb2FkKClcblx0XHRcdC50aGVuKChhZmZzKSA9PiBjb25zb2xlLmxvZyhgTG9hZGVkIHRoZSBBcHBzIEZyYW1ld29yayBhbmQgbG9hZGVkIGEgdG90YWwgb2YgJHsgYWZmcy5sZW5ndGggfSBBcHBzIWApKVxuXHRcdFx0LmNhdGNoKChlcnIpID0+IGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvYWQgdGhlIEFwcHMgRnJhbWV3b3JrIGFuZCBBcHBzIScsIGVycikpO1xuXHR9XG5cblx0dW5sb2FkKCkge1xuXHRcdC8vIERvbid0IHRyeSB0byB1bmxvYWQgaXQgaWYgaXQncyBhbHJlYWR5IGJlZW5cblx0XHQvLyB1bmxhb2RlZCBvciB3YXNuJ3QgdW5sb2FkZWQgdG8gc3RhcnQgd2l0aFxuXHRcdGlmICghdGhpcy5pc0xvYWRlZCgpKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGhpcy5fbWFuYWdlci51bmxvYWQoKVxuXHRcdFx0LnRoZW4oKCkgPT4gY29uc29sZS5sb2coJ1VubG9hZGVkIHRoZSBBcHBzIEZyYW1ld29yay4nKSlcblx0XHRcdC5jYXRjaCgoZXJyKSA9PiBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byB1bmxvYWQgdGhlIEFwcHMgRnJhbWV3b3JrIScsIGVycikpO1xuXHR9XG59XG5cblJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0dlbmVyYWwnLCBmdW5jdGlvbigpIHtcblx0dGhpcy5zZWN0aW9uKCdBcHBzJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0FwcHNfRnJhbWV3b3JrX2VuYWJsZWQnLCB0cnVlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRoaWRkZW46IGZhbHNlLFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQXBwc19GcmFtZXdvcmtfZW5hYmxlZCcsIChrZXksIGlzRW5hYmxlZCkgPT4ge1xuXHQvLyBJbiBjYXNlIHRoaXMgZ2V0cyBjYWxsZWQgYmVmb3JlIGBNZXRlb3Iuc3RhcnR1cGBcblx0aWYgKCFnbG9iYWwuQXBwcykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChpc0VuYWJsZWQpIHtcblx0XHRnbG9iYWwuQXBwcy5sb2FkKCk7XG5cdH0gZWxzZSB7XG5cdFx0Z2xvYmFsLkFwcHMudW5sb2FkKCk7XG5cdH1cbn0pO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbiBfYXBwU2VydmVyT3JjaGVzdHJhdG9yKCkge1xuXHRnbG9iYWwuQXBwcyA9IG5ldyBBcHBTZXJ2ZXJPcmNoZXN0cmF0b3IoKTtcblxuXHRpZiAoZ2xvYmFsLkFwcHMuaXNFbmFibGVkKCkpIHtcblx0XHRnbG9iYWwuQXBwcy5sb2FkKCk7XG5cdH1cbn0pO1xuIl19
