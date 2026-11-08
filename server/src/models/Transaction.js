import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  import: { type: mongoose.Schema.Types.ObjectId, ref: 'DatasetImport' },
  transactionId: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['sale', 'refund'], default: 'sale' },
  productName: { type: String, default: 'Unknown product' },
  quantity: { type: Number, default: 1 },
  gross: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  fee: { type: Number, default: 0 },
  net: { type: Number, default: 0 },
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
  refundAmount: { type: Number, default: 0 },
  source: { type: String, enum: ['demo', 'csv', 'paypal-sandbox'], default: 'csv' },
}, { timestamps: true });
schema.index({ user: 1, transactionId: 1 }, { unique: true });
schema.index({ user: 1, date: 1 });
export default mongoose.model('Transaction', schema);
