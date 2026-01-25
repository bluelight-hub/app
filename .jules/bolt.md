## 2025-05-27 - Object Allocation in Render
**Learning:** Many UI atoms (like Button, Input) define static configuration objects (styles, variants) inside the render function. This causes unnecessary object allocation on every render and breaks reference equality for optimization.
**Action:** Extract static configuration objects (colors, sizes, variants) outside the component or use `useMemo` if they depend on props (though often they can be structured to be static). Wrap high-frequency leaf components in `React.memo`.
