(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var RocketChatFile = Package['rocketchat:file'].RocketChatFile;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:assets":{"server":{"assets.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_assets/server/assets.js                                                                  //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let sizeOf;
module.watch(require("image-size"), {
  default(v) {
    sizeOf = v;
  }

}, 1);
let mime;
module.watch(require("mime-type/with-db"), {
  default(v) {
    mime = v;
  }

}, 2);
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 3);
let sharp;
module.watch(require("sharp"), {
  default(v) {
    sharp = v;
  }

}, 4);
mime.extensions['image/vnd.microsoft.icon'] = ['ico'];
const RocketChatAssetsInstance = new RocketChatFile.GridFS({
  name: 'assets'
});
this.RocketChatAssetsInstance = RocketChatAssetsInstance;
const assets = {
  logo: {
    label: 'logo (svg, png, jpg)',
    defaultUrl: 'images/logo/logo.svg',
    constraints: {
      type: 'image',
      extensions: ['svg', 'png', 'jpg', 'jpeg'],
      width: undefined,
      height: undefined
    },
    wizard: {
      step: 3,
      order: 2
    }
  },
  background: {
    label: 'login background (svg, png, jpg)',
    defaultUrl: undefined,
    constraints: {
      type: 'image',
      extensions: ['svg', 'png', 'jpg', 'jpeg'],
      width: undefined,
      height: undefined
    }
  },
  favicon_ico: {
    label: 'favicon (ico)',
    defaultUrl: 'favicon.ico',
    constraints: {
      type: 'image',
      extensions: ['ico'],
      width: undefined,
      height: undefined
    }
  },
  favicon: {
    label: 'favicon (svg)',
    defaultUrl: 'images/logo/icon.svg',
    constraints: {
      type: 'image',
      extensions: ['svg'],
      width: undefined,
      height: undefined
    }
  },
  favicon_16: {
    label: 'favicon 16x16 (png)',
    defaultUrl: 'images/logo/favicon-16x16.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 16,
      height: 16
    }
  },
  favicon_32: {
    label: 'favicon 32x32 (png)',
    defaultUrl: 'images/logo/favicon-32x32.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 32,
      height: 32
    }
  },
  favicon_192: {
    label: 'android-chrome 192x192 (png)',
    defaultUrl: 'images/logo/android-chrome-192x192.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 192,
      height: 192
    }
  },
  favicon_512: {
    label: 'android-chrome 512x512 (png)',
    defaultUrl: 'images/logo/android-chrome-512x512.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 512,
      height: 512
    }
  },
  touchicon_180: {
    label: 'apple-touch-icon 180x180 (png)',
    defaultUrl: 'images/logo/apple-touch-icon.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 180,
      height: 180
    }
  },
  touchicon_180_pre: {
    label: 'apple-touch-icon-precomposed 180x180 (png)',
    defaultUrl: 'images/logo/apple-touch-icon-precomposed.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 180,
      height: 180
    }
  },
  tile_70: {
    label: 'mstile 70x70 (png)',
    defaultUrl: 'images/logo/mstile-70x70.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 144,
      height: 144
    }
  },
  tile_144: {
    label: 'mstile 144x144 (png)',
    defaultUrl: 'images/logo/mstile-144x144.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 144,
      height: 144
    }
  },
  tile_150: {
    label: 'mstile 150x150 (png)',
    defaultUrl: 'images/logo/mstile-150x150.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 150,
      height: 150
    }
  },
  tile_310_square: {
    label: 'mstile 310x310 (png)',
    defaultUrl: 'images/logo/mstile-310x310.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 310,
      height: 310
    }
  },
  tile_310_wide: {
    label: 'mstile 310x150 (png)',
    defaultUrl: 'images/logo/mstile-310x150.png',
    constraints: {
      type: 'image',
      extensions: ['png'],
      width: 310,
      height: 150
    }
  },
  safari_pinned: {
    label: 'safari pinned tab (svg)',
    defaultUrl: 'images/logo/safari-pinned-tab.svg',
    constraints: {
      type: 'image',
      extensions: ['svg'],
      width: undefined,
      height: undefined
    }
  }
};
RocketChat.Assets = new class {
  get mime() {
    return mime;
  }

  get assets() {
    return assets;
  }

  setAsset(binaryContent, contentType, asset) {
    if (!assets[asset]) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
        function: 'RocketChat.Assets.setAsset'
      });
    }

    const extension = mime.extension(contentType);

    if (assets[asset].constraints.extensions.includes(extension) === false) {
      throw new Meteor.Error(contentType, `Invalid file type: ${contentType}`, {
        function: 'RocketChat.Assets.setAsset',
        errorTitle: 'error-invalid-file-type'
      });
    }

    const file = new Buffer(binaryContent, 'binary');

    if (assets[asset].constraints.width || assets[asset].constraints.height) {
      const dimensions = sizeOf(file);

      if (assets[asset].constraints.width && assets[asset].constraints.width !== dimensions.width) {
        throw new Meteor.Error('error-invalid-file-width', 'Invalid file width', {
          function: 'Invalid file width'
        });
      }

      if (assets[asset].constraints.height && assets[asset].constraints.height !== dimensions.height) {
        throw new Meteor.Error('error-invalid-file-height');
      }
    }

    const rs = RocketChatFile.bufferToStream(file);
    RocketChatAssetsInstance.deleteFile(asset);
    const ws = RocketChatAssetsInstance.createWriteStream(asset, contentType);
    ws.on('end', Meteor.bindEnvironment(function () {
      return Meteor.setTimeout(function () {
        const key = `Assets_${asset}`;
        const value = {
          url: `assets/${asset}.${extension}`,
          defaultUrl: assets[asset].defaultUrl
        };
        RocketChat.settings.updateById(key, value);
        return RocketChat.Assets.processAsset(key, value);
      }, 200);
    }));
    rs.pipe(ws);
  }

  unsetAsset(asset) {
    if (!assets[asset]) {
      throw new Meteor.Error('error-invalid-asset', 'Invalid asset', {
        function: 'RocketChat.Assets.unsetAsset'
      });
    }

    RocketChatAssetsInstance.deleteFile(asset);
    const key = `Assets_${asset}`;
    const value = {
      defaultUrl: assets[asset].defaultUrl
    };
    RocketChat.settings.updateById(key, value);
    RocketChat.Assets.processAsset(key, value);
  }

  refreshClients() {
    return process.emit('message', {
      refresh: 'client'
    });
  }

  processAsset(settingKey, settingValue) {
    if (settingKey.indexOf('Assets_') !== 0) {
      return;
    }

    const assetKey = settingKey.replace(/^Assets_/, '');
    const assetValue = assets[assetKey];

    if (!assetValue) {
      return;
    }

    if (!settingValue || !settingValue.url) {
      assetValue.cache = undefined;
      return;
    }

    const file = RocketChatAssetsInstance.getFileSync(assetKey);

    if (!file) {
      assetValue.cache = undefined;
      return;
    }

    const hash = crypto.createHash('sha1').update(file.buffer).digest('hex');
    const extension = settingValue.url.split('.').pop();
    return assetValue.cache = {
      path: `assets/${assetKey}.${extension}`,
      cacheable: false,
      sourceMapUrl: undefined,
      where: 'client',
      type: 'asset',
      content: file.buffer,
      extension,
      url: `/assets/${assetKey}.${extension}?${hash}`,
      size: file.length,
      uploadDate: file.uploadDate,
      contentType: file.contentType,
      hash
    };
  }

  getURL(assetName, options = {
    cdn: false,
    full: true
  }) {
    const asset = RocketChat.settings.get(assetName);
    const url = asset.url || asset.defaultUrl;
    return RocketChat.getURL(url, options);
  }

}();
RocketChat.settings.addGroup('Assets');
RocketChat.settings.add('Assets_SvgFavicon_Enable', true, {
  type: 'boolean',
  group: 'Assets',
  i18nLabel: 'Enable_Svg_Favicon'
});

function addAssetToSetting(asset, value) {
  const key = `Assets_${asset}`;
  RocketChat.settings.add(key, {
    defaultUrl: value.defaultUrl
  }, {
    type: 'asset',
    group: 'Assets',
    fileConstraints: value.constraints,
    i18nLabel: value.label,
    asset,
    public: true,
    wizard: value.wizard
  });
  const currentValue = RocketChat.settings.get(key);

  if (typeof currentValue === 'object' && currentValue.defaultUrl !== assets[asset].defaultUrl) {
    currentValue.defaultUrl = assets[asset].defaultUrl;
    RocketChat.settings.updateById(key, currentValue);
  }
}

for (const key of Object.keys(assets)) {
  const value = assets[key];
  addAssetToSetting(key, value);
}

RocketChat.models.Settings.find().observe({
  added(record) {
    return RocketChat.Assets.processAsset(record._id, record.value);
  },

  changed(record) {
    return RocketChat.Assets.processAsset(record._id, record.value);
  },

  removed(record) {
    return RocketChat.Assets.processAsset(record._id, undefined);
  }

});
Meteor.startup(function () {
  return Meteor.setTimeout(function () {
    return process.emit('message', {
      refresh: 'client'
    });
  }, 200);
});
const {
  calculateClientHash
} = WebAppHashing;

WebAppHashing.calculateClientHash = function (manifest, includeFilter, runtimeConfigOverride) {
  for (const key of Object.keys(assets)) {
    const value = assets[key];

    if (!value.cache && !value.defaultUrl) {
      continue;
    }

    let cache = {};

    if (value.cache) {
      cache = {
        path: value.cache.path,
        cacheable: value.cache.cacheable,
        sourceMapUrl: value.cache.sourceMapUrl,
        where: value.cache.where,
        type: value.cache.type,
        url: value.cache.url,
        size: value.cache.size,
        hash: value.cache.hash
      };
      WebAppInternals.staticFiles[`/__cordova/assets/${key}`] = value.cache;
      WebAppInternals.staticFiles[`/__cordova/assets/${key}.${value.cache.extension}`] = value.cache;
    } else {
      const extension = value.defaultUrl.split('.').pop();
      cache = {
        path: `assets/${key}.${extension}`,
        cacheable: false,
        sourceMapUrl: undefined,
        where: 'client',
        type: 'asset',
        url: `/assets/${key}.${extension}?v3`,
        hash: 'v3'
      };
      WebAppInternals.staticFiles[`/__cordova/assets/${key}`] = WebAppInternals.staticFiles[`/__cordova/${value.defaultUrl}`];
      WebAppInternals.staticFiles[`/__cordova/assets/${key}.${extension}`] = WebAppInternals.staticFiles[`/__cordova/${value.defaultUrl}`];
    }

    const manifestItem = _.findWhere(manifest, {
      path: key
    });

    if (manifestItem) {
      const index = manifest.indexOf(manifestItem);
      manifest[index] = cache;
    } else {
      manifest.push(cache);
    }
  }

  return calculateClientHash.call(this, manifest, includeFilter, runtimeConfigOverride);
};

Meteor.methods({
  refreshClients() {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'refreshClients'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'refreshClients',
        action: 'Managing_assets'
      });
    }

    return RocketChat.Assets.refreshClients();
  },

  unsetAsset(asset) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'unsetAsset'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'unsetAsset',
        action: 'Managing_assets'
      });
    }

    return RocketChat.Assets.unsetAsset(asset);
  },

  setAsset(binaryContent, contentType, asset) {
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'setAsset'
      });
    }

    const hasPermission = RocketChat.authz.hasPermission(Meteor.userId(), 'manage-assets');

    if (!hasPermission) {
      throw new Meteor.Error('error-action-not-allowed', 'Managing assets not allowed', {
        method: 'setAsset',
        action: 'Managing_assets'
      });
    }

    RocketChat.Assets.setAsset(binaryContent, contentType, asset);
  }

});
WebApp.connectHandlers.use('/assets/', Meteor.bindEnvironment(function (req, res, next) {
  const params = {
    asset: decodeURIComponent(req.url.replace(/^\//, '').replace(/\?.*$/, '')).replace(/\.[^.]*$/, '')
  };
  const file = assets[params.asset] && assets[params.asset].cache;
  const format = req.url.replace(/.*\.([a-z]+)$/, '$1');

  if (!file) {
    const defaultUrl = assets[params.asset] && assets[params.asset].defaultUrl;

    if (defaultUrl) {
      const assetUrl = format && ['png', 'svg'].includes(format) ? defaultUrl.replace(/(svg|png)$/, format) : defaultUrl;
      req.url = `/${assetUrl}`;
      WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFiles, req, res, next);
    } else {
      res.writeHead(404);
      res.end();
    }

    return;
  }

  const reqModifiedHeader = req.headers['if-modified-since'];

  if (reqModifiedHeader) {
    if (reqModifiedHeader === (file.uploadDate && file.uploadDate.toUTCString())) {
      res.setHeader('Last-Modified', reqModifiedHeader);
      res.writeHead(304);
      res.end();
      return;
    }
  }

  res.setHeader('Cache-Control', 'public, max-age=0');
  res.setHeader('Expires', '-1');

  if (format && format !== file.extension && ['png', 'jpg', 'jpeg'].includes(format)) {
    res.setHeader('Content-Type', `image/${format}`);
    sharp(file.content).toFormat(format).pipe(res);
    return;
  }

  res.setHeader('Last-Modified', file.uploadDate && file.uploadDate.toUTCString() || new Date().toUTCString());
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.size);
  res.writeHead(200);
  res.end(file.content);
}));
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:assets/server/assets.js");

/* Exports */
Package._define("rocketchat:assets");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_assets.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphc3NldHMvc2VydmVyL2Fzc2V0cy5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJzaXplT2YiLCJtaW1lIiwiY3J5cHRvIiwic2hhcnAiLCJleHRlbnNpb25zIiwiUm9ja2V0Q2hhdEFzc2V0c0luc3RhbmNlIiwiUm9ja2V0Q2hhdEZpbGUiLCJHcmlkRlMiLCJuYW1lIiwiYXNzZXRzIiwibG9nbyIsImxhYmVsIiwiZGVmYXVsdFVybCIsImNvbnN0cmFpbnRzIiwidHlwZSIsIndpZHRoIiwidW5kZWZpbmVkIiwiaGVpZ2h0Iiwid2l6YXJkIiwic3RlcCIsIm9yZGVyIiwiYmFja2dyb3VuZCIsImZhdmljb25faWNvIiwiZmF2aWNvbiIsImZhdmljb25fMTYiLCJmYXZpY29uXzMyIiwiZmF2aWNvbl8xOTIiLCJmYXZpY29uXzUxMiIsInRvdWNoaWNvbl8xODAiLCJ0b3VjaGljb25fMTgwX3ByZSIsInRpbGVfNzAiLCJ0aWxlXzE0NCIsInRpbGVfMTUwIiwidGlsZV8zMTBfc3F1YXJlIiwidGlsZV8zMTBfd2lkZSIsInNhZmFyaV9waW5uZWQiLCJSb2NrZXRDaGF0IiwiQXNzZXRzIiwic2V0QXNzZXQiLCJiaW5hcnlDb250ZW50IiwiY29udGVudFR5cGUiLCJhc3NldCIsIk1ldGVvciIsIkVycm9yIiwiZnVuY3Rpb24iLCJleHRlbnNpb24iLCJpbmNsdWRlcyIsImVycm9yVGl0bGUiLCJmaWxlIiwiQnVmZmVyIiwiZGltZW5zaW9ucyIsInJzIiwiYnVmZmVyVG9TdHJlYW0iLCJkZWxldGVGaWxlIiwid3MiLCJjcmVhdGVXcml0ZVN0cmVhbSIsIm9uIiwiYmluZEVudmlyb25tZW50Iiwic2V0VGltZW91dCIsImtleSIsInZhbHVlIiwidXJsIiwic2V0dGluZ3MiLCJ1cGRhdGVCeUlkIiwicHJvY2Vzc0Fzc2V0IiwicGlwZSIsInVuc2V0QXNzZXQiLCJyZWZyZXNoQ2xpZW50cyIsInByb2Nlc3MiLCJlbWl0IiwicmVmcmVzaCIsInNldHRpbmdLZXkiLCJzZXR0aW5nVmFsdWUiLCJpbmRleE9mIiwiYXNzZXRLZXkiLCJyZXBsYWNlIiwiYXNzZXRWYWx1ZSIsImNhY2hlIiwiZ2V0RmlsZVN5bmMiLCJoYXNoIiwiY3JlYXRlSGFzaCIsInVwZGF0ZSIsImJ1ZmZlciIsImRpZ2VzdCIsInNwbGl0IiwicG9wIiwicGF0aCIsImNhY2hlYWJsZSIsInNvdXJjZU1hcFVybCIsIndoZXJlIiwiY29udGVudCIsInNpemUiLCJsZW5ndGgiLCJ1cGxvYWREYXRlIiwiZ2V0VVJMIiwiYXNzZXROYW1lIiwib3B0aW9ucyIsImNkbiIsImZ1bGwiLCJnZXQiLCJhZGRHcm91cCIsImFkZCIsImdyb3VwIiwiaTE4bkxhYmVsIiwiYWRkQXNzZXRUb1NldHRpbmciLCJmaWxlQ29uc3RyYWludHMiLCJwdWJsaWMiLCJjdXJyZW50VmFsdWUiLCJPYmplY3QiLCJrZXlzIiwibW9kZWxzIiwiU2V0dGluZ3MiLCJmaW5kIiwib2JzZXJ2ZSIsImFkZGVkIiwicmVjb3JkIiwiX2lkIiwiY2hhbmdlZCIsInJlbW92ZWQiLCJzdGFydHVwIiwiY2FsY3VsYXRlQ2xpZW50SGFzaCIsIldlYkFwcEhhc2hpbmciLCJtYW5pZmVzdCIsImluY2x1ZGVGaWx0ZXIiLCJydW50aW1lQ29uZmlnT3ZlcnJpZGUiLCJXZWJBcHBJbnRlcm5hbHMiLCJzdGF0aWNGaWxlcyIsIm1hbmlmZXN0SXRlbSIsImZpbmRXaGVyZSIsImluZGV4IiwicHVzaCIsImNhbGwiLCJtZXRob2RzIiwidXNlcklkIiwibWV0aG9kIiwiaGFzUGVybWlzc2lvbiIsImF1dGh6IiwiYWN0aW9uIiwiV2ViQXBwIiwiY29ubmVjdEhhbmRsZXJzIiwidXNlIiwicmVxIiwicmVzIiwibmV4dCIsInBhcmFtcyIsImRlY29kZVVSSUNvbXBvbmVudCIsImZvcm1hdCIsImFzc2V0VXJsIiwic3RhdGljRmlsZXNNaWRkbGV3YXJlIiwid3JpdGVIZWFkIiwiZW5kIiwicmVxTW9kaWZpZWRIZWFkZXIiLCJoZWFkZXJzIiwidG9VVENTdHJpbmciLCJzZXRIZWFkZXIiLCJ0b0Zvcm1hdCIsIkRhdGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLElBQUlBLENBQUo7O0FBQU1DLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxZQUFSLENBQWIsRUFBbUM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNMLFFBQUVLLENBQUY7QUFBSTs7QUFBaEIsQ0FBbkMsRUFBcUQsQ0FBckQ7QUFBd0QsSUFBSUMsTUFBSjtBQUFXTCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDQyxhQUFPRCxDQUFQO0FBQVM7O0FBQXJCLENBQW5DLEVBQTBELENBQTFEO0FBQTZELElBQUlFLElBQUo7QUFBU04sT0FBT0MsS0FBUCxDQUFhQyxRQUFRLG1CQUFSLENBQWIsRUFBMEM7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNFLFdBQUtGLENBQUw7QUFBTzs7QUFBbkIsQ0FBMUMsRUFBK0QsQ0FBL0Q7QUFBa0UsSUFBSUcsTUFBSjtBQUFXUCxPQUFPQyxLQUFQLENBQWFDLFFBQVEsUUFBUixDQUFiLEVBQStCO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDRyxhQUFPSCxDQUFQO0FBQVM7O0FBQXJCLENBQS9CLEVBQXNELENBQXREO0FBQXlELElBQUlJLEtBQUo7QUFBVVIsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLE9BQVIsQ0FBYixFQUE4QjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0ksWUFBTUosQ0FBTjtBQUFROztBQUFwQixDQUE5QixFQUFvRCxDQUFwRDtBQVEvUkUsS0FBS0csVUFBTCxDQUFnQiwwQkFBaEIsSUFBOEMsQ0FBQyxLQUFELENBQTlDO0FBRUEsTUFBTUMsMkJBQTJCLElBQUlDLGVBQWVDLE1BQW5CLENBQTBCO0FBQzFEQyxRQUFNO0FBRG9ELENBQTFC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SCxpQkFBL0I7QUFDQVQsVUFBSU8sU0FBSixDQUFjLEdBQWQ7QUFDQVAsVUFBSVEsR0FBSjtBQUNBO0FBQ0E7QUFDRDs7QUFFRFIsTUFBSVksU0FBSixDQUFjLGVBQWQsRUFBK0IsbUJBQS9CO0FBQ0FaLE1BQUlZLFNBQUosQ0FBYyxTQUFkLEVBQXlCLElBQXpCOztBQUVBLE1BQUlSLFVBQVVBLFdBQVdsRyxLQUFLSCxTQUExQixJQUF1QyxDQUFDLEtBQUQsRUFBUSxLQUFSLEVBQWUsTUFBZixFQUF1QkMsUUFBdkIsQ0FBZ0NvRyxNQUFoQyxDQUEzQyxFQUFvRjtBQUNuRkosUUFBSVksU0FBSixDQUFjLGNBQWQsRUFBK0IsU0FBU1IsTUFBUSxFQUFoRDtBQUNBL0ksVUFBTTZDLEtBQUswQyxPQUFYLEVBQ0VpRSxRQURGLENBQ1dULE1BRFgsRUFFRWpGLElBRkYsQ0FFTzZFLEdBRlA7QUFHQTtBQUNBOztBQUVEQSxNQUFJWSxTQUFKLENBQWMsZUFBZCxFQUFnQzFHLEtBQUs2QyxVQUFMLElBQW1CN0MsS0FBSzZDLFVBQUwsQ0FBZ0I0RCxXQUFoQixFQUFwQixJQUFzRCxJQUFJRyxJQUFKLEdBQVdILFdBQVgsRUFBckY7QUFDQVgsTUFBSVksU0FBSixDQUFjLGNBQWQsRUFBOEIxRyxLQUFLUixXQUFuQztBQUNBc0csTUFBSVksU0FBSixDQUFjLGdCQUFkLEVBQWdDMUcsS0FBSzJDLElBQXJDO0FBQ0FtRCxNQUFJTyxTQUFKLENBQWMsR0FBZDtBQUNBUCxNQUFJUSxHQUFKLENBQVF0RyxLQUFLMEMsT0FBYjtBQUNBLENBakRzQyxDQUF2QyxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2Fzc2V0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbCBXZWJBcHBIYXNoaW5nLCBXZWJBcHBJbnRlcm5hbHMgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5pbXBvcnQgc2l6ZU9mIGZyb20gJ2ltYWdlLXNpemUnO1xuaW1wb3J0IG1pbWUgZnJvbSAnbWltZS10eXBlL3dpdGgtZGInO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHNoYXJwIGZyb20gJ3NoYXJwJztcblxubWltZS5leHRlbnNpb25zWydpbWFnZS92bmQubWljcm9zb2Z0Lmljb24nXSA9IFsnaWNvJ107XG5cbmNvbnN0IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZSA9IG5ldyBSb2NrZXRDaGF0RmlsZS5HcmlkRlMoe1xuXHRuYW1lOiAnYXNzZXRzJyxcbn0pO1xuXG50aGlzLlJvY2tldENoYXRBc3NldHNJbnN0YW5jZSA9IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZTtcblxuY29uc3QgYXNzZXRzID0ge1xuXHRsb2dvOiB7XG5cdFx0bGFiZWw6ICdsb2dvIChzdmcsIHBuZywganBnKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2xvZ28uc3ZnJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJywgJ3BuZycsICdqcGcnLCAnanBlZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkLFxuXHRcdH0sXG5cdFx0d2l6YXJkOiB7XG5cdFx0XHRzdGVwOiAzLFxuXHRcdFx0b3JkZXI6IDIsXG5cdFx0fSxcblx0fSxcblx0YmFja2dyb3VuZDoge1xuXHRcdGxhYmVsOiAnbG9naW4gYmFja2dyb3VuZCAoc3ZnLCBwbmcsIGpwZyknLFxuXHRcdGRlZmF1bHRVcmw6IHVuZGVmaW5lZCxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsnc3ZnJywgJ3BuZycsICdqcGcnLCAnanBlZyddLFxuXHRcdFx0d2lkdGg6IHVuZGVmaW5lZCxcblx0XHRcdGhlaWdodDogdW5kZWZpbmVkLFxuXHRcdH0sXG5cdH0sXG5cdGZhdmljb25faWNvOiB7XG5cdFx0bGFiZWw6ICdmYXZpY29uIChpY28pJyxcblx0XHRkZWZhdWx0VXJsOiAnZmF2aWNvbi5pY28nLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydpY28nXSxcblx0XHRcdHdpZHRoOiB1bmRlZmluZWQsXG5cdFx0XHRoZWlnaHQ6IHVuZGVmaW5lZCxcblx0XHR9LFxuXHR9LFxuXHRmYXZpY29uOiB7XG5cdFx0bGFiZWw6ICdmYXZpY29uIChzdmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vaWNvbi5zdmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydzdmcnXSxcblx0XHRcdHdpZHRoOiB1bmRlZmluZWQsXG5cdFx0XHRoZWlnaHQ6IHVuZGVmaW5lZCxcblx0XHR9LFxuXHR9LFxuXHRmYXZpY29uXzE2OiB7XG5cdFx0bGFiZWw6ICdmYXZpY29uIDE2eDE2IChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vZmF2aWNvbi0xNngxNi5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxNixcblx0XHRcdGhlaWdodDogMTYsXG5cdFx0fSxcblx0fSxcblx0ZmF2aWNvbl8zMjoge1xuXHRcdGxhYmVsOiAnZmF2aWNvbiAzMngzMiAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2Zhdmljb24tMzJ4MzIucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMzIsXG5cdFx0XHRoZWlnaHQ6IDMyLFxuXHRcdH0sXG5cdH0sXG5cdGZhdmljb25fMTkyOiB7XG5cdFx0bGFiZWw6ICdhbmRyb2lkLWNocm9tZSAxOTJ4MTkyIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vYW5kcm9pZC1jaHJvbWUtMTkyeDE5Mi5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxOTIsXG5cdFx0XHRoZWlnaHQ6IDE5Mixcblx0XHR9LFxuXHR9LFxuXHRmYXZpY29uXzUxMjoge1xuXHRcdGxhYmVsOiAnYW5kcm9pZC1jaHJvbWUgNTEyeDUxMiAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL2FuZHJvaWQtY2hyb21lLTUxMng1MTIucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogNTEyLFxuXHRcdFx0aGVpZ2h0OiA1MTIsXG5cdFx0fSxcblx0fSxcblx0dG91Y2hpY29uXzE4MDoge1xuXHRcdGxhYmVsOiAnYXBwbGUtdG91Y2gtaWNvbiAxODB4MTgwIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vYXBwbGUtdG91Y2gtaWNvbi5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxODAsXG5cdFx0XHRoZWlnaHQ6IDE4MCxcblx0XHR9LFxuXHR9LFxuXHR0b3VjaGljb25fMTgwX3ByZToge1xuXHRcdGxhYmVsOiAnYXBwbGUtdG91Y2gtaWNvbi1wcmVjb21wb3NlZCAxODB4MTgwIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vYXBwbGUtdG91Y2gtaWNvbi1wcmVjb21wb3NlZC5wbmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydwbmcnXSxcblx0XHRcdHdpZHRoOiAxODAsXG5cdFx0XHRoZWlnaHQ6IDE4MCxcblx0XHR9LFxuXHR9LFxuXHR0aWxlXzcwOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgNzB4NzAgKHBuZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9tc3RpbGUtNzB4NzAucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTQ0LFxuXHRcdFx0aGVpZ2h0OiAxNDQsXG5cdFx0fSxcblx0fSxcblx0dGlsZV8xNDQ6IHtcblx0XHRsYWJlbDogJ21zdGlsZSAxNDR4MTQ0IChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vbXN0aWxlLTE0NHgxNDQucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTQ0LFxuXHRcdFx0aGVpZ2h0OiAxNDQsXG5cdFx0fSxcblx0fSxcblx0dGlsZV8xNTA6IHtcblx0XHRsYWJlbDogJ21zdGlsZSAxNTB4MTUwIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vbXN0aWxlLTE1MHgxNTAucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMTUwLFxuXHRcdFx0aGVpZ2h0OiAxNTAsXG5cdFx0fSxcblx0fSxcblx0dGlsZV8zMTBfc3F1YXJlOiB7XG5cdFx0bGFiZWw6ICdtc3RpbGUgMzEweDMxMCAocG5nKScsXG5cdFx0ZGVmYXVsdFVybDogJ2ltYWdlcy9sb2dvL21zdGlsZS0zMTB4MzEwLnBuZycsXG5cdFx0Y29uc3RyYWludHM6IHtcblx0XHRcdHR5cGU6ICdpbWFnZScsXG5cdFx0XHRleHRlbnNpb25zOiBbJ3BuZyddLFxuXHRcdFx0d2lkdGg6IDMxMCxcblx0XHRcdGhlaWdodDogMzEwLFxuXHRcdH0sXG5cdH0sXG5cdHRpbGVfMzEwX3dpZGU6IHtcblx0XHRsYWJlbDogJ21zdGlsZSAzMTB4MTUwIChwbmcpJyxcblx0XHRkZWZhdWx0VXJsOiAnaW1hZ2VzL2xvZ28vbXN0aWxlLTMxMHgxNTAucG5nJyxcblx0XHRjb25zdHJhaW50czoge1xuXHRcdFx0dHlwZTogJ2ltYWdlJyxcblx0XHRcdGV4dGVuc2lvbnM6IFsncG5nJ10sXG5cdFx0XHR3aWR0aDogMzEwLFxuXHRcdFx0aGVpZ2h0OiAxNTAsXG5cdFx0fSxcblx0fSxcblx0c2FmYXJpX3Bpbm5lZDoge1xuXHRcdGxhYmVsOiAnc2FmYXJpIHBpbm5lZCB0YWIgKHN2ZyknLFxuXHRcdGRlZmF1bHRVcmw6ICdpbWFnZXMvbG9nby9zYWZhcmktcGlubmVkLXRhYi5zdmcnLFxuXHRcdGNvbnN0cmFpbnRzOiB7XG5cdFx0XHR0eXBlOiAnaW1hZ2UnLFxuXHRcdFx0ZXh0ZW5zaW9uczogWydzdmcnXSxcblx0XHRcdHdpZHRoOiB1bmRlZmluZWQsXG5cdFx0XHRoZWlnaHQ6IHVuZGVmaW5lZCxcblx0XHR9LFxuXHR9LFxufTtcblxuUm9ja2V0Q2hhdC5Bc3NldHMgPSBuZXcgKGNsYXNzIHtcblx0Z2V0IG1pbWUoKSB7XG5cdFx0cmV0dXJuIG1pbWU7XG5cdH1cblxuXHRnZXQgYXNzZXRzKCkge1xuXHRcdHJldHVybiBhc3NldHM7XG5cdH1cblxuXHRzZXRBc3NldChiaW5hcnlDb250ZW50LCBjb250ZW50VHlwZSwgYXNzZXQpIHtcblx0XHRpZiAoIWFzc2V0c1thc3NldF0pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtYXNzZXQnLCAnSW52YWxpZCBhc3NldCcsIHtcblx0XHRcdFx0ZnVuY3Rpb246ICdSb2NrZXRDaGF0LkFzc2V0cy5zZXRBc3NldCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBleHRlbnNpb24gPSBtaW1lLmV4dGVuc2lvbihjb250ZW50VHlwZSk7XG5cdFx0aWYgKGFzc2V0c1thc3NldF0uY29uc3RyYWludHMuZXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pID09PSBmYWxzZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihjb250ZW50VHlwZSwgYEludmFsaWQgZmlsZSB0eXBlOiAkeyBjb250ZW50VHlwZSB9YCwge1xuXHRcdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuQXNzZXRzLnNldEFzc2V0Jyxcblx0XHRcdFx0ZXJyb3JUaXRsZTogJ2Vycm9yLWludmFsaWQtZmlsZS10eXBlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IGZpbGUgPSBuZXcgQnVmZmVyKGJpbmFyeUNvbnRlbnQsICdiaW5hcnknKTtcblx0XHRpZiAoYXNzZXRzW2Fzc2V0XS5jb25zdHJhaW50cy53aWR0aCB8fCBhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLmhlaWdodCkge1xuXHRcdFx0Y29uc3QgZGltZW5zaW9ucyA9IHNpemVPZihmaWxlKTtcblx0XHRcdGlmIChhc3NldHNbYXNzZXRdLmNvbnN0cmFpbnRzLndpZHRoICYmIGFzc2V0c1thc3NldF0uY29uc3RyYWludHMud2lkdGggIT09IGRpbWVuc2lvbnMud2lkdGgpIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1maWxlLXdpZHRoJywgJ0ludmFsaWQgZmlsZSB3aWR0aCcsIHtcblx0XHRcdFx0XHRmdW5jdGlvbjogJ0ludmFsaWQgZmlsZSB3aWR0aCcsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGFzc2V0c1thc3NldF0uY29uc3RyYWludHMuaGVpZ2h0ICYmIGFzc2V0c1thc3NldF0uY29uc3RyYWludHMuaGVpZ2h0ICE9PSBkaW1lbnNpb25zLmhlaWdodCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWZpbGUtaGVpZ2h0Jyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgcnMgPSBSb2NrZXRDaGF0RmlsZS5idWZmZXJUb1N0cmVhbShmaWxlKTtcblx0XHRSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UuZGVsZXRlRmlsZShhc3NldCk7XG5cblx0XHRjb25zdCB3cyA9IFJvY2tldENoYXRBc3NldHNJbnN0YW5jZS5jcmVhdGVXcml0ZVN0cmVhbShhc3NldCwgY29udGVudFR5cGUpO1xuXHRcdHdzLm9uKCdlbmQnLCBNZXRlb3IuYmluZEVudmlyb25tZW50KGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIE1ldGVvci5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zdCBrZXkgPSBgQXNzZXRzXyR7IGFzc2V0IH1gO1xuXHRcdFx0XHRjb25zdCB2YWx1ZSA9IHtcblx0XHRcdFx0XHR1cmw6IGBhc3NldHMvJHsgYXNzZXQgfS4keyBleHRlbnNpb24gfWAsXG5cdFx0XHRcdFx0ZGVmYXVsdFVybDogYXNzZXRzW2Fzc2V0XS5kZWZhdWx0VXJsLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdFJvY2tldENoYXQuc2V0dGluZ3MudXBkYXRlQnlJZChrZXksIHZhbHVlKTtcblx0XHRcdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnByb2Nlc3NBc3NldChrZXksIHZhbHVlKTtcblx0XHRcdH0sIDIwMCk7XG5cdFx0fSkpO1xuXG5cdFx0cnMucGlwZSh3cyk7XG5cdH1cblxuXHR1bnNldEFzc2V0KGFzc2V0KSB7XG5cdFx0aWYgKCFhc3NldHNbYXNzZXRdKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLWFzc2V0JywgJ0ludmFsaWQgYXNzZXQnLCB7XG5cdFx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5Bc3NldHMudW5zZXRBc3NldCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRSb2NrZXRDaGF0QXNzZXRzSW5zdGFuY2UuZGVsZXRlRmlsZShhc3NldCk7XG5cdFx0Y29uc3Qga2V5ID0gYEFzc2V0c18keyBhc3NldCB9YDtcblx0XHRjb25zdCB2YWx1ZSA9IHtcblx0XHRcdGRlZmF1bHRVcmw6IGFzc2V0c1thc3NldF0uZGVmYXVsdFVybCxcblx0XHR9O1xuXG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKGtleSwgdmFsdWUpO1xuXHRcdFJvY2tldENoYXQuQXNzZXRzLnByb2Nlc3NBc3NldChrZXksIHZhbHVlKTtcblx0fVxuXG5cdHJlZnJlc2hDbGllbnRzKCkge1xuXHRcdHJldHVybiBwcm9jZXNzLmVtaXQoJ21lc3NhZ2UnLCB7XG5cdFx0XHRyZWZyZXNoOiAnY2xpZW50Jyxcblx0XHR9KTtcblx0fVxuXG5cdHByb2Nlc3NBc3NldChzZXR0aW5nS2V5LCBzZXR0aW5nVmFsdWUpIHtcblx0XHRpZiAoc2V0dGluZ0tleS5pbmRleE9mKCdBc3NldHNfJykgIT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBhc3NldEtleSA9IHNldHRpbmdLZXkucmVwbGFjZSgvXkFzc2V0c18vLCAnJyk7XG5cdFx0Y29uc3QgYXNzZXRWYWx1ZSA9IGFzc2V0c1thc3NldEtleV07XG5cblx0XHRpZiAoIWFzc2V0VmFsdWUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAoIXNldHRpbmdWYWx1ZSB8fCAhc2V0dGluZ1ZhbHVlLnVybCkge1xuXHRcdFx0YXNzZXRWYWx1ZS5jYWNoZSA9IHVuZGVmaW5lZDtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBmaWxlID0gUm9ja2V0Q2hhdEFzc2V0c0luc3RhbmNlLmdldEZpbGVTeW5jKGFzc2V0S2V5KTtcblx0XHRpZiAoIWZpbGUpIHtcblx0XHRcdGFzc2V0VmFsdWUuY2FjaGUgPSB1bmRlZmluZWQ7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Y29uc3QgaGFzaCA9IGNyeXB0by5jcmVhdGVIYXNoKCdzaGExJykudXBkYXRlKGZpbGUuYnVmZmVyKS5kaWdlc3QoJ2hleCcpO1xuXHRcdGNvbnN0IGV4dGVuc2lvbiA9IHNldHRpbmdWYWx1ZS51cmwuc3BsaXQoJy4nKS5wb3AoKTtcblxuXHRcdHJldHVybiBhc3NldFZhbHVlLmNhY2hlID0ge1xuXHRcdFx0cGF0aDogYGFzc2V0cy8keyBhc3NldEtleSB9LiR7IGV4dGVuc2lvbiB9YCxcblx0XHRcdGNhY2hlYWJsZTogZmFsc2UsXG5cdFx0XHRzb3VyY2VNYXBVcmw6IHVuZGVmaW5lZCxcblx0XHRcdHdoZXJlOiAnY2xpZW50Jyxcblx0XHRcdHR5cGU6ICdhc3NldCcsXG5cdFx0XHRjb250ZW50OiBmaWxlLmJ1ZmZlcixcblx0XHRcdGV4dGVuc2lvbixcblx0XHRcdHVybDogYC9hc3NldHMvJHsgYXNzZXRLZXkgfS4keyBleHRlbnNpb24gfT8keyBoYXNoIH1gLFxuXHRcdFx0c2l6ZTogZmlsZS5sZW5ndGgsXG5cdFx0XHR1cGxvYWREYXRlOiBmaWxlLnVwbG9hZERhdGUsXG5cdFx0XHRjb250ZW50VHlwZTogZmlsZS5jb250ZW50VHlwZSxcblx0XHRcdGhhc2gsXG5cdFx0fTtcblx0fVxuXG5cdGdldFVSTChhc3NldE5hbWUsIG9wdGlvbnMgPSB7IGNkbjogZmFsc2UsIGZ1bGw6IHRydWUgfSkge1xuXHRcdGNvbnN0IGFzc2V0ID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYXNzZXROYW1lKTtcblx0XHRjb25zdCB1cmwgPSBhc3NldC51cmwgfHwgYXNzZXQuZGVmYXVsdFVybDtcblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LmdldFVSTCh1cmwsIG9wdGlvbnMpO1xuXHR9XG59KTtcblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5hZGRHcm91cCgnQXNzZXRzJyk7XG5cblJvY2tldENoYXQuc2V0dGluZ3MuYWRkKCdBc3NldHNfU3ZnRmF2aWNvbl9FbmFibGUnLCB0cnVlLCB7XG5cdHR5cGU6ICdib29sZWFuJyxcblx0Z3JvdXA6ICdBc3NldHMnLFxuXHRpMThuTGFiZWw6ICdFbmFibGVfU3ZnX0Zhdmljb24nLFxufSk7XG5cbmZ1bmN0aW9uIGFkZEFzc2V0VG9TZXR0aW5nKGFzc2V0LCB2YWx1ZSkge1xuXHRjb25zdCBrZXkgPSBgQXNzZXRzXyR7IGFzc2V0IH1gO1xuXG5cdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGtleSwge1xuXHRcdGRlZmF1bHRVcmw6IHZhbHVlLmRlZmF1bHRVcmwsXG5cdH0sIHtcblx0XHR0eXBlOiAnYXNzZXQnLFxuXHRcdGdyb3VwOiAnQXNzZXRzJyxcblx0XHRmaWxlQ29uc3RyYWludHM6IHZhbHVlLmNvbnN0cmFpbnRzLFxuXHRcdGkxOG5MYWJlbDogdmFsdWUubGFiZWwsXG5cdFx0YXNzZXQsXG5cdFx0cHVibGljOiB0cnVlLFxuXHRcdHdpemFyZDogdmFsdWUud2l6YXJkLFxuXHR9KTtcblxuXHRjb25zdCBjdXJyZW50VmFsdWUgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChrZXkpO1xuXG5cdGlmICh0eXBlb2YgY3VycmVudFZhbHVlID09PSAnb2JqZWN0JyAmJiBjdXJyZW50VmFsdWUuZGVmYXVsdFVybCAhPT0gYXNzZXRzW2Fzc2V0XS5kZWZhdWx0VXJsKSB7XG5cdFx0Y3VycmVudFZhbHVlLmRlZmF1bHRVcmwgPSBhc3NldHNbYXNzZXRdLmRlZmF1bHRVcmw7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy51cGRhdGVCeUlkKGtleSwgY3VycmVudFZhbHVlKTtcblx0fVxufVxuXG5mb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG5cdGNvbnN0IHZhbHVlID0gYXNzZXRzW2tleV07XG5cdGFkZEFzc2V0VG9TZXR0aW5nKGtleSwgdmFsdWUpO1xufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5TZXR0aW5ncy5maW5kKCkub2JzZXJ2ZSh7XG5cdGFkZGVkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgcmVjb3JkLnZhbHVlKTtcblx0fSxcblxuXHRjaGFuZ2VkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgcmVjb3JkLnZhbHVlKTtcblx0fSxcblxuXHRyZW1vdmVkKHJlY29yZCkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5wcm9jZXNzQXNzZXQocmVjb3JkLl9pZCwgdW5kZWZpbmVkKTtcblx0fSxcbn0pO1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0cmV0dXJuIE1ldGVvci5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBwcm9jZXNzLmVtaXQoJ21lc3NhZ2UnLCB7XG5cdFx0XHRyZWZyZXNoOiAnY2xpZW50Jyxcblx0XHR9KTtcblx0fSwgMjAwKTtcbn0pO1xuXG5jb25zdCB7IGNhbGN1bGF0ZUNsaWVudEhhc2ggfSA9IFdlYkFwcEhhc2hpbmc7XG5cbldlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaCA9IGZ1bmN0aW9uKG1hbmlmZXN0LCBpbmNsdWRlRmlsdGVyLCBydW50aW1lQ29uZmlnT3ZlcnJpZGUpIHtcblx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoYXNzZXRzKSkge1xuXHRcdGNvbnN0IHZhbHVlID0gYXNzZXRzW2tleV07XG5cdFx0aWYgKCF2YWx1ZS5jYWNoZSAmJiAhdmFsdWUuZGVmYXVsdFVybCkge1xuXHRcdFx0Y29udGludWU7XG5cdFx0fVxuXG5cdFx0bGV0IGNhY2hlID0ge307XG5cdFx0aWYgKHZhbHVlLmNhY2hlKSB7XG5cdFx0XHRjYWNoZSA9IHtcblx0XHRcdFx0cGF0aDogdmFsdWUuY2FjaGUucGF0aCxcblx0XHRcdFx0Y2FjaGVhYmxlOiB2YWx1ZS5jYWNoZS5jYWNoZWFibGUsXG5cdFx0XHRcdHNvdXJjZU1hcFVybDogdmFsdWUuY2FjaGUuc291cmNlTWFwVXJsLFxuXHRcdFx0XHR3aGVyZTogdmFsdWUuY2FjaGUud2hlcmUsXG5cdFx0XHRcdHR5cGU6IHZhbHVlLmNhY2hlLnR5cGUsXG5cdFx0XHRcdHVybDogdmFsdWUuY2FjaGUudXJsLFxuXHRcdFx0XHRzaXplOiB2YWx1ZS5jYWNoZS5zaXplLFxuXHRcdFx0XHRoYXNoOiB2YWx1ZS5jYWNoZS5oYXNoLFxuXHRcdFx0fTtcblx0XHRcdFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc1tgL19fY29yZG92YS9hc3NldHMvJHsga2V5IH1gXSA9IHZhbHVlLmNhY2hlO1xuXHRcdFx0V2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzW2AvX19jb3Jkb3ZhL2Fzc2V0cy8keyBrZXkgfS4keyB2YWx1ZS5jYWNoZS5leHRlbnNpb24gfWBdID0gdmFsdWUuY2FjaGU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGV4dGVuc2lvbiA9IHZhbHVlLmRlZmF1bHRVcmwuc3BsaXQoJy4nKS5wb3AoKTtcblx0XHRcdGNhY2hlID0ge1xuXHRcdFx0XHRwYXRoOiBgYXNzZXRzLyR7IGtleSB9LiR7IGV4dGVuc2lvbiB9YCxcblx0XHRcdFx0Y2FjaGVhYmxlOiBmYWxzZSxcblx0XHRcdFx0c291cmNlTWFwVXJsOiB1bmRlZmluZWQsXG5cdFx0XHRcdHdoZXJlOiAnY2xpZW50Jyxcblx0XHRcdFx0dHlwZTogJ2Fzc2V0Jyxcblx0XHRcdFx0dXJsOiBgL2Fzc2V0cy8keyBrZXkgfS4keyBleHRlbnNpb24gfT92M2AsXG5cdFx0XHRcdGhhc2g6ICd2MycsXG5cdFx0XHR9O1xuXG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9YF0gPSBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvJHsgdmFsdWUuZGVmYXVsdFVybCB9YF07XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvYXNzZXRzLyR7IGtleSB9LiR7IGV4dGVuc2lvbiB9YF0gPSBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNbYC9fX2NvcmRvdmEvJHsgdmFsdWUuZGVmYXVsdFVybCB9YF07XG5cdFx0fVxuXG5cdFx0Y29uc3QgbWFuaWZlc3RJdGVtID0gXy5maW5kV2hlcmUobWFuaWZlc3QsIHtcblx0XHRcdHBhdGg6IGtleSxcblx0XHR9KTtcblxuXHRcdGlmIChtYW5pZmVzdEl0ZW0pIHtcblx0XHRcdGNvbnN0IGluZGV4ID0gbWFuaWZlc3QuaW5kZXhPZihtYW5pZmVzdEl0ZW0pO1xuXHRcdFx0bWFuaWZlc3RbaW5kZXhdID0gY2FjaGU7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1hbmlmZXN0LnB1c2goY2FjaGUpO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjYWxjdWxhdGVDbGllbnRIYXNoLmNhbGwodGhpcywgbWFuaWZlc3QsIGluY2x1ZGVGaWx0ZXIsIHJ1bnRpbWVDb25maWdPdmVycmlkZSk7XG59O1xuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHJlZnJlc2hDbGllbnRzKCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdyZWZyZXNoQ2xpZW50cycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBoYXNQZXJtaXNzaW9uID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hc3NldHMnKTtcblx0XHRpZiAoIWhhc1Blcm1pc3Npb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNYW5hZ2luZyBhc3NldHMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3JlZnJlc2hDbGllbnRzJyxcblx0XHRcdFx0YWN0aW9uOiAnTWFuYWdpbmdfYXNzZXRzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0LkFzc2V0cy5yZWZyZXNoQ2xpZW50cygpO1xuXHR9LFxuXG5cdHVuc2V0QXNzZXQoYXNzZXQpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdFx0bWV0aG9kOiAndW5zZXRBc3NldCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBoYXNQZXJtaXNzaW9uID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hc3NldHMnKTtcblx0XHRpZiAoIWhhc1Blcm1pc3Npb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNYW5hZ2luZyBhc3NldHMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3Vuc2V0QXNzZXQnLFxuXHRcdFx0XHRhY3Rpb246ICdNYW5hZ2luZ19hc3NldHMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIFJvY2tldENoYXQuQXNzZXRzLnVuc2V0QXNzZXQoYXNzZXQpO1xuXHR9LFxuXG5cdHNldEFzc2V0KGJpbmFyeUNvbnRlbnQsIGNvbnRlbnRUeXBlLCBhc3NldCkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdzZXRBc3NldCcsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCBoYXNQZXJtaXNzaW9uID0gUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ21hbmFnZS1hc3NldHMnKTtcblx0XHRpZiAoIWhhc1Blcm1pc3Npb24pIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdNYW5hZ2luZyBhc3NldHMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ3NldEFzc2V0Jyxcblx0XHRcdFx0YWN0aW9uOiAnTWFuYWdpbmdfYXNzZXRzJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdFJvY2tldENoYXQuQXNzZXRzLnNldEFzc2V0KGJpbmFyeUNvbnRlbnQsIGNvbnRlbnRUeXBlLCBhc3NldCk7XG5cdH0sXG59KTtcblxuV2ViQXBwLmNvbm5lY3RIYW5kbGVycy51c2UoJy9hc3NldHMvJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbihyZXEsIHJlcywgbmV4dCkge1xuXHRjb25zdCBwYXJhbXMgPSB7XG5cdFx0YXNzZXQ6IGRlY29kZVVSSUNvbXBvbmVudChyZXEudXJsLnJlcGxhY2UoL15cXC8vLCAnJykucmVwbGFjZSgvXFw/LiokLywgJycpKS5yZXBsYWNlKC9cXC5bXi5dKiQvLCAnJyksXG5cdH07XG5cblx0Y29uc3QgZmlsZSA9IGFzc2V0c1twYXJhbXMuYXNzZXRdICYmIGFzc2V0c1twYXJhbXMuYXNzZXRdLmNhY2hlO1xuXG5cdGNvbnN0IGZvcm1hdCA9IHJlcS51cmwucmVwbGFjZSgvLipcXC4oW2Etel0rKSQvLCAnJDEnKTtcblxuXHRpZiAoIWZpbGUpIHtcblx0XHRjb25zdCBkZWZhdWx0VXJsID0gYXNzZXRzW3BhcmFtcy5hc3NldF0gJiYgYXNzZXRzW3BhcmFtcy5hc3NldF0uZGVmYXVsdFVybDtcblx0XHRpZiAoZGVmYXVsdFVybCkge1xuXHRcdFx0Y29uc3QgYXNzZXRVcmwgPSBmb3JtYXQgJiYgWydwbmcnLCAnc3ZnJ10uaW5jbHVkZXMoZm9ybWF0KSA/IGRlZmF1bHRVcmwucmVwbGFjZSgvKHN2Z3xwbmcpJC8sIGZvcm1hdCkgOiBkZWZhdWx0VXJsO1xuXHRcdFx0cmVxLnVybCA9IGAvJHsgYXNzZXRVcmwgfWA7XG5cdFx0XHRXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNNaWRkbGV3YXJlKFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlcywgcmVxLCByZXMsIG5leHQpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXMud3JpdGVIZWFkKDQwNCk7XG5cdFx0XHRyZXMuZW5kKCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgcmVxTW9kaWZpZWRIZWFkZXIgPSByZXEuaGVhZGVyc1snaWYtbW9kaWZpZWQtc2luY2UnXTtcblx0aWYgKHJlcU1vZGlmaWVkSGVhZGVyKSB7XG5cdFx0aWYgKHJlcU1vZGlmaWVkSGVhZGVyID09PSAoZmlsZS51cGxvYWREYXRlICYmIGZpbGUudXBsb2FkRGF0ZS50b1VUQ1N0cmluZygpKSkge1xuXHRcdFx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIHJlcU1vZGlmaWVkSGVhZGVyKTtcblx0XHRcdHJlcy53cml0ZUhlYWQoMzA0KTtcblx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdH1cblxuXHRyZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgJ3B1YmxpYywgbWF4LWFnZT0wJyk7XG5cdHJlcy5zZXRIZWFkZXIoJ0V4cGlyZXMnLCAnLTEnKTtcblxuXHRpZiAoZm9ybWF0ICYmIGZvcm1hdCAhPT0gZmlsZS5leHRlbnNpb24gJiYgWydwbmcnLCAnanBnJywgJ2pwZWcnXS5pbmNsdWRlcyhmb3JtYXQpKSB7XG5cdFx0cmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgYGltYWdlLyR7IGZvcm1hdCB9YCk7XG5cdFx0c2hhcnAoZmlsZS5jb250ZW50KVxuXHRcdFx0LnRvRm9ybWF0KGZvcm1hdClcblx0XHRcdC5waXBlKHJlcyk7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0cmVzLnNldEhlYWRlcignTGFzdC1Nb2RpZmllZCcsIChmaWxlLnVwbG9hZERhdGUgJiYgZmlsZS51cGxvYWREYXRlLnRvVVRDU3RyaW5nKCkpIHx8IG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKSk7XG5cdHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsIGZpbGUuY29udGVudFR5cGUpO1xuXHRyZXMuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIGZpbGUuc2l6ZSk7XG5cdHJlcy53cml0ZUhlYWQoMjAwKTtcblx0cmVzLmVuZChmaWxlLmNvbnRlbnQpO1xufSkpO1xuIl19
