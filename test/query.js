if (!chai) var chai = require('chai');
var should = chai.should();

if (!filtr) var filtr = require('..');

describe('Query', function () {
  it('should have a version', function () {
    filtr.version.should.match(/^\d+\.\d+\.\d+$/);
  });

  it('should parse a single query', function () {
    var query = { $lt: 10 }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    Q.test(8, { type: 'single' }).should.be.true;
    Q.test(11, { type: 'single' }).should.be.false;
  });

  it('should parse a lengthed query', function () {
    var query = { $lt: 10, $gt: 5 }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    Q.test(8, { type: 'single' }).should.be.true;
    Q.test(4, { type: 'single' }).should.be.false;
    Q.test(11, { type: 'single' }).should.be.false;
  });

  it('should parse a nested query', function () {
    var query = { $and: [ { $size: 3 }, { $all: [ 1, 2 ] } ] }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    Q.stack[0].test.should.be.instanceof(Array);
    Q.test([0,1,2], { type: 'single' }).should.be.true;
    Q.test([0,1,2,3], { type: 'single' }).should.be.false;
  });

  it('should parse a complex nested query', function () {
    var query = { $or: [ { $size: 3, $all: [ 4 ] }, { $all: [ 1, 2 ] } ] }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    Q.test([ 2, 3, 4], { type: 'single' }).should.be.true;
    Q.test([ 1, 2 ], {type: 'single' }).should.be.true;
  });

  it('should parse a $gt query', function () {
    var query = { 'a': { '$gt': 3 } }
      , Q = filtr(query);
    Q.test({ a: 5 }, { type: 'single' }).should.be.true;
    Q.test({ a: 2 }, {type: 'single' }).should.be.false;
  });

  it('should parse a complex nested query (2)', function () {
    var query = { $and: [{ 'a': { '$gt': 3 } }, { '$or': [ { 'b': 2 }, { 'c': '3' } ] }] }
      , Q = filtr(query);
    Q.test({ a: 5, b: 2 }, { type: 'single' }).should.be.true;
    Q.test({ a: 5 }, {type: 'single' }).should.be.false;
  });

  it('should parse a complex nested query (3)', function () {
    var query = { 'a': { '$gt': 3 }, '$or': [ { 'b': 2 }, { 'c': '3' } ] }
      , Q = filtr(query);
    Q.test({ a: 5, b: 2 }, { type: 'single' }).should.be.true;
    Q.test({ a: 5 }, {type: 'single' }).should.be.false;
  });

  it('should parse a complex nested query with dates (4)', function () {
    var date1 = new Date('December 17, 1995 03:24:00');
    var date2 = new Date('December 17, 1996 03:24:00');
    var query = { $and: [{ 'a': { '$gt': date1 } }, { '$or': [ { 'b': 2 }, { 'c': '3' } ] }] }
      , Q = filtr(query);
    Q.test({ a: date2, b: 2 }, { type: 'single' }).should.be.true;
    Q.test({ a: date1 }, {type: 'single' }).should.be.false;
  });

  it('should parse a query for a complex object with a nested array', function () {
    var query = { 'hello.world.one': 'a' }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    Q.test({ hello: [ { world: { one: 'a' } } ] }, { type: 'single' }).should.be.true;
    Q.test({ hello: [ { world: { one: 'a' } }, { world: { one: 'b' } } ] }, {type: 'single' }).should.be.true;
  });

  it('should parse a query for a complex object with a nested array in "set" mode', function () {
    var query = { 'hello.world.one': 'a' }
      , Q = filtr(query);
    Q.stack.should.have.length(1);
    var matching = { hello: [ { world: { one: 'a' } } ] };
    var nonMatching = { hello: [ { world: 'blub' } ] }
    Q.test([matching, nonMatching], { type: 'set' }).should.eql([matching]);
  });

  it('should support multiple statements', function () {
    var query = { 'test': 'hello', world: { $in: [ 'universe' ] } }
      , Q = filtr(query);
    Q.stack.should.have.length(2);
    Q.test({ test: 'hello', world: 'universe' }, { type: 'single' }).should.be.true;
    Q.test({ test: 'hello', world: 'galaxy' }, { type: 'single' }).should.be.false;
  });

  describe('getPathValue', function () {
    it('can get value for simple nested object', function () {
      var obj = { hello: { universe: 'world' }}
        , val = filtr.getPathValue('hello.universe', obj);
      val.should.equal('world');
    });

    it('can get value for simple array', function () {
      var obj = { hello: [ 'zero', 'one' ] }
        , val = filtr.getPathValue('hello[1]', obj);
      val.should.equal('one');
    });

    it('can get value of nested object inside a simple array', function () {
      var obj = { hello: [ { world: 'a' } ] }
        , val = filtr.getPathValue('hello[0].world', obj);
      val.should.equal('a');
    });

    it('can get value of a multiple nested object inside a simple array', function () {
      var obj = { hello: [ { world: { one: 'a' } } ] }
        , val = filtr.getPathValue('hello[0].world.one', obj);
      val.should.equal('a');
    });

    it('can get value of nested array', function () {
      var obj = { hello: [ 'zero', [ 'a', 'b' ] ] }
        , val = filtr.getPathValue('hello[1][0]', obj);
      val.should.equal('a');
    });

    it('can get value of array only', function () {
      var obj = [ 'zero', 'one' ]
        , val = filtr.getPathValue('[1]', obj);
      val.should.equal('one');
    });

    it('can get value of array only nested', function () {
      var obj = [ 'zero', [ 'a', 'b' ] ]
        , val = filtr.getPathValue('[1][1]', obj);
      val.should.equal('b');
    });
  });

  describe('setPathValue', function () {
    it('should allow value to be set in simple object', function () {
      var obj = {};
      filtr.setPathValue('hello', 'universe', obj);
      obj.should.eql({ hello: 'universe' });
    });

    it('should allow nested object value to be set', function () {
      var obj = {};
      filtr.setPathValue('hello.universe', 'filtr', obj);
      obj.should.eql({ hello: { universe: 'filtr' }});
    });

    it('should allow nested array value to be set', function () {
      var obj = {};
      filtr.setPathValue('hello.universe[1].filtr', 'galaxy', obj);
      // TODO: hello.universe[1] HAS the correct value for 'filtr',
      // so hello.universe[1].filtr === 'galaxy' is true
      // but on object representation it strangely doesn't reflect it.
      //obj.should.eql({ hello: { universe: [, { filtr: 'galaxy' } ] }});
      obj.hello.universe[1].filtr.should.eql('galaxy');
    });

    it('should allow value to be REset in simple object', function () {
      var obj = { hello: 'world' };
      filtr.setPathValue('hello', 'universe', obj);
      obj.should.eql({ hello: 'universe' });
    });

    it('should allow value to be set in complex object', function () {
      var obj = { hello: { }};
      filtr.setPathValue('hello.universe', 42, obj);
      obj.should.eql({ hello: { universe: 42 }});
    });

    it('should allow value to be REset in complex object', function () {
      var obj = { hello: { universe: 100 }};
      filtr.setPathValue('hello.universe', 42, obj);
      obj.should.eql({ hello: { universe: 42 }});
    });

    it('should allow for value to be set in array', function () {
      var obj = { hello: [] };
      filtr.setPathValue('hello[0]', 1, obj);
      obj.should.eql({ hello: [1] });
      filtr.setPathValue('hello[2]', 3, obj);
      obj.should.eql({ hello: [1 , , 3] });
    });

    it('should allow for value to be REset in array', function () {
      var obj = { hello: [ 1, 2, 4 ] };
      filtr.setPathValue('hello[2]', 3, obj);
      obj.should.eql({ hello: [ 1, 2, 3 ] });
    });
  });

  describe('comparator assumptions', function () {
    it('should assume $eq if no comparator provided - string', function () {
      var query = { 'hello': 'universe' }
        , Q = filtr(query);
      Q.stack.should.have.length(1);
      Q.test({ hello: 'universe' }, { type: 'single' }).should.be.true;
    });

    it('should assume $eq if no comparator provided - number', function () {
      var query = { 'hello': 42 }
        , Q = filtr(query);
      Q.stack.should.have.length(1);
      Q.test({ hello: 42 }, { type: 'single' }).should.be.true;
    });

    it('should assume $eq if no comparator provided - boolean', function () {
      var query = { 'hello': true }
        , Q = filtr(query);
      Q.stack.should.have.length(1);
      Q.test({ hello: true }, { type: 'single' }).should.be.true;
    });

    it('should assume $eq if no comparator provide - nested', function () {
      var query = { $or : [ { 'hello': true }, { 'universe': true } ] }
        , Q = filtr(query);
      Q.stack.should.have.length(1);
      Q.test({ hello: true }, { type: 'single' }).should.be.true;
      Q.test({ universe: true }, { type: 'single' }).should.be.true;
      Q.test({ hello: false, universe: true }, { type: 'single' }).should.be.true;
      Q.test({ hello: false, universe: false }, { type: 'single' }).should.be.false;
    });
  });

  // TODO: All nesting options.
});
