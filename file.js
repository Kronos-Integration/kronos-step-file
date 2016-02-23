/* jslint node: true, esnext: true */

"use strict";

const fs = require('fs');

exports.registerWithManager = manager =>
	manager.registerStep(Object.assign({}, require('kronos-step').Step, {
		name: "kronos-file",
		endpoints: {
			"in": {
				"in": true
			}
		},
		initialize(manager, name, conf, properties) {
			const fileName = conf.fileName;

			properties._start = {
				value: function () {
					this.endpoints.in.receive = request => {
						request.payload.pipe(fs.createOutputStream(fileName));
						return Promise.resolve();
					};
				}
			};

			return this;
		}
	}));
