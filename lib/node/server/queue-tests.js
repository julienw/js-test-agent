/**
 * REQUIRES: suite, responder, broadcast
 *
 * When server recieves siginal to start tests
 * will tell every client to run all or some tests.
 * If no clients are connected, will wait for a connect
 * event before broadcasting the run tests signal
 */
function StartTests() {
  this.clientReady = false;
  this.testQueue = [];
}

StartTests.prototype = {

  eventNames: {
    connect: 'worker ready',
    start: 'queue tests',
    sendEvent: 'run tests',
    complete: 'test runner end'
  },

  _isRunning: false,

  enhance: function enhance(server) {
    server.on(this.eventNames.connect, this._onWorkerReady.bind(this, server));
    server.on(this.eventNames.start, this._startTests.bind(this, server));
    server.on(this.eventNames.complete, this._testsComplete.bind(this, server));
  },

  _onWorkerReady: function _onWorkerReady(server) {
    this.clientReady = true;
    this._runNextTest(server);
  },

  _runNextTest: function _runNextTest(server) {
    var testData = this.testQueue.shift();
    if (testData) {
      this._startTests(server, testData);
    }
  },

  _startTests: function _startTests(server, data) {
    // if there are no clients connected
    // simply store the test data for now
    if (!this.clientReady || this._isRunning) {
      this.testQueue.push(data);
      return;
    }

    this._isRunning = true;
    if (data && data.files && data.files.length > 0) {
      console.log('>>> got as argument files', data.files);
      this._broadCastFiles(server, data.files);
    } else {
      server.suite.findTestFiles(function(err, files) {
        console.log('>>> finder got files', files);
        this._broadCastFiles(server, files);
      }.bind(this));
    }
  },

  _testsComplete: function _testsComplete(server, data) {
    this._isRunning = false;
    this._runNextTest(server);
  },

  _broadCastFiles: function _broadCastFiles(server, files) {
    var list = files.map(function(file) {

      var result = server.suite.testFromPath(file);
      return result.testUrl;
    });
    server.broadcast(
      server.stringify(this.eventNames.sendEvent, {tests: list})
    );
  }

};

module.exports = exports = StartTests;
