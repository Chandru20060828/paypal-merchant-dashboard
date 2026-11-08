import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  productName: { type: String, required: true },
  unitCost: { type: Number, default: 0, min: 0 },
  shippingCost: { type: Number, default: 0, min: 0 },
  source: { type: String, default: 'manual' },
});
schema.index({ user: 1, productName: 1 }, { unique: true });
export default mongoose.model('ProductCost', schema);
