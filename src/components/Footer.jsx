import { FaXTwitter, FaGithub } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

const socialLinks = [
  { name: 'Twitter', url: 'https://x.com/SkewMarket', icon: FaXTwitter },
  { name: 'GitHub', url: 'https://github.com/SkewMarket/skewmarket', icon: FaGithub },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-skew-border py-10 lg:py-12 px-4 lg:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {socialLinks.map((link) => {
            const IconComponent = link.icon;
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-skew-bg-secondary flex items-center justify-center text-skew-text-secondary hover:bg-skew-accent hover:text-white transition-colors"
                aria-label={link.name}
              >
                <IconComponent className="w-4 h-4" />
              </a>
            );
          })}
        </div>

        <div className="pt-6 border-t border-skew-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-skew-text-tertiary">&copy; 2026 SkewMarket. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-xs text-skew-text-secondary hover:text-skew-text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-skew-text-secondary hover:text-skew-text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
