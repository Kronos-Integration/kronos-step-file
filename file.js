/* jslint node: true, esnext: true */

'use strict';

const fs = require('fs');

exports.registerWithManager = manager =>
	manager.registerStep(Object.assign({}, require('kronos-step').Step, {
		name: 'kronos-file',
		endpoints: { in : { in : true
			}
		},
		initialize(manager, name, conf, properties) {
			const fileName = conf.fileName;

			properties._start = {
				value: function () {
					this.endpoints.in.receive = request => {
						return new Promise((fullfill, reject) => {
							const writer = fs.createWriteStream(fileName);
							request.payload.pipe(writer);

							request.payload.on('end', () => fullfill());
							writer.on('error', error => reject(error));
						});
					};
					return Promise.resolve();
				}
			};

			return this;
		}
	}));
