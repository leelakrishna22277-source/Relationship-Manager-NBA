import { prisma } from '../config/db.js';
import { signToken, verifyPassword } from '../utils/auth.js';

export const authService = {
  /**
   * Authenticates user credentials, validates portal role match, and issues JWT.
   */
  async login({ email, password, role }) {
    if (!email || !password) {
      const error = new Error('Email and password are required.');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      throw error;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.rm.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Role check if provided in login request
    if (role && user.role !== role) {
      const correctTab = user.role === 'TEAM_LEAD' ? 'Team Lead Portal' : 'RM Console';
      const error = new Error(
        `Access denied: Account "${user.email}" is registered as ${user.role}. Please switch to the "${correctTab}" tab to sign in.`
      );
      error.statusCode = 401;
      error.code = 'ROLE_MISMATCH';
      throw error;
    }

    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const token = signToken({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
    });

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team_id: user.team_id,
    };

    return {
      user: userPayload,
      token,
    };
  },

  /**
   * Returns current authenticated user payload.
   */
  async getMe(user) {
    return user;
  },

  /**
   * Performs user logout confirmation.
   */
  async logout() {
    return {
      message: 'Successfully logged out.',
    };
  },
};

