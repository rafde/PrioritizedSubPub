/**
 * Public interface for using PrioritizedSubPub.
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
 *                                                If this function returns false, it will un-subscribe itself.
 *
 * @param {int}             [options.unSubCount]  Optional. Will publish to however many times set. When it reaches the
 *                                                limit, it will un-subscribe itself. It decrement can be bypassed if
 *                                                options.sub callback returns true.
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
 * @param {*}               [options.context]     Specify the context of "this" for options.sub
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
 *    'myGlobalEvent',
 *    function (args) {
 *      console && console.log && console.log(args);
 *    }
 * );
 *
 * @example
 * //subscribe default timing
 *
 * PrioritizedSubPub(
 *    'myGlobalEvent',
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
 *    'myGlobalEvent',
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
 *    'myGlobalEvent',
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
 *    'myGlobalEvent',
 *    {
 *       "unSub": "sub id 2"
 *    }
 * );
 *
 * @example
 * //un-subscribe through subscriber callback
 *
 * PrioritizedSubPub(
 *    'myGlobalEvent',
 *    {
 *       "sub" : function (args) {
 *          return false; // I am un-subscribing myself.
 *       }
 *    }
 * );
 *
 * @example
 * //un-subscribe after 3 subscriptions.
 *
 * PrioritizedSubPub(
 *    'myGlobalEvent',
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
 *    'myGlobalEvent',
 *    {
 *       "unSubCount": 3
 *       "sub" : function (args) {
 *          //doing stuff.
 *
 *          //the conditions that trigger the unSubCount down can come from any where you want.
 *          if (args.skipThisUnSubCount) {
 *              return true; //don't decrement the count
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
    } else if (typeof exports === 'object') {
        module.exports = factory(root);
    } else {
        root[ns] = factory(root);
    }

} (this, function (root) {
    'use strict';
    /* global console */
    var PRIORITY_TYPE = ['pre', 'def', 'post'],
        PRIORITY_LIMIT = 11,
        fnArgsToArr = Array.prototype.slice,
        fnIndexOf = Array.prototype.indexOf || function (el) {
            //supporting older browsers
            var len,
                i;

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
        },
        //host global usage for PSP
        _globalPSP;

    /**
     * @private
     * @desc private console output. Currently logs by default.
     * @todo: think of good way to toggle logging.
     */
    function _debugLog() {
        var args;
        if (window.console && console.log) {
            args = fnArgsToArr.call(arguments);
            args.unshift('PSP: ');
            // only call console[].apply for browsers that support it, fallback to console.log
            try {
                console['log'].apply(console, args);
            } catch (e) {
                console.log(args);
            }
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

        return !isNaN(validate) && validate >= min && validate <= max;
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
                if (typeof priority === 'undefined') {
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
                typeof subId === 'string' && 
                (subIdData = this.subIds[subId]) && 
                typeof subIdData === 'object'
            ) {

                timing = this.timings[subIdData.timing];

                if (typeof timing === 'string') {

                    _debugLog(this.eventName + 'removing default timing');
                    this.timings[subIdData.timing] = null;

                } else if (
                    timing &&
                    timing.length &&
                    (priority = timing[subIdData.priority]) &&
                    priority.length &&
                    (indexOf = fnIndexOf.call(priority, subId)) >= 0
                ){
                    priority.splice(indexOf, 1);
                }

                if (typeof untrack === 'undefined' || untrack === true) {
                    delete this.subIds[subId];
                }
            }

            return false;
        },
        'publishToSubscriber': function (subId, data) {
            var subIdData,
                isCount,
                result;

            data = data || this.oldArgs;
            
            if (
                typeof subId === 'string' &&
                (subIdData  = this.subIds[subId]) && 
                typeof subIdData.sub === 'function'
            ) {
                isCount = typeof subIdData.unPubCount === 'number';

                if (
                    !isCount
                    || (
                        isCount
                        && subIdData.unPubCount > 0
                    )
                ) {
                    result = subIdData.sub.call(subIdData.context, data);
                }

                if (
                    result === false
                    || (
                        result !== true // do not decrement if sub returns true.
                        && isCount
                        && --subIdData.unPubCount <= 0
                    )
                ) {
                    _debugLog(this.eventName + 'Subscriber subId ' + subId + ' removed itself. Result:', result);
                    this.removeSubId(subId);
                }

                return result;
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

                if (timing === 'def' && typeof priorities === 'string') {

                    //Default should be the only one that matches this
                    _debugLog(this.eventName + 'Publishing to default');
                    this.publishToSubscriber(priorities, args);

                } else if (priorities && priorities.length) {

                    for (pidx = priorities.length - 1, priority = priorities[pidx]; pidx >= 0; priority = priorities[--pidx]) {

                        if (priority && priority.length) {
                            sidx = 0;
                            while((subId = priority[sidx])) {
                                _debugLog(this.eventName + 'Publishing subId ' + subId + ' TIMING ' + timing + ' PRIORITY ' + pidx);
                                
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
            this.events = {
                "myGlobalEvent" : Subscription,
                "myOtherEvent": Subscription
            };
         */
        this.events = {};

        if (typeof PSPName === 'string') {
            this.pspName += PSPName;
        } else {
            this.pspName += 'PPS' + Math.ceil(Math.random() * 10000000);
        }

        this.pspName += '::';
    }

    PrioritizedSubPub.prototype = {
        'constructor' : PrioritizedSubPub,
        /**
         * @param {String} eventName
         * @param {Object} args
         */
        'pub': function (eventName, args) {
            var event = this.getEvent(eventName);

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
                isFunction = configType === 'function',
                temp;

            if (config && (configType === 'object' || isFunction)) {

                if (isFunction) {
                    config = {
                        'sub' : config
                    };
                }

                event = this.getEvent(eventName);

                //create random id if subId is defined for config tracking.
                if (typeof config.subId !== 'string') {                    
                    config.subId = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isValidRange(temp, PRIORITY_LIMIT)) {
                    config.priority = Math.round(PRIORITY_LIMIT / 2);
                } else {
                    config.priority = temp;
                }

                temp = fnIndexOf.call(PRIORITY_TYPE, config.timing);

                if(temp < 0) {
                    config.timing = PRIORITY_TYPE[0]; //default config timing is pre
                } else {
                    config.timing = PRIORITY_TYPE[temp];
                }

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
            var event = this.getEvent(eventName);
            if (event) {
                _debugLog(this.pspName + 'un-subscribing subId ' + subId + ' from EVENT ' + eventName);
                event.removeSubId(subId);
            }
        },
        /**
         * Return or create new Subscription.
         * @param  {String} eventName
         * @return {Subscription}
         * @private
         */
        'getEvent': function (eventName) {
            var event = this.events[eventName];

            if (!event) {
                _debugLog(this.pspName + 'Creating new subscription for EVENT ' + eventName);
                this.events[eventName] = event = new Subscriptions(eventName, this.pspName);
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

            if (options && typeof eventName === 'string') {
                isObj = (optionsType = typeof options) === 'object';
                //subscribe using default config
                if (
                    optionsType === 'function'
                    || (
                        isObj
                        && typeof options.sub === 'function'
                    )
                ) {
                    if(this.sub(eventName, options) === null) {
                        _debugLog(this.pspName + 'Subscription definition was invalid and was not registered');
                    }
                } else if (isObj) {
                    if (typeof options.unSub === 'string') {
                        this.unSub(eventName, options.unSub);
                    } else { //publish to eventName
                        options = options.pub || options;
                        this.pub(eventName, options);
                    }
                }
            }
        }
    };

    function PSPProxy(PSP) {
        var _PSP = new PrioritizedSubPub(PSP),
             pubFn = function () {
                 _PSP.exec.apply(
                     _PSP,
                     fnArgsToArr.call(arguments)
                 );
            };

        pubFn.pub = function () { _PSP.pub.apply(_PSP, fnArgsToArr.call(arguments)); return this;};

        pubFn.sub = function () { _PSP.sub.apply(_PSP, fnArgsToArr.call(arguments)); return this;};

        pubFn.unSub = function () { _PSP.unSub.apply(_PSP, fnArgsToArr.call(arguments)); return this;};

        pubFn.getEventProxy = function (eventName) {
            return {
                'pub': function (args) {
                    pubFn.pub(eventName, args);
                    return this;
                },
                'sub': function (options) {
                    pubFn.sub(eventName, options);
                    return this;
                },
                'unSub': function (subId) {
                    pubFn.unSub(eventName, subId);
                    return this;
                }
            };
        };

        return pubFn;
    }

    _globalPSP = new PSPProxy('GLOBAL');

    function PSPWrapper(privatePSP) {
        if (typeof this === 'undefined' || this === window) {

            _globalPSP.apply(
                _globalPSP,
                fnArgsToArr.call(arguments)
            );
        } else if (typeof privatePSP === 'string') {
            //return new wrapper
            return new PSPProxy(privatePSP);
        }
    }

    PSPWrapper.sub = _globalPSP.sub;
    PSPWrapper.pub = _globalPSP.pub;
    PSPWrapper.unSub = _globalPSP.unSub;
    PSPWrapper.getEventProxy = _globalPSP.getEventProxy;

    return PSPWrapper;
}));

