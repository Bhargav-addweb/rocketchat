(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
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

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:user-data-download":{"server":{"startup":{"settings.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_user-data-download/server/startup/settings.js                                             //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
RocketChat.settings.addGroup('UserDataDownload', function () {
  this.add('UserData_EnableDownload', true, {
    type: 'boolean',
    public: true,
    i18nLabel: 'UserData_EnableDownload'
  });
  this.add('UserData_FileSystemPath', '', {
    type: 'string',
    public: true,
    i18nLabel: 'UserData_FileSystemPath'
  });
  this.add('UserData_FileSystemZipPath', '', {
    type: 'string',
    public: true,
    i18nLabel: 'UserData_FileSystemZipPath'
  });
  this.add('UserData_ProcessingFrequency', 15, {
    type: 'int',
    public: true,
    i18nLabel: 'UserData_ProcessingFrequency'
  });
  this.add('UserData_MessageLimitPerRequest', 100, {
    type: 'int',
    public: true,
    i18nLabel: 'UserData_MessageLimitPerRequest'
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cronProcessDownloads.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                               //
// packages/rocketchat_user-data-download/server/cronProcessDownloads.js                                         //
//                                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                 //
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 0);
let path;
module.watch(require("path"), {
  default(v) {
    path = v;
  }

}, 1);
let archiver;
module.watch(require("archiver"), {
  default(v) {
    archiver = v;
  }

}, 2);
let Mailer;
module.watch(require("meteor/rocketchat:mailer"), {
  "*"(v) {
    Mailer = v;
  }

}, 3);
let zipFolder = '/tmp/zipFiles';

if (RocketChat.settings.get('UserData_FileSystemZipPath') != null) {
  if (RocketChat.settings.get('UserData_FileSystemZipPath').trim() !== '') {
    zipFolder = RocketChat.settings.get('UserData_FileSystemZipPath');
  }
}

let processingFrequency = 15;

if (RocketChat.settings.get('UserData_ProcessingFrequency') > 0) {
  processingFrequency = RocketChat.settings.get('UserData_ProcessingFrequency');
}

const startFile = function (fileName, content) {
  fs.writeFileSync(fileName, content);
};

const writeToFile = function (fileName, content) {
  fs.appendFileSync(fileName, content);
};

const createDir = function (folderName) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }
};

const loadUserSubscriptions = function (exportOperation) {
  exportOperation.roomList = [];
  const exportUserId = exportOperation.userId;
  const cursor = RocketChat.models.Subscriptions.findByUserId(exportUserId);
  cursor.forEach(subscription => {
    const roomId = subscription.rid;
    const roomData = RocketChat.models.Rooms.findOneById(roomId);
    let roomName = roomData.name ? roomData.name : roomId;
    let userId = null;

    if (subscription.t === 'd') {
      userId = roomId.replace(exportUserId, '');
      const userData = RocketChat.models.Users.findOneById(userId);

      if (userData) {
        roomName = userData.name;
      }
    }

    const fileName = exportOperation.fullExport ? roomId : roomName;
    const fileType = exportOperation.fullExport ? 'json' : 'html';
    const targetFile = `${fileName}.${fileType}`;
    exportOperation.roomList.push({
      roomId,
      roomName,
      userId,
      exportedCount: 0,
      status: 'pending',
      targetFile,
      type: subscription.t
    });
  });

  if (exportOperation.fullExport) {
    exportOperation.status = 'exporting-rooms';
  } else {
    exportOperation.status = 'exporting';
  }
};

const getAttachmentData = function (attachment) {
  const attachmentData = {
    type: attachment.type,
    title: attachment.title,
    title_link: attachment.title_link,
    image_url: attachment.image_url,
    audio_url: attachment.audio_url,
    video_url: attachment.video_url,
    message_link: attachment.message_link,
    image_type: attachment.image_type,
    image_size: attachment.image_size,
    video_size: attachment.video_size,
    video_type: attachment.video_type,
    audio_size: attachment.audio_size,
    audio_type: attachment.audio_type,
    url: null,
    remote: false,
    fileId: null,
    fileName: null
  };
  const url = attachment.title_link || attachment.image_url || attachment.audio_url || attachment.video_url || attachment.message_link;

  if (url) {
    attachmentData.url = url;
    const urlMatch = /\:\/\//.exec(url);

    if (urlMatch && urlMatch.length > 0) {
      attachmentData.remote = true;
    } else {
      const match = /^\/([^\/]+)\/([^\/]+)\/(.*)/.exec(url);

      if (match && match[2]) {
        const file = RocketChat.models.Uploads.findOneById(match[2]);

        if (file) {
          attachmentData.fileId = file._id;
          attachmentData.fileName = file.name;
        }
      }
    }
  }

  return attachmentData;
};

const addToFileList = function (exportOperation, attachment) {
  const targetFile = path.join(exportOperation.assetsPath, `${attachment.fileId}-${attachment.fileName}`);
  const attachmentData = {
    url: attachment.url,
    copied: false,
    remote: attachment.remote,
    fileId: attachment.fileId,
    fileName: attachment.fileName,
    targetFile
  };
  exportOperation.fileList.push(attachmentData);
};

const getMessageData = function (msg, exportOperation) {
  const attachments = [];

  if (msg.attachments) {
    msg.attachments.forEach(attachment => {
      const attachmentData = getAttachmentData(attachment);
      attachments.push(attachmentData);
      addToFileList(exportOperation, attachmentData);
    });
  }

  const messageObject = {
    msg: msg.msg,
    username: msg.u.username,
    ts: msg.ts
  };

  if (attachments && attachments.length > 0) {
    messageObject.attachments = attachments;
  }

  if (msg.t) {
    messageObject.type = msg.t;
  }

  if (msg.u.name) {
    messageObject.name = msg.u.name;
  }

  return messageObject;
};

const copyFile = function (exportOperation, attachmentData) {
  if (attachmentData.copied || attachmentData.remote || !attachmentData.fileId) {
    attachmentData.copied = true;
    return;
  }

  const file = RocketChat.models.Uploads.findOneById(attachmentData.fileId);

  if (file) {
    if (FileUpload.copy(file, attachmentData.targetFile)) {
      attachmentData.copied = true;
    }
  }
};

const continueExportingRoom = function (exportOperation, exportOpRoomData) {
  createDir(exportOperation.exportPath);
  createDir(exportOperation.assetsPath);
  const filePath = path.join(exportOperation.exportPath, exportOpRoomData.targetFile);

  if (exportOpRoomData.status === 'pending') {
    exportOpRoomData.status = 'exporting';
    startFile(filePath, '');

    if (!exportOperation.fullExport) {
      writeToFile(filePath, '<meta http-equiv="content-type" content="text/html; charset=utf-8">');
    }
  }

  let limit = 100;

  if (RocketChat.settings.get('UserData_MessageLimitPerRequest') > 0) {
    limit = RocketChat.settings.get('UserData_MessageLimitPerRequest');
  }

  const skip = exportOpRoomData.exportedCount;
  const cursor = RocketChat.models.Messages.findByRoomId(exportOpRoomData.roomId, {
    limit,
    skip
  });
  const count = cursor.count();
  cursor.forEach(msg => {
    const messageObject = getMessageData(msg, exportOperation);

    if (exportOperation.fullExport) {
      const messageString = JSON.stringify(messageObject);
      writeToFile(filePath, `${messageString}\n`);
    } else {
      const messageType = msg.t;
      const userName = msg.u.username || msg.u.name;
      const timestamp = msg.ts ? new Date(msg.ts).toUTCString() : '';
      let message = msg.msg;

      switch (messageType) {
        case 'uj':
          message = TAPi18n.__('User_joined_channel');
          break;

        case 'ul':
          message = TAPi18n.__('User_left');
          break;

        case 'au':
          message = TAPi18n.__('User_added_by', {
            user_added: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'r':
          message = TAPi18n.__('Room_name_changed', {
            room_name: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'ru':
          message = TAPi18n.__('User_removed_by', {
            user_removed: msg.msg,
            user_by: msg.u.username
          });
          break;

        case 'wm':
          message = TAPi18n.__('Welcome', {
            user: msg.u.username
          });
          break;

        case 'livechat-close':
          message = TAPi18n.__('Conversation_finished');
          break;
      }

      if (message !== msg.msg) {
        message = `<i>${message}</i>`;
      }

      writeToFile(filePath, `<p><strong>${userName}</strong> (${timestamp}):<br/>`);
      writeToFile(filePath, message);

      if (messageObject.attachments && messageObject.attachments.length > 0) {
        messageObject.attachments.forEach(attachment => {
          if (attachment.type === 'file') {
            const description = attachment.description || attachment.title || TAPi18n.__('Message_Attachments');

            const assetUrl = `./assets/${attachment.fileId}-${attachment.fileName}`;
            const link = `<br/><a href="${assetUrl}">${description}</a>`;
            writeToFile(filePath, link);
          }
        });
      }

      writeToFile(filePath, '</p>');
    }

    exportOpRoomData.exportedCount++;
  });

  if (count <= exportOpRoomData.exportedCount) {
    exportOpRoomData.status = 'completed';
    return true;
  }

  return false;
};

const isExportComplete = function (exportOperation) {
  const incomplete = exportOperation.roomList.some(exportOpRoomData => exportOpRoomData.status !== 'completed');
  return !incomplete;
};

const isDownloadFinished = function (exportOperation) {
  const anyDownloadPending = exportOperation.fileList.some(fileData => !fileData.copied && !fileData.remote);
  return !anyDownloadPending;
};

const sendEmail = function (userId) {
  const lastFile = RocketChat.models.UserDataFiles.findLastFileByUser(userId);

  if (!lastFile) {
    return;
  }

  const userData = RocketChat.models.Users.findOneById(userId);

  if (!userData || userData.emails || userData.emails[0] || userData.emails[0].address) {
    return;
  }

  const emailAddress = `${userData.name} <${userData.emails[0].address}>`;
  const fromAddress = RocketChat.settings.get('From_Email');

  const subject = TAPi18n.__('UserDataDownload_EmailSubject');

  const download_link = lastFile.url;

  const body = TAPi18n.__('UserDataDownload_EmailBody', {
    download_link
  });

  if (!Mailer.checkAddressFormat(emailAddress)) {
    return;
  }

  return Mailer.sendNoWrap({
    to: emailAddress,
    from: fromAddress,
    subject,
    html: body
  });
};

const makeZipFile = function (exportOperation) {
  createDir(zipFolder);
  const targetFile = path.join(zipFolder, `${exportOperation.userId}.zip`);

  if (fs.existsSync(targetFile)) {
    exportOperation.status = 'uploading';
    return;
  }

  const output = fs.createWriteStream(targetFile);
  exportOperation.generatedFile = targetFile;
  const archive = archiver('zip');
  output.on('close', () => {});
  archive.on('error', err => {
    throw err;
  });
  archive.pipe(output);
  archive.directory(exportOperation.exportPath, false);
  archive.finalize();
};

const uploadZipFile = function (exportOperation, callback) {
  const userDataStore = FileUpload.getStore('UserDataFiles');
  const filePath = exportOperation.generatedFile;
  const stat = Meteor.wrapAsync(fs.stat)(filePath);
  const stream = fs.createReadStream(filePath);
  const contentType = 'application/zip';
  const {
    size
  } = stat;
  const {
    userId
  } = exportOperation;
  const user = RocketChat.models.Users.findOneById(userId);
  const userDisplayName = user ? user.name : userId;
  const utcDate = new Date().toISOString().split('T')[0];
  const newFileName = encodeURIComponent(`${utcDate}-${userDisplayName}.zip`);
  const details = {
    userId,
    type: contentType,
    size,
    name: newFileName
  };
  userDataStore.insert(details, stream, err => {
    if (err) {
      throw new Meteor.Error('invalid-file', 'Invalid Zip File', {
        method: 'cronProcessDownloads.uploadZipFile'
      });
    } else {
      callback();
    }
  });
};

const generateChannelsFile = function (exportOperation) {
  if (exportOperation.fullExport) {
    const fileName = path.join(exportOperation.exportPath, 'channels.json');
    startFile(fileName, '');
    exportOperation.roomList.forEach(roomData => {
      const newRoomData = {
        roomId: roomData.roomId,
        roomName: roomData.roomName,
        type: roomData.type
      };
      const messageString = JSON.stringify(newRoomData);
      writeToFile(fileName, `${messageString}\n`);
    });
  }

  exportOperation.status = 'exporting';
};

const continueExportOperation = function (exportOperation) {
  if (exportOperation.status === 'completed') {
    return;
  }

  if (!exportOperation.roomList) {
    loadUserSubscriptions(exportOperation);
  }

  try {
    if (exportOperation.status === 'exporting-rooms') {
      generateChannelsFile(exportOperation);
    } // Run every room on every request, to avoid missing new messages on the rooms that finished first.


    if (exportOperation.status === 'exporting') {
      exportOperation.roomList.forEach(exportOpRoomData => {
        continueExportingRoom(exportOperation, exportOpRoomData);
      });

      if (isExportComplete(exportOperation)) {
        exportOperation.status = 'downloading';
        return;
      }
    }

    if (exportOperation.status === 'downloading') {
      exportOperation.fileList.forEach(attachmentData => {
        copyFile(exportOperation, attachmentData);
      });

      if (isDownloadFinished(exportOperation)) {
        const targetFile = path.join(zipFolder, `${exportOperation.userId}.zip`);

        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }

        exportOperation.status = 'compressing';
        return;
      }
    }

    if (exportOperation.status === 'compressing') {
      makeZipFile(exportOperation);
      return;
    }

    if (exportOperation.status === 'uploading') {
      uploadZipFile(exportOperation, () => {
        exportOperation.status = 'completed';
        RocketChat.models.ExportOperations.updateOperation(exportOperation);
      });
      return;
    }
  } catch (e) {
    console.error(e);
  }
};

function processDataDownloads() {
  const cursor = RocketChat.models.ExportOperations.findAllPending({
    limit: 1
  });
  cursor.forEach(exportOperation => {
    if (exportOperation.status === 'completed') {
      return;
    }

    continueExportOperation(exportOperation);
    RocketChat.models.ExportOperations.updateOperation(exportOperation);

    if (exportOperation.status === 'completed') {
      sendEmail(exportOperation.userId);
    }
  });
}

Meteor.startup(function () {
  Meteor.defer(function () {
    processDataDownloads();
    SyncedCron.add({
      name: 'Generate download files for user data',
      schedule: parser => parser.cron(`*/${processingFrequency} * * * *`),
      job: processDataDownloads
    });
  });
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:user-data-download/server/startup/settings.js");
require("/node_modules/meteor/rocketchat:user-data-download/server/cronProcessDownloads.js");

/* Exports */
Package._define("rocketchat:user-data-download");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_user-data-download.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDp1c2VyLWRhdGEtZG93bmxvYWQvc2VydmVyL3N0YXJ0dXAvc2V0dGluZ3MuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6dXNlci1kYXRhLWRvd25sb2FkL3NlcnZlci9jcm9uUHJvY2Vzc0Rvd25sb2Fkcy5qcyJdLCJuYW1lcyI6WyJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJhZGRHcm91cCIsImFkZCIsInR5cGUiLCJwdWJsaWMiLCJpMThuTGFiZWwiLCJmcyIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2IiwicGF0aCIsImFyY2hpdmVyIiwiTWFpbGVyIiwiemlwRm9sZGVyIiwiZ2V0IiwidHJpbSIsInByb2Nlc3NpbmdGcmVxdWVuY3kiLCJzdGFydEZpbGUiLCJmaWxlTmFtZSIsImNvbnRlbnQiLCJ3cml0ZUZpbGVTeW5jIiwid3JpdGVUb0ZpbGUiLCJhcHBlbmRGaWxlU3luYyIsImNyZWF0ZURpciIsImZvbGRlck5hbWUiLCJleGlzdHNTeW5jIiwibWtkaXJTeW5jIiwibG9hZFVzZXJTdWJzY3JpcHRpb25zIiwiZXhwb3J0T3BlcmF0aW9uIiwicm9vbUxpc3QiLCJleHBvcnRVc2VySWQiLCJ1c2VySWQiLCJjdXJzb3IiLCJtb2RlbHMiLCJTdWJzY3JpcHRpb25zIiwiZmluZEJ5VXNlcklkIiwiZm9yRWFjaCIsInN1YnNjcmlwdGlvbiIsInJvb21JZCIsInJpZCIsInJvb21EYXRhIiwiUm9vbXMiLCJmaW5kT25lQnlJZCIsInJvb21OYW1lIiwibmFtZSIsInQiLCJyZXBsYWNlIiwidXNlckRhdGEiLCJVc2VycyIsImZ1bGxFeHBvcnQiLCJmaWxlVHlwZSIsInRhcmdldEZpbGUiLCJwdXNoIiwiZXhwb3J0ZWRDb3VudCIsInN0YXR1cyIsImdldEF0dGFjaG1lbnREYXRhIiwiYXR0YWNobWVudCIsImF0dGFjaG1lbnREYXRhIiwidGl0bGUiLCJ0aXRsZV9saW5rIiwiaW1hZ2VfdXJsIiwiYXVkaW9fdXJsIiwidmlkZW9fdXJsIiwibWVzc2FnZV9saW5rIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJ2aWRlb19zaXplIiwidmlkZW9fdHlwZSIsImF1ZGlvX3NpemUiLCJhdWRpb190eXBlIiwidXJsIiwicmVtb3RlIiwiZmlsZUlkIiwidXJsTWF0Y2giLCJleGVjIiwibGVuZ3RoIiwibWF0Y2giLCJmaWxlIiwiVXBsb2FkcyIsIl9pZCIsImFkZFRvRmlsZUxpc3QiLCJqb2luIiwiYXNzZXRzUGF0aCIsImNvcGllZCIsImZpbGVMaXN0IiwiZ2V0TWVzc2FnZURhdGEiLCJtc2ciLCJhdHRhY2htZW50cyIsIm1lc3NhZ2VPYmplY3QiLCJ1c2VybmFtZSIsInUiLCJ0cyIsImNvcHlGaWxlIiwiRmlsZVVwbG9hZCIsImNvcHkiLCJjb250aW51ZUV4cG9ydGluZ1Jvb20iLCJleHBvcnRPcFJvb21EYXRhIiwiZXhwb3J0UGF0aCIsImZpbGVQYXRoIiwibGltaXQiLCJza2lwIiwiTWVzc2FnZXMiLCJmaW5kQnlSb29tSWQiLCJjb3VudCIsIm1lc3NhZ2VTdHJpbmciLCJKU09OIiwic3RyaW5naWZ5IiwibWVzc2FnZVR5cGUiLCJ1c2VyTmFtZSIsInRpbWVzdGFtcCIsIkRhdGUiLCJ0b1VUQ1N0cmluZyIsIm1lc3NhZ2UiLCJUQVBpMThuIiwiX18iLCJ1c2VyX2FkZGVkIiwidXNlcl9ieSIsInJvb21fbmFtZSIsInVzZXJfcmVtb3ZlZCIsInVzZXIiLCJkZXNjcmlwdGlvbiIsImFzc2V0VXJsIiwibGluayIsImlzRXhwb3J0Q29tcGxldGUiLCJpbmNvbXBsZXRlIiwic29tZSIsImlzRG93bmxvYWRGaW5pc2hlZCIsImFueURvd25sb2FkUGVuZGluZyIsImZpbGVEYXRhIiwic2VuZEVtYWlsIiwibGFzdEZpbGUiLCJVc2VyRGF0YUZpbGVzIiwiZmluZExhc3RGaWxlQnlVc2VyIiwiZW1haWxzIiwiYWRkcmVzcyIsImVtYWlsQWRkcmVzcyIsImZyb21BZGRyZXNzIiwic3ViamVjdCIsImRvd25sb2FkX2xpbmsiLCJib2R5IiwiY2hlY2tBZGRyZXNzRm9ybWF0Iiwic2VuZE5vV3JhcCIsInRvIiwiZnJvbSIsImh0bWwiLCJtYWtlWmlwRmlsZSIsIm91dHB1dCIsImNyZWF0ZVdyaXRlU3RyZWFtIiwiZ2VuZXJhdGVkRmlsZSIsImFyY2hpdmUiLCJvbiIsImVyciIsInBpcGUiLCJkaXJlY3RvcnkiLCJmaW5hbGl6ZSIsInVwbG9hZFppcEZpbGUiLCJjYWxsYmFjayIsInVzZXJEYXRhU3RvcmUiLCJnZXRTdG9yZSIsInN0YXQiLCJNZXRlb3IiLCJ3cmFwQXN5bmMiLCJzdHJlYW0iLCJjcmVhdGVSZWFkU3RyZWFtIiwiY29udGVudFR5cGUiLCJzaXplIiwidXNlckRpc3BsYXlOYW1lIiwidXRjRGF0ZSIsInRvSVNPU3RyaW5nIiwic3BsaXQiLCJuZXdGaWxlTmFtZSIsImVuY29kZVVSSUNvbXBvbmVudCIsImRldGFpbHMiLCJpbnNlcnQiLCJFcnJvciIsIm1ldGhvZCIsImdlbmVyYXRlQ2hhbm5lbHNGaWxlIiwibmV3Um9vbURhdGEiLCJjb250aW51ZUV4cG9ydE9wZXJhdGlvbiIsInVubGlua1N5bmMiLCJFeHBvcnRPcGVyYXRpb25zIiwidXBkYXRlT3BlcmF0aW9uIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsInByb2Nlc3NEYXRhRG93bmxvYWRzIiwiZmluZEFsbFBlbmRpbmciLCJzdGFydHVwIiwiZGVmZXIiLCJTeW5jZWRDcm9uIiwic2NoZWR1bGUiLCJwYXJzZXIiLCJjcm9uIiwiam9iIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxXQUFXQyxRQUFYLENBQW9CQyxRQUFwQixDQUE2QixrQkFBN0IsRUFBaUQsWUFBVztBQUUzRCxPQUFLQyxHQUFMLENBQVMseUJBQVQsRUFBb0MsSUFBcEMsRUFBMEM7QUFDekNDLFVBQU0sU0FEbUM7QUFFekNDLFlBQVEsSUFGaUM7QUFHekNDLGVBQVc7QUFIOEIsR0FBMUM7QUFN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LFFBQUlBLGdCQUFnQjBCLE1BQWhCLEtBQTJCLFdBQS9CLEVBQTRDO0FBQzNDO0FBQ0E7O0FBRUQ0SCw0QkFBd0J0SixlQUF4QjtBQUNBL0IsZUFBV29DLE1BQVgsQ0FBa0JtSixnQkFBbEIsQ0FBbUNDLGVBQW5DLENBQW1EekosZUFBbkQ7O0FBRUEsUUFBSUEsZ0JBQWdCMEIsTUFBaEIsS0FBMkIsV0FBL0IsRUFBNEM7QUFDM0MyRSxnQkFBVXJHLGdCQUFnQkcsTUFBMUI7QUFDQTtBQUNELEdBWEQ7QUFZQTs7QUFFRGlJLE9BQU8yQixPQUFQLENBQWUsWUFBVztBQUN6QjNCLFNBQU80QixLQUFQLENBQWEsWUFBVztBQUN2Qkg7QUFFQUksZUFBVzdMLEdBQVgsQ0FBZTtBQUNkNEMsWUFBTSx1Q0FEUTtBQUVka0osZ0JBQVdDLE1BQUQsSUFBWUEsT0FBT0MsSUFBUCxDQUFhLEtBQUtoTCxtQkFBcUIsVUFBdkMsQ0FGUjtBQUdkaUwsV0FBS1I7QUFIUyxLQUFmO0FBS0EsR0FSRDtBQVNBLENBVkQsRSIsImZpbGUiOiIvcGFja2FnZXMvcm9ja2V0Y2hhdF91c2VyLWRhdGEtZG93bmxvYWQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdVc2VyRGF0YURvd25sb2FkJywgZnVuY3Rpb24oKSB7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX0VuYWJsZURvd25sb2FkJywgdHJ1ZSwge1xuXHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVXNlckRhdGFfRW5hYmxlRG93bmxvYWQnLFxuXHR9KTtcblxuXHR0aGlzLmFkZCgnVXNlckRhdGFfRmlsZVN5c3RlbVBhdGgnLCAnJywge1xuXHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdVc2VyRGF0YV9GaWxlU3lzdGVtUGF0aCcsXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdVc2VyRGF0YV9GaWxlU3lzdGVtWmlwUGF0aCcsICcnLCB7XG5cdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5MYWJlbDogJ1VzZXJEYXRhX0ZpbGVTeXN0ZW1aaXBQYXRoJyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX1Byb2Nlc3NpbmdGcmVxdWVuY3knLCAxNSwge1xuXHRcdHR5cGU6ICdpbnQnLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0XHRpMThuTGFiZWw6ICdVc2VyRGF0YV9Qcm9jZXNzaW5nRnJlcXVlbmN5Jyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ1VzZXJEYXRhX01lc3NhZ2VMaW1pdFBlclJlcXVlc3QnLCAxMDAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkxhYmVsOiAnVXNlckRhdGFfTWVzc2FnZUxpbWl0UGVyUmVxdWVzdCcsXG5cdH0pO1xuXG5cbn0pO1xuIiwiLyogZ2xvYmFscyBTeW5jZWRDcm9uICovXG5cbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcmNoaXZlciBmcm9tICdhcmNoaXZlcic7XG5pbXBvcnQgKiBhcyBNYWlsZXIgZnJvbSAnbWV0ZW9yL3JvY2tldGNoYXQ6bWFpbGVyJztcblxubGV0IHppcEZvbGRlciA9ICcvdG1wL3ppcEZpbGVzJztcbmlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVXNlckRhdGFfRmlsZVN5c3RlbVppcFBhdGgnKSAhPSBudWxsKSB7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVXNlckRhdGFfRmlsZVN5c3RlbVppcFBhdGgnKS50cmltKCkgIT09ICcnKSB7XG5cdFx0emlwRm9sZGVyID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX0ZpbGVTeXN0ZW1aaXBQYXRoJyk7XG5cdH1cbn1cblxubGV0IHByb2Nlc3NpbmdGcmVxdWVuY3kgPSAxNTtcbmlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVXNlckRhdGFfUHJvY2Vzc2luZ0ZyZXF1ZW5jeScpID4gMCkge1xuXHRwcm9jZXNzaW5nRnJlcXVlbmN5ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX1Byb2Nlc3NpbmdGcmVxdWVuY3knKTtcbn1cblxuY29uc3Qgc3RhcnRGaWxlID0gZnVuY3Rpb24oZmlsZU5hbWUsIGNvbnRlbnQpIHtcblx0ZnMud3JpdGVGaWxlU3luYyhmaWxlTmFtZSwgY29udGVudCk7XG59O1xuXG5jb25zdCB3cml0ZVRvRmlsZSA9IGZ1bmN0aW9uKGZpbGVOYW1lLCBjb250ZW50KSB7XG5cdGZzLmFwcGVuZEZpbGVTeW5jKGZpbGVOYW1lLCBjb250ZW50KTtcbn07XG5cbmNvbnN0IGNyZWF0ZURpciA9IGZ1bmN0aW9uKGZvbGRlck5hbWUpIHtcblx0aWYgKCFmcy5leGlzdHNTeW5jKGZvbGRlck5hbWUpKSB7XG5cdFx0ZnMubWtkaXJTeW5jKGZvbGRlck5hbWUpO1xuXHR9XG59O1xuXG5jb25zdCBsb2FkVXNlclN1YnNjcmlwdGlvbnMgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24pIHtcblx0ZXhwb3J0T3BlcmF0aW9uLnJvb21MaXN0ID0gW107XG5cblx0Y29uc3QgZXhwb3J0VXNlcklkID0gZXhwb3J0T3BlcmF0aW9uLnVzZXJJZDtcblx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5maW5kQnlVc2VySWQoZXhwb3J0VXNlcklkKTtcblx0Y3Vyc29yLmZvckVhY2goKHN1YnNjcmlwdGlvbikgPT4ge1xuXHRcdGNvbnN0IHJvb21JZCA9IHN1YnNjcmlwdGlvbi5yaWQ7XG5cdFx0Y29uc3Qgcm9vbURhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChyb29tSWQpO1xuXHRcdGxldCByb29tTmFtZSA9IHJvb21EYXRhLm5hbWUgPyByb29tRGF0YS5uYW1lIDogcm9vbUlkO1xuXHRcdGxldCB1c2VySWQgPSBudWxsO1xuXG5cdFx0aWYgKHN1YnNjcmlwdGlvbi50ID09PSAnZCcpIHtcblx0XHRcdHVzZXJJZCA9IHJvb21JZC5yZXBsYWNlKGV4cG9ydFVzZXJJZCwgJycpO1xuXHRcdFx0Y29uc3QgdXNlckRhdGEgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXG5cdFx0XHRpZiAodXNlckRhdGEpIHtcblx0XHRcdFx0cm9vbU5hbWUgPSB1c2VyRGF0YS5uYW1lO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGVOYW1lID0gZXhwb3J0T3BlcmF0aW9uLmZ1bGxFeHBvcnQgPyByb29tSWQgOiByb29tTmFtZTtcblx0XHRjb25zdCBmaWxlVHlwZSA9IGV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0ID8gJ2pzb24nIDogJ2h0bWwnO1xuXHRcdGNvbnN0IHRhcmdldEZpbGUgPSBgJHsgZmlsZU5hbWUgfS4keyBmaWxlVHlwZSB9YDtcblxuXHRcdGV4cG9ydE9wZXJhdGlvbi5yb29tTGlzdC5wdXNoKHtcblx0XHRcdHJvb21JZCxcblx0XHRcdHJvb21OYW1lLFxuXHRcdFx0dXNlcklkLFxuXHRcdFx0ZXhwb3J0ZWRDb3VudDogMCxcblx0XHRcdHN0YXR1czogJ3BlbmRpbmcnLFxuXHRcdFx0dGFyZ2V0RmlsZSxcblx0XHRcdHR5cGU6IHN1YnNjcmlwdGlvbi50LFxuXHRcdH0pO1xuXHR9KTtcblxuXHRpZiAoZXhwb3J0T3BlcmF0aW9uLmZ1bGxFeHBvcnQpIHtcblx0XHRleHBvcnRPcGVyYXRpb24uc3RhdHVzID0gJ2V4cG9ydGluZy1yb29tcyc7XG5cdH0gZWxzZSB7XG5cdFx0ZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9ICdleHBvcnRpbmcnO1xuXHR9XG59O1xuXG5jb25zdCBnZXRBdHRhY2htZW50RGF0YSA9IGZ1bmN0aW9uKGF0dGFjaG1lbnQpIHtcblx0Y29uc3QgYXR0YWNobWVudERhdGEgPSB7XG5cdFx0dHlwZSA6IGF0dGFjaG1lbnQudHlwZSxcblx0XHR0aXRsZTogYXR0YWNobWVudC50aXRsZSxcblx0XHR0aXRsZV9saW5rOiBhdHRhY2htZW50LnRpdGxlX2xpbmssXG5cdFx0aW1hZ2VfdXJsOiBhdHRhY2htZW50LmltYWdlX3VybCxcblx0XHRhdWRpb191cmw6IGF0dGFjaG1lbnQuYXVkaW9fdXJsLFxuXHRcdHZpZGVvX3VybDogYXR0YWNobWVudC52aWRlb191cmwsXG5cdFx0bWVzc2FnZV9saW5rOiBhdHRhY2htZW50Lm1lc3NhZ2VfbGluayxcblx0XHRpbWFnZV90eXBlOiBhdHRhY2htZW50LmltYWdlX3R5cGUsXG5cdFx0aW1hZ2Vfc2l6ZTogYXR0YWNobWVudC5pbWFnZV9zaXplLFxuXHRcdHZpZGVvX3NpemU6IGF0dGFjaG1lbnQudmlkZW9fc2l6ZSxcblx0XHR2aWRlb190eXBlOiBhdHRhY2htZW50LnZpZGVvX3R5cGUsXG5cdFx0YXVkaW9fc2l6ZTogYXR0YWNobWVudC5hdWRpb19zaXplLFxuXHRcdGF1ZGlvX3R5cGU6IGF0dGFjaG1lbnQuYXVkaW9fdHlwZSxcblx0XHR1cmw6IG51bGwsXG5cdFx0cmVtb3RlOiBmYWxzZSxcblx0XHRmaWxlSWQ6IG51bGwsXG5cdFx0ZmlsZU5hbWU6IG51bGwsXG5cdH07XG5cblx0Y29uc3QgdXJsID0gYXR0YWNobWVudC50aXRsZV9saW5rIHx8IGF0dGFjaG1lbnQuaW1hZ2VfdXJsIHx8IGF0dGFjaG1lbnQuYXVkaW9fdXJsIHx8IGF0dGFjaG1lbnQudmlkZW9fdXJsIHx8IGF0dGFjaG1lbnQubWVzc2FnZV9saW5rO1xuXHRpZiAodXJsKSB7XG5cdFx0YXR0YWNobWVudERhdGEudXJsID0gdXJsO1xuXG5cdFx0Y29uc3QgdXJsTWF0Y2ggPSAvXFw6XFwvXFwvLy5leGVjKHVybCk7XG5cdFx0aWYgKHVybE1hdGNoICYmIHVybE1hdGNoLmxlbmd0aCA+IDApIHtcblx0XHRcdGF0dGFjaG1lbnREYXRhLnJlbW90ZSA9IHRydWU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IG1hdGNoID0gL15cXC8oW15cXC9dKylcXC8oW15cXC9dKylcXC8oLiopLy5leGVjKHVybCk7XG5cblx0XHRcdGlmIChtYXRjaCAmJiBtYXRjaFsyXSkge1xuXHRcdFx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChtYXRjaFsyXSk7XG5cblx0XHRcdFx0aWYgKGZpbGUpIHtcblx0XHRcdFx0XHRhdHRhY2htZW50RGF0YS5maWxlSWQgPSBmaWxlLl9pZDtcblx0XHRcdFx0XHRhdHRhY2htZW50RGF0YS5maWxlTmFtZSA9IGZpbGUubmFtZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBhdHRhY2htZW50RGF0YTtcbn07XG5cbmNvbnN0IGFkZFRvRmlsZUxpc3QgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24sIGF0dGFjaG1lbnQpIHtcblx0Y29uc3QgdGFyZ2V0RmlsZSA9IHBhdGguam9pbihleHBvcnRPcGVyYXRpb24uYXNzZXRzUGF0aCwgYCR7IGF0dGFjaG1lbnQuZmlsZUlkIH0tJHsgYXR0YWNobWVudC5maWxlTmFtZSB9YCk7XG5cblx0Y29uc3QgYXR0YWNobWVudERhdGEgPSB7XG5cdFx0dXJsOiBhdHRhY2htZW50LnVybCxcblx0XHRjb3BpZWQ6IGZhbHNlLFxuXHRcdHJlbW90ZTogYXR0YWNobWVudC5yZW1vdGUsXG5cdFx0ZmlsZUlkOiBhdHRhY2htZW50LmZpbGVJZCxcblx0XHRmaWxlTmFtZTogYXR0YWNobWVudC5maWxlTmFtZSxcblx0XHR0YXJnZXRGaWxlLFxuXHR9O1xuXG5cdGV4cG9ydE9wZXJhdGlvbi5maWxlTGlzdC5wdXNoKGF0dGFjaG1lbnREYXRhKTtcbn07XG5cbmNvbnN0IGdldE1lc3NhZ2VEYXRhID0gZnVuY3Rpb24obXNnLCBleHBvcnRPcGVyYXRpb24pIHtcblx0Y29uc3QgYXR0YWNobWVudHMgPSBbXTtcblxuXHRpZiAobXNnLmF0dGFjaG1lbnRzKSB7XG5cdFx0bXNnLmF0dGFjaG1lbnRzLmZvckVhY2goKGF0dGFjaG1lbnQpID0+IHtcblx0XHRcdGNvbnN0IGF0dGFjaG1lbnREYXRhID0gZ2V0QXR0YWNobWVudERhdGEoYXR0YWNobWVudCk7XG5cblx0XHRcdGF0dGFjaG1lbnRzLnB1c2goYXR0YWNobWVudERhdGEpO1xuXHRcdFx0YWRkVG9GaWxlTGlzdChleHBvcnRPcGVyYXRpb24sIGF0dGFjaG1lbnREYXRhKTtcblx0XHR9KTtcblx0fVxuXG5cdGNvbnN0IG1lc3NhZ2VPYmplY3QgPSB7XG5cdFx0bXNnOiBtc2cubXNnLFxuXHRcdHVzZXJuYW1lOiBtc2cudS51c2VybmFtZSxcblx0XHR0czogbXNnLnRzLFxuXHR9O1xuXG5cdGlmIChhdHRhY2htZW50cyAmJiBhdHRhY2htZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0bWVzc2FnZU9iamVjdC5hdHRhY2htZW50cyA9IGF0dGFjaG1lbnRzO1xuXHR9XG5cdGlmIChtc2cudCkge1xuXHRcdG1lc3NhZ2VPYmplY3QudHlwZSA9IG1zZy50O1xuXHR9XG5cdGlmIChtc2cudS5uYW1lKSB7XG5cdFx0bWVzc2FnZU9iamVjdC5uYW1lID0gbXNnLnUubmFtZTtcblx0fVxuXG5cdHJldHVybiBtZXNzYWdlT2JqZWN0O1xufTtcblxuY29uc3QgY29weUZpbGUgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24sIGF0dGFjaG1lbnREYXRhKSB7XG5cdGlmIChhdHRhY2htZW50RGF0YS5jb3BpZWQgfHwgYXR0YWNobWVudERhdGEucmVtb3RlIHx8ICFhdHRhY2htZW50RGF0YS5maWxlSWQpIHtcblx0XHRhdHRhY2htZW50RGF0YS5jb3BpZWQgPSB0cnVlO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IGZpbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmRPbmVCeUlkKGF0dGFjaG1lbnREYXRhLmZpbGVJZCk7XG5cblx0aWYgKGZpbGUpIHtcblx0XHRpZiAoRmlsZVVwbG9hZC5jb3B5KGZpbGUsIGF0dGFjaG1lbnREYXRhLnRhcmdldEZpbGUpKSB7XG5cdFx0XHRhdHRhY2htZW50RGF0YS5jb3BpZWQgPSB0cnVlO1xuXHRcdH1cblx0fVxufTtcblxuY29uc3QgY29udGludWVFeHBvcnRpbmdSb29tID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uLCBleHBvcnRPcFJvb21EYXRhKSB7XG5cdGNyZWF0ZURpcihleHBvcnRPcGVyYXRpb24uZXhwb3J0UGF0aCk7XG5cdGNyZWF0ZURpcihleHBvcnRPcGVyYXRpb24uYXNzZXRzUGF0aCk7XG5cblx0Y29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oZXhwb3J0T3BlcmF0aW9uLmV4cG9ydFBhdGgsIGV4cG9ydE9wUm9vbURhdGEudGFyZ2V0RmlsZSk7XG5cblx0aWYgKGV4cG9ydE9wUm9vbURhdGEuc3RhdHVzID09PSAncGVuZGluZycpIHtcblx0XHRleHBvcnRPcFJvb21EYXRhLnN0YXR1cyA9ICdleHBvcnRpbmcnO1xuXHRcdHN0YXJ0RmlsZShmaWxlUGF0aCwgJycpO1xuXHRcdGlmICghZXhwb3J0T3BlcmF0aW9uLmZ1bGxFeHBvcnQpIHtcblx0XHRcdHdyaXRlVG9GaWxlKGZpbGVQYXRoLCAnPG1ldGEgaHR0cC1lcXVpdj1cImNvbnRlbnQtdHlwZVwiIGNvbnRlbnQ9XCJ0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLThcIj4nKTtcblx0XHR9XG5cdH1cblxuXHRsZXQgbGltaXQgPSAxMDA7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVXNlckRhdGFfTWVzc2FnZUxpbWl0UGVyUmVxdWVzdCcpID4gMCkge1xuXHRcdGxpbWl0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VzZXJEYXRhX01lc3NhZ2VMaW1pdFBlclJlcXVlc3QnKTtcblx0fVxuXG5cdGNvbnN0IHNraXAgPSBleHBvcnRPcFJvb21EYXRhLmV4cG9ydGVkQ291bnQ7XG5cblx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZEJ5Um9vbUlkKGV4cG9ydE9wUm9vbURhdGEucm9vbUlkLCB7IGxpbWl0LCBza2lwIH0pO1xuXHRjb25zdCBjb3VudCA9IGN1cnNvci5jb3VudCgpO1xuXG5cdGN1cnNvci5mb3JFYWNoKChtc2cpID0+IHtcblx0XHRjb25zdCBtZXNzYWdlT2JqZWN0ID0gZ2V0TWVzc2FnZURhdGEobXNnLCBleHBvcnRPcGVyYXRpb24pO1xuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5mdWxsRXhwb3J0KSB7XG5cdFx0XHRjb25zdCBtZXNzYWdlU3RyaW5nID0gSlNPTi5zdHJpbmdpZnkobWVzc2FnZU9iamVjdCk7XG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlUGF0aCwgYCR7IG1lc3NhZ2VTdHJpbmcgfVxcbmApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRjb25zdCBtZXNzYWdlVHlwZSA9IG1zZy50O1xuXHRcdFx0Y29uc3QgdXNlck5hbWUgPSBtc2cudS51c2VybmFtZSB8fCBtc2cudS5uYW1lO1xuXHRcdFx0Y29uc3QgdGltZXN0YW1wID0gbXNnLnRzID8gbmV3IERhdGUobXNnLnRzKS50b1VUQ1N0cmluZygpIDogJyc7XG5cdFx0XHRsZXQgbWVzc2FnZSA9IG1zZy5tc2c7XG5cblx0XHRcdHN3aXRjaCAobWVzc2FnZVR5cGUpIHtcblx0XHRcdFx0Y2FzZSAndWonOlxuXHRcdFx0XHRcdG1lc3NhZ2UgPSBUQVBpMThuLl9fKCdVc2VyX2pvaW5lZF9jaGFubmVsJyk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ3VsJzpcblx0XHRcdFx0XHRtZXNzYWdlID0gVEFQaTE4bi5fXygnVXNlcl9sZWZ0Jyk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdGNhc2UgJ2F1Jzpcblx0XHRcdFx0XHRtZXNzYWdlID0gVEFQaTE4bi5fXygnVXNlcl9hZGRlZF9ieScsIHsgdXNlcl9hZGRlZCA6IG1zZy5tc2csIHVzZXJfYnkgOiBtc2cudS51c2VybmFtZSB9KTtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0Y2FzZSAncic6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1Jvb21fbmFtZV9jaGFuZ2VkJywgeyByb29tX25hbWU6IG1zZy5tc2csIHVzZXJfYnk6IG1zZy51LnVzZXJuYW1lIH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdydSc6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1VzZXJfcmVtb3ZlZF9ieScsIHsgdXNlcl9yZW1vdmVkIDogbXNnLm1zZywgdXNlcl9ieSA6IG1zZy51LnVzZXJuYW1lIH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICd3bSc6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ1dlbGNvbWUnLCB7IHVzZXI6IG1zZy51LnVzZXJuYW1lIH0pO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlICdsaXZlY2hhdC1jbG9zZSc6XG5cdFx0XHRcdFx0bWVzc2FnZSA9IFRBUGkxOG4uX18oJ0NvbnZlcnNhdGlvbl9maW5pc2hlZCcpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAobWVzc2FnZSAhPT0gbXNnLm1zZykge1xuXHRcdFx0XHRtZXNzYWdlID0gYDxpPiR7IG1lc3NhZ2UgfTwvaT5gO1xuXHRcdFx0fVxuXG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlUGF0aCwgYDxwPjxzdHJvbmc+JHsgdXNlck5hbWUgfTwvc3Ryb25nPiAoJHsgdGltZXN0YW1wIH0pOjxici8+YCk7XG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlUGF0aCwgbWVzc2FnZSk7XG5cblx0XHRcdGlmIChtZXNzYWdlT2JqZWN0LmF0dGFjaG1lbnRzICYmIG1lc3NhZ2VPYmplY3QuYXR0YWNobWVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRtZXNzYWdlT2JqZWN0LmF0dGFjaG1lbnRzLmZvckVhY2goKGF0dGFjaG1lbnQpID0+IHtcblx0XHRcdFx0XHRpZiAoYXR0YWNobWVudC50eXBlID09PSAnZmlsZScpIHtcblx0XHRcdFx0XHRcdGNvbnN0IGRlc2NyaXB0aW9uID0gYXR0YWNobWVudC5kZXNjcmlwdGlvbiB8fCBhdHRhY2htZW50LnRpdGxlIHx8IFRBUGkxOG4uX18oJ01lc3NhZ2VfQXR0YWNobWVudHMnKTtcblxuXHRcdFx0XHRcdFx0Y29uc3QgYXNzZXRVcmwgPSBgLi9hc3NldHMvJHsgYXR0YWNobWVudC5maWxlSWQgfS0keyBhdHRhY2htZW50LmZpbGVOYW1lIH1gO1xuXHRcdFx0XHRcdFx0Y29uc3QgbGluayA9IGA8YnIvPjxhIGhyZWY9XCIkeyBhc3NldFVybCB9XCI+JHsgZGVzY3JpcHRpb24gfTwvYT5gO1xuXHRcdFx0XHRcdFx0d3JpdGVUb0ZpbGUoZmlsZVBhdGgsIGxpbmspO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdHdyaXRlVG9GaWxlKGZpbGVQYXRoLCAnPC9wPicpO1xuXHRcdH1cblxuXHRcdGV4cG9ydE9wUm9vbURhdGEuZXhwb3J0ZWRDb3VudCsrO1xuXHR9KTtcblxuXHRpZiAoY291bnQgPD0gZXhwb3J0T3BSb29tRGF0YS5leHBvcnRlZENvdW50KSB7XG5cdFx0ZXhwb3J0T3BSb29tRGF0YS5zdGF0dXMgPSAnY29tcGxldGVkJztcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdHJldHVybiBmYWxzZTtcbn07XG5cbmNvbnN0IGlzRXhwb3J0Q29tcGxldGUgPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24pIHtcblx0Y29uc3QgaW5jb21wbGV0ZSA9IGV4cG9ydE9wZXJhdGlvbi5yb29tTGlzdC5zb21lKChleHBvcnRPcFJvb21EYXRhKSA9PiBleHBvcnRPcFJvb21EYXRhLnN0YXR1cyAhPT0gJ2NvbXBsZXRlZCcpO1xuXG5cdHJldHVybiAhaW5jb21wbGV0ZTtcbn07XG5cbmNvbnN0IGlzRG93bmxvYWRGaW5pc2hlZCA9IGZ1bmN0aW9uKGV4cG9ydE9wZXJhdGlvbikge1xuXHRjb25zdCBhbnlEb3dubG9hZFBlbmRpbmcgPSBleHBvcnRPcGVyYXRpb24uZmlsZUxpc3Quc29tZSgoZmlsZURhdGEpID0+ICFmaWxlRGF0YS5jb3BpZWQgJiYgIWZpbGVEYXRhLnJlbW90ZSk7XG5cblx0cmV0dXJuICFhbnlEb3dubG9hZFBlbmRpbmc7XG59O1xuXG5jb25zdCBzZW5kRW1haWwgPSBmdW5jdGlvbih1c2VySWQpIHtcblx0Y29uc3QgbGFzdEZpbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2VyRGF0YUZpbGVzLmZpbmRMYXN0RmlsZUJ5VXNlcih1c2VySWQpO1xuXHRpZiAoIWxhc3RGaWxlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdGNvbnN0IHVzZXJEYXRhID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblxuXHRpZiAoIXVzZXJEYXRhIHx8IHVzZXJEYXRhLmVtYWlscyB8fCB1c2VyRGF0YS5lbWFpbHNbMF0gfHwgdXNlckRhdGEuZW1haWxzWzBdLmFkZHJlc3MpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0Y29uc3QgZW1haWxBZGRyZXNzID0gYCR7IHVzZXJEYXRhLm5hbWUgfSA8JHsgdXNlckRhdGEuZW1haWxzWzBdLmFkZHJlc3MgfT5gO1xuXHRjb25zdCBmcm9tQWRkcmVzcyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGcm9tX0VtYWlsJyk7XG5cdGNvbnN0IHN1YmplY3QgPSBUQVBpMThuLl9fKCdVc2VyRGF0YURvd25sb2FkX0VtYWlsU3ViamVjdCcpO1xuXG5cdGNvbnN0IGRvd25sb2FkX2xpbmsgPSBsYXN0RmlsZS51cmw7XG5cdGNvbnN0IGJvZHkgPSBUQVBpMThuLl9fKCdVc2VyRGF0YURvd25sb2FkX0VtYWlsQm9keScsIHsgZG93bmxvYWRfbGluayB9KTtcblxuXHRpZiAoIU1haWxlci5jaGVja0FkZHJlc3NGb3JtYXQoZW1haWxBZGRyZXNzKSkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHJldHVybiBNYWlsZXIuc2VuZE5vV3JhcCh7XG5cdFx0dG86IGVtYWlsQWRkcmVzcyxcblx0XHRmcm9tOiBmcm9tQWRkcmVzcyxcblx0XHRzdWJqZWN0LFxuXHRcdGh0bWw6IGJvZHksXG5cdH0pO1xuXG59O1xuXG5jb25zdCBtYWtlWmlwRmlsZSA9IGZ1bmN0aW9uKGV4cG9ydE9wZXJhdGlvbikge1xuXHRjcmVhdGVEaXIoemlwRm9sZGVyKTtcblxuXHRjb25zdCB0YXJnZXRGaWxlID0gcGF0aC5qb2luKHppcEZvbGRlciwgYCR7IGV4cG9ydE9wZXJhdGlvbi51c2VySWQgfS56aXBgKTtcblx0aWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0RmlsZSkpIHtcblx0XHRleHBvcnRPcGVyYXRpb24uc3RhdHVzID0gJ3VwbG9hZGluZyc7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3Qgb3V0cHV0ID0gZnMuY3JlYXRlV3JpdGVTdHJlYW0odGFyZ2V0RmlsZSk7XG5cblx0ZXhwb3J0T3BlcmF0aW9uLmdlbmVyYXRlZEZpbGUgPSB0YXJnZXRGaWxlO1xuXG5cdGNvbnN0IGFyY2hpdmUgPSBhcmNoaXZlcignemlwJyk7XG5cblx0b3V0cHV0Lm9uKCdjbG9zZScsICgpID0+IHtcblx0fSk7XG5cblx0YXJjaGl2ZS5vbignZXJyb3InLCAoZXJyKSA9PiB7XG5cdFx0dGhyb3cgZXJyO1xuXHR9KTtcblxuXHRhcmNoaXZlLnBpcGUob3V0cHV0KTtcblx0YXJjaGl2ZS5kaXJlY3RvcnkoZXhwb3J0T3BlcmF0aW9uLmV4cG9ydFBhdGgsIGZhbHNlKTtcblx0YXJjaGl2ZS5maW5hbGl6ZSgpO1xufTtcblxuY29uc3QgdXBsb2FkWmlwRmlsZSA9IGZ1bmN0aW9uKGV4cG9ydE9wZXJhdGlvbiwgY2FsbGJhY2spIHtcblx0Y29uc3QgdXNlckRhdGFTdG9yZSA9IEZpbGVVcGxvYWQuZ2V0U3RvcmUoJ1VzZXJEYXRhRmlsZXMnKTtcblx0Y29uc3QgZmlsZVBhdGggPSBleHBvcnRPcGVyYXRpb24uZ2VuZXJhdGVkRmlsZTtcblxuXHRjb25zdCBzdGF0ID0gTWV0ZW9yLndyYXBBc3luYyhmcy5zdGF0KShmaWxlUGF0aCk7XG5cdGNvbnN0IHN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZVBhdGgpO1xuXG5cdGNvbnN0IGNvbnRlbnRUeXBlID0gJ2FwcGxpY2F0aW9uL3ppcCc7XG5cdGNvbnN0IHsgc2l6ZSB9ID0gc3RhdDtcblxuXHRjb25zdCB7IHVzZXJJZCB9ID0gZXhwb3J0T3BlcmF0aW9uO1xuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQodXNlcklkKTtcblx0Y29uc3QgdXNlckRpc3BsYXlOYW1lID0gdXNlciA/IHVzZXIubmFtZSA6IHVzZXJJZDtcblx0Y29uc3QgdXRjRGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdO1xuXG5cdGNvbnN0IG5ld0ZpbGVOYW1lID0gZW5jb2RlVVJJQ29tcG9uZW50KGAkeyB1dGNEYXRlIH0tJHsgdXNlckRpc3BsYXlOYW1lIH0uemlwYCk7XG5cblx0Y29uc3QgZGV0YWlscyA9IHtcblx0XHR1c2VySWQsXG5cdFx0dHlwZTogY29udGVudFR5cGUsXG5cdFx0c2l6ZSxcblx0XHRuYW1lOiBuZXdGaWxlTmFtZSxcblx0fTtcblxuXHR1c2VyRGF0YVN0b3JlLmluc2VydChkZXRhaWxzLCBzdHJlYW0sIChlcnIpID0+IHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdpbnZhbGlkLWZpbGUnLCAnSW52YWxpZCBaaXAgRmlsZScsIHsgbWV0aG9kOiAnY3JvblByb2Nlc3NEb3dubG9hZHMudXBsb2FkWmlwRmlsZScgfSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmNvbnN0IGdlbmVyYXRlQ2hhbm5lbHNGaWxlID0gZnVuY3Rpb24oZXhwb3J0T3BlcmF0aW9uKSB7XG5cdGlmIChleHBvcnRPcGVyYXRpb24uZnVsbEV4cG9ydCkge1xuXHRcdGNvbnN0IGZpbGVOYW1lID0gcGF0aC5qb2luKGV4cG9ydE9wZXJhdGlvbi5leHBvcnRQYXRoLCAnY2hhbm5lbHMuanNvbicpO1xuXHRcdHN0YXJ0RmlsZShmaWxlTmFtZSwgJycpO1xuXG5cdFx0ZXhwb3J0T3BlcmF0aW9uLnJvb21MaXN0LmZvckVhY2goKHJvb21EYXRhKSA9PiB7XG5cdFx0XHRjb25zdCBuZXdSb29tRGF0YSA9IHtcblx0XHRcdFx0cm9vbUlkOiByb29tRGF0YS5yb29tSWQsXG5cdFx0XHRcdHJvb21OYW1lOiByb29tRGF0YS5yb29tTmFtZSxcblx0XHRcdFx0dHlwZTogcm9vbURhdGEudHlwZSxcblx0XHRcdH07XG5cblx0XHRcdGNvbnN0IG1lc3NhZ2VTdHJpbmcgPSBKU09OLnN0cmluZ2lmeShuZXdSb29tRGF0YSk7XG5cdFx0XHR3cml0ZVRvRmlsZShmaWxlTmFtZSwgYCR7IG1lc3NhZ2VTdHJpbmcgfVxcbmApO1xuXHRcdH0pO1xuXHR9XG5cblx0ZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9ICdleHBvcnRpbmcnO1xufTtcblxuY29uc3QgY29udGludWVFeHBvcnRPcGVyYXRpb24gPSBmdW5jdGlvbihleHBvcnRPcGVyYXRpb24pIHtcblx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0aWYgKCFleHBvcnRPcGVyYXRpb24ucm9vbUxpc3QpIHtcblx0XHRsb2FkVXNlclN1YnNjcmlwdGlvbnMoZXhwb3J0T3BlcmF0aW9uKTtcblx0fVxuXG5cdHRyeSB7XG5cblx0XHRpZiAoZXhwb3J0T3BlcmF0aW9uLnN0YXR1cyA9PT0gJ2V4cG9ydGluZy1yb29tcycpIHtcblx0XHRcdGdlbmVyYXRlQ2hhbm5lbHNGaWxlKGV4cG9ydE9wZXJhdGlvbik7XG5cdFx0fVxuXG5cdFx0Ly8gUnVuIGV2ZXJ5IHJvb20gb24gZXZlcnkgcmVxdWVzdCwgdG8gYXZvaWQgbWlzc2luZyBuZXcgbWVzc2FnZXMgb24gdGhlIHJvb21zIHRoYXQgZmluaXNoZWQgZmlyc3QuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdleHBvcnRpbmcnKSB7XG5cdFx0XHRleHBvcnRPcGVyYXRpb24ucm9vbUxpc3QuZm9yRWFjaCgoZXhwb3J0T3BSb29tRGF0YSkgPT4ge1xuXHRcdFx0XHRjb250aW51ZUV4cG9ydGluZ1Jvb20oZXhwb3J0T3BlcmF0aW9uLCBleHBvcnRPcFJvb21EYXRhKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoaXNFeHBvcnRDb21wbGV0ZShleHBvcnRPcGVyYXRpb24pKSB7XG5cdFx0XHRcdGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPSAnZG93bmxvYWRpbmcnO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdkb3dubG9hZGluZycpIHtcblx0XHRcdGV4cG9ydE9wZXJhdGlvbi5maWxlTGlzdC5mb3JFYWNoKChhdHRhY2htZW50RGF0YSkgPT4ge1xuXHRcdFx0XHRjb3B5RmlsZShleHBvcnRPcGVyYXRpb24sIGF0dGFjaG1lbnREYXRhKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRpZiAoaXNEb3dubG9hZEZpbmlzaGVkKGV4cG9ydE9wZXJhdGlvbikpIHtcblx0XHRcdFx0Y29uc3QgdGFyZ2V0RmlsZSA9IHBhdGguam9pbih6aXBGb2xkZXIsIGAkeyBleHBvcnRPcGVyYXRpb24udXNlcklkIH0uemlwYCk7XG5cdFx0XHRcdGlmIChmcy5leGlzdHNTeW5jKHRhcmdldEZpbGUpKSB7XG5cdFx0XHRcdFx0ZnMudW5saW5rU3luYyh0YXJnZXRGaWxlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPSAnY29tcHJlc3NpbmcnO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdjb21wcmVzc2luZycpIHtcblx0XHRcdG1ha2VaaXBGaWxlKGV4cG9ydE9wZXJhdGlvbik7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICd1cGxvYWRpbmcnKSB7XG5cdFx0XHR1cGxvYWRaaXBGaWxlKGV4cG9ydE9wZXJhdGlvbiwgKCkgPT4ge1xuXHRcdFx0XHRleHBvcnRPcGVyYXRpb24uc3RhdHVzID0gJ2NvbXBsZXRlZCc7XG5cdFx0XHRcdFJvY2tldENoYXQubW9kZWxzLkV4cG9ydE9wZXJhdGlvbnMudXBkYXRlT3BlcmF0aW9uKGV4cG9ydE9wZXJhdGlvbik7XG5cdFx0XHR9KTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRjb25zb2xlLmVycm9yKGUpO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBwcm9jZXNzRGF0YURvd25sb2FkcygpIHtcblx0Y29uc3QgY3Vyc29yID0gUm9ja2V0Q2hhdC5tb2RlbHMuRXhwb3J0T3BlcmF0aW9ucy5maW5kQWxsUGVuZGluZyh7IGxpbWl0OiAxIH0pO1xuXHRjdXJzb3IuZm9yRWFjaCgoZXhwb3J0T3BlcmF0aW9uKSA9PiB7XG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29udGludWVFeHBvcnRPcGVyYXRpb24oZXhwb3J0T3BlcmF0aW9uKTtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5FeHBvcnRPcGVyYXRpb25zLnVwZGF0ZU9wZXJhdGlvbihleHBvcnRPcGVyYXRpb24pO1xuXG5cdFx0aWYgKGV4cG9ydE9wZXJhdGlvbi5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XG5cdFx0XHRzZW5kRW1haWwoZXhwb3J0T3BlcmF0aW9uLnVzZXJJZCk7XG5cdFx0fVxuXHR9KTtcbn1cblxuTWV0ZW9yLnN0YXJ0dXAoZnVuY3Rpb24oKSB7XG5cdE1ldGVvci5kZWZlcihmdW5jdGlvbigpIHtcblx0XHRwcm9jZXNzRGF0YURvd25sb2FkcygpO1xuXG5cdFx0U3luY2VkQ3Jvbi5hZGQoe1xuXHRcdFx0bmFtZTogJ0dlbmVyYXRlIGRvd25sb2FkIGZpbGVzIGZvciB1c2VyIGRhdGEnLFxuXHRcdFx0c2NoZWR1bGU6IChwYXJzZXIpID0+IHBhcnNlci5jcm9uKGAqLyR7IHByb2Nlc3NpbmdGcmVxdWVuY3kgfSAqICogKiAqYCksXG5cdFx0XHRqb2I6IHByb2Nlc3NEYXRhRG93bmxvYWRzLFxuXHRcdH0pO1xuXHR9KTtcbn0pO1xuIl19
