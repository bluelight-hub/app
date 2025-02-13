import { ThemeProvider } from "./providers/ThemeProvider";
import { Router } from "./router";

function App() {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}

export default App;
