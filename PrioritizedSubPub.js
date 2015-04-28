/**
 * PrioritizedPubSub
 *
 * @class PrioritizedPubSub
 *
 * @param   {String}                                subNameSpace    Name of new PrioritizedPubSub
 *
 * @returns {PSPProxy}                              `PSPProxy` is returned when `new` is used. It's has the same
 *                                                  behavior and signatures as PrioritizedPubSub but can only be used
 *                                                  if saved to a variable.
 */

/**
 *
 * @function PrioritizedPubSub
 *
 * @param {eventName}                           eventName
 *
 * @param   {pspOptions|subscriptionCallback}   [options]
 *
 * @return {PrioritizedPubSub}
 */

/**
 * Object passed to PrioritizedPubSub.
 *
 * @typedef {Object} pspOptions
 *
 * @property {subscriptionCallback}     sub       Required for subscribing to an event. See {@link subscriptionCallback}
 *                                                This option has the highest precedence.
 *                                                Can be combined with {@link subscriptionOptions}
 *
 * @property {subscriptionId}           unSub     Required for un-subscribing an event. If set, pspOptions.pub will be ignored
 *
 * @property {pubArgs}                  pub       Required for publishing to subscribers. All other options have higher precedence.
 */

/**
 * Object of arguments passed to PrioritizedPubSub.pub or PrioritizedPubSub
 * for {@link subscriptionCallback} to use.
 *
 * @typedef {Object} pubArgs
 */

/**
 * Event name used for subscribing/publishing to.
 *
 * @typedef {String} eventName
 */

/**
 * User-defined id for identifying and removing from priority list. Randomly generated if not defined when
 * subscribing.
 *
 * @typedef {String} subscriptionId
 */

/**
 * All the options can be passed to PrioritizedPubSub and PrioritizedPubSub.sub
 *
 * @typedef {Object} subscriptionOptions
 *
 * @property {Integer}                  [unSubCount]    Will subscribe to however many times set. When it reaches the
 *                                                      limit, it will un-subscribe itself. Decrementing can be bypassed.
 *                                                      See {@link pspObj}
 *
 * @property {Boolean}                  [rePub]        If set to true and subscribing to an event and the event had
*                                                      published in the past, then re-publish for this subscriber
 *                                                     using the previously publish data.
 *
 * @property {String}                   [subId]        {@link subscriptionId}
 *
 * @property {Integer}                  [priority]     0-11 where 0 is the lowest (last subscriber to get published data) priority
 *                                                     and 11 is the highest (first subscriber to get published data).
 *                                                     Every subscription will append to the list of priorities,
 *                                                     except for subscriptionOptions.timing="def" since there
 *                                                     can be only one default.
 *                                                     If subscribing and options.priority is not set, 6 is used.
 *                                                     This is ignored when subscriptionOptions.timing="def".
 *
 * @property {String}                   [timing]        See {@link subscriptionTimings}
 *
 * @property {*}                        [context]       Specify the context of `this`
 */

/**
 * When the priority should happen. If not set during subscribing, pre will be used.
 *
 * pre : Before default timing. There can be many of these timings.
 *
 * def : Default publish event. There is only one default timing.
 *
 * post :After default event. There can be many of these timings.
 *
 * @typedef {String} subscriptionTimings
 */

/**
 * Object passed to {@link subscriptionCallback} as a second parameter.
 *
 * @typedef {Object}  pspObj
 *
 * @property {Object} CONST
 *
 * @property {String} CONST.SKIP_DEC        Prevent the subscriptionOptions.unSubCount from decrementing by
 *                                          returning from {@link subscriptionCallback}
 *
 * @property {String} CONST.UNSUB           Used to un-subscribe by returning from (@link subscriptionCallback}.
 */

/**
 * Callback used for subscriptions.
 *
 * @callback subscriptionCallback
 *
 * @param {pubArgs} args
 *
 * @param {pspObj}  pspObj
 */
(function (root, factory) {
    'use strict';
    /* global define, module */
    var ns = 'PrioritizedSubPub';
    //boilerplate node and browser defining.
    if (typeof define === 'function' && define.amd) {
        define(ns, factory(root));
    } else if (
           typeof module === 'object'
        && typeof module.exports === 'object'
    ) {
        module.exports = factory(root);
    } else {
        root[ns] = factory(root);
    }

} (this, function () {
    'use strict';

    var PRIORITY_TYPE = ['pre', 'def', 'post']
      , PRIORITY_LIMIT = 11
      , UNSUB = 'unsub'
      , SKIP_DEC = 'skip_dec'
      , util
        //host global usage for PSP
      , _globalPSP
      ;

    /* jshint ignore: start */
    if ( (_globalPSP = typeof _)
      && _globalPSP === 'function'
    ) {
        util = _;
    }
    /* jshint ignore: end */

    if (typeof util === 'undefined') {
        //Mini lodash/underscore
        util = {
            isUndefined: function (value) { return typeof value === 'undefined'; }
          , isObject: function (value) { return value && typeof value === 'object'; }
          , isString: function (value) { return typeof value === 'string'; }
          , isFunction: function (value) { return typeof value === 'function'; }
          , toArray: function (args) { return Array.prototype.slice.call(args);}
          , indexOf: function (arr, val) {
                if (arr.indexOf) {
                    return arr.indexOf(val);
                }

                var len
                  , i;

                if (arr && (len = arr.length)){
                    i = 0;
                    //possible todo: faster and more efficient loop
                    for (; i < len; i++) {
                        if (arr[i] === val) {
                            return i;
                        }
                    }
                }

                return -1;
            }
        };
    }

    //I want to make sure this is a number
    if (!util.isFunction(util.isRealNumber)) {
        util.isRealNumber = function (value) { return typeof value === 'number' && !isNaN(value); };
    }

    /**
     * @private
     * @desc private console output. Currently logs by default.
     * @todo: think of good way to toggle logging.
     */
     function _debugLog() {
        /* global console */
        var args,
            log;
        if (PrioritizedPubSub.isLogged && console && (log = console.log)) {
            args = util.toArray(arguments);
            args.unshift('PSP: ');

            _debugLog.log(args);
        }
    }

    if(window && window.console) { //IE <= 8 fix
        _debugLog.log = function (args) {
            try{
                window.console.log.apply(window.console, args);
            } catch(e) {
                window.console.log(args);
            }
        };
    } else {
        _debugLog.log = function (args) {
            try{
                console.log.apply(console, args);
            } catch(e) {
                console.log(args);
            }
        };
    }

    /**
     * Makes sure value is within range.
     * @private
     * @param validate
     * @param max
     * @param [min=0]
     * @returns {boolean}
     */
    function _isValidRange(validate, max, min) {
        min = min || 0;

        return util.isRealNumber(validate) && validate >= min && validate <= max;
    }

    /**
     * Where all subscribers and priorities are kept.
     * @private
     * @class Subscriptions
     * @param eventName
     * @param pspName
     * @constructor
     */
    function Subscriptions(eventName, pspName){
        var i = 0,
            timings = {},
            type;

        for(type = PRIORITY_TYPE[i]; i < PRIORITY_TYPE.length; type = PRIORITY_TYPE[++i]){

            //there can be only one default and it's set to null until def is set to a function.
            if (type === 'def') {
                timings[type] = null;
                continue;
            }
            //TODO: use a wrapped array for unrestricted priority numbers
            timings[type] = [];
        }
        /*
            keeps all the subscriber data, i.e. options.sub and other future config
            Example data structure:
            this.subIds = {
               "sub id 1" : {
                    "subId" : "sub id 1",
                    "timing" : "pre",
                    "priority": 0,
                    "sub" : function () {[code]},
                    ...
               },
               "sub id 2" : {
                    "subId" : "sub id 2",
                    "timing" : "post",
                    "priority": 11,
                    "sub" : function () {[code]},
                    ...
               },
               "pr-120334234" : {
                    "subId" : "pr-120334234",
                    "timing" : "def",
                    "priority": 2,
                    "sub" : function () {[code]},
                    ...
               },
               "sub id 3" : {
                    "subId" : "sub id 3",
                    "timing" : "pre",
                    "priority": 5,
                    "sub" : function () {[code]},
                    ...
               },
               "sub id 4" : {
                    "subId" : "sub id 4",
                    "timing" : "pre",
                    "priority": 5,
                    "sub" : function () {[code]},
                    ...
               },
               ...
            }
            Possible todo is to remove extra data that isn't used from the config.
         */
        this.subIds = {};
        //used for subscribers to know if data has been published and needs to be re-published.
        this.hasPub = false;
        //if publication happens, oldArgs is kept for future subscribers that want to use past published data.
        this.oldArgs = {};
        /* 
            pre and post will be an array with length PRIORITY_LIMIT of arrays of unlimited size
            containing subIds.
            Example data structure:
            this.timings = {
                "pre" : [
                    [ // index = 0
                        "sub id 1"
                    ],
                    undefined,
                    ...
                    [ // index = 5
                        "sub id 4",
                        "sub id 5"
                    ]
                ],
                "def" : "pr-120334234",
                "post" : [
                    undefined, // index = 0
                    ...
                    [ // index = 11
                        "sub id 3"
                    ]
                ]
            }
         */
        this.timings = timings;
        //for console.log
        this.eventName = pspName + eventName + '-> ';
    }

    Subscriptions.prototype = {
        'constructor': Subscriptions,
        /**
         * Updates or adds subscriber id with new definition.
         * @private
         * @param {Object} config
         */
        'replaceSubId' : function (config) {
            var timing = this.timings[config.timing],
                priority;

            this.removeSubId(config.subId, false);

            this.subIds[config.subId] = config;

            if (config.timing === 'def') {

                this.removeSubId(timing);
                this.timings[config.timing] = config.subId;

            } else {
                
                priority = timing[config.priority];

                //list of priorities is only set to an array until it needs it.
                if (util.isUndefined(priority)) {
                    priority = timing[config.priority] = [];
                }
                //all new subId are added to the end of the priority list
                priority.push(config.subId);
            }
        },
        /**
         * Find and remove subId from list of priorities. 
         * If untrack is true or undefined, then delete from list of subIds  
         * @private
         * @param {String} subId
         * @param {undefined|Boolean} [untrack=undefined]
         * @returns {Boolean}
         */
        'removeSubId': function (subId, untrack) {
            var subIdData,
                indexOf,
                priority,
                timing;

            if (
                   util.isString(subId)
                && (subIdData = this.subIds[subId])
                && util.isObject(subIdData)
            ) {

                timing = this.timings[subIdData.timing];

                if (util.isString(timing)) {

                    _debugLog(this.eventName + 'removing default timing');
                    this.timings[subIdData.timing] = null;

                } else if (
                       timing
                    && timing.length
                    && (priority = timing[subIdData.priority])
                    && priority.length
                    && (indexOf = util.indexOf(priority, subId)) >= 0
                ){
                    priority.splice(indexOf, 1);
                }

                if (util.isUndefined(untrack) || untrack === true) {
                    delete this.subIds[subId];
                    _debugLog(this.eventName + ' is completely erasing ' + subId);
                }

                return true;
            }

            _debugLog(this.eventName + ' had nothing to remove for ' + subId);
            return false;
        },
        'publishToSubscriber': function (subId, data) {
            var subIdData,
                isCount,
                result;

            data = data || this.oldArgs;
            
            if (
                   util.isString(subId)
                && (subIdData  = this.subIds[subId])
                && util.isFunction(subIdData.sub)
            ) {
                isCount = util.isRealNumber(subIdData.unPubCount);

                if (
                       !isCount
                    || (
                           isCount
                        && subIdData.unPubCount > 0
                    )
                ) {
                    try {
                        result = subIdData.sub.apply(
                            subIdData.context
                            , [
                                data
                                , {
                                    'CONST': {
                                        'SKIP_DEC': SKIP_DEC
                                        , 'UNSUB': UNSUB
                                    }
                                }
                            ]
                        );
                    } catch(e) {
                        _debugLog(e);
                    }
                }

                if (
                    result === UNSUB
                    || (
                           result !== SKIP_DEC
                        && isCount
                        && --subIdData.unPubCount <= 0
                    )
                ) {
                    _debugLog(this.eventName + 'Subscriber subId ' + subId + ' removed itself. Result:', result);
                    this.removeSubId(subId);
                    return false;
                }

                return true;
            }
            return null;
        },
        'publish': function (args) {
            var tidx = 0,
                timing,
                pidx,
                priorities,
                priority,
                sidx,
                subId,
                result;

            //Clone?
            this.oldArgs = args;
            this.hasPub = true;

            for (timing = PRIORITY_TYPE[tidx]; tidx < PRIORITY_TYPE.length; timing = PRIORITY_TYPE[++tidx]) {
                priorities = this.timings[timing];

                if (timing === 'def' && util.isString(priorities)) {

                    //Default should be the only one that matches this
                    _debugLog(this.eventName + 'Publishing to default');
                    this.publishToSubscriber(priorities, args);

                } else if (priorities && priorities.length) {

                    for (pidx = priorities.length - 1, priority = priorities[pidx]; pidx >= 0; priority = priorities[--pidx]) {

                        if (priority && priority.length) {
                            sidx = 0;
                            while((subId = priority[sidx])) {

                                _debugLog(
                                    this.eventName + 'Publishing subId ' + subId + ' TIMING ' + timing
                                  + ' PRIORITY ' + pidx
                                );
                                
                                switch ((result = this.publishToSubscriber(subId, args))) {
                                    case false:
                                    //if false returned, then the subscription was removed
                                    // and the current index is still relevant.
                                    break;
                                    default:
                                        sidx++;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * @private
     * @class PSP
     * @constructor
     * @param {String} PSPName name to use to identify what PSP is firing for console log.
     */
    function PSP(PSPName) {
        this.pspName = '';
        /*
            keeps track of all event names that have subscriptions.
            Example data structure
            this.subList = {
                "myGlobalEvent" : Subscriptions,
                "myOtherEvent": Subscriptions
            };
         */
        this.subList = {};

        if (util.isString(PSPName)) {
            this.pspName += PSPName;
        } else {
            this.pspName += 'PSP' + Math.ceil(Math.random() * 10000000);
        }

        this.pspName += '::';
    }

    PSP.prototype = {
        'constructor' : PSP,

        /**
         * @param {String} eventName
         * @param {Object} [args]
         */
        'pub': function (eventName, args) {
            args = util.isObject(args) ? args : {};

            var event = this.getSub(eventName);

            if (event) {
                event.publish(args);
            }
        },

        /**
         *
         * @param {String} eventName
         * @param {Object|Function} config
         * @returns {Boolean|null}
         */
        'sub': function (eventName, config) {
            var event,
                configType = typeof config,
                isFunction = (configType === 'function'),
                temp;

            if (
                   config
                && (configType === 'object' || isFunction)
            ) {

                if (isFunction) {
                    config = {
                        'sub' : config
                    };
                }

                event = this.getSub(eventName);

                //create random id if subId is defined for config tracking.
                if (!util.isString(config.subId)) {
                    config.subId = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isValidRange(temp, PRIORITY_LIMIT)) {
                    temp = Math.round(PRIORITY_LIMIT / 2);
                }

                config.priority = temp;

                temp = util.indexOf(PRIORITY_TYPE, config.timing);

                if(temp < 0) {
                    temp = PRIORITY_TYPE[0]; //default config timing is pre
                } else {
                    temp = PRIORITY_TYPE[temp];
                }

                config.timing = temp;

                event.replaceSubId(config);

                if(config.rePub && event.hasPub) {
                    _debugLog(this.pspName + eventName + ' event was published. Re-publish subId ' + config.subId);
                    event.publishToSubscriber(config.subId);
                }

                return true;
            }

            _debugLog(this.pspName + eventName + ' was not given a legitimate config');

            return null;
        },

        /**
         *
         * @param {String} eventName
         * @param {String} subId
         */
        'unSub': function (eventName, subId) {
            var event = this.getSub(eventName);

            if (event) {
                _debugLog(this.pspName + 'un-subscribing subId ' + subId + ' from ' + eventName);
                event.removeSubId(subId);
            }
        },

        /**
         * Return or create new Subscription.
         * @param  {String} subName
         * @return {Subscriptions}
         * @private
         */
        'getSub': function (subName) {
            var event = this.subList[subName];

            if (!event) {
                _debugLog(this.pspName + 'Creating new subscription: ' + subName);
                this.subList[subName] = event = new Subscriptions(subName, this.pspName);
            }

            return event;
        },

        /**
         * Determines what type of action to do based on what the options are.
         * @param  {String} eventName
         * @param  {Object|Function} options
         */
        'exec': function(eventName, options) {
            var optionsType,
                isObj;

            options = options || {};

            if (options && util.isString(eventName)) {
                isObj = (optionsType = typeof options) === 'object';
                //subscribe using default config
                if (
                    optionsType === 'function'
                    || (
                           isObj
                        && util.isFunction(options.sub)
                    )
                ) {
                    if(this.sub(eventName, options) === null) {
                        _debugLog(this.pspName + 'Subscription definition was invalid and was not registered');
                    }
                } else if (isObj) {
                    if (util.isString(options.unSub)) {
                        this.unSub(eventName, options.unSub);
                    } else { //publish to eventName
                        options = options.pub || options;
                        this.pub(eventName, options);
                    }
                }
            }
        }
    };

    /**
     * @param   {String} pspNamespace
     * @returns {publicPSP}
     */
    function PSPProxy(pspNamespace) {
        var _PSP = new PSP(pspNamespace);

        function publicPSP() {
            _PSP.exec.apply(
                _PSP
              , util.toArray(arguments)
            );
        }

        publicPSP.pub = function () { _PSP.pub.apply(_PSP, util.toArray(arguments)); return this; };

        publicPSP.sub = function () { _PSP.sub.apply(_PSP, util.toArray(arguments)); return this; };

        publicPSP.unSub = function () { _PSP.unSub.apply(_PSP, util.toArray(arguments)); return this; };

        publicPSP.getEventPubCallback = function (eventName) {

            return function (args) {
                publicPSP.pub(eventName, args);
            };
        };

        publicPSP.getEventProxy = function (eventName) {

            return {
                'pub': function (args) {
                    publicPSP.pub(eventName, args);
                    return this;
                },
                'sub': function (options) {
                    publicPSP.sub(eventName, options);
                    return this;
                },
                'unSub': function (subId) {
                    publicPSP.unSub(eventName, subId);
                    return this;
                }
            };
        };

        return publicPSP;
    }

    _globalPSP = new PSPProxy('GLOBAL');

    function PrioritizedPubSub(subNameSpace) {
        /* global window */
        if (util.isUndefined(this) || this === window) {

            _globalPSP.apply(
                _globalPSP,
                util.toArray(arguments)
            );

            return PrioritizedPubSub;

        } else if (util.isString(subNameSpace)) {
            //return new proxy
            return new PSPProxy(subNameSpace);
        }
    }

    /**
     * @static
     * @memberOf PrioritizedPubSub
     * @function
     * @param   {eventName}                                 eventName
     * @param   {subscriptionOptions|subscriptionCallback}  options
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.sub = _globalPSP.sub;

    /**
     * @static
     * @function
     * @memberOf PrioritizedPubSub
     * @param   {eventName} eventName
     * @param   {Object}    [options]
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.pub = _globalPSP.pub;

    /**
     * @static
     * @function
     * @memberOf PrioritizedPubSub
     * @param {eventName}       eventName
     * @param {subscriptionId}  subId
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.unSub = _globalPSP.unSub;

    /**
     * Returns a function for use in publishing to an event
     * @example
     *
     *  var pspCb = PrioritizedPubSub.getEventPubCallback('myEvent');
     *
     *  pspCb({arg1:1, arg2: 2});
     *
     *  //same as but you can keep re-using the call back instead of do this over and over.
     *
     *  PrioritizedPubSub('myEvent', {pub:{arg1:1, arg2: 2}});
     *
     * @static
     * @function
     * @memberOf PrioritizedPubSub
     * @param {eventName}   eventName
     * @returns {Function}
     */
    PrioritizedPubSub.getEventPubCallback = _globalPSP.getEventPubCallback;

    /**
     * Get an object with proxied functions for re-use.
     * @example
     *
     *  var pspEventProxy = PrioritizedPubSub.getEventProxy('myEvent');
     *
     *  // Same as PrioritizedPubSub('myEvent', {pub:{arg1:1, arg2: 2}});
     *
     *  pspEventProxy.pub({arg1:1, arg2: 2});
     *
     *  // Same as PrioritizedPubSub('myEvent', function () { //do stuff });
     *
     *  pspEventProxy.sub(function () { //do stuff });
     *
     *  // Same as PrioritizedPubSub('myEvent', {unSub:'something'}});
     *
     *  pspEventProxy.unSub('something');
     *
     * @static
     * @function
     * @memberOf PrioritizedPubSub
     * @param {eventName} eventName
     * @returns {
     *      {
     *          pub: Function,
     *          sub: Function,
     *          unSub: Function
     *      }
     *  }
     */
    PrioritizedPubSub.getEventProxy = _globalPSP.getEventProxy;

    PrioritizedPubSub.isLogged = true;

    return PrioritizedPubSub;
}));

