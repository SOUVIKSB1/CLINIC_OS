const mongoose = require('mongoose');
const BillProvider = require('../models/billProvider');
const Transaction = require('../models/transaction');
const User = require('../models/user');

const listProviders = async (req, res) => {
  try {
    const providers = await BillProvider.find().lean();
    return res.json({ providers, ok: true, color: 'neutral' });
  } catch (err) {
    return res.status(500).json({ ok: false, color: 'red', message: 'Failed to list providers' });
  }
};

const payBill = async (req, res) => {
  const user = req.user;
  const { providerCode, consumerNumber, amount } = req.body;

  if (!providerCode || !consumerNumber || amount == null) {
    return res.status(400).json({ ok: false, color: 'red', message: 'Missing fields' });
  }

  // Validate amount
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      ok: false,
      color: 'red',
      message: 'Bill amount must be a positive number',
      reason: Number.isNaN(numericAmount) ? 'invalidAmount' : 'nonPositiveAmount'
    });
  }

  try {
    const provider = await BillProvider.findOne({ code: providerCode });
    if (!provider) {
      return res.status(400).json({ ok: false, color: 'red', message: 'Invalid provider' });
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const u = await User.findById(user._id).session(session);
      if (!u) {
        throw new Error('User not found');
      }

      if (u.balance < numericAmount) {
        throw new Error('Insufficient balance');
      }

      u.balance -= numericAmount;
      await u.save({ session });

      const tx = new Transaction({
        type: 'bill',
        from: u._id,
        to: null,
        amount: numericAmount,
        meta: { provider: provider.code, consumerNumber }
      });

      await tx.save({ session });

      await session.commitTransaction();
      session.endSession();

      return res.json({
        ok: true,
        color: 'green',
        message: 'Bill paid successfully',
        transaction: tx,
        showConfirmation: true
      });
    } catch (innerErr) {
      try { await session.abortTransaction(); } catch (_) {}
      session.endSession();
      return res.status(400).json({ ok: false, color: 'red', message: innerErr.message || 'Payment failed' });
    }
  } catch (err) {
    return res.status(500).json({ ok: false, color: 'red', message: 'Server error' });
  }
};

module.exports = { listProviders, payBill };
