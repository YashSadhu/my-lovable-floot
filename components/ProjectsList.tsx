import React from 'react';
import type { Selectable } from 'kysely';
import type { Projects } from '../helpers/schema';
import { Skeleton } from './Skeleton';
import { AlertTriangle, Inbox } from 'lucide-react';
import styles from './ProjectsList.module.css';

interface ProjectsListProps {
  projects: Selectable<Projects>[] | undefined;
  isLoading: boolean;
  error: unknown;
}

export const ProjectsList = ({ projects, isLoading, error }: ProjectsListProps) => {
  if (isLoading) {
    return (
      <div className={styles.container}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <Skeleton style={{ height: '1.25rem', width: '80%' }} />
            <Skeleton style={{ height: '1rem', width: '50%', marginTop: 'var(--spacing-2)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.stateContainer} ${styles.errorContainer}`}>
        <AlertTriangle size={24} />
        <p>Failed to load projects.</p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className={styles.stateContainer}>
        <Inbox size={24} />
        <p>No saved projects yet.</p>
        <span>Your saved projects will appear here.</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {projects.map(project => (
        <div key={project.id} className={styles.projectItem}>
          <h4 className={styles.projectTitle}>{project.title}</h4>
          <p className={styles.projectDescription}>{project.description || 'No description'}</p>
          <span className={styles.projectDate}>
            {new Date(project.createdAt!).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
};