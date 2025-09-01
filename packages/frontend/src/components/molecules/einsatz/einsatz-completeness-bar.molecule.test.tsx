import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { EinsatzCompletenessBar } from './einsatz-completeness-bar.molecule';

describe('EinsatzCompletenessBar', () => {
  const completeEinsatz = {
    alarmstichwort: 'Brand',
    alarmierungszeit: new Date(),
    einsatzort: 'Teststraße 1',
    einsatzleiter: 'Max Mustermann',
  };

  const incompleteEinsatz = {
    alarmstichwort: 'Brand',
    alarmierungszeit: null,
    einsatzort: '',
    einsatzleiter: null,
  };

  const emptyEinsatz = {};

  it('shows 100% completion for complete einsatz', () => {
    render(<EinsatzCompletenessBar einsatz={completeEinsatz} showPercentage />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('calculates partial completion correctly', () => {
    render(<EinsatzCompletenessBar einsatz={incompleteEinsatz} showPercentage />);
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('shows 0% for empty einsatz', () => {
    render(<EinsatzCompletenessBar einsatz={emptyEinsatz} showPercentage />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays missing fields when showTooltip is true', () => {
    render(<EinsatzCompletenessBar einsatz={incompleteEinsatz} showTooltip />);
    expect(screen.getByText(/Alarmierungszeit/)).toBeInTheDocument();
    expect(screen.getByText(/Einsatzort/)).toBeInTheDocument();
    expect(screen.getByText(/Einsatzleiter/)).toBeInTheDocument();
  });

  it('does not display missing fields when showTooltip is false', () => {
    render(<EinsatzCompletenessBar einsatz={incompleteEinsatz} showTooltip={false} />);
    expect(screen.queryByText(/Fehlende Felder:/)).not.toBeInTheDocument();
  });

  it('uses custom required fields', () => {
    const customEinsatz = {
      alarmstichwort: 'Brand',
      fahrzeuge: [],
      mannschaft: ['Person 1'],
    };
    render(<EinsatzCompletenessBar einsatz={customEinsatz} requiredFields={['alarmstichwort', 'fahrzeuge', 'mannschaft']} showPercentage />);
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('handles empty arrays as incomplete', () => {
    const einsatzWithArrays = {
      alarmstichwort: 'Brand',
      fahrzeuge: [],
      mannschaft: ['Person 1'],
    };
    render(<EinsatzCompletenessBar einsatz={einsatzWithArrays} requiredFields={['alarmstichwort', 'fahrzeuge', 'mannschaft']} showTooltip />);
    expect(screen.getByText(/Fahrzeuge/)).toBeInTheDocument();
  });

  it('applies success variant for 100% completion', () => {
    const { container } = render(<EinsatzCompletenessBar einsatz={completeEinsatz} />);
    const progressBar = container.querySelector('.bg-green-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies info variant for 75-99% completion', () => {
    const partialEinsatz = {
      alarmstichwort: 'Brand',
      alarmierungszeit: new Date(),
      einsatzort: 'Test',
      einsatzleiter: null,
    };
    const { container } = render(<EinsatzCompletenessBar einsatz={partialEinsatz} />);
    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies warning variant for 50-74% completion', () => {
    const halfEinsatz = {
      alarmstichwort: 'Brand',
      alarmierungszeit: new Date(),
      einsatzort: null,
      einsatzleiter: null,
    };
    const { container } = render(<EinsatzCompletenessBar einsatz={halfEinsatz} />);
    const progressBar = container.querySelector('.bg-yellow-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies error variant for less than 50% completion', () => {
    const { container } = render(<EinsatzCompletenessBar einsatz={incompleteEinsatz} />);
    const progressBar = container.querySelector('.bg-red-600');
    expect(progressBar).toBeInTheDocument();
  });

  it('displays label correctly', () => {
    render(<EinsatzCompletenessBar einsatz={completeEinsatz} />);
    expect(screen.getByText('Vollständigkeit')).toBeInTheDocument();
  });

  it('applies size prop correctly', () => {
    const { container, rerender } = render(<EinsatzCompletenessBar einsatz={completeEinsatz} size="sm" />);
    let progressBar = container.querySelector('.h-1');
    expect(progressBar).toBeInTheDocument();

    rerender(<EinsatzCompletenessBar einsatz={completeEinsatz} size="md" />);
    progressBar = container.querySelector('.h-2');
    expect(progressBar).toBeInTheDocument();

    rerender(<EinsatzCompletenessBar einsatz={completeEinsatz} size="lg" />);
    progressBar = container.querySelector('.h-3');
    expect(progressBar).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EinsatzCompletenessBar einsatz={completeEinsatz} className="custom-class" />);
    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('handles null and undefined values correctly', () => {
    const mixedEinsatz = {
      alarmstichwort: undefined,
      alarmierungszeit: null,
      einsatzort: 'Test',
      einsatzleiter: 'Person',
    };
    render(<EinsatzCompletenessBar einsatz={mixedEinsatz} showPercentage />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
