(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var ECMAScript = Package.ecmascript.ECMAScript;
var changeCase = Package['konecty:change-case'].changeCase;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var OEmbed;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:oembed":{"server":{"server.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_oembed/server/server.js                                                                       //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
const module1 = module;

let _;

module1.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let URL;
module1.watch(require("url"), {
  default(v) {
    URL = v;
  }

}, 1);
let querystring;
module1.watch(require("querystring"), {
  default(v) {
    querystring = v;
  }

}, 2);
let iconv;
module1.watch(require("iconv-lite"), {
  default(v) {
    iconv = v;
  }

}, 3);
let ipRangeCheck;
module1.watch(require("ip-range-check"), {
  default(v) {
    ipRangeCheck = v;
  }

}, 4);
let he;
module1.watch(require("he"), {
  default(v) {
    he = v;
  }

}, 5);
let jschardet;
module1.watch(require("jschardet"), {
  default(v) {
    jschardet = v;
  }

}, 6);
const request = HTTPInternals.NpmModules.request.module;
const OEmbed = {}; //  Detect encoding
//  Priority:
//  Detected == HTTP Header > Detected == HTML meta > HTTP Header > HTML meta > Detected > Default (utf-8)
//  See also: https://www.w3.org/International/questions/qa-html-encoding-declarations.en#quickanswer

const getCharset = function (contentType, body) {
  let detectedCharset;
  let httpHeaderCharset;
  let htmlMetaCharset;
  let result;
  contentType = contentType || '';
  const binary = body.toString('binary');
  const detected = jschardet.detect(binary);

  if (detected.confidence > 0.8) {
    detectedCharset = detected.encoding.toLowerCase();
  }

  const m1 = contentType.match(/charset=([\w\-]+)/i);

  if (m1) {
    httpHeaderCharset = m1[1].toLowerCase();
  }

  const m2 = binary.match(/<meta\b[^>]*charset=["']?([\w\-]+)/i);

  if (m2) {
    htmlMetaCharset = m2[1].toLowerCase();
  }

  if (detectedCharset) {
    if (detectedCharset === httpHeaderCharset) {
      result = httpHeaderCharset;
    } else if (detectedCharset === htmlMetaCharset) {
      result = htmlMetaCharset;
    }
  }

  if (!result) {
    result = httpHeaderCharset || htmlMetaCharset || detectedCharset;
  }

  return result || 'utf-8';
};

const toUtf8 = function (contentType, body) {
  return iconv.decode(body, getCharset(contentType, body));
};

const getUrlContent = function (urlObj, redirectCount = 5, callback) {
  if (_.isString(urlObj)) {
    urlObj = URL.parse(urlObj);
  }

  const parsedUrl = _.pick(urlObj, ['host', 'hash', 'pathname', 'protocol', 'port', 'query', 'search', 'hostname']);

  const ignoredHosts = RocketChat.settings.get('API_EmbedIgnoredHosts').replace(/\s/g, '').split(',') || [];

  if (ignoredHosts.includes(parsedUrl.hostname) || ipRangeCheck(parsedUrl.hostname, ignoredHosts)) {
    return callback();
  }

  const safePorts = RocketChat.settings.get('API_EmbedSafePorts').replace(/\s/g, '').split(',') || [];

  if (parsedUrl.port && safePorts.length > 0 && !safePorts.includes(parsedUrl.port)) {
    return callback();
  }

  const data = RocketChat.callbacks.run('oembed:beforeGetUrlContent', {
    urlObj,
    parsedUrl
  });

  if (data.attachments != null) {
    return callback(null, data);
  }

  const url = URL.format(data.urlObj);
  const opts = {
    url,
    strictSSL: !RocketChat.settings.get('Allow_Invalid_SelfSigned_Certs'),
    gzip: true,
    maxRedirects: redirectCount,
    headers: {
      'User-Agent': RocketChat.settings.get('API_Embed_UserAgent')
    }
  };
  let headers = null;
  let statusCode = null;
  let error = null;
  const chunks = [];
  let chunksTotalLength = 0;
  const stream = request(opts);
  stream.on('response', function (response) {
    statusCode = response.statusCode;
    headers = response.headers;

    if (response.statusCode !== 200) {
      return stream.abort();
    }
  });
  stream.on('data', function (chunk) {
    chunks.push(chunk);
    chunksTotalLength += chunk.length;

    if (chunksTotalLength > 250000) {
      return stream.abort();
    }
  });
  stream.on('end', Meteor.bindEnvironment(function () {
    if (error != null) {
      return callback(null, {
        error,
        parsedUrl
      });
    }

    const buffer = Buffer.concat(chunks);
    return callback(null, {
      headers,
      body: toUtf8(headers['content-type'], buffer),
      parsedUrl,
      statusCode
    });
  }));
  return stream.on('error', function (err) {
    return error = err;
  });
};

OEmbed.getUrlMeta = function (url, withFragment) {
  const getUrlContentSync = Meteor.wrapAsync(getUrlContent);
  const urlObj = URL.parse(url);

  if (withFragment != null) {
    const queryStringObj = querystring.parse(urlObj.query);
    queryStringObj._escaped_fragment_ = '';
    urlObj.query = querystring.stringify(queryStringObj);
    let path = urlObj.pathname;

    if (urlObj.query != null) {
      path += `?${urlObj.query}`;
    }

    urlObj.path = path;
  }

  const content = getUrlContentSync(urlObj, 5);

  if (!content) {
    return;
  }

  if (content.attachments != null) {
    return content;
  }

  let metas = undefined;

  if (content && content.body) {
    metas = {};
    content.body.replace(/<title[^>]*>([^<]*)<\/title>/gmi, function (meta, title) {
      return metas.pageTitle != null ? metas.pageTitle : metas.pageTitle = he.unescape(title);
    });
    content.body.replace(/<meta[^>]*(?:name|property)=[']([^']*)['][^>]*\scontent=[']([^']*)['][^>]*>/gmi, function (meta, name, value) {
      let name1;
      return metas[name1 = changeCase.camelCase(name)] != null ? metas[name1] : metas[name1] = he.unescape(value);
    });
    content.body.replace(/<meta[^>]*(?:name|property)=["]([^"]*)["][^>]*\scontent=["]([^"]*)["][^>]*>/gmi, function (meta, name, value) {
      let name1;
      return metas[name1 = changeCase.camelCase(name)] != null ? metas[name1] : metas[name1] = he.unescape(value);
    });
    content.body.replace(/<meta[^>]*\scontent=[']([^']*)['][^>]*(?:name|property)=[']([^']*)['][^>]*>/gmi, function (meta, value, name) {
      let name1;
      return metas[name1 = changeCase.camelCase(name)] != null ? metas[name1] : metas[name1] = he.unescape(value);
    });
    content.body.replace(/<meta[^>]*\scontent=["]([^"]*)["][^>]*(?:name|property)=["]([^"]*)["][^>]*>/gmi, function (meta, value, name) {
      let name1;
      return metas[name1 = changeCase.camelCase(name)] != null ? metas[name1] : metas[name1] = he.unescape(value);
    });

    if (metas.fragment === '!' && withFragment == null) {
      return OEmbed.getUrlMeta(url, true);
    }
  }

  let headers = undefined;
  let data = undefined;

  if (content && content.headers) {
    headers = {};
    const headerObj = content.headers;
    Object.keys(headerObj).forEach(header => {
      headers[changeCase.camelCase(header)] = headerObj[header];
    });
  }

  if (content && content.statusCode !== 200) {
    return data;
  }

  data = RocketChat.callbacks.run('oembed:afterParseContent', {
    meta: metas,
    headers,
    parsedUrl: content.parsedUrl,
    content
  });
  return data;
};

OEmbed.getUrlMetaWithCache = function (url, withFragment) {
  const cache = RocketChat.models.OEmbedCache.findOneById(url);

  if (cache != null) {
    return cache.data;
  }

  const data = OEmbed.getUrlMeta(url, withFragment);

  if (data != null) {
    try {
      RocketChat.models.OEmbedCache.createWithIdAndData(url, data);
    } catch (_error) {
      console.error('OEmbed duplicated record', url);
    }

    return data;
  }
};

const getRelevantHeaders = function (headersObj) {
  const headers = {};
  Object.keys(headersObj).forEach(key => {
    const value = headersObj[key];
    const lowerCaseKey = key.toLowerCase();

    if ((lowerCaseKey === 'contenttype' || lowerCaseKey === 'contentlength') && value && value.trim() !== '') {
      headers[key] = value;
    }
  });

  if (Object.keys(headers).length > 0) {
    return headers;
  }
};

const getRelevantMetaTags = function (metaObj) {
  const tags = {};
  Object.keys(metaObj).forEach(key => {
    const value = metaObj[key];

    if (/^(og|fb|twitter|oembed|msapplication).+|description|title|pageTitle$/.test(key.toLowerCase()) && value && value.trim() !== '') {
      tags[key] = value;
    }
  });

  if (Object.keys(tags).length > 0) {
    return tags;
  }
};

OEmbed.rocketUrlParser = function (message) {
  if (Array.isArray(message.urls)) {
    let attachments = [];
    let changed = false;
    message.urls.forEach(function (item) {
      if (item.ignoreParse === true) {
        return;
      }

      if (item.url.startsWith('grain://')) {
        changed = true;
        item.meta = {
          sandstorm: {
            grain: item.sandstormViewInfo
          }
        };
        return;
      }

      if (!/^https?:\/\//i.test(item.url)) {
        return;
      }

      const data = OEmbed.getUrlMetaWithCache(item.url);

      if (data != null) {
        if (data.attachments) {
          return attachments = _.union(attachments, data.attachments);
        } else {
          if (data.meta != null) {
            item.meta = getRelevantMetaTags(data.meta);
          }

          if (data.headers != null) {
            item.headers = getRelevantHeaders(data.headers);
          }

          item.parsedUrl = data.parsedUrl;
          return changed = true;
        }
      }
    });

    if (attachments.length) {
      RocketChat.models.Messages.setMessageAttachments(message._id, attachments);
    }

    if (changed === true) {
      RocketChat.models.Messages.setUrlsById(message._id, message.urls);
    }
  }

  return message;
};

RocketChat.settings.get('API_Embed', function (key, value) {
  if (value) {
    return RocketChat.callbacks.add('afterSaveMessage', OEmbed.rocketUrlParser, RocketChat.callbacks.priority.LOW, 'API_Embed');
  } else {
    return RocketChat.callbacks.remove('afterSaveMessage', 'API_Embed');
  }
});
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"providers.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_oembed/server/providers.js                                                                    //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let URL;
module.watch(require("url"), {
  default(v) {
    URL = v;
  }

}, 1);
let QueryString;
module.watch(require("querystring"), {
  default(v) {
    QueryString = v;
  }

}, 2);

class Providers {
  constructor() {
    this.providers = [];
  }

  static getConsumerUrl(provider, url) {
    const urlObj = URL.parse(provider.endPoint, true);
    urlObj.query.url = url;
    delete urlObj.search;
    return URL.format(urlObj);
  }

  registerProvider(provider) {
    return this.providers.push(provider);
  }

  getProviders() {
    return this.providers;
  }

  getProviderForUrl(url) {
    return _.find(this.providers, function (provider) {
      const candidate = _.find(provider.urls, function (re) {
        return re.test(url);
      });

      return candidate != null;
    });
  }

}

const providers = new Providers();
providers.registerProvider({
  urls: [new RegExp('https?://soundcloud.com/\\S+')],
  endPoint: 'https://soundcloud.com/oembed?format=json&maxheight=150'
});
providers.registerProvider({
  urls: [new RegExp('https?://vimeo.com/[^/]+'), new RegExp('https?://vimeo.com/channels/[^/]+/[^/]+'), new RegExp('https://vimeo.com/groups/[^/]+/videos/[^/]+')],
  endPoint: 'https://vimeo.com/api/oembed.json?maxheight=200'
});
providers.registerProvider({
  urls: [new RegExp('https?://www.youtube.com/\\S+'), new RegExp('https?://youtu.be/\\S+')],
  endPoint: 'https://www.youtube.com/oembed?maxheight=200'
});
providers.registerProvider({
  urls: [new RegExp('https?://www.rdio.com/\\S+'), new RegExp('https?://rd.io/\\S+')],
  endPoint: 'https://www.rdio.com/api/oembed/?format=json&maxheight=150'
});
providers.registerProvider({
  urls: [new RegExp('https?://www.slideshare.net/[^/]+/[^/]+')],
  endPoint: 'https://www.slideshare.net/api/oembed/2?format=json&maxheight=200'
});
providers.registerProvider({
  urls: [new RegExp('https?://www.dailymotion.com/video/\\S+')],
  endPoint: 'https://www.dailymotion.com/services/oembed?maxheight=200'
});
RocketChat.oembed = {};
RocketChat.oembed.providers = providers;
RocketChat.callbacks.add('oembed:beforeGetUrlContent', function (data) {
  if (data.parsedUrl != null) {
    const url = URL.format(data.parsedUrl);
    const provider = providers.getProviderForUrl(url);

    if (provider != null) {
      let consumerUrl = Providers.getConsumerUrl(provider, url);
      consumerUrl = URL.parse(consumerUrl, true);

      _.extend(data.parsedUrl, consumerUrl);

      data.urlObj.port = consumerUrl.port;
      data.urlObj.hostname = consumerUrl.hostname;
      data.urlObj.pathname = consumerUrl.pathname;
      data.urlObj.query = consumerUrl.query;
      delete data.urlObj.search;
      delete data.urlObj.host;
    }
  }

  return data;
}, RocketChat.callbacks.priority.MEDIUM, 'oembed-providers-before');
RocketChat.callbacks.add('oembed:afterParseContent', function (data) {
  if (data.parsedUrl && data.parsedUrl.query) {
    let queryString = data.parsedUrl.query;

    if (_.isString(data.parsedUrl.query)) {
      queryString = QueryString.parse(data.parsedUrl.query);
    }

    if (queryString.url != null) {
      const {
        url
      } = queryString;
      const provider = providers.getProviderForUrl(url);

      if (provider != null) {
        if (data.content && data.content.body) {
          try {
            const metas = JSON.parse(data.content.body);

            _.each(metas, function (value, key) {
              if (_.isString(value)) {
                return data.meta[changeCase.camelCase(`oembed_${key}`)] = value;
              }
            });

            data.meta.oembedUrl = url;
          } catch (error) {
            console.log(error);
          }
        }
      }
    }
  }

  return data;
}, RocketChat.callbacks.priority.MEDIUM, 'oembed-providers-after');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"jumpToMessage.js":function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_oembed/server/jumpToMessage.js                                                                //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let URL;
module.watch(require("url"), {
  default(v) {
    URL = v;
  }

}, 1);
let QueryString;
module.watch(require("querystring"), {
  default(v) {
    QueryString = v;
  }

}, 2);

const recursiveRemove = (message, deep = 1) => {
  if (message) {
    if ('attachments' in message && message.attachments !== null && deep < RocketChat.settings.get('Message_QuoteChainLimit')) {
      message.attachments.map(msg => recursiveRemove(msg, deep + 1));
    } else {
      delete message.attachments;
    }
  }

  return message;
};

RocketChat.callbacks.add('beforeSaveMessage', msg => {
  if (msg && msg.urls) {
    msg.urls.forEach(item => {
      if (item.url.indexOf(Meteor.absoluteUrl()) === 0) {
        const urlObj = URL.parse(item.url);

        if (urlObj.query) {
          const queryString = QueryString.parse(urlObj.query);

          if (_.isString(queryString.msg)) {
            // Jump-to query param
            const jumpToMessage = recursiveRemove(RocketChat.models.Messages.findOneById(queryString.msg));

            if (jumpToMessage) {
              msg.attachments = msg.attachments || [];
              const index = msg.attachments.findIndex(a => a.message_link === item.url);

              if (index > -1) {
                msg.attachments.splice(index, 1);
              }

              msg.attachments.push({
                text: jumpToMessage.msg,
                translations: jumpToMessage.translations,
                author_name: jumpToMessage.alias || jumpToMessage.u.username,
                author_icon: getAvatarUrlFromUsername(jumpToMessage.u.username),
                message_link: item.url,
                attachments: jumpToMessage.attachments || [],
                ts: jumpToMessage.ts
              });
              item.ignoreParse = true;
            }
          }
        }
      }
    });
  }

  return msg;
}, RocketChat.callbacks.priority.LOW, 'jumpToMessage');
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"models":{"OEmbedCache.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// packages/rocketchat_oembed/server/models/OEmbedCache.js                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
RocketChat.models.OEmbedCache = new class extends RocketChat.models._Base {
  constructor() {
    super('oembed_cache');
    this.tryEnsureIndex({
      updatedAt: 1
    });
  } // FIND ONE


  findOneById(_id, options) {
    const query = {
      _id
    };
    return this.findOne(query, options);
  } // INSERT


  createWithIdAndData(_id, data) {
    const record = {
      _id,
      data,
      updatedAt: new Date()
    };
    record._id = this.insert(record);
    return record;
  } // REMOVE


  removeAfterDate(date) {
    const query = {
      updatedAt: {
        $lte: date
      }
    };
    return this.remove(query);
  }

}();
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:oembed/server/server.js");
require("/node_modules/meteor/rocketchat:oembed/server/providers.js");
require("/node_modules/meteor/rocketchat:oembed/server/jumpToMessage.js");
require("/node_modules/meteor/rocketchat:oembed/server/models/OEmbedCache.js");

/* Exports */
Package._define("rocketchat:oembed", {
  OEmbed: OEmbed
});

})();

//# sourceURL=meteor://💻app/packages/rocketchat_oembed.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvZW1iZWQvc2VydmVyL3NlcnZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvZW1iZWQvc2VydmVyL3Byb3ZpZGVycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpvZW1iZWQvc2VydmVyL2p1bXBUb01lc3NhZ2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6b2VtYmVkL3NlcnZlci9tb2RlbHMvT0VtYmVkQ2FjaGUuanMiXSwibmFtZXMiOlsibW9kdWxlMSIsIm1vZHVsZSIsIl8iLCJ3YXRjaCIsInJlcXVpcmUiLCJkZWZhdWx0IiwidiIsIlVSTCIsInF1ZXJ5c3RyaW5nIiwiaWNvbnYiLCJpcFJhbmdlQ2hlY2siLCJoZSIsImpzY2hhcmRldCIsInJlcXVlc3QiLCJIVFRQSW50ZXJuYWxzIiwiTnBtTW9kdWxlcyIsIk9FbWJlZCIsImdldENoYXJzZXQiLCJjb250ZW50VHlwZSIsImJvZHkiLCJkZXRlY3RlZENoYXJzZXQiLCJodHRwSGVhZGVyQ2hhcnNldCIsImh0bWxNZXRhQ2hhcnNldCIsInJlc3VsdCIsImJpbmFyeSIsInRvU3RyaW5nIiwiZGV0ZWN0ZWQiLCJkZXRlY3QiLCJjb25maWRlbmNlIiwiZW5jb2RpbmciLCJ0b0xvd2VyQ2FzZSIsIm0xIiwibWF0Y2giLCJtMiIsInRvVXRmOCIsImRlY29kZSIsImdldFVybENvbnRlbnQiLCJ1cmxPYmoiLCJyZWRpcmVjdENvdW50IiwiY2FsbGJhY2siLCJpc1N0cmluZyIsInBhcnNlIiwicGFyc2VkVXJsIiwicGljayIsImlnbm9yZWRIb3N0cyIsIlJvY2tldENoYXQiLCJzZXR0aW5ncyIsImdldCIsInJlcGxhY2UiLCJzcGxpdCIsImluY2x1ZGVzIiwiaG9zdG5hbWUiLCJzYWZlUG9ydHMiLCJwb3J0IiwibGVuZ3RoIiwiZGF0YSIsImNhbGxiYWNrcyIsInJ1biIsImF0dGFjaG1lbnRzIiwidXJsIiwiZm9ybWF0Iiwib3B0cyIsInN0cmljdFNTTCIsImd6aXAiLCJtYXhSZWRpcmVjdHMiLCJoZWFkZXJzIiwic3RhdHVzQ29kZSIsImVycm9yIiwiY2h1bmtzIiwiY2h1bmtzVG90YWxMZW5ndGgiLCJzdHJlYW0iLCJvbiIsInJlc3BvbnNlIiwiYWJvcnQiLCJjaHVuayIsInB1c2giLCJNZXRlb3IiLCJiaW5kRW52aXJvbm1lbnQiLCJidWZmZXIiLCJCdWZmZXIiLCJjb25jYXQiLCJlcnIiLCJnZXRVcmxNZXRhIiwid2l0aEZyYWdtZW50IiwiZ2V0VXJsQ29udGVudFN5bmMiLCJ3cmFwQXN5bmMiLCJxdWVyeVN0cmluZ09iaiIsInF1ZXJ5IiwiX2VzY2FwZWRfZnJhZ21lbnRfIiwic3RyaW5naWZ5IiwicGF0aCIsInBhdGhuYW1lIiwiY29udGVudCIsIm1ldGFzIiwidW5kZWZpbmVkIiwibWV0YSIsInRpdGxlIiwicGFnZVRpdGxlIiwidW5lc2NhcGUiLCJuYW1lIiwidmFsdWUiLCJuYW1lMSIsImNoYW5nZUNhc2UiLCJjYW1lbENhc2UiLCJmcmFnbWVudCIsImhlYWRlck9iaiIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwiaGVhZGVyIiwiZ2V0VXJsTWV0YVdpdGhDYWNoZSIsImNhY2hlIiwibW9kZWxzIiwiT0VtYmVkQ2FjaGUiLCJmaW5kT25lQnlJZCIsImNyZWF0ZVdpdGhJZEFuZERhdGEiLCJfZXJyb3IiLCJjb25zb2xlIiwiZ2V0UmVsZXZhbnRIZWFkZXJzIiwiaGVhZGVyc09iaiIsImtleSIsImxvd2VyQ2FzZUtleSIsInRyaW0iLCJnZXRSZWxldmFudE1ldGFUYWdzIiwibWV0YU9iaiIsInRhZ3MiLCJ0ZXN0Iiwicm9ja2V0VXJsUGFyc2VyIiwibWVzc2FnZSIsIkFycmF5IiwiaXNBcnJheSIsInVybHMiLCJjaGFuZ2VkIiwiaXRlbSIsImlnbm9yZVBhcnNlIiwic3RhcnRzV2l0aCIsInNhbmRzdG9ybSIsImdyYWluIiwic2FuZHN0b3JtVmlld0luZm8iLCJ1bmlvbiIsIk1lc3NhZ2VzIiwic2V0TWVzc2FnZUF0dGFjaG1lbnRzIiwiX2lkIiwic2V0VXJsc0J5SWQiLCJhZGQiLCJwcmlvcml0eSIsIkxPVyIsInJlbW92ZSIsIlF1ZXJ5U3RyaW5nIiwiUHJvdmlkZXJzIiwiY29uc3RydWN0b3IiLCJwcm92aWRlcnMiLCJnZXRDb25zdW1lclVybCIsInByb3ZpZGVyIiwiZW5kUG9pbnQiLCJzZWFyY2giLCJyZWdpc3RlclByb3ZpZGVyIiwiZ2V0UHJvdmlkZXJzIiwiZ2V0UHJvdmlkZXJGb3JVcmwiLCJmaW5kIiwiY2FuZGlkYXRlIiwicmUiLCJSZWdFeHAiLCJvZW1iZWQiLCJjb25zdW1lclVybCIsImV4dGVuZCIsImhvc3QiLCJNRURJVU0iLCJxdWVyeVN0cmluZyIsIkpTT04iLCJlYWNoIiwib2VtYmVkVXJsIiwibG9nIiwicmVjdXJzaXZlUmVtb3ZlIiwiZGVlcCIsIm1hcCIsIm1zZyIsImluZGV4T2YiLCJhYnNvbHV0ZVVybCIsImp1bXBUb01lc3NhZ2UiLCJpbmRleCIsImZpbmRJbmRleCIsImEiLCJtZXNzYWdlX2xpbmsiLCJzcGxpY2UiLCJ0ZXh0IiwidHJhbnNsYXRpb25zIiwiYXV0aG9yX25hbWUiLCJhbGlhcyIsInUiLCJ1c2VybmFtZSIsImF1dGhvcl9pY29uIiwiZ2V0QXZhdGFyVXJsRnJvbVVzZXJuYW1lIiwidHMiLCJfQmFzZSIsInRyeUVuc3VyZUluZGV4IiwidXBkYXRlZEF0Iiwib3B0aW9ucyIsImZpbmRPbmUiLCJyZWNvcmQiLCJEYXRlIiwiaW5zZXJ0IiwicmVtb3ZlQWZ0ZXJEYXRlIiwiZGF0ZSIsIiRsdGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNQSxVQUFRQyxNQUFkOztBQUFxQixJQUFJQyxDQUFKOztBQUFNRixRQUFRRyxLQUFSLENBQWNDLFFBQVEsWUFBUixDQUFkLEVBQW9DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDSixRQUFFSSxDQUFGO0FB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LFNBQU8wQyxHQUFQO0FBQ0EsQ0FsQ0QsRUFrQ0duSSxXQUFXVyxTQUFYLENBQXFCeUYsUUFBckIsQ0FBOEJDLEdBbENqQyxFQWtDc0MsZUFsQ3RDLEU7Ozs7Ozs7Ozs7O0FDZkFyRyxXQUFXbUUsTUFBWCxDQUFrQkMsV0FBbEIsR0FBZ0MsSUFBSSxjQUFjcEUsV0FBV21FLE1BQVgsQ0FBa0JrRixLQUFoQyxDQUFzQztBQUN6RTVDLGdCQUFjO0FBQ2IsVUFBTSxjQUFOO0FBQ0EsU0FBSzZDLGNBQUwsQ0FBb0I7QUFBRUMsaUJBQVc7QUFBYixLQUFwQjtBQUNBLEdBSndFLENBTXpFOzs7QUFDQWxGLGNBQVk0QixHQUFaLEVBQWlCdUQsT0FBakIsRUFBMEI7QUFDekIsVUFBTTlHLFFBQVE7QUFDYnVEO0FBRGEsS0FBZDtBQUdBLFdBQU8sS0FBS3dELE9BQUwsQ0FBYS9HLEtBQWIsRUFBb0I4RyxPQUFwQixDQUFQO0FBQ0EsR0Fad0UsQ0FjekU7OztBQUNBbEYsc0JBQW9CMkIsR0FBcEIsRUFBeUJ2RixJQUF6QixFQUErQjtBQUM5QixVQUFNZ0osU0FBUztBQUNkekQsU0FEYztBQUVkdkYsVUFGYztBQUdkNkksaUJBQVcsSUFBSUksSUFBSjtBQUhHLEtBQWY7QUFLQUQsV0FBT3pELEdBQVAsR0FBYSxLQUFLMkQsTUFBTCxDQUFZRixNQUFaLENBQWI7QUFDQSxXQUFPQSxNQUFQO0FBQ0EsR0F2QndFLENBeUJ6RTs7O0FBQ0FHLGtCQUFnQkMsSUFBaEIsRUFBc0I7QUFDckIsVUFBTXBILFFBQVE7QUFDYjZHLGlCQUFXO0FBQ1ZRLGNBQU1EO0FBREk7QUFERSxLQUFkO0FBS0EsV0FBTyxLQUFLeEQsTUFBTCxDQUFZNUQsS0FBWixDQUFQO0FBQ0E7O0FBakN3RSxDQUExQyxFQUFoQyxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X29lbWJlZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGdsb2JhbHMgSFRUUEludGVybmFscywgY2hhbmdlQ2FzZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgVVJMIGZyb20gJ3VybCc7XG5pbXBvcnQgcXVlcnlzdHJpbmcgZnJvbSAncXVlcnlzdHJpbmcnO1xuaW1wb3J0IGljb252IGZyb20gJ2ljb252LWxpdGUnO1xuaW1wb3J0IGlwUmFuZ2VDaGVjayBmcm9tICdpcC1yYW5nZS1jaGVjayc7XG5pbXBvcnQgaGUgZnJvbSAnaGUnO1xuaW1wb3J0IGpzY2hhcmRldCBmcm9tICdqc2NoYXJkZXQnO1xuXG5jb25zdCByZXF1ZXN0ID0gSFRUUEludGVybmFscy5OcG1Nb2R1bGVzLnJlcXVlc3QubW9kdWxlO1xuY29uc3QgT0VtYmVkID0ge307XG5cbi8vICBEZXRlY3QgZW5jb2Rpbmdcbi8vICBQcmlvcml0eTpcbi8vICBEZXRlY3RlZCA9PSBIVFRQIEhlYWRlciA+IERldGVjdGVkID09IEhUTUwgbWV0YSA+IEhUVFAgSGVhZGVyID4gSFRNTCBtZXRhID4gRGV0ZWN0ZWQgPiBEZWZhdWx0ICh1dGYtOClcbi8vICBTZWUgYWxzbzogaHR0cHM6Ly93d3cudzMub3JnL0ludGVybmF0aW9uYWwvcXVlc3Rpb25zL3FhLWh0bWwtZW5jb2RpbmctZGVjbGFyYXRpb25zLmVuI3F1aWNrYW5zd2VyXG5jb25zdCBnZXRDaGFyc2V0ID0gZnVuY3Rpb24oY29udGVudFR5cGUsIGJvZHkpIHtcblx0bGV0IGRldGVjdGVkQ2hhcnNldDtcblx0bGV0IGh0dHBIZWFkZXJDaGFyc2V0O1xuXHRsZXQgaHRtbE1ldGFDaGFyc2V0O1xuXHRsZXQgcmVzdWx0O1xuXG5cdGNvbnRlbnRUeXBlID0gY29udGVudFR5cGUgfHwgJyc7XG5cblx0Y29uc3QgYmluYXJ5ID0gYm9keS50b1N0cmluZygnYmluYXJ5Jyk7XG5cdGNvbnN0IGRldGVjdGVkID0ganNjaGFyZGV0LmRldGVjdChiaW5hcnkpO1xuXHRpZiAoZGV0ZWN0ZWQuY29uZmlkZW5jZSA+IDAuOCkge1xuXHRcdGRldGVjdGVkQ2hhcnNldCA9IGRldGVjdGVkLmVuY29kaW5nLnRvTG93ZXJDYXNlKCk7XG5cdH1cblx0Y29uc3QgbTEgPSBjb250ZW50VHlwZS5tYXRjaCgvY2hhcnNldD0oW1xcd1xcLV0rKS9pKTtcblx0aWYgKG0xKSB7XG5cdFx0aHR0cEhlYWRlckNoYXJzZXQgPSBtMVsxXS50b0xvd2VyQ2FzZSgpO1xuXHR9XG5cdGNvbnN0IG0yID0gYmluYXJ5Lm1hdGNoKC88bWV0YVxcYltePl0qY2hhcnNldD1bXCInXT8oW1xcd1xcLV0rKS9pKTtcblx0aWYgKG0yKSB7XG5cdFx0aHRtbE1ldGFDaGFyc2V0ID0gbTJbMV0udG9Mb3dlckNhc2UoKTtcblx0fVxuXHRpZiAoZGV0ZWN0ZWRDaGFyc2V0KSB7XG5cdFx0aWYgKGRldGVjdGVkQ2hhcnNldCA9PT0gaHR0cEhlYWRlckNoYXJzZXQpIHtcblx0XHRcdHJlc3VsdCA9IGh0dHBIZWFkZXJDaGFyc2V0O1xuXHRcdH0gZWxzZSBpZiAoZGV0ZWN0ZWRDaGFyc2V0ID09PSBodG1sTWV0YUNoYXJzZXQpIHtcblx0XHRcdHJlc3VsdCA9IGh0bWxNZXRhQ2hhcnNldDtcblx0XHR9XG5cdH1cblx0aWYgKCFyZXN1bHQpIHtcblx0XHRyZXN1bHQgPSBodHRwSGVhZGVyQ2hhcnNldCB8fCBodG1sTWV0YUNoYXJzZXQgfHwgZGV0ZWN0ZWRDaGFyc2V0O1xuXHR9XG5cdHJldHVybiByZXN1bHQgfHwgJ3V0Zi04Jztcbn07XG5cbmNvbnN0IHRvVXRmOCA9IGZ1bmN0aW9uKGNvbnRlbnRUeXBlLCBib2R5KSB7XG5cdHJldHVybiBpY29udi5kZWNvZGUoYm9keSwgZ2V0Q2hhcnNldChjb250ZW50VHlwZSwgYm9keSkpO1xufTtcblxuY29uc3QgZ2V0VXJsQ29udGVudCA9IGZ1bmN0aW9uKHVybE9iaiwgcmVkaXJlY3RDb3VudCA9IDUsIGNhbGxiYWNrKSB7XG5cblx0aWYgKF8uaXNTdHJpbmcodXJsT2JqKSkge1xuXHRcdHVybE9iaiA9IFVSTC5wYXJzZSh1cmxPYmopO1xuXHR9XG5cblx0Y29uc3QgcGFyc2VkVXJsID0gXy5waWNrKHVybE9iaiwgWydob3N0JywgJ2hhc2gnLCAncGF0aG5hbWUnLCAncHJvdG9jb2wnLCAncG9ydCcsICdxdWVyeScsICdzZWFyY2gnLCAnaG9zdG5hbWUnXSk7XG5cdGNvbnN0IGlnbm9yZWRIb3N0cyA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW1iZWRJZ25vcmVkSG9zdHMnKS5yZXBsYWNlKC9cXHMvZywgJycpLnNwbGl0KCcsJykgfHwgW107XG5cdGlmIChpZ25vcmVkSG9zdHMuaW5jbHVkZXMocGFyc2VkVXJsLmhvc3RuYW1lKSB8fCBpcFJhbmdlQ2hlY2socGFyc2VkVXJsLmhvc3RuYW1lLCBpZ25vcmVkSG9zdHMpKSB7XG5cdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdH1cblxuXHRjb25zdCBzYWZlUG9ydHMgPSBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQVBJX0VtYmVkU2FmZVBvcnRzJykucmVwbGFjZSgvXFxzL2csICcnKS5zcGxpdCgnLCcpIHx8IFtdO1xuXHRpZiAocGFyc2VkVXJsLnBvcnQgJiYgc2FmZVBvcnRzLmxlbmd0aCA+IDAgJiYgKCFzYWZlUG9ydHMuaW5jbHVkZXMocGFyc2VkVXJsLnBvcnQpKSkge1xuXHRcdHJldHVybiBjYWxsYmFjaygpO1xuXHR9XG5cblx0Y29uc3QgZGF0YSA9IFJvY2tldENoYXQuY2FsbGJhY2tzLnJ1bignb2VtYmVkOmJlZm9yZUdldFVybENvbnRlbnQnLCB7XG5cdFx0dXJsT2JqLFxuXHRcdHBhcnNlZFVybCxcblx0fSk7XG5cdGlmIChkYXRhLmF0dGFjaG1lbnRzICE9IG51bGwpIHtcblx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgZGF0YSk7XG5cdH1cblx0Y29uc3QgdXJsID0gVVJMLmZvcm1hdChkYXRhLnVybE9iaik7XG5cdGNvbnN0IG9wdHMgPSB7XG5cdFx0dXJsLFxuXHRcdHN0cmljdFNTTDogIVJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBbGxvd19JbnZhbGlkX1NlbGZTaWduZWRfQ2VydHMnKSxcblx0XHRnemlwOiB0cnVlLFxuXHRcdG1heFJlZGlyZWN0czogcmVkaXJlY3RDb3VudCxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnVXNlci1BZ2VudCc6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW1iZWRfVXNlckFnZW50JyksXG5cdFx0fSxcblx0fTtcblx0bGV0IGhlYWRlcnMgPSBudWxsO1xuXHRsZXQgc3RhdHVzQ29kZSA9IG51bGw7XG5cdGxldCBlcnJvciA9IG51bGw7XG5cdGNvbnN0IGNodW5rcyA9IFtdO1xuXHRsZXQgY2h1bmtzVG90YWxMZW5ndGggPSAwO1xuXHRjb25zdCBzdHJlYW0gPSByZXF1ZXN0KG9wdHMpO1xuXHRzdHJlYW0ub24oJ3Jlc3BvbnNlJywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcblx0XHRzdGF0dXNDb2RlID0gcmVzcG9uc2Uuc3RhdHVzQ29kZTtcblx0XHRoZWFkZXJzID0gcmVzcG9uc2UuaGVhZGVycztcblx0XHRpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG5cdFx0XHRyZXR1cm4gc3RyZWFtLmFib3J0KCk7XG5cdFx0fVxuXHR9KTtcblx0c3RyZWFtLm9uKCdkYXRhJywgZnVuY3Rpb24oY2h1bmspIHtcblx0XHRjaHVua3MucHVzaChjaHVuayk7XG5cdFx0Y2h1bmtzVG90YWxMZW5ndGggKz0gY2h1bmsubGVuZ3RoO1xuXHRcdGlmIChjaHVua3NUb3RhbExlbmd0aCA+IDI1MDAwMCkge1xuXHRcdFx0cmV0dXJuIHN0cmVhbS5hYm9ydCgpO1xuXHRcdH1cblx0fSk7XG5cdHN0cmVhbS5vbignZW5kJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbigpIHtcblx0XHRpZiAoZXJyb3IgIT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHtcblx0XHRcdFx0ZXJyb3IsXG5cdFx0XHRcdHBhcnNlZFVybCxcblx0XHRcdH0pO1xuXHRcdH1cblx0XHRjb25zdCBidWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7XG5cdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHtcblx0XHRcdGhlYWRlcnMsXG5cdFx0XHRib2R5OiB0b1V0ZjgoaGVhZGVyc1snY29udGVudC10eXBlJ10sIGJ1ZmZlciksXG5cdFx0XHRwYXJzZWRVcmwsXG5cdFx0XHRzdGF0dXNDb2RlLFxuXHRcdH0pO1xuXHR9KSk7XG5cdHJldHVybiBzdHJlYW0ub24oJ2Vycm9yJywgZnVuY3Rpb24oZXJyKSB7XG5cdFx0cmV0dXJuIGVycm9yID0gZXJyO1xuXHR9KTtcbn07XG5cbk9FbWJlZC5nZXRVcmxNZXRhID0gZnVuY3Rpb24odXJsLCB3aXRoRnJhZ21lbnQpIHtcblx0Y29uc3QgZ2V0VXJsQ29udGVudFN5bmMgPSBNZXRlb3Iud3JhcEFzeW5jKGdldFVybENvbnRlbnQpO1xuXHRjb25zdCB1cmxPYmogPSBVUkwucGFyc2UodXJsKTtcblx0aWYgKHdpdGhGcmFnbWVudCAhPSBudWxsKSB7XG5cdFx0Y29uc3QgcXVlcnlTdHJpbmdPYmogPSBxdWVyeXN0cmluZy5wYXJzZSh1cmxPYmoucXVlcnkpO1xuXHRcdHF1ZXJ5U3RyaW5nT2JqLl9lc2NhcGVkX2ZyYWdtZW50XyA9ICcnO1xuXHRcdHVybE9iai5xdWVyeSA9IHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShxdWVyeVN0cmluZ09iaik7XG5cdFx0bGV0IHBhdGggPSB1cmxPYmoucGF0aG5hbWU7XG5cdFx0aWYgKHVybE9iai5xdWVyeSAhPSBudWxsKSB7XG5cdFx0XHRwYXRoICs9IGA/JHsgdXJsT2JqLnF1ZXJ5IH1gO1xuXHRcdH1cblx0XHR1cmxPYmoucGF0aCA9IHBhdGg7XG5cdH1cblx0Y29uc3QgY29udGVudCA9IGdldFVybENvbnRlbnRTeW5jKHVybE9iaiwgNSk7XG5cdGlmICghY29udGVudCkge1xuXHRcdHJldHVybjtcblx0fVxuXHRpZiAoY29udGVudC5hdHRhY2htZW50cyAhPSBudWxsKSB7XG5cdFx0cmV0dXJuIGNvbnRlbnQ7XG5cdH1cblx0bGV0IG1ldGFzID0gdW5kZWZpbmVkO1xuXHRpZiAoY29udGVudCAmJiBjb250ZW50LmJvZHkpIHtcblx0XHRtZXRhcyA9IHt9O1xuXHRcdGNvbnRlbnQuYm9keS5yZXBsYWNlKC88dGl0bGVbXj5dKj4oW148XSopPFxcL3RpdGxlPi9nbWksIGZ1bmN0aW9uKG1ldGEsIHRpdGxlKSB7XG5cdFx0XHRyZXR1cm4gbWV0YXMucGFnZVRpdGxlICE9IG51bGwgPyBtZXRhcy5wYWdlVGl0bGUgOiBtZXRhcy5wYWdlVGl0bGUgPSBoZS51bmVzY2FwZSh0aXRsZSk7XG5cdFx0fSk7XG5cdFx0Y29udGVudC5ib2R5LnJlcGxhY2UoLzxtZXRhW14+XSooPzpuYW1lfHByb3BlcnR5KT1bJ10oW14nXSopWyddW14+XSpcXHNjb250ZW50PVsnXShbXiddKilbJ11bXj5dKj4vZ21pLCBmdW5jdGlvbihtZXRhLCBuYW1lLCB2YWx1ZSkge1xuXHRcdFx0bGV0IG5hbWUxO1xuXHRcdFx0cmV0dXJuIG1ldGFzW25hbWUxID0gY2hhbmdlQ2FzZS5jYW1lbENhc2UobmFtZSldICE9IG51bGwgPyBtZXRhc1tuYW1lMV0gOiBtZXRhc1tuYW1lMV0gPSBoZS51bmVzY2FwZSh2YWx1ZSk7XG5cdFx0fSk7XG5cdFx0Y29udGVudC5ib2R5LnJlcGxhY2UoLzxtZXRhW14+XSooPzpuYW1lfHByb3BlcnR5KT1bXCJdKFteXCJdKilbXCJdW14+XSpcXHNjb250ZW50PVtcIl0oW15cIl0qKVtcIl1bXj5dKj4vZ21pLCBmdW5jdGlvbihtZXRhLCBuYW1lLCB2YWx1ZSkge1xuXHRcdFx0bGV0IG5hbWUxO1xuXHRcdFx0cmV0dXJuIG1ldGFzW25hbWUxID0gY2hhbmdlQ2FzZS5jYW1lbENhc2UobmFtZSldICE9IG51bGwgPyBtZXRhc1tuYW1lMV0gOiBtZXRhc1tuYW1lMV0gPSBoZS51bmVzY2FwZSh2YWx1ZSk7XG5cdFx0fSk7XG5cdFx0Y29udGVudC5ib2R5LnJlcGxhY2UoLzxtZXRhW14+XSpcXHNjb250ZW50PVsnXShbXiddKilbJ11bXj5dKig/Om5hbWV8cHJvcGVydHkpPVsnXShbXiddKilbJ11bXj5dKj4vZ21pLCBmdW5jdGlvbihtZXRhLCB2YWx1ZSwgbmFtZSkge1xuXHRcdFx0bGV0IG5hbWUxO1xuXHRcdFx0cmV0dXJuIG1ldGFzW25hbWUxID0gY2hhbmdlQ2FzZS5jYW1lbENhc2UobmFtZSldICE9IG51bGwgPyBtZXRhc1tuYW1lMV0gOiBtZXRhc1tuYW1lMV0gPSBoZS51bmVzY2FwZSh2YWx1ZSk7XG5cdFx0fSk7XG5cdFx0Y29udGVudC5ib2R5LnJlcGxhY2UoLzxtZXRhW14+XSpcXHNjb250ZW50PVtcIl0oW15cIl0qKVtcIl1bXj5dKig/Om5hbWV8cHJvcGVydHkpPVtcIl0oW15cIl0qKVtcIl1bXj5dKj4vZ21pLCBmdW5jdGlvbihtZXRhLCB2YWx1ZSwgbmFtZSkge1xuXHRcdFx0bGV0IG5hbWUxO1xuXHRcdFx0cmV0dXJuIG1ldGFzW25hbWUxID0gY2hhbmdlQ2FzZS5jYW1lbENhc2UobmFtZSldICE9IG51bGwgPyBtZXRhc1tuYW1lMV0gOiBtZXRhc1tuYW1lMV0gPSBoZS51bmVzY2FwZSh2YWx1ZSk7XG5cdFx0fSk7XG5cdFx0aWYgKG1ldGFzLmZyYWdtZW50ID09PSAnIScgJiYgKHdpdGhGcmFnbWVudCA9PSBudWxsKSkge1xuXHRcdFx0cmV0dXJuIE9FbWJlZC5nZXRVcmxNZXRhKHVybCwgdHJ1ZSk7XG5cdFx0fVxuXHR9XG5cdGxldCBoZWFkZXJzID0gdW5kZWZpbmVkO1xuXHRsZXQgZGF0YSA9IHVuZGVmaW5lZDtcblxuXG5cdGlmIChjb250ZW50ICYmIGNvbnRlbnQuaGVhZGVycykge1xuXHRcdGhlYWRlcnMgPSB7fTtcblx0XHRjb25zdCBoZWFkZXJPYmogPSBjb250ZW50LmhlYWRlcnM7XG5cdFx0T2JqZWN0LmtleXMoaGVhZGVyT2JqKS5mb3JFYWNoKChoZWFkZXIpID0+IHtcblx0XHRcdGhlYWRlcnNbY2hhbmdlQ2FzZS5jYW1lbENhc2UoaGVhZGVyKV0gPSBoZWFkZXJPYmpbaGVhZGVyXTtcblx0XHR9KTtcblx0fVxuXHRpZiAoY29udGVudCAmJiBjb250ZW50LnN0YXR1c0NvZGUgIT09IDIwMCkge1xuXHRcdHJldHVybiBkYXRhO1xuXHR9XG5cdGRhdGEgPSBSb2NrZXRDaGF0LmNhbGxiYWNrcy5ydW4oJ29lbWJlZDphZnRlclBhcnNlQ29udGVudCcsIHtcblx0XHRtZXRhOiBtZXRhcyxcblx0XHRoZWFkZXJzLFxuXHRcdHBhcnNlZFVybDogY29udGVudC5wYXJzZWRVcmwsXG5cdFx0Y29udGVudCxcblx0fSk7XG5cdHJldHVybiBkYXRhO1xufTtcblxuT0VtYmVkLmdldFVybE1ldGFXaXRoQ2FjaGUgPSBmdW5jdGlvbih1cmwsIHdpdGhGcmFnbWVudCkge1xuXHRjb25zdCBjYWNoZSA9IFJvY2tldENoYXQubW9kZWxzLk9FbWJlZENhY2hlLmZpbmRPbmVCeUlkKHVybCk7XG5cdGlmIChjYWNoZSAhPSBudWxsKSB7XG5cdFx0cmV0dXJuIGNhY2hlLmRhdGE7XG5cdH1cblx0Y29uc3QgZGF0YSA9IE9FbWJlZC5nZXRVcmxNZXRhKHVybCwgd2l0aEZyYWdtZW50KTtcblx0aWYgKGRhdGEgIT0gbnVsbCkge1xuXHRcdHRyeSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5PRW1iZWRDYWNoZS5jcmVhdGVXaXRoSWRBbmREYXRhKHVybCwgZGF0YSk7XG5cdFx0fSBjYXRjaCAoX2Vycm9yKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKCdPRW1iZWQgZHVwbGljYXRlZCByZWNvcmQnLCB1cmwpO1xuXHRcdH1cblx0XHRyZXR1cm4gZGF0YTtcblx0fVxufTtcblxuY29uc3QgZ2V0UmVsZXZhbnRIZWFkZXJzID0gZnVuY3Rpb24oaGVhZGVyc09iaikge1xuXHRjb25zdCBoZWFkZXJzID0ge307XG5cdE9iamVjdC5rZXlzKGhlYWRlcnNPYmopLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdGNvbnN0IHZhbHVlID0gaGVhZGVyc09ialtrZXldO1xuXHRcdGNvbnN0IGxvd2VyQ2FzZUtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xuXHRcdGlmICgobG93ZXJDYXNlS2V5ID09PSAnY29udGVudHR5cGUnIHx8IGxvd2VyQ2FzZUtleSA9PT0gJ2NvbnRlbnRsZW5ndGgnKSAmJiAodmFsdWUgJiYgdmFsdWUudHJpbSgpICE9PSAnJykpIHtcblx0XHRcdGhlYWRlcnNba2V5XSA9IHZhbHVlO1xuXHRcdH1cblx0fSk7XG5cblx0aWYgKE9iamVjdC5rZXlzKGhlYWRlcnMpLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gaGVhZGVycztcblx0fVxufTtcblxuY29uc3QgZ2V0UmVsZXZhbnRNZXRhVGFncyA9IGZ1bmN0aW9uKG1ldGFPYmopIHtcblx0Y29uc3QgdGFncyA9IHt9O1xuXHRPYmplY3Qua2V5cyhtZXRhT2JqKS5mb3JFYWNoKChrZXkpID0+IHtcblx0XHRjb25zdCB2YWx1ZSA9IG1ldGFPYmpba2V5XTtcblx0XHRpZiAoL14ob2d8ZmJ8dHdpdHRlcnxvZW1iZWR8bXNhcHBsaWNhdGlvbikuK3xkZXNjcmlwdGlvbnx0aXRsZXxwYWdlVGl0bGUkLy50ZXN0KGtleS50b0xvd2VyQ2FzZSgpKSAmJiAodmFsdWUgJiYgdmFsdWUudHJpbSgpICE9PSAnJykpIHtcblx0XHRcdHRhZ3Nba2V5XSA9IHZhbHVlO1xuXHRcdH1cblx0fSk7XG5cblx0aWYgKE9iamVjdC5rZXlzKHRhZ3MpLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gdGFncztcblx0fVxufTtcblxuT0VtYmVkLnJvY2tldFVybFBhcnNlciA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcblx0aWYgKEFycmF5LmlzQXJyYXkobWVzc2FnZS51cmxzKSkge1xuXHRcdGxldCBhdHRhY2htZW50cyA9IFtdO1xuXHRcdGxldCBjaGFuZ2VkID0gZmFsc2U7XG5cdFx0bWVzc2FnZS51cmxzLmZvckVhY2goZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0aWYgKGl0ZW0uaWdub3JlUGFyc2UgPT09IHRydWUpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGl0ZW0udXJsLnN0YXJ0c1dpdGgoJ2dyYWluOi8vJykpIHtcblx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdGl0ZW0ubWV0YSA9IHtcblx0XHRcdFx0XHRzYW5kc3Rvcm06IHtcblx0XHRcdFx0XHRcdGdyYWluOiBpdGVtLnNhbmRzdG9ybVZpZXdJbmZvLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdH07XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGlmICghL15odHRwcz86XFwvXFwvL2kudGVzdChpdGVtLnVybCkpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgZGF0YSA9IE9FbWJlZC5nZXRVcmxNZXRhV2l0aENhY2hlKGl0ZW0udXJsKTtcblx0XHRcdGlmIChkYXRhICE9IG51bGwpIHtcblx0XHRcdFx0aWYgKGRhdGEuYXR0YWNobWVudHMpIHtcblx0XHRcdFx0XHRyZXR1cm4gYXR0YWNobWVudHMgPSBfLnVuaW9uKGF0dGFjaG1lbnRzLCBkYXRhLmF0dGFjaG1lbnRzKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoZGF0YS5tZXRhICE9IG51bGwpIHtcblx0XHRcdFx0XHRcdGl0ZW0ubWV0YSA9IGdldFJlbGV2YW50TWV0YVRhZ3MoZGF0YS5tZXRhKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKGRhdGEuaGVhZGVycyAhPSBudWxsKSB7XG5cdFx0XHRcdFx0XHRpdGVtLmhlYWRlcnMgPSBnZXRSZWxldmFudEhlYWRlcnMoZGF0YS5oZWFkZXJzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aXRlbS5wYXJzZWRVcmwgPSBkYXRhLnBhcnNlZFVybDtcblx0XHRcdFx0XHRyZXR1cm4gY2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0XHRpZiAoYXR0YWNobWVudHMubGVuZ3RoKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5NZXNzYWdlcy5zZXRNZXNzYWdlQXR0YWNobWVudHMobWVzc2FnZS5faWQsIGF0dGFjaG1lbnRzKTtcblx0XHR9XG5cdFx0aWYgKGNoYW5nZWQgPT09IHRydWUpIHtcblx0XHRcdFJvY2tldENoYXQubW9kZWxzLk1lc3NhZ2VzLnNldFVybHNCeUlkKG1lc3NhZ2UuX2lkLCBtZXNzYWdlLnVybHMpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbWVzc2FnZTtcbn07XG5cblJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBUElfRW1iZWQnLCBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdGlmICh2YWx1ZSkge1xuXHRcdHJldHVybiBSb2NrZXRDaGF0LmNhbGxiYWNrcy5hZGQoJ2FmdGVyU2F2ZU1lc3NhZ2UnLCBPRW1iZWQucm9ja2V0VXJsUGFyc2VyLCBSb2NrZXRDaGF0LmNhbGxiYWNrcy5wcmlvcml0eS5MT1csICdBUElfRW1iZWQnKTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5jYWxsYmFja3MucmVtb3ZlKCdhZnRlclNhdmVNZXNzYWdlJywgJ0FQSV9FbWJlZCcpO1xuXHR9XG59KTtcbiIsIi8qIGdsb2JhbHMgY2hhbmdlQ2FzZSAqL1xuaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5pbXBvcnQgVVJMIGZyb20gJ3VybCc7XG5pbXBvcnQgUXVlcnlTdHJpbmcgZnJvbSAncXVlcnlzdHJpbmcnO1xuXG5jbGFzcyBQcm92aWRlcnMge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLnByb3ZpZGVycyA9IFtdO1xuXHR9XG5cblx0c3RhdGljIGdldENvbnN1bWVyVXJsKHByb3ZpZGVyLCB1cmwpIHtcblx0XHRjb25zdCB1cmxPYmogPSBVUkwucGFyc2UocHJvdmlkZXIuZW5kUG9pbnQsIHRydWUpO1xuXHRcdHVybE9iai5xdWVyeS51cmwgPSB1cmw7XG5cdFx0ZGVsZXRlIHVybE9iai5zZWFyY2g7XG5cdFx0cmV0dXJuIFVSTC5mb3JtYXQodXJsT2JqKTtcblx0fVxuXG5cdHJlZ2lzdGVyUHJvdmlkZXIocHJvdmlkZXIpIHtcblx0XHRyZXR1cm4gdGhpcy5wcm92aWRlcnMucHVzaChwcm92aWRlcik7XG5cdH1cblxuXHRnZXRQcm92aWRlcnMoKSB7XG5cdFx0cmV0dXJuIHRoaXMucHJvdmlkZXJzO1xuXHR9XG5cblx0Z2V0UHJvdmlkZXJGb3JVcmwodXJsKSB7XG5cdFx0cmV0dXJuIF8uZmluZCh0aGlzLnByb3ZpZGVycywgZnVuY3Rpb24ocHJvdmlkZXIpIHtcblx0XHRcdGNvbnN0IGNhbmRpZGF0ZSA9IF8uZmluZChwcm92aWRlci51cmxzLCBmdW5jdGlvbihyZSkge1xuXHRcdFx0XHRyZXR1cm4gcmUudGVzdCh1cmwpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gY2FuZGlkYXRlICE9IG51bGw7XG5cdFx0fSk7XG5cdH1cbn1cblxuY29uc3QgcHJvdmlkZXJzID0gbmV3IFByb3ZpZGVycygpO1xuXG5wcm92aWRlcnMucmVnaXN0ZXJQcm92aWRlcih7XG5cdHVybHM6IFtuZXcgUmVnRXhwKCdodHRwcz86Ly9zb3VuZGNsb3VkLmNvbS9cXFxcUysnKV0sXG5cdGVuZFBvaW50OiAnaHR0cHM6Ly9zb3VuZGNsb3VkLmNvbS9vZW1iZWQ/Zm9ybWF0PWpzb24mbWF4aGVpZ2h0PTE1MCcsXG59KTtcblxucHJvdmlkZXJzLnJlZ2lzdGVyUHJvdmlkZXIoe1xuXHR1cmxzOiBbbmV3IFJlZ0V4cCgnaHR0cHM/Oi8vdmltZW8uY29tL1teL10rJyksIG5ldyBSZWdFeHAoJ2h0dHBzPzovL3ZpbWVvLmNvbS9jaGFubmVscy9bXi9dKy9bXi9dKycpLCBuZXcgUmVnRXhwKCdodHRwczovL3ZpbWVvLmNvbS9ncm91cHMvW14vXSsvdmlkZW9zL1teL10rJyldLFxuXHRlbmRQb2ludDogJ2h0dHBzOi8vdmltZW8uY29tL2FwaS9vZW1iZWQuanNvbj9tYXhoZWlnaHQ9MjAwJyxcbn0pO1xuXG5wcm92aWRlcnMucmVnaXN0ZXJQcm92aWRlcih7XG5cdHVybHM6IFtuZXcgUmVnRXhwKCdodHRwcz86Ly93d3cueW91dHViZS5jb20vXFxcXFMrJyksIG5ldyBSZWdFeHAoJ2h0dHBzPzovL3lvdXR1LmJlL1xcXFxTKycpXSxcblx0ZW5kUG9pbnQ6ICdodHRwczovL3d3dy55b3V0dWJlLmNvbS9vZW1iZWQ/bWF4aGVpZ2h0PTIwMCcsXG59KTtcblxucHJvdmlkZXJzLnJlZ2lzdGVyUHJvdmlkZXIoe1xuXHR1cmxzOiBbbmV3IFJlZ0V4cCgnaHR0cHM/Oi8vd3d3LnJkaW8uY29tL1xcXFxTKycpLCBuZXcgUmVnRXhwKCdodHRwcz86Ly9yZC5pby9cXFxcUysnKV0sXG5cdGVuZFBvaW50OiAnaHR0cHM6Ly93d3cucmRpby5jb20vYXBpL29lbWJlZC8/Zm9ybWF0PWpzb24mbWF4aGVpZ2h0PTE1MCcsXG59KTtcblxucHJvdmlkZXJzLnJlZ2lzdGVyUHJvdmlkZXIoe1xuXHR1cmxzOiBbbmV3IFJlZ0V4cCgnaHR0cHM/Oi8vd3d3LnNsaWRlc2hhcmUubmV0L1teL10rL1teL10rJyldLFxuXHRlbmRQb2ludDogJ2h0dHBzOi8vd3d3LnNsaWRlc2hhcmUubmV0L2FwaS9vZW1iZWQvMj9mb3JtYXQ9anNvbiZtYXhoZWlnaHQ9MjAwJyxcbn0pO1xuXG5wcm92aWRlcnMucmVnaXN0ZXJQcm92aWRlcih7XG5cdHVybHM6IFtuZXcgUmVnRXhwKCdodHRwcz86Ly93d3cuZGFpbHltb3Rpb24uY29tL3ZpZGVvL1xcXFxTKycpXSxcblx0ZW5kUG9pbnQ6ICdodHRwczovL3d3dy5kYWlseW1vdGlvbi5jb20vc2VydmljZXMvb2VtYmVkP21heGhlaWdodD0yMDAnLFxufSk7XG5cblJvY2tldENoYXQub2VtYmVkID0ge307XG5cblJvY2tldENoYXQub2VtYmVkLnByb3ZpZGVycyA9IHByb3ZpZGVycztcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdvZW1iZWQ6YmVmb3JlR2V0VXJsQ29udGVudCcsIGZ1bmN0aW9uKGRhdGEpIHtcblx0aWYgKGRhdGEucGFyc2VkVXJsICE9IG51bGwpIHtcblx0XHRjb25zdCB1cmwgPSBVUkwuZm9ybWF0KGRhdGEucGFyc2VkVXJsKTtcblx0XHRjb25zdCBwcm92aWRlciA9IHByb3ZpZGVycy5nZXRQcm92aWRlckZvclVybCh1cmwpO1xuXHRcdGlmIChwcm92aWRlciAhPSBudWxsKSB7XG5cdFx0XHRsZXQgY29uc3VtZXJVcmwgPSBQcm92aWRlcnMuZ2V0Q29uc3VtZXJVcmwocHJvdmlkZXIsIHVybCk7XG5cdFx0XHRjb25zdW1lclVybCA9IFVSTC5wYXJzZShjb25zdW1lclVybCwgdHJ1ZSk7XG5cdFx0XHRfLmV4dGVuZChkYXRhLnBhcnNlZFVybCwgY29uc3VtZXJVcmwpO1xuXHRcdFx0ZGF0YS51cmxPYmoucG9ydCA9IGNvbnN1bWVyVXJsLnBvcnQ7XG5cdFx0XHRkYXRhLnVybE9iai5ob3N0bmFtZSA9IGNvbnN1bWVyVXJsLmhvc3RuYW1lO1xuXHRcdFx0ZGF0YS51cmxPYmoucGF0aG5hbWUgPSBjb25zdW1lclVybC5wYXRobmFtZTtcblx0XHRcdGRhdGEudXJsT2JqLnF1ZXJ5ID0gY29uc3VtZXJVcmwucXVlcnk7XG5cdFx0XHRkZWxldGUgZGF0YS51cmxPYmouc2VhcmNoO1xuXHRcdFx0ZGVsZXRlIGRhdGEudXJsT2JqLmhvc3Q7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBkYXRhO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnb2VtYmVkLXByb3ZpZGVycy1iZWZvcmUnKTtcblxuUm9ja2V0Q2hhdC5jYWxsYmFja3MuYWRkKCdvZW1iZWQ6YWZ0ZXJQYXJzZUNvbnRlbnQnLCBmdW5jdGlvbihkYXRhKSB7XG5cdGlmIChkYXRhLnBhcnNlZFVybCAmJiBkYXRhLnBhcnNlZFVybC5xdWVyeSkge1xuXHRcdGxldCBxdWVyeVN0cmluZyA9IGRhdGEucGFyc2VkVXJsLnF1ZXJ5O1xuXHRcdGlmIChfLmlzU3RyaW5nKGRhdGEucGFyc2VkVXJsLnF1ZXJ5KSkge1xuXHRcdFx0cXVlcnlTdHJpbmcgPSBRdWVyeVN0cmluZy5wYXJzZShkYXRhLnBhcnNlZFVybC5xdWVyeSk7XG5cdFx0fVxuXHRcdGlmIChxdWVyeVN0cmluZy51cmwgIT0gbnVsbCkge1xuXHRcdFx0Y29uc3QgeyB1cmwgfSA9IHF1ZXJ5U3RyaW5nO1xuXHRcdFx0Y29uc3QgcHJvdmlkZXIgPSBwcm92aWRlcnMuZ2V0UHJvdmlkZXJGb3JVcmwodXJsKTtcblx0XHRcdGlmIChwcm92aWRlciAhPSBudWxsKSB7XG5cdFx0XHRcdGlmIChkYXRhLmNvbnRlbnQgJiYgZGF0YS5jb250ZW50LmJvZHkpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0Y29uc3QgbWV0YXMgPSBKU09OLnBhcnNlKGRhdGEuY29udGVudC5ib2R5KTtcblx0XHRcdFx0XHRcdF8uZWFjaChtZXRhcywgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuXHRcdFx0XHRcdFx0XHRpZiAoXy5pc1N0cmluZyh2YWx1ZSkpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gZGF0YS5tZXRhW2NoYW5nZUNhc2UuY2FtZWxDYXNlKGBvZW1iZWRfJHsga2V5IH1gKV0gPSB2YWx1ZTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRkYXRhLm1ldGEub2VtYmVkVXJsID0gdXJsO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhlcnJvcik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiBkYXRhO1xufSwgUm9ja2V0Q2hhdC5jYWxsYmFja3MucHJpb3JpdHkuTUVESVVNLCAnb2VtYmVkLXByb3ZpZGVycy1hZnRlcicpO1xuIiwiLyogZ2xvYmFscyBnZXRBdmF0YXJVcmxGcm9tVXNlcm5hbWUgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IFVSTCBmcm9tICd1cmwnO1xuaW1wb3J0IFF1ZXJ5U3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcblxuY29uc3QgcmVjdXJzaXZlUmVtb3ZlID0gKG1lc3NhZ2UsIGRlZXAgPSAxKSA9PiB7XG5cdGlmIChtZXNzYWdlKSB7XG5cdFx0aWYgKCdhdHRhY2htZW50cycgaW4gbWVzc2FnZSAmJiBtZXNzYWdlLmF0dGFjaG1lbnRzICE9PSBudWxsICYmIGRlZXAgPCBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTWVzc2FnZV9RdW90ZUNoYWluTGltaXQnKSkge1xuXHRcdFx0bWVzc2FnZS5hdHRhY2htZW50cy5tYXAoKG1zZykgPT4gcmVjdXJzaXZlUmVtb3ZlKG1zZywgZGVlcCArIDEpKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZGVsZXRlKG1lc3NhZ2UuYXR0YWNobWVudHMpO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbWVzc2FnZTtcbn07XG5cblJvY2tldENoYXQuY2FsbGJhY2tzLmFkZCgnYmVmb3JlU2F2ZU1lc3NhZ2UnLCAobXNnKSA9PiB7XG5cdGlmIChtc2cgJiYgbXNnLnVybHMpIHtcblx0XHRtc2cudXJscy5mb3JFYWNoKChpdGVtKSA9PiB7XG5cdFx0XHRpZiAoaXRlbS51cmwuaW5kZXhPZihNZXRlb3IuYWJzb2x1dGVVcmwoKSkgPT09IDApIHtcblx0XHRcdFx0Y29uc3QgdXJsT2JqID0gVVJMLnBhcnNlKGl0ZW0udXJsKTtcblx0XHRcdFx0aWYgKHVybE9iai5xdWVyeSkge1xuXHRcdFx0XHRcdGNvbnN0IHF1ZXJ5U3RyaW5nID0gUXVlcnlTdHJpbmcucGFyc2UodXJsT2JqLnF1ZXJ5KTtcblx0XHRcdFx0XHRpZiAoXy5pc1N0cmluZyhxdWVyeVN0cmluZy5tc2cpKSB7IC8vIEp1bXAtdG8gcXVlcnkgcGFyYW1cblx0XHRcdFx0XHRcdGNvbnN0IGp1bXBUb01lc3NhZ2UgPSByZWN1cnNpdmVSZW1vdmUoUm9ja2V0Q2hhdC5tb2RlbHMuTWVzc2FnZXMuZmluZE9uZUJ5SWQocXVlcnlTdHJpbmcubXNnKSk7XG5cdFx0XHRcdFx0XHRpZiAoanVtcFRvTWVzc2FnZSkge1xuXHRcdFx0XHRcdFx0XHRtc2cuYXR0YWNobWVudHMgPSBtc2cuYXR0YWNobWVudHMgfHwgW107XG5cblx0XHRcdFx0XHRcdFx0Y29uc3QgaW5kZXggPSBtc2cuYXR0YWNobWVudHMuZmluZEluZGV4KChhKSA9PiBhLm1lc3NhZ2VfbGluayA9PT0gaXRlbS51cmwpO1xuXHRcdFx0XHRcdFx0XHRpZiAoaW5kZXggPiAtMSkge1xuXHRcdFx0XHRcdFx0XHRcdG1zZy5hdHRhY2htZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0bXNnLmF0dGFjaG1lbnRzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRcdHRleHQ6IGp1bXBUb01lc3NhZ2UubXNnLFxuXHRcdFx0XHRcdFx0XHRcdHRyYW5zbGF0aW9uczoganVtcFRvTWVzc2FnZS50cmFuc2xhdGlvbnMsXG5cdFx0XHRcdFx0XHRcdFx0YXV0aG9yX25hbWU6IGp1bXBUb01lc3NhZ2UuYWxpYXMgfHwganVtcFRvTWVzc2FnZS51LnVzZXJuYW1lLFxuXHRcdFx0XHRcdFx0XHRcdGF1dGhvcl9pY29uOiBnZXRBdmF0YXJVcmxGcm9tVXNlcm5hbWUoanVtcFRvTWVzc2FnZS51LnVzZXJuYW1lKSxcblx0XHRcdFx0XHRcdFx0XHRtZXNzYWdlX2xpbms6IGl0ZW0udXJsLFxuXHRcdFx0XHRcdFx0XHRcdGF0dGFjaG1lbnRzOiBqdW1wVG9NZXNzYWdlLmF0dGFjaG1lbnRzIHx8IFtdLFxuXHRcdFx0XHRcdFx0XHRcdHRzOiBqdW1wVG9NZXNzYWdlLnRzLFxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aXRlbS5pZ25vcmVQYXJzZSA9IHRydWU7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblx0cmV0dXJuIG1zZztcbn0sIFJvY2tldENoYXQuY2FsbGJhY2tzLnByaW9yaXR5LkxPVywgJ2p1bXBUb01lc3NhZ2UnKTtcbiIsIlxuUm9ja2V0Q2hhdC5tb2RlbHMuT0VtYmVkQ2FjaGUgPSBuZXcgY2xhc3MgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCdvZW1iZWRfY2FjaGUnKTtcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgdXBkYXRlZEF0OiAxIH0pO1xuXHR9XG5cblx0Ly8gRklORCBPTkVcblx0ZmluZE9uZUJ5SWQoX2lkLCBvcHRpb25zKSB7XG5cdFx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0XHRfaWQsXG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxuXG5cdC8vIElOU0VSVFxuXHRjcmVhdGVXaXRoSWRBbmREYXRhKF9pZCwgZGF0YSkge1xuXHRcdGNvbnN0IHJlY29yZCA9IHtcblx0XHRcdF9pZCxcblx0XHRcdGRhdGEsXG5cdFx0XHR1cGRhdGVkQXQ6IG5ldyBEYXRlLFxuXHRcdH07XG5cdFx0cmVjb3JkLl9pZCA9IHRoaXMuaW5zZXJ0KHJlY29yZCk7XG5cdFx0cmV0dXJuIHJlY29yZDtcblx0fVxuXG5cdC8vIFJFTU9WRVxuXHRyZW1vdmVBZnRlckRhdGUoZGF0ZSkge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0dXBkYXRlZEF0OiB7XG5cdFx0XHRcdCRsdGU6IGRhdGUsXG5cdFx0XHR9LFxuXHRcdH07XG5cdFx0cmV0dXJuIHRoaXMucmVtb3ZlKHF1ZXJ5KTtcblx0fVxufTtcblxuXG4iXX0=
