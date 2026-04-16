var NIJJARA_RUNTIME_PATCH_STATE = this.NIJJARA_RUNTIME_PATCH_STATE || (this.NIJJARA_RUNTIME_PATCH_STATE = {
  installed: false,
  wrapped: {}
});

(function (global) {
  if (!global || !global.NIJJARA_RUNTIME_PATCH_STATE) return;
  if (global.NIJJARA_RUNTIME_PATCH_STATE.installed) return;

  function patchLog_(scope, message, payload) {
    try {
      var serialized = payload ? JSON.stringify(payload) : '';
      Logger.log('[NIJJARA][PATCH][' + scope + '] ' + message + (serialized ? ' | ' + serialized : ''));
    } catch (error) {
      Logger.log('[NIJJARA][PATCH][' + scope + '] ' + message + ' | [payload_unserializable]');
    }
  }

  if (typeof global.nijjaraDebugLog_ !== 'function') {
    global.nijjaraDebugLog_ = function (scope, message, payload) {
      patchLog_(scope, message, payload);
    };
  }

  if (typeof global.nijjaraGetDataRevision_ !== 'function') {
    global.nijjaraGetDataRevision_ = function () {
      try {
        return String(PropertiesService.getScriptProperties().getProperty('NIJJARA_DATA_REVISION') || '0');
      } catch (error) {
        patchLog_('REVISION_READ_ERROR', 'Failed to read data revision.', {
          message: error && error.message ? error.message : String(error)
        });
        return '0';
      }
    };
  }

  if (typeof global.nijjaraTouchDataRevision_ !== 'function') {
    global.nijjaraTouchDataRevision_ = function (moduleKey, actorUserId, reason) {
      var revision = String(new Date().getTime());
      try {
        PropertiesService.getScriptProperties().setProperty('NIJJARA_DATA_REVISION', revision);
        patchLog_('REVISION_TOUCHED', 'Data revision updated.', {
          revision: revision,
          moduleKey: String(moduleKey || ''),
          actorUserId: String(actorUserId || ''),
          reason: String(reason || '')
        });
        return revision;
      } catch (error) {
        patchLog_('REVISION_WRITE_ERROR', 'Failed to write data revision.', {
          moduleKey: String(moduleKey || ''),
          actorUserId: String(actorUserId || ''),
          reason: String(reason || ''),
          message: error && error.message ? error.message : String(error)
        });
        return global.nijjaraGetDataRevision_();
      }
    };
  }

  function wrapFunction_(name, wrapperFactory) {
    if (global.NIJJARA_RUNTIME_PATCH_STATE.wrapped[name]) return;
    var original = global[name];
    if (typeof original !== 'function') {
      patchLog_('PATCH_SKIP', 'Function was not found for wrapping.', { name: name });
      return;
    }
    global[name] = wrapperFactory(original);
    global.NIJJARA_RUNTIME_PATCH_STATE.wrapped[name] = true;
    patchLog_('PATCH_APPLIED', 'Wrapped function successfully.', { name: name });
  }

  wrapFunction_('nijjaraModuleDatasetCacheKey_', function () {
    return function (moduleKey, session) {
      var userKey = String(session && session.userId || 'anon');
      var revision = global.nijjaraGetDataRevision_();
      return 'moduledata:v12:' + revision + ':' + userKey + ':' + String(moduleKey || '');
    };
  });

  wrapFunction_('nijjaraClearModuleDatasetCache_', function (original) {
    return function (moduleKey, userId) {
      var moduleKeyText = String(moduleKey || '');
      var userKey = String(userId || '').trim();
      try {
        original.call(this, moduleKeyText);
      } catch (error) {
        patchLog_('MODULE_CACHE_CLEAR_ORIGINAL_ERROR', 'Original cache clear failed.', {
          moduleKey: moduleKeyText,
          userId: userKey,
          message: error && error.message ? error.message : String(error)
        });
      }
      try {
        var cache = CacheService.getScriptCache();
        if (userKey) {
          cache.remove('moduledata:v11:' + userKey + ':' + moduleKeyText);
          cache.remove('moduledata:v12:' + global.nijjaraGetDataRevision_() + ':' + userKey + ':' + moduleKeyText);
        }
        cache.remove('moduledata:v11:anon:' + moduleKeyText);
      } catch (error2) {
        patchLog_('MODULE_CACHE_CLEAR_EXTRA_ERROR', 'Extra cache clear failed.', {
          moduleKey: moduleKeyText,
          userId: userKey,
          message: error2 && error2.message ? error2.message : String(error2)
        });
      }
      try {
        if (typeof NIJJARA_RUNTIME_CACHE !== 'undefined' && NIJJARA_RUNTIME_CACHE && NIJJARA_RUNTIME_CACHE.moduleRows) {
          NIJJARA_RUNTIME_CACHE.moduleRows = {};
        }
      } catch (error3) {
        patchLog_('MODULE_RUNTIME_CACHE_RESET_ERROR', 'Failed to reset runtime module rows cache.', {
          moduleKey: moduleKeyText,
          userId: userKey,
          message: error3 && error3.message ? error3.message : String(error3)
        });
      }
      patchLog_('MODULE_CACHE_CLEAR', 'Module dataset cache clear finished.', {
        moduleKey: moduleKeyText,
        userId: userKey
      });
    };
  });

  function touchAfterMutationFactory_(moduleResolver, reasonResolver) {
    return function (original) {
      return function () {
        var args = Array.prototype.slice.call(arguments);
        var result = original.apply(this, args);
        try {
          var sessionToken = args[0] || '';
          var session = typeof global.nijjaraGetSession === 'function' ? global.nijjaraGetSession(sessionToken) : null;
          var moduleKey = moduleResolver ? moduleResolver(args, result, session) : '';
          var reason = reasonResolver ? reasonResolver(args, result, session) : 'mutation';
          global.nijjaraTouchDataRevision_(moduleKey, session && session.userId || '', reason);
        } catch (error) {
          patchLog_('REVISION_TOUCH_AFTER_MUTATION_ERROR', 'Failed to touch revision after mutation.', {
            message: error && error.message ? error.message : String(error)
          });
        }
        return result;
      };
    };
  }

  wrapFunction_('nijjaraSaveModuleRecord', touchAfterMutationFactory_(function (args) {
    var moduleKey = String(args[1] || '');
    var payload = args[2] || {};
    if (moduleKey !== 'recordPayment') return moduleKey;
    var category = String(payload.paymentCategory || payload.paymentType || '').trim().toUpperCase();
    if (category === 'PROJECT' || category === 'PROJECT_PAYMENT') return 'projectRevenueTracking';
    if (category === 'FACTORY_MACHINERY' || category === 'SHOWROOM') return 'internalRevenuePayments';
    return 'internalRevenuePayments';
  }, function (args) {
    return args[3] ? 'save_update' : 'save_create';
  }));

  wrapFunction_('nijjaraDeleteModuleRecord', touchAfterMutationFactory_(function (args) {
    return String(args[1] || '');
  }, function () {
    return 'delete';
  }));

  [
    'nijjaraCreateCustodyTransfer',
    'nijjaraCreateCustodyAccount',
    'nijjaraUpdateCustodyAccount',
    'nijjaraDeleteCustodyAccount',
    'nijjaraAdjustCustodyBalance',
    'nijjaraActOnCustodyTransfer',
    'nijjaraUpdateCustodyTransfer',
    'nijjaraDeleteCustodyTransfer'
  ].forEach(function (name) {
    wrapFunction_(name, touchAfterMutationFactory_(function () {
      return 'custody';
    }, function () {
      return name;
    }));
  });

  global.NIJJARA_RUNTIME_PATCH_STATE.installed = true;
  patchLog_('PATCH_READY', 'Realtime cache revision patch is active.', {
    wrappedFunctions: Object.keys(global.NIJJARA_RUNTIME_PATCH_STATE.wrapped || {})
  });
})(this);
