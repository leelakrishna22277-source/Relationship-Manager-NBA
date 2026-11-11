import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { AppRoutes } from "./app/router";
export const App = () => {
  return <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>;
};
export default App;
