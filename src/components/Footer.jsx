import { useState, useEffect } from 'react';
import { siteSettingsAPI } from '../lib/api';
import './Footer.css';

function Footer() {
  const [footerData, setFooterData] = useState({
    text: '© 2026 CKAnim. All rights reserved.',
    links: [],
  });

  useEffect(() => {
    const loadFooter = async () => {
      try {
        const response = await siteSettingsAPI.getOne('siteFooter');
        if (response.data.value) {
          const footer = JSON.parse(response.data.value);
          setFooterData({
            text: footer.text || '',
            links: footer.links || [],
          });
        }
      } catch (error) {
        console.error('加载页脚信息失败:', error);
      }
    };
    loadFooter();
  }, []);

  return (
    <footer className="footer">
      <div className="footer-content">
        {footerData.text && (
          <div className="footer-text">{footerData.text}</div>
        )}
        {footerData.links && footerData.links.length > 0 && (
          <div className="footer-links">
            {footerData.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                className="footer-link"
                target={link.url.startsWith('http') ? '_blank' : '_self'}
                rel={link.url.startsWith('http') ? 'noopener noreferrer' : ''}
              >
                {link.text}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

export default Footer;
