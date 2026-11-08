import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { wrap, httpError } from '../utils/wrap.js';

const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u._id, name: u.name, email: u.email, businessName: u.businessName });

export const register = wrap(async (req, res) => {
  const { name, email, password, businessName } = req.body || {};
  if (!name || !email || !password) throw httpError(400, 'Name, email and password are required.');
  if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters.');
  if (await User.findOne({ email: email.toLowerCase() })) throw httpError(409, 'An account with this email already exists.');
  const user = await User.create({ name, email, businessName: businessName || undefined, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: pub(user) });
});

export const login = wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const user = email && (await User.findOne({ email: email.toLowerCase() }));
  if (!user || !(await bcrypt.compare(password || '', user.password))) throw httpError(401, 'Incorrect email or password.');
  res.json({ token: sign(user), user: pub(user) });
});

export const me = wrap(async (req, res) => res.json({ user: pub(req.user) }));
