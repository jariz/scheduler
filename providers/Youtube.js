// import getYoutubeID from 'get-youtube-id';
import Google from 'googleapis';
import Program from '../models/program';
import { URL } from 'url';
import moment from 'moment';
import logger from '../logger';

export default class Youtube {
    static title = 'YouTube';
    static appId = 'YouTube';
    static supportsUrl(url: string) {
        return /https?:\/\/(www\.)?(youtube\.com|youtu.be)/g.test(url);
    }
    
    videoId: string;
    playlistId: string;
    scheduler;
    
    constructor(url: string, scheduler) {
        this.scheduler = scheduler;
        // this.videoId = getYoutubeID(url);
        const parsedUrl = new URL(url);
        this.videoId = parsedUrl.searchParams.get('v'); 
        this.playlistId = parsedUrl.searchParams.get('list'); 
        
        Google.options({ auth: this.scheduler.config.youtube.key });
        this.yt = Google.youtube('v3');
    }
    
    async toModels() {
        const models = [], getVideo = (videoId, part='snippet,contentDetails') => {
            return new Promise((resolve, reject) => this.yt.videos.list({
                part,
                id: videoId
            }, (error, response) => error ? reject(error) : resolve(response)));
        };
        let items = [];
        
        if(this.videoId) {
            const data = await getVideo(this.videoId);
            const { items: videoItems } = data;
            items = [...items, ...videoItems];
        } else if(this.playlistId) {
            const data = await new Promise((resolve, reject) => this.yt.playlistItems.list({
                part: 'contentDetails',
                playlistId: this.playlistId,
                maxResults: 50 // we're not gonna get any other pages than this, else we'll fuck up our quota
            }, (error, response) => error ? reject(error) : resolve(response)));
            const { items: playlistItems } = data;
            let videos = [];
            for (let { contentDetails: { videoId } } of playlistItems) {
                const data = await getVideo(videoId);
                const { items: videoItems } = data;
                videos.push(...videoItems);
            }
            
            items = [...items, ...videos];
        }
        if(items.length === 0) {
            throw new Error('No matching videos found associated with this url.');
        }
        
        for(let item of items) {
            const program = new Program(),
                { contentDetails: { duration }, snippet: { thumbnails, title } } = item,
                period = moment.duration(duration);
            
            program.title = title;
            program.length = period.asMilliseconds();
            program.thumbnail = Object.keys(thumbnails).length ? thumbnails[Object.keys(thumbnails).reverse()[0]].url : null;
            program.url = 'https://www.youtube.com/watch?v=' + item.id;
            models.push(program);
        }
        
        return models;
    }
}