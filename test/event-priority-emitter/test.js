/* global describe*/
describe('PrioritizedPubSub', function () {
    'use strict';
    /* global PrioritizedPubSub, it, PSP, expect */
    var testPSP = new PrioritizedPubSub('TEST'),
        testNumber = -1;

    it('should subscribe then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            function (args) {
                testData[testName] = args.data;
            }
        );

        testPSP(testName, {'data': num});

        expect(testData[testName]).toBe(num);
    });

    it('should subscribe, publish, un-subscribe, publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                }
            }
        );

        testPSP(testName, {data: num});

        testPSP(testName, {'unSub': testName});

        testPSP(testName, {data: num+1});

        expect(testData[testName]).toBe(num);
    });

    it('should subscribe and re-pub, then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        num--;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                },
                rePub: true
            }
        );

        testPSP(testName, {data: ++num});

        expect(testData[testName]).toBe(num);
    });

    it('should sub to def, pub, sub to def, pub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function () {
                    testData[testName] = 1;
                },
                'timing' : 'def'
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(1);

        testPSP(
            testName,
            {
                'sub': function () {
                    testData[testName] = num;
                },
                'timing' : 'def'
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(num);
    });

    it('should sub to def, sub post p5, pub, replace sub post p5 w/ pre p11, pub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function () {
                    testData[testName] = num;
                },
                'timing' : 'def'
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + '-1',
                'sub': function () {
                    testData[testName] = 2;
                },
                'timing' : 'post'
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(2);

        testPSP(
            testName,
            {
                'subId': testName + '-1',
                'sub': function () {
                    testData[testName] = 5;
                },
                'timing' : 'pre'
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(num);
    });

    it('should sub 4 times, remove first and last sub then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function () {
                    testData[testName] = 0;
                },
                rePub: true
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + '-1',
                'sub': function () {
                    testData[testName] = 1;
                },
                rePub: true
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + '-2',
                'sub': function () {
                    testData[testName] = 2;
                },
                rePub: true
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + '-3',
                'sub': function () {
                    testData[testName] = 3;
                },
                rePub: true
            }
        );

        testPSP(
            testName,
            {
                'unSub': testName
            }
        );

        testPSP(
            testName,
            {
                'unSub': testName + '-4'
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(3);
    });

    it('subscribe, publish, publish, subscribe and repub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        num = num - 2;

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                }
            }
        );

        testPSP(testName, {data: ++num});

        expect(testData[testName]).toBe(num);

        testPSP(testName, {data: ++num});

        expect(testData[testName]).toBe(num);

        testPSP(
            testName + '-1',
            {
                'subId': testName + '-1',
                'sub': function (args) {
                    testData[testName] = args.data;
                },
                rePub: true
            }
        );

        expect(testData[testName]).toBe(num);
    });

    it('Publish data, then subscribe and repub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testPSP(testName, {data: num});

        testPSP(
            testName,
            {
                'subId': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                },
                'rePub' : true
            }
        );

        expect(testData[testName]).toBe(num);
    });


    it('Subscribe pre with priority 5, subscribe pre with priority 8, subscribe pre with priority 2', function () {
        var testData = {},
            testName = 'test' + ++testNumber;

        testData[testName] = ++testNumber;

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p5',
                'sub': function () {
                    testData[testName] = 5;
                },
                'timing': 'pre',
                'priority': 5
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p2',
                'sub': function () {
                    testData[testName] = 2;
                },
                'timing': 'pre',
                'priority': 2
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 8;
                },
                'timing': 'pre',
                'priority': 8
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(2);
    });

    it('sub post w/ p3, sub pre w/ p8, sub def, sub pre w/ p11, sub post w/ p0', function () {
        var num = ++testNumber,
            subCount = 0,
            testData = {},
            testName = 'test' + num;

        testData[testName] = num;

        testPSP(
            testName,
            {
                'subId': testName + ' post w/ p3',
                'sub': function () {
                    testData[testName] = 'post 3';
                    subCount++;
                },
                'timing': 'post',
                'priority': 3
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'pre 8';
                    subCount++;
                },
                'timing': 'pre',
                'priority': 8
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' default',
                'sub': function () {
                    testData[testName] = 'default';
                    subCount++;
                },
                'timing': 'def',
                'priority': 5
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p11',
                'sub': function () {
                    testData[testName] = 11;
                    subCount++;
                },
                'timing': 'pre',
                'priority': 11
            }
        );

        testPSP(
            testName,
            {
                'subId': testName + ' post w/ p0',
                'sub': function () {
                    testData[testName] = 'post 0';
                    subCount++;
                },
                'timing': 'post',
                'priority': 0
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe('post 0');

        expect(subCount).toBe(5);
    });

    it('pub, sub def and repub, sub pre p8, pub, sub pre p8 replace, un-sub def, sub post p1 and repub, sub post p1, pub', function () {
        var num = ++testNumber,
            subCount = 0,
            testData = {},
            testName = 'test' + num;

        testPSP(testName, {'pub': {'data':num}});

        testPSP(
            testName,
            {
                'subId': testName + ' def',
                'sub': function (args) {
                    testData[testName] = args.data;
                    subCount++;
                },
                'timing': 'def',
                'priority': 3,
                'rePub': true
            }
        );

        expect(testData[testName]).toBe(num);

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'pre 8';
                    subCount++;
                },
                'timing': 'pre',
                'priority': 8
            }
        );

        testPSP(testName, {'data': 54});

        expect(subCount).toBe(3);
        expect(testData[testName]).toBe(54);

        testPSP(
            testName,
            {
                'subId': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'replaced pre 8';
                    subCount++;
                },
                'timing': 'pre',
                'priority': 8
            }
        );

        testPSP(testName, {'data':99});

        expect(testData[testName]).toBe(99);
        expect(subCount).toBe(5);

        testPSP(testName, {'unSub': testName + ' def'});

        testPSP(testName);

        expect(subCount).toBe(6);
        expect(testData[testName]).toBe('replaced pre 8');

        testPSP(
            testName,
            {
                'subId': testName + ' post w/ p1',
                'sub': function () {
                    testData[testName] = 'post 1';
                    subCount++;
                },
                'timing': 'post',
                'priority': 1,
                'rePub': true
            }
        );

        expect(testData[testName]).toBe('post 1');

        expect(subCount).toBe(7);

        testPSP(
            testName,
            {
                'subId': testName + ' post w/ p1 again',
                'sub': function () {
                    testData[testName] = 'post 1-again';
                    subCount++;
                },
                'timing': 'post',
                'priority': 1
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe('post 1-again');
        expect(subCount).toBe(10);
    });

    it('should subscribe and self remove, subscribe, subscribe and self remove, then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            function (args) {
                testData[testName] += 2;
                return false;
            }
        );

        testPSP(
            testName,
            function (args) {
                testData[testName] = args.data;
            }
        );

        testPSP(
            testName,
            function (args) {
                testData[testName] += 3;
                return false;
            }
        );

        testPSP(testName, {'data': num});
        expect(testData[testName]).toBe(num + 3);

        testPSP(testName, {'data': num});
        expect(testData[testName]).toBe(num);
    });

    it('should subscribe and self remove, subscribe, subscribe and self remove, then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            function (args) {
                testData[testName] += 2;
                return false;
            }
        );

        testPSP(
            testName,
            function (args) {
                testData[testName] = args.data;
            }
        );

        testPSP(
            testName,
            function (args) {
                testData[testName] += 3;
                return false;
            }
        );

        testPSP(testName, {'data': num});
        expect(testData[testName]).toBe(num + 3);

        testPSP(testName, {'data': num});
        expect(testData[testName]).toBe(num);
    });

    it('should subscribe and unpub after 3 publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            {
                'unPubCount': 3,
                'sub': function (args) {
                    testData[testName]++;
                }
            }
        );

        testPSP(testName);
        testPSP(testName);
        testPSP(testName);
        testPSP(testName);

        expect(testData[testName]).toBe(3);
    });

    it('should subscribe, decrement if data is odd, and unpub itself', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            {
                'unPubCount': 3,
                'sub': function (args) {
                    testData[testName]++;

                    if (testData[testName] % 2 === 0) {
                        return true;
                    }
                }
            }
        );

        testPSP(testName);
        testPSP(testName);
        testPSP(testName);
        testPSP(testName);
        testPSP(testName);
        testPSP(testName);

        expect(testData[testName]).toBe(5);
    });

    it('should not publish of unPubCount is 0', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testPSP(
            testName,
            {
                'unPubCount': 0,
                'sub': function (args) {
                    testData[testName]++;

                    if (testData[testName] % 2 === 0) {
                        return true;
                    }
                }
            }
        );

        testPSP(testName);

        expect(testData[testName]).toBe(0);
    });
});