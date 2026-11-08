import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  source: { type: String, default: 'csv' },
});
schema.index({ user: 1, name: 1 }, { unique: true });
export default mongoose.model('Product', schema);
