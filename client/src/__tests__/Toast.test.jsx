import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastContainer } from '../shared/components/Toast';

describe('ToastContainer Component', () => {
  it('returns null when there are no toasts', () => {
    const { container } = render(<ToastContainer toasts={[]} removeToast={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders active toasts with title and message', () => {
    const mockToasts = [
      {
        id: 'toast-1',
        type: 'success',
        title: 'Action Succeeded',
        message: 'Your verification was confirmed.',
        duration: 5000,
      },
    ];

    render(<ToastContainer toasts={mockToasts} removeToast={() => {}} />);

    expect(screen.getByText('Action Succeeded')).toBeInTheDocument();
    expect(screen.getByText('Your verification was confirmed.')).toBeInTheDocument();
  });

  it('triggers dismiss when close button is clicked', async () => {
    vi.useFakeTimers();
    const mockRemove = vi.fn();
    const mockToasts = [
      {
        id: 'toast-2',
        type: 'error',
        message: 'Network disconnected',
        duration: 5000,
      },
    ];

    render(<ToastContainer toasts={mockToasts} removeToast={mockRemove} />);

    const closeBtn = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(mockRemove).toHaveBeenCalledWith('toast-2');
    vi.useRealTimers();
  });
});
