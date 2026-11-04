import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GearSix } from '@phosphor-icons/react';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Field } from './Field';
import { ConfirmDialog } from './ConfirmDialog';
import { Dialog } from './Dialog';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';

describe('UI Component Kit', () => {
  it('IconButton has accessible name and renders tooltip trigger', () => {
    render(
      <IconButton label="Settings">
        <GearSix size={18} />
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Settings');
  });

  it('Field wires error to aria-describedby and sets aria-invalid', () => {
    render(
      <Field
        label="Email address"
        id="email-input"
        hint="We will send a sign-in code."
        error="Please enter a valid email."
      />,
    );

    const input = screen.getByLabelText('Email address');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('Please enter a valid email.');
    expect(describedBy).toContain(errorMsg.id);
  });

  it('ConfirmDialog calls onConfirm when action is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Delete page"
        description="Are you sure you want to delete this page?"
        confirmText="Delete page"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    expect(screen.getByText('Delete page', { selector: 'h2' })).toBeInTheDocument();
    expect(
      screen.getByText('Are you sure you want to delete this page?'),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Delete page' });
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleCancel).not.toHaveBeenCalled();
  });

  it('ConfirmDialog closes on Esc without calling onConfirm', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete page"
        description="Are you sure?"
        confirmText="Delete page"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />,
    );

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(handleCancel).toHaveBeenCalledTimes(1);
      expect(handleConfirm).not.toHaveBeenCalled();
    });
  });

  it('Button supports loading state with aria-busy and disabled state', () => {
    render(
      <Button loading variant="primary">
        Submit
      </Button>,
    );

    const button = screen.getByRole('button', { name: /Submit/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });

  it('Dialog renders with required title and closes via close button', async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    render(
      <Dialog
        open={true}
        onOpenChange={handleOpenChange}
        title="My Dialog"
        description="Dialog description text"
      >
        <p>Dialog body content</p>
      </Dialog>,
    );

    expect(screen.getByText('My Dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog body content')).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: 'Close dialog' });
    await user.click(closeBtn);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('ErrorState displays message and calls onRetry on button click', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(<ErrorState message="Network error" onRetry={handleRetry} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: 'Try again' });
    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('EmptyState renders title and body', () => {
    render(
      <EmptyState
        title="No notes yet"
        body="Create your first note to get started."
      />,
    );

    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first note to get started.'),
    ).toBeInTheDocument();
  });
});
