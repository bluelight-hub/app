import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from '../alert.atom';

describe('Alert Atom', () => {
  it('should render with default role "status" for info status', () => {
    render(<Alert status="info" title="Info" />);
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Info');
  });

  it('should render with role "alert" for error status', () => {
    render(<Alert status="error" title="Error" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Error');
  });

  it('should render with role "status" for warning status', () => {
    render(<Alert status="warning" title="Warning" />);
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Warning');
  });

  it('should render with role "status" for success status', () => {
    render(<Alert status="success" title="Success" />);
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Success');
  });

  it('should allow overriding the role', () => {
    render(<Alert status="error" title="Quiet Error" role="status" />);
    const alert = screen.getByRole('status');
    expect(alert).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
