import Scheduler from './scheduler';
import express from 'express';
import _package from './package.json';
import glob from 'glob';
import bodyParser from 'body-parser';
import expressValidator from 'express-validator';
import http from 'http';
import socketio from 'socket.io';
import logger from './logger';

export default class WebServer {
    app = null;
    io = null;
    server = null;
    scheduler = null;
    
    constructor(scheduler: Scheduler) {
        this.scheduler = scheduler;
        
        const { name, version } = _package;
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketio(this.server);
        
        this.scheduler.on('start', (...args) => this.startProgram(...args));

        this.app.use(bodyParser.json());
        this.app.use(expressValidator({
            customValidators: {
                isSupported: value => scheduler.providers.some(provider => provider.supportsUrl(value))
            }
        }));
        
        const controllers = glob.sync('./controllers/*.js');
        for(let controller of controllers) {
            const instance = require(controller).default;
            new instance(this.app, scheduler);
        }
        
        this.app.listen(scheduler.config.port, () => {
            logger.info(`${name} ${version} listening at ${scheduler.config.port}`);
        });
    }
    
    startProgram(channel, program) {
        logger.info('starting', program, 'on', channel);
        const ns = this.io.of(channel);
        ns.emit('start', program);
    }
}