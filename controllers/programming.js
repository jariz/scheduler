import { Router } from 'express';
import emoji from 'node-emoji';
import Program from '../models/program';
import moment from 'moment';
import channelExistenceError from '../util/channelExistenceError';

export default class ProgrammingController {
    router = Router();
    scheduler = null;
    app = null;

    constructor(app, scheduler) {
        this.app = app;
        this.scheduler = scheduler;

        app.use('/programming', this.router);

        this.router.put('/:channel', (...args) => this.put(...args));
        this.router.get('/:channel', (...args) => this.get(...args));
        this.router.get('/:channel/current', (...args) => this.getCurrent(...args));
    }

    async put(req, res, next) {
        try {
            req.checkParams('channel').notEmpty().isAlpha();
            req.checkBody('url', 'Url is not a valid url or not supported').notEmpty().isURL().isSupported();
            const errors = [...req.validationErrors(), ...await channelExistenceError(req.params.channel)];

            if (errors.length) {
                res.status(400).send({
                    errors
                });
            } else {
                const Provider = this.scheduler.providers.find(provider => provider.supportsUrl(req.body.url)),
                    provider = new Provider(req.body.url, this.scheduler),
                    programs = await provider.toModels();

                for (let program of programs) {
                    program.channel = req.params.channel;
                    await this.scheduler.add(program);
                }

                res.send(emoji.get('the_horns'));
            }
        } catch (ex) {
            next(ex);
        }
    }

    async get(req, res, next) {
        try {
            req.checkParams('channel').notEmpty().isAlpha();
            req.checkQuery('page').optional().isInt({ min: 1 });

            const errors = [...req.validationErrors(), ...await channelExistenceError(req.params.channel)];
            if (errors.length) {
                res.status(400).send({
                    errors
                });
            } else {
                const { channel } = req.params;
                const { page } = req.query;
                res.send(await Program.paginate({ channel, end: { $gte: new Date() } }, { page }));
            }
        }
        catch (ex) {
            next(ex);
        }
    }

    async getCurrent(req, res, next) {
        try {
            req.checkParams('channel').notEmpty().isAlpha();

            const errors = [...req.validationErrors(), ...await channelExistenceError(req.params.channel)];
            if (errors.length) {
                res.status(400).send({
                    errors
                });
            } else {
                const { channel } = req.params;
                let program = await Program.findOne({
                    channel,
                    start: { $lte: new Date() },
                    end: { $gte: new Date() }
                })
                    .lean()
                    .exec();
                
                if(program) {
                    // calculate current position in ms based on start time 
                    // (client side can do this, but this is more convenient for client)
                    program.position = moment().diff(program.start, 'ms');

                    res.send(program);
                } else {
                    res.status(404).send();
                }
            }
        }
        catch (ex) {
            next(ex);
        }
    }
}