(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:webdav":{"server":{"methods":{"addWebdavAccount.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/methods/addWebdavAccount.js                           //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
let Webdav;
module.watch(require("webdav"), {
  default(v) {
    Webdav = v;
  }

}, 0);
Meteor.methods({
  addWebdavAccount(formData) {
    return Promise.asyncApply(() => {
      const userId = Meteor.userId();

      if (!userId) {
        throw new Meteor.Error('error-invalid-user', 'Invalid User', {
          method: 'addWebdavAccount'
        });
      }

      if (!RocketChat.settings.get('Webdav_Integration_Enabled')) {
        throw new Meteor.Error('error-not-allowed', 'WebDAV Integration Not Allowed', {
          method: 'addWebdavAccount'
        });
      }

      check(formData, Match.ObjectIncluding({
        serverURL: String,
        username: String,
        pass: String
      }));
      const client = new Webdav(formData.serverURL, formData.username, formData.pass);

      try {
        Promise.await(client.stat('/'));
      } catch (error) {
        return {
          success: false,
          message: 'could-not-access-webdav',
          error
        };
      }

      const accountData = {
        user_id: userId,
        server_url: formData.serverURL,
        username: formData.username,
        password: formData.pass,
        name: formData.name
      };

      try {
        RocketChat.models.WebdavAccounts.insert(accountData);
        return {
          success: true,
          message: 'webdav-account-saved'
        };
      } catch (error) {
        return {
          success: false,
          message: error.code === 11000 ? 'duplicated-account' : 'unknown-write-error',
          error
        };
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////

},"removeWebdavAccount.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/methods/removeWebdavAccount.js                        //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
Meteor.methods({
  removeWebdavAccount(accountId) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid User', {
        method: 'removeWebdavAccount'
      });
    } // if (!RocketChat.settings.get('Webdav_Integration_Enabled')) {
    // 	throw new Meteor.Error('error-not-allowed', 'WebDAV Integration Not Allowed', {method: 'removeWebdavAccount'});
    // }


    check(accountId, String);
    return RocketChat.models.WebdavAccounts.removeByUserAndId(accountId, Meteor.userId());
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////

},"getWebdavFileList.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/methods/getWebdavFileList.js                          //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
let Webdav;
module.watch(require("webdav"), {
  default(v) {
    Webdav = v;
  }

}, 0);
Meteor.methods({
  getWebdavFileList(accountId, path) {
    return Promise.asyncApply(() => {
      if (!Meteor.userId()) {
        throw new Meteor.Error('error-invalid-user', 'Invalid User', {
          method: 'addNewWebdavAccount'
        });
      }

      if (!RocketChat.settings.get('Webdav_Integration_Enabled')) {
        throw new Meteor.Error('error-not-allowed', 'WebDAV Integration Not Allowed', {
          method: 'addNewWebdavAccount'
        });
      }

      const account = RocketChat.models.WebdavAccounts.findOne({
        _id: accountId,
        user_id: Meteor.userId()
      });

      if (!account) {
        throw new Meteor.Error('error-invalid-account', 'Invalid WebDAV Account', {
          method: 'addNewWebdavAccount'
        });
      }

      const client = new Webdav(account.server_url, account.username, account.password);

      try {
        const data = Promise.await(client.getDirectoryContents(path));
        return {
          success: true,
          data
        };
      } catch (error) {
        return {
          success: false,
          message: 'could-not-access-webdav',
          error
        };
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////

},"getFileFromWebdav.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/methods/getFileFromWebdav.js                          //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
let Webdav;
module.watch(require("webdav"), {
  default(v) {
    Webdav = v;
  }

}, 0);
Meteor.methods({
  getFileFromWebdav(accountId, file) {
    return Promise.asyncApply(() => {
      if (!Meteor.userId()) {
        throw new Meteor.Error('error-invalid-user', 'Invalid User', {
          method: 'addNewWebdavAccount'
        });
      }

      if (!RocketChat.settings.get('Webdav_Integration_Enabled')) {
        throw new Meteor.Error('error-not-allowed', 'WebDAV Integration Not Allowed', {
          method: 'addNewWebdavAccount'
        });
      }

      const account = RocketChat.models.WebdavAccounts.findOne({
        _id: accountId,
        user_id: Meteor.userId()
      });

      if (!account) {
        throw new Meteor.Error('error-invalid-account', 'Invalid WebDAV Account', {
          method: 'addNewWebdavAccount'
        });
      }

      const client = new Webdav(account.server_url, account.username, account.password);

      try {
        const fileContent = Promise.await(client.getFileContents(file.filename));
        const data = new Uint8Array(fileContent);
        return {
          success: true,
          data
        };
      } catch (error) {
        return {
          success: false,
          data: error
        };
      }
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////

},"uploadFileToWebdav.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/methods/uploadFileToWebdav.js                         //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 0);
let Webdav;
module.watch(require("webdav"), {
  default(v) {
    Webdav = v;
  }

}, 1);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 2);
Meteor.methods({
  uploadFileToWebdav(accountId, fileData, name) {
    return Promise.asyncApply(() => {
      const uploadFolder = 'Rocket.Chat Uploads/';

      if (!Meteor.userId()) {
        throw new Meteor.Error('error-invalid-user', 'Invalid User', {
          method: 'uploadFileToWebdav'
        });
      }

      if (!RocketChat.settings.get('Webdav_Integration_Enabled')) {
        throw new Meteor.Error('error-not-allowed', 'WebDAV Integration Not Allowed', {
          method: 'uploadFileToWebdav'
        });
      }

      const account = RocketChat.models.WebdavAccounts.findOne({
        _id: accountId
      });

      if (!account) {
        throw new Meteor.Error('error-invalid-account', 'Invalid WebDAV Account', {
          method: 'uploadFileToWebdav'
        });
      }

      const client = new Webdav(account.server_url, account.username, account.password);
      const future = new Future(); // create buffer stream from file data

      let bufferStream = new stream.PassThrough();

      if (fileData) {
        bufferStream.end(fileData);
      } else {
        bufferStream = null;
      } // create a write stream on remote webdav server


      const writeStream = client.createWriteStream(`${uploadFolder}/${name}`);
      writeStream.on('end', function () {
        future.return({
          success: true
        });
      });
      writeStream.on('error', function () {
        future.return({
          success: false,
          message: 'FileUpload_Error'
        });
      });
      Promise.await(client.stat(uploadFolder).then(function () {
        bufferStream.pipe(writeStream);
      }).catch(function (err) {
        if (err.status === 404) {
          client.createDirectory(uploadFolder).then(function () {
            bufferStream.pipe(writeStream);
          }).catch(function () {
            if (err.status === 404) {
              future.return({
                success: false,
                message: 'webdav-server-not-found'
              });
            } else {
              future.return({
                success: false,
                message: 'FileUpload_Error'
              });
            }
          });
        } else if (err.status === 401) {
          future.return({
            success: false,
            message: 'error-invalid-account'
          });
        } else {
          future.return({
            success: false,
            message: 'FileUpload_Error'
          });
        }
      }));
      return future.wait();
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////

}},"models":{"WebdavAccounts.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/models/WebdavAccounts.js                              //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
/**
 * Webdav Accounts model
 */
class WebdavAccounts extends RocketChat.models._Base {
  constructor() {
    super('webdav_accounts');
    this.tryEnsureIndex({
      user_id: 1,
      server_url: 1,
      username: 1,
      name: 1
    }, {
      unique: 1
    });
  }

  findWithUserId(user_id, options) {
    const query = {
      user_id
    };
    return this.find(query, options);
  }

  removeByUserAndId(_id, user_id) {
    return this.remove({
      _id,
      user_id
    });
  }

  removeById(_id) {
    return this.remove({
      _id
    });
  }

}

RocketChat.models.WebdavAccounts = new WebdavAccounts();
/////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"webdavAccounts.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/server/publications/webdavAccounts.js                        //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
Meteor.publish('webdavAccounts', function () {
  if (!this.userId) {
    return this.error(new Meteor.Error('error-not-authorized', 'Not authorized', {
      publish: 'webdavAccounts'
    }));
  }

  return RocketChat.models.WebdavAccounts.findWithUserId(this.userId, {
    fields: {
      _id: 1,
      username: 1,
      server_url: 1,
      name: 1
    }
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////

}}},"startup":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                         //
// packages/rocketchat_webdav/startup/settings.js                                          //
//                                                                                         //
/////////////////////////////////////////////////////////////////////////////////////////////
                                                                                           //
RocketChat.settings.addGroup('Webdav Integration', function () {
  this.add('Webdav_Integration_Enabled', false, {
    type: 'boolean',
    public: true
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:webdav/server/methods/addWebdavAccount.js");
require("/node_modules/meteor/rocketchat:webdav/server/methods/removeWebdavAccount.js");
require("/node_modules/meteor/rocketchat:webdav/server/methods/getWebdavFileList.js");
require("/node_modules/meteor/rocketchat:webdav/server/methods/getFileFromWebdav.js");
require("/node_modules/meteor/rocketchat:webdav/server/methods/uploadFileToWebdav.js");
require("/node_modules/meteor/rocketchat:webdav/server/models/WebdavAccounts.js");
require("/node_modules/meteor/rocketchat:webdav/server/publications/webdavAccounts.js");
require("/node_modules/meteor/rocketchat:webdav/startup/settings.js");

/* Exports */
Package._define("rocketchat:webdav");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_webdav.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp3ZWJkYXYvc2VydmVyL21ldGhvZHMvYWRkV2ViZGF2QWNjb3VudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp3ZWJkYXYvc2VydmVyL21ldGhvZHMvcmVtb3ZlV2ViZGF2QWNjb3VudC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp3ZWJkYXYvc2VydmVyL21ldGhvZHMvZ2V0V2ViZGF2RmlsZUxpc3QuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6d2ViZGF2L3NlcnZlci9tZXRob2RzL2dldEZpbGVGcm9tV2ViZGF2LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OndlYmRhdi9zZXJ2ZXIvbWV0aG9kcy91cGxvYWRGaWxlVG9XZWJkYXYuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6d2ViZGF2L3NlcnZlci9tb2RlbHMvV2ViZGF2QWNjb3VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6d2ViZGF2L3NlcnZlci9wdWJsaWNhdGlvbnMvd2ViZGF2QWNjb3VudHMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6d2ViZGF2L3N0YXJ0dXAvc2V0dGluZ3MuanMiXSwibmFtZXMiOlsiV2ViZGF2IiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJNZXRlb3IiLCJtZXRob2RzIiwiYWRkV2ViZGF2QWNjb3VudCIsImZvcm1EYXRhIiwidXNlcklkIiwiRXJyb3IiLCJtZXRob2QiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJnZXQiLCJjaGVjayIsIk1hdGNoIiwiT2JqZWN0SW5jbHVkaW5nIiwic2VydmVyVVJMIiwiU3RyaW5nIiwidXNlcm5hbWUiLCJwYXNzIiwiY2xpZW50Iiwic3RhdCIsImVycm9yIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJhY2NvdW50RGF0YSIsInVzZXJfaWQiLCJzZXJ2ZXJfdXJsIiwicGFzc3dvcmQiLCJuYW1lIiwibW9kZWxzIiwiV2ViZGF2QWNjb3VudHMiLCJpbnNlcnQiLCJjb2RlIiwicmVtb3ZlV2ViZGF2QWNjb3VudCIsImFjY291bnRJZCIsInJlbW92ZUJ5VXNlckFuZElkIiwiZ2V0V2ViZGF2RmlsZUxpc3QiLCJwYXRoIiwiYWNjb3VudCIsImZpbmRPbmUiLCJfaWQiLCJkYXRhIiwiZ2V0RGlyZWN0b3J5Q29udGVudHMiLCJnZXRGaWxlRnJvbVdlYmRhdiIsImZpbGUiLCJmaWxlQ29udGVudCIsImdldEZpbGVDb250ZW50cyIsImZpbGVuYW1lIiwiVWludDhBcnJheSIsIkZ1dHVyZSIsInN0cmVhbSIsInVwbG9hZEZpbGVUb1dlYmRhdiIsImZpbGVEYXRhIiwidXBsb2FkRm9sZGVyIiwiZnV0dXJlIiwiYnVmZmVyU3RyZWFtIiwiUGFzc1Rocm91Z2giLCJlbmQiLCJ3cml0ZVN0cmVhbSIsImNyZWF0ZVdyaXRlU3RyZWFtIiwib24iLCJyZXR1cm4iLCJ0aGVuIiwicGlwZSIsImNhdGNoIiwiZXJyIiwic3RhdHVzIiwiY3JlYXRlRGlyZWN0b3J5Iiwid2FpdCIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJ0cnlFbnN1cmVJbmRleCIsInVuaXF1ZSIsImZpbmRXaXRoVXNlcklkIiwib3B0aW9ucyIsInF1ZXJ5IiwiZmluZCIsInJlbW92ZSIsInJlbW92ZUJ5SWQiLCJwdWJsaXNoIiwiZmllbGRzIiwiYWRkR3JvdXAiLCJhZGQiLCJ0eXBlIiwicHVibGljIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxNQUFKO0FBQVdDLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRUFBK0I7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLGFBQU9LLENBQVA7QUFBUzs7QUFBckIsQ0FBL0Is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QXZDLEVBQThDO0FBQzdDQyxVQUFNLFNBRHVDO0FBRTdDQyxZQUFRO0FBRnFDLEdBQTlDO0FBSUEsQ0FMRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X3dlYmRhdi5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBXZWJkYXYgZnJvbSAnd2ViZGF2JztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhc3luYyBhZGRXZWJkYXZBY2NvdW50KGZvcm1EYXRhKSB7XG5cblx0XHRjb25zdCB1c2VySWQgPSBNZXRlb3IudXNlcklkKCk7XG5cblx0XHRpZiAoIXVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgVXNlcicsIHsgbWV0aG9kOiAnYWRkV2ViZGF2QWNjb3VudCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnV2ViZGF2X0ludGVncmF0aW9uX0VuYWJsZWQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnV2ViREFWIEludGVncmF0aW9uIE5vdCBBbGxvd2VkJywgeyBtZXRob2Q6ICdhZGRXZWJkYXZBY2NvdW50JyB9KTtcblx0XHR9XG5cblx0XHRjaGVjayhmb3JtRGF0YSwgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtcblx0XHRcdHNlcnZlclVSTDogU3RyaW5nLFxuXHRcdFx0dXNlcm5hbWU6IFN0cmluZyxcblx0XHRcdHBhc3M6IFN0cmluZyxcblx0XHR9KSk7XG5cblx0XHRjb25zdCBjbGllbnQgPSBuZXcgV2ViZGF2KFxuXHRcdFx0Zm9ybURhdGEuc2VydmVyVVJMLFxuXHRcdFx0Zm9ybURhdGEudXNlcm5hbWUsXG5cdFx0XHRmb3JtRGF0YS5wYXNzXG5cdFx0KTtcblxuXHRcdHRyeSB7XG5cdFx0XHRhd2FpdCBjbGllbnQuc3RhdCgnLycpO1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogJ2NvdWxkLW5vdC1hY2Nlc3Mtd2ViZGF2JywgZXJyb3IgfTtcblx0XHR9XG5cblx0XHRjb25zdCBhY2NvdW50RGF0YSA9IHtcblx0XHRcdHVzZXJfaWQ6IHVzZXJJZCxcblx0XHRcdHNlcnZlcl91cmw6IGZvcm1EYXRhLnNlcnZlclVSTCxcblx0XHRcdHVzZXJuYW1lOiBmb3JtRGF0YS51c2VybmFtZSxcblx0XHRcdHBhc3N3b3JkOiBmb3JtRGF0YS5wYXNzLFxuXHRcdFx0bmFtZTogZm9ybURhdGEubmFtZSxcblx0XHR9O1xuXHRcdHRyeSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5XZWJkYXZBY2NvdW50cy5pbnNlcnQoYWNjb3VudERhdGEpO1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ3dlYmRhdi1hY2NvdW50LXNhdmVkJyB9O1xuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRyZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogZXJyb3IuY29kZSA9PT0gMTEwMDAgPyAnZHVwbGljYXRlZC1hY2NvdW50JyA6ICd1bmtub3duLXdyaXRlLWVycm9yJywgZXJyb3IgfTtcblx0XHR9XG5cblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHRyZW1vdmVXZWJkYXZBY2NvdW50KGFjY291bnRJZCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCBVc2VyJywgeyBtZXRob2Q6ICdyZW1vdmVXZWJkYXZBY2NvdW50JyB9KTtcblx0XHR9XG5cdFx0Ly8gaWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnV2ViZGF2X0ludGVncmF0aW9uX0VuYWJsZWQnKSkge1xuXHRcdC8vIFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnV2ViREFWIEludGVncmF0aW9uIE5vdCBBbGxvd2VkJywge21ldGhvZDogJ3JlbW92ZVdlYmRhdkFjY291bnQnfSk7XG5cdFx0Ly8gfVxuXHRcdGNoZWNrKGFjY291bnRJZCwgU3RyaW5nKTtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5XZWJkYXZBY2NvdW50cy5yZW1vdmVCeVVzZXJBbmRJZChhY2NvdW50SWQsIE1ldGVvci51c2VySWQoKSk7XG5cdH0sXG59KTtcbiIsImltcG9ydCBXZWJkYXYgZnJvbSAnd2ViZGF2JztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRhc3luYyBnZXRXZWJkYXZGaWxlTGlzdChhY2NvdW50SWQsIHBhdGgpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgVXNlcicsIHsgbWV0aG9kOiAnYWRkTmV3V2ViZGF2QWNjb3VudCcgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnV2ViZGF2X0ludGVncmF0aW9uX0VuYWJsZWQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnV2ViREFWIEludGVncmF0aW9uIE5vdCBBbGxvd2VkJywgeyBtZXRob2Q6ICdhZGROZXdXZWJkYXZBY2NvdW50JyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBhY2NvdW50ID0gUm9ja2V0Q2hhdC5tb2RlbHMuV2ViZGF2QWNjb3VudHMuZmluZE9uZSh7IF9pZDogYWNjb3VudElkLCB1c2VyX2lkOiBNZXRlb3IudXNlcklkKCkgfSk7XG5cdFx0aWYgKCFhY2NvdW50KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFjY291bnQnLCAnSW52YWxpZCBXZWJEQVYgQWNjb3VudCcsIHsgbWV0aG9kOiAnYWRkTmV3V2ViZGF2QWNjb3VudCcgfSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgY2xpZW50ID0gbmV3IFdlYmRhdihcblx0XHRcdGFjY291bnQuc2VydmVyX3VybCxcblx0XHRcdGFjY291bnQudXNlcm5hbWUsXG5cdFx0XHRhY2NvdW50LnBhc3N3b3JkXG5cdFx0KTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IGNsaWVudC5nZXREaXJlY3RvcnlDb250ZW50cyhwYXRoKTtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdjb3VsZC1ub3QtYWNjZXNzLXdlYmRhdicsIGVycm9yIH07XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgV2ViZGF2IGZyb20gJ3dlYmRhdic7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0YXN5bmMgZ2V0RmlsZUZyb21XZWJkYXYoYWNjb3VudElkLCBmaWxlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIFVzZXInLCB7IG1ldGhvZDogJ2FkZE5ld1dlYmRhdkFjY291bnQnIH0pO1xuXHRcdH1cblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdXZWJkYXZfSW50ZWdyYXRpb25fRW5hYmxlZCcpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYWxsb3dlZCcsICdXZWJEQVYgSW50ZWdyYXRpb24gTm90IEFsbG93ZWQnLCB7IG1ldGhvZDogJ2FkZE5ld1dlYmRhdkFjY291bnQnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGFjY291bnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5XZWJkYXZBY2NvdW50cy5maW5kT25lKHsgX2lkOiBhY2NvdW50SWQsIHVzZXJfaWQ6IE1ldGVvci51c2VySWQoKSB9KTtcblx0XHRpZiAoIWFjY291bnQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtYWNjb3VudCcsICdJbnZhbGlkIFdlYkRBViBBY2NvdW50JywgeyBtZXRob2Q6ICdhZGROZXdXZWJkYXZBY2NvdW50JyB9KTtcblx0XHR9XG5cdFx0Y29uc3QgY2xpZW50ID0gbmV3IFdlYmRhdihcblx0XHRcdGFjY291bnQuc2VydmVyX3VybCxcblx0XHRcdGFjY291bnQudXNlcm5hbWUsXG5cdFx0XHRhY2NvdW50LnBhc3N3b3JkXG5cdFx0KTtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCBjbGllbnQuZ2V0RmlsZUNvbnRlbnRzKGZpbGUuZmlsZW5hbWUpO1xuXHRcdFx0Y29uc3QgZGF0YSA9IG5ldyBVaW50OEFycmF5KGZpbGVDb250ZW50KTtcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGRhdGE6IGVycm9yIH07XG5cdFx0fVxuXHR9LFxufSk7XG4iLCJpbXBvcnQgRnV0dXJlIGZyb20gJ2ZpYmVycy9mdXR1cmUnO1xuaW1wb3J0IFdlYmRhdiBmcm9tICd3ZWJkYXYnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGFzeW5jIHVwbG9hZEZpbGVUb1dlYmRhdihhY2NvdW50SWQsIGZpbGVEYXRhLCBuYW1lKSB7XG5cdFx0Y29uc3QgdXBsb2FkRm9sZGVyID0gJ1JvY2tldC5DaGF0IFVwbG9hZHMvJztcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgVXNlcicsIHsgbWV0aG9kOiAndXBsb2FkRmlsZVRvV2ViZGF2JyB9KTtcblx0XHR9XG5cdFx0aWYgKCFSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnV2ViZGF2X0ludGVncmF0aW9uX0VuYWJsZWQnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWFsbG93ZWQnLCAnV2ViREFWIEludGVncmF0aW9uIE5vdCBBbGxvd2VkJywgeyBtZXRob2Q6ICd1cGxvYWRGaWxlVG9XZWJkYXYnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGFjY291bnQgPSBSb2NrZXRDaGF0Lm1vZGVscy5XZWJkYXZBY2NvdW50cy5maW5kT25lKHsgX2lkOiBhY2NvdW50SWQgfSk7XG5cdFx0aWYgKCFhY2NvdW50KSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFjY291bnQnLCAnSW52YWxpZCBXZWJEQVYgQWNjb3VudCcsIHsgbWV0aG9kOiAndXBsb2FkRmlsZVRvV2ViZGF2JyB9KTtcblx0XHR9XG5cdFx0Y29uc3QgY2xpZW50ID0gbmV3IFdlYmRhdihcblx0XHRcdGFjY291bnQuc2VydmVyX3VybCxcblx0XHRcdGFjY291bnQudXNlcm5hbWUsXG5cdFx0XHRhY2NvdW50LnBhc3N3b3JkXG5cdFx0KTtcblx0XHRjb25zdCBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG5cblx0XHQvLyBjcmVhdGUgYnVmZmVyIHN0cmVhbSBmcm9tIGZpbGUgZGF0YVxuXHRcdGxldCBidWZmZXJTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoKCk7XG5cdFx0aWYgKGZpbGVEYXRhKSB7XG5cdFx0XHRidWZmZXJTdHJlYW0uZW5kKGZpbGVEYXRhKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YnVmZmVyU3RyZWFtID0gbnVsbDtcblx0XHR9XG5cblx0XHQvLyBjcmVhdGUgYSB3cml0ZSBzdHJlYW0gb24gcmVtb3RlIHdlYmRhdiBzZXJ2ZXJcblx0XHRjb25zdCB3cml0ZVN0cmVhbSA9IGNsaWVudC5jcmVhdGVXcml0ZVN0cmVhbShgJHsgdXBsb2FkRm9sZGVyIH0vJHsgbmFtZSB9YCk7XG5cdFx0d3JpdGVTdHJlYW0ub24oJ2VuZCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ZnV0dXJlLnJldHVybih7IHN1Y2Nlc3M6IHRydWUgfSk7XG5cdFx0fSk7XG5cdFx0d3JpdGVTdHJlYW0ub24oJ2Vycm9yJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRmdXR1cmUucmV0dXJuKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdGaWxlVXBsb2FkX0Vycm9yJyB9KTtcblx0XHR9KTtcblxuXHRcdGF3YWl0IGNsaWVudC5zdGF0KHVwbG9hZEZvbGRlcikudGhlbihmdW5jdGlvbigpIHtcblx0XHRcdGJ1ZmZlclN0cmVhbS5waXBlKHdyaXRlU3RyZWFtKTtcblx0XHR9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcblx0XHRcdGlmIChlcnIuc3RhdHVzID09PSA0MDQpIHtcblx0XHRcdFx0Y2xpZW50LmNyZWF0ZURpcmVjdG9yeSh1cGxvYWRGb2xkZXIpLnRoZW4oZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0YnVmZmVyU3RyZWFtLnBpcGUod3JpdGVTdHJlYW0pO1xuXHRcdFx0XHR9KS5jYXRjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRpZiAoZXJyLnN0YXR1cyA9PT0gNDA0KSB7XG5cdFx0XHRcdFx0XHRmdXR1cmUucmV0dXJuKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICd3ZWJkYXYtc2VydmVyLW5vdC1mb3VuZCcgfSk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGZ1dHVyZS5yZXR1cm4oeyBzdWNjZXNzOiBmYWxzZSwgbWVzc2FnZTogJ0ZpbGVVcGxvYWRfRXJyb3InIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2UgaWYgKGVyci5zdGF0dXMgPT09IDQwMSkge1xuXHRcdFx0XHRmdXR1cmUucmV0dXJuKHsgc3VjY2VzczogZmFsc2UsIG1lc3NhZ2U6ICdlcnJvci1pbnZhbGlkLWFjY291bnQnIH0pO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZnV0dXJlLnJldHVybih7IHN1Y2Nlc3M6IGZhbHNlLCBtZXNzYWdlOiAnRmlsZVVwbG9hZF9FcnJvcicgfSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGZ1dHVyZS53YWl0KCk7XG5cdH0sXG59KTtcbiIsIi8qKlxuICogV2ViZGF2IEFjY291bnRzIG1vZGVsXG4gKi9cbmNsYXNzIFdlYmRhdkFjY291bnRzIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcignd2ViZGF2X2FjY291bnRzJyk7XG5cblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgdXNlcl9pZDogMSwgc2VydmVyX3VybDogMSwgdXNlcm5hbWU6IDEsIG5hbWU6IDEgfSwgeyB1bmlxdWU6IDEgfSk7XG5cdH1cblxuXHRmaW5kV2l0aFVzZXJJZCh1c2VyX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7IHVzZXJfaWQgfTtcblx0XHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdHJlbW92ZUJ5VXNlckFuZElkKF9pZCwgdXNlcl9pZCkge1xuXHRcdHJldHVybiB0aGlzLnJlbW92ZSh7IF9pZCwgdXNlcl9pZCB9KTtcblx0fVxuXG5cdHJlbW92ZUJ5SWQoX2lkKSB7XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKHsgX2lkIH0pO1xuXHR9XG5cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuV2ViZGF2QWNjb3VudHMgPSBuZXcgV2ViZGF2QWNjb3VudHMoKTtcbiIsIk1ldGVvci5wdWJsaXNoKCd3ZWJkYXZBY2NvdW50cycsIGZ1bmN0aW9uKCkge1xuXHRpZiAoIXRoaXMudXNlcklkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZXJyb3IobmV3IE1ldGVvci5FcnJvcignZXJyb3Itbm90LWF1dGhvcml6ZWQnLCAnTm90IGF1dGhvcml6ZWQnLCB7IHB1Ymxpc2g6ICd3ZWJkYXZBY2NvdW50cycgfSkpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLldlYmRhdkFjY291bnRzLmZpbmRXaXRoVXNlcklkKHRoaXMudXNlcklkLCB7XG5cdFx0ZmllbGRzOiB7XG5cdFx0XHRfaWQ6MSxcblx0XHRcdHVzZXJuYW1lOiAxLFxuXHRcdFx0c2VydmVyX3VybDogMSxcblx0XHRcdG5hbWU6IDEsXG5cdFx0fSxcblx0fSk7XG59KTtcbiIsIlJvY2tldENoYXQuc2V0dGluZ3MuYWRkR3JvdXAoJ1dlYmRhdiBJbnRlZ3JhdGlvbicsIGZ1bmN0aW9uKCkge1xuXHR0aGlzLmFkZCgnV2ViZGF2X0ludGVncmF0aW9uX0VuYWJsZWQnLCBmYWxzZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdH0pO1xufSk7XG4iXX0=
