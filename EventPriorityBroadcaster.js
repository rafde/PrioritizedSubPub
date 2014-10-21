var EventPriorityBroadcaster = (function (w) {
    'use strict';

    var PRIORITY_TYPE = ['pre', 'def', 'post'],
        PRIORITY_LIMIT = 11,
        fnArgsToArr = Array.prototype.slice,
        fnIndexOf = Array.prototype.indexOf,
        _globalEventPriorities;


     function _debugLog() {
        var args;
        if (w.console && w.console.log) {
            args = fnArgsToArr.call(arguments);
            args.unshift('EPB: ');
            w.console.log(args);
        }
    }

    function _isValidRange(validate, max, min) {
        min = min || 0;

        return !isNaN(validate) && validate >= min && validate <= max;
    }

    function Subscriptions(eventName, epbName){
        var i = 0,
            timings = {},
            type;

        for(type = PRIORITY_TYPE[i]; i < PRIORITY_TYPE.length; type = PRIORITY_TYPE[++i]){

            if (type === 'def') {
                timings[type] = null;
                continue;
            }

            timings[type] = [];
        }

        this.tags = {};
        this.hasPub = false;
        this.oldArgs = {};
        this.timings = timings;
        this.eventName = epbName + eventName + '-> ';
    }

    Subscriptions.prototype = {
        'constructor': Subscriptions,
        'replaceTag' : function (config) {
            var timing,
                priority;

            this.removeTag(config.tag, false);

            this.tags[config.tag] = config;

            if (config.timing === 'def') {

                this.timings[config.timing] = config.sub;

            } else {

                timing = this.timings[config.timing];
                priority = timing[config.priority];

                if (typeof priority === 'undefined') {
                    priority = timing[config.priority] = [];
                }

                priority.push(config.tag);
            }
        },
        'removeTag': function (tag, untrack) {
            var tagData = this.tags[tag],
                indexOf,
                priority,
                timing;

            if (tagData && typeof tagData === 'object') {

                timing = this.timings[tagData.timing];

                if (typeof timing === 'function') {
                    _debugLog(this.eventName + 'removing default timing');
                    this.timings[tagData.timing] = null;

                } else if (
                    timing &&
                    timing.length &&
                    (priority = timing[tagData.priority]) &&
                    priority.length &&
                    (indexOf = fnIndexOf.call(priority, tag)) >= 0 /*Array.prototype.indexOf > IE 8*/
                ){
                    priority.splice(indexOf, 1);
                }

                if (typeof untrack === 'undefined' || untrack === true) {
                    delete this.tags[tag];
                }
            }

            return false;
        },
        'publish': function (args) {
            var tidx = 0,
                timing,
                pidx,
                priorities,
                priority,
                sidx,
                tag,
                tagData;

            //Clone?
            this.oldArgs = args;
            this.hasPub = true;

            for (timing = PRIORITY_TYPE[tidx]; tidx < PRIORITY_TYPE.length; timing = PRIORITY_TYPE[++tidx]) {
                priorities = this.timings[timing];

                if (timing === 'def' && typeof priorities === 'function') {

                    //Default should be the only one that matches this
                    priorities.call(undefined, this.oldArgs);
                    _debugLog(this.eventName + 'Publishing to default');

                } else if (priorities && priorities.length) {

                    for (pidx = priorities.length - 1, priority = priorities[pidx]; pidx >= 0; priority = priorities[--pidx]) {

                        if (priority && priority.length) {

                            for(sidx = 0, tag = priority[sidx]; sidx < priority.length; tag = priority[++sidx]) {
                                tagData = this.tags[tag];

                                if(tagData && typeof tagData.sub === 'function') {
                                    _debugLog(this.eventName + 'Publishing to TAG ' + tag + ' TIMING ' + timing + ' PRIORITY ' + pidx);
                                    //pass context if defined?
                                    tagData.sub.call(undefined, this.oldArgs);
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    /**
     * @constructor
     */
    function EventPriorityBroadcaster(EPBName) {
        this.epbName = '';
        this.events = {};


        if (typeof EPBName === 'string') {
            this.epbName += EPBName;
        } else {
            this.epbName += 'EPB' + Math.ceil(Math.random() * 10000000);
        }

        this.epbName += '::';
    }

    EventPriorityBroadcaster.prototype = {
        'constructor' : EventPriorityBroadcaster,
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

                if (typeof config.tag !== 'string') {
                    config.tag = 'pr-' + Math.ceil(Math.random() * 10000000);
                }

                temp = parseInt(config.priority, 10);
                if (!_isValidRange(temp, PRIORITY_LIMIT)) {
                    config.priority = 0;
                } else {
                    config.priority = temp;
                }

                temp = parseInt(config.timing, 10);
                if(!_isValidRange(temp, PRIORITY_TYPE.length - 1)) {
                    config.timing = PRIORITY_TYPE[PRIORITY_TYPE.length - 1];
                } else {
                    config.timing = PRIORITY_TYPE[temp];
                }

                event.replaceTag(config);

                if(config.rePub && event.hasPub) {
                    _debugLog(this.epbName + eventName + ' event was published. Re-publish for TAG ' + config.tag);
                    config.sub.call(undefined, event.oldArgs);
                }

                return true;
            }

            _debugLog(this.epbName + eventName + ' was not given a legitimate config');

            return null;
        },
        /**
         * @param priorityName
         * @param tag
         */
        'unSub': function (eventName, tag) {
            var event = this.getEvent(eventName);
            if (event) {
                _debugLog(this.epbName + 'un-subcribing TAG ' + tag + ' from EVENT ' + eventName);
                event.removeTag(tag);
            }
        },
        'getEvent': function (eventName) {
            var event = this.events[eventName];

            if (!event) {
                _debugLog(this.epbName + 'Creating new subscription for EVENT ' + eventName);
                this.events[eventName] = event = new Subscriptions(eventName, this.epbName);
            }

            return event;
        },
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
                } else if (typeof options.sub === 'function') { //subscribe to priorityName

                    if(this.sub(eventName, options) === null) {
                        _debugLog(this.epbName + 'Subscription definition was invalid and was not registered');
                    }

                } else { //publish to priorityName
                    options = options.pub || options;
                    this.pub(eventName, options);
                }
            }
        }
    };

    _globalEventPriorities = new EventPriorityBroadcaster('GLOBAL');

    /**
     * @param {String}          [eventName=]          Name to give to the event.
     *
     * @param {Object|Function} [options]             An object for options or function to subscribe. Certain options
     *                                                trigger certain actions, other non-related options will be discarded.
     *
     * @param {Object}          [options.pub]         For event publishing. If eventName is passed
     *                                                and options, options.unSub, or options.pub are undefined,
     *                                                then options.args gets set to {} and the event publishes.
     *
     * @param {Boolean}         [options.rePub]       If set to true and subscribing to an event and the event had
     *                                                published in the past, then re-publish for this subscriber
     *                                                using the previous options.args.
     *
     * @param {String}          [options.unSub]       Required for un-subscribing from priority list.
     *                                                The string refers to the tag to remove from list of priorities.
     *
     * @param {Function}        [options.sub]         Required for subscribing to an event. Where coding happens.
     *
     * @param {String}          [options.tag]         Optional for subscribing. Use for identifying and removing
     *                                                from priority list. Randomly generated if not defined when
     *                                                subscribing (options.callback or options is a function).
     *
     * @param {Integer}         [options.priority]    0-11 where 0 is the lowest (last to publish) priority and
     *                                                11 is the highest (first to publish). Every subscription will
     *                                                append to the list of priorities, except for options.timing=1.
     *                                                If subscribing and options.priority is not set, 0 be used.
     *                                                This option is ignored by options.timing=1.
     *
     * @param {Integer}         [options.timing]      When the priority should happen.
     *                                                0 = before default timing. There can be many of these timings.
     *                                                1 = default publish event. There is only one default timing.
     *                                                2 = after default event. There can be many of these timings.
     *                                                If subscribing and options.timing is not set, 2 will be used.
     *
     *
     * @returns {undefined|Function}                  "new EventPriorityBroadcaster" returns a function with a new
     *                                                private instance of EventPriorityBroadcaster.
     *                                                Otherwise, it will publish, subscribe or un-subscribe to
     *                                                global EventPriorityBroadcaster and return undefined.
     */
    return function (privateEPB) {
        if (typeof this === 'undefined') {
            _globalEventPriorities.exec.apply(
                _globalEventPriorities,
                fnArgsToArr.call(arguments)
            );
        } else {
            //return new wrapper
            return (function () {
                var EPB = new EventPriorityBroadcaster(privateEPB);

                return function() {
                    EPB.exec.apply(
                        EPB,
                        fnArgsToArr.call(arguments)
                    );
                };
            }());
        }
    };
}(window));