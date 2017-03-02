import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate';

const schema = mongoose.Schema({
    url: String,
    title: String,
    thumbnail: String,
    length: Number,
    start: Date,
    end: Date,
    channel: String
});

schema.plugin(mongoosePaginate);

export default mongoose.model('program', schema);