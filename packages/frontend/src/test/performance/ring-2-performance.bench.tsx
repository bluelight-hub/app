import { render } from '@testing-library/react';
import { bench, describe } from 'vitest';
import { buildEtbEntries, buildOpenBefehle, buildOverviewDashboardFixture } from './ring-2-performance-fixtures';

function OverviewBenchmarkHarness() {
  const fixture = buildOverviewDashboardFixture();

  return (
    <section aria-label="Überblick Benchmark">
      <h1>Überblick</h1>
      <div>
        {fixture.statusObjects.map((item) => (
          <article key={item.id}>
            <h2>{item.label}</h2>
            <p>{item.state}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EtbBenchmarkHarness() {
  const entries = buildEtbEntries();

  return (
    <table aria-label="ETB Benchmark">
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id}>
            <td>{entry.sequenceNumber}</td>
            <td>{entry.kategorie}</td>
            <td>{entry.text}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BefehleBenchmarkHarness() {
  const befehle = buildOpenBefehle();

  return (
    <ul aria-label="Befehle Benchmark">
      {befehle.map((befehl) => (
        <li key={befehl.id}>
          <strong>{befehl.nummer}</strong>
          <span>{befehl.auftrag}</span>
        </li>
      ))}
    </ul>
  );
}

describe('Ring-2 Performance Benchmarks', () => {
  bench(
    'overview anchor proxy render',
    () => {
      const result = render(<OverviewBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );

  bench(
    'etb anchor proxy render',
    () => {
      const result = render(<EtbBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );

  bench(
    'befehle anchor proxy render',
    () => {
      const result = render(<BefehleBenchmarkHarness />);
      result.unmount();
    },
    { iterations: 30, warmupIterations: 2 },
  );
});
