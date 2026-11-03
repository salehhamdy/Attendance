import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, Button, ToggleSwitch, StatusBadge, Modal, StatCard } from './index.js';

describe('Shared UI Module Components', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('Card', () => {
    it('renders children with card styling', () => {
      render(<Card className="custom-card">Card Content</Card>);
      const el = screen.getByText('Card Content');
      expect(el).toHaveClass('card', 'custom-card');
    });
  });

  describe('Button', () => {
    it('renders primary button by default and triggers click', async () => {
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Click Me</Button>);
      const btn = screen.getByRole('button', { name: 'Click Me' });
      expect(btn).toHaveClass('btn', 'btn-primary');
      await userEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('renders ghost variant and respects disabled attribute', async () => {
      const onClick = vi.fn();
      render(<Button variant="ghost" disabled onClick={onClick}>Disabled Button</Button>);
      const btn = screen.getByRole('button', { name: 'Disabled Button' });
      expect(btn).toHaveClass('btn-ghost');
      expect(btn).toBeDisabled();
      await userEvent.click(btn);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('ToggleSwitch', () => {
    it('renders an accessible switch with checked state and toggles on click', async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <ToggleSwitch label="test switch" checked={false} onChange={onChange} />
      );
      const toggle = screen.getByRole('switch', { name: 'test switch' });
      expect(toggle).not.toHaveClass('on');
      expect(toggle).toHaveAttribute('aria-checked', 'false');

      await userEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith(true);

      rerender(<ToggleSwitch label="test switch" checked={true} onChange={onChange} />);
      expect(toggle).toHaveClass('on');
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });

    it('does not trigger onChange when disabled', async () => {
      const onChange = vi.fn();
      render(<ToggleSwitch label="disabled switch" disabled checked={false} onChange={onChange} />);
      const toggle = screen.getByRole('switch', { name: 'disabled switch' });
      expect(toggle).toBeDisabled();
      await userEvent.click(toggle);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('StatusBadge', () => {
    it('renders with status specific color classes', () => {
      const { rerender } = render(<StatusBadge status="approved" />);
      expect(screen.getByText('approved')).toHaveClass('badge', 'badge-approved');

      rerender(<StatusBadge status="rejected" />);
      expect(screen.getByText('rejected')).toHaveClass('badge', 'badge-rejected');

      rerender(<StatusBadge status="pending" />);
      expect(screen.getByText('pending')).toHaveClass('badge', 'badge-pending');
    });

    it('supports custom child label', () => {
      render(<StatusBadge status="approved">In Geofence</StatusBadge>);
      expect(screen.getByText('In Geofence')).toHaveClass('badge-approved');
    });
  });

  describe('Modal', () => {
    it('renders modal dialog with title and children', () => {
      render(
        <Modal title="Test Modal" onClose={vi.fn()}>
          <p>Modal Body</p>
        </Modal>
      );
      expect(screen.getByRole('dialog', { name: 'Test Modal' })).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal Body')).toBeInTheDocument();
    });

    it('calls onClose when close button or overlay is clicked', async () => {
      const onClose = vi.fn();
      render(
        <Modal title="Close Test" onClose={onClose}>
          <p>Body</p>
        </Modal>
      );
      const closeBtn = screen.getByRole('button', { name: /close modal/i });
      await userEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);

      const overlay = screen.getByRole('dialog', { name: 'Close Test' });
      await userEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('StatCard', () => {
    it('renders stat card with title, value, sub and semantic variant', () => {
      render(
        <StatCard
          variant="green"
          title="Green Points"
          value="27"
          sub="Early check-in rewards"
        />
      );
      expect(screen.getByText('Green Points')).toBeInTheDocument();
      expect(screen.getByText('27')).toBeInTheDocument();
      expect(screen.getByText('Early check-in rewards')).toBeInTheDocument();
    });
  });
});
