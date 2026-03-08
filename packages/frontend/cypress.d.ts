type TestCallback = () => void | Promise<void>;

interface CypressChainable {
  as(alias: string): CypressChainable;
  blur(): CypressChainable;
  click(): CypressChainable;
  contains(...args: unknown[]): CypressChainable;
  focus(): CypressChainable;
  get(selector: string): CypressChainable;
  intercept(...args: unknown[]): CypressChainable;
  should(...args: unknown[]): CypressChainable;
  type(text: string): CypressChainable;
  url(): CypressChainable;
  visit(url: string): CypressChainable;
  wait(alias: string): CypressChainable;
}

declare const cy: CypressChainable;

declare function beforeEach(callback: TestCallback): void;
declare function describe(name: string, callback: TestCallback): void;
declare function it(name: string, callback: TestCallback): void;
