import { EventEmitter } from 'events';
import _package from './package.json';
import WebServer from './web';
import log from './logger';
import { exists, readJson } from 'fs-promise';
import glob from 'glob';
import chalk from 'chalk';
import mongoose from 'mongoose';
import Program from './models/program';
import Channel from './models/channel';
import moment from 'moment';

class Scheduler extends EventEmitter {
    static CONFIG_PATH = './config.local.json';
    config = null;
    web = null;
    providers = [];
    programMap = new Map();
    ranPrograms = [];

    constructor() {
        super();
        this.init();
    }

    async add(model) {
        //grab last program, sorted by end time
        const latest = await Program.findOne().sort({ end: -1 }).exec();

        //check if it exists and if it hasn't ended already
        if (latest && moment(latest.end).isAfter(moment())) {
            //this program starts at the end time of the previous one
            model.start = latest.end;
        } else {
            //start right now
            model.start = new Date();
        }
        model.end = moment(model.start).add(model.length).toDate();

        await model.save();
    }

    async poll() {
        for(let channel of await Channel.find()) {
            const program = await Program.findOneAndUpdate({
                channel: channel.name,
                broadcasted: false,
                start: { $lte: new Date() },
                end: { $gte: new Date() }
            }, {
                broadcasted: true
            });
            
            if(program) {
                log.debug('Started', program.title, 'on channel', program.channel);
                this.emit('start', program.channel, program);
            }
        }
    }

    async init() {
        try {
            const { config } = _package;
            this.config = config;
            if (await exists(Scheduler.CONFIG_PATH)) {
                this.config = {
                    ...this.config,
                    ...await readJson(Scheduler.CONFIG_PATH)
                };
            }

            this.providers = glob.sync('./providers/*.js').map(file => require(file).default);
            log.debug('loaded providers:', ...this.providers.map(provider => chalk.red(provider.name)));

            for (let model of glob.sync('./models/*.js')) {
                require(model);
            }

            mongoose.Promise = global.Promise;
            mongoose.connect('mongodb://localhost/pseudo');

            this.web = new WebServer(this);

            setInterval(() => this.poll(), 1000);
        } catch (ex) {
            log.error(ex);
        }
    }
}

new Scheduler();