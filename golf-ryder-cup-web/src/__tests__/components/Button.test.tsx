/**
 * Button Component Tests
 *
 * Tests for tap, disabled states, loading states, and variants.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';
import { Plus, ArrowRight } from 'lucide-react';

describe('Button Component', () => {
    describe('Rendering', () => {
        it('renders with children', () => {
            render(<Button>Click me</Button>);
            expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
        });

        it('renders with default variant (primary)', () => {
            render(<Button>Primary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-[var(--masters)]');
        });

        it('renders secondary variant', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-[var(--surface-raised)]');
        });

        it('renders ghost variant', () => {
            render(<Button variant="ghost">Ghost</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-transparent');
        });

        it('renders danger variant', () => {
            render(<Button variant="danger">Danger</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-[var(--error)]');
        });

        it('renders outline variant', () => {
            render(<Button variant="outline">Outline</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('border-[color:var(--rule)]/40');
        });
    });

    describe('Sizes', () => {
        it('renders small size', () => {
            render(<Button size="sm">Small</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-11');
        });

        it('renders medium size (default)', () => {
            render(<Button size="md">Medium</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-12');
        });

        it('renders large size', () => {
            render(<Button size="lg">Large</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('h-14');
        });

        it('renders icon size', () => {
            render(<Button size="icon"><Plus /></Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('w-12');
        });
    });

    describe('Interactions', () => {
        it('calls onClick when clicked', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick}>Click me</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('does not call onClick when disabled', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick} disabled>Click me</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).not.toHaveBeenCalled();
        });

        it('does not call onClick when loading', () => {
            const handleClick = vi.fn();
            render(<Button onClick={handleClick} isLoading>Click me</Button>);

            fireEvent.click(screen.getByRole('button'));
            expect(handleClick).not.toHaveBeenCalled();
        });
    });

    describe('Disabled State', () => {
        it('applies disabled styles', () => {
            render(<Button disabled>Disabled</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveClass('disabled:opacity-50');
        });

        it('has pointer-events-none when disabled', () => {
            render(<Button disabled>Disabled</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('disabled:pointer-events-none');
        });
    });

    describe('Loading State', () => {
        it('shows loading spinner when isLoading', () => {
            render(<Button isLoading>Loading</Button>);
            // The Loader2 icon has an animate-spin class
            const spinner = document.querySelector('.animate-spin');
            expect(spinner).toBeInTheDocument();
        });

        it('shows loading text when provided', () => {
            render(<Button isLoading loadingText="Please wait...">Submit</Button>);
            expect(screen.getByText('Please wait...')).toBeInTheDocument();
        });

        it('hides children when loading without loadingText', () => {
            render(<Button isLoading>Submit</Button>);
            const submitText = screen.getByText('Submit');
            expect(submitText).toHaveClass('opacity-0');
        });

        it('disables button when loading', () => {
            render(<Button isLoading>Submit</Button>);
            expect(screen.getByRole('button')).toBeDisabled();
        });
    });

    describe('Icons', () => {
        it('renders left icon', () => {
            render(<Button leftIcon={<Plus data-testid="left-icon" />}>Add</Button>);
            expect(screen.getByTestId('left-icon')).toBeInTheDocument();
        });

        it('renders right icon', () => {
            render(<Button rightIcon={<ArrowRight data-testid="right-icon" />}>Next</Button>);
            expect(screen.getByTestId('right-icon')).toBeInTheDocument();
        });

        it('renders both icons', () => {
            render(
                <Button
                    leftIcon={<Plus data-testid="left-icon" />}
                    rightIcon={<ArrowRight data-testid="right-icon" />}
                >
                    Action
                </Button>
            );
            expect(screen.getByTestId('left-icon')).toBeInTheDocument();
            expect(screen.getByTestId('right-icon')).toBeInTheDocument();
        });

        it('hides icons when loading', () => {
            render(
                <Button
                    isLoading
                    leftIcon={<Plus data-testid="left-icon" />}
                    rightIcon={<ArrowRight data-testid="right-icon" />}
                >
                    Action
                </Button>
            );
            expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
            expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
        });
    });

    describe('Full Width', () => {
        it('applies full width class', () => {
            render(<Button fullWidth>Full Width</Button>);
            const button = screen.getByRole('button');
            expect(button).toHaveClass('w-full');
        });

        it('does not apply full width by default', () => {
            render(<Button>Normal Width</Button>);
            const button = screen.getByRole('button');
            expect(button).not.toHaveClass('w-full');
        });
    });

    describe('Accessibility', () => {
        it('can be focused', () => {
            render(<Button>Focusable</Button>);
            const button = screen.getByRole('button');
            button.focus();
            expect(button).toHaveFocus();
        });

        it('supports custom aria attributes', () => {
            render(<Button aria-label="Custom label">Button</Button>);
            expect(screen.getByRole('button', { name: 'Custom label' })).toBeInTheDocument();
        });

        it('passes through additional props', () => {
            render(<Button data-testid="custom-button" type="submit">Submit</Button>);
            const button = screen.getByTestId('custom-button');
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    describe('Ref Forwarding', () => {
        it('forwards ref to button element', () => {
            const ref = vi.fn();
            render(<Button ref={ref}>Ref Button</Button>);
            expect(ref).toHaveBeenCalled();
            expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
        });
    });
});
