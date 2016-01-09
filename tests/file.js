/* global describe, it */
/* jslint node: true, esnext: true */

"use strict";

const fs = require('fs'),
	path = require('path'),
	chai = require('chai'),
	assert = chai.assert,
	expect = chai.expect,
	should = chai.should(),
	streamEqual = require('stream-equal'),
	tmp = require('tmp'),
	testStep = require('kronos-test-step'),
	BaseStep = require('kronos-step');

const inFileName = path.join(__dirname, 'fixtures', 'file1.txt');

const manager = testStep.managerMock;
require('../file').registerWithManager(manager);
const file = manager.steps['kronos-file'];

function makeEqualizer(done) {
	return function equalizer(err, equal) {
		assert(equal, "stream is equal to file content");
		done();
	};
}

describe('file', function () {
	describe('in', function () {
		describe('single', function () {
			const fileStep = file.createInstance(manager, undefined, {
				name: "myStep",
				type: "kronos-file",
				fileName: inFileName,
				endpoints: {
					"inout": {
						"in": false,
						"out": true,
						"active": true
					}
				}
			});

			const testEndpoint = BaseStep.createEndpoint('test', {
				"in": true,
				"passive": true
			});

			let request;
			testEndpoint.receive(function* () {
				while (true) {
					request = yield;
				}
			});
			fileStep.endpoints.inout.connect(testEndpoint);

			describe('static', function () {
				testStep.checkStepStatic(manager, fileStep);
			});

			describe('live-cycle', function () {
				testStep.checkStepLivecycle(manager, fileStep, function (step, state, livecycle, done) {
					done();
				});
			});

			describe('start', function () {
				it("should produce a request", function (done) {
					fileStep.endpoints.inout.connect(testEndpoint);

					fileStep.start().then(function (step) {
						try {
							assert.equal(fileStep.state, 'running');
							setTimeout(function () {
								assert.equal(request.info.name, inFileName);
								streamEqual(request.stream, fs.createReadStream(inFileName), makeEqualizer(done));
							}, 50);
						} catch (e) {
							done(e);
						}
					}, function () {
						done(`start failed`);
					});
				});
			});
		});
	});

	describe('out', function (done) {
		tmp.file(function (err, outFileName) {
			const fileStep = file.createInstance(manager, undefined, {
				name: "myStep",
				type: "kronos-file",
				fileName: outFileName,
				endpoints: {
					"inout": {
						"in": true,
						"passive": true
					}
				}
			});
			const testEndpoint = BaseStep.createEndpoint('test', {
				"out": true,
				"active": true
			});

			testEndpoint.connect(fileStep.endpoints.inout);


			describe('static', function () {
				testStep.checkStepStatic(manager, fileStep);
			});

			/* TODO why we get  Error: test:out:active: There was no 'inPassiveGenerator' set, so it could not return any
						describe('live-cycle', function () {
							testStep.checkStepLivecycle(manager, fileStep, function (step, state, livecycle, done) {
								done();
							});
						});
			*/

			describe('start', function () {
				it(`should create a file ${outFileName}`, function () {
					fileStep.start().then(function (step) {
						try {
							const myStream = fs.createReadStream(inFileName);
							testEndpoint.send({
								info: {
									name: inFileName
								},
								stream: myStream
							});

							assert.equal(fileStep.state, 'running');

							myStream.on('end', function () {
								setTimeout(() =>
									streamEqual(fs.createReadStream(outFileName), fs.createReadStream(inFileName), makeEqualizer(
										done), 200));
							});
						} catch (e) {
							done(e);
						}
					}, done);
				});
			});
		});
	});
});
