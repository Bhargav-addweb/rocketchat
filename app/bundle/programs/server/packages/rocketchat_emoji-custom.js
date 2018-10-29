(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var renderEmoji = Package['rocketchat:emoji'].renderEmoji;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var isSet, isSetNotNull;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:emoji-custom":{"function-isSet.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/function-isSet.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/* globals isSet:true, isSetNotNull:true */
// http://stackoverflow.com/a/26990347 function isSet() from Gajus
isSet = function (fn) {
  let value;

  try {
    value = fn();
  } catch (e) {
    value = undefined;
  } finally {
    return value !== undefined;
  }
};

isSetNotNull = function (fn) {
  let value;

  try {
    value = fn();
  } catch (e) {
    value = null;
  } finally {
    return value !== null && value !== undefined;
  }
};
/* exported isSet, isSetNotNull */
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"server":{"startup":{"emoji-custom.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/startup/emoji-custom.js                                                    //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.startup(function () {
  let storeType = 'GridFS';

  if (RocketChat.settings.get('EmojiUpload_Storage_Type')) {
    storeType = RocketChat.settings.get('EmojiUpload_Storage_Type');
  }

  const RocketChatStore = RocketChatFile[storeType];

  if (RocketChatStore == null) {
    throw new Error(`Invalid RocketChatStore type [${storeType}]`);
  }

  console.log(`Using ${storeType} for custom emoji storage`.green);
  let path = '~/uploads';

  if (RocketChat.settings.get('EmojiUpload_FileSystemPath') != null) {
    if (RocketChat.settings.get('EmojiUpload_FileSystemPath').trim() !== '') {
      path = RocketChat.settings.get('EmojiUpload_FileSystemPath');
    }
  }

  this.RocketChatFileEmojiCustomInstance = new RocketChatStore({
    name: 'custom_emoji',
    absolutePath: path
  });
  return WebApp.connectHandlers.use('/emoji-custom/', Meteor.bindEnvironment(function (req, res
  /* , next*/
  ) {
    const params = {
      emoji: decodeURIComponent(req.url.replace(/^\//, '').replace(/\?.*$/, ''))
    };

    if (_.isEmpty(params.emoji)) {
      res.writeHead(403);
      res.write('Forbidden');
      res.end();
      return;
    }

    const file = RocketChatFileEmojiCustomInstance.getFileWithReadStream(encodeURIComponent(params.emoji));
    res.setHeader('Content-Disposition', 'inline');

    if (file == null) {
      // use code from username initials renderer until file upload is complete
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=0');
      res.setHeader('Expires', '-1');
      res.setHeader('Last-Modified', 'Thu, 01 Jan 2015 00:00:00 GMT');
      const reqModifiedHeader = req.headers['if-modified-since'];

      if (reqModifiedHeader != null) {
        if (reqModifiedHeader === 'Thu, 01 Jan 2015 00:00:00 GMT') {
          res.writeHead(304);
          res.end();
          return;
        }
      }

      const color = '#000';
      const initials = '?';
      const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" pointer-events="none" width="50" height="50" style="width: 50px; height: 50px; background-color: ${color};">
	<text text-anchor="middle" y="50%" x="50%" dy="0.36em" pointer-events="auto" fill="#ffffff" font-family="Helvetica, Arial, Lucida Grande, sans-serif" style="font-weight: 400; font-size: 28px;">
		${initials}
	</text>
</svg>`;
      res.write(svg);
      res.end();
      return;
    }

    let fileUploadDate = undefined;

    if (file.uploadDate != null) {
      fileUploadDate = file.uploadDate.toUTCString();
    }

    const reqModifiedHeader = req.headers['if-modified-since'];

    if (reqModifiedHeader != null) {
      if (reqModifiedHeader === fileUploadDate) {
        res.setHeader('Last-Modified', reqModifiedHeader);
        res.writeHead(304);
        res.end();
        return;
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=0');
    res.setHeader('Expires', '-1');

    if (fileUploadDate != null) {
      res.setHeader('Last-Modified', fileUploadDate);
    } else {
      res.setHeader('Last-Modified', new Date().toUTCString());
    }

    if (/^svg$/i.test(params.emoji.split('.').pop())) {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }

    res.setHeader('Content-Length', file.length);
    file.readStream.pipe(res);
  }));
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/startup/settings.js                                                        //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
RocketChat.settings.addGroup('EmojiCustomFilesystem', function () {
  this.add('EmojiUpload_Storage_Type', 'GridFS', {
    type: 'select',
    values: [{
      key: 'GridFS',
      i18nLabel: 'GridFS'
    }, {
      key: 'FileSystem',
      i18nLabel: 'FileSystem'
    }],
    i18nLabel: 'FileUpload_Storage_Type'
  });
  this.add('EmojiUpload_FileSystemPath', '', {
    type: 'string',
    enableQuery: {
      _id: 'EmojiUpload_Storage_Type',
      value: 'FileSystem'
    },
    i18nLabel: 'FileUpload_FileSystemPath'
  });
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"EmojiCustom.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/models/EmojiCustom.js                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
class EmojiCustom extends RocketChat.models._Base {
  constructor() {
    super('custom_emoji');
    this.tryEnsureIndex({
      name: 1
    });
    this.tryEnsureIndex({
      aliases: 1
    });
    this.tryEnsureIndex({
      extension: 1
    });
  } // find one


  findOneByID(_id, options) {
    return this.findOne(_id, options);
  } // find


  findByNameOrAlias(emojiName, options) {
    let name = emojiName;

    if (typeof emojiName === 'string') {
      name = emojiName.replace(/:/g, '');
    }

    const query = {
      $or: [{
        name
      }, {
        aliases: name
      }]
    };
    return this.find(query, options);
  }

  findByNameOrAliasExceptID(name, except, options) {
    const query = {
      _id: {
        $nin: [except]
      },
      $or: [{
        name
      }, {
        aliases: name
      }]
    };
    return this.find(query, options);
  } // update


  setName(_id, name) {
    const update = {
      $set: {
        name
      }
    };
    return this.update({
      _id
    }, update);
  }

  setAliases(_id, aliases) {
    const update = {
      $set: {
        aliases
      }
    };
    return this.update({
      _id
    }, update);
  }

  setExtension(_id, extension) {
    const update = {
      $set: {
        extension
      }
    };
    return this.update({
      _id
    }, update);
  } // INSERT


  create(data) {
    return this.insert(data);
  } // REMOVE


  removeByID(_id) {
    return this.remove(_id);
  }

}

RocketChat.models.EmojiCustom = new EmojiCustom();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"fullEmojiData.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/publications/fullEmojiData.js                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.publish('fullEmojiData', function (filter, limit) {
  if (!this.userId) {
    return this.ready();
  }

  const fields = {
    name: 1,
    aliases: 1,
    extension: 1
  };
  filter = s.trim(filter);
  const options = {
    fields,
    limit,
    sort: {
      name: 1
    }
  };

  if (filter) {
    const filterReg = new RegExp(s.escapeRegExp(filter), 'i');
    return RocketChat.models.EmojiCustom.findByNameOrAlias(filterReg, options);
  }

  return RocketChat.models.EmojiCustom.find({}, options);
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"listEmojiCustom.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/methods/listEmojiCustom.js                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
Meteor.methods({
  listEmojiCustom() {
    return RocketChat.models.EmojiCustom.find({}).fetch();
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteEmojiCustom.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/methods/deleteEmojiCustom.js                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/* globals RocketChatFileEmojiCustomInstance */
Meteor.methods({
  deleteEmojiCustom(emojiID) {
    let emoji = null;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-emoji')) {
      emoji = RocketChat.models.EmojiCustom.findOneByID(emojiID);
    } else {
      throw new Meteor.Error('not_authorized');
    }

    if (emoji == null) {
      throw new Meteor.Error('Custom_Emoji_Error_Invalid_Emoji', 'Invalid emoji', {
        method: 'deleteEmojiCustom'
      });
    }

    RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emoji.name}.${emoji.extension}`));
    RocketChat.models.EmojiCustom.removeByID(emojiID);
    RocketChat.Notifications.notifyLogged('deleteEmojiCustom', {
      emojiData: emoji
    });
    return true;
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"insertOrUpdateEmoji.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/methods/insertOrUpdateEmoji.js                                             //
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
Meteor.methods({
  insertOrUpdateEmoji(emojiData) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-emoji')) {
      throw new Meteor.Error('not_authorized');
    }

    if (!s.trim(emojiData.name)) {
      throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', {
        method: 'insertOrUpdateEmoji',
        field: 'Name'
      });
    } // allow all characters except colon, whitespace, comma, >, <, &, ", ', /, \, (, )
    // more practical than allowing specific sets of characters; also allows foreign languages


    const nameValidation = /[\s,:><&"'\/\\\(\)]/;
    const aliasValidation = /[:><&\|"'\/\\\(\)]/; // silently strip colon; this allows for uploading :emojiname: as emojiname

    emojiData.name = emojiData.name.replace(/:/g, '');
    emojiData.aliases = emojiData.aliases.replace(/:/g, '');

    if (nameValidation.test(emojiData.name)) {
      throw new Meteor.Error('error-input-is-not-a-valid-field', `${emojiData.name} is not a valid name`, {
        method: 'insertOrUpdateEmoji',
        input: emojiData.name,
        field: 'Name'
      });
    }

    if (emojiData.aliases) {
      if (aliasValidation.test(emojiData.aliases)) {
        throw new Meteor.Error('error-input-is-not-a-valid-field', `${emojiData.aliases} is not a valid alias set`, {
          method: 'insertOrUpdateEmoji',
          input: emojiData.aliases,
          field: 'Alias_Set'
        });
      }

      emojiData.aliases = emojiData.aliases.split(/[\s,]/);
      emojiData.aliases = emojiData.aliases.filter(Boolean);
      emojiData.aliases = _.without(emojiData.aliases, emojiData.name);
    } else {
      emojiData.aliases = [];
    }

    let matchingResults = [];

    if (emojiData._id) {
      matchingResults = RocketChat.models.EmojiCustom.findByNameOrAliasExceptID(emojiData.name, emojiData._id).fetch();

      for (const alias of emojiData.aliases) {
        matchingResults = matchingResults.concat(RocketChat.models.EmojiCustom.findByNameOrAliasExceptID(alias, emojiData._id).fetch());
      }
    } else {
      matchingResults = RocketChat.models.EmojiCustom.findByNameOrAlias(emojiData.name).fetch();

      for (const alias of emojiData.aliases) {
        matchingResults = matchingResults.concat(RocketChat.models.EmojiCustom.findByNameOrAlias(alias).fetch());
      }
    }

    if (matchingResults.length > 0) {
      throw new Meteor.Error('Custom_Emoji_Error_Name_Or_Alias_Already_In_Use', 'The custom emoji or one of its aliases is already in use', {
        method: 'insertOrUpdateEmoji'
      });
    }

    if (!emojiData._id) {
      // insert emoji
      const createEmoji = {
        name: emojiData.name,
        aliases: emojiData.aliases,
        extension: emojiData.extension
      };

      const _id = RocketChat.models.EmojiCustom.create(createEmoji);

      RocketChat.Notifications.notifyLogged('updateEmojiCustom', {
        emojiData: createEmoji
      });
      return _id;
    } else {
      // update emoji
      if (emojiData.newFile) {
        RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`));
        RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.previousExtension}`));
        RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.extension}`));
        RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`));
        RocketChat.models.EmojiCustom.setExtension(emojiData._id, emojiData.extension);
      } else if (emojiData.name !== emojiData.previousName) {
        const rs = RocketChatFileEmojiCustomInstance.getFileWithReadStream(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`));

        if (rs !== null) {
          RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`));
          const ws = RocketChatFileEmojiCustomInstance.createWriteStream(encodeURIComponent(`${emojiData.name}.${emojiData.previousExtension}`), rs.contentType);
          ws.on('end', Meteor.bindEnvironment(() => RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.previousName}.${emojiData.previousExtension}`))));
          rs.readStream.pipe(ws);
        }
      }

      if (emojiData.name !== emojiData.previousName) {
        RocketChat.models.EmojiCustom.setName(emojiData._id, emojiData.name);
      }

      if (emojiData.aliases) {
        RocketChat.models.EmojiCustom.setAliases(emojiData._id, emojiData.aliases);
      } else {
        RocketChat.models.EmojiCustom.setAliases(emojiData._id, []);
      }

      RocketChat.Notifications.notifyLogged('updateEmojiCustom', {
        emojiData
      });
      return true;
    }
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"uploadEmojiCustom.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/rocketchat_emoji-custom/server/methods/uploadEmojiCustom.js                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
/* globals RocketChatFileEmojiCustomInstance */
Meteor.methods({
  uploadEmojiCustom(binaryContent, contentType, emojiData) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-emoji')) {
      throw new Meteor.Error('not_authorized');
    } // delete aliases for notification purposes. here, it is a string rather than an array


    delete emojiData.aliases;
    const file = new Buffer(binaryContent, 'binary');
    const rs = RocketChatFile.bufferToStream(file);
    RocketChatFileEmojiCustomInstance.deleteFile(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`));
    const ws = RocketChatFileEmojiCustomInstance.createWriteStream(encodeURIComponent(`${emojiData.name}.${emojiData.extension}`), contentType);
    ws.on('end', Meteor.bindEnvironment(() => Meteor.setTimeout(() => RocketChat.Notifications.notifyLogged('updateEmojiCustom', {
      emojiData
    }), 500)));
    rs.pipe(ws);
  }

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:emoji-custom/function-isSet.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/startup/emoji-custom.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/models/EmojiCustom.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/publications/fullEmojiData.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/methods/listEmojiCustom.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/methods/deleteEmojiCustom.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/methods/insertOrUpdateEmoji.js");
require("/node_modules/meteor/rocketchat:emoji-custom/server/methods/uploadEmojiCustom.js");

/* Exports */
Package._define("rocketchat:emoji-custom");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_emoji-custom.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplbW9qaS1jdXN0b20vZnVuY3Rpb24taXNTZXQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZW1vamktY3VzdG9tL3NlcnZlci9zdGFydHVwL2Vtb2ppLWN1c3RvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplbW9qaS1jdXN0b20vc2VydmVyL3N0YXJ0dXAvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZW1vamktY3VzdG9tL3NlcnZlci9tb2RlbHMvRW1vamlDdXN0b20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZW1vamktY3VzdG9tL3NlcnZlci9wdWJsaWNhdGlvbnMvZnVsbEVtb2ppRGF0YS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplbW9qaS1jdXN0b20vc2VydmVyL21ldGhvZHMvbGlzdEVtb2ppQ3VzdG9tLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmVtb2ppLWN1c3RvbS9zZXJ2ZXIvbWV0aG9kcy9kZWxldGVFbW9qaUN1c3RvbS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplbW9qaS1jdXN0b20vc2VydmVyL21ldGhvZHMvaW5zZXJ0T3JVcGRhdGVFbW9qaS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDplbW9qaS1jdXN0b20vc2VydmVyL21ldGhvZHMvdXBsb2FkRW1vamlDdXN0b20uanMiXSwibmFtZXMiOlsiaXNTZXQiLCJmbiIsInZhbHVlIiwiZSIsInVuZGVmaW5lZCIsImlzU2V0Tm90TnVsbCIsIl8iLCJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIk1ldGVvciIsInN0YXJ0dXAiLCJzdG9yZVR5cGUiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJnZXQiLCJSb2NrZXRDaGF0U3RvcmUiLCJSb2NrZXRDaGF0RmlsZSIsIkVycm9yIiwiY29uc29sZSIsImxvZyIsImdyZWVuIiwicGF0aCIsInRyaW0iLCJSb2NrZXRDaGF0RmlsZUVtb2ppQ3VzdG9tSW5zdGFuY2UiLCJuYW1lIiwiYWJzb2x1dGVQYXRoIiwiV2ViQXBwIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiYmluZEVudmlyb25tZW50IiwicmVxIiwicmVzIiwicGFyYW1zIiwiZW1vamkiLCJkZWNvZGVVUklDb21wb25lbnQiLCJ1cmwiLCJyZXBsYWNlIiwiaXNFbXB0eSIsIndyaXRlSGVhZCIsIndyaXRlIiwiZW5kIiwiZmlsZSIsImdldEZpbGVXaXRoUmVhZFN0cmVhbSIsImVuY29kZVVSSUNvbXBvbmVudCIsInNldEhlYWRlciIsInJlcU1vZGlmaWVkSGVhZGVyIiwiaGVhZGVycyIsImNvbG9yIiwiaW5pdGlhbHMiLCJzdmciLCJmaWxlVXBsb2FkRGF0ZSIsInVwbG9hZERhdGUiLCJ0b1VUQ1N0cmluZyIsIkRhdGUiLCJ0ZXN0Iiwic3BsaXQiLCJwb3AiLCJsZW5ndGgiLCJyZWFkU3RyZWFtIiwicGlwZSIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwiRW1vamlDdXN0b20iLCJtb2RlbHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwidHJ5RW5zdXJlSW5kZXgiLCJhbGlhc2VzIiwiZXh0ZW5zaW9uIiwiZmluZE9uZUJ5SUQiLCJvcHRpb25zIiwiZmluZE9uZSIsImZpbmRCeU5hbWVPckFsaWFzIiwiZW1vamlOYW1lIiwicXVlcnkiLCIkb3IiLCJmaW5kIiwiZmluZEJ5TmFtZU9yQWxpYXNFeGNlcHRJRCIsImV4Y2VwdCIsIiRuaW4iLCJzZXROYW1lIiwidXBkYXRlIiwiJHNldCIsInNldEFsaWFzZXMiLCJzZXRFeHRlbnNpb24iLCJjcmVhdGUiLCJkYXRhIiwiaW5zZXJ0IiwicmVtb3ZlQnlJRCIsInJlbW92ZSIsInMiLCJwdWJsaXNoIiwiZmlsdGVyIiwibGltaXQiLCJ1c2VySWQiLCJyZWFkeSIsImZpZWxkcyIsInNvcnQiLCJmaWx0ZXJSZWciLCJSZWdFeHAiLCJlc2NhcGVSZWdFeHAiLCJtZXRob2RzIiwibGlzdEVtb2ppQ3VzdG9tIiwiZmV0Y2giLCJkZWxldGVFbW9qaUN1c3RvbSIsImVtb2ppSUQiLCJhdXRoeiIsImhhc1Blcm1pc3Npb24iLCJtZXRob2QiLCJkZWxldGVGaWxlIiwiTm90aWZpY2F0aW9ucyIsIm5vdGlmeUxvZ2dlZCIsImVtb2ppRGF0YSIsImluc2VydE9yVXBkYXRlRW1vamkiLCJmaWVsZCIsIm5hbWVWYWxpZGF0aW9uIiwiYWxpYXNWYWxpZGF0aW9uIiwiaW5wdXQiLCJCb29sZWFuIiwid2l0aG91dCIsIm1hdGNoaW5nUmVzdWx0cyIsImFsaWFzIiwiY29uY2F0IiwiY3JlYXRlRW1vamkiLCJuZXdGaWxlIiwicHJldmlvdXNFeHRlbnNpb24iLCJwcmV2aW91c05hbWUiLCJycyIsIndzIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJjb250ZW50VHlwZSIsIm9uIiwidXBsb2FkRW1vamlDdXN0b20iLCJiaW5hcnlDb250ZW50IiwiQnVmZmVyIiwiYnVmZmVyVG9TdHJlYW0iLCJzZXRUaW1lb3V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0FBLFFBQVEsVUFBU0MsRUFBVCxFQUFhO0FBQ3BCLE1BQUlDLEtBQUo7O0FBQ0EsTUFBSTtBQUNIQSxZQUFRRCxJQUFSO0FBQ0EsR0FGRCxDQUVFLE9BQU9FLENBQVAsRUFBVTtBQUNYRCxZQUFRRSxTQUFSO0FBQ0EsR0FKRCxTQUlVO0FBQ1QsV0FBT0YsVUFBVUUsU0FBakI7QUFDQTtBQUNELENBVEQ7O0FBV0FDLGVBQWUsVUFBU0osRUFBVCxFQUFhO0FBQzNCLE1BQUlDLEtBQUo7O0FBQ0EsTUFBSTtBQUNIQSxZ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QVAsQ0FBZTtBQUNkK0Isb0JBQWtCQyxhQUFsQixFQUFpQ0gsV0FBakMsRUFBOENsQixTQUE5QyxFQUF5RDtBQUN4RCxRQUFJLENBQUMxRyxXQUFXb0csS0FBWCxDQUFpQkMsYUFBakIsQ0FBK0IsS0FBS2IsTUFBcEMsRUFBNEMsY0FBNUMsQ0FBTCxFQUFrRTtBQUNqRSxZQUFNLElBQUkzRixPQUFPUSxLQUFYLENBQWlCLGdCQUFqQixDQUFOO0FBQ0EsS0FIdUQsQ0FLeEQ7OztBQUNBLFdBQU9xRyxVQUFVN0MsT0FBakI7QUFDQSxVQUFNaEMsT0FBTyxJQUFJbUcsTUFBSixDQUFXRCxhQUFYLEVBQTBCLFFBQTFCLENBQWI7QUFFQSxVQUFNTixLQUFLckgsZUFBZTZILGNBQWYsQ0FBOEJwRyxJQUE5QixDQUFYO0FBQ0FsQixzQ0FBa0M0RixVQUFsQyxDQUE2Q3hFLG1CQUFvQixHQUFHMkUsVUFBVTlGLElBQU0sSUFBSThGLFVBQVU1QyxTQUFXLEVBQWhFLENBQTdDO0FBQ0EsVUFBTTRELEtBQUsvRyxrQ0FBa0NnSCxpQkFBbEMsQ0FBb0Q1RixtQkFBb0IsR0FBRzJFLFVBQVU5RixJQUFNLElBQUk4RixVQUFVNUMsU0FBVyxFQUFoRSxDQUFwRCxFQUF3SDhELFdBQXhILENBQVg7QUFDQUYsT0FBR0csRUFBSCxDQUFNLEtBQU4sRUFBYWhJLE9BQU9vQixlQUFQLENBQXVCLE1BQ25DcEIsT0FBT3FJLFVBQVAsQ0FBa0IsTUFBTWxJLFdBQVd3RyxhQUFYLENBQXlCQyxZQUF6QixDQUFzQyxtQkFBdEMsRUFBMkQ7QUFBRUM7QUFBRixLQUEzRCxDQUF4QixFQUFtRyxHQUFuRyxDQURZLENBQWI7QUFJQWUsT0FBRzFFLElBQUgsQ0FBUTJFLEVBQVI7QUFDQTs7QUFsQmEsQ0FBZixFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2Vtb2ppLWN1c3RvbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgaXNTZXQ6dHJ1ZSwgaXNTZXROb3ROdWxsOnRydWUgKi9cbi8vIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzI2OTkwMzQ3IGZ1bmN0aW9uIGlzU2V0KCkgZnJvbSBHYWp1c1xuaXNTZXQgPSBmdW5jdGlvbihmbikge1xuXHRsZXQgdmFsdWU7XG5cdHRyeSB7XG5cdFx0dmFsdWUgPSBmbigpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0dmFsdWUgPSB1bmRlZmluZWQ7XG5cdH0gZmluYWxseSB7XG5cdFx0cmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdH1cbn07XG5cbmlzU2V0Tm90TnVsbCA9IGZ1bmN0aW9uKGZuKSB7XG5cdGxldCB2YWx1ZTtcblx0dHJ5IHtcblx0XHR2YWx1ZSA9IGZuKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHR2YWx1ZSA9IG51bGw7XG5cdH0gZmluYWxseSB7XG5cdFx0cmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHZhbHVlICE9PSB1bmRlZmluZWQ7XG5cdH1cbn07XG5cbi8qIGV4cG9ydGVkIGlzU2V0LCBpc1NldE5vdE51bGwgKi9cbiIsIi8qIGdsb2JhbHMgUm9ja2V0Q2hhdEZpbGVFbW9qaUN1c3RvbUluc3RhbmNlICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdGxldCBzdG9yZVR5cGUgPSAnR3JpZEZTJztcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Vtb2ppVXBsb2FkX1N0b3JhZ2VfVHlwZScpKSB7XG5cdFx0c3RvcmVUeXBlID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0Vtb2ppVXBsb2FkX1N0b3JhZ2VfVHlwZScpO1xuXHR9XG5cblx0Y29uc3QgUm9ja2V0Q2hhdFN0b3JlID0gUm9ja2V0Q2hhdEZpbGVbc3RvcmVUeXBlXTtcblxuXHRpZiAoUm9ja2V0Q2hhdFN0b3JlID09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgUm9ja2V0Q2hhdFN0b3JlIHR5cGUgWyR7IHN0b3JlVHlwZSB9XWApO1xuXHR9XG5cblx0Y29uc29sZS5sb2coYFVzaW5nICR7IHN0b3JlVHlwZSB9IGZvciBjdXN0b20gZW1vamkgc3RvcmFnZWAuZ3JlZW4pO1xuXG5cdGxldCBwYXRoID0gJ34vdXBsb2Fkcyc7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRW1vamlVcGxvYWRfRmlsZVN5c3RlbVBhdGgnKSAhPSBudWxsKSB7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdFbW9qaVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcpLnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdHBhdGggPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRW1vamlVcGxvYWRfRmlsZVN5c3RlbVBhdGgnKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLlJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZSA9IG5ldyBSb2NrZXRDaGF0U3RvcmUoe1xuXHRcdG5hbWU6ICdjdXN0b21fZW1vamknLFxuXHRcdGFic29sdXRlUGF0aDogcGF0aCxcblx0fSk7XG5cblx0cmV0dXJuIFdlYkFwcC5jb25uZWN0SGFuZGxlcnMudXNlKCcvZW1vamktY3VzdG9tLycsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24ocmVxLCByZXMvKiAsIG5leHQqLykge1xuXHRcdGNvbnN0IHBhcmFtcyA9XG5cdFx0XHR7IGVtb2ppOiBkZWNvZGVVUklDb21wb25lbnQocmVxLnVybC5yZXBsYWNlKC9eXFwvLywgJycpLnJlcGxhY2UoL1xcPy4qJC8sICcnKSkgfTtcblxuXHRcdGlmIChfLmlzRW1wdHkocGFyYW1zLmVtb2ppKSkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0cmVzLndyaXRlKCdGb3JiaWRkZW4nKTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdEZpbGVFbW9qaUN1c3RvbUluc3RhbmNlLmdldEZpbGVXaXRoUmVhZFN0cmVhbShlbmNvZGVVUklDb21wb25lbnQocGFyYW1zLmVtb2ppKSk7XG5cblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgJ2lubGluZScpO1xuXG5cdFx0aWYgKGZpbGUgPT0gbnVsbCkge1xuXHRcdFx0Ly8gdXNlIGNvZGUgZnJvbSB1c2VybmFtZSBpbml0aWFscyByZW5kZXJlciB1bnRpbCBmaWxlIHVwbG9hZCBpcyBjb21wbGV0ZVxuXHRcdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2ltYWdlL3N2Zyt4bWwnKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAncHVibGljLCBtYXgtYWdlPTAnKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0V4cGlyZXMnLCAnLTEnKTtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCAnVGh1LCAwMSBKYW4gMjAxNSAwMDowMDowMCBHTVQnKTtcblxuXHRcdFx0Y29uc3QgcmVxTW9kaWZpZWRIZWFkZXIgPSByZXEuaGVhZGVyc1snaWYtbW9kaWZpZWQtc2luY2UnXTtcblx0XHRcdGlmIChyZXFNb2RpZmllZEhlYWRlciAhPSBudWxsKSB7XG5cdFx0XHRcdGlmIChyZXFNb2RpZmllZEhlYWRlciA9PT0gJ1RodSwgMDEgSmFuIDIwMTUgMDA6MDA6MDAgR01UJykge1xuXHRcdFx0XHRcdHJlcy53cml0ZUhlYWQoMzA0KTtcblx0XHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGNvbG9yID0gJyMwMDAnO1xuXHRcdFx0Y29uc3QgaW5pdGlhbHMgPSAnPyc7XG5cblx0XHRcdGNvbnN0IHN2ZyA9IGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiIHN0YW5kYWxvbmU9XCJub1wiPz5cbjxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHBvaW50ZXItZXZlbnRzPVwibm9uZVwiIHdpZHRoPVwiNTBcIiBoZWlnaHQ9XCI1MFwiIHN0eWxlPVwid2lkdGg6IDUwcHg7IGhlaWdodDogNTBweDsgYmFja2dyb3VuZC1jb2xvcjogJHsgY29sb3IgfTtcIj5cblx0PHRleHQgdGV4dC1hbmNob3I9XCJtaWRkbGVcIiB5PVwiNTAlXCIgeD1cIjUwJVwiIGR5PVwiMC4zNmVtXCIgcG9pbnRlci1ldmVudHM9XCJhdXRvXCIgZmlsbD1cIiNmZmZmZmZcIiBmb250LWZhbWlseT1cIkhlbHZldGljYSwgQXJpYWwsIEx1Y2lkYSBHcmFuZGUsIHNhbnMtc2VyaWZcIiBzdHlsZT1cImZvbnQtd2VpZ2h0OiA0MDA7IGZvbnQtc2l6ZTogMjhweDtcIj5cblx0XHQkeyBpbml0aWFscyB9XG5cdDwvdGV4dD5cbjwvc3ZnPmA7XG5cblx0XHRcdHJlcy53cml0ZShzdmcpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGxldCBmaWxlVXBsb2FkRGF0ZSA9IHVuZGVmaW5lZDtcblx0XHRpZiAoZmlsZS51cGxvYWREYXRlICE9IG51bGwpIHtcblx0XHRcdGZpbGVVcGxvYWREYXRlID0gZmlsZS51cGxvYWREYXRlLnRvVVRDU3RyaW5nKCk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVxTW9kaWZpZWRIZWFkZXIgPSByZXEuaGVhZGVyc1snaWYtbW9kaWZpZWQtc2luY2UnXTtcblx0XHRpZiAocmVxTW9kaWZpZWRIZWFkZXIgIT0gbnVsbCkge1xuXHRcdFx0aWYgKHJlcU1vZGlmaWVkSGVhZGVyID09PSBmaWxlVXBsb2FkRGF0ZSkge1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdMYXN0LU1vZGlmaWVkJywgcmVxTW9kaWZpZWRIZWFkZXIpO1xuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwNCk7XG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAncHVibGljLCBtYXgtYWdlPTAnKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdFeHBpcmVzJywgJy0xJyk7XG5cdFx0aWYgKGZpbGVVcGxvYWREYXRlICE9IG51bGwpIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBmaWxlVXBsb2FkRGF0ZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBuZXcgRGF0ZSgpLnRvVVRDU3RyaW5nKCkpO1xuXHRcdH1cblx0XHRpZiAoL15zdmckL2kudGVzdChwYXJhbXMuZW1vamkuc3BsaXQoJy4nKS5wb3AoKSkpIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdpbWFnZS9zdmcreG1sJyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdpbWFnZS9qcGVnJyk7XG5cdFx0fVxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgZmlsZS5sZW5ndGgpO1xuXG5cdFx0ZmlsZS5yZWFkU3RyZWFtLnBpcGUocmVzKTtcblx0fSkpO1xufSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdFbW9qaUN1c3RvbUZpbGVzeXN0ZW0nLCBmdW5jdGlvbigpIHtcblx0dGhpcy5hZGQoJ0Vtb2ppVXBsb2FkX1N0b3JhZ2VfVHlwZScsICdHcmlkRlMnLCB7XG5cdFx0dHlwZTogJ3NlbGVjdCcsXG5cdFx0dmFsdWVzOiBbe1xuXHRcdFx0a2V5OiAnR3JpZEZTJyxcblx0XHRcdGkxOG5MYWJlbDogJ0dyaWRGUycsXG5cdFx0fSwge1xuXHRcdFx0a2V5OiAnRmlsZVN5c3RlbScsXG5cdFx0XHRpMThuTGFiZWw6ICdGaWxlU3lzdGVtJyxcblx0XHR9XSxcblx0XHRpMThuTGFiZWw6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdFbW9qaVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdF9pZDogJ0Vtb2ppVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHR2YWx1ZTogJ0ZpbGVTeXN0ZW0nLFxuXHRcdH0sXG5cdFx0aTE4bkxhYmVsOiAnRmlsZVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcsXG5cdH0pO1xufSk7XG4iLCJjbGFzcyBFbW9qaUN1c3RvbSBleHRlbmRzIFJvY2tldENoYXQubW9kZWxzLl9CYXNlIHtcblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoJ2N1c3RvbV9lbW9qaScpO1xuXG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IG5hbWU6IDEgfSk7XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGFsaWFzZXM6IDEgfSk7XG5cdFx0dGhpcy50cnlFbnN1cmVJbmRleCh7IGV4dGVuc2lvbjogMSB9KTtcblx0fVxuXG5cdC8vIGZpbmQgb25lXG5cdGZpbmRPbmVCeUlEKF9pZCwgb3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoX2lkLCBvcHRpb25zKTtcblx0fVxuXG5cdC8vIGZpbmRcblx0ZmluZEJ5TmFtZU9yQWxpYXMoZW1vamlOYW1lLCBvcHRpb25zKSB7XG5cdFx0bGV0IG5hbWUgPSBlbW9qaU5hbWU7XG5cblx0XHRpZiAodHlwZW9mIGVtb2ppTmFtZSA9PT0gJ3N0cmluZycpIHtcblx0XHRcdG5hbWUgPSBlbW9qaU5hbWUucmVwbGFjZSgvOi9nLCAnJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHQkb3I6IFtcblx0XHRcdFx0eyBuYW1lIH0sXG5cdFx0XHRcdHsgYWxpYXNlczogbmFtZSB9LFxuXHRcdFx0XSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHRmaW5kQnlOYW1lT3JBbGlhc0V4Y2VwdElEKG5hbWUsIGV4Y2VwdCwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0X2lkOiB7ICRuaW46IFtleGNlcHRdIH0sXG5cdFx0XHQkb3I6IFtcblx0XHRcdFx0eyBuYW1lIH0sXG5cdFx0XHRcdHsgYWxpYXNlczogbmFtZSB9LFxuXHRcdFx0XSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXG5cdC8vIHVwZGF0ZVxuXHRzZXROYW1lKF9pZCwgbmFtZSkge1xuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0bmFtZSxcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLnVwZGF0ZSh7IF9pZCB9LCB1cGRhdGUpO1xuXHR9XG5cblx0c2V0QWxpYXNlcyhfaWQsIGFsaWFzZXMpIHtcblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdGFsaWFzZXMsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcblx0fVxuXG5cdHNldEV4dGVuc2lvbihfaWQsIGV4dGVuc2lvbikge1xuXHRcdGNvbnN0IHVwZGF0ZSA9IHtcblx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0ZXh0ZW5zaW9uLFxuXHRcdFx0fSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMudXBkYXRlKHsgX2lkIH0sIHVwZGF0ZSk7XG5cdH1cblxuXHQvLyBJTlNFUlRcblx0Y3JlYXRlKGRhdGEpIHtcblx0XHRyZXR1cm4gdGhpcy5pbnNlcnQoZGF0YSk7XG5cdH1cblxuXG5cdC8vIFJFTU9WRVxuXHRyZW1vdmVCeUlEKF9pZCkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZShfaWQpO1xuXHR9XG59XG5cblJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tID0gbmV3IEVtb2ppQ3VzdG9tKCk7XG4iLCJpbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5wdWJsaXNoKCdmdWxsRW1vamlEYXRhJywgZnVuY3Rpb24oZmlsdGVyLCBsaW1pdCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVhZHkoKTtcblx0fVxuXG5cdGNvbnN0IGZpZWxkcyA9IHtcblx0XHRuYW1lOiAxLFxuXHRcdGFsaWFzZXM6IDEsXG5cdFx0ZXh0ZW5zaW9uOiAxLFxuXHR9O1xuXG5cdGZpbHRlciA9IHMudHJpbShmaWx0ZXIpO1xuXG5cdGNvbnN0IG9wdGlvbnMgPSB7XG5cdFx0ZmllbGRzLFxuXHRcdGxpbWl0LFxuXHRcdHNvcnQ6IHsgbmFtZTogMSB9LFxuXHR9O1xuXG5cdGlmIChmaWx0ZXIpIHtcblx0XHRjb25zdCBmaWx0ZXJSZWcgPSBuZXcgUmVnRXhwKHMuZXNjYXBlUmVnRXhwKGZpbHRlciksICdpJyk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLmZpbmRCeU5hbWVPckFsaWFzKGZpbHRlclJlZywgb3B0aW9ucyk7XG5cdH1cblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuRW1vamlDdXN0b20uZmluZCh7fSwgb3B0aW9ucyk7XG59KTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0bGlzdEVtb2ppQ3VzdG9tKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5FbW9qaUN1c3RvbS5maW5kKHt9KS5mZXRjaCgpO1xuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWxzIFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZSAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHRkZWxldGVFbW9qaUN1c3RvbShlbW9qaUlEKSB7XG5cdFx0bGV0IGVtb2ppID0gbnVsbDtcblxuXHRcdGlmIChSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtZW1vamknKSkge1xuXHRcdFx0ZW1vamkgPSBSb2NrZXRDaGF0Lm1vZGVscy5FbW9qaUN1c3RvbS5maW5kT25lQnlJRChlbW9qaUlEKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoZW1vamkgPT0gbnVsbCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignQ3VzdG9tX0Vtb2ppX0Vycm9yX0ludmFsaWRfRW1vamknLCAnSW52YWxpZCBlbW9qaScsIHsgbWV0aG9kOiAnZGVsZXRlRW1vamlDdXN0b20nIH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZS5kZWxldGVGaWxlKGVuY29kZVVSSUNvbXBvbmVudChgJHsgZW1vamkubmFtZSB9LiR7IGVtb2ppLmV4dGVuc2lvbiB9YCkpO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLnJlbW92ZUJ5SUQoZW1vamlJRCk7XG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgnZGVsZXRlRW1vamlDdXN0b20nLCB7IGVtb2ppRGF0YTogZW1vamkgfSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0RmlsZUVtb2ppQ3VzdG9tSW5zdGFuY2UgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGluc2VydE9yVXBkYXRlRW1vamkoZW1vamlEYXRhKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtZW1vamknKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoIXMudHJpbShlbW9qaURhdGEubmFtZSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRoZS1maWVsZC1pcy1yZXF1aXJlZCcsICdUaGUgZmllbGQgTmFtZSBpcyByZXF1aXJlZCcsIHsgbWV0aG9kOiAnaW5zZXJ0T3JVcGRhdGVFbW9qaScsIGZpZWxkOiAnTmFtZScgfSk7XG5cdFx0fVxuXG5cdFx0Ly8gYWxsb3cgYWxsIGNoYXJhY3RlcnMgZXhjZXB0IGNvbG9uLCB3aGl0ZXNwYWNlLCBjb21tYSwgPiwgPCwgJiwgXCIsICcsIC8sIFxcLCAoLCApXG5cdFx0Ly8gbW9yZSBwcmFjdGljYWwgdGhhbiBhbGxvd2luZyBzcGVjaWZpYyBzZXRzIG9mIGNoYXJhY3RlcnM7IGFsc28gYWxsb3dzIGZvcmVpZ24gbGFuZ3VhZ2VzXG5cdFx0Y29uc3QgbmFtZVZhbGlkYXRpb24gPSAvW1xccyw6PjwmXCInXFwvXFxcXFxcKFxcKV0vO1xuXHRcdGNvbnN0IGFsaWFzVmFsaWRhdGlvbiA9IC9bOj48JlxcfFwiJ1xcL1xcXFxcXChcXCldLztcblxuXHRcdC8vIHNpbGVudGx5IHN0cmlwIGNvbG9uOyB0aGlzIGFsbG93cyBmb3IgdXBsb2FkaW5nIDplbW9qaW5hbWU6IGFzIGVtb2ppbmFtZVxuXHRcdGVtb2ppRGF0YS5uYW1lID0gZW1vamlEYXRhLm5hbWUucmVwbGFjZSgvOi9nLCAnJyk7XG5cdFx0ZW1vamlEYXRhLmFsaWFzZXMgPSBlbW9qaURhdGEuYWxpYXNlcy5yZXBsYWNlKC86L2csICcnKTtcblxuXHRcdGlmIChuYW1lVmFsaWRhdGlvbi50ZXN0KGVtb2ppRGF0YS5uYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW5wdXQtaXMtbm90LWEtdmFsaWQtZmllbGQnLCBgJHsgZW1vamlEYXRhLm5hbWUgfSBpcyBub3QgYSB2YWxpZCBuYW1lYCwgeyBtZXRob2Q6ICdpbnNlcnRPclVwZGF0ZUVtb2ppJywgaW5wdXQ6IGVtb2ppRGF0YS5uYW1lLCBmaWVsZDogJ05hbWUnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChlbW9qaURhdGEuYWxpYXNlcykge1xuXHRcdFx0aWYgKGFsaWFzVmFsaWRhdGlvbi50ZXN0KGVtb2ppRGF0YS5hbGlhc2VzKSkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnB1dC1pcy1ub3QtYS12YWxpZC1maWVsZCcsIGAkeyBlbW9qaURhdGEuYWxpYXNlcyB9IGlzIG5vdCBhIHZhbGlkIGFsaWFzIHNldGAsIHsgbWV0aG9kOiAnaW5zZXJ0T3JVcGRhdGVFbW9qaScsIGlucHV0OiBlbW9qaURhdGEuYWxpYXNlcywgZmllbGQ6ICdBbGlhc19TZXQnIH0pO1xuXHRcdFx0fVxuXHRcdFx0ZW1vamlEYXRhLmFsaWFzZXMgPSBlbW9qaURhdGEuYWxpYXNlcy5zcGxpdCgvW1xccyxdLyk7XG5cdFx0XHRlbW9qaURhdGEuYWxpYXNlcyA9IGVtb2ppRGF0YS5hbGlhc2VzLmZpbHRlcihCb29sZWFuKTtcblx0XHRcdGVtb2ppRGF0YS5hbGlhc2VzID0gXy53aXRob3V0KGVtb2ppRGF0YS5hbGlhc2VzLCBlbW9qaURhdGEubmFtZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGVtb2ppRGF0YS5hbGlhc2VzID0gW107XG5cdFx0fVxuXG5cdFx0bGV0IG1hdGNoaW5nUmVzdWx0cyA9IFtdO1xuXG5cdFx0aWYgKGVtb2ppRGF0YS5faWQpIHtcblx0XHRcdG1hdGNoaW5nUmVzdWx0cyA9IFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLmZpbmRCeU5hbWVPckFsaWFzRXhjZXB0SUQoZW1vamlEYXRhLm5hbWUsIGVtb2ppRGF0YS5faWQpLmZldGNoKCk7XG5cdFx0XHRmb3IgKGNvbnN0IGFsaWFzIG9mIGVtb2ppRGF0YS5hbGlhc2VzKSB7XG5cdFx0XHRcdG1hdGNoaW5nUmVzdWx0cyA9IG1hdGNoaW5nUmVzdWx0cy5jb25jYXQoUm9ja2V0Q2hhdC5tb2RlbHMuRW1vamlDdXN0b20uZmluZEJ5TmFtZU9yQWxpYXNFeGNlcHRJRChhbGlhcywgZW1vamlEYXRhLl9pZCkuZmV0Y2goKSk7XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1hdGNoaW5nUmVzdWx0cyA9IFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLmZpbmRCeU5hbWVPckFsaWFzKGVtb2ppRGF0YS5uYW1lKS5mZXRjaCgpO1xuXHRcdFx0Zm9yIChjb25zdCBhbGlhcyBvZiBlbW9qaURhdGEuYWxpYXNlcykge1xuXHRcdFx0XHRtYXRjaGluZ1Jlc3VsdHMgPSBtYXRjaGluZ1Jlc3VsdHMuY29uY2F0KFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLmZpbmRCeU5hbWVPckFsaWFzKGFsaWFzKS5mZXRjaCgpKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAobWF0Y2hpbmdSZXN1bHRzLmxlbmd0aCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0N1c3RvbV9FbW9qaV9FcnJvcl9OYW1lX09yX0FsaWFzX0FscmVhZHlfSW5fVXNlJywgJ1RoZSBjdXN0b20gZW1vamkgb3Igb25lIG9mIGl0cyBhbGlhc2VzIGlzIGFscmVhZHkgaW4gdXNlJywgeyBtZXRob2Q6ICdpbnNlcnRPclVwZGF0ZUVtb2ppJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIWVtb2ppRGF0YS5faWQpIHtcblx0XHRcdC8vIGluc2VydCBlbW9qaVxuXHRcdFx0Y29uc3QgY3JlYXRlRW1vamkgPSB7XG5cdFx0XHRcdG5hbWU6IGVtb2ppRGF0YS5uYW1lLFxuXHRcdFx0XHRhbGlhc2VzOiBlbW9qaURhdGEuYWxpYXNlcyxcblx0XHRcdFx0ZXh0ZW5zaW9uOiBlbW9qaURhdGEuZXh0ZW5zaW9uLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgX2lkID0gUm9ja2V0Q2hhdC5tb2RlbHMuRW1vamlDdXN0b20uY3JlYXRlKGNyZWF0ZUVtb2ppKTtcblxuXHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgndXBkYXRlRW1vamlDdXN0b20nLCB7IGVtb2ppRGF0YTogY3JlYXRlRW1vamkgfSk7XG5cblx0XHRcdHJldHVybiBfaWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHVwZGF0ZSBlbW9qaVxuXHRcdFx0aWYgKGVtb2ppRGF0YS5uZXdGaWxlKSB7XG5cdFx0XHRcdFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZS5kZWxldGVGaWxlKGVuY29kZVVSSUNvbXBvbmVudChgJHsgZW1vamlEYXRhLm5hbWUgfS4keyBlbW9qaURhdGEuZXh0ZW5zaW9uIH1gKSk7XG5cdFx0XHRcdFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZS5kZWxldGVGaWxlKGVuY29kZVVSSUNvbXBvbmVudChgJHsgZW1vamlEYXRhLm5hbWUgfS4keyBlbW9qaURhdGEucHJldmlvdXNFeHRlbnNpb24gfWApKTtcblx0XHRcdFx0Um9ja2V0Q2hhdEZpbGVFbW9qaUN1c3RvbUluc3RhbmNlLmRlbGV0ZUZpbGUoZW5jb2RlVVJJQ29tcG9uZW50KGAkeyBlbW9qaURhdGEucHJldmlvdXNOYW1lIH0uJHsgZW1vamlEYXRhLmV4dGVuc2lvbiB9YCkpO1xuXHRcdFx0XHRSb2NrZXRDaGF0RmlsZUVtb2ppQ3VzdG9tSW5zdGFuY2UuZGVsZXRlRmlsZShlbmNvZGVVUklDb21wb25lbnQoYCR7IGVtb2ppRGF0YS5wcmV2aW91c05hbWUgfS4keyBlbW9qaURhdGEucHJldmlvdXNFeHRlbnNpb24gfWApKTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5FbW9qaUN1c3RvbS5zZXRFeHRlbnNpb24oZW1vamlEYXRhLl9pZCwgZW1vamlEYXRhLmV4dGVuc2lvbik7XG5cdFx0XHR9IGVsc2UgaWYgKGVtb2ppRGF0YS5uYW1lICE9PSBlbW9qaURhdGEucHJldmlvdXNOYW1lKSB7XG5cdFx0XHRcdGNvbnN0IHJzID0gUm9ja2V0Q2hhdEZpbGVFbW9qaUN1c3RvbUluc3RhbmNlLmdldEZpbGVXaXRoUmVhZFN0cmVhbShlbmNvZGVVUklDb21wb25lbnQoYCR7IGVtb2ppRGF0YS5wcmV2aW91c05hbWUgfS4keyBlbW9qaURhdGEucHJldmlvdXNFeHRlbnNpb24gfWApKTtcblx0XHRcdFx0aWYgKHJzICE9PSBudWxsKSB7XG5cdFx0XHRcdFx0Um9ja2V0Q2hhdEZpbGVFbW9qaUN1c3RvbUluc3RhbmNlLmRlbGV0ZUZpbGUoZW5jb2RlVVJJQ29tcG9uZW50KGAkeyBlbW9qaURhdGEubmFtZSB9LiR7IGVtb2ppRGF0YS5leHRlbnNpb24gfWApKTtcblx0XHRcdFx0XHRjb25zdCB3cyA9IFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZS5jcmVhdGVXcml0ZVN0cmVhbShlbmNvZGVVUklDb21wb25lbnQoYCR7IGVtb2ppRGF0YS5uYW1lIH0uJHsgZW1vamlEYXRhLnByZXZpb3VzRXh0ZW5zaW9uIH1gKSwgcnMuY29udGVudFR5cGUpO1xuXHRcdFx0XHRcdHdzLm9uKCdlbmQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+XG5cdFx0XHRcdFx0XHRSb2NrZXRDaGF0RmlsZUVtb2ppQ3VzdG9tSW5zdGFuY2UuZGVsZXRlRmlsZShlbmNvZGVVUklDb21wb25lbnQoYCR7IGVtb2ppRGF0YS5wcmV2aW91c05hbWUgfS4keyBlbW9qaURhdGEucHJldmlvdXNFeHRlbnNpb24gfWApKVxuXHRcdFx0XHRcdCkpO1xuXHRcdFx0XHRcdHJzLnJlYWRTdHJlYW0ucGlwZSh3cyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKGVtb2ppRGF0YS5uYW1lICE9PSBlbW9qaURhdGEucHJldmlvdXNOYW1lKSB7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLkVtb2ppQ3VzdG9tLnNldE5hbWUoZW1vamlEYXRhLl9pZCwgZW1vamlEYXRhLm5hbWUpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoZW1vamlEYXRhLmFsaWFzZXMpIHtcblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuRW1vamlDdXN0b20uc2V0QWxpYXNlcyhlbW9qaURhdGEuX2lkLCBlbW9qaURhdGEuYWxpYXNlcyk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5FbW9qaUN1c3RvbS5zZXRBbGlhc2VzKGVtb2ppRGF0YS5faWQsIFtdKTtcblx0XHRcdH1cblxuXHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgndXBkYXRlRW1vamlDdXN0b20nLCB7IGVtb2ppRGF0YSB9KTtcblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHR9LFxufSk7XG4iLCIvKiBnbG9iYWxzIFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZSAqL1xuTWV0ZW9yLm1ldGhvZHMoe1xuXHR1cGxvYWRFbW9qaUN1c3RvbShiaW5hcnlDb250ZW50LCBjb250ZW50VHlwZSwgZW1vamlEYXRhKSB7XG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdtYW5hZ2UtZW1vamknKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHQvLyBkZWxldGUgYWxpYXNlcyBmb3Igbm90aWZpY2F0aW9uIHB1cnBvc2VzLiBoZXJlLCBpdCBpcyBhIHN0cmluZyByYXRoZXIgdGhhbiBhbiBhcnJheVxuXHRcdGRlbGV0ZSBlbW9qaURhdGEuYWxpYXNlcztcblx0XHRjb25zdCBmaWxlID0gbmV3IEJ1ZmZlcihiaW5hcnlDb250ZW50LCAnYmluYXJ5Jyk7XG5cblx0XHRjb25zdCBycyA9IFJvY2tldENoYXRGaWxlLmJ1ZmZlclRvU3RyZWFtKGZpbGUpO1xuXHRcdFJvY2tldENoYXRGaWxlRW1vamlDdXN0b21JbnN0YW5jZS5kZWxldGVGaWxlKGVuY29kZVVSSUNvbXBvbmVudChgJHsgZW1vamlEYXRhLm5hbWUgfS4keyBlbW9qaURhdGEuZXh0ZW5zaW9uIH1gKSk7XG5cdFx0Y29uc3Qgd3MgPSBSb2NrZXRDaGF0RmlsZUVtb2ppQ3VzdG9tSW5zdGFuY2UuY3JlYXRlV3JpdGVTdHJlYW0oZW5jb2RlVVJJQ29tcG9uZW50KGAkeyBlbW9qaURhdGEubmFtZSB9LiR7IGVtb2ppRGF0YS5leHRlbnNpb24gfWApLCBjb250ZW50VHlwZSk7XG5cdFx0d3Mub24oJ2VuZCcsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT5cblx0XHRcdE1ldGVvci5zZXRUaW1lb3V0KCgpID0+IFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlMb2dnZWQoJ3VwZGF0ZUVtb2ppQ3VzdG9tJywgeyBlbW9qaURhdGEgfSksIDUwMClcblx0XHQpKTtcblxuXHRcdHJzLnBpcGUod3MpO1xuXHR9LFxufSk7XG4iXX0=
