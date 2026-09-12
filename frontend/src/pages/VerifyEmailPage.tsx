import React from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { VerifyEmailForm } from '../components/auth/VerifyEmailForm';

export const VerifyEmailPage: React.FC = () => {
  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We sent a verification link to your email."
    >
      <VerifyEmailForm />
    </AuthLayout>
  );
};
