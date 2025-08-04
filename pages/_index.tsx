import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '../components/Button';
import { ArrowRight, Code, Zap, Eye } from 'lucide-react';
import styles from './_index.module.css';

const IndexPage = () => {
  const features = [
    {
      icon: <Zap size={24} className={styles.featureIcon} />,
      title: 'AI-Powered Generation',
      description: 'Describe your ideal website in plain English. Our AI will bring your vision to life in seconds, generating the code and structure for you.',
    },
    {
      icon: <Eye size={24} className={styles.featureIcon} />,
      title: 'Instant Live Preview',
      description: 'See your generated website immediately. Tweak your prompts and regenerate until it\'s perfect, with a real-time preview of your creation.',
    },
    {
      icon: <Code size={24} className={styles.featureIcon} />,
      title: 'Full Code Access',
      description: 'Get complete access to the generated HTML, CSS, and JavaScript. Use it as a starting point, learn from it, or ship it directly.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Floot - Instant Website Generator</title>
        <meta
          name="description"
          content="Generate and preview websites instantly with AI. Describe your idea, and we'll build it for you. Perfect for prototyping, learning, and rapid development."
        />
      </Helmet>
      <div className={styles.pageContainer}>
        <main className={styles.mainContent}>
          <section className={styles.hero}>
            <div className={styles.heroContent}>
              <h1 className={styles.heroHeadline}>
                Go from idea to website.
                <br />
                <span className={styles.heroHighlight}>Instantly.</span>
              </h1>
              <p className={styles.heroDescription}>
                Describe the website you want to build. Our AI-powered generator creates the code and a live preview in seconds. The future of rapid prototyping is here.
              </p>
              <div className={styles.heroActions}>
                <Button asChild size="lg" className={styles.ctaButton}>
                  <Link to="/generator">
                    Start Generating <ArrowRight size={20} />
                  </Link>
                </Button>
                <p className={styles.ctaSubtext}>Free to start. No sign-up required.</p>
              </div>
            </div>
            <div className={styles.heroImageContainer}>
              <img 
                src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80" 
                alt="Code on a laptop screen" 
                className={styles.heroImage}
              />
               <div className={styles.heroImageOverlay}></div>
            </div>
          </section>

          <section className={styles.featuresSection}>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  {feature.icon}
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default IndexPage;