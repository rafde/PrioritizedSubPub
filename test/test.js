/* global describe*/
describe('EventPriorityBroadcaster', function () {
    "use strict";
    /* global EventPriorityBroadcaster, it, EPB */
    var testEPB = new EventPriorityBroadcaster('TEST'),
        testNumber = -1;

    it('subscribe then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testEPB(
            testName,
            function (args) {
                testData[testName] = args.data;
            }
        );

        testEPB(testName, {'data': num});

        expect(testData[testName]).toBe(num);
    });

    it('subscribe, publish, un-subscribe, publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                }
            }
        );

        testEPB(testName, {data: num});

        testEPB(testName, {'unSub': testName});

        testEPB(testName, {data: num+1});

        expect(testData[testName]).toBe(num);
    });

    it('subscribe and repub, then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        num--;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                },
                rePub: true
            }
        );

        testEPB(testName, {data: ++num});

        expect(testData[testName]).toBe(num);
    });

    it('sub to def, pub, sub to def, pub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function () {
                    testData[testName] = 1;
                },
                'timing' : 1
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(1);

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function () {
                    testData[testName] = num;
                },
                'timing' : 1
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(num);
    });

    it('sub to def, sub post p5, pub, replace sub post p5 w/ pre p11, pub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function () {
                    testData[testName] = num;
                },
                'timing' : 1
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + '-1',
                'sub': function () {
                    testData[testName] = 2;
                },
                'timing' : 2
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(2);

        testEPB(
            testName,
            {
                'tag': testName + '-1',
                'sub': function () {
                    testData[testName] = 5;
                },
                'timing' : 0
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(num);
    });

    it('sub 4 times, remove first and last sub then publish', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function () {
                    testData[testName] = 0;
                },
                rePub: true
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + '-1',
                'sub': function () {
                    testData[testName] = 1;
                },
                rePub: true
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + '-2',
                'sub': function () {
                    testData[testName] = 2;
                },
                rePub: true
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + '-3',
                'sub': function () {
                    testData[testName] = 3;
                },
                rePub: true
            }
        );

        testEPB(
            testName,
            {
                'unSub': testName
            }
        );

        testEPB(
            testName,
            {
                'unSub': testName + '-4'
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(3);
    });

    it('subscribe, publish, publish, subscribe and repub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = 0;

        num = num - 2;

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                }
            }
        );

        testEPB(testName, {data: ++num});

        expect(testData[testName]).toBe(num);

        testEPB(testName, {data: ++num});

        expect(testData[testName]).toBe(num);

        testEPB(
            testName + '-1',
            {
                'tag': testName + '-1',
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

        testEPB(testName, {data: num});

        testEPB(
            testName,
            {
                'tag': testName,
                'sub': function (args) {
                    testData[testName] = args.data;
                },
                'rePub' : true
            }
        );

        expect(testData[testName]).toBe(num);
    });


    it('Subscribe pre with priority 5, subscribe pre with priority 8, subscribe pre with priority 2', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = num;

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p5',
                'sub': function () {
                    testData[testName] = 5;
                },
                'timing': 0,
                'priority': 5
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p2',
                'sub': function () {
                    testData[testName] = 2;
                },
                'timing': 0,
                'priority': 2
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 8;
                },
                'timing': 0,
                'priority': 8
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(2);
    });

    //@TODO FINISH
    it('Sub pre p5 1, sub pre p5 2, sub pre p5 3, sub pre p5 4, sub pre p5 5, pub', function () {
        var num = ++testNumber,
            testData = {},
            testName = 'test' + num;

        testData[testName] = num;

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p5 1',
                'sub': function () {
                    testData[testName] = 5;
                },
                'timing': 0,
                'priority': 5
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p2',
                'sub': function () {
                    testData[testName] = 2;
                },
                'timing': 0,
                'priority': 2
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 8;
                },
                'timing': 0,
                'priority': 8
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe(2);
    });

    it('sub post w/ p3, sub pre w/ p8, sub def, sub pre w/ p11, sub post w/ p0', function () {
        var num = ++testNumber,
            subCount = 0,
            testData = {},
            testName = 'test' + num;

        testData[testName] = num;

        testEPB(
            testName,
            {
                'tag': testName + ' post w/ p3',
                'sub': function () {
                    testData[testName] = 'post 3';
                    subCount++;
                },
                'timing': 2,
                'priority': 3
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'pre 8';
                    subCount++;
                },
                'timing': 0,
                'priority': 8
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' default',
                'sub': function () {
                    testData[testName] = 'default';
                    subCount++;
                },
                'timing': 1,
                'priority': 5
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p11',
                'sub': function () {
                    testData[testName] = 11;
                    subCount++;
                },
                'timing': 0,
                'priority': 11
            }
        );

        testEPB(
            testName,
            {
                'tag': testName + ' post w/ p0',
                'sub': function () {
                    testData[testName] = 'post 0';
                    subCount++;
                },
                'timing': 2,
                'priority': 0
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe('post 0');

        expect(subCount).toBe(5);
    });

    it('pub, sub def and repub, sub pre p8, pub, sub pre p8 replace, un-sub def, sub post p1 and repub, sub post p1, pub', function () {
        var num = ++testNumber,
            subCount = 0,
            testData = {},
            testName = 'test' + num;

        testEPB(testName, {'pub': {'data':num}});

        testEPB(
            testName,
            {
                'tag': testName + ' def',
                'sub': function (args) {
                    testData[testName] = args.data;
                    subCount++;
                },
                'timing': 1,
                'priority': 3,
                'rePub': true
            }
        );

        expect(testData[testName]).toBe(num);

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'pre 8';
                    subCount++;
                },
                'timing': 0,
                'priority': 8
            }
        );

        testEPB(testName, {'data': 54});

        expect(subCount).toBe(3);
        expect(testData[testName]).toBe(54);

        testEPB(
            testName,
            {
                'tag': testName + ' pre w/ p8',
                'sub': function () {
                    testData[testName] = 'replaced pre 8';
                    subCount++;
                },
                'timing': 0,
                'priority': 8
            }
        );

        testEPB(testName, {'data':99});

        expect(testData[testName]).toBe(99);
        expect(subCount).toBe(5);

        testEPB(testName, {'unSub': testName + ' def'});

        testEPB(testName);

        expect(subCount).toBe(6);
        expect(testData[testName]).toBe('replaced pre 8');

        testEPB(
            testName,
            {
                'tag': testName + ' post w/ p1',
                'sub': function () {
                    testData[testName] = 'post 1';
                    subCount++;
                },
                'timing': 2,
                'priority': 1,
                'rePub': true
            }
        );

        expect(testData[testName]).toBe('post 1');

        expect(subCount).toBe(7);

        testEPB(
            testName,
            {
                'tag': testName + ' post w/ p1 again',
                'sub': function () {
                    testData[testName] = 'post 1-again';
                    subCount++;
                },
                'timing': 2,
                'priority': 1
            }
        );

        testEPB(testName);

        expect(testData[testName]).toBe('post 1-again');
        expect(subCount).toBe(10);
    });
});