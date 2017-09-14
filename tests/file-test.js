/* global describe, it, xit, before, after */
/* jslint node: true, esnext: true */

'use strict';

const fs = require('fs'),
	path = require('path'),
	chai = require('chai'),
	assert = chai.assert,
	expect = chai.expect,
	should = chai.should(),
	streamEqual = require('stream-equal'),
	tmp = require('tmp'),
	ksm = require('kronos-service-manager'),
	endpoint = require('kronos-endpoint'),
	testStep = require('kronos-test-step'),
	BaseStep = require('kronos-step');

const inFileName = path.join(__dirname, 'fixtures', 'file1.txt');


let manager;

before(done => {
	ksm.manager({}, [require('../file')]).then(m => {
		manager = m;
		done();
	});
});


const makeEqualizer = done =>
	function equalizer(err, equal) {
		assert(equal, 'stream is equal to file content');
		done();
	};

describe('file', () => {
	describe('out', done => {
		tmp.file((err, outFileName) => {
			const file = manager.steps['kronos-file'];

			const fileStep = file.createInstance({
				name: 'myStep',
				type: 'kronos-file',
				fileName: outFileName
			}, manager);

			const testEndpoint = new endpoint.SendEndpoint('testOut');

			testEndpoint.connected = fileStep.endpoints.in;

			describe('static', () => {
				testStep.checkStepStatic(manager, fileStep);
			});

			describe('start', () => {
				it(`should create a file ${outFileName}`, () => {
					fileStep.start().then(step => {
						try {
							const myStream = fs.createReadStream(inFileName);
							testEndpoint.send({
								info: {
									name: inFileName
								},
								payload: myStream
							});

							assert.equal(fileStep.state, 'running');

							myStream.on('end', () => {
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
