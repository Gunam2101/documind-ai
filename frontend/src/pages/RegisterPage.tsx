import React from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

export const RegisterPage: React.FC = () => {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your AI-powered document search experience."
      taglineHeading="Turn your documents into an AI knowledge base."
    >
      <RegisterForm />
    </AuthLayout>
  );
};
