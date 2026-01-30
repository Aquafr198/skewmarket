import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Terms() {
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

          <h1 className="text-3xl lg:text-4xl font-semibold text-skew-text-primary tracking-tight mb-8">Terms of Service</h1>
          <p className="text-skew-text-tertiary mb-8">Last updated: January 15, 2026</p>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">1. Acceptance of Terms</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                By accessing and using SkewMarket, you agree to be bound by these Terms of Service.
                If you do not agree to these terms, please do not use our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">2. Description of Service</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                SkewMarket provides algorithmic analysis of prediction markets, including mispricing detection,
                confidence scoring, and deal identification. Our service aggregates publicly available data
                from platforms like Polymarket for informational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">3. Disclaimer</h2>
              <p className="text-skew-text-primary leading-relaxed font-medium mb-4">
                IMPORTANT: SkewMarket is NOT financial advice.
              </p>
              <ul className="list-disc pl-6 text-skew-text-secondary space-y-2">
                <li>All information is provided for educational and informational purposes only</li>
                <li>Predictions and scores are algorithmic estimates, not guarantees</li>
                <li>Past performance does not indicate future results</li>
                <li>You should conduct your own research before making any decisions</li>
                <li>We are not responsible for any losses incurred from using our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">4. User Responsibilities</h2>
              <p className="text-skew-text-secondary leading-relaxed mb-4">By using our service, you agree to:</p>
              <ul className="list-disc pl-6 text-skew-text-secondary space-y-2">
                <li>Use the platform only for lawful purposes</li>
                <li>Not attempt to manipulate or abuse the service</li>
                <li>Not reverse engineer or copy our algorithms</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Take full responsibility for your own trading decisions</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">5. Intellectual Property</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                All content, algorithms, designs, and trademarks on SkewMarket are owned by us or our licensors.
                You may not reproduce, distribute, or create derivative works without our express permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">6. Limitation of Liability</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                To the fullest extent permitted by law, SkewMarket shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, including loss of profits, data,
                or other intangible losses resulting from your use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">7. Data Accuracy</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                While we strive to provide accurate information, we cannot guarantee the accuracy,
                completeness, or timeliness of data displayed on our platform. Market data is sourced
                from third-party APIs and may be delayed or contain errors.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">8. Modifications</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Continued use of the
                platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">9. Termination</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                We may terminate or suspend your access to our service at any time, without prior notice,
                for conduct that we believe violates these Terms or is harmful to other users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-skew-text-primary mb-4">10. Contact</h2>
              <p className="text-skew-text-secondary leading-relaxed">
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@skewmarket.com" className="text-skew-accent hover:underline">legal@skewmarket.com</a>
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
