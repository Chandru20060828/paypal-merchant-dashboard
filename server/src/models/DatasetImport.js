import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['demo', 'csv', 'paypal-sandbox'], required: true },
  fileName: String,
  fileHash: String,
  rowCount: Number,
  imported: Number,
  duplicatesSkipped: { type: Number, default: 0 },
  rowsSkipped: { type: Number, default: 0 },
  mapping: Object,
}, { timestamps: true });
schema.index({ user: 1, fileHash: 1 }, { unique: true, partialFilterExpression: { fileHash: { $type: 'string' } } });
export default mongoose.model('DatasetImport', schema);
