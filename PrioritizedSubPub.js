/**
 * Constructs a new PrioritizedPubSub
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
 * Makes an event call to the GLOBAL subNameSpace
 *
 * @function PrioritizedPubSub
 *
 * @param   {eventName}                                 eventName
 *
 * @param   {pspOptions|subscriptionCallback|function}  [options]
 *
 * @return {PrioritizedPubSub}
 */

/**
 * Has the same functionality and properties as {@link PrioritizedPubSub} minus the constructor
 * (cant use `var myPSPProxy = new PrioritizedPubSub('myPSP'); new myPSPProxy('anotherPSP');`).
 *
 * @typedef {function} PSPProxy
 *
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
 * Object or array of arguments passed to PrioritizedPubSub.pub or PrioritizedPubSub
 * for {@link subscriptionCallback} to use.
 *
 * @typedef {Object|Array} pubArgs
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
 * @property {subscriptionCallback}     pub             {@link subscriptionCallback}
 *
 * @property {Number}                   [unSubCount]    Will subscribe to however many times set. When it reaches the
 *                                                      limit, it will un-subscribe itself. Decrementing can be bypassed.
 *                                                      See {@link pspObj}
 *
 * @property {Boolean}                  [rePub=false]   If set to true and subscribing to an event and the event had
 *                                                      published in the past, then re-publish for this subscriber
 *                                                      using the previously publish data.
 *
 * @property {String}                   [subId]         {@link subscriptionId}
 *
 * @property {Number}                   [priority=0]    Can be any number type, excluding `NaN`.
 *                                                      Every subscription will append to the list of priorities,
 *                                                      except for subscriptionOptions.timing="def" since there
 *                                                      can be only one default.
 *                                                      If subscribing and options.priority is not set, 0 is used.
 *                                                      This option is ignored when subscriptionOptions.timing="def".
 *
 * @property {String}                   [timing='pre']  See {@link subscriptionTimings}
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
 * @property {Object} subscription          General subscription data.
 *
 * @property {String} subscription.id       Id for the subscription that is being executed.
 *
 * @property {Number} subscription.count   Number of times the subscription has executed.
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

}(this, function (root) {
    'use strict';

    var PRIORITY_TYPE = ['pre', 'def', 'post']
        , UNSUB = 'unsub'
        , SKIP_DEC = 'skip_dec'
        , util
    //host global usage for PSP
        , _globalPSP
        ;

    /* global console */
    if (typeof _ === 'undefined') {
        //Mini lodash/underscore
        util = {
            isUndefined: function (value) {
                return typeof value === 'undefined';
            },
            isObject: function (value) {
                return value && typeof value === 'object';
            },
            isString: function (value) {
                return typeof value === 'string';
            },
            isFunction: function (value) {
                return typeof value === 'function';
            },
            toArray: function (args) {
                return Array.prototype.slice.call(args);
            },
            indexOf: function (arr, val) {
                if (arr.indexOf) {
                    return arr.indexOf(val);
                }

                var len
                    , i;

                if (arr && (len = arr.length)) {
                    i = 0;
                    //possible todo: faster and more efficient loop
                    for (; i < len; i++) {
                        if (arr[i] === val) {
                            return i;
                        }
                    }
                }

                return -1;
            },
            noop: function() {}
        };
    } else {
        util = _;
    }


    //I want to make sure this is a number
    function _isRealNum(value) {
        return typeof value === 'number' && !isNaN(value);
    }

    function _bInsert(arr, val) {
        var leftIdx = 0,
            rightIdx = arr.length,
            midIdx,
            midVal;

        if (!rightIdx ||
            (
                (rightIdx = rightIdx - 1) && arr[rightIdx] < val
            )
        ) {
            arr.push(val);
            return rightIdx;
        }

        if (arr[leftIdx] > val) {
            arr.unshift(val);
            return leftIdx;
        }

        while (leftIdx <= rightIdx) {
            midIdx = Math.floor((leftIdx + rightIdx) / 2);
            midVal = arr[midIdx];

            if (midVal > val) {
                rightIdx = midIdx - 1;
                continue;
            }

            leftIdx = midIdx + 1;
            if (midVal === val) {
                return;
            }

        }
        arr.splice(leftIdx, 0, val);
        return leftIdx;
    }

    /**
     * @private
     * @desc private console output. Currently logs by default.
     */
    function _debugLog() {
        /* global console */
        var args;
        if (PrioritizedPubSub.isLogged
            && typeof console !== 'undefined'
            && util.isFunction(console.log)
        ) {
            args = util.toArray(arguments);
            args.unshift('PSP: ');
            console.log(args);
        }
    }

    /**
     * Where all subscribers and priorities are kept.
     * @private
     * @class Subscriptions
     * @param eventName
     * @param pspName
     */
    function Subscriptions(eventName, pspName) {
        var i = 0,
            timings = {},
            type;

        while(type = PRIORITY_TYPE[i++]){

            //there can be only one default and it's set to null until def is set to a function.
            if (type === 'def') {
                timings[type] = null;
                continue;
            }
            
            timings[type] = {
               'table' :{}, 
               'list' : []
            };
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
         */
        this.subIds = {};
        //used for subscribers to know if data has been published and needs to be re-published.
        this.hasPub = false;
        //if publication happens, oldArgs is kept for future subscribers that want to use past published data.
        this.oldArgs = {};
        /*
         Example data structure:
         this.timings = {
             "pre" :{
                 "list":[
                     -5
                     0,
                     5
                 ],
                 "table":{
                    -5:[
                        "more sub ids"
                    ],
                    0: [
                        "sub id 1"
                    ],
                    5:[
                         "sub id 4",
                         "sub id 5"
                    ]
                 }
             },
             "def" : "pr-120334234",
             "post" :{
                 "list":[
                    -99,
                    17,
                    11,
                    100
                 ],
                 "table":{
                     -99:[
                        "another sub id"
                     ],
                     17: [
                        "sub id 33"
                     ],
                     11:[
                         "sub id 12",
                         "sub id 99"
                     ],
                     100:[
                        "sub something"
                     ]
                 }
             }
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
         * @param {Object} config
         */
        'replaceSubId': function (config) {
            var timing = this.timings[config.timing],
                priority;

            this.removeSubId(config.subId, false);

            config.count = 0;

            this.subIds[config.subId] = config;

            if (config.timing === 'def') {

                this.removeSubId(timing);
                this.timings[config.timing] = config.subId;
                return;
            }

            priority = timing.table[config.priority];

            //list of priorities is only set to an array until it needs it.
            if (util.isUndefined(priority)) {
                priority = timing.table[config.priority] = [];
                _bInsert(timing.list, config.priority);
            }
            //all new subId are added to the end of the priority list
            priority.push(config.subId);
        },
        /**
         * Find and remove subId from list of priorities.
         * If untrack is true or undefined, then delete from list of subIds
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
                    && timing.list.length
                    && (priority = timing.table[subIdData.priority])
                    && priority.length
                    && (indexOf = util.indexOf(priority, subId)) >= 0
                ) {
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
                && (subIdData = this.subIds[subId])
                && util.isFunction(subIdData.sub)
            ) {
                isCount = _isRealNum(subIdData.unPubCount);

                if (
                    !isCount
                    || (
                        isCount
                        && subIdData.unPubCount > 0
                    )
                ) {
                    try {
                        result = subIdData.sub.apply(
                            subIdData.context,
                            [
                                data,
                                {
                                    'subscription': {
                                        'id'   : subId,
                                        'count': ++subIdData.count
                                    },
                                    'CONST'       : {
                                        'SKIP_DEC': SKIP_DEC,
                                        'UNSUB'   : UNSUB
                                    }
                                }
                            ]
                        );
                    } catch (e) {
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
                result,
                pList,
                pNum;

            //Clone?
            this.oldArgs = args;
            this.hasPub = true;

            while (timing = PRIORITY_TYPE[tidx++]) {
                priorities = this.timings[timing];

                if (timing === 'def') {
                    
                    if(util.isString(priorities)) {
                        //Default should be the only one that matches this
                        _debugLog(this.eventName + 'Publishing to default');
                        this.publishToSubscriber(priorities, args);
                    }

                } else if ((pList = priorities.list) && (pidx = pList.length)) {

                    while( (pNum = pList[--pidx]) === 0 ||  pNum) {
                        priority = priorities.table[pNum];

                        if (priority && priority.length) {
                            sidx = 0;

                            while ((subId = priority[sidx])) {

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
        'constructor': PSP,

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
         * @param {Object|Function|subscriptionOptions} config
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
                        'sub': config
                    };
                }

                event = this.getSub(eventName);

                //create random id if subId is defined for config tracking.
                if (!util.isString(config.subId)) {
                    config.subId = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isRealNum(temp)) {
                    temp = 0;
                }

                config.priority = temp;

                temp = util.indexOf(PRIORITY_TYPE, config.timing);

                if (temp < 0) {
                    temp = PRIORITY_TYPE[0]; //default config timing is pre
                } else {
                    temp = PRIORITY_TYPE[temp];
                }

                config.timing = temp;

                event.replaceSubId(config);

                if (config.rePub && event.hasPub) {
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
         * @private
         * @param  {String} subName
         * @return {Subscriptions}
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
         * @param {String}                              eventName
         * @param {Object|Function|subscriptionOptions} options
         */
        'exec': function (eventName, options) {
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
                    if (this.sub(eventName, options) === null) {
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

        publicPSP.pub = function () {
            _PSP.pub.apply(_PSP, util.toArray(arguments));
            return this;
        };

        publicPSP.sub = function () {
            _PSP.sub.apply(_PSP, util.toArray(arguments));
            return this;
        };

        publicPSP.unSub = function () {
            _PSP.unSub.apply(_PSP, util.toArray(arguments));
            return this;
        };

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
     * Subscribe a function. See params for further info.
     *
     * @function
     * @static
     * @memberof PrioritizedPubSub
     * @param   {eventName}                                 eventName
     * @param   {subscriptionOptions|subscriptionCallback}  options
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.sub = _globalPSP.sub;

    /**
     * Publish an event for all the subscribers to listen to.
     *
     * @function
     * @memberof PrioritizedPubSub
     * @param   {eventName} eventName
     * @param   {Object}    [options]
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.pub = _globalPSP.pub;

    /**
     * Removes a subscription in an event name
     *
     * @function
     * @static
     * @memberof PrioritizedPubSub
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
     * @function
     * @static
     * @memberof PrioritizedPubSub
     * @param {eventName}   eventName
     * @returns {Function}
     */
    PrioritizedPubSub.getEventPubCallback = _globalPSP.getEventPubCallback;

    /**
     * Get an object with proxy functions for re-use.
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
     * @function
     * @static
     * @memberof PrioritizedPubSub
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

