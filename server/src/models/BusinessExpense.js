import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Other' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  source: { type: String, default: 'manual' },
});
export default mongoose.model('BusinessExpense', schema);
