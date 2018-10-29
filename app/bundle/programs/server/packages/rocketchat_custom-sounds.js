(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ReactiveVar = Package['reactive-var'].ReactiveVar;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var self;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:custom-sounds":{"server":{"startup":{"custom-sounds.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/startup/custom-sounds.js                                                //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.startup(function () {
  let storeType = 'GridFS';

  if (RocketChat.settings.get('CustomSounds_Storage_Type')) {
    storeType = RocketChat.settings.get('CustomSounds_Storage_Type');
  }

  const RocketChatStore = RocketChatFile[storeType];

  if (RocketChatStore == null) {
    throw new Error(`Invalid RocketChatStore type [${storeType}]`);
  }

  console.log(`Using ${storeType} for custom sounds storage`.green);
  let path = '~/uploads';

  if (RocketChat.settings.get('CustomSounds_FileSystemPath') != null) {
    if (RocketChat.settings.get('CustomSounds_FileSystemPath').trim() !== '') {
      path = RocketChat.settings.get('CustomSounds_FileSystemPath');
    }
  }

  this.RocketChatFileCustomSoundsInstance = new RocketChatStore({
    name: 'custom_sounds',
    absolutePath: path
  });
  self = this;
  return WebApp.connectHandlers.use('/custom-sounds/', Meteor.bindEnvironment(function (req, res
  /* , next*/
  ) {
    const params = {
      sound: decodeURIComponent(req.url.replace(/^\//, '').replace(/\?.*$/, ''))
    };

    if (_.isEmpty(params.sound)) {
      res.writeHead(403);
      res.write('Forbidden');
      res.end();
      return;
    }

    const file = RocketChatFileCustomSoundsInstance.getFileWithReadStream(params.sound);

    if (!file) {
      return;
    }

    res.setHeader('Content-Disposition', 'inline');
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

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', file.length);
    file.readStream.pipe(res);
  }));
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"permissions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/startup/permissions.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.startup(() => {
  if (RocketChat.models && RocketChat.models.Permissions) {
    RocketChat.models.Permissions.createOrUpdate('manage-sounds', ['admin']);
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/startup/settings.js                                                     //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
RocketChat.settings.addGroup('CustomSoundsFilesystem', function () {
  this.add('CustomSounds_Storage_Type', 'GridFS', {
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
  this.add('CustomSounds_FileSystemPath', '', {
    type: 'string',
    enableQuery: {
      _id: 'CustomSounds_Storage_Type',
      value: 'FileSystem'
    },
    i18nLabel: 'FileUpload_FileSystemPath'
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"CustomSounds.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/models/CustomSounds.js                                                  //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
class CustomSounds extends RocketChat.models._Base {
  constructor() {
    super('custom_sounds');
    this.tryEnsureIndex({
      name: 1
    });
  } // find one


  findOneByID(_id, options) {
    return this.findOne(_id, options);
  } // find


  findByName(name, options) {
    const query = {
      name
    };
    return this.find(query, options);
  }

  findByNameExceptID(name, except, options) {
    const query = {
      _id: {
        $nin: [except]
      },
      name
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
  } // INSERT


  create(data) {
    return this.insert(data);
  } // REMOVE


  removeByID(_id) {
    return this.remove(_id);
  }

}

RocketChat.models.CustomSounds = new CustomSounds();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"customSounds.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/publications/customSounds.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.publish('customSounds', function (filter, limit) {
  if (!this.userId) {
    return this.ready();
  }

  const fields = {
    name: 1,
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
    return RocketChat.models.CustomSounds.findByName(filterReg, options);
  }

  return RocketChat.models.CustomSounds.find({}, options);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"deleteCustomSound.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/methods/deleteCustomSound.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/* globals RocketChatFileCustomSoundsInstance */
Meteor.methods({
  deleteCustomSound(_id) {
    let sound = null;

    if (RocketChat.authz.hasPermission(this.userId, 'manage-sounds')) {
      sound = RocketChat.models.CustomSounds.findOneByID(_id);
    } else {
      throw new Meteor.Error('not_authorized');
    }

    if (sound == null) {
      throw new Meteor.Error('Custom_Sound_Error_Invalid_Sound', 'Invalid sound', {
        method: 'deleteCustomSound'
      });
    }

    RocketChatFileCustomSoundsInstance.deleteFile(`${sound._id}.${sound.extension}`);
    RocketChat.models.CustomSounds.removeByID(_id);
    RocketChat.Notifications.notifyAll('deleteCustomSound', {
      soundData: sound
    });
    return true;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"insertOrUpdateSound.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/methods/insertOrUpdateSound.js                                          //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let s;
module.watch(require("underscore.string"), {
  default(v) {
    s = v;
  }

}, 0);
Meteor.methods({
  insertOrUpdateSound(soundData) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-sounds')) {
      throw new Meteor.Error('not_authorized');
    }

    if (!s.trim(soundData.name)) {
      throw new Meteor.Error('error-the-field-is-required', 'The field Name is required', {
        method: 'insertOrUpdateSound',
        field: 'Name'
      });
    } // let nameValidation = new RegExp('^[0-9a-zA-Z-_+;.]+$');
    // allow all characters except colon, whitespace, comma, >, <, &, ", ', /, \, (, )
    // more practical than allowing specific sets of characters; also allows foreign languages


    const nameValidation = /[\s,:><&"'\/\\\(\)]/; // silently strip colon; this allows for uploading :soundname: as soundname

    soundData.name = soundData.name.replace(/:/g, '');

    if (nameValidation.test(soundData.name)) {
      throw new Meteor.Error('error-input-is-not-a-valid-field', `${soundData.name} is not a valid name`, {
        method: 'insertOrUpdateSound',
        input: soundData.name,
        field: 'Name'
      });
    }

    let matchingResults = [];

    if (soundData._id) {
      matchingResults = RocketChat.models.CustomSounds.findByNameExceptID(soundData.name, soundData._id).fetch();
    } else {
      matchingResults = RocketChat.models.CustomSounds.findByName(soundData.name).fetch();
    }

    if (matchingResults.length > 0) {
      throw new Meteor.Error('Custom_Sound_Error_Name_Already_In_Use', 'The custom sound name is already in use', {
        method: 'insertOrUpdateSound'
      });
    }

    if (!soundData._id) {
      // insert sound
      const createSound = {
        name: soundData.name,
        extension: soundData.extension
      };

      const _id = RocketChat.models.CustomSounds.create(createSound);

      createSound._id = _id;
      return _id;
    } else {
      // update sound
      if (soundData.newFile) {
        RocketChatFileCustomSoundsInstance.deleteFile(`${soundData._id}.${soundData.previousExtension}`);
      }

      if (soundData.name !== soundData.previousName) {
        RocketChat.models.CustomSounds.setName(soundData._id, soundData.name);
        RocketChat.Notifications.notifyAll('updateCustomSound', {
          soundData
        });
      }

      return soundData._id;
    }
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"listCustomSounds.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/methods/listCustomSounds.js                                             //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
Meteor.methods({
  listCustomSounds() {
    return RocketChat.models.CustomSounds.find({}).fetch();
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"uploadCustomSound.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/rocketchat_custom-sounds/server/methods/uploadCustomSound.js                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
/* globals RocketChatFileCustomSoundsInstance */
Meteor.methods({
  uploadCustomSound(binaryContent, contentType, soundData) {
    if (!RocketChat.authz.hasPermission(this.userId, 'manage-sounds')) {
      throw new Meteor.Error('not_authorized');
    }

    const file = new Buffer(binaryContent, 'binary');
    const rs = RocketChatFile.bufferToStream(file);
    RocketChatFileCustomSoundsInstance.deleteFile(`${soundData._id}.${soundData.extension}`);
    const ws = RocketChatFileCustomSoundsInstance.createWriteStream(`${soundData._id}.${soundData.extension}`, contentType);
    ws.on('end', Meteor.bindEnvironment(() => Meteor.setTimeout(() => RocketChat.Notifications.notifyAll('updateCustomSound', {
      soundData
    }), 500)));
    rs.pipe(ws);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:custom-sounds/server/startup/custom-sounds.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/startup/permissions.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/models/CustomSounds.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/publications/customSounds.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/methods/deleteCustomSound.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/methods/insertOrUpdateSound.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/methods/listCustomSounds.js");
require("/node_modules/meteor/rocketchat:custom-sounds/server/methods/uploadCustomSound.js");

/* Exports */
Package._define("rocketchat:custom-sounds");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_custom-sounds.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjdXN0b20tc291bmRzL3NlcnZlci9zdGFydHVwL2N1c3RvbS1zb3VuZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y3VzdG9tLXNvdW5kcy9zZXJ2ZXIvc3RhcnR1cC9wZXJtaXNzaW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjdXN0b20tc291bmRzL3NlcnZlci9zdGFydHVwL3NldHRpbmdzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmN1c3RvbS1zb3VuZHMvc2VydmVyL21vZGVscy9DdXN0b21Tb3VuZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y3VzdG9tLXNvdW5kcy9zZXJ2ZXIvcHVibGljYXRpb25zL2N1c3RvbVNvdW5kcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjdXN0b20tc291bmRzL3NlcnZlci9tZXRob2RzL2RlbGV0ZUN1c3RvbVNvdW5kLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmN1c3RvbS1zb3VuZHMvc2VydmVyL21ldGhvZHMvaW5zZXJ0T3JVcGRhdGVTb3VuZC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpjdXN0b20tc291bmRzL3NlcnZlci9tZXRob2RzL2xpc3RDdXN0b21Tb3VuZHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6Y3VzdG9tLXNvdW5kcy9zZXJ2ZXIvbWV0aG9kcy91cGxvYWRDdXN0b21Tb3VuZC5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJNZXRlb3IiLCJzdGFydHVwIiwic3RvcmVUeXBlIiwiUm9ja2V0Q2hhdCIsInNldHRpbmdzIiwiZ2V0IiwiUm9ja2V0Q2hhdFN0b3JlIiwiUm9ja2V0Q2hhdEZpbGUiLCJFcnJvciIsImNvbnNvbGUiLCJsb2ciLCJncmVlbiIsInBhdGgiLCJ0cmltIiwiUm9ja2V0Q2hhdEZpbGVDdXN0b21Tb3VuZHNJbnN0YW5jZSIsIm5hbWUiLCJhYnNvbHV0ZVBhdGgiLCJzZWxmIiwiV2ViQXBwIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwiYmluZEVudmlyb25tZW50IiwicmVxIiwicmVzIiwicGFyYW1zIiwic291bmQiLCJkZWNvZGVVUklDb21wb25lbnQiLCJ1cmwiLCJyZXBsYWNlIiwiaXNFbXB0eSIsIndyaXRlSGVhZCIsIndyaXRlIiwiZW5kIiwiZmlsZSIsImdldEZpbGVXaXRoUmVhZFN0cmVhbSIsInNldEhlYWRlciIsImZpbGVVcGxvYWREYXRlIiwidW5kZWZpbmVkIiwidXBsb2FkRGF0ZSIsInRvVVRDU3RyaW5nIiwicmVxTW9kaWZpZWRIZWFkZXIiLCJoZWFkZXJzIiwiRGF0ZSIsImxlbmd0aCIsInJlYWRTdHJlYW0iLCJwaXBlIiwibW9kZWxzIiwiUGVybWlzc2lvbnMiLCJjcmVhdGVPclVwZGF0ZSIsImFkZEdyb3VwIiwiYWRkIiwidHlwZSIsInZhbHVlcyIsImtleSIsImkxOG5MYWJlbCIsImVuYWJsZVF1ZXJ5IiwiX2lkIiwidmFsdWUiLCJDdXN0b21Tb3VuZHMiLCJfQmFzZSIsImNvbnN0cnVjdG9yIiwidHJ5RW5zdXJlSW5kZXgiLCJmaW5kT25lQnlJRCIsIm9wdGlvbnMiLCJmaW5kT25lIiwiZmluZEJ5TmFtZSIsInF1ZXJ5IiwiZmluZCIsImZpbmRCeU5hbWVFeGNlcHRJRCIsImV4Y2VwdCIsIiRuaW4iLCJzZXROYW1lIiwidXBkYXRlIiwiJHNldCIsImNyZWF0ZSIsImRhdGEiLCJpbnNlcnQiLCJyZW1vdmVCeUlEIiwicmVtb3ZlIiwicyIsInB1Ymxpc2giLCJmaWx0ZXIiLCJsaW1pdCIsInVzZXJJZCIsInJlYWR5IiwiZmllbGRzIiwiZXh0ZW5zaW9uIiwic29ydCIsImZpbHRlclJlZyIsIlJlZ0V4cCIsImVzY2FwZVJlZ0V4cCIsIm1ldGhvZHMiLCJkZWxldGVDdXN0b21Tb3VuZCIsImF1dGh6IiwiaGFzUGVybWlzc2lvbiIsIm1ldGhvZCIsImRlbGV0ZUZpbGUiLCJOb3RpZmljYXRpb25zIiwibm90aWZ5QWxsIiwic291bmREYXRhIiwiaW5zZXJ0T3JVcGRhdGVTb3VuZCIsImZpZWxkIiwibmFtZVZhbGlkYXRpb24iLCJ0ZXN0IiwiaW5wdXQiLCJtYXRjaGluZ1Jlc3VsdHMiLCJmZXRjaCIsImNyZWF0ZVNvdW5kIiwibmV3RmlsZSIsInByZXZpb3VzRXh0ZW5zaW9uIiwicHJldmlvdXNOYW1lIiwibGlzdEN1c3RvbVNvdW5kcyIsInVwbG9hZEN1c3RvbVNvdW5kIiwiYmluYXJ5Q29udGVudCIsImNvbnRlbnRUeXBlIiwiQnVmZmVyIiwicnMiLCJidWZmZXJUb1N0cmVhbSIsIndzIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJvbiIsInNldFRpbWVvdXQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFHTkMsT0FBT0MsT0FBUCxDQUFlLFlBQVc7QUFDekIsTUFBSUMsWUFBWSxRQUFoQjs7QUFFQSxNQUFJQyxXQUFXQyxRQUFYLENBQW9CQyxHQUFwQixDQUF3QiwyQkFBeEIsQ0FBSixFQUEwRDtBQUN6REgsZ0JBQVlDLFdBQVdDLFFBQVgsQ0FBb0JDLEdBQXBCLENBQXdCLDJCQUF4QixDQUFaO0FBQ0E7O0FBRUQsUUFBTUMsa0JBQWtCQyxlQUFlTCxTQUFmLENBQXhCOztBQUVBLE1BQUlJLG1CQUFtQixJQUF2QixFQUE2QjtBQUM1QixVQUFNLElBQUlFLEtBQUosQ0FBVyxpQ0FBaUNOLFNBQVcsR0FB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QUFqRyxFQUFvRzRCLFdBQXBHLENBQVg7QUFDQUksT0FBR0UsRUFBSCxDQUFNLEtBQU4sRUFBYXhILE9BQU9xQixlQUFQLENBQXVCLE1BQ25DckIsT0FBT3lILFVBQVAsQ0FBa0IsTUFBTXRILFdBQVc4RixhQUFYLENBQXlCQyxTQUF6QixDQUFtQyxtQkFBbkMsRUFBd0Q7QUFBRUM7QUFBRixLQUF4RCxDQUF4QixFQUFnRyxHQUFoRyxDQURZLENBQWI7QUFJQWlCLE9BQUd2RSxJQUFILENBQVF5RSxFQUFSO0FBQ0E7O0FBaEJhLENBQWYsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF9jdXN0b20tc291bmRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBSb2NrZXRDaGF0RmlsZUN1c3RvbVNvdW5kc0luc3RhbmNlICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdGxldCBzdG9yZVR5cGUgPSAnR3JpZEZTJztcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0N1c3RvbVNvdW5kc19TdG9yYWdlX1R5cGUnKSkge1xuXHRcdHN0b3JlVHlwZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDdXN0b21Tb3VuZHNfU3RvcmFnZV9UeXBlJyk7XG5cdH1cblxuXHRjb25zdCBSb2NrZXRDaGF0U3RvcmUgPSBSb2NrZXRDaGF0RmlsZVtzdG9yZVR5cGVdO1xuXG5cdGlmIChSb2NrZXRDaGF0U3RvcmUgPT0gbnVsbCkge1xuXHRcdHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBSb2NrZXRDaGF0U3RvcmUgdHlwZSBbJHsgc3RvcmVUeXBlIH1dYCk7XG5cdH1cblxuXHRjb25zb2xlLmxvZyhgVXNpbmcgJHsgc3RvcmVUeXBlIH0gZm9yIGN1c3RvbSBzb3VuZHMgc3RvcmFnZWAuZ3JlZW4pO1xuXG5cdGxldCBwYXRoID0gJ34vdXBsb2Fkcyc7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ3VzdG9tU291bmRzX0ZpbGVTeXN0ZW1QYXRoJykgIT0gbnVsbCkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQ3VzdG9tU291bmRzX0ZpbGVTeXN0ZW1QYXRoJykudHJpbSgpICE9PSAnJykge1xuXHRcdFx0cGF0aCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdDdXN0b21Tb3VuZHNfRmlsZVN5c3RlbVBhdGgnKTtcblx0XHR9XG5cdH1cblxuXHR0aGlzLlJvY2tldENoYXRGaWxlQ3VzdG9tU291bmRzSW5zdGFuY2UgPSBuZXcgUm9ja2V0Q2hhdFN0b3JlKHtcblx0XHRuYW1lOiAnY3VzdG9tX3NvdW5kcycsXG5cdFx0YWJzb2x1dGVQYXRoOiBwYXRoLFxuXHR9KTtcblxuXHRzZWxmID0gdGhpcztcblxuXHRyZXR1cm4gV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoJy9jdXN0b20tc291bmRzLycsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoZnVuY3Rpb24ocmVxLCByZXMvKiAsIG5leHQqLykge1xuXHRcdGNvbnN0IHBhcmFtcyA9XG5cdFx0XHR7IHNvdW5kOiBkZWNvZGVVUklDb21wb25lbnQocmVxLnVybC5yZXBsYWNlKC9eXFwvLywgJycpLnJlcGxhY2UoL1xcPy4qJC8sICcnKSkgfTtcblxuXHRcdGlmIChfLmlzRW1wdHkocGFyYW1zLnNvdW5kKSkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0cmVzLndyaXRlKCdGb3JiaWRkZW4nKTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdEZpbGVDdXN0b21Tb3VuZHNJbnN0YW5jZS5nZXRGaWxlV2l0aFJlYWRTdHJlYW0ocGFyYW1zLnNvdW5kKTtcblx0XHRpZiAoIWZpbGUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgJ2lubGluZScpO1xuXG5cdFx0bGV0IGZpbGVVcGxvYWREYXRlID0gdW5kZWZpbmVkO1xuXHRcdGlmIChmaWxlLnVwbG9hZERhdGUgIT0gbnVsbCkge1xuXHRcdFx0ZmlsZVVwbG9hZERhdGUgPSBmaWxlLnVwbG9hZERhdGUudG9VVENTdHJpbmcoKTtcblx0XHR9XG5cblx0XHRjb25zdCByZXFNb2RpZmllZEhlYWRlciA9IHJlcS5oZWFkZXJzWydpZi1tb2RpZmllZC1zaW5jZSddO1xuXHRcdGlmIChyZXFNb2RpZmllZEhlYWRlciAhPSBudWxsKSB7XG5cdFx0XHRpZiAocmVxTW9kaWZpZWRIZWFkZXIgPT09IGZpbGVVcGxvYWREYXRlKSB7XG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCByZXFNb2RpZmllZEhlYWRlcik7XG5cdFx0XHRcdHJlcy53cml0ZUhlYWQoMzA0KTtcblx0XHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICdwdWJsaWMsIG1heC1hZ2U9MCcpO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0V4cGlyZXMnLCAnLTEnKTtcblx0XHRpZiAoZmlsZVVwbG9hZERhdGUgIT0gbnVsbCkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIGZpbGVVcGxvYWREYXRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKSk7XG5cdFx0fVxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhdWRpby9tcGVnJyk7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBmaWxlLmxlbmd0aCk7XG5cblx0XHRmaWxlLnJlYWRTdHJlYW0ucGlwZShyZXMpO1xuXHR9KSk7XG59KTtcbiIsIk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0aWYgKFJvY2tldENoYXQubW9kZWxzICYmIFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zKSB7XG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuY3JlYXRlT3JVcGRhdGUoJ21hbmFnZS1zb3VuZHMnLCBbJ2FkbWluJ10pO1xuXHR9XG59KTtcbiIsIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ0N1c3RvbVNvdW5kc0ZpbGVzeXN0ZW0nLCBmdW5jdGlvbigpIHtcblx0dGhpcy5hZGQoJ0N1c3RvbVNvdW5kc19TdG9yYWdlX1R5cGUnLCAnR3JpZEZTJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogW3tcblx0XHRcdGtleTogJ0dyaWRGUycsXG5cdFx0XHRpMThuTGFiZWw6ICdHcmlkRlMnLFxuXHRcdH0sIHtcblx0XHRcdGtleTogJ0ZpbGVTeXN0ZW0nLFxuXHRcdFx0aTE4bkxhYmVsOiAnRmlsZVN5c3RlbScsXG5cdFx0fV0sXG5cdFx0aTE4bkxhYmVsOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHR9KTtcblxuXHR0aGlzLmFkZCgnQ3VzdG9tU291bmRzX0ZpbGVTeXN0ZW1QYXRoJywgJycsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0X2lkOiAnQ3VzdG9tU291bmRzX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHR2YWx1ZTogJ0ZpbGVTeXN0ZW0nLFxuXHRcdH0sXG5cdFx0aTE4bkxhYmVsOiAnRmlsZVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcsXG5cdH0pO1xufSk7XG4iLCJjbGFzcyBDdXN0b21Tb3VuZHMgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdjdXN0b21fc291bmRzJyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgbmFtZTogMSB9KTtcblx0fVxuXG5cdC8vIGZpbmQgb25lXG5cdGZpbmRPbmVCeUlEKF9pZCwgb3B0aW9ucykge1xuXHRcdHJldHVybiB0aGlzLmZpbmRPbmUoX2lkLCBvcHRpb25zKTtcblx0fVxuXG5cdC8vIGZpbmRcblx0ZmluZEJ5TmFtZShuYW1lLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRuYW1lLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdGZpbmRCeU5hbWVFeGNlcHRJRChuYW1lLCBleGNlcHQsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdF9pZDogeyAkbmluOiBbZXhjZXB0XSB9LFxuXHRcdFx0bmFtZSxcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuZmluZChxdWVyeSwgb3B0aW9ucyk7XG5cdH1cblxuXHQvLyB1cGRhdGVcblx0c2V0TmFtZShfaWQsIG5hbWUpIHtcblx0XHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0XHQkc2V0OiB7XG5cdFx0XHRcdG5hbWUsXG5cdFx0XHR9LFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy51cGRhdGUoeyBfaWQgfSwgdXBkYXRlKTtcblx0fVxuXG5cdC8vIElOU0VSVFxuXHRjcmVhdGUoZGF0YSkge1xuXHRcdHJldHVybiB0aGlzLmluc2VydChkYXRhKTtcblx0fVxuXG5cblx0Ly8gUkVNT1ZFXG5cdHJlbW92ZUJ5SUQoX2lkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKF9pZCk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuQ3VzdG9tU291bmRzID0gbmV3IEN1c3RvbVNvdW5kcygpO1xuIiwiaW1wb3J0IHMgZnJvbSAndW5kZXJzY29yZS5zdHJpbmcnO1xuXG5NZXRlb3IucHVibGlzaCgnY3VzdG9tU291bmRzJywgZnVuY3Rpb24oZmlsdGVyLCBsaW1pdCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVhZHkoKTtcblx0fVxuXG5cdGNvbnN0IGZpZWxkcyA9IHtcblx0XHRuYW1lOiAxLFxuXHRcdGV4dGVuc2lvbjogMSxcblx0fTtcblxuXHRmaWx0ZXIgPSBzLnRyaW0oZmlsdGVyKTtcblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGZpZWxkcyxcblx0XHRsaW1pdCxcblx0XHRzb3J0OiB7IG5hbWU6IDEgfSxcblx0fTtcblxuXHRpZiAoZmlsdGVyKSB7XG5cdFx0Y29uc3QgZmlsdGVyUmVnID0gbmV3IFJlZ0V4cChzLmVzY2FwZVJlZ0V4cChmaWx0ZXIpLCAnaScpO1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5DdXN0b21Tb3VuZHMuZmluZEJ5TmFtZShmaWx0ZXJSZWcsIG9wdGlvbnMpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkN1c3RvbVNvdW5kcy5maW5kKHt9LCBvcHRpb25zKTtcbn0pO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0RmlsZUN1c3RvbVNvdW5kc0luc3RhbmNlICovXG5NZXRlb3IubWV0aG9kcyh7XG5cdGRlbGV0ZUN1c3RvbVNvdW5kKF9pZCkge1xuXHRcdGxldCBzb3VuZCA9IG51bGw7XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKHRoaXMudXNlcklkLCAnbWFuYWdlLXNvdW5kcycpKSB7XG5cdFx0XHRzb3VuZCA9IFJvY2tldENoYXQubW9kZWxzLkN1c3RvbVNvdW5kcy5maW5kT25lQnlJRChfaWQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdub3RfYXV0aG9yaXplZCcpO1xuXHRcdH1cblxuXHRcdGlmIChzb3VuZCA9PSBudWxsKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdDdXN0b21fU291bmRfRXJyb3JfSW52YWxpZF9Tb3VuZCcsICdJbnZhbGlkIHNvdW5kJywgeyBtZXRob2Q6ICdkZWxldGVDdXN0b21Tb3VuZCcgfSk7XG5cdFx0fVxuXG5cdFx0Um9ja2V0Q2hhdEZpbGVDdXN0b21Tb3VuZHNJbnN0YW5jZS5kZWxldGVGaWxlKGAkeyBzb3VuZC5faWQgfS4keyBzb3VuZC5leHRlbnNpb24gfWApO1xuXHRcdFJvY2tldENoYXQubW9kZWxzLkN1c3RvbVNvdW5kcy5yZW1vdmVCeUlEKF9pZCk7XG5cdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUFsbCgnZGVsZXRlQ3VzdG9tU291bmQnLCB7IHNvdW5kRGF0YTogc291bmQgfSk7XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0RmlsZUN1c3RvbVNvdW5kc0luc3RhbmNlICovXG5pbXBvcnQgcyBmcm9tICd1bmRlcnNjb3JlLnN0cmluZyc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0aW5zZXJ0T3JVcGRhdGVTb3VuZChzb3VuZERhdGEpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1zb3VuZHMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHRpZiAoIXMudHJpbShzb3VuZERhdGEubmFtZSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLXRoZS1maWVsZC1pcy1yZXF1aXJlZCcsICdUaGUgZmllbGQgTmFtZSBpcyByZXF1aXJlZCcsIHsgbWV0aG9kOiAnaW5zZXJ0T3JVcGRhdGVTb3VuZCcsIGZpZWxkOiAnTmFtZScgfSk7XG5cdFx0fVxuXG5cdFx0Ly8gbGV0IG5hbWVWYWxpZGF0aW9uID0gbmV3IFJlZ0V4cCgnXlswLTlhLXpBLVotXys7Ll0rJCcpO1xuXG5cdFx0Ly8gYWxsb3cgYWxsIGNoYXJhY3RlcnMgZXhjZXB0IGNvbG9uLCB3aGl0ZXNwYWNlLCBjb21tYSwgPiwgPCwgJiwgXCIsICcsIC8sIFxcLCAoLCApXG5cdFx0Ly8gbW9yZSBwcmFjdGljYWwgdGhhbiBhbGxvd2luZyBzcGVjaWZpYyBzZXRzIG9mIGNoYXJhY3RlcnM7IGFsc28gYWxsb3dzIGZvcmVpZ24gbGFuZ3VhZ2VzXG5cdFx0Y29uc3QgbmFtZVZhbGlkYXRpb24gPSAvW1xccyw6PjwmXCInXFwvXFxcXFxcKFxcKV0vO1xuXG5cdFx0Ly8gc2lsZW50bHkgc3RyaXAgY29sb247IHRoaXMgYWxsb3dzIGZvciB1cGxvYWRpbmcgOnNvdW5kbmFtZTogYXMgc291bmRuYW1lXG5cdFx0c291bmREYXRhLm5hbWUgPSBzb3VuZERhdGEubmFtZS5yZXBsYWNlKC86L2csICcnKTtcblxuXHRcdGlmIChuYW1lVmFsaWRhdGlvbi50ZXN0KHNvdW5kRGF0YS5uYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW5wdXQtaXMtbm90LWEtdmFsaWQtZmllbGQnLCBgJHsgc291bmREYXRhLm5hbWUgfSBpcyBub3QgYSB2YWxpZCBuYW1lYCwgeyBtZXRob2Q6ICdpbnNlcnRPclVwZGF0ZVNvdW5kJywgaW5wdXQ6IHNvdW5kRGF0YS5uYW1lLCBmaWVsZDogJ05hbWUnIH0pO1xuXHRcdH1cblxuXHRcdGxldCBtYXRjaGluZ1Jlc3VsdHMgPSBbXTtcblxuXHRcdGlmIChzb3VuZERhdGEuX2lkKSB7XG5cdFx0XHRtYXRjaGluZ1Jlc3VsdHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5DdXN0b21Tb3VuZHMuZmluZEJ5TmFtZUV4Y2VwdElEKHNvdW5kRGF0YS5uYW1lLCBzb3VuZERhdGEuX2lkKS5mZXRjaCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtYXRjaGluZ1Jlc3VsdHMgPSBSb2NrZXRDaGF0Lm1vZGVscy5DdXN0b21Tb3VuZHMuZmluZEJ5TmFtZShzb3VuZERhdGEubmFtZSkuZmV0Y2goKTtcblx0XHR9XG5cblx0XHRpZiAobWF0Y2hpbmdSZXN1bHRzLmxlbmd0aCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0N1c3RvbV9Tb3VuZF9FcnJvcl9OYW1lX0FscmVhZHlfSW5fVXNlJywgJ1RoZSBjdXN0b20gc291bmQgbmFtZSBpcyBhbHJlYWR5IGluIHVzZScsIHsgbWV0aG9kOiAnaW5zZXJ0T3JVcGRhdGVTb3VuZCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFzb3VuZERhdGEuX2lkKSB7XG5cdFx0XHQvLyBpbnNlcnQgc291bmRcblx0XHRcdGNvbnN0IGNyZWF0ZVNvdW5kID0ge1xuXHRcdFx0XHRuYW1lOiBzb3VuZERhdGEubmFtZSxcblx0XHRcdFx0ZXh0ZW5zaW9uOiBzb3VuZERhdGEuZXh0ZW5zaW9uLFxuXHRcdFx0fTtcblxuXHRcdFx0Y29uc3QgX2lkID0gUm9ja2V0Q2hhdC5tb2RlbHMuQ3VzdG9tU291bmRzLmNyZWF0ZShjcmVhdGVTb3VuZCk7XG5cdFx0XHRjcmVhdGVTb3VuZC5faWQgPSBfaWQ7XG5cblx0XHRcdHJldHVybiBfaWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIHVwZGF0ZSBzb3VuZFxuXHRcdFx0aWYgKHNvdW5kRGF0YS5uZXdGaWxlKSB7XG5cdFx0XHRcdFJvY2tldENoYXRGaWxlQ3VzdG9tU291bmRzSW5zdGFuY2UuZGVsZXRlRmlsZShgJHsgc291bmREYXRhLl9pZCB9LiR7IHNvdW5kRGF0YS5wcmV2aW91c0V4dGVuc2lvbiB9YCk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChzb3VuZERhdGEubmFtZSAhPT0gc291bmREYXRhLnByZXZpb3VzTmFtZSkge1xuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5DdXN0b21Tb3VuZHMuc2V0TmFtZShzb3VuZERhdGEuX2lkLCBzb3VuZERhdGEubmFtZSk7XG5cdFx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlBbGwoJ3VwZGF0ZUN1c3RvbVNvdW5kJywgeyBzb3VuZERhdGEgfSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBzb3VuZERhdGEuX2lkO1xuXHRcdH1cblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRsaXN0Q3VzdG9tU291bmRzKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5DdXN0b21Tb3VuZHMuZmluZCh7fSkuZmV0Y2goKTtcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBSb2NrZXRDaGF0RmlsZUN1c3RvbVNvdW5kc0luc3RhbmNlICovXG5NZXRlb3IubWV0aG9kcyh7XG5cdHVwbG9hZEN1c3RvbVNvdW5kKGJpbmFyeUNvbnRlbnQsIGNvbnRlbnRUeXBlLCBzb3VuZERhdGEpIHtcblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih0aGlzLnVzZXJJZCwgJ21hbmFnZS1zb3VuZHMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbm90X2F1dGhvcml6ZWQnKTtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gbmV3IEJ1ZmZlcihiaW5hcnlDb250ZW50LCAnYmluYXJ5Jyk7XG5cblx0XHRjb25zdCBycyA9IFJvY2tldENoYXRGaWxlLmJ1ZmZlclRvU3RyZWFtKGZpbGUpO1xuXHRcdFJvY2tldENoYXRGaWxlQ3VzdG9tU291bmRzSW5zdGFuY2UuZGVsZXRlRmlsZShgJHsgc291bmREYXRhLl9pZCB9LiR7IHNvdW5kRGF0YS5leHRlbnNpb24gfWApO1xuXHRcdGNvbnN0IHdzID0gUm9ja2V0Q2hhdEZpbGVDdXN0b21Tb3VuZHNJbnN0YW5jZS5jcmVhdGVXcml0ZVN0cmVhbShgJHsgc291bmREYXRhLl9pZCB9LiR7IHNvdW5kRGF0YS5leHRlbnNpb24gfWAsIGNvbnRlbnRUeXBlKTtcblx0XHR3cy5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoKSA9PlxuXHRcdFx0TWV0ZW9yLnNldFRpbWVvdXQoKCkgPT4gUm9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUFsbCgndXBkYXRlQ3VzdG9tU291bmQnLCB7IHNvdW5kRGF0YSB9KSwgNTAwKVxuXHRcdCkpO1xuXG5cdFx0cnMucGlwZSh3cyk7XG5cdH0sXG59KTtcbiJdfQ==
