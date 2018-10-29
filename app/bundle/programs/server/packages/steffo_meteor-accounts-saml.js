(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var ECMAScript = Package.ecmascript.ECMAScript;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var WebApp = Package.webapp.WebApp;
var WebAppInternals = Package.webapp.WebAppInternals;
var main = Package.webapp.main;
var ServiceConfiguration = Package['service-configuration'].ServiceConfiguration;
var HTTP = Package.http.HTTP;
var HTTPInternals = Package.http.HTTPInternals;
var Accounts = Package['accounts-base'].Accounts;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var SAML;

var require = meteorInstall({"node_modules":{"meteor":{"steffo:meteor-accounts-saml":{"saml_server.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_server.js                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let fiber;
module.watch(require("fibers"), {
  default(v) {
    fiber = v;
  }

}, 1);
let connect;
module.watch(require("connect"), {
  default(v) {
    connect = v;
  }

}, 2);

if (!Accounts.saml) {
  Accounts.saml = {
    settings: {
      debug: false,
      generateUsername: false,
      providers: []
    }
  };
}

RoutePolicy.declare('/_saml/', 'network');
/**
 * Fetch SAML provider configs for given 'provider'.
 */

function getSamlProviderConfig(provider) {
  if (!provider) {
    throw new Meteor.Error('no-saml-provider', 'SAML internal error', {
      method: 'getSamlProviderConfig'
    });
  }

  const samlProvider = function (element) {
    return element.provider === provider;
  };

  return Accounts.saml.settings.providers.filter(samlProvider)[0];
}

Meteor.methods({
  samlLogout(provider) {
    // Make sure the user is logged in before initiate SAML SLO
    if (!Meteor.userId()) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'samlLogout'
      });
    }

    const providerConfig = getSamlProviderConfig(provider);

    if (Accounts.saml.settings.debug) {
      console.log(`Logout request from ${JSON.stringify(providerConfig)}`);
    } // This query should respect upcoming array of SAML logins


    const user = Meteor.users.findOne({
      _id: Meteor.userId(),
      'services.saml.provider': provider
    }, {
      'services.saml': 1
    });
    let {
      nameID
    } = user.services.saml;
    const sessionIndex = user.services.saml.idpSession;
    nameID = sessionIndex;

    if (Accounts.saml.settings.debug) {
      console.log(`NameID for user ${Meteor.userId()} found: ${JSON.stringify(nameID)}`);
    }

    const _saml = new SAML(providerConfig);

    const request = _saml.generateLogoutRequest({
      nameID,
      sessionIndex
    }); // request.request: actual XML SAML Request
    // request.id: comminucation id which will be mentioned in the ResponseTo field of SAMLResponse


    Meteor.users.update({
      _id: Meteor.userId()
    }, {
      $set: {
        'services.saml.inResponseTo': request.id
      }
    });

    const _syncRequestToUrl = Meteor.wrapAsync(_saml.requestToUrl, _saml);

    const result = _syncRequestToUrl(request.request, 'logout');

    if (Accounts.saml.settings.debug) {
      console.log(`SAML Logout Request ${result}`);
    }

    return result;
  }

});
Accounts.registerLoginHandler(function (loginRequest) {
  if (!loginRequest.saml || !loginRequest.credentialToken) {
    return undefined;
  }

  const loginResult = Accounts.saml.retrieveCredential(loginRequest.credentialToken);

  if (Accounts.saml.settings.debug) {
    console.log(`RESULT :${JSON.stringify(loginResult)}`);
  }

  if (loginResult === undefined) {
    return {
      type: 'saml',
      error: new Meteor.Error(Accounts.LoginCancelledError.numericError, 'No matching login attempt found')
    };
  }

  if (loginResult && loginResult.profile && loginResult.profile.email) {
    const emailList = Array.isArray(loginResult.profile.email) ? loginResult.profile.email : [loginResult.profile.email];
    const emailRegex = new RegExp(emailList.map(email => `^${RegExp.escape(email)}$`).join('|'), 'i');
    let user = Meteor.users.findOne({
      'emails.address': emailRegex
    });

    if (!user) {
      const newUser = {
        name: loginResult.profile.cn || loginResult.profile.username,
        active: true,
        globalRoles: ['user'],
        emails: emailList.map(email => ({
          address: email,
          verified: true
        }))
      };

      if (Accounts.saml.settings.generateUsername === true) {
        const username = RocketChat.generateUsernameSuggestion(newUser);

        if (username) {
          newUser.username = username;
        }
      } else if (loginResult.profile.username) {
        newUser.username = loginResult.profile.username;
      }

      const userId = Accounts.insertUserDoc({}, newUser);
      user = Meteor.users.findOne(userId);
    } // creating the token and adding to the user


    const stampedToken = Accounts._generateStampedLoginToken();

    Meteor.users.update(user, {
      $push: {
        'services.resume.loginTokens': stampedToken
      }
    });
    const samlLogin = {
      provider: Accounts.saml.RelayState,
      idp: loginResult.profile.issuer,
      idpSession: loginResult.profile.sessionIndex,
      nameID: loginResult.profile.nameID
    };
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        // TBD this should be pushed, otherwise we're only able to SSO into a single IDP at a time
        'services.saml': samlLogin
      }
    }); // sending token along with the userId

    const result = {
      userId: user._id,
      token: stampedToken.token
    };
    return result;
  } else {
    throw new Error('SAML Profile did not contain an email address');
  }
});

Accounts.saml.hasCredential = function (credentialToken) {
  return RocketChat.models.CredentialTokens.findOneById(credentialToken) != null;
};

Accounts.saml.retrieveCredential = function (credentialToken) {
  // The credentialToken in all these functions corresponds to SAMLs inResponseTo field and is mandatory to check.
  const data = RocketChat.models.CredentialTokens.findOneById(credentialToken);

  if (data) {
    return data.userInfo;
  }
};

Accounts.saml.storeCredential = function (credentialToken, loginResult) {
  RocketChat.models.CredentialTokens.create(credentialToken, loginResult);
};

const closePopup = function (res, err) {
  res.writeHead(200, {
    'Content-Type': 'text/html'
  });
  let content = '<html><head><script>window.close()</script></head><body><H1>Verified</H1></body></html>';

  if (err) {
    content = `<html><body><h2>Sorry, an annoying error occured</h2><div>${err}</div><a onclick="window.close();">Close Window</a></body></html>`;
  }

  res.end(content, 'utf-8');
};

const samlUrlToObject = function (url) {
  // req.url will be '/_saml/<action>/<service name>/<credentialToken>'
  if (!url) {
    return null;
  }

  const splitUrl = url.split('?');
  const splitPath = splitUrl[0].split('/'); // Any non-saml request will continue down the default
  // middlewares.

  if (splitPath[1] !== '_saml') {
    return null;
  }

  const result = {
    actionName: splitPath[2],
    serviceName: splitPath[3],
    credentialToken: splitPath[4]
  };

  if (Accounts.saml.settings.debug) {
    console.log(result);
  }

  return result;
};

const middleware = function (req, res, next) {
  // Make sure to catch any exceptions because otherwise we'd crash
  // the runner
  try {
    const samlObject = samlUrlToObject(req.url);

    if (!samlObject || !samlObject.serviceName) {
      next();
      return;
    }

    if (!samlObject.actionName) {
      throw new Error('Missing SAML action');
    }

    if (Accounts.saml.settings.debug) {
      console.log(Accounts.saml.settings.providers);
      console.log(samlObject.serviceName);
    }

    const service = _.find(Accounts.saml.settings.providers, function (samlSetting) {
      return samlSetting.provider === samlObject.serviceName;
    }); // Skip everything if there's no service set by the saml middleware


    if (!service) {
      throw new Error(`Unexpected SAML service ${samlObject.serviceName}`);
    }

    let _saml;

    switch (samlObject.actionName) {
      case 'metadata':
        _saml = new SAML(service);
        service.callbackUrl = Meteor.absoluteUrl(`_saml/validate/${service.provider}`);
        res.writeHead(200);
        res.write(_saml.generateServiceProviderMetadata(service.callbackUrl));
        res.end(); // closePopup(res);

        break;

      case 'logout':
        // This is where we receive SAML LogoutResponse
        _saml = new SAML(service);

        _saml.validateLogoutResponse(req.query.SAMLResponse, function (err, result) {
          if (!err) {
            const logOutUser = function (inResponseTo) {
              if (Accounts.saml.settings.debug) {
                console.log(`Logging Out user via inResponseTo ${inResponseTo}`);
              }

              const loggedOutUser = Meteor.users.find({
                'services.saml.inResponseTo': inResponseTo
              }).fetch();

              if (loggedOutUser.length === 1) {
                if (Accounts.saml.settings.debug) {
                  console.log(`Found user ${loggedOutUser[0]._id}`);
                }

                Meteor.users.update({
                  _id: loggedOutUser[0]._id
                }, {
                  $set: {
                    'services.resume.loginTokens': []
                  }
                });
                Meteor.users.update({
                  _id: loggedOutUser[0]._id
                }, {
                  $unset: {
                    'services.saml': ''
                  }
                });
              } else {
                throw new Meteor.Error('Found multiple users matching SAML inResponseTo fields');
              }
            };

            fiber(function () {
              logOutUser(result);
            }).run();
            res.writeHead(302, {
              Location: req.query.RelayState
            });
            res.end();
          } //  else {
          // 	// TBD thinking of sth meaning full.
          // }

        });

        break;

      case 'sloRedirect':
        res.writeHead(302, {
          // credentialToken here is the SAML LogOut Request that we'll send back to IDP
          Location: req.query.redirect
        });
        res.end();
        break;

      case 'authorize':
        service.callbackUrl = Meteor.absoluteUrl(`_saml/validate/${service.provider}`);
        service.id = samlObject.credentialToken;
        _saml = new SAML(service);

        _saml.getAuthorizeUrl(req, function (err, url) {
          if (err) {
            throw new Error('Unable to generate authorize url');
          }

          res.writeHead(302, {
            Location: url
          });
          res.end();
        });

        break;

      case 'validate':
        _saml = new SAML(service);
        Accounts.saml.RelayState = req.body.RelayState;

        _saml.validateResponse(req.body.SAMLResponse, req.body.RelayState, function (err, profile
        /* , loggedOut*/
        ) {
          if (err) {
            throw new Error(`Unable to validate response url: ${err}`);
          }

          const credentialToken = profile.inResponseToId && profile.inResponseToId.value || profile.inResponseToId || profile.InResponseTo || samlObject.credentialToken;
          const loginResult = {
            profile
          };

          if (!credentialToken) {
            // No credentialToken in IdP-initiated SSO
            const saml_idp_credentialToken = Random.id();
            Accounts.saml.storeCredential(saml_idp_credentialToken, loginResult);
            const url = `${Meteor.absoluteUrl('home')}?saml_idp_credentialToken=${saml_idp_credentialToken}`;
            res.writeHead(302, {
              Location: url
            });
            res.end();
          } else {
            Accounts.saml.storeCredential(credentialToken, loginResult);
            closePopup(res);
          }
        });

        break;

      default:
        throw new Error(`Unexpected SAML action ${samlObject.actionName}`);
    }
  } catch (err) {
    closePopup(res, err);
  }
}; // Listen to incoming SAML http requests


WebApp.connectHandlers.use(connect.bodyParser()).use(function (req, res, next) {
  // Need to create a fiber since we're using synchronous http calls and nothing
  // else is wrapping this in a fiber automatically
  fiber(function () {
    middleware(req, res, next);
  }).run();
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saml_utils.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_utils.js                                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
let zlib;
module.watch(require("zlib"), {
  default(v) {
    zlib = v;
  }

}, 0);
let xmlCrypto;
module.watch(require("xml-crypto"), {
  default(v) {
    xmlCrypto = v;
  }

}, 1);
let crypto;
module.watch(require("crypto"), {
  default(v) {
    crypto = v;
  }

}, 2);
let xmldom;
module.watch(require("xmldom"), {
  default(v) {
    xmldom = v;
  }

}, 3);
let querystring;
module.watch(require("querystring"), {
  default(v) {
    querystring = v;
  }

}, 4);
let xmlbuilder;
module.watch(require("xmlbuilder"), {
  default(v) {
    xmlbuilder = v;
  }

}, 5);
let array2string;
module.watch(require("arraybuffer-to-string"), {
  default(v) {
    array2string = v;
  }

}, 6);

// var prefixMatch = new RegExp(/(?!xmlns)^.*:/);
SAML = function (options) {
  this.options = this.initialize(options);
};

function debugLog(...args) {
  if (Meteor.settings.debug) {
    console.log.apply(this, args);
  }
} // var stripPrefix = function(str) {
// 	return str.replace(prefixMatch, '');
// };


SAML.prototype.initialize = function (options) {
  if (!options) {
    options = {};
  }

  if (!options.protocol) {
    options.protocol = 'https://';
  }

  if (!options.path) {
    options.path = '/saml/consume';
  }

  if (!options.issuer) {
    options.issuer = 'onelogin_saml';
  }

  if (options.identifierFormat === undefined) {
    options.identifierFormat = 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';
  }

  if (options.authnContext === undefined) {
    options.authnContext = 'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport';
  }

  return options;
};

SAML.prototype.generateUniqueID = function () {
  const chars = 'abcdef0123456789';
  let uniqueID = 'id-';

  for (let i = 0; i < 20; i++) {
    uniqueID += chars.substr(Math.floor(Math.random() * 15), 1);
  }

  return uniqueID;
};

SAML.prototype.generateInstant = function () {
  return new Date().toISOString();
};

SAML.prototype.signRequest = function (xml) {
  const signer = crypto.createSign('RSA-SHA1');
  signer.update(xml);
  return signer.sign(this.options.privateKey, 'base64');
};

SAML.prototype.generateAuthorizeRequest = function (req) {
  let id = `_${this.generateUniqueID()}`;
  const instant = this.generateInstant(); // Post-auth destination

  let callbackUrl;

  if (this.options.callbackUrl) {
    callbackUrl = this.options.callbackUrl;
  } else {
    callbackUrl = this.options.protocol + req.headers.host + this.options.path;
  }

  if (this.options.id) {
    id = this.options.id;
  }

  let request = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="${id}" Version="2.0" IssueInstant="${instant}" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" AssertionConsumerServiceURL="${callbackUrl}" Destination="${this.options.entryPoint}">` + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>\n`;

  if (this.options.identifierFormat) {
    request += `<samlp:NameIDPolicy xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Format="${this.options.identifierFormat}" AllowCreate="true"></samlp:NameIDPolicy>\n`;
  }

  request += '<samlp:RequestedAuthnContext xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" Comparison="exact">' + '<saml:AuthnContextClassRef xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></samlp:RequestedAuthnContext>\n' + '</samlp:AuthnRequest>';
  return request;
};

SAML.prototype.generateLogoutRequest = function (options) {
  // options should be of the form
  // nameId: <nameId as submitted during SAML SSO>
  // sessionIndex: sessionIndex
  // --- NO SAMLsettings: <Meteor.setting.saml  entry for the provider you want to SLO from
  const id = `_${this.generateUniqueID()}`;
  const instant = this.generateInstant();
  let request = `${'<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ' + 'xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="'}${id}" Version="2.0" IssueInstant="${instant}" Destination="${this.options.idpSLORedirectURL}">` + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>` + `<saml:NameID Format="${this.options.identifierFormat}">${options.nameID}</saml:NameID>` + '</samlp:LogoutRequest>';
  request = `${'<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"  ' + 'ID="'}${id}" ` + 'Version="2.0" ' + `IssueInstant="${instant}" ` + `Destination="${this.options.idpSLORedirectURL}" ` + '>' + `<saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">${this.options.issuer}</saml:Issuer>` + '<saml:NameID xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ' + 'NameQualifier="http://id.init8.net:8080/openam" ' + `SPNameQualifier="${this.options.issuer}" ` + `Format="${this.options.identifierFormat}">${options.nameID}</saml:NameID>` + `<samlp:SessionIndex xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">${options.sessionIndex}</samlp:SessionIndex>` + '</samlp:LogoutRequest>';
  debugLog('------- SAML Logout request -----------');
  debugLog(request);
  return {
    request,
    id
  };
};

SAML.prototype.requestToUrl = function (request, operation, callback) {
  const self = this;
  zlib.deflateRaw(request, function (err, buffer) {
    if (err) {
      return callback(err);
    }

    const base64 = buffer.toString('base64');
    let target = self.options.entryPoint;

    if (operation === 'logout') {
      if (self.options.idpSLORedirectURL) {
        target = self.options.idpSLORedirectURL;
      }
    }

    if (target.indexOf('?') > 0) {
      target += '&';
    } else {
      target += '?';
    } // TBD. We should really include a proper RelayState here


    let relayState;

    if (operation === 'logout') {
      // in case of logout we want to be redirected back to the Meteor app.
      relayState = Meteor.absoluteUrl();
    } else {
      relayState = self.options.provider;
    }

    const samlRequest = {
      SAMLRequest: base64,
      RelayState: relayState
    };

    if (self.options.privateCert) {
      samlRequest.SigAlg = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
      samlRequest.Signature = self.signRequest(querystring.stringify(samlRequest));
    }

    target += querystring.stringify(samlRequest);
    debugLog(`requestToUrl: ${target}`);

    if (operation === 'logout') {
      // in case of logout we want to be redirected back to the Meteor app.
      return callback(null, target);
    } else {
      callback(null, target);
    }
  });
};

SAML.prototype.getAuthorizeUrl = function (req, callback) {
  const request = this.generateAuthorizeRequest(req);
  this.requestToUrl(request, 'authorize', callback);
};

SAML.prototype.getLogoutUrl = function (req, callback) {
  const request = this.generateLogoutRequest(req);
  this.requestToUrl(request, 'logout', callback);
};

SAML.prototype.certToPEM = function (cert) {
  cert = cert.match(/.{1,64}/g).join('\n');
  cert = `-----BEGIN CERTIFICATE-----\n${cert}`;
  cert = `${cert}\n-----END CERTIFICATE-----\n`;
  return cert;
}; // functionfindChilds(node, localName, namespace) {
// 	var res = [];
// 	for (var i = 0; i < node.childNodes.length; i++) {
// 		var child = node.childNodes[i];
// 		if (child.localName === localName && (child.namespaceURI === namespace || !namespace)) {
// 			res.push(child);
// 		}
// 	}
// 	return res;
// }


SAML.prototype.validateStatus = function (doc) {
  let successStatus = false;
  let status = '';
  let messageText = '';
  const statusNodes = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusCode');

  if (statusNodes.length) {
    const statusNode = statusNodes[0];
    const statusMessage = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusMessage')[0];

    if (statusMessage) {
      messageText = statusMessage.firstChild.textContent;
    }

    status = statusNode.getAttribute('Value');

    if (status === 'urn:oasis:names:tc:SAML:2.0:status:Success') {
      successStatus = true;
    }
  }

  return {
    success: successStatus,
    message: messageText,
    statusCode: status
  };
};

SAML.prototype.validateSignature = function (xml, cert) {
  const self = this;
  const doc = new xmldom.DOMParser().parseFromString(xml);
  const signature = xmlCrypto.xpath(doc, '//*[local-name(.)=\'Signature\' and namespace-uri(.)=\'http://www.w3.org/2000/09/xmldsig#\']')[0];
  const sig = new xmlCrypto.SignedXml();
  sig.keyInfoProvider = {
    getKeyInfo()
    /* key*/
    {
      return '<X509Data></X509Data>';
    },

    getKey()
    /* keyInfo*/
    {
      return self.certToPEM(cert);
    }

  };
  sig.loadSignature(signature);
  return sig.checkSignature(xml);
};

SAML.prototype.validateLogoutResponse = function (samlResponse, callback) {
  const self = this;
  const compressedSAMLResponse = new Buffer(samlResponse, 'base64');
  zlib.inflateRaw(compressedSAMLResponse, function (err, decoded) {
    if (err) {
      debugLog(`Error while inflating. ${err}`);
    } else {
      debugLog(`constructing new DOM parser: ${Object.prototype.toString.call(decoded)}`);
      debugLog(`>>>> ${decoded}`);
      const doc = new xmldom.DOMParser().parseFromString(array2string(decoded), 'text/xml');

      if (doc) {
        const response = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'LogoutResponse')[0];

        if (response) {
          // TBD. Check if this msg corresponds to one we sent
          let inResponseTo;

          try {
            inResponseTo = response.getAttribute('InResponseTo');
            debugLog(`In Response to: ${inResponseTo}`);
          } catch (e) {
            if (Meteor.settings.debug) {
              debugLog(`Caught error: ${e}`);
              const msg = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'StatusMessage');
              debugLog(`Unexpected msg from IDP. Does your session still exist at IDP? Idp returned: \n ${msg}`);
            }
          }

          const statusValidateObj = self.validateStatus(doc);

          if (statusValidateObj.success) {
            callback(null, inResponseTo);
          } else {
            callback('Error. Logout not confirmed by IDP', null);
          }
        } else {
          callback('No Response Found', null);
        }
      }
    }
  });
};

SAML.prototype.mapAttributes = function (attributeStatement, profile) {
  debugLog(`Attribute Statement found in SAML response: ${attributeStatement}`);
  const attributes = attributeStatement.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Attribute');
  debugLog(`Attributes will be processed: ${attributes.length}`);

  if (attributes) {
    for (let i = 0; i < attributes.length; i++) {
      const values = attributes[i].getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeValue');
      let value;

      if (values.length === 1) {
        value = values[0].textContent;
      } else {
        value = [];

        for (let j = 0; j < values.length; j++) {
          value.push(values[j].textContent);
        }
      }

      const key = attributes[i].getAttribute('Name');
      debugLog(`Name:  ${attributes[i]}`);
      debugLog(`Adding attribute from SAML response to profile: ${key} = ${value}`);
      profile[key] = value;
    }
  } else {
    debugLog('No Attributes found in SAML attribute statement.');
  }

  if (!profile.mail && profile['urn:oid:0.9.2342.19200300.100.1.3']) {
    // See http://www.incommonfederation.org/attributesummary.html for definition of attribute OIDs
    profile.mail = profile['urn:oid:0.9.2342.19200300.100.1.3'];
  }

  if (!profile.email && profile['urn:oid:1.2.840.113549.1.9.1']) {
    profile.email = profile['urn:oid:1.2.840.113549.1.9.1'];
  }

  if (!profile.email && profile.mail) {
    profile.email = profile.mail;
  }
};

SAML.prototype.validateResponse = function (samlResponse, relayState, callback) {
  const self = this;
  const xml = new Buffer(samlResponse, 'base64').toString('utf8'); // We currently use RelayState to save SAML provider

  debugLog(`Validating response with relay state: ${xml}`);
  const doc = new xmldom.DOMParser().parseFromString(xml, 'text/xml');

  if (doc) {
    debugLog('Verify status');
    const statusValidateObj = self.validateStatus(doc);

    if (statusValidateObj.success) {
      debugLog('Status ok'); // Verify signature

      debugLog('Verify signature');

      if (self.options.cert && !self.validateSignature(xml, self.options.cert)) {
        debugLog('Signature WRONG');
        return callback(new Error('Invalid signature'), null, false);
      }

      debugLog('Signature OK');
      const response = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'Response')[0];

      if (response) {
        debugLog('Got response');
        const assertion = response.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Assertion')[0];

        if (!assertion) {
          return callback(new Error('Missing SAML assertion'), null, false);
        }

        const profile = {};

        if (response.hasAttribute('InResponseTo')) {
          profile.inResponseToId = response.getAttribute('InResponseTo');
        }

        const issuer = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer')[0];

        if (issuer) {
          profile.issuer = issuer.textContent;
        }

        const subject = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Subject')[0];

        if (subject) {
          const nameID = subject.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'NameID')[0];

          if (nameID) {
            profile.nameID = nameID.textContent;

            if (nameID.hasAttribute('Format')) {
              profile.nameIDFormat = nameID.getAttribute('Format');
            }
          }
        }

        const authnStatement = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AuthnStatement')[0];

        if (authnStatement) {
          if (authnStatement.hasAttribute('SessionIndex')) {
            profile.sessionIndex = authnStatement.getAttribute('SessionIndex');
            debugLog(`Session Index: ${profile.sessionIndex}`);
          } else {
            debugLog('No Session Index Found');
          }
        } else {
          debugLog('No AuthN Statement found');
        }

        const attributeStatement = assertion.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'AttributeStatement')[0];

        if (attributeStatement) {
          this.mapAttributes(attributeStatement, profile);
        } else {
          debugLog('No Attribute Statement found in SAML response.');
        }

        if (!profile.email && profile.nameID && profile.nameIDFormat && profile.nameIDFormat.indexOf('emailAddress') >= 0) {
          profile.email = profile.nameID;
        }

        const profileKeys = Object.keys(profile);

        for (let i = 0; i < profileKeys.length; i++) {
          const key = profileKeys[i];

          if (key.match(/\./)) {
            profile[key.replace(/\./g, '-')] = profile[key];
            delete profile[key];
          }
        }

        debugLog(`NameID: ${JSON.stringify(profile)}`);
        callback(null, profile, false);
      } else {
        const logoutResponse = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:protocol', 'LogoutResponse');

        if (logoutResponse) {
          callback(null, null, true);
        } else {
          return callback(new Error('Unknown SAML response message'), null, false);
        }
      }
    } else {
      return callback(new Error(`Status is:  ${statusValidateObj.statusCode}`), null, false);
    }
  }
};

let decryptionCert;

SAML.prototype.generateServiceProviderMetadata = function (callbackUrl) {
  if (!decryptionCert) {
    decryptionCert = this.options.privateCert;
  }

  if (!this.options.callbackUrl && !callbackUrl) {
    throw new Error('Unable to generate service provider metadata when callbackUrl option is not set');
  }

  const metadata = {
    EntityDescriptor: {
      '@xmlns': 'urn:oasis:names:tc:SAML:2.0:metadata',
      '@xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      '@entityID': this.options.issuer,
      SPSSODescriptor: {
        '@protocolSupportEnumeration': 'urn:oasis:names:tc:SAML:2.0:protocol',
        SingleLogoutService: {
          '@Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
          '@Location': `${Meteor.absoluteUrl()}_saml/logout/${this.options.provider}/`,
          '@ResponseLocation': `${Meteor.absoluteUrl()}_saml/logout/${this.options.provider}/`
        },
        NameIDFormat: this.options.identifierFormat,
        AssertionConsumerService: {
          '@index': '1',
          '@isDefault': 'true',
          '@Binding': 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
          '@Location': callbackUrl
        }
      }
    }
  };

  if (this.options.privateKey) {
    if (!decryptionCert) {
      throw new Error('Missing decryptionCert while generating metadata for decrypting service provider');
    }

    decryptionCert = decryptionCert.replace(/-+BEGIN CERTIFICATE-+\r?\n?/, '');
    decryptionCert = decryptionCert.replace(/-+END CERTIFICATE-+\r?\n?/, '');
    decryptionCert = decryptionCert.replace(/\r\n/g, '\n');
    metadata.EntityDescriptor.SPSSODescriptor.KeyDescriptor = {
      'ds:KeyInfo': {
        'ds:X509Data': {
          'ds:X509Certificate': {
            '#text': decryptionCert
          }
        }
      },
      EncryptionMethod: [// this should be the set that the xmlenc library supports
      {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#aes256-cbc'
      }, {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#aes128-cbc'
      }, {
        '@Algorithm': 'http://www.w3.org/2001/04/xmlenc#tripledes-cbc'
      }]
    };
  }

  return xmlbuilder.create(metadata).end({
    pretty: true,
    indent: '  ',
    newline: '\n'
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saml_rocketchat.js":function(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/steffo_meteor-accounts-saml/saml_rocketchat.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  updateServices: () => updateServices,
  configureSamlService: () => configureSamlService,
  getSamlConfigs: () => getSamlConfigs,
  debounce: () => debounce,
  logger: () => logger
});
const logger = new Logger('steffo:meteor-accounts-saml', {
  methods: {
    updated: {
      type: 'info'
    }
  }
});
RocketChat.settings.addGroup('SAML');
Meteor.methods({
  addSamlService(name) {
    RocketChat.settings.add(`SAML_Custom_${name}`, false, {
      type: 'boolean',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Enable'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_provider`, 'provider-name', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Provider'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_entry_point`, 'https://example.com/simplesaml/saml2/idp/SSOService.php', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Entry_point'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_idp_slo_redirect_url`, 'https://example.com/simplesaml/saml2/idp/SingleLogoutService.php', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_IDP_SLO_Redirect_URL'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_issuer`, 'https://your-rocket-chat/_saml/metadata/provider-name', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Issuer'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_cert`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Cert',
      multiline: true
    });
    RocketChat.settings.add(`SAML_Custom_${name}_public_cert`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      multiline: true,
      i18nLabel: 'SAML_Custom_Public_Cert'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_private_key`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      multiline: true,
      i18nLabel: 'SAML_Custom_Private_Key'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_label_text`, '', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Text'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_label_color`, '#FFFFFF', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Label_Color'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_button_color`, '#13679A', {
      type: 'string',
      group: 'SAML',
      section: name,
      i18nLabel: 'Accounts_OAuth_Custom_Button_Color'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_generate_username`, false, {
      type: 'boolean',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Generate_Username'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_debug`, false, {
      type: 'boolean',
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Debug'
    });
    RocketChat.settings.add(`SAML_Custom_${name}_logout_behaviour`, 'SAML', {
      type: 'select',
      values: [{
        key: 'SAML',
        i18nLabel: 'SAML_Custom_Logout_Behaviour_Terminate_SAML_Session'
      }, {
        key: 'Local',
        i18nLabel: 'SAML_Custom_Logout_Behaviour_End_Only_RocketChat'
      }],
      group: 'SAML',
      section: name,
      i18nLabel: 'SAML_Custom_Logout_Behaviour'
    });
  }

});

const getSamlConfigs = function (service) {
  return {
    buttonLabelText: RocketChat.settings.get(`${service.key}_button_label_text`),
    buttonLabelColor: RocketChat.settings.get(`${service.key}_button_label_color`),
    buttonColor: RocketChat.settings.get(`${service.key}_button_color`),
    clientConfig: {
      provider: RocketChat.settings.get(`${service.key}_provider`)
    },
    entryPoint: RocketChat.settings.get(`${service.key}_entry_point`),
    idpSLORedirectURL: RocketChat.settings.get(`${service.key}_idp_slo_redirect_url`),
    generateUsername: RocketChat.settings.get(`${service.key}_generate_username`),
    debug: RocketChat.settings.get(`${service.key}_debug`),
    issuer: RocketChat.settings.get(`${service.key}_issuer`),
    logoutBehaviour: RocketChat.settings.get(`${service.key}_logout_behaviour`),
    secret: {
      privateKey: RocketChat.settings.get(`${service.key}_private_key`),
      publicCert: RocketChat.settings.get(`${service.key}_public_cert`),
      cert: RocketChat.settings.get(`${service.key}_cert`)
    }
  };
};

const debounce = (fn, delay) => {
  let timer = null;
  return () => {
    if (timer != null) {
      Meteor.clearTimeout(timer);
    }

    return timer = Meteor.setTimeout(fn, delay);
  };
};

const serviceName = 'saml';

const configureSamlService = function (samlConfigs) {
  let privateCert = false;
  let privateKey = false;

  if (samlConfigs.secret.privateKey && samlConfigs.secret.publicCert) {
    privateKey = samlConfigs.secret.privateKey;
    privateCert = samlConfigs.secret.publicCert;
  } else if (samlConfigs.secret.privateKey || samlConfigs.secret.publicCert) {
    logger.error('You must specify both cert and key files.');
  } // TODO: the function configureSamlService is called many times and Accounts.saml.settings.generateUsername keeps just the last value


  Accounts.saml.settings.generateUsername = samlConfigs.generateUsername;
  Accounts.saml.settings.debug = samlConfigs.debug;
  return {
    provider: samlConfigs.clientConfig.provider,
    entryPoint: samlConfigs.entryPoint,
    idpSLORedirectURL: samlConfigs.idpSLORedirectURL,
    issuer: samlConfigs.issuer,
    cert: samlConfigs.secret.cert,
    privateCert,
    privateKey
  };
};

const updateServices = debounce(() => {
  const services = RocketChat.settings.get(/^(SAML_Custom_)[a-z]+$/i);
  Accounts.saml.settings.providers = services.map(service => {
    if (service.value === true) {
      const samlConfigs = getSamlConfigs(service);
      logger.updated(service.key);
      ServiceConfiguration.configurations.upsert({
        service: serviceName.toLowerCase()
      }, {
        $set: samlConfigs
      });
      return configureSamlService(samlConfigs);
    }

    return ServiceConfiguration.configurations.remove({
      service: serviceName.toLowerCase()
    });
  }).filter(e => e);
}, 2000);
RocketChat.settings.get(/^SAML_.+/, updateServices);
Meteor.startup(() => Meteor.call('addSamlService', 'Default'));
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_server.js");
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_utils.js");
require("/node_modules/meteor/steffo:meteor-accounts-saml/saml_rocketchat.js");

/* Exports */
Package._define("steffo:meteor-accounts-saml");

})();

//# sourceURL=meteor://💻app/packages/steffo_meteor-accounts-saml.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RlZmZvOm1ldGVvci1hY2NvdW50cy1zYW1sL3NhbWxfc2VydmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9zdGVmZm86bWV0ZW9yLWFjY291bnRzLXNhbWwvc2FtbF91dGlscy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvc3RlZmZvOm1ldGVvci1hY2NvdW50cy1zYW1sL3NhbWxfcm9ja2V0Y2hhdC5qcyJdLCJuYW1lcyI6WyJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJmaWJlciIsImNvbm5lY3QiLCJBY2NvdW50cyIsInNhbWwiLCJzZXR0aW5ncyIsImRlYnVnIiwiZ2VuZXJhdGVVc2VybmFtZSIsInByb3ZpZGVycyIsIlJvdXRlUG9saWN5IiwiZGVjbGFyZSIsImdldFNhbWxQcm92aWRlckNvbmZpZyIsInByb3ZpZGVyIiwiTWV0ZW9yIiwiRXJyb3IiLCJtZXRob2QiLCJzYW1sUHJvdmlkZXIiLCJlbGVtZW50IiwiZmlsdGVyIiwibWV0aG9kcyIsInNhbWxMb2dvdXQiLCJ1c2VySWQiLCJwcm92aWRlckNvbmZpZyIsImNvbnNvbGUiLCJsb2ciLCJKU09OIiwic3RyaW5naWZ5IiwidXNlciIsInVzZXJzIiwiZmluZE9uZSIsIl9pZCIsIm5hbWVJRCIsInNlcnZpY2VzIiwic2Vzc2lvbkluZGV4IiwiaWRwU2Vzc2lvbiIsIl9zYW1sIiwiU0FNTCIsInJlcXVlc3QiLCJnZW5lcmF0ZUxvZ291dFJlcXVlc3QiLCJ1cGRhdGUiLCIkc2V0IiwiaWQiLCJfc3luY1JlcXVlc3RUb1VybCIsIndyYXBBc3luYyIsInJlcXVlc3RUb1VybCIsInJlc3VsdCIsInJlZ2lzdGVyTG9naW5IYW5kbGVyIiwibG9naW5SZXF1ZXN0IiwiY3JlZGVudGlhbFRva2VuIiwidW5kZWZpbmVkIiwibG9naW5SZXN1bHQiLCJyZXRyaWV2ZUNyZWRlbnRpYWwiLCJ0eXBlIiwiZXJyb3IiLCJMb2dpbkNhbmNlbGxlZEVycm9yIiwibnVtZXJpY0Vycm9yIiwicHJvZmlsZSIsImVtYWlsIiwiZW1haWxMaXN0IiwiQXJyYXkiLCJpc0FycmF5IiwiZW1haWxSZWdleCIsIlJlZ0V4cCIsIm1hcCIsImVzY2FwZSIsImpvaW4iLCJuZXdVc2VyIiwibmFtZSIsImNuIiwidXNlcm5hbWUiLCJhY3RpdmUiLCJnbG9iYWxSb2xlcyIsImVtYWlscyIsImFkZHJlc3MiLCJ2ZXJpZmllZCIsIlJvY2tldENoYXQiLCJnZW5lcmF0ZVVzZXJuYW1lU3VnZ2VzdGlvbiIsImluc2VydFVzZXJEb2MiLCJzdGFtcGVkVG9rZW4iLCJfZ2VuZXJhdGVTdGFtcGVkTG9naW5Ub2tlbiIsIiRwdXNoIiwic2FtbExvZ2luIiwiUmVsYXlTdGF0ZSIsImlkcCIsImlzc3VlciIsInRva2VuIiwiaGFzQ3JlZGVudGlhbCIsIm1vZGVscyIsIkNyZWRlbnRpYWxUb2tlbnMiLCJmaW5kT25lQnlJZCIsImRhdGEiLCJ1c2VySW5mbyIsInN0b3JlQ3JlZGVudGlhbCIsImNyZWF0ZSIsImNsb3NlUG9wdXAiLCJyZXMiLCJlcnIiLCJ3cml0ZUhlYWQiLCJjb250ZW50IiwiZW5kIiwic2FtbFVybFRvT2JqZWN0IiwidXJsIiwic3BsaXRVcmwiLCJzcGxpdCIsInNwbGl0UGF0aCIsImFjdGlvbk5hbWUiLCJzZXJ2aWNlTmFtZSIsIm1pZGRsZXdhcmUiLCJyZXEiLCJuZXh0Iiwic2FtbE9iamVjdCIsInNlcnZpY2UiLCJmaW5kIiwic2FtbFNldHRpbmciLCJjYWxsYmFja1VybCIsImFic29sdXRlVXJsIiwid3JpdGUiLCJnZW5lcmF0ZVNlcnZpY2VQcm92aWRlck1ldGFkYXRhIiwidmFsaWRhdGVMb2dvdXRSZXNwb25zZSIsInF1ZXJ5IiwiU0FNTFJlc3BvbnNlIiwibG9nT3V0VXNlciIsImluUmVzcG9uc2VUbyIsImxvZ2dlZE91dFVzZXIiLCJmZXRjaCIsImxlbmd0aCIsIiR1bnNldCIsInJ1biIsIkxvY2F0aW9uIiwicmVkaXJlY3QiLCJnZXRBdXRob3JpemVVcmwiLCJib2R5IiwidmFsaWRhdGVSZXNwb25zZSIsImluUmVzcG9uc2VUb0lkIiwidmFsdWUiLCJJblJlc3BvbnNlVG8iLCJzYW1sX2lkcF9jcmVkZW50aWFsVG9rZW4iLCJSYW5kb20iLCJXZWJBcHAiLCJjb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJib2R5UGFyc2VyIiwiemxpYiIsInhtbENyeXB0byIsImNyeXB0byIsInhtbGRvbSIsInF1ZXJ5c3RyaW5nIiwieG1sYnVpbGRlciIsImFycmF5MnN0cmluZyIsIm9wdGlvbnMiLCJpbml0aWFsaXplIiwiZGVidWdMb2ciLCJhcmdzIiwiYXBwbHkiLCJwcm90b3R5cGUiLCJwcm90b2NvbCIsInBhdGgiLCJpZGVudGlmaWVyRm9ybWF0IiwiYXV0aG5Db250ZXh0IiwiZ2VuZXJhdGVVbmlxdWVJRCIsImNoYXJzIiwidW5pcXVlSUQiLCJpIiwic3Vic3RyIiwiTWF0aCIsImZsb29yIiwicmFuZG9tIiwiZ2VuZXJhdGVJbnN0YW50IiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwic2lnblJlcXVlc3QiLCJ4bWwiLCJzaWduZXIiLCJjcmVhdGVTaWduIiwic2lnbiIsInByaXZhdGVLZXkiLCJnZW5lcmF0ZUF1dGhvcml6ZVJlcXVlc3QiLCJpbnN0YW50IiwiaGVhZGVycyIsImhvc3QiLCJlbnRyeVBvaW50IiwiaWRwU0xPUmVkaXJlY3RVUkwiLCJvcGVyYXRpb24iLCJjYWxsYmFjayIsInNlbGYiLCJkZWZsYXRlUmF3IiwiYnVmZmVyIiwiYmFzZTY0IiwidG9TdHJpbmciLCJ0YXJnZXQiLCJpbmRleE9mIiwicmVsYXlTdGF0ZSIsInNhbWxSZXF1ZXN0IiwiU0FNTFJlcXVlc3QiLCJwcml2YXRlQ2VydCIsIlNpZ0FsZyIsIlNpZ25hdHVyZSIsImdldExvZ291dFVybCIsImNlcnRUb1BFTSIsImNlcnQiLCJtYXRjaCIsInZhbGlkYXRlU3RhdHVzIiwiZG9jIiwic3VjY2Vzc1N0YXR1cyIsInN0YXR1cyIsIm1lc3NhZ2VUZXh0Iiwic3RhdHVzTm9kZXMiLCJnZXRFbGVtZW50c0J5VGFnTmFtZU5TIiwic3RhdHVzTm9kZSIsInN0YXR1c01lc3NhZ2UiLCJmaXJzdENoaWxkIiwidGV4dENvbnRlbnQiLCJnZXRBdHRyaWJ1dGUiLCJzdWNjZXNzIiwibWVzc2FnZSIsInN0YXR1c0NvZGUiLCJ2YWxpZGF0ZVNpZ25hdHVyZSIsIkRPTVBhcnNlciIsInBhcnNlRnJvbVN0cmluZyIsInNpZ25hdHVyZSIsInhwYXRoIiwic2lnIiwiU2lnbmVkWG1sIiwia2V5SW5mb1Byb3ZpZGVyIiwiZ2V0S2V5SW5mbyIsImdldEtleSIsImxvYWRTaWduYXR1cmUiLCJjaGVja1NpZ25hdHVyZSIsInNhbWxSZXNwb25zZSIsImNvbXByZXNzZWRTQU1MUmVzcG9uc2UiLCJCdWZmZXIiLCJpbmZsYXRlUmF3IiwiZGVjb2RlZCIsIk9iamVjdCIsImNhbGwiLCJyZXNwb25zZSIsImUiLCJtc2ciLCJzdGF0dXNWYWxpZGF0ZU9iaiIsIm1hcEF0dHJpYnV0ZXMiLCJhdHRyaWJ1dGVTdGF0ZW1lbnQiLCJhdHRyaWJ1dGVzIiwidmFsdWVzIiwiaiIsInB1c2giLCJrZXkiLCJtYWlsIiwiYXNzZXJ0aW9uIiwiaGFzQXR0cmlidXRlIiwic3ViamVjdCIsIm5hbWVJREZvcm1hdCIsImF1dGhuU3RhdGVtZW50IiwicHJvZmlsZUtleXMiLCJrZXlzIiwicmVwbGFjZSIsImxvZ291dFJlc3BvbnNlIiwiZGVjcnlwdGlvbkNlcnQiLCJtZXRhZGF0YSIsIkVudGl0eURlc2NyaXB0b3IiLCJTUFNTT0Rlc2NyaXB0b3IiLCJTaW5nbGVMb2dvdXRTZXJ2aWNlIiwiTmFtZUlERm9ybWF0IiwiQXNzZXJ0aW9uQ29uc3VtZXJTZXJ2aWNlIiwiS2V5RGVzY3JpcHRvciIsIkVuY3J5cHRpb25NZXRob2QiLCJwcmV0dHkiLCJpbmRlbnQiLCJuZXdsaW5lIiwiZXhwb3J0IiwidXBkYXRlU2VydmljZXMiLCJjb25maWd1cmVTYW1sU2VydmljZSIsImdldFNhbWxDb25maWdzIiwiZGVib3VuY2UiLCJsb2dnZXIiLCJMb2dnZXIiLCJ1cGRhdGVkIiwiYWRkR3JvdXAiLCJhZGRTYW1sU2VydmljZSIsImFkZCIsImdyb3VwIiwic2VjdGlvbiIsImkxOG5MYWJlbCIsIm11bHRpbGluZSIsImJ1dHRvbkxhYmVsVGV4dCIsImdldCIsImJ1dHRvbkxhYmVsQ29sb3IiLCJidXR0b25Db2xvciIsImNsaWVudENvbmZpZyIsImxvZ291dEJlaGF2aW91ciIsInNlY3JldCIsInB1YmxpY0NlcnQiLCJmbiIsImRlbGF5IiwidGltZXIiLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0Iiwic2FtbENvbmZpZ3MiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsImNvbmZpZ3VyYXRpb25zIiwidXBzZXJ0IiwidG9Mb3dlckNhc2UiLCJyZW1vdmUiLCJzdGFydHVwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJQSxDQUFKOztBQUFNQyxPQUFPQyxLQUFQLENBQWFDLFFBQVEsWUFBUixDQUFiLEVBQW1DO0FBQUNDLFVBQVFDLENBQVIsRUFBVTtBQUFDTCxRQUFFSyxDQUFGO0FBQUk7O0FBQWhCLENBQW5DLEVBQXFELENBQXJEO0FBQXdELElBQUlDLEtBQUo7QUFBVUwsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFFBQVIsQ0FBYixFQUErQjtBQUFDQyxVQUFRQyxDQUFSLEVBQVU7QUFBQ0MsWUFBTUQsQ0FBTjtBQUFROztBQUFwQixDQUEvQixFQUFxRCxDQUFyRDtBQUF3RCxJQUFJRSxPQUFKO0FBQVlOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxTQUFSLENBQWIsRUFBZ0M7QUFBQ0MsVUFBUUMsQ0FBUixFQUFVO0FBQUNFLGNBQVFGLENBQVI7QUFBVTs7QUFBdEIsQ0FBaEMsRUFBd0QsQ0FBeEQ7O0FBSTVJLElBQUksQ0FBQ0csU0FBU0MsSUFBZCxFQUFvQjtBQUNuQkQsV0FBU0MsSUFBVCxHQUFnQjtBQUNmQyxjQUFVO0FBQ1RDLGFBQU8sS0FERTtBQUVUQyx3QkFBa0IsS0FGVDtB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QVA7QUFDQTs7QUFDRCxXQUFPQyxxQkFBcUJDLGNBQXJCLENBQW9DRyxNQUFwQyxDQUEyQztBQUNqRDlMLGVBQVNMLFlBQVlrTSxXQUFaO0FBRHdDLEtBQTNDLENBQVA7QUFHQSxHQWRrQyxFQWNoQzFSLE1BZGdDLENBY3hCME4sQ0FBRCxJQUFPQSxDQWRrQixDQUFuQztBQWVBLENBakJzQixFQWlCcEIsSUFqQm9CLENBQXZCO0FBb0JBakssV0FBV3RFLFFBQVgsQ0FBb0J1UixHQUFwQixDQUF3QixVQUF4QixFQUFvQ2YsY0FBcEM7QUFFQWhRLE9BQU9pUyxPQUFQLENBQWUsTUFBTWpTLE9BQU82TixJQUFQLENBQVksZ0JBQVosRUFBOEIsU0FBOUIsQ0FBckIsRSIsImZpbGUiOiIvcGFja2FnZXMvc3RlZmZvX21ldGVvci1hY2NvdW50cy1zYW1sLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogZ2xvYmFscyBSb3V0ZVBvbGljeSwgU0FNTCAqL1xuLyoganNoaW50IG5ld2NhcDogZmFsc2UgKi9cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5pZiAoIUFjY291bnRzLnNhbWwpIHtcblx0QWNjb3VudHMuc2FtbCA9IHtcblx0XHRzZXR0aW5nczoge1xuXHRcdFx0ZGVidWc6IGZhbHNlLFxuXHRcdFx0Z2VuZXJhdGVVc2VybmFtZTogZmFsc2UsXG5cdFx0XHRwcm92aWRlcnM6IFtdLFxuXHRcdH0sXG5cdH07XG59XG5cbmltcG9ydCBmaWJlciBmcm9tICdmaWJlcnMnO1xuaW1wb3J0IGNvbm5lY3QgZnJvbSAnY29ubmVjdCc7XG5Sb3V0ZVBvbGljeS5kZWNsYXJlKCcvX3NhbWwvJywgJ25ldHdvcmsnKTtcblxuLyoqXG4gKiBGZXRjaCBTQU1MIHByb3ZpZGVyIGNvbmZpZ3MgZm9yIGdpdmVuICdwcm92aWRlcicuXG4gKi9cbmZ1bmN0aW9uIGdldFNhbWxQcm92aWRlckNvbmZpZyhwcm92aWRlcikge1xuXHRpZiAoISBwcm92aWRlcikge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ25vLXNhbWwtcHJvdmlkZXInLFxuXHRcdFx0J1NBTUwgaW50ZXJuYWwgZXJyb3InLFxuXHRcdFx0eyBtZXRob2Q6ICdnZXRTYW1sUHJvdmlkZXJDb25maWcnIH0pO1xuXHR9XG5cdGNvbnN0IHNhbWxQcm92aWRlciA9IGZ1bmN0aW9uKGVsZW1lbnQpIHtcblx0XHRyZXR1cm4gKGVsZW1lbnQucHJvdmlkZXIgPT09IHByb3ZpZGVyKTtcblx0fTtcblx0cmV0dXJuIEFjY291bnRzLnNhbWwuc2V0dGluZ3MucHJvdmlkZXJzLmZpbHRlcihzYW1sUHJvdmlkZXIpWzBdO1xufVxuXG5NZXRlb3IubWV0aG9kcyh7XG5cdHNhbWxMb2dvdXQocHJvdmlkZXIpIHtcblx0XHQvLyBNYWtlIHN1cmUgdGhlIHVzZXIgaXMgbG9nZ2VkIGluIGJlZm9yZSBpbml0aWF0ZSBTQU1MIFNMT1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdzYW1sTG9nb3V0JyB9KTtcblx0XHR9XG5cdFx0Y29uc3QgcHJvdmlkZXJDb25maWcgPSBnZXRTYW1sUHJvdmlkZXJDb25maWcocHJvdmlkZXIpO1xuXG5cdFx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRcdGNvbnNvbGUubG9nKGBMb2dvdXQgcmVxdWVzdCBmcm9tICR7IEpTT04uc3RyaW5naWZ5KHByb3ZpZGVyQ29uZmlnKSB9YCk7XG5cdFx0fVxuXHRcdC8vIFRoaXMgcXVlcnkgc2hvdWxkIHJlc3BlY3QgdXBjb21pbmcgYXJyYXkgb2YgU0FNTCBsb2dpbnNcblx0XHRjb25zdCB1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoe1xuXHRcdFx0X2lkOiBNZXRlb3IudXNlcklkKCksXG5cdFx0XHQnc2VydmljZXMuc2FtbC5wcm92aWRlcic6IHByb3ZpZGVyLFxuXHRcdH0sIHtcblx0XHRcdCdzZXJ2aWNlcy5zYW1sJzogMSxcblx0XHR9KTtcblx0XHRsZXQgeyBuYW1lSUQgfSA9IHVzZXIuc2VydmljZXMuc2FtbDtcblx0XHRjb25zdCBzZXNzaW9uSW5kZXggPSB1c2VyLnNlcnZpY2VzLnNhbWwuaWRwU2Vzc2lvbjtcblx0XHRuYW1lSUQgPSBzZXNzaW9uSW5kZXg7XG5cdFx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRcdGNvbnNvbGUubG9nKGBOYW1lSUQgZm9yIHVzZXIgJHsgTWV0ZW9yLnVzZXJJZCgpIH0gZm91bmQ6ICR7IEpTT04uc3RyaW5naWZ5KG5hbWVJRCkgfWApO1xuXHRcdH1cblxuXHRcdGNvbnN0IF9zYW1sID0gbmV3IFNBTUwocHJvdmlkZXJDb25maWcpO1xuXG5cdFx0Y29uc3QgcmVxdWVzdCA9IF9zYW1sLmdlbmVyYXRlTG9nb3V0UmVxdWVzdCh7XG5cdFx0XHRuYW1lSUQsXG5cdFx0XHRzZXNzaW9uSW5kZXgsXG5cdFx0fSk7XG5cblx0XHQvLyByZXF1ZXN0LnJlcXVlc3Q6IGFjdHVhbCBYTUwgU0FNTCBSZXF1ZXN0XG5cdFx0Ly8gcmVxdWVzdC5pZDogY29tbWludWNhdGlvbiBpZCB3aGljaCB3aWxsIGJlIG1lbnRpb25lZCBpbiB0aGUgUmVzcG9uc2VUbyBmaWVsZCBvZiBTQU1MUmVzcG9uc2VcblxuXHRcdE1ldGVvci51c2Vycy51cGRhdGUoe1xuXHRcdFx0X2lkOiBNZXRlb3IudXNlcklkKCksXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHQnc2VydmljZXMuc2FtbC5pblJlc3BvbnNlVG8nOiByZXF1ZXN0LmlkLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IF9zeW5jUmVxdWVzdFRvVXJsID0gTWV0ZW9yLndyYXBBc3luYyhfc2FtbC5yZXF1ZXN0VG9VcmwsIF9zYW1sKTtcblx0XHRjb25zdCByZXN1bHQgPSBfc3luY1JlcXVlc3RUb1VybChyZXF1ZXN0LnJlcXVlc3QsICdsb2dvdXQnKTtcblx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdFx0Y29uc29sZS5sb2coYFNBTUwgTG9nb3V0IFJlcXVlc3QgJHsgcmVzdWx0IH1gKTtcblx0XHR9XG5cblxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH0sXG59KTtcblxuQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIoZnVuY3Rpb24obG9naW5SZXF1ZXN0KSB7XG5cdGlmICghbG9naW5SZXF1ZXN0LnNhbWwgfHwgIWxvZ2luUmVxdWVzdC5jcmVkZW50aWFsVG9rZW4pIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0Y29uc3QgbG9naW5SZXN1bHQgPSBBY2NvdW50cy5zYW1sLnJldHJpZXZlQ3JlZGVudGlhbChsb2dpblJlcXVlc3QuY3JlZGVudGlhbFRva2VuKTtcblx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRjb25zb2xlLmxvZyhgUkVTVUxUIDokeyBKU09OLnN0cmluZ2lmeShsb2dpblJlc3VsdCkgfWApO1xuXHR9XG5cblx0aWYgKGxvZ2luUmVzdWx0ID09PSB1bmRlZmluZWQpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dHlwZTogJ3NhbWwnLFxuXHRcdFx0ZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoQWNjb3VudHMuTG9naW5DYW5jZWxsZWRFcnJvci5udW1lcmljRXJyb3IsICdObyBtYXRjaGluZyBsb2dpbiBhdHRlbXB0IGZvdW5kJyksXG5cdFx0fTtcblx0fVxuXG5cdGlmIChsb2dpblJlc3VsdCAmJiBsb2dpblJlc3VsdC5wcm9maWxlICYmIGxvZ2luUmVzdWx0LnByb2ZpbGUuZW1haWwpIHtcblx0XHRjb25zdCBlbWFpbExpc3QgPSBBcnJheS5pc0FycmF5KGxvZ2luUmVzdWx0LnByb2ZpbGUuZW1haWwpID8gbG9naW5SZXN1bHQucHJvZmlsZS5lbWFpbCA6IFtsb2dpblJlc3VsdC5wcm9maWxlLmVtYWlsXTtcblx0XHRjb25zdCBlbWFpbFJlZ2V4ID0gbmV3IFJlZ0V4cChlbWFpbExpc3QubWFwKChlbWFpbCkgPT4gYF4keyBSZWdFeHAuZXNjYXBlKGVtYWlsKSB9JGApLmpvaW4oJ3wnKSwgJ2knKTtcblx0XHRsZXQgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHtcblx0XHRcdCdlbWFpbHMuYWRkcmVzcyc6IGVtYWlsUmVnZXgsXG5cdFx0fSk7XG5cblx0XHRpZiAoIXVzZXIpIHtcblx0XHRcdGNvbnN0IG5ld1VzZXIgPSB7XG5cdFx0XHRcdG5hbWU6IGxvZ2luUmVzdWx0LnByb2ZpbGUuY24gfHwgbG9naW5SZXN1bHQucHJvZmlsZS51c2VybmFtZSxcblx0XHRcdFx0YWN0aXZlOiB0cnVlLFxuXHRcdFx0XHRnbG9iYWxSb2xlczogWyd1c2VyJ10sXG5cdFx0XHRcdGVtYWlsczogZW1haWxMaXN0Lm1hcCgoZW1haWwpID0+ICh7XG5cdFx0XHRcdFx0YWRkcmVzczogZW1haWwsXG5cdFx0XHRcdFx0dmVyaWZpZWQ6IHRydWUsXG5cdFx0XHRcdH0pKSxcblx0XHRcdH07XG5cblx0XHRcdGlmIChBY2NvdW50cy5zYW1sLnNldHRpbmdzLmdlbmVyYXRlVXNlcm5hbWUgPT09IHRydWUpIHtcblx0XHRcdFx0Y29uc3QgdXNlcm5hbWUgPSBSb2NrZXRDaGF0LmdlbmVyYXRlVXNlcm5hbWVTdWdnZXN0aW9uKG5ld1VzZXIpO1xuXHRcdFx0XHRpZiAodXNlcm5hbWUpIHtcblx0XHRcdFx0XHRuZXdVc2VyLnVzZXJuYW1lID0gdXNlcm5hbWU7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAobG9naW5SZXN1bHQucHJvZmlsZS51c2VybmFtZSkge1xuXHRcdFx0XHRuZXdVc2VyLnVzZXJuYW1lID0gbG9naW5SZXN1bHQucHJvZmlsZS51c2VybmFtZTtcblx0XHRcdH1cblxuXHRcdFx0Y29uc3QgdXNlcklkID0gQWNjb3VudHMuaW5zZXJ0VXNlckRvYyh7fSwgbmV3VXNlcik7XG5cdFx0XHR1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlcklkKTtcblx0XHR9XG5cblx0XHQvLyBjcmVhdGluZyB0aGUgdG9rZW4gYW5kIGFkZGluZyB0byB0aGUgdXNlclxuXHRcdGNvbnN0IHN0YW1wZWRUb2tlbiA9IEFjY291bnRzLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG5cdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh1c2VyLCB7XG5cdFx0XHQkcHVzaDoge1xuXHRcdFx0XHQnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJzogc3RhbXBlZFRva2VuLFxuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdGNvbnN0IHNhbWxMb2dpbiA9IHtcblx0XHRcdHByb3ZpZGVyOiBBY2NvdW50cy5zYW1sLlJlbGF5U3RhdGUsXG5cdFx0XHRpZHA6IGxvZ2luUmVzdWx0LnByb2ZpbGUuaXNzdWVyLFxuXHRcdFx0aWRwU2Vzc2lvbjogbG9naW5SZXN1bHQucHJvZmlsZS5zZXNzaW9uSW5kZXgsXG5cdFx0XHRuYW1lSUQ6IGxvZ2luUmVzdWx0LnByb2ZpbGUubmFtZUlELFxuXHRcdH07XG5cblx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdF9pZDogdXNlci5faWQsXG5cdFx0fSwge1xuXHRcdFx0JHNldDoge1xuXHRcdFx0XHQvLyBUQkQgdGhpcyBzaG91bGQgYmUgcHVzaGVkLCBvdGhlcndpc2Ugd2UncmUgb25seSBhYmxlIHRvIFNTTyBpbnRvIGEgc2luZ2xlIElEUCBhdCBhIHRpbWVcblx0XHRcdFx0J3NlcnZpY2VzLnNhbWwnOiBzYW1sTG9naW4sXG5cdFx0XHR9LFxuXHRcdH0pO1xuXG5cdFx0Ly8gc2VuZGluZyB0b2tlbiBhbG9uZyB3aXRoIHRoZSB1c2VySWRcblx0XHRjb25zdCByZXN1bHQgPSB7XG5cdFx0XHR1c2VySWQ6IHVzZXIuX2lkLFxuXHRcdFx0dG9rZW46IHN0YW1wZWRUb2tlbi50b2tlbixcblx0XHR9O1xuXG5cdFx0cmV0dXJuIHJlc3VsdDtcblxuXHR9IGVsc2Uge1xuXHRcdHRocm93IG5ldyBFcnJvcignU0FNTCBQcm9maWxlIGRpZCBub3QgY29udGFpbiBhbiBlbWFpbCBhZGRyZXNzJyk7XG5cdH1cbn0pO1xuXG5BY2NvdW50cy5zYW1sLmhhc0NyZWRlbnRpYWwgPSBmdW5jdGlvbihjcmVkZW50aWFsVG9rZW4pIHtcblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLkNyZWRlbnRpYWxUb2tlbnMuZmluZE9uZUJ5SWQoY3JlZGVudGlhbFRva2VuKSAhPSBudWxsO1xufTtcblxuQWNjb3VudHMuc2FtbC5yZXRyaWV2ZUNyZWRlbnRpYWwgPSBmdW5jdGlvbihjcmVkZW50aWFsVG9rZW4pIHtcblx0Ly8gVGhlIGNyZWRlbnRpYWxUb2tlbiBpbiBhbGwgdGhlc2UgZnVuY3Rpb25zIGNvcnJlc3BvbmRzIHRvIFNBTUxzIGluUmVzcG9uc2VUbyBmaWVsZCBhbmQgaXMgbWFuZGF0b3J5IHRvIGNoZWNrLlxuXHRjb25zdCBkYXRhID0gUm9ja2V0Q2hhdC5tb2RlbHMuQ3JlZGVudGlhbFRva2Vucy5maW5kT25lQnlJZChjcmVkZW50aWFsVG9rZW4pO1xuXHRpZiAoZGF0YSkge1xuXHRcdHJldHVybiBkYXRhLnVzZXJJbmZvO1xuXHR9XG59O1xuXG5BY2NvdW50cy5zYW1sLnN0b3JlQ3JlZGVudGlhbCA9IGZ1bmN0aW9uKGNyZWRlbnRpYWxUb2tlbiwgbG9naW5SZXN1bHQpIHtcblx0Um9ja2V0Q2hhdC5tb2RlbHMuQ3JlZGVudGlhbFRva2Vucy5jcmVhdGUoY3JlZGVudGlhbFRva2VuLCBsb2dpblJlc3VsdCk7XG59O1xuXG5jb25zdCBjbG9zZVBvcHVwID0gZnVuY3Rpb24ocmVzLCBlcnIpIHtcblx0cmVzLndyaXRlSGVhZCgyMDAsIHtcblx0XHQnQ29udGVudC1UeXBlJzogJ3RleHQvaHRtbCcsXG5cdH0pO1xuXHRsZXQgY29udGVudCA9ICc8aHRtbD48aGVhZD48c2NyaXB0PndpbmRvdy5jbG9zZSgpPC9zY3JpcHQ+PC9oZWFkPjxib2R5PjxIMT5WZXJpZmllZDwvSDE+PC9ib2R5PjwvaHRtbD4nO1xuXHRpZiAoZXJyKSB7XG5cdFx0Y29udGVudCA9IGA8aHRtbD48Ym9keT48aDI+U29ycnksIGFuIGFubm95aW5nIGVycm9yIG9jY3VyZWQ8L2gyPjxkaXY+JHsgZXJyIH08L2Rpdj48YSBvbmNsaWNrPVwid2luZG93LmNsb3NlKCk7XCI+Q2xvc2UgV2luZG93PC9hPjwvYm9keT48L2h0bWw+YDtcblx0fVxuXHRyZXMuZW5kKGNvbnRlbnQsICd1dGYtOCcpO1xufTtcblxuY29uc3Qgc2FtbFVybFRvT2JqZWN0ID0gZnVuY3Rpb24odXJsKSB7XG5cdC8vIHJlcS51cmwgd2lsbCBiZSAnL19zYW1sLzxhY3Rpb24+LzxzZXJ2aWNlIG5hbWU+LzxjcmVkZW50aWFsVG9rZW4+J1xuXHRpZiAoIXVybCkge1xuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0Y29uc3Qgc3BsaXRVcmwgPSB1cmwuc3BsaXQoJz8nKTtcblx0Y29uc3Qgc3BsaXRQYXRoID0gc3BsaXRVcmxbMF0uc3BsaXQoJy8nKTtcblxuXHQvLyBBbnkgbm9uLXNhbWwgcmVxdWVzdCB3aWxsIGNvbnRpbnVlIGRvd24gdGhlIGRlZmF1bHRcblx0Ly8gbWlkZGxld2FyZXMuXG5cdGlmIChzcGxpdFBhdGhbMV0gIT09ICdfc2FtbCcpIHtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxuXG5cdGNvbnN0IHJlc3VsdCA9IHtcblx0XHRhY3Rpb25OYW1lOiBzcGxpdFBhdGhbMl0sXG5cdFx0c2VydmljZU5hbWU6IHNwbGl0UGF0aFszXSxcblx0XHRjcmVkZW50aWFsVG9rZW46IHNwbGl0UGF0aFs0XSxcblx0fTtcblx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRjb25zb2xlLmxvZyhyZXN1bHQpO1xuXHR9XG5cdHJldHVybiByZXN1bHQ7XG59O1xuXG5jb25zdCBtaWRkbGV3YXJlID0gZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcblx0Ly8gTWFrZSBzdXJlIHRvIGNhdGNoIGFueSBleGNlcHRpb25zIGJlY2F1c2Ugb3RoZXJ3aXNlIHdlJ2QgY3Jhc2hcblx0Ly8gdGhlIHJ1bm5lclxuXHR0cnkge1xuXHRcdGNvbnN0IHNhbWxPYmplY3QgPSBzYW1sVXJsVG9PYmplY3QocmVxLnVybCk7XG5cdFx0aWYgKCFzYW1sT2JqZWN0IHx8ICFzYW1sT2JqZWN0LnNlcnZpY2VOYW1lKSB7XG5cdFx0XHRuZXh0KCk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKCFzYW1sT2JqZWN0LmFjdGlvbk5hbWUpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignTWlzc2luZyBTQU1MIGFjdGlvbicpO1xuXHRcdH1cblxuXHRcdGlmIChBY2NvdW50cy5zYW1sLnNldHRpbmdzLmRlYnVnKSB7XG5cdFx0XHRjb25zb2xlLmxvZyhBY2NvdW50cy5zYW1sLnNldHRpbmdzLnByb3ZpZGVycyk7XG5cdFx0XHRjb25zb2xlLmxvZyhzYW1sT2JqZWN0LnNlcnZpY2VOYW1lKTtcblx0XHR9XG5cdFx0Y29uc3Qgc2VydmljZSA9IF8uZmluZChBY2NvdW50cy5zYW1sLnNldHRpbmdzLnByb3ZpZGVycywgZnVuY3Rpb24oc2FtbFNldHRpbmcpIHtcblx0XHRcdHJldHVybiBzYW1sU2V0dGluZy5wcm92aWRlciA9PT0gc2FtbE9iamVjdC5zZXJ2aWNlTmFtZTtcblx0XHR9KTtcblxuXHRcdC8vIFNraXAgZXZlcnl0aGluZyBpZiB0aGVyZSdzIG5vIHNlcnZpY2Ugc2V0IGJ5IHRoZSBzYW1sIG1pZGRsZXdhcmVcblx0XHRpZiAoIXNlcnZpY2UpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihgVW5leHBlY3RlZCBTQU1MIHNlcnZpY2UgJHsgc2FtbE9iamVjdC5zZXJ2aWNlTmFtZSB9YCk7XG5cdFx0fVxuXHRcdGxldCBfc2FtbDtcblx0XHRzd2l0Y2ggKHNhbWxPYmplY3QuYWN0aW9uTmFtZSkge1xuXHRcdFx0Y2FzZSAnbWV0YWRhdGEnOlxuXHRcdFx0XHRfc2FtbCA9IG5ldyBTQU1MKHNlcnZpY2UpO1xuXHRcdFx0XHRzZXJ2aWNlLmNhbGxiYWNrVXJsID0gTWV0ZW9yLmFic29sdXRlVXJsKGBfc2FtbC92YWxpZGF0ZS8keyBzZXJ2aWNlLnByb3ZpZGVyIH1gKTtcblx0XHRcdFx0cmVzLndyaXRlSGVhZCgyMDApO1xuXHRcdFx0XHRyZXMud3JpdGUoX3NhbWwuZ2VuZXJhdGVTZXJ2aWNlUHJvdmlkZXJNZXRhZGF0YShzZXJ2aWNlLmNhbGxiYWNrVXJsKSk7XG5cdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdFx0Ly8gY2xvc2VQb3B1cChyZXMpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgJ2xvZ291dCc6XG5cdFx0XHRcdC8vIFRoaXMgaXMgd2hlcmUgd2UgcmVjZWl2ZSBTQU1MIExvZ291dFJlc3BvbnNlXG5cdFx0XHRcdF9zYW1sID0gbmV3IFNBTUwoc2VydmljZSk7XG5cdFx0XHRcdF9zYW1sLnZhbGlkYXRlTG9nb3V0UmVzcG9uc2UocmVxLnF1ZXJ5LlNBTUxSZXNwb25zZSwgZnVuY3Rpb24oZXJyLCByZXN1bHQpIHtcblx0XHRcdFx0XHRpZiAoIWVycikge1xuXHRcdFx0XHRcdFx0Y29uc3QgbG9nT3V0VXNlciA9IGZ1bmN0aW9uKGluUmVzcG9uc2VUbykge1xuXHRcdFx0XHRcdFx0XHRpZiAoQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1Zykge1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBMb2dnaW5nIE91dCB1c2VyIHZpYSBpblJlc3BvbnNlVG8gJHsgaW5SZXNwb25zZVRvIH1gKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRjb25zdCBsb2dnZWRPdXRVc2VyID0gTWV0ZW9yLnVzZXJzLmZpbmQoe1xuXHRcdFx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5zYW1sLmluUmVzcG9uc2VUbyc6IGluUmVzcG9uc2VUbyxcblx0XHRcdFx0XHRcdFx0fSkuZmV0Y2goKTtcblx0XHRcdFx0XHRcdFx0aWYgKGxvZ2dlZE91dFVzZXIubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKEFjY291bnRzLnNhbWwuc2V0dGluZ3MuZGVidWcpIHtcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBGb3VuZCB1c2VyICR7IGxvZ2dlZE91dFVzZXJbMF0uX2lkIH1gKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh7XG5cdFx0XHRcdFx0XHRcdFx0XHRfaWQ6IGxvZ2dlZE91dFVzZXJbMF0uX2lkLFxuXHRcdFx0XHRcdFx0XHRcdH0sIHtcblx0XHRcdFx0XHRcdFx0XHRcdCRzZXQ6IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0J3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucyc6IFtdLFxuXHRcdFx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHtcblx0XHRcdFx0XHRcdFx0XHRcdF9pZDogbG9nZ2VkT3V0VXNlclswXS5faWQsXG5cdFx0XHRcdFx0XHRcdFx0fSwge1xuXHRcdFx0XHRcdFx0XHRcdFx0JHVuc2V0OiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdCdzZXJ2aWNlcy5zYW1sJzogJycsXG5cdFx0XHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0ZvdW5kIG11bHRpcGxlIHVzZXJzIG1hdGNoaW5nIFNBTUwgaW5SZXNwb25zZVRvIGZpZWxkcycpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRmaWJlcihmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bG9nT3V0VXNlcihyZXN1bHQpO1xuXHRcdFx0XHRcdFx0fSkucnVuKCk7XG5cblxuXHRcdFx0XHRcdFx0cmVzLndyaXRlSGVhZCgzMDIsIHtcblx0XHRcdFx0XHRcdFx0TG9jYXRpb246IHJlcS5xdWVyeS5SZWxheVN0YXRlLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vICBlbHNlIHtcblx0XHRcdFx0XHQvLyBcdC8vIFRCRCB0aGlua2luZyBvZiBzdGggbWVhbmluZyBmdWxsLlxuXHRcdFx0XHRcdC8vIH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnc2xvUmVkaXJlY3QnOlxuXHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdC8vIGNyZWRlbnRpYWxUb2tlbiBoZXJlIGlzIHRoZSBTQU1MIExvZ091dCBSZXF1ZXN0IHRoYXQgd2UnbGwgc2VuZCBiYWNrIHRvIElEUFxuXHRcdFx0XHRcdExvY2F0aW9uOiByZXEucXVlcnkucmVkaXJlY3QsXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAnYXV0aG9yaXplJzpcblx0XHRcdFx0c2VydmljZS5jYWxsYmFja1VybCA9IE1ldGVvci5hYnNvbHV0ZVVybChgX3NhbWwvdmFsaWRhdGUvJHsgc2VydmljZS5wcm92aWRlciB9YCk7XG5cdFx0XHRcdHNlcnZpY2UuaWQgPSBzYW1sT2JqZWN0LmNyZWRlbnRpYWxUb2tlbjtcblx0XHRcdFx0X3NhbWwgPSBuZXcgU0FNTChzZXJ2aWNlKTtcblx0XHRcdFx0X3NhbWwuZ2V0QXV0aG9yaXplVXJsKHJlcSwgZnVuY3Rpb24oZXJyLCB1cmwpIHtcblx0XHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VuYWJsZSB0byBnZW5lcmF0ZSBhdXRob3JpemUgdXJsJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJlcy53cml0ZUhlYWQoMzAyLCB7XG5cdFx0XHRcdFx0XHRMb2NhdGlvbjogdXJsLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHJlcy5lbmQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSAndmFsaWRhdGUnOlxuXHRcdFx0XHRfc2FtbCA9IG5ldyBTQU1MKHNlcnZpY2UpO1xuXHRcdFx0XHRBY2NvdW50cy5zYW1sLlJlbGF5U3RhdGUgPSByZXEuYm9keS5SZWxheVN0YXRlO1xuXHRcdFx0XHRfc2FtbC52YWxpZGF0ZVJlc3BvbnNlKHJlcS5ib2R5LlNBTUxSZXNwb25zZSwgcmVxLmJvZHkuUmVsYXlTdGF0ZSwgZnVuY3Rpb24oZXJyLCBwcm9maWxlLyogLCBsb2dnZWRPdXQqLykge1xuXHRcdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgVW5hYmxlIHRvIHZhbGlkYXRlIHJlc3BvbnNlIHVybDogJHsgZXJyIH1gKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCBjcmVkZW50aWFsVG9rZW4gPSAocHJvZmlsZS5pblJlc3BvbnNlVG9JZCAmJiBwcm9maWxlLmluUmVzcG9uc2VUb0lkLnZhbHVlKSB8fCBwcm9maWxlLmluUmVzcG9uc2VUb0lkIHx8IHByb2ZpbGUuSW5SZXNwb25zZVRvIHx8IHNhbWxPYmplY3QuY3JlZGVudGlhbFRva2VuO1xuXHRcdFx0XHRcdGNvbnN0IGxvZ2luUmVzdWx0ID0ge1xuXHRcdFx0XHRcdFx0cHJvZmlsZSxcblx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdGlmICghY3JlZGVudGlhbFRva2VuKSB7XG5cdFx0XHRcdFx0XHQvLyBObyBjcmVkZW50aWFsVG9rZW4gaW4gSWRQLWluaXRpYXRlZCBTU09cblx0XHRcdFx0XHRcdGNvbnN0IHNhbWxfaWRwX2NyZWRlbnRpYWxUb2tlbiA9IFJhbmRvbS5pZCgpO1xuXHRcdFx0XHRcdFx0QWNjb3VudHMuc2FtbC5zdG9yZUNyZWRlbnRpYWwoc2FtbF9pZHBfY3JlZGVudGlhbFRva2VuLCBsb2dpblJlc3VsdCk7XG5cblx0XHRcdFx0XHRcdGNvbnN0IHVybCA9IGAkeyBNZXRlb3IuYWJzb2x1dGVVcmwoJ2hvbWUnKSB9P3NhbWxfaWRwX2NyZWRlbnRpYWxUb2tlbj0keyBzYW1sX2lkcF9jcmVkZW50aWFsVG9rZW4gfWA7XG5cdFx0XHRcdFx0XHRyZXMud3JpdGVIZWFkKDMwMiwge1xuXHRcdFx0XHRcdFx0XHRMb2NhdGlvbjogdXJsLFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXMuZW5kKCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdEFjY291bnRzLnNhbWwuc3RvcmVDcmVkZW50aWFsKGNyZWRlbnRpYWxUb2tlbiwgbG9naW5SZXN1bHQpO1xuXHRcdFx0XHRcdFx0Y2xvc2VQb3B1cChyZXMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBVbmV4cGVjdGVkIFNBTUwgYWN0aW9uICR7IHNhbWxPYmplY3QuYWN0aW9uTmFtZSB9YCk7XG5cblx0XHR9XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGNsb3NlUG9wdXAocmVzLCBlcnIpO1xuXHR9XG59O1xuXG4vLyBMaXN0ZW4gdG8gaW5jb21pbmcgU0FNTCBodHRwIHJlcXVlc3RzXG5XZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZShjb25uZWN0LmJvZHlQYXJzZXIoKSkudXNlKGZ1bmN0aW9uKHJlcSwgcmVzLCBuZXh0KSB7XG5cdC8vIE5lZWQgdG8gY3JlYXRlIGEgZmliZXIgc2luY2Ugd2UncmUgdXNpbmcgc3luY2hyb25vdXMgaHR0cCBjYWxscyBhbmQgbm90aGluZ1xuXHQvLyBlbHNlIGlzIHdyYXBwaW5nIHRoaXMgaW4gYSBmaWJlciBhdXRvbWF0aWNhbGx5XG5cdGZpYmVyKGZ1bmN0aW9uKCkge1xuXHRcdG1pZGRsZXdhcmUocmVxLCByZXMsIG5leHQpO1xuXHR9KS5ydW4oKTtcbn0pO1xuIiwiLyogZ2xvYmFscyBTQU1MOnRydWUgKi9cblxuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQgeG1sQ3J5cHRvIGZyb20gJ3htbC1jcnlwdG8nO1xuaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuaW1wb3J0IHhtbGRvbSBmcm9tICd4bWxkb20nO1xuaW1wb3J0IHF1ZXJ5c3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcbmltcG9ydCB4bWxidWlsZGVyIGZyb20gJ3htbGJ1aWxkZXInO1xuaW1wb3J0IGFycmF5MnN0cmluZyBmcm9tICdhcnJheWJ1ZmZlci10by1zdHJpbmcnO1xuXG4vLyB2YXIgcHJlZml4TWF0Y2ggPSBuZXcgUmVnRXhwKC8oPyF4bWxucyleLio6Lyk7XG5cblxuU0FNTCA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0dGhpcy5vcHRpb25zID0gdGhpcy5pbml0aWFsaXplKG9wdGlvbnMpO1xufTtcblxuZnVuY3Rpb24gZGVidWdMb2coLi4uYXJncykge1xuXHRpZiAoTWV0ZW9yLnNldHRpbmdzLmRlYnVnKSB7XG5cdFx0Y29uc29sZS5sb2cuYXBwbHkodGhpcywgYXJncyk7XG5cdH1cbn1cblxuLy8gdmFyIHN0cmlwUHJlZml4ID0gZnVuY3Rpb24oc3RyKSB7XG4vLyBcdHJldHVybiBzdHIucmVwbGFjZShwcmVmaXhNYXRjaCwgJycpO1xuLy8gfTtcblxuU0FNTC5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKG9wdGlvbnMpIHtcblx0aWYgKCFvcHRpb25zKSB7XG5cdFx0b3B0aW9ucyA9IHt9O1xuXHR9XG5cblx0aWYgKCFvcHRpb25zLnByb3RvY29sKSB7XG5cdFx0b3B0aW9ucy5wcm90b2NvbCA9ICdodHRwczovLyc7XG5cdH1cblxuXHRpZiAoIW9wdGlvbnMucGF0aCkge1xuXHRcdG9wdGlvbnMucGF0aCA9ICcvc2FtbC9jb25zdW1lJztcblx0fVxuXG5cdGlmICghb3B0aW9ucy5pc3N1ZXIpIHtcblx0XHRvcHRpb25zLmlzc3VlciA9ICdvbmVsb2dpbl9zYW1sJztcblx0fVxuXG5cdGlmIChvcHRpb25zLmlkZW50aWZpZXJGb3JtYXQgPT09IHVuZGVmaW5lZCkge1xuXHRcdG9wdGlvbnMuaWRlbnRpZmllckZvcm1hdCA9ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoxLjE6bmFtZWlkLWZvcm1hdDplbWFpbEFkZHJlc3MnO1xuXHR9XG5cblx0aWYgKG9wdGlvbnMuYXV0aG5Db250ZXh0ID09PSB1bmRlZmluZWQpIHtcblx0XHRvcHRpb25zLmF1dGhuQ29udGV4dCA9ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YWM6Y2xhc3NlczpQYXNzd29yZFByb3RlY3RlZFRyYW5zcG9ydCc7XG5cdH1cblxuXHRyZXR1cm4gb3B0aW9ucztcbn07XG5cblNBTUwucHJvdG90eXBlLmdlbmVyYXRlVW5pcXVlSUQgPSBmdW5jdGlvbigpIHtcblx0Y29uc3QgY2hhcnMgPSAnYWJjZGVmMDEyMzQ1Njc4OSc7XG5cdGxldCB1bmlxdWVJRCA9ICdpZC0nO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IDIwOyBpKyspIHtcblx0XHR1bmlxdWVJRCArPSBjaGFycy5zdWJzdHIoTWF0aC5mbG9vcigoTWF0aC5yYW5kb20oKSAqIDE1KSksIDEpO1xuXHR9XG5cdHJldHVybiB1bmlxdWVJRDtcbn07XG5cblNBTUwucHJvdG90eXBlLmdlbmVyYXRlSW5zdGFudCA9IGZ1bmN0aW9uKCkge1xuXHRyZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xufTtcblxuU0FNTC5wcm90b3R5cGUuc2lnblJlcXVlc3QgPSBmdW5jdGlvbih4bWwpIHtcblx0Y29uc3Qgc2lnbmVyID0gY3J5cHRvLmNyZWF0ZVNpZ24oJ1JTQS1TSEExJyk7XG5cdHNpZ25lci51cGRhdGUoeG1sKTtcblx0cmV0dXJuIHNpZ25lci5zaWduKHRoaXMub3B0aW9ucy5wcml2YXRlS2V5LCAnYmFzZTY0Jyk7XG59O1xuXG5TQU1MLnByb3RvdHlwZS5nZW5lcmF0ZUF1dGhvcml6ZVJlcXVlc3QgPSBmdW5jdGlvbihyZXEpIHtcblx0bGV0IGlkID0gYF8keyB0aGlzLmdlbmVyYXRlVW5pcXVlSUQoKSB9YDtcblx0Y29uc3QgaW5zdGFudCA9IHRoaXMuZ2VuZXJhdGVJbnN0YW50KCk7XG5cblx0Ly8gUG9zdC1hdXRoIGRlc3RpbmF0aW9uXG5cdGxldCBjYWxsYmFja1VybDtcblx0aWYgKHRoaXMub3B0aW9ucy5jYWxsYmFja1VybCkge1xuXHRcdGNhbGxiYWNrVXJsID0gdGhpcy5vcHRpb25zLmNhbGxiYWNrVXJsO1xuXHR9IGVsc2Uge1xuXHRcdGNhbGxiYWNrVXJsID0gdGhpcy5vcHRpb25zLnByb3RvY29sICsgcmVxLmhlYWRlcnMuaG9zdCArIHRoaXMub3B0aW9ucy5wYXRoO1xuXHR9XG5cblx0aWYgKHRoaXMub3B0aW9ucy5pZCkge1xuXHRcdGlkID0gdGhpcy5vcHRpb25zLmlkO1xuXHR9XG5cblx0bGV0IHJlcXVlc3QgPVxuXHRcdGA8c2FtbHA6QXV0aG5SZXF1ZXN0IHhtbG5zOnNhbWxwPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sXCIgSUQ9XCIkeyBpZCB9XCIgVmVyc2lvbj1cIjIuMFwiIElzc3VlSW5zdGFudD1cIiR7IGluc3RhbnQgfVwiIFByb3RvY29sQmluZGluZz1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpiaW5kaW5nczpIVFRQLVBPU1RcIiBBc3NlcnRpb25Db25zdW1lclNlcnZpY2VVUkw9XCIkeyBjYWxsYmFja1VybCB9XCIgRGVzdGluYXRpb249XCIke1xuXHRcdFx0dGhpcy5vcHRpb25zLmVudHJ5UG9pbnQgfVwiPmAgK1xuXHRcdGA8c2FtbDpJc3N1ZXIgeG1sbnM6c2FtbD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb25cIj4keyB0aGlzLm9wdGlvbnMuaXNzdWVyIH08L3NhbWw6SXNzdWVyPlxcbmA7XG5cblx0aWYgKHRoaXMub3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0KSB7XG5cdFx0cmVxdWVzdCArPSBgPHNhbWxwOk5hbWVJRFBvbGljeSB4bWxuczpzYW1scD1cInVybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbFwiIEZvcm1hdD1cIiR7IHRoaXMub3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0IH1cIiBBbGxvd0NyZWF0ZT1cInRydWVcIj48L3NhbWxwOk5hbWVJRFBvbGljeT5cXG5gO1xuXHR9XG5cblx0cmVxdWVzdCArPVxuXHRcdCc8c2FtbHA6UmVxdWVzdGVkQXV0aG5Db250ZXh0IHhtbG5zOnNhbWxwPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sXCIgQ29tcGFyaXNvbj1cImV4YWN0XCI+JyArXG5cdFx0JzxzYW1sOkF1dGhuQ29udGV4dENsYXNzUmVmIHhtbG5zOnNhbWw9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uXCI+dXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFjOmNsYXNzZXM6UGFzc3dvcmRQcm90ZWN0ZWRUcmFuc3BvcnQ8L3NhbWw6QXV0aG5Db250ZXh0Q2xhc3NSZWY+PC9zYW1scDpSZXF1ZXN0ZWRBdXRobkNvbnRleHQ+XFxuJyArXG5cdFx0Jzwvc2FtbHA6QXV0aG5SZXF1ZXN0Pic7XG5cblx0cmV0dXJuIHJlcXVlc3Q7XG59O1xuXG5TQU1MLnByb3RvdHlwZS5nZW5lcmF0ZUxvZ291dFJlcXVlc3QgPSBmdW5jdGlvbihvcHRpb25zKSB7XG5cdC8vIG9wdGlvbnMgc2hvdWxkIGJlIG9mIHRoZSBmb3JtXG5cdC8vIG5hbWVJZDogPG5hbWVJZCBhcyBzdWJtaXR0ZWQgZHVyaW5nIFNBTUwgU1NPPlxuXHQvLyBzZXNzaW9uSW5kZXg6IHNlc3Npb25JbmRleFxuXHQvLyAtLS0gTk8gU0FNTHNldHRpbmdzOiA8TWV0ZW9yLnNldHRpbmcuc2FtbCAgZW50cnkgZm9yIHRoZSBwcm92aWRlciB5b3Ugd2FudCB0byBTTE8gZnJvbVxuXG5cdGNvbnN0IGlkID0gYF8keyB0aGlzLmdlbmVyYXRlVW5pcXVlSUQoKSB9YDtcblx0Y29uc3QgaW5zdGFudCA9IHRoaXMuZ2VuZXJhdGVJbnN0YW50KCk7XG5cblx0bGV0IHJlcXVlc3QgPSBgJHsgJzxzYW1scDpMb2dvdXRSZXF1ZXN0IHhtbG5zOnNhbWxwPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sXCIgJyArXG5cdFx0J3htbG5zOnNhbWw9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uXCIgSUQ9XCInIH0keyBpZCB9XCIgVmVyc2lvbj1cIjIuMFwiIElzc3VlSW5zdGFudD1cIiR7IGluc3RhbnQgfVwiIERlc3RpbmF0aW9uPVwiJHsgdGhpcy5vcHRpb25zLmlkcFNMT1JlZGlyZWN0VVJMIH1cIj5gICtcblx0XHRgPHNhbWw6SXNzdWVyIHhtbG5zOnNhbWw9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uXCI+JHsgdGhpcy5vcHRpb25zLmlzc3VlciB9PC9zYW1sOklzc3Vlcj5gICtcblx0XHRgPHNhbWw6TmFtZUlEIEZvcm1hdD1cIiR7IHRoaXMub3B0aW9ucy5pZGVudGlmaWVyRm9ybWF0IH1cIj4keyBvcHRpb25zLm5hbWVJRCB9PC9zYW1sOk5hbWVJRD5gICtcblx0XHQnPC9zYW1scDpMb2dvdXRSZXF1ZXN0Pic7XG5cblx0cmVxdWVzdCA9IGAkeyAnPHNhbWxwOkxvZ291dFJlcXVlc3QgeG1sbnM6c2FtbHA9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2xcIiAgJyArXG5cdFx0J0lEPVwiJyB9JHsgaWQgfVwiIGAgK1xuXHRcdCdWZXJzaW9uPVwiMi4wXCIgJyArXG5cdFx0YElzc3VlSW5zdGFudD1cIiR7IGluc3RhbnQgfVwiIGAgK1xuXHRcdGBEZXN0aW5hdGlvbj1cIiR7IHRoaXMub3B0aW9ucy5pZHBTTE9SZWRpcmVjdFVSTCB9XCIgYCArXG5cdFx0Jz4nICtcblx0XHRgPHNhbWw6SXNzdWVyIHhtbG5zOnNhbWw9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uXCI+JHsgdGhpcy5vcHRpb25zLmlzc3VlciB9PC9zYW1sOklzc3Vlcj5gICtcblx0XHQnPHNhbWw6TmFtZUlEIHhtbG5zOnNhbWw9XCJ1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uXCIgJyArXG5cdFx0J05hbWVRdWFsaWZpZXI9XCJodHRwOi8vaWQuaW5pdDgubmV0OjgwODAvb3BlbmFtXCIgJyArXG5cdFx0YFNQTmFtZVF1YWxpZmllcj1cIiR7IHRoaXMub3B0aW9ucy5pc3N1ZXIgfVwiIGAgK1xuXHRcdGBGb3JtYXQ9XCIkeyB0aGlzLm9wdGlvbnMuaWRlbnRpZmllckZvcm1hdCB9XCI+JHtcblx0XHRcdG9wdGlvbnMubmFtZUlEIH08L3NhbWw6TmFtZUlEPmAgK1xuXHRcdGA8c2FtbHA6U2Vzc2lvbkluZGV4IHhtbG5zOnNhbWxwPVwidXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sXCI+JHsgb3B0aW9ucy5zZXNzaW9uSW5kZXggfTwvc2FtbHA6U2Vzc2lvbkluZGV4PmAgK1xuXHRcdCc8L3NhbWxwOkxvZ291dFJlcXVlc3Q+JztcblxuXHRkZWJ1Z0xvZygnLS0tLS0tLSBTQU1MIExvZ291dCByZXF1ZXN0IC0tLS0tLS0tLS0tJyk7XG5cdGRlYnVnTG9nKHJlcXVlc3QpO1xuXG5cdHJldHVybiB7XG5cdFx0cmVxdWVzdCxcblx0XHRpZCxcblx0fTtcbn07XG5cblNBTUwucHJvdG90eXBlLnJlcXVlc3RUb1VybCA9IGZ1bmN0aW9uKHJlcXVlc3QsIG9wZXJhdGlvbiwgY2FsbGJhY2spIHtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdHpsaWIuZGVmbGF0ZVJhdyhyZXF1ZXN0LCBmdW5jdGlvbihlcnIsIGJ1ZmZlcikge1xuXHRcdGlmIChlcnIpIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhlcnIpO1xuXHRcdH1cblxuXHRcdGNvbnN0IGJhc2U2NCA9IGJ1ZmZlci50b1N0cmluZygnYmFzZTY0Jyk7XG5cdFx0bGV0IHRhcmdldCA9IHNlbGYub3B0aW9ucy5lbnRyeVBvaW50O1xuXG5cdFx0aWYgKG9wZXJhdGlvbiA9PT0gJ2xvZ291dCcpIHtcblx0XHRcdGlmIChzZWxmLm9wdGlvbnMuaWRwU0xPUmVkaXJlY3RVUkwpIHtcblx0XHRcdFx0dGFyZ2V0ID0gc2VsZi5vcHRpb25zLmlkcFNMT1JlZGlyZWN0VVJMO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0YXJnZXQuaW5kZXhPZignPycpID4gMCkge1xuXHRcdFx0dGFyZ2V0ICs9ICcmJztcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGFyZ2V0ICs9ICc/Jztcblx0XHR9XG5cblx0XHQvLyBUQkQuIFdlIHNob3VsZCByZWFsbHkgaW5jbHVkZSBhIHByb3BlciBSZWxheVN0YXRlIGhlcmVcblx0XHRsZXQgcmVsYXlTdGF0ZTtcblx0XHRpZiAob3BlcmF0aW9uID09PSAnbG9nb3V0Jykge1xuXHRcdFx0Ly8gaW4gY2FzZSBvZiBsb2dvdXQgd2Ugd2FudCB0byBiZSByZWRpcmVjdGVkIGJhY2sgdG8gdGhlIE1ldGVvciBhcHAuXG5cdFx0XHRyZWxheVN0YXRlID0gTWV0ZW9yLmFic29sdXRlVXJsKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJlbGF5U3RhdGUgPSBzZWxmLm9wdGlvbnMucHJvdmlkZXI7XG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2FtbFJlcXVlc3QgPSB7XG5cdFx0XHRTQU1MUmVxdWVzdDogYmFzZTY0LFxuXHRcdFx0UmVsYXlTdGF0ZTogcmVsYXlTdGF0ZSxcblx0XHR9O1xuXG5cdFx0aWYgKHNlbGYub3B0aW9ucy5wcml2YXRlQ2VydCkge1xuXHRcdFx0c2FtbFJlcXVlc3QuU2lnQWxnID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvMDkveG1sZHNpZyNyc2Etc2hhMSc7XG5cdFx0XHRzYW1sUmVxdWVzdC5TaWduYXR1cmUgPSBzZWxmLnNpZ25SZXF1ZXN0KHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShzYW1sUmVxdWVzdCkpO1xuXHRcdH1cblxuXHRcdHRhcmdldCArPSBxdWVyeXN0cmluZy5zdHJpbmdpZnkoc2FtbFJlcXVlc3QpO1xuXG5cdFx0ZGVidWdMb2coYHJlcXVlc3RUb1VybDogJHsgdGFyZ2V0IH1gKTtcblxuXHRcdGlmIChvcGVyYXRpb24gPT09ICdsb2dvdXQnKSB7XG5cdFx0XHQvLyBpbiBjYXNlIG9mIGxvZ291dCB3ZSB3YW50IHRvIGJlIHJlZGlyZWN0ZWQgYmFjayB0byB0aGUgTWV0ZW9yIGFwcC5cblx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCB0YXJnZXQpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdGNhbGxiYWNrKG51bGwsIHRhcmdldCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cblNBTUwucHJvdG90eXBlLmdldEF1dGhvcml6ZVVybCA9IGZ1bmN0aW9uKHJlcSwgY2FsbGJhY2spIHtcblx0Y29uc3QgcmVxdWVzdCA9IHRoaXMuZ2VuZXJhdGVBdXRob3JpemVSZXF1ZXN0KHJlcSk7XG5cblx0dGhpcy5yZXF1ZXN0VG9VcmwocmVxdWVzdCwgJ2F1dGhvcml6ZScsIGNhbGxiYWNrKTtcbn07XG5cblNBTUwucHJvdG90eXBlLmdldExvZ291dFVybCA9IGZ1bmN0aW9uKHJlcSwgY2FsbGJhY2spIHtcblx0Y29uc3QgcmVxdWVzdCA9IHRoaXMuZ2VuZXJhdGVMb2dvdXRSZXF1ZXN0KHJlcSk7XG5cblx0dGhpcy5yZXF1ZXN0VG9VcmwocmVxdWVzdCwgJ2xvZ291dCcsIGNhbGxiYWNrKTtcbn07XG5cblNBTUwucHJvdG90eXBlLmNlcnRUb1BFTSA9IGZ1bmN0aW9uKGNlcnQpIHtcblx0Y2VydCA9IGNlcnQubWF0Y2goLy57MSw2NH0vZykuam9pbignXFxuJyk7XG5cdGNlcnQgPSBgLS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tXFxuJHsgY2VydCB9YDtcblx0Y2VydCA9IGAkeyBjZXJ0IH1cXG4tLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tXFxuYDtcblx0cmV0dXJuIGNlcnQ7XG59O1xuXG4vLyBmdW5jdGlvbmZpbmRDaGlsZHMobm9kZSwgbG9jYWxOYW1lLCBuYW1lc3BhY2UpIHtcbi8vIFx0dmFyIHJlcyA9IFtdO1xuLy8gXHRmb3IgKHZhciBpID0gMDsgaSA8IG5vZGUuY2hpbGROb2Rlcy5sZW5ndGg7IGkrKykge1xuLy8gXHRcdHZhciBjaGlsZCA9IG5vZGUuY2hpbGROb2Rlc1tpXTtcbi8vIFx0XHRpZiAoY2hpbGQubG9jYWxOYW1lID09PSBsb2NhbE5hbWUgJiYgKGNoaWxkLm5hbWVzcGFjZVVSSSA9PT0gbmFtZXNwYWNlIHx8ICFuYW1lc3BhY2UpKSB7XG4vLyBcdFx0XHRyZXMucHVzaChjaGlsZCk7XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdHJldHVybiByZXM7XG4vLyB9XG5cblNBTUwucHJvdG90eXBlLnZhbGlkYXRlU3RhdHVzID0gZnVuY3Rpb24oZG9jKSB7XG5cdGxldCBzdWNjZXNzU3RhdHVzID0gZmFsc2U7XG5cdGxldCBzdGF0dXMgPSAnJztcblx0bGV0IG1lc3NhZ2VUZXh0ID0gJyc7XG5cdGNvbnN0IHN0YXR1c05vZGVzID0gZG9jLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDpwcm90b2NvbCcsICdTdGF0dXNDb2RlJyk7XG5cblx0aWYgKHN0YXR1c05vZGVzLmxlbmd0aCkge1xuXG5cdFx0Y29uc3Qgc3RhdHVzTm9kZSA9IHN0YXR1c05vZGVzWzBdO1xuXHRcdGNvbnN0IHN0YXR1c01lc3NhZ2UgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJywgJ1N0YXR1c01lc3NhZ2UnKVswXTtcblxuXHRcdGlmIChzdGF0dXNNZXNzYWdlKSB7XG5cdFx0XHRtZXNzYWdlVGV4dCA9IHN0YXR1c01lc3NhZ2UuZmlyc3RDaGlsZC50ZXh0Q29udGVudDtcblx0XHR9XG5cblx0XHRzdGF0dXMgPSBzdGF0dXNOb2RlLmdldEF0dHJpYnV0ZSgnVmFsdWUnKTtcblxuXHRcdGlmIChzdGF0dXMgPT09ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6c3RhdHVzOlN1Y2Nlc3MnKSB7XG5cdFx0XHRzdWNjZXNzU3RhdHVzID0gdHJ1ZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIHtcblx0XHRzdWNjZXNzOiBzdWNjZXNzU3RhdHVzLFxuXHRcdG1lc3NhZ2U6IG1lc3NhZ2VUZXh0LFxuXHRcdHN0YXR1c0NvZGU6IHN0YXR1cyxcblx0fTtcbn07XG5cblNBTUwucHJvdG90eXBlLnZhbGlkYXRlU2lnbmF0dXJlID0gZnVuY3Rpb24oeG1sLCBjZXJ0KSB7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdGNvbnN0IGRvYyA9IG5ldyB4bWxkb20uRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKHhtbCk7XG5cdGNvbnN0IHNpZ25hdHVyZSA9IHhtbENyeXB0by54cGF0aChkb2MsICcvLypbbG9jYWwtbmFtZSguKT1cXCdTaWduYXR1cmVcXCcgYW5kIG5hbWVzcGFjZS11cmkoLik9XFwnaHR0cDovL3d3dy53My5vcmcvMjAwMC8wOS94bWxkc2lnI1xcJ10nKVswXTtcblxuXHRjb25zdCBzaWcgPSBuZXcgeG1sQ3J5cHRvLlNpZ25lZFhtbCgpO1xuXG5cdHNpZy5rZXlJbmZvUHJvdmlkZXIgPSB7XG5cdFx0Z2V0S2V5SW5mbygvKiBrZXkqLykge1xuXHRcdFx0cmV0dXJuICc8WDUwOURhdGE+PC9YNTA5RGF0YT4nO1xuXHRcdH0sXG5cdFx0Z2V0S2V5KC8qIGtleUluZm8qLykge1xuXHRcdFx0cmV0dXJuIHNlbGYuY2VydFRvUEVNKGNlcnQpO1xuXHRcdH0sXG5cdH07XG5cblx0c2lnLmxvYWRTaWduYXR1cmUoc2lnbmF0dXJlKTtcblxuXHRyZXR1cm4gc2lnLmNoZWNrU2lnbmF0dXJlKHhtbCk7XG59O1xuXG5TQU1MLnByb3RvdHlwZS52YWxpZGF0ZUxvZ291dFJlc3BvbnNlID0gZnVuY3Rpb24oc2FtbFJlc3BvbnNlLCBjYWxsYmFjaykge1xuXHRjb25zdCBzZWxmID0gdGhpcztcblx0Y29uc3QgY29tcHJlc3NlZFNBTUxSZXNwb25zZSA9IG5ldyBCdWZmZXIoc2FtbFJlc3BvbnNlLCAnYmFzZTY0Jyk7XG5cdHpsaWIuaW5mbGF0ZVJhdyhjb21wcmVzc2VkU0FNTFJlc3BvbnNlLCBmdW5jdGlvbihlcnIsIGRlY29kZWQpIHtcblx0XHRpZiAoZXJyKSB7XG5cdFx0XHRkZWJ1Z0xvZyhgRXJyb3Igd2hpbGUgaW5mbGF0aW5nLiAkeyBlcnIgfWApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRkZWJ1Z0xvZyhgY29uc3RydWN0aW5nIG5ldyBET00gcGFyc2VyOiAkeyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZGVjb2RlZCkgfWApO1xuXHRcdFx0ZGVidWdMb2coYD4+Pj4gJHsgZGVjb2RlZCB9YCk7XG5cdFx0XHRjb25zdCBkb2MgPSBuZXcgeG1sZG9tLkRPTVBhcnNlcigpLnBhcnNlRnJvbVN0cmluZyhhcnJheTJzdHJpbmcoZGVjb2RlZCksICd0ZXh0L3htbCcpO1xuXHRcdFx0aWYgKGRvYykge1xuXHRcdFx0XHRjb25zdCByZXNwb25zZSA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wnLCAnTG9nb3V0UmVzcG9uc2UnKVswXTtcblx0XHRcdFx0aWYgKHJlc3BvbnNlKSB7XG5cblx0XHRcdFx0XHQvLyBUQkQuIENoZWNrIGlmIHRoaXMgbXNnIGNvcnJlc3BvbmRzIHRvIG9uZSB3ZSBzZW50XG5cdFx0XHRcdFx0bGV0IGluUmVzcG9uc2VUbztcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0aW5SZXNwb25zZVRvID0gcmVzcG9uc2UuZ2V0QXR0cmlidXRlKCdJblJlc3BvbnNlVG8nKTtcblx0XHRcdFx0XHRcdGRlYnVnTG9nKGBJbiBSZXNwb25zZSB0bzogJHsgaW5SZXNwb25zZVRvIH1gKTtcblx0XHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0XHRpZiAoTWV0ZW9yLnNldHRpbmdzLmRlYnVnKSB7XG5cdFx0XHRcdFx0XHRcdGRlYnVnTG9nKGBDYXVnaHQgZXJyb3I6ICR7IGUgfWApO1xuXHRcdFx0XHRcdFx0XHRjb25zdCBtc2cgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJywgJ1N0YXR1c01lc3NhZ2UnKTtcblx0XHRcdFx0XHRcdFx0ZGVidWdMb2coYFVuZXhwZWN0ZWQgbXNnIGZyb20gSURQLiBEb2VzIHlvdXIgc2Vzc2lvbiBzdGlsbCBleGlzdCBhdCBJRFA/IElkcCByZXR1cm5lZDogXFxuICR7IG1zZyB9YCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Y29uc3Qgc3RhdHVzVmFsaWRhdGVPYmogPSBzZWxmLnZhbGlkYXRlU3RhdHVzKGRvYyk7XG5cblx0XHRcdFx0XHRpZiAoc3RhdHVzVmFsaWRhdGVPYmouc3VjY2Vzcykge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgaW5SZXNwb25zZVRvKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2soJ0Vycm9yLiBMb2dvdXQgbm90IGNvbmZpcm1lZCBieSBJRFAnLCBudWxsKTtcblxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRjYWxsYmFjaygnTm8gUmVzcG9uc2UgRm91bmQnLCBudWxsKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHR9KTtcbn07XG5cblNBTUwucHJvdG90eXBlLm1hcEF0dHJpYnV0ZXMgPSBmdW5jdGlvbihhdHRyaWJ1dGVTdGF0ZW1lbnQsIHByb2ZpbGUpIHtcblx0ZGVidWdMb2coYEF0dHJpYnV0ZSBTdGF0ZW1lbnQgZm91bmQgaW4gU0FNTCByZXNwb25zZTogJHsgYXR0cmlidXRlU3RhdGVtZW50IH1gKTtcblx0Y29uc3QgYXR0cmlidXRlcyA9IGF0dHJpYnV0ZVN0YXRlbWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YXNzZXJ0aW9uJywgJ0F0dHJpYnV0ZScpO1xuXHRkZWJ1Z0xvZyhgQXR0cmlidXRlcyB3aWxsIGJlIHByb2Nlc3NlZDogJHsgYXR0cmlidXRlcy5sZW5ndGggfWApO1xuXG5cdGlmIChhdHRyaWJ1dGVzKSB7XG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhdHRyaWJ1dGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjb25zdCB2YWx1ZXMgPSBhdHRyaWJ1dGVzW2ldLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnQXR0cmlidXRlVmFsdWUnKTtcblx0XHRcdGxldCB2YWx1ZTtcblx0XHRcdGlmICh2YWx1ZXMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRcdHZhbHVlID0gdmFsdWVzWzBdLnRleHRDb250ZW50O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFsdWUgPSBbXTtcblx0XHRcdFx0Zm9yIChsZXQgaiA9IDA7aiA8IHZhbHVlcy5sZW5ndGg7aisrKSB7XG5cdFx0XHRcdFx0dmFsdWUucHVzaCh2YWx1ZXNbal0udGV4dENvbnRlbnQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdGNvbnN0IGtleSA9IGF0dHJpYnV0ZXNbaV0uZ2V0QXR0cmlidXRlKCdOYW1lJyk7XG5cblx0XHRcdGRlYnVnTG9nKGBOYW1lOiAgJHsgYXR0cmlidXRlc1tpXSB9YCk7XG5cdFx0XHRkZWJ1Z0xvZyhgQWRkaW5nIGF0dHJpYnV0ZSBmcm9tIFNBTUwgcmVzcG9uc2UgdG8gcHJvZmlsZTogJHsga2V5IH0gPSAkeyB2YWx1ZSB9YCk7XG5cdFx0XHRwcm9maWxlW2tleV0gPSB2YWx1ZTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0ZGVidWdMb2coJ05vIEF0dHJpYnV0ZXMgZm91bmQgaW4gU0FNTCBhdHRyaWJ1dGUgc3RhdGVtZW50LicpO1xuXHR9XG5cblx0aWYgKCFwcm9maWxlLm1haWwgJiYgcHJvZmlsZVsndXJuOm9pZDowLjkuMjM0Mi4xOTIwMDMwMC4xMDAuMS4zJ10pIHtcblx0XHQvLyBTZWUgaHR0cDovL3d3dy5pbmNvbW1vbmZlZGVyYXRpb24ub3JnL2F0dHJpYnV0ZXN1bW1hcnkuaHRtbCBmb3IgZGVmaW5pdGlvbiBvZiBhdHRyaWJ1dGUgT0lEc1xuXHRcdHByb2ZpbGUubWFpbCA9IHByb2ZpbGVbJ3VybjpvaWQ6MC45LjIzNDIuMTkyMDAzMDAuMTAwLjEuMyddO1xuXHR9XG5cblx0aWYgKCFwcm9maWxlLmVtYWlsICYmIHByb2ZpbGVbJ3VybjpvaWQ6MS4yLjg0MC4xMTM1NDkuMS45LjEnXSkge1xuXHRcdHByb2ZpbGUuZW1haWwgPSBwcm9maWxlWyd1cm46b2lkOjEuMi44NDAuMTEzNTQ5LjEuOS4xJ107XG5cdH1cblxuXHRpZiAoIXByb2ZpbGUuZW1haWwgJiYgcHJvZmlsZS5tYWlsKSB7XG5cdFx0cHJvZmlsZS5lbWFpbCA9IHByb2ZpbGUubWFpbDtcblx0fVxufTtcblxuU0FNTC5wcm90b3R5cGUudmFsaWRhdGVSZXNwb25zZSA9IGZ1bmN0aW9uKHNhbWxSZXNwb25zZSwgcmVsYXlTdGF0ZSwgY2FsbGJhY2spIHtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdGNvbnN0IHhtbCA9IG5ldyBCdWZmZXIoc2FtbFJlc3BvbnNlLCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0ZjgnKTtcblx0Ly8gV2UgY3VycmVudGx5IHVzZSBSZWxheVN0YXRlIHRvIHNhdmUgU0FNTCBwcm92aWRlclxuXHRkZWJ1Z0xvZyhgVmFsaWRhdGluZyByZXNwb25zZSB3aXRoIHJlbGF5IHN0YXRlOiAkeyB4bWwgfWApO1xuXG5cdGNvbnN0IGRvYyA9IG5ldyB4bWxkb20uRE9NUGFyc2VyKCkucGFyc2VGcm9tU3RyaW5nKHhtbCwgJ3RleHQveG1sJyk7XG5cblx0aWYgKGRvYykge1xuXHRcdGRlYnVnTG9nKCdWZXJpZnkgc3RhdHVzJyk7XG5cdFx0Y29uc3Qgc3RhdHVzVmFsaWRhdGVPYmogPSBzZWxmLnZhbGlkYXRlU3RhdHVzKGRvYyk7XG5cblx0XHRpZiAoc3RhdHVzVmFsaWRhdGVPYmouc3VjY2Vzcykge1xuXHRcdFx0ZGVidWdMb2coJ1N0YXR1cyBvaycpO1xuXG5cdFx0XHQvLyBWZXJpZnkgc2lnbmF0dXJlXG5cdFx0XHRkZWJ1Z0xvZygnVmVyaWZ5IHNpZ25hdHVyZScpO1xuXHRcdFx0aWYgKHNlbGYub3B0aW9ucy5jZXJ0ICYmICFzZWxmLnZhbGlkYXRlU2lnbmF0dXJlKHhtbCwgc2VsZi5vcHRpb25zLmNlcnQpKSB7XG5cdFx0XHRcdGRlYnVnTG9nKCdTaWduYXR1cmUgV1JPTkcnKTtcblx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignSW52YWxpZCBzaWduYXR1cmUnKSwgbnVsbCwgZmFsc2UpO1xuXHRcdFx0fVxuXHRcdFx0ZGVidWdMb2coJ1NpZ25hdHVyZSBPSycpO1xuXG5cdFx0XHRjb25zdCByZXNwb25zZSA9IGRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZU5TKCd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6cHJvdG9jb2wnLCAnUmVzcG9uc2UnKVswXTtcblx0XHRcdGlmIChyZXNwb25zZSkge1xuXHRcdFx0XHRkZWJ1Z0xvZygnR290IHJlc3BvbnNlJyk7XG5cblx0XHRcdFx0Y29uc3QgYXNzZXJ0aW9uID0gcmVzcG9uc2UuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbicsICdBc3NlcnRpb24nKVswXTtcblx0XHRcdFx0aWYgKCFhc3NlcnRpb24pIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdNaXNzaW5nIFNBTUwgYXNzZXJ0aW9uJyksIG51bGwsIGZhbHNlKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHByb2ZpbGUgPSB7fTtcblxuXHRcdFx0XHRpZiAocmVzcG9uc2UuaGFzQXR0cmlidXRlKCdJblJlc3BvbnNlVG8nKSkge1xuXHRcdFx0XHRcdHByb2ZpbGUuaW5SZXNwb25zZVRvSWQgPSByZXNwb25zZS5nZXRBdHRyaWJ1dGUoJ0luUmVzcG9uc2VUbycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgaXNzdWVyID0gYXNzZXJ0aW9uLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnSXNzdWVyJylbMF07XG5cdFx0XHRcdGlmIChpc3N1ZXIpIHtcblx0XHRcdFx0XHRwcm9maWxlLmlzc3VlciA9IGlzc3Vlci50ZXh0Q29udGVudDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHN1YmplY3QgPSBhc3NlcnRpb24uZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbicsICdTdWJqZWN0JylbMF07XG5cblx0XHRcdFx0aWYgKHN1YmplY3QpIHtcblx0XHRcdFx0XHRjb25zdCBuYW1lSUQgPSBzdWJqZWN0LmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnTmFtZUlEJylbMF07XG5cdFx0XHRcdFx0aWYgKG5hbWVJRCkge1xuXHRcdFx0XHRcdFx0cHJvZmlsZS5uYW1lSUQgPSBuYW1lSUQudGV4dENvbnRlbnQ7XG5cblx0XHRcdFx0XHRcdGlmIChuYW1lSUQuaGFzQXR0cmlidXRlKCdGb3JtYXQnKSkge1xuXHRcdFx0XHRcdFx0XHRwcm9maWxlLm5hbWVJREZvcm1hdCA9IG5hbWVJRC5nZXRBdHRyaWJ1dGUoJ0Zvcm1hdCcpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGF1dGhuU3RhdGVtZW50ID0gYXNzZXJ0aW9uLmdldEVsZW1lbnRzQnlUYWdOYW1lTlMoJ3VybjpvYXNpczpuYW1lczp0YzpTQU1MOjIuMDphc3NlcnRpb24nLCAnQXV0aG5TdGF0ZW1lbnQnKVswXTtcblxuXHRcdFx0XHRpZiAoYXV0aG5TdGF0ZW1lbnQpIHtcblx0XHRcdFx0XHRpZiAoYXV0aG5TdGF0ZW1lbnQuaGFzQXR0cmlidXRlKCdTZXNzaW9uSW5kZXgnKSkge1xuXG5cdFx0XHRcdFx0XHRwcm9maWxlLnNlc3Npb25JbmRleCA9IGF1dGhuU3RhdGVtZW50LmdldEF0dHJpYnV0ZSgnU2Vzc2lvbkluZGV4Jyk7XG5cdFx0XHRcdFx0XHRkZWJ1Z0xvZyhgU2Vzc2lvbiBJbmRleDogJHsgcHJvZmlsZS5zZXNzaW9uSW5kZXggfWApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRkZWJ1Z0xvZygnTm8gU2Vzc2lvbiBJbmRleCBGb3VuZCcpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWJ1Z0xvZygnTm8gQXV0aE4gU3RhdGVtZW50IGZvdW5kJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBhdHRyaWJ1dGVTdGF0ZW1lbnQgPSBhc3NlcnRpb24uZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmFzc2VydGlvbicsICdBdHRyaWJ1dGVTdGF0ZW1lbnQnKVswXTtcblx0XHRcdFx0aWYgKGF0dHJpYnV0ZVN0YXRlbWVudCkge1xuXHRcdFx0XHRcdHRoaXMubWFwQXR0cmlidXRlcyhhdHRyaWJ1dGVTdGF0ZW1lbnQsIHByb2ZpbGUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGRlYnVnTG9nKCdObyBBdHRyaWJ1dGUgU3RhdGVtZW50IGZvdW5kIGluIFNBTUwgcmVzcG9uc2UuJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoIXByb2ZpbGUuZW1haWwgJiYgcHJvZmlsZS5uYW1lSUQgJiYgcHJvZmlsZS5uYW1lSURGb3JtYXQgJiYgcHJvZmlsZS5uYW1lSURGb3JtYXQuaW5kZXhPZignZW1haWxBZGRyZXNzJykgPj0gMCkge1xuXHRcdFx0XHRcdHByb2ZpbGUuZW1haWwgPSBwcm9maWxlLm5hbWVJRDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IHByb2ZpbGVLZXlzID0gT2JqZWN0LmtleXMocHJvZmlsZSk7XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcHJvZmlsZUtleXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjb25zdCBrZXkgPSBwcm9maWxlS2V5c1tpXTtcblxuXHRcdFx0XHRcdGlmIChrZXkubWF0Y2goL1xcLi8pKSB7XG5cdFx0XHRcdFx0XHRwcm9maWxlW2tleS5yZXBsYWNlKC9cXC4vZywgJy0nKV0gPSBwcm9maWxlW2tleV07XG5cdFx0XHRcdFx0XHRkZWxldGUgcHJvZmlsZVtrZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlYnVnTG9nKGBOYW1lSUQ6ICR7IEpTT04uc3RyaW5naWZ5KHByb2ZpbGUpIH1gKTtcblx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcHJvZmlsZSwgZmFsc2UpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29uc3QgbG9nb3V0UmVzcG9uc2UgPSBkb2MuZ2V0RWxlbWVudHNCeVRhZ05hbWVOUygndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJywgJ0xvZ291dFJlc3BvbnNlJyk7XG5cblx0XHRcdFx0aWYgKGxvZ291dFJlc3BvbnNlKSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgbnVsbCwgdHJ1ZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignVW5rbm93biBTQU1MIHJlc3BvbnNlIG1lc3NhZ2UnKSwgbnVsbCwgZmFsc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoYFN0YXR1cyBpczogICR7IHN0YXR1c1ZhbGlkYXRlT2JqLnN0YXR1c0NvZGUgfWApLCBudWxsLCBmYWxzZSk7XG5cdFx0fVxuXHR9XG59O1xuXG5sZXQgZGVjcnlwdGlvbkNlcnQ7XG5TQU1MLnByb3RvdHlwZS5nZW5lcmF0ZVNlcnZpY2VQcm92aWRlck1ldGFkYXRhID0gZnVuY3Rpb24oY2FsbGJhY2tVcmwpIHtcblxuXHRpZiAoIWRlY3J5cHRpb25DZXJ0KSB7XG5cdFx0ZGVjcnlwdGlvbkNlcnQgPSB0aGlzLm9wdGlvbnMucHJpdmF0ZUNlcnQ7XG5cdH1cblxuXHRpZiAoIXRoaXMub3B0aW9ucy5jYWxsYmFja1VybCAmJiAhY2FsbGJhY2tVcmwpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoXG5cdFx0XHQnVW5hYmxlIHRvIGdlbmVyYXRlIHNlcnZpY2UgcHJvdmlkZXIgbWV0YWRhdGEgd2hlbiBjYWxsYmFja1VybCBvcHRpb24gaXMgbm90IHNldCcpO1xuXHR9XG5cblx0Y29uc3QgbWV0YWRhdGEgPSB7XG5cdFx0RW50aXR5RGVzY3JpcHRvcjoge1xuXHRcdFx0J0B4bWxucyc6ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6bWV0YWRhdGEnLFxuXHRcdFx0J0B4bWxuczpkcyc6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjJyxcblx0XHRcdCdAZW50aXR5SUQnOiB0aGlzLm9wdGlvbnMuaXNzdWVyLFxuXHRcdFx0U1BTU09EZXNjcmlwdG9yOiB7XG5cdFx0XHRcdCdAcHJvdG9jb2xTdXBwb3J0RW51bWVyYXRpb24nOiAndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOnByb3RvY29sJyxcblx0XHRcdFx0U2luZ2xlTG9nb3V0U2VydmljZToge1xuXHRcdFx0XHRcdCdAQmluZGluZyc6ICd1cm46b2FzaXM6bmFtZXM6dGM6U0FNTDoyLjA6YmluZGluZ3M6SFRUUC1SZWRpcmVjdCcsXG5cdFx0XHRcdFx0J0BMb2NhdGlvbic6IGAkeyBNZXRlb3IuYWJzb2x1dGVVcmwoKSB9X3NhbWwvbG9nb3V0LyR7IHRoaXMub3B0aW9ucy5wcm92aWRlciB9L2AsXG5cdFx0XHRcdFx0J0BSZXNwb25zZUxvY2F0aW9uJzogYCR7IE1ldGVvci5hYnNvbHV0ZVVybCgpIH1fc2FtbC9sb2dvdXQvJHsgdGhpcy5vcHRpb25zLnByb3ZpZGVyIH0vYCxcblx0XHRcdFx0fSxcblx0XHRcdFx0TmFtZUlERm9ybWF0OiB0aGlzLm9wdGlvbnMuaWRlbnRpZmllckZvcm1hdCxcblx0XHRcdFx0QXNzZXJ0aW9uQ29uc3VtZXJTZXJ2aWNlOiB7XG5cdFx0XHRcdFx0J0BpbmRleCc6ICcxJyxcblx0XHRcdFx0XHQnQGlzRGVmYXVsdCc6ICd0cnVlJyxcblx0XHRcdFx0XHQnQEJpbmRpbmcnOiAndXJuOm9hc2lzOm5hbWVzOnRjOlNBTUw6Mi4wOmJpbmRpbmdzOkhUVFAtUE9TVCcsXG5cdFx0XHRcdFx0J0BMb2NhdGlvbic6IGNhbGxiYWNrVXJsLFxuXHRcdFx0XHR9LFxuXHRcdFx0fSxcblx0XHR9LFxuXHR9O1xuXG5cdGlmICh0aGlzLm9wdGlvbnMucHJpdmF0ZUtleSkge1xuXHRcdGlmICghZGVjcnlwdGlvbkNlcnQpIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcihcblx0XHRcdFx0J01pc3NpbmcgZGVjcnlwdGlvbkNlcnQgd2hpbGUgZ2VuZXJhdGluZyBtZXRhZGF0YSBmb3IgZGVjcnlwdGluZyBzZXJ2aWNlIHByb3ZpZGVyJyk7XG5cdFx0fVxuXG5cdFx0ZGVjcnlwdGlvbkNlcnQgPSBkZWNyeXB0aW9uQ2VydC5yZXBsYWNlKC8tK0JFR0lOIENFUlRJRklDQVRFLStcXHI/XFxuPy8sICcnKTtcblx0XHRkZWNyeXB0aW9uQ2VydCA9IGRlY3J5cHRpb25DZXJ0LnJlcGxhY2UoLy0rRU5EIENFUlRJRklDQVRFLStcXHI/XFxuPy8sICcnKTtcblx0XHRkZWNyeXB0aW9uQ2VydCA9IGRlY3J5cHRpb25DZXJ0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG5cblx0XHRtZXRhZGF0YS5FbnRpdHlEZXNjcmlwdG9yLlNQU1NPRGVzY3JpcHRvci5LZXlEZXNjcmlwdG9yID0ge1xuXHRcdFx0J2RzOktleUluZm8nOiB7XG5cdFx0XHRcdCdkczpYNTA5RGF0YSc6IHtcblx0XHRcdFx0XHQnZHM6WDUwOUNlcnRpZmljYXRlJzoge1xuXHRcdFx0XHRcdFx0JyN0ZXh0JzogZGVjcnlwdGlvbkNlcnQsXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0XHRFbmNyeXB0aW9uTWV0aG9kOiBbXG5cdFx0XHRcdC8vIHRoaXMgc2hvdWxkIGJlIHRoZSBzZXQgdGhhdCB0aGUgeG1sZW5jIGxpYnJhcnkgc3VwcG9ydHNcblx0XHRcdFx0e1xuXHRcdFx0XHRcdCdAQWxnb3JpdGhtJzogJ2h0dHA6Ly93d3cudzMub3JnLzIwMDEvMDQveG1sZW5jI2FlczI1Ni1jYmMnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0J0BBbGdvcml0aG0nOiAnaHR0cDovL3d3dy53My5vcmcvMjAwMS8wNC94bWxlbmMjYWVzMTI4LWNiYycsXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHtcblx0XHRcdFx0XHQnQEFsZ29yaXRobSc6ICdodHRwOi8vd3d3LnczLm9yZy8yMDAxLzA0L3htbGVuYyN0cmlwbGVkZXMtY2JjJyxcblx0XHRcdFx0fSxcblx0XHRcdF0sXG5cdFx0fTtcblx0fVxuXG5cdHJldHVybiB4bWxidWlsZGVyLmNyZWF0ZShtZXRhZGF0YSkuZW5kKHtcblx0XHRwcmV0dHk6IHRydWUsXG5cdFx0aW5kZW50OiAnICAnLFxuXHRcdG5ld2xpbmU6ICdcXG4nLFxuXHR9KTtcbn07XG4iLCJjb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdzdGVmZm86bWV0ZW9yLWFjY291bnRzLXNhbWwnLCB7XG5cdG1ldGhvZHM6IHtcblx0XHR1cGRhdGVkOiB7XG5cdFx0XHR0eXBlOiAnaW5mbycsXG5cdFx0fSxcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdTQU1MJyk7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0YWRkU2FtbFNlcnZpY2UobmFtZSkge1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1gLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fRW5hYmxlJyxcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X3Byb3ZpZGVyYCwgJ3Byb3ZpZGVyLW5hbWUnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fUHJvdmlkZXInLFxuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fZW50cnlfcG9pbnRgLCAnaHR0cHM6Ly9leGFtcGxlLmNvbS9zaW1wbGVzYW1sL3NhbWwyL2lkcC9TU09TZXJ2aWNlLnBocCcsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9FbnRyeV9wb2ludCcsXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9pZHBfc2xvX3JlZGlyZWN0X3VybGAsICdodHRwczovL2V4YW1wbGUuY29tL3NpbXBsZXNhbWwvc2FtbDIvaWRwL1NpbmdsZUxvZ291dFNlcnZpY2UucGhwJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRncm91cDogJ1NBTUwnLFxuXHRcdFx0c2VjdGlvbjogbmFtZSxcblx0XHRcdGkxOG5MYWJlbDogJ1NBTUxfQ3VzdG9tX0lEUF9TTE9fUmVkaXJlY3RfVVJMJyxcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2lzc3VlcmAsICdodHRwczovL3lvdXItcm9ja2V0LWNoYXQvX3NhbWwvbWV0YWRhdGEvcHJvdmlkZXItbmFtZScsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Jc3N1ZXInLFxuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fY2VydGAsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fQ2VydCcsXG5cdFx0XHRtdWx0aWxpbmU6IHRydWUsXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9wdWJsaWNfY2VydGAsICcnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0bXVsdGlsaW5lOiB0cnVlLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fUHVibGljX0NlcnQnLFxuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fcHJpdmF0ZV9rZXlgLCAnJywge1xuXHRcdFx0dHlwZTogJ3N0cmluZycsXG5cdFx0XHRncm91cDogJ1NBTUwnLFxuXHRcdFx0c2VjdGlvbjogbmFtZSxcblx0XHRcdG11bHRpbGluZTogdHJ1ZSxcblx0XHRcdGkxOG5MYWJlbDogJ1NBTUxfQ3VzdG9tX1ByaXZhdGVfS2V5Jyxcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2J1dHRvbl9sYWJlbF90ZXh0YCwgJycsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fQnV0dG9uX0xhYmVsX1RleHQnLFxuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fYnV0dG9uX2xhYmVsX2NvbG9yYCwgJyNGRkZGRkYnLCB7XG5cdFx0XHR0eXBlOiAnc3RyaW5nJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnQWNjb3VudHNfT0F1dGhfQ3VzdG9tX0J1dHRvbl9MYWJlbF9Db2xvcicsXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9idXR0b25fY29sb3JgLCAnIzEzNjc5QScsIHtcblx0XHRcdHR5cGU6ICdzdHJpbmcnLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdBY2NvdW50c19PQXV0aF9DdXN0b21fQnV0dG9uX0NvbG9yJyxcblx0XHR9KTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmFkZChgU0FNTF9DdXN0b21fJHsgbmFtZSB9X2dlbmVyYXRlX3VzZXJuYW1lYCwgZmFsc2UsIHtcblx0XHRcdHR5cGU6ICdib29sZWFuJyxcblx0XHRcdGdyb3VwOiAnU0FNTCcsXG5cdFx0XHRzZWN0aW9uOiBuYW1lLFxuXHRcdFx0aTE4bkxhYmVsOiAnU0FNTF9DdXN0b21fR2VuZXJhdGVfVXNlcm5hbWUnLFxuXHRcdH0pO1xuXHRcdFJvY2tldENoYXQuc2V0dGluZ3MuYWRkKGBTQU1MX0N1c3RvbV8keyBuYW1lIH1fZGVidWdgLCBmYWxzZSwge1xuXHRcdFx0dHlwZTogJ2Jvb2xlYW4nLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9EZWJ1ZycsXG5cdFx0fSk7XG5cdFx0Um9ja2V0Q2hhdC5zZXR0aW5ncy5hZGQoYFNBTUxfQ3VzdG9tXyR7IG5hbWUgfV9sb2dvdXRfYmVoYXZpb3VyYCwgJ1NBTUwnLCB7XG5cdFx0XHR0eXBlOiAnc2VsZWN0Jyxcblx0XHRcdHZhbHVlczogW1xuXHRcdFx0XHR7IGtleTogJ1NBTUwnLCBpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Mb2dvdXRfQmVoYXZpb3VyX1Rlcm1pbmF0ZV9TQU1MX1Nlc3Npb24nIH0sXG5cdFx0XHRcdHsga2V5OiAnTG9jYWwnLCBpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Mb2dvdXRfQmVoYXZpb3VyX0VuZF9Pbmx5X1JvY2tldENoYXQnIH0sXG5cdFx0XHRdLFxuXHRcdFx0Z3JvdXA6ICdTQU1MJyxcblx0XHRcdHNlY3Rpb246IG5hbWUsXG5cdFx0XHRpMThuTGFiZWw6ICdTQU1MX0N1c3RvbV9Mb2dvdXRfQmVoYXZpb3VyJyxcblx0XHR9KTtcblx0fSxcbn0pO1xuXG5jb25zdCBnZXRTYW1sQ29uZmlncyA9IGZ1bmN0aW9uKHNlcnZpY2UpIHtcblx0cmV0dXJuIHtcblx0XHRidXR0b25MYWJlbFRleHQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2J1dHRvbl9sYWJlbF90ZXh0YCksXG5cdFx0YnV0dG9uTGFiZWxDb2xvcjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fYnV0dG9uX2xhYmVsX2NvbG9yYCksXG5cdFx0YnV0dG9uQ29sb3I6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2J1dHRvbl9jb2xvcmApLFxuXHRcdGNsaWVudENvbmZpZzoge1xuXHRcdFx0cHJvdmlkZXI6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X3Byb3ZpZGVyYCksXG5cdFx0fSxcblx0XHRlbnRyeVBvaW50OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9lbnRyeV9wb2ludGApLFxuXHRcdGlkcFNMT1JlZGlyZWN0VVJMOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9pZHBfc2xvX3JlZGlyZWN0X3VybGApLFxuXHRcdGdlbmVyYXRlVXNlcm5hbWU6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2dlbmVyYXRlX3VzZXJuYW1lYCksXG5cdFx0ZGVidWc6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2RlYnVnYCksXG5cdFx0aXNzdWVyOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9pc3N1ZXJgKSxcblx0XHRsb2dvdXRCZWhhdmlvdXI6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X2xvZ291dF9iZWhhdmlvdXJgKSxcblx0XHRzZWNyZXQ6IHtcblx0XHRcdHByaXZhdGVLZXk6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KGAkeyBzZXJ2aWNlLmtleSB9X3ByaXZhdGVfa2V5YCksXG5cdFx0XHRwdWJsaWNDZXJ0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldChgJHsgc2VydmljZS5rZXkgfV9wdWJsaWNfY2VydGApLFxuXHRcdFx0Y2VydDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoYCR7IHNlcnZpY2Uua2V5IH1fY2VydGApLFxuXHRcdH0sXG5cdH07XG59O1xuXG5jb25zdCBkZWJvdW5jZSA9IChmbiwgZGVsYXkpID0+IHtcblx0bGV0IHRpbWVyID0gbnVsbDtcblx0cmV0dXJuICgpID0+IHtcblx0XHRpZiAodGltZXIgIT0gbnVsbCkge1xuXHRcdFx0TWV0ZW9yLmNsZWFyVGltZW91dCh0aW1lcik7XG5cdFx0fVxuXHRcdHJldHVybiB0aW1lciA9IE1ldGVvci5zZXRUaW1lb3V0KGZuLCBkZWxheSk7XG5cdH07XG59O1xuY29uc3Qgc2VydmljZU5hbWUgPSAnc2FtbCc7XG5cbmNvbnN0IGNvbmZpZ3VyZVNhbWxTZXJ2aWNlID0gZnVuY3Rpb24oc2FtbENvbmZpZ3MpIHtcblx0bGV0IHByaXZhdGVDZXJ0ID0gZmFsc2U7XG5cdGxldCBwcml2YXRlS2V5ID0gZmFsc2U7XG5cdGlmIChzYW1sQ29uZmlncy5zZWNyZXQucHJpdmF0ZUtleSAmJiBzYW1sQ29uZmlncy5zZWNyZXQucHVibGljQ2VydCkge1xuXHRcdHByaXZhdGVLZXkgPSBzYW1sQ29uZmlncy5zZWNyZXQucHJpdmF0ZUtleTtcblx0XHRwcml2YXRlQ2VydCA9IHNhbWxDb25maWdzLnNlY3JldC5wdWJsaWNDZXJ0O1xuXHR9IGVsc2UgaWYgKHNhbWxDb25maWdzLnNlY3JldC5wcml2YXRlS2V5IHx8IHNhbWxDb25maWdzLnNlY3JldC5wdWJsaWNDZXJ0KSB7XG5cdFx0bG9nZ2VyLmVycm9yKCdZb3UgbXVzdCBzcGVjaWZ5IGJvdGggY2VydCBhbmQga2V5IGZpbGVzLicpO1xuXHR9XG5cdC8vIFRPRE86IHRoZSBmdW5jdGlvbiBjb25maWd1cmVTYW1sU2VydmljZSBpcyBjYWxsZWQgbWFueSB0aW1lcyBhbmQgQWNjb3VudHMuc2FtbC5zZXR0aW5ncy5nZW5lcmF0ZVVzZXJuYW1lIGtlZXBzIGp1c3QgdGhlIGxhc3QgdmFsdWVcblx0QWNjb3VudHMuc2FtbC5zZXR0aW5ncy5nZW5lcmF0ZVVzZXJuYW1lID0gc2FtbENvbmZpZ3MuZ2VuZXJhdGVVc2VybmFtZTtcblx0QWNjb3VudHMuc2FtbC5zZXR0aW5ncy5kZWJ1ZyA9IHNhbWxDb25maWdzLmRlYnVnO1xuXG5cdHJldHVybiB7XG5cdFx0cHJvdmlkZXI6IHNhbWxDb25maWdzLmNsaWVudENvbmZpZy5wcm92aWRlcixcblx0XHRlbnRyeVBvaW50OiBzYW1sQ29uZmlncy5lbnRyeVBvaW50LFxuXHRcdGlkcFNMT1JlZGlyZWN0VVJMOiBzYW1sQ29uZmlncy5pZHBTTE9SZWRpcmVjdFVSTCxcblx0XHRpc3N1ZXI6IHNhbWxDb25maWdzLmlzc3Vlcixcblx0XHRjZXJ0OiBzYW1sQ29uZmlncy5zZWNyZXQuY2VydCxcblx0XHRwcml2YXRlQ2VydCxcblx0XHRwcml2YXRlS2V5LFxuXHR9O1xufTtcblxuY29uc3QgdXBkYXRlU2VydmljZXMgPSBkZWJvdW5jZSgoKSA9PiB7XG5cdGNvbnN0IHNlcnZpY2VzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL14oU0FNTF9DdXN0b21fKVthLXpdKyQvaSk7XG5cdEFjY291bnRzLnNhbWwuc2V0dGluZ3MucHJvdmlkZXJzID0gc2VydmljZXMubWFwKChzZXJ2aWNlKSA9PiB7XG5cdFx0aWYgKHNlcnZpY2UudmFsdWUgPT09IHRydWUpIHtcblx0XHRcdGNvbnN0IHNhbWxDb25maWdzID0gZ2V0U2FtbENvbmZpZ3Moc2VydmljZSk7XG5cdFx0XHRsb2dnZXIudXBkYXRlZChzZXJ2aWNlLmtleSk7XG5cdFx0XHRTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy51cHNlcnQoe1xuXHRcdFx0XHRzZXJ2aWNlOiBzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpLFxuXHRcdFx0fSwge1xuXHRcdFx0XHQkc2V0OiBzYW1sQ29uZmlncyxcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIGNvbmZpZ3VyZVNhbWxTZXJ2aWNlKHNhbWxDb25maWdzKTtcblx0XHR9XG5cdFx0cmV0dXJuIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLnJlbW92ZSh7XG5cdFx0XHRzZXJ2aWNlOiBzZXJ2aWNlTmFtZS50b0xvd2VyQ2FzZSgpLFxuXHRcdH0pO1xuXHR9KS5maWx0ZXIoKGUpID0+IGUpO1xufSwgMjAwMCk7XG5cblxuUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoL15TQU1MXy4rLywgdXBkYXRlU2VydmljZXMpO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiBNZXRlb3IuY2FsbCgnYWRkU2FtbFNlcnZpY2UnLCAnRGVmYXVsdCcpKTtcblxuZXhwb3J0IHtcblx0dXBkYXRlU2VydmljZXMsXG5cdGNvbmZpZ3VyZVNhbWxTZXJ2aWNlLFxuXHRnZXRTYW1sQ29uZmlncyxcblx0ZGVib3VuY2UsXG5cdGxvZ2dlcixcbn07XG4iXX0=
