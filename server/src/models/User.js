import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  businessName: { type: String, default: 'My Store' },
  paypal: {
    connected: { type: Boolean, default: false },
    connectedAt: Date,
    lastSync: Date,
    lastError: String,
  },
}, { timestamps: true });
export default mongoose.model('User', schema);
