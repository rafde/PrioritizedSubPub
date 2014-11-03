/**
 * Public interface for using EventPriorityEmitter.
 *
 * @method EventPriorityEmitter
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
 * @param {Boolean}         [options.rePub]       If set to true and subscribing to an event and the event had
 *                                                published in the past, then re-publish for this subscriber
 *                                                using the previous options.pub
 *
 * @param {String}          [options.unSub]       Required for un-subscribing from priority list.
 *                                                The string refers to the subId to remove from list of priorities.
 *
 * @param {Function}        [options.sub]         Required for subscribing to an event.
 *
 * @param {String}          [options.subId]       Optional for subscribing. Use for identifying and removing
 *                                                from priority list. Randomly generated if not defined when
 *                                                subscribing (options.sub or options is a function).
 *
 * @param {int}             [options.priority]    0-11 where 0 is the lowest (last subscriber to get published data) priority 
 *                                                and 11 is the highest (first subscriber to get published data). 
 *                                                Every subscription will append to the list of priorities, 
 *                                                except for options.timing=1 since there can be only one default.
 *                                                If subscribing and options.priority is not set, 0 is be used. 
 *                                                This is ignored when options.timing=1.
 *
 * @param {String}          [options.timing]      When the priority should happen.
 *                                                pre = before default timing. There can be many of these timings.
 *                                                def = default publish event. There is only one default timing.
 *                                                post = after default event. There can be many of these timings.
 *                                                If subscribing and options.timing is not set, 2 will be used.
 *
 *
 * @returns {undefined|Function}                  "new EventPriorityEmitter" returns a function with a new
 *                                                instance of EventPriorityEmitter for private use.
 *                                                Otherwise, it will publish, subscribe, or un-subscribe to
 *                                                global EventPriorityEmitter and return undefined.
 *
 * @example
 *
 * //subscribe using default config
 * 
 * EventPriorityEmitter('myGlobalEvent', function (args) { console && console.log && console.log(args); });
 *
 * //subscribe default timing
 * 
 * EventPriorityEmitter('myGlobalEvent', {
 *
 *  "timing" : "def",
 *
 *  "sub" : function (args) {
 *      if (args && args.stuff) {
 *          //do something by default
 *      }
 *  }
 * });
 *
 * //subscribe post timing
 * 
 * EventPriorityEmitter('myGlobalEvent', {
 *
 *  "subId": "sub id 2",
 *
 *  "timing" : "post",
 *
 *  "priority": 11,
 *
 *  "sub" : function (args) {
 *      if (args && args.somethingelse) {
 *          //do something after default and before other priorities
 *      }
 *  }
 * });
 *
 * //publish object with data inside the you want subscribers to consume
 * 
 * EventPriorityEmitter('myGlobalEvent', {"pub": {"stuff" : "data"}});
 *
 * //un-subscribe a subId
 * 
 * EventPriorityEmitter('myGlobalEvent', {"unSub": "sub id 2"});
 *  
 */
(function (root, factory) {
    var ns = 'EventPriorityEmitter';
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
        //host global usage for EPE
        _globalEventPriorities;

    /**
     * @private
     * @desc private console output. Currently logs by default.
     * @todo: think of good way to toggle logging.
     */
     function _debugLog() {
        var args;
        if (console && console.log) {
            args = fnArgsToArr.call(arguments);
            args.unshift('EPE: ');
            console.log(args);
        }
    }

    /**
     * Makes sure value is within range.
     * @private
     * @param validate
     * @param max
     * @param min
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
     * @param epbName
     * @constructor
     */
    function Subscriptions(eventName, epbName){
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
        this.eventName = epbName + eventName + '-> ';
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
         * @param {undefined|Boolean} untrack
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
            var subIdData;
            data = data || this.oldArgs;
            
            if (
                typeof subId === 'string' &&
                (subIdData  = this.subIds[subId]) && 
                typeof subIdData.sub === 'function'
            ) {
                //pass context if defined?
                subIdData.sub.call(undefined, data);
            }
        },
        'publish': function (args) {
            var tidx = 0,
                timing,
                pidx,
                priorities,
                priority,
                sidx,
                subId,
                subIdData;

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

                            for(sidx = 0, subId = priority[sidx]; sidx < priority.length; subId = priority[++sidx]) {
                                _debugLog(this.eventName + 'Publishing subId ' + subId + ' TIMING ' + timing + ' PRIORITY ' + pidx);
                                this.publishToSubscriber(subId, args);
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * @private
     * @class EventPriorityEmitter
     * @constructor
     * @param {String} EPEName name to use to identify what EventPriorityEmitter is firing for console log.
     */
    function EventPriorityEmitter(EPEName) {
        this.epeName = '';
        /*
            keeps track of all event names that have subscriptions.
            Example data structure
            this.events = {
                "myGlobalEvent" : Subscription,
                "myOtherEvent": Subscription
            };
         */
        this.events = {};

        if (typeof EPEName === 'string') {
            this.epeName += EPEName;
        } else {
            this.epeName += 'EPE' + Math.ceil(Math.random() * 10000000);
        }

        this.epeName += '::';
    }

    EventPriorityEmitter.prototype = {
        'constructor' : EventPriorityEmitter,
        'pub': function (eventName, args) {
            var event = this.getEvent(eventName);

            if (event) {
                event.publish(args);
            }
        },
        'sub': function (eventName, config) {
            var event,
                temp;

            if (config && typeof config === 'object') {

                event = this.getEvent(eventName);

                //create random id if subId is defined for config tracking.
                if (typeof config.subId !== 'string') {                    
                    config.subId = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isValidRange(temp, PRIORITY_LIMIT)) {
                    config.priority = 0;
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
                    _debugLog(this.epeName + eventName + ' event was published. Re-publish subId ' + config.subId);
                    event.publishToSubscriber(config.subId);
                }

                return true;
            }

            _debugLog(this.epeName + eventName + ' was not given a legitimate config');

            return null;
        },
        'unSub': function (eventName, subId) {
            var event = this.getEvent(eventName);
            if (event) {
                _debugLog(this.epeName + 'un-subcribing subId ' + subId + ' from EVENT ' + eventName);
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
                _debugLog(this.epeName + 'Creating new subscription for EVENT ' + eventName);
                this.events[eventName] = event = new Subscriptions(eventName, this.epeName);
            }

            return event;
        },
        /**
         * Determines what type of action to do based on what the options are.
         * @param  {String} eventName
         * @param  {Object|Function} options
         */
        'exec': function(eventName, options) {
            options = options || {};

            if (typeof eventName === 'string') {

                //subscribe using default config
                if (typeof options === 'function') {
                    options = {
                        'sub': options
                    };
                }

                if (typeof options.unSub === 'string') {
                    this.unSub(eventName, options.unSub);
                } else if (typeof options.sub === 'function') { //subscribe to eventName

                    if(this.sub(eventName, options) === null) {
                        _debugLog(this.epeName + 'Subscription definition was invalid and was not registered');
                    }

                } else { //publish to eventName
                    options = options.pub || options;
                    this.pub(eventName, options);
                }
            }
        }
    };

    _globalEventPriorities = new EventPriorityEmitter('GLOBAL');

    return function (privateEPE) {
        if (typeof this === 'undefined' || this === window) {
            _globalEventPriorities.exec.apply(
                _globalEventPriorities,
                fnArgsToArr.call(arguments)
            );
        } else if (typeof privateEPE === 'string') {
            //return new wrapper
            return (function () {
                var EPE = new EventPriorityEmitter(privateEPE);

                return function() {
                    EPE.exec.apply(
                        EPE,
                        fnArgsToArr.call(arguments)
                    );
                };
            }());
        }
    };
}));

