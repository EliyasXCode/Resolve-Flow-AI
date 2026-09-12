import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email address',
      ],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hash by default
    },
    role: {
      type: String,
      enum: ['customer', 'support', 'admin'],
      default: 'customer',
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0, // Allows instant invalidation of issued tokens if password changes or account is revoked
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password candidate
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcryptjs.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (plainPassword) {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(plainPassword, salt);
};

export const User = mongoose.model('User', userSchema);
export default User;
