(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Logger = Package['rocketchat:logger'].Logger;
var SystemLogger = Package['rocketchat:logger'].SystemLogger;
var LoggerManager = Package['rocketchat:logger'].LoggerManager;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var slugify = Package['yasaricli:slugify'].slugify;
var ECMAScript = Package.ecmascript.ECMAScript;
var _ = Package.underscore._;
var SHA256 = Package.sha.SHA256;
var Accounts = Package['accounts-base'].Accounts;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:ldap":{"server":{"index.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/index.js                                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
module.watch(require("./loginHandler"));
module.watch(require("./settings"));
module.watch(require("./testConnection"));
module.watch(require("./syncUsers"));
module.watch(require("./sync"));
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"ldap.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/ldap.js                                                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
module.export({
  default: () => LDAP
});
let ldapjs;
module.watch(require("ldapjs"), {
  default(v) {
    ldapjs = v;
  }

}, 0);
let Bunyan;
module.watch(require("bunyan"), {
  default(v) {
    Bunyan = v;
  }

}, 1);
const logger = new Logger('LDAP', {
  sections: {
    connection: 'Connection',
    bind: 'Bind',
    search: 'Search',
    auth: 'Auth'
  }
});

class LDAP {
  constructor() {
    this.ldapjs = ldapjs;
    this.connected = false;
    this.options = {
      host: RocketChat.settings.get('LDAP_Host'),
      port: RocketChat.settings.get('LDAP_Port'),
      Reconnect: RocketChat.settings.get('LDAP_Reconnect'),
      Internal_Log_Level: RocketChat.settings.get('LDAP_Internal_Log_Level'),
      timeout: RocketChat.settings.get('LDAP_Timeout'),
      connect_timeout: RocketChat.settings.get('LDAP_Connect_Timeout'),
      idle_timeout: RocketChat.settings.get('LDAP_Idle_Timeout'),
      encryption: RocketChat.settings.get('LDAP_Encryption'),
      ca_cert: RocketChat.settings.get('LDAP_CA_Cert'),
      reject_unauthorized: RocketChat.settings.get('LDAP_Reject_Unauthorized') || false,
      Authentication: RocketChat.settings.get('LDAP_Authentication'),
      Authentication_UserDN: RocketChat.settings.get('LDAP_Authentication_UserDN'),
      Authentication_Password: RocketChat.settings.get('LDAP_Authentication_Password'),
      BaseDN: RocketChat.settings.get('LDAP_BaseDN'),
      User_Search_Filter: RocketChat.settings.get('LDAP_User_Search_Filter'),
      User_Search_Scope: RocketChat.settings.get('LDAP_User_Search_Scope'),
      User_Search_Field: RocketChat.settings.get('LDAP_User_Search_Field'),
      Search_Page_Size: RocketChat.settings.get('LDAP_Search_Page_Size'),
      Search_Size_Limit: RocketChat.settings.get('LDAP_Search_Size_Limit'),
      group_filter_enabled: RocketChat.settings.get('LDAP_Group_Filter_Enable'),
      group_filter_object_class: RocketChat.settings.get('LDAP_Group_Filter_ObjectClass'),
      group_filter_group_id_attribute: RocketChat.settings.get('LDAP_Group_Filter_Group_Id_Attribute'),
      group_filter_group_member_attribute: RocketChat.settings.get('LDAP_Group_Filter_Group_Member_Attribute'),
      group_filter_group_member_format: RocketChat.settings.get('LDAP_Group_Filter_Group_Member_Format'),
      group_filter_group_name: RocketChat.settings.get('LDAP_Group_Filter_Group_Name'),
      find_user_after_login: RocketChat.settings.get('LDAP_Find_User_After_Login')
    };
  }

  connectSync(...args) {
    if (!this._connectSync) {
      this._connectSync = Meteor.wrapAsync(this.connectAsync, this);
    }

    return this._connectSync(...args);
  }

  searchAllSync(...args) {
    if (!this._searchAllSync) {
      this._searchAllSync = Meteor.wrapAsync(this.searchAllAsync, this);
    }

    return this._searchAllSync(...args);
  }

  connectAsync(callback) {
    logger.connection.info('Init setup');
    let replied = false;
    const connectionOptions = {
      url: `${this.options.host}:${this.options.port}`,
      timeout: this.options.timeout,
      connectTimeout: this.options.connect_timeout,
      idleTimeout: this.options.idle_timeout,
      reconnect: this.options.Reconnect
    };

    if (this.options.Internal_Log_Level !== 'disabled') {
      connectionOptions.log = new Bunyan({
        name: 'ldapjs',
        component: 'client',
        stream: process.stderr,
        level: this.options.Internal_Log_Level
      });
    }

    const tlsOptions = {
      rejectUnauthorized: this.options.reject_unauthorized
    };

    if (this.options.ca_cert && this.options.ca_cert !== '') {
      // Split CA cert into array of strings
      const chainLines = RocketChat.settings.get('LDAP_CA_Cert').split('\n');
      let cert = [];
      const ca = [];
      chainLines.forEach(line => {
        cert.push(line);

        if (line.match(/-END CERTIFICATE-/)) {
          ca.push(cert.join('\n'));
          cert = [];
        }
      });
      tlsOptions.ca = ca;
    }

    if (this.options.encryption === 'ssl') {
      connectionOptions.url = `ldaps://${connectionOptions.url}`;
      connectionOptions.tlsOptions = tlsOptions;
    } else {
      connectionOptions.url = `ldap://${connectionOptions.url}`;
    }

    logger.connection.info('Connecting', connectionOptions.url);
    logger.connection.debug('connectionOptions', connectionOptions);
    this.client = ldapjs.createClient(connectionOptions);
    this.bindSync = Meteor.wrapAsync(this.client.bind, this.client);
    this.client.on('error', error => {
      logger.connection.error('connection', error);

      if (replied === false) {
        replied = true;
        callback(error, null);
      }
    });
    this.client.on('idle', () => {
      logger.search.info('Idle');
      this.disconnect();
    });
    this.client.on('close', () => {
      logger.search.info('Closed');
    });

    if (this.options.encryption === 'tls') {
      // Set host parameter for tls.connect which is used by ldapjs starttls. This shouldn't be needed in newer nodejs versions (e.g v5.6.0).
      // https://github.com/RocketChat/Rocket.Chat/issues/2035
      // https://github.com/mcavage/node-ldapjs/issues/349
      tlsOptions.host = this.options.host;
      logger.connection.info('Starting TLS');
      logger.connection.debug('tlsOptions', tlsOptions);
      this.client.starttls(tlsOptions, null, (error, response) => {
        if (error) {
          logger.connection.error('TLS connection', error);

          if (replied === false) {
            replied = true;
            callback(error, null);
          }

          return;
        }

        logger.connection.info('TLS connected');
        this.connected = true;

        if (replied === false) {
          replied = true;
          callback(null, response);
        }
      });
    } else {
      this.client.on('connect', response => {
        logger.connection.info('LDAP connected');
        this.connected = true;

        if (replied === false) {
          replied = true;
          callback(null, response);
        }
      });
    }

    setTimeout(() => {
      if (replied === false) {
        logger.connection.error('connection time out', connectionOptions.connectTimeout);
        replied = true;
        callback(new Error('Timeout'));
      }
    }, connectionOptions.connectTimeout);
  }

  getUserFilter(username) {
    const filter = [];

    if (this.options.User_Search_Filter !== '') {
      if (this.options.User_Search_Filter[0] === '(') {
        filter.push(`${this.options.User_Search_Filter}`);
      } else {
        filter.push(`(${this.options.User_Search_Filter})`);
      }
    }

    const usernameFilter = this.options.User_Search_Field.split(',').map(item => `(${item}=${username})`);

    if (usernameFilter.length === 0) {
      logger.error('LDAP_LDAP_User_Search_Field not defined');
    } else if (usernameFilter.length === 1) {
      filter.push(`${usernameFilter[0]}`);
    } else {
      filter.push(`(|${usernameFilter.join('')})`);
    }

    return `(&${filter.join('')})`;
  }

  bindIfNecessary() {
    if (this.domainBinded === true) {
      return;
    }

    if (this.options.Authentication !== true) {
      return;
    }

    logger.bind.info('Binding UserDN', this.options.Authentication_UserDN);
    this.bindSync(this.options.Authentication_UserDN, this.options.Authentication_Password);
    this.domainBinded = true;
  }

  searchUsersSync(username, page) {
    this.bindIfNecessary();
    const searchOptions = {
      filter: this.getUserFilter(username),
      scope: this.options.User_Search_Scope || 'sub',
      sizeLimit: this.options.Search_Size_Limit
    };

    if (this.options.Search_Page_Size > 0) {
      searchOptions.paged = {
        pageSize: this.options.Search_Page_Size,
        pagePause: !!page
      };
    }

    logger.search.info('Searching user', username);
    logger.search.debug('searchOptions', searchOptions);
    logger.search.debug('BaseDN', this.options.BaseDN);

    if (page) {
      return this.searchAllPaged(this.options.BaseDN, searchOptions, page);
    }

    return this.searchAllSync(this.options.BaseDN, searchOptions);
  }

  getUserByIdSync(id, attribute) {
    this.bindIfNecessary();
    const Unique_Identifier_Field = RocketChat.settings.get('LDAP_Unique_Identifier_Field').split(',');
    let filter;

    if (attribute) {
      filter = new this.ldapjs.filters.EqualityFilter({
        attribute,
        value: new Buffer(id, 'hex')
      });
    } else {
      const filters = [];
      Unique_Identifier_Field.forEach(item => {
        filters.push(new this.ldapjs.filters.EqualityFilter({
          attribute: item,
          value: new Buffer(id, 'hex')
        }));
      });
      filter = new this.ldapjs.filters.OrFilter({
        filters
      });
    }

    const searchOptions = {
      filter,
      scope: 'sub'
    };
    logger.search.info('Searching by id', id);
    logger.search.debug('search filter', searchOptions.filter.toString());
    logger.search.debug('BaseDN', this.options.BaseDN);
    const result = this.searchAllSync(this.options.BaseDN, searchOptions);

    if (!Array.isArray(result) || result.length === 0) {
      return;
    }

    if (result.length > 1) {
      logger.search.error('Search by id', id, 'returned', result.length, 'records');
    }

    return result[0];
  }

  getUserByUsernameSync(username) {
    this.bindIfNecessary();
    const searchOptions = {
      filter: this.getUserFilter(username),
      scope: this.options.User_Search_Scope || 'sub'
    };
    logger.search.info('Searching user', username);
    logger.search.debug('searchOptions', searchOptions);
    logger.search.debug('BaseDN', this.options.BaseDN);
    const result = this.searchAllSync(this.options.BaseDN, searchOptions);

    if (!Array.isArray(result) || result.length === 0) {
      return;
    }

    if (result.length > 1) {
      logger.search.error('Search by username', username, 'returned', result.length, 'records');
    }

    return result[0];
  }

  isUserInGroup(username, userdn) {
    if (!this.options.group_filter_enabled) {
      return true;
    }

    const filter = ['(&'];

    if (this.options.group_filter_object_class !== '') {
      filter.push(`(objectclass=${this.options.group_filter_object_class})`);
    }

    if (this.options.group_filter_group_member_attribute !== '') {
      filter.push(`(${this.options.group_filter_group_member_attribute}=${this.options.group_filter_group_member_format})`);
    }

    if (this.options.group_filter_group_id_attribute !== '') {
      filter.push(`(${this.options.group_filter_group_id_attribute}=${this.options.group_filter_group_name})`);
    }

    filter.push(')');
    const searchOptions = {
      filter: filter.join('').replace(/#{username}/g, username).replace(/#{userdn}/g, userdn),
      scope: 'sub'
    };
    logger.search.debug('Group filter LDAP:', searchOptions.filter);
    const result = this.searchAllSync(this.options.BaseDN, searchOptions);

    if (!Array.isArray(result) || result.length === 0) {
      return false;
    }

    return true;
  }

  extractLdapEntryData(entry) {
    const values = {
      _raw: entry.raw
    };
    Object.keys(values._raw).forEach(key => {
      const value = values._raw[key];

      if (!['thumbnailPhoto', 'jpegPhoto'].includes(key)) {
        if (value instanceof Buffer) {
          values[key] = value.toString();
        } else {
          values[key] = value;
        }
      }
    });
    return values;
  }

  searchAllPaged(BaseDN, options, page) {
    this.bindIfNecessary();

    const processPage = ({
      entries,
      title,
      end,
      next
    }) => {
      logger.search.info(title); // Force LDAP idle to wait the record processing

      this.client._updateIdle(true);

      page(null, entries, {
        end,
        next: () => {
          // Reset idle timer
          this.client._updateIdle();

          next && next();
        }
      });
    };

    this.client.search(BaseDN, options, (error, res) => {
      if (error) {
        logger.search.error(error);
        page(error);
        return;
      }

      res.on('error', error => {
        logger.search.error(error);
        page(error);
        return;
      });
      let entries = [];
      const internalPageSize = options.paged && options.paged.pageSize > 0 ? options.paged.pageSize * 2 : 500;
      res.on('searchEntry', entry => {
        entries.push(this.extractLdapEntryData(entry));

        if (entries.length >= internalPageSize) {
          processPage({
            entries,
            title: 'Internal Page',
            end: false
          });
          entries = [];
        }
      });
      res.on('page', (result, next) => {
        if (!next) {
          this.client._updateIdle(true);

          processPage({
            entries,
            title: 'Final Page',
            end: true
          });
        } else if (entries.length) {
          logger.search.info('Page');
          processPage({
            entries,
            title: 'Page',
            end: false,
            next
          });
          entries = [];
        }
      });
      res.on('end', () => {
        if (entries.length) {
          processPage({
            entries,
            title: 'Final Page',
            end: true
          });
          entries = [];
        }
      });
    });
  }

  searchAllAsync(BaseDN, options, callback) {
    this.bindIfNecessary();
    this.client.search(BaseDN, options, (error, res) => {
      if (error) {
        logger.search.error(error);
        callback(error);
        return;
      }

      res.on('error', error => {
        logger.search.error(error);
        callback(error);
        return;
      });
      const entries = [];
      res.on('searchEntry', entry => {
        entries.push(this.extractLdapEntryData(entry));
      });
      res.on('end', () => {
        logger.search.info('Search result count', entries.length);
        callback(null, entries);
      });
    });
  }

  authSync(dn, password) {
    logger.auth.info('Authenticating', dn);

    try {
      this.bindSync(dn, password);

      if (this.options.find_user_after_login) {
        const searchOptions = {
          scope: this.options.User_Search_Scope || 'sub'
        };
        const result = this.searchAllSync(dn, searchOptions);

        if (result.length === 0) {
          logger.auth.info('Bind successful but user was not found via search', dn, searchOptions);
          return false;
        }
      }

      logger.auth.info('Authenticated', dn);
      return true;
    } catch (error) {
      logger.auth.info('Not authenticated', dn);
      logger.auth.debug('error', error);
      return false;
    }
  }

  disconnect() {
    this.connected = false;
    this.domainBinded = false;
    logger.connection.info('Disconecting');
    this.client.unbind();
  }

}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"loginHandler.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/loginHandler.js                                                              //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let slug, getLdapUsername, getLdapUserUniqueID, syncUserData, addLdapUser;
module.watch(require("./sync"), {
  slug(v) {
    slug = v;
  },

  getLdapUsername(v) {
    getLdapUsername = v;
  },

  getLdapUserUniqueID(v) {
    getLdapUserUniqueID = v;
  },

  syncUserData(v) {
    syncUserData = v;
  },

  addLdapUser(v) {
    addLdapUser = v;
  }

}, 0);
let LDAP;
module.watch(require("./ldap"), {
  default(v) {
    LDAP = v;
  }

}, 1);
const logger = new Logger('LDAPHandler', {});

function fallbackDefaultAccountSystem(bind, username, password) {
  if (typeof username === 'string') {
    if (username.indexOf('@') === -1) {
      username = {
        username
      };
    } else {
      username = {
        email: username
      };
    }
  }

  logger.info('Fallback to default account system', username);
  const loginRequest = {
    user: username,
    password: {
      digest: SHA256(password),
      algorithm: 'sha-256'
    }
  };
  return Accounts._runLoginHandlers(bind, loginRequest);
}

Accounts.registerLoginHandler('ldap', function (loginRequest) {
  if (!loginRequest.ldap || !loginRequest.ldapOptions) {
    return undefined;
  }

  logger.info('Init LDAP login', loginRequest.username);

  if (RocketChat.settings.get('LDAP_Enable') !== true) {
    return fallbackDefaultAccountSystem(this, loginRequest.username, loginRequest.ldapPass);
  }

  const self = this;
  const ldap = new LDAP();
  let ldapUser;

  try {
    ldap.connectSync();
    const users = ldap.searchUsersSync(loginRequest.username);

    if (users.length !== 1) {
      logger.info('Search returned', users.length, 'record(s) for', loginRequest.username);
      throw new Error('User not Found');
    }

    if (ldap.authSync(users[0].dn, loginRequest.ldapPass) === true) {
      if (ldap.isUserInGroup(loginRequest.username, users[0].dn)) {
        ldapUser = users[0];
      } else {
        throw new Error('User not in a valid group');
      }
    } else {
      logger.info('Wrong password for', loginRequest.username);
    }
  } catch (error) {
    logger.error(error);
  }

  if (ldapUser === undefined) {
    if (RocketChat.settings.get('LDAP_Login_Fallback') === true) {
      return fallbackDefaultAccountSystem(self, loginRequest.username, loginRequest.ldapPass);
    }

    throw new Meteor.Error('LDAP-login-error', `LDAP Authentication failed with provided username [${loginRequest.username}]`);
  } // Look to see if user already exists


  let userQuery;
  const Unique_Identifier_Field = getLdapUserUniqueID(ldapUser);
  let user;

  if (Unique_Identifier_Field) {
    userQuery = {
      'services.ldap.id': Unique_Identifier_Field.value
    };
    logger.info('Querying user');
    logger.debug('userQuery', userQuery);
    user = Meteor.users.findOne(userQuery);
  }

  let username;

  if (RocketChat.settings.get('LDAP_Username_Field') !== '') {
    username = slug(getLdapUsername(ldapUser));
  } else {
    username = slug(loginRequest.username);
  }

  if (!user) {
    userQuery = {
      username
    };
    logger.debug('userQuery', userQuery);
    user = Meteor.users.findOne(userQuery);
  } // Login user if they exist


  if (user) {
    if (user.ldap !== true && RocketChat.settings.get('LDAP_Merge_Existing_Users') !== true) {
      logger.info('User exists without "ldap: true"');
      throw new Meteor.Error('LDAP-login-error', `LDAP Authentication succeded, but there's already an existing user with provided username [${username}] in Mongo.`);
    }

    logger.info('Logging user');

    const stampedToken = Accounts._generateStampedLoginToken();

    Meteor.users.update(user._id, {
      $push: {
        'services.resume.loginTokens': Accounts._hashStampedToken(stampedToken)
      }
    });
    syncUserData(user, ldapUser);

    if (RocketChat.settings.get('LDAP_Login_Fallback') === true && typeof loginRequest.ldapPass === 'string' && loginRequest.ldapPass.trim() !== '') {
      Accounts.setPassword(user._id, loginRequest.ldapPass, {
        logout: false
      });
    }

    return {
      userId: user._id,
      token: stampedToken.token
    };
  }

  logger.info('User does not exist, creating', username);

  if (RocketChat.settings.get('LDAP_Username_Field') === '') {
    username = undefined;
  }

  if (RocketChat.settings.get('LDAP_Login_Fallback') !== true) {
    loginRequest.ldapPass = undefined;
  } // Create new user


  const result = addLdapUser(ldapUser, username, loginRequest.ldapPass);

  if (result instanceof Error) {
    throw result;
  }

  return result;
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"settings.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/settings.js                                                                  //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.settings.addGroup('LDAP', function () {
  const enableQuery = {
    _id: 'LDAP_Enable',
    value: true
  };
  const enableAuthentication = [enableQuery, {
    _id: 'LDAP_Authentication',
    value: true
  }];
  const enableTLSQuery = [enableQuery, {
    _id: 'LDAP_Encryption',
    value: {
      $in: ['tls', 'ssl']
    }
  }];
  const syncDataQuery = [enableQuery, {
    _id: 'LDAP_Sync_User_Data',
    value: true
  }];
  const groupFilterQuery = [enableQuery, {
    _id: 'LDAP_Group_Filter_Enable',
    value: true
  }];
  const backgroundSyncQuery = [enableQuery, {
    _id: 'LDAP_Background_Sync',
    value: true
  }];
  this.add('LDAP_Enable', false, {
    type: 'boolean',
    public: true
  });
  this.add('LDAP_Login_Fallback', true, {
    type: 'boolean',
    enableQuery
  });
  this.add('LDAP_Find_User_After_Login', true, {
    type: 'boolean',
    enableQuery
  });
  this.add('LDAP_Host', '', {
    type: 'string',
    enableQuery
  });
  this.add('LDAP_Port', '389', {
    type: 'string',
    enableQuery
  });
  this.add('LDAP_Reconnect', false, {
    type: 'boolean',
    enableQuery
  });
  this.add('LDAP_Encryption', 'plain', {
    type: 'select',
    values: [{
      key: 'plain',
      i18nLabel: 'No_Encryption'
    }, {
      key: 'tls',
      i18nLabel: 'StartTLS'
    }, {
      key: 'ssl',
      i18nLabel: 'SSL/LDAPS'
    }],
    enableQuery
  });
  this.add('LDAP_CA_Cert', '', {
    type: 'string',
    multiline: true,
    enableQuery: enableTLSQuery
  });
  this.add('LDAP_Reject_Unauthorized', true, {
    type: 'boolean',
    enableQuery: enableTLSQuery
  });
  this.add('LDAP_BaseDN', '', {
    type: 'string',
    enableQuery
  });
  this.add('LDAP_Internal_Log_Level', 'disabled', {
    type: 'select',
    values: [{
      key: 'disabled',
      i18nLabel: 'Disabled'
    }, {
      key: 'error',
      i18nLabel: 'Error'
    }, {
      key: 'warn',
      i18nLabel: 'Warn'
    }, {
      key: 'info',
      i18nLabel: 'Info'
    }, {
      key: 'debug',
      i18nLabel: 'Debug'
    }, {
      key: 'trace',
      i18nLabel: 'Trace'
    }],
    enableQuery
  });
  this.add('LDAP_Test_Connection', 'ldap_test_connection', {
    type: 'action',
    actionText: 'Test_Connection'
  });
  this.section('Authentication', function () {
    this.add('LDAP_Authentication', false, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Authentication_UserDN', '', {
      type: 'string',
      enableQuery: enableAuthentication
    });
    this.add('LDAP_Authentication_Password', '', {
      type: 'password',
      enableQuery: enableAuthentication
    });
  });
  this.section('Timeouts', function () {
    this.add('LDAP_Timeout', 60000, {
      type: 'int',
      enableQuery
    });
    this.add('LDAP_Connect_Timeout', 1000, {
      type: 'int',
      enableQuery
    });
    this.add('LDAP_Idle_Timeout', 1000, {
      type: 'int',
      enableQuery
    });
  });
  this.section('User Search', function () {
    this.add('LDAP_User_Search_Filter', '(objectclass=*)', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_User_Search_Scope', 'sub', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_User_Search_Field', 'sAMAccountName', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_Search_Page_Size', 250, {
      type: 'int',
      enableQuery
    });
    this.add('LDAP_Search_Size_Limit', 1000, {
      type: 'int',
      enableQuery
    });
  });
  this.section('User Search (Group Validation)', function () {
    this.add('LDAP_Group_Filter_Enable', false, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Group_Filter_ObjectClass', 'groupOfUniqueNames', {
      type: 'string',
      enableQuery: groupFilterQuery
    });
    this.add('LDAP_Group_Filter_Group_Id_Attribute', 'cn', {
      type: 'string',
      enableQuery: groupFilterQuery
    });
    this.add('LDAP_Group_Filter_Group_Member_Attribute', 'uniqueMember', {
      type: 'string',
      enableQuery: groupFilterQuery
    });
    this.add('LDAP_Group_Filter_Group_Member_Format', 'uniqueMember', {
      type: 'string',
      enableQuery: groupFilterQuery
    });
    this.add('LDAP_Group_Filter_Group_Name', 'ROCKET_CHAT', {
      type: 'string',
      enableQuery: groupFilterQuery
    });
  });
  this.section('Sync / Import', function () {
    this.add('LDAP_Username_Field', 'sAMAccountName', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_Unique_Identifier_Field', 'objectGUID,ibm-entryUUID,GUID,dominoUNID,nsuniqueId,uidNumber', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_Default_Domain', '', {
      type: 'string',
      enableQuery
    });
    this.add('LDAP_Merge_Existing_Users', false, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Sync_User_Data', false, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Sync_User_Data_FieldMap', '{"cn":"name", "mail":"email"}', {
      type: 'string',
      enableQuery: syncDataQuery
    });
    this.add('LDAP_Sync_User_Avatar', true, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Background_Sync', false, {
      type: 'boolean',
      enableQuery
    });
    this.add('LDAP_Background_Sync_Interval', 'Every 24 hours', {
      type: 'string',
      enableQuery: backgroundSyncQuery
    });
    this.add('LDAP_Background_Sync_Import_New_Users', true, {
      type: 'boolean',
      enableQuery: backgroundSyncQuery
    });
    this.add('LDAP_Background_Sync_Keep_Existant_Users_Updated', true, {
      type: 'boolean',
      enableQuery: backgroundSyncQuery
    });
    this.add('LDAP_Sync_Now', 'ldap_sync_now', {
      type: 'action',
      actionText: 'Execute_Synchronization_Now'
    });
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"sync.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/sync.js                                                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
module.export({
  slug: () => slug,
  getPropertyValue: () => getPropertyValue,
  getLdapUsername: () => getLdapUsername,
  getLdapUserUniqueID: () => getLdapUserUniqueID,
  getDataToSyncUserData: () => getDataToSyncUserData,
  syncUserData: () => syncUserData,
  addLdapUser: () => addLdapUser,
  importNewUsers: () => importNewUsers
});

let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
let LDAP;
module.watch(require("./ldap"), {
  default(v) {
    LDAP = v;
  }

}, 1);
const logger = new Logger('LDAPSync', {});

function slug(text) {
  if (RocketChat.settings.get('UTF8_Names_Slugify') !== true) {
    return text;
  }

  text = slugify(text, '.');
  return text.replace(/[^0-9a-z-_.]/g, '');
}

function getPropertyValue(obj, key) {
  try {
    return _.reduce(key.split('.'), (acc, el) => acc[el], obj);
  } catch (err) {
    return undefined;
  }
}

function getLdapUsername(ldapUser) {
  const usernameField = RocketChat.settings.get('LDAP_Username_Field');

  if (usernameField.indexOf('#{') > -1) {
    return usernameField.replace(/#{(.+?)}/g, function (match, field) {
      return ldapUser[field];
    });
  }

  return ldapUser[usernameField];
}

function getLdapUserUniqueID(ldapUser) {
  let Unique_Identifier_Field = RocketChat.settings.get('LDAP_Unique_Identifier_Field');

  if (Unique_Identifier_Field !== '') {
    Unique_Identifier_Field = Unique_Identifier_Field.replace(/\s/g, '').split(',');
  } else {
    Unique_Identifier_Field = [];
  }

  let User_Search_Field = RocketChat.settings.get('LDAP_User_Search_Field');

  if (User_Search_Field !== '') {
    User_Search_Field = User_Search_Field.replace(/\s/g, '').split(',');
  } else {
    User_Search_Field = [];
  }

  Unique_Identifier_Field = Unique_Identifier_Field.concat(User_Search_Field);

  if (Unique_Identifier_Field.length > 0) {
    Unique_Identifier_Field = Unique_Identifier_Field.find(field => !_.isEmpty(ldapUser._raw[field]));

    if (Unique_Identifier_Field) {
      Unique_Identifier_Field = {
        attribute: Unique_Identifier_Field,
        value: ldapUser._raw[Unique_Identifier_Field].toString('hex')
      };
    }

    return Unique_Identifier_Field;
  }
}

function getDataToSyncUserData(ldapUser, user) {
  const syncUserData = RocketChat.settings.get('LDAP_Sync_User_Data');
  const syncUserDataFieldMap = RocketChat.settings.get('LDAP_Sync_User_Data_FieldMap').trim();
  const userData = {};

  if (syncUserData && syncUserDataFieldMap) {
    const whitelistedUserFields = ['email', 'name', 'customFields'];
    const fieldMap = JSON.parse(syncUserDataFieldMap);
    const emailList = [];

    _.map(fieldMap, function (userField, ldapField) {
      switch (userField) {
        case 'email':
          if (!ldapUser.hasOwnProperty(ldapField)) {
            logger.debug(`user does not have attribute: ${ldapField}`);
            return;
          }

          if (_.isObject(ldapUser[ldapField])) {
            _.map(ldapUser[ldapField], function (item) {
              emailList.push({
                address: item,
                verified: true
              });
            });
          } else {
            emailList.push({
              address: ldapUser[ldapField],
              verified: true
            });
          }

          break;

        default:
          const [outerKey, innerKeys] = userField.split(/\.(.+)/);

          if (!_.find(whitelistedUserFields, el => el === outerKey)) {
            logger.debug(`user attribute not whitelisted: ${userField}`);
            return;
          }

          if (outerKey === 'customFields') {
            let customFieldsMeta;

            try {
              customFieldsMeta = JSON.parse(RocketChat.settings.get('Accounts_CustomFields'));
            } catch (e) {
              logger.debug('Invalid JSON for Custom Fields');
              return;
            }

            if (!getPropertyValue(customFieldsMeta, innerKeys)) {
              logger.debug(`user attribute does not exist: ${userField}`);
              return;
            }
          }

          const tmpUserField = getPropertyValue(user, userField);
          const tmpLdapField = RocketChat.templateVarHandler(ldapField, ldapUser);

          if (tmpLdapField && tmpUserField !== tmpLdapField) {
            // creates the object structure instead of just assigning 'tmpLdapField' to
            // 'userData[userField]' in order to avoid the "cannot use the part (...)
            // to traverse the element" (MongoDB) error that can happen. Do not handle
            // arrays.
            // TODO: Find a better solution.
            const dKeys = userField.split('.');

            const lastKey = _.last(dKeys);

            _.reduce(dKeys, (obj, currKey) => currKey === lastKey ? obj[currKey] = tmpLdapField : obj[currKey] = obj[currKey] || {}, userData);

            logger.debug(`user.${userField} changed to: ${tmpLdapField}`);
          }

      }
    });

    if (emailList.length > 0) {
      if (JSON.stringify(user.emails) !== JSON.stringify(emailList)) {
        userData.emails = emailList;
      }
    }
  }

  const uniqueId = getLdapUserUniqueID(ldapUser);

  if (uniqueId && (!user.services || !user.services.ldap || user.services.ldap.id !== uniqueId.value || user.services.ldap.idAttribute !== uniqueId.attribute)) {
    userData['services.ldap.id'] = uniqueId.value;
    userData['services.ldap.idAttribute'] = uniqueId.attribute;
  }

  if (user.ldap !== true) {
    userData.ldap = true;
  }

  if (_.size(userData)) {
    return userData;
  }
}

function syncUserData(user, ldapUser) {
  logger.info('Syncing user data');
  logger.debug('user', {
    email: user.email,
    _id: user._id
  });
  logger.debug('ldapUser', ldapUser.object);
  const userData = getDataToSyncUserData(ldapUser, user);

  if (user && user._id && userData) {
    logger.debug('setting', JSON.stringify(userData, null, 2));

    if (userData.name) {
      RocketChat._setRealName(user._id, userData.name);

      delete userData.name;
    }

    Meteor.users.update(user._id, {
      $set: userData
    });
    user = Meteor.users.findOne({
      _id: user._id
    });
  }

  if (RocketChat.settings.get('LDAP_Username_Field') !== '') {
    const username = slug(getLdapUsername(ldapUser));

    if (user && user._id && username !== user.username) {
      logger.info('Syncing user username', user.username, '->', username);

      RocketChat._setUsername(user._id, username);
    }
  }

  if (user && user._id && RocketChat.settings.get('LDAP_Sync_User_Avatar') === true) {
    const avatar = ldapUser._raw.thumbnailPhoto || ldapUser._raw.jpegPhoto;

    if (avatar) {
      logger.info('Syncing user avatar');
      const rs = RocketChatFile.bufferToStream(avatar);
      const fileStore = FileUpload.getStore('Avatars');
      fileStore.deleteByName(user.username);
      const file = {
        userId: user._id,
        type: 'image/jpeg'
      };
      Meteor.runAsUser(user._id, () => {
        fileStore.insert(file, rs, () => {
          Meteor.setTimeout(function () {
            RocketChat.models.Users.setAvatarOrigin(user._id, 'ldap');
            RocketChat.Notifications.notifyLogged('updateAvatar', {
              username: user.username
            });
          }, 500);
        });
      });
    }
  }
}

function addLdapUser(ldapUser, username, password) {
  const uniqueId = getLdapUserUniqueID(ldapUser);
  const userObject = {};

  if (username) {
    userObject.username = username;
  }

  const userData = getDataToSyncUserData(ldapUser, {});

  if (userData && userData.emails && userData.emails[0] && userData.emails[0].address) {
    if (Array.isArray(userData.emails[0].address)) {
      userObject.email = userData.emails[0].address[0];
    } else {
      userObject.email = userData.emails[0].address;
    }
  } else if (ldapUser.mail && ldapUser.mail.indexOf('@') > -1) {
    userObject.email = ldapUser.mail;
  } else if (RocketChat.settings.get('LDAP_Default_Domain') !== '') {
    userObject.email = `${username || uniqueId.value}@${RocketChat.settings.get('LDAP_Default_Domain')}`;
  } else {
    const error = new Meteor.Error('LDAP-login-error', 'LDAP Authentication succeded, there is no email to create an account. Have you tried setting your Default Domain in LDAP Settings?');
    logger.error(error);
    throw error;
  }

  logger.debug('New user data', userObject);

  if (password) {
    userObject.password = password;
  }

  try {
    userObject._id = Accounts.createUser(userObject);
  } catch (error) {
    logger.error('Error creating user', error);
    return error;
  }

  syncUserData(userObject, ldapUser);
  return {
    userId: userObject._id
  };
}

function importNewUsers(ldap) {
  if (RocketChat.settings.get('LDAP_Enable') !== true) {
    logger.error('Can\'t run LDAP Import, LDAP is disabled');
    return;
  }

  if (!ldap) {
    ldap = new LDAP();
    ldap.connectSync();
  }

  let count = 0;
  ldap.searchUsersSync('*', Meteor.bindEnvironment((error, ldapUsers, {
    next,
    end
  } = {}) => {
    if (error) {
      throw error;
    }

    ldapUsers.forEach(ldapUser => {
      count++;
      const uniqueId = getLdapUserUniqueID(ldapUser); // Look to see if user already exists

      const userQuery = {
        'services.ldap.id': uniqueId.value
      };
      logger.debug('userQuery', userQuery);
      let username;

      if (RocketChat.settings.get('LDAP_Username_Field') !== '') {
        username = slug(getLdapUsername(ldapUser));
      } // Add user if it was not added before


      let user = Meteor.users.findOne(userQuery);

      if (!user && username && RocketChat.settings.get('LDAP_Merge_Existing_Users') === true) {
        const userQuery = {
          username
        };
        logger.debug('userQuery merge', userQuery);
        user = Meteor.users.findOne(userQuery);

        if (user) {
          syncUserData(user, ldapUser);
        }
      }

      if (!user) {
        addLdapUser(ldapUser, username);
      }

      if (count % 100 === 0) {
        logger.info('Import running. Users imported until now:', count);
      }
    });

    if (end) {
      logger.info('Import finished. Users imported:', count);
    }

    next(count);
  }));
}

function sync() {
  if (RocketChat.settings.get('LDAP_Enable') !== true) {
    return;
  }

  const ldap = new LDAP();

  try {
    ldap.connectSync();
    let users;

    if (RocketChat.settings.get('LDAP_Background_Sync_Keep_Existant_Users_Updated') === true) {
      users = RocketChat.models.Users.findLDAPUsers();
    }

    if (RocketChat.settings.get('LDAP_Background_Sync_Import_New_Users') === true) {
      importNewUsers(ldap);
    }

    if (RocketChat.settings.get('LDAP_Background_Sync_Keep_Existant_Users_Updated') === true) {
      users.forEach(function (user) {
        let ldapUser;

        if (user.services && user.services.ldap && user.services.ldap.id) {
          ldapUser = ldap.getUserByIdSync(user.services.ldap.id, user.services.ldap.idAttribute);
        } else {
          ldapUser = ldap.getUserByUsernameSync(user.username);
        }

        if (ldapUser) {
          syncUserData(user, ldapUser);
        } else {
          logger.info('Can\'t sync user', user.username);
        }
      });
    }
  } catch (error) {
    logger.error(error);
    return error;
  }

  return true;
}

const jobName = 'LDAP_Sync';

const addCronJob = _.debounce(Meteor.bindEnvironment(function addCronJobDebounced() {
  if (RocketChat.settings.get('LDAP_Background_Sync') !== true) {
    logger.info('Disabling LDAP Background Sync');

    if (SyncedCron.nextScheduledAtDate(jobName)) {
      SyncedCron.remove(jobName);
    }

    return;
  }

  if (RocketChat.settings.get('LDAP_Background_Sync_Interval')) {
    logger.info('Enabling LDAP Background Sync');
    SyncedCron.add({
      name: jobName,
      schedule: parser => parser.text(RocketChat.settings.get('LDAP_Background_Sync_Interval')),

      job() {
        sync();
      }

    });
    SyncedCron.start();
  }
}), 500);

Meteor.startup(() => {
  Meteor.defer(() => {
    RocketChat.settings.get('LDAP_Background_Sync', addCronJob);
    RocketChat.settings.get('LDAP_Background_Sync_Interval', addCronJob);
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"syncUsers.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/syncUsers.js                                                                 //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let importNewUsers;
module.watch(require("./sync"), {
  importNewUsers(v) {
    importNewUsers = v;
  }

}, 0);
Meteor.methods({
  ldap_sync_now() {
    const user = Meteor.user();

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'ldap_sync_users'
      });
    }

    if (!RocketChat.authz.hasRole(user._id, 'admin')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'ldap_sync_users'
      });
    }

    if (RocketChat.settings.get('LDAP_Enable') !== true) {
      throw new Meteor.Error('LDAP_disabled');
    }

    this.unblock();
    importNewUsers();
    return {
      message: 'Sync_in_progress',
      params: []
    };
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"testConnection.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_ldap/server/testConnection.js                                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let LDAP;
module.watch(require("./ldap"), {
  default(v) {
    LDAP = v;
  }

}, 0);
Meteor.methods({
  ldap_test_connection() {
    const user = Meteor.user();

    if (!user) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'ldap_test_connection'
      });
    }

    if (!RocketChat.authz.hasRole(user._id, 'admin')) {
      throw new Meteor.Error('error-not-authorized', 'Not authorized', {
        method: 'ldap_test_connection'
      });
    }

    if (RocketChat.settings.get('LDAP_Enable') !== true) {
      throw new Meteor.Error('LDAP_disabled');
    }

    let ldap;

    try {
      ldap = new LDAP();
      ldap.connectSync();
    } catch (error) {
      console.log(error);
      throw new Meteor.Error(error.message);
    }

    try {
      ldap.bindIfNecessary();
    } catch (error) {
      throw new Meteor.Error(error.name || error.message);
    }

    return {
      message: 'Connection_success',
      params: []
    };
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
var exports = require("/node_modules/meteor/rocketchat:ldap/server/index.js");

/* Exports */
Package._define("rocketchat:ldap", exports);

})();

//# sourceURL=meteor://💻app/packages/rocketchat_ldap.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsZGFwL3NlcnZlci9pbmRleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsZGFwL3NlcnZlci9sZGFwLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxkYXAvc2VydmVyL2xvZ2luSGFuZGxlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsZGFwL3NlcnZlci9zZXR0aW5ncy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsZGFwL3NlcnZlci9zeW5jLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmxkYXAvc2VydmVyL3N5bmNVc2Vycy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDpsZGFwL3NlcnZlci90ZXN0Q29ubmVjdGlvbi5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJ3YXRjaCIsInJlcXVpcmUiLCJleHBvcnQiLCJkZWZhdWx0IiwiTERBUCIsImxkYXBqcyIsInYiLCJCdW55YW4iLCJsb2dnZXIiLCJMb2dnZXIiLCJzZWN0aW9ucyIsImNvbm5lY3Rpb24iLCJiaW5kIiwic2VhcmNoIiwiYXV0aCIsImNvbnN0cnVjdG9yIiwiY29ubmVjdGVkIiwib3B0aW9ucyIsImhvc3QiLCJSb2NrZXRDaGF0Iiwic2V0dGluZ3MiLCJnZXQiLCJwb3J0IiwiUmVjb25uZWN0IiwiSW50ZXJuYWxfTG9nX0xldmVsIiwidGltZW91dCIsImNvbm5lY3RfdGltZW91dCIsImlkbGVfdGltZW91dCIsImVuY3J5cHRpb24iLCJjYV9jZXJ0IiwicmVqZWN0X3VuYXV0aG9yaXplZCIsIkF1dGhlbnRpY2F0aW9uIiwiQXV0aGVudGljYXRpb25fVXNlckROIiwiQXV0aGVudGljYXRpb25fUGFzc3dvcmQiLCJCYXNlRE4iLCJVc2VyX1NlYXJjaF9GaWx0ZXIiLCJVc2VyX1NlYXJjaF9TY29wZSIsIlVzZXJfU2VhcmNoX0ZpZWxkIiwiU2VhcmNoX1BhZ2VfU2l6ZSIsIlNlYXJjaF9TaXplX0xpbWl0IiwiZ3JvdXBfZmlsdGVyX2VuYWJsZWQiLCJncm91cF9maWx0ZXJfb2JqZWN0X2NsYXNzIiwiZ3JvdXBfZmlsdGVyX2dyb3VwX2lkX2F0dHJpYnV0ZSIsImdyb3VwX2ZpbHRlcl9ncm91cF9tZW1iZXJfYXR0cmlidXRlIiwiZ3JvdXBfZmlsdGVyX2dyb3VwX21lbWJlcl9mb3JtYXQiLCJncm91cF9maWx0ZXJfZ3JvdXBfbmFtZSIsImZpbmRfdXNlcl9hZnRlcl9sb2dpbiIsImNvbm5lY3RTeW5jIiwiYXJncyIsIl9jb25uZWN0U3luYyIsIk1ldGVvciIsIndyYXBBc3luYyIsImNvbm5lY3RBc3luYyIsInNlYXJjaEFsbFN5bmMiLCJfc2VhcmNoQWxsU3luYyIsInNlYXJjaEFsbEFzeW5jIiwiY2FsbGJhY2siLCJpbmZvIiwicmVwbGllZCIsImNvbm5lY3Rpb25PcHRpb25zIiwidXJsIiwiY29ubmVjdFRpbWVvdXQiLCJpZGxlVGltZW91dCIsInJlY29ubmVjdCIsImxvZyIsIm5hbWUiLCJjb21wb25lbnQiLCJzdHJlYW0iLCJwcm9jZXNzIiwic3RkZXJyIiwibGV2ZWwiLCJ0bHNPcHRpb25zIiwicmVqZWN0VW5hdXRob3JpemVkIiwiY2hhaW5MaW5lcyIsInNwbGl0IiwiY2VydCIsImNhIiwiZm9yRWFjaCIsImxpbmUiLCJwdXNoIiwibWF0Y2giLCJqb2luIiwiZGVidWciLCJjbGllbnQiLCJjcmVhdGVDbGllbnQiLCJiaW5kU3luYyIsIm9uIiwiZXJyb3IiLCJkaXNjb25uZWN0Iiwic3RhcnR0bHMiLCJyZXNwb25zZSIsInNldFRpbWVvdXQiLCJFcnJvciIsImdldFVzZXJGaWx0ZXIiLCJ1c2VybmFtZSIsImZpbHRlciIsInVzZXJuYW1lRmlsdGVyIiwibWFwIiwiaXRlbSIsImxlbmd0aCIsImJpbmRJZk5lY2Vzc2FyeSIsImRvbWFpbkJpbmRlZCIsInNlYXJjaFVzZXJzU3luYyIsInBhZ2UiLCJzZWFyY2hPcHRpb25zIiwic2NvcGUiLCJzaXplTGltaXQiLCJwYWdlZCIsInBhZ2VTaXplIiwicGFnZVBhdXNlIiwic2VhcmNoQWxsUGFnZWQiLCJnZXRVc2VyQnlJZFN5bmMiLCJpZCIsImF0dHJpYnV0ZSIsIlVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkIiwiZmlsdGVycyIsIkVxdWFsaXR5RmlsdGVyIiwidmFsdWUiLCJCdWZmZXIiLCJPckZpbHRlciIsInRvU3RyaW5nIiwicmVzdWx0IiwiQXJyYXkiLCJpc0FycmF5IiwiZ2V0VXNlckJ5VXNlcm5hbWVTeW5jIiwiaXNVc2VySW5Hcm91cCIsInVzZXJkbiIsInJlcGxhY2UiLCJleHRyYWN0TGRhcEVudHJ5RGF0YSIsImVudHJ5IiwidmFsdWVzIiwiX3JhdyIsInJhdyIsIk9iamVjdCIsImtleXMiLCJrZXkiLCJpbmNsdWRlcyIsInByb2Nlc3NQYWdlIiwiZW50cmllcyIsInRpdGxlIiwiZW5kIiwibmV4dCIsIl91cGRhdGVJZGxlIiwicmVzIiwiaW50ZXJuYWxQYWdlU2l6ZSIsImF1dGhTeW5jIiwiZG4iLCJwYXNzd29yZCIsInVuYmluZCIsInNsdWciLCJnZXRMZGFwVXNlcm5hbWUiLCJnZXRMZGFwVXNlclVuaXF1ZUlEIiwic3luY1VzZXJEYXRhIiwiYWRkTGRhcFVzZXIiLCJmYWxsYmFja0RlZmF1bHRBY2NvdW50U3lzdGVtIiwiaW5kZXhPZiIsImVtYWlsIiwibG9naW5SZXF1ZXN0IiwidXNlciIsImRpZ2VzdCIsIlNIQTI1NiIsImFsZ29yaXRobSIsIkFjY291bnRzIiwiX3J1bkxvZ2luSGFuZGxlcnMiLCJyZWdpc3RlckxvZ2luSGFuZGxlciIsImxkYXAiLCJsZGFwT3B0aW9ucyIsInVuZGVmaW5lZCIsImxkYXBQYXNzIiwic2VsZiIsImxkYXBVc2VyIiwidXNlcnMiLCJ1c2VyUXVlcnkiLCJmaW5kT25lIiwic3RhbXBlZFRva2VuIiwiX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4iLCJ1cGRhdGUiLCJfaWQiLCIkcHVzaCIsIl9oYXNoU3RhbXBlZFRva2VuIiwidHJpbSIsInNldFBhc3N3b3JkIiwibG9nb3V0IiwidXNlcklkIiwidG9rZW4iLCJhZGRHcm91cCIsImVuYWJsZVF1ZXJ5IiwiZW5hYmxlQXV0aGVudGljYXRpb24iLCJlbmFibGVUTFNRdWVyeSIsIiRpbiIsInN5bmNEYXRhUXVlcnkiLCJncm91cEZpbHRlclF1ZXJ5IiwiYmFja2dyb3VuZFN5bmNRdWVyeSIsImFkZCIsInR5cGUiLCJwdWJsaWMiLCJpMThuTGFiZWwiLCJtdWx0aWxpbmUiLCJhY3Rpb25UZXh0Iiwic2VjdGlvbiIsImdldFByb3BlcnR5VmFsdWUiLCJnZXREYXRhVG9TeW5jVXNlckRhdGEiLCJpbXBvcnROZXdVc2VycyIsIl8iLCJ0ZXh0Iiwic2x1Z2lmeSIsIm9iaiIsInJlZHVjZSIsImFjYyIsImVsIiwiZXJyIiwidXNlcm5hbWVGaWVsZCIsImZpZWxkIiwiY29uY2F0IiwiZmluZCIsImlzRW1wdHkiLCJzeW5jVXNlckRhdGFGaWVsZE1hcCIsInVzZXJEYXRhIiwid2hpdGVsaXN0ZWRVc2VyRmllbGRzIiwiZmllbGRNYXAiLCJKU09OIiwicGFyc2UiLCJlbWFpbExpc3QiLCJ1c2VyRmllbGQiLCJsZGFwRmllbGQiLCJoYXNPd25Qcm9wZXJ0eSIsImlzT2JqZWN0IiwiYWRkcmVzcyIsInZlcmlmaWVkIiwib3V0ZXJLZXkiLCJpbm5lcktleXMiLCJjdXN0b21GaWVsZHNNZXRhIiwiZSIsInRtcFVzZXJGaWVsZCIsInRtcExkYXBGaWVsZCIsInRlbXBsYXRlVmFySGFuZGxlciIsImRLZXlzIiwibGFzdEtleSIsImxhc3QiLCJjdXJyS2V5Iiwic3RyaW5naWZ5IiwiZW1haWxzIiwidW5pcXVlSWQiLCJzZXJ2aWNlcyIsImlkQXR0cmlidXRlIiwic2l6ZSIsIm9iamVjdCIsIl9zZXRSZWFsTmFtZSIsIiRzZXQiLCJfc2V0VXNlcm5hbWUiLCJhdmF0YXIiLCJ0aHVtYm5haWxQaG90byIsImpwZWdQaG90byIsInJzIiwiUm9ja2V0Q2hhdEZpbGUiLCJidWZmZXJUb1N0cmVhbSIsImZpbGVTdG9yZSIsIkZpbGVVcGxvYWQiLCJnZXRTdG9yZSIsImRlbGV0ZUJ5TmFtZSIsImZpbGUiLCJydW5Bc1VzZXIiLCJpbnNlcnQiLCJtb2RlbHMiLCJVc2VycyIsInNldEF2YXRhck9yaWdpbiIsIk5vdGlmaWNhdGlvbnMiLCJub3RpZnlMb2dnZWQiLCJ1c2VyT2JqZWN0IiwibWFpbCIsImNyZWF0ZVVzZXIiLCJjb3VudCIsImJpbmRFbnZpcm9ubWVudCIsImxkYXBVc2VycyIsInN5bmMiLCJmaW5kTERBUFVzZXJzIiwiam9iTmFtZSIsImFkZENyb25Kb2IiLCJkZWJvdW5jZSIsImFkZENyb25Kb2JEZWJvdW5jZWQiLCJTeW5jZWRDcm9uIiwibmV4dFNjaGVkdWxlZEF0RGF0ZSIsInJlbW92ZSIsInNjaGVkdWxlIiwicGFyc2VyIiwiam9iIiwic3RhcnQiLCJzdGFydHVwIiwiZGVmZXIiLCJtZXRob2RzIiwibGRhcF9zeW5jX25vdyIsIm1ldGhvZCIsImF1dGh6IiwiaGFzUm9sZSIsInVuYmxvY2siLCJtZXNzYWdlIiwicGFyYW1zIiwibGRhcF90ZXN0X2Nvbm5lY3Rpb24iLCJjb25zb2xlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBQSxPQUFPQyxLQUFQLENBQWFDLFFBQVEsZ0JBQVIsQ0FBYjtBQUF3Q0YsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLFlBQVIsQ0FBYjtBQUFvQ0YsT0FBT0MsS0FBUCxDQUFhQyxRQUFRLGtCQUFSLENBQWI7QUFBMENGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxhQUFSLENBQWI7QUFBcUNGLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIsRTs7Ozs7Ozs7Ozs7QUNBM0pGLE9BQU9HLE1BQVAsQ0FBYztBQUFDQyxXQUFRLE1BQUlDO0FBQWIsQ0FBZDtBQUFrQyxJQUFJQyxNQUFKO0FBQVdOLE9BQU9DLEtBQVAsQ0FBYUMsUUFBUSxRQUFSLENBQWIs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S0FBUDtBQUlBOztBQWxDYSxDQUFmLEUiLCJmaWxlIjoiL3BhY2thZ2VzL3JvY2tldGNoYXRfbGRhcC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi9sb2dpbkhhbmRsZXInO1xuaW1wb3J0ICcuL3NldHRpbmdzJztcbmltcG9ydCAnLi90ZXN0Q29ubmVjdGlvbic7XG5pbXBvcnQgJy4vc3luY1VzZXJzJztcbmltcG9ydCAnLi9zeW5jJztcbiIsImltcG9ydCBsZGFwanMgZnJvbSAnbGRhcGpzJztcbmltcG9ydCBCdW55YW4gZnJvbSAnYnVueWFuJztcblxuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcignTERBUCcsIHtcblx0c2VjdGlvbnM6IHtcblx0XHRjb25uZWN0aW9uOiAnQ29ubmVjdGlvbicsXG5cdFx0YmluZDogJ0JpbmQnLFxuXHRcdHNlYXJjaDogJ1NlYXJjaCcsXG5cdFx0YXV0aDogJ0F1dGgnLFxuXHR9LFxufSk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIExEQVAge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHR0aGlzLmxkYXBqcyA9IGxkYXBqcztcblxuXHRcdHRoaXMuY29ubmVjdGVkID0gZmFsc2U7XG5cblx0XHR0aGlzLm9wdGlvbnMgPSB7XG5cdFx0XHRob3N0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Ib3N0JyksXG5cdFx0XHRwb3J0OiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Qb3J0JyksXG5cdFx0XHRSZWNvbm5lY3Q6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1JlY29ubmVjdCcpLFxuXHRcdFx0SW50ZXJuYWxfTG9nX0xldmVsOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9JbnRlcm5hbF9Mb2dfTGV2ZWwnKSxcblx0XHRcdHRpbWVvdXQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1RpbWVvdXQnKSxcblx0XHRcdGNvbm5lY3RfdGltZW91dDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfQ29ubmVjdF9UaW1lb3V0JyksXG5cdFx0XHRpZGxlX3RpbWVvdXQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0lkbGVfVGltZW91dCcpLFxuXHRcdFx0ZW5jcnlwdGlvbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfRW5jcnlwdGlvbicpLFxuXHRcdFx0Y2FfY2VydDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfQ0FfQ2VydCcpLFxuXHRcdFx0cmVqZWN0X3VuYXV0aG9yaXplZDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfUmVqZWN0X1VuYXV0aG9yaXplZCcpIHx8IGZhbHNlLFxuXHRcdFx0QXV0aGVudGljYXRpb246IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0F1dGhlbnRpY2F0aW9uJyksXG5cdFx0XHRBdXRoZW50aWNhdGlvbl9Vc2VyRE46IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0F1dGhlbnRpY2F0aW9uX1VzZXJETicpLFxuXHRcdFx0QXV0aGVudGljYXRpb25fUGFzc3dvcmQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0F1dGhlbnRpY2F0aW9uX1Bhc3N3b3JkJyksXG5cdFx0XHRCYXNlRE46IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0Jhc2VETicpLFxuXHRcdFx0VXNlcl9TZWFyY2hfRmlsdGVyOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Vc2VyX1NlYXJjaF9GaWx0ZXInKSxcblx0XHRcdFVzZXJfU2VhcmNoX1Njb3BlOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Vc2VyX1NlYXJjaF9TY29wZScpLFxuXHRcdFx0VXNlcl9TZWFyY2hfRmllbGQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1VzZXJfU2VhcmNoX0ZpZWxkJyksXG5cdFx0XHRTZWFyY2hfUGFnZV9TaXplOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9TZWFyY2hfUGFnZV9TaXplJyksXG5cdFx0XHRTZWFyY2hfU2l6ZV9MaW1pdDogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfU2VhcmNoX1NpemVfTGltaXQnKSxcblx0XHRcdGdyb3VwX2ZpbHRlcl9lbmFibGVkOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Hcm91cF9GaWx0ZXJfRW5hYmxlJyksXG5cdFx0XHRncm91cF9maWx0ZXJfb2JqZWN0X2NsYXNzOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Hcm91cF9GaWx0ZXJfT2JqZWN0Q2xhc3MnKSxcblx0XHRcdGdyb3VwX2ZpbHRlcl9ncm91cF9pZF9hdHRyaWJ1dGU6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0dyb3VwX0ZpbHRlcl9Hcm91cF9JZF9BdHRyaWJ1dGUnKSxcblx0XHRcdGdyb3VwX2ZpbHRlcl9ncm91cF9tZW1iZXJfYXR0cmlidXRlOiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Hcm91cF9GaWx0ZXJfR3JvdXBfTWVtYmVyX0F0dHJpYnV0ZScpLFxuXHRcdFx0Z3JvdXBfZmlsdGVyX2dyb3VwX21lbWJlcl9mb3JtYXQ6IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0dyb3VwX0ZpbHRlcl9Hcm91cF9NZW1iZXJfRm9ybWF0JyksXG5cdFx0XHRncm91cF9maWx0ZXJfZ3JvdXBfbmFtZTogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfR3JvdXBfRmlsdGVyX0dyb3VwX05hbWUnKSxcblx0XHRcdGZpbmRfdXNlcl9hZnRlcl9sb2dpbjogUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfRmluZF9Vc2VyX0FmdGVyX0xvZ2luJyksXG5cdFx0fTtcblx0fVxuXG5cdGNvbm5lY3RTeW5jKC4uLmFyZ3MpIHtcblx0XHRpZiAoIXRoaXMuX2Nvbm5lY3RTeW5jKSB7XG5cdFx0XHR0aGlzLl9jb25uZWN0U3luYyA9IE1ldGVvci53cmFwQXN5bmModGhpcy5jb25uZWN0QXN5bmMsIHRoaXMpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fY29ubmVjdFN5bmMoLi4uYXJncyk7XG5cdH1cblxuXHRzZWFyY2hBbGxTeW5jKC4uLmFyZ3MpIHtcblx0XHRpZiAoIXRoaXMuX3NlYXJjaEFsbFN5bmMpIHtcblx0XHRcdHRoaXMuX3NlYXJjaEFsbFN5bmMgPSBNZXRlb3Iud3JhcEFzeW5jKHRoaXMuc2VhcmNoQWxsQXN5bmMsIHRoaXMpO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcy5fc2VhcmNoQWxsU3luYyguLi5hcmdzKTtcblx0fVxuXG5cdGNvbm5lY3RBc3luYyhjYWxsYmFjaykge1xuXHRcdGxvZ2dlci5jb25uZWN0aW9uLmluZm8oJ0luaXQgc2V0dXAnKTtcblxuXHRcdGxldCByZXBsaWVkID0gZmFsc2U7XG5cblx0XHRjb25zdCBjb25uZWN0aW9uT3B0aW9ucyA9IHtcblx0XHRcdHVybDogYCR7IHRoaXMub3B0aW9ucy5ob3N0IH06JHsgdGhpcy5vcHRpb25zLnBvcnQgfWAsXG5cdFx0XHR0aW1lb3V0OiB0aGlzLm9wdGlvbnMudGltZW91dCxcblx0XHRcdGNvbm5lY3RUaW1lb3V0OiB0aGlzLm9wdGlvbnMuY29ubmVjdF90aW1lb3V0LFxuXHRcdFx0aWRsZVRpbWVvdXQ6IHRoaXMub3B0aW9ucy5pZGxlX3RpbWVvdXQsXG5cdFx0XHRyZWNvbm5lY3Q6IHRoaXMub3B0aW9ucy5SZWNvbm5lY3QsXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuSW50ZXJuYWxfTG9nX0xldmVsICE9PSAnZGlzYWJsZWQnKSB7XG5cdFx0XHRjb25uZWN0aW9uT3B0aW9ucy5sb2cgPSBuZXcgQnVueWFuKHtcblx0XHRcdFx0bmFtZTogJ2xkYXBqcycsXG5cdFx0XHRcdGNvbXBvbmVudDogJ2NsaWVudCcsXG5cdFx0XHRcdHN0cmVhbTogcHJvY2Vzcy5zdGRlcnIsXG5cdFx0XHRcdGxldmVsOiB0aGlzLm9wdGlvbnMuSW50ZXJuYWxfTG9nX0xldmVsLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdGxzT3B0aW9ucyA9IHtcblx0XHRcdHJlamVjdFVuYXV0aG9yaXplZDogdGhpcy5vcHRpb25zLnJlamVjdF91bmF1dGhvcml6ZWQsXG5cdFx0fTtcblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuY2FfY2VydCAmJiB0aGlzLm9wdGlvbnMuY2FfY2VydCAhPT0gJycpIHtcblx0XHRcdC8vIFNwbGl0IENBIGNlcnQgaW50byBhcnJheSBvZiBzdHJpbmdzXG5cdFx0XHRjb25zdCBjaGFpbkxpbmVzID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfQ0FfQ2VydCcpLnNwbGl0KCdcXG4nKTtcblx0XHRcdGxldCBjZXJ0ID0gW107XG5cdFx0XHRjb25zdCBjYSA9IFtdO1xuXHRcdFx0Y2hhaW5MaW5lcy5mb3JFYWNoKChsaW5lKSA9PiB7XG5cdFx0XHRcdGNlcnQucHVzaChsaW5lKTtcblx0XHRcdFx0aWYgKGxpbmUubWF0Y2goLy1FTkQgQ0VSVElGSUNBVEUtLykpIHtcblx0XHRcdFx0XHRjYS5wdXNoKGNlcnQuam9pbignXFxuJykpO1xuXHRcdFx0XHRcdGNlcnQgPSBbXTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHR0bHNPcHRpb25zLmNhID0gY2E7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uID09PSAnc3NsJykge1xuXHRcdFx0Y29ubmVjdGlvbk9wdGlvbnMudXJsID0gYGxkYXBzOi8vJHsgY29ubmVjdGlvbk9wdGlvbnMudXJsIH1gO1xuXHRcdFx0Y29ubmVjdGlvbk9wdGlvbnMudGxzT3B0aW9ucyA9IHRsc09wdGlvbnM7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbm5lY3Rpb25PcHRpb25zLnVybCA9IGBsZGFwOi8vJHsgY29ubmVjdGlvbk9wdGlvbnMudXJsIH1gO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5jb25uZWN0aW9uLmluZm8oJ0Nvbm5lY3RpbmcnLCBjb25uZWN0aW9uT3B0aW9ucy51cmwpO1xuXHRcdGxvZ2dlci5jb25uZWN0aW9uLmRlYnVnKCdjb25uZWN0aW9uT3B0aW9ucycsIGNvbm5lY3Rpb25PcHRpb25zKTtcblxuXHRcdHRoaXMuY2xpZW50ID0gbGRhcGpzLmNyZWF0ZUNsaWVudChjb25uZWN0aW9uT3B0aW9ucyk7XG5cblx0XHR0aGlzLmJpbmRTeW5jID0gTWV0ZW9yLndyYXBBc3luYyh0aGlzLmNsaWVudC5iaW5kLCB0aGlzLmNsaWVudCk7XG5cblx0XHR0aGlzLmNsaWVudC5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcblx0XHRcdGxvZ2dlci5jb25uZWN0aW9uLmVycm9yKCdjb25uZWN0aW9uJywgZXJyb3IpO1xuXHRcdFx0aWYgKHJlcGxpZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRcdHJlcGxpZWQgPSB0cnVlO1xuXHRcdFx0XHRjYWxsYmFjayhlcnJvciwgbnVsbCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHR0aGlzLmNsaWVudC5vbignaWRsZScsICgpID0+IHtcblx0XHRcdGxvZ2dlci5zZWFyY2guaW5mbygnSWRsZScpO1xuXHRcdFx0dGhpcy5kaXNjb25uZWN0KCk7XG5cdFx0fSk7XG5cblx0XHR0aGlzLmNsaWVudC5vbignY2xvc2UnLCAoKSA9PiB7XG5cdFx0XHRsb2dnZXIuc2VhcmNoLmluZm8oJ0Nsb3NlZCcpO1xuXHRcdH0pO1xuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5lbmNyeXB0aW9uID09PSAndGxzJykge1xuXHRcdFx0Ly8gU2V0IGhvc3QgcGFyYW1ldGVyIGZvciB0bHMuY29ubmVjdCB3aGljaCBpcyB1c2VkIGJ5IGxkYXBqcyBzdGFydHRscy4gVGhpcyBzaG91bGRuJ3QgYmUgbmVlZGVkIGluIG5ld2VyIG5vZGVqcyB2ZXJzaW9ucyAoZS5nIHY1LjYuMCkuXG5cdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vUm9ja2V0Q2hhdC9Sb2NrZXQuQ2hhdC9pc3N1ZXMvMjAzNVxuXHRcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL21jYXZhZ2Uvbm9kZS1sZGFwanMvaXNzdWVzLzM0OVxuXHRcdFx0dGxzT3B0aW9ucy5ob3N0ID0gdGhpcy5vcHRpb25zLmhvc3Q7XG5cblx0XHRcdGxvZ2dlci5jb25uZWN0aW9uLmluZm8oJ1N0YXJ0aW5nIFRMUycpO1xuXHRcdFx0bG9nZ2VyLmNvbm5lY3Rpb24uZGVidWcoJ3Rsc09wdGlvbnMnLCB0bHNPcHRpb25zKTtcblxuXHRcdFx0dGhpcy5jbGllbnQuc3RhcnR0bHModGxzT3B0aW9ucywgbnVsbCwgKGVycm9yLCByZXNwb25zZSkgPT4ge1xuXHRcdFx0XHRpZiAoZXJyb3IpIHtcblx0XHRcdFx0XHRsb2dnZXIuY29ubmVjdGlvbi5lcnJvcignVExTIGNvbm5lY3Rpb24nLCBlcnJvcik7XG5cdFx0XHRcdFx0aWYgKHJlcGxpZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0XHRyZXBsaWVkID0gdHJ1ZTtcblx0XHRcdFx0XHRcdGNhbGxiYWNrKGVycm9yLCBudWxsKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0bG9nZ2VyLmNvbm5lY3Rpb24uaW5mbygnVExTIGNvbm5lY3RlZCcpO1xuXHRcdFx0XHR0aGlzLmNvbm5lY3RlZCA9IHRydWU7XG5cdFx0XHRcdGlmIChyZXBsaWVkID09PSBmYWxzZSkge1xuXHRcdFx0XHRcdHJlcGxpZWQgPSB0cnVlO1xuXHRcdFx0XHRcdGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuY2xpZW50Lm9uKCdjb25uZWN0JywgKHJlc3BvbnNlKSA9PiB7XG5cdFx0XHRcdGxvZ2dlci5jb25uZWN0aW9uLmluZm8oJ0xEQVAgY29ubmVjdGVkJyk7XG5cdFx0XHRcdHRoaXMuY29ubmVjdGVkID0gdHJ1ZTtcblx0XHRcdFx0aWYgKHJlcGxpZWQgPT09IGZhbHNlKSB7XG5cdFx0XHRcdFx0cmVwbGllZCA9IHRydWU7XG5cdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmIChyZXBsaWVkID09PSBmYWxzZSkge1xuXHRcdFx0XHRsb2dnZXIuY29ubmVjdGlvbi5lcnJvcignY29ubmVjdGlvbiB0aW1lIG91dCcsIGNvbm5lY3Rpb25PcHRpb25zLmNvbm5lY3RUaW1lb3V0KTtcblx0XHRcdFx0cmVwbGllZCA9IHRydWU7XG5cdFx0XHRcdGNhbGxiYWNrKG5ldyBFcnJvcignVGltZW91dCcpKTtcblx0XHRcdH1cblx0XHR9LCBjb25uZWN0aW9uT3B0aW9ucy5jb25uZWN0VGltZW91dCk7XG5cdH1cblxuXHRnZXRVc2VyRmlsdGVyKHVzZXJuYW1lKSB7XG5cdFx0Y29uc3QgZmlsdGVyID0gW107XG5cblx0XHRpZiAodGhpcy5vcHRpb25zLlVzZXJfU2VhcmNoX0ZpbHRlciAhPT0gJycpIHtcblx0XHRcdGlmICh0aGlzLm9wdGlvbnMuVXNlcl9TZWFyY2hfRmlsdGVyWzBdID09PSAnKCcpIHtcblx0XHRcdFx0ZmlsdGVyLnB1c2goYCR7IHRoaXMub3B0aW9ucy5Vc2VyX1NlYXJjaF9GaWx0ZXIgfWApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmlsdGVyLnB1c2goYCgkeyB0aGlzLm9wdGlvbnMuVXNlcl9TZWFyY2hfRmlsdGVyIH0pYCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXNlcm5hbWVGaWx0ZXIgPSB0aGlzLm9wdGlvbnMuVXNlcl9TZWFyY2hfRmllbGQuc3BsaXQoJywnKS5tYXAoKGl0ZW0pID0+IGAoJHsgaXRlbSB9PSR7IHVzZXJuYW1lIH0pYCk7XG5cblx0XHRpZiAodXNlcm5hbWVGaWx0ZXIubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRsb2dnZXIuZXJyb3IoJ0xEQVBfTERBUF9Vc2VyX1NlYXJjaF9GaWVsZCBub3QgZGVmaW5lZCcpO1xuXHRcdH0gZWxzZSBpZiAodXNlcm5hbWVGaWx0ZXIubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRmaWx0ZXIucHVzaChgJHsgdXNlcm5hbWVGaWx0ZXJbMF0gfWApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWx0ZXIucHVzaChgKHwkeyB1c2VybmFtZUZpbHRlci5qb2luKCcnKSB9KWApO1xuXHRcdH1cblxuXHRcdHJldHVybiBgKCYkeyBmaWx0ZXIuam9pbignJykgfSlgO1xuXHR9XG5cblx0YmluZElmTmVjZXNzYXJ5KCkge1xuXHRcdGlmICh0aGlzLmRvbWFpbkJpbmRlZCA9PT0gdHJ1ZSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuQXV0aGVudGljYXRpb24gIT09IHRydWUpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRsb2dnZXIuYmluZC5pbmZvKCdCaW5kaW5nIFVzZXJETicsIHRoaXMub3B0aW9ucy5BdXRoZW50aWNhdGlvbl9Vc2VyRE4pO1xuXHRcdHRoaXMuYmluZFN5bmModGhpcy5vcHRpb25zLkF1dGhlbnRpY2F0aW9uX1VzZXJETiwgdGhpcy5vcHRpb25zLkF1dGhlbnRpY2F0aW9uX1Bhc3N3b3JkKTtcblx0XHR0aGlzLmRvbWFpbkJpbmRlZCA9IHRydWU7XG5cdH1cblxuXHRzZWFyY2hVc2Vyc1N5bmModXNlcm5hbWUsIHBhZ2UpIHtcblx0XHR0aGlzLmJpbmRJZk5lY2Vzc2FyeSgpO1xuXG5cdFx0Y29uc3Qgc2VhcmNoT3B0aW9ucyA9IHtcblx0XHRcdGZpbHRlcjogdGhpcy5nZXRVc2VyRmlsdGVyKHVzZXJuYW1lKSxcblx0XHRcdHNjb3BlOiB0aGlzLm9wdGlvbnMuVXNlcl9TZWFyY2hfU2NvcGUgfHwgJ3N1YicsXG5cdFx0XHRzaXplTGltaXQ6IHRoaXMub3B0aW9ucy5TZWFyY2hfU2l6ZV9MaW1pdCxcblx0XHR9O1xuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5TZWFyY2hfUGFnZV9TaXplID4gMCkge1xuXHRcdFx0c2VhcmNoT3B0aW9ucy5wYWdlZCA9IHtcblx0XHRcdFx0cGFnZVNpemU6IHRoaXMub3B0aW9ucy5TZWFyY2hfUGFnZV9TaXplLFxuXHRcdFx0XHRwYWdlUGF1c2U6ICEhcGFnZSxcblx0XHRcdH07XG5cdFx0fVxuXG5cdFx0bG9nZ2VyLnNlYXJjaC5pbmZvKCdTZWFyY2hpbmcgdXNlcicsIHVzZXJuYW1lKTtcblx0XHRsb2dnZXIuc2VhcmNoLmRlYnVnKCdzZWFyY2hPcHRpb25zJywgc2VhcmNoT3B0aW9ucyk7XG5cdFx0bG9nZ2VyLnNlYXJjaC5kZWJ1ZygnQmFzZUROJywgdGhpcy5vcHRpb25zLkJhc2VETik7XG5cblx0XHRpZiAocGFnZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuc2VhcmNoQWxsUGFnZWQodGhpcy5vcHRpb25zLkJhc2VETiwgc2VhcmNoT3B0aW9ucywgcGFnZSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXMuc2VhcmNoQWxsU3luYyh0aGlzLm9wdGlvbnMuQmFzZUROLCBzZWFyY2hPcHRpb25zKTtcblx0fVxuXG5cdGdldFVzZXJCeUlkU3luYyhpZCwgYXR0cmlidXRlKSB7XG5cdFx0dGhpcy5iaW5kSWZOZWNlc3NhcnkoKTtcblxuXHRcdGNvbnN0IFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfVW5pcXVlX0lkZW50aWZpZXJfRmllbGQnKS5zcGxpdCgnLCcpO1xuXG5cdFx0bGV0IGZpbHRlcjtcblxuXHRcdGlmIChhdHRyaWJ1dGUpIHtcblx0XHRcdGZpbHRlciA9IG5ldyB0aGlzLmxkYXBqcy5maWx0ZXJzLkVxdWFsaXR5RmlsdGVyKHtcblx0XHRcdFx0YXR0cmlidXRlLFxuXHRcdFx0XHR2YWx1ZTogbmV3IEJ1ZmZlcihpZCwgJ2hleCcpLFxuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IGZpbHRlcnMgPSBbXTtcblx0XHRcdFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkLmZvckVhY2goKGl0ZW0pID0+IHtcblx0XHRcdFx0ZmlsdGVycy5wdXNoKG5ldyB0aGlzLmxkYXBqcy5maWx0ZXJzLkVxdWFsaXR5RmlsdGVyKHtcblx0XHRcdFx0XHRhdHRyaWJ1dGU6IGl0ZW0sXG5cdFx0XHRcdFx0dmFsdWU6IG5ldyBCdWZmZXIoaWQsICdoZXgnKSxcblx0XHRcdFx0fSkpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGZpbHRlciA9IG5ldyB0aGlzLmxkYXBqcy5maWx0ZXJzLk9yRmlsdGVyKHsgZmlsdGVycyB9KTtcblx0XHR9XG5cblx0XHRjb25zdCBzZWFyY2hPcHRpb25zID0ge1xuXHRcdFx0ZmlsdGVyLFxuXHRcdFx0c2NvcGU6ICdzdWInLFxuXHRcdH07XG5cblx0XHRsb2dnZXIuc2VhcmNoLmluZm8oJ1NlYXJjaGluZyBieSBpZCcsIGlkKTtcblx0XHRsb2dnZXIuc2VhcmNoLmRlYnVnKCdzZWFyY2ggZmlsdGVyJywgc2VhcmNoT3B0aW9ucy5maWx0ZXIudG9TdHJpbmcoKSk7XG5cdFx0bG9nZ2VyLnNlYXJjaC5kZWJ1ZygnQmFzZUROJywgdGhpcy5vcHRpb25zLkJhc2VETik7XG5cblx0XHRjb25zdCByZXN1bHQgPSB0aGlzLnNlYXJjaEFsbFN5bmModGhpcy5vcHRpb25zLkJhc2VETiwgc2VhcmNoT3B0aW9ucyk7XG5cblx0XHRpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0KSB8fCByZXN1bHQubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0aWYgKHJlc3VsdC5sZW5ndGggPiAxKSB7XG5cdFx0XHRsb2dnZXIuc2VhcmNoLmVycm9yKCdTZWFyY2ggYnkgaWQnLCBpZCwgJ3JldHVybmVkJywgcmVzdWx0Lmxlbmd0aCwgJ3JlY29yZHMnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVzdWx0WzBdO1xuXHR9XG5cblx0Z2V0VXNlckJ5VXNlcm5hbWVTeW5jKHVzZXJuYW1lKSB7XG5cdFx0dGhpcy5iaW5kSWZOZWNlc3NhcnkoKTtcblxuXHRcdGNvbnN0IHNlYXJjaE9wdGlvbnMgPSB7XG5cdFx0XHRmaWx0ZXI6IHRoaXMuZ2V0VXNlckZpbHRlcih1c2VybmFtZSksXG5cdFx0XHRzY29wZTogdGhpcy5vcHRpb25zLlVzZXJfU2VhcmNoX1Njb3BlIHx8ICdzdWInLFxuXHRcdH07XG5cblx0XHRsb2dnZXIuc2VhcmNoLmluZm8oJ1NlYXJjaGluZyB1c2VyJywgdXNlcm5hbWUpO1xuXHRcdGxvZ2dlci5zZWFyY2guZGVidWcoJ3NlYXJjaE9wdGlvbnMnLCBzZWFyY2hPcHRpb25zKTtcblx0XHRsb2dnZXIuc2VhcmNoLmRlYnVnKCdCYXNlRE4nLCB0aGlzLm9wdGlvbnMuQmFzZUROKTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMuc2VhcmNoQWxsU3luYyh0aGlzLm9wdGlvbnMuQmFzZUROLCBzZWFyY2hPcHRpb25zKTtcblxuXHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpIHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRpZiAocmVzdWx0Lmxlbmd0aCA+IDEpIHtcblx0XHRcdGxvZ2dlci5zZWFyY2guZXJyb3IoJ1NlYXJjaCBieSB1c2VybmFtZScsIHVzZXJuYW1lLCAncmV0dXJuZWQnLCByZXN1bHQubGVuZ3RoLCAncmVjb3JkcycpO1xuXHRcdH1cblxuXHRcdHJldHVybiByZXN1bHRbMF07XG5cdH1cblxuXHRpc1VzZXJJbkdyb3VwKHVzZXJuYW1lLCB1c2VyZG4pIHtcblx0XHRpZiAoIXRoaXMub3B0aW9ucy5ncm91cF9maWx0ZXJfZW5hYmxlZCkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0Y29uc3QgZmlsdGVyID0gWycoJiddO1xuXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5ncm91cF9maWx0ZXJfb2JqZWN0X2NsYXNzICE9PSAnJykge1xuXHRcdFx0ZmlsdGVyLnB1c2goYChvYmplY3RjbGFzcz0keyB0aGlzLm9wdGlvbnMuZ3JvdXBfZmlsdGVyX29iamVjdF9jbGFzcyB9KWApO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuZ3JvdXBfZmlsdGVyX2dyb3VwX21lbWJlcl9hdHRyaWJ1dGUgIT09ICcnKSB7XG5cdFx0XHRmaWx0ZXIucHVzaChgKCR7IHRoaXMub3B0aW9ucy5ncm91cF9maWx0ZXJfZ3JvdXBfbWVtYmVyX2F0dHJpYnV0ZSB9PSR7IHRoaXMub3B0aW9ucy5ncm91cF9maWx0ZXJfZ3JvdXBfbWVtYmVyX2Zvcm1hdCB9KWApO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLm9wdGlvbnMuZ3JvdXBfZmlsdGVyX2dyb3VwX2lkX2F0dHJpYnV0ZSAhPT0gJycpIHtcblx0XHRcdGZpbHRlci5wdXNoKGAoJHsgdGhpcy5vcHRpb25zLmdyb3VwX2ZpbHRlcl9ncm91cF9pZF9hdHRyaWJ1dGUgfT0keyB0aGlzLm9wdGlvbnMuZ3JvdXBfZmlsdGVyX2dyb3VwX25hbWUgfSlgKTtcblx0XHR9XG5cdFx0ZmlsdGVyLnB1c2goJyknKTtcblxuXHRcdGNvbnN0IHNlYXJjaE9wdGlvbnMgPSB7XG5cdFx0XHRmaWx0ZXI6IGZpbHRlci5qb2luKCcnKS5yZXBsYWNlKC8je3VzZXJuYW1lfS9nLCB1c2VybmFtZSkucmVwbGFjZSgvI3t1c2VyZG59L2csIHVzZXJkbiksXG5cdFx0XHRzY29wZTogJ3N1YicsXG5cdFx0fTtcblxuXHRcdGxvZ2dlci5zZWFyY2guZGVidWcoJ0dyb3VwIGZpbHRlciBMREFQOicsIHNlYXJjaE9wdGlvbnMuZmlsdGVyKTtcblxuXHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMuc2VhcmNoQWxsU3luYyh0aGlzLm9wdGlvbnMuQmFzZUROLCBzZWFyY2hPcHRpb25zKTtcblxuXHRcdGlmICghQXJyYXkuaXNBcnJheShyZXN1bHQpIHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRleHRyYWN0TGRhcEVudHJ5RGF0YShlbnRyeSkge1xuXHRcdGNvbnN0IHZhbHVlcyA9IHtcblx0XHRcdF9yYXc6IGVudHJ5LnJhdyxcblx0XHR9O1xuXG5cdFx0T2JqZWN0LmtleXModmFsdWVzLl9yYXcpLmZvckVhY2goKGtleSkgPT4ge1xuXHRcdFx0Y29uc3QgdmFsdWUgPSB2YWx1ZXMuX3Jhd1trZXldO1xuXG5cdFx0XHRpZiAoIVsndGh1bWJuYWlsUGhvdG8nLCAnanBlZ1Bob3RvJ10uaW5jbHVkZXMoa2V5KSkge1xuXHRcdFx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBCdWZmZXIpIHtcblx0XHRcdFx0XHR2YWx1ZXNba2V5XSA9IHZhbHVlLnRvU3RyaW5nKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFsdWVzW2tleV0gPSB2YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIHZhbHVlcztcblx0fVxuXG5cdHNlYXJjaEFsbFBhZ2VkKEJhc2VETiwgb3B0aW9ucywgcGFnZSkge1xuXHRcdHRoaXMuYmluZElmTmVjZXNzYXJ5KCk7XG5cblx0XHRjb25zdCBwcm9jZXNzUGFnZSA9ICh7IGVudHJpZXMsIHRpdGxlLCBlbmQsIG5leHQgfSkgPT4ge1xuXHRcdFx0bG9nZ2VyLnNlYXJjaC5pbmZvKHRpdGxlKTtcblx0XHRcdC8vIEZvcmNlIExEQVAgaWRsZSB0byB3YWl0IHRoZSByZWNvcmQgcHJvY2Vzc2luZ1xuXHRcdFx0dGhpcy5jbGllbnQuX3VwZGF0ZUlkbGUodHJ1ZSk7XG5cdFx0XHRwYWdlKG51bGwsIGVudHJpZXMsIHsgZW5kLCBuZXh0OiAoKSA9PiB7XG5cdFx0XHRcdC8vIFJlc2V0IGlkbGUgdGltZXJcblx0XHRcdFx0dGhpcy5jbGllbnQuX3VwZGF0ZUlkbGUoKTtcblx0XHRcdFx0bmV4dCAmJiBuZXh0KCk7XG5cdFx0XHR9IH0pO1xuXHRcdH07XG5cblx0XHR0aGlzLmNsaWVudC5zZWFyY2goQmFzZUROLCBvcHRpb25zLCAoZXJyb3IsIHJlcykgPT4ge1xuXHRcdFx0aWYgKGVycm9yKSB7XG5cdFx0XHRcdGxvZ2dlci5zZWFyY2guZXJyb3IoZXJyb3IpO1xuXHRcdFx0XHRwYWdlKGVycm9yKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXMub24oJ2Vycm9yJywgKGVycm9yKSA9PiB7XG5cdFx0XHRcdGxvZ2dlci5zZWFyY2guZXJyb3IoZXJyb3IpO1xuXHRcdFx0XHRwYWdlKGVycm9yKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSk7XG5cblx0XHRcdGxldCBlbnRyaWVzID0gW107XG5cblx0XHRcdGNvbnN0IGludGVybmFsUGFnZVNpemUgPSBvcHRpb25zLnBhZ2VkICYmIG9wdGlvbnMucGFnZWQucGFnZVNpemUgPiAwID8gb3B0aW9ucy5wYWdlZC5wYWdlU2l6ZSAqIDIgOiA1MDA7XG5cblx0XHRcdHJlcy5vbignc2VhcmNoRW50cnknLCAoZW50cnkpID0+IHtcblx0XHRcdFx0ZW50cmllcy5wdXNoKHRoaXMuZXh0cmFjdExkYXBFbnRyeURhdGEoZW50cnkpKTtcblxuXHRcdFx0XHRpZiAoZW50cmllcy5sZW5ndGggPj0gaW50ZXJuYWxQYWdlU2l6ZSkge1xuXHRcdFx0XHRcdHByb2Nlc3NQYWdlKHtcblx0XHRcdFx0XHRcdGVudHJpZXMsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0ludGVybmFsIFBhZ2UnLFxuXHRcdFx0XHRcdFx0ZW5kOiBmYWxzZSxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRlbnRyaWVzID0gW107XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXMub24oJ3BhZ2UnLCAocmVzdWx0LCBuZXh0KSA9PiB7XG5cdFx0XHRcdGlmICghbmV4dCkge1xuXHRcdFx0XHRcdHRoaXMuY2xpZW50Ll91cGRhdGVJZGxlKHRydWUpO1xuXHRcdFx0XHRcdHByb2Nlc3NQYWdlKHtcblx0XHRcdFx0XHRcdGVudHJpZXMsXG5cdFx0XHRcdFx0XHR0aXRsZTogJ0ZpbmFsIFBhZ2UnLFxuXHRcdFx0XHRcdFx0ZW5kOiB0cnVlLFxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGVudHJpZXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0bG9nZ2VyLnNlYXJjaC5pbmZvKCdQYWdlJyk7XG5cdFx0XHRcdFx0cHJvY2Vzc1BhZ2Uoe1xuXHRcdFx0XHRcdFx0ZW50cmllcyxcblx0XHRcdFx0XHRcdHRpdGxlOiAnUGFnZScsXG5cdFx0XHRcdFx0XHRlbmQ6IGZhbHNlLFxuXHRcdFx0XHRcdFx0bmV4dCxcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRlbnRyaWVzID0gW107XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXG5cdFx0XHRyZXMub24oJ2VuZCcsICgpID0+IHtcblx0XHRcdFx0aWYgKGVudHJpZXMubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cHJvY2Vzc1BhZ2Uoe1xuXHRcdFx0XHRcdFx0ZW50cmllcyxcblx0XHRcdFx0XHRcdHRpdGxlOiAnRmluYWwgUGFnZScsXG5cdFx0XHRcdFx0XHRlbmQ6IHRydWUsXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0ZW50cmllcyA9IFtdO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdHNlYXJjaEFsbEFzeW5jKEJhc2VETiwgb3B0aW9ucywgY2FsbGJhY2spIHtcblx0XHR0aGlzLmJpbmRJZk5lY2Vzc2FyeSgpO1xuXG5cdFx0dGhpcy5jbGllbnQuc2VhcmNoKEJhc2VETiwgb3B0aW9ucywgKGVycm9yLCByZXMpID0+IHtcblx0XHRcdGlmIChlcnJvcikge1xuXHRcdFx0XHRsb2dnZXIuc2VhcmNoLmVycm9yKGVycm9yKTtcblx0XHRcdFx0Y2FsbGJhY2soZXJyb3IpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHJlcy5vbignZXJyb3InLCAoZXJyb3IpID0+IHtcblx0XHRcdFx0bG9nZ2VyLnNlYXJjaC5lcnJvcihlcnJvcik7XG5cdFx0XHRcdGNhbGxiYWNrKGVycm9yKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSk7XG5cblx0XHRcdGNvbnN0IGVudHJpZXMgPSBbXTtcblxuXHRcdFx0cmVzLm9uKCdzZWFyY2hFbnRyeScsIChlbnRyeSkgPT4ge1xuXHRcdFx0XHRlbnRyaWVzLnB1c2godGhpcy5leHRyYWN0TGRhcEVudHJ5RGF0YShlbnRyeSkpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHJlcy5vbignZW5kJywgKCkgPT4ge1xuXHRcdFx0XHRsb2dnZXIuc2VhcmNoLmluZm8oJ1NlYXJjaCByZXN1bHQgY291bnQnLCBlbnRyaWVzLmxlbmd0aCk7XG5cdFx0XHRcdGNhbGxiYWNrKG51bGwsIGVudHJpZXMpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHRhdXRoU3luYyhkbiwgcGFzc3dvcmQpIHtcblx0XHRsb2dnZXIuYXV0aC5pbmZvKCdBdXRoZW50aWNhdGluZycsIGRuKTtcblxuXHRcdHRyeSB7XG5cdFx0XHR0aGlzLmJpbmRTeW5jKGRuLCBwYXNzd29yZCk7XG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmZpbmRfdXNlcl9hZnRlcl9sb2dpbikge1xuXHRcdFx0XHRjb25zdCBzZWFyY2hPcHRpb25zID0ge1xuXHRcdFx0XHRcdHNjb3BlOiB0aGlzLm9wdGlvbnMuVXNlcl9TZWFyY2hfU2NvcGUgfHwgJ3N1YicsXG5cdFx0XHRcdH07XG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHRoaXMuc2VhcmNoQWxsU3luYyhkbiwgc2VhcmNoT3B0aW9ucyk7XG5cdFx0XHRcdGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdFx0bG9nZ2VyLmF1dGguaW5mbygnQmluZCBzdWNjZXNzZnVsIGJ1dCB1c2VyIHdhcyBub3QgZm91bmQgdmlhIHNlYXJjaCcsIGRuLCBzZWFyY2hPcHRpb25zKTtcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGxvZ2dlci5hdXRoLmluZm8oJ0F1dGhlbnRpY2F0ZWQnLCBkbik7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0bG9nZ2VyLmF1dGguaW5mbygnTm90IGF1dGhlbnRpY2F0ZWQnLCBkbik7XG5cdFx0XHRsb2dnZXIuYXV0aC5kZWJ1ZygnZXJyb3InLCBlcnJvcik7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHR9XG5cblx0ZGlzY29ubmVjdCgpIHtcblx0XHR0aGlzLmNvbm5lY3RlZCA9IGZhbHNlO1xuXHRcdHRoaXMuZG9tYWluQmluZGVkID0gZmFsc2U7XG5cdFx0bG9nZ2VyLmNvbm5lY3Rpb24uaW5mbygnRGlzY29uZWN0aW5nJyk7XG5cdFx0dGhpcy5jbGllbnQudW5iaW5kKCk7XG5cdH1cbn1cbiIsIi8qIGVzbGludCBuZXctY2FwOiBbMiwge1wiY2FwSXNOZXdFeGNlcHRpb25zXCI6IFtcIlNIQTI1NlwiXX1dICovXG5cbmltcG9ydCB7IHNsdWcsIGdldExkYXBVc2VybmFtZSwgZ2V0TGRhcFVzZXJVbmlxdWVJRCwgc3luY1VzZXJEYXRhLCBhZGRMZGFwVXNlciB9IGZyb20gJy4vc3luYyc7XG5pbXBvcnQgTERBUCBmcm9tICcuL2xkYXAnO1xuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCdMREFQSGFuZGxlcicsIHt9KTtcblxuZnVuY3Rpb24gZmFsbGJhY2tEZWZhdWx0QWNjb3VudFN5c3RlbShiaW5kLCB1c2VybmFtZSwgcGFzc3dvcmQpIHtcblx0aWYgKHR5cGVvZiB1c2VybmFtZSA9PT0gJ3N0cmluZycpIHtcblx0XHRpZiAodXNlcm5hbWUuaW5kZXhPZignQCcpID09PSAtMSkge1xuXHRcdFx0dXNlcm5hbWUgPSB7IHVzZXJuYW1lIH07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVzZXJuYW1lID0geyBlbWFpbDogdXNlcm5hbWUgfTtcblx0XHR9XG5cdH1cblxuXHRsb2dnZXIuaW5mbygnRmFsbGJhY2sgdG8gZGVmYXVsdCBhY2NvdW50IHN5c3RlbScsIHVzZXJuYW1lKTtcblxuXHRjb25zdCBsb2dpblJlcXVlc3QgPSB7XG5cdFx0dXNlcjogdXNlcm5hbWUsXG5cdFx0cGFzc3dvcmQ6IHtcblx0XHRcdGRpZ2VzdDogU0hBMjU2KHBhc3N3b3JkKSxcblx0XHRcdGFsZ29yaXRobTogJ3NoYS0yNTYnLFxuXHRcdH0sXG5cdH07XG5cblx0cmV0dXJuIEFjY291bnRzLl9ydW5Mb2dpbkhhbmRsZXJzKGJpbmQsIGxvZ2luUmVxdWVzdCk7XG59XG5cbkFjY291bnRzLnJlZ2lzdGVyTG9naW5IYW5kbGVyKCdsZGFwJywgZnVuY3Rpb24obG9naW5SZXF1ZXN0KSB7XG5cdGlmICghbG9naW5SZXF1ZXN0LmxkYXAgfHwgIWxvZ2luUmVxdWVzdC5sZGFwT3B0aW9ucykge1xuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRsb2dnZXIuaW5mbygnSW5pdCBMREFQIGxvZ2luJywgbG9naW5SZXF1ZXN0LnVzZXJuYW1lKTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfRW5hYmxlJykgIT09IHRydWUpIHtcblx0XHRyZXR1cm4gZmFsbGJhY2tEZWZhdWx0QWNjb3VudFN5c3RlbSh0aGlzLCBsb2dpblJlcXVlc3QudXNlcm5hbWUsIGxvZ2luUmVxdWVzdC5sZGFwUGFzcyk7XG5cdH1cblxuXHRjb25zdCBzZWxmID0gdGhpcztcblx0Y29uc3QgbGRhcCA9IG5ldyBMREFQKCk7XG5cdGxldCBsZGFwVXNlcjtcblxuXHR0cnkge1xuXHRcdGxkYXAuY29ubmVjdFN5bmMoKTtcblx0XHRjb25zdCB1c2VycyA9IGxkYXAuc2VhcmNoVXNlcnNTeW5jKGxvZ2luUmVxdWVzdC51c2VybmFtZSk7XG5cblx0XHRpZiAodXNlcnMubGVuZ3RoICE9PSAxKSB7XG5cdFx0XHRsb2dnZXIuaW5mbygnU2VhcmNoIHJldHVybmVkJywgdXNlcnMubGVuZ3RoLCAncmVjb3JkKHMpIGZvcicsIGxvZ2luUmVxdWVzdC51c2VybmFtZSk7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgbm90IEZvdW5kJyk7XG5cdFx0fVxuXG5cdFx0aWYgKGxkYXAuYXV0aFN5bmModXNlcnNbMF0uZG4sIGxvZ2luUmVxdWVzdC5sZGFwUGFzcykgPT09IHRydWUpIHtcblx0XHRcdGlmIChsZGFwLmlzVXNlckluR3JvdXAgKGxvZ2luUmVxdWVzdC51c2VybmFtZSwgdXNlcnNbMF0uZG4pKSB7XG5cdFx0XHRcdGxkYXBVc2VyID0gdXNlcnNbMF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgbm90IGluIGEgdmFsaWQgZ3JvdXAnKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nZ2VyLmluZm8oJ1dyb25nIHBhc3N3b3JkIGZvcicsIGxvZ2luUmVxdWVzdC51c2VybmFtZSk7XG5cdFx0fVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdGxvZ2dlci5lcnJvcihlcnJvcik7XG5cdH1cblxuXHRpZiAobGRhcFVzZXIgPT09IHVuZGVmaW5lZCkge1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Mb2dpbl9GYWxsYmFjaycpID09PSB0cnVlKSB7XG5cdFx0XHRyZXR1cm4gZmFsbGJhY2tEZWZhdWx0QWNjb3VudFN5c3RlbShzZWxmLCBsb2dpblJlcXVlc3QudXNlcm5hbWUsIGxvZ2luUmVxdWVzdC5sZGFwUGFzcyk7XG5cdFx0fVxuXG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignTERBUC1sb2dpbi1lcnJvcicsIGBMREFQIEF1dGhlbnRpY2F0aW9uIGZhaWxlZCB3aXRoIHByb3ZpZGVkIHVzZXJuYW1lIFskeyBsb2dpblJlcXVlc3QudXNlcm5hbWUgfV1gKTtcblx0fVxuXG5cdC8vIExvb2sgdG8gc2VlIGlmIHVzZXIgYWxyZWFkeSBleGlzdHNcblx0bGV0IHVzZXJRdWVyeTtcblxuXHRjb25zdCBVbmlxdWVfSWRlbnRpZmllcl9GaWVsZCA9IGdldExkYXBVc2VyVW5pcXVlSUQobGRhcFVzZXIpO1xuXHRsZXQgdXNlcjtcblxuXHRpZiAoVW5pcXVlX0lkZW50aWZpZXJfRmllbGQpIHtcblx0XHR1c2VyUXVlcnkgPSB7XG5cdFx0XHQnc2VydmljZXMubGRhcC5pZCc6IFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkLnZhbHVlLFxuXHRcdH07XG5cblx0XHRsb2dnZXIuaW5mbygnUXVlcnlpbmcgdXNlcicpO1xuXHRcdGxvZ2dlci5kZWJ1ZygndXNlclF1ZXJ5JywgdXNlclF1ZXJ5KTtcblxuXHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VyUXVlcnkpO1xuXHR9XG5cblx0bGV0IHVzZXJuYW1lO1xuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Vc2VybmFtZV9GaWVsZCcpICE9PSAnJykge1xuXHRcdHVzZXJuYW1lID0gc2x1ZyhnZXRMZGFwVXNlcm5hbWUobGRhcFVzZXIpKTtcblx0fSBlbHNlIHtcblx0XHR1c2VybmFtZSA9IHNsdWcobG9naW5SZXF1ZXN0LnVzZXJuYW1lKTtcblx0fVxuXG5cdGlmICghdXNlcikge1xuXHRcdHVzZXJRdWVyeSA9IHtcblx0XHRcdHVzZXJuYW1lLFxuXHRcdH07XG5cblx0XHRsb2dnZXIuZGVidWcoJ3VzZXJRdWVyeScsIHVzZXJRdWVyeSk7XG5cblx0XHR1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUodXNlclF1ZXJ5KTtcblx0fVxuXG5cdC8vIExvZ2luIHVzZXIgaWYgdGhleSBleGlzdFxuXHRpZiAodXNlcikge1xuXHRcdGlmICh1c2VyLmxkYXAgIT09IHRydWUgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfTWVyZ2VfRXhpc3RpbmdfVXNlcnMnKSAhPT0gdHJ1ZSkge1xuXHRcdFx0bG9nZ2VyLmluZm8oJ1VzZXIgZXhpc3RzIHdpdGhvdXQgXCJsZGFwOiB0cnVlXCInKTtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ0xEQVAtbG9naW4tZXJyb3InLCBgTERBUCBBdXRoZW50aWNhdGlvbiBzdWNjZWRlZCwgYnV0IHRoZXJlJ3MgYWxyZWFkeSBhbiBleGlzdGluZyB1c2VyIHdpdGggcHJvdmlkZWQgdXNlcm5hbWUgWyR7IHVzZXJuYW1lIH1dIGluIE1vbmdvLmApO1xuXHRcdH1cblxuXHRcdGxvZ2dlci5pbmZvKCdMb2dnaW5nIHVzZXInKTtcblxuXHRcdGNvbnN0IHN0YW1wZWRUb2tlbiA9IEFjY291bnRzLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG5cblx0XHRNZXRlb3IudXNlcnMudXBkYXRlKHVzZXIuX2lkLCB7XG5cdFx0XHQkcHVzaDoge1xuXHRcdFx0XHQnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zJzogQWNjb3VudHMuX2hhc2hTdGFtcGVkVG9rZW4oc3RhbXBlZFRva2VuKSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRzeW5jVXNlckRhdGEodXNlciwgbGRhcFVzZXIpO1xuXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0xvZ2luX0ZhbGxiYWNrJykgPT09IHRydWUgJiYgdHlwZW9mIGxvZ2luUmVxdWVzdC5sZGFwUGFzcyA9PT0gJ3N0cmluZycgJiYgbG9naW5SZXF1ZXN0LmxkYXBQYXNzLnRyaW0oKSAhPT0gJycpIHtcblx0XHRcdEFjY291bnRzLnNldFBhc3N3b3JkKHVzZXIuX2lkLCBsb2dpblJlcXVlc3QubGRhcFBhc3MsIHsgbG9nb3V0OiBmYWxzZSB9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4ge1xuXHRcdFx0dXNlcklkOiB1c2VyLl9pZCxcblx0XHRcdHRva2VuOiBzdGFtcGVkVG9rZW4udG9rZW4sXG5cdFx0fTtcblx0fVxuXG5cdGxvZ2dlci5pbmZvKCdVc2VyIGRvZXMgbm90IGV4aXN0LCBjcmVhdGluZycsIHVzZXJuYW1lKTtcblxuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfVXNlcm5hbWVfRmllbGQnKSA9PT0gJycpIHtcblx0XHR1c2VybmFtZSA9IHVuZGVmaW5lZDtcblx0fVxuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9Mb2dpbl9GYWxsYmFjaycpICE9PSB0cnVlKSB7XG5cdFx0bG9naW5SZXF1ZXN0LmxkYXBQYXNzID0gdW5kZWZpbmVkO1xuXHR9XG5cblx0Ly8gQ3JlYXRlIG5ldyB1c2VyXG5cdGNvbnN0IHJlc3VsdCA9IGFkZExkYXBVc2VyKGxkYXBVc2VyLCB1c2VybmFtZSwgbG9naW5SZXF1ZXN0LmxkYXBQYXNzKTtcblxuXHRpZiAocmVzdWx0IGluc3RhbmNlb2YgRXJyb3IpIHtcblx0XHR0aHJvdyByZXN1bHQ7XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0O1xufSk7XG4iLCJSb2NrZXRDaGF0LnNldHRpbmdzLmFkZEdyb3VwKCdMREFQJywgZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGVuYWJsZVF1ZXJ5ID0geyBfaWQ6ICdMREFQX0VuYWJsZScsIHZhbHVlOiB0cnVlIH07XG5cdGNvbnN0IGVuYWJsZUF1dGhlbnRpY2F0aW9uID0gW1xuXHRcdGVuYWJsZVF1ZXJ5LFxuXHRcdHsgX2lkOiAnTERBUF9BdXRoZW50aWNhdGlvbicsIHZhbHVlOiB0cnVlIH0sXG5cdF07XG5cdGNvbnN0IGVuYWJsZVRMU1F1ZXJ5ID0gW1xuXHRcdGVuYWJsZVF1ZXJ5LFxuXHRcdHsgX2lkOiAnTERBUF9FbmNyeXB0aW9uJywgdmFsdWU6IHsgJGluOiBbJ3RscycsICdzc2wnXSB9IH0sXG5cdF07XG5cdGNvbnN0IHN5bmNEYXRhUXVlcnkgPSBbXG5cdFx0ZW5hYmxlUXVlcnksXG5cdFx0eyBfaWQ6ICdMREFQX1N5bmNfVXNlcl9EYXRhJywgdmFsdWU6IHRydWUgfSxcblx0XTtcblx0Y29uc3QgZ3JvdXBGaWx0ZXJRdWVyeSA9IFtcblx0XHRlbmFibGVRdWVyeSxcblx0XHR7IF9pZDogJ0xEQVBfR3JvdXBfRmlsdGVyX0VuYWJsZScsIHZhbHVlOiB0cnVlIH0sXG5cdF07XG5cdGNvbnN0IGJhY2tncm91bmRTeW5jUXVlcnkgPSBbXG5cdFx0ZW5hYmxlUXVlcnksXG5cdFx0eyBfaWQ6ICdMREFQX0JhY2tncm91bmRfU3luYycsIHZhbHVlOiB0cnVlIH0sXG5cdF07XG5cblx0dGhpcy5hZGQoJ0xEQVBfRW5hYmxlJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBwdWJsaWM6IHRydWUgfSk7XG5cdHRoaXMuYWRkKCdMREFQX0xvZ2luX0ZhbGxiYWNrJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5IH0pO1xuXHR0aGlzLmFkZCgnTERBUF9GaW5kX1VzZXJfQWZ0ZXJfTG9naW4nLCB0cnVlLCB7IHR5cGU6ICdib29sZWFuJywgZW5hYmxlUXVlcnkgfSk7XG5cdHRoaXMuYWRkKCdMREFQX0hvc3QnLCAnJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdHRoaXMuYWRkKCdMREFQX1BvcnQnLCAnMzg5JywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdHRoaXMuYWRkKCdMREFQX1JlY29ubmVjdCcsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgZW5hYmxlUXVlcnkgfSk7XG5cdHRoaXMuYWRkKCdMREFQX0VuY3J5cHRpb24nLCAncGxhaW4nLCB7IHR5cGU6ICdzZWxlY3QnLCB2YWx1ZXM6IFt7IGtleTogJ3BsYWluJywgaTE4bkxhYmVsOiAnTm9fRW5jcnlwdGlvbicgfSwgeyBrZXk6ICd0bHMnLCBpMThuTGFiZWw6ICdTdGFydFRMUycgfSwgeyBrZXk6ICdzc2wnLCBpMThuTGFiZWw6ICdTU0wvTERBUFMnIH1dLCBlbmFibGVRdWVyeSB9KTtcblx0dGhpcy5hZGQoJ0xEQVBfQ0FfQ2VydCcsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBtdWx0aWxpbmU6IHRydWUsIGVuYWJsZVF1ZXJ5OiBlbmFibGVUTFNRdWVyeSB9KTtcblx0dGhpcy5hZGQoJ0xEQVBfUmVqZWN0X1VuYXV0aG9yaXplZCcsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBlbmFibGVRdWVyeTogZW5hYmxlVExTUXVlcnkgfSk7XG5cdHRoaXMuYWRkKCdMREFQX0Jhc2VETicsICcnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeSB9KTtcblx0dGhpcy5hZGQoJ0xEQVBfSW50ZXJuYWxfTG9nX0xldmVsJywgJ2Rpc2FibGVkJywge1xuXHRcdHR5cGU6ICdzZWxlY3QnLFxuXHRcdHZhbHVlczogW1xuXHRcdFx0eyBrZXk6ICdkaXNhYmxlZCcsIGkxOG5MYWJlbDogJ0Rpc2FibGVkJyB9LFxuXHRcdFx0eyBrZXk6ICdlcnJvcicsIGkxOG5MYWJlbDogJ0Vycm9yJyB9LFxuXHRcdFx0eyBrZXk6ICd3YXJuJywgaTE4bkxhYmVsOiAnV2FybicgfSxcblx0XHRcdHsga2V5OiAnaW5mbycsIGkxOG5MYWJlbDogJ0luZm8nIH0sXG5cdFx0XHR7IGtleTogJ2RlYnVnJywgaTE4bkxhYmVsOiAnRGVidWcnIH0sXG5cdFx0XHR7IGtleTogJ3RyYWNlJywgaTE4bkxhYmVsOiAnVHJhY2UnIH0sXG5cdFx0XSxcblx0XHRlbmFibGVRdWVyeSxcblx0fSk7XG5cdHRoaXMuYWRkKCdMREFQX1Rlc3RfQ29ubmVjdGlvbicsICdsZGFwX3Rlc3RfY29ubmVjdGlvbicsIHsgdHlwZTogJ2FjdGlvbicsIGFjdGlvblRleHQ6ICdUZXN0X0Nvbm5lY3Rpb24nIH0pO1xuXG5cdHRoaXMuc2VjdGlvbignQXV0aGVudGljYXRpb24nLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnTERBUF9BdXRoZW50aWNhdGlvbicsIGZhbHNlLCB7IHR5cGU6ICdib29sZWFuJywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfQXV0aGVudGljYXRpb25fVXNlckROJywgJycsIHsgdHlwZTogJ3N0cmluZycsIGVuYWJsZVF1ZXJ5OiBlbmFibGVBdXRoZW50aWNhdGlvbiB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9BdXRoZW50aWNhdGlvbl9QYXNzd29yZCcsICcnLCB7IHR5cGU6ICdwYXNzd29yZCcsIGVuYWJsZVF1ZXJ5OiBlbmFibGVBdXRoZW50aWNhdGlvbiB9KTtcblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdUaW1lb3V0cycsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdMREFQX1RpbWVvdXQnLCA2MDAwMCwgeyB0eXBlOiAnaW50JywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfQ29ubmVjdF9UaW1lb3V0JywgMTAwMCwgeyB0eXBlOiAnaW50JywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfSWRsZV9UaW1lb3V0JywgMTAwMCwgeyB0eXBlOiAnaW50JywgZW5hYmxlUXVlcnkgfSk7XG5cdH0pO1xuXG5cdHRoaXMuc2VjdGlvbignVXNlciBTZWFyY2gnLCBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmFkZCgnTERBUF9Vc2VyX1NlYXJjaF9GaWx0ZXInLCAnKG9iamVjdGNsYXNzPSopJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfVXNlcl9TZWFyY2hfU2NvcGUnLCAnc3ViJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfVXNlcl9TZWFyY2hfRmllbGQnLCAnc0FNQWNjb3VudE5hbWUnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9TZWFyY2hfUGFnZV9TaXplJywgMjUwLCB7IHR5cGU6ICdpbnQnLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9TZWFyY2hfU2l6ZV9MaW1pdCcsIDEwMDAsIHsgdHlwZTogJ2ludCcsIGVuYWJsZVF1ZXJ5IH0pO1xuXHR9KTtcblxuXHR0aGlzLnNlY3Rpb24oJ1VzZXIgU2VhcmNoIChHcm91cCBWYWxpZGF0aW9uKScsIGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuYWRkKCdMREFQX0dyb3VwX0ZpbHRlcl9FbmFibGUnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5IH0pO1xuXHRcdHRoaXMuYWRkKCdMREFQX0dyb3VwX0ZpbHRlcl9PYmplY3RDbGFzcycsICdncm91cE9mVW5pcXVlTmFtZXMnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeTogZ3JvdXBGaWx0ZXJRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9Hcm91cF9GaWx0ZXJfR3JvdXBfSWRfQXR0cmlidXRlJywgJ2NuJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnk6IGdyb3VwRmlsdGVyUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfR3JvdXBfRmlsdGVyX0dyb3VwX01lbWJlcl9BdHRyaWJ1dGUnLCAndW5pcXVlTWVtYmVyJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnk6IGdyb3VwRmlsdGVyUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfR3JvdXBfRmlsdGVyX0dyb3VwX01lbWJlcl9Gb3JtYXQnLCAndW5pcXVlTWVtYmVyJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnk6IGdyb3VwRmlsdGVyUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfR3JvdXBfRmlsdGVyX0dyb3VwX05hbWUnLCAnUk9DS0VUX0NIQVQnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeTogZ3JvdXBGaWx0ZXJRdWVyeSB9KTtcblx0fSk7XG5cblx0dGhpcy5zZWN0aW9uKCdTeW5jIC8gSW1wb3J0JywgZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfVXNlcm5hbWVfRmllbGQnLCAnc0FNQWNjb3VudE5hbWUnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9VbmlxdWVfSWRlbnRpZmllcl9GaWVsZCcsICdvYmplY3RHVUlELGlibS1lbnRyeVVVSUQsR1VJRCxkb21pbm9VTklELG5zdW5pcXVlSWQsdWlkTnVtYmVyJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfRGVmYXVsdF9Eb21haW4nLCAnJywgeyB0eXBlOiAnc3RyaW5nJywgZW5hYmxlUXVlcnkgfSk7XG5cdFx0dGhpcy5hZGQoJ0xEQVBfTWVyZ2VfRXhpc3RpbmdfVXNlcnMnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5IH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0xEQVBfU3luY19Vc2VyX0RhdGEnLCBmYWxzZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5IH0pO1xuXHRcdHRoaXMuYWRkKCdMREFQX1N5bmNfVXNlcl9EYXRhX0ZpZWxkTWFwJywgJ3tcImNuXCI6XCJuYW1lXCIsIFwibWFpbFwiOlwiZW1haWxcIn0nLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeTogc3luY0RhdGFRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9TeW5jX1VzZXJfQXZhdGFyJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5IH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0xEQVBfQmFja2dyb3VuZF9TeW5jJywgZmFsc2UsIHsgdHlwZTogJ2Jvb2xlYW4nLCBlbmFibGVRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfSW50ZXJ2YWwnLCAnRXZlcnkgMjQgaG91cnMnLCB7IHR5cGU6ICdzdHJpbmcnLCBlbmFibGVRdWVyeTogYmFja2dyb3VuZFN5bmNRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfSW1wb3J0X05ld19Vc2VycycsIHRydWUsIHsgdHlwZTogJ2Jvb2xlYW4nLCBlbmFibGVRdWVyeTogYmFja2dyb3VuZFN5bmNRdWVyeSB9KTtcblx0XHR0aGlzLmFkZCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfS2VlcF9FeGlzdGFudF9Vc2Vyc19VcGRhdGVkJywgdHJ1ZSwgeyB0eXBlOiAnYm9vbGVhbicsIGVuYWJsZVF1ZXJ5OiBiYWNrZ3JvdW5kU3luY1F1ZXJ5IH0pO1xuXG5cdFx0dGhpcy5hZGQoJ0xEQVBfU3luY19Ob3cnLCAnbGRhcF9zeW5jX25vdycsIHsgdHlwZTogJ2FjdGlvbicsIGFjdGlvblRleHQ6ICdFeGVjdXRlX1N5bmNocm9uaXphdGlvbl9Ob3cnIH0pO1xuXHR9KTtcbn0pO1xuIiwiLyogZ2xvYmFscyBzbHVnaWZ5LCBTeW5jZWRDcm9uICovXG5cbmltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuaW1wb3J0IExEQVAgZnJvbSAnLi9sZGFwJztcblxuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcignTERBUFN5bmMnLCB7fSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzbHVnKHRleHQpIHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVVEY4X05hbWVzX1NsdWdpZnknKSAhPT0gdHJ1ZSkge1xuXHRcdHJldHVybiB0ZXh0O1xuXHR9XG5cdHRleHQgPSBzbHVnaWZ5KHRleHQsICcuJyk7XG5cdHJldHVybiB0ZXh0LnJlcGxhY2UoL1teMC05YS16LV8uXS9nLCAnJyk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb3BlcnR5VmFsdWUob2JqLCBrZXkpIHtcblx0dHJ5IHtcblx0XHRyZXR1cm4gXy5yZWR1Y2Uoa2V5LnNwbGl0KCcuJyksIChhY2MsIGVsKSA9PiBhY2NbZWxdLCBvYmopO1xuXHR9IGNhdGNoIChlcnIpIHtcblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExkYXBVc2VybmFtZShsZGFwVXNlcikge1xuXHRjb25zdCB1c2VybmFtZUZpZWxkID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfVXNlcm5hbWVfRmllbGQnKTtcblxuXHRpZiAodXNlcm5hbWVGaWVsZC5pbmRleE9mKCcjeycpID4gLTEpIHtcblx0XHRyZXR1cm4gdXNlcm5hbWVGaWVsZC5yZXBsYWNlKC8jeyguKz8pfS9nLCBmdW5jdGlvbihtYXRjaCwgZmllbGQpIHtcblx0XHRcdHJldHVybiBsZGFwVXNlcltmaWVsZF07XG5cdFx0fSk7XG5cdH1cblxuXHRyZXR1cm4gbGRhcFVzZXJbdXNlcm5hbWVGaWVsZF07XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldExkYXBVc2VyVW5pcXVlSUQobGRhcFVzZXIpIHtcblx0bGV0IFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfVW5pcXVlX0lkZW50aWZpZXJfRmllbGQnKTtcblxuXHRpZiAoVW5pcXVlX0lkZW50aWZpZXJfRmllbGQgIT09ICcnKSB7XG5cdFx0VW5pcXVlX0lkZW50aWZpZXJfRmllbGQgPSBVbmlxdWVfSWRlbnRpZmllcl9GaWVsZC5yZXBsYWNlKC9cXHMvZywgJycpLnNwbGl0KCcsJyk7XG5cdH0gZWxzZSB7XG5cdFx0VW5pcXVlX0lkZW50aWZpZXJfRmllbGQgPSBbXTtcblx0fVxuXG5cdGxldCBVc2VyX1NlYXJjaF9GaWVsZCA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1VzZXJfU2VhcmNoX0ZpZWxkJyk7XG5cblx0aWYgKFVzZXJfU2VhcmNoX0ZpZWxkICE9PSAnJykge1xuXHRcdFVzZXJfU2VhcmNoX0ZpZWxkID0gVXNlcl9TZWFyY2hfRmllbGQucmVwbGFjZSgvXFxzL2csICcnKS5zcGxpdCgnLCcpO1xuXHR9IGVsc2Uge1xuXHRcdFVzZXJfU2VhcmNoX0ZpZWxkID0gW107XG5cdH1cblxuXHRVbmlxdWVfSWRlbnRpZmllcl9GaWVsZCA9IFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkLmNvbmNhdChVc2VyX1NlYXJjaF9GaWVsZCk7XG5cblx0aWYgKFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkLmxlbmd0aCA+IDApIHtcblx0XHRVbmlxdWVfSWRlbnRpZmllcl9GaWVsZCA9IFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkLmZpbmQoKGZpZWxkKSA9PiAhXy5pc0VtcHR5KGxkYXBVc2VyLl9yYXdbZmllbGRdKSk7XG5cdFx0aWYgKFVuaXF1ZV9JZGVudGlmaWVyX0ZpZWxkKSB7XG5cdFx0XHRVbmlxdWVfSWRlbnRpZmllcl9GaWVsZCA9IHtcblx0XHRcdFx0YXR0cmlidXRlOiBVbmlxdWVfSWRlbnRpZmllcl9GaWVsZCxcblx0XHRcdFx0dmFsdWU6IGxkYXBVc2VyLl9yYXdbVW5pcXVlX0lkZW50aWZpZXJfRmllbGRdLnRvU3RyaW5nKCdoZXgnKSxcblx0XHRcdH07XG5cdFx0fVxuXHRcdHJldHVybiBVbmlxdWVfSWRlbnRpZmllcl9GaWVsZDtcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGF0YVRvU3luY1VzZXJEYXRhKGxkYXBVc2VyLCB1c2VyKSB7XG5cdGNvbnN0IHN5bmNVc2VyRGF0YSA9IFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1N5bmNfVXNlcl9EYXRhJyk7XG5cdGNvbnN0IHN5bmNVc2VyRGF0YUZpZWxkTWFwID0gUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfU3luY19Vc2VyX0RhdGFfRmllbGRNYXAnKS50cmltKCk7XG5cblx0Y29uc3QgdXNlckRhdGEgPSB7fTtcblxuXHRpZiAoc3luY1VzZXJEYXRhICYmIHN5bmNVc2VyRGF0YUZpZWxkTWFwKSB7XG5cdFx0Y29uc3Qgd2hpdGVsaXN0ZWRVc2VyRmllbGRzID0gWydlbWFpbCcsICduYW1lJywgJ2N1c3RvbUZpZWxkcyddO1xuXHRcdGNvbnN0IGZpZWxkTWFwID0gSlNPTi5wYXJzZShzeW5jVXNlckRhdGFGaWVsZE1hcCk7XG5cdFx0Y29uc3QgZW1haWxMaXN0ID0gW107XG5cdFx0Xy5tYXAoZmllbGRNYXAsIGZ1bmN0aW9uKHVzZXJGaWVsZCwgbGRhcEZpZWxkKSB7XG5cdFx0XHRzd2l0Y2ggKHVzZXJGaWVsZCkge1xuXHRcdFx0XHRjYXNlICdlbWFpbCc6XG5cdFx0XHRcdFx0aWYgKCFsZGFwVXNlci5oYXNPd25Qcm9wZXJ0eShsZGFwRmllbGQpKSB7XG5cdFx0XHRcdFx0XHRsb2dnZXIuZGVidWcoYHVzZXIgZG9lcyBub3QgaGF2ZSBhdHRyaWJ1dGU6ICR7IGxkYXBGaWVsZCB9YCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKF8uaXNPYmplY3QobGRhcFVzZXJbbGRhcEZpZWxkXSkpIHtcblx0XHRcdFx0XHRcdF8ubWFwKGxkYXBVc2VyW2xkYXBGaWVsZF0sIGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0XHRcdFx0ZW1haWxMaXN0LnB1c2goeyBhZGRyZXNzOiBpdGVtLCB2ZXJpZmllZDogdHJ1ZSB9KTtcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlbWFpbExpc3QucHVzaCh7IGFkZHJlc3M6IGxkYXBVc2VyW2xkYXBGaWVsZF0sIHZlcmlmaWVkOiB0cnVlIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRkZWZhdWx0OlxuXHRcdFx0XHRcdGNvbnN0IFtvdXRlcktleSwgaW5uZXJLZXlzXSA9IHVzZXJGaWVsZC5zcGxpdCgvXFwuKC4rKS8pO1xuXG5cdFx0XHRcdFx0aWYgKCFfLmZpbmQod2hpdGVsaXN0ZWRVc2VyRmllbGRzLCAoZWwpID0+IGVsID09PSBvdXRlcktleSkpIHtcblx0XHRcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgdXNlciBhdHRyaWJ1dGUgbm90IHdoaXRlbGlzdGVkOiAkeyB1c2VyRmllbGQgfWApO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChvdXRlcktleSA9PT0gJ2N1c3RvbUZpZWxkcycpIHtcblx0XHRcdFx0XHRcdGxldCBjdXN0b21GaWVsZHNNZXRhO1xuXG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRjdXN0b21GaWVsZHNNZXRhID0gSlNPTi5wYXJzZShSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnQWNjb3VudHNfQ3VzdG9tRmllbGRzJykpO1xuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xuXHRcdFx0XHRcdFx0XHRsb2dnZXIuZGVidWcoJ0ludmFsaWQgSlNPTiBmb3IgQ3VzdG9tIEZpZWxkcycpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmICghZ2V0UHJvcGVydHlWYWx1ZShjdXN0b21GaWVsZHNNZXRhLCBpbm5lcktleXMpKSB7XG5cdFx0XHRcdFx0XHRcdGxvZ2dlci5kZWJ1ZyhgdXNlciBhdHRyaWJ1dGUgZG9lcyBub3QgZXhpc3Q6ICR7IHVzZXJGaWVsZCB9YCk7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRjb25zdCB0bXBVc2VyRmllbGQgPSBnZXRQcm9wZXJ0eVZhbHVlKHVzZXIsIHVzZXJGaWVsZCk7XG5cdFx0XHRcdFx0Y29uc3QgdG1wTGRhcEZpZWxkID0gUm9ja2V0Q2hhdC50ZW1wbGF0ZVZhckhhbmRsZXIobGRhcEZpZWxkLCBsZGFwVXNlcik7XG5cblx0XHRcdFx0XHRpZiAodG1wTGRhcEZpZWxkICYmIHRtcFVzZXJGaWVsZCAhPT0gdG1wTGRhcEZpZWxkKSB7XG5cdFx0XHRcdFx0XHQvLyBjcmVhdGVzIHRoZSBvYmplY3Qgc3RydWN0dXJlIGluc3RlYWQgb2YganVzdCBhc3NpZ25pbmcgJ3RtcExkYXBGaWVsZCcgdG9cblx0XHRcdFx0XHRcdC8vICd1c2VyRGF0YVt1c2VyRmllbGRdJyBpbiBvcmRlciB0byBhdm9pZCB0aGUgXCJjYW5ub3QgdXNlIHRoZSBwYXJ0ICguLi4pXG5cdFx0XHRcdFx0XHQvLyB0byB0cmF2ZXJzZSB0aGUgZWxlbWVudFwiIChNb25nb0RCKSBlcnJvciB0aGF0IGNhbiBoYXBwZW4uIERvIG5vdCBoYW5kbGVcblx0XHRcdFx0XHRcdC8vIGFycmF5cy5cblx0XHRcdFx0XHRcdC8vIFRPRE86IEZpbmQgYSBiZXR0ZXIgc29sdXRpb24uXG5cdFx0XHRcdFx0XHRjb25zdCBkS2V5cyA9IHVzZXJGaWVsZC5zcGxpdCgnLicpO1xuXHRcdFx0XHRcdFx0Y29uc3QgbGFzdEtleSA9IF8ubGFzdChkS2V5cyk7XG5cdFx0XHRcdFx0XHRfLnJlZHVjZShkS2V5cywgKG9iaiwgY3VycktleSkgPT4gKFxuXHRcdFx0XHRcdFx0XHQoY3VycktleSA9PT0gbGFzdEtleSlcblx0XHRcdFx0XHRcdFx0XHQ/IG9ialtjdXJyS2V5XSA9IHRtcExkYXBGaWVsZFxuXHRcdFx0XHRcdFx0XHRcdDogb2JqW2N1cnJLZXldID0gb2JqW2N1cnJLZXldIHx8IHt9XG5cdFx0XHRcdFx0XHQpLCB1c2VyRGF0YSk7XG5cdFx0XHRcdFx0XHRsb2dnZXIuZGVidWcoYHVzZXIuJHsgdXNlckZpZWxkIH0gY2hhbmdlZCB0bzogJHsgdG1wTGRhcEZpZWxkIH1gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoZW1haWxMaXN0Lmxlbmd0aCA+IDApIHtcblx0XHRcdGlmIChKU09OLnN0cmluZ2lmeSh1c2VyLmVtYWlscykgIT09IEpTT04uc3RyaW5naWZ5KGVtYWlsTGlzdCkpIHtcblx0XHRcdFx0dXNlckRhdGEuZW1haWxzID0gZW1haWxMaXN0O1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGNvbnN0IHVuaXF1ZUlkID0gZ2V0TGRhcFVzZXJVbmlxdWVJRChsZGFwVXNlcik7XG5cblx0aWYgKHVuaXF1ZUlkICYmICghdXNlci5zZXJ2aWNlcyB8fCAhdXNlci5zZXJ2aWNlcy5sZGFwIHx8IHVzZXIuc2VydmljZXMubGRhcC5pZCAhPT0gdW5pcXVlSWQudmFsdWUgfHwgdXNlci5zZXJ2aWNlcy5sZGFwLmlkQXR0cmlidXRlICE9PSB1bmlxdWVJZC5hdHRyaWJ1dGUpKSB7XG5cdFx0dXNlckRhdGFbJ3NlcnZpY2VzLmxkYXAuaWQnXSA9IHVuaXF1ZUlkLnZhbHVlO1xuXHRcdHVzZXJEYXRhWydzZXJ2aWNlcy5sZGFwLmlkQXR0cmlidXRlJ10gPSB1bmlxdWVJZC5hdHRyaWJ1dGU7XG5cdH1cblxuXHRpZiAodXNlci5sZGFwICE9PSB0cnVlKSB7XG5cdFx0dXNlckRhdGEubGRhcCA9IHRydWU7XG5cdH1cblxuXHRpZiAoXy5zaXplKHVzZXJEYXRhKSkge1xuXHRcdHJldHVybiB1c2VyRGF0YTtcblx0fVxufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jVXNlckRhdGEodXNlciwgbGRhcFVzZXIpIHtcblx0bG9nZ2VyLmluZm8oJ1N5bmNpbmcgdXNlciBkYXRhJyk7XG5cdGxvZ2dlci5kZWJ1ZygndXNlcicsIHsgZW1haWw6IHVzZXIuZW1haWwsIF9pZDogdXNlci5faWQgfSk7XG5cdGxvZ2dlci5kZWJ1ZygnbGRhcFVzZXInLCBsZGFwVXNlci5vYmplY3QpO1xuXG5cdGNvbnN0IHVzZXJEYXRhID0gZ2V0RGF0YVRvU3luY1VzZXJEYXRhKGxkYXBVc2VyLCB1c2VyKTtcblx0aWYgKHVzZXIgJiYgdXNlci5faWQgJiYgdXNlckRhdGEpIHtcblx0XHRsb2dnZXIuZGVidWcoJ3NldHRpbmcnLCBKU09OLnN0cmluZ2lmeSh1c2VyRGF0YSwgbnVsbCwgMikpO1xuXHRcdGlmICh1c2VyRGF0YS5uYW1lKSB7XG5cdFx0XHRSb2NrZXRDaGF0Ll9zZXRSZWFsTmFtZSh1c2VyLl9pZCwgdXNlckRhdGEubmFtZSk7XG5cdFx0XHRkZWxldGUgdXNlckRhdGEubmFtZTtcblx0XHR9XG5cdFx0TWV0ZW9yLnVzZXJzLnVwZGF0ZSh1c2VyLl9pZCwgeyAkc2V0OiB1c2VyRGF0YSB9KTtcblx0XHR1c2VyID0gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoeyBfaWQ6IHVzZXIuX2lkIH0pO1xuXHR9XG5cblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX1VzZXJuYW1lX0ZpZWxkJykgIT09ICcnKSB7XG5cdFx0Y29uc3QgdXNlcm5hbWUgPSBzbHVnKGdldExkYXBVc2VybmFtZShsZGFwVXNlcikpO1xuXHRcdGlmICh1c2VyICYmIHVzZXIuX2lkICYmIHVzZXJuYW1lICE9PSB1c2VyLnVzZXJuYW1lKSB7XG5cdFx0XHRsb2dnZXIuaW5mbygnU3luY2luZyB1c2VyIHVzZXJuYW1lJywgdXNlci51c2VybmFtZSwgJy0+JywgdXNlcm5hbWUpO1xuXHRcdFx0Um9ja2V0Q2hhdC5fc2V0VXNlcm5hbWUodXNlci5faWQsIHVzZXJuYW1lKTtcblx0XHR9XG5cdH1cblxuXHRpZiAodXNlciAmJiB1c2VyLl9pZCAmJiBSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9TeW5jX1VzZXJfQXZhdGFyJykgPT09IHRydWUpIHtcblx0XHRjb25zdCBhdmF0YXIgPSBsZGFwVXNlci5fcmF3LnRodW1ibmFpbFBob3RvIHx8IGxkYXBVc2VyLl9yYXcuanBlZ1Bob3RvO1xuXHRcdGlmIChhdmF0YXIpIHtcblx0XHRcdGxvZ2dlci5pbmZvKCdTeW5jaW5nIHVzZXIgYXZhdGFyJyk7XG5cblx0XHRcdGNvbnN0IHJzID0gUm9ja2V0Q2hhdEZpbGUuYnVmZmVyVG9TdHJlYW0oYXZhdGFyKTtcblx0XHRcdGNvbnN0IGZpbGVTdG9yZSA9IEZpbGVVcGxvYWQuZ2V0U3RvcmUoJ0F2YXRhcnMnKTtcblx0XHRcdGZpbGVTdG9yZS5kZWxldGVCeU5hbWUodXNlci51c2VybmFtZSk7XG5cblx0XHRcdGNvbnN0IGZpbGUgPSB7XG5cdFx0XHRcdHVzZXJJZDogdXNlci5faWQsXG5cdFx0XHRcdHR5cGU6ICdpbWFnZS9qcGVnJyxcblx0XHRcdH07XG5cblx0XHRcdE1ldGVvci5ydW5Bc1VzZXIodXNlci5faWQsICgpID0+IHtcblx0XHRcdFx0ZmlsZVN0b3JlLmluc2VydChmaWxlLCBycywgKCkgPT4ge1xuXHRcdFx0XHRcdE1ldGVvci5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuc2V0QXZhdGFyT3JpZ2luKHVzZXIuX2lkLCAnbGRhcCcpO1xuXHRcdFx0XHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgndXBkYXRlQXZhdGFyJywgeyB1c2VybmFtZTogdXNlci51c2VybmFtZSB9KTtcblx0XHRcdFx0XHR9LCA1MDApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkTGRhcFVzZXIobGRhcFVzZXIsIHVzZXJuYW1lLCBwYXNzd29yZCkge1xuXHRjb25zdCB1bmlxdWVJZCA9IGdldExkYXBVc2VyVW5pcXVlSUQobGRhcFVzZXIpO1xuXG5cdGNvbnN0IHVzZXJPYmplY3QgPSB7fTtcblxuXHRpZiAodXNlcm5hbWUpIHtcblx0XHR1c2VyT2JqZWN0LnVzZXJuYW1lID0gdXNlcm5hbWU7XG5cdH1cblxuXHRjb25zdCB1c2VyRGF0YSA9IGdldERhdGFUb1N5bmNVc2VyRGF0YShsZGFwVXNlciwge30pO1xuXG5cdGlmICh1c2VyRGF0YSAmJiB1c2VyRGF0YS5lbWFpbHMgJiYgdXNlckRhdGEuZW1haWxzWzBdICYmIHVzZXJEYXRhLmVtYWlsc1swXS5hZGRyZXNzKSB7XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkodXNlckRhdGEuZW1haWxzWzBdLmFkZHJlc3MpKSB7XG5cdFx0XHR1c2VyT2JqZWN0LmVtYWlsID0gdXNlckRhdGEuZW1haWxzWzBdLmFkZHJlc3NbMF07XG5cdFx0fSBlbHNlIHtcblx0XHRcdHVzZXJPYmplY3QuZW1haWwgPSB1c2VyRGF0YS5lbWFpbHNbMF0uYWRkcmVzcztcblx0XHR9XG5cdH0gZWxzZSBpZiAobGRhcFVzZXIubWFpbCAmJiBsZGFwVXNlci5tYWlsLmluZGV4T2YoJ0AnKSA+IC0xKSB7XG5cdFx0dXNlck9iamVjdC5lbWFpbCA9IGxkYXBVc2VyLm1haWw7XG5cdH0gZWxzZSBpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfRGVmYXVsdF9Eb21haW4nKSAhPT0gJycpIHtcblx0XHR1c2VyT2JqZWN0LmVtYWlsID0gYCR7IHVzZXJuYW1lIHx8IHVuaXF1ZUlkLnZhbHVlIH1AJHsgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfRGVmYXVsdF9Eb21haW4nKSB9YDtcblx0fSBlbHNlIHtcblx0XHRjb25zdCBlcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoJ0xEQVAtbG9naW4tZXJyb3InLCAnTERBUCBBdXRoZW50aWNhdGlvbiBzdWNjZWRlZCwgdGhlcmUgaXMgbm8gZW1haWwgdG8gY3JlYXRlIGFuIGFjY291bnQuIEhhdmUgeW91IHRyaWVkIHNldHRpbmcgeW91ciBEZWZhdWx0IERvbWFpbiBpbiBMREFQIFNldHRpbmdzPycpO1xuXHRcdGxvZ2dlci5lcnJvcihlcnJvcik7XG5cdFx0dGhyb3cgZXJyb3I7XG5cdH1cblxuXHRsb2dnZXIuZGVidWcoJ05ldyB1c2VyIGRhdGEnLCB1c2VyT2JqZWN0KTtcblxuXHRpZiAocGFzc3dvcmQpIHtcblx0XHR1c2VyT2JqZWN0LnBhc3N3b3JkID0gcGFzc3dvcmQ7XG5cdH1cblxuXHR0cnkge1xuXHRcdHVzZXJPYmplY3QuX2lkID0gQWNjb3VudHMuY3JlYXRlVXNlcih1c2VyT2JqZWN0KTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRsb2dnZXIuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIHVzZXInLCBlcnJvcik7XG5cdFx0cmV0dXJuIGVycm9yO1xuXHR9XG5cblx0c3luY1VzZXJEYXRhKHVzZXJPYmplY3QsIGxkYXBVc2VyKTtcblxuXHRyZXR1cm4ge1xuXHRcdHVzZXJJZDogdXNlck9iamVjdC5faWQsXG5cdH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbXBvcnROZXdVc2VycyhsZGFwKSB7XG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9FbmFibGUnKSAhPT0gdHJ1ZSkge1xuXHRcdGxvZ2dlci5lcnJvcignQ2FuXFwndCBydW4gTERBUCBJbXBvcnQsIExEQVAgaXMgZGlzYWJsZWQnKTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRpZiAoIWxkYXApIHtcblx0XHRsZGFwID0gbmV3IExEQVAoKTtcblx0XHRsZGFwLmNvbm5lY3RTeW5jKCk7XG5cdH1cblxuXHRsZXQgY291bnQgPSAwO1xuXHRsZGFwLnNlYXJjaFVzZXJzU3luYygnKicsIE1ldGVvci5iaW5kRW52aXJvbm1lbnQoKGVycm9yLCBsZGFwVXNlcnMsIHsgbmV4dCwgZW5kIH0gPSB7fSkgPT4ge1xuXHRcdGlmIChlcnJvcikge1xuXHRcdFx0dGhyb3cgZXJyb3I7XG5cdFx0fVxuXG5cdFx0bGRhcFVzZXJzLmZvckVhY2goKGxkYXBVc2VyKSA9PiB7XG5cdFx0XHRjb3VudCsrO1xuXG5cdFx0XHRjb25zdCB1bmlxdWVJZCA9IGdldExkYXBVc2VyVW5pcXVlSUQobGRhcFVzZXIpO1xuXHRcdFx0Ly8gTG9vayB0byBzZWUgaWYgdXNlciBhbHJlYWR5IGV4aXN0c1xuXHRcdFx0Y29uc3QgdXNlclF1ZXJ5ID0ge1xuXHRcdFx0XHQnc2VydmljZXMubGRhcC5pZCc6IHVuaXF1ZUlkLnZhbHVlLFxuXHRcdFx0fTtcblxuXHRcdFx0bG9nZ2VyLmRlYnVnKCd1c2VyUXVlcnknLCB1c2VyUXVlcnkpO1xuXG5cdFx0XHRsZXQgdXNlcm5hbWU7XG5cdFx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfVXNlcm5hbWVfRmllbGQnKSAhPT0gJycpIHtcblx0XHRcdFx0dXNlcm5hbWUgPSBzbHVnKGdldExkYXBVc2VybmFtZShsZGFwVXNlcikpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBBZGQgdXNlciBpZiBpdCB3YXMgbm90IGFkZGVkIGJlZm9yZVxuXHRcdFx0bGV0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VyUXVlcnkpO1xuXG5cdFx0XHRpZiAoIXVzZXIgJiYgdXNlcm5hbWUgJiYgUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfTWVyZ2VfRXhpc3RpbmdfVXNlcnMnKSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRjb25zdCB1c2VyUXVlcnkgPSB7XG5cdFx0XHRcdFx0dXNlcm5hbWUsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0bG9nZ2VyLmRlYnVnKCd1c2VyUXVlcnkgbWVyZ2UnLCB1c2VyUXVlcnkpO1xuXG5cdFx0XHRcdHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh1c2VyUXVlcnkpO1xuXHRcdFx0XHRpZiAodXNlcikge1xuXHRcdFx0XHRcdHN5bmNVc2VyRGF0YSh1c2VyLCBsZGFwVXNlcik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHRcdGFkZExkYXBVc2VyKGxkYXBVc2VyLCB1c2VybmFtZSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChjb3VudCAlIDEwMCA9PT0gMCkge1xuXHRcdFx0XHRsb2dnZXIuaW5mbygnSW1wb3J0IHJ1bm5pbmcuIFVzZXJzIGltcG9ydGVkIHVudGlsIG5vdzonLCBjb3VudCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0XHRpZiAoZW5kKSB7XG5cdFx0XHRsb2dnZXIuaW5mbygnSW1wb3J0IGZpbmlzaGVkLiBVc2VycyBpbXBvcnRlZDonLCBjb3VudCk7XG5cdFx0fVxuXG5cdFx0bmV4dChjb3VudCk7XG5cdH0pKTtcbn1cblxuZnVuY3Rpb24gc3luYygpIHtcblx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0VuYWJsZScpICE9PSB0cnVlKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgbGRhcCA9IG5ldyBMREFQKCk7XG5cblx0dHJ5IHtcblx0XHRsZGFwLmNvbm5lY3RTeW5jKCk7XG5cblx0XHRsZXQgdXNlcnM7XG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0JhY2tncm91bmRfU3luY19LZWVwX0V4aXN0YW50X1VzZXJzX1VwZGF0ZWQnKSA9PT0gdHJ1ZSkge1xuXHRcdFx0dXNlcnMgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kTERBUFVzZXJzKCk7XG5cdFx0fVxuXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdMREFQX0JhY2tncm91bmRfU3luY19JbXBvcnRfTmV3X1VzZXJzJykgPT09IHRydWUpIHtcblx0XHRcdGltcG9ydE5ld1VzZXJzKGxkYXApO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfS2VlcF9FeGlzdGFudF9Vc2Vyc19VcGRhdGVkJykgPT09IHRydWUpIHtcblx0XHRcdHVzZXJzLmZvckVhY2goZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRsZXQgbGRhcFVzZXI7XG5cblx0XHRcdFx0aWYgKHVzZXIuc2VydmljZXMgJiYgdXNlci5zZXJ2aWNlcy5sZGFwICYmIHVzZXIuc2VydmljZXMubGRhcC5pZCkge1xuXHRcdFx0XHRcdGxkYXBVc2VyID0gbGRhcC5nZXRVc2VyQnlJZFN5bmModXNlci5zZXJ2aWNlcy5sZGFwLmlkLCB1c2VyLnNlcnZpY2VzLmxkYXAuaWRBdHRyaWJ1dGUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxkYXBVc2VyID0gbGRhcC5nZXRVc2VyQnlVc2VybmFtZVN5bmModXNlci51c2VybmFtZSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAobGRhcFVzZXIpIHtcblx0XHRcdFx0XHRzeW5jVXNlckRhdGEodXNlciwgbGRhcFVzZXIpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGxvZ2dlci5pbmZvKCdDYW5cXCd0IHN5bmMgdXNlcicsIHVzZXIudXNlcm5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0bG9nZ2VyLmVycm9yKGVycm9yKTtcblx0XHRyZXR1cm4gZXJyb3I7XG5cdH1cblx0cmV0dXJuIHRydWU7XG59XG5cbmNvbnN0IGpvYk5hbWUgPSAnTERBUF9TeW5jJztcblxuY29uc3QgYWRkQ3JvbkpvYiA9IF8uZGVib3VuY2UoTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiBhZGRDcm9uSm9iRGVib3VuY2VkKCkge1xuXHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfQmFja2dyb3VuZF9TeW5jJykgIT09IHRydWUpIHtcblx0XHRsb2dnZXIuaW5mbygnRGlzYWJsaW5nIExEQVAgQmFja2dyb3VuZCBTeW5jJyk7XG5cdFx0aWYgKFN5bmNlZENyb24ubmV4dFNjaGVkdWxlZEF0RGF0ZShqb2JOYW1lKSkge1xuXHRcdFx0U3luY2VkQ3Jvbi5yZW1vdmUoam9iTmFtZSk7XG5cdFx0fVxuXHRcdHJldHVybjtcblx0fVxuXG5cdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfSW50ZXJ2YWwnKSkge1xuXHRcdGxvZ2dlci5pbmZvKCdFbmFibGluZyBMREFQIEJhY2tncm91bmQgU3luYycpO1xuXHRcdFN5bmNlZENyb24uYWRkKHtcblx0XHRcdG5hbWU6IGpvYk5hbWUsXG5cdFx0XHRzY2hlZHVsZTogKHBhcnNlcikgPT4gcGFyc2VyLnRleHQoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ0xEQVBfQmFja2dyb3VuZF9TeW5jX0ludGVydmFsJykpLFxuXHRcdFx0am9iKCkge1xuXHRcdFx0XHRzeW5jKCk7XG5cdFx0XHR9LFxuXHRcdH0pO1xuXHRcdFN5bmNlZENyb24uc3RhcnQoKTtcblx0fVxufSksIDUwMCk7XG5cbk1ldGVvci5zdGFydHVwKCgpID0+IHtcblx0TWV0ZW9yLmRlZmVyKCgpID0+IHtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9CYWNrZ3JvdW5kX1N5bmMnLCBhZGRDcm9uSm9iKTtcblx0XHRSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9CYWNrZ3JvdW5kX1N5bmNfSW50ZXJ2YWwnLCBhZGRDcm9uSm9iKTtcblx0fSk7XG59KTtcbiIsImltcG9ydCB7IGltcG9ydE5ld1VzZXJzIH0gZnJvbSAnLi9zeW5jJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHRsZGFwX3N5bmNfbm93KCkge1xuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcigpO1xuXHRcdGlmICghdXNlcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHsgbWV0aG9kOiAnbGRhcF9zeW5jX3VzZXJzJyB9KTtcblx0XHR9XG5cblx0XHRpZiAoIVJvY2tldENoYXQuYXV0aHouaGFzUm9sZSh1c2VyLl9pZCwgJ2FkbWluJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hdXRob3JpemVkJywgJ05vdCBhdXRob3JpemVkJywgeyBtZXRob2Q6ICdsZGFwX3N5bmNfdXNlcnMnIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9FbmFibGUnKSAhPT0gdHJ1ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignTERBUF9kaXNhYmxlZCcpO1xuXHRcdH1cblxuXHRcdHRoaXMudW5ibG9jaygpO1xuXG5cdFx0aW1wb3J0TmV3VXNlcnMoKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHRtZXNzYWdlOiAnU3luY19pbl9wcm9ncmVzcycsXG5cdFx0XHRwYXJhbXM6IFtdLFxuXHRcdH07XG5cdH0sXG59KTtcbiIsImltcG9ydCBMREFQIGZyb20gJy4vbGRhcCc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0bGRhcF90ZXN0X2Nvbm5lY3Rpb24oKSB7XG5cdFx0Y29uc3QgdXNlciA9IE1ldGVvci51c2VyKCk7XG5cdFx0aWYgKCF1c2VyKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywgeyBtZXRob2Q6ICdsZGFwX3Rlc3RfY29ubmVjdGlvbicgfSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1JvbGUodXNlci5faWQsICdhZG1pbicpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1ub3QtYXV0aG9yaXplZCcsICdOb3QgYXV0aG9yaXplZCcsIHsgbWV0aG9kOiAnbGRhcF90ZXN0X2Nvbm5lY3Rpb24nIH0pO1xuXHRcdH1cblxuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnTERBUF9FbmFibGUnKSAhPT0gdHJ1ZSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignTERBUF9kaXNhYmxlZCcpO1xuXHRcdH1cblxuXHRcdGxldCBsZGFwO1xuXHRcdHRyeSB7XG5cdFx0XHRsZGFwID0gbmV3IExEQVAoKTtcblx0XHRcdGxkYXAuY29ubmVjdFN5bmMoKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0Y29uc29sZS5sb2coZXJyb3IpO1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihlcnJvci5tZXNzYWdlKTtcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0bGRhcC5iaW5kSWZOZWNlc3NhcnkoKTtcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcihlcnJvci5uYW1lIHx8IGVycm9yLm1lc3NhZ2UpO1xuXHRcdH1cblxuXHRcdHJldHVybiB7XG5cdFx0XHRtZXNzYWdlOiAnQ29ubmVjdGlvbl9zdWNjZXNzJyxcblx0XHRcdHBhcmFtczogW10sXG5cdFx0fTtcblx0fSxcbn0pO1xuIl19
