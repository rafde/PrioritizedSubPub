/**
 * Public interface for using PrioritizedSubPub.
 *
 * @module PrioritizedSubPub
 *
 * @method PrioritizedSubPub
 *
 * @param {String}          [eventName=]          Name to give to the event.
 *
 * @param {Object|Function} [options]             An object for options or function to subscribe. Certain options
 *                                                trigger certain actions, other non-related options will be discarded.
 *
 * @param {Object}          [options.pub]         For event publishing. If eventName is passed
 *                                                and options, options.unSub, or options.pub are undefined,
 *                                                then options.pub gets set to {} and the event publishes.
 *
 * @param {String}          [options.unSub]       Required for un-subscribing from priority list.
 *                                                The string refers to the subId to remove from list of priorities.
 *                                                Subscriptions can be un-subscribed by other means.
 *
 * @param {Function}        [options.sub]         Required for subscribing to an event.
 *                                                If this function returns true, it will bypass options.unSubCount
 *                                                decrement.
 *                                                If this function returns "unSub", it will un-subscribe itself.
 *
 * @param {int}             [options.unSubCount]  Optional. Will publish to however many times set. When it reaches the
 *                                                limit, it will un-subscribe itself. Decrementing can be bypassed if
 *                                                options.sub callback returns "skip_dec".
 *
 * @param {Boolean}         [options.rePub]       If set to true and subscribing to an event and the event had
 *                                                published in the past, then re-publish for this subscriber
 *                                                using the previously publish data from options.pub
 *
 * @param {String}          [options.subId]       Optional for subscribing. Use for identifying and removing
 *                                                from priority list. Randomly generated if not defined when
 *                                                subscribing (options.sub or options is a function).
 *
 * @param {int}             [options.priority]    0-11 where 0 is the lowest (last subscriber to get published data) priority
 *                                                and 11 is the highest (first subscriber to get published data).
 *                                                Every subscription will append to the list of priorities,
 *                                                except for options.timing="def" since there can be only one default.
 *                                                If subscribing and options.priority is not set, 6 is used.
 *                                                This is ignored when options.timing="def".
 *
 * @param {String}          [options.timing]      When the priority should happen.
 *                                                pre = before default timing. There can be many of these timings.
 *                                                def = default publish event. There is only one default timing.
 *                                                post = after default event. There can be many of these timings.
 *                                                If subscribing and options.timing is not set,
 *                                                options.timing="pre" will be used.
 *
 * @param {*}               [options.context]     Specify the context of `this` for options.sub
 *
 * @returns {undefined|new PSPProxy}              "new PrioritizedSubPub" returns a function with a new
 *                                                instance of PSPProxy for private use.
 *                                                Otherwise, it will publish, subscribe, or un-subscribe to
 *                                                global PrioritizedSubPub and return undefined.
 *
 * @example
 * //subscribe using default config
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    function (args) {
 *      console && console.log && console.log(args);
 *    }
 * );
 *
 * @example
 * //subscribe default timing
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "timing" : "def",
 *       "sub" : function (args) {
 *          if (args && args.stuff) {
 *             //do something by default
 *          }
 *       }
 *    }
 * );
 *
 * @example
 * //subscribe post timing
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "subId": "sub id 2",
 *       "timing" : "post",
 *       "priority": 11,
 *       "sub" : function (args) {
 *          if (args && args.somethingelse) {
 *              //do something after default and before other priorities
 *          }
 *       }
 *    }
 * );
 *
 * @example
 * //publish object with data inside the you want subscribers to consume
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *      "pub" : {
 *          "stuff" : "data"
 *      }
 *    }
 * );
 *
 * @example
 * //un-subscribe a subId
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "unSub": "sub id 2"
 *    }
 * );
 *
 * @example
 * //un-subscribe through subscriber callback
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "sub" : function (args) {
 *          return "unSub"; // I am un-subscribing myself.
 *       }
 *    }
 * );
 *
 * @example
 * //un-subscribe after 3 subscriptions.
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "unSubCount": 3
 *       "sub" : function (args) {
 *          // I am done after 3 subscriptions
 *       }
 *    }
 * );
 *
 * @example
 * //un-subscribe after 3 subscriptions, unless pub data tells me not to.
 *
 * PrioritizedSubPub(
 *    "myGlobalEvent",
 *    {
 *       "unSubCount": 3
 *       "sub" : function (args) {
 *          //doing stuff.
 *
 *          //the conditions that trigger the unSubCount down can come from any where you want.
 *          if (args.skipThisUnSubCount) {
 *              return "skip_dec"; //don't decrement the count
 *          }
 *       }
 *    }
 * );
 *
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
      , isUndef = function (value) { return typeof value === 'undefined'; }
      , isObj = function (value) { return value && typeof value === 'object'; }
      , isStr = function (value) { return typeof value === 'string'; }
      , isFn = function (value) { return typeof value === 'function'; }
      , isNum = function (value) { return typeof value === 'number' && !isNaN(value); }
      , fnArgsToArr = function (args) {
            return Array.prototype.slice.call(args);
        }
      , fnIndexOf = Array.prototype.indexOf || function (el) {
            //supporting older browsers
            var len
              , i;

            if (this && (len = this.length)){
                i = 0;
                //possible todo: faster and more efficient loop
                for (; i < len; i++) {
                    if (this[i] === el) {
                        return i;
                    }
                }
            }

            return -1;
        }
        //host global usage for PSP
      , _globalPSP
      ;

    /**
     * @private
     * @desc private console output. Currently logs by default.
     * @todo: think of good way to toggle logging.
     */
     function _debugLog() {
        /* global console */
        var args;
        if (console && console.log) {
            args = fnArgsToArr(arguments);
            args.unshift('PSP: ');
            console.log(args);
        }
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

        return isNum(validate) && validate >= min && validate <= max;
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
            //TODO: use an wrapped array for unrestricted priority numbers
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
                if (isUndef(priority)) {
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
                   isStr(subId)
                && (subIdData = this.subIds[subId])
                && isObj(subIdData)
            ) {

                timing = this.timings[subIdData.timing];

                if (isStr(timing)) {

                    _debugLog(this.eventName + 'removing default timing');
                    this.timings[subIdData.timing] = null;

                } else if (
                       timing
                    && timing.length
                    && (priority = timing[subIdData.priority])
                    && priority.length
                    && (indexOf = fnIndexOf.call(priority, subId)) >= 0
                ){
                    priority.splice(indexOf, 1);
                }

                if (isUndef(untrack) || untrack === true) {
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
                   isStr(subId)
                && (subIdData  = this.subIds[subId])
                && isFn(subIdData.sub)
            ) {
                isCount = isNum(subIdData.unPubCount);

                if (
                       !isCount
                    || (
                           isCount
                        && subIdData.unPubCount > 0
                    )
                ) {
                    result = subIdData.sub.apply(
                        subIdData.context
                      , [
                            data
                          , {
                                'CONST' : {
                                    'SKIP_DEC' : SKIP_DEC
                                  , 'UNSUB' : UNSUB
                                }
                            }
                        ]
                    );
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

                if (timing === 'def' && isStr(priorities)) {

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
     * @class PrioritizedSubPub
     * @constructor
     * @param {String} PSPName name to use to identify what PrioritizedSubPub is firing for console log.
     */
    function PrioritizedSubPub(PSPName) {
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

        if (isStr(PSPName)) {
            this.pspName += PSPName;
        } else {
            this.pspName += 'PSP' + Math.ceil(Math.random() * 10000000);
        }

        this.pspName += '::';
    }

    PrioritizedSubPub.prototype = {
        'constructor' : PrioritizedSubPub,
        /**
         * @param {String} eventName
         * @param {Object} [args]
         */
        'pub': function (eventName, args) {
            args = isObj(args) ? args : {};

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
                if (!isStr(config.subId)) {
                    config.subId = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isValidRange(temp, PRIORITY_LIMIT)) {
                    temp = Math.round(PRIORITY_LIMIT / 2);
                }

                config.priority = temp;

                temp = fnIndexOf.call(PRIORITY_TYPE, config.timing);

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
         * @method exec
         * @param  {String} eventName
         * @param  {Object|Function} options
         */
        'exec': function(eventName, options) {
            var optionsType,
                isObj;

            options = options || {};

            if (options && isStr(eventName)) {
                isObj = (optionsType = typeof options) === 'object';
                //subscribe using default config
                if (
                    optionsType === 'function'
                    || (
                           isObj
                        && isFn(options.sub)
                    )
                ) {
                    if(this.sub(eventName, options) === null) {
                        _debugLog(this.pspName + 'Subscription definition was invalid and was not registered');
                    }
                } else if (isObj) {
                    if (isStr(options.unSub)) {
                        this.unSub(eventName, options.unSub);
                    } else { //publish to eventName
                        options = options.pub || options;
                        this.pub(eventName, options);
                    }
                }
            }
        }
    };

    function PSPProxy(pspNamespace) {
        var _PSP = new PrioritizedSubPub(pspNamespace);

        function publicPSP() {
            _PSP.exec.apply(
                _PSP
              , fnArgsToArr(arguments)
            );
        }

        publicPSP.pub = function () { _PSP.pub.apply(_PSP, fnArgsToArr(arguments)); return this; };

        publicPSP.sub = function () { _PSP.sub.apply(_PSP, fnArgsToArr(arguments)); return this; };

        publicPSP.unSub = function () { _PSP.unSub.apply(_PSP, fnArgsToArr(arguments)); return this; };

        publicPSP.getEventProxy = function (pubName) {
            return {
                'pub': function (args) {
                    publicPSP.pub(pubName, args);
                    return this;
                },
                'sub': function (options) {
                    publicPSP.sub(pubName, options);
                    return this;
                },
                'unSub': function (subId) {
                    publicPSP.unSub(pubName, subId);
                    return this;
                }
            };
        };

        return publicPSP;
    }

    _globalPSP = new PSPProxy('GLOBAL');

    /**
     *
     * @param   {String}                subNameSpace
     * @returns {undefined|PSPProxy}
     */
    function PSPWrapper(subNameSpace) {
        /* global window */
        if (isUndef(this) || this === window) {

            _globalPSP.apply(
                _globalPSP,
                fnArgsToArr(arguments)
            );
        } else if (isStr(subNameSpace)) {
            //return new wrapper
            return new PSPProxy(subNameSpace);
        }
    }

    PSPWrapper.sub = _globalPSP.sub;
    PSPWrapper.pub = _globalPSP.pub;
    PSPWrapper.unSub = _globalPSP.unSub;
    PSPWrapper.getEventProxy = _globalPSP.getEventProxy;

    return PSPWrapper;
}));

