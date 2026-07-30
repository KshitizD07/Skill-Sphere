import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NotFound from '../pages/NotFound';
import { useNavigate } from 'react-router-dom';

// Mock the react-router-dom hooks so we don't need a real Router context
vi.mock('react-router-dom', () => {
  return {
    useNavigate: vi.fn(),
  };
});

describe('NotFound Page', () => {
  it('renders the 404 message and handles the return button click', () => {
    const mockNavigate = vi.fn();
    useNavigate.mockReturnValue(mockNavigate);

    render(<NotFound />);

    // Check if the 404 text is present
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('SIGNAL_LOST')).toBeInTheDocument();

    // Check the button click
    const button = screen.getByText('RETURN_TO_GRID');
    fireEvent.click(button);

    // Verify it attempted to navigate to the home route
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
