import React from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

export const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
};
