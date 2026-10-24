import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from '../shared/components/ErrorBoundary';

function ProblemChild() {
  throw new Error('Test exploded');
}

function SafeChild() {
  return <div>Safe child content</div>;
}

describe('ErrorBoundary Component', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe child content')).toBeInTheDocument();
  });

  it('renders error fallback UI when a child throws', () => {
    // Suppress console.error during this intentional failure test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    spy.mockRestore();
  });
});
