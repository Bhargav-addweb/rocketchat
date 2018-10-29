(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var RocketChat = Package['rocketchat:lib'].RocketChat;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package['babel-runtime'].meteorBabelHelpers;
var Promise = Package.promise.Promise;
var TAPi18next = Package['tap:i18n'].TAPi18next;
var TAPi18n = Package['tap:i18n'].TAPi18n;

/* Package-scope variables */
var roles;

var require = meteorInstall({"node_modules":{"meteor":{"rocketchat:authorization":{"lib":{"rocketchat.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/lib/rocketchat.js                                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz = {};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"models":{"Permissions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Permissions.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
class ModelPermissions extends RocketChat.models._Base {
  constructor(...args) {
    super(...args);
  } // FIND


  findByRole(role, options) {
    const query = {
      roles: role
    };
    return this.find(query, options);
  }

  findOneById(_id) {
    return this.findOne(_id);
  }

  createOrUpdate(name, roles) {
    this.upsert({
      _id: name
    }, {
      $set: {
        roles
      }
    });
  }

  addRole(permission, role) {
    this.update({
      _id: permission
    }, {
      $addToSet: {
        roles: role
      }
    });
  }

  removeRole(permission, role) {
    this.update({
      _id: permission
    }, {
      $pull: {
        roles: role
      }
    });
  }

}

RocketChat.models.Permissions = new ModelPermissions('permissions');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Roles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Roles.js                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
class ModelRoles extends RocketChat.models._Base {
  constructor(...args) {
    super(...args);
    this.tryEnsureIndex({
      name: 1
    });
    this.tryEnsureIndex({
      scope: 1
    });
  }

  findUsersInRole(name, scope, options) {
    const role = this.findOne(name);
    const roleScope = role && role.scope || 'Users';
    const model = RocketChat.models[roleScope];
    return model && model.findUsersInRoles && model.findUsersInRoles(name, scope, options);
  }

  isUserInRoles(userId, roles, scope) {
    roles = [].concat(roles);
    return roles.some(roleName => {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      return model && model.isUserInRole && model.isUserInRole(userId, roleName, scope);
    });
  }

  createOrUpdate(name, scope = 'Users', description, protectedRole) {
    const updateData = {};
    updateData.name = name;
    updateData.scope = scope;

    if (description != null) {
      updateData.description = description;
    }

    if (protectedRole) {
      updateData.protected = protectedRole;
    }

    this.upsert({
      _id: name
    }, {
      $set: updateData
    });
  }

  addUserRoles(userId, roles, scope) {
    roles = [].concat(roles);

    for (const roleName of roles) {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      model && model.addRolesByUserId && model.addRolesByUserId(userId, roleName, scope);
    }

    return true;
  }

  removeUserRoles(userId, roles, scope) {
    roles = [].concat(roles);

    for (const roleName of roles) {
      const role = this.findOne(roleName);
      const roleScope = role && role.scope || 'Users';
      const model = RocketChat.models[roleScope];
      model && model.removeRolesByUserId && model.removeRolesByUserId(userId, roleName, scope);
    }

    return true;
  }

  findOneByIdOrName(_idOrName, options) {
    const query = {
      $or: [{
        _id: _idOrName
      }, {
        name: _idOrName
      }]
    };
    return this.findOne(query, options);
  }

}

RocketChat.models.Roles = new ModelRoles('roles');
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Base.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Base.js                                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.models._Base.prototype.roleBaseQuery = function ()
/* userId, scope*/
{
  return;
};

RocketChat.models._Base.prototype.findRolesByUserId = function (userId
/* , options*/
) {
  const query = this.roleBaseQuery(userId);
  return this.find(query, {
    fields: {
      roles: 1
    }
  });
};

RocketChat.models._Base.prototype.isUserInRole = function (userId, roleName, scope) {
  const query = this.roleBaseQuery(userId, scope);

  if (query == null) {
    return false;
  }

  query.roles = roleName;
  return !_.isUndefined(this.findOne(query, {
    fields: {
      roles: 1
    }
  }));
};

RocketChat.models._Base.prototype.addRolesByUserId = function (userId, roles, scope) {
  roles = [].concat(roles);
  const query = this.roleBaseQuery(userId, scope);
  const update = {
    $addToSet: {
      roles: {
        $each: roles
      }
    }
  };
  return this.update(query, update);
};

RocketChat.models._Base.prototype.removeRolesByUserId = function (userId, roles, scope) {
  roles = [].concat(roles);
  const query = this.roleBaseQuery(userId, scope);
  const update = {
    $pullAll: {
      roles
    }
  };
  return this.update(query, update);
};

RocketChat.models._Base.prototype.findUsersInRoles = function () {
  throw new Meteor.Error('overwrite-function', 'You must overwrite this function in the extended classes');
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Users.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Users.js                                                     //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.models.Users.roleBaseQuery = function (userId) {
  return {
    _id: userId
  };
};

RocketChat.models.Users.findUsersInRoles = function (roles, scope, options) {
  roles = [].concat(roles);
  const query = {
    roles: {
      $in: roles
    }
  };
  return this.find(query, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Subscriptions.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/models/Subscriptions.js                                             //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.models.Subscriptions.roleBaseQuery = function (userId, scope) {
  if (scope == null) {
    return;
  }

  const query = {
    'u._id': userId
  };

  if (!_.isUndefined(scope)) {
    query.rid = scope;
  }

  return query;
};

RocketChat.models.Subscriptions.findUsersInRoles = function (roles, scope, options) {
  roles = [].concat(roles);
  const query = {
    roles: {
      $in: roles
    }
  };

  if (scope) {
    query.rid = scope;
  }

  const subscriptions = this.find(query).fetch();

  const users = _.compact(_.map(subscriptions, function (subscription) {
    if ('undefined' !== typeof subscription.u && 'undefined' !== typeof subscription.u._id) {
      return subscription.u._id;
    }
  }));

  return RocketChat.models.Users.find({
    _id: {
      $in: users
    }
  }, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"functions":{"addUserRoles.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/addUserRoles.js                                           //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.authz.addUserRoles = function (userId, roleNames, scope) {
  if (!userId || !roleNames) {
    return false;
  }

  const user = RocketChat.models.Users.db.findOneById(userId);

  if (!user) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: 'RocketChat.authz.addUserRoles'
    });
  }

  roleNames = [].concat(roleNames);

  const existingRoleNames = _.pluck(RocketChat.authz.getRoles(), '_id');

  const invalidRoleNames = _.difference(roleNames, existingRoleNames);

  if (!_.isEmpty(invalidRoleNames)) {
    for (const role of invalidRoleNames) {
      RocketChat.models.Roles.createOrUpdate(role);
    }
  }

  RocketChat.models.Roles.addUserRoles(userId, roleNames, scope);
  return true;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"canAccessRoom.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/canAccessRoom.js                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
/* globals RocketChat */
RocketChat.authz.roomAccessValidators = [function (room, user = {}) {
  if (room && room.t === 'c') {
    if (!user._id && RocketChat.settings.get('Accounts_AllowAnonymousRead') === true) {
      return true;
    }

    return RocketChat.authz.hasPermission(user._id, 'view-c-room');
  }
}, function (room, user = {}) {
  if (!room || !user) {
    return;
  }

  const subscription = RocketChat.models.Subscriptions.findOneByRoomIdAndUserId(room._id, user._id);

  if (subscription) {
    return RocketChat.models.Rooms.findOneById(subscription.rid);
  }
}];

RocketChat.authz.canAccessRoom = function (room, user, extraData) {
  return RocketChat.authz.roomAccessValidators.some(validator => validator.call(this, room, user, extraData));
};

RocketChat.authz.addRoomAccessValidator = function (validator) {
  RocketChat.authz.roomAccessValidators.push(validator);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getRoles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/getRoles.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.getRoles = function () {
  return RocketChat.models.Roles.find().fetch();
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"getUsersInRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/getUsersInRole.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.getUsersInRole = function (roleName, scope, options) {
  return RocketChat.models.Roles.findUsersInRole(roleName, scope, options);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hasPermission.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/hasPermission.js                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
function atLeastOne(userId, permissions = [], scope) {
  return permissions.some(permissionId => {
    const permission = RocketChat.models.Permissions.findOne(permissionId);
    return RocketChat.models.Roles.isUserInRoles(userId, permission.roles, scope);
  });
}

function all(userId, permissions = [], scope) {
  return permissions.every(permissionId => {
    const permission = RocketChat.models.Permissions.findOne(permissionId);
    return RocketChat.models.Roles.isUserInRoles(userId, permission.roles, scope);
  });
}

function hasPermission(userId, permissions, scope, strategy) {
  if (!userId) {
    return false;
  }

  permissions = [].concat(permissions);
  return strategy(userId, permissions, scope);
}

RocketChat.authz.hasAllPermission = function (userId, permissions, scope) {
  return hasPermission(userId, permissions, scope, all);
};

RocketChat.authz.hasPermission = RocketChat.authz.hasAllPermission;

RocketChat.authz.hasAtLeastOnePermission = function (userId, permissions, scope) {
  return hasPermission(userId, permissions, scope, atLeastOne);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"hasRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/hasRole.js                                                //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
RocketChat.authz.hasRole = function (userId, roleNames, scope) {
  roleNames = [].concat(roleNames);
  return RocketChat.models.Roles.isUserInRoles(userId, roleNames, scope);
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeUserFromRoles.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/functions/removeUserFromRoles.js                                    //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);

RocketChat.authz.removeUserFromRoles = function (userId, roleNames, scope) {
  if (!userId || !roleNames) {
    return false;
  }

  const user = RocketChat.models.Users.findOneById(userId);

  if (!user) {
    throw new Meteor.Error('error-invalid-user', 'Invalid user', {
      function: 'RocketChat.authz.removeUserFromRoles'
    });
  }

  roleNames = [].concat(roleNames);

  const existingRoleNames = _.pluck(RocketChat.authz.getRoles(), '_id');

  const invalidRoleNames = _.difference(roleNames, existingRoleNames);

  if (!_.isEmpty(invalidRoleNames)) {
    throw new Meteor.Error('error-invalid-role', 'Invalid role', {
      function: 'RocketChat.authz.removeUserFromRoles'
    });
  }

  RocketChat.models.Roles.removeUserRoles(userId, roleNames, scope);
  return true;
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"publications":{"permissions.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/permissions.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'permissions/get'(updatedAt) {
    this.unblock(); // TODO: should we return this for non logged users?
    // TODO: we could cache this collection

    const records = RocketChat.models.Permissions.find().fetch();

    if (updatedAt instanceof Date) {
      return {
        update: records.filter(record => record._updatedAt > updatedAt),
        remove: RocketChat.models.Permissions.trashFindDeletedAfter(updatedAt, {}, {
          fields: {
            _id: 1,
            _deletedAt: 1
          }
        }).fetch()
      };
    }

    return records;
  }

});
RocketChat.models.Permissions.on('change', ({
  clientAction,
  id,
  data
}) => {
  switch (clientAction) {
    case 'updated':
    case 'inserted':
      data = data || RocketChat.models.Permissions.findOneById(id);
      break;

    case 'removed':
      data = {
        _id: id
      };
      break;
  }

  RocketChat.Notifications.notifyLoggedInThisInstance('permissions-changed', clientAction, data);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"roles.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/roles.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.publish('roles', function () {
  if (!this.userId) {
    return this.ready();
  }

  return RocketChat.models.Roles.find();
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"usersInRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/publications/usersInRole.js                                         //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.publish('usersInRole', function (roleName, scope, limit = 50) {
  if (!this.userId) {
    return this.ready();
  }

  if (!RocketChat.authz.hasPermission(this.userId, 'access-permissions')) {
    return this.error(new Meteor.Error('error-not-allowed', 'Not allowed', {
      publish: 'usersInRole'
    }));
  }

  const options = {
    limit,
    sort: {
      name: 1
    }
  };
  return RocketChat.authz.getUsersInRole(roleName, scope, options);
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"methods":{"addUserToRole.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/addUserToRole.js                                            //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'authorization:addUserToRole'(roleName, username, scope) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:addUserToRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'authorization:addUserToRole'
      });
    }

    if (roleName === 'admin' && !RocketChat.authz.hasPermission(Meteor.userId(), 'assign-admin-role')) {
      throw new Meteor.Error('error-action-not-allowed', 'Assigning admin is not allowed', {
        method: 'authorization:addUserToRole',
        action: 'Assign_admin'
      });
    }

    const user = RocketChat.models.Users.findOneByUsername(username, {
      fields: {
        _id: 1
      }
    });

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'authorization:addUserToRole'
      });
    }

    const add = RocketChat.models.Roles.addUserRoles(user._id, roleName, scope);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'added',
        _id: roleName,
        u: {
          _id: user._id,
          username
        },
        scope
      });
    }

    return add;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"deleteRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/deleteRole.js                                               //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:deleteRole'(roleName) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:deleteRole',
        action: 'Accessing_permissions'
      });
    }

    const role = RocketChat.models.Roles.findOne(roleName);

    if (!role) {
      throw new Meteor.Error('error-invalid-role', 'Invalid role', {
        method: 'authorization:deleteRole'
      });
    }

    if (role.protected) {
      throw new Meteor.Error('error-delete-protected-role', 'Cannot delete a protected role', {
        method: 'authorization:deleteRole'
      });
    }

    const roleScope = role.scope || 'Users';
    const model = RocketChat.models[roleScope];
    const existingUsers = model && model.findUsersInRoles && model.findUsersInRoles(roleName);

    if (existingUsers && existingUsers.count() > 0) {
      throw new Meteor.Error('error-role-in-use', 'Cannot delete role because it\'s in use', {
        method: 'authorization:deleteRole'
      });
    }

    return RocketChat.models.Roles.remove(role.name);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeUserFromRole.js":function(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/removeUserFromRole.js                                       //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
let _;

module.watch(require("underscore"), {
  default(v) {
    _ = v;
  }

}, 0);
Meteor.methods({
  'authorization:removeUserFromRole'(roleName, username, scope) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Access permissions is not allowed', {
        method: 'authorization:removeUserFromRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
      throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
        method: 'authorization:removeUserFromRole'
      });
    }

    const user = Meteor.users.findOne({
      username
    }, {
      fields: {
        _id: 1,
        roles: 1
      }
    });

    if (!user || !user._id) {
      throw new Meteor.Error('error-invalid-user', 'Invalid user', {
        method: 'authorization:removeUserFromRole'
      });
    } // prevent removing last user from admin role


    if (roleName === 'admin') {
      const adminCount = Meteor.users.find({
        roles: {
          $in: ['admin']
        }
      }).count();
      const userIsAdmin = user.roles.indexOf('admin') > -1;

      if (adminCount === 1 && userIsAdmin) {
        throw new Meteor.Error('error-action-not-allowed', 'Leaving the app without admins is not allowed', {
          method: 'removeUserFromRole',
          action: 'Remove_last_admin'
        });
      }
    }

    const remove = RocketChat.models.Roles.removeUserRoles(user._id, roleName, scope);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'removed',
        _id: roleName,
        u: {
          _id: user._id,
          username
        },
        scope
      });
    }

    return remove;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"saveRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/saveRole.js                                                 //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:saveRole'(roleData) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:saveRole',
        action: 'Accessing_permissions'
      });
    }

    if (!roleData.name) {
      throw new Meteor.Error('error-role-name-required', 'Role name is required', {
        method: 'authorization:saveRole'
      });
    }

    if (['Users', 'Subscriptions'].includes(roleData.scope) === false) {
      roleData.scope = 'Users';
    }

    const update = RocketChat.models.Roles.createOrUpdate(roleData.name, roleData.scope, roleData.description);

    if (RocketChat.settings.get('UI_DisplayRoles')) {
      RocketChat.Notifications.notifyLogged('roles-change', {
        type: 'changed',
        _id: roleData.name
      });
    }

    return update;
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"addPermissionToRole.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/addPermissionToRole.js                                      //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:addPermissionToRole'(permission, role) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Adding permission is not allowed', {
        method: 'authorization:addPermissionToRole',
        action: 'Adding_permission'
      });
    }

    return RocketChat.models.Permissions.addRole(permission, role);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"removeRoleFromPermission.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/methods/removeRoleFromPermission.js                                 //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
Meteor.methods({
  'authorization:removeRoleFromPermission'(permission, role) {
    if (!Meteor.userId() || !RocketChat.authz.hasPermission(Meteor.userId(), 'access-permissions')) {
      throw new Meteor.Error('error-action-not-allowed', 'Accessing permissions is not allowed', {
        method: 'authorization:removeRoleFromPermission',
        action: 'Accessing_permissions'
      });
    }

    return RocketChat.models.Permissions.removeRole(permission, role);
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"startup.js":function(){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                              //
// packages/rocketchat_authorization/server/startup.js                                                          //
//                                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                //
/* eslint no-multi-spaces: 0 */
Meteor.startup(function () {
  // Note:
  // 1.if we need to create a role that can only edit channel message, but not edit group message
  // then we can define edit-<type>-message instead of edit-message
  // 2. admin, moderator, and user roles should not be deleted as they are referened in the code.
  const permissions = [{
    _id: 'access-permissions',
    roles: ['admin']
  }, {
    _id: 'add-oauth-service',
    roles: ['admin']
  }, {
    _id: 'add-user-to-joined-room',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'add-user-to-any-c-room',
    roles: ['admin']
  }, {
    _id: 'add-user-to-any-p-room',
    roles: []
  }, {
    _id: 'archive-room',
    roles: ['admin', 'owner']
  }, {
    _id: 'assign-admin-role',
    roles: ['admin']
  }, {
    _id: 'ban-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'bulk-create-c',
    roles: ['admin']
  }, {
    _id: 'bulk-register-user',
    roles: ['admin']
  }, {
    _id: 'create-c',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-d',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-p',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'create-user',
    roles: ['admin']
  }, {
    _id: 'clean-channel-history',
    roles: ['admin']
  }, {
    _id: 'delete-c',
    roles: ['admin', 'owner']
  }, {
    _id: 'delete-d',
    roles: ['admin']
  }, {
    _id: 'delete-message',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'delete-p',
    roles: ['admin', 'owner']
  }, {
    _id: 'delete-user',
    roles: ['admin']
  }, {
    _id: 'edit-message',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'edit-other-user-active-status',
    roles: ['admin']
  }, {
    _id: 'edit-other-user-info',
    roles: ['admin']
  }, {
    _id: 'edit-other-user-password',
    roles: ['admin']
  }, {
    _id: 'edit-privileged-setting',
    roles: ['admin']
  }, {
    _id: 'edit-room',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'edit-room-retention-policy',
    roles: ['admin']
  }, {
    _id: 'force-delete-message',
    roles: ['admin', 'owner']
  }, {
    _id: 'join-without-join-code',
    roles: ['admin', 'bot']
  }, {
    _id: 'leave-c',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'leave-p',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'manage-assets',
    roles: ['admin']
  }, {
    _id: 'manage-emoji',
    roles: ['admin']
  }, {
    _id: 'manage-integrations',
    roles: ['admin']
  }, {
    _id: 'manage-own-integrations',
    roles: ['admin', 'bot']
  }, {
    _id: 'manage-oauth-apps',
    roles: ['admin']
  }, {
    _id: 'mention-all',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'mention-here',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'mute-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'remove-user',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'run-import',
    roles: ['admin']
  }, {
    _id: 'run-migration',
    roles: ['admin']
  }, {
    _id: 'set-moderator',
    roles: ['admin', 'owner']
  }, {
    _id: 'set-owner',
    roles: ['admin', 'owner']
  }, {
    _id: 'send-many-messages',
    roles: ['admin', 'bot']
  }, {
    _id: 'set-leader',
    roles: ['admin', 'owner']
  }, {
    _id: 'unarchive-room',
    roles: ['admin']
  }, {
    _id: 'view-c-room',
    roles: ['admin', 'user', 'bot', 'anonymous']
  }, {
    _id: 'user-generate-access-token',
    roles: ['admin']
  }, {
    _id: 'view-d-room',
    roles: ['admin', 'user', 'bot']
  }, {
    _id: 'view-full-other-user-info',
    roles: ['admin']
  }, {
    _id: 'view-history',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-joined-room',
    roles: ['guest', 'bot', 'anonymous']
  }, {
    _id: 'view-join-code',
    roles: ['admin']
  }, {
    _id: 'view-logs',
    roles: ['admin']
  }, {
    _id: 'view-other-user-channels',
    roles: ['admin']
  }, {
    _id: 'view-p-room',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-privileged-setting',
    roles: ['admin']
  }, {
    _id: 'view-room-administration',
    roles: ['admin']
  }, {
    _id: 'view-statistics',
    roles: ['admin']
  }, {
    _id: 'view-user-administration',
    roles: ['admin']
  }, {
    _id: 'preview-c-room',
    roles: ['admin', 'user', 'anonymous']
  }, {
    _id: 'view-outside-room',
    roles: ['admin', 'owner', 'moderator', 'user']
  }, {
    _id: 'view-broadcast-member-list',
    roles: ['admin', 'owner', 'moderator']
  }, {
    _id: 'call-management',
    roles: ['admin', 'owner', 'moderator']
  }];

  for (const permission of permissions) {
    if (!RocketChat.models.Permissions.findOneById(permission._id)) {
      RocketChat.models.Permissions.upsert(permission._id, {
        $set: permission
      });
    }
  }

  const defaultRoles = [{
    name: 'admin',
    scope: 'Users',
    description: 'Admin'
  }, {
    name: 'moderator',
    scope: 'Subscriptions',
    description: 'Moderator'
  }, {
    name: 'leader',
    scope: 'Subscriptions',
    description: 'Leader'
  }, {
    name: 'owner',
    scope: 'Subscriptions',
    description: 'Owner'
  }, {
    name: 'user',
    scope: 'Users',
    description: ''
  }, {
    name: 'bot',
    scope: 'Users',
    description: ''
  }, {
    name: 'guest',
    scope: 'Users',
    description: ''
  }, {
    name: 'anonymous',
    scope: 'Users',
    description: ''
  }];

  for (const role of defaultRoles) {
    RocketChat.models.Roles.upsert({
      _id: role.name
    }, {
      $setOnInsert: {
        scope: role.scope,
        description: role.description || '',
        protected: true
      }
    });
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});
require("/node_modules/meteor/rocketchat:authorization/lib/rocketchat.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Permissions.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Roles.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Base.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Users.js");
require("/node_modules/meteor/rocketchat:authorization/server/models/Subscriptions.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/addUserRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/canAccessRoom.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/getRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/getUsersInRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/hasPermission.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/hasRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/functions/removeUserFromRoles.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/permissions.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/roles.js");
require("/node_modules/meteor/rocketchat:authorization/server/publications/usersInRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/addUserToRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/deleteRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/removeUserFromRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/saveRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/addPermissionToRole.js");
require("/node_modules/meteor/rocketchat:authorization/server/methods/removeRoleFromPermission.js");
require("/node_modules/meteor/rocketchat:authorization/server/startup.js");

/* Exports */
Package._define("rocketchat:authorization");

})();

//# sourceURL=meteor://💻app/packages/rocketchat_authorization.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL2xpYi9yb2NrZXRjaGF0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21vZGVscy9QZXJtaXNzaW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9tb2RlbHMvUm9sZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbW9kZWxzL0Jhc2UuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbW9kZWxzL1VzZXJzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21vZGVscy9TdWJzY3JpcHRpb25zLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL2Z1bmN0aW9ucy9hZGRVc2VyUm9sZXMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvZnVuY3Rpb25zL2NhbkFjY2Vzc1Jvb20uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvZnVuY3Rpb25zL2dldFJvbGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL2Z1bmN0aW9ucy9nZXRVc2Vyc0luUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvaGFzUGVybWlzc2lvbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvaGFzUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9mdW5jdGlvbnMvcmVtb3ZlVXNlckZyb21Sb2xlcy5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9wdWJsaWNhdGlvbnMvcGVybWlzc2lvbnMuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvcHVibGljYXRpb25zL3JvbGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL3B1YmxpY2F0aW9ucy91c2Vyc0luUm9sZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvcm9ja2V0Y2hhdDphdXRob3JpemF0aW9uL3NlcnZlci9tZXRob2RzL2FkZFVzZXJUb1JvbGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbWV0aG9kcy9kZWxldGVSb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvcmVtb3ZlVXNlckZyb21Sb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvc2F2ZVJvbGUuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3JvY2tldGNoYXQ6YXV0aG9yaXphdGlvbi9zZXJ2ZXIvbWV0aG9kcy9hZGRQZXJtaXNzaW9uVG9Sb2xlLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL21ldGhvZHMvcmVtb3ZlUm9sZUZyb21QZXJtaXNzaW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9yb2NrZXRjaGF0OmF1dGhvcml6YXRpb24vc2VydmVyL3N0YXJ0dXAuanMiXSwibmFtZXMiOlsiUm9ja2V0Q2hhdCIsImF1dGh6IiwiTW9kZWxQZXJtaXNzaW9ucyIsIm1vZGVscyIsIl9CYXNlIiwiY29uc3RydWN0b3IiLCJhcmdzIiwiZmluZEJ5Um9sZSIsInJvbGUiLCJvcHRpb25zIiwicXVlcnkiLCJyb2xlcyIsImZpbmQiLCJmaW5kT25lQnlJZCIsIl9pZCIsImZpbmRPbmUiLCJjcmVhdGVPclVwZGF0ZSIsIm5hbWUiLCJ1cHNlcnQiLCIkc2V0IiwiYWRkUm9sZSIsInBlcm1pc3Npb24iLCJ1cGRhdGUiLCIkYWRkVG9TZXQiLCJyZW1vdmVSb2xlIiwiJHB1bGwiLCJQZXJtaXNzaW9ucyIsIk1vZGVsUm9sZXMiLCJ0cnlFbnN1cmVJbmRleCIsInNjb3BlIiwiZmluZFVzZXJzSW5Sb2xlIiwicm9sZVNjb3BlIiwibW9kZWwiLCJmaW5kVXNlcnNJblJvbGVzIiwiaXNVc2VySW5Sb2xlcyIsInVzZXJJZCIsImNvbmNhdCIsInNvbWUiLCJyb2xlTmFtZSIsImlzVXNlckluUm9sZSIsImRlc2NyaXB0aW9uIiwicHJvdGVjdGVkUm9sZSIsInVwZGF0ZURhdGEiLCJwcm90ZWN0ZWQiLCJhZGRVc2VyUm9sZXMiLCJhZGRSb2xlc0J5VXNlcklkIiwicmVtb3ZlVXNlclJvbGVzIiwicmVtb3ZlUm9sZXNCeVVzZXJJZCIsImZpbmRPbmVCeUlkT3JOYW1lIiwiX2lkT3JOYW1lIiwiJG9yIiwiUm9sZXMiLCJfIiwibW9kdWxlIiwid2F0Y2giLCJyZXF1aXJlIiwiZGVmYXVsdCIsInYiLCJwcm90b3R5cGUiLCJyb2xlQmFzZVF1ZXJ5IiwiZmluZFJvbGVzQnlVc2VySWQiLCJmaWVsZHMiLCJpc1VuZGVmaW5lZCIsIiRlYWNoIiwiJHB1bGxBbGwiLCJNZXRlb3IiLCJFcnJvciIsIlVzZXJzIiwiJGluIiwiU3Vic2NyaXB0aW9ucyIsInJpZCIsInN1YnNjcmlwdGlvbnMiLCJmZXRjaCIsInVzZXJzIiwiY29tcGFjdCIsIm1hcCIsInN1YnNjcmlwdGlvbiIsInUiLCJyb2xlTmFtZXMiLCJ1c2VyIiwiZGIiLCJmdW5jdGlvbiIsImV4aXN0aW5nUm9sZU5hbWVzIiwicGx1Y2siLCJnZXRSb2xlcyIsImludmFsaWRSb2xlTmFtZXMiLCJkaWZmZXJlbmNlIiwiaXNFbXB0eSIsInJvb21BY2Nlc3NWYWxpZGF0b3JzIiwicm9vbSIsInQiLCJzZXR0aW5ncyIsImdldCIsImhhc1Blcm1pc3Npb24iLCJmaW5kT25lQnlSb29tSWRBbmRVc2VySWQiLCJSb29tcyIsImNhbkFjY2Vzc1Jvb20iLCJleHRyYURhdGEiLCJ2YWxpZGF0b3IiLCJjYWxsIiwiYWRkUm9vbUFjY2Vzc1ZhbGlkYXRvciIsInB1c2giLCJnZXRVc2Vyc0luUm9sZSIsImF0TGVhc3RPbmUiLCJwZXJtaXNzaW9ucyIsInBlcm1pc3Npb25JZCIsImFsbCIsImV2ZXJ5Iiwic3RyYXRlZ3kiLCJoYXNBbGxQZXJtaXNzaW9uIiwiaGFzQXRMZWFzdE9uZVBlcm1pc3Npb24iLCJoYXNSb2xlIiwicmVtb3ZlVXNlckZyb21Sb2xlcyIsIm1ldGhvZHMiLCJ1cGRhdGVkQXQiLCJ1bmJsb2NrIiwicmVjb3JkcyIsIkRhdGUiLCJmaWx0ZXIiLCJyZWNvcmQiLCJfdXBkYXRlZEF0IiwicmVtb3ZlIiwidHJhc2hGaW5kRGVsZXRlZEFmdGVyIiwiX2RlbGV0ZWRBdCIsIm9uIiwiY2xpZW50QWN0aW9uIiwiaWQiLCJkYXRhIiwiTm90aWZpY2F0aW9ucyIsIm5vdGlmeUxvZ2dlZEluVGhpc0luc3RhbmNlIiwicHVibGlzaCIsInJlYWR5IiwibGltaXQiLCJlcnJvciIsInNvcnQiLCJ1c2VybmFtZSIsIm1ldGhvZCIsImFjdGlvbiIsImlzU3RyaW5nIiwiZmluZE9uZUJ5VXNlcm5hbWUiLCJhZGQiLCJub3RpZnlMb2dnZWQiLCJ0eXBlIiwiZXhpc3RpbmdVc2VycyIsImNvdW50IiwiYWRtaW5Db3VudCIsInVzZXJJc0FkbWluIiwiaW5kZXhPZiIsInJvbGVEYXRhIiwiaW5jbHVkZXMiLCJzdGFydHVwIiwiZGVmYXVsdFJvbGVzIiwiJHNldE9uSW5zZXJ0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsV0FBV0MsS0FBWCxHQUFtQixFQUFuQixDOzs7Ozs7Ozs7OztBQ0FBLE1BQU1DLGdCQUFOLFNBQStCRixXQUFXRyxNQUFYLENBQWtCQyxLQUFqRCxDQUF1RDtBQUN0REMsY0FBWSxHQUFHQyxJQUFmLEVBQXFCO0FBQ3BCLFVBQU0sR0FBR0EsSUFBVDtBQUNBLEdBSHFELENBS3REOzs7QUFDQUMsYUFBV0MsSUFBWCxFQUFpQkMsT0FBakIsRUFBMEI7QUFDekIsVUFBTUMsUUFBUTtBQUNiQyxhQUFPSDtBQURNLEtBQWQ7QUFJQSxXQUFPLEtBQUtJLElBQUwsQ0FBVUYsS0FBVixFQUFpQkQsT0FBakIsQ0FBUDtBQUNBOztBQUVESSxjQUFZQyxHQUFaLEVBQWlCO0FBQ2hCLFdBQU8sS0FBS0MsT0FBTCxDQUFhRCxHQUFiLENBQVA7QUFDQTs7QUFFREUsaUJBQWVDLElBQWYsRUFBcUJOLEtBQXJCLEVBQTRCO0FBQzNCLFNBQUtPLE1BQUwsQ0FBWTtBQUFFSixXQUFLRztBQUFQLEtBQVosRUFBMkI7QUFBRUUsWUFBTTtBQUFFUjtBQUFGO0FBQVIsS0FBM0I7QUFDQTs7QUFFRFMsVUFBUUMsVUFBUixFQUFvQmIsSUFBcEIsRUFBMEI7QUFDekIsU0FBS2MsTUFBTCxDQUFZO0FBQUVSLFdBQUtPO0FBQVAsS0FBWixFQUFpQztBQUFFRSxpQkFBVztBQUFFWixlQUFPSDtBQUFUO0FBQWIsS0FBakM7QUFDQTs7QUFFRGdCLGFBQVdILFVBQVgsRUFBdUJiLElBQXZCLEVBQTZCO0FBQzVCLFNBQUtjLE1BQUwsQ0FBWTtBQUFFUixXQUFLTztBQUFQLEtBQVosRUFBaUM7QUFBRUksYUFBTztB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SSxZQUFuQixFQUFpQztBQUNoQ3ZKLGVBQVdHLE1BQVgsQ0FBa0JnRCxLQUFsQixDQUF3QmpDLE1BQXhCLENBQStCO0FBQUVKLFdBQUtOLEtBQUtTO0FBQVosS0FBL0IsRUFBbUQ7QUFBRXVJLG9CQUFjO0FBQUUzSCxlQUFPckIsS0FBS3FCLEtBQWQ7QUFBcUJXLHFCQUFhaEMsS0FBS2dDLFdBQUwsSUFBb0IsRUFBdEQ7QUFBMERHLG1CQUFXO0FBQXJFO0FBQWhCLEtBQW5EO0FBQ0E7QUFDRCxDQTdGRCxFIiwiZmlsZSI6Ii9wYWNrYWdlcy9yb2NrZXRjaGF0X2F1dGhvcml6YXRpb24uanMiLCJzb3VyY2VzQ29udGVudCI6WyJSb2NrZXRDaGF0LmF1dGh6ID0ge307XG4iLCJjbGFzcyBNb2RlbFBlcm1pc3Npb25zIGV4dGVuZHMgUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2Uge1xuXHRjb25zdHJ1Y3RvciguLi5hcmdzKSB7XG5cdFx0c3VwZXIoLi4uYXJncyk7XG5cdH1cblxuXHQvLyBGSU5EXG5cdGZpbmRCeVJvbGUocm9sZSwgb3B0aW9ucykge1xuXHRcdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdFx0cm9sZXM6IHJvbGUsXG5cdFx0fTtcblxuXHRcdHJldHVybiB0aGlzLmZpbmQocXVlcnksIG9wdGlvbnMpO1xuXHR9XG5cblx0ZmluZE9uZUJ5SWQoX2lkKSB7XG5cdFx0cmV0dXJuIHRoaXMuZmluZE9uZShfaWQpO1xuXHR9XG5cblx0Y3JlYXRlT3JVcGRhdGUobmFtZSwgcm9sZXMpIHtcblx0XHR0aGlzLnVwc2VydCh7IF9pZDogbmFtZSB9LCB7ICRzZXQ6IHsgcm9sZXMgfSB9KTtcblx0fVxuXG5cdGFkZFJvbGUocGVybWlzc2lvbiwgcm9sZSkge1xuXHRcdHRoaXMudXBkYXRlKHsgX2lkOiBwZXJtaXNzaW9uIH0sIHsgJGFkZFRvU2V0OiB7IHJvbGVzOiByb2xlIH0gfSk7XG5cdH1cblxuXHRyZW1vdmVSb2xlKHBlcm1pc3Npb24sIHJvbGUpIHtcblx0XHR0aGlzLnVwZGF0ZSh7IF9pZDogcGVybWlzc2lvbiB9LCB7ICRwdWxsOiB7IHJvbGVzOiByb2xlIH0gfSk7XG5cdH1cbn1cblxuUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMgPSBuZXcgTW9kZWxQZXJtaXNzaW9ucygncGVybWlzc2lvbnMnKTtcbiIsImNsYXNzIE1vZGVsUm9sZXMgZXh0ZW5kcyBSb2NrZXRDaGF0Lm1vZGVscy5fQmFzZSB7XG5cdGNvbnN0cnVjdG9yKC4uLmFyZ3MpIHtcblx0XHRzdXBlciguLi5hcmdzKTtcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgbmFtZTogMSB9KTtcblx0XHR0aGlzLnRyeUVuc3VyZUluZGV4KHsgc2NvcGU6IDEgfSk7XG5cdH1cblxuXHRmaW5kVXNlcnNJblJvbGUobmFtZSwgc2NvcGUsIG9wdGlvbnMpIHtcblx0XHRjb25zdCByb2xlID0gdGhpcy5maW5kT25lKG5hbWUpO1xuXHRcdGNvbnN0IHJvbGVTY29wZSA9IChyb2xlICYmIHJvbGUuc2NvcGUpIHx8ICdVc2Vycyc7XG5cdFx0Y29uc3QgbW9kZWwgPSBSb2NrZXRDaGF0Lm1vZGVsc1tyb2xlU2NvcGVdO1xuXG5cdFx0cmV0dXJuIG1vZGVsICYmIG1vZGVsLmZpbmRVc2Vyc0luUm9sZXMgJiYgbW9kZWwuZmluZFVzZXJzSW5Sb2xlcyhuYW1lLCBzY29wZSwgb3B0aW9ucyk7XG5cdH1cblxuXHRpc1VzZXJJblJvbGVzKHVzZXJJZCwgcm9sZXMsIHNjb3BlKSB7XG5cdFx0cm9sZXMgPSBbXS5jb25jYXQocm9sZXMpO1xuXHRcdHJldHVybiByb2xlcy5zb21lKChyb2xlTmFtZSkgPT4ge1xuXHRcdFx0Y29uc3Qgcm9sZSA9IHRoaXMuZmluZE9uZShyb2xlTmFtZSk7XG5cdFx0XHRjb25zdCByb2xlU2NvcGUgPSAocm9sZSAmJiByb2xlLnNjb3BlKSB8fCAnVXNlcnMnO1xuXHRcdFx0Y29uc3QgbW9kZWwgPSBSb2NrZXRDaGF0Lm1vZGVsc1tyb2xlU2NvcGVdO1xuXG5cdFx0XHRyZXR1cm4gbW9kZWwgJiYgbW9kZWwuaXNVc2VySW5Sb2xlICYmIG1vZGVsLmlzVXNlckluUm9sZSh1c2VySWQsIHJvbGVOYW1lLCBzY29wZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRjcmVhdGVPclVwZGF0ZShuYW1lLCBzY29wZSA9ICdVc2VycycsIGRlc2NyaXB0aW9uLCBwcm90ZWN0ZWRSb2xlKSB7XG5cdFx0Y29uc3QgdXBkYXRlRGF0YSA9IHt9O1xuXHRcdHVwZGF0ZURhdGEubmFtZSA9IG5hbWU7XG5cdFx0dXBkYXRlRGF0YS5zY29wZSA9IHNjb3BlO1xuXG5cdFx0aWYgKGRlc2NyaXB0aW9uICE9IG51bGwpIHtcblx0XHRcdHVwZGF0ZURhdGEuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcblx0XHR9XG5cblx0XHRpZiAocHJvdGVjdGVkUm9sZSkge1xuXHRcdFx0dXBkYXRlRGF0YS5wcm90ZWN0ZWQgPSBwcm90ZWN0ZWRSb2xlO1xuXHRcdH1cblxuXHRcdHRoaXMudXBzZXJ0KHsgX2lkOiBuYW1lIH0sIHsgJHNldDogdXBkYXRlRGF0YSB9KTtcblx0fVxuXG5cdGFkZFVzZXJSb2xlcyh1c2VySWQsIHJvbGVzLCBzY29wZSkge1xuXHRcdHJvbGVzID0gW10uY29uY2F0KHJvbGVzKTtcblx0XHRmb3IgKGNvbnN0IHJvbGVOYW1lIG9mIHJvbGVzKSB7XG5cdFx0XHRjb25zdCByb2xlID0gdGhpcy5maW5kT25lKHJvbGVOYW1lKTtcblx0XHRcdGNvbnN0IHJvbGVTY29wZSA9IChyb2xlICYmIHJvbGUuc2NvcGUpIHx8ICdVc2Vycyc7XG5cdFx0XHRjb25zdCBtb2RlbCA9IFJvY2tldENoYXQubW9kZWxzW3JvbGVTY29wZV07XG5cblx0XHRcdG1vZGVsICYmIG1vZGVsLmFkZFJvbGVzQnlVc2VySWQgJiYgbW9kZWwuYWRkUm9sZXNCeVVzZXJJZCh1c2VySWQsIHJvbGVOYW1lLCBzY29wZSk7XG5cdFx0fVxuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0cmVtb3ZlVXNlclJvbGVzKHVzZXJJZCwgcm9sZXMsIHNjb3BlKSB7XG5cdFx0cm9sZXMgPSBbXS5jb25jYXQocm9sZXMpO1xuXHRcdGZvciAoY29uc3Qgcm9sZU5hbWUgb2Ygcm9sZXMpIHtcblx0XHRcdGNvbnN0IHJvbGUgPSB0aGlzLmZpbmRPbmUocm9sZU5hbWUpO1xuXHRcdFx0Y29uc3Qgcm9sZVNjb3BlID0gKHJvbGUgJiYgcm9sZS5zY29wZSkgfHwgJ1VzZXJzJztcblx0XHRcdGNvbnN0IG1vZGVsID0gUm9ja2V0Q2hhdC5tb2RlbHNbcm9sZVNjb3BlXTtcblxuXHRcdFx0bW9kZWwgJiYgbW9kZWwucmVtb3ZlUm9sZXNCeVVzZXJJZCAmJiBtb2RlbC5yZW1vdmVSb2xlc0J5VXNlcklkKHVzZXJJZCwgcm9sZU5hbWUsIHNjb3BlKTtcblx0XHR9XG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHRmaW5kT25lQnlJZE9yTmFtZShfaWRPck5hbWUsIG9wdGlvbnMpIHtcblx0XHRjb25zdCBxdWVyeSA9IHtcblx0XHRcdCRvcjogW3tcblx0XHRcdFx0X2lkOiBfaWRPck5hbWUsXG5cdFx0XHR9LCB7XG5cdFx0XHRcdG5hbWU6IF9pZE9yTmFtZSxcblx0XHRcdH1dLFxuXHRcdH07XG5cblx0XHRyZXR1cm4gdGhpcy5maW5kT25lKHF1ZXJ5LCBvcHRpb25zKTtcblx0fVxufVxuXG5Sb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcyA9IG5ldyBNb2RlbFJvbGVzKCdyb2xlcycpO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQubW9kZWxzLl9CYXNlLnByb3RvdHlwZS5yb2xlQmFzZVF1ZXJ5ID0gZnVuY3Rpb24oLyogdXNlcklkLCBzY29wZSovKSB7XG5cdHJldHVybjtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLl9CYXNlLnByb3RvdHlwZS5maW5kUm9sZXNCeVVzZXJJZCA9IGZ1bmN0aW9uKHVzZXJJZC8qICwgb3B0aW9ucyovKSB7XG5cdGNvbnN0IHF1ZXJ5ID0gdGhpcy5yb2xlQmFzZVF1ZXJ5KHVzZXJJZCk7XG5cdHJldHVybiB0aGlzLmZpbmQocXVlcnksIHsgZmllbGRzOiB7IHJvbGVzOiAxIH0gfSk7XG59O1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5fQmFzZS5wcm90b3R5cGUuaXNVc2VySW5Sb2xlID0gZnVuY3Rpb24odXNlcklkLCByb2xlTmFtZSwgc2NvcGUpIHtcblx0Y29uc3QgcXVlcnkgPSB0aGlzLnJvbGVCYXNlUXVlcnkodXNlcklkLCBzY29wZSk7XG5cblx0aWYgKHF1ZXJ5ID09IG51bGwpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRxdWVyeS5yb2xlcyA9IHJvbGVOYW1lO1xuXHRyZXR1cm4gIV8uaXNVbmRlZmluZWQodGhpcy5maW5kT25lKHF1ZXJ5LCB7IGZpZWxkczogeyByb2xlczogMSB9IH0pKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLl9CYXNlLnByb3RvdHlwZS5hZGRSb2xlc0J5VXNlcklkID0gZnVuY3Rpb24odXNlcklkLCByb2xlcywgc2NvcGUpIHtcblx0cm9sZXMgPSBbXS5jb25jYXQocm9sZXMpO1xuXHRjb25zdCBxdWVyeSA9IHRoaXMucm9sZUJhc2VRdWVyeSh1c2VySWQsIHNjb3BlKTtcblx0Y29uc3QgdXBkYXRlID0ge1xuXHRcdCRhZGRUb1NldDoge1xuXHRcdFx0cm9sZXM6IHsgJGVhY2g6IHJvbGVzIH0sXG5cdFx0fSxcblx0fTtcblx0cmV0dXJuIHRoaXMudXBkYXRlKHF1ZXJ5LCB1cGRhdGUpO1xufTtcblxuUm9ja2V0Q2hhdC5tb2RlbHMuX0Jhc2UucHJvdG90eXBlLnJlbW92ZVJvbGVzQnlVc2VySWQgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVzLCBzY29wZSkge1xuXHRyb2xlcyA9IFtdLmNvbmNhdChyb2xlcyk7XG5cdGNvbnN0IHF1ZXJ5ID0gdGhpcy5yb2xlQmFzZVF1ZXJ5KHVzZXJJZCwgc2NvcGUpO1xuXHRjb25zdCB1cGRhdGUgPSB7XG5cdFx0JHB1bGxBbGw6IHtcblx0XHRcdHJvbGVzLFxuXHRcdH0sXG5cdH07XG5cdHJldHVybiB0aGlzLnVwZGF0ZShxdWVyeSwgdXBkYXRlKTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLl9CYXNlLnByb3RvdHlwZS5maW5kVXNlcnNJblJvbGVzID0gZnVuY3Rpb24oKSB7XG5cdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ292ZXJ3cml0ZS1mdW5jdGlvbicsICdZb3UgbXVzdCBvdmVyd3JpdGUgdGhpcyBmdW5jdGlvbiBpbiB0aGUgZXh0ZW5kZWQgY2xhc3NlcycpO1xufTtcbiIsIlJvY2tldENoYXQubW9kZWxzLlVzZXJzLnJvbGVCYXNlUXVlcnkgPSBmdW5jdGlvbih1c2VySWQpIHtcblx0cmV0dXJuIHsgX2lkOiB1c2VySWQgfTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlVzZXJzLmZpbmRVc2Vyc0luUm9sZXMgPSBmdW5jdGlvbihyb2xlcywgc2NvcGUsIG9wdGlvbnMpIHtcblx0cm9sZXMgPSBbXS5jb25jYXQocm9sZXMpO1xuXG5cdGNvbnN0IHF1ZXJ5ID0ge1xuXHRcdHJvbGVzOiB7ICRpbjogcm9sZXMgfSxcblx0fTtcblxuXHRyZXR1cm4gdGhpcy5maW5kKHF1ZXJ5LCBvcHRpb25zKTtcbn07XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuUm9ja2V0Q2hhdC5tb2RlbHMuU3Vic2NyaXB0aW9ucy5yb2xlQmFzZVF1ZXJ5ID0gZnVuY3Rpb24odXNlcklkLCBzY29wZSkge1xuXHRpZiAoc2NvcGUgPT0gbnVsbCkge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IHF1ZXJ5ID0geyAndS5faWQnOiB1c2VySWQgfTtcblx0aWYgKCFfLmlzVW5kZWZpbmVkKHNjb3BlKSkge1xuXHRcdHF1ZXJ5LnJpZCA9IHNjb3BlO1xuXHR9XG5cdHJldHVybiBxdWVyeTtcbn07XG5cblJvY2tldENoYXQubW9kZWxzLlN1YnNjcmlwdGlvbnMuZmluZFVzZXJzSW5Sb2xlcyA9IGZ1bmN0aW9uKHJvbGVzLCBzY29wZSwgb3B0aW9ucykge1xuXHRyb2xlcyA9IFtdLmNvbmNhdChyb2xlcyk7XG5cblx0Y29uc3QgcXVlcnkgPSB7XG5cdFx0cm9sZXM6IHsgJGluOiByb2xlcyB9LFxuXHR9O1xuXG5cdGlmIChzY29wZSkge1xuXHRcdHF1ZXJ5LnJpZCA9IHNjb3BlO1xuXHR9XG5cblx0Y29uc3Qgc3Vic2NyaXB0aW9ucyA9IHRoaXMuZmluZChxdWVyeSkuZmV0Y2goKTtcblxuXHRjb25zdCB1c2VycyA9IF8uY29tcGFjdChfLm1hcChzdWJzY3JpcHRpb25zLCBmdW5jdGlvbihzdWJzY3JpcHRpb24pIHtcblx0XHRpZiAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBzdWJzY3JpcHRpb24udSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHN1YnNjcmlwdGlvbi51Ll9pZCkge1xuXHRcdFx0cmV0dXJuIHN1YnNjcmlwdGlvbi51Ll9pZDtcblx0XHR9XG5cdH0pKTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZmluZCh7IF9pZDogeyAkaW46IHVzZXJzIH0gfSwgb3B0aW9ucyk7XG59O1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cblJvY2tldENoYXQuYXV0aHouYWRkVXNlclJvbGVzID0gZnVuY3Rpb24odXNlcklkLCByb2xlTmFtZXMsIHNjb3BlKSB7XG5cdGlmICghdXNlcklkIHx8ICFyb2xlTmFtZXMpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRjb25zdCB1c2VyID0gUm9ja2V0Q2hhdC5tb2RlbHMuVXNlcnMuZGIuZmluZE9uZUJ5SWQodXNlcklkKTtcblx0aWYgKCF1c2VyKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC11c2VyJywgJ0ludmFsaWQgdXNlcicsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5hdXRoei5hZGRVc2VyUm9sZXMnLFxuXHRcdH0pO1xuXHR9XG5cblx0cm9sZU5hbWVzID0gW10uY29uY2F0KHJvbGVOYW1lcyk7XG5cdGNvbnN0IGV4aXN0aW5nUm9sZU5hbWVzID0gXy5wbHVjayhSb2NrZXRDaGF0LmF1dGh6LmdldFJvbGVzKCksICdfaWQnKTtcblx0Y29uc3QgaW52YWxpZFJvbGVOYW1lcyA9IF8uZGlmZmVyZW5jZShyb2xlTmFtZXMsIGV4aXN0aW5nUm9sZU5hbWVzKTtcblxuXHRpZiAoIV8uaXNFbXB0eShpbnZhbGlkUm9sZU5hbWVzKSkge1xuXHRcdGZvciAoY29uc3Qgcm9sZSBvZiBpbnZhbGlkUm9sZU5hbWVzKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5jcmVhdGVPclVwZGF0ZShyb2xlKTtcblx0XHR9XG5cdH1cblxuXHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5hZGRVc2VyUm9sZXModXNlcklkLCByb2xlTmFtZXMsIHNjb3BlKTtcblxuXHRyZXR1cm4gdHJ1ZTtcbn07XG4iLCIvKiBnbG9iYWxzIFJvY2tldENoYXQgKi9cblJvY2tldENoYXQuYXV0aHoucm9vbUFjY2Vzc1ZhbGlkYXRvcnMgPSBbXG5cdGZ1bmN0aW9uKHJvb20sIHVzZXIgPSB7fSkge1xuXHRcdGlmIChyb29tICYmIHJvb20udCA9PT0gJ2MnKSB7XG5cdFx0XHRpZiAoIXVzZXIuX2lkICYmIFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdBY2NvdW50c19BbGxvd0Fub255bW91c1JlYWQnKSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbih1c2VyLl9pZCwgJ3ZpZXctYy1yb29tJyk7XG5cdFx0fVxuXHR9LFxuXHRmdW5jdGlvbihyb29tLCB1c2VyID0ge30pIHtcblx0XHRpZiAoIXJvb20gfHwgIXVzZXIpIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRjb25zdCBzdWJzY3JpcHRpb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5TdWJzY3JpcHRpb25zLmZpbmRPbmVCeVJvb21JZEFuZFVzZXJJZChyb29tLl9pZCwgdXNlci5faWQpO1xuXHRcdGlmIChzdWJzY3JpcHRpb24pIHtcblx0XHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb29tcy5maW5kT25lQnlJZChzdWJzY3JpcHRpb24ucmlkKTtcblx0XHR9XG5cdH0sXG5dO1xuXG5Sb2NrZXRDaGF0LmF1dGh6LmNhbkFjY2Vzc1Jvb20gPSBmdW5jdGlvbihyb29tLCB1c2VyLCBleHRyYURhdGEpIHtcblx0cmV0dXJuIFJvY2tldENoYXQuYXV0aHoucm9vbUFjY2Vzc1ZhbGlkYXRvcnMuc29tZSgodmFsaWRhdG9yKSA9PiB2YWxpZGF0b3IuY2FsbCh0aGlzLCByb29tLCB1c2VyLCBleHRyYURhdGEpKTtcbn07XG5cblJvY2tldENoYXQuYXV0aHouYWRkUm9vbUFjY2Vzc1ZhbGlkYXRvciA9IGZ1bmN0aW9uKHZhbGlkYXRvcikge1xuXHRSb2NrZXRDaGF0LmF1dGh6LnJvb21BY2Nlc3NWYWxpZGF0b3JzLnB1c2godmFsaWRhdG9yKTtcbn07XG4iLCJSb2NrZXRDaGF0LmF1dGh6LmdldFJvbGVzID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5maW5kKCkuZmV0Y2goKTtcbn07XG4iLCJSb2NrZXRDaGF0LmF1dGh6LmdldFVzZXJzSW5Sb2xlID0gZnVuY3Rpb24ocm9sZU5hbWUsIHNjb3BlLCBvcHRpb25zKSB7XG5cdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5maW5kVXNlcnNJblJvbGUocm9sZU5hbWUsIHNjb3BlLCBvcHRpb25zKTtcbn07XG4iLCJmdW5jdGlvbiBhdExlYXN0T25lKHVzZXJJZCwgcGVybWlzc2lvbnMgPSBbXSwgc2NvcGUpIHtcblx0cmV0dXJuIHBlcm1pc3Npb25zLnNvbWUoKHBlcm1pc3Npb25JZCkgPT4ge1xuXHRcdGNvbnN0IHBlcm1pc3Npb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5maW5kT25lKHBlcm1pc3Npb25JZCk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmlzVXNlckluUm9sZXModXNlcklkLCBwZXJtaXNzaW9uLnJvbGVzLCBzY29wZSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBhbGwodXNlcklkLCBwZXJtaXNzaW9ucyA9IFtdLCBzY29wZSkge1xuXHRyZXR1cm4gcGVybWlzc2lvbnMuZXZlcnkoKHBlcm1pc3Npb25JZCkgPT4ge1xuXHRcdGNvbnN0IHBlcm1pc3Npb24gPSBSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5maW5kT25lKHBlcm1pc3Npb25JZCk7XG5cdFx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmlzVXNlckluUm9sZXModXNlcklkLCBwZXJtaXNzaW9uLnJvbGVzLCBzY29wZSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBoYXNQZXJtaXNzaW9uKHVzZXJJZCwgcGVybWlzc2lvbnMsIHNjb3BlLCBzdHJhdGVneSkge1xuXHRpZiAoIXVzZXJJZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdHBlcm1pc3Npb25zID0gW10uY29uY2F0KHBlcm1pc3Npb25zKTtcblx0cmV0dXJuIHN0cmF0ZWd5KHVzZXJJZCwgcGVybWlzc2lvbnMsIHNjb3BlKTtcbn1cblxuUm9ja2V0Q2hhdC5hdXRoei5oYXNBbGxQZXJtaXNzaW9uID0gZnVuY3Rpb24odXNlcklkLCBwZXJtaXNzaW9ucywgc2NvcGUpIHtcblx0cmV0dXJuIGhhc1Blcm1pc3Npb24odXNlcklkLCBwZXJtaXNzaW9ucywgc2NvcGUsIGFsbCk7XG59O1xuXG5Sb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24gPSBSb2NrZXRDaGF0LmF1dGh6Lmhhc0FsbFBlcm1pc3Npb247XG5cblJvY2tldENoYXQuYXV0aHouaGFzQXRMZWFzdE9uZVBlcm1pc3Npb24gPSBmdW5jdGlvbih1c2VySWQsIHBlcm1pc3Npb25zLCBzY29wZSkge1xuXHRyZXR1cm4gaGFzUGVybWlzc2lvbih1c2VySWQsIHBlcm1pc3Npb25zLCBzY29wZSwgYXRMZWFzdE9uZSk7XG59O1xuIiwiUm9ja2V0Q2hhdC5hdXRoei5oYXNSb2xlID0gZnVuY3Rpb24odXNlcklkLCByb2xlTmFtZXMsIHNjb3BlKSB7XG5cdHJvbGVOYW1lcyA9IFtdLmNvbmNhdChyb2xlTmFtZXMpO1xuXHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuaXNVc2VySW5Sb2xlcyh1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpO1xufTtcbiIsImltcG9ydCBfIGZyb20gJ3VuZGVyc2NvcmUnO1xuXG5Sb2NrZXRDaGF0LmF1dGh6LnJlbW92ZVVzZXJGcm9tUm9sZXMgPSBmdW5jdGlvbih1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpIHtcblx0aWYgKCF1c2VySWQgfHwgIXJvbGVOYW1lcykge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlJZCh1c2VySWQpO1xuXG5cdGlmICghdXNlcikge1xuXHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtdXNlcicsICdJbnZhbGlkIHVzZXInLCB7XG5cdFx0XHRmdW5jdGlvbjogJ1JvY2tldENoYXQuYXV0aHoucmVtb3ZlVXNlckZyb21Sb2xlcycsXG5cdFx0fSk7XG5cdH1cblxuXHRyb2xlTmFtZXMgPSBbXS5jb25jYXQocm9sZU5hbWVzKTtcblx0Y29uc3QgZXhpc3RpbmdSb2xlTmFtZXMgPSBfLnBsdWNrKFJvY2tldENoYXQuYXV0aHouZ2V0Um9sZXMoKSwgJ19pZCcpO1xuXHRjb25zdCBpbnZhbGlkUm9sZU5hbWVzID0gXy5kaWZmZXJlbmNlKHJvbGVOYW1lcywgZXhpc3RpbmdSb2xlTmFtZXMpO1xuXG5cdGlmICghXy5pc0VtcHR5KGludmFsaWRSb2xlTmFtZXMpKSB7XG5cdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1yb2xlJywgJ0ludmFsaWQgcm9sZScsIHtcblx0XHRcdGZ1bmN0aW9uOiAnUm9ja2V0Q2hhdC5hdXRoei5yZW1vdmVVc2VyRnJvbVJvbGVzJyxcblx0XHR9KTtcblx0fVxuXG5cdFJvY2tldENoYXQubW9kZWxzLlJvbGVzLnJlbW92ZVVzZXJSb2xlcyh1c2VySWQsIHJvbGVOYW1lcywgc2NvcGUpO1xuXG5cdHJldHVybiB0cnVlO1xufTtcbiIsIk1ldGVvci5tZXRob2RzKHtcblx0J3Blcm1pc3Npb25zL2dldCcodXBkYXRlZEF0KSB7XG5cdFx0dGhpcy51bmJsb2NrKCk7XG5cdFx0Ly8gVE9ETzogc2hvdWxkIHdlIHJldHVybiB0aGlzIGZvciBub24gbG9nZ2VkIHVzZXJzP1xuXHRcdC8vIFRPRE86IHdlIGNvdWxkIGNhY2hlIHRoaXMgY29sbGVjdGlvblxuXG5cdFx0Y29uc3QgcmVjb3JkcyA9IFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLmZpbmQoKS5mZXRjaCgpO1xuXG5cdFx0aWYgKHVwZGF0ZWRBdCBpbnN0YW5jZW9mIERhdGUpIHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdHVwZGF0ZTogcmVjb3Jkcy5maWx0ZXIoKHJlY29yZCkgPT4gcmVjb3JkLl91cGRhdGVkQXQgPiB1cGRhdGVkQXQpLFxuXHRcdFx0XHRyZW1vdmU6IFJvY2tldENoYXQubW9kZWxzLlBlcm1pc3Npb25zLnRyYXNoRmluZERlbGV0ZWRBZnRlcih1cGRhdGVkQXQsIHt9LCB7IGZpZWxkczogeyBfaWQ6IDEsIF9kZWxldGVkQXQ6IDEgfSB9KS5mZXRjaCgpLFxuXHRcdFx0fTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVjb3Jkcztcblx0fSxcbn0pO1xuXG5Sb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy5vbignY2hhbmdlJywgKHsgY2xpZW50QWN0aW9uLCBpZCwgZGF0YSB9KSA9PiB7XG5cdHN3aXRjaCAoY2xpZW50QWN0aW9uKSB7XG5cdFx0Y2FzZSAndXBkYXRlZCc6XG5cdFx0Y2FzZSAnaW5zZXJ0ZWQnOlxuXHRcdFx0ZGF0YSA9IGRhdGEgfHwgUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuZmluZE9uZUJ5SWQoaWQpO1xuXHRcdFx0YnJlYWs7XG5cblx0XHRjYXNlICdyZW1vdmVkJzpcblx0XHRcdGRhdGEgPSB7IF9pZDogaWQgfTtcblx0XHRcdGJyZWFrO1xuXHR9XG5cblx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZEluVGhpc0luc3RhbmNlKCdwZXJtaXNzaW9ucy1jaGFuZ2VkJywgY2xpZW50QWN0aW9uLCBkYXRhKTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ3JvbGVzJywgZnVuY3Rpb24oKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0cmV0dXJuIFJvY2tldENoYXQubW9kZWxzLlJvbGVzLmZpbmQoKTtcbn0pO1xuIiwiTWV0ZW9yLnB1Ymxpc2goJ3VzZXJzSW5Sb2xlJywgZnVuY3Rpb24ocm9sZU5hbWUsIHNjb3BlLCBsaW1pdCA9IDUwKSB7XG5cdGlmICghdGhpcy51c2VySWQpIHtcblx0XHRyZXR1cm4gdGhpcy5yZWFkeSgpO1xuXHR9XG5cblx0aWYgKCFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24odGhpcy51c2VySWQsICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdHJldHVybiB0aGlzLmVycm9yKG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLW5vdC1hbGxvd2VkJywgJ05vdCBhbGxvd2VkJywge1xuXHRcdFx0cHVibGlzaDogJ3VzZXJzSW5Sb2xlJyxcblx0XHR9KSk7XG5cdH1cblxuXHRjb25zdCBvcHRpb25zID0ge1xuXHRcdGxpbWl0LFxuXHRcdHNvcnQ6IHtcblx0XHRcdG5hbWU6IDEsXG5cdFx0fSxcblx0fTtcblxuXHRyZXR1cm4gUm9ja2V0Q2hhdC5hdXRoei5nZXRVc2Vyc0luUm9sZShyb2xlTmFtZSwgc2NvcGUsIG9wdGlvbnMpO1xufSk7XG4iLCJpbXBvcnQgXyBmcm9tICd1bmRlcnNjb3JlJztcblxuTWV0ZW9yLm1ldGhvZHMoe1xuXHQnYXV0aG9yaXphdGlvbjphZGRVc2VyVG9Sb2xlJyhyb2xlTmFtZSwgdXNlcm5hbWUsIHNjb3BlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0FjY2Vzc2luZyBwZXJtaXNzaW9ucyBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjphZGRVc2VyVG9Sb2xlJyxcblx0XHRcdFx0YWN0aW9uOiAnQWNjZXNzaW5nX3Blcm1pc3Npb25zJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmICghcm9sZU5hbWUgfHwgIV8uaXNTdHJpbmcocm9sZU5hbWUpIHx8ICF1c2VybmFtZSB8fCAhXy5pc1N0cmluZyh1c2VybmFtZSkpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtYXJndW1lbnRzJywgJ0ludmFsaWQgYXJndW1lbnRzJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKHJvbGVOYW1lID09PSAnYWRtaW4nICYmICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnYXNzaWduLWFkbWluLXJvbGUnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0Fzc2lnbmluZyBhZG1pbiBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjphZGRVc2VyVG9Sb2xlJyxcblx0XHRcdFx0YWN0aW9uOiAnQXNzaWduX2FkbWluJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBSb2NrZXRDaGF0Lm1vZGVscy5Vc2Vycy5maW5kT25lQnlVc2VybmFtZSh1c2VybmFtZSwge1xuXHRcdFx0ZmllbGRzOiB7XG5cdFx0XHRcdF9pZDogMSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmFkZFVzZXJUb1JvbGUnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgYWRkID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuYWRkVXNlclJvbGVzKHVzZXIuX2lkLCByb2xlTmFtZSwgc2NvcGUpO1xuXG5cdFx0aWYgKFJvY2tldENoYXQuc2V0dGluZ3MuZ2V0KCdVSV9EaXNwbGF5Um9sZXMnKSkge1xuXHRcdFx0Um9ja2V0Q2hhdC5Ob3RpZmljYXRpb25zLm5vdGlmeUxvZ2dlZCgncm9sZXMtY2hhbmdlJywge1xuXHRcdFx0XHR0eXBlOiAnYWRkZWQnLFxuXHRcdFx0XHRfaWQ6IHJvbGVOYW1lLFxuXHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0c2NvcGUsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYWRkO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRob3JpemF0aW9uOmRlbGV0ZVJvbGUnKHJvbGVOYW1lKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0FjY2Vzc2luZyBwZXJtaXNzaW9ucyBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpkZWxldGVSb2xlJyxcblx0XHRcdFx0YWN0aW9uOiAnQWNjZXNzaW5nX3Blcm1pc3Npb25zJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHJvbGUgPSBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5maW5kT25lKHJvbGVOYW1lKTtcblx0XHRpZiAoIXJvbGUpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWludmFsaWQtcm9sZScsICdJbnZhbGlkIHJvbGUnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246ZGVsZXRlUm9sZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRpZiAocm9sZS5wcm90ZWN0ZWQpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWRlbGV0ZS1wcm90ZWN0ZWQtcm9sZScsICdDYW5ub3QgZGVsZXRlIGEgcHJvdGVjdGVkIHJvbGUnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246ZGVsZXRlUm9sZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRjb25zdCByb2xlU2NvcGUgPSByb2xlLnNjb3BlIHx8ICdVc2Vycyc7XG5cdFx0Y29uc3QgbW9kZWwgPSBSb2NrZXRDaGF0Lm1vZGVsc1tyb2xlU2NvcGVdO1xuXHRcdGNvbnN0IGV4aXN0aW5nVXNlcnMgPSBtb2RlbCAmJiBtb2RlbC5maW5kVXNlcnNJblJvbGVzICYmIG1vZGVsLmZpbmRVc2Vyc0luUm9sZXMocm9sZU5hbWUpO1xuXG5cdFx0aWYgKGV4aXN0aW5nVXNlcnMgJiYgZXhpc3RpbmdVc2Vycy5jb3VudCgpID4gMCkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3Itcm9sZS1pbi11c2UnLCAnQ2Fubm90IGRlbGV0ZSByb2xlIGJlY2F1c2UgaXRcXCdzIGluIHVzZScsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpkZWxldGVSb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdHJldHVybiBSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy5yZW1vdmUocm9sZS5uYW1lKTtcblx0fSxcbn0pO1xuIiwiaW1wb3J0IF8gZnJvbSAndW5kZXJzY29yZSc7XG5cbk1ldGVvci5tZXRob2RzKHtcblx0J2F1dGhvcml6YXRpb246cmVtb3ZlVXNlckZyb21Sb2xlJyhyb2xlTmFtZSwgdXNlcm5hbWUsIHNjb3BlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0FjY2VzcyBwZXJtaXNzaW9ucyBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0bWV0aG9kOiAnYXV0aG9yaXphdGlvbjpyZW1vdmVVc2VyRnJvbVJvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBY2Nlc3NpbmdfcGVybWlzc2lvbnMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb2xlTmFtZSB8fCAhXy5pc1N0cmluZyhyb2xlTmFtZSkgfHwgIXVzZXJuYW1lIHx8ICFfLmlzU3RyaW5nKHVzZXJuYW1lKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItaW52YWxpZC1hcmd1bWVudHMnLCAnSW52YWxpZCBhcmd1bWVudHMnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246cmVtb3ZlVXNlckZyb21Sb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZSh7XG5cdFx0XHR1c2VybmFtZSxcblx0XHR9LCB7XG5cdFx0XHRmaWVsZHM6IHtcblx0XHRcdFx0X2lkOiAxLFxuXHRcdFx0XHRyb2xlczogMSxcblx0XHRcdH0sXG5cdFx0fSk7XG5cblx0XHRpZiAoIXVzZXIgfHwgIXVzZXIuX2lkKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1pbnZhbGlkLXVzZXInLCAnSW52YWxpZCB1c2VyJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOnJlbW92ZVVzZXJGcm9tUm9sZScsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHQvLyBwcmV2ZW50IHJlbW92aW5nIGxhc3QgdXNlciBmcm9tIGFkbWluIHJvbGVcblx0XHRpZiAocm9sZU5hbWUgPT09ICdhZG1pbicpIHtcblx0XHRcdGNvbnN0IGFkbWluQ291bnQgPSBNZXRlb3IudXNlcnMuZmluZCh7XG5cdFx0XHRcdHJvbGVzOiB7XG5cdFx0XHRcdFx0JGluOiBbJ2FkbWluJ10sXG5cdFx0XHRcdH0sXG5cdFx0XHR9KS5jb3VudCgpO1xuXG5cdFx0XHRjb25zdCB1c2VySXNBZG1pbiA9IHVzZXIucm9sZXMuaW5kZXhPZignYWRtaW4nKSA+IC0xO1xuXHRcdFx0aWYgKGFkbWluQ291bnQgPT09IDEgJiYgdXNlcklzQWRtaW4pIHtcblx0XHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0xlYXZpbmcgdGhlIGFwcCB3aXRob3V0IGFkbWlucyBpcyBub3QgYWxsb3dlZCcsIHtcblx0XHRcdFx0XHRtZXRob2Q6ICdyZW1vdmVVc2VyRnJvbVJvbGUnLFxuXHRcdFx0XHRcdGFjdGlvbjogJ1JlbW92ZV9sYXN0X2FkbWluJyxcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Y29uc3QgcmVtb3ZlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMucmVtb3ZlVXNlclJvbGVzKHVzZXIuX2lkLCByb2xlTmFtZSwgc2NvcGUpO1xuXHRcdGlmIChSb2NrZXRDaGF0LnNldHRpbmdzLmdldCgnVUlfRGlzcGxheVJvbGVzJykpIHtcblx0XHRcdFJvY2tldENoYXQuTm90aWZpY2F0aW9ucy5ub3RpZnlMb2dnZWQoJ3JvbGVzLWNoYW5nZScsIHtcblx0XHRcdFx0dHlwZTogJ3JlbW92ZWQnLFxuXHRcdFx0XHRfaWQ6IHJvbGVOYW1lLFxuXHRcdFx0XHR1OiB7XG5cdFx0XHRcdFx0X2lkOiB1c2VyLl9pZCxcblx0XHRcdFx0XHR1c2VybmFtZSxcblx0XHRcdFx0fSxcblx0XHRcdFx0c2NvcGUsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcmVtb3ZlO1xuXHR9LFxufSk7XG4iLCJNZXRlb3IubWV0aG9kcyh7XG5cdCdhdXRob3JpemF0aW9uOnNhdmVSb2xlJyhyb2xlRGF0YSkge1xuXHRcdGlmICghTWV0ZW9yLnVzZXJJZCgpIHx8ICFSb2NrZXRDaGF0LmF1dGh6Lmhhc1Blcm1pc3Npb24oTWV0ZW9yLnVzZXJJZCgpLCAnYWNjZXNzLXBlcm1pc3Npb25zJykpIHtcblx0XHRcdHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ2Vycm9yLWFjdGlvbi1ub3QtYWxsb3dlZCcsICdBY2Nlc3NpbmcgcGVybWlzc2lvbnMgaXMgbm90IGFsbG93ZWQnLCB7XG5cdFx0XHRcdG1ldGhvZDogJ2F1dGhvcml6YXRpb246c2F2ZVJvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBY2Nlc3NpbmdfcGVybWlzc2lvbnMnLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0aWYgKCFyb2xlRGF0YS5uYW1lKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1yb2xlLW5hbWUtcmVxdWlyZWQnLCAnUm9sZSBuYW1lIGlzIHJlcXVpcmVkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOnNhdmVSb2xlJyxcblx0XHRcdH0pO1xuXHRcdH1cblxuXHRcdGlmIChbJ1VzZXJzJywgJ1N1YnNjcmlwdGlvbnMnXS5pbmNsdWRlcyhyb2xlRGF0YS5zY29wZSkgPT09IGZhbHNlKSB7XG5cdFx0XHRyb2xlRGF0YS5zY29wZSA9ICdVc2Vycyc7XG5cdFx0fVxuXG5cdFx0Y29uc3QgdXBkYXRlID0gUm9ja2V0Q2hhdC5tb2RlbHMuUm9sZXMuY3JlYXRlT3JVcGRhdGUocm9sZURhdGEubmFtZSwgcm9sZURhdGEuc2NvcGUsIHJvbGVEYXRhLmRlc2NyaXB0aW9uKTtcblx0XHRpZiAoUm9ja2V0Q2hhdC5zZXR0aW5ncy5nZXQoJ1VJX0Rpc3BsYXlSb2xlcycpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lk5vdGlmaWNhdGlvbnMubm90aWZ5TG9nZ2VkKCdyb2xlcy1jaGFuZ2UnLCB7XG5cdFx0XHRcdHR5cGU6ICdjaGFuZ2VkJyxcblx0XHRcdFx0X2lkOiByb2xlRGF0YS5uYW1lLFxuXHRcdFx0fSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVwZGF0ZTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnYXV0aG9yaXphdGlvbjphZGRQZXJtaXNzaW9uVG9Sb2xlJyhwZXJtaXNzaW9uLCByb2xlKSB7XG5cdFx0aWYgKCFNZXRlb3IudXNlcklkKCkgfHwgIVJvY2tldENoYXQuYXV0aHouaGFzUGVybWlzc2lvbihNZXRlb3IudXNlcklkKCksICdhY2Nlc3MtcGVybWlzc2lvbnMnKSkge1xuXHRcdFx0dGhyb3cgbmV3IE1ldGVvci5FcnJvcignZXJyb3ItYWN0aW9uLW5vdC1hbGxvd2VkJywgJ0FkZGluZyBwZXJtaXNzaW9uIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOmFkZFBlcm1pc3Npb25Ub1JvbGUnLFxuXHRcdFx0XHRhY3Rpb246ICdBZGRpbmdfcGVybWlzc2lvbicsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuYWRkUm9sZShwZXJtaXNzaW9uLCByb2xlKTtcblx0fSxcbn0pO1xuIiwiTWV0ZW9yLm1ldGhvZHMoe1xuXHQnYXV0aG9yaXphdGlvbjpyZW1vdmVSb2xlRnJvbVBlcm1pc3Npb24nKHBlcm1pc3Npb24sIHJvbGUpIHtcblx0XHRpZiAoIU1ldGVvci51c2VySWQoKSB8fCAhUm9ja2V0Q2hhdC5hdXRoei5oYXNQZXJtaXNzaW9uKE1ldGVvci51c2VySWQoKSwgJ2FjY2Vzcy1wZXJtaXNzaW9ucycpKSB7XG5cdFx0XHR0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdlcnJvci1hY3Rpb24tbm90LWFsbG93ZWQnLCAnQWNjZXNzaW5nIHBlcm1pc3Npb25zIGlzIG5vdCBhbGxvd2VkJywge1xuXHRcdFx0XHRtZXRob2Q6ICdhdXRob3JpemF0aW9uOnJlbW92ZVJvbGVGcm9tUGVybWlzc2lvbicsXG5cdFx0XHRcdGFjdGlvbjogJ0FjY2Vzc2luZ19wZXJtaXNzaW9ucycsXG5cdFx0XHR9KTtcblx0XHR9XG5cblx0XHRyZXR1cm4gUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMucmVtb3ZlUm9sZShwZXJtaXNzaW9uLCByb2xlKTtcblx0fSxcbn0pO1xuIiwiLyogZXNsaW50IG5vLW11bHRpLXNwYWNlczogMCAqL1xuXG5NZXRlb3Iuc3RhcnR1cChmdW5jdGlvbigpIHtcblx0Ly8gTm90ZTpcblx0Ly8gMS5pZiB3ZSBuZWVkIHRvIGNyZWF0ZSBhIHJvbGUgdGhhdCBjYW4gb25seSBlZGl0IGNoYW5uZWwgbWVzc2FnZSwgYnV0IG5vdCBlZGl0IGdyb3VwIG1lc3NhZ2Vcblx0Ly8gdGhlbiB3ZSBjYW4gZGVmaW5lIGVkaXQtPHR5cGU+LW1lc3NhZ2UgaW5zdGVhZCBvZiBlZGl0LW1lc3NhZ2Vcblx0Ly8gMi4gYWRtaW4sIG1vZGVyYXRvciwgYW5kIHVzZXIgcm9sZXMgc2hvdWxkIG5vdCBiZSBkZWxldGVkIGFzIHRoZXkgYXJlIHJlZmVyZW5lZCBpbiB0aGUgY29kZS5cblx0Y29uc3QgcGVybWlzc2lvbnMgPSBbXG5cdFx0eyBfaWQ6ICdhY2Nlc3MtcGVybWlzc2lvbnMnLCAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdhZGQtb2F1dGgtc2VydmljZScsICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdhZGQtdXNlci10by1qb2luZWQtcm9vbScsICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRcdHsgX2lkOiAnYWRkLXVzZXItdG8tYW55LWMtcm9vbScsICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnYWRkLXVzZXItdG8tYW55LXAtcm9vbScsICAgICAgICByb2xlcyA6IFtdIH0sXG5cdFx0eyBfaWQ6ICdhcmNoaXZlLXJvb20nLCAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lciddIH0sXG5cdFx0eyBfaWQ6ICdhc3NpZ24tYWRtaW4tcm9sZScsICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdiYW4tdXNlcicsICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRcdHsgX2lkOiAnYnVsay1jcmVhdGUtYycsICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnYnVsay1yZWdpc3Rlci11c2VyJywgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnY3JlYXRlLWMnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnY3JlYXRlLWQnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnY3JlYXRlLXAnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAndXNlcicsICdib3QnXSB9LFxuXHRcdHsgX2lkOiAnY3JlYXRlLXVzZXInLCAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnY2xlYW4tY2hhbm5lbC1oaXN0b3J5JywgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnZGVsZXRlLWMnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAnZGVsZXRlLWQnLCAgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnZGVsZXRlLW1lc3NhZ2UnLCAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInLCAnbW9kZXJhdG9yJ10gfSxcblx0XHR7IF9pZDogJ2RlbGV0ZS1wJywgICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJ10gfSxcblx0XHR7IF9pZDogJ2RlbGV0ZS11c2VyJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ2VkaXQtbWVzc2FnZScsICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LW90aGVyLXVzZXItYWN0aXZlLXN0YXR1cycsIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LW90aGVyLXVzZXItaW5mbycsICAgICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LW90aGVyLXVzZXItcGFzc3dvcmQnLCAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LXByaXZpbGVnZWQtc2V0dGluZycsICAgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICdlZGl0LXJvb20nLCAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRcdHsgX2lkOiAnZWRpdC1yb29tLXJldGVudGlvbi1wb2xpY3knLCAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnZm9yY2UtZGVsZXRlLW1lc3NhZ2UnLCAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAnam9pbi13aXRob3V0LWpvaW4tY29kZScsICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnYm90J10gfSxcblx0XHR7IF9pZDogJ2xlYXZlLWMnLCAgICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYm90JywgJ2Fub255bW91cyddIH0sXG5cdFx0eyBfaWQ6ICdsZWF2ZS1wJywgICAgICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2JvdCcsICdhbm9ueW1vdXMnXSB9LFxuXHRcdHsgX2lkOiAnbWFuYWdlLWFzc2V0cycsICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnbWFuYWdlLWVtb2ppJywgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnbWFuYWdlLWludGVncmF0aW9ucycsICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnbWFuYWdlLW93bi1pbnRlZ3JhdGlvbnMnLCAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnYm90J10gfSxcblx0XHR7IF9pZDogJ21hbmFnZS1vYXV0aC1hcHBzJywgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ21lbnRpb24tYWxsJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvcicsICd1c2VyJ10gfSxcblx0XHR7IF9pZDogJ21lbnRpb24taGVyZScsICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvcicsICd1c2VyJ10gfSxcblx0XHR7IF9pZDogJ211dGUtdXNlcicsICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdyZW1vdmUtdXNlcicsICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRcdHsgX2lkOiAncnVuLWltcG9ydCcsICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAncnVuLW1pZ3JhdGlvbicsICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nXSB9LFxuXHRcdHsgX2lkOiAnc2V0LW1vZGVyYXRvcicsICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAnc2V0LW93bmVyJywgICAgICAgICAgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnb3duZXInXSB9LFxuXHRcdHsgX2lkOiAnc2VuZC1tYW55LW1lc3NhZ2VzJywgICAgICAgICAgICByb2xlcyA6IFsnYWRtaW4nLCAnYm90J10gfSxcblx0XHR7IF9pZDogJ3NldC1sZWFkZXInLCAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJ10gfSxcblx0XHR7IF9pZDogJ3VuYXJjaGl2ZS1yb29tJywgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctYy1yb29tJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYm90JywgJ2Fub255bW91cyddIH0sXG5cdFx0eyBfaWQ6ICd1c2VyLWdlbmVyYXRlLWFjY2Vzcy10b2tlbicsICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICd2aWV3LWQtcm9vbScsICAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2JvdCddIH0sXG5cdFx0eyBfaWQ6ICd2aWV3LWZ1bGwtb3RoZXItdXNlci1pbmZvJywgICAgIHJvbGVzIDogWydhZG1pbiddIH0sXG5cdFx0eyBfaWQ6ICd2aWV3LWhpc3RvcnknLCAgICAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICd1c2VyJywgJ2Fub255bW91cyddIH0sXG5cdFx0eyBfaWQ6ICd2aWV3LWpvaW5lZC1yb29tJywgICAgICAgICAgICAgIHJvbGVzIDogWydndWVzdCcsICdib3QnLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctam9pbi1jb2RlJywgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctbG9ncycsICAgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctb3RoZXItdXNlci1jaGFubmVscycsICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctcC1yb29tJywgICAgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctcHJpdmlsZWdlZC1zZXR0aW5nJywgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctcm9vbS1hZG1pbmlzdHJhdGlvbicsICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctc3RhdGlzdGljcycsICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctdXNlci1hZG1pbmlzdHJhdGlvbicsICAgICAgcm9sZXMgOiBbJ2FkbWluJ10gfSxcblx0XHR7IF9pZDogJ3ByZXZpZXctYy1yb29tJywgICAgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ3VzZXInLCAnYW5vbnltb3VzJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctb3V0c2lkZS1yb29tJywgICAgICAgICAgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvcicsICd1c2VyJ10gfSxcblx0XHR7IF9pZDogJ3ZpZXctYnJvYWRjYXN0LW1lbWJlci1saXN0JywgICAgcm9sZXMgOiBbJ2FkbWluJywgJ293bmVyJywgJ21vZGVyYXRvciddIH0sXG5cdFx0eyBfaWQ6ICdjYWxsLW1hbmFnZW1lbnQnLCAgICAgICAgICAgICAgIHJvbGVzIDogWydhZG1pbicsICdvd25lcicsICdtb2RlcmF0b3InXSB9LFxuXHRdO1xuXG5cdGZvciAoY29uc3QgcGVybWlzc2lvbiBvZiBwZXJtaXNzaW9ucykge1xuXHRcdGlmICghUm9ja2V0Q2hhdC5tb2RlbHMuUGVybWlzc2lvbnMuZmluZE9uZUJ5SWQocGVybWlzc2lvbi5faWQpKSB7XG5cdFx0XHRSb2NrZXRDaGF0Lm1vZGVscy5QZXJtaXNzaW9ucy51cHNlcnQocGVybWlzc2lvbi5faWQsIHsgJHNldDogcGVybWlzc2lvbiB9KTtcblx0XHR9XG5cdH1cblxuXHRjb25zdCBkZWZhdWx0Um9sZXMgPSBbXG5cdFx0eyBuYW1lOiAnYWRtaW4nLCAgICAgc2NvcGU6ICdVc2VycycsICAgICAgICAgZGVzY3JpcHRpb246ICdBZG1pbicgfSxcblx0XHR7IG5hbWU6ICdtb2RlcmF0b3InLCBzY29wZTogJ1N1YnNjcmlwdGlvbnMnLCBkZXNjcmlwdGlvbjogJ01vZGVyYXRvcicgfSxcblx0XHR7IG5hbWU6ICdsZWFkZXInLCAgICBzY29wZTogJ1N1YnNjcmlwdGlvbnMnLCBkZXNjcmlwdGlvbjogJ0xlYWRlcicgfSxcblx0XHR7IG5hbWU6ICdvd25lcicsICAgICBzY29wZTogJ1N1YnNjcmlwdGlvbnMnLCBkZXNjcmlwdGlvbjogJ093bmVyJyB9LFxuXHRcdHsgbmFtZTogJ3VzZXInLCAgICAgIHNjb3BlOiAnVXNlcnMnLCAgICAgICAgIGRlc2NyaXB0aW9uOiAnJyB9LFxuXHRcdHsgbmFtZTogJ2JvdCcsICAgICAgIHNjb3BlOiAnVXNlcnMnLCAgICAgICAgIGRlc2NyaXB0aW9uOiAnJyB9LFxuXHRcdHsgbmFtZTogJ2d1ZXN0JywgICAgIHNjb3BlOiAnVXNlcnMnLCAgICAgICAgIGRlc2NyaXB0aW9uOiAnJyB9LFxuXHRcdHsgbmFtZTogJ2Fub255bW91cycsIHNjb3BlOiAnVXNlcnMnLCAgICAgICAgIGRlc2NyaXB0aW9uOiAnJyB9LFxuXHRdO1xuXG5cdGZvciAoY29uc3Qgcm9sZSBvZiBkZWZhdWx0Um9sZXMpIHtcblx0XHRSb2NrZXRDaGF0Lm1vZGVscy5Sb2xlcy51cHNlcnQoeyBfaWQ6IHJvbGUubmFtZSB9LCB7ICRzZXRPbkluc2VydDogeyBzY29wZTogcm9sZS5zY29wZSwgZGVzY3JpcHRpb246IHJvbGUuZGVzY3JpcHRpb24gfHwgJycsIHByb3RlY3RlZDogdHJ1ZSB9IH0pO1xuXHR9XG59KTtcbiJdfQ==
