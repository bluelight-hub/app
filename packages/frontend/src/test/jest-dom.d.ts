import '@testing-library/jest-dom/vitest';

// Erweiterung der Expect-Interface für jest-dom Matcher
interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R;
    toHaveClass(...classNames: string[]): R;
    toHaveAttribute(attr: string, value?: string): R;
    toHaveTextContent(text: string | RegExp): R;
    toContainElement(element: HTMLElement | null): R;
    toBeVisible(): R;
    toBeChecked(): R;
    toBeDisabled(): R;
    toBeEnabled(): R;
    toBeEmpty(): R;
    toBeEmptyDOMElement(): R;
    toBeInvalid(): R;
    toBeRequired(): R;
    toBeValid(): R;
    toContainHTML(html: string): R;
    toHaveFocus(): R;
    toHaveFormValues(values: { [name: string]: unknown }): R;
    toHaveStyle(css: string | { [name: string]: unknown }): R;
    toHaveValue(value?: string | string[] | number): R;
}

declare global {
    namespace Vi {

        interface Assertion<T = unknown> extends CustomMatchers<T> { }

        interface AsymmetricMatchersContaining extends CustomMatchers { }
    }

    // Für die wenigen Tests, die noch JestMatchers verwenden
    namespace jest {

        interface Matchers<R> extends CustomMatchers<R> { }
    }
} 