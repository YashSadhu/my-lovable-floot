import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot } from 'lucide-react';
import styles from './SharedLayout.module.css';

export const SharedLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/generator', label: 'Generator' },
  ];

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <Bot size={24} className={styles.logoIcon} />
            <span className={styles.logoText}>Floot</span>
          </Link>
          <nav className={styles.nav}>
            {navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`${styles.navLink} ${location.pathname === link.href ? styles.active : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};