import React from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

export const ResetPasswordPage: React.FC = () => {
  return (
    <AuthLayout
      title="Set new password"
      subtitle="Please enter a strong new password for your account."
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
};
