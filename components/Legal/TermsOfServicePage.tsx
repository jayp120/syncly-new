import React from 'react';
import PageContainer from '../Layout/PageContainer';
import Card from '../Common/Card';

const TermsOfServicePage: React.FC = () => {
  return (
    <PageContainer title="Terms of Service">
      <Card>
        <div className="prose dark:prose-invert max-w-none text-text-primary dark:text-dark-text">
          <h2>Welcome to Syncly!</h2>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the
            Syncly application (the "Service") operated by us. Your access to and use of the Service is
            conditioned on your acceptance of and compliance with these Terms. These Terms apply to all
            visitors, users, and others who access or use the Service.
          </p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree
            with any part of the terms, then you may not access the Service.
          </p>

          <h3>2. License to Use</h3>
          <p>
            We grant you a revocable, non-exclusive, non-transferable, limited license to use the Service
            strictly in accordance with these Terms. You are not permitted to copy, modify, distribute, sell,
            or lease any part of our Service or included software, nor may you reverse-engineer or attempt
            to extract the source code of that software.
          </p>

          <h3>3. Intellectual Property</h3>
          <p>
            The Service and its original content (excluding content provided by users), features, and
            functionality are and will remain the exclusive property of Syncly and its licensors. The Service is
            protected by copyright, trademark, and other laws. Our code, branding, and trademarks may not be
            used in connection with any product or service without the prior written consent of Syncly.
          </p>
          
          <h3>4. Prohibited Conduct</h3>
          <p>
            You agree not to use the Service for any unlawful purpose or to engage in any activity that
            interferes with or disrupts the Service. Prohibited activities include, but are not limited to:
            (a) attempting to gain unauthorized access to the Service or its related systems; (b) uploading or
            transmitting viruses or any other type of malicious code; (c) engaging in any automated use of
            the system, such as using scripts to send comments or messages.
          </p>

          <h3>5. Disclaimer of Warranties</h3>
          <p>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties of any
            kind, whether express or implied, including, but not limited to, implied warranties of
            merchantability, fitness for a particular purpose, and non-infringement.
          </p>

          <h3>6. Limitation of Liability</h3>
          <p>
            In no event shall Syncly, nor its directors, employees, partners, agents, suppliers, or affiliates,
            be liable for any indirect, incidental, special, consequential or punitive damages, including without
            limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your
            access to or use of or inability to access or use the Service.
          </p>

          <h3>7. Changes to Terms</h3>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will
            try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a
            material change will be determined at our sole discretion.
          </p>

          <h3>8. Contact Us</h3>
          <p>
            If you have any questions about these Terms, please contact us at{' '}
            <a href="mailto:syncly19@gmail.com" className="text-primary hover:underline">syncly19@gmail.com</a> or call us at{' '}
            <a href="tel:+919270279703" className="text-primary hover:underline">9270279703</a>.
          </p>
        </div>
        <style>{`
          .prose h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #1e293b; /* slate-800 */
          }
          .dark .prose h2 {
            color: #f1f5f9; /* slate-100 */
          }
          .prose h3 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #334152; /* slate-700 */
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }
          .dark .prose h3 {
            color: #cbd5e1; /* slate-300 */
          }
          .prose p {
            line-height: 1.6;
            margin-bottom: 1em;
          }
        `}</style>
      </Card>
    </PageContainer>
  );
};

export default TermsOfServicePage;
