import Channel from '../models/channel';

export default async (name: string, msg = 'Channel doesn\'t exist', shouldExist = true) => {
    const channel = await Channel.findOne({name});
    
    if (!channel && shouldExist || !!channel && !shouldExist) {
        return [{
            param: 'channel',
            msg,
            value: name
        }];
    } else {
        return [];
    }
};