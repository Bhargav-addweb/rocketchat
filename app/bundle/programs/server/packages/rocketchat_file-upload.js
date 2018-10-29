(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var Slingshot = Package['edgee:slingshot'].Slingshot;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var Random = Package.random.Random;
var Accounts = Package['accounts-base'].Accounts;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var FileUpload, FileUploadBase, file, options, fileUploadHandler;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:file-upload":{"globalFileRestrictions.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/globalFileRestrictions.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 0);
const slingShotConfig = {
  authorize(file
  /* , metaContext*/
  ) {
    // Deny uploads if user is not logged in.
    if (!this.userId) {
      throw new Meteor.Error('login-required', 'Please login before posting files');
    }

    if (!RocketChat.fileUploadIsValidContentType(file.type)) {
      throw new Meteor.Error(TAPi18n.__('error-invalid-file-type'));
    }

    const maxFileSize = RocketChat.settings.get('FileUpload_MaxFileSize');

    if (maxFileSize > -1 && maxFileSize < file.size) {
      throw new Meteor.Error(TAPi18n.__('File_exceeds_allowed_size_of_bytes', {
        size: filesize(maxFileSize)
      }));
    }

    return true;
  },

  maxSize: 0,
  allowedFileTypes: null
};
Slingshot.fileRestrictions('rocketchat-uploads', slingShotConfig);
Slingshot.fileRestrictions('rocketchat-uploads-gs', slingShotConfig);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"FileUpload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/lib/FileUpload.js                                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let filesize;
module.watch(require("filesize"), {
  default(v) {
    filesize = v;
  }

}, 0);
let maxFileSize = 0;
FileUpload = {
  validateFileUpload(file) {
    if (!Match.test(file.rid, String)) {
      return false;
    } // livechat users can upload files but they don't have an userId


    const user = file.userId ? Meteor.user() : null;
    const room = RocketChat.models.Rooms.findOneById(file.rid);
    const directMessageAllow = RocketChat.settings.get('FileUpload_Enabled_Direct');
    const fileUploadAllowed = RocketChat.settings.get('FileUpload_Enabled');

    if (RocketChat.authz.canAccessRoom(room, user, file) !== true) {
      return false;
    }

    const language = user ? user.language : 'en';

    if (!fileUploadAllowed) {
      const reason = TAPi18n.__('FileUpload_Disabled', language);

      throw new Meteor.Error('error-file-upload-disabled', reason);
    }

    if (!directMessageAllow && room.t === 'd') {
      const reason = TAPi18n.__('File_not_allowed_direct_messages', language);

      throw new Meteor.Error('error-direct-message-file-upload-not-allowed', reason);
    } // -1 maxFileSize means there is no limit


    if (maxFileSize > -1 && file.size > maxFileSize) {
      const reason = TAPi18n.__('File_exceeds_allowed_size_of_bytes', {
        size: filesize(maxFileSize)
      }, language);

      throw new Meteor.Error('error-file-too-large', reason);
    }

    if (!RocketChat.fileUploadIsValidContentType(file.type)) {
      const reason = TAPi18n.__('File_type_is_not_accepted', language);

      throw new Meteor.Error('error-invalid-file-type', reason);
    }

    return true;
  }

};
RocketChat.settings.get('FileUpload_MaxFileSize', function (key, value) {
  try {
    maxFileSize = parseInt(value);
  } catch (e) {
    maxFileSize = RocketChat.models.Settings.findOneById('FileUpload_MaxFileSize').packageValue;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"FileUploadBase.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/lib/FileUploadBase.js                                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
UploadFS.config.defaultStorePermissions = new UploadFS.StorePermissions({
  insert(userId, doc) {
    if (userId) {
      return true;
    } // allow inserts from slackbridge (message_id = slack-timestamp-milli)


    if (doc && doc.message_id && doc.message_id.indexOf('slack-') === 0) {
      return true;
    } // allow inserts to the UserDataFiles store


    if (doc && doc.store && doc.store.split(':').pop() === 'UserDataFiles') {
      return true;
    }

    if (RocketChat.authz.canAccessRoom(null, null, doc)) {
      return true;
    }

    return false;
  },

  update(userId, doc) {
    return RocketChat.authz.hasPermission(Meteor.userId(), 'delete-message', doc.rid) || RocketChat.settings.get('Message_AllowDeleting') && userId === doc.userId;
  },

  remove(userId, doc) {
    return RocketChat.authz.hasPermission(Meteor.userId(), 'delete-message', doc.rid) || RocketChat.settings.get('Message_AllowDeleting') && userId === doc.userId;
  }

});
FileUploadBase = class FileUploadBase {
  constructor(store, meta, file) {
    this.id = Random.id();
    this.meta = meta;
    this.file = file;
    this.store = store;
  }

  getProgress() {}

  getFileName() {
    return this.meta.name;
  }

  start(callback) {
    this.handler = new UploadFS.Uploader({
      store: this.store,
      data: this.file,
      file: this.meta,
      onError: err => callback(err),
      onComplete: fileData => {
        const file = _.pick(fileData, '_id', 'type', 'size', 'name', 'identify', 'description');

        file.url = fileData.url.replace(Meteor.absoluteUrl(), '/');
        return callback(null, file, this.store.options.name);
      }
    });

    this.handler.onProgress = (file, progress) => {
      this.onProgress(progress);
    };

    return this.handler.start();
  }

  onProgress() {}

  stop() {
    return this.handler.stop();
  }

};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"lib":{"FileUpload.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/FileUpload.js                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  FileUploadClass: () => FileUploadClass
});
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 0);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 1);
let mime;
module.watch(require("mime-type/with-db"), {
  default(v) {
    mime = v;
  }

}, 2);
let Future;
module.watch(require("fibers/future"), {
  default(v) {
    Future = v;
  }

}, 3);
let sharp;
module.watch(require("sharp"), {
  default(v) {
    sharp = v;
  }

}, 4);
let Cookies;
module.watch(require("meteor/ostrio:cookies"), {
  Cookies(v) {
    Cookies = v;
  }

}, 5);
const cookie = new Cookies();
Object.assign(FileUpload, {
  handlers: {},

  configureUploadsStore(store, name, options) {
    const type = name.split(':').pop();
    const stores = UploadFS.getStores();
    delete stores[name];
    return new UploadFS.store[store](Object.assign({
      name
    }, options, FileUpload[`default${type}`]()));
  },

  defaultUploads() {
    return {
      collection: RocketChat.models.Uploads.model,
      filter: new UploadFS.Filter({
        onCheck: FileUpload.validateFileUpload
      }),

      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/uploads/${file.rid}/${file.userId}/${file._id}`;
      },

      onValidate: FileUpload.uploadsOnValidate,

      onRead(fileId, file, req, res) {
        if (!FileUpload.requestCanAccessFiles(req)) {
          res.writeHead(403);
          return false;
        }

        res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
        return true;
      }

    };
  },

  defaultAvatars() {
    return {
      collection: RocketChat.models.Avatars.model,

      // filter: new UploadFS.Filter({
      // 	onCheck: FileUpload.validateFileUpload
      // }),
      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/avatars/${file.userId}`;
      },

      onValidate: FileUpload.avatarsOnValidate,
      onFinishUpload: FileUpload.avatarsOnFinishUpload
    };
  },

  defaultUserDataFiles() {
    return {
      collection: RocketChat.models.UserDataFiles.model,

      getPath(file) {
        return `${RocketChat.settings.get('uniqueID')}/uploads/userData/${file.userId}`;
      },

      onValidate: FileUpload.uploadsOnValidate,

      onRead(fileId, file, req, res) {
        if (!FileUpload.requestCanAccessFiles(req)) {
          res.writeHead(403);
          return false;
        }

        res.setHeader('content-disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
        return true;
      }

    };
  },

  avatarsOnValidate(file) {
    if (RocketChat.settings.get('Accounts_AvatarResize') !== true) {
      return;
    }

    const tempFilePath = UploadFS.getTempFilePath(file._id);
    const height = RocketChat.settings.get('Accounts_AvatarSize');
    const future = new Future();
    const s = sharp(tempFilePath);
    s.rotate(); // Get metadata to resize the image the first time to keep "inside" the dimensions
    // then resize again to create the canvas around

    s.metadata(Meteor.bindEnvironment((err, metadata) => {
      if (!metadata) {
        metadata = {};
      }

      s.toFormat(sharp.format.jpeg).resize(Math.min(height || 0, metadata.width || Infinity), Math.min(height || 0, metadata.height || Infinity)).pipe(sharp().resize(height, height).background('#FFFFFF').embed()) // Use buffer to get the result in memory then replace the existing file
      // There is no option to override a file using this library
      .toBuffer().then(Meteor.bindEnvironment(outputBuffer => {
        fs.writeFile(tempFilePath, outputBuffer, Meteor.bindEnvironment(err => {
          if (err != null) {
            console.error(err);
          }

          const {
            size
          } = fs.lstatSync(tempFilePath);
          this.getCollection().direct.update({
            _id: file._id
          }, {
            $set: {
              size
            }
          });
          future.return();
        }));
      }));
    }));
    return future.wait();
  },

  resizeImagePreview(file) {
    file = RocketChat.models.Uploads.findOneById(file._id);
    file = FileUpload.addExtensionTo(file);

    const image = FileUpload.getStore('Uploads')._store.getReadStream(file._id, file);

    const transformer = sharp().resize(32, 32).max().jpeg().blur();
    const result = transformer.toBuffer().then(out => out.toString('base64'));
    image.pipe(transformer);
    return result;
  },

  uploadsOnValidate(file) {
    if (!/^image\/((x-windows-)?bmp|p?jpeg|png)$/.test(file.type)) {
      return;
    }

    const tmpFile = UploadFS.getTempFilePath(file._id);
    const fut = new Future();
    const s = sharp(tmpFile);
    s.metadata(Meteor.bindEnvironment((err, metadata) => {
      if (err != null) {
        console.error(err);
        return fut.return();
      }

      const identify = {
        format: metadata.format,
        size: {
          width: metadata.width,
          height: metadata.height
        }
      };

      if (metadata.orientation == null) {
        return fut.return();
      }

      s.rotate().toFile(`${tmpFile}.tmp`).then(Meteor.bindEnvironment(() => {
        fs.unlink(tmpFile, Meteor.bindEnvironment(() => {
          fs.rename(`${tmpFile}.tmp`, tmpFile, Meteor.bindEnvironment(() => {
            const {
              size
            } = fs.lstatSync(tmpFile);
            this.getCollection().direct.update({
              _id: file._id
            }, {
              $set: {
                size,
                identify
              }
            });
            fut.return();
          }));
        }));
      })).catch(err => {
        console.error(err);
        fut.return();
      });
    }));
    return fut.wait();
  },

  avatarsOnFinishUpload(file) {
    // update file record to match user's username
    const user = RocketChat.models.Users.findOneById(file.userId);
    const oldAvatar = RocketChat.models.Avatars.findOneByName(user.username);

    if (oldAvatar) {
      RocketChat.models.Avatars.deleteFile(oldAvatar._id);
    }

    RocketChat.models.Avatars.updateFileNameById(file._id, user.username); // console.log('upload finished ->', file);
  },

  requestCanAccessFiles({
    headers = {},
    query = {}
  }) {
    if (!RocketChat.settings.get('FileUpload_ProtectFiles')) {
      return true;
    }

    let {
      rc_uid,
      rc_token,
      rc_rid,
      rc_room_type
    } = query;

    if (!rc_uid && headers.cookie) {
      rc_uid = cookie.get('rc_uid', headers.cookie);
      rc_token = cookie.get('rc_token', headers.cookie);
      rc_rid = cookie.get('rc_rid', headers.cookie);
      rc_room_type = cookie.get('rc_room_type', headers.cookie);
    }

    const isAuthorizedByCookies = rc_uid && rc_token && RocketChat.models.Users.findOneByIdAndLoginToken(rc_uid, rc_token);
    const isAuthorizedByHeaders = headers['x-user-id'] && headers['x-auth-token'] && RocketChat.models.Users.findOneByIdAndLoginToken(headers['x-user-id'], headers['x-auth-token']);
    const isAuthorizedByRoom = rc_room_type && RocketChat.roomTypes.getConfig(rc_room_type).canAccessUploadedFile({
      rc_uid,
      rc_rid,
      rc_token
    });
    return isAuthorizedByCookies || isAuthorizedByHeaders || isAuthorizedByRoom;
  },

  addExtensionTo(file) {
    if (mime.lookup(file.name) === file.type) {
      return file;
    }

    const ext = mime.extension(file.type);

    if (ext && false === new RegExp(`\.${ext}$`, 'i').test(file.name)) {
      file.name = `${file.name}.${ext}`;
    }

    return file;
  },

  getStore(modelName) {
    const storageType = RocketChat.settings.get('FileUpload_Storage_Type');
    const handlerName = `${storageType}:${modelName}`;
    return this.getStoreByName(handlerName);
  },

  getStoreByName(handlerName) {
    if (this.handlers[handlerName] == null) {
      console.error(`Upload handler "${handlerName}" does not exists`);
    }

    return this.handlers[handlerName];
  },

  get(file, req, res, next) {
    const store = this.getStoreByName(file.store);

    if (store && store.get) {
      return store.get(file, req, res, next);
    }

    res.writeHead(404);
    res.end();
  },

  copy(file, targetFile) {
    const store = this.getStoreByName(file.store);
    const out = fs.createWriteStream(targetFile);
    file = FileUpload.addExtensionTo(file);

    if (store.copy) {
      store.copy(file, out);
      return true;
    }

    return false;
  }

});

class FileUploadClass {
  constructor({
    name,
    model,
    store,
    get,
    insert,
    getStore,
    copy
  }) {
    this.name = name;
    this.model = model || this.getModelFromName();
    this._store = store || UploadFS.getStore(name);
    this.get = get;
    this.copy = copy;

    if (insert) {
      this.insert = insert;
    }

    if (getStore) {
      this.getStore = getStore;
    }

    FileUpload.handlers[name] = this;
  }

  getStore() {
    return this._store;
  }

  get store() {
    return this.getStore();
  }

  set store(store) {
    this._store = store;
  }

  getModelFromName() {
    return RocketChat.models[this.name.split(':')[1]];
  }

  delete(fileId) {
    if (this.store && this.store.delete) {
      this.store.delete(fileId);
    }

    return this.model.deleteFile(fileId);
  }

  deleteById(fileId) {
    const file = this.model.findOneById(fileId);

    if (!file) {
      return;
    }

    const store = FileUpload.getStoreByName(file.store);
    return store.delete(file._id);
  }

  deleteByName(fileName) {
    const file = this.model.findOneByName(fileName);

    if (!file) {
      return;
    }

    const store = FileUpload.getStoreByName(file.store);
    return store.delete(file._id);
  }

  insert(fileData, streamOrBuffer, cb) {
    fileData.size = parseInt(fileData.size) || 0; // Check if the fileData matches store filter

    const filter = this.store.getFilter();

    if (filter && filter.check) {
      filter.check(fileData);
    }

    const fileId = this.store.create(fileData);
    const token = this.store.createToken(fileId);
    const tmpFile = UploadFS.getTempFilePath(fileId);

    try {
      if (streamOrBuffer instanceof stream) {
        streamOrBuffer.pipe(fs.createWriteStream(tmpFile));
      } else if (streamOrBuffer instanceof Buffer) {
        fs.writeFileSync(tmpFile, streamOrBuffer);
      } else {
        throw new Error('Invalid file type');
      }

      const file = Meteor.call('ufsComplete', fileId, this.name, token);

      if (cb) {
        cb(null, file);
      }

      return file;
    } catch (e) {
      if (cb) {
        cb(e);
      } else {
        throw e;
      }
    }
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"proxy.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/proxy.js                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 0);
let URL;
module.watch(require("url"), {
  default(v) {
    URL = v;
  }

}, 1);
const logger = new Logger('UploadProxy');
WebApp.connectHandlers.stack.unshift({
  route: '',
  handle: Meteor.bindEnvironment(function (req, res, next) {
    // Quick check to see if request should be catch
    if (req.url.indexOf(UploadFS.config.storesPath) === -1) {
      return next();
    }

    logger.debug('Upload URL:', req.url);

    if (req.method !== 'POST') {
      return next();
    } // Remove store path


    const parsedUrl = URL.parse(req.url);
    const path = parsedUrl.pathname.substr(UploadFS.config.storesPath.length + 1); // Get store

    const regExp = new RegExp('^\/([^\/\?]+)\/([^\/\?]+)$');
    const match = regExp.exec(path); // Request is not valid

    if (match === null) {
      res.writeHead(400);
      res.end();
      return;
    } // Get store


    const store = UploadFS.getStore(match[1]);

    if (!store) {
      res.writeHead(404);
      res.end();
      return;
    } // Get file


    const fileId = match[2];
    const file = store.getCollection().findOne({
      _id: fileId
    });

    if (file === undefined) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (file.instanceId === InstanceStatus.id()) {
      logger.debug('Correct instance');
      return next();
    } // Proxy to other instance


    const instance = InstanceStatus.getCollection().findOne({
      _id: file.instanceId
    });

    if (instance == null) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (instance.extraInformation.host === process.env.INSTANCE_IP && RocketChat.isDocker() === false) {
      instance.extraInformation.host = 'localhost';
    }

    logger.debug('Wrong instance, proxing to:', `${instance.extraInformation.host}:${instance.extraInformation.port}`);
    const options = {
      hostname: instance.extraInformation.host,
      port: instance.extraInformation.port,
      path: req.originalUrl,
      method: 'POST'
    };
    const proxy = http.request(options, function (proxy_res) {
      proxy_res.pipe(res, {
        end: true
      });
    });
    req.pipe(proxy, {
      end: true
    });
  })
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"requests.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/lib/requests.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals FileUpload, WebApp */
WebApp.connectHandlers.use('/file-upload/', function (req, res, next) {
  const match = /^\/([^\/]+)\/(.*)/.exec(req.url);

  if (match[1]) {
    const file = RocketChat.models.Uploads.findOneById(match[1]);

    if (file) {
      if (!Meteor.settings.public.sandstorm && !FileUpload.requestCanAccessFiles(req)) {
        res.writeHead(403);
        return res.end();
      }

      res.setHeader('Content-Security-Policy', 'default-src \'none\'');
      return FileUpload.get(file, req, res, next);
    }
  }

  res.writeHead(404);
  res.end();
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"config":{"_configUploadStorage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/_configUploadStorage.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
module.watch(require("./AmazonS3.js"));
module.watch(require("./FileSystem.js"));
module.watch(require("./GoogleStorage.js"));
module.watch(require("./GridFS.js"));
module.watch(require("./Webdav.js"));
module.watch(require("./Slingshot_DEPRECATED.js"));

const configStore = _.debounce(() => {
  const store = RocketChat.settings.get('FileUpload_Storage_Type');

  if (store) {
    console.log('Setting default file store to', store);
    UploadFS.getStores().Avatars = UploadFS.getStore(`${store}:Avatars`);
    UploadFS.getStores().Uploads = UploadFS.getStore(`${store}:Uploads`);
    UploadFS.getStores().UserDataFiles = UploadFS.getStore(`${store}:UserDataFiles`);
  }
}, 1000);

RocketChat.settings.get(/^FileUpload_/, configStore);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"AmazonS3.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/AmazonS3.js                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/AmazonS3/server.js"));
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 3);

const get = function (file, req, res) {
  const fileUrl = this.store.getRedirectURL(file);

  if (fileUrl) {
    const storeType = file.store.split(':').pop();

    if (RocketChat.settings.get(`FileUpload_S3_Proxy_${storeType}`)) {
      const request = /^https:/.test(fileUrl) ? https : http;
      request.get(fileUrl, fileRes => fileRes.pipe(res));
    } else {
      res.removeHeader('Content-Length');
      res.setHeader('Location', fileUrl);
      res.writeHead(302);
      res.end();
    }
  } else {
    res.end();
  }
};

const copy = function (file, out) {
  const fileUrl = this.store.getRedirectURL(file);

  if (fileUrl) {
    const request = /^https:/.test(fileUrl) ? https : http;
    request.get(fileUrl, fileRes => fileRes.pipe(out));
  } else {
    out.end();
  }
};

const AmazonS3Uploads = new FileUploadClass({
  name: 'AmazonS3:Uploads',
  get,
  copy // store setted bellow

});
const AmazonS3Avatars = new FileUploadClass({
  name: 'AmazonS3:Avatars',
  get,
  copy // store setted bellow

});
const AmazonS3UserDataFiles = new FileUploadClass({
  name: 'AmazonS3:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const Bucket = RocketChat.settings.get('FileUpload_S3_Bucket');
  const Acl = RocketChat.settings.get('FileUpload_S3_Acl');
  const AWSAccessKeyId = RocketChat.settings.get('FileUpload_S3_AWSAccessKeyId');
  const AWSSecretAccessKey = RocketChat.settings.get('FileUpload_S3_AWSSecretAccessKey');
  const URLExpiryTimeSpan = RocketChat.settings.get('FileUpload_S3_URLExpiryTimeSpan');
  const Region = RocketChat.settings.get('FileUpload_S3_Region');
  const SignatureVersion = RocketChat.settings.get('FileUpload_S3_SignatureVersion');
  const ForcePathStyle = RocketChat.settings.get('FileUpload_S3_ForcePathStyle'); // const CDN = RocketChat.settings.get('FileUpload_S3_CDN');

  const BucketURL = RocketChat.settings.get('FileUpload_S3_BucketURL');

  if (!Bucket) {
    return;
  }

  const config = {
    connection: {
      signatureVersion: SignatureVersion,
      s3ForcePathStyle: ForcePathStyle,
      params: {
        Bucket,
        ACL: Acl
      },
      region: Region
    },
    URLExpiryTimeSpan
  };

  if (AWSAccessKeyId) {
    config.connection.accessKeyId = AWSAccessKeyId;
  }

  if (AWSSecretAccessKey) {
    config.connection.secretAccessKey = AWSSecretAccessKey;
  }

  if (BucketURL) {
    config.connection.endpoint = BucketURL;
  }

  AmazonS3Uploads.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3Uploads.name, config);
  AmazonS3Avatars.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3Avatars.name, config);
  AmazonS3UserDataFiles.store = FileUpload.configureUploadsStore('AmazonS3', AmazonS3UserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_S3_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"FileSystem.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/FileSystem.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let fs;
module.watch(require("fs"), {
  default(v) {
    fs = v;
  }

}, 1);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 2);
const FileSystemUploads = new FileUploadClass({
  name: 'FileSystem:Uploads',

  // store setted bellow
  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
        res.setHeader('Content-Type', file.type);
        res.setHeader('Content-Length', file.size);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  },

  copy(file, out) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        this.store.getReadStream(file._id, file).pipe(out);
      }
    } catch (e) {
      out.end();
      return;
    }
  }

});
const FileSystemAvatars = new FileUploadClass({
  name: 'FileSystem:Avatars',

  // store setted bellow
  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  }

});
const FileSystemUserDataFiles = new FileUploadClass({
  name: 'FileSystem:UserDataFiles',

  get(file, req, res) {
    const filePath = this.store.getFilePath(file._id, file);

    try {
      const stat = Meteor.wrapAsync(fs.stat)(filePath);

      if (stat && stat.isFile()) {
        file = FileUpload.addExtensionTo(file);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
        res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
        res.setHeader('Content-Type', file.type);
        res.setHeader('Content-Length', file.size);
        this.store.getReadStream(file._id, file).pipe(res);
      }
    } catch (e) {
      res.writeHead(404);
      res.end();
      return;
    }
  }

});

const createFileSystemStore = _.debounce(function () {
  const options = {
    path: RocketChat.settings.get('FileUpload_FileSystemPath') // '/tmp/uploads/photos',

  };
  FileSystemUploads.store = FileUpload.configureUploadsStore('Local', FileSystemUploads.name, options);
  FileSystemAvatars.store = FileUpload.configureUploadsStore('Local', FileSystemAvatars.name, options);
  FileSystemUserDataFiles.store = FileUpload.configureUploadsStore('Local', FileSystemUserDataFiles.name, options); // DEPRECATED backwards compatibililty (remove)

  UploadFS.getStores().fileSystem = UploadFS.getStores()[FileSystemUploads.name];
}, 500);

RocketChat.settings.get('FileUpload_FileSystemPath', createFileSystemStore);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"GoogleStorage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/GoogleStorage.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/GoogleStorage/server.js"));
let http;
module.watch(require("http"), {
  default(v) {
    http = v;
  }

}, 2);
let https;
module.watch(require("https"), {
  default(v) {
    https = v;
  }

}, 3);

const get = function (file, req, res) {
  this.store.getRedirectURL(file, (err, fileUrl) => {
    if (err) {
      console.error(err);
    }

    if (fileUrl) {
      const storeType = file.store.split(':').pop();

      if (RocketChat.settings.get(`FileUpload_GoogleStorage_Proxy_${storeType}`)) {
        const request = /^https:/.test(fileUrl) ? https : http;
        request.get(fileUrl, fileRes => fileRes.pipe(res));
      } else {
        res.removeHeader('Content-Length');
        res.setHeader('Location', fileUrl);
        res.writeHead(302);
        res.end();
      }
    } else {
      res.end();
    }
  });
};

const copy = function (file, out) {
  this.store.getRedirectURL(file, (err, fileUrl) => {
    if (err) {
      console.error(err);
    }

    if (fileUrl) {
      const request = /^https:/.test(fileUrl) ? https : http;
      request.get(fileUrl, fileRes => fileRes.pipe(out));
    } else {
      out.end();
    }
  });
};

const GoogleCloudStorageUploads = new FileUploadClass({
  name: 'GoogleCloudStorage:Uploads',
  get,
  copy // store setted bellow

});
const GoogleCloudStorageAvatars = new FileUploadClass({
  name: 'GoogleCloudStorage:Avatars',
  get,
  copy // store setted bellow

});
const GoogleCloudStorageUserDataFiles = new FileUploadClass({
  name: 'GoogleCloudStorage:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const bucket = RocketChat.settings.get('FileUpload_GoogleStorage_Bucket');
  const accessId = RocketChat.settings.get('FileUpload_GoogleStorage_AccessId');
  const secret = RocketChat.settings.get('FileUpload_GoogleStorage_Secret');
  const URLExpiryTimeSpan = RocketChat.settings.get('FileUpload_S3_URLExpiryTimeSpan');

  if (!bucket || !accessId || !secret) {
    return;
  }

  const config = {
    connection: {
      credentials: {
        client_email: accessId,
        private_key: secret
      }
    },
    bucket,
    URLExpiryTimeSpan
  };
  GoogleCloudStorageUploads.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageUploads.name, config);
  GoogleCloudStorageAvatars.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageAvatars.name, config);
  GoogleCloudStorageUserDataFiles.store = FileUpload.configureUploadsStore('GoogleStorage', GoogleCloudStorageUserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_GoogleStorage_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"GridFS.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/GridFS.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 0);
let zlib;
module.watch(require("zlib"), {
  default(v) {
    zlib = v;
  }

}, 1);
let util;
module.watch(require("util"), {
  default(v) {
    util = v;
  }

}, 2);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 3);
const logger = new Logger('FileUpload');

function ExtractRange(options) {
  if (!(this instanceof ExtractRange)) {
    return new ExtractRange(options);
  }

  this.start = options.start;
  this.stop = options.stop;
  this.bytes_read = 0;
  stream.Transform.call(this, options);
}

util.inherits(ExtractRange, stream.Transform);

ExtractRange.prototype._transform = function (chunk, enc, cb) {
  if (this.bytes_read > this.stop) {
    // done reading
    this.end();
  } else if (this.bytes_read + chunk.length < this.start) {// this chunk is still before the start byte
  } else {
    let start;
    let stop;

    if (this.start <= this.bytes_read) {
      start = 0;
    } else {
      start = this.start - this.bytes_read;
    }

    if (this.stop - this.bytes_read + 1 < chunk.length) {
      stop = this.stop - this.bytes_read + 1;
    } else {
      stop = chunk.length;
    }

    const newchunk = chunk.slice(start, stop);
    this.push(newchunk);
  }

  this.bytes_read += chunk.length;
  cb();
};

const getByteRange = function (header) {
  if (header) {
    const matches = header.match(/(\d+)-(\d+)/);

    if (matches) {
      return {
        start: parseInt(matches[1], 10),
        stop: parseInt(matches[2], 10)
      };
    }
  }

  return null;
}; // code from: https://github.com/jalik/jalik-ufs/blob/master/ufs-server.js#L310


const readFromGridFS = function (storeName, fileId, file, req, res) {
  const store = UploadFS.getStore(storeName);
  const rs = store.getReadStream(fileId, file);
  const ws = new stream.PassThrough();
  [rs, ws].forEach(stream => stream.on('error', function (err) {
    store.onReadError.call(store, err, fileId, file);
    res.end();
  }));
  ws.on('close', function () {
    // Close output stream at the end
    ws.emit('end');
  });
  const accept = req.headers['accept-encoding'] || ''; // Transform stream

  store.transformRead(rs, ws, fileId, file, req);
  const range = getByteRange(req.headers.range);
  let out_of_range = false;

  if (range) {
    out_of_range = range.start > file.size || range.stop <= range.start || range.stop > file.size;
  } // Compress data using gzip


  if (accept.match(/\bgzip\b/) && range === null) {
    res.setHeader('Content-Encoding', 'gzip');
    res.removeHeader('Content-Length');
    res.writeHead(200);
    ws.pipe(zlib.createGzip()).pipe(res);
  } else if (accept.match(/\bdeflate\b/) && range === null) {
    // Compress data using deflate
    res.setHeader('Content-Encoding', 'deflate');
    res.removeHeader('Content-Length');
    res.writeHead(200);
    ws.pipe(zlib.createDeflate()).pipe(res);
  } else if (range && out_of_range) {
    // out of range request, return 416
    res.removeHeader('Content-Length');
    res.removeHeader('Content-Type');
    res.removeHeader('Content-Disposition');
    res.removeHeader('Last-Modified');
    res.setHeader('Content-Range', `bytes */${file.size}`);
    res.writeHead(416);
    res.end();
  } else if (range) {
    res.setHeader('Content-Range', `bytes ${range.start}-${range.stop}/${file.size}`);
    res.removeHeader('Content-Length');
    res.setHeader('Content-Length', range.stop - range.start + 1);
    res.writeHead(206);
    logger.debug('File upload extracting range');
    ws.pipe(new ExtractRange({
      start: range.start,
      stop: range.stop
    })).pipe(res);
  } else {
    res.writeHead(200);
    ws.pipe(res);
  }
};

const copyFromGridFS = function (storeName, fileId, file, out) {
  const store = UploadFS.getStore(storeName);
  const rs = store.getReadStream(fileId, file);
  [rs, out].forEach(stream => stream.on('error', function (err) {
    store.onReadError.call(store, err, fileId, file);
    out.end();
  }));
  rs.pipe(out);
};

FileUpload.configureUploadsStore('GridFS', 'GridFS:Uploads', {
  collectionName: 'rocketchat_uploads'
});
FileUpload.configureUploadsStore('GridFS', 'GridFS:UserDataFiles', {
  collectionName: 'rocketchat_userDataFiles'
}); // DEPRECATED: backwards compatibility (remove)

UploadFS.getStores().rocketchat_uploads = UploadFS.getStores()['GridFS:Uploads'];
FileUpload.configureUploadsStore('GridFS', 'GridFS:Avatars', {
  collectionName: 'rocketchat_avatars'
});
new FileUploadClass({
  name: 'GridFS:Uploads',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Length', file.size);
    return readFromGridFS(file.store, file._id, file, req, res);
  },

  copy(file, out) {
    copyFromGridFS(file.store, file._id, file, out);
  }

});
new FileUploadClass({
  name: 'GridFS:UserDataFiles',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Last-Modified', file.uploadedAt.toUTCString());
    res.setHeader('Content-Type', file.type);
    res.setHeader('Content-Length', file.size);
    return readFromGridFS(file.store, file._id, file, req, res);
  },

  copy(file, out) {
    copyFromGridFS(file.store, file._id, file, out);
  }

});
new FileUploadClass({
  name: 'GridFS:Avatars',

  get(file, req, res) {
    file = FileUpload.addExtensionTo(file);
    return readFromGridFS(file.store, file._id, file, req, res);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Slingshot_DEPRECATED.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/Slingshot_DEPRECATED.js                                               //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

const configureSlingshot = _.debounce(() => {
  const type = RocketChat.settings.get('FileUpload_Storage_Type');
  const bucket = RocketChat.settings.get('FileUpload_S3_Bucket');
  const acl = RocketChat.settings.get('FileUpload_S3_Acl');
  const accessKey = RocketChat.settings.get('FileUpload_S3_AWSAccessKeyId');
  const secretKey = RocketChat.settings.get('FileUpload_S3_AWSSecretAccessKey');
  const cdn = RocketChat.settings.get('FileUpload_S3_CDN');
  const region = RocketChat.settings.get('FileUpload_S3_Region');
  const bucketUrl = RocketChat.settings.get('FileUpload_S3_BucketURL');
  delete Slingshot._directives['rocketchat-uploads'];

  if (type === 'AmazonS3' && !_.isEmpty(bucket) && !_.isEmpty(accessKey) && !_.isEmpty(secretKey)) {
    if (Slingshot._directives['rocketchat-uploads']) {
      delete Slingshot._directives['rocketchat-uploads'];
    }

    const config = {
      bucket,

      key(file, metaContext) {
        const id = Random.id();
        const path = `${RocketChat.settings.get('uniqueID')}/uploads/${metaContext.rid}/${this.userId}/${id}`;
        const upload = {
          _id: id,
          rid: metaContext.rid,
          AmazonS3: {
            path
          }
        };
        RocketChat.models.Uploads.insertFileInit(this.userId, 'AmazonS3:Uploads', file, upload);
        return path;
      },

      AWSAccessKeyId: accessKey,
      AWSSecretAccessKey: secretKey
    };

    if (!_.isEmpty(acl)) {
      config.acl = acl;
    }

    if (!_.isEmpty(cdn)) {
      config.cdn = cdn;
    }

    if (!_.isEmpty(region)) {
      config.region = region;
    }

    if (!_.isEmpty(bucketUrl)) {
      config.bucketUrl = bucketUrl;
    }

    try {
      Slingshot.createDirective('rocketchat-uploads', Slingshot.S3Storage, config);
    } catch (e) {
      console.error('Error configuring S3 ->', e.message);
    }
  }
}, 500);

RocketChat.settings.get('FileUpload_Storage_Type', configureSlingshot);
RocketChat.settings.get(/^FileUpload_S3_/, configureSlingshot);

const createGoogleStorageDirective = _.debounce(() => {
  const type = RocketChat.settings.get('FileUpload_Storage_Type');
  const bucket = RocketChat.settings.get('FileUpload_GoogleStorage_Bucket');
  const accessId = RocketChat.settings.get('FileUpload_GoogleStorage_AccessId');
  const secret = RocketChat.settings.get('FileUpload_GoogleStorage_Secret');
  delete Slingshot._directives['rocketchat-uploads-gs'];

  if (type === 'GoogleCloudStorage' && !_.isEmpty(secret) && !_.isEmpty(accessId) && !_.isEmpty(bucket)) {
    if (Slingshot._directives['rocketchat-uploads-gs']) {
      delete Slingshot._directives['rocketchat-uploads-gs'];
    }

    const config = {
      bucket,
      GoogleAccessId: accessId,
      GoogleSecretKey: secret,

      key(file, metaContext) {
        const id = Random.id();
        const path = `${RocketChat.settings.get('uniqueID')}/uploads/${metaContext.rid}/${this.userId}/${id}`;
        const upload = {
          _id: id,
          rid: metaContext.rid,
          GoogleStorage: {
            path
          }
        };
        RocketChat.models.Uploads.insertFileInit(this.userId, 'GoogleCloudStorage:Uploads', file, upload);
        return path;
      }

    };

    try {
      Slingshot.createDirective('rocketchat-uploads-gs', Slingshot.GoogleCloud, config);
    } catch (e) {
      console.error('Error configuring GoogleCloudStorage ->', e.message);
    }
  }
}, 500);

RocketChat.settings.get('FileUpload_Storage_Type', createGoogleStorageDirective);
RocketChat.settings.get(/^FileUpload_GoogleStorage_/, createGoogleStorageDirective);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Webdav.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/config/Webdav.js                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let FileUploadClass;
module.watch(require("../lib/FileUpload"), {
  FileUploadClass(v) {
    FileUploadClass = v;
  }

}, 1);
module.watch(require("../../ufs/Webdav/server.js"));

const get = function (file, req, res) {
  this.store.getReadStream(file._id, file).pipe(res);
};

const copy = function (file, out) {
  this.store.getReadStream(file._id, file).pipe(out);
};

const WebdavUploads = new FileUploadClass({
  name: 'Webdav:Uploads',
  get,
  copy // store setted bellow

});
const WebdavAvatars = new FileUploadClass({
  name: 'Webdav:Avatars',
  get,
  copy // store setted bellow

});
const WebdavUserDataFiles = new FileUploadClass({
  name: 'Webdav:UserDataFiles',
  get,
  copy // store setted bellow

});

const configure = _.debounce(function () {
  const uploadFolderPath = RocketChat.settings.get('FileUpload_Webdav_Upload_Folder_Path');
  const server = RocketChat.settings.get('FileUpload_Webdav_Server_URL');
  const username = RocketChat.settings.get('FileUpload_Webdav_Username');
  const password = RocketChat.settings.get('FileUpload_Webdav_Password');

  if (!server || !username || !password) {
    return;
  }

  const config = {
    connection: {
      credentials: {
        server,
        username,
        password
      }
    },
    uploadFolderPath
  };
  WebdavUploads.store = FileUpload.configureUploadsStore('Webdav', WebdavUploads.name, config);
  WebdavAvatars.store = FileUpload.configureUploadsStore('Webdav', WebdavAvatars.name, config);
  WebdavUserDataFiles.store = FileUpload.configureUploadsStore('Webdav', WebdavUserDataFiles.name, config);
}, 500);

RocketChat.settings.get(/^FileUpload_Webdav_/, configure);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"sendFileMessage.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/methods/sendFileMessage.js                                                   //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'sendFileMessage'(roomId, store, file, msgData = {}) {
    return Promise.asyncApply(() => {
      if (!Meteor.userId()) {
        throw new Meteor.Error('error-invalid-user', 'Invalid user', {
          method: 'sendFileMessage'
        });
      }

      const room = Meteor.call('canAccessRoom', roomId, Meteor.userId());

      if (!room) {
        return false;
      }

      check(msgData, {
        avatar: Match.Optional(String),
        emoji: Match.Optional(String),
        alias: Match.Optional(String),
        groupable: Match.Optional(Boolean),
        msg: Match.Optional(String)
      });
      RocketChat.models.Uploads.updateFileComplete(file._id, Meteor.userId(), _.omit(file, '_id'));
      const fileUrl = `/file-upload/${file._id}/${encodeURI(file.name)}`;
      const attachment = {
        title: file.name,
        type: 'file',
        description: file.description,
        title_link: fileUrl,
        title_link_download: true
      };

      if (/^image\/.+/.test(file.type)) {
        attachment.image_url = fileUrl;
        attachment.image_type = file.type;
        attachment.image_size = file.size;

        if (file.identify && file.identify.size) {
          attachment.image_dimensions = file.identify.size;
        }

        attachment.image_preview = Promise.await(FileUpload.resizeImagePreview(file));
      } else if (/^audio\/.+/.test(file.type)) {
        attachment.audio_url = fileUrl;
        attachment.audio_type = file.type;
        attachment.audio_size = file.size;
      } else if (/^video\/.+/.test(file.type)) {
        attachment.video_url = fileUrl;
        attachment.video_type = file.type;
        attachment.video_size = file.size;
      }

      const user = Meteor.user();
      let msg = Object.assign({
        _id: Random.id(),
        rid: roomId,
        ts: new Date(),
        msg: '',
        file: {
          _id: file._id,
          name: file.name,
          type: file.type
        },
        groupable: false,
        attachments: [attachment]
      }, msgData);
      msg = Meteor.call('sendMessage', msg);
      Meteor.defer(() => RocketChat.callbacks.run('afterFileUpload', {
        user,
        room,
        message: msg
      }));
      return msg;
    });
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getS3FileUrl.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/methods/getS3FileUrl.js                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/* globals UploadFS */
let protectedFiles;
RocketChat.settings.get('FileUpload_ProtectFiles', function (key, value) {
  protectedFiles = value;
});
Meteor.methods({
  getS3FileUrl(fileId) {
    if (protectedFiles && !Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'sendFileMessage'
      });
    }

    const file = RocketChat.models.Uploads.findOneById(fileId);
    return UploadFS.getStore('AmazonS3:Uploads').getRedirectURL(file);
  }

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup":{"settings.js":function(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/server/startup/settings.js                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
RocketChat.settings.addGroup('FileUpload', function () {
  this.add('FileUpload_Enabled', true, {
    type: 'boolean',
    public: true
  });
  this.add('FileUpload_MaxFileSize', 104857600, {
    type: 'int',
    public: true,
    i18nDescription: 'FileUpload_MaxFileSizeDescription'
  });
  this.add('FileUpload_MediaTypeWhiteList', 'image/*,audio/*,video/*,application/zip,application/x-rar-compressed,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document', {
    type: 'string',
    public: true,
    i18nDescription: 'FileUpload_MediaTypeWhiteListDescription'
  });
  this.add('FileUpload_ProtectFiles', true, {
    type: 'boolean',
    public: true,
    i18nDescription: 'FileUpload_ProtectFilesDescription'
  });
  this.add('FileUpload_Storage_Type', 'GridFS', {
    type: 'select',
    values: [{
      key: 'GridFS',
      i18nLabel: 'GridFS'
    }, {
      key: 'AmazonS3',
      i18nLabel: 'AmazonS3'
    }, {
      key: 'GoogleCloudStorage',
      i18nLabel: 'GoogleCloudStorage'
    }, {
      key: 'Webdav',
      i18nLabel: 'WebDAV'
    }, {
      key: 'FileSystem',
      i18nLabel: 'FileSystem'
    }],
    public: true
  });
  this.section('Amazon S3', function () {
    this.add('FileUpload_S3_Bucket', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Acl', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_AWSAccessKeyId', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_AWSSecretAccessKey', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_CDN', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Region', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_BucketURL', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      },
      i18nDescription: 'Override_URL_to_which_files_are_uploaded_This_url_also_used_for_downloads_unless_a_CDN_is_given.'
    });
    this.add('FileUpload_S3_SignatureVersion', 'v4', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_ForcePathStyle', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_URLExpiryTimeSpan', 120, {
      type: 'int',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      },
      i18nDescription: 'FileUpload_S3_URLExpiryTimeSpan_Description'
    });
    this.add('FileUpload_S3_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
    this.add('FileUpload_S3_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'AmazonS3'
      }
    });
  });
  this.section('Google Cloud Storage', function () {
    this.add('FileUpload_GoogleStorage_Bucket', '', {
      type: 'string',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_AccessId', '', {
      type: 'string',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Secret', '', {
      type: 'string',
      multiline: true,
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
    this.add('FileUpload_GoogleStorage_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'GoogleCloudStorage'
      }
    });
  });
  this.section('File System', function () {
    this.add('FileUpload_FileSystemPath', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'FileSystem'
      }
    });
  });
  this.section('WebDAV', function () {
    this.add('FileUpload_Webdav_Upload_Folder_Path', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Server_URL', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Username', '', {
      type: 'string',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Password', '', {
      type: 'password',
      private: true,
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Proxy_Avatars', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
    this.add('FileUpload_Webdav_Proxy_Uploads', false, {
      type: 'boolean',
      enableQuery: {
        _id: 'FileUpload_Storage_Type',
        value: 'Webdav'
      }
    });
  });
  this.add('FileUpload_Enabled_Direct', true, {
    type: 'boolean',
    public: true
  });
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"ufs":{"AmazonS3":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/AmazonS3/server.js                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  AmazonS3Store: () => AmazonS3Store
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
  }

}, 0);

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 1);
let S3;
module.watch(require("aws-sdk/clients/s3"), {
  default(v) {
    S3 = v;
  }

}, 2);
let stream;
module.watch(require("stream"), {
  default(v) {
    stream = v;
  }

}, 3);

class AmazonS3Store extends UploadFS.Store {
  constructor(options) {
    // Default options
    // options.secretAccessKey,
    // options.accessKeyId,
    // options.region,
    // options.sslEnabled // optional
    options = _.extend({
      httpOptions: {
        timeout: 6000,
        agent: false
      }
    }, options);
    super(options);
    const classOptions = options;
    const s3 = new S3(options.connection);

    options.getPath = options.getPath || function (file) {
      return file._id;
    };

    this.getPath = function (file) {
      if (file.AmazonS3) {
        return file.AmazonS3.path;
      } // Compatibility
      // TODO: Migration


      if (file.s3) {
        return file.s3.path + file._id;
      }
    };

    this.getRedirectURL = function (file) {
      const params = {
        Key: this.getPath(file),
        Expires: classOptions.URLExpiryTimeSpan
      };
      return s3.getSignedUrl('getObject', params);
    };
    /**
     * Creates the file in the collection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.AmazonS3 = {
        path: this.options.getPath(file)
      };
      file.store = this.options.name; // assign store to file

      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      const params = {
        Key: this.getPath(file)
      };
      s3.deleteObject(params, (err, data) => {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const params = {
        Key: this.getPath(file)
      };

      if (options.start && options.end) {
        params.Range = `${options.start} - ${options.end}`;
      }

      return s3.getObject(params).createReadStream();
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getWriteStream = function (fileId, file
    /* , options*/
    ) {
      const writeStream = new stream.PassThrough();
      writeStream.length = file.size;
      writeStream.on('newListener', (event, listener) => {
        if (event === 'finish') {
          process.nextTick(() => {
            writeStream.removeListener(event, listener);
            writeStream.on('real_finish', listener);
          });
        }
      });
      s3.putObject({
        Key: this.getPath(file),
        Body: writeStream,
        ContentType: file.type,
        ContentDisposition: `inline; filename="${encodeURI(file.name)}"`
      }, error => {
        if (error) {
          console.error(error);
        }

        writeStream.emit('real_finish');
      });
      return writeStream;
    };
  }

}

// Add store to UFS namespace
UploadFS.store.AmazonS3 = AmazonS3Store;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"GoogleStorage":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/GoogleStorage/server.js                                                         //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  GoogleStorageStore: () => GoogleStorageStore
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
  }

}, 0);
let gcStorage;
module.watch(require("@google-cloud/storage"), {
  default(v) {
    gcStorage = v;
  }

}, 1);

class GoogleStorageStore extends UploadFS.Store {
  constructor(options) {
    super(options);
    const gcs = gcStorage(options.connection);
    this.bucket = gcs.bucket(options.bucket);

    options.getPath = options.getPath || function (file) {
      return file._id;
    };

    this.getPath = function (file) {
      if (file.GoogleStorage) {
        return file.GoogleStorage.path;
      } // Compatibility
      // TODO: Migration


      if (file.googleCloudStorage) {
        return file.googleCloudStorage.path + file._id;
      }
    };

    this.getRedirectURL = function (file, callback) {
      const params = {
        action: 'read',
        responseDisposition: 'inline',
        expires: Date.now() + this.options.URLExpiryTimeSpan * 1000
      };
      this.bucket.file(this.getPath(file)).getSignedUrl(params, callback);
    };
    /**
     * Creates the file in the collection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.GoogleStorage = {
        path: this.options.getPath(file)
      };
      file.store = this.options.name; // assign store to file

      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      this.bucket.file(this.getPath(file)).delete(function (err, data) {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const config = {};

      if (options.start != null) {
        config.start = options.start;
      }

      if (options.end != null) {
        config.end = options.end;
      }

      return this.bucket.file(this.getPath(file)).createReadStream(config);
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getWriteStream = function (fileId, file
    /* , options*/
    ) {
      return this.bucket.file(this.getPath(file)).createWriteStream({
        gzip: false,
        metadata: {
          contentType: file.type,
          contentDisposition: `inline; filename=${file.name}` // metadata: {
          // 	custom: 'metadata'
          // }

        }
      });
    };
  }

}

// Add store to UFS namespace
UploadFS.store.GoogleStorage = GoogleStorageStore;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"Webdav":{"server.js":function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/rocketchat_file-upload/ufs/Webdav/server.js                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  WebdavStore: () => WebdavStore
});
let UploadFS;
module.watch(require("meteor/jalik:ufs"), {
  UploadFS(v) {
    UploadFS = v;
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

class WebdavStore extends UploadFS.Store {
  constructor(options) {
    super(options);
    const client = new Webdav(options.connection.credentials.server, options.connection.credentials.username, options.connection.credentials.password);

    options.getPath = function (file) {
      if (options.uploadFolderPath[options.uploadFolderPath.length - 1] !== '/') {
        options.uploadFolderPath += '/';
      }

      return options.uploadFolderPath + file._id;
    };

    client.stat(options.uploadFolderPath).catch(function (err) {
      if (err.status === '404') {
        client.createDirectory(options.uploadFolderPath);
      }
    });
    /**
     * Returns the file path
     * @param file
     * @return {string}
     */

    this.getPath = function (file) {
      if (file.Webdav) {
        return file.Webdav.path;
      }
    };
    /**
     * Creates the file in the col lection
     * @param file
     * @param callback
     * @return {string}
     */


    this.create = function (file, callback) {
      check(file, Object);

      if (file._id == null) {
        file._id = Random.id();
      }

      file.Webdav = {
        path: options.getPath(file)
      };
      file.store = this.options.name;
      return this.getCollection().insert(file, callback);
    };
    /**
     * Removes the file
     * @param fileId
     * @param callback
     */


    this.delete = function (fileId, callback) {
      const file = this.getCollection().findOne({
        _id: fileId
      });
      client.deleteFile(this.getPath(file), (err, data) => {
        if (err) {
          console.error(err);
        }

        callback && callback(err, data);
      });
    };
    /**
     * Returns the file read stream
     * @param fileId
     * @param file
     * @param options
     * @return {*}
     */


    this.getReadStream = function (fileId, file, options = {}) {
      const range = {};

      if (options.start != null) {
        range.start = options.start;
      }

      if (options.end != null) {
        range.end = options.end;
      }

      return client.createReadStream(this.getPath(file), options);
    };
    /**
     * Returns the file write stream
     * @param fileId
     * @param file
     * @return {*}
     */


    this.getWriteStream = function (fileId, file) {
      const writeStream = new stream.PassThrough();
      const webdavStream = client.createWriteStream(this.getPath(file)); // TODO remove timeout when UploadFS bug resolved

      const newListenerCallback = (event, listener) => {
        if (event === 'finish') {
          process.nextTick(() => {
            writeStream.removeListener(event, listener);
            writeStream.removeListener('newListener', newListenerCallback);
            writeStream.on(event, function () {
              setTimeout(listener, 500);
            });
          });
        }
      };

      writeStream.on('newListener', newListenerCallback);
      writeStream.pipe(webdavStream);
      return writeStream;
    };
  }

}

// Add store to UFS namespace
UploadFS.store.Webdav = WebdavStore;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:file-upload/globalFileRestrictions.js");
require("/node_modules/meteor/rocketchat:file-upload/lib/FileUpload.js");
require("/node_modules/meteor/rocketchat:file-upload/lib/FileUploadBase.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/FileUpload.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/proxy.js");
require("/node_modules/meteor/rocketchat:file-upload/server/lib/requests.js");
require("/node_modules/meteor/rocketchat:file-upload/server/config/_configUploadStorage.js");
require("/node_modules/meteor/rocketchat:file-upload/server/methods/sendFileMessage.js");
require("/node_modules/meteor/rocketchat:file-upload/server/methods/getS3FileUrl.js");
require("/node_modules/meteor/rocketchat:file-upload/server/startup/settings.js");

/* Exports */
Package._define("rocketchat:file-upload", {
  fileUploadHandler: fileUploadHandler,
  FileUpload: FileUpload
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_file-upload.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9nbG9iYWxGaWxlUmVzdHJpY3Rpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL2xpYi9GaWxlVXBsb2FkLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL2xpYi9GaWxlVXBsb2FkQmFzZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvbGliL0ZpbGVVcGxvYWQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2xpYi9wcm94eS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvbGliL3JlcXVlc3RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvX2NvbmZpZ1VwbG9hZFN0b3JhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9BbWF6b25TMy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvY29uZmlnL0ZpbGVTeXN0ZW0uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9Hb29nbGVTdG9yYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvR3JpZEZTLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9jb25maWcvU2xpbmdzaG90X0RFUFJFQ0FURUQuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL2NvbmZpZy9XZWJkYXYuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6ZmlsZS11cGxvYWQvc2VydmVyL21ldGhvZHMvc2VuZEZpbGVNZXNzYWdlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3NlcnZlci9tZXRob2RzL2dldFMzRmlsZVVybC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC9zZXJ2ZXIvc3RhcnR1cC9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC91ZnMvQW1hem9uUzMvc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmZpbGUtdXBsb2FkL3Vmcy9Hb29nbGVTdG9yYWdlL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpmaWxlLXVwbG9hZC91ZnMvV2ViZGF2L3NlcnZlci5qcyJdLCJuYW1lcyI6WyJmaWxlc2l6ZSIsIm1vZHVsZSIsIndhdGNoIiwicmVxdWlyZSIsImRlZmF1bHQiLCJ2Iiwic2xpbmdTaG90Q29uZmlnIiwiYXV0aG9yaXplIiwiZmlsZSIsInVzZXJJZCIsIk1ldGVvciIsIkVycm9yIiwiUm9ja2V0Q2hhdCIsImZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUiLCJ0eXBlIiwiVEFQaTE4biIsIl9fIiwibWF4RmlsZVNpemUiLCJzZXR0aW5ncyIsImdldCIsInNpemUiLCJtYXhTaXplIiwiYWxsb3dlZEZpbGVUeXBlcyIsIlNsaW5nc2hvdCIsImZpbGVSZXN0cmljdGlvbnMiLCJGaWxlVXBsb2FkIiwidmFsaWRhdGVGaWxlVXBsb2FkIiwiTWF0Y2giLCJ0ZXN0IiwicmlkIiwiU3RyaW5nIiwidXNlciIsInJvb20iLCJtb2RlbHMiLCJSb29tcyIsImZpbmRPbmVCeUlkIiwiZGlyZWN0TWVzc2FnZUFsbG93IiwiZmlsZVVwbG9hZEFsbG93ZWQiLCJhdXRoeiIsImNhbkFjY2Vzc1Jvb20iLCJsYW5ndWFnZSIsInJlYXNvbiIsInQiLCJrZXkiLCJ2YWx1ZSIsInBhcnNlSW50IiwiZSIsIlNldHRpbmdzIiwicGFja2FnZVZhbHVlIiwiXyIsIlVwbG9hZEZTIiwiY29uZmlnIiwiZGVmYXVsdFN0b3JlUGVybWlzc2lvbnMiLCJTdG9yZVBlcm1pc3Npb25zIiwiaW5zZXJ0IiwiZG9jIiwibWVzc2FnZV9pZCIsImluZGV4T2YiLCJzdG9yZSIsInNwbGl0IiwicG9wIiwidXBkYXRlIiwiaGFzUGVybWlzc2lvbiIsInJlbW92ZSIsIkZpbGVVcGxvYWRCYXNlIiwiY29uc3RydWN0b3IiLCJtZXRhIiwiaWQiLCJSYW5kb20iLCJnZXRQcm9ncmVzcyIsImdldEZpbGVOYW1lIiwibmFtZSIsInN0YXJ0IiwiY2FsbGJhY2siLCJoYW5kbGVyIiwiVXBsb2FkZXIiLCJkYXRhIiwib25FcnJvciIsImVyciIsIm9uQ29tcGxldGUiLCJmaWxlRGF0YSIsInBpY2siLCJ1cmwiLCJyZXBsYWNlIiwiYWJzb2x1dGVVcmwiLCJvcHRpb25zIiwib25Qcm9ncmVzcyIsInByb2dyZXNzIiwic3RvcCIsImV4cG9ydCIsIkZpbGVVcGxvYWRDbGFzcyIsImZzIiwic3RyZWFtIiwibWltZSIsIkZ1dHVyZSIsInNoYXJwIiwiQ29va2llcyIsImNvb2tpZSIsIk9iamVjdCIsImFzc2lnbiIsImhhbmRsZXJzIiwiY29uZmlndXJlVXBsb2Fkc1N0b3JlIiwic3RvcmVzIiwiZ2V0U3RvcmVzIiwiZGVmYXVsdFVwbG9hZHMiLCJjb2xsZWN0aW9uIiwiVXBsb2FkcyIsIm1vZGVsIiwiZmlsdGVyIiwiRmlsdGVyIiwib25DaGVjayIsImdldFBhdGgiLCJfaWQiLCJvblZhbGlkYXRlIiwidXBsb2Fkc09uVmFsaWRhdGUiLCJvblJlYWQiLCJmaWxlSWQiLCJyZXEiLCJyZXMiLCJyZXF1ZXN0Q2FuQWNjZXNzRmlsZXMiLCJ3cml0ZUhlYWQiLCJzZXRIZWFkZXIiLCJlbmNvZGVVUklDb21wb25lbnQiLCJkZWZhdWx0QXZhdGFycyIsIkF2YXRhcnMiLCJhdmF0YXJzT25WYWxpZGF0ZSIsIm9uRmluaXNoVXBsb2FkIiwiYXZhdGFyc09uRmluaXNoVXBsb2FkIiwiZGVmYXVsdFVzZXJEYXRhRmlsZXMiLCJVc2VyRGF0YUZpbGVzIiwidGVtcEZpbGVQYXRoIiwiZ2V0VGVtcEZpbGVQYXRoIiwiaGVpZ2h0IiwiZnV0dXJlIiwicyIsInJvdGF0ZSIsIm1ldGFkYXRhIiwiYmluZEVudmlyb25tZW50IiwidG9Gb3JtYXQiLCJmb3JtYXQiLCJqcGVnIiwicmVzaXplIiwiTWF0aCIsIm1pbiIsIndpZHRoIiwiSW5maW5pdHkiLCJwaXBlIiwiYmFja2dyb3VuZCIsImVtYmVkIiwidG9CdWZmZXIiLCJ0aGVuIiwib3V0cHV0QnVmZmVyIiwid3JpdGVGaWxlIiwiY29uc29sZSIsImVycm9yIiwibHN0YXRTeW5jIiwiZ2V0Q29sbGVjdGlvbiIsImRpcmVjdCIsIiRzZXQiLCJyZXR1cm4iLCJ3YWl0IiwicmVzaXplSW1hZ2VQcmV2aWV3IiwiYWRkRXh0ZW5zaW9uVG8iLCJpbWFnZSIsImdldFN0b3JlIiwiX3N0b3JlIiwiZ2V0UmVhZFN0cmVhbSIsInRyYW5zZm9ybWVyIiwibWF4IiwiYmx1ciIsInJlc3VsdCIsIm91dCIsInRvU3RyaW5nIiwidG1wRmlsZSIsImZ1dCIsImlkZW50aWZ5Iiwib3JpZW50YXRpb24iLCJ0b0ZpbGUiLCJ1bmxpbmsiLCJyZW5hbWUiLCJjYXRjaCIsIlVzZXJzIiwib2xkQXZhdGFyIiwiZmluZE9uZUJ5TmFtZSIsInVzZXJuYW1lIiwiZGVsZXRlRmlsZSIsInVwZGF0ZUZpbGVOYW1lQnlJZCIsImhlYWRlcnMiLCJxdWVyeSIsInJjX3VpZCIsInJjX3Rva2VuIiwicmNfcmlkIiwicmNfcm9vbV90eXBlIiwiaXNBdXRob3JpemVkQnlDb29raWVzIiwiZmluZE9uZUJ5SWRBbmRMb2dpblRva2VuIiwiaXNBdXRob3JpemVkQnlIZWFkZXJzIiwiaXNBdXRob3JpemVkQnlSb29tIiwicm9vbVR5cGVzIiwiZ2V0Q29uZmlnIiwiY2FuQWNjZXNzVXBsb2FkZWRGaWxlIiwibG9va3VwIiwiZXh0IiwiZXh0ZW5zaW9uIiwiUmVnRXhwIiwibW9kZWxOYW1lIiwic3RvcmFnZVR5cGUiLCJoYW5kbGVyTmFtZSIsImdldFN0b3JlQnlOYW1lIiwibmV4dCIsImVuZCIsImNvcHkiLCJ0YXJnZXRGaWxlIiwiY3JlYXRlV3JpdGVTdHJlYW0iLCJnZXRNb2RlbEZyb21OYW1lIiwiZGVsZXRlIiwiZGVsZXRlQnlJZCIsImRlbGV0ZUJ5TmFtZSIsImZpbGVOYW1lIiwic3RyZWFtT3JCdWZmZXIiLCJjYiIsImdldEZpbHRlciIsImNoZWNrIiwiY3JlYXRlIiwidG9rZW4iLCJjcmVhdGVUb2tlbiIsIkJ1ZmZlciIsIndyaXRlRmlsZVN5bmMiLCJjYWxsIiwiaHR0cCIsIlVSTCIsImxvZ2dlciIsIkxvZ2dlciIsIldlYkFwcCIsImNvbm5lY3RIYW5kbGVycyIsInN0YWNrIiwidW5zaGlmdCIsInJvdXRlIiwiaGFuZGxlIiwic3RvcmVzUGF0aCIsImRlYnVnIiwibWV0aG9kIiwicGFyc2VkVXJsIiwicGFyc2UiLCJwYXRoIiwicGF0aG5hbWUiLCJzdWJzdHIiLCJsZW5ndGgiLCJyZWdFeHAiLCJtYXRjaCIsImV4ZWMiLCJmaW5kT25lIiwidW5kZWZpbmVkIiwiaW5zdGFuY2VJZCIsIkluc3RhbmNlU3RhdHVzIiwiaW5zdGFuY2UiLCJleHRyYUluZm9ybWF0aW9uIiwiaG9zdCIsInByb2Nlc3MiLCJlbnYiLCJJTlNUQU5DRV9JUCIsImlzRG9ja2VyIiwicG9ydCIsImhvc3RuYW1lIiwib3JpZ2luYWxVcmwiLCJwcm94eSIsInJlcXVlc3QiLCJwcm94eV9yZXMiLCJ1c2UiLCJwdWJsaWMiLCJzYW5kc3Rvcm0iLCJjb25maWdTdG9yZSIsImRlYm91bmNlIiwibG9nIiwiaHR0cHMiLCJmaWxlVXJsIiwiZ2V0UmVkaXJlY3RVUkwiLCJzdG9yZVR5cGUiLCJmaWxlUmVzIiwicmVtb3ZlSGVhZGVyIiwiQW1hem9uUzNVcGxvYWRzIiwiQW1hem9uUzNBdmF0YXJzIiwiQW1hem9uUzNVc2VyRGF0YUZpbGVzIiwiY29uZmlndXJlIiwiQnVja2V0IiwiQWNsIiwiQVdTQWNjZXNzS2V5SWQiLCJBV1NTZWNyZXRBY2Nlc3NLZXkiLCJVUkxFeHBpcnlUaW1lU3BhbiIsIlJlZ2lvbiIsIlNpZ25hdHVyZVZlcnNpb24iLCJGb3JjZVBhdGhTdHlsZSIsIkJ1Y2tldFVSTCIsImNvbm5lY3Rpb24iLCJzaWduYXR1cmVWZXJzaW9uIiwiczNGb3JjZVBhdGhTdHlsZSIsInBhcmFtcyIsIkFDTCIsInJlZ2lvbiIsImFjY2Vzc0tleUlkIiwic2VjcmV0QWNjZXNzS2V5IiwiZW5kcG9pbnQiLCJGaWxlU3lzdGVtVXBsb2FkcyIsImZpbGVQYXRoIiwiZ2V0RmlsZVBhdGgiLCJzdGF0Iiwid3JhcEFzeW5jIiwiaXNGaWxlIiwidXBsb2FkZWRBdCIsInRvVVRDU3RyaW5nIiwiRmlsZVN5c3RlbUF2YXRhcnMiLCJGaWxlU3lzdGVtVXNlckRhdGFGaWxlcyIsImNyZWF0ZUZpbGVTeXN0ZW1TdG9yZSIsImZpbGVTeXN0ZW0iLCJHb29nbGVDbG91ZFN0b3JhZ2VVcGxvYWRzIiwiR29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycyIsIkdvb2dsZUNsb3VkU3RvcmFnZVVzZXJEYXRhRmlsZXMiLCJidWNrZXQiLCJhY2Nlc3NJZCIsInNlY3JldCIsImNyZWRlbnRpYWxzIiwiY2xpZW50X2VtYWlsIiwicHJpdmF0ZV9rZXkiLCJ6bGliIiwidXRpbCIsIkV4dHJhY3RSYW5nZSIsImJ5dGVzX3JlYWQiLCJUcmFuc2Zvcm0iLCJpbmhlcml0cyIsInByb3RvdHlwZSIsIl90cmFuc2Zvcm0iLCJjaHVuayIsImVuYyIsIm5ld2NodW5rIiwic2xpY2UiLCJwdXNoIiwiZ2V0Qnl0ZVJhbmdlIiwiaGVhZGVyIiwibWF0Y2hlcyIsInJlYWRGcm9tR3JpZEZTIiwic3RvcmVOYW1lIiwicnMiLCJ3cyIsIlBhc3NUaHJvdWdoIiwiZm9yRWFjaCIsIm9uIiwib25SZWFkRXJyb3IiLCJlbWl0IiwiYWNjZXB0IiwidHJhbnNmb3JtUmVhZCIsInJhbmdlIiwib3V0X29mX3JhbmdlIiwiY3JlYXRlR3ppcCIsImNyZWF0ZURlZmxhdGUiLCJjb3B5RnJvbUdyaWRGUyIsImNvbGxlY3Rpb25OYW1lIiwicm9ja2V0Y2hhdF91cGxvYWRzIiwiY29uZmlndXJlU2xpbmdzaG90IiwiYWNsIiwiYWNjZXNzS2V5Iiwic2VjcmV0S2V5IiwiY2RuIiwiYnVja2V0VXJsIiwiX2RpcmVjdGl2ZXMiLCJpc0VtcHR5IiwibWV0YUNvbnRleHQiLCJ1cGxvYWQiLCJBbWF6b25TMyIsImluc2VydEZpbGVJbml0IiwiY3JlYXRlRGlyZWN0aXZlIiwiUzNTdG9yYWdlIiwibWVzc2FnZSIsImNyZWF0ZUdvb2dsZVN0b3JhZ2VEaXJlY3RpdmUiLCJHb29nbGVBY2Nlc3NJZCIsIkdvb2dsZVNlY3JldEtleSIsIkdvb2dsZVN0b3JhZ2UiLCJHb29nbGVDbG91ZCIsIldlYmRhdlVwbG9hZHMiLCJXZWJkYXZBdmF0YXJzIiwiV2ViZGF2VXNlckRhdGFGaWxlcyIsInVwbG9hZEZvbGRlclBhdGgiLCJzZXJ2ZXIiLCJwYXNzd29yZCIsIm1ldGhvZHMiLCJyb29tSWQiLCJtc2dEYXRhIiwiYXZhdGFyIiwiT3B0aW9uYWwiLCJlbW9qaSIsImFsaWFzIiwiZ3JvdXBhYmxlIiwiQm9vbGVhbiIsIm1zZyIsInVwZGF0ZUZpbGVDb21wbGV0ZSIsIm9taXQiLCJlbmNvZGVVUkkiLCJhdHRhY2htZW50IiwidGl0bGUiLCJkZXNjcmlwdGlvbiIsInRpdGxlX2xpbmsiLCJ0aXRsZV9saW5rX2Rvd25sb2FkIiwiaW1hZ2VfdXJsIiwiaW1hZ2VfdHlwZSIsImltYWdlX3NpemUiLCJpbWFnZV9kaW1lbnNpb25zIiwiaW1hZ2VfcHJldmlldyIsImF1ZGlvX3VybCIsImF1ZGlvX3R5cGUiLCJhdWRpb19zaXplIiwidmlkZW9fdXJsIiwidmlkZW9fdHlwZSIsInZpZGVvX3NpemUiLCJ0cyIsIkRhdGUiLCJhdHRhY2htZW50cyIsImRlZmVyIiwiY2FsbGJhY2tzIiwicnVuIiwicHJvdGVjdGVkRmlsZXMiLCJnZXRTM0ZpbGVVcmwiLCJhZGRHcm91cCIsImFkZCIsImkxOG5EZXNjcmlwdGlvbiIsInZhbHVlcyIsImkxOG5MYWJlbCIsInNlY3Rpb24iLCJlbmFibGVRdWVyeSIsInByaXZhdGUiLCJtdWx0aWxpbmUiLCJBbWF6b25TM1N0b3JlIiwiUzMiLCJTdG9yZSIsImV4dGVuZCIsImh0dHBPcHRpb25zIiwidGltZW91dCIsImFnZW50IiwiY2xhc3NPcHRpb25zIiwiczMiLCJLZXkiLCJFeHBpcmVzIiwiZ2V0U2lnbmVkVXJsIiwiZGVsZXRlT2JqZWN0IiwiUmFuZ2UiLCJnZXRPYmplY3QiLCJjcmVhdGVSZWFkU3RyZWFtIiwiZ2V0V3JpdGVTdHJlYW0iLCJ3cml0ZVN0cmVhbSIsImV2ZW50IiwibGlzdGVuZXIiLCJuZXh0VGljayIsInJlbW92ZUxpc3RlbmVyIiwicHV0T2JqZWN0IiwiQm9keSIsIkNvbnRlbnRUeXBlIiwiQ29udGVudERpc3Bvc2l0aW9uIiwiR29vZ2xlU3RvcmFnZVN0b3JlIiwiZ2NTdG9yYWdlIiwiZ2NzIiwiZ29vZ2xlQ2xvdWRTdG9yYWdlIiwiYWN0aW9uIiwicmVzcG9uc2VEaXNwb3NpdGlvbiIsImV4cGlyZXMiLCJub3ciLCJnemlwIiwiY29udGVudFR5cGUiLCJjb250ZW50RGlzcG9zaXRpb24iLCJXZWJkYXZTdG9yZSIsIldlYmRhdiIsImNsaWVudCIsInN0YXR1cyIsImNyZWF0ZURpcmVjdG9yeSIsIndlYmRhdlN0cmVhbSIsIm5ld0xpc3RlbmVyQ2FsbGJhY2siLCJzZXRUaW1lb3V0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFB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Q0FBZSxhQUFmLEVBQThCK0gsbUJBQTlCO0FBRUExQixrQkFBWTNTLElBQVosQ0FBaUJvVSxZQUFqQjtBQUNBLGFBQU96QixXQUFQO0FBQ0EsS0FwQkQ7QUFxQkE7O0FBeEg4Qzs7QUEySGhEO0FBQ0EzWSxTQUFTUSxLQUFULENBQWV3WixNQUFmLEdBQXdCRCxXQUF4QixDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2ZpbGUtdXBsb2FkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBTbGluZ3Nob3QgKi9cblxuaW1wb3J0IGZpbGVzaXplIGZyb20gJ2ZpbGVzaXplJztcblxuY29uc3Qgc2xpbmdTaG90Q29uZmlnID0ge1xuXHRhdXRob3JpemUoZmlsZS8qICwgbWV0YUNvbnRleHQqLykge1xuXHRcdC8vIERlbnkgdXBsb2FkcyBpZiB1c2VyIGlzIG5vdCBsb2dnZWQgaW4uXG5cdFx0aWYgKCF0aGlzLnVzZXJJZCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignbG9naW4tcmVxdWlyZWQnLCAnUGxlYXNlIGxvZ2luIGJlZm9yZSBwb3N0aW5nIGZpbGVzJyk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUoZmlsZS50eXBlKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihUQVBpMThuLl9fKCdlcnJvci1pbnZhbGlkLWZpbGUtdHlwZScpKTtcblx0XHR9XG5cblx0XHRjb25zdCBtYXhGaWxlU2l6ZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX01heEZpbGVTaXplJyk7XG5cblx0XHRpZiAobWF4RmlsZVNpemUgPiAtMSAmJiBtYXhGaWxlU2l6ZSA8IGZpbGUuc2l6ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihUQVBpMThuLl9fKCdGaWxlX2V4Y2VlZHNfYWxsb3dlZF9zaXplX29mX2J5dGVzJywgeyBzaXplOiBmaWxlc2l6ZShtYXhGaWxlU2l6ZSkgfSkpO1xuXHRcdH1cblxuXHRcdHJldHVybiB0cnVlO1xuXHR9LFxuXHRtYXhTaXplOiAwLFxuXHRhbGxvd2VkRmlsZVR5cGVzOiBudWxsLFxufTtcblxuU2xpbmdzaG90LmZpbGVSZXN0cmljdGlvbnMoJ3JvY2tldGNoYXQtdXBsb2FkcycsIHNsaW5nU2hvdENvbmZpZyk7XG5TbGluZ3Nob3QuZmlsZVJlc3RyaWN0aW9ucygncm9ja2V0Y2hhdC11cGxvYWRzLWdzJywgc2xpbmdTaG90Q29uZmlnKTtcbiIsIi8qIGdsb2JhbHMgRmlsZVVwbG9hZDp0cnVlICovXG4vKiBleHBvcnRlZCBGaWxlVXBsb2FkICovXG5cbmltcG9ydCBmaWxlc2l6ZSBmcm9tICdmaWxlc2l6ZSc7XG5cbmxldCBtYXhGaWxlU2l6ZSA9IDA7XG5cbkZpbGVVcGxvYWQgPSB7XG5cdHZhbGlkYXRlRmlsZVVwbG9hZChmaWxlKSB7XG5cdFx0aWYgKCFNYXRjaC50ZXN0KGZpbGUucmlkLCBTdHJpbmcpKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdC8vIGxpdmVjaGF0IHVzZXJzIGNhbiB1cGxvYWQgZmlsZXMgYnV0IHRoZXkgZG9uJ3QgaGF2ZSBhbiB1c2VySWRcblx0XHRjb25zdCB1c2VyID0gZmlsZS51c2VySWQgPyBNZXRlb3IudXNlcigpIDogbnVsbDtcblx0XHRjb25zdCByb29tID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9vbXMuZmluZE9uZUJ5SWQoZmlsZS5yaWQpO1xuXHRcdGNvbnN0IGRpcmVjdE1lc3NhZ2VBbGxvdyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0VuYWJsZWRfRGlyZWN0Jyk7XG5cdFx0Y29uc3QgZmlsZVVwbG9hZEFsbG93ZWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9FbmFibGVkJyk7XG5cdFx0aWYgKFJvY2tldENoYXQuYXV0aHouY2FuQWNjZXNzUm9vbShyb29tLCB1c2VyLCBmaWxlKSAhPT0gdHJ1ZSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblx0XHRjb25zdCBsYW5ndWFnZSA9IHVzZXIgPyB1c2VyLmxhbmd1YWdlIDogJ2VuJztcblx0XHRpZiAoIWZpbGVVcGxvYWRBbGxvd2VkKSB7XG5cdFx0XHRjb25zdCByZWFzb24gPSBUQVBpMThuLl9fKCdGaWxlVXBsb2FkX0Rpc2FibGVkJywgbGFuZ3VhZ2UpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItZmlsZS11cGxvYWQtZGlzYWJsZWQnLCByZWFzb24pO1xuXHRcdH1cblxuXHRcdGlmICghZGlyZWN0TWVzc2FnZUFsbG93ICYmIHJvb20udCA9PT0gJ2QnKSB7XG5cdFx0XHRjb25zdCByZWFzb24gPSBUQVBpMThuLl9fKCdGaWxlX25vdF9hbGxvd2VkX2RpcmVjdF9tZXNzYWdlcycsIGxhbmd1YWdlKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRpcmVjdC1tZXNzYWdlLWZpbGUtdXBsb2FkLW5vdC1hbGxvd2VkJywgcmVhc29uKTtcblx0XHR9XG5cblx0XHQvLyAtMSBtYXhGaWxlU2l6ZSBtZWFucyB0aGVyZSBpcyBubyBsaW1pdFxuXHRcdGlmIChtYXhGaWxlU2l6ZSA+IC0xICYmIGZpbGUuc2l6ZSA+IG1heEZpbGVTaXplKSB7XG5cdFx0XHRjb25zdCByZWFzb24gPSBUQVBpMThuLl9fKCdGaWxlX2V4Y2VlZHNfYWxsb3dlZF9zaXplX29mX2J5dGVzJywge1xuXHRcdFx0XHRzaXplOiBmaWxlc2l6ZShtYXhGaWxlU2l6ZSksXG5cdFx0XHR9LCBsYW5ndWFnZSk7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1maWxlLXRvby1sYXJnZScsIHJlYXNvbik7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmZpbGVVcGxvYWRJc1ZhbGlkQ29udGVudFR5cGUoZmlsZS50eXBlKSkge1xuXHRcdFx0Y29uc3QgcmVhc29uID0gVEFQaTE4bi5fXygnRmlsZV90eXBlX2lzX25vdF9hY2NlcHRlZCcsIGxhbmd1YWdlKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtZmlsZS10eXBlJywgcmVhc29uKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcbn07XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX01heEZpbGVTaXplJywgZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHR0cnkge1xuXHRcdG1heEZpbGVTaXplID0gcGFyc2VJbnQodmFsdWUpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0bWF4RmlsZVNpemUgPSBSb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kT25lQnlJZCgnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZScpLnBhY2thZ2VWYWx1ZTtcblx0fVxufSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWRCYXNlOnRydWUsIFVwbG9hZEZTICovXG4vKiBleHBvcnRlZCBGaWxlVXBsb2FkQmFzZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblVwbG9hZEZTLmNvbmZpZy5kZWZhdWx0U3RvcmVQZXJtaXNzaW9ucyA9IG5ldyBVcGxvYWRGUy5TdG9yZVBlcm1pc3Npb25zKHtcblx0aW5zZXJ0KHVzZXJJZCwgZG9jKSB7XG5cdFx0aWYgKHVzZXJJZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Ly8gYWxsb3cgaW5zZXJ0cyBmcm9tIHNsYWNrYnJpZGdlIChtZXNzYWdlX2lkID0gc2xhY2stdGltZXN0YW1wLW1pbGxpKVxuXHRcdGlmIChkb2MgJiYgZG9jLm1lc3NhZ2VfaWQgJiYgZG9jLm1lc3NhZ2VfaWQuaW5kZXhPZignc2xhY2stJykgPT09IDApIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdC8vIGFsbG93IGluc2VydHMgdG8gdGhlIFVzZXJEYXRhRmlsZXMgc3RvcmVcblx0XHRpZiAoZG9jICYmIGRvYy5zdG9yZSAmJiBkb2Muc3RvcmUuc3BsaXQoJzonKS5wb3AoKSA9PT0gJ1VzZXJEYXRhRmlsZXMnKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRpZiAoUm9ja2V0Q2hhdC5hdXRoei5jYW5BY2Nlc3NSb29tKG51bGwsIG51bGwsIGRvYykpIHtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcblx0dXBkYXRlKHVzZXJJZCwgZG9jKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdkZWxldGUtbWVzc2FnZScsIGRvYy5yaWQpIHx8IChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0RlbGV0aW5nJykgJiYgdXNlcklkID09PSBkb2MudXNlcklkKTtcblx0fSxcblx0cmVtb3ZlKHVzZXJJZCwgZG9jKSB7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdkZWxldGUtbWVzc2FnZScsIGRvYy5yaWQpIHx8IChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9BbGxvd0RlbGV0aW5nJykgJiYgdXNlcklkID09PSBkb2MudXNlcklkKTtcblx0fSxcbn0pO1xuXG5cbkZpbGVVcGxvYWRCYXNlID0gY2xhc3MgRmlsZVVwbG9hZEJhc2Uge1xuXHRjb25zdHJ1Y3RvcihzdG9yZSwgbWV0YSwgZmlsZSkge1xuXHRcdHRoaXMuaWQgPSBSYW5kb20uaWQoKTtcblx0XHR0aGlzLm1ldGEgPSBtZXRhO1xuXHRcdHRoaXMuZmlsZSA9IGZpbGU7XG5cdFx0dGhpcy5zdG9yZSA9IHN0b3JlO1xuXHR9XG5cblx0Z2V0UHJvZ3Jlc3MoKSB7XG5cblx0fVxuXG5cdGdldEZpbGVOYW1lKCkge1xuXHRcdHJldHVybiB0aGlzLm1ldGEubmFtZTtcblx0fVxuXG5cdHN0YXJ0KGNhbGxiYWNrKSB7XG5cdFx0dGhpcy5oYW5kbGVyID0gbmV3IFVwbG9hZEZTLlVwbG9hZGVyKHtcblx0XHRcdHN0b3JlOiB0aGlzLnN0b3JlLFxuXHRcdFx0ZGF0YTogdGhpcy5maWxlLFxuXHRcdFx0ZmlsZTogdGhpcy5tZXRhLFxuXHRcdFx0b25FcnJvcjogKGVycikgPT4gY2FsbGJhY2soZXJyKSxcblx0XHRcdG9uQ29tcGxldGU6IChmaWxlRGF0YSkgPT4ge1xuXHRcdFx0XHRjb25zdCBmaWxlID0gXy5waWNrKGZpbGVEYXRhLCAnX2lkJywgJ3R5cGUnLCAnc2l6ZScsICduYW1lJywgJ2lkZW50aWZ5JywgJ2Rlc2NyaXB0aW9uJyk7XG5cblx0XHRcdFx0ZmlsZS51cmwgPSBmaWxlRGF0YS51cmwucmVwbGFjZShNZXRlb3IuYWJzb2x1dGVVcmwoKSwgJy8nKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIGZpbGUsIHRoaXMuc3RvcmUub3B0aW9ucy5uYW1lKTtcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHR0aGlzLmhhbmRsZXIub25Qcm9ncmVzcyA9IChmaWxlLCBwcm9ncmVzcykgPT4ge1xuXHRcdFx0dGhpcy5vblByb2dyZXNzKHByb2dyZXNzKTtcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHRoaXMuaGFuZGxlci5zdGFydCgpO1xuXHR9XG5cblx0b25Qcm9ncmVzcygpIHt9XG5cblx0c3RvcCgpIHtcblx0XHRyZXR1cm4gdGhpcy5oYW5kbGVyLnN0b3AoKTtcblx0fVxufTtcbiIsIi8qIGdsb2JhbHMgVXBsb2FkRlMgKi9cblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBtaW1lIGZyb20gJ21pbWUtdHlwZS93aXRoLWRiJztcbmltcG9ydCBGdXR1cmUgZnJvbSAnZmliZXJzL2Z1dHVyZSc7XG5pbXBvcnQgc2hhcnAgZnJvbSAnc2hhcnAnO1xuaW1wb3J0IHsgQ29va2llcyB9IGZyb20gJ21ldGVvci9vc3RyaW86Y29va2llcyc7XG5cbmNvbnN0IGNvb2tpZSA9IG5ldyBDb29raWVzKCk7XG5cbk9iamVjdC5hc3NpZ24oRmlsZVVwbG9hZCwge1xuXHRoYW5kbGVyczoge30sXG5cblx0Y29uZmlndXJlVXBsb2Fkc1N0b3JlKHN0b3JlLCBuYW1lLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgdHlwZSA9IG5hbWUuc3BsaXQoJzonKS5wb3AoKTtcblx0XHRjb25zdCBzdG9yZXMgPSBVcGxvYWRGUy5nZXRTdG9yZXMoKTtcblx0XHRkZWxldGUgc3RvcmVzW25hbWVdO1xuXG5cdFx0cmV0dXJuIG5ldyBVcGxvYWRGUy5zdG9yZVtzdG9yZV0oT2JqZWN0LmFzc2lnbih7XG5cdFx0XHRuYW1lLFxuXHRcdH0sIG9wdGlvbnMsIEZpbGVVcGxvYWRbYGRlZmF1bHQkeyB0eXBlIH1gXSgpKSk7XG5cdH0sXG5cblx0ZGVmYXVsdFVwbG9hZHMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvbGxlY3Rpb246IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMubW9kZWwsXG5cdFx0XHRmaWx0ZXI6IG5ldyBVcGxvYWRGUy5GaWx0ZXIoe1xuXHRcdFx0XHRvbkNoZWNrOiBGaWxlVXBsb2FkLnZhbGlkYXRlRmlsZVVwbG9hZCxcblx0XHRcdH0pLFxuXHRcdFx0Z2V0UGF0aChmaWxlKSB7XG5cdFx0XHRcdHJldHVybiBgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgfS91cGxvYWRzLyR7IGZpbGUucmlkIH0vJHsgZmlsZS51c2VySWQgfS8keyBmaWxlLl9pZCB9YDtcblx0XHRcdH0sXG5cdFx0XHRvblZhbGlkYXRlOiBGaWxlVXBsb2FkLnVwbG9hZHNPblZhbGlkYXRlLFxuXHRcdFx0b25SZWFkKGZpbGVJZCwgZmlsZSwgcmVxLCByZXMpIHtcblx0XHRcdFx0aWYgKCFGaWxlVXBsb2FkLnJlcXVlc3RDYW5BY2Nlc3NGaWxlcyhyZXEpKSB7XG5cdFx0XHRcdFx0cmVzLndyaXRlSGVhZCg0MDMpO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJlcy5zZXRIZWFkZXIoJ2NvbnRlbnQtZGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIkeyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5uYW1lKSB9XCJgKTtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9LFxuXHRcdH07XG5cdH0sXG5cblx0ZGVmYXVsdEF2YXRhcnMoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGNvbGxlY3Rpb246IFJvY2tldENoYXQubW9kZWxzLkF2YXRhcnMubW9kZWwsXG5cdFx0XHQvLyBmaWx0ZXI6IG5ldyBVcGxvYWRGUy5GaWx0ZXIoe1xuXHRcdFx0Ly8gXHRvbkNoZWNrOiBGaWxlVXBsb2FkLnZhbGlkYXRlRmlsZVVwbG9hZFxuXHRcdFx0Ly8gfSksXG5cdFx0XHRnZXRQYXRoKGZpbGUpIHtcblx0XHRcdFx0cmV0dXJuIGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSB9L2F2YXRhcnMvJHsgZmlsZS51c2VySWQgfWA7XG5cdFx0XHR9LFxuXHRcdFx0b25WYWxpZGF0ZTogRmlsZVVwbG9hZC5hdmF0YXJzT25WYWxpZGF0ZSxcblx0XHRcdG9uRmluaXNoVXBsb2FkOiBGaWxlVXBsb2FkLmF2YXRhcnNPbkZpbmlzaFVwbG9hZCxcblx0XHR9O1xuXHR9LFxuXG5cdGRlZmF1bHRVc2VyRGF0YUZpbGVzKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHRjb2xsZWN0aW9uOiBSb2NrZXRDaGF0Lm1vZGVscy5Vc2VyRGF0YUZpbGVzLm1vZGVsLFxuXHRcdFx0Z2V0UGF0aChmaWxlKSB7XG5cdFx0XHRcdHJldHVybiBgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgfS91cGxvYWRzL3VzZXJEYXRhLyR7IGZpbGUudXNlcklkIH1gO1xuXHRcdFx0fSxcblx0XHRcdG9uVmFsaWRhdGU6IEZpbGVVcGxvYWQudXBsb2Fkc09uVmFsaWRhdGUsXG5cdFx0XHRvblJlYWQoZmlsZUlkLCBmaWxlLCByZXEsIHJlcykge1xuXHRcdFx0XHRpZiAoIUZpbGVVcGxvYWQucmVxdWVzdENhbkFjY2Vzc0ZpbGVzKHJlcSkpIHtcblx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDQwMyk7XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmVzLnNldEhlYWRlcignY29udGVudC1kaXNwb3NpdGlvbicsIGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7IGVuY29kZVVSSUNvbXBvbmVudChmaWxlLm5hbWUpIH1cImApO1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH0sXG5cdFx0fTtcblx0fSxcblxuXHRhdmF0YXJzT25WYWxpZGF0ZShmaWxlKSB7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19BdmF0YXJSZXNpemUnKSAhPT0gdHJ1ZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHRlbXBGaWxlUGF0aCA9IFVwbG9hZEZTLmdldFRlbXBGaWxlUGF0aChmaWxlLl9pZCk7XG5cblx0XHRjb25zdCBoZWlnaHQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQXZhdGFyU2l6ZScpO1xuXHRcdGNvbnN0IGZ1dHVyZSA9IG5ldyBGdXR1cmUoKTtcblxuXHRcdGNvbnN0IHMgPSBzaGFycCh0ZW1wRmlsZVBhdGgpO1xuXHRcdHMucm90YXRlKCk7XG5cdFx0Ly8gR2V0IG1ldGFkYXRhIHRvIHJlc2l6ZSB0aGUgaW1hZ2UgdGhlIGZpcnN0IHRpbWUgdG8ga2VlcCBcImluc2lkZVwiIHRoZSBkaW1lbnNpb25zXG5cdFx0Ly8gdGhlbiByZXNpemUgYWdhaW4gdG8gY3JlYXRlIHRoZSBjYW52YXMgYXJvdW5kXG5cblx0XHRzLm1ldGFkYXRhKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgbWV0YWRhdGEpID0+IHtcblx0XHRcdGlmICghbWV0YWRhdGEpIHtcblx0XHRcdFx0bWV0YWRhdGEgPSB7fTtcblx0XHRcdH1cblxuXHRcdFx0cy50b0Zvcm1hdChzaGFycC5mb3JtYXQuanBlZylcblx0XHRcdFx0LnJlc2l6ZShNYXRoLm1pbihoZWlnaHQgfHwgMCwgbWV0YWRhdGEud2lkdGggfHwgSW5maW5pdHkpLCBNYXRoLm1pbihoZWlnaHQgfHwgMCwgbWV0YWRhdGEuaGVpZ2h0IHx8IEluZmluaXR5KSlcblx0XHRcdFx0LnBpcGUoc2hhcnAoKVxuXHRcdFx0XHRcdC5yZXNpemUoaGVpZ2h0LCBoZWlnaHQpXG5cdFx0XHRcdFx0LmJhY2tncm91bmQoJyNGRkZGRkYnKVxuXHRcdFx0XHRcdC5lbWJlZCgpXG5cdFx0XHRcdClcblx0XHRcdFx0Ly8gVXNlIGJ1ZmZlciB0byBnZXQgdGhlIHJlc3VsdCBpbiBtZW1vcnkgdGhlbiByZXBsYWNlIHRoZSBleGlzdGluZyBmaWxlXG5cdFx0XHRcdC8vIFRoZXJlIGlzIG5vIG9wdGlvbiB0byBvdmVycmlkZSBhIGZpbGUgdXNpbmcgdGhpcyBsaWJyYXJ5XG5cdFx0XHRcdC50b0J1ZmZlcigpXG5cdFx0XHRcdC50aGVuKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKG91dHB1dEJ1ZmZlcikgPT4ge1xuXHRcdFx0XHRcdGZzLndyaXRlRmlsZSh0ZW1wRmlsZVBhdGgsIG91dHB1dEJ1ZmZlciwgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudCgoZXJyKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoZXJyICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnIpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29uc3QgeyBzaXplIH0gPSBmcy5sc3RhdFN5bmModGVtcEZpbGVQYXRoKTtcblx0XHRcdFx0XHRcdHRoaXMuZ2V0Q29sbGVjdGlvbigpLmRpcmVjdC51cGRhdGUoeyBfaWQ6IGZpbGUuX2lkIH0sIHsgJHNldDogeyBzaXplIH0gfSk7XG5cdFx0XHRcdFx0XHRmdXR1cmUucmV0dXJuKCk7XG5cdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHR9KSk7XG5cdFx0fSkpO1xuXG5cdFx0cmV0dXJuIGZ1dHVyZS53YWl0KCk7XG5cdH0sXG5cblx0cmVzaXplSW1hZ2VQcmV2aWV3KGZpbGUpIHtcblx0XHRmaWxlID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5maW5kT25lQnlJZChmaWxlLl9pZCk7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cdFx0Y29uc3QgaW1hZ2UgPSBGaWxlVXBsb2FkLmdldFN0b3JlKCdVcGxvYWRzJykuX3N0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpO1xuXG5cdFx0Y29uc3QgdHJhbnNmb3JtZXIgPSBzaGFycCgpXG5cdFx0XHQucmVzaXplKDMyLCAzMilcblx0XHRcdC5tYXgoKVxuXHRcdFx0LmpwZWcoKVxuXHRcdFx0LmJsdXIoKTtcblx0XHRjb25zdCByZXN1bHQgPSB0cmFuc2Zvcm1lci50b0J1ZmZlcigpLnRoZW4oKG91dCkgPT4gb3V0LnRvU3RyaW5nKCdiYXNlNjQnKSk7XG5cdFx0aW1hZ2UucGlwZSh0cmFuc2Zvcm1lcik7XG5cdFx0cmV0dXJuIHJlc3VsdDtcblx0fSxcblxuXHR1cGxvYWRzT25WYWxpZGF0ZShmaWxlKSB7XG5cdFx0aWYgKCEvXmltYWdlXFwvKCh4LXdpbmRvd3MtKT9ibXB8cD9qcGVnfHBuZykkLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCB0bXBGaWxlID0gVXBsb2FkRlMuZ2V0VGVtcEZpbGVQYXRoKGZpbGUuX2lkKTtcblxuXHRcdGNvbnN0IGZ1dCA9IG5ldyBGdXR1cmUoKTtcblxuXHRcdGNvbnN0IHMgPSBzaGFycCh0bXBGaWxlKTtcblx0XHRzLm1ldGFkYXRhKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVyciwgbWV0YWRhdGEpID0+IHtcblx0XHRcdGlmIChlcnIgIT0gbnVsbCkge1xuXHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdHJldHVybiBmdXQucmV0dXJuKCk7XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGlkZW50aWZ5ID0ge1xuXHRcdFx0XHRmb3JtYXQ6IG1ldGFkYXRhLmZvcm1hdCxcblx0XHRcdFx0c2l6ZToge1xuXHRcdFx0XHRcdHdpZHRoOiBtZXRhZGF0YS53aWR0aCxcblx0XHRcdFx0XHRoZWlnaHQ6IG1ldGFkYXRhLmhlaWdodCxcblx0XHRcdFx0fSxcblx0XHRcdH07XG5cblx0XHRcdGlmIChtZXRhZGF0YS5vcmllbnRhdGlvbiA9PSBudWxsKSB7XG5cdFx0XHRcdHJldHVybiBmdXQucmV0dXJuKCk7XG5cdFx0XHR9XG5cblx0XHRcdHMucm90YXRlKClcblx0XHRcdFx0LnRvRmlsZShgJHsgdG1wRmlsZSB9LnRtcGApXG5cdFx0XHRcdC50aGVuKE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdGZzLnVubGluayh0bXBGaWxlLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcblx0XHRcdFx0XHRcdGZzLnJlbmFtZShgJHsgdG1wRmlsZSB9LnRtcGAsIHRtcEZpbGUsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRjb25zdCB7IHNpemUgfSA9IGZzLmxzdGF0U3luYyh0bXBGaWxlKTtcblx0XHRcdFx0XHRcdFx0dGhpcy5nZXRDb2xsZWN0aW9uKCkuZGlyZWN0LnVwZGF0ZSh7IF9pZDogZmlsZS5faWQgfSwge1xuXHRcdFx0XHRcdFx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0XHRcdFx0XHRcdHNpemUsXG5cdFx0XHRcdFx0XHRcdFx0XHRpZGVudGlmeSxcblx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0ZnV0LnJldHVybigpO1xuXHRcdFx0XHRcdFx0fSkpO1xuXHRcdFx0XHRcdH0pKTtcblx0XHRcdFx0fSkpLmNhdGNoKChlcnIpID0+IHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdFx0ZnV0LnJldHVybigpO1xuXHRcdFx0XHR9KTtcblx0XHR9KSk7XG5cblx0XHRyZXR1cm4gZnV0LndhaXQoKTtcblx0fSxcblxuXHRhdmF0YXJzT25GaW5pc2hVcGxvYWQoZmlsZSkge1xuXHRcdC8vIHVwZGF0ZSBmaWxlIHJlY29yZCB0byBtYXRjaCB1c2VyJ3MgdXNlcm5hbWVcblx0XHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWQoZmlsZS51c2VySWQpO1xuXHRcdGNvbnN0IG9sZEF2YXRhciA9IFJvY2tldENoYXQubW9kZWxzLkF2YXRhcnMuZmluZE9uZUJ5TmFtZSh1c2VyLnVzZXJuYW1lKTtcblx0XHRpZiAob2xkQXZhdGFyKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5BdmF0YXJzLmRlbGV0ZUZpbGUob2xkQXZhdGFyLl9pZCk7XG5cdFx0fVxuXHRcdFJvY2tldENoYXQubW9kZWxzLkF2YXRhcnMudXBkYXRlRmlsZU5hbWVCeUlkKGZpbGUuX2lkLCB1c2VyLnVzZXJuYW1lKTtcblx0XHQvLyBjb25zb2xlLmxvZygndXBsb2FkIGZpbmlzaGVkIC0+JywgZmlsZSk7XG5cdH0sXG5cblx0cmVxdWVzdENhbkFjY2Vzc0ZpbGVzKHsgaGVhZGVycyA9IHt9LCBxdWVyeSA9IHt9IH0pIHtcblx0XHRpZiAoIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1Byb3RlY3RGaWxlcycpKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cblx0XHRsZXQgeyByY191aWQsIHJjX3Rva2VuLCByY19yaWQsIHJjX3Jvb21fdHlwZSB9ID0gcXVlcnk7XG5cblx0XHRpZiAoIXJjX3VpZCAmJiBoZWFkZXJzLmNvb2tpZSkge1xuXHRcdFx0cmNfdWlkID0gY29va2llLmdldCgncmNfdWlkJywgaGVhZGVycy5jb29raWUpO1xuXHRcdFx0cmNfdG9rZW4gPSBjb29raWUuZ2V0KCdyY190b2tlbicsIGhlYWRlcnMuY29va2llKTtcblx0XHRcdHJjX3JpZCA9IGNvb2tpZS5nZXQoJ3JjX3JpZCcsIGhlYWRlcnMuY29va2llKTtcblx0XHRcdHJjX3Jvb21fdHlwZSA9IGNvb2tpZS5nZXQoJ3JjX3Jvb21fdHlwZScsIGhlYWRlcnMuY29va2llKTtcblx0XHR9XG5cblx0XHRjb25zdCBpc0F1dGhvcml6ZWRCeUNvb2tpZXMgPSByY191aWQgJiYgcmNfdG9rZW4gJiYgUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZE9uZUJ5SWRBbmRMb2dpblRva2VuKHJjX3VpZCwgcmNfdG9rZW4pO1xuXHRcdGNvbnN0IGlzQXV0aG9yaXplZEJ5SGVhZGVycyA9IGhlYWRlcnNbJ3gtdXNlci1pZCddICYmIGhlYWRlcnNbJ3gtYXV0aC10b2tlbiddICYmIFJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRPbmVCeUlkQW5kTG9naW5Ub2tlbihoZWFkZXJzWyd4LXVzZXItaWQnXSwgaGVhZGVyc1sneC1hdXRoLXRva2VuJ10pO1xuXHRcdGNvbnN0IGlzQXV0aG9yaXplZEJ5Um9vbSA9IHJjX3Jvb21fdHlwZSAmJiBSb2NrZXRDaGF0LnJvb21UeXBlcy5nZXRDb25maWcocmNfcm9vbV90eXBlKS5jYW5BY2Nlc3NVcGxvYWRlZEZpbGUoeyByY191aWQsIHJjX3JpZCwgcmNfdG9rZW4gfSk7XG5cdFx0cmV0dXJuIGlzQXV0aG9yaXplZEJ5Q29va2llcyB8fCBpc0F1dGhvcml6ZWRCeUhlYWRlcnMgfHwgaXNBdXRob3JpemVkQnlSb29tO1xuXHR9LFxuXHRhZGRFeHRlbnNpb25UbyhmaWxlKSB7XG5cdFx0aWYgKG1pbWUubG9va3VwKGZpbGUubmFtZSkgPT09IGZpbGUudHlwZSkge1xuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZXh0ID0gbWltZS5leHRlbnNpb24oZmlsZS50eXBlKTtcblx0XHRpZiAoZXh0ICYmIGZhbHNlID09PSBuZXcgUmVnRXhwKGBcXC4keyBleHQgfSRgLCAnaScpLnRlc3QoZmlsZS5uYW1lKSkge1xuXHRcdFx0ZmlsZS5uYW1lID0gYCR7IGZpbGUubmFtZSB9LiR7IGV4dCB9YDtcblx0XHR9XG5cblx0XHRyZXR1cm4gZmlsZTtcblx0fSxcblxuXHRnZXRTdG9yZShtb2RlbE5hbWUpIHtcblx0XHRjb25zdCBzdG9yYWdlVHlwZSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScpO1xuXHRcdGNvbnN0IGhhbmRsZXJOYW1lID0gYCR7IHN0b3JhZ2VUeXBlIH06JHsgbW9kZWxOYW1lIH1gO1xuXG5cdFx0cmV0dXJuIHRoaXMuZ2V0U3RvcmVCeU5hbWUoaGFuZGxlck5hbWUpO1xuXHR9LFxuXG5cdGdldFN0b3JlQnlOYW1lKGhhbmRsZXJOYW1lKSB7XG5cdFx0aWYgKHRoaXMuaGFuZGxlcnNbaGFuZGxlck5hbWVdID09IG51bGwpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoYFVwbG9hZCBoYW5kbGVyIFwiJHsgaGFuZGxlck5hbWUgfVwiIGRvZXMgbm90IGV4aXN0c2ApO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5oYW5kbGVyc1toYW5kbGVyTmFtZV07XG5cdH0sXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0Y29uc3Qgc3RvcmUgPSB0aGlzLmdldFN0b3JlQnlOYW1lKGZpbGUuc3RvcmUpO1xuXHRcdGlmIChzdG9yZSAmJiBzdG9yZS5nZXQpIHtcblx0XHRcdHJldHVybiBzdG9yZS5nZXQoZmlsZSwgcmVxLCByZXMsIG5leHQpO1xuXHRcdH1cblx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0cmVzLmVuZCgpO1xuXHR9LFxuXG5cdGNvcHkoZmlsZSwgdGFyZ2V0RmlsZSkge1xuXHRcdGNvbnN0IHN0b3JlID0gdGhpcy5nZXRTdG9yZUJ5TmFtZShmaWxlLnN0b3JlKTtcblx0XHRjb25zdCBvdXQgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbSh0YXJnZXRGaWxlKTtcblxuXHRcdGZpbGUgPSBGaWxlVXBsb2FkLmFkZEV4dGVuc2lvblRvKGZpbGUpO1xuXG5cdFx0aWYgKHN0b3JlLmNvcHkpIHtcblx0XHRcdHN0b3JlLmNvcHkoZmlsZSwgb3V0KTtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblxuXHRcdHJldHVybiBmYWxzZTtcblx0fSxcbn0pO1xuXG5leHBvcnQgY2xhc3MgRmlsZVVwbG9hZENsYXNzIHtcblx0Y29uc3RydWN0b3IoeyBuYW1lLCBtb2RlbCwgc3RvcmUsIGdldCwgaW5zZXJ0LCBnZXRTdG9yZSwgY29weSB9KSB7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLm1vZGVsID0gbW9kZWwgfHwgdGhpcy5nZXRNb2RlbEZyb21OYW1lKCk7XG5cdFx0dGhpcy5fc3RvcmUgPSBzdG9yZSB8fCBVcGxvYWRGUy5nZXRTdG9yZShuYW1lKTtcblx0XHR0aGlzLmdldCA9IGdldDtcblx0XHR0aGlzLmNvcHkgPSBjb3B5O1xuXG5cdFx0aWYgKGluc2VydCkge1xuXHRcdFx0dGhpcy5pbnNlcnQgPSBpbnNlcnQ7XG5cdFx0fVxuXG5cdFx0aWYgKGdldFN0b3JlKSB7XG5cdFx0XHR0aGlzLmdldFN0b3JlID0gZ2V0U3RvcmU7XG5cdFx0fVxuXG5cdFx0RmlsZVVwbG9hZC5oYW5kbGVyc1tuYW1lXSA9IHRoaXM7XG5cdH1cblxuXHRnZXRTdG9yZSgpIHtcblx0XHRyZXR1cm4gdGhpcy5fc3RvcmU7XG5cdH1cblxuXHRnZXQgc3RvcmUoKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0U3RvcmUoKTtcblx0fVxuXG5cdHNldCBzdG9yZShzdG9yZSkge1xuXHRcdHRoaXMuX3N0b3JlID0gc3RvcmU7XG5cdH1cblxuXHRnZXRNb2RlbEZyb21OYW1lKCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVsc1t0aGlzLm5hbWUuc3BsaXQoJzonKVsxXV07XG5cdH1cblxuXHRkZWxldGUoZmlsZUlkKSB7XG5cdFx0aWYgKHRoaXMuc3RvcmUgJiYgdGhpcy5zdG9yZS5kZWxldGUpIHtcblx0XHRcdHRoaXMuc3RvcmUuZGVsZXRlKGZpbGVJZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMubW9kZWwuZGVsZXRlRmlsZShmaWxlSWQpO1xuXHR9XG5cblx0ZGVsZXRlQnlJZChmaWxlSWQpIHtcblx0XHRjb25zdCBmaWxlID0gdGhpcy5tb2RlbC5maW5kT25lQnlJZChmaWxlSWQpO1xuXG5cdFx0aWYgKCFmaWxlKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc3RvcmUgPSBGaWxlVXBsb2FkLmdldFN0b3JlQnlOYW1lKGZpbGUuc3RvcmUpO1xuXG5cdFx0cmV0dXJuIHN0b3JlLmRlbGV0ZShmaWxlLl9pZCk7XG5cdH1cblxuXHRkZWxldGVCeU5hbWUoZmlsZU5hbWUpIHtcblx0XHRjb25zdCBmaWxlID0gdGhpcy5tb2RlbC5maW5kT25lQnlOYW1lKGZpbGVOYW1lKTtcblxuXHRcdGlmICghZmlsZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGNvbnN0IHN0b3JlID0gRmlsZVVwbG9hZC5nZXRTdG9yZUJ5TmFtZShmaWxlLnN0b3JlKTtcblxuXHRcdHJldHVybiBzdG9yZS5kZWxldGUoZmlsZS5faWQpO1xuXHR9XG5cblx0aW5zZXJ0KGZpbGVEYXRhLCBzdHJlYW1PckJ1ZmZlciwgY2IpIHtcblx0XHRmaWxlRGF0YS5zaXplID0gcGFyc2VJbnQoZmlsZURhdGEuc2l6ZSkgfHwgMDtcblxuXHRcdC8vIENoZWNrIGlmIHRoZSBmaWxlRGF0YSBtYXRjaGVzIHN0b3JlIGZpbHRlclxuXHRcdGNvbnN0IGZpbHRlciA9IHRoaXMuc3RvcmUuZ2V0RmlsdGVyKCk7XG5cdFx0aWYgKGZpbHRlciAmJiBmaWx0ZXIuY2hlY2spIHtcblx0XHRcdGZpbHRlci5jaGVjayhmaWxlRGF0YSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsZUlkID0gdGhpcy5zdG9yZS5jcmVhdGUoZmlsZURhdGEpO1xuXHRcdGNvbnN0IHRva2VuID0gdGhpcy5zdG9yZS5jcmVhdGVUb2tlbihmaWxlSWQpO1xuXHRcdGNvbnN0IHRtcEZpbGUgPSBVcGxvYWRGUy5nZXRUZW1wRmlsZVBhdGgoZmlsZUlkKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRpZiAoc3RyZWFtT3JCdWZmZXIgaW5zdGFuY2VvZiBzdHJlYW0pIHtcblx0XHRcdFx0c3RyZWFtT3JCdWZmZXIucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbSh0bXBGaWxlKSk7XG5cdFx0XHR9IGVsc2UgaWYgKHN0cmVhbU9yQnVmZmVyIGluc3RhbmNlb2YgQnVmZmVyKSB7XG5cdFx0XHRcdGZzLndyaXRlRmlsZVN5bmModG1wRmlsZSwgc3RyZWFtT3JCdWZmZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGZpbGUgdHlwZScpO1xuXHRcdFx0fVxuXG5cdFx0XHRjb25zdCBmaWxlID0gTWV0ZW9yLmNhbGwoJ3Vmc0NvbXBsZXRlJywgZmlsZUlkLCB0aGlzLm5hbWUsIHRva2VuKTtcblxuXHRcdFx0aWYgKGNiKSB7XG5cdFx0XHRcdGNiKG51bGwsIGZpbGUpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZmlsZTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRpZiAoY2IpIHtcblx0XHRcdFx0Y2IoZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBlO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufVxuIiwiLyogZ2xvYmFscyBVcGxvYWRGUywgSW5zdGFuY2VTdGF0dXMgKi9cblxuaW1wb3J0IGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgVVJMIGZyb20gJ3VybCc7XG5cbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoJ1VwbG9hZFByb3h5Jyk7XG5cbldlYkFwcC5jb25uZWN0SGFuZGxlcnMuc3RhY2sudW5zaGlmdCh7XG5cdHJvdXRlOiAnJyxcblx0aGFuZGxlOiBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdFx0Ly8gUXVpY2sgY2hlY2sgdG8gc2VlIGlmIHJlcXVlc3Qgc2hvdWxkIGJlIGNhdGNoXG5cdFx0aWYgKHJlcS51cmwuaW5kZXhPZihVcGxvYWRGUy5jb25maWcuc3RvcmVzUGF0aCkgPT09IC0xKSB7XG5cdFx0XHRyZXR1cm4gbmV4dCgpO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5kZWJ1ZygnVXBsb2FkIFVSTDonLCByZXEudXJsKTtcblxuXHRcdGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcblx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gUmVtb3ZlIHN0b3JlIHBhdGhcblx0XHRjb25zdCBwYXJzZWRVcmwgPSBVUkwucGFyc2UocmVxLnVybCk7XG5cdFx0Y29uc3QgcGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZS5zdWJzdHIoVXBsb2FkRlMuY29uZmlnLnN0b3Jlc1BhdGgubGVuZ3RoICsgMSk7XG5cblx0XHQvLyBHZXQgc3RvcmVcblx0XHRjb25zdCByZWdFeHAgPSBuZXcgUmVnRXhwKCdeXFwvKFteXFwvXFw/XSspXFwvKFteXFwvXFw/XSspJCcpO1xuXHRcdGNvbnN0IG1hdGNoID0gcmVnRXhwLmV4ZWMocGF0aCk7XG5cblx0XHQvLyBSZXF1ZXN0IGlzIG5vdCB2YWxpZFxuXHRcdGlmIChtYXRjaCA9PT0gbnVsbCkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDApO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8vIEdldCBzdG9yZVxuXHRcdGNvbnN0IHN0b3JlID0gVXBsb2FkRlMuZ2V0U3RvcmUobWF0Y2hbMV0pO1xuXHRcdGlmICghc3RvcmUpIHtcblx0XHRcdHJlcy53cml0ZUhlYWQoNDA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvLyBHZXQgZmlsZVxuXHRcdGNvbnN0IGZpbGVJZCA9IG1hdGNoWzJdO1xuXHRcdGNvbnN0IGZpbGUgPSBzdG9yZS5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7IF9pZDogZmlsZUlkIH0pO1xuXHRcdGlmIChmaWxlID09PSB1bmRlZmluZWQpIHtcblx0XHRcdHJlcy53cml0ZUhlYWQoNDA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoZmlsZS5pbnN0YW5jZUlkID09PSBJbnN0YW5jZVN0YXR1cy5pZCgpKSB7XG5cdFx0XHRsb2dnZXIuZGVidWcoJ0NvcnJlY3QgaW5zdGFuY2UnKTtcblx0XHRcdHJldHVybiBuZXh0KCk7XG5cdFx0fVxuXG5cdFx0Ly8gUHJveHkgdG8gb3RoZXIgaW5zdGFuY2Vcblx0XHRjb25zdCBpbnN0YW5jZSA9IEluc3RhbmNlU3RhdHVzLmdldENvbGxlY3Rpb24oKS5maW5kT25lKHsgX2lkOiBmaWxlLmluc3RhbmNlSWQgfSk7XG5cblx0XHRpZiAoaW5zdGFuY2UgPT0gbnVsbCkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmIChpbnN0YW5jZS5leHRyYUluZm9ybWF0aW9uLmhvc3QgPT09IHByb2Nlc3MuZW52LklOU1RBTkNFX0lQICYmIFJvY2tldENoYXQuaXNEb2NrZXIoKSA9PT0gZmFsc2UpIHtcblx0XHRcdGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24uaG9zdCA9ICdsb2NhbGhvc3QnO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5kZWJ1ZygnV3JvbmcgaW5zdGFuY2UsIHByb3hpbmcgdG86JywgYCR7IGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24uaG9zdCB9OiR7IGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24ucG9ydCB9YCk7XG5cblx0XHRjb25zdCBvcHRpb25zID0ge1xuXHRcdFx0aG9zdG5hbWU6IGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24uaG9zdCxcblx0XHRcdHBvcnQ6IGluc3RhbmNlLmV4dHJhSW5mb3JtYXRpb24ucG9ydCxcblx0XHRcdHBhdGg6IHJlcS5vcmlnaW5hbFVybCxcblx0XHRcdG1ldGhvZDogJ1BPU1QnLFxuXHRcdH07XG5cblx0XHRjb25zdCBwcm94eSA9IGh0dHAucmVxdWVzdChvcHRpb25zLCBmdW5jdGlvbihwcm94eV9yZXMpIHtcblx0XHRcdHByb3h5X3Jlcy5waXBlKHJlcywge1xuXHRcdFx0XHRlbmQ6IHRydWUsXG5cdFx0XHR9KTtcblx0XHR9KTtcblxuXHRcdHJlcS5waXBlKHByb3h5LCB7XG5cdFx0XHRlbmQ6IHRydWUsXG5cdFx0fSk7XG5cdH0pLFxufSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWQsIFdlYkFwcCAqL1xuXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZSgnL2ZpbGUtdXBsb2FkLycsXHRmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXG5cdGNvbnN0IG1hdGNoID0gL15cXC8oW15cXC9dKylcXC8oLiopLy5leGVjKHJlcS51cmwpO1xuXG5cdGlmIChtYXRjaFsxXSkge1xuXHRcdGNvbnN0IGZpbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmZpbmRPbmVCeUlkKG1hdGNoWzFdKTtcblxuXHRcdGlmIChmaWxlKSB7XG5cdFx0XHRpZiAoIU1ldGVvci5zZXR0aW5ncy5wdWJsaWMuc2FuZHN0b3JtICYmICFGaWxlVXBsb2FkLnJlcXVlc3RDYW5BY2Nlc3NGaWxlcyhyZXEpKSB7XG5cdFx0XHRcdHJlcy53cml0ZUhlYWQoNDAzKTtcblx0XHRcdFx0cmV0dXJuIHJlcy5lbmQoKTtcblx0XHRcdH1cblxuXHRcdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1TZWN1cml0eS1Qb2xpY3knLCAnZGVmYXVsdC1zcmMgXFwnbm9uZVxcJycpO1xuXHRcdFx0cmV0dXJuIEZpbGVVcGxvYWQuZ2V0KGZpbGUsIHJlcSwgcmVzLCBuZXh0KTtcblx0XHR9XG5cdH1cblxuXHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdHJlcy5lbmQoKTtcbn0pO1xuIiwiLyogZ2xvYmFscyBVcGxvYWRGUyAqL1xuXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcbmltcG9ydCAnLi9BbWF6b25TMy5qcyc7XG5pbXBvcnQgJy4vRmlsZVN5c3RlbS5qcyc7XG5pbXBvcnQgJy4vR29vZ2xlU3RvcmFnZS5qcyc7XG5pbXBvcnQgJy4vR3JpZEZTLmpzJztcbmltcG9ydCAnLi9XZWJkYXYuanMnO1xuaW1wb3J0ICcuL1NsaW5nc2hvdF9ERVBSRUNBVEVELmpzJztcblxuY29uc3QgY29uZmlnU3RvcmUgPSBfLmRlYm91bmNlKCgpID0+IHtcblx0Y29uc3Qgc3RvcmUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnKTtcblxuXHRpZiAoc3RvcmUpIHtcblx0XHRjb25zb2xlLmxvZygnU2V0dGluZyBkZWZhdWx0IGZpbGUgc3RvcmUgdG8nLCBzdG9yZSk7XG5cdFx0VXBsb2FkRlMuZ2V0U3RvcmVzKCkuQXZhdGFycyA9IFVwbG9hZEZTLmdldFN0b3JlKGAkeyBzdG9yZSB9OkF2YXRhcnNgKTtcblx0XHRVcGxvYWRGUy5nZXRTdG9yZXMoKS5VcGxvYWRzID0gVXBsb2FkRlMuZ2V0U3RvcmUoYCR7IHN0b3JlIH06VXBsb2Fkc2ApO1xuXHRcdFVwbG9hZEZTLmdldFN0b3JlcygpLlVzZXJEYXRhRmlsZXMgPSBVcGxvYWRGUy5nZXRTdG9yZShgJHsgc3RvcmUgfTpVc2VyRGF0YUZpbGVzYCk7XG5cdH1cbn0sIDEwMDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfLywgY29uZmlnU3RvcmUpO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkICovXG5cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuaW1wb3J0ICcuLi8uLi91ZnMvQW1hem9uUzMvc2VydmVyLmpzJztcbmltcG9ydCBodHRwIGZyb20gJ2h0dHAnO1xuaW1wb3J0IGh0dHBzIGZyb20gJ2h0dHBzJztcblxuY29uc3QgZ2V0ID0gZnVuY3Rpb24oZmlsZSwgcmVxLCByZXMpIHtcblx0Y29uc3QgZmlsZVVybCA9IHRoaXMuc3RvcmUuZ2V0UmVkaXJlY3RVUkwoZmlsZSk7XG5cblx0aWYgKGZpbGVVcmwpIHtcblx0XHRjb25zdCBzdG9yZVR5cGUgPSBmaWxlLnN0b3JlLnNwbGl0KCc6JykucG9wKCk7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGBGaWxlVXBsb2FkX1MzX1Byb3h5XyR7IHN0b3JlVHlwZSB9YCkpIHtcblx0XHRcdGNvbnN0IHJlcXVlc3QgPSAvXmh0dHBzOi8udGVzdChmaWxlVXJsKSA/IGh0dHBzIDogaHR0cDtcblx0XHRcdHJlcXVlc3QuZ2V0KGZpbGVVcmwsIChmaWxlUmVzKSA9PiBmaWxlUmVzLnBpcGUocmVzKSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlcy5yZW1vdmVIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJyk7XG5cdFx0XHRyZXMuc2V0SGVhZGVyKCdMb2NhdGlvbicsIGZpbGVVcmwpO1xuXHRcdFx0cmVzLndyaXRlSGVhZCgzMDIpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRyZXMuZW5kKCk7XG5cdH1cbn07XG5cbmNvbnN0IGNvcHkgPSBmdW5jdGlvbihmaWxlLCBvdXQpIHtcblx0Y29uc3QgZmlsZVVybCA9IHRoaXMuc3RvcmUuZ2V0UmVkaXJlY3RVUkwoZmlsZSk7XG5cblx0aWYgKGZpbGVVcmwpIHtcblx0XHRjb25zdCByZXF1ZXN0ID0gL15odHRwczovLnRlc3QoZmlsZVVybCkgPyBodHRwcyA6IGh0dHA7XG5cdFx0cmVxdWVzdC5nZXQoZmlsZVVybCwgKGZpbGVSZXMpID0+IGZpbGVSZXMucGlwZShvdXQpKTtcblx0fSBlbHNlIHtcblx0XHRvdXQuZW5kKCk7XG5cdH1cbn07XG5cbmNvbnN0IEFtYXpvblMzVXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnQW1hem9uUzM6VXBsb2FkcycsXG5cdGdldCxcblx0Y29weSxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IEFtYXpvblMzQXZhdGFycyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnQW1hem9uUzM6QXZhdGFycycsXG5cdGdldCxcblx0Y29weSxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IEFtYXpvblMzVXNlckRhdGFGaWxlcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnQW1hem9uUzM6VXNlckRhdGFGaWxlcycsXG5cdGdldCxcblx0Y29weSxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IGNvbmZpZ3VyZSA9IF8uZGVib3VuY2UoZnVuY3Rpb24oKSB7XG5cdGNvbnN0IEJ1Y2tldCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX0J1Y2tldCcpO1xuXHRjb25zdCBBY2wgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BY2wnKTtcblx0Y29uc3QgQVdTQWNjZXNzS2V5SWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NBY2Nlc3NLZXlJZCcpO1xuXHRjb25zdCBBV1NTZWNyZXRBY2Nlc3NLZXkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NTZWNyZXRBY2Nlc3NLZXknKTtcblx0Y29uc3QgVVJMRXhwaXJ5VGltZVNwYW4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19VUkxFeHBpcnlUaW1lU3BhbicpO1xuXHRjb25zdCBSZWdpb24gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19SZWdpb24nKTtcblx0Y29uc3QgU2lnbmF0dXJlVmVyc2lvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX1NpZ25hdHVyZVZlcnNpb24nKTtcblx0Y29uc3QgRm9yY2VQYXRoU3R5bGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19Gb3JjZVBhdGhTdHlsZScpO1xuXHQvLyBjb25zdCBDRE4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19DRE4nKTtcblx0Y29uc3QgQnVja2V0VVJMID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQnVja2V0VVJMJyk7XG5cblx0aWYgKCFCdWNrZXQpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBjb25maWcgPSB7XG5cdFx0Y29ubmVjdGlvbjoge1xuXHRcdFx0c2lnbmF0dXJlVmVyc2lvbjogU2lnbmF0dXJlVmVyc2lvbixcblx0XHRcdHMzRm9yY2VQYXRoU3R5bGU6IEZvcmNlUGF0aFN0eWxlLFxuXHRcdFx0cGFyYW1zOiB7XG5cdFx0XHRcdEJ1Y2tldCxcblx0XHRcdFx0QUNMOiBBY2wsXG5cdFx0XHR9LFxuXHRcdFx0cmVnaW9uOiBSZWdpb24sXG5cdFx0fSxcblx0XHRVUkxFeHBpcnlUaW1lU3Bhbixcblx0fTtcblxuXHRpZiAoQVdTQWNjZXNzS2V5SWQpIHtcblx0XHRjb25maWcuY29ubmVjdGlvbi5hY2Nlc3NLZXlJZCA9IEFXU0FjY2Vzc0tleUlkO1xuXHR9XG5cblx0aWYgKEFXU1NlY3JldEFjY2Vzc0tleSkge1xuXHRcdGNvbmZpZy5jb25uZWN0aW9uLnNlY3JldEFjY2Vzc0tleSA9IEFXU1NlY3JldEFjY2Vzc0tleTtcblx0fVxuXG5cdGlmIChCdWNrZXRVUkwpIHtcblx0XHRjb25maWcuY29ubmVjdGlvbi5lbmRwb2ludCA9IEJ1Y2tldFVSTDtcblx0fVxuXG5cdEFtYXpvblMzVXBsb2Fkcy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdBbWF6b25TMycsIEFtYXpvblMzVXBsb2Fkcy5uYW1lLCBjb25maWcpO1xuXHRBbWF6b25TM0F2YXRhcnMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnQW1hem9uUzMnLCBBbWF6b25TM0F2YXRhcnMubmFtZSwgY29uZmlnKTtcblx0QW1hem9uUzNVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0FtYXpvblMzJywgQW1hem9uUzNVc2VyRGF0YUZpbGVzLm5hbWUsIGNvbmZpZyk7XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfUzNfLywgY29uZmlndXJlKTtcbiIsIi8qIGdsb2JhbHMgRmlsZVVwbG9hZCwgVXBsb2FkRlMgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuXG5jb25zdCBGaWxlU3lzdGVtVXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnRmlsZVN5c3RlbTpVcGxvYWRzJyxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xuXG5cdGdldChmaWxlLCByZXEsIHJlcykge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5zdG9yZS5nZXRGaWxlUGF0aChmaWxlLl9pZCwgZmlsZSk7XG5cblx0XHR0cnkge1xuXHRcdFx0Y29uc3Qgc3RhdCA9IE1ldGVvci53cmFwQXN5bmMoZnMuc3RhdCkoZmlsZVBhdGgpO1xuXG5cdFx0XHRpZiAoc3RhdCAmJiBzdGF0LmlzRmlsZSgpKSB7XG5cdFx0XHRcdGZpbGUgPSBGaWxlVXBsb2FkLmFkZEV4dGVuc2lvblRvKGZpbGUpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lKj1VVEYtOCcnJHsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUubmFtZSkgfWApO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdMYXN0LU1vZGlmaWVkJywgZmlsZS51cGxvYWRlZEF0LnRvVVRDU3RyaW5nKCkpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBmaWxlLnR5cGUpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cblx0XHRcdFx0dGhpcy5zdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGUuX2lkLCBmaWxlKS5waXBlKHJlcyk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSxcblxuXHRjb3B5KGZpbGUsIG91dCkge1xuXHRcdGNvbnN0IGZpbGVQYXRoID0gdGhpcy5zdG9yZS5nZXRGaWxlUGF0aChmaWxlLl9pZCwgZmlsZSk7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHN0YXQgPSBNZXRlb3Iud3JhcEFzeW5jKGZzLnN0YXQpKGZpbGVQYXRoKTtcblxuXHRcdFx0aWYgKHN0YXQgJiYgc3RhdC5pc0ZpbGUoKSkge1xuXHRcdFx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblxuXHRcdFx0XHR0aGlzLnN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZS5faWQsIGZpbGUpLnBpcGUob3V0KTtcblx0XHRcdH1cblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRvdXQuZW5kKCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9LFxufSk7XG5cbmNvbnN0IEZpbGVTeXN0ZW1BdmF0YXJzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdGaWxlU3lzdGVtOkF2YXRhcnMnLFxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0Y29uc3QgZmlsZVBhdGggPSB0aGlzLnN0b3JlLmdldEZpbGVQYXRoKGZpbGUuX2lkLCBmaWxlKTtcblxuXHRcdHRyeSB7XG5cdFx0XHRjb25zdCBzdGF0ID0gTWV0ZW9yLndyYXBBc3luYyhmcy5zdGF0KShmaWxlUGF0aCk7XG5cblx0XHRcdGlmIChzdGF0ICYmIHN0YXQuaXNGaWxlKCkpIHtcblx0XHRcdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cblx0XHRcdFx0dGhpcy5zdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGUuX2lkLCBmaWxlKS5waXBlKHJlcyk7XG5cdFx0XHR9XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0cmVzLndyaXRlSGVhZCg0MDQpO1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fSxcbn0pO1xuXG5jb25zdCBGaWxlU3lzdGVtVXNlckRhdGFGaWxlcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnRmlsZVN5c3RlbTpVc2VyRGF0YUZpbGVzJyxcblxuXHRnZXQoZmlsZSwgcmVxLCByZXMpIHtcblx0XHRjb25zdCBmaWxlUGF0aCA9IHRoaXMuc3RvcmUuZ2V0RmlsZVBhdGgoZmlsZS5faWQsIGZpbGUpO1xuXG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHN0YXQgPSBNZXRlb3Iud3JhcEFzeW5jKGZzLnN0YXQpKGZpbGVQYXRoKTtcblxuXHRcdFx0aWYgKHN0YXQgJiYgc3RhdC5pc0ZpbGUoKSkge1xuXHRcdFx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1EaXNwb3NpdGlvbicsIGBhdHRhY2htZW50OyBmaWxlbmFtZSo9VVRGLTgnJyR7IGVuY29kZVVSSUNvbXBvbmVudChmaWxlLm5hbWUpIH1gKTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIGZpbGUudXBsb2FkZWRBdC50b1VUQ1N0cmluZygpKTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgZmlsZS50eXBlKTtcblx0XHRcdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1MZW5ndGgnLCBmaWxlLnNpemUpO1xuXG5cdFx0XHRcdHRoaXMuc3RvcmUuZ2V0UmVhZFN0cmVhbShmaWxlLl9pZCwgZmlsZSkucGlwZShyZXMpO1xuXHRcdFx0fVxuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdHJlcy53cml0ZUhlYWQoNDA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH0sXG59KTtcblxuY29uc3QgY3JlYXRlRmlsZVN5c3RlbVN0b3JlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcblx0Y29uc3Qgb3B0aW9ucyA9IHtcblx0XHRwYXRoOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcpLCAvLyAnL3RtcC91cGxvYWRzL3Bob3RvcycsXG5cdH07XG5cblx0RmlsZVN5c3RlbVVwbG9hZHMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnTG9jYWwnLCBGaWxlU3lzdGVtVXBsb2Fkcy5uYW1lLCBvcHRpb25zKTtcblx0RmlsZVN5c3RlbUF2YXRhcnMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnTG9jYWwnLCBGaWxlU3lzdGVtQXZhdGFycy5uYW1lLCBvcHRpb25zKTtcblx0RmlsZVN5c3RlbVVzZXJEYXRhRmlsZXMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnTG9jYWwnLCBGaWxlU3lzdGVtVXNlckRhdGFGaWxlcy5uYW1lLCBvcHRpb25zKTtcblxuXHQvLyBERVBSRUNBVEVEIGJhY2t3YXJkcyBjb21wYXRpYmlsaWx0eSAocmVtb3ZlKVxuXHRVcGxvYWRGUy5nZXRTdG9yZXMoKS5maWxlU3lzdGVtID0gVXBsb2FkRlMuZ2V0U3RvcmVzKClbRmlsZVN5c3RlbVVwbG9hZHMubmFtZV07XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9GaWxlU3lzdGVtUGF0aCcsIGNyZWF0ZUZpbGVTeXN0ZW1TdG9yZSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWQgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgeyBGaWxlVXBsb2FkQ2xhc3MgfSBmcm9tICcuLi9saWIvRmlsZVVwbG9hZCc7XG5pbXBvcnQgJy4uLy4uL3Vmcy9Hb29nbGVTdG9yYWdlL3NlcnZlci5qcyc7XG5pbXBvcnQgaHR0cCBmcm9tICdodHRwJztcbmltcG9ydCBodHRwcyBmcm9tICdodHRwcyc7XG5cbmNvbnN0IGdldCA9IGZ1bmN0aW9uKGZpbGUsIHJlcSwgcmVzKSB7XG5cdHRoaXMuc3RvcmUuZ2V0UmVkaXJlY3RVUkwoZmlsZSwgKGVyciwgZmlsZVVybCkgPT4ge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHR9XG5cblx0XHRpZiAoZmlsZVVybCkge1xuXHRcdFx0Y29uc3Qgc3RvcmVUeXBlID0gZmlsZS5zdG9yZS5zcGxpdCgnOicpLnBvcCgpO1xuXHRcdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGBGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfUHJveHlfJHsgc3RvcmVUeXBlIH1gKSkge1xuXHRcdFx0XHRjb25zdCByZXF1ZXN0ID0gL15odHRwczovLnRlc3QoZmlsZVVybCkgPyBodHRwcyA6IGh0dHA7XG5cdFx0XHRcdHJlcXVlc3QuZ2V0KGZpbGVVcmwsIChmaWxlUmVzKSA9PiBmaWxlUmVzLnBpcGUocmVzKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXMucmVtb3ZlSGVhZGVyKCdDb250ZW50LUxlbmd0aCcpO1xuXHRcdFx0XHRyZXMuc2V0SGVhZGVyKCdMb2NhdGlvbicsIGZpbGVVcmwpO1xuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMik7XG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmVzLmVuZCgpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBjb3B5ID0gZnVuY3Rpb24oZmlsZSwgb3V0KSB7XG5cdHRoaXMuc3RvcmUuZ2V0UmVkaXJlY3RVUkwoZmlsZSwgKGVyciwgZmlsZVVybCkgPT4ge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHR9XG5cblx0XHRpZiAoZmlsZVVybCkge1xuXHRcdFx0Y29uc3QgcmVxdWVzdCA9IC9eaHR0cHM6Ly50ZXN0KGZpbGVVcmwpID8gaHR0cHMgOiBodHRwO1xuXHRcdFx0cmVxdWVzdC5nZXQoZmlsZVVybCwgKGZpbGVSZXMpID0+IGZpbGVSZXMucGlwZShvdXQpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0b3V0LmVuZCgpO1xuXHRcdH1cblx0fSk7XG59O1xuXG5jb25zdCBHb29nbGVDbG91ZFN0b3JhZ2VVcGxvYWRzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHb29nbGVDbG91ZFN0b3JhZ2U6VXBsb2FkcycsXG5cdGdldCxcblx0Y29weSxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IEdvb2dsZUNsb3VkU3RvcmFnZUF2YXRhcnMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0dvb2dsZUNsb3VkU3RvcmFnZTpBdmF0YXJzJyxcblx0Z2V0LFxuXHRjb3B5LFxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG59KTtcblxuY29uc3QgR29vZ2xlQ2xvdWRTdG9yYWdlVXNlckRhdGFGaWxlcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnR29vZ2xlQ2xvdWRTdG9yYWdlOlVzZXJEYXRhRmlsZXMnLFxuXHRnZXQsXG5cdGNvcHksXG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcbn0pO1xuXG5jb25zdCBjb25maWd1cmUgPSBfLmRlYm91bmNlKGZ1bmN0aW9uKCkge1xuXHRjb25zdCBidWNrZXQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0J1Y2tldCcpO1xuXHRjb25zdCBhY2Nlc3NJZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfQWNjZXNzSWQnKTtcblx0Y29uc3Qgc2VjcmV0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9TZWNyZXQnKTtcblx0Y29uc3QgVVJMRXhwaXJ5VGltZVNwYW4gPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19VUkxFeHBpcnlUaW1lU3BhbicpO1xuXG5cdGlmICghYnVja2V0IHx8ICFhY2Nlc3NJZCB8fCAhc2VjcmV0KSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgY29uZmlnID0ge1xuXHRcdGNvbm5lY3Rpb246IHtcblx0XHRcdGNyZWRlbnRpYWxzOiB7XG5cdFx0XHRcdGNsaWVudF9lbWFpbDogYWNjZXNzSWQsXG5cdFx0XHRcdHByaXZhdGVfa2V5OiBzZWNyZXQsXG5cdFx0XHR9LFxuXHRcdH0sXG5cdFx0YnVja2V0LFxuXHRcdFVSTEV4cGlyeVRpbWVTcGFuLFxuXHR9O1xuXG5cdEdvb2dsZUNsb3VkU3RvcmFnZVVwbG9hZHMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR29vZ2xlU3RvcmFnZScsIEdvb2dsZUNsb3VkU3RvcmFnZVVwbG9hZHMubmFtZSwgY29uZmlnKTtcblx0R29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdHb29nbGVTdG9yYWdlJywgR29vZ2xlQ2xvdWRTdG9yYWdlQXZhdGFycy5uYW1lLCBjb25maWcpO1xuXHRHb29nbGVDbG91ZFN0b3JhZ2VVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ0dvb2dsZVN0b3JhZ2UnLCBHb29nbGVDbG91ZFN0b3JhZ2VVc2VyRGF0YUZpbGVzLm5hbWUsIGNvbmZpZyk7XG59LCA1MDApO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV8vLCBjb25maWd1cmUpO1xuIiwiLyogZ2xvYmFscyBGaWxlVXBsb2FkLCBVcGxvYWRGUyAqL1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcblxuaW1wb3J0IHsgRmlsZVVwbG9hZENsYXNzIH0gZnJvbSAnLi4vbGliL0ZpbGVVcGxvYWQnO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdGaWxlVXBsb2FkJyk7XG5cbmZ1bmN0aW9uIEV4dHJhY3RSYW5nZShvcHRpb25zKSB7XG5cdGlmICghKHRoaXMgaW5zdGFuY2VvZiBFeHRyYWN0UmFuZ2UpKSB7XG5cdFx0cmV0dXJuIG5ldyBFeHRyYWN0UmFuZ2Uob3B0aW9ucyk7XG5cdH1cblxuXHR0aGlzLnN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0dGhpcy5zdG9wID0gb3B0aW9ucy5zdG9wO1xuXHR0aGlzLmJ5dGVzX3JlYWQgPSAwO1xuXG5cdHN0cmVhbS5UcmFuc2Zvcm0uY2FsbCh0aGlzLCBvcHRpb25zKTtcbn1cbnV0aWwuaW5oZXJpdHMoRXh0cmFjdFJhbmdlLCBzdHJlYW0uVHJhbnNmb3JtKTtcblxuXG5FeHRyYWN0UmFuZ2UucHJvdG90eXBlLl90cmFuc2Zvcm0gPSBmdW5jdGlvbihjaHVuaywgZW5jLCBjYikge1xuXHRpZiAodGhpcy5ieXRlc19yZWFkID4gdGhpcy5zdG9wKSB7XG5cdFx0Ly8gZG9uZSByZWFkaW5nXG5cdFx0dGhpcy5lbmQoKTtcblx0fSBlbHNlIGlmICh0aGlzLmJ5dGVzX3JlYWQgKyBjaHVuay5sZW5ndGggPCB0aGlzLnN0YXJ0KSB7XG5cdFx0Ly8gdGhpcyBjaHVuayBpcyBzdGlsbCBiZWZvcmUgdGhlIHN0YXJ0IGJ5dGVcblx0fSBlbHNlIHtcblx0XHRsZXQgc3RhcnQ7XG5cdFx0bGV0IHN0b3A7XG5cblx0XHRpZiAodGhpcy5zdGFydCA8PSB0aGlzLmJ5dGVzX3JlYWQpIHtcblx0XHRcdHN0YXJ0ID0gMDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RhcnQgPSB0aGlzLnN0YXJ0IC0gdGhpcy5ieXRlc19yZWFkO1xuXHRcdH1cblx0XHRpZiAoKHRoaXMuc3RvcCAtIHRoaXMuYnl0ZXNfcmVhZCArIDEpIDwgY2h1bmsubGVuZ3RoKSB7XG5cdFx0XHRzdG9wID0gdGhpcy5zdG9wIC0gdGhpcy5ieXRlc19yZWFkICsgMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c3RvcCA9IGNodW5rLmxlbmd0aDtcblx0XHR9XG5cdFx0Y29uc3QgbmV3Y2h1bmsgPSBjaHVuay5zbGljZShzdGFydCwgc3RvcCk7XG5cdFx0dGhpcy5wdXNoKG5ld2NodW5rKTtcblx0fVxuXHR0aGlzLmJ5dGVzX3JlYWQgKz0gY2h1bmsubGVuZ3RoO1xuXHRjYigpO1xufTtcblxuXG5jb25zdCBnZXRCeXRlUmFuZ2UgPSBmdW5jdGlvbihoZWFkZXIpIHtcblx0aWYgKGhlYWRlcikge1xuXHRcdGNvbnN0IG1hdGNoZXMgPSBoZWFkZXIubWF0Y2goLyhcXGQrKS0oXFxkKykvKTtcblx0XHRpZiAobWF0Y2hlcykge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0c3RhcnQ6IHBhcnNlSW50KG1hdGNoZXNbMV0sIDEwKSxcblx0XHRcdFx0c3RvcDogcGFyc2VJbnQobWF0Y2hlc1syXSwgMTApLFxuXHRcdFx0fTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG51bGw7XG59O1xuXG4vLyBjb2RlIGZyb206IGh0dHBzOi8vZ2l0aHViLmNvbS9qYWxpay9qYWxpay11ZnMvYmxvYi9tYXN0ZXIvdWZzLXNlcnZlci5qcyNMMzEwXG5jb25zdCByZWFkRnJvbUdyaWRGUyA9IGZ1bmN0aW9uKHN0b3JlTmFtZSwgZmlsZUlkLCBmaWxlLCByZXEsIHJlcykge1xuXHRjb25zdCBzdG9yZSA9IFVwbG9hZEZTLmdldFN0b3JlKHN0b3JlTmFtZSk7XG5cdGNvbnN0IHJzID0gc3RvcmUuZ2V0UmVhZFN0cmVhbShmaWxlSWQsIGZpbGUpO1xuXHRjb25zdCB3cyA9IG5ldyBzdHJlYW0uUGFzc1Rocm91Z2goKTtcblxuXHRbcnMsIHdzXS5mb3JFYWNoKChzdHJlYW0pID0+IHN0cmVhbS5vbignZXJyb3InLCBmdW5jdGlvbihlcnIpIHtcblx0XHRzdG9yZS5vblJlYWRFcnJvci5jYWxsKHN0b3JlLCBlcnIsIGZpbGVJZCwgZmlsZSk7XG5cdFx0cmVzLmVuZCgpO1xuXHR9KSk7XG5cblx0d3Mub24oJ2Nsb3NlJywgZnVuY3Rpb24oKSB7XG5cdFx0Ly8gQ2xvc2Ugb3V0cHV0IHN0cmVhbSBhdCB0aGUgZW5kXG5cdFx0d3MuZW1pdCgnZW5kJyk7XG5cdH0pO1xuXG5cdGNvbnN0IGFjY2VwdCA9IHJlcS5oZWFkZXJzWydhY2NlcHQtZW5jb2RpbmcnXSB8fCAnJztcblxuXHQvLyBUcmFuc2Zvcm0gc3RyZWFtXG5cdHN0b3JlLnRyYW5zZm9ybVJlYWQocnMsIHdzLCBmaWxlSWQsIGZpbGUsIHJlcSk7XG5cdGNvbnN0IHJhbmdlID0gZ2V0Qnl0ZVJhbmdlKHJlcS5oZWFkZXJzLnJhbmdlKTtcblx0bGV0IG91dF9vZl9yYW5nZSA9IGZhbHNlO1xuXHRpZiAocmFuZ2UpIHtcblx0XHRvdXRfb2ZfcmFuZ2UgPSAocmFuZ2Uuc3RhcnQgPiBmaWxlLnNpemUpIHx8IChyYW5nZS5zdG9wIDw9IHJhbmdlLnN0YXJ0KSB8fCAocmFuZ2Uuc3RvcCA+IGZpbGUuc2l6ZSk7XG5cdH1cblxuXHQvLyBDb21wcmVzcyBkYXRhIHVzaW5nIGd6aXBcblx0aWYgKGFjY2VwdC5tYXRjaCgvXFxiZ3ppcFxcYi8pICYmIHJhbmdlID09PSBudWxsKSB7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1FbmNvZGluZycsICdnemlwJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZSh6bGliLmNyZWF0ZUd6aXAoKSkucGlwZShyZXMpO1xuXHR9IGVsc2UgaWYgKGFjY2VwdC5tYXRjaCgvXFxiZGVmbGF0ZVxcYi8pICYmIHJhbmdlID09PSBudWxsKSB7XG5cdFx0Ly8gQ29tcHJlc3MgZGF0YSB1c2luZyBkZWZsYXRlXG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1FbmNvZGluZycsICdkZWZsYXRlJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZSh6bGliLmNyZWF0ZURlZmxhdGUoKSkucGlwZShyZXMpO1xuXHR9IGVsc2UgaWYgKHJhbmdlICYmIG91dF9vZl9yYW5nZSkge1xuXHRcdC8vIG91dCBvZiByYW5nZSByZXF1ZXN0LCByZXR1cm4gNDE2XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMucmVtb3ZlSGVhZGVyKCdDb250ZW50LVR5cGUnKTtcblx0XHRyZXMucmVtb3ZlSGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJyk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignTGFzdC1Nb2RpZmllZCcpO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtUmFuZ2UnLCBgYnl0ZXMgKi8keyBmaWxlLnNpemUgfWApO1xuXHRcdHJlcy53cml0ZUhlYWQoNDE2KTtcblx0XHRyZXMuZW5kKCk7XG5cdH0gZWxzZSBpZiAocmFuZ2UpIHtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVJhbmdlJywgYGJ5dGVzICR7IHJhbmdlLnN0YXJ0IH0tJHsgcmFuZ2Uuc3RvcCB9LyR7IGZpbGUuc2l6ZSB9YCk7XG5cdFx0cmVzLnJlbW92ZUhlYWRlcignQ29udGVudC1MZW5ndGgnKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIHJhbmdlLnN0b3AgLSByYW5nZS5zdGFydCArIDEpO1xuXHRcdHJlcy53cml0ZUhlYWQoMjA2KTtcblx0XHRsb2dnZXIuZGVidWcoJ0ZpbGUgdXBsb2FkIGV4dHJhY3RpbmcgcmFuZ2UnKTtcblx0XHR3cy5waXBlKG5ldyBFeHRyYWN0UmFuZ2UoeyBzdGFydDogcmFuZ2Uuc3RhcnQsIHN0b3A6IHJhbmdlLnN0b3AgfSkpLnBpcGUocmVzKTtcblx0fSBlbHNlIHtcblx0XHRyZXMud3JpdGVIZWFkKDIwMCk7XG5cdFx0d3MucGlwZShyZXMpO1xuXHR9XG59O1xuXG5jb25zdCBjb3B5RnJvbUdyaWRGUyA9IGZ1bmN0aW9uKHN0b3JlTmFtZSwgZmlsZUlkLCBmaWxlLCBvdXQpIHtcblx0Y29uc3Qgc3RvcmUgPSBVcGxvYWRGUy5nZXRTdG9yZShzdG9yZU5hbWUpO1xuXHRjb25zdCBycyA9IHN0b3JlLmdldFJlYWRTdHJlYW0oZmlsZUlkLCBmaWxlKTtcblxuXHRbcnMsIG91dF0uZm9yRWFjaCgoc3RyZWFtKSA9PiBzdHJlYW0ub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG5cdFx0c3RvcmUub25SZWFkRXJyb3IuY2FsbChzdG9yZSwgZXJyLCBmaWxlSWQsIGZpbGUpO1xuXHRcdG91dC5lbmQoKTtcblx0fSkpO1xuXG5cdHJzLnBpcGUob3V0KTtcbn07XG5cbkZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdHcmlkRlMnLCAnR3JpZEZTOlVwbG9hZHMnLCB7XG5cdGNvbGxlY3Rpb25OYW1lOiAncm9ja2V0Y2hhdF91cGxvYWRzJyxcbn0pO1xuXG5GaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR3JpZEZTJywgJ0dyaWRGUzpVc2VyRGF0YUZpbGVzJywge1xuXHRjb2xsZWN0aW9uTmFtZTogJ3JvY2tldGNoYXRfdXNlckRhdGFGaWxlcycsXG59KTtcblxuLy8gREVQUkVDQVRFRDogYmFja3dhcmRzIGNvbXBhdGliaWxpdHkgKHJlbW92ZSlcblVwbG9hZEZTLmdldFN0b3JlcygpLnJvY2tldGNoYXRfdXBsb2FkcyA9IFVwbG9hZEZTLmdldFN0b3JlcygpWydHcmlkRlM6VXBsb2FkcyddO1xuXG5GaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnR3JpZEZTJywgJ0dyaWRGUzpBdmF0YXJzJywge1xuXHRjb2xsZWN0aW9uTmFtZTogJ3JvY2tldGNoYXRfYXZhdGFycycsXG59KTtcblxuXG5uZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ0dyaWRGUzpVcGxvYWRzJyxcblxuXHRnZXQoZmlsZSwgcmVxLCByZXMpIHtcblx0XHRmaWxlID0gRmlsZVVwbG9hZC5hZGRFeHRlbnNpb25UbyhmaWxlKTtcblxuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtRGlzcG9zaXRpb24nLCBgYXR0YWNobWVudDsgZmlsZW5hbWUqPVVURi04JyckeyBlbmNvZGVVUklDb21wb25lbnQoZmlsZS5uYW1lKSB9YCk7XG5cdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIGZpbGUudXBsb2FkZWRBdC50b1VUQ1N0cmluZygpKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCBmaWxlLnR5cGUpO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgZmlsZS5zaXplKTtcblxuXHRcdHJldHVybiByZWFkRnJvbUdyaWRGUyhmaWxlLnN0b3JlLCBmaWxlLl9pZCwgZmlsZSwgcmVxLCByZXMpO1xuXHR9LFxuXG5cdGNvcHkoZmlsZSwgb3V0KSB7XG5cdFx0Y29weUZyb21HcmlkRlMoZmlsZS5zdG9yZSwgZmlsZS5faWQsIGZpbGUsIG91dCk7XG5cdH0sXG59KTtcblxubmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdHcmlkRlM6VXNlckRhdGFGaWxlcycsXG5cblx0Z2V0KGZpbGUsIHJlcSwgcmVzKSB7XG5cdFx0ZmlsZSA9IEZpbGVVcGxvYWQuYWRkRXh0ZW5zaW9uVG8oZmlsZSk7XG5cblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lKj1VVEYtOCcnJHsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUubmFtZSkgfWApO1xuXHRcdHJlcy5zZXRIZWFkZXIoJ0xhc3QtTW9kaWZpZWQnLCBmaWxlLnVwbG9hZGVkQXQudG9VVENTdHJpbmcoKSk7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgZmlsZS50eXBlKTtcblx0XHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cblx0XHRyZXR1cm4gcmVhZEZyb21HcmlkRlMoZmlsZS5zdG9yZSwgZmlsZS5faWQsIGZpbGUsIHJlcSwgcmVzKTtcblx0fSxcblxuXHRjb3B5KGZpbGUsIG91dCkge1xuXHRcdGNvcHlGcm9tR3JpZEZTKGZpbGUuc3RvcmUsIGZpbGUuX2lkLCBmaWxlLCBvdXQpO1xuXHR9LFxufSk7XG5cbm5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnR3JpZEZTOkF2YXRhcnMnLFxuXG5cdGdldChmaWxlLCByZXEsIHJlcykge1xuXHRcdGZpbGUgPSBGaWxlVXBsb2FkLmFkZEV4dGVuc2lvblRvKGZpbGUpO1xuXG5cdFx0cmV0dXJuIHJlYWRGcm9tR3JpZEZTKGZpbGUuc3RvcmUsIGZpbGUuX2lkLCBmaWxlLCByZXEsIHJlcyk7XG5cdH0sXG59KTtcbiIsIi8qIGdsb2JhbHMgU2xpbmdzaG90LCBGaWxlVXBsb2FkICovXG5pbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuY29uc3QgY29uZmlndXJlU2xpbmdzaG90ID0gXy5kZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHR5cGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnKTtcblx0Y29uc3QgYnVja2V0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQnVja2V0Jyk7XG5cdGNvbnN0IGFjbCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX0FjbCcpO1xuXHRjb25zdCBhY2Nlc3NLZXkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NBY2Nlc3NLZXlJZCcpO1xuXHRjb25zdCBzZWNyZXRLZXkgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19BV1NTZWNyZXRBY2Nlc3NLZXknKTtcblx0Y29uc3QgY2RuID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfUzNfQ0ROJyk7XG5cdGNvbnN0IHJlZ2lvbiA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1MzX1JlZ2lvbicpO1xuXHRjb25zdCBidWNrZXRVcmwgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TM19CdWNrZXRVUkwnKTtcblxuXHRkZWxldGUgU2xpbmdzaG90Ll9kaXJlY3RpdmVzWydyb2NrZXRjaGF0LXVwbG9hZHMnXTtcblxuXHRpZiAodHlwZSA9PT0gJ0FtYXpvblMzJyAmJiAhXy5pc0VtcHR5KGJ1Y2tldCkgJiYgIV8uaXNFbXB0eShhY2Nlc3NLZXkpICYmICFfLmlzRW1wdHkoc2VjcmV0S2V5KSkge1xuXHRcdGlmIChTbGluZ3Nob3QuX2RpcmVjdGl2ZXNbJ3JvY2tldGNoYXQtdXBsb2FkcyddKSB7XG5cdFx0XHRkZWxldGUgU2xpbmdzaG90Ll9kaXJlY3RpdmVzWydyb2NrZXRjaGF0LXVwbG9hZHMnXTtcblx0XHR9XG5cdFx0Y29uc3QgY29uZmlnID0ge1xuXHRcdFx0YnVja2V0LFxuXHRcdFx0a2V5KGZpbGUsIG1ldGFDb250ZXh0KSB7XG5cdFx0XHRcdGNvbnN0IGlkID0gUmFuZG9tLmlkKCk7XG5cdFx0XHRcdGNvbnN0IHBhdGggPSBgJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ3VuaXF1ZUlEJykgfS91cGxvYWRzLyR7IG1ldGFDb250ZXh0LnJpZCB9LyR7IHRoaXMudXNlcklkIH0vJHsgaWQgfWA7XG5cblx0XHRcdFx0Y29uc3QgdXBsb2FkID0ge1xuXHRcdFx0XHRcdF9pZDogaWQsXG5cdFx0XHRcdFx0cmlkOiBtZXRhQ29udGV4dC5yaWQsXG5cdFx0XHRcdFx0QW1hem9uUzM6IHtcblx0XHRcdFx0XHRcdHBhdGgsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5VcGxvYWRzLmluc2VydEZpbGVJbml0KHRoaXMudXNlcklkLCAnQW1hem9uUzM6VXBsb2FkcycsIGZpbGUsIHVwbG9hZCk7XG5cblx0XHRcdFx0cmV0dXJuIHBhdGg7XG5cdFx0XHR9LFxuXHRcdFx0QVdTQWNjZXNzS2V5SWQ6IGFjY2Vzc0tleSxcblx0XHRcdEFXU1NlY3JldEFjY2Vzc0tleTogc2VjcmV0S2V5LFxuXHRcdH07XG5cblx0XHRpZiAoIV8uaXNFbXB0eShhY2wpKSB7XG5cdFx0XHRjb25maWcuYWNsID0gYWNsO1xuXHRcdH1cblxuXHRcdGlmICghXy5pc0VtcHR5KGNkbikpIHtcblx0XHRcdGNvbmZpZy5jZG4gPSBjZG47XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmlzRW1wdHkocmVnaW9uKSkge1xuXHRcdFx0Y29uZmlnLnJlZ2lvbiA9IHJlZ2lvbjtcblx0XHR9XG5cblx0XHRpZiAoIV8uaXNFbXB0eShidWNrZXRVcmwpKSB7XG5cdFx0XHRjb25maWcuYnVja2V0VXJsID0gYnVja2V0VXJsO1xuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRTbGluZ3Nob3QuY3JlYXRlRGlyZWN0aXZlKCdyb2NrZXRjaGF0LXVwbG9hZHMnLCBTbGluZ3Nob3QuUzNTdG9yYWdlLCBjb25maWcpO1xuXHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNvbmZpZ3VyaW5nIFMzIC0+JywgZS5tZXNzYWdlKTtcblx0XHR9XG5cdH1cbn0sIDUwMCk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsIGNvbmZpZ3VyZVNsaW5nc2hvdCk7XG5Sb2NrZXRDaGF0LnNldHRpbmdzLmdldCgvXkZpbGVVcGxvYWRfUzNfLywgY29uZmlndXJlU2xpbmdzaG90KTtcblxuXG5jb25zdCBjcmVhdGVHb29nbGVTdG9yYWdlRGlyZWN0aXZlID0gXy5kZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHR5cGUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnKTtcblx0Y29uc3QgYnVja2V0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9CdWNrZXQnKTtcblx0Y29uc3QgYWNjZXNzSWQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0FjY2Vzc0lkJyk7XG5cdGNvbnN0IHNlY3JldCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfU2VjcmV0Jyk7XG5cblx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzLWdzJ107XG5cblx0aWYgKHR5cGUgPT09ICdHb29nbGVDbG91ZFN0b3JhZ2UnICYmICFfLmlzRW1wdHkoc2VjcmV0KSAmJiAhXy5pc0VtcHR5KGFjY2Vzc0lkKSAmJiAhXy5pc0VtcHR5KGJ1Y2tldCkpIHtcblx0XHRpZiAoU2xpbmdzaG90Ll9kaXJlY3RpdmVzWydyb2NrZXRjaGF0LXVwbG9hZHMtZ3MnXSkge1xuXHRcdFx0ZGVsZXRlIFNsaW5nc2hvdC5fZGlyZWN0aXZlc1sncm9ja2V0Y2hhdC11cGxvYWRzLWdzJ107XG5cdFx0fVxuXG5cdFx0Y29uc3QgY29uZmlnID0ge1xuXHRcdFx0YnVja2V0LFxuXHRcdFx0R29vZ2xlQWNjZXNzSWQ6IGFjY2Vzc0lkLFxuXHRcdFx0R29vZ2xlU2VjcmV0S2V5OiBzZWNyZXQsXG5cdFx0XHRrZXkoZmlsZSwgbWV0YUNvbnRleHQpIHtcblx0XHRcdFx0Y29uc3QgaWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdFx0Y29uc3QgcGF0aCA9IGAkeyBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgndW5pcXVlSUQnKSB9L3VwbG9hZHMvJHsgbWV0YUNvbnRleHQucmlkIH0vJHsgdGhpcy51c2VySWQgfS8keyBpZCB9YDtcblxuXHRcdFx0XHRjb25zdCB1cGxvYWQgPSB7XG5cdFx0XHRcdFx0X2lkOiBpZCxcblx0XHRcdFx0XHRyaWQ6IG1ldGFDb250ZXh0LnJpZCxcblx0XHRcdFx0XHRHb29nbGVTdG9yYWdlOiB7XG5cdFx0XHRcdFx0XHRwYXRoLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy5pbnNlcnRGaWxlSW5pdCh0aGlzLnVzZXJJZCwgJ0dvb2dsZUNsb3VkU3RvcmFnZTpVcGxvYWRzJywgZmlsZSwgdXBsb2FkKTtcblxuXHRcdFx0XHRyZXR1cm4gcGF0aDtcblx0XHRcdH0sXG5cdFx0fTtcblxuXHRcdHRyeSB7XG5cdFx0XHRTbGluZ3Nob3QuY3JlYXRlRGlyZWN0aXZlKCdyb2NrZXRjaGF0LXVwbG9hZHMtZ3MnLCBTbGluZ3Nob3QuR29vZ2xlQ2xvdWQsIGNvbmZpZyk7XG5cdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0Y29uc29sZS5lcnJvcignRXJyb3IgY29uZmlndXJpbmcgR29vZ2xlQ2xvdWRTdG9yYWdlIC0+JywgZS5tZXNzYWdlKTtcblx0XHR9XG5cdH1cbn0sIDUwMCk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsIGNyZWF0ZUdvb2dsZVN0b3JhZ2VEaXJlY3RpdmUpO1xuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15GaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfLywgY3JlYXRlR29vZ2xlU3RvcmFnZURpcmVjdGl2ZSk7XG4iLCIvKiBnbG9iYWxzIEZpbGVVcGxvYWQgKi9cblxuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgeyBGaWxlVXBsb2FkQ2xhc3MgfSBmcm9tICcuLi9saWIvRmlsZVVwbG9hZCc7XG5pbXBvcnQgJy4uLy4uL3Vmcy9XZWJkYXYvc2VydmVyLmpzJztcblxuY29uc3QgZ2V0ID0gZnVuY3Rpb24oZmlsZSwgcmVxLCByZXMpIHtcblx0dGhpcy5zdG9yZS5nZXRSZWFkU3RyZWFtKGZpbGUuX2lkLCBmaWxlKS5waXBlKHJlcyk7XG59O1xuXG5jb25zdCBjb3B5ID0gZnVuY3Rpb24oZmlsZSwgb3V0KSB7XG5cdHRoaXMuc3RvcmUuZ2V0UmVhZFN0cmVhbShmaWxlLl9pZCwgZmlsZSkucGlwZShvdXQpO1xufTtcblxuY29uc3QgV2ViZGF2VXBsb2FkcyA9IG5ldyBGaWxlVXBsb2FkQ2xhc3Moe1xuXHRuYW1lOiAnV2ViZGF2OlVwbG9hZHMnLFxuXHRnZXQsXG5cdGNvcHksXG5cdC8vIHN0b3JlIHNldHRlZCBiZWxsb3dcbn0pO1xuXG5jb25zdCBXZWJkYXZBdmF0YXJzID0gbmV3IEZpbGVVcGxvYWRDbGFzcyh7XG5cdG5hbWU6ICdXZWJkYXY6QXZhdGFycycsXG5cdGdldCxcblx0Y29weSxcblx0Ly8gc3RvcmUgc2V0dGVkIGJlbGxvd1xufSk7XG5cbmNvbnN0IFdlYmRhdlVzZXJEYXRhRmlsZXMgPSBuZXcgRmlsZVVwbG9hZENsYXNzKHtcblx0bmFtZTogJ1dlYmRhdjpVc2VyRGF0YUZpbGVzJyxcblx0Z2V0LFxuXHRjb3B5LFxuXHQvLyBzdG9yZSBzZXR0ZWQgYmVsbG93XG59KTtcblxuY29uc3QgY29uZmlndXJlID0gXy5kZWJvdW5jZShmdW5jdGlvbigpIHtcblx0Y29uc3QgdXBsb2FkRm9sZGVyUGF0aCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1dlYmRhdl9VcGxvYWRfRm9sZGVyX1BhdGgnKTtcblx0Y29uc3Qgc2VydmVyID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1NlcnZlcl9VUkwnKTtcblx0Y29uc3QgdXNlcm5hbWUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9XZWJkYXZfVXNlcm5hbWUnKTtcblx0Y29uc3QgcGFzc3dvcmQgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnRmlsZVVwbG9hZF9XZWJkYXZfUGFzc3dvcmQnKTtcblxuXHRpZiAoIXNlcnZlciB8fCAhdXNlcm5hbWUgfHwgIXBhc3N3b3JkKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgY29uZmlnID0ge1xuXHRcdGNvbm5lY3Rpb246IHtcblx0XHRcdGNyZWRlbnRpYWxzOiB7XG5cdFx0XHRcdHNlcnZlcixcblx0XHRcdFx0dXNlcm5hbWUsXG5cdFx0XHRcdHBhc3N3b3JkLFxuXHRcdFx0fSxcblx0XHR9LFxuXHRcdHVwbG9hZEZvbGRlclBhdGgsXG5cdH07XG5cblx0V2ViZGF2VXBsb2Fkcy5zdG9yZSA9IEZpbGVVcGxvYWQuY29uZmlndXJlVXBsb2Fkc1N0b3JlKCdXZWJkYXYnLCBXZWJkYXZVcGxvYWRzLm5hbWUsIGNvbmZpZyk7XG5cdFdlYmRhdkF2YXRhcnMuc3RvcmUgPSBGaWxlVXBsb2FkLmNvbmZpZ3VyZVVwbG9hZHNTdG9yZSgnV2ViZGF2JywgV2ViZGF2QXZhdGFycy5uYW1lLCBjb25maWcpO1xuXHRXZWJkYXZVc2VyRGF0YUZpbGVzLnN0b3JlID0gRmlsZVVwbG9hZC5jb25maWd1cmVVcGxvYWRzU3RvcmUoJ1dlYmRhdicsIFdlYmRhdlVzZXJEYXRhRmlsZXMubmFtZSwgY29uZmlnKTtcbn0sIDUwMCk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KC9eRmlsZVVwbG9hZF9XZWJkYXZfLywgY29uZmlndXJlKTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGFzeW5jICdzZW5kRmlsZU1lc3NhZ2UnKHJvb21JZCwgc3RvcmUsIGZpbGUsIG1zZ0RhdGEgPSB7fSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdzZW5kRmlsZU1lc3NhZ2UnIH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvb20gPSBNZXRlb3IuY2FsbCgnY2FuQWNjZXNzUm9vbScsIHJvb21JZCwgTWV0ZW9yLnVzZXJJZCgpKTtcblxuXHRcdGlmICghcm9vbSkge1xuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdH1cblxuXHRcdGNoZWNrKG1zZ0RhdGEsIHtcblx0XHRcdGF2YXRhcjogTWF0Y2guT3B0aW9uYWwoU3RyaW5nKSxcblx0XHRcdGVtb2ppOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdFx0YWxpYXM6IE1hdGNoLk9wdGlvbmFsKFN0cmluZyksXG5cdFx0XHRncm91cGFibGU6IE1hdGNoLk9wdGlvbmFsKEJvb2xlYW4pLFxuXHRcdFx0bXNnOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuXHRcdH0pO1xuXG5cdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXBsb2Fkcy51cGRhdGVGaWxlQ29tcGxldGUoZmlsZS5faWQsIE1ldGVvci51c2VySWQoKSwgXy5vbWl0KGZpbGUsICdfaWQnKSk7XG5cblx0XHRjb25zdCBmaWxlVXJsID0gYC9maWxlLXVwbG9hZC8keyBmaWxlLl9pZCB9LyR7IGVuY29kZVVSSShmaWxlLm5hbWUpIH1gO1xuXG5cdFx0Y29uc3QgYXR0YWNobWVudCA9IHtcblx0XHRcdHRpdGxlOiBmaWxlLm5hbWUsXG5cdFx0XHR0eXBlOiAnZmlsZScsXG5cdFx0XHRkZXNjcmlwdGlvbjogZmlsZS5kZXNjcmlwdGlvbixcblx0XHRcdHRpdGxlX2xpbms6IGZpbGVVcmwsXG5cdFx0XHR0aXRsZV9saW5rX2Rvd25sb2FkOiB0cnVlLFxuXHRcdH07XG5cblx0XHRpZiAoL15pbWFnZVxcLy4rLy50ZXN0KGZpbGUudHlwZSkpIHtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdXJsID0gZmlsZVVybDtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2VfdHlwZSA9IGZpbGUudHlwZTtcblx0XHRcdGF0dGFjaG1lbnQuaW1hZ2Vfc2l6ZSA9IGZpbGUuc2l6ZTtcblx0XHRcdGlmIChmaWxlLmlkZW50aWZ5ICYmIGZpbGUuaWRlbnRpZnkuc2l6ZSkge1xuXHRcdFx0XHRhdHRhY2htZW50LmltYWdlX2RpbWVuc2lvbnMgPSBmaWxlLmlkZW50aWZ5LnNpemU7XG5cdFx0XHR9XG5cdFx0XHRhdHRhY2htZW50LmltYWdlX3ByZXZpZXcgPSBhd2FpdCBGaWxlVXBsb2FkLnJlc2l6ZUltYWdlUHJldmlldyhmaWxlKTtcblx0XHR9IGVsc2UgaWYgKC9eYXVkaW9cXC8uKy8udGVzdChmaWxlLnR5cGUpKSB7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3VybCA9IGZpbGVVcmw7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3R5cGUgPSBmaWxlLnR5cGU7XG5cdFx0XHRhdHRhY2htZW50LmF1ZGlvX3NpemUgPSBmaWxlLnNpemU7XG5cdFx0fSBlbHNlIGlmICgvXnZpZGVvXFwvLisvLnRlc3QoZmlsZS50eXBlKSkge1xuXHRcdFx0YXR0YWNobWVudC52aWRlb191cmwgPSBmaWxlVXJsO1xuXHRcdFx0YXR0YWNobWVudC52aWRlb190eXBlID0gZmlsZS50eXBlO1xuXHRcdFx0YXR0YWNobWVudC52aWRlb19zaXplID0gZmlsZS5zaXplO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXHRcdGxldCBtc2cgPSBPYmplY3QuYXNzaWduKHtcblx0XHRcdF9pZDogUmFuZG9tLmlkKCksXG5cdFx0XHRyaWQ6IHJvb21JZCxcblx0XHRcdHRzOiBuZXcgRGF0ZSgpLFxuXHRcdFx0bXNnOiAnJyxcblx0XHRcdGZpbGU6IHtcblx0XHRcdFx0X2lkOiBmaWxlLl9pZCxcblx0XHRcdFx0bmFtZTogZmlsZS5uYW1lLFxuXHRcdFx0XHR0eXBlOiBmaWxlLnR5cGUsXG5cdFx0XHR9LFxuXHRcdFx0Z3JvdXBhYmxlOiBmYWxzZSxcblx0XHRcdGF0dGFjaG1lbnRzOiBbYXR0YWNobWVudF0sXG5cdFx0fSwgbXNnRGF0YSk7XG5cblx0XHRtc2cgPSBNZXRlb3IuY2FsbCgnc2VuZE1lc3NhZ2UnLCBtc2cpO1xuXG5cdFx0TWV0ZW9yLmRlZmVyKCgpID0+IFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignYWZ0ZXJGaWxlVXBsb2FkJywgeyB1c2VyLCByb29tLCBtZXNzYWdlOiBtc2cgfSkpO1xuXG5cdFx0cmV0dXJuIG1zZztcblx0fSxcbn0pO1xuIiwiLyogZ2xvYmFscyBVcGxvYWRGUyAqL1xuXG5sZXQgcHJvdGVjdGVkRmlsZXM7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdGaWxlVXBsb2FkX1Byb3RlY3RGaWxlcycsIGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0cHJvdGVjdGVkRmlsZXMgPSB2YWx1ZTtcbn0pO1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdGdldFMzRmlsZVVybChmaWxlSWQpIHtcblx0XHRpZiAocHJvdGVjdGVkRmlsZXMgJiYgIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnc2VuZEZpbGVNZXNzYWdlJyB9KTtcblx0XHR9XG5cdFx0Y29uc3QgZmlsZSA9IFJvY2tldENoYXQubW9kZWxzLlVwbG9hZHMuZmluZE9uZUJ5SWQoZmlsZUlkKTtcblxuXHRcdHJldHVybiBVcGxvYWRGUy5nZXRTdG9yZSgnQW1hem9uUzM6VXBsb2FkcycpLmdldFJlZGlyZWN0VVJMKGZpbGUpO1xuXHR9LFxufSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdGaWxlVXBsb2FkJywgZnVuY3Rpb24oKSB7XG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX0VuYWJsZWQnLCB0cnVlLCB7XG5cdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfTWF4RmlsZVNpemUnLCAxMDQ4NTc2MDAsIHtcblx0XHR0eXBlOiAnaW50Jyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnRmlsZVVwbG9hZF9NYXhGaWxlU2l6ZURlc2NyaXB0aW9uJyxcblx0fSk7XG5cblx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfTWVkaWFUeXBlV2hpdGVMaXN0JywgJ2ltYWdlLyosYXVkaW8vKix2aWRlby8qLGFwcGxpY2F0aW9uL3ppcCxhcHBsaWNhdGlvbi94LXJhci1jb21wcmVzc2VkLGFwcGxpY2F0aW9uL3BkZix0ZXh0L3BsYWluLGFwcGxpY2F0aW9uL21zd29yZCxhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQud29yZHByb2Nlc3NpbmdtbC5kb2N1bWVudCcsIHtcblx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRwdWJsaWM6IHRydWUsXG5cdFx0aTE4bkRlc2NyaXB0aW9uOiAnRmlsZVVwbG9hZF9NZWRpYVR5cGVXaGl0ZUxpc3REZXNjcmlwdGlvbicsXG5cdH0pO1xuXG5cdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1Byb3RlY3RGaWxlcycsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdGkxOG5EZXNjcmlwdGlvbjogJ0ZpbGVVcGxvYWRfUHJvdGVjdEZpbGVzRGVzY3JpcHRpb24nLFxuXHR9KTtcblxuXHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLCAnR3JpZEZTJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogW3tcblx0XHRcdGtleTogJ0dyaWRGUycsXG5cdFx0XHRpMThuTGFiZWw6ICdHcmlkRlMnLFxuXHRcdH0sIHtcblx0XHRcdGtleTogJ0FtYXpvblMzJyxcblx0XHRcdGkxOG5MYWJlbDogJ0FtYXpvblMzJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdHb29nbGVDbG91ZFN0b3JhZ2UnLFxuXHRcdFx0aTE4bkxhYmVsOiAnR29vZ2xlQ2xvdWRTdG9yYWdlJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdXZWJkYXYnLFxuXHRcdFx0aTE4bkxhYmVsOiAnV2ViREFWJyxcblx0XHR9LCB7XG5cdFx0XHRrZXk6ICdGaWxlU3lzdGVtJyxcblx0XHRcdGkxOG5MYWJlbDogJ0ZpbGVTeXN0ZW0nLFxuXHRcdH1dLFxuXHRcdHB1YmxpYzogdHJ1ZSxcblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdBbWF6b24gUzMnLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19CdWNrZXQnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19BY2wnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19BV1NBY2Nlc3NLZXlJZCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMycsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX0FXU1NlY3JldEFjY2Vzc0tleScsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMycsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX0NETicsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMycsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX1JlZ2lvbicsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMycsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX0J1Y2tldFVSTCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdBbWF6b25TMycsXG5cdFx0XHR9LFxuXHRcdFx0aTE4bkRlc2NyaXB0aW9uOiAnT3ZlcnJpZGVfVVJMX3RvX3doaWNoX2ZpbGVzX2FyZV91cGxvYWRlZF9UaGlzX3VybF9hbHNvX3VzZWRfZm9yX2Rvd25sb2Fkc191bmxlc3NfYV9DRE5faXNfZ2l2ZW4uJyxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19TaWduYXR1cmVWZXJzaW9uJywgJ3Y0Jywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19Gb3JjZVBhdGhTdHlsZScsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9TM19VUkxFeHBpcnlUaW1lU3BhbicsIDEyMCwge1xuXHRcdFx0dHlwZTogJ2ludCcsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHRcdGkxOG5EZXNjcmlwdGlvbjogJ0ZpbGVVcGxvYWRfUzNfVVJMRXhwaXJ5VGltZVNwYW5fRGVzY3JpcHRpb24nLFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1MzX1Byb3h5X0F2YXRhcnMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0FtYXpvblMzJyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfUzNfUHJveHlfVXBsb2FkcycsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnQW1hem9uUzMnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdHb29nbGUgQ2xvdWQgU3RvcmFnZScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX0dvb2dsZVN0b3JhZ2VfQnVja2V0JywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0cHJpdmF0ZTogdHJ1ZSxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdHb29nbGVDbG91ZFN0b3JhZ2UnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX0FjY2Vzc0lkJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0cHJpdmF0ZTogdHJ1ZSxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdHb29nbGVDbG91ZFN0b3JhZ2UnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1NlY3JldCcsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdG11bHRpbGluZTogdHJ1ZSxcblx0XHRcdHByaXZhdGU6IHRydWUsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnR29vZ2xlQ2xvdWRTdG9yYWdlJyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfR29vZ2xlU3RvcmFnZV9Qcm94eV9BdmF0YXJzJywgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdHb29nbGVDbG91ZFN0b3JhZ2UnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9Hb29nbGVTdG9yYWdlX1Byb3h5X1VwbG9hZHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ0dvb2dsZUNsb3VkU3RvcmFnZScsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ0ZpbGUgU3lzdGVtJywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfRmlsZVN5c3RlbVBhdGgnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnRmlsZVN5c3RlbScsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ1dlYkRBVicsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1dlYmRhdl9VcGxvYWRfRm9sZGVyX1BhdGgnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnV2ViZGF2Jyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1NlcnZlcl9VUkwnLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnV2ViZGF2Jyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1VzZXJuYW1lJywgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ1dlYmRhdicsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdHRoaXMuYWRkKCdGaWxlVXBsb2FkX1dlYmRhdl9QYXNzd29yZCcsICcnLCB7XG5cdFx0XHR0eXBlOiAncGFzc3dvcmQnLFxuXHRcdFx0cHJpdmF0ZTogdHJ1ZSxcblx0XHRcdGVuYWJsZVF1ZXJ5OiB7XG5cdFx0XHRcdF9pZDogJ0ZpbGVVcGxvYWRfU3RvcmFnZV9UeXBlJyxcblx0XHRcdFx0dmFsdWU6ICdXZWJkYXYnLFxuXHRcdFx0fSxcblx0XHR9KTtcblx0XHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9XZWJkYXZfUHJveHlfQXZhdGFycycsIGZhbHNlLCB7XG5cdFx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0XHRlbmFibGVRdWVyeToge1xuXHRcdFx0XHRfaWQ6ICdGaWxlVXBsb2FkX1N0b3JhZ2VfVHlwZScsXG5cdFx0XHRcdHZhbHVlOiAnV2ViZGF2Jyxcblx0XHRcdH0sXG5cdFx0fSk7XG5cdFx0dGhpcy5hZGQoJ0ZpbGVVcGxvYWRfV2ViZGF2X1Byb3h5X1VwbG9hZHMnLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0ZW5hYmxlUXVlcnk6IHtcblx0XHRcdFx0X2lkOiAnRmlsZVVwbG9hZF9TdG9yYWdlX1R5cGUnLFxuXHRcdFx0XHR2YWx1ZTogJ1dlYmRhdicsXG5cdFx0XHR9LFxuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLmFkZCgnRmlsZVVwbG9hZF9FbmFibGVkX0RpcmVjdCcsIHRydWUsIHtcblx0XHR0eXBlOiAnYm9vbGVhbicsXG5cdFx0cHVibGljOiB0cnVlLFxuXHR9KTtcbn0pO1xuIiwiaW1wb3J0IHsgVXBsb2FkRlMgfSBmcm9tICdtZXRlb3IvamFsaWs6dWZzJztcbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IFMzIGZyb20gJ2F3cy1zZGsvY2xpZW50cy9zMyc7XG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5cbi8qKlxuICogQW1hem9uUzMgc3RvcmVcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IGNsYXNzIEFtYXpvblMzU3RvcmUgZXh0ZW5kcyBVcGxvYWRGUy5TdG9yZSB7XG5cblx0Y29uc3RydWN0b3Iob3B0aW9ucykge1xuXHRcdC8vIERlZmF1bHQgb3B0aW9uc1xuXHRcdC8vIG9wdGlvbnMuc2VjcmV0QWNjZXNzS2V5LFxuXHRcdC8vIG9wdGlvbnMuYWNjZXNzS2V5SWQsXG5cdFx0Ly8gb3B0aW9ucy5yZWdpb24sXG5cdFx0Ly8gb3B0aW9ucy5zc2xFbmFibGVkIC8vIG9wdGlvbmFsXG5cblx0XHRvcHRpb25zID0gXy5leHRlbmQoe1xuXHRcdFx0aHR0cE9wdGlvbnM6IHtcblx0XHRcdFx0dGltZW91dDogNjAwMCxcblx0XHRcdFx0YWdlbnQ6IGZhbHNlLFxuXHRcdFx0fSxcblx0XHR9LCBvcHRpb25zKTtcblxuXHRcdHN1cGVyKG9wdGlvbnMpO1xuXG5cdFx0Y29uc3QgY2xhc3NPcHRpb25zID0gb3B0aW9ucztcblxuXHRcdGNvbnN0IHMzID0gbmV3IFMzKG9wdGlvbnMuY29ubmVjdGlvbik7XG5cblx0XHRvcHRpb25zLmdldFBhdGggPSBvcHRpb25zLmdldFBhdGggfHwgZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0cmV0dXJuIGZpbGUuX2lkO1xuXHRcdH07XG5cblx0XHR0aGlzLmdldFBhdGggPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRpZiAoZmlsZS5BbWF6b25TMykge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5BbWF6b25TMy5wYXRoO1xuXHRcdFx0fVxuXHRcdFx0Ly8gQ29tcGF0aWJpbGl0eVxuXHRcdFx0Ly8gVE9ETzogTWlncmF0aW9uXG5cdFx0XHRpZiAoZmlsZS5zMykge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5zMy5wYXRoICsgZmlsZS5faWQ7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuZ2V0UmVkaXJlY3RVUkwgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdEtleTogdGhpcy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0XHRFeHBpcmVzOiBjbGFzc09wdGlvbnMuVVJMRXhwaXJ5VGltZVNwYW4sXG5cdFx0XHR9O1xuXG5cdFx0XHRyZXR1cm4gczMuZ2V0U2lnbmVkVXJsKCdnZXRPYmplY3QnLCBwYXJhbXMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBDcmVhdGVzIHRoZSBmaWxlIGluIHRoZSBjb2xsZWN0aW9uXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0XHQgKiBAcmV0dXJuIHtzdHJpbmd9XG5cdFx0ICovXG5cdFx0dGhpcy5jcmVhdGUgPSBmdW5jdGlvbihmaWxlLCBjYWxsYmFjaykge1xuXHRcdFx0Y2hlY2soZmlsZSwgT2JqZWN0KTtcblxuXHRcdFx0aWYgKGZpbGUuX2lkID09IG51bGwpIHtcblx0XHRcdFx0ZmlsZS5faWQgPSBSYW5kb20uaWQoKTtcblx0XHRcdH1cblxuXHRcdFx0ZmlsZS5BbWF6b25TMyA9IHtcblx0XHRcdFx0cGF0aDogdGhpcy5vcHRpb25zLmdldFBhdGgoZmlsZSksXG5cdFx0XHR9O1xuXG5cdFx0XHRmaWxlLnN0b3JlID0gdGhpcy5vcHRpb25zLm5hbWU7IC8vIGFzc2lnbiBzdG9yZSB0byBmaWxlXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRDb2xsZWN0aW9uKCkuaW5zZXJ0KGZpbGUsIGNhbGxiYWNrKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmVtb3ZlcyB0aGUgZmlsZVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gY2FsbGJhY2tcblx0XHQgKi9cblx0XHR0aGlzLmRlbGV0ZSA9IGZ1bmN0aW9uKGZpbGVJZCwgY2FsbGJhY2spIHtcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmdldENvbGxlY3Rpb24oKS5maW5kT25lKHsgX2lkOiBmaWxlSWQgfSk7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdEtleTogdGhpcy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0fTtcblxuXHRcdFx0czMuZGVsZXRlT2JqZWN0KHBhcmFtcywgKGVyciwgZGF0YSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnIpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2FsbGJhY2sgJiYgY2FsbGJhY2soZXJyLCBkYXRhKTtcblx0XHRcdH0pO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHJlYWQgc3RyZWFtXG5cdFx0ICogQHBhcmFtIGZpbGVJZFxuXHRcdCAqIEBwYXJhbSBmaWxlXG5cdFx0ICogQHBhcmFtIG9wdGlvbnNcblx0XHQgKiBAcmV0dXJuIHsqfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0UmVhZFN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVJZCwgZmlsZSwgb3B0aW9ucyA9IHt9KSB7XG5cdFx0XHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0XHRcdEtleTogdGhpcy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0fTtcblxuXHRcdFx0aWYgKG9wdGlvbnMuc3RhcnQgJiYgb3B0aW9ucy5lbmQpIHtcblx0XHRcdFx0cGFyYW1zLlJhbmdlID0gYCR7IG9wdGlvbnMuc3RhcnQgfSAtICR7IG9wdGlvbnMuZW5kIH1gO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gczMuZ2V0T2JqZWN0KHBhcmFtcykuY3JlYXRlUmVhZFN0cmVhbSgpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHdyaXRlIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBvcHRpb25zXG5cdFx0ICogQHJldHVybiB7Kn1cblx0XHQgKi9cblx0XHR0aGlzLmdldFdyaXRlU3RyZWFtID0gZnVuY3Rpb24oZmlsZUlkLCBmaWxlLyogLCBvcHRpb25zKi8pIHtcblx0XHRcdGNvbnN0IHdyaXRlU3RyZWFtID0gbmV3IHN0cmVhbS5QYXNzVGhyb3VnaCgpO1xuXHRcdFx0d3JpdGVTdHJlYW0ubGVuZ3RoID0gZmlsZS5zaXplO1xuXG5cdFx0XHR3cml0ZVN0cmVhbS5vbignbmV3TGlzdGVuZXInLCAoZXZlbnQsIGxpc3RlbmVyKSA9PiB7XG5cdFx0XHRcdGlmIChldmVudCA9PT0gJ2ZpbmlzaCcpIHtcblx0XHRcdFx0XHRwcm9jZXNzLm5leHRUaWNrKCgpID0+IHtcblx0XHRcdFx0XHRcdHdyaXRlU3RyZWFtLnJlbW92ZUxpc3RlbmVyKGV2ZW50LCBsaXN0ZW5lcik7XG5cdFx0XHRcdFx0XHR3cml0ZVN0cmVhbS5vbigncmVhbF9maW5pc2gnLCBsaXN0ZW5lcik7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRzMy5wdXRPYmplY3Qoe1xuXHRcdFx0XHRLZXk6IHRoaXMuZ2V0UGF0aChmaWxlKSxcblx0XHRcdFx0Qm9keTogd3JpdGVTdHJlYW0sXG5cdFx0XHRcdENvbnRlbnRUeXBlOiBmaWxlLnR5cGUsXG5cdFx0XHRcdENvbnRlbnREaXNwb3NpdGlvbjogYGlubGluZTsgZmlsZW5hbWU9XCIkeyBlbmNvZGVVUkkoZmlsZS5uYW1lKSB9XCJgLFxuXG5cdFx0XHR9LCAoZXJyb3IpID0+IHtcblx0XHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3cml0ZVN0cmVhbS5lbWl0KCdyZWFsX2ZpbmlzaCcpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJldHVybiB3cml0ZVN0cmVhbTtcblx0XHR9O1xuXHR9XG59XG5cbi8vIEFkZCBzdG9yZSB0byBVRlMgbmFtZXNwYWNlXG5VcGxvYWRGUy5zdG9yZS5BbWF6b25TMyA9IEFtYXpvblMzU3RvcmU7XG4iLCJpbXBvcnQgeyBVcGxvYWRGUyB9IGZyb20gJ21ldGVvci9qYWxpazp1ZnMnO1xuaW1wb3J0IGdjU3RvcmFnZSBmcm9tICdAZ29vZ2xlLWNsb3VkL3N0b3JhZ2UnO1xuXG4vKipcbiAqIEdvb2dsZVN0b3JhZ2Ugc3RvcmVcbiAqIEBwYXJhbSBvcHRpb25zXG4gKiBAY29uc3RydWN0b3JcbiAqL1xuZXhwb3J0IGNsYXNzIEdvb2dsZVN0b3JhZ2VTdG9yZSBleHRlbmRzIFVwbG9hZEZTLlN0b3JlIHtcblxuXHRjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG5cdFx0c3VwZXIob3B0aW9ucyk7XG5cblx0XHRjb25zdCBnY3MgPSBnY1N0b3JhZ2Uob3B0aW9ucy5jb25uZWN0aW9uKTtcblx0XHR0aGlzLmJ1Y2tldCA9IGdjcy5idWNrZXQob3B0aW9ucy5idWNrZXQpO1xuXG5cdFx0b3B0aW9ucy5nZXRQYXRoID0gb3B0aW9ucy5nZXRQYXRoIHx8IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdHJldHVybiBmaWxlLl9pZDtcblx0XHR9O1xuXG5cdFx0dGhpcy5nZXRQYXRoID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0aWYgKGZpbGUuR29vZ2xlU3RvcmFnZSkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5Hb29nbGVTdG9yYWdlLnBhdGg7XG5cdFx0XHR9XG5cdFx0XHQvLyBDb21wYXRpYmlsaXR5XG5cdFx0XHQvLyBUT0RPOiBNaWdyYXRpb25cblx0XHRcdGlmIChmaWxlLmdvb2dsZUNsb3VkU3RvcmFnZSkge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5nb29nbGVDbG91ZFN0b3JhZ2UucGF0aCArIGZpbGUuX2lkO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHR0aGlzLmdldFJlZGlyZWN0VVJMID0gZnVuY3Rpb24oZmlsZSwgY2FsbGJhY2spIHtcblx0XHRcdGNvbnN0IHBhcmFtcyA9IHtcblx0XHRcdFx0YWN0aW9uOiAncmVhZCcsXG5cdFx0XHRcdHJlc3BvbnNlRGlzcG9zaXRpb246ICdpbmxpbmUnLFxuXHRcdFx0XHRleHBpcmVzOiBEYXRlLm5vdygpICsgdGhpcy5vcHRpb25zLlVSTEV4cGlyeVRpbWVTcGFuICogMTAwMCxcblx0XHRcdH07XG5cblx0XHRcdHRoaXMuYnVja2V0LmZpbGUodGhpcy5nZXRQYXRoKGZpbGUpKS5nZXRTaWduZWRVcmwocGFyYW1zLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIENyZWF0ZXMgdGhlIGZpbGUgaW4gdGhlIGNvbGxlY3Rpb25cblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBjYWxsYmFja1xuXHRcdCAqIEByZXR1cm4ge3N0cmluZ31cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjaGVjayhmaWxlLCBPYmplY3QpO1xuXG5cdFx0XHRpZiAoZmlsZS5faWQgPT0gbnVsbCkge1xuXHRcdFx0XHRmaWxlLl9pZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWxlLkdvb2dsZVN0b3JhZ2UgPSB7XG5cdFx0XHRcdHBhdGg6IHRoaXMub3B0aW9ucy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0fTtcblxuXHRcdFx0ZmlsZS5zdG9yZSA9IHRoaXMub3B0aW9ucy5uYW1lOyAvLyBhc3NpZ24gc3RvcmUgdG8gZmlsZVxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29sbGVjdGlvbigpLmluc2VydChmaWxlLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGZpbGVcblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdFx0ICovXG5cdFx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7IF9pZDogZmlsZUlkIH0pO1xuXHRcdFx0dGhpcy5idWNrZXQuZmlsZSh0aGlzLmdldFBhdGgoZmlsZSkpLmRlbGV0ZShmdW5jdGlvbihlcnIsIGRhdGEpIHtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoZXJyKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrKGVyciwgZGF0YSk7XG5cdFx0XHR9KTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSByZWFkIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBvcHRpb25zXG5cdFx0ICogQHJldHVybiB7Kn1cblx0XHQgKi9cblx0XHR0aGlzLmdldFJlYWRTdHJlYW0gPSBmdW5jdGlvbihmaWxlSWQsIGZpbGUsIG9wdGlvbnMgPSB7fSkge1xuXHRcdFx0Y29uc3QgY29uZmlnID0ge307XG5cblx0XHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwpIHtcblx0XHRcdFx0Y29uZmlnLnN0YXJ0ID0gb3B0aW9ucy5zdGFydDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKG9wdGlvbnMuZW5kICE9IG51bGwpIHtcblx0XHRcdFx0Y29uZmlnLmVuZCA9IG9wdGlvbnMuZW5kO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5idWNrZXQuZmlsZSh0aGlzLmdldFBhdGgoZmlsZSkpLmNyZWF0ZVJlYWRTdHJlYW0oY29uZmlnKTtcblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogUmV0dXJucyB0aGUgZmlsZSB3cml0ZSBzdHJlYW1cblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcGFyYW0gb3B0aW9uc1xuXHRcdCAqIEByZXR1cm4geyp9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVJZCwgZmlsZS8qICwgb3B0aW9ucyovKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5idWNrZXQuZmlsZSh0aGlzLmdldFBhdGgoZmlsZSkpLmNyZWF0ZVdyaXRlU3RyZWFtKHtcblx0XHRcdFx0Z3ppcDogZmFsc2UsXG5cdFx0XHRcdG1ldGFkYXRhOiB7XG5cdFx0XHRcdFx0Y29udGVudFR5cGU6IGZpbGUudHlwZSxcblx0XHRcdFx0XHRjb250ZW50RGlzcG9zaXRpb246IGBpbmxpbmU7IGZpbGVuYW1lPSR7IGZpbGUubmFtZSB9YCxcblx0XHRcdFx0XHQvLyBtZXRhZGF0YToge1xuXHRcdFx0XHRcdC8vIFx0Y3VzdG9tOiAnbWV0YWRhdGEnXG5cdFx0XHRcdFx0Ly8gfVxuXHRcdFx0XHR9LFxuXHRcdFx0fSk7XG5cdFx0fTtcblx0fVxufVxuXG4vLyBBZGQgc3RvcmUgdG8gVUZTIG5hbWVzcGFjZVxuVXBsb2FkRlMuc3RvcmUuR29vZ2xlU3RvcmFnZSA9IEdvb2dsZVN0b3JhZ2VTdG9yZTtcbiIsImltcG9ydCB7IFVwbG9hZEZTIH0gZnJvbSAnbWV0ZW9yL2phbGlrOnVmcyc7XG5pbXBvcnQgV2ViZGF2IGZyb20gJ3dlYmRhdic7XG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG4vKipcbiAqIFdlYkRBViBzdG9yZVxuICogQHBhcmFtIG9wdGlvbnNcbiAqIEBjb25zdHJ1Y3RvclxuICovXG5leHBvcnQgY2xhc3MgV2ViZGF2U3RvcmUgZXh0ZW5kcyBVcGxvYWRGUy5TdG9yZSB7XG5cblx0Y29uc3RydWN0b3Iob3B0aW9ucykge1xuXG5cdFx0c3VwZXIob3B0aW9ucyk7XG5cblx0XHRjb25zdCBjbGllbnQgPSBuZXcgV2ViZGF2KFxuXHRcdFx0b3B0aW9ucy5jb25uZWN0aW9uLmNyZWRlbnRpYWxzLnNlcnZlcixcblx0XHRcdG9wdGlvbnMuY29ubmVjdGlvbi5jcmVkZW50aWFscy51c2VybmFtZSxcblx0XHRcdG9wdGlvbnMuY29ubmVjdGlvbi5jcmVkZW50aWFscy5wYXNzd29yZCxcblx0XHQpO1xuXG5cdFx0b3B0aW9ucy5nZXRQYXRoID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0aWYgKG9wdGlvbnMudXBsb2FkRm9sZGVyUGF0aFtvcHRpb25zLnVwbG9hZEZvbGRlclBhdGgubGVuZ3RoIC0gMV0gIT09ICcvJykge1xuXHRcdFx0XHRvcHRpb25zLnVwbG9hZEZvbGRlclBhdGggKz0gJy8nO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG9wdGlvbnMudXBsb2FkRm9sZGVyUGF0aCArIGZpbGUuX2lkO1xuXHRcdH07XG5cblx0XHRjbGllbnQuc3RhdChvcHRpb25zLnVwbG9hZEZvbGRlclBhdGgpLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXHRcdFx0aWYgKGVyci5zdGF0dXMgPT09ICc0MDQnKSB7XG5cdFx0XHRcdGNsaWVudC5jcmVhdGVEaXJlY3Rvcnkob3B0aW9ucy51cGxvYWRGb2xkZXJQYXRoKTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIGZpbGUgcGF0aFxuXHRcdCAqIEBwYXJhbSBmaWxlXG5cdFx0ICogQHJldHVybiB7c3RyaW5nfVxuXHRcdCAqL1xuXHRcdHRoaXMuZ2V0UGF0aCA9IGZ1bmN0aW9uKGZpbGUpIHtcblx0XHRcdGlmIChmaWxlLldlYmRhdikge1xuXHRcdFx0XHRyZXR1cm4gZmlsZS5XZWJkYXYucGF0aDtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0LyoqXG5cdFx0ICogQ3JlYXRlcyB0aGUgZmlsZSBpbiB0aGUgY29sIGxlY3Rpb25cblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEBwYXJhbSBjYWxsYmFja1xuXHRcdCAqIEByZXR1cm4ge3N0cmluZ31cblx0XHQgKi9cblx0XHR0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uKGZpbGUsIGNhbGxiYWNrKSB7XG5cdFx0XHRjaGVjayhmaWxlLCBPYmplY3QpO1xuXG5cdFx0XHRpZiAoZmlsZS5faWQgPT0gbnVsbCkge1xuXHRcdFx0XHRmaWxlLl9pZCA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0fVxuXG5cdFx0XHRmaWxlLldlYmRhdiA9IHtcblx0XHRcdFx0cGF0aDogb3B0aW9ucy5nZXRQYXRoKGZpbGUpLFxuXHRcdFx0fTtcblxuXHRcdFx0ZmlsZS5zdG9yZSA9IHRoaXMub3B0aW9ucy5uYW1lO1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0Q29sbGVjdGlvbigpLmluc2VydChmaWxlLCBjYWxsYmFjayk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJlbW92ZXMgdGhlIGZpbGVcblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGNhbGxiYWNrXG5cdFx0ICovXG5cdFx0dGhpcy5kZWxldGUgPSBmdW5jdGlvbihmaWxlSWQsIGNhbGxiYWNrKSB7XG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5nZXRDb2xsZWN0aW9uKCkuZmluZE9uZSh7IF9pZDogZmlsZUlkIH0pO1xuXHRcdFx0Y2xpZW50LmRlbGV0ZUZpbGUodGhpcy5nZXRQYXRoKGZpbGUpLCAoZXJyLCBkYXRhKSA9PiB7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKGVycik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjayhlcnIsIGRhdGEpO1xuXHRcdFx0fSk7XG5cdFx0fTtcblxuXHRcdC8qKlxuXHRcdCAqIFJldHVybnMgdGhlIGZpbGUgcmVhZCBzdHJlYW1cblx0XHQgKiBAcGFyYW0gZmlsZUlkXG5cdFx0ICogQHBhcmFtIGZpbGVcblx0XHQgKiBAcGFyYW0gb3B0aW9uc1xuXHRcdCAqIEByZXR1cm4geyp9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRSZWFkU3RyZWFtID0gZnVuY3Rpb24oZmlsZUlkLCBmaWxlLCBvcHRpb25zID0ge30pIHtcblx0XHRcdGNvbnN0IHJhbmdlID0ge307XG5cblx0XHRcdGlmIChvcHRpb25zLnN0YXJ0ICE9IG51bGwpIHtcblx0XHRcdFx0cmFuZ2Uuc3RhcnQgPSBvcHRpb25zLnN0YXJ0O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAob3B0aW9ucy5lbmQgIT0gbnVsbCkge1xuXHRcdFx0XHRyYW5nZS5lbmQgPSBvcHRpb25zLmVuZDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBjbGllbnQuY3JlYXRlUmVhZFN0cmVhbSh0aGlzLmdldFBhdGgoZmlsZSksIG9wdGlvbnMpO1xuXHRcdH07XG5cblx0XHQvKipcblx0XHQgKiBSZXR1cm5zIHRoZSBmaWxlIHdyaXRlIHN0cmVhbVxuXHRcdCAqIEBwYXJhbSBmaWxlSWRcblx0XHQgKiBAcGFyYW0gZmlsZVxuXHRcdCAqIEByZXR1cm4geyp9XG5cdFx0ICovXG5cdFx0dGhpcy5nZXRXcml0ZVN0cmVhbSA9IGZ1bmN0aW9uKGZpbGVJZCwgZmlsZSkge1xuXHRcdFx0Y29uc3Qgd3JpdGVTdHJlYW0gPSBuZXcgc3RyZWFtLlBhc3NUaHJvdWdoKCk7XG5cdFx0XHRjb25zdCB3ZWJkYXZTdHJlYW0gPSBjbGllbnQuY3JlYXRlV3JpdGVTdHJlYW0odGhpcy5nZXRQYXRoKGZpbGUpKTtcblxuXHRcdFx0Ly8gVE9ETyByZW1vdmUgdGltZW91dCB3aGVuIFVwbG9hZEZTIGJ1ZyByZXNvbHZlZFxuXHRcdFx0Y29uc3QgbmV3TGlzdGVuZXJDYWxsYmFjayA9IChldmVudCwgbGlzdGVuZXIpID0+IHtcblx0XHRcdFx0aWYgKGV2ZW50ID09PSAnZmluaXNoJykge1xuXHRcdFx0XHRcdHByb2Nlc3MubmV4dFRpY2soKCkgPT4ge1xuXHRcdFx0XHRcdFx0d3JpdGVTdHJlYW0ucmVtb3ZlTGlzdGVuZXIoZXZlbnQsIGxpc3RlbmVyKTtcblx0XHRcdFx0XHRcdHdyaXRlU3RyZWFtLnJlbW92ZUxpc3RlbmVyKCduZXdMaXN0ZW5lcicsIG5ld0xpc3RlbmVyQ2FsbGJhY2spO1xuXHRcdFx0XHRcdFx0d3JpdGVTdHJlYW0ub24oZXZlbnQsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KGxpc3RlbmVyLCA1MDApO1xuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR3cml0ZVN0cmVhbS5vbignbmV3TGlzdGVuZXInLCBuZXdMaXN0ZW5lckNhbGxiYWNrKTtcblxuXHRcdFx0d3JpdGVTdHJlYW0ucGlwZSh3ZWJkYXZTdHJlYW0pO1xuXHRcdFx0cmV0dXJuIHdyaXRlU3RyZWFtO1xuXHRcdH07XG5cdH1cbn1cblxuLy8gQWRkIHN0b3JlIHRvIFVGUyBuYW1lc3BhY2VcblVwbG9hZEZTLnN0b3JlLldlYmRhdiA9IFdlYmRhdlN0b3JlO1xuIl19
