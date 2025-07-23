import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DownArrowButton from '../DownArrowButton';

describe('DownArrowButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible is true', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    expect(button).toBeInTheDocument();
  });

  it('should not be visible when visible is false', () => {
    render(
      <DownArrowButton
        visible={false}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    expect(button).toBeInTheDocument();
    expect(button.parentElement).toHaveStyle({ opacity: 0 });
  });

  it('should call onClick when clicked', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    expect(button).toBeDisabled();
  });

  it('should not call onClick when disabled and clicked', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    fireEvent.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should have correct styling when visible', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    const container = button.parentElement;

    expect(container).toHaveStyle({
      position: 'absolute',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      opacity: 1,
      transform: 'translateY(0)'
    });

    expect(button).toHaveStyle({
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      backgroundColor: '#007bff'
    });
  });

  it('should have disabled styling when disabled', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    expect(button).toHaveStyle({
      backgroundColor: '#666'
    });
  });

  it('should have smooth transitions', () => {
    render(
      <DownArrowButton
        visible={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /scroll to bottom/i });
    const container = button.parentElement;

    expect(container).toHaveStyle({
      transition: 'opacity 0.3s ease, transform 0.3s ease'
    });

    expect(button).toHaveStyle({
      transition: 'background-color 0.2s ease, transform 0.2s ease'
    });
  });
}); 