import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate';

const schema = mongoose.Schema({
    name: String
});

schema.plugin(mongoosePaginate);

export default mongoose.model('channel', schema);