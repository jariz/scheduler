import { Router } from 'express';
import emoji from 'node-emoji';
import Channel from '../models/channel';
import channelExistenceError from '../util/channelExistenceError';

/**
 * at some point there should probably be some right management in here too :D
 */

export default class ChannelController {
    router = Router();
    scheduler = null;
    app = null;

    constructor(app, scheduler) {
        this.app = app;
        this.scheduler = scheduler;

        app.use('/channel', this.router);

        this.router.put('/', (...args) => this.put(...args));
        this.router.get('/', (...args) => this.get(...args));
    }

    async get(req, res, next) {
        try {
            req.checkQuery('page').optional().isInt({ min: 1 });

            const errors = req.validationErrors();
            if (errors.length) {
                res.status(400).send({
                    errors
                });
            } else {
                const { channel } = req.params;
                const { page } = req.query;
                res.send(await Channel.paginate({ channel }, { page }));
            }
        } catch (ex) {
            next(ex);
        }
    }

    async put(req, res, next) {
        try {
            req.checkBody('name', 'Invalid Channel name').notEmpty().isAlpha();
            const errors = [...req.validationErrors(), ...await channelExistenceError(req.body.name, 'Channel already exists', false)];

            if (errors.length) {
                res.status(400).send({
                    errors
                });
            } else {
                const channel = new Channel();
                channel.name = req.body.name;
                await channel.save();

                res.send(emoji.get('the_horns'));
            }
        } catch (ex) {
            next(ex);
        }
    }
}