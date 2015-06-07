/**
 * @classdesc Constructs a new PrioritizedPubSub
 *
 * @class PrioritizedPubSub
 *
 * @param   {string}                                subNameSpace    Name of new PrioritizedPubSub
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
 * @param   {eventName|eventName[]}                      eventName
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
 * @typedef {object} pspOptions
 *
 * @property {subscriptionCallback}     sub       Required for subscribing to an event. See {@link subscriptionCallback}
 *                                                This option has the highest precedence.
 *                                                Can be combined with {@link subscriptionOptions}
 *
 * @property {subscriptionId}           unSub     Required for un-subscribing an event.
 *                                                If set, pspOptions.pub will be ignored
 *
 * @property {pubArgs}                  pub       Required for publishing to subscribers.
 *                                                All other options have higher precedence.
 */

/**
 * Object or array of arguments passed to PrioritizedPubSub.pub or PrioritizedPubSub
 * for {@link subscriptionCallback} to use.
 *
 * @typedef {object|Array} pubArgs
 */

/**
 * Event name used for subscribing/publishing to.
 *
 * @typedef {string} eventName
 */

/**
 * User-defined id for identifying and removing from priority list. Randomly generated if not defined when
 * subscribing.
 *
 * @typedef {string} subscriptionId
 */

/**
 * All the options can be passed to PrioritizedPubSub and PrioritizedPubSub.sub
 *
 * @typedef {object} subscriptionOptions
 *
 * @property {subscriptionCallback}     pub             {@link subscriptionCallback}
 *
 * @property {number}                   [unSubCount]    Will subscribe to however many times set. When it reaches the
 *                                                      limit, it will un-subscribe itself. Value must be greater
 *                                                      than 0 or it will not subscribe.
 *                                                      Decrementing can be bypassed. See {@link pspObj}
 *
 * @property {boolean}                  [rePub=false]   If set to true and subscribing to an event and the event had
 *                                                      published in the past, then re-publish for this subscriber
 *                                                      using the previously publish data.
 *
 * @property {string}                   [subId]         {@link subscriptionId}
 *
 * @property {number}                   [priority=0]    Can be any number type, excluding `NaN`.
 *                                                      Every subscription will append to the list of priorities,
 *                                                      except for subscriptionOptions.timing="def" since there
 *                                                      can be only one default.
 *                                                      If subscribing and options.priority is not set, 0 is used.
 *                                                      This option is ignored when subscriptionOptions.timing="def".
 *
 * @property {string}                   [timing='pre']  See {@link subscriptionTimings}
 *
 * @property {*}                        [context]       Specify the context of `this` for {@link subscriptionCallback}
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
 * @typedef {string} subscriptionTimings
 */

/**
 * Object passed to {@link subscriptionCallback} as the last parameter.
 * If argument length is unknown, you can always get it using `arguments[arguments.length-1]`.
 *
 * @typedef {object}  pspObj
 *
 * @property {object} subscription          General subscription data.
 *
 * @property {string} subscription.id       Id for the subscription that is being executed.
 *
 * @property {number} subscription.count    Number of times the subscription has executed.
 *
 * @property {*}      subscription.context  {@link subscriptionOptions.context}
 *
 * @property {object} CONST
 *
 * @property {string} CONST.SKIP_DEC        Prevent the subscriptionOptions.unSubCount from decrementing by
 *                                          returning from {@link subscriptionCallback}
 *
 * @property {string} CONST.UNSUB           Used to un-subscribe by returning from {@link subscriptionCallback}.
 */

/**
 * Callback used for subscriptions.
 *
 * @callback subscriptionCallback
 *
 * @type function
 *
 * @param {...*}    args        usually from {@link pubArgs}
 *
 * @param {pspObj}  pspObj      last parameter passed.
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

}(this, function () {
    'use strict';

    var PRIORITY_TYPE = ['pre', 'def', 'post']
        , UNSUB = 'unsub'
        , SKIP_DEC = 'skip_dec'
        , _globalPSP //host global usage for PSP
        , _isArray = function (value) {
            return Object.prototype.toString.call(value) === '[object Array]';
        }
        , _isFunction = function (value) {
            return typeof value === 'function';
        }
        , _isObject = function (value) {
            return value && typeof value === 'object';
        }
        , _isRegExp = function (value) {
            return Object.prototype.toString.call(value) === '[object RegExp]';
        }
        , _isString = function (value) {
            return typeof value === 'string';
        }
        , _isUndefined = function (value) {
            return typeof value === 'undefined';
        }
        , _toArray = function (args) {
            return Array.prototype.slice.call(args);
        }
        , _indexOf = function (arr, val) {
            if (arr.indexOf) {
                return arr.indexOf(val);
            }

            var i = 0;

            if (arr && arr.length) {
                //possible todo: faster and more efficient loop
                do {
                    if (arr[i] === val) {
                        return i;
                    }
                } while (arr[++i]);
            }

            return -1;
        }
        ;

    if (typeof _ !== 'undefined') {
        _isArray     = _.isArray;
        _isFunction  = _.isFunction;
        _isObject    = _.isObject;
        _isRegExp    = _.isRegExp;
        _isString    = _.isString;
        _isUndefined = _.isUndefined;
        _toArray     = _.toArray;
        _indexOf     = _.indexOf;
    }

    function tryFunc(cb, args, context) {
        var val;
        try {
            val = cb.apply(context, args);
        } catch (e) {
            _debugLog(e);
        }
        return val;
    }

    //I want to make sure this is a number
    function _isRealNum(value) {
        return typeof value === 'number' && !isNaN(value);
    }

    function _isUndefinedOrTrue(value){
        return _isUndefined(value) || value === true;
    }

    function _stringToArray(value){
        if(_isArray(value)) {
            return value;
        } else if(_isString(value)){
            return [value];
        }
    }

    function _bInsert(arr, val) {
        var leftIdx = 0,
            rightIdx = arr.length,
            midIdx,
            midVal;

        if (
            !rightIdx
            || (
                   (rightIdx = rightIdx - 1)
                && arr[rightIdx] < val
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
            midIdx = ((leftIdx + rightIdx) / 2) | 0;
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
            && _isFunction(console.log)
        ) {
            args = _toArray(arguments);
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
               t :{}, //table
               q : [] //queue
            };
        }
        /*
         keeps all the subscriber data, i.e. options.sub and other future config
         Example data structure:
         this.sI = {
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
        this.sI = {}; //subIds
        //used for subscribers to know if data has been published and needs to be re-published.
        this.hP = false; //hasPublished
        //if publication happens, oA is kept for future subscribers that want to use past published data.
        this.oA = [{}]; //oldArgs
        /*
         Example data structure:
         this.t = {
             "pre" :{
                 "q":[
                     -5
                     0,
                     5
                 ],
                 "t":{
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
                 "q":[
                    -99,
                    17,
                    11,
                    100
                 ],
                 "t":{
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
        this.t = timings; //timings
        //for console.log
        this.eN = pspName + eventName + '-> '; //eventName
    }

    Subscriptions.prototype = {
        constructor: Subscriptions,
        /**
         * Updates or adds subscriber id with new definition.
         * @param {object} config
         */
        reSI: function (config) {
            var configTiming= config.t,
                configSubId = config.sI,
                configPriority = config.p,
                timing = this.t[configTiming],
                priority;

            this.rmSI(configSubId, false);

            config.c = 0;

            this.sI[configSubId] = config;

            if (configTiming === 'def') {

                this.rmSI(timing);
                this.t[configTiming] = configSubId;
                return;
            }

            priority = timing.t[configPriority];

            //list of priorities is only set to an array until it needs it.
            if (_isUndefined(priority)) {
                priority = timing.t[configPriority] = [];
                _bInsert(timing.q, configPriority);
            }
            //all new subId are added to the end of the priority list
            priority.push(configSubId);
        },
        /**
         * Find and remove subId from list of priorities.
         * If untrack is true or undefined, then delete from list of subIds
         * @param {string} subId
         * @param {undefined|boolean} [untrack=undefined]
         * @returns {boolean}
         */
        rmSI: function (subId, untrack) {
            var subIdData,
                indexOf,
                priority,
                timing;

            if (
                _isString(subId)
                && (subIdData = this.sI[subId])
                && _isObject(subIdData)
            ) {

                timing = this.t[subIdData.t];

                if (_isString(timing)) {

                    _debugLog(this.eN + 'removing default timing');
                    this.t[subIdData.t] = null;

                } else if (
                    timing
                    && timing.q.length
                    && (priority = timing.t[subIdData.p])
                    && priority.length
                    && (indexOf = _indexOf(priority, subId)) >= 0
                ) {
                    priority.splice(indexOf, 1);
                }

                if (_isUndefinedOrTrue(untrack)) {
                    delete this.sI[subId];
                    _debugLog(this.eN + ' is completely erasing ' + subId);
                }

                return true;
            }

            _debugLog(this.eN + ' had nothing to remove for ' + subId);
            return false;
        },
        rmSIR: function (subIdRE) {
            var subId,
                subIds = this.sI;

            for(subId in subIds){
                if(subIds.hasOwnProperty(subId) && subIdRE.test(subId)) {
                    this.rmSI(subId);
                }
            }
        },
        p2S: function (subId, data/*, options*/) {
            var subIdData,
                isCount,
                result;

            data = data || this.oA;

            if (
                _isString(subId)
                && (subIdData = this.sI[subId])
            ) {

                if (
                    !(isCount = _isRealNum(subIdData.uSC))
                    || (
                        isCount
                        && subIdData.uSC > 0
                    )
                ) {
                    result = tryFunc(
                        subIdData.s,
                        data.concat([
                            {
                                subscription: {
                                    id   : subId,
                                    count: ++subIdData.c,
                                    context: subIdData.ct
                                },
                                publisher:{
                                },
                                CONST       : {
                                    SKIP_DEC: SKIP_DEC,
                                    UNSUB   : UNSUB
                                }
                            }
                        ]),
                        subIdData.ct
                    )
                }

                if (
                    result === UNSUB
                    || (
                        result !== SKIP_DEC
                        && isCount
                        && --subIdData.uSC <= 0
                    )
                ) {
                    _debugLog(this.eN + 'Subscriber subId ' + subId + ' removed itself. Result:', result);
                    this.rmSI(subId);
                    return false;
                }

                return true;
            }
            return null;
        },
        publish: function (args, options) {
            var tidx = 0,
                timing,
                pidx,
                priorities,
                priority,
                sidx,
                subId,
                pList,
                pNum;

            this.oA = args; //Should this be cloned?
            this.hP = true; //hasPublished

            while (timing = PRIORITY_TYPE[tidx++]) {
                priorities = this.t[timing];

                if (timing === 'def') {

                    if(_isString(priorities)) {
                        //Default should be the only one that matches this
                        _debugLog(this.eN + 'Publishing to default');
                        this.p2S(priorities, args, options);
                    }

                } else if ((pList = priorities.q) && (pidx = pList.length)) {

                    while( (pNum = pList[--pidx]) === 0 || pNum) {
                        priority = priorities.t[pNum];

                        if (priority && priority.length) {
                            sidx = 0;

                            while ((subId = priority[sidx])) {

                                _debugLog(
                                    this.eN
                                    + 'Publishing subId '
                                    + subId
                                    + ' TIMING '
                                    + timing
                                    + ' PRIORITY '
                                    + pidx
                                );

                                if(this.p2S(subId, args, options)){
                                    sidx++;
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
     * @param {string} PSPName name to use to identify what PSP is firing for console log.
     */
    function PSP(PSPName) {
        var pN = PSPName;
        /*
         keeps track of all event names that have subscriptions.
         Example data structure
         this.sL = {
            "myGlobalEvent" : Subscriptions,
            "myOtherEvent": Subscriptions
         };
         */
        this.sL = {};//subscriptionList

        if (!_isString(pN)) {
            pN = 'PSP' + Math.ceil(Math.random() * 10000000);
        }

        this.pN =  pN + '::'; //pspName
    }

    PSP.prototype = {
        constructor: PSP,

        /**
         * @param {eventName|eventName[]}   eventName
         * @param {object|Array}            [args]
         * @param {object}                  [pubOptions]
         */
        pub: function (eventName, args, pubOptions) {
            var eventArr = _stringToArray(eventName),
                event,
                i = 0;

            if(!_isArray(eventArr)) {
                return;
            }

            args = _isArray(args)
                   ? args
                   : _isObject(args)
                     ? [args]
                     : [{}];

            event = eventArr[i];

            do{
                if(_isString(event)) {
                    event = this.getSub(event);
                    if (event) {
                        event.publish(args, pubOptions);
                    }
                }
            } while(event = eventName[++i])
        },

        /**
         *
         * @param {string}                              eventName
         * @param {object|function|subscriptionOptions} config
         * @returns {boolean|null}
         */
        sub: function (eventName, config) {
            var event,
                configType = typeof config,
                isFn = (configType === 'function'),
                subscriptionObj = {},
                temp;

            if (
                _isString(eventName)
                && config
                && (
                    isFn
                    || (
                        configType === 'object'
                        && _isFunction(config.sub)
                        && (
                            _isUndefined(temp = config.unSubCount)
                            || (temp = parseInt(temp, 10)) > 0
                        )
                    )
                )
            ) {
                //optional unSubCount
                if(temp){
                    subscriptionObj.uSC = temp;
                }

                //callback
                subscriptionObj.s = isFn
                                    ? config
                                    : config.sub;
                //id
                subscriptionObj.sI = _isString(temp = config.subId)
                                    ? temp
                                    //create random id if subId is defined for config tracking.
                                    : 'pr-' + Math.ceil(Math.random() * 10000000);
                //priority
                subscriptionObj.p = _isRealNum(temp = Number(config.priority))
                                  ? temp
                                  : 0;
                //timing
                subscriptionObj.t = (temp = _indexOf(PRIORITY_TYPE, config.timing)) < 0
                                ? PRIORITY_TYPE[0]
                                : PRIORITY_TYPE[temp];

                //optional context
                if(!_isUndefined(temp = config.context)){
                    subscriptionObj.ct = temp;
                }

                event = this.getSub(eventName);
                event.reSI(subscriptionObj);

                if (config.rePub && event.hP) {
                    _debugLog(this.pN + eventName + ' event was published. Re-publish subId ' + subscriptionObj.sI);
                    event.p2S(subscriptionObj.sI);
                }

                return true;
            }

            _debugLog(this.pN + eventName + ' was not given a legitimate config');

            return null;
        },

        /**
         *
         * @param {string}                  eventName
         * @param {string|string[]|regexp}  subId
         */
        unSub: function (eventName, subId) {
            var event,
                subIdArr,
                sI,
                i = 0;

            if (_isString(eventName)  && (event = this.getSub(eventName, false))){

                if(_isRegExp(subId)){
                    event.rmSIR(subId);
                    return;
                }
                subIdArr = _stringToArray(subId);

                if (_isArray(subIdArr)) {
                    sI = subIdArr[i];
                    do{
                        _debugLog(this.pN + 'un-subscribing subId ' + sI + ' from ' + eventName);
                        event.rmSI(sI);
                    } while(sI = subIdArr[++i])
                }
            }
        },

        /**
         * Return or create new Subscription.
         * @private
         * @param {string}  subName
         * @param {boolean} [isCreating]
         * @return {Subscriptions}
         */
        getSub: function (subName, isCreating) {
            var event = this.sL[subName];

            if (!event && _isUndefinedOrTrue(isCreating)) {
                _debugLog(this.pN + 'Creating new subscription: ' + subName);
                this.sL[subName] = event = new Subscriptions(subName, this.pN);
            }
            return event;
        },

        /**
         * Determines what type of action to do based on what the options are.
         * @param {string}                              eventName
         * @param {object|function|subscriptionOptions} options
         */
        exec: function (eventName, options) {
            var optionsType,
                isObj,
                temp;

            options = options || {};

            if (options && _isString(eventName)) {
                isObj = (optionsType = typeof options) === 'object';
                //subscribe using default config
                if (
                    optionsType === 'function'
                    || (
                        isObj
                        && _isFunction(options.sub)
                    )
                ) {
                    if (this.sub(eventName, options) === null) {
                        _debugLog(this.pN + 'Subscription definition was invalid and was not registered');
                    }
                } else if (isObj) {
                    temp = options.unSub;
                    if (_isString(temp) || _isArray(temp) || _isRegExp(temp)) {
                        this.unSub(eventName, temp);
                    } else { //publish to eventName
                        options = options.pub || options;
                        this.pub(eventName, options);
                    }
                }
            } else if (_isArray(eventName)) {
                this.pub(eventName, options);
            }
        }
    };

    /**
     * @param   {string} pspNamespace
     * @returns {publicPSP}
     */
    function PSPProxy(pspNamespace) {
        var _PSP = new PSP(pspNamespace);

        function publicPSP() {
            _PSP.exec.apply(
                _PSP
              , arguments
            );
        }

        publicPSP.pub = function () {
            _PSP.pub.apply(_PSP, arguments);
            return this;
        };

        publicPSP.sub = function () {
            _PSP.sub.apply(_PSP, arguments);
            return this;
        };

        publicPSP.unSub = function () {
            _PSP.unSub.apply(_PSP, arguments);
            return this;
        };

        publicPSP.getEventPubCallback = function (eventName) {

            return function () {
                publicPSP.pub(eventName, _toArray(arguments));
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
        if (_isUndefined(this) || this === window) {

            _globalPSP.apply(
                _globalPSP,
                arguments
            );

            return PrioritizedPubSub;

        } else if (_isString(subNameSpace)) {
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
     * @param   {eventName|eventName[]}     eventName
     * @param   {object|Array}              [args]
     * @returns {PrioritizedPubSub}
     */
    PrioritizedPubSub.pub = _globalPSP.pub;

    /**
     * Removes a subscription in an event name
     *
     * @function
     * @static
     * @memberof PrioritizedPubSub
     * @param {eventName}                               eventName
     * @param {subscriptionId|subscriptionId[]|regexp}  subId
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
     * @returns {subscriptionCallback}
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
     *          pub: function,
     *          sub: function,
     *          unSub: function
     *      }
     *  }
     */
    PrioritizedPubSub.getEventProxy = _globalPSP.getEventProxy;

    PrioritizedPubSub.isLogged = true;

    return PrioritizedPubSub;
}));

