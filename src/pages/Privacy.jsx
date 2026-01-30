import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-skew-bg">
      <Header />

      <main className="pt-20 lg:pt-24 pb-16 lg:pb-24 px-4 lg:px-6">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="text-skew-text-tertiary text-sm hover:text-skew-text-primary transition-colors mb-8 inline-block">
            ← Back to Home
          </Link>

          <h1 className="text-3xl lg:text-4xl font-semibold text-skew-text-primary tracking-tight mb-8">Privacy Policy</h1>
          <p className="text-skew-text-tertiary mb-8">Last updated: January 15, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">1. Introduction</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                Welcome to SkewMarket. We respect your privacy and are committed to protecting your personal data.
                This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">2. Information We Collect</h2>
              <p className="text-skew-text-secondary leading-relaxed mb-4">We may collect the following types of information:</p>
              <ul className="list-disc pl-6 text-skew-text-secondary space-y-2">
                <li>Usage data (pages visited, time spent, interactions)</li>
                <li>Device information (browser type, operating system)</li>
                <li>IP address and location data</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">3. How We Use Your Information</h2>
              <p className="text-skew-text-secondary leading-relaxed mb-4">We use the collected information to:</p>
              <ul className="list-disc pl-6 text-skew-text-secondary space-y-2">
                <li>Provide and maintain our service</li>
                <li>Improve user experience</li>
                <li>Analyze usage patterns and trends</li>
                <li>Send notifications about new deals (with your consent)</li>
                <li>Ensure platform security</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">4. Data Sharing</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                We do not sell your personal data. We may share anonymized, aggregated data with third parties
                for analytics purposes. We may also share data when required by law or to protect our rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">5. Cookies</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                We use cookies to enhance your experience, remember your preferences, and analyze site traffic.
                You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">6. Data Security</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                We implement appropriate security measures to protect your data. However, no method of transmission
                over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">7. Your Rights</h2>
              <p className="text-skew-text-secondary leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-skew-text-secondary space-y-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">8. Contact Us</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:privacy@skewmarket.com" className="text-skew-accent hover:underline">privacy@skewmarket.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
