'use strict';

var sinon               = require('sinon');
var expect              = require('chai').use(require('sinon-chai')).expect;
var Mock                = require('../');
var Firebase            = Mock.MockFirebase;
var FirebaseSimpleLogin = Mock.MockFirebaseSimpleLogin;

describe('MockFirebaseSimpleLogin', function() {
  var fb, callback, auth;

  beforeEach(function() {
    // we need our own callback to test the MockFirebaseSimpleLogin API
    // it's not usually necessary to do this since MockFirebaseSimpleLogin
    // already provides a spy method auth.callback (whether or not a callback is provided)
    callback = sinon.spy();
    fb = new Firebase().child('data');
    auth = new FirebaseSimpleLogin(fb, callback);
  });

  describe('#login', function() {
    it('should invoke the callback if autoFlush is set', function() {
      auth.autoFlush(true).login('twitter');
      expect(callback.callCount).equals(1);
    });

    it('should wait for flush', function() {
      auth.login('twitter');
      expect(callback.callCount).equals(0);
      auth.flush();
      expect(callback.callCount).equals(1);
    });

    it('should return INVALID_USER on bad email address', function() {
      auth.autoFlush(true).login('password', {email: 'bademail', password: 'notagoodpassword'});
      var call = callback.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_USER');
    });

    it('should return INVALID_PASSWORD on an invalid password', function() {
      auth.autoFlush(true).login('password', {email: 'email@firebase.com', password: 'notagoodpassword'});
      var call = callback.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_PASSWORD');
    });

    it('should return a valid user on a good login', function() {
      auth.autoFlush(true).login('facebook');
      var call = callback.getCall(0);
      expect(call.args[1]).eqls(auth.getUser('facebook'));
    });
  });

  describe('#createUser', function() {
    it('should return a user on success', function() {
      var spy = sinon.spy();
      auth.createUser('newuser@firebase.com', 'password', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).equals(null);
      expect(call.args[1]).eqls(auth.getUser('password', {email: 'newuser@firebase.com'}));

    });

    it('should fail with EMAIL_TAKEN if user already exists', function() {
      var spy = sinon.spy();
      var existingUser = auth.getUser('password', {email: 'email@firebase.com'});
      expect(existingUser).is.an('object');
      auth.createUser(existingUser.email, existingUser.password, spy);
      auth.flush();
      var call = spy.getCall(0);
      expect(spy).to.be.called;
      expect(call.args[0]).is.an('object');
      expect(call.args[0]).to.include.keys('code');
    });
  });

  describe('#changePassword', function() {
    it('should invoke callback on success', function() {
      var spy = sinon.spy();
      var user = auth.getUser('password', {email: 'email@firebase.com'});
      auth.changePassword('email@firebase.com', user.password, 'spiffy', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).equals(null);
      expect(call.args[1]).equals(true);
    });

    it('should physically modify the password', function() {
      var user = auth.getUser('password', {email: 'email@firebase.com'});
      auth.changePassword('email@firebase.com', user.password, 'spiffynewpass');
      auth.flush();
      expect(user.password).equals('spiffynewpass');
    });

    it('should fail with INVALID_USER if bad user given', function() {
      var spy = sinon.spy();
      auth.changePassword('notvalidemail@firebase.com', 'all your base', 'are belong to us', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_USER');
      expect(call.args[1]).equals(false);
    });

    it('should fail with INVALID_PASSWORD on a mismatch', function() {
      var spy = sinon.spy();
      auth.changePassword('email@firebase.com', 'notvalidpassword', 'newpassword', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_PASSWORD');
      expect(call.args[1]).equals(false);
    });
  });

  describe('#sendPasswordResetEmail', function() {
    it('should return null, true on success', function() {
      var spy = sinon.spy();
      auth.sendPasswordResetEmail('email@firebase.com', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).equals(null);
      expect(call.args[1]).equals(true);
    });

    it('should fail with INVALID_USER if not a valid email', function() {
      var spy = sinon.spy();
      auth.sendPasswordResetEmail('notavaliduser@firebase.com', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_USER');
      expect(call.args[1]).equals(false);
    });
  });

  describe('#removeUser', function() {
    it('should invoke callback', function() {
      var spy = sinon.spy();
      var user = auth.getUser('password', {email: 'email@firebase.com'});
      auth.removeUser('email@firebase.com', user.password, spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).equals(null);
      expect(call.args[1]).equals(true);
    });

    it('should physically remove the user', function() {
      var user = auth.getUser('password', {email: 'email@firebase.com'});
      expect(user).is.an('object');
      auth.removeUser('email@firebase.com', user.password);
      auth.flush();
      expect(auth.getUser('password', {email: 'email@firebase.com'})).equals(null);
    });

    it('should fail with INVALID_USER if bad email', function() {
      var spy = sinon.spy();
      auth.removeUser('notvaliduser@firebase.com', 'xxxxx', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_USER');
    });

    it('should fail with INVALID_PASSWORD if bad password', function() {
      var spy = sinon.spy();
      auth.removeUser('email@firebase.com', 'notavalidpassword', spy);
      auth.flush();
      expect(spy.callCount).equals(1);
      var call = spy.getCall(0);
      expect(call.args[0]).is.an('object');
      expect(call.args[0].code).equals('INVALID_PASSWORD');
      expect(call.args[1]).equals(false);
    });
  });

  describe('#autoFlush', function() {
    it('should flush immediately if true is used', function() {
      expect(auth.flush).not.called;
      auth.autoFlush(true);
      expect(auth.flush).calledWith(true);
    });

    it('should not invoke if false is used', function() {
      expect(auth.flush).not.called;
      auth.autoFlush(false);
      expect(auth.flush).not.called;
    });

    it('should invoke flush with appropriate time if int is used', function() {
      expect(auth.flush).not.called;
      auth.autoFlush(10);
      expect(auth.flush).calledWith(10);
    });

    it('should obey MockFirebaseSimpleLogin.DEFAULT_AUTO_FLUSH', function() {
      FirebaseSimpleLogin.DEFAULT_AUTO_FLUSH = true;
      var auth = new FirebaseSimpleLogin(fb, callback);
      expect(auth.flush).not.called;
      auth.login('facebook');
      expect(auth.flush).calledWith(true);
    });
  });

});
