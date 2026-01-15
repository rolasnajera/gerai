import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// A simple component for testing
const TestComponent = ({ label }: { label: string }) => {
  return <button>{label}</button>;
};

describe('TestComponent', () => {
  it('renders correctly', () => {
    render(<TestComponent label="Click me" />);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
