import React from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <AuthLayout
      title="Login to your account"
      subtitle="Welcome back! Please enter your details to continue."
    >
      <LoginForm />
    </AuthLayout>
  );
};
